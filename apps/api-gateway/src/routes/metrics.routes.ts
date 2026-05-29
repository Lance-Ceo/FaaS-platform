import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { register } from 'prom-client';

const router = Router();

// GET /metrics/prometheus - Prometheus scrape endpoint (no auth for scraper)
router.get('/prometheus', async (_req, res: Response): Promise<void> => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// All other metrics routes require auth
router.use(authenticate);

// GET /metrics/platform - Overall platform metrics
router.get('/platform', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const [totalFunctions, activeFunctions, totalUsers, activeDeployments] = await Promise.all([
    prisma.function.count(),
    prisma.function.count({ where: { status: 'READY' } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.deployment.count({ where: { status: { in: ['QUEUED', 'BUILDING', 'DEPLOYING'] } } }),
  ]);

  // Aggregate invocation metrics from last 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const logStats = await prisma.functionLog.groupBy({
    by: ['level'],
    where: { timestamp: { gte: since } },
    _count: { id: true },
  });

  const totalInvocations = logStats.reduce((sum, s) => sum + s._count.id, 0);
  const totalErrors = logStats.find((s) => s.level === 'ERROR')?._count.id || 0;

  res.json({
    success: true,
    data: {
      totalFunctions,
      activeFunctions,
      totalUsers,
      activeDeployments,
      totalInvocations,
      totalErrors,
      avgSuccessRate: totalInvocations > 0
        ? ((totalInvocations - totalErrors) / totalInvocations) * 100
        : 100,
    },
  });
});

// GET /metrics/functions/:id - Per-function metrics
router.get('/functions/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const fn = await prisma.function.findFirst({
    where: {
      id: req.params.id,
      ...(req.user!.role !== 'admin' ? { userId: req.user!.id } : {}),
    },
  });
  if (!fn) {
    res.status(404).json({ success: false, error: 'Function not found' });
    return;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const logs = await prisma.functionLog.findMany({
    where: { functionId: fn.id, timestamp: { gte: since } },
    select: { level: true, duration: true, statusCode: true, timestamp: true },
  });

  const invocations = logs.length;
  const errors = logs.filter((l) => l.level === 'ERROR').length;
  const durations = logs.map((l) => l.duration || 0).filter((d) => d > 0).sort((a, b) => a - b);
  const avgDuration = durations.length > 0
    ? durations.reduce((s, d) => s + d, 0) / durations.length
    : 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
  const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

  // Group by hour for chart data
  const hourlyData: Record<string, { invocations: number; errors: number }> = {};
  for (const log of logs) {
    const hour = new Date(log.timestamp).toISOString().substring(0, 13);
    if (!hourlyData[hour]) hourlyData[hour] = { invocations: 0, errors: 0 };
    hourlyData[hour].invocations++;
    if (log.level === 'ERROR') hourlyData[hour].errors++;
  }

  res.json({
    success: true,
    data: {
      functionId: fn.id,
      functionName: fn.name,
      invocations,
      errors,
      avgDuration: Math.round(avgDuration),
      p95Duration: p95,
      p99Duration: p99,
      successRate: invocations > 0 ? ((invocations - errors) / invocations) * 100 : 100,
      hourlyData: Object.entries(hourlyData).map(([hour, data]) => ({ hour, ...data })),
    },
  });
});

export default router;

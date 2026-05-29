import { Router, Response } from 'express';
import { body, query, param } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { deploymentQueue } from '../services/deployment.service';
import { logger } from '../lib/logger';
import { Runtime, FunctionStatus, TriggerType } from '@prisma/client';

const router = Router();

// All function routes require authentication
router.use(authenticate);

// GET /functions
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('status').optional().isIn(Object.values(FunctionStatus)),
    query('runtime').optional().isIn(Object.values(Runtime)),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const search = req.query.search as string;
    const status = req.query.status as FunctionStatus;
    const runtime = req.query.runtime as Runtime;

    const where: Record<string, unknown> = {
      userId: req.user!.role === 'admin' ? undefined : req.user!.id,
    };
    if (req.user!.role !== 'admin') where.userId = req.user!.id;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (status) where.status = status;
    if (runtime) where.runtime = runtime;

    const [functions, total] = await Promise.all([
      prisma.function.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          _count: { select: { deployments: true, logs: true } },
        },
      }),
      prisma.function.count({ where }),
    ]);

    res.json({
      success: true,
      data: functions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }
);

// GET /functions/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const fn = await prisma.function.findFirst({
    where: {
      id: req.params.id,
      ...(req.user!.role !== 'admin' ? { userId: req.user!.id } : {}),
    },
    include: {
      user: { select: { id: true, username: true, email: true } },
      deployments: { orderBy: { startedAt: 'desc' }, take: 5 },
      _count: { select: { logs: true } },
    },
  });

  if (!fn) throw new AppError(404, 'Function not found');
  res.json({ success: true, data: fn });
});

// POST /functions
router.post(
  '/',
  validate([
    body('name')
      .isLength({ min: 2, max: 63 })
      .matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
      .withMessage('Name must be lowercase alphanumeric with hyphens'),
    body('runtime').isIn(Object.values(Runtime)),
    body('description').optional().isLength({ max: 500 }),
    body('memory').optional().isInt({ min: 64, max: 2048 }),
    body('timeout').optional().isInt({ min: 1, max: 300 }),
    body('replicas').optional().isInt({ min: 1, max: 20 }),
    body('minReplicas').optional().isInt({ min: 0, max: 20 }),
    body('maxReplicas').optional().isInt({ min: 1, max: 50 }),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const {
      name, description, runtime, sourceCode,
      memory = 128, timeout = 30, replicas = 1,
      minReplicas = 1, maxReplicas = 5,
      envVars = {}, labels = {}, triggers = ['HTTP'],
    } = req.body;

    // Check name uniqueness per user
    const existing = await prisma.function.findFirst({
      where: { name, userId: req.user!.id },
    });
    if (existing) throw new AppError(409, `Function "${name}" already exists`);

    const fn = await prisma.function.create({
      data: {
        name,
        description,
        runtime: runtime as Runtime,
        sourceCode,
        memory,
        timeout,
        replicas,
        minReplicas,
        maxReplicas,
        envVars,
        labels,
        triggers: triggers.map((t: string) => t.toUpperCase() as TriggerType),
        userId: req.user!.id,
      },
    });

    logger.info({ functionId: fn.id, name: fn.name }, 'Function created');
    res.status(201).json({ success: true, data: fn });
  }
);

// PUT /functions/:id
router.put(
  '/:id',
  validate([
    param('id').isUUID(),
    body('description').optional().isLength({ max: 500 }),
    body('memory').optional().isInt({ min: 64, max: 2048 }),
    body('timeout').optional().isInt({ min: 1, max: 300 }),
    body('replicas').optional().isInt({ min: 1, max: 20 }),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const fn = await prisma.function.findFirst({
      where: {
        id: req.params.id,
        ...(req.user!.role !== 'admin' ? { userId: req.user!.id } : {}),
      },
    });
    if (!fn) throw new AppError(404, 'Function not found');

    const {
      description, sourceCode, memory, timeout,
      replicas, minReplicas, maxReplicas, envVars, labels, triggers,
    } = req.body;

    const updated = await prisma.function.update({
      where: { id: fn.id },
      data: {
        description,
        sourceCode,
        memory,
        timeout,
        replicas,
        minReplicas,
        maxReplicas,
        envVars,
        labels,
        triggers: triggers?.map((t: string) => t.toUpperCase() as TriggerType),
        version: { increment: 1 },
      },
    });

    res.json({ success: true, data: updated });
  }
);

// DELETE /functions/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const fn = await prisma.function.findFirst({
    where: {
      id: req.params.id,
      ...(req.user!.role !== 'admin' ? { userId: req.user!.id } : {}),
    },
  });
  if (!fn) throw new AppError(404, 'Function not found');

  // Queue undeploy job
  await deploymentQueue.add('undeploy', { functionId: fn.id, functionName: fn.name });

  await prisma.function.delete({ where: { id: fn.id } });
  logger.info({ functionId: fn.id }, 'Function deleted');
  res.json({ success: true, message: 'Function deleted' });
});

// POST /functions/:id/deploy
router.post('/:id/deploy', async (req: AuthRequest, res: Response): Promise<void> => {
  const fn = await prisma.function.findFirst({
    where: {
      id: req.params.id,
      ...(req.user!.role !== 'admin' ? { userId: req.user!.id } : {}),
    },
  });
  if (!fn) throw new AppError(404, 'Function not found');

  if (!fn.sourceCode) throw new AppError(400, 'Function has no source code to deploy');

  // Create deployment record
  const deployment = await prisma.deployment.create({
    data: {
      functionId: fn.id,
      version: fn.version,
      status: 'QUEUED',
      triggeredBy: req.user!.username,
      userId: req.user!.id,
    },
  });

  // Update function status
  await prisma.function.update({
    where: { id: fn.id },
    data: { status: 'BUILDING' },
  });

  // Queue deployment job
  await deploymentQueue.add('deploy', {
    deploymentId: deployment.id,
    functionId: fn.id,
    userId: req.user!.id,
  });

  logger.info({ deploymentId: deployment.id, functionId: fn.id }, 'Deployment queued');
  res.status(202).json({ success: true, data: deployment, message: 'Deployment queued' });
});

// POST /functions/:id/scale
router.post(
  '/:id/scale',
  validate([body('replicas').isInt({ min: 0, max: 50 })]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const fn = await prisma.function.findFirst({
      where: {
        id: req.params.id,
        ...(req.user!.role !== 'admin' ? { userId: req.user!.id } : {}),
      },
    });
    if (!fn) throw new AppError(404, 'Function not found');

    const { replicas } = req.body;
    await prisma.function.update({ where: { id: fn.id }, data: { replicas } });

    // Scale in OpenFaaS
    await deploymentQueue.add('scale', { functionName: fn.name, replicas });

    res.json({ success: true, message: `Function scaled to ${replicas} replicas` });
  }
);

// GET /functions/:id/logs
router.get('/:id/logs', async (req: AuthRequest, res: Response): Promise<void> => {
  const fn = await prisma.function.findFirst({
    where: {
      id: req.params.id,
      ...(req.user!.role !== 'admin' ? { userId: req.user!.id } : {}),
    },
  });
  if (!fn) throw new AppError(404, 'Function not found');

  const limit = parseInt(req.query.limit as string || '100', 10);
  const logs = await prisma.functionLog.findMany({
    where: { functionId: fn.id },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  res.json({ success: true, data: logs });
});

// GET /functions/:id/deployments
router.get('/:id/deployments', async (req: AuthRequest, res: Response): Promise<void> => {
  const fn = await prisma.function.findFirst({
    where: {
      id: req.params.id,
      ...(req.user!.role !== 'admin' ? { userId: req.user!.id } : {}),
    },
  });
  if (!fn) throw new AppError(404, 'Function not found');

  const deployments = await prisma.deployment.findMany({
    where: { functionId: fn.id },
    orderBy: { startedAt: 'desc' },
    take: 20,
  });

  res.json({ success: true, data: deployments });
});

// POST /functions/:id/invoke
router.post('/:id/invoke', async (req: AuthRequest, res: Response): Promise<void> => {
  const fn = await prisma.function.findFirst({
    where: {
      id: req.params.id,
      ...(req.user!.role !== 'admin' ? { userId: req.user!.id } : {}),
    },
  });
  if (!fn) throw new AppError(404, 'Function not found');
  if (fn.status !== 'READY') throw new AppError(400, 'Function is not ready');

  const start = Date.now();
  try {
    const { openfaas } = await import('../lib/openfaas');
    const result = await openfaas.invokeFunction(fn.name, req.body, {
      'Content-Type': req.headers['content-type'] || 'application/json',
    });

    const duration = Date.now() - start;

    // Log invocation
    await prisma.functionLog.create({
      data: {
        functionId: fn.id,
        level: result.status >= 400 ? 'ERROR' : 'INFO',
        message: `Invoked via API - ${result.status}`,
        duration,
        statusCode: result.status,
      },
    });

    res.status(result.status).json({ success: true, data: result.data, duration });
  } catch (err) {
    const duration = Date.now() - start;
    await prisma.functionLog.create({
      data: {
        functionId: fn.id,
        level: 'ERROR',
        message: `Invocation failed: ${(err as Error).message}`,
        duration,
        statusCode: 500,
      },
    });
    throw err;
  }
});

export default router;

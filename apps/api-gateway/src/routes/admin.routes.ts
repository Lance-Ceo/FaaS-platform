import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /admin/users
router.get('/users', async (_req: AuthRequest, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, username: true, role: true,
      isActive: true, createdAt: true,
      _count: { select: { functions: true, apiKeys: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: users });
});

// PUT /admin/users/:id/role
router.put(
  '/users/:id/role',
  validate([body('role').isIn(['ADMIN', 'DEVELOPER'])]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError(404, 'User not found');

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: req.body.role },
      select: { id: true, email: true, username: true, role: true },
    });
    res.json({ success: true, data: updated });
  }
);

// PUT /admin/users/:id/status
router.put(
  '/users/:id/status',
  validate([body('isActive').isBoolean()]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.params.id === req.user!.id) {
      throw new AppError(400, 'Cannot deactivate your own account');
    }
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: req.body.isActive },
      select: { id: true, email: true, isActive: true },
    });
    res.json({ success: true, data: updated });
  }
);

// GET /admin/functions - All functions across all users
router.get('/functions', async (_req: AuthRequest, res: Response): Promise<void> => {
  const functions = await prisma.function.findMany({
    include: {
      user: { select: { id: true, username: true, email: true } },
      _count: { select: { deployments: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ success: true, data: functions });
});

// GET /admin/deployments - Recent deployments
router.get('/deployments', async (_req: AuthRequest, res: Response): Promise<void> => {
  const deployments = await prisma.deployment.findMany({
    include: {
      function: { select: { id: true, name: true, runtime: true } },
      user: { select: { id: true, username: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });
  res.json({ success: true, data: deployments });
});

export default router;

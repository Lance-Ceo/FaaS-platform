import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { config } from '../config';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';

const router = Router();

const generateTokens = (user: { id: string; email: string; username: string; role: string }) => {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );
  const refreshToken = jwt.sign(
    { sub: user.id },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiresIn as any }
  );
  return { accessToken, refreshToken };
};

// POST /auth/register
router.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('username').isLength({ min: 3, max: 30 }).trim(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const { email, username, password } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      throw new AppError(409, 'Email or username already taken');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, passwordHash },
      select: { id: true, email: true, username: true, role: true, createdAt: true },
    });

    const { accessToken, refreshToken } = generateTokens({
      ...user,
      role: user.role.toLowerCase(),
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info({ userId: user.id }, 'User registered');
    res.status(201).json({
      success: true,
      data: { user, accessToken, refreshToken },
    });
  }
);

// POST /auth/login
router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role.toLowerCase(),
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info({ userId: user.id }, 'User logged in');
    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, username: user.username, role: user.role.toLowerCase(), createdAt: user.createdAt },
        accessToken,
        refreshToken,
      },
    });
  }
);

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError(400, 'Refresh token required');

  let payload: { sub: string };
  try {
    payload = jwt.verify(refreshToken, config.jwtRefreshSecret) as { sub: string };
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token expired or revoked');
  }

  // Rotate refresh token
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

  const { accessToken, refreshToken: newRefreshToken } = generateTokens({
    id: stored.user.id,
    email: stored.user.email,
    username: stored.user.username,
    role: stored.user.role.toLowerCase(),
  });

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: stored.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
});

// POST /auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (token) {
    // Blacklist the access token until it expires
    await redis.setex(`blacklist:${token}`, 900, '1'); // 15 min TTL
  }

  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken, userId: req.user!.id },
      data: { isRevoked: true },
    });
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, username: true, role: true, createdAt: true, updatedAt: true },
  });
  res.json({ success: true, data: user });
});

// PUT /auth/profile
router.put(
  '/profile',
  authenticate,
  validate([body('username').optional().isLength({ min: 3, max: 30 }).trim()]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { username } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { username },
      select: { id: true, email: true, username: true, role: true, updatedAt: true },
    });
    res.json({ success: true, data: user });
  }
);

// POST /auth/change-password
router.post(
  '/change-password',
  authenticate,
  validate([
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError(404, 'User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new AppError(400, 'Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    res.json({ success: true, message: 'Password changed successfully' });
  }
);

// ─── API Keys ─────────────────────────────────────────────────

// GET /auth/api-keys
router.get('/api-keys', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const keys = await prisma.apiKey.findMany({
    where: { userId: req.user!.id, isActive: true },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: keys });
});

// POST /auth/api-keys
router.post(
  '/api-keys',
  authenticate,
  validate([body('name').isLength({ min: 1, max: 100 }).trim()]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { name, expiresAt } = req.body;

    // Generate a secure random key
    const rawKey = `fk_${uuidv4().replace(/-/g, '')}`;
    const keyHash = await bcrypt.hash(rawKey, 10);
    const keyPrefix = rawKey.substring(0, 8);

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        userId: req.user!.id,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
      select: { id: true, name: true, keyPrefix: true, createdAt: true, expiresAt: true },
    });

    // Return the raw key only once
    res.status(201).json({
      success: true,
      data: { ...apiKey, key: rawKey },
      message: 'Store this key securely — it will not be shown again',
    });
  }
);

// DELETE /auth/api-keys/:id
router.delete('/api-keys/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.apiKey.updateMany({
    where: { id: req.params.id, userId: req.user!.id },
    data: { isActive: false },
  });
  res.json({ success: true, message: 'API key revoked' });
});

export default router;

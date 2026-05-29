import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';
import bcrypt from 'bcryptjs';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

/** Verify JWT access token */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted (logged out)
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      res.status(401).json({ success: false, error: 'Token has been revoked' });
      return;
    }

    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, username: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'User not found or inactive' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role.toLowerCase(),
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expired' });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }
    logger.error({ err }, 'Auth middleware error');
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

/** Require admin role */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
};

/** Optional API key authentication */
export const authenticateApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    next();
    return;
  }

  try {
    // API keys are stored as hash; prefix is first 8 chars
    const prefix = apiKey.substring(0, 8);
    const keys = await prisma.apiKey.findMany({
      where: { keyPrefix: prefix, isActive: true },
      include: { user: { select: { id: true, email: true, username: true, role: true, isActive: true } } },
    });

    for (const key of keys) {
      const isValid = await bcrypt.compare(apiKey, key.keyHash);
      if (isValid && key.user.isActive) {
        // Update last used
        await prisma.apiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        });

        req.user = {
          id: key.user.id,
          email: key.user.email,
          username: key.user.username,
          role: key.user.role.toLowerCase(),
        };
        next();
        return;
      }
    }

    res.status(401).json({ success: false, error: 'Invalid API key' });
  } catch (err) {
    logger.error({ err }, 'API key auth error');
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

/** Authenticate via JWT or API key */
export const authenticateAny = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return authenticateApiKey(req, res, next);
  }
  return authenticate(req, res, next);
};

import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { collectDefaultMetrics } from 'prom-client';

import { config } from './config';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { wsManager } from './websocket/wsManager';
import { errorHandler, notFound } from './middleware/errorHandler';
import { metricsMiddleware } from './middleware/metrics';

// Routes
import authRoutes from './routes/auth.routes';
import functionRoutes from './routes/functions.routes';
import metricsRoutes from './routes/metrics.routes';
import adminRoutes from './routes/admin.routes';
import webhookRoutes from './routes/webhooks.routes';

// Side-effect imports — register Bull queue processors
import './services/deployment.service';
import { scheduler } from './services/scheduler.service';

// Initialize Prometheus default metrics
if (config.prometheusEnabled) {
  collectDefaultMetrics({ prefix: 'faas_' });
}

const app = express();
const server = http.createServer(app);

// ─── Security Middleware ──────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Handled by NGINX
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  })
);

// ─── General Middleware ───────────────────────────────────────
app.use(compression());
app.use(metricsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.path === '/health',
  })
);

// ─── Rate Limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many auth attempts' },
});

app.use(config.apiPrefix, limiter);

// ─── Health Check ─────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const dbOk = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  const redisOk = await redis.ping().then(() => true).catch(() => false);

  const status = dbOk && redisOk ? 'healthy' : 'degraded';
  res.status(dbOk ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    services: { database: dbOk, redis: redisOk },
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ─── API Routes ───────────────────────────────────────────────
app.use(`${config.apiPrefix}/auth`, authLimiter, authRoutes);
app.use(`${config.apiPrefix}/functions`, functionRoutes);
app.use(`${config.apiPrefix}/metrics`, metricsRoutes);
app.use(`${config.apiPrefix}/admin`, adminRoutes);
app.use(`${config.apiPrefix}/webhooks`, webhookRoutes);

// ─── Function Proxy (invoke via gateway) ─────────────────────
app.all(`${config.apiPrefix}/invoke/:functionName`, async (req, res) => {
  const { functionName } = req.params;
  try {
    const { openfaas } = await import('./lib/openfaas');
    const result = await openfaas.invokeFunction(functionName, req.body, {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'X-Forwarded-For': req.ip || '',
    });
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(502).json({ success: false, error: 'Function invocation failed' });
  }
});

// ─── 404 & Error Handlers ─────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── WebSocket ────────────────────────────────────────────────
wsManager.initialize(server);

// ─── Start Server ─────────────────────────────────────────────
const start = async () => {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('Database connected');

    server.listen(config.port, async () => {
      logger.info(
        { port: config.port, env: config.nodeEnv, prefix: config.apiPrefix },
        '🚀 FaaS API Gateway started'
      );
      // Load cron schedules after server is up
      await scheduler.loadSchedules();
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

start();

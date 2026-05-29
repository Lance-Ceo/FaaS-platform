import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { openfaas } from '../lib/openfaas';
import { writeLog } from '../services/log.service';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /webhooks/:functionName
 *
 * Public webhook endpoint — no auth required.
 * The function must have WEBHOOK in its triggers list and status READY.
 * Optionally validate a shared secret via X-Webhook-Secret header.
 */
router.post('/:functionName', async (req: Request, res: Response): Promise<void> => {
  const { functionName } = req.params;

  const fn = await prisma.function.findFirst({
    where: {
      name: functionName,
      status: 'READY',
      triggers: { has: 'WEBHOOK' },
    },
  });

  if (!fn) {
    throw new AppError(404, `Webhook function "${functionName}" not found or not ready`);
  }

  // Optional secret validation
  const labels = fn.labels as Record<string, string>;
  const expectedSecret = labels['webhook.secret'];
  if (expectedSecret) {
    const providedSecret = req.headers['x-webhook-secret'];
    if (providedSecret !== expectedSecret) {
      throw new AppError(401, 'Invalid webhook secret');
    }
  }

  const start = Date.now();
  try {
    const result = await openfaas.invokeFunction(fn.name, req.body, {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'X-Webhook-Source': req.headers['x-webhook-source'] as string || 'unknown',
      'X-Forwarded-For': req.ip || '',
    });

    const duration = Date.now() - start;

    await writeLog({
      functionId: fn.id,
      level: result.status >= 400 ? 'ERROR' : 'INFO',
      message: `Webhook invocation — ${result.status}`,
      duration,
      statusCode: result.status,
    });

    res.status(result.status).json(result.data);
  } catch (err) {
    const duration = Date.now() - start;
    logger.error({ functionName, err: (err as Error).message }, 'Webhook invocation failed');

    await writeLog({
      functionId: fn.id,
      level: 'ERROR',
      message: `Webhook failed: ${(err as Error).message}`,
      duration,
      statusCode: 502,
    });

    throw new AppError(502, 'Webhook function invocation failed');
  }
});

export default router;

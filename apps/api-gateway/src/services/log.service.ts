import { prisma } from '../lib/prisma';
import { wsManager } from '../websocket/wsManager';
import { logger } from '../lib/logger';
import { LogLevel } from '@prisma/client';

interface LogEntry {
  functionId: string;
  level?: LogLevel;
  message: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
}

/**
 * Persist a function log entry and broadcast it via WebSocket.
 */
export async function writeLog(entry: LogEntry): Promise<void> {
  try {
    const log = await prisma.functionLog.create({
      data: {
        functionId: entry.functionId,
        level: entry.level ?? 'INFO',
        message: entry.message,
        requestId: entry.requestId,
        duration: entry.duration,
        statusCode: entry.statusCode,
      },
      include: {
        function: { select: { name: true } },
      },
    });

    // Broadcast to WebSocket subscribers
    wsManager.sendFunctionLog(entry.functionId, {
      id: log.id,
      functionId: log.functionId,
      functionName: log.function.name,
      level: log.level,
      message: log.message,
      timestamp: log.timestamp.toISOString(),
      requestId: log.requestId,
      duration: log.duration,
      statusCode: log.statusCode,
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Failed to write function log');
  }
}

/**
 * Fetch recent logs for a function with optional level filter.
 */
export async function getRecentLogs(
  functionId: string,
  limit = 100,
  level?: LogLevel
) {
  return prisma.functionLog.findMany({
    where: {
      functionId,
      ...(level ? { level } : {}),
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

/**
 * Purge logs older than `days` days for a function (or all functions).
 */
export async function purgeLogs(days = 30, functionId?: string): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await prisma.functionLog.deleteMany({
    where: {
      timestamp: { lt: cutoff },
      ...(functionId ? { functionId } : {}),
    },
  });
  logger.info({ deleted: result.count, days }, 'Logs purged');
  return result.count;
}

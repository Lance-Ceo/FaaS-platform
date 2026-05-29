import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { openfaas } from '../lib/openfaas';
import { logger } from '../lib/logger';

interface ScheduledJob {
  functionId: string;
  functionName: string;
  expression: string;
  task: cron.ScheduledTask;
}

class SchedulerService {
  private jobs: Map<string, ScheduledJob> = new Map();

  /** Load all CRON-triggered READY functions and schedule them */
  async loadSchedules(): Promise<void> {
    const functions = await prisma.function.findMany({
      where: {
        status: 'READY',
        triggers: { has: 'CRON' },
      },
    });

    for (const fn of functions) {
      const labels = fn.labels as Record<string, string>;
      const expression = labels['cron.expression'];
      if (expression && cron.validate(expression)) {
        this.schedule(fn.id, fn.name, expression);
      }
    }

    logger.info({ count: this.jobs.size }, 'Cron schedules loaded');
  }

  /** Schedule a function by cron expression */
  schedule(functionId: string, functionName: string, expression: string): void {
    // Remove existing job if any
    this.unschedule(functionId);

    if (!cron.validate(expression)) {
      logger.warn({ functionId, expression }, 'Invalid cron expression, skipping');
      return;
    }

    const task = cron.schedule(expression, async () => {
      logger.info({ functionId, functionName }, 'Cron trigger firing');
      try {
        await openfaas.invokeFunction(functionName, { trigger: 'cron', timestamp: new Date().toISOString() });

        await prisma.functionLog.create({
          data: {
            functionId,
            level: 'INFO',
            message: `Cron trigger executed (${expression})`,
          },
        });
      } catch (err) {
        logger.error({ functionId, err: (err as Error).message }, 'Cron invocation failed');
        await prisma.functionLog.create({
          data: {
            functionId,
            level: 'ERROR',
            message: `Cron trigger failed: ${(err as Error).message}`,
          },
        });
      }
    });

    this.jobs.set(functionId, { functionId, functionName, expression, task });
    logger.info({ functionId, functionName, expression }, 'Cron job scheduled');
  }

  /** Remove a scheduled job */
  unschedule(functionId: string): void {
    const job = this.jobs.get(functionId);
    if (job) {
      job.task.stop();
      this.jobs.delete(functionId);
      logger.info({ functionId }, 'Cron job removed');
    }
  }

  /** List all active schedules */
  listSchedules(): Array<{ functionId: string; functionName: string; expression: string }> {
    return Array.from(this.jobs.values()).map(({ functionId, functionName, expression }) => ({
      functionId,
      functionName,
      expression,
    }));
  }

  get activeCount(): number {
    return this.jobs.size;
  }
}

export const scheduler = new SchedulerService();

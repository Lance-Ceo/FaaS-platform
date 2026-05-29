import Bull from 'bull';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { openfaas } from '../lib/openfaas';
import { logger } from '../lib/logger';
import { wsManager } from '../websocket/wsManager';
import { Runtime } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

// ─── Deployment Queue ─────────────────────────────────────────
export const deploymentQueue = new Bull('deployments', {
  redis: config.redisUrl,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// ─── Runtime Image Map ────────────────────────────────────────
// These are informational only — the function-runner builds images itself
const RUNTIME_BASE_IMAGES: Record<Runtime, string> = {
  NODE18:  'node:18-alpine',
  PYTHON3: 'python:3.11-alpine',
  GO119:   'golang:1.21-alpine',
};

function getDefaultHandler(runtime: Runtime): string {
  const defaults: Record<Runtime, string> = {
    NODE18:  `module.exports = async (event, context) => context.status(200).succeed({ message: 'Hello World!' });`,
    PYTHON3: `def handle(event, context):\n    import json\n    return {"statusCode": 200, "body": json.dumps({"message": "Hello World!"})}`,
    GO119:   `package handler\nimport ("encoding/json";"net/http")\nfunc Handle(w http.ResponseWriter, r *http.Request) { w.Header().Set("Content-Type","application/json"); json.NewEncoder(w).Encode(map[string]string{"message":"Hello World!"}) }`,
  };
  return defaults[runtime];
}

const RUNTIME_HANDLER_FILES: Record<Runtime, string> = {
  NODE18: 'handler.js',
  PYTHON3: 'handler.py',
  GO119: 'handler.go',
};

// ─── Deploy Job Processor ─────────────────────────────────────
deploymentQueue.process('deploy', async (job) => {
  const { deploymentId, functionId } = job.data;

  const deployment = await prisma.deployment.findUnique({ where: { id: deploymentId } });
  const fn = await prisma.function.findUnique({ where: { id: functionId } });

  if (!deployment || !fn) {
    throw new Error('Deployment or function not found');
  }

  const addLog = async (msg: string) => {
    logger.info({ deploymentId, msg }, 'Deployment log');
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { logs: { push: `[${new Date().toISOString()}] ${msg}` } },
    });
    wsManager.broadcast('deployment_status', {
      deploymentId,
      functionId,
      log: msg,
      status: deployment.status,
    });
  };

  try {
    await addLog('Starting deployment...');

    // Update status to BUILDING
    await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'BUILDING' } });
    await prisma.function.update({ where: { id: functionId }, data: { status: 'BUILDING' } });

    await addLog(`Building image for runtime: ${fn.runtime}`);

    // Generate image tag
    const imageTag = `${config.dockerRegistry}/${config.functionImagePrefix}-${fn.name}:v${fn.version}`;

    // Create build context
    const buildDir = path.join(config.buildDir, deploymentId);
    await fs.mkdir(buildDir, { recursive: true });

    // Write source code
    const handlerFile = RUNTIME_HANDLER_FILES[fn.runtime];
    await fs.writeFile(path.join(buildDir, handlerFile), fn.sourceCode || '');

    // Write Dockerfile
    const dockerfile = generateDockerfile(fn.runtime, fn.memory);
    await fs.writeFile(path.join(buildDir, 'Dockerfile'), dockerfile);

    await addLog(`Image tag: ${imageTag}`);
    await addLog('Deploying to OpenFaaS...');

    // Update status to DEPLOYING
    await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'DEPLOYING' } });
    await prisma.function.update({ where: { id: functionId }, data: { status: 'DEPLOYING' } });

    // Deploy to OpenFaaS using the base image (in production, build & push first)
    const baseImage = RUNTIME_BASE_IMAGES[fn.runtime];
    const envVars = fn.envVars as Record<string, string>;

    await openfaas.deployFunction({
      service: fn.name,
      image: baseImage,
      namespace: config.openfaasNamespace,
      envVars: {
        ...envVars,
        // Pass source code to the function runner for building
        __SOURCE_CODE: fn.sourceCode || getDefaultHandler(fn.runtime),
        FUNCTION_NAME: fn.name,
        FUNCTION_RUNTIME: fn.runtime,
      },
      labels: {
        ...(fn.labels as Record<string, string>),
        'faas.platform/function-id': fn.id,
        'faas.platform/version': String(fn.version),
        'faas.platform/user-id': fn.userId,
        'faas.platform/runtime': fn.runtime,
      },
      limits: {
        memory: `${fn.memory}Mi`,
        cpu: '200m',
      },
      requests: {
        memory: `${Math.floor(fn.memory / 2)}Mi`,
        cpu: '50m',
      },
    });

    // Cleanup build dir
    await fs.rm(buildDir, { recursive: true, force: true });

    // Mark success
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        imageTag,
      },
    });

    await prisma.function.update({
      where: { id: functionId },
      data: {
        status: 'READY',
        deployedAt: new Date(),
        imageTag,
        endpoint: `${config.openfaasGateway}/function/${fn.name}`,
      },
    });

    await addLog('✅ Deployment successful!');
    wsManager.broadcast('function_status', { functionId, status: 'READY' });

    logger.info({ deploymentId, functionId }, 'Deployment completed successfully');
  } catch (err) {
    const error = (err as Error).message;
    logger.error({ deploymentId, functionId, error }, 'Deployment failed');

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'FAILED', completedAt: new Date(), error },
    });

    await prisma.function.update({
      where: { id: functionId },
      data: { status: 'ERROR' },
    });

    wsManager.broadcast('function_status', { functionId, status: 'ERROR', error });
    throw err;
  }
});

// ─── Undeploy Job Processor ───────────────────────────────────
deploymentQueue.process('undeploy', async (job) => {
  const { functionName } = job.data;
  try {
    await openfaas.deleteFunction(functionName);
    logger.info({ functionName }, 'Function undeployed from OpenFaaS');
  } catch (err) {
    logger.warn({ functionName, err: (err as Error).message }, 'Failed to undeploy from OpenFaaS');
  }
});

// ─── Scale Job Processor ──────────────────────────────────────
deploymentQueue.process('scale', async (job) => {
  const { functionName, replicas } = job.data;
  try {
    await openfaas.scaleFunction(functionName, replicas);
    logger.info({ functionName, replicas }, 'Function scaled');
  } catch (err) {
    logger.warn({ functionName, err: (err as Error).message }, 'Failed to scale function');
  }
});

// ─── Dockerfile Generator ─────────────────────────────────────
function generateDockerfile(runtime: Runtime, memory: number): string {
  const templates: Record<Runtime, string> = {
    NODE18: `FROM ghcr.io/openfaas/node18-http:latest
WORKDIR /home/app
COPY handler.js .
RUN npm install --production 2>/dev/null || true
ENV NODE_ENV=production
ENV MAX_OLD_SPACE_SIZE=${memory}
`,
    PYTHON3: `FROM ghcr.io/openfaas/python3-http:latest
WORKDIR /home/app
COPY handler.py .
COPY requirements.txt* ./
RUN pip install -r requirements.txt 2>/dev/null || true
`,
    GO119: `FROM ghcr.io/openfaas/golang-http:latest AS build
WORKDIR /go/src/handler
COPY handler.go .
RUN go build -o handler .

FROM alpine:3.18
COPY --from=build /go/src/handler/handler /usr/bin/handler
CMD ["/usr/bin/handler"]
`,
  };
  return templates[runtime];
}

// ─── Queue Event Handlers ─────────────────────────────────────
deploymentQueue.on('failed', (job, err) => {
  logger.error({ jobId: job.id, type: job.name, err: err.message }, 'Queue job failed');
});

deploymentQueue.on('completed', (job) => {
  logger.info({ jobId: job.id, type: job.name }, 'Queue job completed');
});

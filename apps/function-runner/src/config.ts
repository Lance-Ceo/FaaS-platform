import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  dockerSocket: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
  networkName: process.env.FUNCTION_NETWORK || 'faas-platform_faas-fn',
  functionImagePrefix: process.env.FUNCTION_IMAGE_PREFIX || 'faas-fn',
  functionMemoryMb: parseInt(process.env.FUNCTION_MEMORY_MB || '128', 10),
  functionTimeoutMs: parseInt(process.env.FUNCTION_TIMEOUT_MS || '30000', 10),
  containerPort: parseInt(process.env.CONTAINER_PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  // Runtime base images — all from Docker Hub
  runtimeImages: {
    NODE18:  process.env.IMAGE_NODE18  || 'node:18-alpine',
    PYTHON3: process.env.IMAGE_PYTHON3 || 'python:3.11-alpine',
    GO119:   process.env.IMAGE_GO119   || 'golang:1.21-alpine',
  } as Record<string, string>,
};

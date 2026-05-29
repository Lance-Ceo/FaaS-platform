# Deployment Service

> This service's logic is currently embedded in the API Gateway (`apps/api-gateway/src/services/deployment.service.ts`).
>
> In a microservices split, extract it here as a standalone worker process.

## Responsibilities
- Consume deployment jobs from the Bull queue
- Build Docker images from source code
- Push images to the Docker registry
- Deploy functions to OpenFaaS
- Report deployment status via WebSocket events
- Handle rollbacks on failure

## Extraction Steps
1. Copy `src/services/deployment.service.ts` → `src/worker.ts`
2. Remove the queue processor from the API Gateway
3. Run this as a separate container with Docker socket access
4. Communicate status back via Redis pub/sub or NATS

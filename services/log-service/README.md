# Log Service

> This service's logic is currently embedded in the API Gateway (`apps/api-gateway/src/services/log.service.ts`).

## Responsibilities
- Persist function execution logs to PostgreSQL
- Stream logs to WebSocket clients in real-time
- Provide log search and filtering
- Log retention / purge policies
- Export logs to external systems (e.g., Loki, Elasticsearch)

## Extraction Steps
1. Copy `src/services/log.service.ts` → `src/index.ts`
2. Expose a REST API for log queries
3. Subscribe to NATS for log events from function containers
4. Update API Gateway to proxy `/logs/*` to this service

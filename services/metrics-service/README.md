# Metrics Service

> This service's logic is currently embedded in the API Gateway (`apps/api-gateway/src/services/metrics.service.ts` and `src/routes/metrics.routes.ts`).

## Responsibilities
- Collect and aggregate function execution metrics
- Expose Prometheus metrics endpoint
- Store time-series data in PostgreSQL
- Provide per-function and platform-wide analytics
- Integrate with Grafana via Prometheus datasource

## Extraction Steps
1. Copy `src/services/metrics.service.ts` → `src/index.ts`
2. Expose `/metrics` (Prometheus) and `/api/metrics` (REST)
3. Update Prometheus scrape config to point to this service
4. Update API Gateway to proxy `/metrics/*` to this service

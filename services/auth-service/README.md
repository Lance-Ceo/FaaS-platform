# Auth Service

> This service's logic is currently embedded in the API Gateway (`apps/api-gateway/src/routes/auth.routes.ts` and `apps/api-gateway/src/middleware/auth.ts`).
>
> In a microservices split, extract it here as a standalone Express service on port 3002.

## Responsibilities
- User registration / login / logout
- JWT access + refresh token issuance
- API key management
- Password hashing (bcrypt)
- Token blacklisting (Redis)

## Extraction Steps
1. Copy `src/routes/auth.routes.ts` → `src/index.ts`
2. Copy `src/middleware/auth.ts`
3. Share the Prisma client or expose a gRPC/REST interface
4. Update API Gateway to proxy `/auth/*` to this service

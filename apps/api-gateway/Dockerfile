# ─── Build stage ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY apps/api-gateway/package*.json ./apps/api-gateway/
COPY packages/shared-types/package*.json ./packages/shared-types/

RUN npm ci --workspace=apps/api-gateway --workspace=packages/shared-types

# Copy source
COPY packages/shared-types ./packages/shared-types
COPY apps/api-gateway ./apps/api-gateway

# Build shared types
RUN npm run build --workspace=packages/shared-types

# Generate Prisma client
RUN cd apps/api-gateway && npx prisma generate

# Build API
RUN npm run build --workspace=apps/api-gateway

# ─── Production stage ─────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production

# Copy built artifacts
COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/apps/api-gateway/node_modules ./node_modules
COPY --from=builder /app/apps/api-gateway/prisma ./prisma
COPY --from=builder /app/apps/api-gateway/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/function-manager/package*.json ./apps/function-manager/
COPY packages/shared-types/package*.json ./packages/shared-types/
RUN npm ci --workspace=apps/function-manager --workspace=packages/shared-types
COPY packages/shared-types ./packages/shared-types
COPY apps/function-manager ./apps/function-manager
RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=apps/function-manager

FROM node:20-alpine AS runner
RUN apk add --no-cache docker-cli
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/function-manager/dist ./dist
COPY --from=builder /app/apps/function-manager/node_modules ./node_modules
COPY --from=builder /app/apps/function-manager/package.json ./
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs
CMD ["node", "dist/index.js"]

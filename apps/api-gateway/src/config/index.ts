import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://faas:faas@localhost:5432/faasdb',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // OpenFaaS / Function Runner
  openfaasGateway:  process.env.OPENFAAS_GATEWAY  || 'http://localhost:8080',
  openfaasUsername: process.env.OPENFAAS_USERNAME || 'admin',
  openfaasPassword: process.env.OPENFAAS_PASSWORD || 'admin',
  openfaasNamespace: process.env.OPENFAAS_NAMESPACE || 'faas-fn',

  // Docker Registry
  dockerRegistry: process.env.DOCKER_REGISTRY || 'localhost:5000',
  dockerRegistryUsername: process.env.DOCKER_REGISTRY_USERNAME || '',
  dockerRegistryPassword: process.env.DOCKER_REGISTRY_PASSWORD || '',

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

  // Prometheus
  prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',

  // NATS
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',

  // Build
  buildDir: process.env.BUILD_DIR || '/tmp/faas-builds',
  functionImagePrefix: process.env.FUNCTION_IMAGE_PREFIX || 'faas-fn',
};

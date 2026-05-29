-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DEVELOPER');
CREATE TYPE "Runtime" AS ENUM ('NODE18', 'PYTHON3', 'GO119');
CREATE TYPE "FunctionStatus" AS ENUM ('PENDING', 'BUILDING', 'DEPLOYING', 'READY', 'ERROR', 'STOPPED');
CREATE TYPE "TriggerType" AS ENUM ('HTTP', 'CRON', 'QUEUE', 'WEBHOOK');
CREATE TYPE "DeploymentStatus" AS ENUM ('QUEUED', 'BUILDING', 'PUSHING', 'DEPLOYING', 'SUCCESS', 'FAILED', 'ROLLED_BACK');
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateTable: users
CREATE TABLE "users" (
    "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email"        TEXT NOT NULL,
    "username"     TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role"         "UserRole" NOT NULL DEFAULT 'DEVELOPER',
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key"    ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateTable: refresh_tokens
CREATE TABLE "refresh_tokens" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "token"     TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateTable: api_keys
CREATE TABLE "api_keys" (
    "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name"       TEXT NOT NULL,
    "keyHash"    TEXT NOT NULL,
    "keyPrefix"  TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt"  TIMESTAMP(3),
    "isActive"   BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateTable: functions
CREATE TABLE "functions" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "runtime"     "Runtime" NOT NULL,
    "status"      "FunctionStatus" NOT NULL DEFAULT 'PENDING',
    "endpoint"    TEXT,
    "memory"      INTEGER NOT NULL DEFAULT 128,
    "timeout"     INTEGER NOT NULL DEFAULT 30,
    "replicas"    INTEGER NOT NULL DEFAULT 1,
    "minReplicas" INTEGER NOT NULL DEFAULT 1,
    "maxReplicas" INTEGER NOT NULL DEFAULT 5,
    "envVars"     JSONB NOT NULL DEFAULT '{}',
    "labels"      JSONB NOT NULL DEFAULT '{}',
    "triggers"    "TriggerType"[] DEFAULT ARRAY['HTTP']::"TriggerType"[],
    "sourceCode"  TEXT,
    "imageTag"    TEXT,
    "version"     INTEGER NOT NULL DEFAULT 1,
    "userId"      TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "deployedAt"  TIMESTAMP(3),
    CONSTRAINT "functions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "functions_name_userId_key" ON "functions"("name", "userId");

-- CreateTable: deployments
CREATE TABLE "deployments" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "functionId"  TEXT NOT NULL,
    "version"     INTEGER NOT NULL,
    "status"      "DeploymentStatus" NOT NULL DEFAULT 'QUEUED',
    "logs"        TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageTag"    TEXT,
    "error"       TEXT,
    "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "triggeredBy" TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: function_logs
CREATE TABLE "function_logs" (
    "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "functionId" TEXT NOT NULL,
    "level"      "LogLevel" NOT NULL DEFAULT 'INFO',
    "message"    TEXT NOT NULL,
    "timestamp"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId"  TEXT,
    "duration"   INTEGER,
    "statusCode" INTEGER,
    CONSTRAINT "function_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "function_logs_functionId_timestamp_idx" ON "function_logs"("functionId", "timestamp");

-- CreateTable: function_metrics
CREATE TABLE "function_metrics" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "functionId"  TEXT NOT NULL,
    "invocations" INTEGER NOT NULL DEFAULT 0,
    "errors"      INTEGER NOT NULL DEFAULT 0,
    "avgDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p95Duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p99Duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpuUsage"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memoryUsage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timestamp"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "function_metrics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "function_metrics_functionId_timestamp_idx" ON "function_metrics"("functionId", "timestamp");

-- AddForeignKeys
ALTER TABLE "refresh_tokens"   ADD CONSTRAINT "refresh_tokens_userId_fkey"   FOREIGN KEY ("userId")     REFERENCES "users"("id")     ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_keys"         ADD CONSTRAINT "api_keys_userId_fkey"         FOREIGN KEY ("userId")     REFERENCES "users"("id")     ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "functions"        ADD CONSTRAINT "functions_userId_fkey"        FOREIGN KEY ("userId")     REFERENCES "users"("id")     ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deployments"      ADD CONSTRAINT "deployments_functionId_fkey"  FOREIGN KEY ("functionId") REFERENCES "functions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deployments"      ADD CONSTRAINT "deployments_userId_fkey"      FOREIGN KEY ("userId")     REFERENCES "users"("id")     ON UPDATE CASCADE;
ALTER TABLE "function_logs"    ADD CONSTRAINT "function_logs_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "functions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "function_metrics" ADD CONSTRAINT "function_metrics_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "functions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

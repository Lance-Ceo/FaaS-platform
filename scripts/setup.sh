#!/bin/bash
# ============================================================
# FaaS Platform - Setup Script
# ============================================================
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[SETUP]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════╗"
echo "║       FaaS Platform Setup Script         ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
log "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || error "Docker is required but not installed"
command -v docker-compose >/dev/null 2>&1 || command -v docker >/dev/null 2>&1 || error "Docker Compose is required"
command -v node >/dev/null 2>&1 || error "Node.js is required but not installed"
command -v npm >/dev/null 2>&1 || error "npm is required but not installed"

log "Prerequisites OK ✓"

# Copy env file
if [ ! -f .env ]; then
  log "Creating .env from .env.example..."
  cp .env.example .env
  warn "Please review .env and update secrets before production use!"
else
  log ".env already exists, skipping..."
fi

# Install dependencies
log "Installing Node.js dependencies..."
npm install

# Build shared types
log "Building shared types package..."
npm run build --workspace=packages/shared-types

# Create OpenFaaS secrets directory
log "Setting up OpenFaaS secrets..."
mkdir -p infrastructure/openfaas/secrets
echo "admin" > infrastructure/openfaas/secrets/basic-auth-user
echo "admin" > infrastructure/openfaas/secrets/basic-auth-password

# Create build directory
mkdir -p /tmp/faas-builds

# Start infrastructure
log "Starting Docker services..."
docker compose up -d postgres redis

# Wait for PostgreSQL
log "Waiting for PostgreSQL to be ready..."
until docker compose exec -T postgres pg_isready -U faas -d faasdb 2>/dev/null; do
  echo -n "."
  sleep 2
done
echo ""
log "PostgreSQL is ready ✓"

# Run migrations
log "Running database migrations..."
cd apps/api-gateway
npx prisma migrate deploy
log "Migrations complete ✓"

# Seed database
log "Seeding database with sample data..."
npx ts-node prisma/seed.ts
log "Database seeded ✓"
cd ../..

# Start all services
log "Starting all services..."
docker compose up -d

log "Waiting for services to be healthy..."
sleep 10

echo ""
echo -e "${BOLD}${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Services available at:"
echo "  🌐 Frontend Dashboard:  http://localhost"
echo "  🔌 API Gateway:         http://localhost/api/v1"
echo "  ⚡ OpenFaaS Gateway:    http://localhost:8080"
echo "  📊 Grafana:             http://localhost:3003"
echo "  📈 Prometheus:          http://localhost:9090"
echo "  🗄️  PostgreSQL:          localhost:5432"
echo "  🔴 Redis:               localhost:6379"
echo ""
echo "Default credentials:"
echo "  Admin:     admin@faas.local / Admin@123456"
echo "  Developer: dev@faas.local / Dev@123456"
echo "  Grafana:   admin / admin"
echo ""

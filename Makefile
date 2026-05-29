# ============================================================
# FaaS Platform — Makefile
# Usage: make <target>
# ============================================================

.PHONY: help setup install build test lint \
        up down logs restart clean \
        db-migrate db-seed db-reset db-studio \
        build-images push-images \
        dev dev-api dev-frontend

# Default target
help:
	@echo ""
	@echo "  FaaS Platform — Available Commands"
	@echo "  ─────────────────────────────────────────────────"
	@echo "  Setup & Install"
	@echo "    make setup          Full first-time setup (Windows: use setup.ps1)"
	@echo "    make install        Install npm dependencies"
	@echo ""
	@echo "  Development"
	@echo "    make dev            Start all services in dev mode"
	@echo "    make dev-api        Start API Gateway only"
	@echo "    make dev-frontend   Start Frontend only"
	@echo ""
	@echo "  Docker"
	@echo "    make up             docker compose up -d"
	@echo "    make down           docker compose down"
	@echo "    make logs           Follow all container logs"
	@echo "    make restart        Restart all containers"
	@echo "    make build-images   Build all Docker images"
	@echo "    make clean          Remove containers, volumes, images"
	@echo ""
	@echo "  Database"
	@echo "    make db-migrate     Run Prisma migrations"
	@echo "    make db-seed        Seed the database"
	@echo "    make db-reset       Reset and re-seed (dev only)"
	@echo "    make db-studio      Open Prisma Studio"
	@echo ""
	@echo "  Quality"
	@echo "    make build          Build all packages"
	@echo "    make test           Run tests"
	@echo "    make lint           Run linters"
	@echo ""

# ─── Setup ───────────────────────────────────────────────────
setup:
	@bash scripts/setup.sh

install:
	npm install

# ─── Development ─────────────────────────────────────────────
dev:
	npm run dev

dev-api:
	npm run dev:api

dev-frontend:
	npm run dev:frontend

# ─── Build ───────────────────────────────────────────────────
build:
	npm run build

build-images:
	docker compose build

# ─── Test & Lint ─────────────────────────────────────────────
test:
	npm run test

lint:
	npm run lint

# ─── Docker ──────────────────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

restart:
	docker compose restart

clean:
	docker compose down -v --remove-orphans
	docker image prune -f

# ─── Database ────────────────────────────────────────────────
db-migrate:
	npm run db:migrate

db-seed:
	npm run db:seed

db-reset:
	@bash scripts/reset-db.sh

db-studio:
	npm run db:studio

# ─── Status ──────────────────────────────────────────────────
status:
	docker compose ps

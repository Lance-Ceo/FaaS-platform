# ⚡ FaaS Platform

A production-grade **Function-as-a-Service** platform inspired by Microsoft Azure Functions, powered by **OpenFaaS** and built with a modern TypeScript monorepo.

![FaaS Platform](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-20-brightgreen)
![Docker](https://img.shields.io/badge/docker-compose-blue)

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Services & Ports](#services--ports)
- [Default Credentials](#default-credentials)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Development Guide](#development-guide)
- [Deployment](#deployment)
- [CI/CD](#cicd)

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        NGINX (Port 80)                       │
│              Reverse Proxy + Rate Limiting                   │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
    ┌──────▼──────┐        ┌──────▼──────┐
    │  Frontend   │        │ API Gateway │
    │  React/TS   │        │  Node/TS    │
    │  Port 3000  │        │  Port 3001  │
    └─────────────┘        └──────┬──────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
       ┌──────▼──────┐   ┌────────▼──────┐   ┌───────▼──────┐
       │  PostgreSQL  │   │    Redis      │   │  OpenFaaS    │
       │  Port 5432   │   │  Port 6379    │   │  Port 8080   │
       └─────────────┘   └───────────────┘   └──────────────┘
                                                      │
                                              ┌───────▼──────┐
                                              │  Function    │
                                              │  Containers  │
                                              │  (Docker)    │
                                              └──────────────┘
              ┌───────────────────┐
              │   Monitoring      │
              │  Prometheus :9090 │
              │  Grafana    :3003 │
              └───────────────────┘
```

### Request Flow

1. All traffic enters through **NGINX** (port 80)
2. Static assets → **Frontend** (React SPA)
3. API calls → **API Gateway** (Express + TypeScript)
4. Function invocations → **OpenFaaS Gateway** → Docker containers
5. Async deployments → **Bull queue** (Redis-backed)
6. Real-time logs → **WebSocket** connections
7. Metrics → **Prometheus** → **Grafana**

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, TailwindCSS, Zustand, TanStack Query |
| API Gateway | Node.js 20, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7, Bull |
| Serverless Engine | OpenFaaS |
| Container Runtime | Docker, Docker Compose |
| Reverse Proxy | NGINX |
| Monitoring | Prometheus, Grafana |
| Messaging | NATS Streaming |
| Auth | JWT (access + refresh tokens), bcrypt |
| Code Editor | Monaco Editor |
| Real-time | WebSockets (ws) |
| Logging | Pino |
| CI/CD | GitHub Actions |

---

## 📁 Project Structure

```
faas-platform/
├── apps/
│   ├── frontend/               # React + TypeScript dashboard
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── layouts/        # Page layouts
│   │   │   ├── lib/            # API client, WebSocket
│   │   │   ├── pages/          # Route pages
│   │   │   └── store/          # Zustand state stores
│   │   └── Dockerfile
│   │
│   └── api-gateway/            # Express API + WebSocket server
│       ├── src/
│       │   ├── config/         # App configuration
│       │   ├── lib/            # Prisma, Redis, OpenFaaS clients
│       │   ├── middleware/      # Auth, validation, error handling
│       │   ├── routes/         # REST API route handlers
│       │   ├── services/       # Business logic (deploy, logs, metrics)
│       │   └── websocket/      # WebSocket manager
│       ├── prisma/
│       │   ├── schema.prisma   # Database schema
│       │   ├── seed.ts         # Seed data
│       │   └── migrations/     # SQL migrations
│       └── Dockerfile
│
├── packages/
│   └── shared-types/           # Shared TypeScript interfaces
│
├── infrastructure/
│   ├── nginx/                  # NGINX configuration
│   ├── openfaas/               # OpenFaaS stack + sample functions
│   │   ├── stack.yml
│   │   ├── functions/
│   │   │   ├── hello-world/    # Node.js sample
│   │   │   ├── image-resizer/  # Python sample
│   │   │   └── data-processor/ # Go sample
│   │   └── secrets/
│   └── docker/
│       ├── prometheus.yml      # Prometheus scrape config
│       └── grafana/            # Grafana provisioning
│
├── scripts/
│   ├── setup.sh                # Linux/macOS setup
│   └── setup.ps1               # Windows setup
│
├── api-tests/
│   └── faas-platform.postman_collection.json
│
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24+)
- [Node.js](https://nodejs.org/) (v20+)
- [npm](https://www.npmjs.com/) (v10+)

### Option A — Automated Setup (Recommended)

**Windows (PowerShell):**
```powershell
.\scripts\setup.ps1
```

**Linux / macOS:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Option B — Manual Setup

```bash
# 1. Clone and enter the project
cd "FaaS PlatForm"

# 2. Copy environment file
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Build shared types
npm run build --workspace=packages/shared-types

# 5. Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# 6. Wait ~10s for PostgreSQL, then run migrations
cd apps/api-gateway
npx prisma migrate deploy
npx ts-node prisma/seed.ts
cd ../..

# 7. Start all services
docker compose up -d

# 8. Open the dashboard
start http://localhost        # Windows
open http://localhost         # macOS
xdg-open http://localhost     # Linux
```

---

## 🌐 Services & Ports

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend Dashboard** | http://localhost | React web dashboard |
| **API Gateway** | http://localhost/api/v1 | REST API |
| **WebSocket** | ws://localhost/ws | Live logs & events |
| **Function Runner** | http://localhost:8080 | Custom function execution engine |
| **Grafana** | http://localhost:3003 | Metrics dashboards |
| **Prometheus** | http://localhost:9090 | Metrics scraper |
| **PostgreSQL** | localhost:5432 | Database |
| **Redis** | localhost:6379 | Cache & queue |
| **NATS** | localhost:4222 | Message bus |
| **Docker Registry** | localhost:5000 | Image registry |

---

## 🔑 Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| Admin user | admin@faas.local | Admin@123456 |
| Developer user | dev@faas.local | Dev@123456 |
| Grafana | admin | admin |
| OpenFaaS | admin | admin |
| PostgreSQL | faas | faas_secret |

> ⚠️ **Change all passwords before any production deployment.**

---

## 📡 API Reference

### Authentication

All API endpoints (except `/health`, `/webhooks/*`, and `/metrics/prometheus`) require a Bearer token.

```http
Authorization: Bearer <access_token>
```

Or an API key:

```http
X-API-Key: fk_your_api_key_here
```

### Endpoints

#### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout |
| GET  | `/api/v1/auth/me` | Get current user |
| PUT  | `/api/v1/auth/profile` | Update profile |
| POST | `/api/v1/auth/change-password` | Change password |
| GET  | `/api/v1/auth/api-keys` | List API keys |
| POST | `/api/v1/auth/api-keys` | Create API key |
| DELETE | `/api/v1/auth/api-keys/:id` | Revoke API key |

#### Functions
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/v1/functions` | List functions |
| POST   | `/api/v1/functions` | Create function |
| GET    | `/api/v1/functions/:id` | Get function |
| PUT    | `/api/v1/functions/:id` | Update function |
| DELETE | `/api/v1/functions/:id` | Delete function |
| POST   | `/api/v1/functions/:id/deploy` | Deploy function |
| POST   | `/api/v1/functions/:id/scale` | Scale function |
| POST   | `/api/v1/functions/:id/invoke` | Invoke function |
| GET    | `/api/v1/functions/:id/logs` | Get logs |
| GET    | `/api/v1/functions/:id/deployments` | Get deployments |

#### Webhooks
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/webhooks/:functionName` | Trigger function via webhook |

#### Metrics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/metrics/platform` | Platform metrics (admin) |
| GET | `/api/v1/metrics/functions/:id` | Per-function metrics |
| GET | `/api/v1/metrics/prometheus` | Prometheus scrape endpoint |

#### Admin (admin role required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/users` | List all users |
| PUT | `/api/v1/admin/users/:id/role` | Change user role |
| PUT | `/api/v1/admin/users/:id/status` | Activate/deactivate user |
| GET | `/api/v1/admin/functions` | All functions |
| GET | `/api/v1/admin/deployments` | Recent deployments |

### Example: Create and Deploy a Function

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@faas.local","password":"Dev@123456"}' \
  | jq -r '.data.accessToken')

# 2. Create function
FN_ID=$(curl -s -X POST http://localhost/api/v1/functions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-function",
    "runtime": "NODE18",
    "memory": 128,
    "timeout": 30,
    "sourceCode": "module.exports = async (e, ctx) => ctx.status(200).succeed({ok:true})"
  }' | jq -r '.data.id')

# 3. Deploy
curl -X POST http://localhost/api/v1/functions/$FN_ID/deploy \
  -H "Authorization: Bearer $TOKEN"

# 4. Invoke (once READY)
curl -X POST http://localhost/api/v1/functions/$FN_ID/invoke \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://faas:faas_secret@localhost:5432/faasdb` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `JWT_SECRET` | *(change this)* | JWT signing secret |
| `JWT_REFRESH_SECRET` | *(change this)* | Refresh token secret |
| `JWT_EXPIRES_IN` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token TTL |
| `OPENFAAS_GATEWAY` | `http://localhost:8080` | OpenFaaS gateway URL |
| `OPENFAAS_USERNAME` | `admin` | OpenFaaS credentials |
| `OPENFAAS_PASSWORD` | `admin` | OpenFaaS credentials |
| `DOCKER_REGISTRY` | `localhost:5000` | Docker registry URL |
| `CORS_ORIGINS` | `http://localhost` | Allowed CORS origins |
| `PROMETHEUS_ENABLED` | `true` | Enable Prometheus metrics |
| `RATE_LIMIT_MAX` | `100` | Requests per window |

---

## 💻 Development Guide

### Running Locally (without Docker)

```bash
# Terminal 1 — Start infrastructure only
docker compose up -d postgres redis nats

# Terminal 2 — API Gateway
cd apps/api-gateway
npx prisma generate
npx ts-node-dev --respawn --transpile-only src/index.ts

# Terminal 3 — Frontend
cd apps/frontend
npm run dev
```

### Database Operations

```bash
# Generate Prisma client after schema changes
cd apps/api-gateway && npx prisma generate

# Create a new migration
npx prisma migrate dev --name your_migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio (GUI)
npx prisma studio

# Reset database (dev only)
../../scripts/reset-db.sh
```

### Adding a New Runtime

1. Add the runtime to `packages/shared-types/src/index.ts` → `Runtime` type
2. Add it to `apps/api-gateway/prisma/schema.prisma` → `Runtime` enum
3. Add the base image in `apps/api-gateway/src/services/deployment.service.ts` → `RUNTIME_BASE_IMAGES`
4. Add a handler file template in `RUNTIME_HANDLER_FILES` and `generateDockerfile()`
5. Add the template in `apps/frontend/src/pages/dashboard/DeployPage.tsx` → `RUNTIME_TEMPLATES`
6. Run `npx prisma migrate dev --name add_runtime_xyz`

### WebSocket Events

Connect to `ws://localhost/ws?token=<access_token>` and listen for:

| Event | Payload | Description |
|-------|---------|-------------|
| `log` | `FunctionLog` | Real-time function log entry |
| `deployment_status` | `{ deploymentId, status, log }` | Deployment progress |
| `function_status` | `{ functionId, status }` | Function status change |
| `ping` | `{ ts }` | Heartbeat |

Subscribe to a specific function:
```json
{ "type": "subscribe", "payload": { "functionId": "uuid-here" } }
```

---

## 🚢 Deployment

### Production Docker Compose

```bash
# Set production secrets
export JWT_SECRET=$(openssl rand -hex 32)
export JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Build and start
docker compose -f docker-compose.yml up -d --build

# Run migrations
docker compose exec api-gateway npx prisma migrate deploy
```

### Environment Hardening Checklist

- [ ] Change all default passwords in `.env`
- [ ] Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (32+ chars)
- [ ] Configure `CORS_ORIGINS` to your actual domain
- [ ] Enable HTTPS in NGINX (add SSL certificates)
- [ ] Set `NODE_ENV=production`
- [ ] Configure external PostgreSQL with connection pooling (PgBouncer)
- [ ] Set up Redis AUTH password
- [ ] Change OpenFaaS admin password
- [ ] Restrict Docker socket access
- [ ] Set up log rotation

---

## 🔄 CI/CD

The GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on every push:

1. **Lint & Type Check** — TypeScript compilation check
2. **Tests** — Unit/integration tests with real PostgreSQL + Redis
3. **Build** — Docker images pushed to GitHub Container Registry
4. **Deploy** — SSH deploy to production (main branch only)

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Production server IP/hostname |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_SSH_KEY` | Private SSH key |

---

## 📊 Monitoring

### Prometheus Metrics

The API Gateway exposes metrics at `/api/v1/metrics/prometheus`:

- `http_requests_total` — HTTP request count by method/route/status
- `http_request_duration_seconds` — Request latency histogram
- `faas_function_invocations_total` — Function invocation count
- `faas_function_duration_seconds` — Function execution time
- `faas_active_functions` — Number of READY functions
- `faas_deployment_queue_size` — Pending deployments
- `faas_ws_connected_clients` — Active WebSocket connections
- Standard Node.js process metrics (heap, GC, event loop)

### Grafana Dashboards

Access Grafana at http://localhost:3003 (admin/admin).

The **FaaS Platform Overview** dashboard is auto-provisioned and shows:
- Request rate and error rate
- Response time percentiles (p50/p95/p99)
- Node.js memory and event loop lag
- Active functions count

---

## 🧪 API Testing

Import the Postman collection:

```
api-tests/faas-platform.postman_collection.json
```

Or use Bruno (open-source Postman alternative) — the collection format is compatible.

The collection includes pre-request scripts that automatically capture tokens and IDs between requests, so you can run the full flow end-to-end.

---

## 📄 License

MIT © FaaS Platform Contributors

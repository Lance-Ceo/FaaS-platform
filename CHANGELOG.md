# Changelog

All notable changes to FaaS Platform are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-05-29

### Added

#### Platform Core
- Production-grade FaaS platform monorepo with TypeScript throughout
- Docker Compose setup with 12 services (NGINX, API Gateway, Frontend, PostgreSQL, Redis, OpenFaaS, NATS, Registry, Prometheus, Grafana, Function Manager)
- Multi-container architecture with health checks and graceful shutdown

#### Authentication & Authorization
- JWT access tokens (15m TTL) + refresh tokens (7d TTL) with rotation
- bcrypt password hashing (cost factor 12)
- Role-based access control: `admin` and `developer` roles
- API key generation with bcrypt hashing and prefix display
- Token blacklisting via Redis on logout
- Rate limiting on auth endpoints (20 req/15min)

#### Function Management
- Create, read, update, delete serverless functions
- Support for 3 runtimes: Node.js 18, Python 3, Go 1.19
- Inline Monaco code editor with syntax highlighting
- Function versioning (auto-increment on update)
- Environment variable management
- Resource configuration: memory (64–2048 MB), timeout (1–300s), replicas (1–50)
- Auto-scaling configuration (min/max replicas)
- Trigger types: HTTP, CRON, QUEUE, WEBHOOK

#### Deployment Pipeline
- Bull queue-backed async deployment jobs (Redis)
- Deployment status tracking: QUEUED → BUILDING → DEPLOYING → SUCCESS/FAILED
- Real-time deployment logs via WebSocket
- Automatic rollback on failure
- Retry mechanism (3 attempts, exponential backoff)
- OpenFaaS integration for function deployment and scaling

#### API Gateway
- RESTful API with Express + TypeScript
- Request validation with express-validator
- Centralized error handling with AppError
- CORS support with configurable origins
- Helmet security headers
- Rate limiting (100 req/15min global)
- Request/response logging with Pino
- Prometheus metrics middleware

#### Web Dashboard
- React 18 + TypeScript + TailwindCSS
- Dark mode UI with glassmorphism design
- Zustand state management
- TanStack Query for server state
- Pages: Overview, Functions, Deploy, API Keys, Logs, Metrics, Settings, Admin
- Real-time live logs viewer with WebSocket
- Monaco code editor for inline function editing
- Deployment timeline component
- Responsive layout with sidebar navigation

#### Monitoring & Observability
- Prometheus metrics: HTTP requests, function invocations, deployment queue, WebSocket clients
- Grafana dashboard auto-provisioned with FaaS Platform Overview
- Alert rules: high error rate, high latency, function errors, API gateway down
- Structured logging with Pino (JSON in production, pretty in development)
- Health check endpoint with DB and Redis status

#### Event-Driven Features
- HTTP triggers (default)
- CRON triggers with node-cron scheduler
- Webhook triggers with optional secret validation
- NATS JetStream for async event bus

#### Developer Experience
- Postman collection with 20+ pre-configured requests
- Bruno API collection as open-source alternative
- VS Code workspace settings, launch configs, recommended extensions
- Makefile with convenience commands
- Setup scripts for Windows (PowerShell) and Linux/macOS (bash)
- Prisma Studio integration
- Database seed with sample users and functions

#### Security
- Input sanitization on all endpoints
- SQL injection prevention via Prisma parameterized queries
- XSS protection via Helmet
- CSRF protection via SameSite cookies
- Docker socket access restricted to necessary services
- Secrets managed via Docker secrets (not environment variables)

#### Infrastructure
- NGINX reverse proxy with rate limiting zones
- Docker Registry for function images
- PostgreSQL 16 with connection pooling
- Redis 7 with LRU eviction policy
- OpenFaaS Gateway with basic auth
- faas-swarm provider for Docker-based function execution

### Sample Functions
- `hello-world` — Node.js 18 greeting function
- `image-resizer` — Python 3 image dimension processor
- `data-processor` — Go 1.19 data transformation function

# Contributing to FaaS Platform

Thank you for your interest in contributing! This guide covers everything you need to get started.

## Development Setup

```bash
# 1. Fork and clone
git clone https://github.com/your-org/faas-platform.git
cd faas-platform

# 2. Install dependencies
npm install

# 3. Start infrastructure
docker compose up -d postgres redis

# 4. Set up database
cd apps/api-gateway
npx prisma migrate dev
npx ts-node prisma/seed.ts
cd ../..

# 5. Start dev servers
npm run dev
```

## Project Structure

See [README.md](./README.md#project-structure) for the full layout.

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `develop` | Integration branch |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `chore/*` | Maintenance |

Always branch from `develop`, never from `main`.

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

feat(functions): add cron trigger support
fix(auth): handle expired refresh token edge case
chore(deps): update prisma to 5.8.0
docs(readme): add kubernetes deployment guide
test(api): add function creation integration tests
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

## Pull Request Process

1. Create a branch: `git checkout -b feature/my-feature develop`
2. Make your changes with tests
3. Run `npm run lint && npm run test`
4. Push and open a PR against `develop`
5. Fill in the PR template
6. Request review from a maintainer

## Code Standards

- **TypeScript everywhere** — no `any` without justification
- **Async/await** over raw Promises
- **Error handling** — always use `AppError` for API errors
- **Logging** — use `logger` (pino), never `console.log` in production code
- **Tests** — new features need tests; bug fixes need regression tests
- **Comments** — explain *why*, not *what*

## Adding a New API Endpoint

1. Add the route handler in `apps/api-gateway/src/routes/`
2. Add validation with `express-validator`
3. Register the route in `src/index.ts`
4. Add types to `packages/shared-types/src/index.ts`
5. Add the endpoint to the Postman collection in `api-tests/`
6. Update the README API reference table

## Adding a New Frontend Page

1. Create the page in `apps/frontend/src/pages/`
2. Add the route in `apps/frontend/src/App.tsx`
3. Add the nav item in `apps/frontend/src/components/layout/Sidebar.tsx`
4. Add any new API calls as hooks in `apps/frontend/src/hooks/`

## Running Tests

```bash
# All tests
npm run test

# Watch mode
cd apps/api-gateway && npm run test:watch

# Coverage
cd apps/api-gateway && npm run test:coverage
```

## Reporting Issues

Use GitHub Issues with the appropriate label:
- `bug` — Something is broken
- `enhancement` — New feature request
- `documentation` — Docs improvement
- `question` — General question

# ============================================================
# FaaS Platform - Windows Setup Script (PowerShell)
# ============================================================
param(
    [switch]$SkipDeps,
    [switch]$SkipDocker,
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "[SETUP] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       FaaS Platform Setup Script         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Step "Checking prerequisites..."
if (-not (Get-Command docker -ErrorAction SilentlyContinue))  { Write-Fail "Docker is required" }
if (-not (Get-Command node   -ErrorAction SilentlyContinue))  { Write-Fail "Node.js is required" }
if (-not (Get-Command npm    -ErrorAction SilentlyContinue))  { Write-Fail "npm is required" }
Write-Step "Prerequisites OK ✓"

# Copy env file
if (-not (Test-Path ".env")) {
    Write-Step "Creating .env from .env.example..."
    Copy-Item ".env.example" ".env"
    Write-Warn "Review .env and update secrets before production use!"
} else {
    Write-Step ".env already exists, skipping..."
}

# Install dependencies
if (-not $SkipDeps) {
    Write-Step "Installing Node.js dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Fail "npm install failed" }
}

# Build shared types
Write-Step "Building shared types..."
npm run build --workspace=packages/shared-types
if ($LASTEXITCODE -ne 0) { Write-Fail "Shared types build failed" }

# OpenFaaS secrets
Write-Step "Setting up OpenFaaS secrets..."
New-Item -ItemType Directory -Force -Path "infrastructure\openfaas\secrets" | Out-Null
"admin" | Out-File -FilePath "infrastructure\openfaas\secrets\basic-auth-user"  -Encoding ascii -NoNewline
"admin" | Out-File -FilePath "infrastructure\openfaas\secrets\basic-auth-password" -Encoding ascii -NoNewline

# Build dir
New-Item -ItemType Directory -Force -Path "$env:TEMP\faas-builds" | Out-Null

if (-not $SkipDocker) {
    # Start infrastructure first
    Write-Step "Starting PostgreSQL and Redis..."
    docker compose up -d postgres redis
    if ($LASTEXITCODE -ne 0) { Write-Fail "Failed to start infrastructure" }

    # Wait for PostgreSQL
    Write-Step "Waiting for PostgreSQL..."
    $retries = 0
    do {
        Start-Sleep -Seconds 3
        $retries++
        $result = docker compose exec -T postgres pg_isready -U faas -d faasdb 2>&1
    } while ($LASTEXITCODE -ne 0 -and $retries -lt 20)

    if ($LASTEXITCODE -ne 0) { Write-Fail "PostgreSQL did not become ready" }
    Write-Step "PostgreSQL ready ✓"
}

# Migrations
Write-Step "Running database migrations..."
Push-Location "apps\api-gateway"
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Write-Fail "Migrations failed" }
Write-Step "Migrations complete ✓"

# Seed
if (-not $SkipSeed) {
    Write-Step "Seeding database..."
    npx ts-node prisma/seed.ts
    if ($LASTEXITCODE -ne 0) { Write-Warn "Seed failed (may already be seeded)" }
    Write-Step "Database seeded ✓"
}
Pop-Location

if (-not $SkipDocker) {
    Write-Step "Starting all services..."
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { Write-Fail "docker compose up failed" }
    Start-Sleep -Seconds 10
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  Frontend Dashboard : http://localhost"
Write-Host "  API Gateway        : http://localhost/api/v1"
Write-Host "  OpenFaaS Gateway   : http://localhost:8080"
Write-Host "  Grafana            : http://localhost:3003"
Write-Host "  Prometheus         : http://localhost:9090"
Write-Host ""
Write-Host "Default credentials:" -ForegroundColor Cyan
Write-Host "  Admin  : admin@faas.local / Admin@123456"
Write-Host "  Dev    : dev@faas.local   / Dev@123456"
Write-Host "  Grafana: admin / admin"
Write-Host ""

#!/bin/bash
# Reset and re-seed the database (development only)
set -e

echo "⚠️  This will DROP and recreate the database. Continue? (y/N)"
read -r confirm
[ "$confirm" = "y" ] || exit 0

echo "Resetting database..."
cd apps/api-gateway
npx prisma migrate reset --force
npx ts-node prisma/seed.ts
echo "✅ Database reset complete"

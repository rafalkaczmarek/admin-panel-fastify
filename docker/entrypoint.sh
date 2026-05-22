#!/bin/sh
set -e

# Apply the Prisma schema to the database. We prefer `migrate deploy` when the
# project actually has migration files committed; otherwise we fall back to
# `db push` so the schema is created on first boot.
if [ -d "./prisma/migrations" ] && [ -n "$(ls -A ./prisma/migrations 2>/dev/null)" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  ./node_modules/.bin/prisma migrate deploy
else
  echo "[entrypoint] No migrations found - syncing schema with prisma db push..."
  ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss
fi

# Optional one-shot seed. Enable by setting RUN_SEED=true on the container.
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] Seeding database..."
  node prisma/seed.js || echo "[entrypoint] Seed failed - continuing startup"
fi

echo "[entrypoint] Starting app: $*"
exec "$@"

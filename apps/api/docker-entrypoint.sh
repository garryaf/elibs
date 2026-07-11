#!/bin/sh
set -e

echo "=== eLIS API Entrypoint ==="
echo "Environment: ${NODE_ENV:-development}"
echo "Port: ${PORT:-3001}"

# Run Prisma migrations (safe for production — deploy only applies pending)
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  cd /app/apps/api

  # Attempt migration deploy; if failed migrations exist, try to resolve them
  DEPLOY_OUTPUT=$(npx prisma migrate deploy 2>&1) || true
  DEPLOY_EXIT=$?

  if echo "$DEPLOY_OUTPUT" | grep -q "P3009"; then
    echo "Migration deploy failed (P3009). Attempting to resolve failed migrations..."
    # Extract migration name from error output
    FAILED=$(echo "$DEPLOY_OUTPUT" | grep -o '`[0-9_a-zA-Z]*`' | tr -d '`' | head -n 5)
    if [ -n "$FAILED" ]; then
      for migration in $FAILED; do
        echo "  Resolving (marking rolled-back): $migration"
        npx prisma migrate resolve --rolled-back "$migration" 2>/dev/null || true
      done
      # Retry deploy after resolving
      echo "Retrying migration deploy..."
      npx prisma migrate deploy
    else
      echo "Could not extract failed migration name. Manual intervention required."
      echo "Run: npx prisma migrate resolve --rolled-back <migration_name>"
      echo "Deploy output was:"
      echo "$DEPLOY_OUTPUT"
      exit 1
    fi
  elif [ $DEPLOY_EXIT -ne 0 ]; then
    echo "Migration deploy failed with unexpected error:"
    echo "$DEPLOY_OUTPUT"
    exit 1
  else
    echo "$DEPLOY_OUTPUT"
  fi

  echo "Migrations complete."
  cd /app
fi

# Run seed on first deploy (idempotent — skips if data already exists)
if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "Running database seed (idempotent)..."
  cd /app/apps/api
  if [ -f "prisma/seeds/dist/index.js" ]; then
    node prisma/seeds/dist/index.js || echo "[seed] Warning: Seed failed (non-fatal, app will still start)"
  else
    echo "[seed] Compiled seed not found at prisma/seeds/dist/index.js — skipping"
  fi
  cd /app
fi

# Execute the main command
exec "$@"

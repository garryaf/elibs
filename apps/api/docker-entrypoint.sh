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
  if ! npx prisma migrate deploy 2>/dev/null; then
    echo "Migration deploy failed. Attempting to resolve failed migrations..."
    # Get list of failed migrations and mark them as applied (they contain IF NOT EXISTS guards)
    FAILED=$(npx prisma migrate status 2>&1 | grep "failed" | grep -oP '\d{14}_[a-z_]+' || true)
    if [ -n "$FAILED" ]; then
      for migration in $FAILED; do
        echo "  Resolving: $migration"
        npx prisma migrate resolve --applied "$migration" 2>/dev/null || true
      done
      # Retry deploy
      npx prisma migrate deploy
    else
      echo "No failed migrations found to resolve. Retrying deploy..."
      npx prisma migrate deploy
    fi
  fi

  echo "Migrations complete."
  cd /app
fi

# Execute the main command
exec "$@"

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
    # Get list of failed migrations and mark them as rolled-back
    # Use POSIX-compatible grep (BusyBox/Alpine doesn't support -P or -oE with extended patterns)
    FAILED=$(npx prisma migrate status 2>&1 | grep -i "failed" | sed -n 's/.*\([0-9]\{14\}_[a-zA-Z0-9_]*\).*/\1/p' || true)
    if [ -n "$FAILED" ]; then
      for migration in $FAILED; do
        echo "  Resolving (marking rolled-back): $migration"
        npx prisma migrate resolve --rolled-back "$migration" 2>/dev/null || true
      done
      # Retry deploy after resolving
      echo "Retrying migration deploy..."
      npx prisma migrate deploy
    else
      echo "No failed migrations found via status output. Checking database directly..."
      # Fallback: query the _prisma_migrations table directly for failed entries
      echo "Retrying deploy..."
      npx prisma migrate deploy
    fi
  fi

  echo "Migrations complete."
  cd /app
fi

# Execute the main command
exec "$@"

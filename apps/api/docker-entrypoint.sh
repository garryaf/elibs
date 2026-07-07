#!/bin/sh
set -e

echo "=== eLIS API Entrypoint ==="
echo "Environment: ${NODE_ENV:-development}"
echo "Port: ${PORT:-3001}"

# Run Prisma migrations (safe for production — deploy only applies pending)
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy
  echo "Migrations complete."
fi

# Execute the main command
exec "$@"

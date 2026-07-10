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
    # Extract migration name from error output like:
    # "The `20260709150654_add_insurance_type_enum` migration started at ..."
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

# Execute the main command
exec "$@"

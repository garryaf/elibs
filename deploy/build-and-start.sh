#!/bin/bash
# ============================================================================
# eLIS — Build & Start (jalankan di VPS setelah git pull)
#
# Usage: cd /home/dinaragil/elibs && bash deploy/build-and-start.sh
#
# Script ini:
# 1. Install dependencies
# 2. Build API (NestJS) 
# 3. Build Web (Next.js)
# 4. Run database migrations
# 5. Run seed (idempotent)
# 6. Start/restart PM2
# ============================================================================

set -e

APP_DIR="/home/dinaragil/elibs"
cd "$APP_DIR"

echo "=== eLIS Build & Start ==="
echo "Directory: $(pwd)"
echo ""

# --- Create logs directory ---
mkdir -p logs

# --- Install dependencies ---
echo "[1/6] Installing dependencies..."
npm ci --workspace=api --include-workspace-root
npm ci --workspace=web --include-workspace-root

# --- Build API ---
echo "[2/6] Building API (NestJS)..."
cd apps/api
npx prisma generate
npx nest build
cd "$APP_DIR"

# --- Build seed scripts ---
echo "[3/6] Compiling seed scripts..."
cd apps/api/prisma/seeds
if [ -f "tsconfig.seed.json" ]; then
  npx tsc --project tsconfig.seed.json || echo "[seed] Compile warning (non-fatal)"
fi
cd "$APP_DIR"

# --- Build Web ---
echo "[4/6] Building Web (Next.js)..."
cd apps/web
NEXT_PUBLIC_API_URL=https://elibs.jizo.my.id NEXT_TELEMETRY_DISABLED=1 npm run build
cd "$APP_DIR"

# --- Database migrations ---
echo "[5/6] Running database migrations..."
cd apps/api
npx prisma migrate deploy || echo "[migrate] Warning: migration issue (check manually)"
cd "$APP_DIR"

# --- Seed ---
echo "[6/6] Running seed (idempotent)..."
cd apps/api
if [ -f "prisma/seeds/dist/index.js" ]; then
  node prisma/seeds/dist/index.js || echo "[seed] Warning: seed issue (non-fatal)"
else
  echo "[seed] No compiled seed found, skipping"
fi
cd "$APP_DIR"

# --- Start/restart PM2 ---
echo ""
echo "=== Starting PM2 ==="
if pm2 list | grep -q "elis-api"; then
  pm2 restart elis-ecosystem.config.js --update-env
else
  pm2 start elis-ecosystem.config.js
fi
pm2 save

echo ""
echo "=== Done! ==="
pm2 status
echo ""
echo "Logs: pm2 logs"
echo "Monitor: pm2 monit"

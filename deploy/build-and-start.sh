#!/bin/bash
# ============================================================================
# eLIS — Build & Start (ONE SCRIPT TO RULE THEM ALL)
#
# Jalankan di VPS: cd /home/dinaragil/elibs && bash deploy/build-and-start.sh
#
# Script ini handle semuanya:
# 1. Start Docker infra (postgres, redis, nginx, certbot)
# 2. Wait for postgres healthy
# 3. Install dependencies + pin Prisma 5.x
# 4. Build API (NestJS)
# 5. Build Web (Next.js)
# 6. Run database migrations + seed
# 7. Stop old PM2, start fresh
# ============================================================================

set -e

APP_DIR="/home/dinaragil/elibs"
cd "$APP_DIR"

echo "============================================"
echo "  eLIS Build & Start"
echo "  Directory: $(pwd)"
echo "  Time: $(date)"
echo "============================================"
echo ""

# --- Step 1: Start Docker infrastructure ---
echo "[1/8] Starting Docker infrastructure (postgres, redis, nginx, certbot)..."

# Recreate nginx with extra_hosts for host.docker.internal
sudo docker compose -f docker-compose.yml up -d postgres redis certbot
# Nginx needs special handling for host.docker.internal
sudo docker rm -f elis-nginx 2>/dev/null || true
sudo docker run -d \
  --name elis-nginx \
  --restart unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  -p 80:80 -p 443:443 \
  -v "$APP_DIR/deploy/nginx/active.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$APP_DIR/deploy/certbot/conf:/etc/letsencrypt:ro" \
  -v "$APP_DIR/deploy/certbot/www:/var/www/certbot:ro" \
  nginx:alpine

echo "Waiting for postgres to be healthy..."
for i in {1..30}; do
  if sudo docker exec elis-postgres pg_isready -U postgres -d elis_db > /dev/null 2>&1; then
    echo "  Postgres is ready!"
    break
  fi
  echo "  Waiting... ($i/30)"
  sleep 2
done

# Verify postgres is reachable from host on correct port
echo "Verifying postgres connection from host..."
if ! pg_isready -h localhost -p 5433 -U postgres > /dev/null 2>&1; then
  echo "  pg_isready not available, trying with docker exec..."
  sudo docker exec elis-postgres pg_isready -U postgres -d elis_db
fi

# --- Step 2: Create directories ---
echo ""
echo "[2/8] Creating directories..."
mkdir -p logs

# --- Step 3: Install dependencies + pin Prisma ---
echo ""
echo "[3/8] Installing dependencies..."
cd "$APP_DIR"

# CRITICAL: Delete any global prisma cache that npm might use
rm -rf node_modules/.prisma node_modules/@prisma node_modules/prisma 2>/dev/null || true
rm -rf apps/api/node_modules/.prisma apps/api/node_modules/@prisma apps/api/node_modules/prisma 2>/dev/null || true

# Install all workspace deps from lockfile (exact versions)
npm ci

# Force pin Prisma 5.22.0 (overrides any npm resolve to v7)
cd "$APP_DIR/apps/api"
npm install prisma@5.22.0 @prisma/client@5.22.0 --save-exact --install-strategy=nested

# --- Step 4: Generate Prisma Client ---
echo ""
echo "[4/8] Generating Prisma Client..."
cd "$APP_DIR/apps/api"

# Verify correct version is installed
PRISMA_VER=$(npx prisma --version 2>/dev/null | grep "prisma" | head -1 || echo "unknown")
echo "  Prisma version: $PRISMA_VER"

# If still v7, force use local binary
if echo "$PRISMA_VER" | grep -q "7\."; then
  echo "  ERROR: Prisma v7 detected despite pinning. Using direct path..."
  ./node_modules/.bin/prisma generate
else
  npx prisma generate
fi

# --- Step 5: Build API ---
echo ""
echo "[5/8] Building API (NestJS)..."
npx nest build

# --- Step 6: Build Web ---
echo ""
echo "[6/8] Building Web (Next.js)..."
cd "$APP_DIR/apps/web"
NEXT_PUBLIC_API_URL=https://elibs.jizo.my.id NEXT_TELEMETRY_DISABLED=1 npm run build

# --- Step 7: Run migrations + seed ---
echo ""
echo "[7/8] Running database migrations and seed..."
cd "$APP_DIR/apps/api"

# Set DATABASE_URL for prisma CLI (port 5433!)
export DATABASE_URL="postgresql://postgres:postgres123@localhost:5433/elis_db?schema=public"

npx prisma migrate deploy || echo "[migrate] Warning: check manually"

if [ -f "prisma/seeds/dist/index.js" ]; then
  node prisma/seeds/dist/index.js || echo "[seed] Warning: non-fatal"
elif [ -f "prisma/seeds/index.ts" ]; then
  # Compile seed first
  cd prisma/seeds
  npx tsc --project tsconfig.seed.json 2>/dev/null || true
  cd "$APP_DIR/apps/api"
  [ -f "prisma/seeds/dist/index.js" ] && node prisma/seeds/dist/index.js || echo "[seed] Compile/run failed (non-fatal)"
fi

# --- Step 8: Start PM2 ---
echo ""
echo "[8/8] Starting PM2..."
cd "$APP_DIR"

# Kill old processes cleanly
pm2 kill 2>/dev/null || true
sleep 2

# Start fresh
pm2 start elis-ecosystem.config.js
pm2 save

echo ""
echo "============================================"
echo "  eLIS Deploy Complete!"
echo "============================================"
echo ""
pm2 status
echo ""
echo "  Web: https://elibs.jizo.my.id"
echo "  API: https://elibs.jizo.my.id/api/v1/health"
echo ""
echo "  Logs: pm2 logs"
echo "  Monitor: pm2 monit"
echo "============================================"

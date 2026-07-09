#!/bin/bash
# ============================================================================
# eLIS — SSL Certificate Initialization Script
# Run ONCE on first deploy to generate Let's Encrypt SSL certificates
#
# Prerequisites:
#   1. DNS A record for elibs.jizo.my.id pointing to this server's IP
#   2. Port 80 open on firewall
#   3. Docker and docker compose installed
#   4. All services running (docker compose up -d)
#
# Usage: sudo bash deploy/init-ssl.sh
# ============================================================================

set -e

DOMAIN="elibs.jizo.my.id"
EMAIL="admin@jizo.my.id"  # Change this to your email
CERTBOT_PATH="./deploy/certbot"

echo "=== eLIS SSL Initialization ==="
echo "Domain: $DOMAIN"
echo ""

# Step 1: Create certbot directories
echo "[1/5] Creating certbot directories..."
mkdir -p "$CERTBOT_PATH/conf"
mkdir -p "$CERTBOT_PATH/www"

# Step 2: Start with HTTP-only config
echo "[2/5] Setting HTTP-only Nginx config..."
cp ./deploy/nginx/nginx-init.conf ./deploy/nginx/active.conf

# Restart nginx with HTTP-only config
docker compose up -d --force-recreate nginx
sleep 5

# Verify nginx is running
echo "Checking nginx status..."
docker ps | grep elis-nginx || { echo "ERROR: Nginx failed to start"; exit 1; }

# Step 3: Request certificate
echo "[3/5] Requesting SSL certificate from Let's Encrypt..."
docker run --rm \
  -v "$(pwd)/$CERTBOT_PATH/conf:/etc/letsencrypt" \
  -v "$(pwd)/$CERTBOT_PATH/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  -d "$DOMAIN"

# Step 4: Switch to HTTPS config
echo "[4/5] Switching Nginx to HTTPS config..."
cp ./deploy/nginx/nginx.conf ./deploy/nginx/active.conf

# Step 5: Reload nginx
echo "[5/5] Reloading Nginx..."
docker exec elis-nginx nginx -s reload

echo ""
echo "=== SSL setup complete! ==="
echo "Your app is now accessible at: https://$DOMAIN"
echo ""
echo "To renew later:"
echo "  docker run --rm -v \$(pwd)/$CERTBOT_PATH/conf:/etc/letsencrypt -v \$(pwd)/$CERTBOT_PATH/www:/var/www/certbot certbot/certbot renew"
echo "  docker exec elis-nginx nginx -s reload"

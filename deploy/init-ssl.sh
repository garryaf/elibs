#!/bin/bash
# ============================================================================
# eLIS — SSL Certificate Initialization Script
# Run ONCE on first deploy to generate Let's Encrypt SSL certificates
#
# Prerequisites:
#   1. DNS A record for elibs.jizo.my.id pointing to this server's IP
#   2. Port 80 open on firewall
#   3. Docker and docker compose installed
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

# Step 2: Start nginx with HTTP-only config for ACME challenge
echo "[2/5] Starting services..."
docker compose up -d nginx

# Wait for nginx to start
sleep 5

# Step 3: Test that port 80 is reachable
echo "[3/5] Testing HTTP access..."
curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN/.well-known/acme-challenge/test || true
echo ""

# Step 4: Request certificate using standalone certbot (bypasses entrypoint override)
echo "[4/5] Requesting SSL certificate from Let's Encrypt..."
docker run --rm \
  -v "$(pwd)/$CERTBOT_PATH/conf:/etc/letsencrypt" \
  -v "$(pwd)/$CERTBOT_PATH/www:/var/www/certbot" \
  --network elis_elis-network \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  -d "$DOMAIN"

# Step 5: Switch to HTTPS config and reload nginx
echo "[5/5] Switching Nginx to HTTPS config..."
docker exec elis-nginx sh -c "cp /etc/nginx/conf.d/ssl.conf /etc/nginx/conf.d/default.conf && nginx -s reload"

echo ""
echo "=== SSL setup complete! ==="
echo "Your app is now accessible at: https://$DOMAIN"
echo ""
echo "SSL auto-renewal is handled by the certbot container (every 12h check)."
echo "To manually renew: docker run --rm -v \$(pwd)/$CERTBOT_PATH/conf:/etc/letsencrypt -v \$(pwd)/$CERTBOT_PATH/www:/var/www/certbot certbot/certbot renew"

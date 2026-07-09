#!/bin/bash
# ============================================================================
# eLIS — SSL Certificate Initialization Script
# Run ONCE on first deploy to generate Let's Encrypt SSL certificates
#
# Prerequisites:
#   1. DNS A record for elibs.jizo.my.id pointing to this server's IP
#   2. Port 80 and 443 open on firewall
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
echo "[1/4] Creating certbot directories..."
mkdir -p "$CERTBOT_PATH/conf"
mkdir -p "$CERTBOT_PATH/www"

# Step 2: Start nginx with HTTP-only config for ACME challenge
echo "[2/4] Starting Nginx with HTTP-only config..."
docker compose up -d nginx

# Wait for nginx to start
sleep 3

# Step 3: Request certificate using certbot
echo "[3/4] Requesting SSL certificate from Let's Encrypt..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

# Step 4: Switch to HTTPS config
echo "[4/4] Switching Nginx to HTTPS config..."

# Replace nginx config with SSL version
docker compose exec nginx sh -c "cp /etc/nginx/conf.d/ssl.conf /etc/nginx/conf.d/default.conf && nginx -s reload"

echo ""
echo "=== SSL setup complete! ==="
echo "Your app is now accessible at: https://$DOMAIN"
echo ""
echo "SSL auto-renewal is handled by the certbot container."
echo "To manually renew: docker compose run --rm certbot renew"

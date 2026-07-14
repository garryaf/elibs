#!/bin/bash
# ============================================================================
# eLIS — One-time VPS Setup Script
# 
# Run this ONCE on a fresh VPS to prepare the environment.
# After this, deployments are automated via GitHub Actions.
#
# Usage: ssh user@vps 'bash -s' < deploy/setup-vps.sh
# ============================================================================

set -e

echo "=== eLIS VPS Setup ==="

# --- System updates ---
echo "[1/7] Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# --- Install Node.js 20 ---
echo "[2/7] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# --- Install PM2 ---
echo "[3/7] Installing PM2..."
sudo npm install -g pm2
pm2 startup systemd -u $USER --hp $HOME || true

# --- Install Docker (for infra only) ---
echo "[4/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  echo "NOTE: Log out and back in for Docker group to take effect"
fi

# --- Install Docker Compose plugin ---
echo "[5/7] Installing Docker Compose..."
sudo apt-get install -y docker-compose-plugin || true

# --- Create app directory ---
echo "[6/7] Creating application directory..."
sudo mkdir -p /opt/elis/logs
sudo chown -R $USER:$USER /opt/elis

# --- Add swap (important for 2GB VPS) ---
echo "[7/7] Configuring swap..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  sudo sysctl vm.swappiness=10
  echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
  echo "Swap configured: 2 GB"
else
  echo "Swap already exists"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Copy your deploy/docker-compose.infra.yml to /opt/elis/deploy/"
echo "2. Copy your deploy/nginx/elis-native.conf to /opt/elis/deploy/nginx/"
echo "3. Copy your deploy/certbot/ to /opt/elis/deploy/certbot/"
echo "4. Copy elis-ecosystem.config.js to /opt/elis/"
echo "5. Start infra: cd /opt/elis/deploy && docker compose -f docker-compose.infra.yml up -d"
echo "6. Set GitHub Secret:"
echo "   - VPS_SSH_KEY: isi dari ~/Documents/SSH/elib.pem"
echo "   (host=103.196.155.147, user=dinaragil sudah hardcoded di workflow)"
echo "7. Set GitHub Variable:"
echo "   - NEXT_PUBLIC_API_URL: https://elibs.jizo.my.id"
echo ""
echo "First deploy: push to main branch → GitHub Actions will build & deploy"

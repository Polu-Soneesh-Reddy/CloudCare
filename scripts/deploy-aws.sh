#!/bin/bash
# CloudCare AWS Deployment Script
# Run this ON the EC2 instance: bash deploy-aws.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/YOUR_USERNAME/cloudcare.git}"
APP_DIR="/home/ubuntu/cloudcare"
ENV_FILE="$APP_DIR/.env"

echo "============================================"
echo "  CloudCare AWS Deployment"
echo "  $(date)"
echo "============================================"

# ── Clone or pull latest code ──
if [ -d "$APP_DIR/.git" ]; then
  echo "[1/6] Pulling latest code..."
  cd "$APP_DIR"
  git pull origin main
else
  echo "[1/6] Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── Create .env if missing ──
echo "[2/6] Checking environment file..."
if [ ! -f "$ENV_FILE" ]; then
  echo "Creating .env from template..."
  cp .env.example .env
  # Generate a random secret key
  SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  sed -i "s/changeme_generate_with_openssl_rand_hex_32/$SECRET/" .env
  echo "⚠️  IMPORTANT: Edit /home/ubuntu/cloudcare/.env to set:"
  echo "   - POSTGRES_PASSWORD"
  echo "   - EC2_HOST (your public IP)"
  echo "   - DOCKERHUB_USERNAME"
fi

# ── Set EC2 public IP in .env ──
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")
sed -i "s/EC2_HOST=.*/EC2_HOST=$PUBLIC_IP/" .env
sed -i "s|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://$PUBLIC_IP:8000|" .env
sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=http://$PUBLIC_IP,http://$PUBLIC_IP:8000,http://localhost|" .env

echo "[3/6] Building Docker images..."
docker compose build --no-cache

echo "[4/6] Starting all services..."
docker compose up -d

echo "[5/6] Waiting for services to be healthy (~60s)..."
sleep 30

# Wait for backend
for i in {1..12}; do
  if curl -sf "http://localhost:8000/health" > /dev/null 2>&1; then
    echo "   Backend is healthy!"
    break
  fi
  echo "   Waiting for backend... attempt $i/12"
  sleep 10
done

echo "[6/6] Seeding demo data..."
docker exec cloudcare-backend python seed.py 2>&1 | tail -5 || echo "Seed may have already run (OK)"

echo ""
echo "============================================"
echo "  DEPLOYMENT COMPLETE!"
echo "============================================"
echo "  App:        http://$PUBLIC_IP"
echo "  API Docs:   http://$PUBLIC_IP:8000/docs"
echo "  Prometheus: http://$PUBLIC_IP:9090"
echo "  Grafana:    http://$PUBLIC_IP:3000  (admin/cloudcare123)"
echo "  Login:      admin@cloudcare.demo / demo1234"
echo "============================================"

docker compose ps
`

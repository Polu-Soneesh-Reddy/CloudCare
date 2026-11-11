#!/bin/bash
# Zero-downtime update — pull latest code and redeploy
set -euo pipefail
cd /home/ubuntu/cloudcare

echo "=== CloudCare Update ==="
git pull origin main
docker compose build --no-cache cloudcare-backend cloudcare-frontend
docker compose up -d --no-deps cloudcare-backend cloudcare-frontend
docker compose ps
echo "Update complete: $(date)"
``

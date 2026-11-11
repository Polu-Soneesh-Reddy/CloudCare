#!/bin/bash
set -euxo pipefail
exec > /var/log/user-data.log 2>&1

PROJECT="${project_name}"
HOME_DIR="/home/ubuntu"
APP_DIR="$HOME_DIR/cloudcare"

echo "=== CloudCare EC2 Bootstrap Start ==="
export DEBIAN_FRONTEND=noninteractive

# ── System Update ──
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  curl \
  git \
  wget \
  unzip \
  htop \
  net-tools \
  ca-certificates \
  gnupg \
  lsb-release \
  software-properties-common \
  apt-transport-https

# ── Docker Install ──
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add ubuntu user to docker group
usermod -aG docker ubuntu
systemctl enable docker
systemctl start docker

# ── AWS CLI ──
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install

# ── Create App Directory ──
mkdir -p "$APP_DIR"
chown -R ubuntu:ubuntu "$HOME_DIR"

# ── Completion Marker ──
echo "=== Bootstrap Complete $(date) ===" > /tmp/bootstrap_done.txt
echo "Bootstrap done. App directory: $APP_DIR"
`

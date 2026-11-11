#!/bin/bash
# Run once on fresh EC2: bash setup-ec2.sh
set -euo pipefail

echo "=== Installing CloudCare dependencies on EC2 ==="
export DEBIAN_FRONTEND=noninteractive

sudo apt-get update -y
sudo apt-get upgrade -y -q

# Docker
if ! command -v docker &>/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker ubuntu
  sudo systemctl enable docker
  sudo systemctl start docker
  echo "Docker installed."
fi

# Docker Compose plugin
if ! docker compose version &>/dev/null; then
  sudo apt-get install -y docker-compose-plugin
fi

# Git
sudo apt-get install -y git curl wget unzip python3 python3-pip

# AWS CLI v2
if ! command -v aws &>/dev/null; then
  curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscli.zip
  unzip -q /tmp/awscli.zip -d /tmp
  sudo /tmp/aws/install
  rm -rf /tmp/aws /tmp/awscli.zip
fi

echo "=== All tools installed ==="
echo "Docker:  $(docker --version)"
echo "Compose: $(docker compose version)"
echo "AWS CLI: $(aws --version)"
echo ""
echo "IMPORTANT: Log out and back in for docker group to take effect."
echo "Then run: bash deploy-aws.sh"
`

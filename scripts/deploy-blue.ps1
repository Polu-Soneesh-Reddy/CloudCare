# CloudCare Blue-Green: Deploy BLUE version
# Usage: .\scripts\deploy-blue.ps1 -ImageTag v1 -Namespace cloudcare
param(
    [string]$ImageTag = "v1",
    [string]$Namespace = "cloudcare",
    [string]$KubeConfig = ""
)

$ErrorActionPreference = 'Stop'

Write-Host "[CloudCare] Deploying BLUE version with tag: $ImageTag" -ForegroundColor Cyan

# Update image in blue deployment
kubectl set image deployment/cloudcare-backend-blue `
    backend="YOUR_DOCKERHUB_USERNAME/cloudcare-backend:$ImageTag" `
    --namespace=$Namespace

Write-Host "[CloudCare] Waiting for BLUE rollout to complete..." -ForegroundColor Yellow
kubectl rollout status deployment/cloudcare-backend-blue --namespace=$Namespace --timeout=120s

Write-Host "[CloudCare] BLUE deployment ready." -ForegroundColor Green
Write-Host "Run .\scripts\switch-traffic.ps1 -Target blue to direct traffic to BLUE" -ForegroundColor Gray

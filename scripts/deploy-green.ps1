# CloudCare Blue-Green: Deploy GREEN version
# Usage: .\scripts\deploy-green.ps1 -ImageTag v2 -Namespace cloudcare
param(
    [string]$ImageTag = "v2",
    [string]$Namespace = "cloudcare",
    [string]$KubeConfig = ""
)

$ErrorActionPreference = 'Stop'

Write-Host "[CloudCare] Deploying GREEN version with tag: $ImageTag" -ForegroundColor Cyan

# Update image in green deployment
kubectl set image deployment/cloudcare-backend-green `
    backend="YOUR_DOCKERHUB_USERNAME/cloudcare-backend:$ImageTag" `
    --namespace=$Namespace

Write-Host "[CloudCare] Waiting for GREEN rollout to complete..." -ForegroundColor Yellow
kubectl rollout status deployment/cloudcare-backend-green --namespace=$Namespace --timeout=120s

Write-Host "[CloudCare] GREEN deployment ready." -ForegroundColor Green
Write-Host "Run .\scripts\switch-traffic.ps1 -Target green to direct traffic to GREEN" -ForegroundColor Gray

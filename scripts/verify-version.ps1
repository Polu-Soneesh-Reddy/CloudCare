# CloudCare Blue-Green: Verify which version is active
param(
    [string]$Namespace = "cloudcare",
    [string]$BackendPort = "8000"
)

Write-Host "`n=== CloudCare Deployment Status ==="  -ForegroundColor Cyan

# Service selector
$selector = kubectl get service cloudcare-backend-active --namespace=$Namespace -o jsonpath='{.spec.selector.version}' 2>$null
Write-Host "Active Service Selector: $selector" -ForegroundColor White

# Pod status
Write-Host "`n--- Pod Status ---" -ForegroundColor Yellow
kubectl get pods --namespace=$Namespace -l app=cloudcare-backend --show-labels

# Deployment status
Write-Host "`n--- Deployment Status ---" -ForegroundColor Yellow
kubectl get deployments --namespace=$Namespace -l app=cloudcare-backend

Write-Host "`n[Done]" -ForegroundColor Green

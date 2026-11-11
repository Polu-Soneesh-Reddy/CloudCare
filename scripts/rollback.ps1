# CloudCare Blue-Green: Rollback to previous version
param(
    [string]$Namespace = "cloudcare"
)
$ErrorActionPreference = 'Stop'

# Determine current active version from service annotation/selector
$current = kubectl get service cloudcare-backend-active --namespace=$Namespace -o jsonpath='{.spec.selector.version}' 2>$null

if ($current -eq 'green') { $rollback = 'blue' } else { $rollback = 'green' }

Write-Host "[CloudCare] Current active: $current → Rolling back to: $rollback" -ForegroundColor Yellow

# Switch traffic back
$patch = '{"spec":{"selector":{"app":"cloudcare-backend","version":"' + $rollback + '"}}}'
kubectl patch service cloudcare-backend-active --namespace=$Namespace --type merge --patch $patch

Write-Host "[CloudCare] Rollback complete. Now serving: $rollback" -ForegroundColor Green

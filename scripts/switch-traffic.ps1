# CloudCare Blue-Green: Switch traffic
# Usage: .\scripts\switch-traffic.ps1 -Target green
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('blue','green')]
    [string]$Target,
    [string]$Namespace = "cloudcare"
)

$ErrorActionPreference = 'Stop'
Write-Host "[CloudCare] Switching traffic to: $Target" -ForegroundColor Cyan

# Verify target deployment is healthy before switching
$ready = kubectl get deployment "cloudcare-backend-$Target" --namespace=$Namespace -o jsonpath='{.status.readyReplicas}' 2>$null
if (-not $ready -or $ready -eq '0') {
    Write-Host "[ERROR] $Target deployment is not ready. Aborting traffic switch." -ForegroundColor Red
    exit 1
}

# Patch the service selector
$patch = '{"spec":{"selector":{"app":"cloudcare-backend","version":"' + $Target + '"}}}'
kubectl patch service cloudcare-backend-active --namespace=$Namespace --type merge --patch $patch

Write-Host "[CloudCare] Traffic switched to $Target successfully." -ForegroundColor Green
Write-Host "Verify with: kubectl get endpoints cloudcare-backend-active -n $Namespace" -ForegroundColor Gray

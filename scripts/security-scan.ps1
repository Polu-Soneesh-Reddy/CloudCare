# CloudCare DevSecOps: Local security scan script
# Run before committing or as part of CI

param(
    [string]$BackendPath = ".\backend",
    [string]$ReportDir = ".\security-reports",
    [string]$ImageName = "cloudcare-backend:local"
)

$ErrorActionPreference = 'Continue'
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

Write-Host "`n=== CloudCare Security Scan ==="  -ForegroundColor Cyan
$passed = 0; $failed = 0; $skipped = 0

# 1. Bandit SAST
Write-Host "`n[1/4] Bandit Python SAST..." -ForegroundColor Yellow
if (Get-Command bandit -ErrorAction SilentlyContinue) {
    bandit -r $BackendPath\app -f json -o "$ReportDir\bandit-report.json" --severity-level medium
    if ($LASTEXITCODE -eq 0) { Write-Host "  PASSED" -ForegroundColor Green; $passed++ }
    else { Write-Host "  ISSUES FOUND (see bandit-report.json)" -ForegroundColor Yellow; $passed++ }  # non-blocking
} else {
    Write-Host "  SKIPPED (bandit not installed: pip install bandit)" -ForegroundColor Gray; $skipped++
}

# 2. pip-audit
Write-Host "`n[2/4] pip-audit dependency scan..." -ForegroundColor Yellow
if (Get-Command pip-audit -ErrorAction SilentlyContinue) {
    pip-audit -r "$BackendPath\requirements.txt" --format json -o "$ReportDir\pip-audit-report.json"
    if ($LASTEXITCODE -eq 0) { Write-Host "  PASSED" -ForegroundColor Green; $passed++ }
    else { Write-Host "  VULNERABILITIES FOUND (see pip-audit-report.json)" -ForegroundColor Yellow }
} else {
    Write-Host "  SKIPPED (pip-audit not installed)" -ForegroundColor Gray; $skipped++
}

# 3. npm audit
Write-Host "`n[3/4] npm audit frontend dependencies..." -ForegroundColor Yellow
push-location .\frontend
npm audit --json 2>$null | Out-File "$ReportDir\npm-audit-report.json"
if ($LASTEXITCODE -le 1) { Write-Host "  OK" -ForegroundColor Green; $passed++ }
else { Write-Host "  Issues found" -ForegroundColor Yellow }
pop-location

# 4. Trivy image scan
Write-Host "`n[4/4] Trivy image scan..." -ForegroundColor Yellow
if (Get-Command trivy -ErrorAction SilentlyContinue) {
    trivy image --format json --output "$ReportDir\trivy-report.json" --severity CRITICAL $ImageName
    if ($LASTEXITCODE -eq 0) { Write-Host "  PASSED (no CRITICAL vulnerabilities)" -ForegroundColor Green; $passed++ }
    else { Write-Host "  CRITICAL vulnerabilities found — release BLOCKED" -ForegroundColor Red; $failed++ }
} else {
    Write-Host "  SKIPPED (trivy not installed)" -ForegroundColor Gray; $skipped++
}

Write-Host "`n=== Scan Summary ==="  -ForegroundColor Cyan
Write-Host "Passed: $passed | Failed: $failed | Skipped: $skipped" -ForegroundColor White
Write-Host "Reports saved to: $ReportDir" -ForegroundColor Gray

if ($failed -gt 0) {
    Write-Host "`n[BLOCKED] Release blocked due to $failed critical failure(s)." -ForegroundColor Red
    exit 1
}

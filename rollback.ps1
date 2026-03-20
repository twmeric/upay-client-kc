# King-Chicken Payment Platform - Rollback Script
# 回滚脚本

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment
)

$ErrorActionPreference = "Stop"

$Config = @{
    dev = @{ project = "payment-portal-dev" }
    staging = @{ project = "payment-portal-staging" }
    prod = @{ project = "payment-portal-prod" }
}

Write-Host "========================================" -ForegroundColor Red
Write-Host "EMERGENCY ROLLBACK" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Rolling back to version: $Version" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Are you sure? (yes/NO)"
if ($confirm -ne "yes") {
    Write-Host "Rollback cancelled." -ForegroundColor Green
    exit 0
}

$buildDir = "builds\$Version"

if (-not (Test-Path $buildDir)) {
    Write-Error "Build version $Version not found in builds/"
    exit 1
}

Write-Host "[1/3] Deploying rollback version..." -ForegroundColor Green
cd $buildDir
wrangler pages deploy . --project-name=$($Config[$Environment].project)

if ($LASTEXITCODE -eq 0) {
    Write-Host "[2/3] Purging Cloudflare cache..." -ForegroundColor Green
    
    # 清除缓存
    $headers = @{
        "Authorization" = "Bearer wNu0gSgw3LLEERkKet9SB7qaut-dHLrb3EBX_XGr"
        "Content-Type" = "application/json"
    }
    
    try {
        Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/c2013122cb3dd4fcd30f1c11a5e1e08f/purge_cache" -Method POST -Headers $headers -Body '{"purge_everything":true}' | Out-Null
        Write-Host "✅ Cache purged" -ForegroundColor Green
    } catch {
        Write-Warning "Failed to purge cache: $_"
    }
    
    Write-Host "[3/3] Recording rollback..." -ForegroundColor Green
    
    $rollbackLog = @"

## ROLLBACK - $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
- **From**: Current
- **To**: $Version
- **Environment**: $Environment
- **By**: $($env:USERNAME)
- **Reason**: [Fill in reason]

"@
    
    Add-Content -Path "DEPLOYMENT_LOG.md" -Value $rollbackLog
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Rollback Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current version: $Version" -ForegroundColor White
    Write-Host ""
    Write-Host "IMPORTANT:" -ForegroundColor Red
    Write-Host "1. Verify the rollback was successful"
    Write-Host "2. Investigate the issue"
    Write-Host "3. Fill in rollback reason in DEPLOYMENT_LOG.md"
    Write-Host "4. Create fix and redeploy when ready"
} else {
    Write-Error "Rollback failed!"
    exit 1
}

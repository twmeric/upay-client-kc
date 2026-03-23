# 部署驗證腳本
# 快速檢查前後端部署狀態

param(
    [switch]$Fix
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EasyLink 部署驗證工具" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 配置
$FRONTEND_URL = "https://upay-client-kc.pages.dev"
$BACKEND_URL = "https://payment-api.jimsbond007.workers.dev"

$results = @{
    Frontend = $false
    Backend = $false
    API = $false
}

# 1. 檢查前端
Write-Host "[1/4] 檢查前端 (Pages)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $FRONTEND_URL -Method HEAD -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ 前端可訪問 (HTTP 200)" -ForegroundColor Green
        $results.Frontend = $true
    }
} catch {
    Write-Host "  ❌ 前端訪問失敗: $_" -ForegroundColor Red
}

# 2. 檢查後端 Worker
Write-Host "`n[2/4] 檢查後端 (Worker)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/health" -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Worker 健康檢查通過" -ForegroundColor Green
        $results.Backend = $true
    }
} catch {
    Write-Host "  ❌ Worker 健康檢查失敗: $_" -ForegroundColor Red
    Write-Host "  ⚠️  可能需要手動部署 Worker" -ForegroundColor Yellow
}

# 3. 檢查 API endpoint
Write-Host "`n[3/4] 檢查 API Endpoint..." -ForegroundColor Yellow
$testEndpoints = @(
    "/api/v1/client/KC/dashboard",
    "/api/v1/client/KC/config"
)

$apiWorking = $false
foreach ($endpoint in $testEndpoints) {
    try {
        $response = Invoke-WebRequest -Uri "$BACKEND_URL$endpoint" -TimeoutSec 10 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ $endpoint 正常" -ForegroundColor Green
            $apiWorking = $true
        }
    } catch {
        Write-Host "  ⚠️  $endpoint : HTTP $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}
$results.API = $apiWorking

# 4. 檢查 CORS
Write-Host "`n[4/4] 檢查 CORS 配置..." -ForegroundColor Yellow
try {
    $headers = @{
        "Origin" = "https://upay-client-kc.pages.dev"
    }
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/v1/client/KC" -Headers $headers -Method OPTIONS -TimeoutSec 10
    $corsHeader = $response.Headers["Access-Control-Allow-Origin"]
    if ($corsHeader -eq "*" -or $corsHeader -match "upay-client") {
        Write-Host "  ✅ CORS 配置正確" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  CORS 可能需要檢查" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  CORS 檢查失敗 (可能正常)" -ForegroundColor Yellow
}

# 總結
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  驗證結果" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$allGood = $results.Frontend -and $results.Backend -and $results.API

if ($allGood) {
    Write-Host "`n🎉 所有檢查通過！系統正常運行。" -ForegroundColor Green
    Write-Host "`n訪問地址:" -ForegroundColor Cyan
    Write-Host "  前端: $FRONTEND_URL" -ForegroundColor White
    Write-Host "  後端: $BACKEND_URL" -ForegroundColor White
} else {
    Write-Host "`n⚠️  發現問題，需要修復：" -ForegroundColor Yellow
    
    if (-not $results.Backend) {
        Write-Host "`n  修復 Worker:" -ForegroundColor Cyan
        Write-Host "    cd payment-worker" -ForegroundColor White
        Write-Host "    npx wrangler deploy" -ForegroundColor White
    }
    
    if (-not $results.Frontend) {
        Write-Host "`n  修復前端:" -ForegroundColor Cyan
        Write-Host "    運行 deploy-pages-api-v2.ps1" -ForegroundColor White
    }
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

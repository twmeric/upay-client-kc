# Payment Worker 部署腳本
# Cloudflare 原生架構

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Payment Worker 部署腳本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 設置環境變量
$env:CLOUDFLARE_API_TOKEN = $env:SUPERTOKEN_API_TOKEN
$env:CLOUDFLARE_ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"

if (-not $env:CLOUDFLARE_API_TOKEN) {
    Write-Host "錯誤: 找不到 API Token" -ForegroundColor Red
    Write-Host "請設置 SUPERTOKEN_API_TOKEN 環境變量" -ForegroundColor Yellow
    exit 1
}

Write-Host "API Token: $($env:CLOUDFLARE_API_TOKEN.Substring(0, 10))..." -ForegroundColor Green
Write-Host "Account ID: $env:CLOUDFLARE_ACCOUNT_ID" -ForegroundColor Green
Write-Host ""

# 步驟 1: 檢查並創建 D1 數據庫
Write-Host "[1/5] 檢查 D1 數據庫..." -ForegroundColor Yellow

try {
    $d1List = wrangler d1 list 2>&1
    if ($d1List -match "payment-db") {
        Write-Host "  數據庫已存在" -ForegroundColor Green
    } else {
        Write-Host "  創建 D1 數據庫..." -ForegroundColor Yellow
        wrangler d1 create payment-db
    }
} catch {
    Write-Host "  注意: 無法檢查數據庫列表，將嘗試直接創建" -ForegroundColor Yellow
}

Write-Host ""

# 步驟 2: 執行數據庫遷移
Write-Host "[2/5] 執行數據庫遷移..." -ForegroundColor Yellow
try {
    wrangler d1 execute payment-db --file=./schema.sql --remote
    Write-Host "  遷移成功" -ForegroundColor Green
} catch {
    Write-Host "  遷移可能已執行過或需要手動執行" -ForegroundColor Yellow
}

Write-Host ""

# 步驟 3: 檢查 Secrets
Write-Host "[3/5] 檢查 Secrets..." -ForegroundColor Yellow
$secrets = @("EASYLINK_MCH_NO", "EASYLINK_APP_ID", "EASYLINK_APP_SECRET")
foreach ($secret in $secrets) {
    Write-Host "  請確保已設置: $secret" -ForegroundColor Cyan
}
Write-Host "  (如未設置，請運行: wrangler secret put $secret)" -ForegroundColor Yellow

Write-Host ""

# 步驟 4: 部署 Worker
Write-Host "[4/5] 部署 Worker..." -ForegroundColor Yellow
wrangler deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Worker 部署成功!" -ForegroundColor Green
} else {
    Write-Host "  Worker 部署失敗" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 步驟 5: 顯示信息
Write-Host "[5/5] 部署完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Worker URL:" -ForegroundColor Cyan
Write-Host "  https://payment-api-cwb.pages.dev" -ForegroundColor White
Write-Host ""
Write-Host "API 端點:" -ForegroundColor Cyan
Write-Host "  POST /api/public/payment/create" -ForegroundColor White
Write-Host "  GET  /api/public/payment/query/:orderNo" -ForegroundColor White
Write-Host "  POST /api/webhooks/easylink/notify" -ForegroundColor White
Write-Host ""
Write-Host "測試命令:" -ForegroundColor Cyan
Write-Host "  curl https://payment-api-cwb.pages.dev/api/health" -ForegroundColor DarkGray
Write-Host ""
Write-Host "========================================" -ForegroundColor Green

Read-Host "按 Enter 鍵結束"

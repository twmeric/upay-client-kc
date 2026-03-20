# Cloudflare Pages 部署腳本
# 使用 MotherBase 配置

$ErrorActionPreference = "Stop"

Write-Host "🚀 Cloudflare Pages 部署腳本" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# 讀取 MotherBase 配置
$envPath = "C:\Users\Owner\cloudflare\motherbase\motherbase\.env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^#][^=]*)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Host "✓ 已加載: $name" -ForegroundColor Green
        }
    }
}

# 設置 CLOUDFLARE_API_TOKEN
if ($env:CF_API_TOKEN) {
    $env:CLOUDFLARE_API_TOKEN = $env:CF_API_TOKEN
    Write-Host "✓ 已設置 CLOUDFLARE_API_TOKEN" -ForegroundColor Green
}

if ($env:CF_ACCOUNT_ID) {
    $env:CLOUDFLARE_ACCOUNT_ID = $env:CF_ACCOUNT_ID
    Write-Host "✓ 已設置 CLOUDFLARE_ACCOUNT_ID: $env:CF_ACCOUNT_ID" -ForegroundColor Green
}

# 檢查 Wrangler
$wrangler = Get-Command wrangler -ErrorAction SilentlyContinue
if (-not $wrangler) {
    Write-Host "⚠️ Wrangler 未安裝，正在安裝..." -ForegroundColor Yellow
    npm install -g wrangler
}

# 部署目錄
$deployDir = "C:\Users\Owner\.kimi\sessions\ab7b4a23e658d653ca96121b30262054\424392ec-4b6f-43b8-8b7e-d868acc2597a\uploads\extracted\dist"

if (-not (Test-Path $deployDir)) {
    Write-Host "❌ 錯誤: 找不到部署目錄 $deployDir" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 部署信息:" -ForegroundColor Cyan
Write-Host "   專案名稱: payment-portal" -ForegroundColor White
Write-Host "   部署目錄: $deployDir" -ForegroundColor White
Write-Host "   帳戶 ID: $env:CLOUDFLARE_ACCOUNT_ID" -ForegroundColor White
Write-Host ""

# 嘗試部署
Write-Host "🚀 開始部署到 Cloudflare Pages..." -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

try {
    # 先嘗試創建專案（如果不存在）
    $createBody = @{
        name = "payment-portal"
        production_branch = "main"
    } | ConvertTo-Json
    
    Write-Host "📡 嘗試創建/更新 Pages 專案..." -ForegroundColor Yellow
    
    # 使用 Wrangler 部署
    Set-Location (Split-Path $deployDir)
    
    # 嘗試直接部署（Wrangler 會自動創建專案）
    $env:CLOUDFLARE_API_TOKEN = $env:CF_API_TOKEN
    wrangler pages deploy $deployDir --project-name="payment-portal" --commit-message="Initial deployment" --branch=main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 部署成功!" -ForegroundColor Green
        Write-Host "==============================" -ForegroundColor Green
        Write-Host "🌐 網站地址:" -ForegroundColor Cyan
        Write-Host "   https://payment-portal.pages.dev" -ForegroundColor White
        Write-Host "   https://payment-portal-main.pages.dev" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ 部署失敗，嘗試使用 Direct Upload..." -ForegroundColor Red
        
        # 嘗試使用 Direct Upload API
        $headers = @{
            "Authorization" = "Bearer $($env:CF_API_TOKEN)"
            "Content-Type" = "application/json"
        }
        
        Write-Host ""
        Write-Host "📋 手動部署步驟:" -ForegroundColor Yellow
        Write-Host "1. 前往 https://dash.cloudflare.com" -ForegroundColor White
        Write-Host "2. 點擊 Workers & Pages → Create application" -ForegroundColor White
        Write-Host "3. 選擇 Pages → Upload assets" -ForegroundColor White
        Write-Host "4. 專案名稱: payment-portal" -ForegroundColor White
        Write-Host "5. 上傳 ZIP 文件:" -ForegroundColor White
        Write-Host "   C:\Users\Owner\cloudflare\kingchicken\payment-portal-deploy.zip" -ForegroundColor Cyan
    }
} catch {
    Write-Host ""
    Write-Host "❌ 發生錯誤: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 請使用手動部署方式:" -ForegroundColor Yellow
    Write-Host "   文件位置: C:\Users\Owner\cloudflare\kingchicken\payment-portal-deploy.zip" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "按任意鍵結束..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

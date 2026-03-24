# Quick Deploy Fix for King-Chicken
$ErrorActionPreference = "Stop"

Write-Host "🚀 King-Chicken Quick Deploy" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# 配置
$ProjectName = "king-chicken"
$DistDir = "C:\Users\Owner\cloudflare\kingchicken\source_recovery\dist"

# 檢查 dist 目錄
if (-not (Test-Path $DistDir)) {
    Write-Host "❌ 錯誤: 找不到 $DistDir" -ForegroundColor Red
    exit 1
}

Write-Host "📦 準備部署:" -ForegroundColor Yellow
Write-Host "   專案: $ProjectName" -ForegroundColor White
Write-Host "   目錄: $DistDir" -ForegroundColor White

# 設置 API Token (從 .DNS_API_TOKEN 文件讀取)
$tokenFile = Get-Content "C:\Users\Owner\cloudflare\kingchicken\.DNS_API_TOKEN" -Raw
if ($tokenFile -match 'DNS_API_TOKEN=(\w+)') {
    $env:CLOUDFLARE_API_TOKEN = $matches[1]
    Write-Host "   Token: 已設置" -ForegroundColor White
} else {
    Write-Host "❌ 錯誤: 無法讀取 API Token" -ForegroundColor Red
    exit 1
}

# 執行部署
Write-Host ""
Write-Host "🚀 開始部署..." -ForegroundColor Cyan

Set-Location $DistDir

# 使用 npx wrangler 部署
try {
    npx wrangler pages deploy . --project-name="$ProjectName" --branch="main" --yes
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 部署成功!" -ForegroundColor Green
        Write-Host "=============================" -ForegroundColor Green
        Write-Host "🌐 網站地址:" -ForegroundColor Cyan
        Write-Host "   https://king-chicken.pages.dev" -ForegroundColor White
        Write-Host "   https://king-chicken.jkdcoding.com/admin" -ForegroundColor White
    } else {
        throw "Wrangler exit code: $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "⚠️ 自動部署失敗，請手動部署:" -ForegroundColor Yellow
    Write-Host "   1. 前往 https://dash.cloudflare.com" -ForegroundColor White
    Write-Host "   2. Workers & Pages > king-chicken 專案" -ForegroundColor White
    Write-Host "   3. 點擊 'Create deployment'" -ForegroundColor White
    Write-Host "   4. 上傳文件夾: $DistDir" -ForegroundColor Cyan
}

Write-Host ""

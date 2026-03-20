# King-Chicken 自定義域名設置腳本
# 使用 DNS API Token 自動設置

param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,  # 例如: king-chicken.jkdcoding.com
    
    [string]$ProjectName = "payment-portal",
    [string]$AccountId = "dfbee5c2a5706a81bc04675499c933d4"
)

$ErrorActionPreference = "Stop"

# 設置 API Token
$env:CLOUDFLARE_API_TOKEN = "wNu0gSgw3LLEERkKet9SB7qaut-dHLrb3EBX_XGr"
$env:CLOUDFLARE_ACCOUNT_ID = $AccountId

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  King-Chicken 域名設置腳本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "域名: $Domain" -ForegroundColor Yellow
Write-Host "專案: $ProjectName" -ForegroundColor Yellow
Write-Host ""

# 步驟 1: 添加域名到 Pages
Write-Host "[1/3] 添加域名到 Pages 專案..." -ForegroundColor Cyan
try {
    $headers = @{ 
        "Authorization" = "Bearer $($env:CLOUDFLARE_API_TOKEN)"
        "Content-Type" = "application/json"
    }
    $body = @{ "name" = $Domain } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$AccountId/pages/projects/$ProjectName/domains" -Method POST -Headers $headers -Body $body
    
    if ($response.success) {
        Write-Host "  ✅ 域名添加成功" -ForegroundColor Green
    } else {
        Write-Warning "  域名添加返回警告: $($response.errors[0].message)"
    }
} catch {
    Write-Warning "  域名可能已存在或需要手動驗證: $_"
}

# 步驟 2: 檢查 DNS 記錄
Write-Host ""
Write-Host "[2/3] 檢查 DNS 設置..." -ForegroundColor Cyan
Write-Host "  請確保以下 DNS 記錄已添加:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  類型: CNAME" -ForegroundColor White
Write-Host "  名稱: $(($Domain -split '\.')[0])" -ForegroundColor White
Write-Host "  目標: $ProjectName.pages.dev" -ForegroundColor White
Write-Host ""

# 步驟 3: 驗證設置
Write-Host "[3/3] 驗證部署狀態..." -ForegroundColor Cyan
try {
    $deployCheck = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$AccountId/pages/projects/$ProjectName/deployments" -Method GET -Headers $headers
    if ($deployCheck.success -and $deployCheck.result.data.Count -gt 0) {
        $latestDeploy = $deployCheck.result.data[0]
        Write-Host "  ✅ 最新部署: $($latestDeploy.url)" -ForegroundColor Green
    }
} catch {
    Write-Warning "  無法檢查部署狀態"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  域名設置完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "請完成以下步驟:" -ForegroundColor Yellow
Write-Host "1. 確保 DNS 記錄已正確添加" -ForegroundColor White
Write-Host "2. 等待 SSL 證書頒發 (5-30 分鐘)" -ForegroundColor White
Write-Host "3. 訪問 https://$Domain 驗證" -ForegroundColor White
Write-Host ""
Read-Host "按 Enter 結束"

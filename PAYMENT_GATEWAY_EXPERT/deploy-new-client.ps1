#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Payment Gateway 快速部署腳本
.DESCRIPTION
    為新客戶一鍵部署完整的支付系統 (Worker + Pages + D1)
.EXAMPLE
    .\deploy-new-client.ps1 -ClientName "acme-shop" -MchNo "M123" -AppId "A456" -AppSecret "S789"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ClientName,
    
    [Parameter(Mandatory=$true)]
    [string]$MchNo,
    
    [Parameter(Mandatory=$true)]
    [string]$AppId,
    
    [Parameter(Mandatory=$true)]
    [string]$AppSecret,
    
    [ValidateSet("test", "production")]
    [string]$Environment = "production",
    
    [string]$AccountId = "dfbee5c2a5706a81bc04675499c933d4"
)

$ErrorActionPreference = "Stop"

# 顏色定義
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"

function Write-Title($text) {
    Write-Host "`n========================================" -ForegroundColor $Cyan
    Write-Host $text -ForegroundColor $Cyan
    Write-Host "========================================`n" -ForegroundColor $Cyan
}

function Write-Success($text) { Write-Host "✅ $text" -ForegroundColor $Green }
function Write-Warning($text) { Write-Host "⚠️ $text" -ForegroundColor $Yellow }
function Write-Error($text) { Write-Host "❌ $text" -ForegroundColor $Red }
function Write-Info($text) { Write-Host "ℹ️ $text" -ForegroundColor $Cyan }

# 設置 API Token
$env:CLOUDFLARE_API_TOKEN = $env:SUPERTOKEN_API_TOKEN
$env:CLOUDFLARE_ACCOUNT_ID = $AccountId

if (-not $env:CLOUDFLARE_API_TOKEN) {
    Write-Error "未設置 SUPERTOKEN_API_TOKEN 環境變量"
    exit 1
}

Write-Title "🚀 Payment Gateway 快速部署"
Write-Info "客戶名稱: $ClientName"
Write-Info "環境: $Environment"
Write-Info "商戶號: $MchNo"

# 確定 API URL
$EasyLinkUrl = if ($Environment -eq "test") {
    "https://ts-api-pay.gnete.com.hk"
} else {
    "https://api-pay.gnete.com.hk"
}
Write-Info "EasyLink API: $EasyLinkUrl"

# 創建專案目錄
$ProjectDir = "C:\Users\Owner\cloudflare\$ClientName-payment"
Write-Title "📁 創建專案目錄"

if (Test-Path $ProjectDir) {
    Write-Warning "目錄已存在: $ProjectDir"
} else {
    New-Item -ItemType Directory -Path $ProjectDir -Force | Out-Null
    Write-Success "創建目錄: $ProjectDir"
}

Set-Location $ProjectDir

# 複製模板
Write-Title "📋 複製模板文件"
$TemplateDir = "C:\Users\Owner\cloudflare\kingchicken\PAYMENT_GATEWAY_EXPERT\TEMPLATES"

Copy-Item "$TemplateDir\worker\*" .\ -Recurse -Force
Write-Success "複製 Worker 模板"

# 創建前端目錄
mkdir .\frontend -Force | Out-Null
Copy-Item "C:\Users\Owner\cloudflare\kingchicken\payment-worker\..\payment-portal-deploy.zip" .\frontend\ -ErrorAction SilentlyContinue
Write-Success "複製前端模板"

# 更新 wrangler.toml
Write-Title "⚙️ 配置 Worker"
$DatabaseName = "payment-db-$ClientName"
$WranglerContent = @"
name = "payment-api-$ClientName"
main = "index.js"
compatibility_date = "2024-01-01"
account_id = "$AccountId"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "$DatabaseName"
database_id = "TO_BE_UPDATED"

# 環境變量
[vars]
ENVIRONMENT = "$Environment"
EASYLINK_BASE_URL = "$EasyLinkUrl"
CURRENCY = "HKD"
"@

$WranglerContent | Out-File -FilePath ".\wrangler.toml" -Encoding UTF8
Write-Success "生成 wrangler.toml"

# 創建 D1 數據庫
Write-Title "💾 創建 D1 數據庫"
try {
    $D1Output = wrangler d1 create $DatabaseName 2>&1
    Write-Success "創建數據庫: $DatabaseName"
    
    # 提取 database_id
    if ($D1Output -match "database_id = \"([a-f0-9\-]+)\"") {
        $DatabaseId = $Matches[1]
        Write-Info "Database ID: $DatabaseId"
        
        # 更新 wrangler.toml
        (Get-Content ".\wrangler.toml") -replace "database_id = \"TO_BE_UPDATED\"", "database_id = \"$DatabaseId\"" | Set-Content ".\wrangler.toml"
        Write-Success "更新 wrangler.toml"
    }
} catch {
    Write-Warning "數據庫創建可能需要手動確認"
    Write-Info "請執行: wrangler d1 create $DatabaseName"
    Write-Info "然後更新 wrangler.toml 中的 database_id"
}

# 執行數據庫遷移
Write-Title "🔄 執行數據庫遷移"
try {
    wrangler d1 execute $DatabaseName --file=.\schema.sql --remote 2>&1 | Out-Null
    Write-Success "數據庫遷移完成"
} catch {
    Write-Warning "遷移可能需要手動執行"
}

# 設置 Secrets
Write-Title "🔐 設置 Secrets"
Write-Info "設置 EASYLINK_MCH_NO..."
$MchNo | wrangler secret put EASYLINK_MCH_NO 2>&1 | Out-Null

Write-Info "設置 EASYLINK_APP_ID..."
$AppId | wrangler secret put EASYLINK_APP_ID 2>&1 | Out-Null

Write-Info "設置 EASYLINK_APP_SECRET..."
$AppSecret | wrangler secret put EASYLINK_APP_SECRET 2>&1 | Out-Null

Write-Success "Secrets 設置完成"

# 部署 Worker
Write-Title "🚀 部署 Worker"
$DeployOutput = wrangler deploy 2>&1

if ($DeployOutput -match "(https://[\w\-\.]+\.workers\.dev)") {
    $WorkerUrl = $Matches[1]
    Write-Success "Worker 部署成功"
    Write-Info "Worker URL: $WorkerUrl"
} else {
    Write-Error "Worker 部署失敗"
    Write-Info $DeployOutput
    exit 1
}

# 測試部署
Write-Title "🧪 測試部署"
Start-Sleep -Seconds 3

try {
    $HealthCheck = Invoke-RestMethod -Uri "$WorkerUrl/api/health" -Method GET
    if ($HealthCheck.status -eq "ok") {
        Write-Success "健康檢查通過"
    } else {
        Write-Warning "健康檢查異常"
    }
} catch {
    Write-Warning "健康檢查請求失敗"
}

# 輸出摘要
Write-Title "📝 部署摘要"

Write-Host "客戶名稱: " -NoNewline
Write-Host $ClientName -ForegroundColor $Green

Write-Host "Worker URL: " -NoNewline
Write-Host $WorkerUrl -ForegroundColor $Green

Write-Host "Pages 專案: " -NoNewline
Write-Host "$ClientName-payment" -ForegroundColor $Green

Write-Host "D1 數據庫: " -NoNewline
Write-Host $DatabaseName -ForegroundColor $Green

Write-Host "環境: " -NoNewline
Write-Host $Environment -ForegroundColor $Green

Write-Title "✅ 後續步驟"
Write-Info "1. 部署前端: cd frontend && npm run build && wrangler pages deploy"
Write-Info "2. 配置自定義域名 (可選)"
Write-Info "3. 測試支付流程"
Write-Info "4. 交付客戶"

Write-Host "`n🎉 部署完成！`n" -ForegroundColor $Green

# 保存配置
$Config = @{
    ClientName = $ClientName
    Environment = $Environment
    WorkerUrl = $WorkerUrl
    DatabaseName = $DatabaseName
    CreatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
} | ConvertTo-Json

$Config | Out-File -FilePath ".\deployment-config.json" -Encoding UTF8
Write-Info "配置已保存到 deployment-config.json"

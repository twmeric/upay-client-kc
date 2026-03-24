# King-Chicken Payment System Deployment with API Token
# 使用 API Token 部署 Worker 和 Pages

param(
    [string]$Action = "all"  # all, worker, pages
)

$ErrorActionPreference = "Stop"

# Colors
$Green = "`e[32m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-Info($msg) { Write-Host "${Blue}[INFO]${Reset} $msg" }
function Write-Success($msg) { Write-Host "${Green}[SUCCESS]${Reset} $msg" }
function Write-Warning($msg) { Write-Host "${Yellow}[WARNING]${Reset} $msg" }
function Write-Error($msg) { Write-Host "${Red}[ERROR]${Reset} $msg" }

# 设置 API Token
$API_TOKEN = "wNu0gSgw3LLEERkKet9SB7qaut-dHLrb3EBX_XGr"
$env:CLOUDFLARE_API_TOKEN = $API_TOKEN

$ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
$WORKER_NAME = "payment-api"
$PAGES_NAME = "upay-client-kc"

Write-Host "`n========================================"
Write-Host " King-Chicken Deployment with API Token"
Write-Host "========================================`n"

# 1. 部署 Worker
if ($Action -eq "all" -or $Action -eq "worker") {
    Write-Info "Deploying Worker: $WORKER_NAME"
    
    Push-Location payment-worker
    try {
        # 使用 API Token 部署
        $env:CLOUDFLARE_API_TOKEN = $API_TOKEN
        wrangler deploy --token $API_TOKEN
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Worker deployed successfully!"
        } else {
            Write-Warning "Wrangler deploy failed, trying direct API upload..."
            
            # 直接 API 上传
            $workerScript = Get-Content src/index.js -Raw
            $url = "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME"
            
            $headers = @{
                "Authorization" = "Bearer $API_TOKEN"
                "Content-Type" = "application/javascript"
            }
            
            try {
                $response = Invoke-RestMethod -Uri $url -Method PUT -Headers $headers -Body $workerScript
                if ($response.success) {
                    Write-Success "Worker uploaded via API successfully!"
                } else {
                    Write-Error "API upload failed: $($response.errors)"
                }
            } catch {
                Write-Error "API upload error: $_"
            }
        }
    } finally {
        Pop-Location
    }
}

# 2. 部署 Pages
if ($Action -eq "all" -or $Action -eq "pages") {
    Write-Info "Deploying Pages: $PAGES_NAME"
    
    Push-Location UpayClient/_KC
    try {
        # 创建 zip 文件
        $zipPath = "../../kc-pages-deploy.zip"
        if (Test-Path $zipPath) { Remove-Item $zipPath }
        
        Compress-Archive -Path * -DestinationPath $zipPath -Force
        Write-Info "Created deployment zip: $zipPath"
        
        # 使用 wrangler pages deploy with token
        $env:CLOUDFLARE_API_TOKEN = $API_TOKEN
        wrangler pages deploy . --project-name=$PAGES_NAME --branch=main --token $API_TOKEN
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Pages deployed successfully!"
        } else {
            Write-Error "Pages deployment failed"
        }
    } finally {
        Pop-Location
    }
}

Write-Host "`n========================================"
Write-Success "Deployment completed!"
Write-Host "========================================`n"

Write-Host "URLs:"
Write-Host "  Payment Page:  https://upay-client-kc.pages.dev"
Write-Host "  Login Page:    https://upay-client-kc.pages.dev/login.html"  
Write-Host "  Admin Page:    https://upay-client-kc.pages.dev/admin.html"
Write-Host "  API Endpoint:  https://payment-api.jimsbond007.workers.dev"
Write-Host ""

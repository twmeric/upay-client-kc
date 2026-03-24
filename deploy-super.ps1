# King-Chicken Deployment with Super API Token
# 使用 Cloudflare Super Token 一鍵部署

param(
    [string]$Action = "all"  # all, worker, pages, db
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

# Super API Token
$SUPER_TOKEN = "cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca"
$env:CLOUDFLARE_API_TOKEN = $SUPER_TOKEN

$ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
$WORKER_NAME = "payment-api"
$PAGES_NAME = "upay-client-kc"
$DB_NAME = "payment-db"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " King-Chicken Super Token Deployment" -ForegroundColor Cyan
Write-Host "========================================`n"

# 1. Deploy Worker
if ($Action -eq "all" -or $Action -eq "worker") {
    Write-Info "Deploying Worker: $WORKER_NAME"
    
    Push-Location payment-worker
    try {
        $env:CLOUDFLARE_API_TOKEN = $SUPER_TOKEN
        
        # 尝试部署
        $output = wrangler deploy 2>&1
        Write-Host $output
        
        if ($LASTEXITCODE -eq 0 -or $output -match "successfully") {
            Write-Success "Worker deployed!"
            Write-Info "URL: https://$WORKER_NAME.jimsbond007.workers.dev"
        } else {
            Write-Warning "Wrangler failed, trying API upload..."
            
            # 直接 API 上传
            $workerCode = Get-Content src/index.js -Raw
            $url = "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME"
            
            $headers = @{
                "Authorization" = "Bearer $SUPER_TOKEN"
                "Content-Type" = "application/javascript"
            }
            
            try {
                $response = Invoke-RestMethod -Uri $url -Method PUT -Headers $headers -Body $workerCode
                if ($response.success) {
                    Write-Success "Worker uploaded via API!"
                }
            } catch {
                Write-Error "API upload failed: $_"
            }
        }
    } finally {
        Pop-Location
    }
}

# 2. Setup Database
if ($Action -eq "all" -or $Action -eq "db") {
    Write-Info "Setting up Database: $DB_NAME"
    
    Push-Location payment-worker
    try {
        $env:CLOUDFLARE_API_TOKEN = $SUPER_TOKEN
        
        # 执行 schema
        $output = wrangler d1 execute $DB_NAME --file=./schema.sql 2>&1
        Write-Host $output
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database schema applied!"
        } else {
            Write-Warning "Schema may already exist"
        }
    } finally {
        Pop-Location
    }
}

# 3. Deploy Pages
if ($Action -eq "all" -or $Action -eq "pages") {
    Write-Info "Deploying Pages: $PAGES_NAME"
    
    Push-Location UpayClient/_KC
    try {
        $env:CLOUDFLARE_API_TOKEN = $SUPER_TOKEN
        
        # 创建 _headers 文件
        @"
/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key
"@ | Set-Content -Path "_headers" -Force
        
        # 部署
        $output = wrangler pages deploy . --project-name=$PAGES_NAME --branch=main 2>&1
        Write-Host $output
        
        if ($LASTEXITCODE -eq 0 -or $output -match "successfully") {
            Write-Success "Pages deployed!"
            Write-Info "URL: https://$PAGES_NAME.pages.dev"
        } else {
            Write-Error "Pages deployment failed"
        }
    } finally {
        Pop-Location
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " Deployment Completed!" -ForegroundColor Green
Write-Host "========================================`n"

Write-Host "Access URLs:"
Write-Host "  Payment: https://$PAGES_NAME.pages.dev" -ForegroundColor Cyan
Write-Host "  Login:   https://$PAGES_NAME.pages.dev/login.html" -ForegroundColor Cyan
Write-Host "  Admin:   https://$PAGES_NAME.pages.dev/admin.html" -ForegroundColor Cyan
Write-Host "  API:     https://$WORKER_NAME.jimsbond007.workers.dev" -ForegroundColor Cyan
Write-Host ""

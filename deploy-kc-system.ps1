# King-Chicken Payment System Deployment Script
# 部署 King-Chicken 支付系統（Worker + Pages）

param(
    [string]$Action = "all",  # all, worker, pages
    [switch]$SkipConfirmation
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

# Check dependencies
function Check-Dependencies {
    Write-Info "Checking dependencies..."
    
    $wrangler = Get-Command wrangler -ErrorAction SilentlyContinue
    if (-not $wrangler) {
        Write-Error "wrangler CLI not found. Please install with: npm install -g wrangler"
        exit 1
    }
    
    Write-Success "wrangler CLI found"
}

# Deploy Worker
function Deploy-Worker {
    Write-Info "Deploying payment-worker..."
    
    Push-Location payment-worker
    try {
        # Check if logged in
        $loginCheck = wrangler whoami 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Please login to Cloudflare first:"
            wrangler login
        }
        
        # Deploy
        Write-Info "Running wrangler deploy..."
        wrangler deploy
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Worker deployed successfully!"
            Write-Info "API URL: https://payment-api.jimsbond007.workers.dev"
        } else {
            throw "Deployment failed"
        }
    } finally {
        Pop-Location
    }
}

# Deploy Pages
function Deploy-Pages {
    Write-Info "Deploying King-Chicken Pages..."
    
    # Check if pages project exists
    $pagesCheck = wrangler pages project list 2>&1 | Select-String "upay-client-kc"
    
    if (-not $pagesCheck) {
        Write-Info "Creating Pages project 'upay-client-kc'..."
        wrangler pages project create upay-client-kc --production-branch=main
    }
    
    # Deploy
    Write-Info "Deploying to Pages..."
    wrangler pages deploy UpayClient/_KC --project-name=upay-client-kc --branch=main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Pages deployed successfully!"
        Write-Info "Site URL: https://upay-client-kc.pages.dev"
        Write-Info "Custom Domain: https://king-chicken.jkdcoding.com (if configured)"
    } else {
        throw "Pages deployment failed"
    }
}

# Setup database
function Setup-Database {
    Write-Info "Setting up database schema..."
    
    Push-Location payment-worker
    try {
        # Execute schema
        wrangler d1 execute payment-db --file=./schema.sql
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database schema applied"
        } else {
            Write-Warning "Database schema may already exist or failed to apply"
        }
    } finally {
        Pop-Location
    }
}

# Main
Write-Host "`n========================================"
Write-Host " King-Chicken Payment System Deployment"
Write-Host "========================================`n"

if (-not $SkipConfirmation) {
    Write-Host "This will deploy:"
    if ($Action -eq "all" -or $Action -eq "worker") { Write-Host "  - Payment Worker (payment-api)" }
    if ($Action -eq "all" -or $Action -eq "pages") { Write-Host "  - Frontend Pages (upay-client-kc)" }
    Write-Host ""
    
    $confirm = Read-Host "Continue? (y/n)"
    if ($confirm -ne "y") {
        Write-Info "Deployment cancelled"
        exit 0
    }
}

Check-Dependencies

try {
    if ($Action -eq "all" -or $Action -eq "worker") {
        Deploy-Worker
        Setup-Database
    }
    
    if ($Action -eq "all" -or $Action -eq "pages") {
        Deploy-Pages
    }
    
    Write-Host "`n========================================"
    Write-Success "Deployment completed successfully!"
    Write-Host "========================================`n"
    
    Write-Host "URLs:"
    Write-Host "  Payment Page:  https://upay-client-kc.pages.dev"
    Write-Host "  Admin Login:   https://upay-client-kc.pages.dev/login.html"
    Write-Host "  API Endpoint:  https://payment-api.jimsbond007.workers.dev"
    Write-Host ""
    
} catch {
    Write-Error "Deployment failed: $_"
    exit 1
}

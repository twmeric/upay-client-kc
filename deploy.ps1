# King-Chicken Payment Platform - Deployment Script
# 部署脚本

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "auto",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"

# 配置
$Config = @{
    dev = @{
        project = "payment-portal-dev"
        branch = "develop"
        apiUrl = "https://payment-api-dev.jimsbond007.workers.dev"
    }
    staging = @{
        project = "payment-portal-staging"
        branch = "staging"
        apiUrl = "https://payment-api-staging.jimsbond007.workers.dev"
    }
    prod = @{
        project = "payment-portal-prod"
        branch = "main"
        apiUrl = "https://payment-api.jimsbond007.workers.dev"
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "King-Chicken Payment Platform Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Project: $($Config[$Environment].project)" -ForegroundColor Yellow
Write-Host "Branch: $($Config[$Environment].branch)" -ForegroundColor Yellow
Write-Host ""

# 检查Git状态
Write-Host "[1/5] Checking Git status..." -ForegroundColor Green
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Warning "Uncommitted changes detected!"
    Write-Host $gitStatus
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y") {
        exit 1
    }
}

# 获取版本号
if ($Version -eq "auto") {
    $gitTag = git describe --tags --abbrev=0 2>$null
    if ($gitTag) {
        $Version = $gitTag
    } else {
        $Version = "v1.0.0"
    }
}
Write-Host "[2/5] Version: $Version" -ForegroundColor Green

# 构建
if (-not $SkipBuild) {
    Write-Host "[3/5] Building..." -ForegroundColor Green
    # 构建逻辑
    npm run build 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed!"
        exit 1
    }
}

# 保存构建产物
Write-Host "[4/5] Saving build artifacts..." -ForegroundColor Green
$buildDir = "builds\$Version"
New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
Copy-Item -Path "dist\*" -Destination "$buildDir\" -Recurse -Force

# 创建build-info.json
$buildInfo = @{
    version = $Version
    buildTime = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    gitCommit = (git rev-parse --short HEAD)
    gitBranch = $Config[$Environment].branch
    deployedBy = $env:USERNAME
    environment = $Environment
} | ConvertTo-Json

Set-Content -Path "$buildDir\build-info.json" -Value $buildInfo

# 部署
Write-Host "[5/5] Deploying to Cloudflare Pages..." -ForegroundColor Green
cd $buildDir
wrangler pages deploy . --project-name=$($Config[$Environment].project) --branch=$($Config[$Environment].branch)

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Deployment Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Version: $Version" -ForegroundColor White
    Write-Host "Environment: $Environment" -ForegroundColor White
    Write-Host "Build saved to: $buildDir" -ForegroundColor White
    
    # 更新部署记录
    $logEntry = @"
## $Version - $Environment ($(Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
- **Git Commit**: $(git rev-parse --short HEAD)
- **Status**: Deployed
- **By**: $($env:USERNAME)

"@
    Add-Content -Path "DEPLOYMENT_LOG.md" -Value $logEntry
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Update DNS if needed"
    Write-Host "2. Clear Cloudflare cache"
    Write-Host "3. Verify deployment"
    Write-Host "4. Tag release: git tag -a $Version -m \"Release $Version\""
} else {
    Write-Error "Deployment failed!"
    exit 1
}

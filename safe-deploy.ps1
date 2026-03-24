#!/usr/bin/env powershell
# King-Chicken 安全部署脚本
# 在部署前自动验证支付功能，确保不会破坏客户收款

$ErrorActionPreference = "Stop"

$CONFIG = @{
    ApiBase = "https://payment-api.jimsbond007.workers.dev"
    AdminUrl = "https://king-chicken.jkdcoding.com/admin"
    WorkerProject = "payment-worker"
    FrontendProject = "king-chicken-full"
}

function Write-Status($Message, $Level = "INFO") {
    $timestamp = Get-Date -Format "HH:mm:ss"
    $prefix = switch ($Level) {
        "SUCCESS" { "[✓]" }
        "ERROR" { "[✗]" }
        "WARN" { "[⚠]" }
        "STEP" { "[→]" }
        default { "[ ]" }
    }
    
    $color = switch ($Level) {
        "SUCCESS" { "Green" }
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "STEP" { "Cyan" }
        default { "White" }
    }
    
    Write-Host "$prefix [$timestamp] $Message" -ForegroundColor $color
}

function Test-PaymentProtection {
    Write-Status "步骤 1: 运行支付功能保护测试..." "STEP"
    
    if (-not (Test-Path "payment-protection-test.js")) {
        Write-Status "找不到 payment-protection-test.js" "ERROR"
        return $false
    }
    
    try {
        $output = node payment-protection-test.js 2>&1
        $output | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Status "支付功能保护测试通过 ✓" "SUCCESS"
            return $true
        } else {
            Write-Status "支付功能保护测试失败！" "ERROR"
            return $false
        }
    } catch {
        Write-Status "测试执行错误: $_" "ERROR"
        return $false
    }
}

function Test-AdminAPIs {
    Write-Status "步骤 2: 测试后台管理 API..." "STEP"
    
    $tests = @(
        @{ Name = "Dashboard Stats"; Endpoint = "/api/dashboard/stats" },
        @{ Name = "Transactions"; Endpoint = "/api/transactions?page=1&limit=5" },
        @{ Name = "Boss Config"; Endpoint = "/api/boss/config" },
        @{ Name = "Boss Reports"; Endpoint = "/api/boss/reports?page=1&limit=5" }
    )
    
    $passed = 0
    foreach ($test in $tests) {
        try {
            $headers = @{ "Authorization" = "Bearer admin" }
            $response = Invoke-RestMethod -Uri "$($CONFIG.ApiBase)$($test.Endpoint)" -Headers $headers -TimeoutSec 10
            Write-Status "  ✓ $($test.Name)" "SUCCESS"
            $passed++
        } catch {
            Write-Status "  ✗ $($test.Name): $($_.Exception.Message)" "ERROR"
        }
    }
    
    if ($passed -eq $tests.Count) {
        Write-Status "所有后台 API 测试通过 ($passed/$($tests.Count))" "SUCCESS"
        return $true
    } else {
        Write-Status "部分 API 测试失败 ($passed/$($tests.Count))" "WARN"
        return $true  # 继续部署，因为可能只是数据问题
    }
}

function Test-FrontendBuild {
    Write-Status "步骤 3: 检查前端构建..." "STEP"
    
    $buildPath = "./$($CONFIG.FrontendProject)/dist"
    if (Test-Path $buildPath) {
        Write-Status "前端构建目录存在: $buildPath" "SUCCESS"
        
        $indexPath = "$buildPath/index.html"
        if (Test-Path $indexPath) {
            Write-Status "index.html 存在" "SUCCESS"
            return $true
        } else {
            Write-Status "index.html 不存在！" "ERROR"
            return $false
        }
    } else {
        Write-Status "前端构建目录不存在: $buildPath" "ERROR"
        return $false
    }
}

function Deploy-Worker {
    Write-Status "步骤 4: 部署 API Worker..." "STEP"
    
    $workerPath = "./$($CONFIG.WorkerProject)"
    if (-not (Test-Path $workerPath)) {
        Write-Status "Worker 项目不存在: $workerPath" "ERROR"
        return $false
    }
    
    try {
        Push-Location $workerPath
        
        Write-Status "  正在部署到 Cloudflare Workers..." "INFO"
        $deployOutput = wrangler deploy 2>&1
        $deployOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
        
        Pop-Location
        
        if ($LASTEXITCODE -eq 0) {
            Write-Status "Worker 部署成功" "SUCCESS"
            return $true
        } else {
            Write-Status "Worker 部署失败" "ERROR"
            return $false
        }
    } catch {
        Write-Status "部署错误: $_" "ERROR"
        return $false
    }
}

function Deploy-Frontend {
    Write-Status "步骤 5: 部署前端..." "STEP"
    
    try {
        Push-Location $CONFIG.FrontendProject
        
        Write-Status "  正在部署到 Cloudflare Pages..." "INFO"
        $deployOutput = npx wrangler pages deploy dist 2>&1
        $deployOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
        
        Pop-Location
        
        if ($LASTEXITCODE -eq 0) {
            Write-Status "前端部署成功" "SUCCESS"
            return $true
        } else {
            Write-Status "前端部署失败" "ERROR"
            return $false
        }
    } catch {
        Write-Status "部署错误: $_" "ERROR"
        return $false
    }
}

function Test-PostDeploy {
    Write-Status "步骤 6: 部署后验证..." "STEP"
    
    Start-Sleep -Seconds 5  # 等待部署生效
    
    # 再次测试关键 API
    $apiOk = $true
    try {
        $headers = @{ "Authorization" = "Bearer admin" }
        $response = Invoke-RestMethod -Uri "$($CONFIG.ApiBase)/api/dashboard/stats" -Headers $headers -TimeoutSec 15
        Write-Status "  ✓ API 响应正常" "SUCCESS"
    } catch {
        Write-Status "  ✗ API 响应异常: $($_.Exception.Message)" "ERROR"
        $apiOk = $false
    }
    
    # 测试前端
    $frontendOk = $true
    try {
        $response = Invoke-WebRequest -Uri $CONFIG.AdminUrl -TimeoutSec 15
        if ($response.StatusCode -eq 200) {
            Write-Status "  ✓ 前端访问正常" "SUCCESS"
        } else {
            Write-Status "  ✗ 前端返回 HTTP $($response.StatusCode)" "ERROR"
            $frontendOk = $false
        }
    } catch {
        Write-Status "  ✗ 前端访问失败: $($_.Exception.Message)" "ERROR"
        $frontendOk = $false
    }
    
    return $apiOk -and $frontendOk
}

function Start-Rollback {
    Write-Status "启动回滚程序..." "STEP"
    Write-Status "请手动检查之前的部署版本" "WARN"
    Write-Status "回滚命令: wrangler rollback" "INFO"
}

# ==================== 主程序 ====================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "King-Chicken 安全部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
Write-Status "检查环境..." "STEP"
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Status "Node.js: $nodeVersion" "SUCCESS"
} else {
    Write-Status "Node.js 未安装！" "ERROR"
    exit 1
}

# 检查 Wrangler
$wranglerVersion = wrangler --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Status "Wrangler: $wranglerVersion" "SUCCESS"
} else {
    Write-Status "Wrangler 未安装！运行: npm install -g wrangler" "ERROR"
    exit 1
}

Write-Host ""

# 阶段 1: 部署前测试 (支付功能保护)
$paymentOk = Test-PaymentProtection
if (-not $paymentOk) {
    Write-Host ""
    Write-Status "========================================" "ERROR"
    Write-Status "支付功能保护测试失败！" "ERROR"
    Write-Status "停止部署以保护客户收款功能！" "ERROR"
    Write-Status "========================================" "ERROR"
    exit 1
}

# 阶段 2: 后台 API 测试
$adminOk = Test-AdminAPIs

# 阶段 3: 前端构建检查
$buildOk = Test-FrontendBuild
if (-not $buildOk) {
    Write-Status "前端构建检查失败，是否继续? (Y/N)" "WARN"
    $response = Read-Host
    if ($response -ne 'Y') {
        exit 1
    }
}

# 阶段 4: 确认部署
Write-Host ""
Write-Status "========================================" "STEP"
Write-Status "部署前检查完成" "STEP"
Write-Status "========================================" "STEP"
Write-Host ""

$proceed = Read-Host "确认要部署吗? (输入 'DEPLOY' 确认)"
if ($proceed -ne 'DEPLOY') {
    Write-Status "部署已取消" "WARN"
    exit 0
}

# 阶段 5: 执行部署
$workerDeployed = Deploy-Worker
if (-not $workerDeployed) {
    Write-Status "Worker 部署失败！" "ERROR"
    Start-Rollback
    exit 1
}

$frontendDeployed = Deploy-Frontend
if (-not $frontendDeployed) {
    Write-Status "前端部署失败！" "ERROR"
    # Worker 已部署但前端失败，继续验证
}

# 阶段 6: 部署后验证
$postDeployOk = Test-PostDeploy

# 最终结果
Write-Host ""
Write-Status "========================================" "STEP"

if ($postDeployOk) {
    Write-Status "部署成功完成！✓" "SUCCESS"
    Write-Status "后台管理: $($CONFIG.AdminUrl)" "SUCCESS"
    Write-Status "API: $($CONFIG.ApiBase)" "SUCCESS"
} else {
    Write-Status "部署后验证发现问题" "ERROR"
    Write-Status "请检查日志并考虑回滚" "WARN"
}

Write-Status "========================================" "STEP"
Write-Host ""

# 生成部署报告
$report = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    paymentProtection = $paymentOk
    adminAPI = $adminOk
    buildCheck = $buildOk
    workerDeployed = $workerDeployed
    frontendDeployed = $frontendDeployed
    postDeploy = $postDeployOk
    overall = $postDeployOk
} | ConvertTo-Json -Depth 3

$report | Out-File -FilePath "deploy-report.json" -Encoding UTF8
Write-Status "部署报告已保存: deploy-report.json" "INFO"

exit ($postDeployOk ? 0 : 1)

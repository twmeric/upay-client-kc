#!/usr/bin/env powershell
# CI/CD 测试运行器
# 模拟 CI/CD 流程，在每次代码变更时自动测试

param(
    [string]$Branch = "main",
    [switch]$SkipPaymentTest = $false,
    [switch]$SkipDeployment = $true
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "King-Chicken CI/CD 测试运行器" -ForegroundColor Cyan
Write-Host "分支: $Branch" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date
$testResults = @()
$allPassed = $true

function Add-TestResult($Name, $Passed, $Duration, $Error = $null) {
    $script:testResults += [PSCustomObject]@{
        Name = $Name
        Passed = $Passed
        Duration = $Duration
        Error = $Error
    }
    return $Passed
}

# ============ 阶段 1: 代码检查 ============
Write-Host "[阶段 1] 代码质量检查" -ForegroundColor Yellow

$stageStart = Get-Date

# 检查关键文件是否存在
$requiredFiles = @(
    "payment-worker/src/index.js",
    "king-chicken-full/dist/index.html",
    "self-healing-monitor.js",
    "payment-protection-test.js"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
        Write-Host "  ✗ 缺少文件: $file" -ForegroundColor Red
    } else {
        Write-Host "  ✓ $file" -ForegroundColor Green
    }
}

$stageEnd = Get-Date
$stageDuration = ($stageEnd - $stageStart).TotalSeconds

if ($missingFiles.Count -gt 0) {
    Add-TestResult "代码完整性" $false $stageDuration "缺少文件: $($missingFiles -join ', ')"
    $allPassed = $false
} else {
    Add-TestResult "代码完整性" $true $stageDuration
}

# ============ 阶段 2: 支付保护测试 ============
Write-Host ""
Write-Host "[阶段 2] 支付功能保护测试" -ForegroundColor Yellow

if (-not $SkipPaymentTest) {
    $stageStart = Get-Date
    
    try {
        $output = node payment-protection-test.js 2>&1
        $output | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        
        $stageEnd = Get-Date
        $stageDuration = ($stageEnd - $stageStart).TotalSeconds
        
        if ($LASTEXITCODE -eq 0) {
            Add-TestResult "支付保护测试" $true $stageDuration
            Write-Host "  ✓ 支付功能正常" -ForegroundColor Green
        } else {
            Add-TestResult "支付保护测试" $false $stageDuration "支付保护测试失败"
            Write-Host "  ✗ 支付功能异常！" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        $stageEnd = Get-Date
        $stageDuration = ($stageEnd - $stageStart).TotalSeconds
        Add-TestResult "支付保护测试" $false $stageDuration $_.Exception.Message
        $allPassed = $false
    }
} else {
    Write-Host "  ⚠ 已跳过" -ForegroundColor Yellow
    Add-TestResult "支付保护测试" $true 0 "已跳过"
}

# ============ 阶段 3: API 功能测试 ============
Write-Host ""
Write-Host "[阶段 3] API 功能测试" -ForegroundColor Yellow

$stageStart = Get-Date
$apiTests = @(
    @{ Name = "Dashboard API"; Endpoint = "/api/dashboard/stats" },
    @{ Name = "Transactions API"; Endpoint = "/api/transactions?page=1&limit=5" },
    @{ Name = "Boss Config API"; Endpoint = "/api/boss/config" },
    @{ Name = "Boss Reports API"; Endpoint = "/api/boss/reports?page=1&limit=5" },
    @{ Name = "Generate Report API"; Endpoint = "/api/boss/reports/generate"; Method = "POST"; Body = '{"date":"2026-03-21"}' }
)

$apiPassed = 0
foreach ($test in $apiTests) {
    try {
        $headers = @{ "Authorization" = "Bearer admin" }
        $method = if ($test.Method) { $test.Method } else { "GET" }
        $body = if ($test.Body) { $test.Body } else { $null }
        
        $response = Invoke-RestMethod -Uri "https://payment-api.jimsbond007.workers.dev$($test.Endpoint)" -Method $method -Headers $headers -Body $body -TimeoutSec 10
        Write-Host "  ✓ $($test.Name)" -ForegroundColor Green
        $apiPassed++
    } catch {
        Write-Host "  ✗ $($test.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

$stageEnd = Get-Date
$stageDuration = ($stageEnd - $stageStart).TotalSeconds
$apiAllPassed = ($apiPassed -eq $apiTests.Count)

Add-TestResult "API功能测试" $apiAllPassed $stageDuration
if (-not $apiAllPassed) {
    $allPassed = $false
}

# ============ 阶段 4: 筛选功能测试 ============
Write-Host ""
Write-Host "[阶段 4] 筛选功能测试" -ForegroundColor Yellow

$stageStart = Get-Date
$filterTests = @(
    @{ PayType = "UP_OP"; Name = "银联筛选" },
    @{ PayType = "ALI_H5"; Name = "支付宝筛选" },
    @{ PayType = "WX_H5"; Name = "微信筛选" }
)

$filterPassed = 0
foreach ($test in $filterTests) {
    try {
        $headers = @{ "Authorization" = "Bearer admin" }
        $response = Invoke-RestMethod -Uri "https://payment-api.jimsbond007.workers.dev/api/transactions?page=1&limit=10&payType=$($test.PayType)" -Headers $headers -TimeoutSec 10
        
        # 验证筛选是否正确
        $allMatch = $true
        foreach ($item in $response.data) {
            if ($item.payType -ne $test.PayType) {
                $allMatch = $false
                break
            }
        }
        
        if ($allMatch) {
            Write-Host "  ✓ $($test.Name)" -ForegroundColor Green
            $filterPassed++
        } else {
            Write-Host "  ✗ $($test.Name): 筛选结果不匹配" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ $($test.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

$stageEnd = Get-Date
$stageDuration = ($stageEnd - $stageStart).TotalSeconds
$filterAllPassed = ($filterPassed -eq $filterTests.Count)

Add-TestResult "筛选功能测试" $filterAllPassed $stageDuration
if (-not $filterAllPassed) {
    $allPassed = $false
}

# ============ 阶段 5: 前端测试 ============
Write-Host ""
Write-Host "[阶段 5] 前端访问测试" -ForegroundColor Yellow

$stageStart = Get-Date

try {
    $response = Invoke-WebRequest -Uri "https://king-chicken.jkdcoding.com/admin" -TimeoutSec 15
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ 前端访问正常" -ForegroundColor Green
        $frontendPassed = $true
    } else {
        Write-Host "  ✗ 前端返回 HTTP $($response.StatusCode)" -ForegroundColor Red
        $frontendPassed = $false
    }
} catch {
    Write-Host "  ✗ 前端访问失败: $($_.Exception.Message)" -ForegroundColor Red
    $frontendPassed = $false
}

$stageEnd = Get-Date
$stageDuration = ($stageEnd - $stageStart).TotalSeconds

Add-TestResult "前端访问测试" $frontendPassed $stageDuration
if (-not $frontendPassed) {
    $allPassed = $false
}

# ============ 测试报告 ============
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CI/CD 测试报告" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$endTime = Get-Date
$totalDuration = ($endTime - $startTime).TotalSeconds

# 显示详细结果
$testResults | ForEach-Object {
    $status = if ($_.Passed) { "✓ 通过" } else { "✗ 失败" }
    $color = if ($_.Passed) { "Green" } else { "Red" }
    $duration = "{0:N2}s" -f $_.Duration
    Write-Host "$status - $($_.Name) ($duration)" -ForegroundColor $color
    if ($_.Error) {
        Write-Host "  错误: $($_.Error)" -ForegroundColor Red
    }
}

Write-Host ""
$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_.Passed }).Count
$failedTests = $totalTests - $passedTests

Write-Host "总计: $totalTests | " -NoNewline
Write-Host "通过: $passedTests" -ForegroundColor Green -NoNewline
Write-Host " | " -NoNewline
Write-Host "失败: $failedTests" -ForegroundColor Red -NoNewline
Write-Host " | 耗时: $([math]::Round($totalDuration, 2))s"

# 保存报告
$report = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    branch = $Branch
    duration = $totalDuration
    total = $totalTests
    passed = $passedTests
    failed = $failedTests
    allPassed = $allPassed
    results = $testResults
} | ConvertTo-Json -Depth 3

$report | Out-File -FilePath "ci-test-report.json" -Encoding UTF8
Write-Host ""
Write-Host "报告已保存: ci-test-report.json"

# 最终结果
Write-Host ""
if ($allPassed) {
    Write-Host "✓ 所有测试通过！可以继续部署" -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ 测试失败！请修复问题后再部署" -ForegroundColor Red
    exit 1
}

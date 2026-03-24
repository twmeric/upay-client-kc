# Deploy King-Chicken using Cloudflare REST API directly
param(
    [string]$Action = "all"
)

$ErrorActionPreference = "Stop"

$API_TOKEN = "wNu0gSgw3LLEERkKet9SB7qaut-dHLrb3EBX_XGr"
$ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
$WORKER_NAME = "payment-api"

$headers = @{
    "Authorization" = "Bearer $API_TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "`n========================================"
Write-Host " Deploying with Cloudflare REST API"
Write-Host "========================================`n"

# 1. Deploy Worker
if ($Action -eq "all" -or $Action -eq "worker") {
    Write-Host "[INFO] Deploying Worker..." -ForegroundColor Cyan
    
    $workerCode = Get-Content "payment-worker\src\index.js" -Raw
    
    # 使用 multipart/form-data 上传
    $boundary = "----WebKitFormBoundary" + [System.Guid]::NewGuid().ToString("N")
    $LF = "`r`n"
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"metadata`"",
        "",
        '{"main_module":"index.js"}',
        "--$boundary",
        "Content-Disposition: form-data; name=`"index.js`"; filename=`"index.js`"",
        "Content-Type: application/javascript+module",
        "",
        $workerCode,
        "--$boundary--"
    ) -join $LF
    
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($bodyLines)
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME" -Method PUT -Headers @{"Authorization"="Bearer $API_TOKEN"} -ContentType "multipart/form-data; boundary=$boundary" -Body $bytes
        
        if ($response.success) {
            Write-Host "[SUCCESS] Worker deployed!" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] $($response.errors)" -ForegroundColor Red
        }
    } catch {
        Write-Host "[ERROR] $_" -ForegroundColor Red
    }
}

# 2. Deploy Pages via Direct Upload API
if ($Action -eq "all" -or $Action -eq "pages") {
    Write-Host "`n[INFO] Deploying Pages..." -ForegroundColor Cyan
    
    # 首先检查/创建项目
    $projectName = "upay-client-kc"
    
    try {
        $projects = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects" -Headers $headers -Method GET
        $projectExists = $projects.result | Where-Object { $_.name -eq $projectName }
        
        if (-not $projectExists) {
            Write-Host "[INFO] Creating Pages project..." -ForegroundColor Yellow
            $body = @{
                name = $projectName
                production_branch = "main"
            } | ConvertTo-Json
            
            $newProject = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects" -Headers $headers -Method POST -Body $body
            if ($newProject.success) {
                Write-Host "[SUCCESS] Project created!" -ForegroundColor Green
            }
        } else {
            Write-Host "[INFO] Project exists" -ForegroundColor Green
        }
        
        # 创建 zip 文件
        $zipPath = "$PWD\kc-deploy.zip"
        if (Test-Path $zipPath) { Remove-Item $zipPath }
        
        Compress-Archive -Path "UpayClient\_KC\*" -DestinationPath $zipPath -Force
        Write-Host "[INFO] Created zip: $zipPath" -ForegroundColor Green
        
        # 使用 wrangler pages deploy (这通常需要 OAuth，但我们可以尝试)
        $env:CLOUDFLARE_API_TOKEN = $API_TOKEN
        
        # 创建 _headers 文件用于 Pages
        $headersContent = @"
/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization
"@
        Set-Content -Path "UpayClient\_KC\_headers" -Value $headersContent
        
        Write-Host "`n[SUCCESS] Pages files prepared at: UpayClient\_KC" -ForegroundColor Green
        Write-Host "[INFO] To deploy Pages manually:" -ForegroundColor Yellow
        Write-Host "  1. Go to https://dash.cloudflare.com/$ACCOUNT_ID/pages" -ForegroundColor Cyan
        Write-Host "  2. Create project 'upay-client-kc' or upload to existing project" -ForegroundColor Cyan
        Write-Host "  3. Upload the folder: UpayClient\_KC" -ForegroundColor Cyan
        
    } catch {
        Write-Host "[ERROR] $_" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " Deployment process completed!"
Write-Host "========================================`n"

Write-Host "Manual deployment URLs:"
Write-Host "  Worker: https://dash.cloudflare.com/$ACCOUNT_ID/workers/services/view/$WORKER_NAME"
Write-Host "  Pages:  https://dash.cloudflare.com/$ACCOUNT_ID/pages"
Write-Host ""

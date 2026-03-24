# Deploy Pages V2 - Using Direct Upload
$ErrorActionPreference = "Stop"

$token = "cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca"
$account = "dfbee5c2a5706a81bc04675499c933d4"
$project = "upay-client-kc"
$source = "UpayClient\_KC"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Pages Direct Upload Deployment"
Write-Host "========================================`n"

# Step 1: Create deployment
try {
    Write-Host "[1] Creating deployment..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $body = @{
        branch = "main"
        commit_message = "Auto deploy from PowerShell"
    } | ConvertTo-Json
    
    $createUrl = "https://api.cloudflare.com/client/v4/accounts/$account/pages/projects/$project/deployments"
    $resp = Invoke-RestMethod -Uri $createUrl -Method POST -Headers $headers -Body $body -TimeoutSec 30
    
    if ($resp.success) {
        $deploymentId = $resp.result.id
        Write-Host "[✓] Deployment created: $deploymentId" -ForegroundColor Green
        
        # Step 2: Upload files
        Write-Host "`n[2] Uploading files..." -ForegroundColor Yellow
        
        # Get upload URL
        $uploadUrl = $resp.result.upload_url
        Write-Host "Upload URL: $uploadUrl" -ForegroundColor Gray
        
        # Create multipart form
        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        
        # Read files and create manifest
        $files = @{}
        Get-ChildItem -Path $source -File | ForEach-Object {
            $content = [System.Convert]::ToBase64String([System.IO.File]::ReadAllBytes($_.FullName))
            $files[$_.Name] = $content
        }
        
        $manifest = @{
            manifest = @{}
            files = $files
        } | ConvertTo-Json -Depth 10 -Compress
        
        # Upload
        $uploadHeaders = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        
        $uploadResp = Invoke-RestMethod -Uri $uploadUrl -Method POST -Headers $uploadHeaders -Body $manifest -TimeoutSec 60
        
        if ($uploadResp.success) {
            Write-Host "`n[✓] Upload successful!" -ForegroundColor Green
            Write-Host "URL: https://$project.pages.dev" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "`n[!] Error: $_" -ForegroundColor Red
    Write-Host "`n需要手动部署:" -ForegroundColor Yellow
    Write-Host "1. 访问: https://dash.cloudflare.com/$account/pages" -ForegroundColor White
    Write-Host "2. 选择: $project" -ForegroundColor White
    Write-Host "3. 上传文件夹: $source" -ForegroundColor White
}

Write-Host "`n========================================" -ForegroundColor Cyan

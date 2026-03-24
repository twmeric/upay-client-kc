# Deploy Pages using Cloudflare REST API directly

$SUPER_TOKEN = "cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca"
$ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
$PROJECT_NAME = "upay-client-kc"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Deploying Pages via REST API"
Write-Host "========================================`n"

$headers = @{
    "Authorization" = "Bearer $SUPER_TOKEN"
    "Content-Type" = "application/json"
}

# 1. Check if project exists
try {
    $projects = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects" -Headers $headers -Method GET
    $projectExists = $projects.result | Where-Object { $_.name -eq $PROJECT_NAME }
    
    if (-not $projectExists) {
        Write-Host "[INFO] Creating Pages project: $PROJECT_NAME" -ForegroundColor Yellow
        $body = @{
            name = $PROJECT_NAME
            production_branch = "main"
        } | ConvertTo-Json
        
        $newProject = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects" -Headers $headers -Method POST -Body $body
        if ($newProject.success) {
            Write-Host "[SUCCESS] Project created!" -ForegroundColor Green
        }
    } else {
        Write-Host "[INFO] Project exists: $PROJECT_NAME" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] Failed to check/create project: $_" -ForegroundColor Red
}

# 2. Create deployment files hash map
Write-Host "`n[INFO] Preparing files..." -ForegroundColor Cyan

$files = @{}
$basePath = "UpayClient\_KC"

# Read all files
Get-ChildItem -Path $basePath -File | ForEach-Object {
    $content = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content $_.FullName -Raw)))
    $files[$_.Name] = $content
    Write-Host "  - $($_.Name)" -ForegroundColor Gray
}

Write-Host "`n[SUCCESS] Files ready for upload!" -ForegroundColor Green

# 3. Direct upload API
Write-Host "`n[INFO] Uploading via Direct Upload API..." -ForegroundColor Cyan

try {
    # Create a new deployment using direct upload
    $uploadHeaders = @{
        "Authorization" = "Bearer $SUPER_TOKEN"
        "Content-Type" = "multipart/form-data"
    }
    
    # Create zip file
    $zipPath = "$PWD\kc-pages-upload.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath }
    
    Compress-Archive -Path "$basePath\*" -DestinationPath $zipPath -Force
    Write-Host "[INFO] Created zip: $zipPath" -ForegroundColor Green
    
    # Get upload URL
    $uploadUrl = "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments"
    
    $fileBytes = [System.IO.File]::ReadAllBytes($zipPath)
    $fileEnc = [System.Convert]::ToBase64String($fileBytes)
    
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"deploy.zip`"",
        "Content-Type: application/zip",
        "",
        $fileEnc,
        "--$boundary--"
    ) -join $LF
    
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyLines)
    
    $response = Invoke-RestMethod -Uri $uploadUrl -Method POST -Headers @{
        "Authorization" = "Bearer $SUPER_TOKEN"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    } -Body $bodyBytes
    
    if ($response.success) {
        Write-Host "`n[SUCCESS] Pages deployed successfully!" -ForegroundColor Green
        Write-Host "  URL: https://$PROJECT_NAME.pages.dev" -ForegroundColor Cyan
    }
} catch {
    Write-Host "[WARNING] Direct upload failed, using manual method..." -ForegroundColor Yellow
    Write-Host "`nPlease deploy manually:" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://dash.cloudflare.com/$ACCOUNT_ID/pages" -ForegroundColor White
    Write-Host "  2. Create project: $PROJECT_NAME" -ForegroundColor White
    Write-Host "  3. Upload folder: UpayClient\_KC" -ForegroundColor White
    Write-Host "  4. Or upload zip: $zipPath" -ForegroundColor White
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " Deployment process completed!"
Write-Host "========================================`n"

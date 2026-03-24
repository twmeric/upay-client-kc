# Deploy Pages using Cloudflare REST API - Direct Upload
$SUPER_TOKEN = "cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca"
$ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
$PROJECT_NAME = "upay-client-kc"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Deploying Pages via REST API"
Write-Host "========================================`n"

# Create zip
$sourcePath = "UpayClient\_KC"
$zipPath = "$PWD\kc-upload.zip"

if (Test-Path $zipPath) { Remove-Item $zipPath }

# Create zip with all files
Compress-Archive -Path "$sourcePath\*" -DestinationPath $zipPath -Force
Write-Host "[✓] Created zip: $zipPath ($([math]::Round((Get-Item $zipPath).Length/1KB,2)) KB)" -ForegroundColor Green

# Get upload token
$headers = @{
    "Authorization" = "Bearer $SUPER_TOKEN"
    "Content-Type" = "application/json"
}

try {
    Write-Host "`n[1] Getting upload token..." -ForegroundColor Yellow
    
    # Get upload token for direct upload
    $tokenResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/upload-token" -Headers $headers -Method GET
    
    if ($tokenResponse.success) {
        Write-Host "[✓] Got upload token" -ForegroundColor Green
        
        $uploadToken = $tokenResponse.result.upload_token
        $uploadUrl = $tokenResponse.result.upload_url
        
        # Prepare multipart form data
        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        
        # Read file bytes
        $fileBytes = [System.IO.File]::ReadAllBytes($zipPath)
        $fileContent = [System.Convert]::ToBase64String($fileBytes)
        
        Write-Host "`n[2] Uploading files..." -ForegroundColor Yellow
        
        # Use curl for upload
        $curlCmd = "curl -X POST `"$uploadUrl`" " +
                   "-H 'Authorization: Bearer $SUPER_TOKEN' " +
                   "-F 'file=@$zipPath' " +
                   "--max-time 60"
        
        Write-Host "Running: $curlCmd" -ForegroundColor Gray
        $result = Invoke-Expression $curlCmd 2>&1
        
        Write-Host "`n[Result]" -ForegroundColor Cyan
        Write-Host $result
        
        if ($result -match "success" -or $result -match "id") {
            Write-Host "`n[✓] Deployment successful!" -ForegroundColor Green
            Write-Host "URL: https://$PROJECT_NAME.pages.dev" -ForegroundColor Cyan
        }
    } else {
        throw "Failed to get upload token"
    }
    
} catch {
    Write-Host "`n[!] Direct upload failed: $_" -ForegroundColor Red
    Write-Host "`n[Fallback] Using Wrangler login..." -ForegroundColor Yellow
    
    # Fallback: use npx wrangler with direct auth
    Push-Location $sourcePath
    try {
        # Create wrangler.toml for pages
        @"
name = "$PROJECT_NAME"
compatibility_date = "2024-01-01"
"@ | Set-Content -Path "wrangler.toml" -Force
        
        # Deploy
        $env:CLOUDFLARE_API_TOKEN = $SUPER_TOKEN
        npx wrangler@3 pages deploy . --project-name=$PROJECT_NAME --branch=main --commit-message="Auto deploy" 2>&1
        
    } finally {
        Pop-Location
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan

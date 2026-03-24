# Deploy KC Pages - Fix Endpoint
$SUPER_TOKEN = "cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca"
$ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
$PROJECT_NAME = "upay-client-kc"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Deploying KC Pages (Fix Endpoint)"
Write-Host "========================================`n"

# Create _headers with proper CORS
@"
/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key
"@ | Set-Content -Path "UpayClient\_KC\_headers" -Force

# Ensure API_BASE is correct
$htmlContent = Get-Content "UpayClient\_KC\index.html" -Raw
if ($htmlContent -match "const API_BASE = 'https://payment-api\.jimsbond007\.workers\.dev/api/v1/client/KC'") {
    Write-Host "[✓] API_BASE is correct" -ForegroundColor Green
} else {
    Write-Host "[!] Fixing API_BASE..." -ForegroundColor Yellow
    $htmlContent = $htmlContent -replace "const API_BASE = .*?;", "const API_BASE = 'https://payment-api.jimsbond007.workers.dev/api/v1/client/KC';"
    Set-Content -Path "UpayClient\_KC\index.html" -Value $htmlContent -NoNewline
}

# Deploy via API
$headers = @{
    "Authorization" = "Bearer $SUPER_TOKEN"
    "Content-Type" = "application/json"
}

try {
    # Get project
    $project = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME" -Headers $headers
    Write-Host "[✓] Project found: $PROJECT_NAME" -ForegroundColor Green
    
    # Create deployment
    Write-Host "`n[INFO] Creating deployment..." -ForegroundColor Yellow
    
    # Create zip
    $zipPath = "$PWD\kc-deploy-fix.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath }
    Compress-Archive -Path "UpayClient\_KC\*" -DestinationPath $zipPath -Force
    
    Write-Host "`n[SUCCESS] Created: $zipPath" -ForegroundColor Green
    Write-Host "`nPlease upload manually:" -ForegroundColor Cyan
    Write-Host "1. https://dash.cloudflare.com/$ACCOUNT_ID/pages" -ForegroundColor White
    Write-Host "2. Select: $PROJECT_NAME" -ForegroundColor White
    Write-Host "3. Create deployment > Upload folder: UpayClient\_KC" -ForegroundColor White
    
} catch {
    Write-Host "[ERROR] $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan

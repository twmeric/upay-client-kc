# Deploy Dummy Pages
$SUPER_TOKEN = "cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca"
$ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
$PROJECT_NAME = "upay-dummy"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Deploying Dummy Pages"
Write-Host "========================================`n"

# Create _headers
@"
/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key
"@ | Set-Content -Path "UpayClient\_dummy\_headers" -Force

# Deploy using wrangler pages
Push-Location UpayClient\_dummy
try {
    $env:CLOUDFLARE_API_TOKEN = $SUPER_TOKEN
    
    Write-Host "[INFO] Deploying to Pages..." -ForegroundColor Yellow
    wrangler pages deploy . --project-name=$PROJECT_NAME --branch=main 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[SUCCESS] Dummy Pages deployed!" -ForegroundColor Green
        Write-Host "URL: https://$PROJECT_NAME.pages.dev" -ForegroundColor Cyan
    } else {
        Write-Host "`n[INFO] Deploy via Dashboard:" -ForegroundColor Yellow
        Write-Host "1. https://dash.cloudflare.com/$ACCOUNT_ID/pages" -ForegroundColor White
        Write-Host "2. Create project: $PROJECT_NAME" -ForegroundColor White
        Write-Host "3. Upload folder: UpayClient\_dummy" -ForegroundColor White
    }
} finally {
    Pop-Location
}

Write-Host "`n========================================" -ForegroundColor Cyan

# EasyLink Custom Domain Setup Script
# Run this script to configure the custom domain

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  EasyLink Landing Page - Domain Setup" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$Domain = "easylink.jkdcoding.com"
$ProjectName = "easylink-landing"
$PagesUrl = "48282120.easylink-landing.pages.dev"
$ZoneId = "25a5e0bf54a3c4b2e1bc8b1c36b43be1"
$ApiToken = "wNu0gSgw3LLEERkKet9SB7qaut-dHLrb3EBX_XGr"

Write-Host "Step 1: Verifying deployment..." -ForegroundColor Yellow
Write-Host "  Project: $ProjectName" -ForegroundColor Gray
Write-Host "  Pages URL: https://$PagesUrl" -ForegroundColor Gray
Write-Host ""

# Check if wrangler is installed
try {
    $wranglerVersion = wrangler --version 2>$null
    Write-Host "  Wrangler version: $wranglerVersion" -ForegroundColor Green
} catch {
    Write-Host "  Wrangler not found. Installing..." -ForegroundColor Red
    npm install -g wrangler
}

Write-Host ""
Write-Host "Step 2: Attempting to add custom domain via API..." -ForegroundColor Yellow

# Try to add DNS record
$headers = @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type" = "application/json"
}

$body = @{
    type = "CNAME"
    name = "easylink"
    content = $PagesUrl
    ttl = 1
    proxied = $true
} | ConvertTo-Json -Compress

try {
    $response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records" `
        -Method POST -Headers $headers -Body $body -ErrorAction Stop
    
    if ($response.success) {
        Write-Host "  ✓ DNS record created successfully!" -ForegroundColor Green
        Write-Host "    CNAME: easylink.jkdcoding.com -> $PagesUrl" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ✗ Failed to create DNS record via API" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Manual setup required:" -ForegroundColor Yellow
    Write-Host "  1. Go to https://dash.cloudflare.com" -ForegroundColor White
    Write-Host "  2. Select zone: jkdcoding.com" -ForegroundColor White
    Write-Host "  3. Go to DNS > Records" -ForegroundColor White
    Write-Host "  4. Add CNAME record:" -ForegroundColor White
    Write-Host "     Name: easylink" -ForegroundColor Cyan
    Write-Host "     Target: $PagesUrl" -ForegroundColor Cyan
    Write-Host "     Proxy: Enabled (orange cloud)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  5. Go to Workers & Pages > $ProjectName" -ForegroundColor White
    Write-Host "  6. Click 'Custom domains' > 'Set up a custom domain'" -ForegroundColor White
    Write-Host "  7. Enter: $Domain" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Setup Summary" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Temporary URL:" -ForegroundColor Yellow
Write-Host "  https://$PagesUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Custom Domain (after setup):" -ForegroundColor Yellow
Write-Host "  https://$Domain" -ForegroundColor Cyan
Write-Host ""
Write-Host "DNS Propagation: Usually takes 1-5 minutes" -ForegroundColor Gray
Write-Host "SSL Certificate: Auto-provisioned by Cloudflare" -ForegroundColor Gray
Write-Host ""

# Open browser if user confirms
$openBrowser = Read-Host "Open website now? (Y/n)"
if ($openBrowser -ne 'n') {
    Start-Process "https://$PagesUrl"
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green

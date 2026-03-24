# Set Cloudflare Worker Secrets using Super Token

$SUPER_TOKEN = "cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca"
$ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
$WORKER_NAME = "payment-api"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Setting Worker Secrets"
Write-Host "========================================`n"

# Required secrets
$secrets = @{
    "EASYLINK_MCH_NO" = "80403445499539"
    "EASYLINK_APP_ID" = "6763e0a175249c805471328d"
    "EASYLINK_APP_SECRET" = Read-Host "请输入 EASYLINK_APP_SECRET (从 EasyLink 后台获取)"
    "CLOUDWAPI_KEY" = "fLt40WBzPE2DIK5Ls8AIPAMnt8pV8D"
}

$headers = @{
    "Authorization" = "Bearer $SUPER_TOKEN"
    "Content-Type" = "text/plain"
}

foreach ($secret in $secrets.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace($secret.Value)) {
        Write-Host "跳过 $($secret.Key) (空值)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Setting $($secret.Key)..." -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME/secrets" -Method PUT -Headers $headers -Body $secret.Value
        if ($response.success) {
            Write-Host "  ✓ $($secret.Key) set" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ✗ Failed: $_" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Secrets setup completed!"
Write-Host "========================================`n"

Write-Host "请重新部署 Worker 使密钥生效:" -ForegroundColor Yellow
Write-Host "  cd payment-worker" -ForegroundColor White
Write-Host "  `$env:CLOUDFLARE_API_TOKEN=`"$SUPER_TOKEN`"" -ForegroundColor White
Write-Host "  wrangler deploy" -ForegroundColor White

# Deploy Pages with Super Token - Fixed Version

$SUPER_TOKEN = "cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca"
$ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
$PROJECT_NAME = "upay-client-kc"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Deploying Pages (Fixed Method)"
Write-Host "========================================`n"

# Method 1: Try wrangler with token in env
Write-Host "[方法 1] Wrangler + Env Token..." -ForegroundColor Yellow

$env:CLOUDFLARE_API_TOKEN = $SUPER_TOKEN

Push-Location UpayClient\_KC
try {
    # Create _headers
    @"
/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key
"@ | Set-Content -Path "_headers" -Force

    # Deploy using npx wrangler
    npx wrangler@latest pages deploy . --project-name=$PROJECT_NAME --branch=main --yes 2>&1 | ForEach-Object {
        Write-Host $_
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[SUCCESS] Pages deployed!" -ForegroundColor Green
        Pop-Location
        return
    }
} catch {
    Write-Host "[WRANGLER ERROR] $_" -ForegroundColor Red
} finally {
    Pop-Location
}

# Method 2: Direct Upload via API
Write-Host "`n[方法 2] Direct Upload API..." -ForegroundColor Yellow

try {
    # Get upload URL
    $headers = @{
        "Authorization" = "Bearer $SUPER_TOKEN"
        "Content-Type" = "application/json"
    }
    
    Write-Host "  Getting upload URL..." -ForegroundColor Gray
    $uploadSession = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/upload-token" -Headers $headers -Method GET
    
    if ($uploadSession.success) {
        Write-Host "  Got upload token!" -ForegroundColor Green
        
        # Create zip
        $zipPath = "$PWD\pages-deploy-temp.zip"
        if (Test-Path $zipPath) { Remove-Item $zipPath }
        
        Compress-Archive -Path "UpayClient\_KC\*" -DestinationPath $zipPath -Force
        Write-Host "  Created zip: $([math]::Round((Get-Item $zipPath).Length/1KB,2)) KB" -ForegroundColor Gray
        
        # Upload the zip
        $uploadHeaders = @{
            "Authorization" = "Bearer $SUPER_TOKEN"
            "Content-Type" = "multipart/form-data"
        }
        
        $form = @{
            file = Get-Item $zipPath
        }
        
        $response = Invoke-RestMethod -Uri $uploadSession.result.upload_url -Method POST -Headers $uploadHeaders -Form $form
        
        if ($response.success) {
            Write-Host "`n[SUCCESS] Upload successful!" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "[API ERROR] $_" -ForegroundColor Red
}

# Method 3: Manual instructions
Write-Host "`n[方法 3] 手動部署..." -ForegroundColor Yellow
Write-Host "  1. 訪問: https://dash.cloudflare.com/$ACCOUNT_ID/pages" -ForegroundColor White
Write-Host "  2. 選擇項目: $PROJECT_NAME" -ForegroundColor White
Write-Host "  3. 點擊 'Create deployment'" -ForegroundColor White
Write-Host "  4. 上傳文件夾: UpayClient\_KC" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " 部署嘗試完成"
Write-Host "========================================`n"

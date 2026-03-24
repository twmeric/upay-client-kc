# Diagnose Super Token Permissions
$SUPER_TOKEN = "cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca"
$ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"

$headers = @{
    "Authorization" = "Bearer $SUPER_TOKEN"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Token 權限診斷" -ForegroundColor Cyan
Write-Host "========================================`n"

# 1. 驗證 Token
Write-Host "[1] 驗證 Token..." -ForegroundColor Yellow
try {
    $user = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/user/tokens/verify" -Headers $headers
    if ($user.success) {
        Write-Host "  ✅ Token 有效" -ForegroundColor Green
        Write-Host "  狀態: $($user.result.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ Token 無效: $_" -ForegroundColor Red
}

# 2. 檢查帳號訪問
Write-Host "`n[2] 檢查帳號訪問..." -ForegroundColor Yellow
try {
    $accounts = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts" -Headers $headers
    if ($accounts.success) {
        Write-Host "  ✅ 可以訪問帳號列表" -ForegroundColor Green
        foreach ($acc in $accounts.result) {
            Write-Host "  - $($acc.name) (ID: $($acc.id))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  ❌ 無法訪問帳號: $_" -ForegroundColor Red
}

# 3. 檢查指定帳號
Write-Host "`n[3] 檢查指定帳號 ($ACCOUNT_ID)..." -ForegroundColor Yellow
try {
    $account = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID" -Headers $headers
    if ($account.success) {
        Write-Host "  ✅ 可以訪問指定帳號" -ForegroundColor Green
        Write-Host "  名稱: $($account.result.name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ 無法訪問指定帳號: $_" -ForegroundColor Red
}

# 4. 檢查 Pages 項目訪問
Write-Host "`n[4] 檢查 Pages 項目訪問..." -ForegroundColor Yellow
try {
    $pages = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects" -Headers $headers
    if ($pages.success) {
        Write-Host "  ✅ 可以訪問 Pages 項目" -ForegroundColor Green
        Write-Host "  項目數: $($pages.result_info.total_count)" -ForegroundColor Gray
        foreach ($proj in $pages.result) {
            Write-Host "  - $($proj.name)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  ❌ 無法訪問 Pages: $_" -ForegroundColor Red
}

# 5. 檢查 Workers 訪問
Write-Host "`n[5] 檢查 Workers 訪問..." -ForegroundColor Yellow
try {
    $workers = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts" -Headers $headers
    if ($workers.success) {
        Write-Host "  ✅ 可以訪問 Workers" -ForegroundColor Green
        Write-Host "  Worker 數: $($workers.result.Length)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ 無法訪問 Workers: $_" -ForegroundColor Red
}

# 6. 嘗試創建一個測試 Pages 部署
Write-Host "`n[6] 測試創建部署..." -ForegroundColor Yellow
try {
    # 創建一個簡單的 index.html
    $testHtml = "<html><body>Test</body></html>"
    $testBytes = [System.Text.Encoding]::UTF8.GetBytes($testHtml)
    $testB64 = [System.Convert]::ToBase64String($testBytes)
    
    $body = @{
        manifest = @{
            "index.html" = @{
                hash = (Get-FileHash -InputStream ([System.IO.MemoryStream]::new($testBytes)) -Algorithm SHA256).Hash.ToLower()
                size = $testBytes.Length
            }
        }
        files = @{
            "index.html" = $testB64
        }
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/upay-client-kc/deployments" -Headers $headers -Method POST -Body $body
    if ($response.success) {
        Write-Host "  ✅ 可以創建部署" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ 無法創建部署: $_" -ForegroundColor Red
    Write-Host "  錯誤詳情: $($_.Exception.Response.StatusCode.value__) $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "診斷完成" -ForegroundColor Cyan
Write-Host "========================================`n"

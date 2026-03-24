# Check Super Token Permissions
$SUPER_TOKEN = "cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca"
$ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"

$headers = @{
    "Authorization" = "Bearer $SUPER_TOKEN"
}

Write-Host "Token 權限檢查" -ForegroundColor Cyan
Write-Host "========================" 

# 1. Verify Token
Write-Host "`n[1] 驗證 Token..." -ForegroundColor Yellow
try {
    $user = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/user/tokens/verify" -Headers $headers
    if ($user.success) {
        Write-Host "  Token 有效 - 狀態: $($user.result.status)" -ForegroundColor Green
    }
} catch {
    Write-Host "  Token 無效: $_" -ForegroundColor Red
}

# 2. Check Account Access
Write-Host "`n[2] 檢查帳號訪問..." -ForegroundColor Yellow
try {
    $accounts = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts" -Headers $headers
    Write-Host "  可訪問帳號數: $($accounts.result.Length)" -ForegroundColor Green
    foreach ($acc in $accounts.result) {
        Write-Host "    - $($acc.name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  無法訪問: $_" -ForegroundColor Red
}

# 3. Check Pages Projects
Write-Host "`n[3] 檢查 Pages 項目..." -ForegroundColor Yellow
try {
    $pages = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects" -Headers $headers
    Write-Host "  Pages 項目數: $($pages.result_info.total_count)" -ForegroundColor Green
    foreach ($proj in $pages.result) {
        Write-Host "    - $($proj.name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  無法訪問 Pages: $_" -ForegroundColor Red
}

# 4. Check Workers
Write-Host "`n[4] 檢查 Workers..." -ForegroundColor Yellow
try {
    $workers = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts" -Headers $headers
    Write-Host "  Workers 數: $($workers.result.Length)" -ForegroundColor Green
} catch {
    Write-Host "  無法訪問 Workers: $_" -ForegroundColor Red
}

# 5. Check specific Pages project
Write-Host "`n[5] 檢查 upay-client-kc 項目..." -ForegroundColor Yellow
try {
    $project = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/upay-client-kc" -Headers $headers
    Write-Host "  項目存在: $($project.result.name)" -ForegroundColor Green
} catch {
    Write-Host "  無法訪問項目: $_" -ForegroundColor Red
}

Write-Host "`n========================" -ForegroundColor Cyan

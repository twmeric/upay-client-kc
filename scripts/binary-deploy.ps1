$ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
$PROJECT_NAME = "upay-client-kc"
$TOKEN = "cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca"
$SOURCE_DIR = "C:\Users\Owner\Cloudflare\kingchicken\UpayClient\_KC"

Write-Host "🚀 Binary Deploy`n" -ForegroundColor Cyan

# 收集文件
$files = @{}
Get-ChildItem -Path $SOURCE_DIR -File | ForEach-Object {
    $content = [System.IO.File]::ReadAllBytes($_.FullName)
    $hash = [System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash($content)).Replace("-", "").ToLower()
    $files[$_.Name] = @{
        hash = $hash
        size = $_.Length
        content = $content
    }
    Write-Host "  📄 $($_.Name): $($_.Length) bytes" -ForegroundColor Gray
}

# 驗證
$indexContent = [System.Text.Encoding]::UTF8.GetString($files['index.html'].content)
Write-Host "`n  API_BASE: $($indexContent.Contains('API_BASE'))" -ForegroundColor Green

# 構建 manifest
$manifestFiles = @{}
$files.Keys | ForEach-Object {
    $manifestFiles[$_] = @{
        hash = $files[$_].hash
        size = $files[$_].size
    }
}
$manifest = @{ manifest = @{ files = $manifestFiles } } | ConvertTo-Json -Depth 10 -Compress

# 使用 MemoryStream 構建二進制 body
$stream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.StreamWriter($stream, [System.Text.Encoding]::UTF8)
$boundary = "----WebKitFormBoundary$(Get-Random)"

# Manifest 部分
$writer.Write("--$boundary`r`n")
$writer.Write("Content-Disposition: form-data; name=`"manifest`"`r`n`r`n")
$writer.Write($manifest)
$writer.Write("`r`n")
$writer.Flush()

# 文件部分
$files.Keys | ForEach-Object {
    $writer.Write("--$boundary`r`n")
    $writer.Write("Content-Disposition: form-data; name=`"$_`"; filename=`"$_`"`r`n")
    $writer.Write("Content-Type: text/html`r`n`r`n")
    $writer.Flush()
    
    # 直接寫入二進制內容
    $stream.Write($files[$_].content, 0, $files[$_].content.Length)
    
    $writer.Write("`r`n")
    $writer.Flush()
}

$writer.Write("--$boundary--`r`n")
$writer.Flush()

$bodyBytes = $stream.ToArray()
$stream.Close()

Write-Host "`n📦 Total: $($bodyBytes.Length) bytes`n" -ForegroundColor Cyan

# 發送
$deployUrl = "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments"

try {
    Write-Host "🚀 Uploading..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $deployUrl -Method POST -Headers @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    } -Body $bodyBytes -TimeoutSec 120
    
    Write-Host "`n✅ SUCCESS!" -ForegroundColor Green
    Write-Host "   URL: $($response.result.url)" -ForegroundColor Cyan
    Write-Host "   ID: $($response.result.id)" -ForegroundColor Cyan
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

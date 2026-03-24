$ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
$PROJECT_NAME = "upay-client-kc"
$TOKEN = "cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca"
$SOURCE_DIR = "C:\Users\Owner\Cloudflare\kingchicken\UpayClient\_KC"

Write-Host "🚀 Final Deploy Script`n" -ForegroundColor Cyan

# 讀取所有文件
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

# 驗證 index.html
$indexContent = [System.Text.Encoding]::UTF8.GetString($files['index.html'].content)
Write-Host "`n  Verification:" -ForegroundColor Yellow
Write-Host "    API_BASE present: $($indexContent.Contains('API_BASE'))" -ForegroundColor $(if($indexContent.Contains('API_BASE')){'Green'}else{'Red'})
Write-Host "    POST present: $($indexContent.Contains("method: 'POST'"))" -ForegroundColor $(if($indexContent.Contains("method: 'POST'")){'Green'}else{'Red'})

# 構建 manifest
$manifest = @{
    manifest = @{
        files = @{}
    }
}

$files.Keys | ForEach-Object {
    $manifest.manifest.files[$_] = @{
        hash = $files[$_].hash
        size = $files[$_].size
    }
}

$manifestJson = $manifest | ConvertTo-Json -Depth 10 -Compress
Write-Host "`n📦 Manifest: $($manifestJson.Length) chars" -ForegroundColor Cyan

# 構建 multipart body
$boundary = "----FormBoundary$(Get-Random)"
$writer = New-Object System.IO.StringWriter

# Manifest 部分
$writer.WriteLine("--$boundary")
$writer.WriteLine('Content-Disposition: form-data; name="manifest"')
$writer.WriteLine('Content-Type: application/json')
$writer.WriteLine()
$writer.WriteLine($manifestJson)

# 每個文件
$files.Keys | ForEach-Object {
    $writer.WriteLine("--$boundary")
    $writer.WriteLine("Content-Disposition: form-data; name=`"$_`"; filename=`"$_`"")
    $writer.WriteLine('Content-Type: application/octet-stream')
    $writer.WriteLine()
    $writer.Flush()
    
    # 寫入二進制內容（作為 base64 然後解碼）
    $base64 = [System.Convert]::ToBase64String($files[$_].content)
    $writer.WriteLine($base64)
}

$writer.WriteLine("--$boundary--")
$writer.Flush()

$bodyString = $writer.ToString()
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyString)

Write-Host "📦 Total body: $($bodyBytes.Length) bytes`n" -ForegroundColor Cyan

# 發送請求
$deployUrl = "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments"

try {
    Write-Host "🚀 Uploading..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $deployUrl -Method POST -Headers @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    } -Body $bodyBytes -TimeoutSec 120
    
    Write-Host "`n✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "   URL: $($response.result.url)" -ForegroundColor Cyan
    Write-Host "   ID: $($response.result.id)" -ForegroundColor Cyan
    Write-Host "`n⏳ Wait 30-60 seconds for CDN propagation" -ForegroundColor Yellow
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())" -ForegroundColor Red
        $reader.Close()
    }
}

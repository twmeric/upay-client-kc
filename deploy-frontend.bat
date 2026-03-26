@echo off
chcp 65001 >nul
echo ==========================================
echo 🌐 前端快速部署 (Admin Panel)
echo ==========================================
echo.

cd /d "%~dp0clients\kingchicken"

echo 🚀 正在部署到 Cloudflare Pages...
wrangler pages deploy . --project-name=easylink-client-kingchicken --branch=production

if %errorlevel% equ 0 (
    echo.
    echo ✅ 部署成功!
    echo 🔗 https://easylink-client-kingchicken.pages.dev/admin.html
) else (
    echo.
    echo ❌ 部署失败
)

pause

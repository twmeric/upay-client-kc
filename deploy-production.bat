@echo off
chcp 65001 >nul
echo ==========================================
echo 🚀 King-Chicken v2 生产环境部署脚本
echo ==========================================
echo.

:: 检查 Wrangler 是否安装
where wrangler >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Wrangler 未安装，正在安装...
    npm install -g wrangler
)

echo ✅ Wrangler 已安装
echo.

:: 检查登录状态
echo 🔑 检查 Cloudflare 登录状态...
wrangler whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未登录，请先运行: wrangler login
    pause
    exit /b 1
)

echo ✅ 已登录到 Cloudflare
echo.

:: 部署 Worker
echo 🚀 正在部署 Worker...
cd /d "%~dp0apps\worker"
wrangler deploy --env=production
if %errorlevel% neq 0 (
    echo ❌ Worker 部署失败
    pause
    exit /b 1
)
echo ✅ Worker 部署成功!
echo.

:: 部署 Pages (Admin Panel)
echo 🌐 正在部署 Admin Panel 到 Pages...
cd /d "%~dp0clients\kingchicken"
wrangler pages deploy . --project-name=easylink-client-kingchicken --branch=production
if %errorlevel% neq 0 (
    echo ❌ Pages 部署失败
    pause
    exit /b 1
)
echo ✅ Admin Panel 部署成功!
echo.

echo ==========================================
echo ✅ 所有部署完成!
echo ==========================================
echo.
echo 🔗 访问链接:
echo    - Worker API: https://easylink-api-v2.jimsbond007.workers.dev
echo    - Admin Panel: https://easylink-client-kingchicken.pages.dev/admin.html
echo    - Drivers Page: https://easylink-client-kingchicken.pages.dev/drivers.html
echo    - Custom Domain: https://king-chicken.jkdcoding.com/admin.html
echo.
pause

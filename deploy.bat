@echo off
chcp 65001 >nul
echo ============================================
echo EasyLink Payment Platform v2 - 部署腳本
echo ============================================
echo.

REM 檢查 Wrangler 是否安裝
where wrangler >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 未安裝 Wrangler，正在安裝...
    npm install -g wrangler
)

echo [1/6] 正在推送代碼到 GitHub...
git push origin master
if %errorlevel% neq 0 (
    echo [錯誤] Git 推送失敗
    pause
    exit /b 1
)

echo.
echo [2/6] 創建 D1 數據庫...
cd apps\worker
wrangler d1 create easylink-db-v2
if %errorlevel% neq 0 (
    echo [提示] 數據庫可能已存在，繼續執行...
)

echo.
echo [3/6] 請手動更新 wrangler.toml 中的 database_id
echo 上一步會輸出 database_id，請複製並更新到 wrangler.toml 中
echo 文件位置: apps\worker\wrangler.toml
echo.
pause

echo.
echo [4/6] 執行數據庫遷移...
wrangler d1 execute easylink-db-v2 --file=..\..\packages\database\migrations\001_saas_schema.sql
wrangler d1 execute easylink-db-v2 --file=..\..\packages\database\migrations\002_add_refund_table.sql

echo.
echo [5/6] 部署 Worker...
wrangler deploy

echo.
echo [6/6] 設置 Secrets...
echo 請執行以下命令設置 EasyLink 憑證：
echo   wrangler secret put EASYLINK_APP_ID
echo   wrangler secret put EASYLINK_APP_SECRET
echo.

cd ..\..
echo.
echo ============================================
echo 部署完成！下一步：
echo ============================================
echo 1. 記錄 Worker URL: https://easylink-api-v2.[your-account].workers.dev
echo 2. 更新 apps/web/*/index.html 中的 API_BASE
echo 3. 部署前端: wrangler pages deploy . --project-name=easylink-v2
echo.
pause

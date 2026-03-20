@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ================================================
echo   EasyLink Landing Page Deployer
echo ================================================
echo.

:: Configuration
set "PROJECT_NAME=easylink-landing"
set "DOMAIN=easylink.jkdcoding.com"
set "ZONE_ID=25a5e0bf54a3c4b2e1bc8b1c36b43be1"
set "API_TOKEN=wNu0gSgw3LLEERkKet9SB7qaut-dHLrb3EBX_XGr"
set "CF_PAGES_SUBDOMAIN=easylink-landing"

echo [1/4] Creating Pages project...

:: Step 1: Create the project (ignore error if exists)
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/25a5e0bf54a3c4b2e1bc8b1c36b43be1/pages/projects" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"%PROJECT_NAME%\",\"production_branch\":\"main\"}" >nul 2>&1

echo [2/4] Publishing to Cloudflare Pages...

:: Step 2: Use wrangler to deploy
:: First check if wrangler is installed
where wrangler >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Installing Wrangler...
    call npm install -g wrangler >nul 2>&1
)

:: Deploy using wrangler pages deploy
cd /d "%~dp0easylink-landing"
call wrangler pages deploy . --project-name=%PROJECT_NAME% --branch=main --commit-dirty=true

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Deployment failed. Please check your wrangler configuration.
    echo Make sure you're logged in with: wrangler login
    pause
    exit /b 1
)

echo.
echo [3/4] Getting Pages deployment URL...

:: Get the deployment URL
for /f "tokens=*" %%a in ('curl -s "https://api.cloudflare.com/client/v4/accounts/25a5e0bf54a3c4b2e1bc8b1c36b43be1/pages/projects/%PROJECT_NAME%/deployments" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -H "Content-Type: application/json" ^
  ^| findstr "url" ^| findstr /v "latest_deployment" ^| head -1') do (
    set "DEPLOY_URL=%%a"
)

echo Deployment URL: !DEPLOY_URL!
echo.
echo [4/4] Creating DNS record for %DOMAIN%...

:: Step 4: Create CNAME DNS record
for /f "tokens=*" %%a in ('curl -s -X POST "https://api.cloudflare.com/client/v4/zones/%ZONE_ID%/dns_records" ^
  -H "Authorization: Bearer %API_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"type\":\"CNAME\",\"name\":\"easylink\",\"content\":\"%PROJECT_NAME%.pages.dev\",\"ttl\":1,\"proxied\":true}" ^
  ^| findstr "\"success\":true"') do (
    echo DNS record created successfully!
    goto :dns_success
)

:: Check if record already exists
for /f "tokens=*" %%a in ('curl -s "https://api.cloudflare.com/client/v4/zones/%ZONE_ID%/dns_records?type=CNAME&name=easylink.jkdcoding.com" ^
  -H "Authorization: Bearer %API_TOKEN%" ^| findstr "count.*0"') do (
    echo DNS record may already exist or failed to create.
    echo Please check manually at: https://dash.cloudflare.com
)

:dns_success
echo.
echo ================================================
echo   Deployment Complete!
echo ================================================
echo.
echo Website URL: https://%DOMAIN%
echo (DNS propagation may take a few minutes)
echo.
echo Temporary URL: https://%PROJECT_NAME%.pages.dev
echo.
pause

@echo off
chcp 65001 >nul
title King-Chicken 全自动测试系统

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║          King-Chicken 自动化测试与自我修复系统               ║
echo ║                     母机团队协作版                            ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

:: 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 请先安装 Node.js
    pause
    exit /b 1
)

:: 显示菜单
:menu
echo.
echo ==================== 测试选项 ====================
echo.
echo  [1] 支付保护测试 (每次部署前必做)
echo  [2] 完整 CI/CD 测试 (包含所有 API)
echo  [3] 启动持续监控模式 (每5分钟检查)
echo  [4] 安全部署 (带自动验证)
echo  [5] 单次健康检查
echo  [6] 查看测试报告
echo  [7] 退出
echo.
echo ==================================================
echo.

set /p choice=请选择 (1-7): 

if "%choice%"=="1" goto payment_test
if "%choice%"=="2" goto ci_test
if "%choice%"=="3" goto monitor
if "%choice%"=="4" goto deploy
if "%choice%"=="5" goto health_check
if "%choice%"=="6" goto view_report
if "%choice%"=="7" exit /b 0

goto menu

:payment_test
cls
echo.
echo ========== 支付功能保护测试 ==========
echo 此测试确保客户收款功能不受影响
echo.
node payment-protection-test.js
echo.
if %errorlevel% neq 0 (
    echo [警告] 支付功能测试失败！不要部署！
) else (
    echo [成功] 支付功能正常，可以安全部署
)
pause
goto menu

:ci_test
cls
echo.
echo ========== 完整 CI/CD 测试 ==========
echo 运行所有测试套件...
echo.
powershell -ExecutionPolicy Bypass -File "ci-test-runner.ps1"
echo.
pause
goto menu

:monitor
cls
echo.
echo ========== 启动持续监控 ==========
echo 按 Ctrl+C 停止监控
echo.
node self-healing-monitor.js --fix
goto menu

:deploy
cls
echo.
echo ========== 安全部署 ==========
echo 此流程会自动验证支付功能后部署
echo.
powershell -ExecutionPolicy Bypass -File "safe-deploy.ps1"
echo.
pause
goto menu

:health_check
cls
echo.
echo ========== 单次健康检查 ==========
echo.
node self-healing-monitor.js --once --fix
echo.
pause
goto menu

:view_report
echo.
echo 可用的报告文件:
if exist health-report.json echo  - health-report.json (健康状态)
if exist payment-protection-report.json echo  - payment-protection-report.json (支付测试)
if exist ci-test-report.json echo  - ci-test-report.json (CI/CD测试)
if exist deploy-report.json echo  - deploy-report.json (部署报告)
if exist self-healing.log echo  - self-healing.log (监控日志)
echo.
pause
goto menu

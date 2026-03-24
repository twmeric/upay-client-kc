@echo off
chcp 65001 >nul
title King-Chicken 进化版测试系统

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     King-Chicken 自我修复系统 - 第一性原理版本               ║
echo ║              进化成功！准备就绪                               ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

:: 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 请先安装 Node.js
    pause
    exit /b 1
)

:menu
echo.
echo ==================== 进化版测试选项 ====================
echo.
echo  [1] 第一性原理测试 (端到端验证)
echo  [2] 启动进化版监控 (持续监控)
echo  [3] 单次健康检查
echo  [4] 查看测试报告
echo  [5] 退出
echo.
echo =========================================================
echo.

set /p choice=请选择 (1-5): 

if "%choice%"=="1" goto first_principles
if "%choice%"=="2" goto monitor
if "%choice%"=="3" goto health_check
if "%choice%"=="4" goto view_report
if "%choice%"=="5" exit /b 0

goto menu

:first_principles
cls
echo.
echo ========== 第一性原理测试 ==========
echo 验证业务逻辑正确性，不只是API存在性
echo.
node first-principles-test.js
echo.
if %errorlevel% neq 0 (
    echo [警告] 测试发现问题！
) else (
    echo [成功] 所有测试通过！系统健康
)
pause
goto menu

:monitor
cls
echo.
echo ========== 启动进化版监控 ==========
echo 按 Ctrl+C 停止监控
echo.
node self-healing-monitor-v2.js --fix
goto menu

:health_check
cls
echo.
echo ========== 单次健康检查 ==========
echo.
node self-healing-monitor-v2.js --once
echo.
pause
goto menu

:view_report
echo.
echo 可用的报告文件:
if exist health-report-v2.json echo  - health-report-v2.json (最新健康状态)
if exist self-healing-v2.log echo  - self-healing-v2.log (监控日志)
if exist EVOLUTION_REPORT.md echo  - EVOLUTION_REPORT.md (进化报告)
echo.
pause
goto menu

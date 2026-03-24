@echo off
chcp 65001 >nul
title King-Chicken 系统健康检查

echo ========================================
echo King-Chicken 系统健康检查
echo ========================================
echo.

:: 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，正在使用 PowerShell 模式...
    powershell -ExecutionPolicy Bypass -File "king-chicken-health-monitor.ps1" -AutoFix
    goto :end
)

:: 使用 Node.js 版本 (推荐)
echo 使用 Node.js 监控模式 (推荐)
echo.

if "%1"=="--watch" (
    echo 启动持续监控模式 (每5分钟检查一次)
    echo 按 Ctrl+C 停止
    echo.
    node self-healing-monitor.js --fix
) else if "%1"=="--once" (
    echo 运行单次检查...
    node self-healing-monitor.js --once --fix
) else if "%1"=="--silent" (
    echo 运行静默检查...
    node self-healing-monitor.js --once --fix --silent
) else (
    echo 用法:
    echo   run-health-check.bat --once    - 运行单次检查
    echo   run-health-check.bat --watch   - 持续监控模式
    echo   run-health-check.bat --silent  - 静默模式
    echo.
    echo 默认运行单次检查...
    echo.
    node self-healing-monitor.js --once --fix
)

:end
echo.
echo 检查完成！
if exist health-report.json (
    echo 详细报告已保存到: health-report.json
)
if exist self-healing.log (
    echo 日志文件: self-healing.log
)
echo.
pause

@echo off
title Payroll Pro Desktop Runner
cd /d "%~dp0"
echo ====================================================
echo        Starting Payroll Pro Standalone Engine
echo ====================================================
echo.
echo Launching local server on http://localhost:5174 ...
start "" "http://localhost:5174"
npm run dev
pause

@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."

powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%build-local-release.ps1"
if errorlevel 1 (
    echo.
    echo Build failed. Review the output above.
    exit /b %errorlevel%
)

exit /b 0

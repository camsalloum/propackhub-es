@echo off
setlocal EnableExtensions
title Estimation Studio - START SERVERS

REM Always run from this script's folder (double-click safe)
cd /d "%~dp0"

cls
echo ====================================
echo    ESTIMATION STUDIO
echo    Start Servers
echo ====================================
echo.

REM [1/4] Kill anything listening on ES dev ports (5000=web, 5001=api, 5002=stale api)
echo [1/4] Stopping old servers on ports 5000, 5001, 5002...
call "%~dp0scripts\kill-es-ports.bat"
timeout /t 2 /nobreak >nul
echo   Done.
echo.

REM [2/4] Dependencies (first run only)
if not exist "node_modules" (
    echo [2/4] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed. Check Node.js 22+.
        pause
        exit /b 1
    )
    echo.
) else (
    echo [2/4] Dependencies OK.
    echo.
)

REM [3/4] Apply idempotent DB patches (platform master tables, etc.)
echo [3/4] Applying database patches...
call npm run db:patch --workspace=packages/server
if errorlevel 1 (
    echo WARNING: db:patch failed. Is PostgreSQL running? Check packages\server\.env
    echo Continuing anyway — API may fail if DATABASE_URL is wrong.
    echo.
) else (
    echo   Done.
    echo.
)

echo [4/4] Starting servers...
echo.
echo   Web App:  http://localhost:5000
echo   API:      http://localhost:5001/health
echo   Login:    admin@propackhub.com / Pph654883!
echo   Master Data nav appears for platform_admin after login.
echo.
echo Press Ctrl+C to stop both servers.
echo.

REM Open browser after API has a moment to bind
start /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:5000"

call npm run start:servers

echo.
echo Servers stopped.
pause
endlocal

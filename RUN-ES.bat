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



REM [1/5] Kill anything listening on ES dev ports (5000=web, 5001=api, 5002=stale api)

echo [1/5] Stopping old servers on ports 5000, 5001, 5002...

call "%~dp0scripts\kill-es-ports.bat"

timeout /t 2 /nobreak >nul

echo   Done.

echo.



REM [2/5] Dependencies (first run only)

if not exist "node_modules" (

    echo [2/5] Installing dependencies...

    call npm install

    if errorlevel 1 (

        echo ERROR: npm install failed. Check Node.js 22+.

        pause

        exit /b 1

    )

    echo.

) else (

    echo [2/5] Dependencies OK.

    echo.

)



REM [3/5] Build costing engine (dist/ is not committed)

echo [3/5] Building @es/engine...

call npm run build --workspace=packages/engine

if errorlevel 1 (

    echo ERROR: engine build failed.

    pause

    exit /b 1

)

echo   Done.

echo.



REM [4/5] Apply idempotent DB patches (platform master tables, etc.)

echo [4/5] Applying database patches...

call npm run db:patch --workspace=packages/server

if errorlevel 1 (

    echo WARNING: db:patch failed. Is PostgreSQL running? Check packages\server\.env

    echo Continuing anyway — API may fail if DATABASE_URL is wrong.

    echo.

) else (

    echo   Done.

    echo.

)



echo [5/5] Starting servers...

echo.

echo   Web App:  http://localhost:5000

echo   API:      http://localhost:5001/health

echo   Login (owner):  admin@propackhub.com / Pph654883!

echo   Login (IP):     camille@interplast-uae.com / Admin@123

echo   Provision IP:   npm run db:provision-interplast --workspace=packages/server

echo   Master Data nav appears for platform_admin after login.

echo.

echo Press Ctrl+C to stop both servers.

echo.



REM Free ports again (covers stale node from another terminal during build/patch)

call "%~dp0scripts\kill-es-ports.bat"



REM Open browser only after /health responds (runs in background while servers start)

start /b "" "%~dp0scripts\wait-and-open-browser.bat"



call npm run start:servers:dev



echo.

echo Servers stopped.

pause

endlocal


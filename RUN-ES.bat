@echo off
title Estimation Studio - START SERVERS
cls
echo ====================================
echo    ESTIMATION STUDIO
echo    Start Servers
echo ====================================
echo.

REM Install if needed (first time only)
if not exist "node_modules" (
    echo [1/2] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install. Check Node.js.
        pause
        exit /b 1
    )
    echo.
)

echo [2/2] Starting servers...
echo.
echo   Web App: http://localhost:5000
echo   API:     http://localhost:5001
echo.
echo Press Ctrl+C to stop servers
echo.

REM Open browser after 3 seconds
start /b cmd /c "timeout /t 3 /nobreak > nul && start http://localhost:5000"

REM Start both servers
call npm run start:servers

echo.
echo Servers stopped.
pause
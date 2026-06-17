@echo off
title Estimation Studio - START SERVERS
cls
echo ====================================
echo    ESTIMATION STUDIO
echo    Start Servers
echo ====================================
echo.

REM Kill any existing servers on ports 5000 and 5001
echo [1/3] Killing existing servers...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5001 .*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000 .*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo   Done.
echo.

REM Install if needed (first time only)
if not exist "node_modules" (
    echo [2/3] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install. Check Node.js.
        pause
        exit /b 1
    )
    echo.
)

echo [3/3] Starting servers...
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
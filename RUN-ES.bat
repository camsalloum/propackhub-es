@echo off
title ProPackHub Estimation Studio
echo Starting ProPackHub Estimation Studio...
echo.

REM Install if needed
if not exist "node_modules" (
    echo Installing dependencies... (first time only)
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to install dependencies. Check Node.js installation.
        pause
        exit /b 1
    )
)

echo Starting servers...
echo Web App: http://localhost:5000
echo API: http://localhost:5001
echo.

REM Open browser after short delay
start /b cmd /c "timeout /t 3 /nobreak > nul && start http://localhost:5000"

REM Start servers
call npm run start:servers

echo.
echo Servers stopped.
pause
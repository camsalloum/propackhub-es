@echo off
echo ========================================
echo  Starting ProPackHub Estimation Studio
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js 22 or later from https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH.
    pause
    exit /b 1
)

echo Checking dependencies...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies.
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed.
)

echo.
echo ========================================
echo Starting Development Servers...
echo ========================================
echo.
echo Web App:    http://localhost:5000
echo API Server: http://localhost:5001
echo.
echo Press Ctrl+C in this window to stop both servers.
echo.

REM Start both servers using concurrently
echo Starting both servers...
call npx concurrently "npm run dev:server" "npm run dev:web"

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start servers.
    echo.
    echo Troubleshooting:
    echo 1. Make sure dependencies are installed: npm install
    echo 2. Check if ports 5000 and 5001 are available
    echo 3. Try running commands manually:
    echo    - API: npm run dev:server
    echo    - Web: npm run dev:web
    pause
)

pause
# PowerShell script to start ProPackHub Estimation Studio
# Run this script by right-clicking and selecting "Run with PowerShell"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting ProPackHub Estimation Studio " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "ERROR: Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js 22 or later from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

# Check Node.js version
$nodeVersion = node --version
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green

# Check if npm is installed
$npmCheck = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCheck) {
    Write-Host "ERROR: npm is not installed or not in PATH." -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Yellow

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies." -ForegroundColor Red
        pause
        exit 1
    }
} else {
    Write-Host "Dependencies already installed." -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting Development Servers... " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Web App:    http://localhost:5000" -ForegroundColor Green
Write-Host "API Server: http://localhost:5001" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C in this window to stop both servers." -ForegroundColor Yellow
Write-Host ""

# Start both servers
Write-Host "Starting both servers..." -ForegroundColor Yellow
npm run start:servers

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to start servers." -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure dependencies are installed: npm install"
    Write-Host "2. Check if ports 5000 and 5001 are available"
    Write-Host "3. Try running commands manually:"
    Write-Host "   - API: npm run dev:server"
    Write-Host "   - Web: npm run dev:web"
    Write-Host ""
    pause
}

Write-Host ""
Write-Host "Servers stopped." -ForegroundColor Yellow
pause
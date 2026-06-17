@echo off
title Estimation Studio - SAVE TO GITHUB
cls
echo ====================================
echo    ESTIMATION STUDIO
echo    Save to GitHub
echo ====================================
echo.

cd /d "%~dp0"

REM Check git status
git status --short
if %errorlevel% neq 0 (
    echo ERROR: Not a git repository
    pause
    exit /b 1
)

echo.
echo [1/3] Staging files...
git add .

echo [2/3] Committing...
git commit -m "Auto-save"
if %errorlevel% neq 0 (
    echo WARNING: Nothing to commit or commit failed
)

echo [3/3] Pushing to GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo WARNING: Push failed
    echo Try running: git push origin main
)

echo.
echo Done.
pause

echo.
echo ====================================
echo   SUCCESS!
echo   https://github.com/camsalloum/propackhub-es
echo ====================================
echo.
pause

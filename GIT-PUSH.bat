@echo off
title Git Push - Estimation Studio
echo ====================================
echo Git Push to GitHub
echo ====================================
echo.

echo Fetching from remote...
git fetch origin

echo.
echo Current branch:
git branch --show-current

echo.
echo Pushing to GitHub...
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Push failed
    echo.
    echo Common issues:
    echo - You may need to authenticate with GitHub
    echo - Branch might not be 'main' (check above)
    echo - Use: git push -u origin [your-branch-name]
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Pushed to GitHub successfully!
echo.
echo Repository: https://github.com/camsalloum/propackhub-es.git
echo.
pause

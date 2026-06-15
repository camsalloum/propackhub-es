@echo off
title Quick Save to GitHub - Estimation Studio
echo ====================================
echo Quick Save to GitHub
echo ====================================
echo.

REM Check if there are changes
git status --short
if %errorlevel% neq 0 (
    echo ERROR: Not a git repository
    pause
    exit /b 1
)

echo.
set /p message="Enter commit message: "

if "%message%"=="" (
    echo ERROR: Commit message cannot be empty
    pause
    exit /b 1
)

echo.
echo [1/3] Staging changes...
git add .

echo.
echo [2/3] Committing...
git commit -m "%message%"

if %errorlevel% neq 0 (
    echo ERROR: Commit failed
    pause
    exit /b 1
)

echo.
echo [3/3] Pushing to GitHub...
git push -u origin main

if %errorlevel% neq 0 (
    echo WARNING: Push failed, but commit was successful locally
    echo Run GIT-PUSH.bat to retry pushing
    pause
    exit /b 1
)

echo.
echo ✅ All changes saved to GitHub!
echo.
echo Repository: https://github.com/camsalloum/propackhub-es.git
echo.
pause

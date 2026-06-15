@echo off
title Git Commit - Estimation Studio
echo ====================================
echo Git Commit - Estimation Studio
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
echo Staging all changes...
git add .

echo.
echo Committing...
git commit -m "%message%"

if %errorlevel% neq 0 (
    echo ERROR: Commit failed
    pause
    exit /b 1
)

echo.
echo ✅ Commit successful!
echo.
echo Run GIT-PUSH.bat to push to GitHub
echo.
pause

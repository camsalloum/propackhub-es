@echo off
title Git Status - Estimation Studio
echo ====================================
echo Git Status
echo ====================================
echo.

echo Repository: https://github.com/camsalloum/propackhub-es.git
echo.

echo Current branch:
git branch --show-current
echo.

echo Status:
git status
echo.

echo Recent commits:
git log --oneline -5
echo.

pause

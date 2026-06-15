@echo off
title Setup Estimation Studio Database
echo ====================================
echo Estimation Studio - Database Setup
echo ====================================
echo.
echo This will:
echo 1. Create database: estimation_studio
echo 2. Create user: es_user
echo 3. Initialize schema with Drizzle
echo.
echo You will be prompted for the PostgreSQL admin password.
echo.
pause

echo.
echo Step 1: Creating database and user...
psql -U postgres -f setup-db.sql

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to create database.
    echo Make sure PostgreSQL is running and you entered the correct password.
    pause
    exit /b 1
)

echo.
echo Step 2: Initializing schema...
cd packages\server
call npm run db:push

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to initialize schema.
    echo Check the error messages above.
    cd ..\..
    pause
    exit /b 1
)

cd ..\..

echo.
echo ====================================
echo SUCCESS! Database is ready.
echo ====================================
echo.
echo You can now start the servers with RUN-ES.bat
echo.
pause

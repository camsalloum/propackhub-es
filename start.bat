@echo off
echo Starting ProPackHub Estimation Studio...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo Starting servers...
echo Web: http://localhost:5000
echo API: http://localhost:5001
echo.
echo Press Ctrl+C to stop

REM Start servers
call npm run start:servers

pause
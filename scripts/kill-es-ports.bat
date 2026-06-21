@echo off
setlocal EnableExtensions
REM Kill processes listening on Estimation Studio dev ports (5000=web, 5001=api, 5002=stale)

call :kill_ports
ping -n 2 127.0.0.1 >nul
call :kill_ports
exit /b 0

:kill_ports
for %%P in (5000 5001 5002) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr /C:":%%P " ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
  )
)
exit /b 0

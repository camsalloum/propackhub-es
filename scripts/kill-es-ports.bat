@echo off
REM Kill processes listening on Estimation Studio dev ports
for %%P in (5000 5001 5002) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%P" ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
  )
)

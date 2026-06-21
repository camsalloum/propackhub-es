@echo off
setlocal EnableExtensions
REM Poll http://localhost:5001/health until API responds or timeout (seconds via arg 1, default 90)

set "MAX=%~1"
if "%MAX%"=="" set "MAX=90"

echo   Waiting for API http://localhost:5001/health ...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$max=%MAX%; for ($i = 1; $i -le $max; $i++) { try { $r = Invoke-WebRequest -Uri 'http://localhost:5001/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) { Write-Host '  API ready.'; exit 0 } } catch {} ; if ($i %% 10 -eq 0) { Write-Host ('  Still waiting... ({0}s)' -f $i) }; Start-Sleep -Seconds 1 }; Write-Host '  WARNING: API not ready yet — refresh the browser in a few seconds.'; exit 1"

exit /b %ERRORLEVEL%

@echo off
setlocal EnableExtensions
REM Force-kill listeners on Estimation Studio dev ports (5000=web, 5001=api, 5002=stale)
REM Uses PowerShell Get-NetTCPConnection for reliable IPv4/IPv6 detection.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports=@(5000,5001,5002); for($pass=1; $pass -le 3; $pass++){ " ^
  "  $pids = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort } | Select-Object -ExpandProperty OwningProcess -Unique); " ^
  "  if($pids.Count -eq 0){ exit 0 }; " ^
  "  foreach($listenerPid in $pids){ try{ Stop-Process -Id $listenerPid -Force -ErrorAction Stop } catch{}; cmd /c ('taskkill /F /T /PID ' + $listenerPid + ' >nul 2>&1') | Out-Null }; " ^
  "  Start-Sleep -Milliseconds 400 " ^
  "}; exit 0"

exit /b 0

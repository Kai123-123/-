@echo off
setlocal
cd /d "%~dp0"
title Stop Quantum Tunneling Platform

powershell -NoProfile -Command "$connections=Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue; if (-not $connections) { Write-Host 'Platform service is not running.'; exit 3 }; $stopped=$false; foreach ($connection in $connections) { $process=Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue; if ($process -and $process.ProcessName -eq 'node') { Stop-Process -Id $process.Id -Force; $stopped=$true } }; if ($stopped) { Write-Host 'Quantum tunneling platform stopped.'; exit 0 } else { Write-Host 'Port 3001 is used by another program. Nothing was stopped.'; exit 2 }"
if errorlevel 3 (
  powershell -NoProfile -Command "Start-Sleep -Seconds 2"
  exit /b 0
)
if errorlevel 2 (
  pause
  exit /b 1
)

powershell -NoProfile -Command "Start-Sleep -Seconds 2"
exit /b 0

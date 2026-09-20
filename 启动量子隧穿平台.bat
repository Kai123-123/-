@echo off
setlocal
cd /d "%~dp0"
title Quantum Tunneling Platform

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  pause
  exit /b 1
)

if not exist "logs" mkdir "logs"

if not exist "dist\index.html" (
  echo Building platform files...
  call npm run build
  if errorlevel 1 (
    echo [ERROR] Platform build failed.
    pause
    exit /b 1
  )
)

powershell -NoProfile -Command "if (Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
  echo Platform service is already running.
  if /I not "%QT_NO_BROWSER%"=="1" start "" "http://127.0.0.1:3001"
  exit /b 0
)

echo Starting quantum tunneling platform...
powershell -NoProfile -Command "$node=(Get-Command node).Source; Start-Process -FilePath $node -ArgumentList 'server.cjs' -WorkingDirectory '%CD%' -WindowStyle Hidden -RedirectStandardOutput '%CD%\logs\server.out' -RedirectStandardError '%CD%\logs\server.err'"
if errorlevel 1 (
  echo [ERROR] Backend startup failed. Check logs\server.err.
  pause
  exit /b 1
)

powershell -NoProfile -Command "Start-Sleep -Seconds 3"
if /I not "%QT_NO_BROWSER%"=="1" start "" "http://127.0.0.1:3001"
echo Platform: http://127.0.0.1:3001
exit /b 0

@echo off
setlocal EnableExtensions
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Run install-windows.bat first.
  pause
  exit /b 1
)

if exist node_modules\.bin\next.cmd goto deps_ready
echo Dependencies are missing or incomplete. Installing now...
call npm install
if errorlevel 1 (
  echo Dependency installation failed.
  pause
  exit /b 1
)
:deps_ready

set "SUBFLOW_URL=http://127.0.0.1:3100"
echo Starting SubFlow at %SUBFLOW_URL%
start "" /min powershell -NoProfile -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:3100'"
call npm run dev -- --hostname 127.0.0.1 --port 3100
pause

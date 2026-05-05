@echo off
setlocal EnableExtensions

cd /d "%~dp0"

set "SUBFLOW_TARGET=%CD%\start.bat"
set "SUBFLOW_WORKDIR=%CD%"
set "SUBFLOW_ICON=%CD%\public\subflow.ico"

if not exist "%SUBFLOW_TARGET%" (
  echo start.bat was not found. Run install-windows.bat first.
  pause
  exit /b 1
)

if not exist "%SUBFLOW_ICON%" (
  echo SubFlow icon was not found at %SUBFLOW_ICON%.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop = [Environment]::GetFolderPath('Desktop'); $shortcutPath = Join-Path $desktop 'Sub Flow.lnk'; $shell = New-Object -ComObject WScript.Shell; $shortcut = $shell.CreateShortcut($shortcutPath); $shortcut.TargetPath = $env:SUBFLOW_TARGET; $shortcut.WorkingDirectory = $env:SUBFLOW_WORKDIR; $shortcut.IconLocation = $env:SUBFLOW_ICON; $shortcut.Description = 'Start SubFlow'; $shortcut.Save(); Write-Host ('Created desktop shortcut: ' + $shortcutPath)"
if errorlevel 1 (
  echo Could not create the desktop shortcut.
  pause
  exit /b 1
)

echo.
echo Done. You can start SubFlow from the "Sub Flow" desktop shortcut.
echo.
pause
exit /b 0

@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo.
echo ========================================
echo  SubFlow Windows installer
echo ========================================
echo.

call :ensure_node
if errorlevel 1 goto fail

call :install_dependencies
if errorlevel 1 goto fail

call :write_start_script
if errorlevel 1 goto fail

call :write_desktop_shortcut
if errorlevel 1 goto fail

echo.
echo Done. You can now double-click the "Sub Flow" desktop shortcut or start.bat to run SubFlow.
echo.
pause
exit /b 0

:ensure_node
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  call :install_node_windows
  if errorlevel 1 exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please install Node.js LTS from https://nodejs.org/
  exit /b 1
)

for /f "delims=" %%v in ('node -p "parseInt(process.versions.node.split('.')[0], 10)"') do set NODE_MAJOR=%%v
if "%NODE_MAJOR%"=="" (
  echo Could not detect Node.js version.
  exit /b 1
)

if %NODE_MAJOR% LSS 18 (
  echo Node.js 18 or newer is required. Current version:
  node -v
  call :install_node_windows
  if errorlevel 1 exit /b 1
)

echo Node:
node -v
echo npm:
call npm -v
exit /b 0

:install_node_windows
where winget >nul 2>nul
if errorlevel 1 (
  echo.
  echo Please install Node.js LTS from https://nodejs.org/ and run this installer again.
  exit /b 1
)

echo Installing or upgrading Node.js LTS with winget...
winget install --id OpenJS.NodeJS.LTS -e --source winget
if errorlevel 1 (
  echo winget could not install Node.js automatically.
  echo Please install Node.js LTS from https://nodejs.org/ and run this installer again.
  exit /b 1
)

set "PATH=%ProgramFiles%\nodejs;%PATH%"
exit /b 0

:install_dependencies
echo.
if exist node_modules\.bin\next.cmd (
  echo SubFlow dependencies are already installed.
  exit /b 0
)

echo Installing or repairing SubFlow dependencies...
call npm install
if errorlevel 1 (
  echo Dependency installation failed.
  exit /b 1
)
exit /b 0

:write_start_script
echo.
echo Creating start.bat...
(
  echo @echo off
  echo setlocal EnableExtensions
  echo cd /d "%%~dp0"
  echo.
  echo where npm ^>nul 2^>nul
  echo if errorlevel 1 ^(
  echo   echo npm was not found. Run install-windows.bat first.
  echo   pause
  echo   exit /b 1
  echo ^)
  echo.
  echo if exist node_modules\.bin\next.cmd goto deps_ready
  echo echo Dependencies are missing or incomplete. Installing now...
  echo call npm install
  echo if errorlevel 1 ^(
  echo   echo Dependency installation failed.
  echo   pause
  echo   exit /b 1
  echo ^)
  echo :deps_ready
  echo.
  echo set "SUBFLOW_URL=http://127.0.0.1:3100"
  echo echo Starting SubFlow at %%SUBFLOW_URL%%
  echo start "" /min powershell -NoProfile -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:3100'"
  echo call npm run dev -- --hostname 127.0.0.1 --port 3100
  echo pause
) > start.bat

exit /b 0

:write_desktop_shortcut
echo.
echo Creating Sub Flow desktop shortcut...
if not exist public\subflow.ico (
  echo SubFlow icon was not found at public\subflow.ico.
  exit /b 1
)
if not exist start.bat (
  echo start.bat was not found.
  exit /b 1
)

set "SUBFLOW_TARGET=%CD%\start.bat"
set "SUBFLOW_WORKDIR=%CD%"
set "SUBFLOW_ICON=%CD%\public\subflow.ico"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop = [Environment]::GetFolderPath('Desktop'); $shortcutPath = Join-Path $desktop 'Sub Flow.lnk'; $shell = New-Object -ComObject WScript.Shell; $shortcut = $shell.CreateShortcut($shortcutPath); $shortcut.TargetPath = $env:SUBFLOW_TARGET; $shortcut.WorkingDirectory = $env:SUBFLOW_WORKDIR; $shortcut.IconLocation = $env:SUBFLOW_ICON; $shortcut.Description = 'Start SubFlow'; $shortcut.Save(); Write-Host ('Created desktop shortcut: ' + $shortcutPath)"
if errorlevel 1 exit /b 1
exit /b 0

:fail
echo.
echo Installation failed.
echo.
pause
exit /b 1

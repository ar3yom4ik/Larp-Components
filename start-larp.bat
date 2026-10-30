@echo off
setlocal EnableExtensions
chcp 65001 >nul

rem ---------------------------------------------------------------------
rem  Larp Components 5.1 - one-click setup and launch for Windows
rem  First run: installs npm dependencies, then starts the app.
rem  Later runs: immediately starts the app.
rem  Optional: "start-larp.bat --production" builds and serves the bundle.
rem ---------------------------------------------------------------------

set "PORT=5173"
set "URL=http://localhost:%PORT%/"
set "APPDIR=%~dp0"
cd /d "%APPDIR%"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [LARP] Node.js was not found on PATH.
  echo        Install the Node.js LTS build from https://nodejs.org/ and run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo.
  echo [LARP] package.json is missing. Place start-larp.bat in the Larp Components folder.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo [LARP] First run detected. Installing dependencies, please wait...
  echo.
  call npm ci
  if errorlevel 1 (
    echo.
    echo [LARP] npm ci failed. Check your connection and try again.
    echo.
    pause
    exit /b 1
  )
) else (
  echo.
  echo [LARP] Setup already complete. Starting Larp Components...
  echo.
)

if /I "%1"=="--production" goto :production

echo [LARP] Serving on %URL%
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start "" "%URL%""
call npm run dev -- --host 127.0.0.1 --port %PORT% --strictPort
if errorlevel 1 (
  echo.
  echo [LARP] Port %PORT% is busy. Trying port 5174...
  echo [LARP] Serving on http://localhost:5174/
  start "" /b cmd /c "timeout /t 3 /nobreak >nul & start "" "http://localhost:5174/""
  call npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
)
goto :done

:production
echo [LARP] Building the production bundle...
call npm run build
if errorlevel 1 (
  echo.
  echo [LARP] Build failed.
  echo.
  pause
  exit /b 1
)
echo [LARP] Serving the production build on %URL%
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start "" "%URL%""
call npm run preview -- --host 127.0.0.1 --port %PORT% --strictPort

:done
endlocal

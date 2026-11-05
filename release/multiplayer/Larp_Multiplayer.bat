@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 20.19 or newer is required. Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)
if not exist "Larp_Factory_V3.html" (
  echo Larp_Factory_V3.html is missing. Extract all files from Larp_Multiplayer.zip together.
  pause
  exit /b 1
)
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" "http://localhost:4174/""
node Larp_Multiplayer.cjs --html Larp_Factory_V3.html
pause

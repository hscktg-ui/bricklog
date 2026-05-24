@echo off
title BRICLOG Launch
cd /d "%~dp0"
echo.
echo  [1/3] Production build...
call npm run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
echo.
echo  [2/3] Prelaunch checks...
call npm run prelaunch
if errorlevel 1 (
  echo Some checks failed — review output above.
  pause
  exit /b 1
)
echo.
echo  [3/3] Starting server on http://localhost:3005
echo  Press Ctrl+C to stop.
echo.
call npm run start:3005

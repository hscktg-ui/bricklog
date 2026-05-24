@echo off
title BRICLOG Setup
cd /d "%~dp0"
echo.
echo  처음 한 번만 실행하세요 (빌드 1~3분)
echo.
call npm run setup:local
echo.
echo  완료 후 START.bat 을 더블클릭하세요.
pause

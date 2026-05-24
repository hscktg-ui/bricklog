@echo off
title BRICLOG Server
cd /d "%~dp0"
echo.
echo  BRICLOG 서버를 켭니다 (포트 3005)
echo  브라우저: http://localhost:3005
echo  끄려면 이 창에서 Ctrl+C
echo.
npm run start:3005
pause

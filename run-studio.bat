@echo off
title RTFX Studio - Art & Media Manager
cd /d "%~dp0"
echo ========================================================
echo   Starting RTFX Studio Dashboard...
echo ========================================================
start http://localhost:3000
npm run studio
pause

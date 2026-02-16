@echo off
echo ============================================
echo   Starting Backend Server
echo ============================================
echo.
cd /d "%~dp0"
node backend/server.js
pause

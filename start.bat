@echo off
title NIT Jalandhar Energy Trading System
cd /d "%~dp0"

echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║     NIT JALANDHAR - CAMPUS ENERGY TRADE SYSTEM                    ║
echo ║     Startup Script                                                ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.

:: Kill any existing node processes on port 8545 and 3000
echo [1/4] Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8545 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
timeout /t 2 /nobreak >nul

:: Start Hardhat node in a new window
echo [2/4] Starting Hardhat Blockchain Node...
start "Hardhat Node" cmd /k "cd /d %~dp0 && npx hardhat node"
timeout /t 5 /nobreak >nul

:: Deploy contract
echo [3/4] Deploying Smart Contract...
call npx hardhat run scripts/deploy.js --network localhost
if errorlevel 1 (
    echo Deployment failed! Please check the Hardhat node.
    pause
    exit /b 1
)

:: Start backend server
echo [4/4] Starting Backend Server...
start "Energy Server" cmd /k "cd /d %~dp0 && node backend/server.js"
timeout /t 3 /nobreak >nul

echo.
echo ════════════════════════════════════════════════════════════════════
echo ✅ System Started Successfully!
echo.
echo    Dashboard: http://localhost:3000
echo    Blockchain: http://localhost:8545
echo.
echo    To run demo: node scripts/demo.js
echo ════════════════════════════════════════════════════════════════════
echo.
pause

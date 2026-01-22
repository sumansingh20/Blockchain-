@echo off
echo ============================================
echo   Deploying Smart Contract
echo ============================================
echo.
cd /d "%~dp0"
timeout /t 3 /nobreak > nul
npx hardhat run scripts/deploy.js --network localhost
pause

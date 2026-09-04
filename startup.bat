@echo off
chcp 65001 >nul
title Mini Chat Bot (Port 7002)

echo ===================================================
echo           Mini Chat Bot Launcher
echo   Model Context Protocol (MCP) + React 19 + Vite 8
echo ===================================================
echo.

cd /d "%~dp0"

:: 1. Check if node_modules exists in root
if not exist "node_modules\" (
    echo [Setup] Installing root dependencies...
    call npm install
)

:: 2. Check if frontend dist exists, build if missing
if not exist "frontend\dist\index.html" (
    echo [Build] Building frontend production bundle...
    cd frontend
    if not exist "node_modules\" (
        call npm install
    )
    call npm run build
    cd ..
)

:: 3. Clean up any existing process holding Port 7002
echo [Port Check] Ensuring Port 7002 is free...
powershell -NoProfile -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 7002 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue"

:: 4. Launch browser automatically in background after 2 seconds
start /min powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:7002'"

:: 5. Start Backend Server
echo.
echo [Running] Starting Mini Chat Bot on http://localhost:7002 ...
echo [Tip] Press Ctrl+C in this terminal window to stop the server.
echo.

call npx tsx src/server.ts

pause

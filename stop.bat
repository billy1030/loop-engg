@echo off
chcp 65001 >nul
title Stop MiniBot (Port 7009)

echo ===================================================
echo             Stopping MiniBot Services
echo ===================================================
echo.

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1"

echo.
echo ===================================================
echo                 Done!
echo ===================================================
echo.
pause

@echo off
chcp 65001 >nul
title MiniBot - Tauri Compiler and Deployer

echo ===================================================
echo       MiniBot Tauri Compiler and Auto-Deployer
echo ===================================================
echo.

cd /d "%~dp0"

:: 1. Ensure output directory exists
if not exist "c:\ai\minibot\" (
    echo [Setup] Creating target directory c:\ai\minibot ...
    mkdir "c:\ai\minibot"
)

:: 2. Rebuild Frontend production bundle
echo.
echo [1/3] Building frontend production bundle (Vite)...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [Error] Frontend build failed!
    pause
    exit /b 1
)
cd ..

:: 3. Compile Tauri Desktop App using Cargo
echo.
echo [2/3] Compiling Tauri standalone release binary...
call npx --yes @tauri-apps/cli build
if %errorlevel% neq 0 (
    echo [Error] Tauri build failed!
    pause
    exit /b 1
)

:: 4. Locate and Copy compiled executable & installers to c:\ai\minibot
echo.
echo [3/4] Deploying compiled binaries to c:\ai\minibot ...

:: Copy minibot.exe (or app.exe)
if exist "src-tauri\target\release\minibot.exe" (
    copy /y "src-tauri\target\release\minibot.exe" "c:\ai\minibot\minibot.exe" >nul
    echo   [+] Copied minibot.exe to c:\ai\minibot\minibot.exe
) else if exist "src-tauri\target\release\app.exe" (
    copy /y "src-tauri\target\release\app.exe" "c:\ai\minibot\minibot.exe" >nul
    echo   [+] Copied app.exe to c:\ai\minibot\minibot.exe
)

:: Copy NSIS setup exe installer if present
if exist "src-tauri\target\release\bundle\nsis\minibot_0.1.0_x64-setup.exe" (
    copy /y "src-tauri\target\release\bundle\nsis\minibot_0.1.0_x64-setup.exe" "c:\ai\minibot\minibot-setup.exe" >nul
    echo   [+] Copied installer to c:\ai\minibot\minibot-setup.exe
)

:: Copy MSI installer package if present
if exist "src-tauri\target\release\bundle\msi\minibot_0.1.0_x64_en-US.msi" (
    copy /y "src-tauri\target\release\bundle\msi\minibot_0.1.0_x64_en-US.msi" "c:\ai\minibot\minibot.msi" >nul
    echo   [+] Copied MSI package to c:\ai\minibot\minibot.msi
)

:: 5. Copy Backend runtime assets ignoring logs and secret API keys
echo.
echo [4/4] Deploying clean backend assets (excluding logs and private keys)...

:: Ensure target runtime subdirectories
if not exist "c:\ai\minibot\dist" mkdir "c:\ai\minibot\dist"
if not exist "c:\ai\minibot\frontend\dist" mkdir "c:\ai\minibot\frontend\dist"

:: Copy compiled backend dist
xcopy /e /y /i /q "dist" "c:\ai\minibot\dist" >nul
echo   [+] Copied backend dist/

:: Copy frontend dist bundle
xcopy /e /y /i /q "frontend\dist" "c:\ai\minibot\frontend\dist" >nul
echo   [+] Copied frontend dist/

:: Copy configuration template and package.json
copy /y "package.json" "c:\ai\minibot\package.json" >nul
copy /y "loop.config.json" "c:\ai\minibot\loop.config.json" >nul
copy /y ".env.example" "c:\ai\minibot\.env.example" >nul
echo   [+] Copied clean config and .env.example template

:: IMPORTANT: We specifically DO NOT copy:
::  - .env (to avoid exposing private API keys)
::  - logs/ or *.log (so the standalone app starts with its own clean logs)
::  - config/sessions.json (so no prior session data leaks)


echo.
echo ===================================================
echo   Compilation and Deployment Completed Successfully!
echo   Target Location: c:\ai\minibot\minibot.exe
echo ===================================================
echo.
pause

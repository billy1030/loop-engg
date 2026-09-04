@echo off
chcp 65001 >nul
title MiniBot - Tauri Compiler & Deployer

echo ===================================================
echo       MiniBot Tauri Compiler & Auto-Deployer
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
echo [3/3] Deploying compiled binaries to c:\ai\minibot ...

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

echo.
echo ===================================================
echo   Compilation & Deployment Completed Successfully!
echo   Target Location: c:\ai\minibot\minibot.exe
echo ===================================================
echo.
pause

@echo off
chcp 65001 >nul
title MiniBot - Single Binary Builder and Auto-Deployer

echo ===================================================
echo     MiniBot Single-File Executable Deployer
echo ===================================================
echo.

cd /d "%~dp0"

:: 1. Check prerequisites (Bun, Node, Rust/Cargo)
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] 'bun' is required to compile the standalone backend.
    echo Please install Bun from https://bun.sh
    pause
    exit /b 1
)

where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] 'cargo' is required to build the Tauri desktop app.
    echo Please ensure the Rust toolchain is installed.
    pause
    exit /b 1
)

:: 2. Ensure target deployment directory exists
if not exist "c:\ai\minibot\" (
    echo [Setup] Creating target directory c:\ai\minibot ...
    mkdir "c:\ai\minibot"
)

:: 3. Rebuild Frontend production bundle (Vite)
echo.
echo [1/4] Building frontend production bundle (Vite)...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [Error] Frontend build failed!
    cd ..
    pause
    exit /b 1
)
cd ..

:: 4. Compile Standalone Backend Binary with embedded frontend (Bun)
echo.
echo [2/4] Compiling standalone backend binary with embedded assets (Bun)...
if not exist "src-tauri\bin\" mkdir "src-tauri\bin"
call bun build src/server.ts --compile --outfile src-tauri/bin/minibot-backend.exe
if %errorlevel% neq 0 (
    echo [Error] Backend compilation failed!
    pause
    exit /b 1
)

:: 5. Compile Standalone Desktop Executable with embedded backend (Tauri + Rust)
echo.
echo [3/4] Compiling Tauri standalone single-file binary (Tauri + Rust)...
call npx --yes @tauri-apps/cli build
if %errorlevel% neq 0 (
    echo [Error] Tauri build failed!
    pause
    exit /b 1
)

:: 6. Deploy Single-File Executable to c:\ai\minibot
echo.
echo [4/4] Deploying single executable to c:\ai\minibot ...

:: Copy standalone minibot.exe
if exist "src-tauri\target\release\minibot.exe" (
    copy /y "src-tauri\target\release\minibot.exe" "c:\ai\minibot\minibot.exe" >nul
    echo   [+] Copied minibot.exe (Single Self-Contained Executable)
) else if exist "src-tauri\target\release\app.exe" (
    copy /y "src-tauri\target\release\app.exe" "c:\ai\minibot\minibot.exe" >nul
    echo   [+] Copied app.exe to minibot.exe
)

:: Copy installers if present
if exist "src-tauri\target\release\bundle\nsis\minibot_0.1.0_x64-setup.exe" (
    copy /y "src-tauri\target\release\bundle\nsis\minibot_0.1.0_x64-setup.exe" "c:\ai\minibot\minibot-setup.exe" >nul
    echo   [+] Copied installer to c:\ai\minibot\minibot-setup.exe
)
if exist "src-tauri\target\release\bundle\msi\minibot_0.1.0_x64_en-US.msi" (
    copy /y "src-tauri\target\release\bundle\msi\minibot_0.1.0_x64_en-US.msi" "c:\ai\minibot\minibot.msi" >nul
    echo   [+] Copied MSI package to c:\ai\minibot\minibot.msi
)

echo.
echo ===================================================
echo   Single Executable Built and Deployed Successfully!
echo   Target Location: c:\ai\minibot\minibot.exe
echo.
echo   Note: 
echo   - minibot.exe is 100%% self-contained.
echo   - No loose folders (node_modules, dist, frontend) needed.
echo   - On launch, it auto-creates minibot.config.json with all settings.
echo ===================================================
echo.
pause


#!/usr/bin/env bash

# Mini Chat Bot Launcher for macOS / Linux
# Model Context Protocol (MCP) + React 19 + Vite 8

set -e

# Change to script directory
cd "$(cd "$(dirname "$0")" && pwd)"

PORT="${PORT:-7002}"

echo "==================================================="
echo "          Mini Chat Bot Launcher"
echo "  Model Context Protocol (MCP) + React 19 + Vite 8"
echo "==================================================="
echo ""

# 1. Check if root node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[Setup] Installing root dependencies..."
    npm install
fi

# 2. Check if frontend dist exists, build if missing
if [ ! -f "frontend/dist/index.html" ]; then
    echo "[Build] Building frontend production bundle..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    npm run build
    cd ..
fi

# 4. Open browser after short delay
(
    sleep 2
    if which open >/dev/null 2>&1; then
        open "http://localhost:${PORT}"
    elif which xdg-open >/dev/null 2>&1; then
        xdg-open "http://localhost:${PORT}"
    fi
) &

# 5. Start Backend Server
echo ""
echo "[Running] Starting Mini Chat Bot on http://localhost:${PORT} ..."
echo "[Tip] Press Ctrl+C in this terminal window to stop the server."
echo ""

PORT="${PORT}" npx tsx src/server.ts

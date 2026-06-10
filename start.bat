@echo off
REM 3D Cricket Game - Quick Start Script for Windows
REM This script sets up and launches the cricket game

echo.
echo 🏏 3D Cricket Game - Quick Start for Windows
echo =============================================
echo.

REM Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ from python.org and add it to PATH
    pause
    exit /b 1
)

echo ✅ Python detected:
python --version
echo.

REM Install dependencies
echo 📦 Installing Python dependencies...
python -m pip install -q -r requirements.txt

if %errorlevel% equ 0 (
    echo ✅ Dependencies installed successfully
) else (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo 🚀 Starting the game...
echo.

REM Start Python backend in separate window
echo Starting WebSocket server (tracker.py)...
start cmd /k python tracker.py

REM Wait for server to start
timeout /t 3 /nobreak

REM Start local web server
echo Starting web server on http://localhost:8000
echo.
echo 📖 Opening http://localhost:8000 in your browser...
echo Press Ctrl+C in this window to stop the server
echo.

REM Open browser
start http://localhost:8000

REM Start Python HTTP server
python -m http.server 8000

pause

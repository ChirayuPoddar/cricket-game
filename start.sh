#!/bin/bash

# 3D Cricket Game - Quick Start Script
# This script sets up and launches the cricket game

echo "🏏 3D Cricket Game - Quick Start"
echo "================================"
echo ""

# Check Python installation
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ from python.org"
    exit 1
fi

echo "✅ Python 3 detected: $(python3 --version)"
echo ""

# Install dependencies
echo "📦 Installing Python dependencies..."
python3 -m pip install -q -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🚀 Starting the game..."
echo ""

# Start Python backend in background
echo "Starting WebSocket server (tracker.py)..."
python3 tracker.py &
TRACKER_PID=$!

# Wait a moment for the server to start
sleep 3

# Start local web server
echo "Starting web server on http://localhost:8000"
echo "Press Ctrl+C to stop the game"
echo ""

# Check if Python HTTP server is available (Python 3)
python3 -m http.server 8000

# Cleanup
kill $TRACKER_PID 2>/dev/null

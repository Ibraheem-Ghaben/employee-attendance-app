#!/bin/bash
# Start the backend server

cd "$(dirname "$0")/backend"

echo "============================================================"
echo "Starting Employee Attendance Backend Server..."
echo "============================================================"
echo ""

if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed. Running npm install..."
    npm install
fi

echo "Starting server in development mode..."
npm run dev


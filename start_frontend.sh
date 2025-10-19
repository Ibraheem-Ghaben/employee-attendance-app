#!/bin/bash
# Start the frontend React app

cd "$(dirname "$0")/frontend"

echo "============================================================"
echo "Starting Employee Attendance Frontend..."
echo "============================================================"
echo ""

if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed. Running npm install..."
    npm install
fi

echo "Starting React development server..."
npm start


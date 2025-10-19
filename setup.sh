#!/bin/bash
# Complete setup script for Employee Attendance Application

echo "============================================================"
echo "Employee Attendance App - Setup Script"
echo "============================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "Please install Node.js 18+ first:"
    echo "  sudo apt update"
    echo "  sudo apt install nodejs npm -y"
    echo ""
    echo "Or use NodeSource repository for latest version:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"
echo ""

# Install backend dependencies
echo "============================================================"
echo "Installing Backend Dependencies..."
echo "============================================================"
cd backend
npm install
if [ $? -eq 0 ]; then
    echo "✓ Backend dependencies installed successfully!"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi
echo ""

# Build backend
echo "Building backend TypeScript..."
npm run build
if [ $? -eq 0 ]; then
    echo "✓ Backend built successfully!"
else
    echo "❌ Failed to build backend"
    exit 1
fi
cd ..
echo ""

# Install frontend dependencies
echo "============================================================"
echo "Installing Frontend Dependencies..."
echo "============================================================"
cd frontend
npm install
if [ $? -eq 0 ]; then
    echo "✓ Frontend dependencies installed successfully!"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi
cd ..
echo ""

echo "============================================================"
echo "✅ Setup Complete!"
echo "============================================================"
echo ""
echo "To start the application:"
echo ""
echo "1. Start Backend (Terminal 1):"
echo "   cd backend && npm run dev"
echo ""
echo "2. Start Frontend (Terminal 2):"
echo "   cd frontend && npm start"
echo ""
echo "3. Access the application:"
echo "   http://localhost:3000"
echo ""
echo "============================================================"


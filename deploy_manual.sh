#!/bin/bash

# 🚀 Manual Deployment for MSS-HR.com (No Sudo Required)
# This script handles the parts that don't require sudo

echo "🚀 Manual Deployment for MSS-HR.com"
echo "===================================="
echo "📅 Date: $(date)"
echo "🌐 Domain: MSS-HR.com"
echo "👤 User: $(whoami)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Phase 1: Build Applications
print_status "Phase 1: Building applications..."

# Build Frontend
print_status "Building frontend..."
cd /home/administrator/employee_attendance_app/frontend
if npm run build; then
    print_success "Frontend built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

# Build Backend
print_status "Building backend..."
cd /home/administrator/employee_attendance_app/backend
if npm run build; then
    print_success "Backend built successfully"
else
    print_error "Backend build failed"
    exit 1
fi

# Phase 2: Create Production Directories (Local)
print_status "Phase 2: Creating local production directories..."

mkdir -p /home/administrator/employee-attendance
mkdir -p /home/administrator/employee-attendance/logs

print_success "Local production directories created"

# Phase 3: Copy Production Files
print_status "Phase 3: Copying production files..."

# Copy frontend build
print_status "Copying frontend build..."
cp -r /home/administrator/employee_attendance_app/frontend/build/* /home/administrator/employee-attendance/
print_success "Frontend files copied"

# Copy backend
print_status "Copying backend..."
cp -r /home/administrator/employee_attendance_app/backend/dist /home/administrator/employee-attendance/backend
cp /home/administrator/employee_attendance_app/backend/package.json /home/administrator/employee-attendance/backend/
cp -r /home/administrator/employee_attendance_app/backend/node_modules /home/administrator/employee-attendance/backend/
print_success "Backend files copied"

# Copy logo
if [ -f "/home/administrator/employee_attendance_app/frontend/public/logo.png" ]; then
    cp /home/administrator/employee_attendance_app/frontend/public/logo.png /home/administrator/employee-attendance/
    print_success "Logo copied"
fi

# Phase 4: Create PM2 Ecosystem Configuration
print_status "Phase 4: Creating PM2 ecosystem configuration..."

cat > /home/administrator/employee-attendance/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'employee-attendance-backend',
      script: './backend/dist/server.js',
      cwd: '/home/administrator/employee-attendance',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        LOCAL_DB_SERVER: 'localhost',
        LOCAL_DB_NAME: 'AttendanceAuthDB',
        LOCAL_DB_USER: 'sa',
        LOCAL_DB_PASSWORD: 'your-local-db-password',
        LOCAL_DB_PORT: '1433',
        APIC_DB_SERVER: '192.168.1.100',
        APIC_DB_NAME: 'MSS_TA',
        APIC_DB_USER: 'sa',
        APIC_DB_PASSWORD: 'your-apic-db-password',
        APIC_DB_PORT: '1433',
        JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production'
      },
      log_file: '/home/administrator/employee-attendance/logs/backend.log',
      error_file: '/home/administrator/employee-attendance/logs/backend-error.log',
      out_file: '/home/administrator/employee-attendance/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF

print_success "PM2 ecosystem configuration created"

# Phase 5: Create Environment File
print_status "Phase 5: Creating environment configuration..."

cat > /home/administrator/employee-attendance/.env << 'EOF'
NODE_ENV=production
PORT=5000

# Local Database (MSSQL)
LOCAL_DB_SERVER=localhost
LOCAL_DB_NAME=AttendanceAuthDB
LOCAL_DB_USER=sa
LOCAL_DB_PASSWORD=your-local-db-password
LOCAL_DB_PORT=1433

# APIC Database (MSSQL)
APIC_DB_SERVER=192.168.1.100
APIC_DB_NAME=MSS_TA
APIC_DB_USER=sa
APIC_DB_PASSWORD=your-apic-db-password
APIC_DB_PORT=1433

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Sync Settings
SYNC_INTERVAL=3600000
SYNC_TIMEOUT=300000
EOF

print_success "Environment configuration created"

# Phase 6: Install PM2 (if not available)
print_status "Phase 6: Installing PM2..."

if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2 locally..."
    npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

# Phase 7: Start Production Services
print_status "Phase 7: Starting production services..."

# Stop any existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start the application
cd /home/administrator/employee-attendance
pm2 start ecosystem.config.js
pm2 save

print_success "Production services started"

# Phase 8: Final Checks
print_status "Phase 8: Running final checks..."

# Check PM2 status
if pm2 status | grep -q "online"; then
    print_success "PM2 processes are running"
else
    print_error "PM2 processes are not running"
    pm2 status
fi

# Check if ports are listening
if netstat -tlnp | grep -q ":5000 "; then
    print_success "Port 5000 is listening"
else
    print_warning "Port 5000 is not listening"
fi

# Final Status
echo ""
echo "🎉 Manual Deployment Completed!"
echo "==============================="
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "🌐 Application URLs:"
echo "   Backend API: http://localhost:5000"
echo "   Frontend: http://localhost:3000 (development)"
echo ""
echo "📋 Management Commands:"
echo "   Monitor: pm2 monit"
echo "   Logs: pm2 logs"
echo "   Restart: pm2 restart employee-attendance-backend"
echo "   Stop: pm2 stop employee-attendance-backend"
echo ""
echo "📁 Important Files:"
echo "   Application: /home/administrator/employee-attendance"
echo "   Logs: /home/administrator/employee-attendance/logs"
echo "   Config: /home/administrator/employee-attendance/ecosystem.config.js"
echo ""
echo "⚠️  Next Steps (Require Sudo):"
echo "   1. Install Nginx: sudo apt install nginx"
echo "   2. Configure Nginx: sudo cp nginx-mss-hr.conf /etc/nginx/sites-available/"
echo "   3. Enable site: sudo ln -s /etc/nginx/sites-available/employee-attendance /etc/nginx/sites-enabled/"
echo "   4. Install SSL: sudo certbot --nginx -d MSS-HR.com"
echo "   5. Configure firewall: sudo ufw allow 80,443"
echo ""
echo "✅ Manual deployment completed successfully!"


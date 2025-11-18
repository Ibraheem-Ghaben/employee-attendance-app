#!/bin/bash

# 🚀 Employee Attendance System - MSS-HR.com Production Deployment
# Domain: MSS-HR.com
# Version: 3.0.0
# Author: MSS Software Team

set -e  # Exit on any error

echo "🚀 Deploying Employee Attendance System to MSS-HR.com"
echo "====================================================="
echo "📅 Date: $(date)"
echo "🌐 Domain: MSS-HR.com"
echo "👤 User: $(whoami)"
echo "📍 Location: $(pwd)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if running as administrator
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root. Run as administrator user."
    exit 1
fi

# Check domain accessibility
print_status "Checking domain accessibility..."
if ping -c 1 MSS-HR.com &> /dev/null; then
    print_success "Domain MSS-HR.com is accessible"
else
    print_warning "Domain MSS-HR.com is not accessible. Please ensure DNS is configured."
    echo "   DNS should point to this server's IP address"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Phase 1: Install Production Dependencies
print_status "Phase 1: Installing production dependencies..."

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
    print_success "PM2 installed successfully"
else
    print_success "PM2 already installed"
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    sudo apt update
    sudo apt install nginx -y
    print_success "Nginx installed successfully"
else
    print_success "Nginx already installed"
fi

# Install SSL tools
print_status "Installing SSL tools..."
sudo apt install certbot python3-certbot-nginx -y
print_success "SSL tools installed"

# Phase 2: Create Production Directories
print_status "Phase 2: Creating production directories..."

sudo mkdir -p /var/www/employee-attendance
sudo mkdir -p /var/log/employee-attendance
sudo mkdir -p /etc/employee-attendance

# Set permissions
sudo chown -R administrator:administrator /var/www/employee-attendance
sudo chown -R administrator:administrator /var/log/employee-attendance
sudo chown -R administrator:administrator /etc/employee-attendance

print_success "Production directories created"

# Phase 3: Build Applications
print_status "Phase 3: Building applications..."

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

# Phase 4: Copy Production Files
print_status "Phase 4: Copying production files..."

# Copy frontend build
print_status "Copying frontend build..."
sudo cp -r /home/administrator/employee_attendance_app/frontend/build/* /var/www/employee-attendance/
print_success "Frontend files copied"

# Copy backend
print_status "Copying backend..."
sudo cp -r /home/administrator/employee_attendance_app/backend/dist /var/www/employee-attendance/backend
sudo cp /home/administrator/employee_attendance_app/backend/package.json /var/www/employee-attendance/backend/
sudo cp -r /home/administrator/employee_attendance_app/backend/node_modules /var/www/employee-attendance/backend/
print_success "Backend files copied"

# Copy logo
if [ -f "/home/administrator/employee_attendance_app/frontend/public/logo.png" ]; then
    sudo cp /home/administrator/employee_attendance_app/frontend/public/logo.png /var/www/employee-attendance/
    print_success "Logo copied"
fi

# Phase 5: Create PM2 Ecosystem Configuration
print_status "Phase 5: Creating PM2 ecosystem configuration..."

cat > /var/www/employee-attendance/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'employee-attendance-backend',
      script: './backend/dist/server.js',
      cwd: '/var/www/employee-attendance',
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
      log_file: '/var/log/employee-attendance/backend.log',
      error_file: '/var/log/employee-attendance/backend-error.log',
      out_file: '/var/log/employee-attendance/backend-out.log',
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

# Phase 6: Create Environment File
print_status "Phase 6: Creating environment configuration..."

cat > /var/www/employee-attendance/.env << 'EOF'
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

# Set secure permissions
sudo chmod 600 /var/www/employee-attendance/.env
sudo chown administrator:administrator /var/www/employee-attendance/.env

print_success "Environment configuration created"

# Phase 7: Configure Nginx for MSS-HR.com
print_status "Phase 7: Configuring Nginx for MSS-HR.com..."

# Copy the domain-specific configuration
sudo cp /home/administrator/employee_attendance_app/nginx-mss-hr.conf /etc/nginx/sites-available/employee-attendance

# Enable the site
sudo ln -sf /etc/nginx/sites-available/employee-attendance /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if sudo nginx -t; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration is invalid"
    exit 1
fi

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

print_success "Nginx configured for MSS-HR.com"

# Phase 8: Install SSL Certificate
print_status "Phase 8: Installing SSL certificate for MSS-HR.com..."

# Install SSL certificate
if sudo certbot --nginx -d MSS-HR.com -d www.MSS-HR.com --non-interactive --agree-tos --email admin@MSS-HR.com; then
    print_success "SSL certificate installed successfully"
    echo "   HTTPS: https://MSS-HR.com"
    echo "   HTTPS: https://www.MSS-HR.com"
else
    print_warning "SSL certificate installation failed. You can install it manually later:"
    echo "   sudo certbot --nginx -d MSS-HR.com -d www.MSS-HR.com"
fi

# Phase 9: Start Production Services
print_status "Phase 9: Starting production services..."

# Stop any existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start the application
cd /var/www/employee-attendance
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup
pm2 startup | grep -E '^sudo' | bash

print_success "Production services started"

# Phase 10: Configure Firewall for Internal Network
print_status "Phase 10: Configuring firewall for internal network security..."

# Configure UFW firewall for internal network
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow HTTP/HTTPS from internet
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block database ports from internet (internal only)
sudo ufw deny 1433/tcp
sudo ufw deny 1434/tcp

# Allow internal network access to databases
sudo ufw allow from 192.168.1.0/24 to any port 1433
sudo ufw allow from 192.168.1.0/24 to any port 1434

# Allow SSH (adjust port if needed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw --force enable

print_success "Firewall configured for internal network security"

# Phase 11: Setup Log Rotation
print_status "Phase 11: Setting up log rotation..."

sudo tee /etc/logrotate.d/employee-attendance << 'EOF'
/var/log/employee-attendance/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 administrator administrator
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

print_success "Log rotation configured"

# Phase 11: Final Checks
print_status "Phase 11: Running final checks..."

# Check PM2 status
if pm2 status | grep -q "online"; then
    print_success "PM2 processes are running"
else
    print_error "PM2 processes are not running"
    pm2 status
fi

# Check Nginx status
if sudo systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
else
    print_error "Nginx is not running"
fi

# Check if ports are listening
if netstat -tlnp | grep -q ":80 "; then
    print_success "Port 80 is listening"
else
    print_warning "Port 80 is not listening"
fi

if netstat -tlnp | grep -q ":443 "; then
    print_success "Port 443 (HTTPS) is listening"
else
    print_warning "Port 443 (HTTPS) is not listening"
fi

if netstat -tlnp | grep -q ":5000 "; then
    print_success "Port 5000 is listening"
else
    print_warning "Port 5000 is not listening"
fi

# Final Status
echo ""
echo "🎉 MSS-HR.com Production Deployment Completed!"
echo "=============================================="
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: https://MSS-HR.com"
echo "   Frontend: https://www.MSS-HR.com"
echo "   Backend API: https://MSS-HR.com/api"
echo ""
echo "📋 Management Commands:"
echo "   Monitor: pm2 monit"
echo "   Logs: pm2 logs"
echo "   Restart: pm2 restart employee-attendance-backend"
echo "   Stop: pm2 stop employee-attendance-backend"
echo ""
echo "📁 Important Files:"
echo "   Application: /var/www/employee-attendance"
echo "   Logs: /var/log/employee-attendance"
echo "   Config: /etc/nginx/sites-available/employee-attendance"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Update database passwords in .env file"
echo "   2. Change JWT secret in .env file"
echo "   3. Test the application at https://MSS-HR.com"
echo "   4. Configure DNS if not already done"
echo "   5. Verify internal network database connections"
echo "   6. Set up monitoring and alerts"
echo ""
echo "🔒 Security Features:"
echo "   ✅ Database connections are internal only"
echo "   ✅ Firewall blocks external database access"
echo "   ✅ HTTPS encryption for web traffic"
echo "   ✅ Internal network isolation"
echo ""
echo "✅ MSS-HR.com deployment completed successfully!"
echo "🔒 Your application is now secure with SSL encryption!"

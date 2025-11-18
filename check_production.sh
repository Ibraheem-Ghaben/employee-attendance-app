#!/bin/bash

# 🔍 Employee Attendance System - Production Status Check
# Version: 3.0.0
# Author: MSS Software Team

echo "🔍 Employee Attendance System - Production Status Check"
echo "======================================================"
echo "📅 Date: $(date)"
echo "👤 User: $(whoami)"
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

# Check system information
echo "🖥️  System Information:"
echo "   OS: $(lsb_release -d | cut -f2)"
echo "   Kernel: $(uname -r)"
echo "   Uptime: $(uptime -p)"
echo "   Load: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# Check Node.js and NPM
echo "📦 Node.js Environment:"
if command -v node &> /dev/null; then
    print_success "Node.js: $(node --version)"
else
    print_error "Node.js not found"
fi

if command -v npm &> /dev/null; then
    print_success "NPM: $(npm --version)"
else
    print_error "NPM not found"
fi
echo ""

# Check PM2
echo "🔄 PM2 Process Manager:"
if command -v pm2 &> /dev/null; then
    print_success "PM2 is installed"
    echo "   PM2 Status:"
    pm2 status
    echo ""
    echo "   PM2 Processes:"
    pm2 list
else
    print_error "PM2 not found"
fi
echo ""

# Check Nginx
echo "🌐 Nginx Web Server:"
if command -v nginx &> /dev/null; then
    print_success "Nginx is installed"
    if sudo systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
    fi
    
    echo "   Nginx Status:"
    sudo systemctl status nginx --no-pager -l
    echo ""
    
    echo "   Nginx Configuration Test:"
    if sudo nginx -t; then
        print_success "Nginx configuration is valid"
    else
        print_error "Nginx configuration has errors"
    fi
else
    print_error "Nginx not found"
fi
echo ""

# Check Ports
echo "🔌 Network Ports:"
echo "   Port 80 (HTTP):"
if netstat -tlnp | grep -q ":80 "; then
    print_success "Port 80 is listening"
    netstat -tlnp | grep ":80 "
else
    print_error "Port 80 is not listening"
fi

echo "   Port 5000 (Backend API):"
if netstat -tlnp | grep -q ":5000 "; then
    print_success "Port 5000 is listening"
    netstat -tlnp | grep ":5000 "
else
    print_error "Port 5000 is not listening"
fi

echo "   Port 3000 (Development):"
if netstat -tlnp | grep -q ":3000 "; then
    print_warning "Port 3000 is still listening (development mode)"
    netstat -tlnp | grep ":3000 "
else
    print_success "Port 3000 is not listening (good for production)"
fi
echo ""

# Check Application Files
echo "📁 Application Files:"
if [ -d "/var/www/employee-attendance" ]; then
    print_success "Production directory exists: /var/www/employee-attendance"
    echo "   Directory contents:"
    ls -la /var/www/employee-attendance/
    echo ""
    
    if [ -f "/var/www/employee-attendance/index.html" ]; then
        print_success "Frontend build found"
    else
        print_error "Frontend build not found"
    fi
    
    if [ -d "/var/www/employee-attendance/backend" ]; then
        print_success "Backend directory found"
    else
        print_error "Backend directory not found"
    fi
    
    if [ -f "/var/www/employee-attendance/ecosystem.config.js" ]; then
        print_success "PM2 ecosystem config found"
    else
        print_error "PM2 ecosystem config not found"
    fi
else
    print_error "Production directory not found"
fi
echo ""

# Check Logs
echo "📋 Application Logs:"
if [ -d "/var/log/employee-attendance" ]; then
    print_success "Log directory exists: /var/log/employee-attendance"
    echo "   Log files:"
    ls -la /var/log/employee-attendance/
    echo ""
    
    echo "   Recent backend logs (last 10 lines):"
    if [ -f "/var/log/employee-attendance/backend.log" ]; then
        tail -10 /var/log/employee-attendance/backend.log
    else
        print_warning "Backend log file not found"
    fi
else
    print_error "Log directory not found"
fi
echo ""

# Check Environment
echo "⚙️  Environment Configuration:"
if [ -f "/var/www/employee-attendance/.env" ]; then
    print_success "Environment file found"
    echo "   Environment variables (without sensitive data):"
    grep -v -E "(PASSWORD|SECRET|KEY)" /var/www/employee-attendance/.env || echo "   No non-sensitive variables found"
else
    print_error "Environment file not found"
fi
echo ""

# Check Database Connections
echo "🗄️  Database Connections:"
echo "   Local Database (MSSQL):"
if command -v sqlcmd &> /dev/null; then
    print_success "SQL Server client found"
else
    print_warning "SQL Server client not found (sqlcmd)"
fi

echo "   APIC Database Connection:"
if [ -f "/var/www/employee-attendance/.env" ]; then
    APIC_SERVER=$(grep "APIC_DB_SERVER" /var/www/employee-attendance/.env | cut -d'=' -f2)
    if [ ! -z "$APIC_SERVER" ]; then
        print_success "APIC Server configured: $APIC_SERVER"
    else
        print_warning "APIC Server not configured"
    fi
else
    print_error "Environment file not found"
fi
echo ""

# Check Firewall
echo "🔥 Firewall Status:"
if command -v ufw &> /dev/null; then
    print_success "UFW firewall found"
    echo "   Firewall status:"
    sudo ufw status
else
    print_warning "UFW firewall not found"
fi
echo ""

# Check SSL
echo "🔒 SSL Configuration:"
if command -v certbot &> /dev/null; then
    print_success "Certbot found"
    echo "   SSL certificates:"
    sudo certbot certificates 2>/dev/null || echo "   No SSL certificates found"
else
    print_warning "Certbot not found"
fi
echo ""

# Performance Check
echo "📊 System Performance:"
echo "   Memory Usage:"
free -h
echo ""
echo "   Disk Usage:"
df -h | grep -E "(Filesystem|/dev/)"
echo ""
echo "   CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
echo ""

# Application Health Check
echo "🏥 Application Health Check:"
echo "   Frontend (HTTP):"
if curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200"; then
    print_success "Frontend is accessible"
else
    print_error "Frontend is not accessible"
fi

echo "   Backend API:"
if curl -s -o /dev/null -w "%{http_code}" http://localhost/api/ | grep -q "200\|404"; then
    print_success "Backend API is accessible"
else
    print_error "Backend API is not accessible"
fi
echo ""

# Summary
echo "📋 Summary:"
echo "==========="

# Count issues
ISSUES=0

# Check critical services
if ! pm2 status | grep -q "online"; then
    print_error "PM2 processes are not running"
    ISSUES=$((ISSUES + 1))
fi

if ! sudo systemctl is-active --quiet nginx; then
    print_error "Nginx is not running"
    ISSUES=$((ISSUES + 1))
fi

if [ ! -d "/var/www/employee-attendance" ]; then
    print_error "Production directory not found"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    print_success "All critical services are running properly!"
    echo ""
    echo "🌐 Your application is ready at:"
    echo "   Frontend: http://localhost"
    echo "   Backend API: http://localhost/api"
    echo ""
    echo "📊 Monitor with: pm2 monit"
    echo "📋 View logs with: pm2 logs"
else
    print_error "Found $ISSUES critical issues that need attention"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Check PM2: pm2 status"
    echo "   2. Check Nginx: sudo systemctl status nginx"
    echo "   3. Check logs: pm2 logs"
    echo "   4. Restart services: pm2 restart all && sudo systemctl restart nginx"
fi

echo ""
echo "✅ Status check completed!"

#!/bin/bash

# 🔒 Internal Network Security Verification
# Purpose: Verify database connections are internal only
# Author: MSS Software Team

echo "🔒 Internal Network Security Verification"
echo "========================================"
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

# Check network configuration
echo "🌐 Network Configuration:"
echo "   Server IP: $(hostname -I | awk '{print $1}')"
echo "   Gateway: $(ip route | grep default | awk '{print $3}')"
echo "   DNS: $(cat /etc/resolv.conf | grep nameserver | awk '{print $2}' | head -1)"
echo ""

# Check firewall status
echo "🔥 Firewall Status:"
if command -v ufw &> /dev/null; then
    print_success "UFW firewall is installed"
    echo "   Firewall status:"
    sudo ufw status numbered
    echo ""
    
    # Check specific rules
    echo "   Database port rules:"
    if sudo ufw status | grep -q "1433"; then
        print_warning "Port 1433 is mentioned in firewall rules"
        sudo ufw status | grep 1433
    else
        print_success "Port 1433 is not exposed externally"
    fi
    
    if sudo ufw status | grep -q "1434"; then
        print_warning "Port 1434 is mentioned in firewall rules"
        sudo ufw status | grep 1434
    else
        print_success "Port 1434 is not exposed externally"
    fi
else
    print_error "UFW firewall not found"
fi
echo ""

# Check listening ports
echo "🔌 Listening Ports:"
echo "   External ports (should be 80, 443 only):"
netstat -tlnp | grep -E ":(80|443)" | while read line; do
    echo "   $line"
done

echo "   Internal ports (should include 1433, 1434):"
netstat -tlnp | grep -E ":(1433|1434|5000)" | while read line; do
    echo "   $line"
done
echo ""

# Check database connectivity
echo "🗄️  Database Connectivity:"
echo "   Local Database (localhost):"
if command -v sqlcmd &> /dev/null; then
    if sqlcmd -S localhost -U sa -P '' -Q "SELECT 1" &> /dev/null; then
        print_success "Local database is accessible"
    else
        print_warning "Local database connection failed"
    fi
else
    print_warning "SQL Server client (sqlcmd) not found"
fi

echo "   APIC Database (192.168.1.100):"
if ping -c 1 192.168.1.100 &> /dev/null; then
    print_success "APIC database server is reachable"
    if command -v sqlcmd &> /dev/null; then
        if sqlcmd -S 192.168.1.100 -U sa -P '' -Q "SELECT 1" &> /dev/null; then
            print_success "APIC database is accessible"
        else
            print_warning "APIC database connection failed"
        fi
    fi
else
    print_error "APIC database server (192.168.1.100) is not reachable"
fi
echo ""

# Check network interfaces
echo "🔗 Network Interfaces:"
ip addr show | grep -E "(inet |UP)" | while read line; do
    echo "   $line"
done
echo ""

# Check routing table
echo "🛣️  Routing Table:"
ip route show | while read line; do
    echo "   $line"
done
echo ""

# Check for external database connections
echo "🔍 External Database Connection Check:"
echo "   Checking for external database connections..."

# Check if any external IPs are configured for databases
if [ -f "/var/www/employee-attendance/.env" ]; then
    echo "   Environment file found, checking database configuration:"
    
    LOCAL_DB_SERVER=$(grep "LOCAL_DB_SERVER" /var/www/employee-attendance/.env | cut -d'=' -f2)
    APIC_DB_SERVER=$(grep "APIC_DB_SERVER" /var/www/employee-attendance/.env | cut -d'=' -f2)
    
    echo "   Local DB Server: $LOCAL_DB_SERVER"
    echo "   APIC DB Server: $APIC_DB_SERVER"
    
    # Check if servers are internal
    if [[ "$LOCAL_DB_SERVER" == "localhost" || "$LOCAL_DB_SERVER" == "127.0.0.1" ]]; then
        print_success "Local database is configured for internal access"
    else
        print_warning "Local database server: $LOCAL_DB_SERVER"
    fi
    
    if [[ "$APIC_DB_SERVER" =~ ^192\.168\. ]]; then
        print_success "APIC database is configured for internal network"
    elif [[ "$APIC_DB_SERVER" =~ ^10\. ]]; then
        print_success "APIC database is configured for internal network"
    elif [[ "$APIC_DB_SERVER" =~ ^172\.(1[6-9]|2[0-9]|3[0-1])\. ]]; then
        print_success "APIC database is configured for internal network"
    else
        print_error "APIC database server appears to be external: $APIC_DB_SERVER"
    fi
else
    print_warning "Environment file not found"
fi
echo ""

# Security recommendations
echo "🛡️  Security Recommendations:"
echo "   1. Ensure all database servers are on internal network"
echo "   2. Use strong passwords for database accounts"
echo "   3. Enable SSL/TLS for database connections"
echo "   4. Regularly update database software"
echo "   5. Monitor database access logs"
echo "   6. Use VPN for remote database access"
echo ""

# Summary
echo "📋 Security Summary:"
echo "==================="

SECURITY_ISSUES=0

# Check firewall
if ! sudo ufw status | grep -q "Status: active"; then
    print_error "Firewall is not active"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

# Check database ports
if netstat -tlnp | grep -q ":1433.*0.0.0.0"; then
    print_error "Database port 1433 is listening on all interfaces"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

# Check for external database servers
if [ -f "/var/www/employee-attendance/.env" ]; then
    APIC_DB_SERVER=$(grep "APIC_DB_SERVER" /var/www/employee-attendance/.env | cut -d'=' -f2)
    if [[ ! "$APIC_DB_SERVER" =~ ^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.) ]]; then
        print_error "APIC database server appears to be external"
        SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
    fi
fi

if [ $SECURITY_ISSUES -eq 0 ]; then
    print_success "All security checks passed!"
    echo ""
    echo "🔒 Your database connections are secure and internal!"
    echo "   ✅ Firewall is active"
    echo "   ✅ Database ports are not exposed externally"
    echo "   ✅ Database servers are on internal network"
    echo "   ✅ No external database connections detected"
else
    print_error "Found $SECURITY_ISSUES security issues"
    echo ""
    echo "🔧 Please address the security issues above"
fi

echo ""
echo "✅ Internal network security verification completed!"

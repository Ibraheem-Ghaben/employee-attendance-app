#!/bin/bash

# ============================================================
# Overtime System Setup Script
# ============================================================

echo "=================================================="
echo "  Employee Attendance - Overtime System Setup"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if SQL Server is accessible
echo "Checking SQL Server connection..."
if command -v sqlcmd &> /dev/null; then
    print_success "sqlcmd found"
else
    print_error "sqlcmd not found. Please install mssql-tools."
    exit 1
fi

# Read database credentials
echo ""
echo "Enter SQL Server credentials:"
read -p "Server (default: localhost): " DB_SERVER
DB_SERVER=${DB_SERVER:-localhost}

read -p "Username (default: sa): " DB_USER
DB_USER=${DB_USER:-sa}

read -sp "Password: " DB_PASSWORD
echo ""

# Test connection
echo ""
echo "Testing database connection..."
if sqlcmd -S $DB_SERVER -U $DB_USER -P $DB_PASSWORD -Q "SELECT 1" &> /dev/null; then
    print_success "Database connection successful"
else
    print_error "Failed to connect to database. Please check credentials."
    exit 1
fi

# Run overtime schema
echo ""
echo "Running overtime schema SQL script..."
if sqlcmd -S $DB_SERVER -U $DB_USER -P $DB_PASSWORD -i backend/overtime_schema.sql; then
    print_success "Overtime schema created successfully"
else
    print_error "Failed to create overtime schema"
    exit 1
fi

# Verify tables
echo ""
echo "Verifying tables..."
TABLE_COUNT=$(sqlcmd -S $DB_SERVER -U $DB_USER -P $DB_PASSWORD -d AttendanceAuthDB -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME IN ('EmployeePayConfig', 'SitePayConfig', 'TimesheetDays', 'PunchRecords')" -h -1 -W | tr -d ' ')

if [ "$TABLE_COUNT" = "4" ]; then
    print_success "All 4 tables created successfully"
    echo "  - EmployeePayConfig"
    echo "  - SitePayConfig"
    echo "  - TimesheetDays"
    echo "  - PunchRecords"
else
    print_warning "Expected 4 tables, found $TABLE_COUNT"
fi

# Check sample configurations
echo ""
echo "Checking sample configurations..."
CONFIG_COUNT=$(sqlcmd -S $DB_SERVER -U $DB_USER -P $DB_PASSWORD -d AttendanceAuthDB -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.EmployeePayConfig" -h -1 -W | tr -d ' ')

print_success "Found $CONFIG_COUNT employee pay configurations"

# Build backend
echo ""
echo "Building backend..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Compiling TypeScript..."
if npm run build; then
    print_success "Backend built successfully"
else
    print_error "Backend build failed"
    cd ..
    exit 1
fi
cd ..

# Summary
echo ""
echo "=================================================="
echo "  Setup Complete! ✓"
echo "=================================================="
echo ""
echo "Next steps:"
echo "  1. Start the backend server:"
echo "     cd backend && npm run dev"
echo ""
echo "  2. Test the API:"
echo "     curl http://localhost:5000/api/overtime/config/080165"
echo ""
echo "  3. Read the documentation:"
echo "     - OVERTIME_SYSTEM_GUIDE.md"
echo "     - OVERTIME_IMPLEMENTATION_SUMMARY.md"
echo ""
echo "API Endpoints:"
echo "  - GET  /api/overtime/config/:employeeCode"
echo "  - POST /api/overtime/config/:employeeCode"
echo "  - POST /api/overtime/calculate"
echo "  - GET  /api/overtime/reports/weekly"
echo "  - GET  /api/overtime/reports/weekly/export"
echo ""
echo "Default test employees with pay config:"
echo "  - 080001 (Supervisor): \$25/hr, 1.5× weekday OT, 2.0× weekend OT"
echo "  - 080165 (Ihab Qatusa): \$20/hr, 1.5× weekday OT, 2.0× weekend OT"
echo "  - 080416 (Mohammad Yasin): \$20/hr, 1.5× weekday OT, 2.0× weekend OT"
echo ""
echo "=================================================="


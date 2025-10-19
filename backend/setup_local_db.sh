#!/bin/bash

# Employee Attendance App - Local Database Setup Script
# This script creates the local authentication database

echo "============================================================"
echo "Employee Attendance App - Local Database Setup"
echo "============================================================"
echo ""

# Check if sqlcmd is installed
if ! command -v sqlcmd &> /dev/null; then
    echo "❌ Error: sqlcmd is not installed"
    echo ""
    echo "To install SQL Server command-line tools on Ubuntu/Debian:"
    echo "  curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -"
    echo "  curl https://packages.microsoft.com/config/ubuntu/20.04/prod.list | sudo tee /etc/apt/sources.list.d/msprod.list"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install mssql-tools unixodbc-dev"
    echo "  echo 'export PATH=\"\$PATH:/opt/mssql-tools/bin\"' >> ~/.bashrc"
    echo "  source ~/.bashrc"
    echo ""
    exit 1
fi

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo "✓ Loaded .env file"
else
    echo "⚠ Warning: .env file not found, using defaults"
fi

# Set default values if not in .env
LOCAL_DB_SERVER=${LOCAL_DB_SERVER:-localhost}
LOCAL_DB_USER=${LOCAL_DB_USER:-sa}
LOCAL_DB_PORT=${LOCAL_DB_PORT:-1433}

echo ""
echo "Database Configuration:"
echo "  Server: $LOCAL_DB_SERVER"
echo "  Port: $LOCAL_DB_PORT"
echo "  User: $LOCAL_DB_USER"
echo "  Database: AttendanceAuthDB"
echo ""

# Prompt for password if not set
if [ -z "$LOCAL_DB_PASSWORD" ]; then
    read -sp "Enter SQL Server password for '$LOCAL_DB_USER': " LOCAL_DB_PASSWORD
    echo ""
fi

echo ""
echo "Running database setup script..."
echo ""

# Run the SQL script
sqlcmd -S "$LOCAL_DB_SERVER,$LOCAL_DB_PORT" -U "$LOCAL_DB_USER" -P "$LOCAL_DB_PASSWORD" -i create_local_database.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================================"
    echo "✓ Database Setup Complete!"
    echo "============================================================"
    echo ""
    echo "Default Login Credentials:"
    echo "  Username: admin      | Password: MSS@2024 | Role: Admin"
    echo "  Username: supervisor | Password: MSS@2024 | Role: Supervisor"
    echo "  Username: employee1  | Password: MSS@2024 | Role: Employee"
    echo "  Username: employee2  | Password: MSS@2024 | Role: Employee"
    echo ""
    echo "⚠ IMPORTANT: Change default passwords in production!"
    echo "============================================================"
    echo ""
else
    echo ""
    echo "❌ Database setup failed. Please check the error messages above."
    echo ""
    exit 1
fi


# 🔐 Local Authentication Database Setup

## Overview

Your Employee Attendance App uses **TWO databases**:

1. **MSS_TA Database** (Remote SQL Server `APIC-APP02`)
   - Contains employee data and attendance records
   - **READ-ONLY** access
   - Used for: Employee profiles, attendance records, Excel export

2. **AttendanceAuthDB** (Local SQL Server)
   - Contains user authentication data
   - **READ-WRITE** access
   - Used for: User login, JWT tokens, user management
   - **NEEDS TO BE CREATED** ✅

---

## 🚨 Current Issue

The error you're seeing:
```
Invalid object name 'dbo.Users'
```

This means the **local authentication database hasn't been created yet**.

---

## ✅ Solution: Create Local Database

### Option 1: Using the Setup Script (Recommended)

```bash
cd /home/administrator/employee_attendance_app/backend
./setup_local_db.sh
```

The script will:
1. Check if sqlcmd is installed
2. Create the `AttendanceAuthDB` database
3. Create the `Users` table
4. Insert default users (admin, supervisor, employees)
5. Display login credentials

### Option 2: Manual SQL Execution

If you prefer manual setup:

```bash
cd /home/administrator/employee_attendance_app/backend

# Using sqlcmd
sqlcmd -S localhost -U sa -P YourPassword -i create_local_database.sql

# Or using SQL Server Management Studio (SSMS)
# 1. Open SSMS
# 2. Connect to localhost
# 3. Open create_local_database.sql
# 4. Execute (F5)
```

---

## 🔧 Configuration

### Check Your .env File

The backend needs these local database settings:

```env
# Local SQL Server Database (User Authentication)
LOCAL_DB_SERVER=localhost
LOCAL_DB_NAME=AttendanceAuthDB
LOCAL_DB_USER=sa
LOCAL_DB_PASSWORD=your_local_password
LOCAL_DB_PORT=1433
```

### Create .env File (if it doesn't exist)

```bash
cd /home/administrator/employee_attendance_app/backend

# Copy from example
cp .env.example .env

# Edit with your credentials
nano .env
```

**Required settings:**
```env
# Main SQL Server (for attendance data)
DB_SERVER=APIC-APP02
DB_NAME=MSS_TA
DB_USER=your_username
DB_PASSWORD=your_password

# Local SQL Server (for authentication)
LOCAL_DB_SERVER=localhost
LOCAL_DB_NAME=AttendanceAuthDB
LOCAL_DB_USER=sa
LOCAL_DB_PASSWORD=your_local_sa_password

# JWT Secret
JWT_SECRET=change_this_to_a_random_secret_key
```

---

## 👥 Default Users

After setup, you can login with these credentials:

| Username | Password | Role | Employee Code |
|----------|----------|------|---------------|
| admin | MSS@2024 | Admin | - |
| supervisor | MSS@2024 | Supervisor | 080001 |
| employee1 | MSS@2024 | Employee | 080165 |
| employee2 | MSS@2024 | Employee | 080416 |

⚠️ **IMPORTANT:** Change these passwords in production!

---

## 🔍 Verify Setup

### Check Database Exists

```sql
-- Check if database exists
SELECT name FROM sys.databases WHERE name = 'AttendanceAuthDB';

-- Check if Users table exists
USE AttendanceAuthDB;
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users';

-- View users
SELECT id, username, employee_code, role, full_name, is_active FROM Users;
```

### Test Login API

```bash
# Start backend
cd /home/administrator/employee_attendance_app/backend
npm start

# Test login (in another terminal)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"MSS@2024"}'
```

Expected response:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "full_name": "System Administrator",
    "email": "admin@mss.com"
  },
  "token": "eyJhbGc..."
}
```

---

## 🛠️ Troubleshooting

### Issue: "sqlcmd not found"

**Install SQL Server command-line tools:**

```bash
# Add Microsoft repository
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list | sudo tee /etc/apt/sources.list.d/msprod.list

# Install tools
sudo apt-get update
sudo apt-get install -y mssql-tools unixodbc-dev

# Add to PATH
echo 'export PATH="$PATH:/opt/mssql-tools/bin"' >> ~/.bashrc
source ~/.bashrc
```

### Issue: "Cannot connect to SQL Server"

**Option A: Install SQL Server locally**

```bash
# Install SQL Server on Ubuntu
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
sudo add-apt-repository "$(wget -qO- https://packages.microsoft.com/config/ubuntu/20.04/mssql-server-2019.list)"
sudo apt-get update
sudo apt-get install -y mssql-server

# Configure SQL Server
sudo /opt/mssql/bin/mssql-conf setup

# Enable and start service
sudo systemctl enable mssql-server
sudo systemctl start mssql-server
```

**Option B: Use Docker SQL Server**

```bash
# Run SQL Server in Docker
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong!Password" \
  -p 1433:1433 --name sql_server \
  -d mcr.microsoft.com/mssql/server:2019-latest

# Wait for SQL Server to start
sleep 10

# Create database
docker exec -it sql_server /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "YourStrong!Password" \
  -Q "CREATE DATABASE AttendanceAuthDB"
```

**Option C: Use SQLite instead (simpler alternative)**

If SQL Server is not available locally, we can modify the code to use SQLite for authentication (let me know if you want this option).

### Issue: "Connection timeout"

Check if SQL Server is running:
```bash
# Ubuntu/Linux
sudo systemctl status mssql-server

# Or check if port is open
netstat -an | grep 1433
```

### Issue: "Login failed for user 'sa'"

Make sure your SA password is correct:
```bash
# Reset SA password if needed (SQL Server on Linux)
sudo /opt/mssql/bin/mssql-conf set-sa-password
```

---

## 📋 Quick Setup Checklist

- [ ] SQL Server is installed and running locally
- [ ] .env file exists with correct credentials
- [ ] Run `./setup_local_db.sh` to create database
- [ ] Verify database created: `AttendanceAuthDB`
- [ ] Verify table created: `Users`
- [ ] Verify default users created (4 users)
- [ ] Test login API endpoint
- [ ] Start backend: `npm start`
- [ ] Start frontend: `cd ../frontend && npm start`
- [ ] Login with admin/MSS@2024

---

## 🔐 Database Architecture

```
┌─────────────────────────────────────────────────┐
│           Employee Attendance App               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────┐      ┌─────────────────┐  │
│  │  Frontend        │      │   Backend       │  │
│  │  React App       │◄────►│   Express API   │  │
│  └─────────────────┘      └────────┬────────┘  │
│                                    │            │
│                     ┌──────────────┴──────┐     │
│                     │                     │     │
│            ┌────────▼────────┐  ┌────────▼────┐│
│            │ AttendanceAuthDB│  │   MSS_TA    ││
│            │   (Local DB)    │  │(Remote DB)  ││
│            │                 │  │             ││
│            │ - Users table   │  │ - Laserfiche││
│            │ - Authentication│  │ - Attendance││
│            │ - JWT tokens    │  │ - READ ONLY ││
│            └─────────────────┘  └─────────────┘│
│                   localhost       APIC-APP02    │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Next Steps

1. **Setup local database** (run the script)
2. **Update .env** with correct credentials
3. **Rebuild backend**: `npm run build`
4. **Start backend**: `npm start`
5. **Test login** from frontend or API
6. **Change default passwords** in production

---

## 📞 Need Help?

If you encounter issues:
1. Check if SQL Server is running
2. Verify .env credentials
3. Check backend logs for errors
4. Verify AttendanceAuthDB database exists
5. Verify Users table exists with data

---

**Status:** ⚠️ **Action Required** - Local database needs to be created before login will work!

Run: `./setup_local_db.sh`


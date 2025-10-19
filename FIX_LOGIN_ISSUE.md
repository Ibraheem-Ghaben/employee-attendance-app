# 🔧 Fix Login Issue - Quick Guide

## ⚠️ The Problem

You're seeing this error:
```
Invalid object name 'dbo.Users'
```

## ✅ The Solution

Your **authentication is already configured correctly** to use the local database! The issue is simply that the **local database hasn't been created yet**.

---

## 🚀 Quick Fix (3 Steps)

### Step 1: Create the Local Database

```bash
cd /home/administrator/employee_attendance_app/backend
./setup_local_db.sh
```

When prompted, enter your **local SQL Server SA password**.

### Step 2: Verify Database Created

The script should display:
```
✓ Database Setup Complete!

Default Login Credentials:
  Username: admin      | Password: MSS@2024 | Role: Admin
  Username: supervisor | Password: MSS@2024 | Role: Supervisor
  Username: employee1  | Password: MSS@2024 | Role: Employee
  Username: employee2  | Password: MSS@2024 | Role: Employee
```

### Step 3: Start Backend

```bash
npm start
```

**That's it!** Login should now work! 🎉

---

## 📋 What the Script Does

1. ✅ Creates `AttendanceAuthDB` database (if not exists)
2. ✅ Creates `Users` table with proper schema
3. ✅ Inserts 4 default users
4. ✅ Creates performance indexes

---

## 🔐 Database Configuration

Your app uses **TWO separate databases**:

| Database | Purpose | Server | Access |
|----------|---------|--------|--------|
| **AttendanceAuthDB** | User authentication, login | localhost | READ-WRITE |
| **MSS_TA** | Employee data, attendance | APIC-APP02 | READ-ONLY |

✅ **Authentication service is ALREADY correctly using the local database!**

---

## 🛠️ If Script Doesn't Work

### Option 1: Install sqlcmd

```bash
# Install SQL Server command-line tools
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list | sudo tee /etc/apt/sources.list.d/msprod.list
sudo apt-get update
sudo apt-get install -y mssql-tools unixodbc-dev

# Add to PATH
echo 'export PATH="$PATH:/opt/mssql-tools/bin"' >> ~/.bashrc
source ~/.bashrc
```

### Option 2: Manual SQL Execution

```bash
# Run SQL script manually
sqlcmd -S localhost -U sa -P YourPassword -i create_local_database.sql
```

### Option 3: Use SQL Server Management Studio

1. Open SSMS
2. Connect to localhost
3. Open `create_local_database.sql`
4. Execute (F5)

---

## ✅ Test Login

Once database is created:

```bash
# Start backend
npm start

# Test login (in another terminal)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"MSS@2024"}'
```

Should return:
```json
{
  "success": true,
  "user": {
    "username": "admin",
    "role": "admin",
    ...
  },
  "token": "eyJ..."
}
```

---

## 📚 More Details

See `LOCAL_DATABASE_SETUP.md` for:
- Detailed setup instructions
- Troubleshooting guide
- Database architecture
- Docker SQL Server option
- SQLite alternative option

---

## 🎯 Summary

✅ Your code is **CORRECT** - authentication already uses local database  
⚠️ Just need to **CREATE** the local database  
🚀 Run `./setup_local_db.sh` to fix  

**That's the only issue!** 🎉


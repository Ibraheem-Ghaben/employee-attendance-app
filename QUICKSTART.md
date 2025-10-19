# Quick Start Guide

## 📦 Installation Steps

### Step 1: Install Node.js (if not already installed)

```bash
# Check if Node.js is installed
node --version
npm --version

# If not installed, install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Step 2: Run Setup Script

```bash
cd /home/administrator/employee_attendance_app
chmod +x setup.sh
./setup.sh
```

This will:
- Install backend dependencies
- Build backend TypeScript
- Install frontend dependencies

### Step 3: Start the Application

**Option A: Manual Start (2 terminals)**

Terminal 1 - Backend:
```bash
cd /home/administrator/employee_attendance_app
./start_backend.sh
```

Terminal 2 - Frontend:
```bash
cd /home/administrator/employee_attendance_app
./start_frontend.sh
```

**Option B: Using npm directly**

Backend:
```bash
cd /home/administrator/employee_attendance_app/backend
npm install
npm run dev
```

Frontend:
```bash
cd /home/administrator/employee_attendance_app/frontend
npm install
npm start
```

### Step 4: Access the Application

Open your browser and go to:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api/employees
- **Health Check**: http://localhost:5000/api/health

## 🌐 Network Access

To access from other machines on your network:

1. Update frontend `.env`:
```bash
cd /home/administrator/employee_attendance_app/frontend
nano .env
```

Change to:
```env
REACT_APP_API_URL=http://192.168.5.103:5000/api
```

2. Access from other machines:
- **Frontend**: http://192.168.5.103:3000
- **Backend API**: http://192.168.5.103:5000/api/employees

## 🔧 Troubleshooting

### Backend won't start

1. Check if dependencies are installed:
```bash
cd backend
ls node_modules  # Should show many folders
```

2. Check database connection:
```bash
cat backend/.env  # Verify database credentials
```

3. Test manually:
```bash
cd backend
npm install
npm run build
npm run dev
```

### Frontend won't start

1. Check if dependencies are installed:
```bash
cd frontend
ls node_modules  # Should show many folders
```

2. Clear cache and reinstall:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### Port already in use

If ports 3000 or 5000 are already in use:

Backend (change port in `backend/.env`):
```env
PORT=5001
```

Frontend will automatically try port 3001 if 3000 is busy.

### Database connection error

1. Verify SQL Server is accessible:
```bash
telnet 213.244.69.164 1433
# OR
nc -zv 213.244.69.164 1433
```

2. Check credentials in `backend/.env`

3. Ensure firewall allows outbound connection to port 1433

## 📊 Features

- ✅ View 18,511+ employee attendance records
- ✅ Pagination (25, 50, 100, 200 per page)
- ✅ Jump to specific page
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Real-time data from SQL Server
- ✅ IN/OUT status badges
- ✅ Modern, beautiful UI

## 🎯 API Testing

Test backend API with curl:

```bash
# Get first page (50 records)
curl http://localhost:5000/api/employees

# Get page 2 with 100 records
curl "http://localhost:5000/api/employees?page=2&pageSize=100"

# Health check
curl http://localhost:5000/api/health
```

## 📝 Notes

- Backend runs on port **5000** (configurable in backend/.env)
- Frontend runs on port **3000** (default React port)
- Data is fetched from SQL Server at **213.244.69.164**
- Database: **MSS_TA**
- Total Records: **~18,511** employee attendance entries
- Filters: Company='MSS', Branch='MSS', clock_id=3

---

**Need help? Check the main README.md for detailed documentation.**


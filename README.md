# Employee Attendance Management System

A modern, full-stack web application for managing employee attendance records with real-time data from SQL Server (Laserfiche integration).

## 🚀 Tech Stack

### Backend
- **Node.js** with **TypeScript**
- **Express.js** - REST API framework
- **mssql** - SQL Server connector
- **CORS** enabled for cross-origin requests

### Frontend
- **React 18** with **TypeScript**
- **Axios** for API calls
- Modern, responsive CSS design
- Mobile-friendly UI

## 📋 Features

- ✅ Real-time employee attendance data from SQL Server
- ✅ **Pagination** support (25, 50, 100, 200 records per page)
- ✅ Responsive design for mobile, tablet, and desktop
- ✅ Beautiful modern UI with gradient styling
- ✅ Jump to specific page functionality
- ✅ IN/OUT status badges with color coding
- ✅ Company filter (MSS) and Clock ID filter (3)
- ✅ TypeScript for type safety
- ✅ Error handling and loading states

## 📂 Project Structure

```
employee_attendance_app/
├── backend/                 # Node.js + TypeScript API
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── server.ts       # Express server
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── frontend/               # React + TypeScript UI
│   ├── src/
│   │   ├── services/       # API service
│   │   ├── types/          # TypeScript types
│   │   ├── App.tsx         # Main component
│   │   ├── App.css         # Styles
│   │   └── index.tsx       # Entry point
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
└── README.md
```

## ⚙️ Installation & Setup

### Prerequisites

- **Node.js** 18+ and **npm** installed
- **SQL Server** access (remote server: 213.244.69.164)
- Network access to the database server

### 1. Install Backend Dependencies

```bash
cd /home/administrator/employee_attendance_app/backend
npm install
```

### 2. Configure Backend Environment

Edit `backend/.env` if needed (already configured):

```env
DB_SERVER=213.244.69.164
DB_NAME=MSS_TA
DB_USER=menaitech
DB_PASSWORD=menaitech
DB_PORT=1433
PORT=5000
```

### 3. Build and Start Backend

```bash
# Development mode (with hot reload)
npm run dev

# OR Production mode
npm run build
npm start
```

Backend will run on: **http://localhost:5000**

### 4. Install Frontend Dependencies

```bash
cd /home/administrator/employee_attendance_app/frontend
npm install
```

### 5. Configure Frontend Environment

Edit `frontend/.env` if needed:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

For network access from other machines, change to:
```env
REACT_APP_API_URL=http://192.168.5.103:5000/api
```

### 6. Start Frontend

```bash
npm start
```

Frontend will run on: **http://localhost:3000**

## 🌐 API Endpoints

### Backend API

- **GET** `/api/employees?page=1&pageSize=50`
  - Get paginated employee attendance records
  - Query params:
    - `page` (number, default: 1) - Page number
    - `pageSize` (number, default: 50) - Records per page (1-500)
  
- **GET** `/api/health`
  - Health check endpoint

### Example Response

```json
{
  "success": true,
  "data": [
    {
      "Company_Code": "MSS",
      "Branch_Code": "MSS",
      "Employee_Code": "080165",
      "Employee_Name_1_English": "Ihab Qais Nabhan Qatusa",
      "Employee_Name_1_Arabic": "...",
      "Site_1_English": "Ramallah",
      "clock_id": 3,
      "InOutMode": 1,
      "punch_time": "2025-06-12T16:55:33"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 50,
    "totalRecords": 18511,
    "totalPages": 371,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

## 🎯 Usage

### Access the Application

1. **Start Backend**: `cd backend && npm run dev`
2. **Start Frontend**: `cd frontend && npm start`
3. **Open Browser**: http://localhost:3000

### Features Usage

- **Change Page Size**: Use the dropdown in the top-right corner
- **Navigate Pages**: Use Previous/Next buttons
- **Jump to Page**: Enter page number and click "Go"
- **View Details**: All employee and attendance info displayed in the table

## 📱 Responsive Design

The application is fully responsive and works on:
- 📱 Mobile devices (320px+)
- 📱 Tablets (768px+)
- 💻 Desktops (1024px+)
- 🖥️ Large screens (1600px+)

## 🔧 Development

### Backend Development

```bash
cd backend
npm run dev  # Runs with nodemon for hot reload
```

### Frontend Development

```bash
cd frontend
npm start  # Runs with hot reload
```

### Build for Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve the 'build' folder with a static server
```

## 🚀 Deployment

### Backend Production

```bash
cd backend
npm run build
NODE_ENV=production npm start
```

Or use **PM2** for process management:

```bash
npm install -g pm2
pm2 start dist/server.js --name employee-attendance-api
pm2 save
pm2 startup
```

### Frontend Production

Build and serve:

```bash
cd frontend
npm run build

# Serve with a static server (e.g., nginx, serve, etc.)
npx serve -s build -p 3000
```

## 📊 Database Query

The application queries employee data from:
- **Database 1**: `Laserfiche.dbo.Laserfiche` (Employee master data)
- **Database 2**: `MSS_TA.dbo.final_attendance_records` (Attendance records)

**Join Condition**: `record.EnrollNumber = employee.Card_ID`

**Filters**:
- Company_Code = 'MSS'
- Branch_Code = 'MSS'
- clock_id = 3

## 🔒 Security Notes

- Change database credentials in production
- Use environment variables for sensitive data
- Enable SSL/TLS for SQL Server in production
- Add authentication/authorization if exposing publicly
- Use HTTPS in production
- Implement rate limiting for API

## 📝 License

This project is provided as-is for internal use.

## 🤝 Support

For issues or questions:
1. Check the backend logs: Backend console output
2. Check the frontend console: Browser DevTools
3. Verify database connectivity: Test with `curl http://localhost:5000/api/health`

---

**Built with ❤️ using TypeScript, Node.js, and React**


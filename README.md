# 🏢 Employee Attendance System with Overtime Tracking

A comprehensive employee attendance and overtime tracking system with **3-bucket pay calculation**, built with React, Node.js/Express, TypeScript, and SQL Server.

## 🎯 Features

### Core Features
- ✅ Employee attendance tracking
- ✅ Real-time punch IN/OUT recording
- ✅ User authentication & authorization (JWT)
- ✅ Role-based access control (Admin/Supervisor/Employee)
- ✅ Employee profile management
- ✅ Excel export functionality

### Overtime System (NEW ⭐)
- ✅ **3-Bucket Pay Calculation**
  - Regular hours (workday within schedule)
  - Weekday overtime (after OT start time)
  - Weekend overtime (all hours on weekend days)
- ✅ **Flexible Weekly Calendar**
  - Custom week start day
  - Configurable weekend days
  - Custom workday hours
  - Overtime threshold settings
- ✅ **Advanced Pay Configuration**
  - Fixed rate or multiplier modes
  - Per-employee customization
  - Site-level defaults
- ✅ **Automated Calculation Engine**
  - Automatic punch pairing
  - Smart time splitting
  - Error handling and logging
- ✅ **Professional Reporting**
  - Weekly summaries by employee
  - Daily breakdown with all buckets
  - Excel export for payroll
  - Visual calendar view

## 🏗️ Technology Stack

### Backend
- **Node.js** + **Express.js**
- **TypeScript** for type safety
- **SQL Server** (remote + local databases)
- **JWT** authentication
- **ExcelJS** for report generation
- **Jest** for unit testing

### Frontend
- **React** with TypeScript
- **React Router** for navigation
- **Axios** for API calls
- **CSS3** for responsive design

## 📁 Project Structure

```
employee_attendance_app/
├── backend/
│   ├── src/
│   │   ├── config/           # Database connections
│   │   ├── middleware/       # Auth middleware
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   │   ├── overtimeCalculationService.ts
│   │   │   ├── timesheetService.ts
│   │   │   ├── payConfigService.ts
│   │   │   └── weeklyReportService.ts
│   │   ├── types/            # TypeScript types
│   │   ├── tests/            # Unit tests
│   │   └── server.ts         # Express server
│   ├── overtime_schema.sql   # Overtime DB schema
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── OvertimeSettings.tsx  # NEW
│   │   │   ├── WeeklyCalendar.tsx    # NEW
│   │   │   └── WeeklyReport.tsx      # NEW
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── overtimeApi.ts        # NEW
│   │   └── types/
│   │       ├── employee.ts
│   │       └── overtime.ts           # NEW
│   └── package.json
│
├── setup_overtime.sh         # Automated setup
├── test_overtime_system.sh   # API testing script
├── OVERTIME_SYSTEM_GUIDE.md  # User guide
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ installed
- SQL Server installed and running
- Git installed

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ibraheem-Ghaben/employee-attendance-app.git
   cd employee_attendance_app
   ```

2. **Set up databases**
   ```bash
   # Setup main authentication database
   sqlcmd -S localhost -U sa -P YourPassword -i backend/create_local_database.sql
   
   # Setup overtime tables
   sqlcmd -S localhost -U sa -P YourPassword -i backend/overtime_schema.sql
   ```
   
   Or use the automated script:
   ```bash
   ./setup_overtime.sh
   ```

3. **Configure environment variables**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   npm run build
   
   # Frontend
   cd ../frontend
   npm install
   ```

5. **Start the application**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev
   
   # Terminal 2: Frontend
   cd frontend
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Docs: http://localhost:5000/

## 🧪 Testing

### Run Unit Tests
```bash
cd backend
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Test API Endpoints
```bash
./test_overtime_system.sh
```

## 🔐 Default Login Credentials

| Username | Password | Role | Employee Code |
|----------|----------|------|---------------|
| `admin` | `MSS@2024` | Admin | N/A |
| `supervisor` | `MSS@2024` | Supervisor | 080001 |
| `employee1` | `MSS@2024` | Employee | 080165 |
| `employee2` | `MSS@2024` | Employee | 080416 |

⚠️ **Change passwords in production!**

## 📖 API Documentation

### Authentication
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "MSS@2024"
}
```

### Overtime Endpoints

#### Get Pay Configuration
```http
GET /api/overtime/config/:employeeCode
Authorization: Bearer <token>
```

#### Calculate Timesheets
```http
POST /api/overtime/calculate/:employeeCode
Authorization: Bearer <token>
Content-Type: application/json

{
  "from_date": "2025-01-01",
  "to_date": "2025-01-07"
}
```

#### Get Weekly Report
```http
GET /api/overtime/reports/weekly?from_date=2025-01-01&to_date=2025-01-07&employee_code=080165
Authorization: Bearer <token>
```

#### Export to Excel
```http
GET /api/overtime/reports/weekly/export?from_date=2025-01-01&to_date=2025-01-07
Authorization: Bearer <token>
```

See `OVERTIME_SYSTEM_GUIDE.md` for complete API reference.

## 📊 Overtime System

### How It Works

1. **Configuration**: Set up employee pay rates and workweek schedule
2. **Data Collection**: System records employee punch IN/OUT times
3. **Calculation**: Admin/Supervisor triggers calculation for date range
4. **Time Splitting**: System pairs punches and splits into 3 buckets:
   - **Regular**: Workday hours within normal schedule
   - **Weekday OT**: Workday hours after overtime threshold
   - **Weekend OT**: All hours on weekend days
5. **Pay Calculation**: Applies rates (fixed or multiplier) to each bucket
6. **Reporting**: Generate weekly reports with Excel export

### Example Calculation

**Configuration:**
- Workday: 09:00-17:00, OT after 17:00
- Weekend: Friday-Saturday
- Rates: $20/hr, 1.5× weekday OT, 2.0× weekend OT

**Monday Punches:** 09:00 IN, 18:30 OUT
- Regular: 8.0 hrs × $20 = **$160**
- Weekday OT: 1.5 hrs × $30 = **$45**
- **Total: $205**

**Friday Punches:** 10:00 IN, 16:00 OUT
- Weekend OT: 6.0 hrs × $40 = **$240**

## 📚 Documentation

- **OVERTIME_SYSTEM_GUIDE.md** - Complete system documentation
- **OVERTIME_IMPLEMENTATION_SUMMARY.md** - Technical details
- **COMPLETE_SYSTEM_SUMMARY.md** - Implementation summary
- **AUTHENTICATION_GUIDE.md** - Auth system guide

## 🛠️ Troubleshooting

### Database Connection Issues
```bash
# Test SQL Server connection
sqlcmd -S localhost -U sa -P YourPassword -Q "SELECT 1"

# Check if databases exist
sqlcmd -S localhost -U sa -P YourPassword -Q "SELECT name FROM sys.databases"
```

### Backend Won't Start
```bash
# Check if port 5000 is in use
lsof -i :5000

# View backend logs
cd backend
npm run dev
```

### Frontend Won't Start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

## 📈 Development

### Adding New Features
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test
3. Commit: `git commit -m "feat: description"`
4. Push: `git push origin feature/new-feature`
5. Create pull request on GitHub

### Running in Development
```bash
# Backend with auto-reload
cd backend
npm run dev

# Frontend with hot reload
cd frontend
npm start
```

### Building for Production
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve the build folder with your web server
```

## 📄 License

MIT License - See LICENSE file for details

## 👨‍💻 Author

Built for MSS - Employee Attendance Management

## 🌟 Version

**Current Version**: 3.0.0

### Changelog

#### v3.0.0 (October 19, 2025)
- Added comprehensive overtime tracking system
- Implemented 3-bucket pay calculation
- Added weekly calendar view
- Created weekly report with Excel export
- Built complete frontend UI components
- Added unit tests for calculation engine
- Complete documentation

#### v2.1.0
- Added authentication system
- Implemented role-based access control
- Added user management

#### v1.0.0
- Initial release
- Basic attendance tracking

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Review documentation in `/docs`
- Check troubleshooting section above

---

**Repository**: https://github.com/Ibraheem-Ghaben/employee-attendance-app

**Status**: ✅ Production Ready

**Last Updated**: October 19, 2025

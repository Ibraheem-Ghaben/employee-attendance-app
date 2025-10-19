import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import employeeRoutes from './routes/employeeRoutes';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import exportRoutes from './routes/exportRoutes';
import adminRoutes from './routes/adminRoutes';
import overtimeRoutes from './routes/overtimeRoutes';
import { closeConnection } from './config/database';
import { closeLocalConnection } from './config/localDatabase';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/overtime', overtimeRoutes);
app.use('/api', employeeRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Employee Attendance API with Authentication & Overtime Tracking',
    version: '3.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register (Admin only)',
        me: 'GET /api/auth/me',
        users: 'GET /api/auth/users (Admin only)',
      },
      profile: {
        myProfile: 'GET /api/profile/my-profile?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD',
        employeeProfile: 'GET /api/profile/:employeeCode?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD',
        allEmployees: 'GET /api/profile/list/all (Admin/Supervisor)',
      },
      employees: {
        list: 'GET /api/employees?page=1&pageSize=50&employee_code=XXX&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD (Admin/Supervisor)',
        description: 'Supports pagination and filtering by employee code and date range',
      },
      export: {
        attendance: 'GET /api/export/attendance?employee_code=XXX&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD',
        myAttendance: 'GET /api/export/my-attendance?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD',
      },
      overtime: {
        payConfig: 'GET /api/overtime/config/:employeeCode',
        updatePayConfig: 'POST /api/overtime/config/:employeeCode (Admin/Supervisor)',
        allConfigs: 'GET /api/overtime/config (Admin/Supervisor)',
        updateWorkweek: 'POST /api/overtime/settings/workweek (Admin/Supervisor)',
        calculate: 'POST /api/overtime/calculate (Admin/Supervisor)',
        calculateEmployee: 'POST /api/overtime/calculate/:employeeCode (Admin/Supervisor)',
        weeklyReport: 'GET /api/overtime/reports/weekly?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&employee_code=XXX',
        weeklyReportExport: 'GET /api/overtime/reports/weekly/export?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&employee_code=XXX',
        timesheet: 'GET /api/overtime/timesheet/:employeeCode?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD',
      },
      health: 'GET /api/health',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Local:   http://localhost:${PORT}`);
  console.log(`📍 API:     http://localhost:${PORT}/api/employees`);
  console.log(`📍 Health:  http://localhost:${PORT}/api/health`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await closeConnection();
    await closeLocalConnection();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await closeConnection();
    await closeLocalConnection();
    process.exit(0);
  });
});

export default app;


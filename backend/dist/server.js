"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const employeeRoutes_1 = __importDefault(require("./routes/employeeRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const profileRoutes_1 = __importDefault(require("./routes/profileRoutes"));
const exportRoutes_1 = __importDefault(require("./routes/exportRoutes"));
const database_1 = require("./config/database");
const localDatabase_1 = require("./config/localDatabase");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/profile', profileRoutes_1.default);
app.use('/api/export', exportRoutes_1.default);
app.use('/api', employeeRoutes_1.default);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Employee Attendance API with Authentication',
        version: '2.1.0',
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
app.use((err, req, res, next) => {
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
        await (0, database_1.closeConnection)();
        await (0, localDatabase_1.closeLocalConnection)();
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    server.close(async () => {
        console.log('HTTP server closed');
        await (0, database_1.closeConnection)();
        await (0, localDatabase_1.closeLocalConnection)();
        process.exit(0);
    });
});
exports.default = app;

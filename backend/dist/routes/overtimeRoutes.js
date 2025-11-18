"use strict";
/**
 * Overtime Routes
 * API endpoints for overtime configuration, calculation, and reporting
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const user_1 = require("../types/user");
const payConfigService_1 = require("../services/payConfigService");
const timesheetService_1 = require("../services/timesheetService");
const weeklyReportService_1 = require("../services/weeklyReportService");
const router = express_1.default.Router();
// ============================================================
// Pay Configuration Endpoints
// ============================================================
/**
 * GET /api/overtime/config/:employeeCode
 * Get employee pay configuration
 * Accessible by: Admin, Supervisor, or Employee (own config only)
 */
router.get('/config/:employeeCode', auth_1.authenticateToken, async (req, res) => {
    try {
        const { employeeCode } = req.params;
        const user = req.user;
        // Authorization: Admin and Supervisor can view any, Employee can only view own
        if (user.role !== 'admin' &&
            user.role !== 'supervisor' &&
            user.employee_code !== employeeCode) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this configuration',
            });
        }
        const config = await payConfigService_1.payConfigService.getEmployeePayConfig(employeeCode);
        const toHHMMSS = (value, def) => {
            if (!value && value !== 0)
                return def;
            if (typeof value === 'string') {
                const parts = value.split(':');
                const hh = parts[0]?.padStart(2, '0') || '00';
                const mm = (parts[1] || '00').padStart(2, '0');
                const ss = (parts[2] || '00').padStart(2, '0');
                return `${hh}:${mm}:${ss}`;
            }
            if (value instanceof Date) {
                const hh = String(value.getHours()).padStart(2, '0');
                const mm = String(value.getMinutes()).padStart(2, '0');
                const ss = String(value.getSeconds()).padStart(2, '0');
                return `${hh}:${mm}:${ss}`;
            }
            const str = String(value);
            const parts = str.split(':');
            const hh = parts[0]?.padStart(2, '0') || '00';
            const mm = (parts[1] || '00').padStart(2, '0');
            const ss = (parts[2] || '00').padStart(2, '0');
            return `${hh}:${mm}:${ss}`;
        };
        if (!config) {
            // Fallback to site default config if employee-specific config not found
            const siteDefault = await payConfigService_1.payConfigService.getSitePayConfig('MSS_DEFAULT');
            if (siteDefault) {
                const fallback = {
                    employee_code: employeeCode,
                    pay_type: 'Hourly',
                    hourly_rate_regular: siteDefault.default_hourly_rate,
                    weekday_ot_rate_type: 'multiplier',
                    hourly_rate_weekday_ot: null,
                    weekday_ot_multiplier: siteDefault.default_weekday_ot_multiplier,
                    weekend_ot_rate_type: 'multiplier',
                    hourly_rate_weekend_ot: null,
                    weekend_ot_multiplier: siteDefault.default_weekend_ot_multiplier,
                    week_start: siteDefault.week_start,
                    weekend_days: siteDefault.weekend_days,
                    workday_start: toHHMMSS(siteDefault.workday_start, '09:00:00'),
                    workday_end: toHHMMSS(siteDefault.workday_end, '17:00:00'),
                    ot_start_time_on_workdays: toHHMMSS(siteDefault.ot_start_time_on_workdays, '17:00:00'),
                    minimum_daily_hours_for_pay: 6.0,
                };
                return res.json({
                    success: true,
                    data: fallback,
                });
            }
            return res.status(404).json({
                success: false,
                message: 'Pay configuration not found for this employee',
            });
        }
        // Normalize time fields for employee config
        const normalized = {
            ...config,
            workday_start: toHHMMSS(config.workday_start, '09:00:00'),
            workday_end: toHHMMSS(config.workday_end, '17:00:00'),
            ot_start_time_on_workdays: toHHMMSS(config.ot_start_time_on_workdays, '17:00:00'),
        };
        return res.json({ success: true, data: normalized });
        res.json({
            success: true,
            data: config,
        });
    }
    catch (error) {
        console.error('Error getting pay config:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
});
/**
 * POST /api/overtime/config/:employeeCode
 * Update employee pay configuration
 * Accessible by: Admin, Supervisor only
 */
router.post('/config/:employeeCode', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN, user_1.UserRole.SUPERVISOR), async (req, res) => {
    try {
        const { employeeCode } = req.params;
        // Debug: log incoming payload
        const { pay_type, hourly_rate_regular, weekday_ot_rate_type, hourly_rate_weekday_ot, weekday_ot_multiplier, weekend_ot_rate_type, hourly_rate_weekend_ot, weekend_ot_multiplier, week_start, weekend_days, workday_start, workday_end, ot_start_time_on_workdays, minimum_daily_hours_for_pay } = req.body || {};
        const toHHMMSS = (value) => {
            if (value === undefined || value === null)
                return undefined;
            const str = String(value);
            if (!str)
                return undefined;
            const parts = str.split(':');
            const hh = String(parseInt(parts[0], 10) || 0).padStart(2, '0');
            const mm = String(parseInt(parts[1], 10) || 0).padStart(2, '0');
            const ss = parts.length > 2 ? String(parseInt(parts[2], 10) || 0).padStart(2, '0') : '00';
            return `${hh}:${mm}:${ss}`;
        };
        const normalizedTimes = {
            workday_start: toHHMMSS(workday_start),
            workday_end: toHHMMSS(workday_end),
            ot_start_time_on_workdays: toHHMMSS(ot_start_time_on_workdays),
        };
        const updateRequest = {
            ...req.body,
            ...normalizedTimes,
            employee_code: employeeCode,
        };
        console.log('Overtime POST /config payload', {
            employeeCode,
            updateRequest,
        });
        const config = await payConfigService_1.payConfigService.updateEmployeeRates(updateRequest);
        res.json({
            success: true,
            message: 'Pay configuration updated successfully',
            data: config,
        });
    }
    catch (error) {
        console.error('Error updating pay config:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
});
/**
 * GET /api/overtime/config
 * Get all employee pay configurations
 * Accessible by: Admin, Supervisor only
 */
router.get('/config', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN, user_1.UserRole.SUPERVISOR), async (req, res) => {
    try {
        const configs = await payConfigService_1.payConfigService.getAllEmployeePayConfigs();
        res.json({
            success: true,
            data: configs,
        });
    }
    catch (error) {
        console.error('Error getting all pay configs:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
});
// ============================================================
// Workweek Settings Endpoints
// ============================================================
/**
 * POST /api/overtime/settings/workweek
 * Update workweek settings (for employee or site)
 * Accessible by: Admin, Supervisor only
 */
router.post('/settings/workweek', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN, user_1.UserRole.SUPERVISOR), async (req, res) => {
    try {
        const request = req.body;
        await payConfigService_1.payConfigService.updateWorkweekSettings(request);
        res.json({
            success: true,
            message: 'Workweek settings updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating workweek settings:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
});
// ============================================================
// Calculation Endpoints
// ============================================================
/**
 * POST /api/overtime/calculate
 * Calculate timesheets for date range
 * Accessible by: Admin, Supervisor only
 */
router.post('/calculate', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN, user_1.UserRole.SUPERVISOR), async (req, res) => {
    try {
        const calculationRequest = req.body;
        // Validate request
        if (!calculationRequest.from_date || !calculationRequest.to_date) {
            return res.status(400).json({
                success: false,
                message: 'from_date and to_date are required',
            });
        }
        const result = await timesheetService_1.timesheetService.calculateTimesheets(calculationRequest);
        res.json({
            success: result.success,
            message: result.message,
            data: {
                days_calculated: result.days_calculated,
                days_failed: result.days_failed,
                errors: result.errors,
            },
        });
    }
    catch (error) {
        console.error('Error calculating timesheets:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
});
/**
 * POST /api/overtime/calculate/:employeeCode
 * Calculate timesheets for specific employee
 * Accessible by: Admin, Supervisor only
 */
router.post('/calculate/:employeeCode', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN, user_1.UserRole.SUPERVISOR), async (req, res) => {
    try {
        const { employeeCode } = req.params;
        const { from_date, to_date, force_recalculate } = req.body;
        if (!from_date || !to_date) {
            return res.status(400).json({
                success: false,
                message: 'from_date and to_date are required',
            });
        }
        const calculationRequest = {
            employee_code: employeeCode,
            from_date,
            to_date,
            force_recalculate,
        };
        const result = await timesheetService_1.timesheetService.calculateTimesheets(calculationRequest);
        res.json({
            success: result.success,
            message: result.message,
            data: {
                days_calculated: result.days_calculated,
                days_failed: result.days_failed,
                errors: result.errors,
            },
        });
    }
    catch (error) {
        console.error('Error calculating timesheets:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
});
// ============================================================
// Weekly Report Endpoints
// ============================================================
/**
 * GET /api/overtime/reports/weekly
 * Get weekly report
 * Accessible by: Admin, Supervisor (all), Employee (own only)
 */
router.get('/reports/weekly', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { employee_code, from_date, to_date } = req.query;
        // Validate dates
        if (!from_date || !to_date) {
            return res.status(400).json({
                success: false,
                message: 'from_date and to_date query parameters are required',
            });
        }
        let targetEmployeeCode;
        // Authorization logic
        if (user.role === 'admin' || user.role === 'supervisor') {
            // Admin/Supervisor can view any employee or all employees
            targetEmployeeCode = employee_code;
        }
        else {
            // Employee can only view own data
            targetEmployeeCode = user.employee_code;
        }
        const reportRequest = {
            employee_code: targetEmployeeCode,
            from_date: from_date,
            to_date: to_date,
            include_daily_breakdown: true,
        };
        const reports = await weeklyReportService_1.weeklyReportService.generateWeeklyReport(reportRequest);
        res.json({
            success: true,
            data: reports,
        });
    }
    catch (error) {
        console.error('Error generating weekly report:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
});
/**
 * GET /api/overtime/reports/weekly/export
 * Export weekly report to Excel
 * Accessible by: Admin, Supervisor (all), Employee (own only)
 */
router.get('/reports/weekly/export', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { employee_code, from_date, to_date } = req.query;
        // Validate dates
        if (!from_date || !to_date) {
            return res.status(400).json({
                success: false,
                message: 'from_date and to_date query parameters are required',
            });
        }
        let targetEmployeeCode;
        // Authorization logic
        if (user.role === 'admin' || user.role === 'supervisor') {
            targetEmployeeCode = employee_code;
        }
        else {
            targetEmployeeCode = user.employee_code;
        }
        const reportRequest = {
            employee_code: targetEmployeeCode,
            from_date: from_date,
            to_date: to_date,
            include_daily_breakdown: true,
        };
        const buffer = await weeklyReportService_1.weeklyReportService.exportWeeklyReportToExcel(reportRequest);
        // Set headers for file download
        const filename = `Weekly_Overtime_Report_${from_date}_to_${to_date}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
    catch (error) {
        console.error('Error exporting weekly report:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
});
/**
 * GET /api/overtime/timesheet/:employeeCode
 * Get timesheet days for an employee
 * Accessible by: Admin, Supervisor (all), Employee (own only)
 */
router.get('/timesheet/:employeeCode', auth_1.authenticateToken, async (req, res) => {
    try {
        const { employeeCode } = req.params;
        const { from_date, to_date } = req.query;
        const user = req.user;
        // Authorization
        if (user.role !== 'admin' &&
            user.role !== 'supervisor' &&
            user.employee_code !== employeeCode) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this timesheet',
            });
        }
        if (!from_date || !to_date) {
            return res.status(400).json({
                success: false,
                message: 'from_date and to_date query parameters are required',
            });
        }
        const days = await timesheetService_1.timesheetService.getTimesheetDays(employeeCode, new Date(from_date), new Date(to_date));
        res.json({
            success: true,
            data: days,
        });
    }
    catch (error) {
        console.error('Error getting timesheet days:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
});
router.get('/punches/:employeeCode', auth_1.authenticateToken, async (req, res) => {
    try {
        const { employeeCode } = req.params;
        const { from_date, to_date } = req.query;
        if (!from_date || !to_date) {
            return res.status(400).json({ success: false, message: 'from_date and to_date are required' });
        }
        const punches = await timesheetService_1.timesheetService.getPunchRecordsRange(employeeCode, new Date(from_date), new Date(to_date));
        res.json({ success: true, data: punches });
    }
    catch (error) {
        console.error('Error getting punches:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});
exports.default = router;

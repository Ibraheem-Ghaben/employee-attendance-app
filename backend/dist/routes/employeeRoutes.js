"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employeeProfileService_1 = require("../services/employeeProfileService");
const auth_1 = require("../middleware/auth");
const user_1 = require("../types/user");
const router = (0, express_1.Router)();
const employeeProfileService = new employeeProfileService_1.EmployeeProfileService();
/**
 * GET /api/employees
 * Get all attendance records with pagination and optional filtering
 * Query params:
 *   - page (default: 1)
 *   - pageSize (default: 50)
 *   - employee_code (optional)
 *   - start_date (optional)
 *   - end_date (optional)
 * Protected: Admin and Supervisor only
 */
router.get('/employees', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN, user_1.UserRole.SUPERVISOR), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 50;
        const employeeCode = req.query.employee_code;
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;
        const employeeName = req.query.employee_name;
        const site = req.query.site;
        const inOutMode = req.query.in_out_mode;
        // Validate parameters
        if (page < 1) {
            return res.status(400).json({
                success: false,
                message: 'Page number must be greater than 0',
            });
        }
        if (pageSize < 1 || pageSize > 500) {
            return res.status(400).json({
                success: false,
                message: 'Page size must be between 1 and 500',
            });
        }
        const result = await employeeProfileService.getAllAttendanceRecords(page, pageSize, employeeCode, startDate, endDate, employeeName, site, inOutMode);
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error('Error in /api/employees:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/sites
 * Get unique sites from MSS_TA database
 * Protected: Admin and Supervisor only
 */
router.get('/sites', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN, user_1.UserRole.SUPERVISOR), async (req, res) => {
    try {
        const sites = await employeeProfileService.getUniqueSites();
        res.json({
            success: true,
            data: sites,
        });
    }
    catch (error) {
        console.error('Error in /api/sites:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/statistics
 * Get dashboard statistics from MSS_TA database
 * Protected: Admin and Supervisor only
 */
router.get('/statistics', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN, user_1.UserRole.SUPERVISOR), async (req, res) => {
    try {
        const employeeCode = req.query.employee_code;
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;
        const stats = await employeeProfileService.getDashboardStatistics(employeeCode, startDate, endDate);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error('Error in /api/statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;

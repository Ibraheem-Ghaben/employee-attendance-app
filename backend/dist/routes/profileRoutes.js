"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const employeeProfileService_1 = require("../services/employeeProfileService");
const user_1 = require("../types/user");
const router = (0, express_1.Router)();
const profileService = new employeeProfileService_1.EmployeeProfileService();
/**
 * GET /api/profile/my-profile
 * Get current user's profile
 */
router.get('/my-profile', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user?.employee_code) {
            return res.status(400).json({
                success: false,
                message: 'User does not have an associated employee code',
            });
        }
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;
        const profileData = await profileService.getEmployeeProfileComplete(req.user.employee_code, startDate, endDate);
        if (!profileData) {
            return res.status(404).json({
                success: false,
                message: 'Employee profile not found',
            });
        }
        res.json({
            success: true,
            ...profileData,
        });
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
/**
 * GET /api/profile/:employeeCode
 * Get employee profile by code (with authorization check)
 */
router.get('/:employeeCode', auth_1.authenticateToken, auth_1.authorizeOwnDataOrAdmin, async (req, res) => {
    try {
        const employeeCode = req.params.employeeCode;
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;
        const profileData = await profileService.getEmployeeProfileComplete(employeeCode, startDate, endDate);
        if (!profileData) {
            return res.status(404).json({
                success: false,
                message: 'Employee profile not found',
            });
        }
        res.json({
            success: true,
            ...profileData,
        });
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
/**
 * GET /api/profile/list/all
 * Get all employees (Admin/Supervisor only)
 */
router.get('/list/all', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN, user_1.UserRole.SUPERVISOR), async (req, res) => {
    try {
        const employees = await profileService.getAllEmployees();
        res.json({
            success: true,
            employees,
            total: employees.length,
        });
    }
    catch (error) {
        console.error('Error fetching all employees:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
exports.default = router;

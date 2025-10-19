"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const userProfileService_1 = require("../services/userProfileService");
const user_1 = require("../types/user");
const router = (0, express_1.Router)();
const userProfileService = new userProfileService_1.UserProfileService();
/**
 * GET /api/profile/my-profile
 * Get current user's profile from LOCAL database
 */
router.get('/my-profile', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user?.username) {
            return res.status(400).json({
                success: false,
                message: 'User information missing',
            });
        }
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;
        // Get user profile from LOCAL database
        const profileData = await userProfileService.getUserProfile(req.user.username);
        if (!profileData) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found',
            });
        }
        // Get attendance records from MSS_TA if employee_code exists
        let attendanceRecords = [];
        if (profileData.profile.employee_code) {
            attendanceRecords = await userProfileService.getUserAttendanceRecords(profileData.profile.employee_code, startDate, endDate);
        }
        res.json({
            success: true,
            profile: profileData.profile,
            statistics: profileData.attendanceStatistics,
            attendanceRecords: attendanceRecords,
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
 * Get user profile by employee code from LOCAL database
 */
router.get('/:employeeCode', auth_1.authenticateToken, auth_1.authorizeOwnDataOrAdmin, async (req, res) => {
    try {
        const employeeCode = req.params.employeeCode;
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;
        // Get user profile from LOCAL database
        const profileData = await userProfileService.getUserProfileByEmployeeCode(employeeCode);
        if (!profileData) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found',
            });
        }
        // Get attendance records from MSS_TA
        const attendanceRecords = await userProfileService.getUserAttendanceRecords(employeeCode, startDate, endDate);
        res.json({
            success: true,
            profile: profileData.profile,
            statistics: profileData.attendanceStatistics,
            attendanceRecords: attendanceRecords,
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
 * Get all users from LOCAL database (Admin only)
 */
router.get('/list/all', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { AuthService } = await Promise.resolve().then(() => __importStar(require('../services/authService')));
        const authService = new AuthService();
        const users = await authService.getAllUsers();
        res.json({
            success: true,
            users,
            total: users.length,
        });
    }
    catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
exports.default = router;

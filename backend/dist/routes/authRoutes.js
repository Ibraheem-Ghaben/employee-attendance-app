"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authService_1 = require("../services/authService");
const auth_1 = require("../middleware/auth");
const user_1 = require("../types/user");
const router = (0, express_1.Router)();
const authService = new authService_1.AuthService();
/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required',
            });
        }
        const result = await authService.login(username, password);
        if (!result.success) {
            return res.status(401).json(result);
        }
        res.json(result);
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
/**
 * POST /api/auth/register
 * Create new user (Admin only)
 */
router.post('/register', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { username, password, employee_code, role, full_name, email } = req.body;
        if (!username || !password || !role || !full_name) {
            return res.status(400).json({
                success: false,
                message: 'Username, password, role, and full name are required',
            });
        }
        const result = await authService.createUser(username, password, employee_code || null, role, full_name, email || null);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user,
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
/**
 * GET /api/auth/users
 * Get all users (Admin only)
 */
router.get('/users', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN), async (req, res) => {
    try {
        const users = await authService.getAllUsers();
        res.json({
            success: true,
            users,
        });
    }
    catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
/**
 * PUT /api/auth/users/:userId/status
 * Update user status (Admin only)
 */
router.put('/users/:userId/status', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { is_active } = req.body;
        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'is_active field is required and must be boolean',
            });
        }
        const result = await authService.updateUserStatus(userId, is_active);
        res.json(result);
    }
    catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
/**
 * PUT /api/auth/users/:userId
 * Update user fields (Admin only)
 */
router.put('/users/:userId', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { username, employee_code, role, full_name, email, is_active } = req.body;
        const result = await authService.updateUser(userId, { username, employee_code, role, full_name, email, is_active });
        res.json(result);
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
/**
 * PUT /api/auth/users/:userId/password
 * Update user password (Admin only)
 */
router.put('/users/:userId/password', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(user_1.UserRole.ADMIN), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }
        const result = await authService.updateUserPassword(userId, password);
        res.json(result);
    }
    catch (error) {
        console.error('Update user password error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeOwnDataOrAdmin = exports.authorizeRoles = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = require("../types/user");
/**
 * Middleware to verify JWT token
 */
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
            return;
        }
        const jwtSecret = process.env.JWT_SECRET || 'default_secret';
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(403).json({
            success: false,
            message: 'Invalid or expired token.',
        });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Middleware to check if user has required role
 */
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated.',
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: `Access denied. Required roles: ${roles.join(', ')}`,
            });
            return;
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
/**
 * Middleware to check if user is accessing their own data or is admin/supervisor
 */
const authorizeOwnDataOrAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'User not authenticated.',
        });
        return;
    }
    const requestedEmployeeCode = req.params.employeeCode || req.query.employee_code;
    // Admin and Supervisor can access any data
    if (req.user.role === user_1.UserRole.ADMIN || req.user.role === user_1.UserRole.SUPERVISOR) {
        next();
        return;
    }
    // Employee can only access their own data
    if (req.user.employee_code === requestedEmployeeCode) {
        next();
        return;
    }
    res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own data.',
    });
};
exports.authorizeOwnDataOrAdmin = authorizeOwnDataOrAdmin;

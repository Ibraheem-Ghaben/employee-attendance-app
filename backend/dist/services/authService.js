"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const localDatabase_1 = require("../config/localDatabase");
class AuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'default_secret';
        this.jwtExpire = process.env.JWT_EXPIRE || '7d';
    }
    /**
     * Login user
     */
    async login(username, password) {
        try {
            const pool = await (0, localDatabase_1.getLocalConnection)();
            console.log('username', username);
            console.log('password', password);
            // Get user from database
            const result = await pool
                .request()
                .input('username', localDatabase_1.sql.VarChar, username)
                .query(`
          SELECT 
            id, username, password, employee_code, role, 
            full_name, email, is_active
          FROM [dbo].[Users]
          WHERE username = @username
        `);
            if (result.recordset.length === 0) {
                return {
                    success: false,
                    user: {},
                    token: '',
                    message: 'Invalid username or password',
                };
            }
            const user = result.recordset[0];
            // Check if user is active
            if (!user.is_active) {
                return {
                    success: false,
                    user: {},
                    token: '',
                    message: 'Account is disabled',
                };
            }
            // Verify password
            const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
            if (!isValidPassword) {
                return {
                    success: false,
                    user: {},
                    token: '',
                    message: 'Invalid username or password',
                };
            }
            // Update last login
            await pool
                .request()
                .input('userId', localDatabase_1.sql.Int, user.id)
                .query(`
          UPDATE [dbo].[Users] 
          SET last_login = GETDATE() 
          WHERE id = @userId
        `);
            // Create user response (without password)
            const userResponse = {
                id: user.id,
                username: user.username,
                employee_code: user.employee_code,
                role: user.role,
                full_name: user.full_name,
                email: user.email,
                is_active: user.is_active,
            };
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign(userResponse, this.jwtSecret, { expiresIn: this.jwtExpire });
            return {
                success: true,
                user: userResponse,
                token: token,
                message: 'Login successful',
            };
        }
        catch (error) {
            console.error('Login error:', error);
            throw new Error('Login failed');
        }
    }
    /**
     * Create new user (Admin only)
     */
    async createUser(username, password, employeeCode, role, fullName, email) {
        try {
            const pool = await (0, localDatabase_1.getLocalConnection)();
            // Check if username already exists
            const existingUser = await pool
                .request()
                .input('username', localDatabase_1.sql.VarChar, username)
                .query('SELECT id FROM [dbo].[Users] WHERE username = @username');
            if (existingUser.recordset.length > 0) {
                return {
                    success: false,
                    message: 'Username already exists',
                };
            }
            // Hash password
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            // Insert user
            const result = await pool
                .request()
                .input('username', localDatabase_1.sql.VarChar, username)
                .input('password', localDatabase_1.sql.VarChar, hashedPassword)
                .input('employee_code', localDatabase_1.sql.VarChar, employeeCode)
                .input('role', localDatabase_1.sql.VarChar, role)
                .input('full_name', localDatabase_1.sql.NVarChar, fullName)
                .input('email', localDatabase_1.sql.VarChar, email)
                .query(`
          INSERT INTO [dbo].[Users] 
            (username, password, employee_code, role, full_name, email, is_active, created_at)
          VALUES 
            (@username, @password, @employee_code, @role, @full_name, @email, 1, GETDATE());
          SELECT SCOPE_IDENTITY() AS id;
        `);
            const userId = result.recordset[0].id;
            return {
                success: true,
                message: 'User created successfully',
                userId: userId,
            };
        }
        catch (error) {
            console.error('Create user error:', error);
            throw new Error('Failed to create user');
        }
    }
    /**
     * Get all users (Admin only)
     */
    async getAllUsers() {
        try {
            const pool = await (0, localDatabase_1.getLocalConnection)();
            const result = await pool.request().query(`
        SELECT 
          id, username, employee_code, role, 
          full_name, email, is_active
        FROM [dbo].[Users]
        ORDER BY created_at DESC
      `);
            return result.recordset;
        }
        catch (error) {
            console.error('Get all users error:', error);
            throw new Error('Failed to fetch users');
        }
    }
    /**
     * Update user status (Admin only)
     */
    async updateUserStatus(userId, isActive) {
        try {
            const pool = await (0, localDatabase_1.getLocalConnection)();
            await pool
                .request()
                .input('userId', localDatabase_1.sql.Int, userId)
                .input('isActive', localDatabase_1.sql.Bit, isActive)
                .query(`
          UPDATE [dbo].[Users] 
          SET is_active = @isActive 
          WHERE id = @userId
        `);
            return {
                success: true,
                message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            };
        }
        catch (error) {
            console.error('Update user status error:', error);
            throw new Error('Failed to update user status');
        }
    }
}
exports.AuthService = AuthService;

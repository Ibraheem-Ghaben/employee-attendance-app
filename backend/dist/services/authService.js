"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const localDatabase_1 = require("../config/localDatabase");
const user_1 = require("../types/user");
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
            // Get user by username
            let result = await pool
                .request()
                .input('username', localDatabase_1.sql.VarChar, username)
                .query(`
          SELECT 
            id, username, password, employee_code, role, 
            full_name, email, is_active
          FROM [dbo].[Users]
          WHERE username = @username
        `);
            // If not found, try by employee_code (allow login with employee code)
            if (result.recordset.length === 0) {
                result = await pool
                    .request()
                    .input('employeeCode', localDatabase_1.sql.VarChar, username)
                    .query(`
            SELECT 
              id, username, password, employee_code, role, 
              full_name, email, is_active
            FROM [dbo].[Users]
            WHERE employee_code = @employeeCode
          `);
                if (result.recordset.length === 0) {
                    return {
                        success: false,
                        user: {},
                        token: '',
                        message: 'Invalid username or password',
                    };
                }
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
    /**
     * Update user fields (Admin only)
     */
    async updateUser(userId, fields) {
        try {
            const pool = await (0, localDatabase_1.getLocalConnection)();
            const sanitized = {};
            if (fields.username !== undefined) {
                const username = fields.username?.trim();
                if (!username) {
                    return { success: false, message: 'Username is required' };
                }
                const usernameExists = await pool
                    .request()
                    .input('username', localDatabase_1.sql.VarChar, username)
                    .input('userId', localDatabase_1.sql.Int, userId)
                    .query('SELECT id FROM [dbo].[Users] WHERE username = @username AND id <> @userId');
                if (usernameExists.recordset.length > 0) {
                    return { success: false, message: 'Username already exists' };
                }
                sanitized.username = username;
            }
            if (fields.employee_code !== undefined) {
                const employeeCode = fields.employee_code?.trim() || null;
                if (employeeCode) {
                    const employeeCodeExists = await pool
                        .request()
                        .input('employee_code', localDatabase_1.sql.VarChar, employeeCode)
                        .input('userId', localDatabase_1.sql.Int, userId)
                        .query('SELECT id FROM [dbo].[Users] WHERE employee_code = @employee_code AND id <> @userId');
                    if (employeeCodeExists.recordset.length > 0) {
                        return { success: false, message: 'Employee code already exists' };
                    }
                    sanitized.employee_code = employeeCode;
                }
                else {
                    sanitized.employee_code = null;
                }
            }
            if (fields.role !== undefined) {
                const role = fields.role;
                if (!Object.values(user_1.UserRole).includes(role)) {
                    return { success: false, message: 'Invalid role specified' };
                }
                sanitized.role = role;
            }
            if (fields.full_name !== undefined) {
                const fullName = fields.full_name?.trim();
                if (!fullName) {
                    return { success: false, message: 'Full name is required' };
                }
                sanitized.full_name = fullName;
            }
            if (fields.email !== undefined) {
                const email = fields.email?.trim() || null;
                sanitized.email = email;
            }
            if (fields.is_active !== undefined) {
                sanitized.is_active = fields.is_active;
            }
            const keys = Object.keys(sanitized);
            if (keys.length === 0) {
                return { success: true, message: 'No changes provided' };
            }
            const request = pool.request().input('userId', localDatabase_1.sql.Int, userId);
            const sets = [];
            if (sanitized.username !== undefined) {
                request.input('username', localDatabase_1.sql.VarChar, sanitized.username);
                sets.push('username = @username');
            }
            if (sanitized.employee_code !== undefined) {
                request.input('employee_code', localDatabase_1.sql.VarChar, sanitized.employee_code);
                sets.push('employee_code = @employee_code');
            }
            if (sanitized.role !== undefined) {
                request.input('role', localDatabase_1.sql.VarChar, sanitized.role);
                sets.push('role = @role');
            }
            if (sanitized.full_name !== undefined) {
                request.input('full_name', localDatabase_1.sql.NVarChar, sanitized.full_name);
                sets.push('full_name = @full_name');
            }
            if (sanitized.email !== undefined) {
                request.input('email', localDatabase_1.sql.VarChar, sanitized.email);
                sets.push('email = @email');
            }
            if (sanitized.is_active !== undefined) {
                request.input('is_active', localDatabase_1.sql.Bit, sanitized.is_active);
                sets.push('is_active = @is_active');
            }
            const setClause = sets.join(', ');
            await request.query(`UPDATE [dbo].[Users] SET ${setClause} WHERE id = @userId`);
            return { success: true, message: 'User updated successfully' };
        }
        catch (error) {
            console.error('Update user error:', error);
            throw new Error('Failed to update user');
        }
    }
    /**
     * Update user password (Admin only)
     */
    async updateUserPassword(userId, newPassword) {
        try {
            const pool = await (0, localDatabase_1.getLocalConnection)();
            const hashed = await bcryptjs_1.default.hash(newPassword, 10);
            await pool.request()
                .input('userId', localDatabase_1.sql.Int, userId)
                .input('password', localDatabase_1.sql.VarChar, hashed)
                .query('UPDATE [dbo].[Users] SET password = @password WHERE id = @userId');
            return { success: true, message: 'Password updated successfully' };
        }
        catch (error) {
            console.error('Update user password error:', error);
            throw new Error('Failed to update user password');
        }
    }
}
exports.AuthService = AuthService;

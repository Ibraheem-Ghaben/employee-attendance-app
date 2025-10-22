import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getLocalConnection, sql } from '../config/localDatabase';
import { User, UserResponse, UserRole, LoginResponse } from '../types/user';

export class AuthService {
  private jwtSecret: string;
  private jwtExpire: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default_secret';
    this.jwtExpire = process.env.JWT_EXPIRE || '7d';
  }

  /**
   * Login user
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const pool = await getLocalConnection();
      console.log('username', username);
      console.log('password', password);
      // Get user by username
      let result = await pool
        .request()
        .input('username', sql.VarChar, username)
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
          .input('employeeCode', sql.VarChar, username)
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
            user: {} as UserResponse,
            token: '',
            message: 'Invalid username or password',
          };
        }
      }

      const user = result.recordset[0] as User;

      // Check if user is active
      if (!user.is_active) {
        return {
          success: false,
          user: {} as UserResponse,
          token: '',
          message: 'Account is disabled',
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return {
          success: false,
          user: {} as UserResponse,
          token: '',
          message: 'Invalid username or password',
        };
      }

      // Update last login
      await pool
        .request()
        .input('userId', sql.Int, user.id)
        .query(`
          UPDATE [dbo].[Users] 
          SET last_login = GETDATE() 
          WHERE id = @userId
        `);

      // Create user response (without password)
      const userResponse: UserResponse = {
        id: user.id,
        username: user.username,
        employee_code: user.employee_code,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
        is_active: user.is_active,
      };

      // Generate JWT token
      const token = jwt.sign(
        userResponse,
        this.jwtSecret,
        { expiresIn: this.jwtExpire } as jwt.SignOptions
      );

      return {
        success: true,
        user: userResponse,
        token: token,
        message: 'Login successful',
      };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Login failed');
    }
  }

  /**
   * Create new user (Admin only)
   */
  async createUser(
    username: string,
    password: string,
    employeeCode: string | null,
    role: UserRole,
    fullName: string,
    email: string | null
  ): Promise<{ success: boolean; message: string; userId?: number }> {
    try {
      const pool = await getLocalConnection();

      // Check if username already exists
      const existingUser = await pool
        .request()
        .input('username', sql.VarChar, username)
        .query('SELECT id FROM [dbo].[Users] WHERE username = @username');

      if (existingUser.recordset.length > 0) {
        return {
          success: false,
          message: 'Username already exists',
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      const result = await pool
        .request()
        .input('username', sql.VarChar, username)
        .input('password', sql.VarChar, hashedPassword)
        .input('employee_code', sql.VarChar, employeeCode)
        .input('role', sql.VarChar, role)
        .input('full_name', sql.NVarChar, fullName)
        .input('email', sql.VarChar, email)
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
    } catch (error) {
      console.error('Create user error:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Get all users (Admin only)
   */
  async getAllUsers(): Promise<UserResponse[]> {
    try {
      const pool = await getLocalConnection();
      
      const result = await pool.request().query(`
        SELECT 
          id, username, employee_code, role, 
          full_name, email, is_active
        FROM [dbo].[Users]
        ORDER BY created_at DESC
      `);

      return result.recordset as UserResponse[];
    } catch (error) {
      console.error('Get all users error:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Update user status (Admin only)
   */
  async updateUserStatus(
    userId: number,
    isActive: boolean
  ): Promise<{ success: boolean; message: string }> {
    try {
      const pool = await getLocalConnection();
      
      await pool
        .request()
        .input('userId', sql.Int, userId)
        .input('isActive', sql.Bit, isActive)
        .query(`
          UPDATE [dbo].[Users] 
          SET is_active = @isActive 
          WHERE id = @userId
        `);

      return {
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      };
    } catch (error) {
      console.error('Update user status error:', error);
      throw new Error('Failed to update user status');
    }
  }

  /**
   * Update user fields (Admin only)
   */
  async updateUser(
    userId: number,
    fields: Partial<Pick<User, 'username' | 'employee_code' | 'role' | 'full_name' | 'email' | 'is_active'>>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const pool = await getLocalConnection();

      type UpdatableFields = {
        username?: string;
        employee_code?: string | null;
        role?: UserRole;
        full_name?: string;
        email?: string | null;
        is_active?: boolean;
      };

      const sanitized: UpdatableFields = {};

      if (fields.username !== undefined) {
        const username = fields.username?.trim();
        if (!username) {
          return { success: false, message: 'Username is required' };
        }

        const usernameExists = await pool
          .request()
          .input('username', sql.VarChar, username)
          .input('userId', sql.Int, userId)
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
            .input('employee_code', sql.VarChar, employeeCode)
            .input('userId', sql.Int, userId)
            .query('SELECT id FROM [dbo].[Users] WHERE employee_code = @employee_code AND id <> @userId');

          if (employeeCodeExists.recordset.length > 0) {
            return { success: false, message: 'Employee code already exists' };
          }

          sanitized.employee_code = employeeCode;
        } else {
          sanitized.employee_code = null;
        }
      }

      if (fields.role !== undefined) {
        const role = fields.role;
        if (!Object.values(UserRole).includes(role as UserRole)) {
          return { success: false, message: 'Invalid role specified' };
        }
        sanitized.role = role as UserRole;
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

      const keys = Object.keys(sanitized) as (keyof UpdatableFields)[];

      if (keys.length === 0) {
        return { success: true, message: 'No changes provided' };
      }

      const request = pool.request().input('userId', sql.Int, userId);
      const sets: string[] = [];

      if (sanitized.username !== undefined) {
        request.input('username', sql.VarChar, sanitized.username);
        sets.push('username = @username');
      }
      if (sanitized.employee_code !== undefined) {
        request.input('employee_code', sql.VarChar, sanitized.employee_code);
        sets.push('employee_code = @employee_code');
      }
      if (sanitized.role !== undefined) {
        request.input('role', sql.VarChar, sanitized.role);
        sets.push('role = @role');
      }
      if (sanitized.full_name !== undefined) {
        request.input('full_name', sql.NVarChar, sanitized.full_name);
        sets.push('full_name = @full_name');
      }
      if (sanitized.email !== undefined) {
        request.input('email', sql.VarChar, sanitized.email);
        sets.push('email = @email');
      }
      if (sanitized.is_active !== undefined) {
        request.input('is_active', sql.Bit, sanitized.is_active);
        sets.push('is_active = @is_active');
      }

      const setClause = sets.join(', ');
      await request.query(`UPDATE [dbo].[Users] SET ${setClause} WHERE id = @userId`);

      return { success: true, message: 'User updated successfully' };
    } catch (error) {
      console.error('Update user error:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Update user password (Admin only)
   */
  async updateUserPassword(userId: number, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const pool = await getLocalConnection();
      const hashed = await bcrypt.hash(newPassword, 10);
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('password', sql.VarChar, hashed)
        .query('UPDATE [dbo].[Users] SET password = @password WHERE id = @userId');
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Update user password error:', error);
      throw new Error('Failed to update user password');
    }
  }
}


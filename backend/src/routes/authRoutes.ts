import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import { UserRole } from '../types/user';

const router = Router();
const authService = new AuthService();

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
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
  } catch (error) {
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
router.post(
  '/register',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const { username, password, employee_code, role, full_name, email } = req.body;

      if (!username || !password || !role || !full_name) {
        return res.status(400).json({
          success: false,
          message: 'Username, password, role, and full name are required',
        });
      }

      const result = await authService.createUser(
        username,
        password,
        employee_code || null,
        role,
        full_name,
        email || null
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
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
router.get(
  '/users',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const users = await authService.getAllUsers();
      
      res.json({
        success: true,
        users,
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * PUT /api/auth/users/:userId/status
 * Update user status (Admin only)
 */
router.put(
  '/users/:userId/status',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
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
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

export default router;


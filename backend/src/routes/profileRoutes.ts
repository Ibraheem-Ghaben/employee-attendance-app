import { Router, Response } from 'express';
import { authenticateToken, authorizeOwnDataOrAdmin, authorizeRoles, AuthRequest } from '../middleware/auth';
import { UserProfileService } from '../services/userProfileService';
import { UserRole } from '../types/user';

const router = Router();
const userProfileService = new UserProfileService();

/**
 * GET /api/profile/my-profile
 * Get current user's profile from LOCAL database
 */
router.get('/my-profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.username) {
      return res.status(400).json({
        success: false,
        message: 'User information missing',
      });
    }

    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

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
      attendanceRecords = await userProfileService.getUserAttendanceRecords(
        profileData.profile.employee_code,
        startDate,
        endDate
      );
    }

    res.json({
      success: true,
      profile: profileData.profile,
      statistics: profileData.attendanceStatistics,
      attendanceRecords: attendanceRecords,
    });
  } catch (error) {
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
router.get(
  '/:employeeCode',
  authenticateToken,
  authorizeOwnDataOrAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const employeeCode = req.params.employeeCode;
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      // Get user profile from LOCAL database
      const profileData = await userProfileService.getUserProfileByEmployeeCode(employeeCode);

      if (!profileData) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found',
        });
      }

      // Get attendance records from MSS_TA
      const attendanceRecords = await userProfileService.getUserAttendanceRecords(
        employeeCode,
        startDate,
        endDate
      );

      res.json({
        success: true,
        profile: profileData.profile,
        statistics: profileData.attendanceStatistics,
        attendanceRecords: attendanceRecords,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/profile/list/all
 * Get all users from LOCAL database (Admin only)
 */
router.get(
  '/list/all',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const { AuthService } = await import('../services/authService');
      const authService = new AuthService();
      const users = await authService.getAllUsers();

      res.json({
        success: true,
        users,
        total: users.length,
      });
    } catch (error) {
      console.error('Error fetching all users:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

export default router;


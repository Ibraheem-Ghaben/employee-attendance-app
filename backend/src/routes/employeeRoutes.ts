import { Router, Request, Response } from 'express';
import { EmployeeProfileService } from '../services/employeeProfileService';
import { syncService } from '../services/syncService';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import { UserRole } from '../types/user';
import { getLocalConnection } from '../config/localDatabase';

const router = Router();
const employeeProfileService = new EmployeeProfileService();

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
router.get(
  '/employees',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const employeeCode = req.query.employee_code as string;
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;
      const employeeName = req.query.employee_name as string;
      const site = req.query.site as string;
      const inOutMode = req.query.in_out_mode as string;

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

      const result = await employeeProfileService.getAllAttendanceRecords(
        page,
        pageSize,
        employeeCode,
        startDate,
        endDate,
        employeeName,
        site,
        inOutMode
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error in /api/employees:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/sites
 * Get unique sites from MSS_TA database
 * Protected: Admin and Supervisor only
 */
router.get(
  '/sites',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: AuthRequest, res: Response) => {
    try {
      const pool = await getLocalConnection();
      const result = await pool.request().query(`
        SELECT DISTINCT clock_description
        FROM dbo.SyncedAttendance
        WHERE clock_description IS NOT NULL AND clock_description <> ''
        ORDER BY clock_description
      `);

      res.json({
        success: true,
        data: result.recordset.map((row: any) => row.clock_description),
      });
    } catch (error) {
      console.error('Error in /api/sites:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/statistics
 * Get dashboard statistics from MSS_TA database
 * Protected: Admin and Supervisor only
 */
router.get(
  '/statistics',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: AuthRequest, res: Response) => {
    try {
      const employeeCode = req.query.employee_code as string;
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      const stats = await employeeProfileService.getDashboardStatistics(
        employeeCode,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error in /api/statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/sync-test
 * Test endpoint
 */
router.get('/sync-test', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Sync test route works!' });
});

/**
 * POST /api/sync
 * Sync attendance data from APIC server to local database
 * Protected: Admin only
 */
router.post(
  '/sync',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      console.log('[API] ✅ Sync endpoint HIT! Starting sync...');
      
      // Run sync and wait for it
      const result = await syncService.syncAttendanceData();
      
      console.log('[API] ✅ Sync completed:', result);
      
      res.json({
        success: true,
        message: result.message,
        recordsSynced: result.recordsSynced,
      });
    } catch (error: any) {
      console.error('[API] ❌ Sync error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to sync attendance data',
      });
    }
  }
);

/**
 * GET /api/employees/list
 * Get all employees for dropdowns and selectors
 * Protected: Admin and Supervisor only
 */
router.get(
  '/employees/list',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: AuthRequest, res: Response) => {
    try {
      const employees = await employeeProfileService.getAllEmployees();
      
      res.json({
        success: true,
        data: employees,
        total: employees.length,
      });
    } catch (error) {
      console.error('Error in /api/employees/list:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/employees/test
 * Test endpoint to check if employees can be fetched (no auth required for debugging)
 */
router.get('/employees/test', async (req: Request, res: Response) => {
  try {
    const employees = await employeeProfileService.getAllEmployees();
    res.json({
      success: true,
      data: employees,
      total: employees.length,
    });
  } catch (error) {
    console.error('Error in /api/employees/test:', error);
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
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;

import { Router, Response } from 'express';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth';
import { ExcelExportService } from '../services/excelExportService';
import { UserRole } from '../types/user';

const router = Router();
const exportService = new ExcelExportService();

/**
 * GET /api/export/attendance
 * Export attendance data to Excel
 * Query params: employee_code, start_date, end_date
 */
router.get('/attendance', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    let employeeCode = req.query.employee_code as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    // Employees can only export their own data
    if (req.user?.role === UserRole.EMPLOYEE) {
      if (!req.user.employee_code) {
        return res.status(400).json({
          success: false,
          message: 'User does not have an associated employee code',
        });
      }
      employeeCode = req.user.employee_code;
    }

    // Generate Excel file
    const buffer = await exportService.exportAttendanceToExcel(
      employeeCode,
      startDate,
      endDate
    );

    // Set response headers for Excel file download
    const filename = `attendance_${employeeCode || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.byteLength);

    res.send(buffer);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/export/my-attendance
 * Export current user's attendance data to Excel
 */
router.get('/my-attendance', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.employee_code) {
      return res.status(400).json({
        success: false,
        message: 'User does not have an associated employee code',
      });
    }

    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    const buffer = await exportService.exportAttendanceToExcel(
      req.user.employee_code,
      startDate,
      endDate
    );

    const filename = `my_attendance_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.byteLength);

    res.send(buffer);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
    });
  }
});

export default router;


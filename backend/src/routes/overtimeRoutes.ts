/**
 * Overtime Routes
 * API endpoints for overtime configuration, calculation, and reporting
 */

import express, { Request, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { UserRole } from '../types/user';
import { payConfigService } from '../services/payConfigService';
import { timesheetService } from '../services/timesheetService';
import { weeklyReportService } from '../services/weeklyReportService';
import {
  PayConfigUpdateRequest,
  WorkweekSettingsRequest,
  CalculationRequest,
  WeeklyReportRequest,
} from '../types/overtime';

const router = express.Router();

// ============================================================
// Pay Configuration Endpoints
// ============================================================

/**
 * GET /api/overtime/config/:employeeCode
 * Get employee pay configuration
 * Accessible by: Admin, Supervisor, or Employee (own config only)
 */
router.get('/config/:employeeCode', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { employeeCode } = req.params;
    const user = (req as any).user;

    // Authorization: Admin and Supervisor can view any, Employee can only view own
    if (
      user.role !== 'admin' &&
      user.role !== 'supervisor' &&
      user.employee_code !== employeeCode
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this configuration',
      });
    }

    const config = await payConfigService.getEmployeePayConfig(employeeCode);

    const toHHMMSS = (value: any, def: string): string => {
      if (!value && value !== 0) return def;
      if (typeof value === 'string') {
        const parts = value.split(':');
        const hh = parts[0]?.padStart(2, '0') || '00';
        const mm = (parts[1] || '00').padStart(2, '0');
        const ss = (parts[2] || '00').padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
      }
      if (value instanceof Date) {
        const hh = String(value.getHours()).padStart(2, '0');
        const mm = String(value.getMinutes()).padStart(2, '0');
        const ss = String(value.getSeconds()).padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
      }
      const str = String(value);
      const parts = str.split(':');
      const hh = parts[0]?.padStart(2, '0') || '00';
      const mm = (parts[1] || '00').padStart(2, '0');
      const ss = (parts[2] || '00').padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    };

    if (!config) {
      // Fallback to site default config if employee-specific config not found
      const siteDefault = await payConfigService.getSitePayConfig('MSS_DEFAULT');
      if (siteDefault) {
        const fallback = {
          employee_code: employeeCode,
          pay_type: 'Hourly',
          hourly_rate_regular: siteDefault.default_hourly_rate,
          weekday_ot_rate_type: 'multiplier',
          hourly_rate_weekday_ot: null,
          weekday_ot_multiplier: siteDefault.default_weekday_ot_multiplier,
          weekend_ot_rate_type: 'multiplier',
          hourly_rate_weekend_ot: null,
          weekend_ot_multiplier: siteDefault.default_weekend_ot_multiplier,
          week_start: siteDefault.week_start,
          weekend_days: siteDefault.weekend_days,
          workday_start: toHHMMSS((siteDefault as any).workday_start, '09:00:00'),
          workday_end: toHHMMSS((siteDefault as any).workday_end, '17:00:00'),
          ot_start_time_on_workdays: toHHMMSS((siteDefault as any).ot_start_time_on_workdays, '17:00:00'),
          minimum_daily_hours_for_pay: 6.0,
        } as any;

        return res.json({
          success: true,
          data: fallback,
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Pay configuration not found for this employee',
      });
    }

    // Normalize time fields for employee config
    const normalized = {
      ...config,
      workday_start: toHHMMSS((config as any).workday_start, '09:00:00'),
      workday_end: toHHMMSS((config as any).workday_end, '17:00:00'),
      ot_start_time_on_workdays: toHHMMSS((config as any).ot_start_time_on_workdays, '17:00:00'),
    } as any;

    return res.json({ success: true, data: normalized });

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error getting pay config:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/overtime/config/:employeeCode
 * Update employee pay configuration
 * Accessible by: Admin, Supervisor only
 */
router.post(
  '/config/:employeeCode',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response) => {
    try {
      const { employeeCode } = req.params;
      // Debug: log incoming payload
      const { pay_type, hourly_rate_regular, weekday_ot_rate_type, hourly_rate_weekday_ot, weekday_ot_multiplier, weekend_ot_rate_type, hourly_rate_weekend_ot, weekend_ot_multiplier, week_start, weekend_days, workday_start, workday_end, ot_start_time_on_workdays, minimum_daily_hours_for_pay } = req.body || {};

      const toHHMMSS = (value: unknown): string | undefined => {
        if (value === undefined || value === null) return undefined;
        const str = String(value);
        if (!str) return undefined;
        const parts = str.split(':');
        const hh = String(parseInt(parts[0], 10) || 0).padStart(2, '0');
        const mm = String(parseInt(parts[1], 10) || 0).padStart(2, '0');
        const ss = parts.length > 2 ? String(parseInt(parts[2], 10) || 0).padStart(2, '0') : '00';
        return `${hh}:${mm}:${ss}`;
      };

      const normalizedTimes: Partial<PayConfigUpdateRequest> = {
        workday_start: toHHMMSS(workday_start),
        workday_end: toHHMMSS(workday_end),
        ot_start_time_on_workdays: toHHMMSS(ot_start_time_on_workdays),
      };

      const updateRequest: PayConfigUpdateRequest = {
        ...req.body,
        ...normalizedTimes,
        employee_code: employeeCode,
      };

      console.log('Overtime POST /config payload', {
        employeeCode,
        updateRequest,
      });

      const config = await payConfigService.updateEmployeeRates(updateRequest);

      res.json({
        success: true,
        message: 'Pay configuration updated successfully',
        data: config,
      });
    } catch (error) {
      console.error('Error updating pay config:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/overtime/config
 * Get all employee pay configurations
 * Accessible by: Admin, Supervisor only
 */
router.get(
  '/config',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response) => {
    try {
      const configs = await payConfigService.getAllEmployeePayConfigs();

      res.json({
        success: true,
        data: configs,
      });
    } catch (error) {
      console.error('Error getting all pay configs:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }
);

// ============================================================
// Workweek Settings Endpoints
// ============================================================

/**
 * POST /api/overtime/settings/workweek
 * Update workweek settings (for employee or site)
 * Accessible by: Admin, Supervisor only
 */
router.post(
  '/settings/workweek',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response) => {
    try {
      const request: WorkweekSettingsRequest = req.body;

      await payConfigService.updateWorkweekSettings(request);

      res.json({
        success: true,
        message: 'Workweek settings updated successfully',
      });
    } catch (error) {
      console.error('Error updating workweek settings:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }
);

// ============================================================
// Calculation Endpoints
// ============================================================

/**
 * POST /api/overtime/calculate
 * Calculate timesheets for date range
 * Accessible by: Admin, Supervisor only
 */
router.post(
  '/calculate',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response) => {
    try {
      const calculationRequest: CalculationRequest = req.body;

      // Validate request
      if (!calculationRequest.from_date || !calculationRequest.to_date) {
        return res.status(400).json({
          success: false,
          message: 'from_date and to_date are required',
        });
      }

      const result = await timesheetService.calculateTimesheets(calculationRequest);

      res.json({
        success: result.success,
        message: result.message,
        data: {
          days_calculated: result.days_calculated,
          days_failed: result.days_failed,
          errors: result.errors,
        },
      });
    } catch (error) {
      console.error('Error calculating timesheets:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/overtime/calculate/:employeeCode
 * Calculate timesheets for specific employee
 * Accessible by: Admin, Supervisor only
 */
router.post(
  '/calculate/:employeeCode',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPERVISOR),
  async (req: Request, res: Response) => {
    try {
      const { employeeCode } = req.params;
      const { from_date, to_date, force_recalculate } = req.body;

      if (!from_date || !to_date) {
        return res.status(400).json({
          success: false,
          message: 'from_date and to_date are required',
        });
      }

      const calculationRequest: CalculationRequest = {
        employee_code: employeeCode,
        from_date,
        to_date,
        force_recalculate,
      };

      const result = await timesheetService.calculateTimesheets(calculationRequest);

      res.json({
        success: result.success,
        message: result.message,
        data: {
          days_calculated: result.days_calculated,
          days_failed: result.days_failed,
          errors: result.errors,
        },
      });
    } catch (error) {
      console.error('Error calculating timesheets:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }
);

// ============================================================
// Weekly Report Endpoints
// ============================================================

/**
 * GET /api/overtime/reports/weekly
 * Get weekly report
 * Accessible by: Admin, Supervisor (all), Employee (own only)
 */
router.get('/reports/weekly', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { employee_code, from_date, to_date } = req.query;

    // Validate dates
    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'from_date and to_date query parameters are required',
      });
    }

    let targetEmployeeCode: string | undefined;

    // Authorization logic
    if (user.role === 'admin' || user.role === 'supervisor') {
      // Admin/Supervisor can view any employee or all employees
      targetEmployeeCode = employee_code as string | undefined;
    } else {
      // Employee can only view own data
      targetEmployeeCode = user.employee_code;
    }

    const reportRequest: WeeklyReportRequest = {
      employee_code: targetEmployeeCode,
      from_date: from_date as string,
      to_date: to_date as string,
      include_daily_breakdown: true,
    };

    const reports = await weeklyReportService.generateWeeklyReport(reportRequest);

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/overtime/reports/weekly/export
 * Export weekly report to Excel
 * Accessible by: Admin, Supervisor (all), Employee (own only)
 */
router.get('/reports/weekly/export', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { employee_code, from_date, to_date } = req.query;

    // Validate dates
    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'from_date and to_date query parameters are required',
      });
    }

    let targetEmployeeCode: string | undefined;

    // Authorization logic
    if (user.role === 'admin' || user.role === 'supervisor') {
      targetEmployeeCode = employee_code as string | undefined;
    } else {
      targetEmployeeCode = user.employee_code;
    }

    const reportRequest: WeeklyReportRequest = {
      employee_code: targetEmployeeCode,
      from_date: from_date as string,
      to_date: to_date as string,
      include_daily_breakdown: true,
    };

    const buffer = await weeklyReportService.exportWeeklyReportToExcel(reportRequest);

    // Set headers for file download
    const filename = `Weekly_Overtime_Report_${from_date}_to_${to_date}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(buffer);
  } catch (error) {
    console.error('Error exporting weekly report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/overtime/timesheet/:employeeCode
 * Get timesheet days for an employee
 * Accessible by: Admin, Supervisor (all), Employee (own only)
 */
router.get('/timesheet/:employeeCode', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { employeeCode } = req.params;
    const { from_date, to_date } = req.query;
    const user = (req as any).user;

    // Authorization
    if (
      user.role !== 'admin' &&
      user.role !== 'supervisor' &&
      user.employee_code !== employeeCode
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this timesheet',
      });
    }

    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'from_date and to_date query parameters are required',
      });
    }

    const days = await timesheetService.getTimesheetDays(
      employeeCode,
      new Date(from_date as string),
      new Date(to_date as string)
    );

    res.json({
      success: true,
      data: days,
    });
  } catch (error) {
    console.error('Error getting timesheet days:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
});

router.get('/punches/:employeeCode', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { employeeCode } = req.params;
    const { from_date, to_date } = req.query;
    if (!from_date || !to_date) {
      return res.status(400).json({ success: false, message: 'from_date and to_date are required' });
    }

    const punches = await timesheetService.getPunchRecordsRange(
      employeeCode,
      new Date(from_date as string),
      new Date(to_date as string)
    );

    res.json({ success: true, data: punches });
  } catch (error) {
    console.error('Error getting punches:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: (error as Error).message });
  }
});

export default router;


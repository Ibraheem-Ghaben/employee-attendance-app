/**
 * Admin Routes - RBAC protected endpoints for admin operations
 */

import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { UserRole } from '../types/user';
import { getLocalConnection, sql } from '../config/database';

const router = express.Router();

// Simple admin guard middleware
router.use(authenticateToken, (req: any, res: Response, next) => {
  if (req.user?.role !== UserRole.ADMIN) {
    return res.status(403).json({ success: false, message: 'Admin access only' });
  }
  next();
});

// POST /admin/settings/workweek
router.post('/settings/workweek', async (req: Request, res: Response) => {
  try {
    const { week_start, weekend_days, workday_start, workday_end, ot_start_time_on_workdays, break_minutes, grace_in, grace_out, rounding_mode, rounding_step } = req.body;
    const pool = await getLocalConnection();

    await pool.request()
      .input('week_start', sql.VarChar, week_start)
      .input('weekend_days', sql.VarChar, Array.isArray(weekend_days) ? weekend_days.join(',') : weekend_days)
      .input('workday_start', sql.Time, workday_start)
      .input('workday_end', sql.Time, workday_end)
      .input('ot_start', sql.Time, ot_start_time_on_workdays)
      .input('break_minutes', sql.Int, break_minutes ?? null)
      .input('grace_in', sql.Int, grace_in ?? null)
      .input('grace_out', sql.Int, grace_out ?? null)
      .input('rounding_mode', sql.VarChar, rounding_mode ?? null)
      .input('rounding_step', sql.Int, rounding_step ?? null)
      .query(`
        IF EXISTS(SELECT 1 FROM dbo.SitePayConfig WHERE site_code='MSS_DEFAULT')
          UPDATE dbo.SitePayConfig SET 
            week_start=@week_start,
            weekend_days=@weekend_days,
            workday_start=@workday_start,
            workday_end=@workday_end,
            ot_start_time_on_workdays=@ot_start,
            break_minutes=@break_minutes,
            grace_in=@grace_in,
            grace_out=@grace_out,
            rounding_mode=@rounding_mode,
            rounding_step=@rounding_step,
            updated_at=GETDATE()
          WHERE site_code='MSS_DEFAULT'
        ELSE
          INSERT INTO dbo.SitePayConfig(site_code, site_name, week_start, weekend_days, workday_start, workday_end, ot_start_time_on_workdays, break_minutes, grace_in, grace_out, rounding_mode, rounding_step)
          VALUES('MSS_DEFAULT','MSS Default',@week_start,@weekend_days,@workday_start,@workday_end,@ot_start,@break_minutes,@grace_in,@grace_out,@rounding_mode,@rounding_step)
      `);

    return res.json({ success: true, message: 'Workweek settings saved' });
  } catch (error: any) {
    console.error('Admin workweek save error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// POST /admin/employees (create basic record in EmployeePayConfig & Users if needed)
router.post('/employees', async (req: Request, res: Response) => {
  try {
    const { username, password, employee_code, full_name, email, role, pay_type, hourly_rate_regular, weekday_ot_rate_type, hourly_rate_weekday_ot, weekday_ot_multiplier, weekend_ot_rate_type, hourly_rate_weekend_ot, weekend_ot_multiplier, daily_rate, status } = req.body;
    const pool = await getLocalConnection();

    // Create user in dbo.Users if username provided (admin route convenience)
    if (username && password) {
      // Note: In real system password should be hashed at service/middleware level; here assume API ensures
      await pool.request()
        .input('username', sql.VarChar, username)
        .input('password', sql.VarChar, password)
        .input('employee_code', sql.VarChar, employee_code ?? null)
        .input('role', sql.VarChar, role ?? 'employee')
        .input('full_name', sql.NVarChar, full_name)
        .input('email', sql.VarChar, email ?? null)
        .query(`
          IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE username=@username)
            INSERT INTO dbo.Users(username,password,employee_code,role,full_name,email,is_active)
            VALUES(@username,@password,@employee_code,@role,@full_name,@email,1)
        `);
    }

    // Upsert EmployeePayConfig
    await pool.request()
      .input('employee_code', sql.VarChar, employee_code)
      .input('status', sql.VarChar, status ?? 'active')
      .input('pay_type', sql.VarChar, pay_type ?? 'Hourly')
      .input('daily_rate', sql.Decimal(18,4), daily_rate ?? null)
      .input('hourly_rate_regular', sql.Decimal(10,2), hourly_rate_regular ?? 0)
      .input('weekday_ot_rate_type', sql.VarChar, weekday_ot_rate_type ?? 'multiplier')
      .input('hourly_rate_weekday_ot', sql.Decimal(10,2), hourly_rate_weekday_ot ?? null)
      .input('weekday_ot_multiplier', sql.Decimal(5,2), weekday_ot_multiplier ?? 1.5)
      .input('weekend_ot_rate_type', sql.VarChar, weekend_ot_rate_type ?? 'multiplier')
      .input('hourly_rate_weekend_ot', sql.Decimal(10,2), hourly_rate_weekend_ot ?? null)
      .input('weekend_ot_multiplier', sql.Decimal(5,2), weekend_ot_multiplier ?? 2.0)
      .query(`
        IF EXISTS(SELECT 1 FROM dbo.EmployeePayConfig WHERE employee_code=@employee_code)
          UPDATE dbo.EmployeePayConfig SET status=@status, pay_type=@pay_type, daily_rate=@daily_rate,
            hourly_rate_regular=@hourly_rate_regular, weekday_ot_rate_type=@weekday_ot_rate_type,
            hourly_rate_weekday_ot=@hourly_rate_weekday_ot, weekday_ot_multiplier=@weekday_ot_multiplier,
            weekend_ot_rate_type=@weekend_ot_rate_type, hourly_rate_weekend_ot=@hourly_rate_weekend_ot,
            weekend_ot_multiplier=@weekend_ot_multiplier, updated_at=GETDATE()
          WHERE employee_code=@employee_code
        ELSE
          INSERT INTO dbo.EmployeePayConfig(employee_code,status,pay_type,daily_rate,hourly_rate_regular,weekday_ot_rate_type,hourly_rate_weekday_ot,weekday_ot_multiplier,weekend_ot_rate_type,hourly_rate_weekend_ot,weekend_ot_multiplier)
          VALUES(@employee_code,@status,@pay_type,@daily_rate,@hourly_rate_regular,@weekday_ot_rate_type,@hourly_rate_weekday_ot,@weekday_ot_multiplier,@weekend_ot_rate_type,@hourly_rate_weekend_ot,@weekend_ot_multiplier)
      `);

    return res.json({ success: true, message: 'Employee created/updated' });
  } catch (error: any) {
    console.error('Admin create employee error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

export default router;



/**
 * Pay Configuration Service
 * Manages employee and site pay configurations
 */

import { getLocalConnection, sql } from '../config/database';
import {
  EmployeePayConfig,
  SitePayConfig,
  PayConfigUpdateRequest,
  WorkweekSettingsRequest,
} from '../types/overtime';

export class PayConfigService {
  /**
   * Get employee pay configuration
   */
  async getEmployeePayConfig(employeeCode: string): Promise<EmployeePayConfig | null> {
    try {
      const pool = await getLocalConnection();

      const result = await pool.request()
        .input('employeeCode', sql.VarChar, employeeCode)
        .query(`
          SELECT epc.*, COALESCE(emp.full_name, emp.username, '') AS employee_name
          FROM dbo.EmployeePayConfig epc
          LEFT JOIN dbo.Users emp ON epc.employee_code = emp.employee_code
          WHERE epc.employee_code = @employeeCode
        `);

      return result.recordset[0] || null;
    } catch (error) {
      console.error('Error getting employee pay config:', error);
      throw error;
    }
  }

  /**
   * Create or update employee pay configuration
   */
  async upsertEmployeePayConfig(config: EmployeePayConfig): Promise<EmployeePayConfig> {
    try {
      const pool = await getLocalConnection();

      // Check if exists
      const existing = await this.getEmployeePayConfig(config.employee_code);

      if (existing) {
        // Update
        await pool.request()
          .input('employee_code', sql.VarChar, config.employee_code)
          .input('pay_type', sql.VarChar, config.pay_type)
          .input('hourly_rate_regular', sql.Decimal(10, 2), config.hourly_rate_regular)
          .input('daily_rate', sql.Decimal(10, 2), config.daily_rate)
          .input('monthly_salary', sql.Decimal(10, 2), config.monthly_salary)
          .input('weekday_ot_rate_type', sql.VarChar, config.weekday_ot_rate_type)
          .input('hourly_rate_weekday_ot', sql.Decimal(10, 2), config.hourly_rate_weekday_ot)
          .input('weekday_ot_multiplier', sql.Decimal(5, 2), config.weekday_ot_multiplier)
          .input('weekend_ot_rate_type', sql.VarChar, config.weekend_ot_rate_type)
          .input('hourly_rate_weekend_ot', sql.Decimal(10, 2), config.hourly_rate_weekend_ot)
          .input('weekend_ot_multiplier', sql.Decimal(5, 2), config.weekend_ot_multiplier)
          .input('week_start', sql.VarChar, config.week_start)
          .input('weekend_days', sql.VarChar, config.weekend_days)
          .input('workday_start', sql.VarChar, config.workday_start)
          .input('workday_end', sql.VarChar, config.workday_end)
          .input('ot_start_time_on_workdays', sql.VarChar, config.ot_start_time_on_workdays)
          .input('minimum_daily_hours_for_pay', sql.Decimal(5, 2), config.minimum_daily_hours_for_pay)
          .query(`
            UPDATE dbo.EmployeePayConfig
            SET 
              pay_type = @pay_type,
              hourly_rate_regular = @hourly_rate_regular,
              daily_rate = @daily_rate,
              monthly_salary = @monthly_salary,
              weekday_ot_rate_type = @weekday_ot_rate_type,
              hourly_rate_weekday_ot = @hourly_rate_weekday_ot,
              weekday_ot_multiplier = @weekday_ot_multiplier,
              weekend_ot_rate_type = @weekend_ot_rate_type,
              hourly_rate_weekend_ot = @hourly_rate_weekend_ot,
              weekend_ot_multiplier = @weekend_ot_multiplier,
              week_start = @week_start,
              weekend_days = @weekend_days,
              workday_start = @workday_start,
              workday_end = @workday_end,
              ot_start_time_on_workdays = @ot_start_time_on_workdays,
              minimum_daily_hours_for_pay = @minimum_daily_hours_for_pay,
              updated_at = GETDATE()
            WHERE employee_code = @employee_code
          `);
      } else {
        // Insert
        await pool.request()
          .input('employee_code', sql.VarChar, config.employee_code)
          .input('pay_type', sql.VarChar, config.pay_type)
          .input('hourly_rate_regular', sql.Decimal(10, 2), config.hourly_rate_regular)
          .input('daily_rate', sql.Decimal(10, 2), config.daily_rate)
          .input('monthly_salary', sql.Decimal(10, 2), config.monthly_salary)
          .input('weekday_ot_rate_type', sql.VarChar, config.weekday_ot_rate_type)
          .input('hourly_rate_weekday_ot', sql.Decimal(10, 2), config.hourly_rate_weekday_ot)
          .input('weekday_ot_multiplier', sql.Decimal(5, 2), config.weekday_ot_multiplier)
          .input('weekend_ot_rate_type', sql.VarChar, config.weekend_ot_rate_type)
          .input('hourly_rate_weekend_ot', sql.Decimal(10, 2), config.hourly_rate_weekend_ot)
          .input('weekend_ot_multiplier', sql.Decimal(5, 2), config.weekend_ot_multiplier)
          .input('week_start', sql.VarChar, config.week_start)
          .input('weekend_days', sql.VarChar, config.weekend_days)
          .input('workday_start', sql.VarChar, config.workday_start)
          .input('workday_end', sql.VarChar, config.workday_end)
          .input('ot_start_time_on_workdays', sql.VarChar, config.ot_start_time_on_workdays)
          .input('minimum_daily_hours_for_pay', sql.Decimal(5, 2), config.minimum_daily_hours_for_pay)
          .query(`
            INSERT INTO dbo.EmployeePayConfig (
              employee_code, pay_type, hourly_rate_regular, daily_rate, monthly_salary,
              weekday_ot_rate_type, hourly_rate_weekday_ot, weekday_ot_multiplier,
              weekend_ot_rate_type, hourly_rate_weekend_ot, weekend_ot_multiplier,
              week_start, weekend_days, workday_start, workday_end, ot_start_time_on_workdays,
              minimum_daily_hours_for_pay
            )
            VALUES (
              @employee_code, @pay_type, @hourly_rate_regular, @daily_rate, @monthly_salary,
              @weekday_ot_rate_type, @hourly_rate_weekday_ot, @weekday_ot_multiplier,
              @weekend_ot_rate_type, @hourly_rate_weekend_ot, @weekend_ot_multiplier,
              @week_start, @weekend_days, @workday_start, @workday_end, @ot_start_time_on_workdays,
              @minimum_daily_hours_for_pay
            )
          `);
      }

      return (await this.getEmployeePayConfig(config.employee_code))!;
    } catch (error) {
      console.error('Error upserting employee pay config:', error);
      throw error;
    }
  }

  /**
   * Update employee pay rates
   */
  async updateEmployeeRates(request: PayConfigUpdateRequest): Promise<EmployeePayConfig> {
    try {
      const existing = await this.getEmployeePayConfig(request.employee_code);
      if (!existing) {
        throw new Error(`Pay configuration not found for employee ${request.employee_code}`);
      }

      const updated: EmployeePayConfig = {
        ...existing,
        ...request,
      };

      const result = await this.upsertEmployeePayConfig(updated);

      // Trigger recalculation for the last 30 days to update existing timesheet days with new rates
      try {
        const { timesheetService } = await import('./timesheetService');
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        console.log(`[PayConfig] Triggering recalculation for ${request.employee_code} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
        
        await timesheetService.calculateTimesheets({
          employee_code: request.employee_code,
          from_date: startDate.toISOString().split('T')[0],
          to_date: endDate.toISOString().split('T')[0],
          force_recalculate: true, // Force recalculation to use new rates
        });
        
        console.log(`[PayConfig] Recalculation completed for ${request.employee_code}`);
      } catch (calcError) {
        console.warn(`[PayConfig] Failed to trigger recalculation for ${request.employee_code}:`, calcError);
        // Don't throw error - config update succeeded, recalculation is optional
      }

      return result;
    } catch (error) {
      console.error('Error updating employee rates:', error);
      throw error;
    }
  }

  /**
   * Update workweek settings
   */
  async updateWorkweekSettings(request: WorkweekSettingsRequest): Promise<void> {
    try {
      const pool = await getLocalConnection();
      const weekendDaysStr = request.weekend_days.join(',');

      if (request.employee_code) {
        // Update specific employee
        const existing = await this.getEmployeePayConfig(request.employee_code);
        if (!existing) {
          throw new Error(`Pay configuration not found for employee ${request.employee_code}`);
        }

        await pool.request()
          .input('employee_code', sql.VarChar, request.employee_code)
          .input('week_start', sql.VarChar, request.week_start)
          .input('weekend_days', sql.VarChar, weekendDaysStr)
          .input('workday_start', sql.VarChar, request.workday_start)
          .input('workday_end', sql.VarChar, request.workday_end)
          .input('ot_start_time_on_workdays', sql.VarChar, request.ot_start_time_on_workdays)
          .input('minimum_daily_hours_for_pay', sql.Decimal(5, 2), request.minimum_daily_hours_for_pay || existing.minimum_daily_hours_for_pay)
          .query(`
            UPDATE dbo.EmployeePayConfig
            SET 
              week_start = @week_start,
              weekend_days = @weekend_days,
              workday_start = @workday_start,
              workday_end = @workday_end,
              ot_start_time_on_workdays = @ot_start_time_on_workdays,
              minimum_daily_hours_for_pay = @minimum_daily_hours_for_pay,
              updated_at = GETDATE()
            WHERE employee_code = @employee_code
          `);
      } else if (request.site_code) {
        // Update site defaults
        await pool.request()
          .input('site_code', sql.VarChar, request.site_code)
          .input('week_start', sql.VarChar, request.week_start)
          .input('weekend_days', sql.VarChar, weekendDaysStr)
          .input('workday_start', sql.Time, request.workday_start)
          .input('workday_end', sql.Time, request.workday_end)
          .input('ot_start_time_on_workdays', sql.Time, request.ot_start_time_on_workdays)
          .query(`
            UPDATE dbo.SitePayConfig
            SET 
              week_start = @week_start,
              weekend_days = @weekend_days,
              workday_start = @workday_start,
              workday_end = @workday_end,
              ot_start_time_on_workdays = @ot_start_time_on_workdays,
              updated_at = GETDATE()
            WHERE site_code = @site_code
          `);
      }
    } catch (error) {
      console.error('Error updating workweek settings:', error);
      throw error;
    }
  }

  /**
   * Get site pay configuration
   */
  async getSitePayConfig(siteCode: string): Promise<SitePayConfig | null> {
    try {
      const pool = await getLocalConnection();

      const result = await pool.request()
        .input('siteCode', sql.VarChar, siteCode)
        .query(`
          SELECT * FROM dbo.SitePayConfig
          WHERE site_code = @siteCode
        `);

      return result.recordset[0] || null;
    } catch (error) {
      console.error('Error getting site pay config:', error);
      throw error;
    }
  }

  /**
   * Get all employee pay configurations
   */
  async getAllEmployeePayConfigs(): Promise<EmployeePayConfig[]> {
    try {
      const pool = await getLocalConnection();

      const result = await pool.request().query(`
        SELECT epc.*, COALESCE(emp.full_name, emp.username, '') AS employee_name
        FROM dbo.EmployeePayConfig epc
        LEFT JOIN dbo.Users emp ON epc.employee_code = emp.employee_code
        ORDER BY epc.employee_code
      `);

      return result.recordset;
    } catch (error) {
      console.error('Error getting all employee pay configs:', error);
      throw error;
    }
  }

  /**
   * Delete employee pay configuration
   */
  async deleteEmployeePayConfig(employeeCode: string): Promise<void> {
    try {
      const pool = await getLocalConnection();

      await pool.request()
        .input('employeeCode', sql.VarChar, employeeCode)
        .query(`
          DELETE FROM dbo.EmployeePayConfig
          WHERE employee_code = @employeeCode
        `);
    } catch (error) {
      console.error('Error deleting employee pay config:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const payConfigService = new PayConfigService();


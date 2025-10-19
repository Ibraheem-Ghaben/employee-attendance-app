"use strict";
/**
 * Timesheet Service
 * Manages timesheet days, punch records, and orchestrates overtime calculations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.timesheetService = exports.TimesheetService = void 0;
const database_1 = require("../config/database");
const overtimeCalculationService_1 = require("./overtimeCalculationService");
class TimesheetService {
    /**
     * Calculate timesheets for date range
     */
    async calculateTimesheets(request) {
        try {
            const pool = await (0, database_1.getLocalConnection)();
            const fromDate = new Date(request.from_date);
            const toDate = new Date(request.to_date);
            let daysCalculated = 0;
            let daysFailed = 0;
            const errors = [];
            // Get employees to process
            let employeeCodes;
            if (request.employee_code) {
                employeeCodes = [request.employee_code];
            }
            else {
                // Get all employees with pay config
                const result = await pool.request().query(`
          SELECT DISTINCT employee_code 
          FROM dbo.EmployeePayConfig
          WHERE employee_code IS NOT NULL
        `);
                employeeCodes = result.recordset.map((r) => r.employee_code);
            }
            // Process each employee and each date
            for (const employeeCode of employeeCodes) {
                // Get pay config
                const config = await this.getPayConfig(employeeCode);
                if (!config) {
                    errors.push(`No pay configuration found for employee ${employeeCode}`);
                    continue;
                }
                // Validate config
                const validation = overtimeCalculationService_1.overtimeCalculationService.validateConfig(config);
                if (!validation.valid) {
                    errors.push(`Invalid config for ${employeeCode}: ${validation.errors.join(', ')}`);
                    continue;
                }
                // Process each date
                let currentDate = new Date(fromDate);
                while (currentDate <= toDate) {
                    try {
                        await this.calculateDay(employeeCode, currentDate, config, request.force_recalculate || false);
                        daysCalculated++;
                    }
                    catch (error) {
                        daysFailed++;
                        const err = error;
                        errors.push(`${employeeCode} on ${overtimeCalculationService_1.overtimeCalculationService.formatDate(currentDate)}: ${err.message}`);
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
            return {
                success: errors.length === 0,
                message: `Calculated ${daysCalculated} days, ${daysFailed} failed`,
                days_calculated: daysCalculated,
                days_failed: daysFailed,
                errors: errors.length > 0 ? errors : undefined,
            };
        }
        catch (error) {
            console.error('Error calculating timesheets:', error);
            throw error;
        }
    }
    /**
     * Calculate a single day for an employee
     */
    async calculateDay(employeeCode, date, config, forceRecalculate = false) {
        const pool = await (0, database_1.getLocalConnection)();
        const dateStr = overtimeCalculationService_1.overtimeCalculationService.formatDate(date);
        try {
            // Check if already calculated
            const existing = await this.getTimesheetDay(employeeCode, date);
            if (existing && existing.is_calculated && !forceRecalculate) {
                return existing;
            }
            // Get punch records for this day from remote database
            const punches = await this.getPunchRecordsFromRemote(employeeCode, date);
            // Create punch spans
            const spans = overtimeCalculationService_1.overtimeCalculationService.pairPunchesToSpans(punches);
            // Calculate buckets
            const calculation = overtimeCalculationService_1.overtimeCalculationService.calculate(date, spans, config);
            // Get first/last punch times
            const first_punch_in = punches.find((p) => p.punch_type === 'IN')?.punch_time || undefined;
            const last_punch_out = punches
                .filter((p) => p.punch_type === 'OUT')
                .pop()?.punch_time || undefined;
            // Determine rates used
            const rates = overtimeCalculationService_1.overtimeCalculationService.calculateRates(config);
            const isWeekend = overtimeCalculationService_1.overtimeCalculationService.isWeekendDay(date, config.weekend_days);
            const dayOfWeek = overtimeCalculationService_1.overtimeCalculationService.getDayName(date);
            // Create/update timesheet day
            const timesheetDay = {
                employee_code: employeeCode,
                work_date: dateStr,
                is_weekend: isWeekend,
                day_of_week: dayOfWeek,
                first_punch_in: first_punch_in,
                last_punch_out: last_punch_out,
                total_worked_minutes: overtimeCalculationService_1.overtimeCalculationService.totalWorkedMinutes(spans),
                regular_minutes: calculation.regular_minutes,
                weekday_ot_minutes: calculation.weekday_ot_minutes,
                weekend_ot_minutes: calculation.weekend_ot_minutes,
                regular_pay: calculation.regular_pay,
                weekday_ot_pay: calculation.weekday_ot_pay,
                weekend_ot_pay: calculation.weekend_ot_pay,
                total_pay: calculation.total_pay,
                hourly_rate_regular: rates.regular,
                hourly_rate_weekday_ot: rates.weekday_ot,
                hourly_rate_weekend_ot: rates.weekend_ot,
                is_calculated: true,
                calculation_error: undefined,
                calculated_at: new Date(),
            };
            // Upsert to database
            if (existing) {
                await this.updateTimesheetDay(existing.id, timesheetDay);
                return { ...existing, ...timesheetDay };
            }
            else {
                return await this.insertTimesheetDay(timesheetDay);
            }
        }
        catch (error) {
            console.error(`Error calculating day ${dateStr} for ${employeeCode}:`, error);
            // Save error state
            const errorDay = {
                employee_code: employeeCode,
                work_date: dateStr,
                is_weekend: overtimeCalculationService_1.overtimeCalculationService.isWeekendDay(date, config.weekend_days),
                day_of_week: overtimeCalculationService_1.overtimeCalculationService.getDayName(date),
                is_calculated: false,
                calculation_error: error.message,
                calculated_at: new Date(),
            };
            const existing = await this.getTimesheetDay(employeeCode, date);
            if (existing) {
                await this.updateTimesheetDay(existing.id, errorDay);
            }
            else {
                await this.insertTimesheetDay(errorDay);
            }
            throw error;
        }
    }
    /**
     * Get punch records from remote database
     */
    async getPunchRecordsFromRemote(employeeCode, date) {
        const pool = await (0, database_1.getLocalConnection)();
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        // Query remote database through the connection
        const result = await pool.request()
            .input('employeeCode', database_1.sql.VarChar, employeeCode)
            .input('startDate', database_1.sql.DateTime, startOfDay)
            .input('endDate', database_1.sql.DateTime, endOfDay)
            .query(`
        SELECT 
          record.punch_time,
          record.InOutMode
        FROM [Laserfiche].[dbo].[Laserfiche] as employee
        LEFT JOIN [MSS_TA].[dbo].[final_attendance_records] as record
          ON record.EnrollNumber = employee.Card_ID
        WHERE employee.Employee_Code = @employeeCode
          AND employee.Company_Code = 'MSS'
          AND employee.Branch_Code = 'MSS'
          AND record.clock_id = 3
          AND record.punch_time >= @startDate
          AND record.punch_time <= @endDate
        ORDER BY record.punch_time ASC
      `);
        return result.recordset.map((r) => ({
            punch_time: new Date(r.punch_time),
            punch_type: r.InOutMode === 0 ? 'IN' : 'OUT',
        }));
    }
    /**
     * Get timesheet day
     */
    async getTimesheetDay(employeeCode, date) {
        try {
            const pool = await (0, database_1.getLocalConnection)();
            const dateStr = overtimeCalculationService_1.overtimeCalculationService.formatDate(date);
            const result = await pool.request()
                .input('employeeCode', database_1.sql.VarChar, employeeCode)
                .input('workDate', database_1.sql.Date, dateStr)
                .query(`
          SELECT * FROM dbo.TimesheetDays
          WHERE employee_code = @employeeCode AND work_date = @workDate
        `);
            return result.recordset[0] || null;
        }
        catch (error) {
            console.error('Error getting timesheet day:', error);
            throw error;
        }
    }
    /**
     * Insert timesheet day
     */
    async insertTimesheetDay(day) {
        const pool = await (0, database_1.getLocalConnection)();
        const result = await pool.request()
            .input('employee_code', database_1.sql.VarChar, day.employee_code)
            .input('work_date', database_1.sql.Date, day.work_date)
            .input('is_weekend', database_1.sql.Bit, day.is_weekend)
            .input('day_of_week', database_1.sql.VarChar, day.day_of_week)
            .input('first_punch_in', database_1.sql.DateTime2, day.first_punch_in)
            .input('last_punch_out', database_1.sql.DateTime2, day.last_punch_out)
            .input('total_worked_minutes', database_1.sql.Int, day.total_worked_minutes || 0)
            .input('regular_minutes', database_1.sql.Int, day.regular_minutes || 0)
            .input('weekday_ot_minutes', database_1.sql.Int, day.weekday_ot_minutes || 0)
            .input('weekend_ot_minutes', database_1.sql.Int, day.weekend_ot_minutes || 0)
            .input('regular_pay', database_1.sql.Decimal(10, 2), day.regular_pay || 0)
            .input('weekday_ot_pay', database_1.sql.Decimal(10, 2), day.weekday_ot_pay || 0)
            .input('weekend_ot_pay', database_1.sql.Decimal(10, 2), day.weekend_ot_pay || 0)
            .input('total_pay', database_1.sql.Decimal(10, 2), day.total_pay || 0)
            .input('hourly_rate_regular', database_1.sql.Decimal(10, 2), day.hourly_rate_regular || 0)
            .input('hourly_rate_weekday_ot', database_1.sql.Decimal(10, 2), day.hourly_rate_weekday_ot || 0)
            .input('hourly_rate_weekend_ot', database_1.sql.Decimal(10, 2), day.hourly_rate_weekend_ot || 0)
            .input('is_calculated', database_1.sql.Bit, day.is_calculated || false)
            .input('calculation_error', database_1.sql.NVarChar, day.calculation_error)
            .input('calculated_at', database_1.sql.DateTime2, day.calculated_at)
            .query(`
        INSERT INTO dbo.TimesheetDays (
          employee_code, work_date, is_weekend, day_of_week,
          first_punch_in, last_punch_out, total_worked_minutes,
          regular_minutes, weekday_ot_minutes, weekend_ot_minutes,
          regular_pay, weekday_ot_pay, weekend_ot_pay, total_pay,
          hourly_rate_regular, hourly_rate_weekday_ot, hourly_rate_weekend_ot,
          is_calculated, calculation_error, calculated_at
        )
        OUTPUT INSERTED.*
        VALUES (
          @employee_code, @work_date, @is_weekend, @day_of_week,
          @first_punch_in, @last_punch_out, @total_worked_minutes,
          @regular_minutes, @weekday_ot_minutes, @weekend_ot_minutes,
          @regular_pay, @weekday_ot_pay, @weekend_ot_pay, @total_pay,
          @hourly_rate_regular, @hourly_rate_weekday_ot, @hourly_rate_weekend_ot,
          @is_calculated, @calculation_error, @calculated_at
        )
      `);
        return result.recordset[0];
    }
    /**
     * Update timesheet day
     */
    async updateTimesheetDay(id, day) {
        const pool = await (0, database_1.getLocalConnection)();
        await pool.request()
            .input('id', database_1.sql.Int, id)
            .input('is_weekend', database_1.sql.Bit, day.is_weekend)
            .input('day_of_week', database_1.sql.VarChar, day.day_of_week)
            .input('first_punch_in', database_1.sql.DateTime2, day.first_punch_in)
            .input('last_punch_out', database_1.sql.DateTime2, day.last_punch_out)
            .input('total_worked_minutes', database_1.sql.Int, day.total_worked_minutes)
            .input('regular_minutes', database_1.sql.Int, day.regular_minutes)
            .input('weekday_ot_minutes', database_1.sql.Int, day.weekday_ot_minutes)
            .input('weekend_ot_minutes', database_1.sql.Int, day.weekend_ot_minutes)
            .input('regular_pay', database_1.sql.Decimal(10, 2), day.regular_pay)
            .input('weekday_ot_pay', database_1.sql.Decimal(10, 2), day.weekday_ot_pay)
            .input('weekend_ot_pay', database_1.sql.Decimal(10, 2), day.weekend_ot_pay)
            .input('total_pay', database_1.sql.Decimal(10, 2), day.total_pay)
            .input('hourly_rate_regular', database_1.sql.Decimal(10, 2), day.hourly_rate_regular)
            .input('hourly_rate_weekday_ot', database_1.sql.Decimal(10, 2), day.hourly_rate_weekday_ot)
            .input('hourly_rate_weekend_ot', database_1.sql.Decimal(10, 2), day.hourly_rate_weekend_ot)
            .input('is_calculated', database_1.sql.Bit, day.is_calculated)
            .input('calculation_error', database_1.sql.NVarChar, day.calculation_error)
            .input('calculated_at', database_1.sql.DateTime2, day.calculated_at || new Date())
            .query(`
        UPDATE dbo.TimesheetDays
        SET 
          is_weekend = @is_weekend,
          day_of_week = @day_of_week,
          first_punch_in = @first_punch_in,
          last_punch_out = @last_punch_out,
          total_worked_minutes = @total_worked_minutes,
          regular_minutes = @regular_minutes,
          weekday_ot_minutes = @weekday_ot_minutes,
          weekend_ot_minutes = @weekend_ot_minutes,
          regular_pay = @regular_pay,
          weekday_ot_pay = @weekday_ot_pay,
          weekend_ot_pay = @weekend_ot_pay,
          total_pay = @total_pay,
          hourly_rate_regular = @hourly_rate_regular,
          hourly_rate_weekday_ot = @hourly_rate_weekday_ot,
          hourly_rate_weekend_ot = @hourly_rate_weekend_ot,
          is_calculated = @is_calculated,
          calculation_error = @calculation_error,
          calculated_at = @calculated_at,
          updated_at = GETDATE()
        WHERE id = @id
      `);
    }
    /**
     * Get pay configuration for an employee
     */
    async getPayConfig(employeeCode) {
        try {
            const pool = await (0, database_1.getLocalConnection)();
            const result = await pool.request()
                .input('employeeCode', database_1.sql.VarChar, employeeCode)
                .query(`
          SELECT * FROM dbo.EmployeePayConfig
          WHERE employee_code = @employeeCode
        `);
            return result.recordset[0] || null;
        }
        catch (error) {
            console.error('Error getting pay config:', error);
            throw error;
        }
    }
    /**
     * Get timesheet days for date range
     */
    async getTimesheetDays(employeeCode, fromDate, toDate) {
        try {
            const pool = await (0, database_1.getLocalConnection)();
            const result = await pool.request()
                .input('employeeCode', database_1.sql.VarChar, employeeCode)
                .input('fromDate', database_1.sql.Date, fromDate)
                .input('toDate', database_1.sql.Date, toDate)
                .query(`
          SELECT * FROM dbo.TimesheetDays
          WHERE employee_code = @employeeCode
            AND work_date >= @fromDate
            AND work_date <= @toDate
          ORDER BY work_date ASC
        `);
            return result.recordset;
        }
        catch (error) {
            console.error('Error getting timesheet days:', error);
            throw error;
        }
    }
}
exports.TimesheetService = TimesheetService;
// Export singleton instance
exports.timesheetService = new TimesheetService();

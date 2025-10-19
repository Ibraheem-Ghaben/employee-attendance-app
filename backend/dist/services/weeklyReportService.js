"use strict";
/**
 * Weekly Report Service
 * Generates weekly reports with 3-bucket breakdown
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.weeklyReportService = exports.WeeklyReportService = void 0;
const database_1 = require("../config/database");
const timesheetService_1 = require("./timesheetService");
const exceljs_1 = __importDefault(require("exceljs"));
class WeeklyReportService {
    /**
     * Generate weekly report
     */
    async generateWeeklyReport(request) {
        try {
            const pool = await (0, database_1.getLocalConnection)();
            const fromDate = new Date(request.from_date);
            const toDate = new Date(request.to_date);
            // Get employee codes to process
            let employeeCodes;
            if (request.employee_code) {
                employeeCodes = [request.employee_code];
            }
            else {
                const result = await pool.request().query(`
          SELECT DISTINCT employee_code FROM dbo.EmployeePayConfig
        `);
                employeeCodes = result.recordset.map((r) => r.employee_code);
            }
            const summaries = [];
            for (const employeeCode of employeeCodes) {
                // Get employee name
                const employeeName = await this.getEmployeeName(employeeCode);
                // Get timesheet days
                const days = await timesheetService_1.timesheetService.getTimesheetDays(employeeCode, fromDate, toDate);
                // Build daily breakdown
                const dailyRows = days.map((day) => ({
                    employee_code: employeeCode,
                    employee_name: employeeName,
                    date: day.work_date,
                    day: day.day_of_week,
                    regular_hours: day.regular_minutes / 60,
                    weekday_ot_hours: day.weekday_ot_minutes / 60,
                    weekend_ot_hours: day.weekend_ot_minutes / 60,
                    total_hours: day.total_worked_minutes / 60,
                    regular_pay: day.regular_pay,
                    weekday_ot_pay: day.weekday_ot_pay,
                    weekend_ot_pay: day.weekend_ot_pay,
                    daily_total: day.total_pay,
                }));
                // Calculate totals
                const summary = {
                    employee_code: employeeCode,
                    employee_name: employeeName,
                    week_start: fromDate,
                    week_end: toDate,
                    total_regular_hours: dailyRows.reduce((sum, row) => sum + row.regular_hours, 0),
                    total_weekday_ot_hours: dailyRows.reduce((sum, row) => sum + row.weekday_ot_hours, 0),
                    total_weekend_ot_hours: dailyRows.reduce((sum, row) => sum + row.weekend_ot_hours, 0),
                    total_hours: dailyRows.reduce((sum, row) => sum + row.total_hours, 0),
                    total_regular_pay: dailyRows.reduce((sum, row) => sum + row.regular_pay, 0),
                    total_weekday_ot_pay: dailyRows.reduce((sum, row) => sum + row.weekday_ot_pay, 0),
                    total_weekend_ot_pay: dailyRows.reduce((sum, row) => sum + row.weekend_ot_pay, 0),
                    week_total_pay: dailyRows.reduce((sum, row) => sum + row.daily_total, 0),
                    days: request.include_daily_breakdown !== false ? dailyRows : [],
                };
                summaries.push(summary);
            }
            return summaries;
        }
        catch (error) {
            console.error('Error generating weekly report:', error);
            throw error;
        }
    }
    /**
     * Export weekly report to Excel
     */
    async exportWeeklyReportToExcel(request) {
        try {
            const summaries = await this.generateWeeklyReport({
                ...request,
                include_daily_breakdown: true,
            });
            const workbook = new exceljs_1.default.Workbook();
            const worksheet = workbook.addWorksheet('Weekly Overtime Report');
            // Set up worksheet properties
            worksheet.properties.defaultRowHeight = 20;
            // Define columns
            worksheet.columns = [
                { header: 'Employee', key: 'employee_code', width: 15 },
                { header: 'Name', key: 'employee_name', width: 30 },
                { header: 'Date', key: 'date', width: 12 },
                { header: 'Day', key: 'day', width: 12 },
                { header: 'Regular Hrs', key: 'regular_hours', width: 12 },
                { header: 'Weekday OT Hrs', key: 'weekday_ot_hours', width: 15 },
                { header: 'Weekend OT Hrs', key: 'weekend_ot_hours', width: 15 },
                { header: 'Total Hrs', key: 'total_hours', width: 12 },
                { header: 'Regular Pay', key: 'regular_pay', width: 15 },
                { header: 'Weekday OT Pay', key: 'weekday_ot_pay', width: 15 },
                { header: 'Weekend OT Pay', key: 'weekend_ot_pay', width: 15 },
                { header: 'Daily Total', key: 'daily_total', width: 15 },
            ];
            // Style header row
            worksheet.getRow(1).font = { bold: true, size: 12 };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' },
            };
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
            // Add data rows
            for (const summary of summaries) {
                // Daily rows
                for (const day of summary.days) {
                    worksheet.addRow({
                        employee_code: day.employee_code,
                        employee_name: day.employee_name,
                        date: this.formatDate(new Date(day.date)),
                        day: day.day,
                        regular_hours: day.regular_hours.toFixed(2),
                        weekday_ot_hours: day.weekday_ot_hours.toFixed(2),
                        weekend_ot_hours: day.weekend_ot_hours.toFixed(2),
                        total_hours: day.total_hours.toFixed(2),
                        regular_pay: day.regular_pay.toFixed(2),
                        weekday_ot_pay: day.weekday_ot_pay.toFixed(2),
                        weekend_ot_pay: day.weekend_ot_pay.toFixed(2),
                        daily_total: day.daily_total.toFixed(2),
                    });
                }
                // Weekly totals row
                const totalRow = worksheet.addRow({
                    employee_code: '',
                    employee_name: `${summary.employee_name} - WEEKLY TOTAL`,
                    date: '',
                    day: '',
                    regular_hours: summary.total_regular_hours.toFixed(2),
                    weekday_ot_hours: summary.total_weekday_ot_hours.toFixed(2),
                    weekend_ot_hours: summary.total_weekend_ot_hours.toFixed(2),
                    total_hours: summary.total_hours.toFixed(2),
                    regular_pay: summary.total_regular_pay.toFixed(2),
                    weekday_ot_pay: summary.total_weekday_ot_pay.toFixed(2),
                    weekend_ot_pay: summary.total_weekend_ot_pay.toFixed(2),
                    daily_total: summary.week_total_pay.toFixed(2),
                });
                // Style totals row
                totalRow.font = { bold: true };
                totalRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE7E6E6' },
                };
                // Add empty row between employees
                worksheet.addRow({});
            }
            // Apply number formatting to currency columns
            const currencyColumns = ['regular_pay', 'weekday_ot_pay', 'weekend_ot_pay', 'daily_total'];
            currencyColumns.forEach((col) => {
                const column = worksheet.getColumn(col);
                column.eachCell((cell, rowNumber) => {
                    if (rowNumber > 1) {
                        cell.numFmt = '$#,##0.00';
                    }
                });
            });
            // Apply number formatting to hours columns
            const hoursColumns = ['regular_hours', 'weekday_ot_hours', 'weekend_ot_hours', 'total_hours'];
            hoursColumns.forEach((col) => {
                const column = worksheet.getColumn(col);
                column.eachCell((cell, rowNumber) => {
                    if (rowNumber > 1) {
                        cell.numFmt = '0.00';
                    }
                });
            });
            return await workbook.xlsx.writeBuffer();
        }
        catch (error) {
            console.error('Error exporting weekly report to Excel:', error);
            throw error;
        }
    }
    /**
     * Get employee name
     */
    async getEmployeeName(employeeCode) {
        try {
            const pool = await (0, database_1.getLocalConnection)();
            const result = await pool.request()
                .input('employeeCode', database_1.sql.VarChar, employeeCode)
                .query(`
          SELECT full_name FROM dbo.Users
          WHERE employee_code = @employeeCode
        `);
            return result.recordset[0]?.full_name || employeeCode;
        }
        catch (error) {
            console.error('Error getting employee name:', error);
            return employeeCode;
        }
    }
    /**
     * Format date as YYYY-MM-DD
     */
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
}
exports.WeeklyReportService = WeeklyReportService;
// Export singleton instance
exports.weeklyReportService = new WeeklyReportService();

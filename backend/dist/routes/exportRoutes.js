"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const excelExportService_1 = require("../services/excelExportService");
const user_1 = require("../types/user");
const router = (0, express_1.Router)();
const exportService = new excelExportService_1.ExcelExportService();
/**
 * GET /api/export/attendance
 * Export attendance data to Excel
 * Query params: employee_code, start_date, end_date
 */
router.get('/attendance', auth_1.authenticateToken, async (req, res) => {
    try {
        let employeeCode = req.query.employee_code;
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;
        // Employees can only export their own data
        if (req.user?.role === user_1.UserRole.EMPLOYEE) {
            if (!req.user.employee_code) {
                return res.status(400).json({
                    success: false,
                    message: 'User does not have an associated employee code',
                });
            }
            employeeCode = req.user.employee_code;
        }
        // Generate Excel file
        const buffer = await exportService.exportAttendanceToExcel(employeeCode, startDate, endDate);
        // Set response headers for Excel file download
        const filename = `attendance_${employeeCode || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.byteLength);
        res.send(buffer);
    }
    catch (error) {
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
router.get('/my-attendance', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user?.employee_code) {
            return res.status(400).json({
                success: false,
                message: 'User does not have an associated employee code',
            });
        }
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;
        const buffer = await exportService.exportAttendanceToExcel(req.user.employee_code, startDate, endDate);
        const filename = `my_attendance_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.byteLength);
        res.send(buffer);
    }
    catch (error) {
        console.error('Error exporting to Excel:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export data',
        });
    }
});
exports.default = router;

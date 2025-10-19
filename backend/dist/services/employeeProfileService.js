"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeProfileService = void 0;
const database_1 = require("../config/database");
class EmployeeProfileService {
    /**
     * Get employee profile by employee code
     */
    async getEmployeeProfile(employeeCode) {
        try {
            const pool = await (0, database_1.getConnection)();
            const query = `
        SELECT TOP 1
          Company_Code,
          Branch_Code,
          Employee_Code,
          Employee_Name_1_Arabic,
          Employee_Name_1_English,
          first_Last_name_a,
          first_Last_name_eng,
          Site_1_Arabic,
          Site_1_English,
          Card_ID
        FROM [Laserfiche].[dbo].[Laserfiche]
        WHERE Employee_Code = @employeeCode
          AND Company_Code = 'MSS'
          AND Branch_Code = 'MSS'
      `;
            const result = await pool
                .request()
                .input('employeeCode', database_1.sql.VarChar, employeeCode)
                .query(query);
            if (result.recordset.length === 0) {
                return null;
            }
            return result.recordset[0];
        }
        catch (error) {
            console.error('Error fetching employee profile:', error);
            throw error;
        }
    }
    /**
     * Get employee attendance records
     */
    async getEmployeeAttendance(employeeCode, startDate, endDate, limit = 100) {
        try {
            const pool = await (0, database_1.getConnection)();
            let query = `
        SELECT TOP ${limit}
          record.clock_id,
          record.InOutMode,
          record.punch_time
        FROM [Laserfiche].[dbo].[Laserfiche] as employee
        LEFT JOIN [MSS_TA].[dbo].[final_attendance_records] as record
          ON record.EnrollNumber = employee.Card_ID
        WHERE employee.Employee_Code = @employeeCode
          AND employee.Company_Code = 'MSS'
          AND employee.Branch_Code = 'MSS'
          AND record.clock_id = 3
      `;
            const request = pool.request().input('employeeCode', database_1.sql.VarChar, employeeCode);
            if (startDate) {
                query += ' AND record.punch_time >= @startDate';
                request.input('startDate', database_1.sql.DateTime, new Date(startDate));
            }
            if (endDate) {
                query += ' AND record.punch_time <= @endDate';
                request.input('endDate', database_1.sql.DateTime, new Date(endDate));
            }
            query += ' ORDER BY record.punch_time DESC';
            const result = await request.query(query);
            return result.recordset;
        }
        catch (error) {
            console.error('Error fetching employee attendance:', error);
            throw error;
        }
    }
    /**
     * Get complete employee profile with attendance and statistics
     */
    async getEmployeeProfileComplete(employeeCode, startDate, endDate) {
        try {
            const profile = await this.getEmployeeProfile(employeeCode);
            if (!profile) {
                return null;
            }
            const attendanceRecords = await this.getEmployeeAttendance(employeeCode, startDate, endDate, 1000 // Get more records for statistics
            );
            // Calculate statistics
            const totalCheckIns = attendanceRecords.filter((r) => r.InOutMode === 0).length;
            const totalCheckOuts = attendanceRecords.filter((r) => r.InOutMode === 1).length;
            const lastPunch = attendanceRecords.length > 0
                ? attendanceRecords[0].punch_time.toString()
                : undefined;
            return {
                profile,
                attendanceRecords: attendanceRecords.slice(0, 100), // Return last 100 records
                statistics: {
                    totalRecords: attendanceRecords.length,
                    totalCheckIns,
                    totalCheckOuts,
                    lastPunch,
                },
            };
        }
        catch (error) {
            console.error('Error fetching complete employee profile:', error);
            throw error;
        }
    }
    /**
     * Get all employees (Admin/Supervisor only)
     */
    async getAllEmployees() {
        try {
            const pool = await (0, database_1.getConnection)();
            const query = `
        SELECT DISTINCT
          Company_Code,
          Branch_Code,
          Employee_Code,
          Employee_Name_1_Arabic,
          Employee_Name_1_English,
          first_Last_name_a,
          first_Last_name_eng,
          Site_1_Arabic,
          Site_1_English,
          Card_ID
        FROM [Laserfiche].[dbo].[Laserfiche]
        WHERE Company_Code = 'MSS'
          AND Branch_Code = 'MSS'
        ORDER BY Employee_Code
      `;
            const result = await pool.request().query(query);
            return result.recordset;
        }
        catch (error) {
            console.error('Error fetching all employees:', error);
            throw error;
        }
    }
    /**
     * Get all attendance records with pagination (Admin/Supervisor view)
     */
    async getAllAttendanceRecords(page = 1, pageSize = 50, employeeCode, startDate, endDate) {
        try {
            const pool = await (0, database_1.getConnection)();
            const offset = (page - 1) * pageSize;
            // Build WHERE clause
            let whereClause = `
        WHERE employee.Company_Code = 'MSS' 
          AND employee.Branch_Code = 'MSS' 
          AND record.clock_id = 3
      `;
            const request = pool.request();
            if (employeeCode) {
                whereClause += ' AND employee.Employee_Code = @employeeCode';
                request.input('employeeCode', database_1.sql.VarChar, employeeCode);
            }
            if (startDate) {
                whereClause += ' AND record.punch_time >= @startDate';
                request.input('startDate', database_1.sql.DateTime, new Date(startDate));
            }
            if (endDate) {
                whereClause += ' AND record.punch_time <= @endDate';
                request.input('endDate', database_1.sql.DateTime, new Date(endDate));
            }
            // Query to get total count
            const countQuery = `
        SELECT COUNT(*) as totalRecords
        FROM [Laserfiche].[dbo].[Laserfiche] as employee
        LEFT JOIN [MSS_TA].[dbo].[final_attendance_records] as record
          ON record.EnrollNumber = employee.Card_ID
        ${whereClause}
      `;
            const countResult = await request.query(countQuery);
            const totalRecords = countResult.recordset[0].totalRecords;
            const totalPages = Math.ceil(totalRecords / pageSize);
            // Query to get paginated data
            const dataQuery = `
        SELECT  
          employee.[Company_Code],
          employee.[Branch_Code],
          employee.[Employee_Code],
          employee.[Employee_Name_1_Arabic],
          employee.[Employee_Name_1_English],
          employee.[first_Last_name_a],
          employee.[first_Last_name_eng],
          employee.[Site_1_Arabic],
          employee.[Site_1_English],
          record.clock_id,
          record.InOutMode,
          record.punch_time
        FROM [Laserfiche].[dbo].[Laserfiche] as employee
        LEFT JOIN [MSS_TA].[dbo].[final_attendance_records] as record
          ON record.EnrollNumber = employee.Card_ID
        ${whereClause}
        ORDER BY record.punch_time DESC
        OFFSET @offset ROWS
        FETCH NEXT @pageSize ROWS ONLY
      `;
            request.input('offset', database_1.sql.Int, offset);
            request.input('pageSize', database_1.sql.Int, pageSize);
            const dataResult = await request.query(dataQuery);
            return {
                data: dataResult.recordset,
                pagination: {
                    currentPage: page,
                    pageSize: pageSize,
                    totalRecords: totalRecords,
                    totalPages: totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                },
            };
        }
        catch (error) {
            console.error('Error fetching all attendance records:', error);
            throw error;
        }
    }
    /**
     * Get attendance data for Excel export
     */
    async getAttendanceForExport(employeeCode, startDate, endDate) {
        try {
            const pool = await (0, database_1.getConnection)();
            let query = `
        SELECT  
          employee.[Company_Code],
          employee.[Branch_Code],
          employee.[Employee_Code],
          employee.[Employee_Name_1_English],
          employee.[Employee_Name_1_Arabic],
          employee.[first_Last_name_eng],
          employee.[Site_1_English],
          employee.[Site_1_Arabic],
          record.clock_id,
          record.InOutMode,
          record.punch_time
        FROM [Laserfiche].[dbo].[Laserfiche] as employee
        LEFT JOIN [MSS_TA].[dbo].[final_attendance_records] as record
          ON record.EnrollNumber = employee.Card_ID
        WHERE employee.Company_Code = 'MSS' 
          AND employee.Branch_Code = 'MSS' 
          AND record.clock_id = 3
      `;
            const request = pool.request();
            if (employeeCode) {
                query += ' AND employee.Employee_Code = @employeeCode';
                request.input('employeeCode', database_1.sql.VarChar, employeeCode);
            }
            if (startDate) {
                query += ' AND record.punch_time >= @startDate';
                request.input('startDate', database_1.sql.DateTime, new Date(startDate));
            }
            if (endDate) {
                query += ' AND record.punch_time <= @endDate';
                request.input('endDate', database_1.sql.DateTime, new Date(endDate));
            }
            query += ' ORDER BY record.punch_time DESC';
            const result = await request.query(query);
            return result.recordset;
        }
        catch (error) {
            console.error('Error fetching attendance for export:', error);
            throw error;
        }
    }
}
exports.EmployeeProfileService = EmployeeProfileService;

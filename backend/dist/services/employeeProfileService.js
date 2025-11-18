"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeProfileService = void 0;
const localDatabase_1 = require("../config/localDatabase");
class EmployeeProfileService {
    constructor() {
        this.localEmployeeCache = null;
    }
    async getLocalEmployeeCodes() {
        if (this.localEmployeeCache) {
            return this.localEmployeeCache;
        }
        const pool = await (0, localDatabase_1.getLocalConnection)();
        const result = await pool
            .request()
            .query('SELECT employee_code FROM dbo.Users WHERE employee_code IS NOT NULL');
        this.localEmployeeCache = result.recordset.map((row) => row.employee_code);
        return this.localEmployeeCache;
    }
    async getEmployeeProfile(employeeCode) {
        try {
            const pool = await (0, localDatabase_1.getLocalConnection)();
            const query = `
        SELECT TOP 1
          'MSS' AS Company_Code,
          'MSS' AS Branch_Code,
          employee.employee_code AS Employee_Code,
          employee.full_name AS Employee_Name_1_Arabic,
          employee.full_name AS Employee_Name_1_English,
          employee.full_name AS first_Last_name_a,
          employee.full_name AS first_Last_name_eng,
          site.clock_description AS Site_1_Arabic,
          site.clock_description AS Site_1_English,
          employee.employee_code AS Card_ID
        FROM dbo.Users AS employee
        LEFT JOIN (
          SELECT employee_code, MAX(clock_description) AS clock_description
          FROM dbo.SyncedAttendance
          GROUP BY employee_code
        ) AS site ON site.employee_code = employee.employee_code
        WHERE employee.employee_code = @employeeCode
      `;
            const result = await pool
                .request()
                .input('employeeCode', localDatabase_1.sql.VarChar, employeeCode)
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
    async getEmployeeAttendance(employeeCode, startDate, endDate, limit = 100) {
        try {
            const pool = await (0, localDatabase_1.getLocalConnection)();
            const localCodes = await this.getLocalEmployeeCodes();
            if (!localCodes.includes(employeeCode)) {
                return [];
            }
            let query = `
        SELECT TOP ${limit}
          attendance.clock_id,
          attendance.in_out_mode,
          attendance.punch_time,
          attendance.clock_description,
          user.full_name
        FROM dbo.SyncedAttendance AS attendance
        LEFT JOIN dbo.Users AS usr
          ON usr.employee_code = attendance.employee_code
        WHERE attendance.employee_code = @employeeCode
      `;
            const request = pool.request().input('employeeCode', localDatabase_1.sql.VarChar, employeeCode);
            if (startDate) {
                query += ' AND attendance.punch_time >= @startDate';
                request.input('startDate', localDatabase_1.sql.DateTime2, new Date(startDate));
            }
            if (endDate) {
                query += ' AND attendance.punch_time <= @endDate';
                request.input('endDate', localDatabase_1.sql.DateTime2, new Date(endDate));
            }
            query += ' ORDER BY attendance.punch_time DESC';
            const result = await request.query(query);
            return result.recordset.map((row) => ({
                clock_id: row.clock_id,
                InOutMode: row.in_out_mode,
                punch_time: row.punch_time,
                full_name: row.full_name || employeeCode,
                clock_description: row.clock_description,
            }));
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
            const pool = await (0, localDatabase_1.getLocalConnection)();
            const query = `
        SELECT DISTINCT
          'MSS' AS Company_Code,
          'MSS' AS Branch_Code,
          usr.employee_code AS Employee_Code,
          usr.full_name AS Employee_Name_1_Arabic,
          usr.full_name AS Employee_Name_1_English,
          usr.full_name AS first_Last_name_a,
          usr.full_name AS first_Last_name_eng,
          attendance.clock_description AS Site_1_Arabic,
          attendance.clock_description AS Site_1_English,
          usr.employee_code AS Card_ID
        FROM dbo.Users usr
        LEFT JOIN (
          SELECT employee_code, MAX(clock_description) AS clock_description
          FROM dbo.SyncedAttendance
          GROUP BY employee_code
        ) attendance ON attendance.employee_code = usr.employee_code
        WHERE usr.is_active = 1
          AND usr.employee_code IS NOT NULL
        ORDER BY usr.employee_code
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
    async getAllAttendanceRecords(page = 1, pageSize = 50, employeeCode, startDate, endDate, employeeName, site, inOutMode) {
        try {
            const pool = await (0, localDatabase_1.getLocalConnection)();
            const offset = (page - 1) * pageSize;
            const localUsers = await this.getLocalEmployeeCodes();
            if (localUsers.length === 0) {
                return {
                    data: [],
                    pagination: {
                        currentPage: page,
                        pageSize,
                        totalRecords: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false,
                    },
                };
            }
            let whereClause = 'WHERE attendance.employee_code IN (SELECT employee_code FROM dbo.Users WHERE is_active = 1)';
            const request = pool.request();
            if (employeeCode) {
                whereClause += ' AND attendance.employee_code = @employeeCode';
                request.input('employeeCode', localDatabase_1.sql.VarChar, employeeCode);
            }
            if (employeeName) {
                whereClause += ' AND usr.full_name LIKE @employeeName';
                request.input('employeeName', localDatabase_1.sql.NVarChar, `%${employeeName}%`);
            }
            if (site) {
                whereClause += ' AND attendance.clock_description = @site';
                request.input('site', localDatabase_1.sql.NVarChar, site);
            }
            if (inOutMode !== undefined && inOutMode !== '') {
                whereClause += ' AND attendance.in_out_mode = @inOutMode';
                request.input('inOutMode', localDatabase_1.sql.Int, parseInt(inOutMode, 10));
            }
            if (startDate) {
                whereClause += ' AND attendance.punch_time >= @startDate';
                request.input('startDate', localDatabase_1.sql.DateTime2, new Date(startDate));
            }
            if (endDate) {
                whereClause += ' AND attendance.punch_time <= @endDate';
                request.input('endDate', localDatabase_1.sql.DateTime2, new Date(endDate));
            }
            const countQuery = `
        SELECT COUNT(*) AS totalRecords
        FROM dbo.SyncedAttendance AS attendance
        LEFT JOIN dbo.Users AS usr
          ON usr.employee_code = attendance.employee_code
        ${whereClause}
      `;
            const countResult = await request.query(countQuery);
            const totalRecords = countResult.recordset[0]?.totalRecords ?? 0;
            const totalPages = Math.ceil(totalRecords / pageSize);
            const dataQuery = `
        SELECT
          'MSS' AS Company_Code,
          'MSS' AS Branch_Code,
        attendance.employee_code AS Employee_Code,
        usr.full_name AS Employee_Name_1_English,
        usr.full_name AS Employee_Name_1_Arabic,
        usr.full_name AS first_Last_name_eng,
        usr.full_name AS first_Last_name_a,
          attendance.clock_id,
          attendance.clock_description AS Site_1_English,
          attendance.clock_description AS Site_1_Arabic,
          attendance.in_out_mode AS InOutMode,
          attendance.punch_time
        FROM dbo.SyncedAttendance AS attendance
        LEFT JOIN dbo.Users AS usr
          ON usr.employee_code = attendance.employee_code
        ${whereClause}
        ORDER BY attendance.punch_time DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;
            request.input('offset', localDatabase_1.sql.Int, offset);
            request.input('pageSize', localDatabase_1.sql.Int, pageSize);
            const dataResult = await request.query(dataQuery);
            return {
                data: dataResult.recordset,
                pagination: {
                    currentPage: page,
                    pageSize,
                    totalRecords,
                    totalPages,
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
            const pool = await (0, localDatabase_1.getLocalConnection)();
            const localUsers = await this.getLocalEmployeeCodes();
            if (localUsers.length === 0) {
                return [];
            }
            const quotedCodes = localUsers
                .map((code) => `'${code.replace(/'/g, "''")}'`)
                .join(',');
            let query = `
        SELECT  
          'MSS' AS [Company_Code],
          'MSS' AS [Branch_Code],
          usr.employee_code AS [Employee_Code],
          usr.full_name AS [Employee_Name_1_English],
          usr.full_name AS [Employee_Name_1_Arabic],
          usr.full_name AS [first_Last_name_eng],
          attendance.clock_id,
        attendance.clock_description AS [Site_1_English],
        attendance.clock_description AS [Site_1_Arabic],
          attendance.in_out_mode,
          attendance.punch_time
        FROM dbo.SyncedAttendance AS attendance
        LEFT JOIN dbo.Users AS usr ON usr.employee_code = attendance.employee_code
        WHERE attendance.employee_code IN (${quotedCodes})
      `;
            const request = pool.request();
            if (employeeCode) {
                query += ' AND user.employee_code = @employeeCode';
                request.input('employeeCode', localDatabase_1.sql.VarChar, employeeCode);
            }
            if (startDate) {
                query += ' AND attendance.punch_time >= @startDate';
                request.input('startDate', localDatabase_1.sql.DateTime2, new Date(startDate));
            }
            if (endDate) {
                query += ' AND attendance.punch_time <= @endDate';
                request.input('endDate', localDatabase_1.sql.DateTime2, new Date(endDate));
            }
            query += ' ORDER BY attendance.punch_time DESC';
            const result = await request.query(query);
            return result.recordset;
        }
        catch (error) {
            console.error('Error fetching attendance for export:', error);
            throw error;
        }
    }
    async getDashboardStatistics(employeeCode, startDate, endDate) {
        const pool = await (0, localDatabase_1.getLocalConnection)();
        const localUsers = await this.getLocalEmployeeCodes();
        if (localUsers.length === 0) {
            return {
                totalRecords: 0,
                totalCheckIns: 0,
                totalCheckOuts: 0,
                totalUnknown: 0,
                totalEmployees: 0,
                totalSites: 0,
                lastPunchTime: undefined,
                firstPunchTime: undefined
            };
        }
        const quotedCodes = localUsers
            .map((code) => `'${code.replace(/'/g, "''")}'`)
            .join(',');
        let whereClause = `
      WHERE attendance.employee_code IN (${quotedCodes})
    `;
        const request = pool.request();
        if (employeeCode) {
            whereClause += ' AND attendance.employee_code = @employeeCode';
            request.input('employeeCode', localDatabase_1.sql.VarChar, employeeCode);
        }
        if (startDate) {
            whereClause += ' AND attendance.punch_time >= @startDate';
            request.input('startDate', localDatabase_1.sql.DateTime2, new Date(startDate));
        }
        if (endDate) {
            whereClause += ' AND attendance.punch_time <= @endDate';
            request.input('endDate', localDatabase_1.sql.DateTime2, new Date(endDate));
        }
        const query = `
      SELECT
        COUNT(*) AS totalRecords,
        SUM(CASE WHEN attendance.in_out_mode = 0 THEN 1 ELSE 0 END) AS totalCheckIns,
        SUM(CASE WHEN attendance.in_out_mode = 1 THEN 1 ELSE 0 END) AS totalCheckOuts,
        SUM(CASE WHEN attendance.in_out_mode IS NULL OR attendance.in_out_mode NOT IN (0, 1) THEN 1 ELSE 0 END) AS totalUnknown,
        COUNT(DISTINCT attendance.employee_code) AS totalEmployeesWithAttendance,
        COUNT(DISTINCT attendance.clock_description) AS totalSites,
        MAX(attendance.punch_time) AS lastPunchTime,
        MIN(attendance.punch_time) AS firstPunchTime
      FROM dbo.SyncedAttendance AS attendance
      ${whereClause}
    `;
        const result = await request.query(query);
        const row = result.recordset[0];
        // Get total count of all users (not just those with attendance records)
        const totalUsersQuery = `
      SELECT COUNT(*) AS totalUsers
      FROM dbo.Users
      WHERE employee_code IS NOT NULL
    `;
        const totalUsersResult = await pool.request().query(totalUsersQuery);
        const totalUsers = totalUsersResult.recordset[0]?.totalUsers || 0;
        return {
            totalRecords: row?.totalRecords || 0,
            totalCheckIns: row?.totalCheckIns || 0,
            totalCheckOuts: row?.totalCheckOuts || 0,
            totalUnknown: row?.totalUnknown || 0,
            totalEmployees: totalUsers, // Use total users count instead of attendance-based count
            totalSites: row?.totalSites || 0,
            lastPunchTime: row?.lastPunchTime ? row.lastPunchTime.toISOString() : undefined,
            firstPunchTime: row?.firstPunchTime ? row.firstPunchTime.toISOString() : undefined,
        };
    }
    async getUniqueSites() {
        const pool = await (0, localDatabase_1.getLocalConnection)();
        const query = `
      SELECT DISTINCT clock_description
      FROM dbo.SyncedAttendance
      WHERE clock_description IS NOT NULL
        AND clock_description != ''
      ORDER BY clock_description
    `;
        const result = await pool.request().query(query);
        return result.recordset
            .map((row) => row.clock_description)
            .filter((desc) => !!desc);
    }
}
exports.EmployeeProfileService = EmployeeProfileService;

import { getLocalConnection, sql } from '../config/localDatabase';
import {
  EmployeeProfile,
  EmployeeAttendanceRecord,
  EmployeeProfileWithAttendance,
  PaginatedEmployeeAttendance,
} from '../types/employeeProfile';

export class EmployeeProfileService {
  private localEmployeeCache: string[] | null = null;

  private async getLocalEmployeeCodes(): Promise<string[]> {
    if (this.localEmployeeCache) {
      return this.localEmployeeCache;
    }
    const pool = await getLocalConnection();
    const result = await pool
      .request()
      .query('SELECT employee_code FROM dbo.Users WHERE employee_code IS NOT NULL');
    this.localEmployeeCache = result.recordset.map((row: any) => row.employee_code);
    return this.localEmployeeCache;
  }

  async getEmployeeProfile(employeeCode: string): Promise<EmployeeProfile | null> {
    try {
      const pool = await getLocalConnection();

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
        .input('employeeCode', sql.VarChar, employeeCode)
        .query(query);

      if (result.recordset.length === 0) {
        return null;
      }

      return result.recordset[0] as EmployeeProfile;
    } catch (error) {
      console.error('Error fetching employee profile:', error);
      throw error;
    }
  }

  async getEmployeeAttendance(
    employeeCode: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<EmployeeAttendanceRecord[]> {
    try {
      const pool = await getLocalConnection();

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

      const request = pool.request().input('employeeCode', sql.VarChar, employeeCode);

      if (startDate) {
        query += ' AND attendance.punch_time >= @startDate';
        request.input('startDate', sql.DateTime2, new Date(startDate));
      }

      if (endDate) {
        query += ' AND attendance.punch_time <= @endDate';
        request.input('endDate', sql.DateTime2, new Date(endDate));
      }

      query += ' ORDER BY attendance.punch_time DESC';

      const result = await request.query(query);

      return result.recordset.map((row: any) => ({
        clock_id: row.clock_id,
        InOutMode: row.in_out_mode,
        punch_time: row.punch_time,
        full_name: row.full_name || employeeCode,
        clock_description: row.clock_description,
      }));
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      throw error;
    }
  }

  /**
   * Get complete employee profile with attendance and statistics
   */
  async getEmployeeProfileComplete(
    employeeCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<EmployeeProfileWithAttendance | null> {
    try {
      const profile = await this.getEmployeeProfile(employeeCode);
      
      if (!profile) {
        return null;
      }

      const attendanceRecords = await this.getEmployeeAttendance(
        employeeCode,
        startDate,
        endDate,
        1000 // Get more records for statistics
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
    } catch (error) {
      console.error('Error fetching complete employee profile:', error);
      throw error;
    }
  }

  /**
   * Get all employees (Admin/Supervisor only)
   */
  async getAllEmployees(): Promise<EmployeeProfile[]> {
    try {
      const pool = await getLocalConnection();

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
        FROM dbo.Users
        WHERE Company_Code = 'MSS'
          AND Branch_Code = 'MSS'
        ORDER BY Employee_Code
      `;

      const result = await pool.request().query(query);
      return result.recordset as EmployeeProfile[];
    } catch (error) {
      console.error('Error fetching all employees:', error);
      throw error;
    }
  }

  /**
   * Get all attendance records with pagination (Admin/Supervisor view)
   */
  async getAllAttendanceRecords(
    page: number = 1,
    pageSize: number = 50,
    employeeCode?: string,
    startDate?: string,
    endDate?: string,
    employeeName?: string,
    site?: string,
    inOutMode?: string
  ): Promise<PaginatedEmployeeAttendance> {
    try {
      const pool = await getLocalConnection();
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
        request.input('employeeCode', sql.VarChar, employeeCode);
      }

      if (employeeName) {
        whereClause += ' AND usr.full_name LIKE @employeeName';
        request.input('employeeName', sql.NVarChar, `%${employeeName}%`);
      }

      if (site) {
        whereClause += ' AND attendance.clock_description = @site';
        request.input('site', sql.NVarChar, site);
      }

      if (inOutMode !== undefined && inOutMode !== '') {
        whereClause += ' AND attendance.in_out_mode = @inOutMode';
        request.input('inOutMode', sql.Int, parseInt(inOutMode, 10));
      }

      if (startDate) {
        whereClause += ' AND attendance.punch_time >= @startDate';
        request.input('startDate', sql.DateTime2, new Date(startDate));
      }

      if (endDate) {
        whereClause += ' AND attendance.punch_time <= @endDate';
        request.input('endDate', sql.DateTime2, new Date(endDate));
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

      request.input('offset', sql.Int, offset);
      request.input('pageSize', sql.Int, pageSize);

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
    } catch (error) {
      console.error('Error fetching all attendance records:', error);
      throw error;
    }
  }

  /**
   * Get attendance data for Excel export
   */
  async getAttendanceForExport(
    employeeCode?: string,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    try {
      const pool = await getLocalConnection();

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
        request.input('employeeCode', sql.VarChar, employeeCode);
      }

      if (startDate) {
        query += ' AND attendance.punch_time >= @startDate';
        request.input('startDate', sql.DateTime2, new Date(startDate));
      }

      if (endDate) {
        query += ' AND attendance.punch_time <= @endDate';
        request.input('endDate', sql.DateTime2, new Date(endDate));
      }

      query += ' ORDER BY attendance.punch_time DESC';

      const result = await request.query(query);

      return result.recordset;
    } catch (error) {
      console.error('Error fetching attendance for export:', error);
      throw error;
    }
  }

  async getDashboardStatistics(
    employeeCode?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ 
    totalRecords: number; 
    totalCheckIns: number; 
    totalCheckOuts: number;
    totalEmployees: number;
    totalSites: number;
    lastPunchTime?: string;
  }> {
    const pool = await getLocalConnection();

    const localUsers = await this.getLocalEmployeeCodes();
    if (localUsers.length === 0) {
      return { 
        totalRecords: 0, 
        totalCheckIns: 0, 
        totalCheckOuts: 0,
        totalEmployees: 0,
        totalSites: 0,
        lastPunchTime: undefined
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
      request.input('employeeCode', sql.VarChar, employeeCode);
    }

    if (startDate) {
      whereClause += ' AND attendance.punch_time >= @startDate';
      request.input('startDate', sql.DateTime2, new Date(startDate));
    }

    if (endDate) {
      whereClause += ' AND attendance.punch_time <= @endDate';
      request.input('endDate', sql.DateTime2, new Date(endDate));
    }

    const query = `
      SELECT
        COUNT(*) AS totalRecords,
        SUM(CASE WHEN attendance.in_out_mode = 0 THEN 1 ELSE 0 END) AS totalCheckIns,
        SUM(CASE WHEN attendance.in_out_mode = 1 THEN 1 ELSE 0 END) AS totalCheckOuts,
        COUNT(DISTINCT attendance.employee_code) AS totalEmployees,
        COUNT(DISTINCT attendance.clock_description) AS totalSites,
        MAX(attendance.punch_time) AS lastPunchTime
      FROM dbo.SyncedAttendance AS attendance
      ${whereClause}
    `;

    const result = await request.query(query);
    const row = result.recordset[0];

    return {
      totalRecords: row?.totalRecords || 0,
      totalCheckIns: row?.totalCheckIns || 0,
      totalCheckOuts: row?.totalCheckOuts || 0,
      totalEmployees: row?.totalEmployees || 0,
      totalSites: row?.totalSites || 0,
      lastPunchTime: row?.lastPunchTime ? row.lastPunchTime.toISOString() : undefined,
    };
  }

  async getUniqueSites(): Promise<string[]> {
    const pool = await getLocalConnection();

    const query = `
      SELECT DISTINCT clock_description
      FROM dbo.SyncedAttendance
      WHERE clock_description IS NOT NULL
        AND clock_description != ''
      ORDER BY clock_description
    `;

    const result = await pool.request().query(query);
    return result.recordset
      .map((row: any) => row.clock_description)
      .filter((desc: string) => !!desc);
  }
}
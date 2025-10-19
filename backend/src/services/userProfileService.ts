import { getLocalConnection, sql } from '../config/localDatabase';
import { getConnection } from '../config/database';
import { UserResponse } from '../types/user';

export class UserProfileService {
  /**
   * Get user profile from LOCAL database (AttendanceAuthDB)
   */
  async getUserProfile(username: string): Promise<any> {
    try {
      const pool = await getLocalConnection();
      
      const result = await pool
        .request()
        .input('username', sql.VarChar, username)
        .query(`
          SELECT 
            id, username, employee_code, role, 
            full_name, email, is_active, 
            created_at, last_login
          FROM [dbo].[Users]
          WHERE username = @username AND is_active = 1
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      const user = result.recordset[0];

      // Get attendance statistics from MSS_TA if employee_code exists
      let attendanceStats = null;
      if (user.employee_code) {
        attendanceStats = await this.getAttendanceStatistics(user.employee_code);
      }

      return {
        profile: {
          id: user.id,
          username: user.username,
          employee_code: user.employee_code,
          role: user.role,
          full_name: user.full_name,
          email: user.email,
          is_active: user.is_active,
          created_at: user.created_at,
          last_login: user.last_login,
        },
        attendanceStatistics: attendanceStats,
      };
    } catch (error) {
      console.error('Error fetching user profile from LOCAL DB:', error);
      throw error;
    }
  }

  /**
   * Get user profile by employee code from LOCAL database
   */
  async getUserProfileByEmployeeCode(employeeCode: string): Promise<any> {
    try {
      const pool = await getLocalConnection();
      
      const result = await pool
        .request()
        .input('employeeCode', sql.VarChar, employeeCode)
        .query(`
          SELECT 
            id, username, employee_code, role, 
            full_name, email, is_active, 
            created_at, last_login
          FROM [dbo].[Users]
          WHERE employee_code = @employeeCode AND is_active = 1
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      const user = result.recordset[0];

      // Get attendance statistics from MSS_TA
      const attendanceStats = await this.getAttendanceStatistics(employeeCode);

      return {
        profile: {
          id: user.id,
          username: user.username,
          employee_code: user.employee_code,
          role: user.role,
          full_name: user.full_name,
          email: user.email,
          is_active: user.is_active,
          created_at: user.created_at,
          last_login: user.last_login,
        },
        attendanceStatistics: attendanceStats,
      };
    } catch (error) {
      console.error('Error fetching user profile by employee code from LOCAL DB:', error);
      throw error;
    }
  }

  /**
   * Get attendance statistics from MSS_TA (READ-ONLY)
   */
  private async getAttendanceStatistics(
    employeeCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    try {
      const pool = await getConnection();

      let whereClause = `
        WHERE employee.Company_Code = 'MSS' 
          AND employee.Branch_Code = 'MSS' 
          AND employee.Employee_Code = @employeeCode
          AND record.clock_id = 3
      `;

      const request = pool.request()
        .input('employeeCode', sql.VarChar, employeeCode);

      if (startDate) {
        whereClause += ' AND record.punch_time >= @startDate';
        request.input('startDate', sql.DateTime, new Date(startDate));
      }

      if (endDate) {
        whereClause += ' AND record.punch_time <= @endDate';
        request.input('endDate', sql.DateTime, new Date(endDate));
      }

      const query = `
        SELECT 
          COUNT(*) as totalRecords,
          SUM(CASE WHEN record.InOutMode = 0 THEN 1 ELSE 0 END) as totalCheckIns,
          SUM(CASE WHEN record.InOutMode = 1 THEN 1 ELSE 0 END) as totalCheckOuts,
          MAX(record.punch_time) as lastPunchTime,
          MIN(record.punch_time) as firstPunchTime
        FROM [Laserfiche].[dbo].[Laserfiche] as employee
        LEFT JOIN [MSS_TA].[dbo].[final_attendance_records] as record
          ON record.EnrollNumber = employee.Card_ID
        ${whereClause}
      `;

      const result = await request.query(query);

      return result.recordset[0] || {
        totalRecords: 0,
        totalCheckIns: 0,
        totalCheckOuts: 0,
        lastPunchTime: null,
        firstPunchTime: null,
      };
    } catch (error) {
      console.error('Error fetching attendance statistics from MSS_TA:', error);
      // Return empty stats if MSS_TA query fails
      return {
        totalRecords: 0,
        totalCheckIns: 0,
        totalCheckOuts: 0,
        lastPunchTime: null,
        firstPunchTime: null,
      };
    }
  }

  /**
   * Get user's recent attendance records from MSS_TA (READ-ONLY)
   */
  async getUserAttendanceRecords(
    employeeCode: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const pool = await getConnection();

      let whereClause = `
        WHERE employee.Company_Code = 'MSS' 
          AND employee.Branch_Code = 'MSS' 
          AND employee.Employee_Code = @employeeCode
          AND record.clock_id = 3
      `;

      const request = pool.request()
        .input('employeeCode', sql.VarChar, employeeCode)
        .input('limit', sql.Int, limit);

      if (startDate) {
        whereClause += ' AND record.punch_time >= @startDate';
        request.input('startDate', sql.DateTime, new Date(startDate));
      }

      if (endDate) {
        whereClause += ' AND record.punch_time <= @endDate';
        request.input('endDate', sql.DateTime, new Date(endDate));
      }

      const query = `
        SELECT TOP (@limit)
          record.clock_id,
          record.InOutMode,
          record.punch_time,
          employee.Site_1_English as site
        FROM [Laserfiche].[dbo].[Laserfiche] as employee
        LEFT JOIN [MSS_TA].[dbo].[final_attendance_records] as record
          ON record.EnrollNumber = employee.Card_ID
        ${whereClause}
        ORDER BY record.punch_time DESC
      `;

      const result = await request.query(query);

      return result.recordset;
    } catch (error) {
      console.error('Error fetching user attendance records from MSS_TA:', error);
      return [];
    }
  }
}


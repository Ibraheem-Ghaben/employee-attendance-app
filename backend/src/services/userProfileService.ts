import { getLocalConnection, sql } from '../config/localDatabase';

export class UserProfileService {
  private async getLocalEmployeeCodes(): Promise<string[]> {
    const pool = await getLocalConnection();
    const result = await pool
      .request()
      .query('SELECT employee_code FROM dbo.Users WHERE employee_code IS NOT NULL');
    return result.recordset.map((row: any) => row.employee_code);
  }

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

  private async getAttendanceStatistics(
    employeeCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    try {
      const localCodes = await this.getLocalEmployeeCodes();
      if (!localCodes.includes(employeeCode)) {
        return {
          totalRecords: 0,
          totalCheckIns: 0,
          totalCheckOuts: 0,
          lastPunchTime: null,
          firstPunchTime: null,
        };
      }

      const pool = await getLocalConnection();

      let whereClause = 'WHERE attendance.employee_code = @employeeCode';
      const request = pool.request().input('employeeCode', sql.VarChar, employeeCode);

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
          COUNT(*) as totalRecords,
          SUM(CASE WHEN attendance.in_out_mode = 0 THEN 1 ELSE 0 END) as totalCheckIns,
          SUM(CASE WHEN attendance.in_out_mode = 1 THEN 1 ELSE 0 END) as totalCheckOuts,
          MAX(attendance.punch_time) as lastPunchTime,
          MIN(attendance.punch_time) as firstPunchTime
        FROM dbo.SyncedAttendance AS attendance
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
      console.error('Error fetching attendance statistics from local sync table:', error);
      return {
        totalRecords: 0,
        totalCheckIns: 0,
        totalCheckOuts: 0,
        lastPunchTime: null,
        firstPunchTime: null,
      };
    }
  }

  async getUserAttendanceRecords(
    employeeCode: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const localCodes = await this.getLocalEmployeeCodes();
      if (!localCodes.includes(employeeCode)) {
        return [];
      }

      const pool = await getLocalConnection();

      let whereClause = 'WHERE attendance.employee_code = @employeeCode';
      const request = pool.request()
        .input('employeeCode', sql.VarChar, employeeCode)
        .input('limit', sql.Int, limit);

      if (startDate) {
        whereClause += ' AND attendance.punch_time >= @startDate';
        request.input('startDate', sql.DateTime2, new Date(startDate));
      }

      if (endDate) {
        whereClause += ' AND attendance.punch_time <= @endDate';
        request.input('endDate', sql.DateTime2, new Date(endDate));
      }

      const query = `
        SELECT TOP (@limit)
          attendance.clock_id,
          attendance.in_out_mode,
          attendance.punch_time,
          attendance.clock_description AS site
        FROM dbo.SyncedAttendance AS attendance
        ${whereClause}
        ORDER BY attendance.punch_time DESC
      `;

      const result = await request.query(query);

      return result.recordset;
    } catch (error) {
      console.error('Error fetching user attendance records from local sync table:', error);
      return [];
    }
  }
}


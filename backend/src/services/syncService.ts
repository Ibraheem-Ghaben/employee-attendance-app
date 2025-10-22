/**
 * Attendance Sync Service
 * Syncs attendance data from APIC server to local database
 */

import { getApicConnection } from '../config/apicDatabase';
import { getLocalConnection, sql } from '../config/localDatabase';

export class SyncService {
  async syncAttendanceData(): Promise<{ success: boolean; message: string; recordsSynced: number }> {
    try {
      console.log('[Sync] Starting attendance sync...');
      
      // Connect to APIC server
      const apicPool = await getApicConnection();
      
      // Fetch attendance records from APIC - READ ONLY from final_attendance_records
      const result = await apicPool.request().query(`
        SELECT 
          ar.EnrollNumber as employee_code,
          ar.punch_time,
          ar.InOutMode as in_out_mode,
          ar.clock_id,
          cd.Clock_Description,
          ar.CompanyCode,
          ar.BranchCode
        FROM [MSS_TA].[dbo].final_attendance_records ar
        LEFT JOIN [MSS_TA].[dbo].[Clock_Definition_Table] cd 
          ON ar.clock_id = cd.Clock_ID
        WHERE ar.clock_id IN (3, 10)
          AND ar.CompanyCode = 'MSS'
        ORDER BY ar.punch_time DESC
      `);

      const rows = result.recordset;
      console.log(`[Sync] Fetched ${rows.length} records from Clock server`);
      
      // Debug: Check branch codes
      const branchCodes = [...new Set(rows.map(row => row.BranchCode))];
      console.log(`[Sync] Branch codes found: ${branchCodes.join(', ')}`);
      
      // Debug: Check clock IDs
      const clockIds = [...new Set(rows.map(row => row.clock_id))];
      console.log(`[Sync] Clock IDs found: ${clockIds.join(', ')}`);
      
      // Debug: Count records per clock
      const clockCounts = rows.reduce((acc, row) => {
        acc[row.clock_id] = (acc[row.clock_id] || 0) + 1;
        return acc;
      }, {});
      console.log(`[Sync] Records per clock:`, clockCounts);

      if (rows.length === 0) {
        return {
          success: true,
          message: 'No new records to sync',
          recordsSynced: 0
        };
      }

      // Connect to local database
      const localPool = await getLocalConnection();

      // Clear existing data
      await localPool.request().query(`TRUNCATE TABLE dbo.SyncedAttendance`);

      // Bulk insert
      const table = localPool.request().input('records', sql.TVP);
      
      // Use individual INSERT statements (more compatible)
      let insertedCount = 0;
      
      for (const row of rows) {
        try {
          await localPool.request()
            .input('employee_code', sql.VarChar, (row.employee_code || '').toString().trim())
            .input('punch_time', sql.DateTime2, row.punch_time)
            .input('in_out_mode', sql.Int, row.in_out_mode ?? null)
            .input('clock_id', sql.Int, row.clock_id ?? null)
            .input('clock_description', sql.VarChar, (row.Clock_Description || '').toString().trim())
            .input('company_code', sql.VarChar, (row.CompanyCode || 'MSS').toString().trim())
            .input('branch_code', sql.Int, row.BranchCode ?? null)
            .query(`
              INSERT INTO dbo.SyncedAttendance 
                (employee_code, punch_time, in_out_mode, clock_id, clock_description, company_code, branch_code)
              VALUES 
                (@employee_code, @punch_time, @in_out_mode, @clock_id, @clock_description, @company_code, @branch_code)
            `);
          insertedCount++;
        } catch (err) {
          console.error('[Sync] Error inserting row:', err);
        }
      }

      console.log(`[Sync] Successfully synced ${insertedCount} records`);

      return {
        success: true,
        message: `Synced ${insertedCount} attendance records`,
        recordsSynced: insertedCount
      };

    } catch (error) {
      console.error('[Sync] Error during sync:', error);
      throw error;
    }
  }
}

export const syncService = new SyncService();



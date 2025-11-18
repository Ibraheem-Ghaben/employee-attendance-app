/**
 * Attendance Sync Service
 * Syncs attendance data from APIC server to local database
 */

import { getApicConnection } from '../config/apicDatabase';
import { getLocalConnection, sql } from '../config/localDatabase';

export class SyncService {
  async syncAttendanceData(): Promise<{ success: boolean; message: string; recordsSynced: number }> {
    try {
      console.log('[Sync] Starting incremental attendance sync...');
      
      // Connect to local database first to get last sync time
      const localPool = await getLocalConnection();
      
      // Get last sync timestamp
      let lastSyncTime: Date | null = null;
      try {
        const lastSyncResult = await localPool.request().query(`
          SELECT MAX(synced_at) as last_sync_time 
          FROM dbo.SyncedAttendance
        `);
        lastSyncTime = lastSyncResult.recordset[0]?.last_sync_time || null;
      } catch (err) {
        console.log('[Sync] No previous sync found, will sync all data');
      }

      // Connect to APIC server
      const apicPool = await getApicConnection();
      
      // Build query with incremental sync logic
      let query = `
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
      `;

      // Add incremental filter if we have a last sync time
      if (lastSyncTime) {
        query += ` AND ar.punch_time > '${lastSyncTime.toISOString()}'`;
        console.log(`[Sync] Incremental sync from: ${lastSyncTime.toISOString()}`);
      } else {
        console.log('[Sync] Full sync - no previous sync found');
      }

      query += ` ORDER BY ar.punch_time DESC`;

      const result = await apicPool.request().query(query);
      const rows = result.recordset;
      console.log(`[Sync] Fetched ${rows.length} new/updated records from Clock server`);
      
      if (rows.length === 0) {
        return {
          success: true,
          message: 'No new records to sync',
          recordsSynced: 0
        };
      }

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

      // Use UPSERT (INSERT with ON DUPLICATE KEY UPDATE equivalent) for incremental sync
      let insertedCount = 0;
      let updatedCount = 0;
      
      for (const row of rows) {
        try {
          // Check if record already exists (for updates)
          const existingResult = await localPool.request()
            .input('employee_code', sql.VarChar, (row.employee_code || '').toString().trim())
            .input('punch_time', sql.DateTime2, row.punch_time)
            .input('clock_id', sql.Int, row.clock_id ?? null)
            .query(`
              SELECT id FROM dbo.SyncedAttendance 
              WHERE employee_code = @employee_code 
                AND punch_time = @punch_time 
                AND clock_id = @clock_id
            `);

          const existing = existingResult.recordset[0];

          if (existing) {
            // Update existing record
            await localPool.request()
              .input('id', sql.Int, existing.id)
              .input('in_out_mode', sql.Int, row.in_out_mode ?? null)
              .input('clock_description', sql.VarChar, (row.Clock_Description || '').toString().trim())
              .input('company_code', sql.VarChar, (row.CompanyCode || 'MSS').toString().trim())
              .input('branch_code', sql.Int, row.BranchCode ?? null)
              .query(`
                UPDATE dbo.SyncedAttendance 
                SET 
                  in_out_mode = @in_out_mode,
                  clock_description = @clock_description,
                  company_code = @company_code,
                  branch_code = @branch_code,
                  synced_at = GETDATE()
                WHERE id = @id
              `);
            updatedCount++;
          } else {
            // Insert new record
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
                  (employee_code, punch_time, in_out_mode, clock_id, clock_description, company_code, branch_code, synced_at)
                VALUES 
                  (@employee_code, @punch_time, @in_out_mode, @clock_id, @clock_description, @company_code, @branch_code, GETDATE())
              `);
            insertedCount++;
          }
        } catch (err) {
          console.error('[Sync] Error processing row:', err);
        }
      }

      const totalProcessed = insertedCount + updatedCount;
      console.log(`[Sync] Successfully processed ${totalProcessed} records (${insertedCount} new, ${updatedCount} updated)`);

      return {
        success: true,
        message: `Synced ${totalProcessed} attendance records (${insertedCount} new, ${updatedCount} updated)`,
        recordsSynced: totalProcessed
      };

    } catch (error) {
      console.error('[Sync] Error during sync:', error);
      throw error;
    }
  }
}

export const syncService = new SyncService();



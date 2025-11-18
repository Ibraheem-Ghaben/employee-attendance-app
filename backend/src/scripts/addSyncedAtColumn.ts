import 'dotenv/config';
import { getLocalConnection, closeLocalConnection } from '../config/localDatabase';

async function addSyncedAtColumn(): Promise<void> {
  const pool = await getLocalConnection();
  
  try {
    console.log('[Migration] Adding synced_at column to SyncedAttendance table...');
    
    // Check if column already exists
    const checkResult = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'SyncedAttendance' 
        AND COLUMN_NAME = 'synced_at'
    `);
    
    if (checkResult.recordset.length > 0) {
      console.log('[Migration] synced_at column already exists, skipping...');
      return;
    }
    
    // Add the synced_at column
    await pool.request().query(`
      ALTER TABLE dbo.SyncedAttendance 
      ADD synced_at DATETIME2 DEFAULT GETDATE()
    `);
    
    // Update existing records to have synced_at = created_at
    await pool.request().query(`
      UPDATE dbo.SyncedAttendance 
      SET synced_at = created_at 
      WHERE synced_at IS NULL
    `);
    
    console.log('[Migration] Successfully added synced_at column to SyncedAttendance table');
    
  } catch (error) {
    console.error('[Migration] Error adding synced_at column:', error);
    throw error;
  } finally {
    await closeLocalConnection();
  }
}

// Run migration if called directly
if (require.main === module) {
  addSyncedAtColumn()
    .then(() => {
      console.log('[Migration] Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] Migration failed:', error);
      process.exit(1);
    });
}

export { addSyncedAtColumn };

import { getLocalConnection } from '../config/localDatabase';

async function resetLocalDatabase() {
  console.log('============================================================');
  console.log('🧹 Resetting AttendanceAuthDB (local database)');
  console.log('============================================================\n');

  const pool = await getLocalConnection();

  try {
    await pool.request().batch(`
      BEGIN TRAN;

      IF OBJECT_ID('dbo.PunchRecords', 'U') IS NOT NULL
        DELETE FROM dbo.PunchRecords;

      IF OBJECT_ID('dbo.TimesheetAdjustments', 'U') IS NOT NULL
        DELETE FROM dbo.TimesheetAdjustments;

      IF OBJECT_ID('dbo.TimesheetDays', 'U') IS NOT NULL
        DELETE FROM dbo.TimesheetDays;

      IF OBJECT_ID('dbo.PayrollPeriods', 'U') IS NOT NULL
        DELETE FROM dbo.PayrollPeriods;

      IF OBJECT_ID('dbo.EmployeePayConfig', 'U') IS NOT NULL
        DELETE FROM dbo.EmployeePayConfig;

      IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
        DELETE FROM dbo.Users
        WHERE username NOT IN ('admin', 'supervisor');

      COMMIT TRAN;
    `);

    console.log('✅ Local database reset complete. Only admin and supervisor retained.');
  } catch (error) {
    console.error('❌ Failed to reset local database:', error);
    try {
      await pool.request().query('IF @@TRANCOUNT > 0 ROLLBACK TRAN;');
    } catch (rollbackError) {
      console.error('❌ Failed to rollback transaction:', rollbackError);
    }
    process.exit(1);
  } finally {
    await pool.close();
  }

  process.exit(0);
}

resetLocalDatabase();


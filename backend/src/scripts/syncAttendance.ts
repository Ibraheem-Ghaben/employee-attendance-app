import 'dotenv/config';

import { getApicConnection, closeApicConnection, sql } from '../config/apicDatabase';
import { getLocalConnection, closeLocalConnection } from '../config/localDatabase';

const allowedClockIds = (process.env.PUNCH_CLOCK_IDS || '3,10')
  .split(',')
  .map((id) => parseInt(id.trim(), 10))
  .filter((id) => !Number.isNaN(id));

const clockClause = allowedClockIds.length
  ? `AND record.clock_id IN (${allowedClockIds.join(',')})`
  : '';

async function ensureSyncedTable(): Promise<void> {
  const pool = await getLocalConnection();
  await pool
    .request()
    .query(`
      IF OBJECT_ID('dbo.SyncedAttendance', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.SyncedAttendance (
          id INT IDENTITY(1,1) PRIMARY KEY,
          employee_code VARCHAR(50) NOT NULL,
          punch_time DATETIME2 NOT NULL,
          in_out_mode INT NULL,
          clock_id INT NULL,
          clock_description NVARCHAR(255) NULL,
          company_code VARCHAR(10) NULL,
          branch_code VARCHAR(10) NULL,
          created_at DATETIME2 DEFAULT SYSUTCDATETIME()
        );
        CREATE INDEX IX_SyncedAttendance_EmployeeTime ON dbo.SyncedAttendance (employee_code, punch_time);
      END
    `);
}

async function getLocalEmployeeCodes(): Promise<string[]> {
  const pool = await getLocalConnection();
  const result = await pool
    .request()
    .query('SELECT employee_code FROM dbo.Users WHERE employee_code IS NOT NULL AND is_active = 1');

  return result.recordset.map((row: any) => row.employee_code as string);
}

async function fetchRemoteAttendance(employeeCodes: string[]) {
  if (!employeeCodes.length) {
    return [];
  }

  const apicPool = await getApicConnection();
  const request = apicPool.request();

  // Build IN clause safely
  const codeParams: string[] = [];
  employeeCodes.forEach((code, index) => {
    const paramName = `code${index}`;
    request.input(paramName, sql.VarChar, code);
    codeParams.push(`@${paramName}`);
  });

  const query = `
    SELECT
      record.EnrollNumber AS employee_code,
      record.punch_time,
      record.InOutMode,
      record.clock_id,
      record.CompanyCode,
      record.BranchCode,
      clock.Clock_Description
    FROM [MSS_TA].[dbo].[attendance_records] AS record
    LEFT JOIN [MSS_TA].[dbo].[Clock_Definition_Table] AS clock
      ON clock.Clock_ID = record.clock_id
    WHERE record.BranchCode IN (3, 10)
      ${clockClause}
      AND record.EnrollNumber IN (${codeParams.join(', ')})
  `;

  const result = await request.query(query);
  return result.recordset;
}

async function replaceLocalAttendance(rows: any[]): Promise<void> {
  const localPool = await getLocalConnection();
  const transaction = new sql.Transaction(localPool);
  await transaction.begin();

  try {
    await transaction.request().query('TRUNCATE TABLE dbo.SyncedAttendance');

    if (rows.length === 0) {
      await transaction.commit();
      return;
    }

    const table = new sql.Table('dbo.SyncedAttendance');
    table.create = false;
    table.columns.add('employee_code', sql.VarChar(50), { nullable: false });
    table.columns.add('punch_time', sql.DateTime2, { nullable: false });
    table.columns.add('in_out_mode', sql.Int, { nullable: true });
    table.columns.add('clock_id', sql.Int, { nullable: true });
    table.columns.add('clock_description', sql.NVarChar(255), { nullable: true });
    table.columns.add('company_code', sql.VarChar(10), { nullable: true });
    table.columns.add('branch_code', sql.VarChar(10), { nullable: true });

    for (const row of rows) {
      table.rows.add(
        (row.employee_code || '').trim(),
        row.punch_time,
        row.InOutMode ?? null,
        row.clock_id ?? null,
        (row.Clock_Description || '').trim(),
        (row.CompanyCode || 'MSS').trim(),
        row.BranchCode ?? null
      );
    }

    const request = new sql.Request(transaction);
    await request.bulk(table);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    await ensureSyncedTable();
    const employeeCodes = await getLocalEmployeeCodes();
    console.log(`Syncing attendance for ${employeeCodes.length} local employees...`);

    const rows = await fetchRemoteAttendance(employeeCodes);
    console.log(`Fetched ${rows.length} remote records.`);

    await replaceLocalAttendance(rows);
    console.log('Synced attendance into dbo.SyncedAttendance.');
  } catch (error) {
    console.error('Attendance sync failed:', error);
    process.exitCode = 1;
  } finally {
    await closeApicConnection();
    await closeLocalConnection();
  }
}

main();


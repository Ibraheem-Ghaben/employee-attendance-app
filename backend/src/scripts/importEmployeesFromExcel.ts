import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';
import path from 'path';
import { getLocalConnection, sql } from '../config/localDatabase';

const EXCEL_PATH = path.resolve(__dirname, '../../../Tempoo 2025.xlsx');

async function importEmployeesFromExcel() {
  console.log('============================================================');
  console.log('📥 Importing employees from Excel');
  console.log('============================================================\n');

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_PATH);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error('Excel file has no worksheets');
    }

    const rows: Array<{ code: string; fullName: string; username: string; email: string }> = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const code = String(row.getCell(1).text || row.getCell(1).value || '').trim();
      const fullName = String(row.getCell(3).text || row.getCell(3).value || '').trim();
      const username = code;
      const email = `${username}@msspal.com`;

      if (!code) {
        console.warn(`⚠️  Row ${rowNumber} skipped (no employee code)`);
        return;
      }

      rows.push({
        code,
        fullName: fullName || code,
        username,
        email,
      });
    });

    console.log(`✅ Parsed ${rows.length} employees from Excel\n`);

    if (rows.length === 0) {
      console.log('No employees found in Excel.');
      return;
    }

    const pool = await getLocalConnection();
    const hashedPassword = await bcrypt.hash('MSS@2024', 10);

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const existing = await pool
        .request()
        .input('employee_code', sql.VarChar, row.code)
        .query('SELECT id FROM dbo.Users WHERE employee_code = @employee_code');

      if (existing.recordset.length > 0) {
        await pool
          .request()
          .input('employee_code', sql.VarChar, row.code)
          .input('username', sql.VarChar, row.username)
          .input('full_name', sql.NVarChar, row.fullName)
          .input('email', sql.VarChar, row.email)
          .query(`
            UPDATE dbo.Users
            SET username = @username,
                full_name = @full_name,
                email = @email
            WHERE employee_code = @employee_code
          `);
        updated++;
      } else {
        await pool
          .request()
          .input('username', sql.VarChar, row.username)
          .input('password', sql.VarChar, hashedPassword)
          .input('employee_code', sql.VarChar, row.code)
          .input('role', sql.VarChar, 'employee')
          .input('full_name', sql.NVarChar, row.fullName)
          .input('email', sql.VarChar, row.email)
          .query(`
            INSERT INTO dbo.Users
              (username, password, employee_code, role, full_name, email, is_active, created_at)
            VALUES
              (@username, @password, @employee_code, @role, @full_name, @email, 1, GETDATE())
          `);
        created++;
      }
    }

    console.log('\n============================================================');
    console.log('📊 Import Summary');
    console.log('============================================================');
    console.log(`✅ Created: ${created}`);
    console.log(`🔁 Updated: ${updated}`);
    console.log('============================================================');
  } catch (error) {
    console.error('❌ Failed to import employees from Excel:', error);
    process.exit(1);
  }
}

importEmployeesFromExcel();


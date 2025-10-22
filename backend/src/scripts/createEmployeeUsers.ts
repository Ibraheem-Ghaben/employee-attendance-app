import bcrypt from 'bcryptjs';
import { getConnection } from '../config/database';
import { getLocalConnection, sql } from '../config/localDatabase';

/**
 * Script to create user accounts for all employees from MSS_TA database
 * Username: employee_code
 * Password: Mss@2024 (for all)
 * Role: employee
 */

async function createEmployeeUsers() {
  try {
    console.log('============================================================');
    console.log('🚀 Creating Employee User Accounts');
    console.log('============================================================\n');

    // Step 1: Connect to MSS_TA and fetch all employees
    const allowedClockIds = (process.env.PUNCH_CLOCK_IDS || '3,10')
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !Number.isNaN(id));

    console.log('📊 Step 1: Fetching employees from MSS_TA database filtered by clock IDs:', allowedClockIds.join(', '));
    const mssPool = await getConnection();
    
    const employeesQuery = `
      SELECT DISTINCT
        employee.Employee_Code,
        employee.Employee_Name_1_English,
        employee.Employee_Name_1_Arabic,
        employee.first_Last_name_eng,
        employee.Company_Code,
        employee.Branch_Code,
        employee.Site_1_English
      FROM [Laserfiche].[dbo].[Laserfiche] AS employee
      LEFT JOIN [MSS_TA].[dbo].[final_attendance_records] AS record
        ON record.EnrollNumber = employee.Card_ID
      WHERE employee.Company_Code = 'MSS'
        AND employee.Branch_Code = 'MSS'
        AND record.clock_id IN (${allowedClockIds.join(',')})
        AND employee.Employee_Code IS NOT NULL
        AND employee.Employee_Code <> ''
      ORDER BY employee.Employee_Code
    `;

    const employeesResult = await mssPool.request().query(employeesQuery);
    const employees = employeesResult.recordset;

    console.log(`✅ Found ${employees.length} employees matching clock filter\n`);

    // Step 2: Connect to local database
    console.log('📊 Step 2: Connecting to local database (AttendanceAuthDB)...');
    const localPool = await getLocalConnection();
    console.log('✅ Connected to local database\n');

    // Step 3: Hash the password (same for all)
    const defaultPassword = 'MSS@2024';  // Fixed: uppercase to match admin/supervisor
    console.log('🔐 Step 3: Hashing default password...');
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    console.log('✅ Password hashed\n');

    // Step 4: Create users
    console.log('👥 Step 4: Creating user accounts...\n');

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const employee of employees) {
      try {
        const employeeCode = employee.Employee_Code.trim();
        const fullName = employee.Employee_Name_1_English || employee.Employee_Name_1_Arabic || 'Unknown';
        
        // Check if user already exists
        const existingUser = await localPool
          .request()
          .input('username', sql.VarChar, employeeCode)
          .query('SELECT id FROM [dbo].[Users] WHERE username = @username');

        if (existingUser.recordset.length > 0) {
          skipped++;
          process.stdout.write(`⏭️  Skipped ${employeeCode} (already exists)\r`);
          continue;
        }

        // Create user
        await localPool
          .request()
          .input('username', sql.VarChar, employeeCode)
          .input('password', sql.VarChar, hashedPassword)
          .input('employee_code', sql.VarChar, employeeCode)
          .input('role', sql.VarChar, 'employee')
          .input('full_name', sql.NVarChar, fullName)
          .input('email', sql.VarChar, `${employeeCode.toLowerCase()}@mss.com`)
          .query(`
            INSERT INTO [dbo].[Users] 
              (username, password, employee_code, role, full_name, email, is_active, created_at)
            VALUES 
              (@username, @password, @employee_code, @role, @full_name, @email, 1, GETDATE())
          `);

        created++;
        process.stdout.write(`✅ Created ${created}/${employees.length} users...\r`);

      } catch (error) {
        errors++;
        console.error(`\n❌ Error creating user for ${employee.Employee_Code}:`, error);
      }
    }

    console.log('\n');
    console.log('============================================================');
    console.log('📊 SUMMARY');
    console.log('============================================================');
    console.log(`✅ Created: ${created} users`);
    console.log(`⏭️  Skipped: ${skipped} users (already existed)`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total Employees: ${employees.length}`);
    console.log('============================================================\n');

    if (created > 0) {
      console.log('🎉 Employee users created successfully!');
      console.log('\n📝 Login Information:');
      console.log('   Username: [employee_code]');
      console.log('   Password: Mss@2024\n');
      console.log('Example:');
      console.log(`   Username: ${employees[0].Employee_Code}`);
      console.log('   Password: Mss@2024\n');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
  }
}

// Run the script
createEmployeeUsers();


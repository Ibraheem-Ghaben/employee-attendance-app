/**
 * Create default pay configurations for all active users
 */

import 'dotenv/config';
import { getLocalConnection, sql, closeLocalConnection } from '../config/localDatabase';

async function createPayConfigs() {
  try {
    const pool = await getLocalConnection();

    // Get all active users who don't have pay configs
    const usersResult = await pool.request().query(`
      SELECT u.employee_code, u.full_name
      FROM dbo.Users u
      LEFT JOIN dbo.EmployeePayConfig epc ON u.employee_code = epc.employee_code
      WHERE u.employee_code IS NOT NULL 
        AND u.is_active = 1
        AND epc.employee_code IS NULL
      ORDER BY u.employee_code
    `);

    const users = usersResult.recordset;
    console.log(`Found ${users.length} users without pay configs`);

    if (users.length === 0) {
      console.log('All users already have pay configurations.');
      return;
    }

    // Create default pay config for each user
    for (const user of users) {
      const employeeCode = user.employee_code;
      console.log(`Creating pay config for ${employeeCode} (${user.full_name})...`);

      await pool.request()
        .input('employee_code', sql.VarChar, employeeCode)
        .input('pay_type', sql.VarChar, 'Hourly')
        .input('hourly_rate_regular', sql.Decimal(10, 2), 30.00)
        .input('weekday_ot_rate_type', sql.VarChar, 'multiplier')
        .input('hourly_rate_weekday_ot', sql.Decimal(10, 2), null)
        .input('weekday_ot_multiplier', sql.Decimal(5, 2), 1.5)
        .input('weekend_ot_rate_type', sql.VarChar, 'multiplier')
        .input('hourly_rate_weekend_ot', sql.Decimal(10, 2), null)
        .input('weekend_ot_multiplier', sql.Decimal(5, 2), 2.0)
        .input('week_start', sql.VarChar, 'Sunday')
        .input('weekend_days', sql.VarChar, 'Friday,Saturday')
        .input('workday_start', sql.VarChar, '09:00:00')
        .input('workday_end', sql.VarChar, '17:00:00')
        .input('ot_start_time_on_workdays', sql.VarChar, '17:00:00')
        .input('minimum_daily_hours_for_pay', sql.Decimal(5, 2), 6.0)
        .query(`
          INSERT INTO dbo.EmployeePayConfig (
            employee_code, pay_type, hourly_rate_regular,
            weekday_ot_rate_type, hourly_rate_weekday_ot, weekday_ot_multiplier,
            weekend_ot_rate_type, hourly_rate_weekend_ot, weekend_ot_multiplier,
            week_start, weekend_days, workday_start, workday_end, 
            ot_start_time_on_workdays, minimum_daily_hours_for_pay
          )
          VALUES (
            @employee_code, @pay_type, @hourly_rate_regular,
            @weekday_ot_rate_type, @hourly_rate_weekday_ot, @weekday_ot_multiplier,
            @weekend_ot_rate_type, @hourly_rate_weekend_ot, @weekend_ot_multiplier,
            @week_start, @weekend_days, @workday_start, @workday_end,
            @ot_start_time_on_workdays, @minimum_daily_hours_for_pay
          )
        `);

      console.log(`✓ Created pay config for ${employeeCode}`);
    }

    console.log('\n✅ Successfully created pay configurations for all users!');
    console.log(`Total configs created: ${users.length}`);

  } catch (error) {
    console.error('❌ Error creating pay configs:', error);
    process.exitCode = 1;
  } finally {
    await closeLocalConnection();
  }
}

createPayConfigs();


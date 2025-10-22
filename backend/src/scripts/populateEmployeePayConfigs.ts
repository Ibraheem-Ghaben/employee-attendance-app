import { getLocalConnection, sql } from '../config/localDatabase';

/**
 * Populate EmployeePayConfig for all Users who don't have one, using site defaults (MSS_DEFAULT)
 */
async function populateEmployeePayConfigs() {
  try {
    console.log('============================================================');
    console.log('🚀 Populating EmployeePayConfig for users without config');
    console.log('============================================================');

    const pool = await getLocalConnection();

    // Load site defaults
    const siteRes = await pool.request()
      .input('site', sql.VarChar, 'MSS_DEFAULT')
      .query(`
        SELECT TOP 1 * FROM dbo.SitePayConfig WHERE site_code = @site
      `);

    const site = siteRes.recordset[0];
    if (!site) {
      console.log('⚠️  Site default MSS_DEFAULT not found. Using hardcoded defaults.');
    }

    const defaults = {
      week_start: site?.week_start || 'Sunday',
      weekend_days: site?.weekend_days || 'Friday,Saturday',
      workday_start: site?.workday_start || '09:00:00',
      workday_end: site?.workday_end || '17:00:00',
      ot_start: site?.ot_start_time_on_workdays || '17:00:00',
      hourly_rate_regular: site?.default_hourly_rate ?? 20.0,
      weekday_ot_multiplier: site?.default_weekday_ot_multiplier ?? 1.5,
      weekend_ot_multiplier: site?.default_weekend_ot_multiplier ?? 2.0,
      minimum_daily_hours_for_pay: 6.0,
    };

    // Find users missing EmployeePayConfig
    const missingRes = await pool.request().query(`
      SELECT u.employee_code
      FROM dbo.Users u
      LEFT JOIN dbo.EmployeePayConfig e ON e.employee_code = u.employee_code
      WHERE u.role = 'employee'
        AND u.is_active = 1
        AND u.employee_code IS NOT NULL
        AND e.employee_code IS NULL
      ORDER BY u.employee_code
    `);

    const missing = missingRes.recordset.map((r: any) => r.employee_code as string);
    console.log(`📋 Missing configs: ${missing.length}`);

    let created = 0;
    for (const employeeCode of missing) {
      try {
        await pool.request()
          .input('employee_code', sql.VarChar, employeeCode)
          .input('pay_type', sql.VarChar, 'Hourly')
          .input('hourly_rate_regular', sql.Decimal(10, 2), defaults.hourly_rate_regular)
          .input('weekday_ot_rate_type', sql.VarChar, 'multiplier')
          .input('hourly_rate_weekday_ot', sql.Decimal(10, 2), null)
          .input('weekday_ot_multiplier', sql.Decimal(5, 2), defaults.weekday_ot_multiplier)
          .input('weekend_ot_rate_type', sql.VarChar, 'multiplier')
          .input('hourly_rate_weekend_ot', sql.Decimal(10, 2), null)
          .input('weekend_ot_multiplier', sql.Decimal(5, 2), defaults.weekend_ot_multiplier)
          .input('week_start', sql.VarChar, defaults.week_start)
          .input('weekend_days', sql.VarChar, defaults.weekend_days)
          .input('workday_start', sql.Time, defaults.workday_start)
          .input('workday_end', sql.Time, defaults.workday_end)
          .input('ot_start', sql.Time, defaults.ot_start)
          .input('min_daily_hours', sql.Decimal(5, 2), defaults.minimum_daily_hours_for_pay)
          .query(`
            INSERT INTO dbo.EmployeePayConfig (
              employee_code, pay_type, hourly_rate_regular,
              weekday_ot_rate_type, hourly_rate_weekday_ot, weekday_ot_multiplier,
              weekend_ot_rate_type, hourly_rate_weekend_ot, weekend_ot_multiplier,
              week_start, weekend_days, workday_start, workday_end, ot_start_time_on_workdays,
              minimum_daily_hours_for_pay
            ) VALUES (
              @employee_code, @pay_type, @hourly_rate_regular,
              @weekday_ot_rate_type, @hourly_rate_weekday_ot, @weekday_ot_multiplier,
              @weekend_ot_rate_type, @hourly_rate_weekend_ot, @weekend_ot_multiplier,
              @week_start, @weekend_days, @workday_start, @workday_end, @ot_start,
              @min_daily_hours
            )
          `);
        created++;
        if (created % 25 === 0) process.stdout.write(`✅ Created ${created}/${missing.length} configs...\r`);
      } catch (err) {
        console.error(`❌ Failed to create config for ${employeeCode}:`, (err as Error).message);
      }
    }

    console.log('\n============================================================');
    console.log(`✅ Created ${created} EmployeePayConfig rows (out of ${missing.length})`);
    console.log('============================================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

populateEmployeePayConfigs();



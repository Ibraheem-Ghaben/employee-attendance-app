/**
 * Script to setup overtime database schema
 * Run with: ts-node src/scripts/setupOvertimeSchema.ts
 */

import { getLocalConnection } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function setupOvertimeSchema() {
  try {
    console.log('='.repeat(60));
    console.log('Setting up Overtime Database Schema...');
    console.log('='.repeat(60));
    console.log('');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../../overtime_schema.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    // Split by GO statements
    const batches = sqlScript
      .split(/\nGO\n/i)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    console.log(`Found ${batches.length} SQL batches to execute`);
    console.log('');

    const pool = await getLocalConnection();

    // Execute each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Skip comments-only batches
      if (batch.startsWith('--') && !batch.includes('CREATE') && !batch.includes('INSERT')) {
        continue;
      }

      console.log(`Executing batch ${i + 1}/${batches.length}...`);
      
      try {
        const result = await pool.request().query(batch);
        
        // Show any messages from SQL Server
        if (result.recordset && result.recordset.length > 0) {
          console.log('Results:', result.recordset);
        }
        
        console.log(`✓ Batch ${i + 1} completed`);
      } catch (error: any) {
        // Some batches might fail if tables already exist - that's okay
        if (error.message.includes('already exists')) {
          console.log(`  ℹ Batch ${i + 1}: ${error.message}`);
        } else {
          console.error(`  ✗ Batch ${i + 1} error:`, error.message);
          // Continue with other batches
        }
      }
      
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('Overtime Schema Setup Complete!');
    console.log('='.repeat(60));
    console.log('');

    // Verify tables exist
    console.log('Verifying tables...');
    const verifyResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('EmployeePayConfig', 'SitePayConfig', 'TimesheetDays', 'PunchRecords')
      ORDER BY TABLE_NAME
    `);

    console.log('\nTables created:');
    verifyResult.recordset.forEach((row: any) => {
      console.log(`  ✓ ${row.TABLE_NAME}`);
    });

    // Show sample configs
    console.log('\nEmployee Pay Configurations:');
    const configResult = await pool.request().query(`
      SELECT 
        employee_code,
        pay_type,
        hourly_rate_regular,
        weekday_ot_multiplier,
        weekend_ot_multiplier,
        week_start,
        weekend_days
      FROM dbo.EmployeePayConfig
    `);

    if (configResult.recordset.length > 0) {
      console.table(configResult.recordset);
    } else {
      console.log('  No configurations found yet.');
    }

    console.log('');
    console.log('✅ Setup complete! You can now use the overtime system.');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up schema:', error);
    process.exit(1);
  }
}

// Run the setup
setupOvertimeSchema();


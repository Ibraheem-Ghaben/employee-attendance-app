const sql = require('mssql');

const config = {
  server: '192.168.5.103',
  database: 'employee_attendance',
  user: 'sa',
  password: 'Mss@2025!@#',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function testStatistics() {
  try {
    await sql.connect(config);
    console.log('Connected to database');
    
    // Test the exact query used in the backend
    const query = `
      SELECT
        COUNT(*) AS totalRecords,
        SUM(CASE WHEN attendance.in_out_mode = 0 THEN 1 ELSE 0 END) AS totalCheckIns,
        SUM(CASE WHEN attendance.in_out_mode = 1 THEN 1 ELSE 0 END) AS totalCheckOuts,
        COUNT(DISTINCT attendance.employee_code) AS totalEmployees,
        COUNT(DISTINCT attendance.clock_description) AS totalSites,
        MAX(attendance.punch_time) AS lastPunchTime
      FROM dbo.SyncedAttendance AS attendance
    `;
    
    const result = await sql.query(query);
    const row = result.recordset[0];
    
    console.log('\n=== STATISTICS CALCULATION TEST ===');
    console.log('Total Records:', row.totalRecords);
    console.log('Total Check-Ins (in_out_mode = 0):', row.totalCheckIns);
    console.log('Total Check-Outs (in_out_mode = 1):', row.totalCheckOuts);
    console.log('Total Employees (distinct):', row.totalEmployees);
    console.log('Total Sites (distinct):', row.totalSites);
    console.log('Last Punch Time:', row.lastPunchTime);
    
    // Verify the calculations
    console.log('\n=== VERIFICATION ===');
    console.log('Check-Ins + Check-Outs =', row.totalCheckIns + row.totalCheckOuts);
    console.log('Should equal Total Records:', row.totalRecords);
    console.log('Match:', (row.totalCheckIns + row.totalCheckOuts) === row.totalRecords);
    
    // Check some sample data
    const sampleQuery = `
      SELECT TOP 10 
        employee_code, 
        in_out_mode, 
        punch_time, 
        clock_description
      FROM dbo.SyncedAttendance 
      ORDER BY punch_time DESC
    `;
    
    const sampleResult = await sql.query(sampleQuery);
    console.log('\n=== SAMPLE DATA (Last 10 records) ===');
    sampleResult.recordset.forEach((row, index) => {
      const mode = row.in_out_mode === 0 ? 'IN' : row.in_out_mode === 1 ? 'OUT' : 'UNKNOWN';
      console.log(`${index + 1}. ${row.employee_code} | ${mode} | ${row.punch_time} | ${row.clock_description}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

testStatistics();

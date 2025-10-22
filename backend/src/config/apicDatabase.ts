import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.APIC_DB_SERVER || process.env.DB_SERVER || '213.244.69.164',
  database: process.env.APIC_DB_NAME || 'MSS_TA',
  user: process.env.APIC_DB_USER || process.env.DB_USER || 'sa',
  password: process.env.APIC_DB_PASSWORD || process.env.DB_PASSWORD || '',
  port: parseInt(process.env.APIC_DB_PORT || process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let pool: sql.ConnectionPool | null = null;

export const getApicConnection = async (): Promise<sql.ConnectionPool> => {
  try {
    if (pool && pool.connected) {
      return pool;
    }

    if (pool && !pool.connected) {
      try {
        await pool.close();
      } catch (err) {
        // ignore
      }
      pool = null;
    }

    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✓ Connected to APIC MSS_TA:', config.server, '/', config.database);
    return pool;
  } catch (error) {
    console.error('❌ APIC MSS_TA connection error:', error);
    throw error;
  }
};

export const closeApicConnection = async (): Promise<void> => {
  if (pool) {
    try {
      await pool.close();
      pool = null;
      console.log('✓ APIC MSS_TA connection closed');
    } catch (error) {
      console.error('❌ Error closing APIC MSS_TA connection:', error);
    }
  }
};

export { sql };

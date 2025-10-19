import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'MSS_TA',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
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

// Create a dedicated connection pool instance for MSS_TA database
let pool: sql.ConnectionPool | null = null;

export const getConnection = async (): Promise<sql.ConnectionPool> => {
  try {
    // If pool exists and is connected, return it
    if (pool && pool.connected) {
      return pool;
    }

    // If pool exists but not connected, close it first
    if (pool && !pool.connected) {
      try {
        await pool.close();
      } catch (err) {
        // Ignore close errors
      }
      pool = null;
    }

    // Create NEW pool instance (not using global sql.connect)
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log('✓ Connected to MSS_TA Database:', config.server, '/', config.database);
    return pool;
  } catch (error) {
    console.error('❌ MSS_TA Database connection error:', error);
    throw error;
  }
};

export const closeConnection = async (): Promise<void> => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('✓ MSS_TA Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing MSS_TA database connection:', error);
    throw error;
  }
};

export { sql };

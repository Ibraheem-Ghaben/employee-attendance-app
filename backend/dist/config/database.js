"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = exports.closeLocalConnection = exports.getLocalConnection = exports.closeConnection = exports.getConnection = void 0;
const mssql_1 = __importDefault(require("mssql"));
exports.sql = mssql_1.default;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
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
let pool = null;
const getConnection = async () => {
    try {
        // If pool exists and is connected, return it
        if (pool && pool.connected) {
            return pool;
        }
        // If pool exists but not connected, close it first
        if (pool && !pool.connected) {
            try {
                await pool.close();
            }
            catch (err) {
                // Ignore close errors
            }
            pool = null;
        }
        // Create NEW pool instance (not using global sql.connect)
        pool = new mssql_1.default.ConnectionPool(config);
        await pool.connect();
        console.log('✓ Connected to MSS_TA Database:', config.server, '/', config.database);
        return pool;
    }
    catch (error) {
        console.error('❌ MSS_TA Database connection error:', error);
        throw error;
    }
};
exports.getConnection = getConnection;
const closeConnection = async () => {
    try {
        if (pool) {
            await pool.close();
            pool = null;
            console.log('✓ MSS_TA Database connection closed');
        }
    }
    catch (error) {
        console.error('❌ Error closing MSS_TA database connection:', error);
        throw error;
    }
};
exports.closeConnection = closeConnection;
// Also export getLocalConnection for convenience
var localDatabase_1 = require("./localDatabase");
Object.defineProperty(exports, "getLocalConnection", { enumerable: true, get: function () { return localDatabase_1.getLocalConnection; } });
Object.defineProperty(exports, "closeLocalConnection", { enumerable: true, get: function () { return localDatabase_1.closeLocalConnection; } });

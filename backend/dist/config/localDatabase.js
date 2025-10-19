"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = exports.closeLocalConnection = exports.getLocalConnection = void 0;
const mssql_1 = __importDefault(require("mssql"));
exports.sql = mssql_1.default;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const localConfig = {
    server: process.env.LOCAL_DB_SERVER || 'localhost',
    database: process.env.LOCAL_DB_NAME || 'AttendanceAuthDB',
    user: process.env.LOCAL_DB_USER || 'sa',
    password: process.env.LOCAL_DB_PASSWORD || '',
    port: parseInt(process.env.LOCAL_DB_PORT || '1433'),
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
// Create a dedicated connection pool instance for AttendanceAuthDB database
let localPool = null;
const getLocalConnection = async () => {
    try {
        // If pool exists and is connected, return it
        if (localPool && localPool.connected) {
            return localPool;
        }
        // If pool exists but not connected, close it first
        if (localPool && !localPool.connected) {
            try {
                await localPool.close();
            }
            catch (err) {
                // Ignore close errors
            }
            localPool = null;
        }
        // Create NEW pool instance (not using global sql.connect)
        localPool = new mssql_1.default.ConnectionPool(localConfig);
        await localPool.connect();
        console.log('✓ Connected to Local Auth Database:', localConfig.server, '/', localConfig.database);
        return localPool;
    }
    catch (error) {
        console.error('❌ Local database connection error:', error);
        throw error;
    }
};
exports.getLocalConnection = getLocalConnection;
const closeLocalConnection = async () => {
    try {
        if (localPool) {
            await localPool.close();
            localPool = null;
            console.log('✓ Local Auth Database connection closed');
        }
    }
    catch (error) {
        console.error('❌ Error closing local database connection:', error);
        throw error;
    }
};
exports.closeLocalConnection = closeLocalConnection;

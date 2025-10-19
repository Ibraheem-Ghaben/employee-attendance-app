"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const localDatabase_1 = require("../config/localDatabase");
/**
 * Script to update all employee passwords to MSS@2024
 */
async function updateEmployeePasswords() {
    try {
        console.log('============================================================');
        console.log('🔐 Updating Employee Passwords');
        console.log('============================================================\n');
        // Connect to local database
        console.log('📊 Connecting to local database (AttendanceAuthDB)...');
        const localPool = await (0, localDatabase_1.getLocalConnection)();
        console.log('✅ Connected to local database\n');
        // Hash the correct password
        const correctPassword = 'MSS@2024'; // Uppercase to match admin/supervisor
        console.log('🔐 Hashing password: MSS@2024...');
        const hashedPassword = await bcryptjs_1.default.hash(correctPassword, 10);
        console.log('✅ Password hashed\n');
        // Update all employee users
        console.log('📝 Updating passwords for all employee users...');
        const result = await localPool
            .request()
            .input('password', localDatabase_1.sql.VarChar, hashedPassword)
            .query(`
        UPDATE [dbo].[Users] 
        SET password = @password
        WHERE role = 'employee'
      `);
        console.log(`✅ Updated ${result.rowsAffected[0]} employee passwords\n`);
        console.log('============================================================');
        console.log('✅ SUCCESS!');
        console.log('============================================================');
        console.log('All employee passwords updated to: MSS@2024');
        console.log('Employees can now login with:');
        console.log('  Username: [employee_code]');
        console.log('  Password: MSS@2024');
        console.log('============================================================\n');
        process.exit(0);
    }
    catch (error) {
        console.error('\n❌ Fatal Error:', error);
        process.exit(1);
    }
}
// Run the script
updateEmployeePasswords();

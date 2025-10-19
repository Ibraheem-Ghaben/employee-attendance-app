"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const database_1 = require("../config/database");
class EmployeeService {
    /**
     * Get employee attendance records with pagination
     */
    async getEmployeeAttendance(page = 1, pageSize = 50) {
        try {
            const pool = await (0, database_1.getConnection)();
            const offset = (page - 1) * pageSize;
            // Query to get total count - start from MSS_TA and JOIN to Laserfiche VIEW
            const countQuery = `
        SELECT COUNT(*) as totalRecords
        FROM [dbo].[final_attendance_records] as record 
        LEFT JOIN [Laserfiche].[dbo].[Laserfiche] as employee
          ON record.EnrollNumber = employee.Card_ID
        WHERE employee.Company_Code = 'MSS' 
          AND employee.Branch_Code = 'MSS' 
          AND record.clock_id = 3
      `;
            const countResult = await pool.request().query(countQuery);
            const totalRecords = countResult.recordset[0].totalRecords;
            const totalPages = Math.ceil(totalRecords / pageSize);
            // Query to get paginated data - start from MSS_TA and JOIN to Laserfiche VIEW
            const dataQuery = `
        SELECT  
          employee.[Company_Code],
          employee.[Branch_Code],
          employee.[Employee_Code],
          employee.[Employee_Name_1_Arabic],
          employee.[Employee_Name_1_English],
          employee.[first_Last_name_a],
          employee.[first_Last_name_eng],
          employee.[Site_1_Arabic],
          employee.[Site_1_English],
          record.clock_id,
          record.InOutMode,
          record.punch_time
        FROM [MSS_TA].[dbo].[final_attendance_records] as record 
        LEFT JOIN [Laserfiche].[dbo].[Laserfiche] as employee
          ON record.EnrollNumber = employee.Card_ID
        WHERE employee.Company_Code = 'MSS' 
          AND employee.Branch_Code = 'MSS' 
          AND record.clock_id = 3
        ORDER BY record.punch_time DESC
        OFFSET @offset ROWS
        FETCH NEXT @pageSize ROWS ONLY
      `;
            const dataResult = await pool
                .request()
                .input('offset', database_1.sql.Int, offset)
                .input('pageSize', database_1.sql.Int, pageSize)
                .query(dataQuery);
            const employees = dataResult.recordset;
            return {
                data: employees,
                pagination: {
                    currentPage: page,
                    pageSize: pageSize,
                    totalRecords: totalRecords,
                    totalPages: totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                },
            };
        }
        catch (error) {
            console.error('Error fetching employee attendance:', error);
            throw error;
        }
    }
}
exports.EmployeeService = EmployeeService;

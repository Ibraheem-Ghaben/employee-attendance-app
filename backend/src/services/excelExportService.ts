import ExcelJS from 'exceljs';
import { EmployeeProfileService } from './employeeProfileService';

export class ExcelExportService {
  private employeeProfileService: EmployeeProfileService;

  constructor() {
    this.employeeProfileService = new EmployeeProfileService();
  }

  /**
   * Export attendance data to Excel
   */
  async exportAttendanceToExcel(
    employeeCode?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ExcelJS.Buffer> {
    try {
      // Use the unified service to get data
      const data = await this.employeeProfileService.getAttendanceForExport(
        employeeCode,
        startDate,
        endDate
      );

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Records');

      // Set up worksheet properties
      worksheet.properties.defaultRowHeight = 20;

      // Define columns
      worksheet.columns = [
        { header: 'Company', key: 'Company_Code', width: 12 },
        { header: 'Branch', key: 'Branch_Code', width: 12 },
        { header: 'Employee Code', key: 'Employee_Code', width: 15 },
        { header: 'Name (English)', key: 'Employee_Name_1_English', width: 30 },
        { header: 'Name (Arabic)', key: 'Employee_Name_1_Arabic', width: 30 },
        { header: 'Last Name', key: 'first_Last_name_eng', width: 20 },
        { header: 'Site (English)', key: 'Site_1_English', width: 20 },
        { header: 'Site (Arabic)', key: 'Site_1_Arabic', width: 20 },
        { header: 'Clock ID', key: 'clock_id', width: 10 },
        { header: 'In/Out', key: 'InOutMode', width: 10 },
        { header: 'Punch Time', key: 'punch_time', width: 20 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true, size: 12 };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // Add data rows
      data.forEach((record) => {
        const row = worksheet.addRow({
          Company_Code: record.Company_Code,
          Branch_Code: record.Branch_Code,
          Employee_Code: record.Employee_Code,
          Employee_Name_1_English: record.Employee_Name_1_English,
          Employee_Name_1_Arabic: record.Employee_Name_1_Arabic,
          first_Last_name_eng: record.first_Last_name_eng,
          Site_1_English: record.Site_1_English,
          Site_1_Arabic: record.Site_1_Arabic,
          clock_id: record.clock_id,
          InOutMode: record.InOutMode === 0 ? 'IN' : record.InOutMode === 1 ? 'OUT' : 'N/A',
          punch_time: record.punch_time 
            ? new Date(record.punch_time).toLocaleString()
            : 'N/A',
        });

        // Alternate row colors
        if (row.number % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' },
          };
        }
      });

      // Add borders to all cells
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      });

      // Add summary at the bottom
      const summaryRow = worksheet.addRow([]);
      summaryRow.getCell(1).value = 'Total Records:';
      summaryRow.getCell(1).font = { bold: true };
      summaryRow.getCell(2).value = data.length;
      summaryRow.getCell(2).font = { bold: true };

      // Generate export date
      const exportInfoRow = worksheet.addRow([]);
      exportInfoRow.getCell(1).value = 'Exported on:';
      exportInfoRow.getCell(1).font = { bold: true };
      exportInfoRow.getCell(2).value = new Date().toLocaleString();

      // Write to buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      return buffer as ExcelJS.Buffer;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }
}

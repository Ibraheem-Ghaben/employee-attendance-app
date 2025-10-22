export interface EmployeeProfile {
  // Employee Master Data
  Company_Code: string;
  Branch_Code: string;
  Employee_Code: string;
  Employee_Name_1_Arabic: string;
  Employee_Name_1_English: string;
  first_Last_name_a: string;
  first_Last_name_eng: string;
  Site_1_Arabic: string;
  Site_1_English: string;
  Card_ID?: string;
}

export interface EmployeeAttendanceRecord {
  clock_id: number;
  InOutMode: number;
  punch_time: Date | string;
  full_name?: string;
  clock_description?: string;
}

export interface EmployeeWithAttendance extends EmployeeProfile {
  clock_id: number;
  InOutMode: number;
  punch_time: Date | string;
}

export interface EmployeeProfileWithAttendance {
  profile: EmployeeProfile;
  attendanceRecords: EmployeeAttendanceRecord[];
  statistics: {
    totalRecords: number;
    totalCheckIns: number;
    totalCheckOuts: number;
    lastPunch?: string;
  };
}

export interface PaginatedEmployeeAttendance {
  data: EmployeeWithAttendance[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

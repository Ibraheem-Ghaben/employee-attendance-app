// Employee with attendance data (used in Dashboard)
export interface Employee {
  Company_Code: string;
  Branch_Code: string;
  Employee_Code: string;
  Employee_Name_1_Arabic: string;
  Employee_Name_1_English: string;
  first_Last_name_a: string;
  first_Last_name_eng: string;
  Site_1_Arabic: string;
  Site_1_English: string;
  clock_id: number;
  InOutMode: number;
  punch_time: string;
}

// Employee Profile (without attendance data)
export interface EmployeeProfile {
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

// Attendance record only
export interface AttendanceRecord {
  clock_id: number;
  InOutMode: number;
  punch_time: string;
}

// Pagination info
export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// API Response for employee list
export interface ApiResponse {
  success: boolean;
  data: Employee[];
  pagination: PaginationInfo;
}

// User Profile (from local database)
export interface UserProfile {
  id: number;
  username: string;
  employee_code: string | null;
  role: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  created_at?: string;
  last_login?: string;
}

// Profile Response
export interface ProfileResponse {
  success: boolean;
  profile: UserProfile;
  attendanceRecords: AttendanceRecord[];
  statistics: {
    totalRecords: number;
    totalCheckIns: number;
    totalCheckOuts: number;
    lastPunch?: string;
  } | null;
}

// Filter params
export interface FilterParams {
  employeeCode?: string;
  startDate?: string;
  endDate?: string;
}

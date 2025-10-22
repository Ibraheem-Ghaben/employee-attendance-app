import axios from 'axios';
import { ApiResponse, ProfileResponse, Employee } from '../types/employee';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Enhanced employee service with filtering
export const employeeService = {
  /**
   * Get employees with pagination and optional filtering
   */
  getEmployees: async (
    page: number = 1,
    pageSize: number = 50,
    employeeCode?: string,
    startDate?: string,
    endDate?: string,
    employeeName?: string,
    site?: string,
    inOutMode?: string
  ): Promise<ApiResponse> => {
    try {
      const params: any = { page, pageSize };
      
      if (employeeCode) params.employee_code = employeeCode;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (employeeName) params.employee_name = employeeName;
      if (site) params.site = site;
      if (inOutMode !== undefined && inOutMode !== '') params.in_out_mode = inOutMode;

      const response = await api.get<ApiResponse>('/employees', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  },

  /**
   * Get all employees for dropdowns and selectors
   */
  getEmployeeList: async (): Promise<Employee[]> => {
    try {
      const response = await api.get<{success: boolean, data: Employee[]}>('/employees/list');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching employee list:', error);
      throw error;
    }
  },

  /**
   * Get unique sites from database
   */
  getSites: async (): Promise<string[]> => {
    try {
      const response = await api.get<{ success: boolean; data: string[] }>('/sites');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching sites:', error);
      throw error;
    }
  },

  /**
   * Get dashboard statistics
   */
  getStatistics: async (employeeCode?: string, startDate?: string, endDate?: string): Promise<any> => {
    try {
      const params: any = {};
      if (employeeCode) params.employee_code = employeeCode;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get<{ success: boolean; data: any }>('/statistics', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  },

  /**
   * Get current user's profile with optional date filtering
   */
  getMyProfile: async (startDate?: string, endDate?: string): Promise<ProfileResponse> => {
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get<ProfileResponse>('/profile/my-profile', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  /**
   * Get specific employee profile
   */
  getEmployeeProfile: async (
    employeeCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<ProfileResponse> => {
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get<ProfileResponse>(`/profile/${employeeCode}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching employee profile:', error);
      throw error;
    }
  },

  /**
   * Export attendance data to Excel
   */
  exportAttendance: async (employeeCode?: string, startDate?: string, endDate?: string): Promise<Blob> => {
    try {
      const params: any = {};
      if (employeeCode) params.employee_code = employeeCode;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const token = localStorage.getItem('token');
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_URL}/export/attendance${queryString ? '?' + queryString : ''}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Export failed');
      return await response.blob();
    } catch (error) {
      console.error('Error exporting attendance:', error);
      throw error;
    }
  },

  /**
   * Export current user's attendance to Excel
   */
  exportMyAttendance: async (startDate?: string, endDate?: string): Promise<Blob> => {
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const token = localStorage.getItem('token');
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_URL}/export/my-attendance${queryString ? '?' + queryString : ''}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Export failed');
      return await response.blob();
    } catch (error) {
      console.error('Error exporting my attendance:', error);
      throw error;
    }
  },

  /**
   * Sync attendance data from APIC server
   */
  syncAttendance: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.post('/sync', {}, {
        timeout: 300000, // 5 minutes timeout for sync
      });
      return response.data;
    } catch (error) {
      console.error('Error syncing attendance:', error);
      throw error;
    }
  },
};

export default api;

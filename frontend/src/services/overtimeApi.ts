/**
 * Overtime API Service
 */

import axios from 'axios';
import {
  EmployeePayConfig,
  TimesheetDay,
  WeeklyReportSummary,
  CalculationRequest,
  CalculationResponse,
} from '../types/overtime';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Create axios instance with auth
const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================
// Pay Configuration API
// ============================================================

export const getEmployeePayConfig = async (employeeCode: string): Promise<EmployeePayConfig> => {
  const response = await api.get(`/overtime/config/${employeeCode}`);
  return response.data.data;
};

export const updateEmployeePayConfig = async (
  employeeCode: string,
  config: Partial<EmployeePayConfig>
): Promise<EmployeePayConfig> => {
  const response = await api.post(`/overtime/config/${employeeCode}`, config);
  return response.data.data;
};

export const getAllPayConfigs = async (): Promise<EmployeePayConfig[]> => {
  const response = await api.get('/overtime/config');
  return response.data.data;
};

// ============================================================
// Calculation API
// ============================================================

export const calculateTimesheets = async (
  request: CalculationRequest
): Promise<CalculationResponse> => {
  const response = await api.post('/overtime/calculate', request);
  return response.data;
};

export const calculateEmployeeTimesheets = async (
  employeeCode: string,
  fromDate: string,
  toDate: string,
  forceRecalculate: boolean = false
): Promise<CalculationResponse> => {
  const response = await api.post(`/overtime/calculate/${employeeCode}`, {
    from_date: fromDate,
    to_date: toDate,
    force_recalculate: forceRecalculate,
  });
  return response.data;
};

// ============================================================
// Reports API
// ============================================================

export const getWeeklyReport = async (
  fromDate: string,
  toDate: string,
  employeeCode?: string
): Promise<WeeklyReportSummary[]> => {
  const params: any = {
    from_date: fromDate,
    to_date: toDate,
  };
  
  if (employeeCode) {
    params.employee_code = employeeCode;
  }
  
  const response = await api.get('/overtime/reports/weekly', { params });
  return response.data.data;
};

export const exportWeeklyReport = async (
  fromDate: string,
  toDate: string,
  employeeCode?: string
): Promise<Blob> => {
  const params: any = {
    from_date: fromDate,
    to_date: toDate,
  };
  
  if (employeeCode) {
    params.employee_code = employeeCode;
  }
  
  const response = await api.get('/overtime/reports/weekly/export', {
    params,
    responseType: 'blob',
  });
  
  return response.data;
};

export const getTimesheetDays = async (
  employeeCode: string,
  fromDate: string,
  toDate: string
): Promise<TimesheetDay[]> => {
  const params = {
    from_date: fromDate,
    to_date: toDate,
  };
  
  const response = await api.get(`/overtime/timesheet/${employeeCode}`, { params });
  return response.data.data;
};

export const getPunches = async (
  employeeCode: string,
  fromDate: string,
  toDate: string
): Promise<Array<{ punch_time: string; punch_type: 'IN' | 'OUT' }>> => {
  const params = {
    from_date: fromDate,
    to_date: toDate,
  };
  const response = await api.get(`/overtime/punches/${employeeCode}`, { params });
  return response.data.data;
};

// ============================================================
// Helper Functions
// ============================================================

export const downloadExcelFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};


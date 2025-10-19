/**
 * Frontend Types for Overtime System
 */

export type PayType = 'Hourly' | 'Daily' | 'Monthly';
export type RateType = 'fixed' | 'multiplier';
export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface EmployeePayConfig {
  id?: number;
  employee_code: string;
  
  // Pay Type
  pay_type: PayType;
  hourly_rate_regular: number;
  
  // Weekday Overtime Configuration
  weekday_ot_rate_type: RateType;
  hourly_rate_weekday_ot?: number;
  weekday_ot_multiplier?: number;
  
  // Weekend Overtime Configuration
  weekend_ot_rate_type: RateType;
  hourly_rate_weekend_ot?: number;
  weekend_ot_multiplier?: number;
  
  // Weekly Calendar Configuration
  week_start: DayOfWeek;
  weekend_days: string;
  workday_start: string;
  workday_end: string;
  ot_start_time_on_workdays: string;
  
  // Minimum hours
  minimum_daily_hours_for_pay: number;
  
  // Audit
  created_at?: string;
  updated_at?: string;
}

export interface TimesheetDay {
  id?: number;
  employee_code: string;
  work_date: string;
  is_weekend: boolean;
  day_of_week: DayOfWeek;
  first_punch_in?: string;
  last_punch_out?: string;
  total_worked_minutes: number;
  regular_minutes: number;
  weekday_ot_minutes: number;
  weekend_ot_minutes: number;
  regular_pay: number;
  weekday_ot_pay: number;
  weekend_ot_pay: number;
  total_pay: number;
  hourly_rate_regular: number;
  hourly_rate_weekday_ot: number;
  hourly_rate_weekend_ot: number;
  is_calculated: boolean;
  calculation_error?: string;
}

export interface WeeklyReportRow {
  employee_code: string;
  employee_name: string;
  date: string;
  day: DayOfWeek;
  regular_hours: number;
  weekday_ot_hours: number;
  weekend_ot_hours: number;
  total_hours: number;
  regular_pay: number;
  weekday_ot_pay: number;
  weekend_ot_pay: number;
  daily_total: number;
}

export interface WeeklyReportSummary {
  employee_code: string;
  employee_name: string;
  week_start: string;
  week_end: string;
  total_regular_hours: number;
  total_weekday_ot_hours: number;
  total_weekend_ot_hours: number;
  total_hours: number;
  total_regular_pay: number;
  total_weekday_ot_pay: number;
  total_weekend_ot_pay: number;
  week_total_pay: number;
  days: WeeklyReportRow[];
}

export interface CalculationRequest {
  employee_code?: string;
  from_date: string;
  to_date: string;
  force_recalculate?: boolean;
}

export interface CalculationResponse {
  success: boolean;
  message: string;
  days_calculated: number;
  days_failed: number;
  errors?: string[];
}


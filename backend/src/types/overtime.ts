/**
 * Overtime and Pay Configuration Types
 * Weekly Calendar & 3-Bucket Overtime System
 */

export type PayType = 'Hourly' | 'Daily' | 'Monthly';
export type RateType = 'fixed' | 'multiplier';
export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
export type PunchType = 'IN' | 'OUT';

/**
 * Employee Pay Configuration
 */
export interface EmployeePayConfig {
  id?: number;
  employee_code: string;
  
  // Pay Type
  pay_type: PayType;
  hourly_rate_regular: number;
  
  // Weekday Overtime Configuration
  weekday_ot_rate_type: RateType;
  hourly_rate_weekday_ot?: number;  // Used if rate_type = 'fixed'
  weekday_ot_multiplier?: number;    // Used if rate_type = 'multiplier'
  
  // Weekend Overtime Configuration
  weekend_ot_rate_type: RateType;
  hourly_rate_weekend_ot?: number;  // Used if rate_type = 'fixed'
  weekend_ot_multiplier?: number;    // Used if rate_type = 'multiplier'
  
  // Weekly Calendar Configuration
  week_start: DayOfWeek;
  weekend_days: string;  // Comma-separated (e.g., "Friday,Saturday")
  workday_start: string;  // TIME format (e.g., "09:00:00")
  workday_end: string;
  ot_start_time_on_workdays: string;
  
  // Minimum hours for pay
  minimum_daily_hours_for_pay: number;
  
  // Audit fields
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Site Pay Configuration (Defaults)
 */
export interface SitePayConfig {
  id?: number;
  site_code: string;
  site_name: string;
  
  // Default weekly calendar
  week_start: DayOfWeek;
  weekend_days: string;
  workday_start: string;
  workday_end: string;
  ot_start_time_on_workdays: string;
  
  // Default pay rates
  default_hourly_rate: number;
  default_weekday_ot_multiplier: number;
  default_weekend_ot_multiplier: number;
  
  // Audit fields
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Timesheet Day (Daily breakdown with 3 buckets)
 */
export interface TimesheetDay {
  id?: number;
  employee_code: string;
  work_date: Date | string;
  
  // Day type
  is_weekend: boolean;
  day_of_week: DayOfWeek;
  
  // Punch times
  first_punch_in?: Date | string;
  last_punch_out?: Date | string;
  
  // Total worked time
  total_worked_minutes: number;
  
  // 3-Bucket breakdown (minutes)
  regular_minutes: number;
  weekday_ot_minutes: number;
  weekend_ot_minutes: number;
  
  // 3-Bucket pay calculation
  regular_pay: number;
  weekday_ot_pay: number;
  weekend_ot_pay: number;
  total_pay: number;
  
  // Pay rates used (audit trail)
  hourly_rate_regular: number;
  hourly_rate_weekday_ot: number;
  hourly_rate_weekend_ot: number;
  
  // Status
  is_calculated: boolean;
  calculation_error?: string;
  
  // Audit fields
  created_at?: Date;
  updated_at?: Date;
  calculated_at?: Date;
}

/**
 * Punch Record
 */
export interface PunchRecord {
  id?: number;
  employee_code: string;
  punch_time: Date | string;
  punch_type: PunchType;
  work_date: Date | string;
  
  // Link to timesheet day
  timesheet_day_id?: number;
  
  // Raw data reference
  clock_id?: number;
  card_id?: string;
  
  // Audit fields
  created_at?: Date;
}

/**
 * Punch Span (IN-OUT pair)
 */
export interface PunchSpan {
  punch_in: Date;
  punch_out: Date;
  duration_minutes: number;
}

/**
 * Time Range
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Bucket Calculation Result
 */
export interface BucketCalculation {
  regular_minutes: number;
  weekday_ot_minutes: number;
  weekend_ot_minutes: number;
  regular_pay: number;
  weekday_ot_pay: number;
  weekend_ot_pay: number;
  total_pay: number;
}

/**
 * Weekly Report Row
 */
export interface WeeklyReportRow {
  employee_code: string;
  employee_name: string;
  date: Date | string;
  day: DayOfWeek;
  
  // Hours (converted from minutes)
  regular_hours: number;
  weekday_ot_hours: number;
  weekend_ot_hours: number;
  total_hours: number;
  
  // Pay
  regular_pay: number;
  weekday_ot_pay: number;
  weekend_ot_pay: number;
  daily_total: number;
}

/**
 * Weekly Report Summary
 */
export interface WeeklyReportSummary {
  employee_code: string;
  employee_name: string;
  week_start: Date | string;
  week_end: Date | string;
  
  // Total hours
  total_regular_hours: number;
  total_weekday_ot_hours: number;
  total_weekend_ot_hours: number;
  total_hours: number;
  
  // Total pay
  total_regular_pay: number;
  total_weekday_ot_pay: number;
  total_weekend_ot_pay: number;
  week_total_pay: number;
  
  // Daily breakdown
  days: WeeklyReportRow[];
}

/**
 * Calculation Request
 */
export interface CalculationRequest {
  employee_code?: string;  // If not provided, calculate for all
  from_date: Date | string;
  to_date: Date | string;
  force_recalculate?: boolean;  // Recalculate even if already calculated
}

/**
 * Calculation Response
 */
export interface CalculationResponse {
  success: boolean;
  message: string;
  days_calculated: number;
  days_failed: number;
  errors?: string[];
}

/**
 * Pay Config Update Request
 */
export interface PayConfigUpdateRequest {
  employee_code: string;
  
  // Pay configuration
  pay_type?: PayType;
  hourly_rate_regular?: number;
  
  // Weekday OT
  weekday_ot_rate_type?: RateType;
  hourly_rate_weekday_ot?: number;
  weekday_ot_multiplier?: number;
  
  // Weekend OT
  weekend_ot_rate_type?: RateType;
  hourly_rate_weekend_ot?: number;
  weekend_ot_multiplier?: number;
  
  // Schedule
  week_start?: DayOfWeek;
  weekend_days?: string;
  workday_start?: string;
  workday_end?: string;
  ot_start_time_on_workdays?: string;
  minimum_daily_hours_for_pay?: number;
}

/**
 * Settings Update Request
 */
export interface WorkweekSettingsRequest {
  site_code?: string;  // If provided, update site defaults
  employee_code?: string;  // If provided, update specific employee
  
  week_start: DayOfWeek;
  weekend_days: string[];  // Array of day names
  workday_start: string;  // HH:MM format
  workday_end: string;
  ot_start_time_on_workdays: string;
  minimum_daily_hours_for_pay?: number;
}

/**
 * Weekly Report Request
 */
export interface WeeklyReportRequest {
  employee_code?: string;  // Optional: specific employee or all
  from_date: Date | string;
  to_date: Date | string;
  include_daily_breakdown?: boolean;
}


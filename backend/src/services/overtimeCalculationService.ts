/**
 * Overtime Calculation Engine
 * Implements the 3-bucket overtime calculation system
 */

import {
  EmployeePayConfig,
  PunchSpan,
  TimeRange,
  BucketCalculation,
  DayOfWeek,
} from '../types/overtime';

export class OvertimeCalculationService {
  /**
   * Main calculation: Split worked time into 3 buckets and calculate pay
   */
  calculate(
    date: Date,
    workedSpans: PunchSpan[],
    config: EmployeePayConfig
  ): BucketCalculation {
    const isWeekend = this.isWeekendDay(date, config.weekend_days);
    
    let regular_minutes = 0;
    let weekday_ot_minutes = 0;
    let weekend_ot_minutes = 0;

    // Parse config times for this date
    const workStart = this.parseTimeOnDate(date, config.workday_start);
    const otStart = this.parseTimeOnDate(date, config.ot_start_time_on_workdays);

    for (const span of workedSpans) {
      if (isWeekend) {
        // All minutes on weekend count as weekend OT
        weekend_ot_minutes += this.minutesOverlap(
          { start: span.punch_in, end: span.punch_out },
          { start: span.punch_in, end: span.punch_out }
        );
      } else {
        // Workday: split between regular and weekday OT
        regular_minutes += this.minutesOverlap(
          { start: span.punch_in, end: span.punch_out },
          { start: workStart, end: otStart }
        );
        
        weekday_ot_minutes += this.minutesOverlap(
          { start: span.punch_in, end: span.punch_out },
          { start: otStart, end: this.getEndOfDay(date) }
        );
      }
    }

    // Calculate pay for each bucket
    const rates = this.calculateRates(config);
    
    const regular_pay = (regular_minutes / 60) * rates.regular;
    const weekday_ot_pay = (weekday_ot_minutes / 60) * rates.weekday_ot;
    const weekend_ot_pay = (weekend_ot_minutes / 60) * rates.weekend_ot;
    const total_pay = regular_pay + weekday_ot_pay + weekend_ot_pay;

    return {
      regular_minutes,
      weekday_ot_minutes,
      weekend_ot_minutes,
      regular_pay: this.roundToCents(regular_pay),
      weekday_ot_pay: this.roundToCents(weekday_ot_pay),
      weekend_ot_pay: this.roundToCents(weekend_ot_pay),
      total_pay: this.roundToCents(total_pay),
    };
  }

  /**
   * Calculate effective hourly rates based on configuration
   */
  calculateRates(config: EmployeePayConfig): {
    regular: number;
    weekday_ot: number;
    weekend_ot: number;
  } {
    const regular = config.hourly_rate_regular;
    
    let weekday_ot: number;
    if (config.weekday_ot_rate_type === 'fixed') {
      weekday_ot = config.hourly_rate_weekday_ot || 0;
    } else {
      weekday_ot = regular * (config.weekday_ot_multiplier || 1.0);
    }
    
    let weekend_ot: number;
    if (config.weekend_ot_rate_type === 'fixed') {
      weekend_ot = config.hourly_rate_weekend_ot || 0;
    } else {
      weekend_ot = regular * (config.weekend_ot_multiplier || 1.0);
    }

    return { regular, weekday_ot, weekend_ot };
  }

  /**
   * Check if a date falls on a weekend based on config
   */
  isWeekendDay(date: Date, weekendDays: string): boolean {
    const dayName = this.getDayName(date);
    const weekendArray = weekendDays.split(',').map((d) => d.trim());
    return weekendArray.includes(dayName);
  }

  /**
   * Get day of week name
   */
  getDayName(date: Date): DayOfWeek {
    const days: DayOfWeek[] = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[date.getDay()];
  }

  /**
   * Parse time string (HH:MM:SS or HH:MM) and apply to date
   */
  parseTimeOnDate(date: Date, timeStr: string): Date {
    const [hours, minutes, seconds = '0'] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, parseInt(seconds.toString()), 0);
    return result;
  }

  /**
   * Get end of day (23:59:59)
   */
  getEndOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * Calculate overlap in minutes between two time ranges
   */
  minutesOverlap(span: TimeRange, range: TimeRange): number {
    const overlapStart = new Date(Math.max(span.start.getTime(), range.start.getTime()));
    const overlapEnd = new Date(Math.min(span.end.getTime(), range.end.getTime()));

    if (overlapStart >= overlapEnd) {
      return 0;
    }

    return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
  }

  /**
   * Convert punch records to spans (pair IN/OUT)
   */
  pairPunchesToSpans(punches: Array<{ punch_time: Date; punch_type: 'IN' | 'OUT' }>): PunchSpan[] {
    const spans: PunchSpan[] = [];
    
    // Sort by time
    const sorted = [...punches].sort(
      (a, b) => a.punch_time.getTime() - b.punch_time.getTime()
    );

    let currentIn: Date | null = null;

    for (const punch of sorted) {
      if (punch.punch_type === 'IN') {
        currentIn = punch.punch_time;
      } else if (punch.punch_type === 'OUT' && currentIn) {
        const duration_minutes = Math.round(
          (punch.punch_time.getTime() - currentIn.getTime()) / (1000 * 60)
        );
        
        spans.push({
          punch_in: currentIn,
          punch_out: punch.punch_time,
          duration_minutes,
        });
        
        currentIn = null;
      }
    }

    return spans;
  }

  /**
   * Round to 2 decimal places (cents)
   */
  roundToCents(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Calculate total worked minutes from spans
   */
  totalWorkedMinutes(spans: PunchSpan[]): number {
    return spans.reduce((sum, span) => sum + span.duration_minutes, 0);
  }

  /**
   * Apply grace period/rounding to punch times (optional feature)
   */
  applyGracePeriod(
    punchTime: Date,
    gracePeriodMinutes: number,
    roundTo: 'nearest' | 'up' | 'down' = 'nearest'
  ): Date {
    const result = new Date(punchTime);
    const minutes = result.getMinutes();

    let roundedMinutes: number;
    switch (roundTo) {
      case 'up':
        roundedMinutes = Math.ceil(minutes / gracePeriodMinutes) * gracePeriodMinutes;
        break;
      case 'down':
        roundedMinutes = Math.floor(minutes / gracePeriodMinutes) * gracePeriodMinutes;
        break;
      default: // nearest
        roundedMinutes = Math.round(minutes / gracePeriodMinutes) * gracePeriodMinutes;
    }

    result.setMinutes(roundedMinutes, 0, 0);
    return result;
  }

  /**
   * Get week start date for a given date
   */
  getWeekStart(date: Date, weekStart: DayOfWeek): Date {
    const daysOfWeek: DayOfWeek[] = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    
    const targetDayIndex = daysOfWeek.indexOf(weekStart);
    const currentDayIndex = date.getDay();
    
    let daysToSubtract = currentDayIndex - targetDayIndex;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }

    const weekStartDate = new Date(date);
    weekStartDate.setDate(date.getDate() - daysToSubtract);
    weekStartDate.setHours(0, 0, 0, 0);
    
    return weekStartDate;
  }

  /**
   * Get week end date for a given date
   */
  getWeekEnd(date: Date, weekStart: DayOfWeek): Date {
    const weekStartDate = this.getWeekStart(date, weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);
    return weekEndDate;
  }

  /**
   * Get all dates in a week
   */
  getWeekDates(weekStart: Date): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Parse date string (various formats)
   */
  parseDate(dateStr: string | Date): Date {
    if (dateStr instanceof Date) {
      return dateStr;
    }
    return new Date(dateStr);
  }

  /**
   * Validate pay configuration
   */
  validateConfig(config: EmployeePayConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.hourly_rate_regular <= 0) {
      errors.push('Regular hourly rate must be greater than 0');
    }

    if (config.weekday_ot_rate_type === 'fixed') {
      if (!config.hourly_rate_weekday_ot || config.hourly_rate_weekday_ot <= 0) {
        errors.push('Weekday OT rate must be specified when rate type is "fixed"');
      }
    } else {
      if (!config.weekday_ot_multiplier || config.weekday_ot_multiplier <= 0) {
        errors.push('Weekday OT multiplier must be specified when rate type is "multiplier"');
      }
    }

    if (config.weekend_ot_rate_type === 'fixed') {
      if (!config.hourly_rate_weekend_ot || config.hourly_rate_weekend_ot <= 0) {
        errors.push('Weekend OT rate must be specified when rate type is "fixed"');
      }
    } else {
      if (!config.weekend_ot_multiplier || config.weekend_ot_multiplier <= 0) {
        errors.push('Weekend OT multiplier must be specified when rate type is "multiplier"');
      }
    }

    if (!config.weekend_days || config.weekend_days.trim() === '') {
      errors.push('Weekend days must be specified');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const overtimeCalculationService = new OvertimeCalculationService();


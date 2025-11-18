"use strict";
/**
 * Overtime Calculation Engine
 * Implements the 3-bucket overtime calculation system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.overtimeCalculationService = exports.OvertimeCalculationService = void 0;
class OvertimeCalculationService {
    /**
     * Main calculation: Split worked time into 3 buckets and calculate pay
     */
    calculate(date, workedSpans, config) {
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
                weekend_ot_minutes += this.minutesOverlap({ start: span.punch_in, end: span.punch_out }, { start: span.punch_in, end: span.punch_out });
            }
            else {
                // Workday: split between regular and weekday OT
                regular_minutes += this.minutesOverlap({ start: span.punch_in, end: span.punch_out }, { start: workStart, end: otStart });
                weekday_ot_minutes += this.minutesOverlap({ start: span.punch_in, end: span.punch_out }, { start: otStart, end: this.getEndOfDay(date) });
            }
        }
        // Calculate pay for each bucket based on pay type
        const rates = this.calculateRates(config);
        let regular_pay = 0;
        let weekday_ot_pay = 0;
        let weekend_ot_pay = 0;
        if (config.pay_type === 'Hourly') {
            // Hourly: Pay per hour
            regular_pay = (regular_minutes / 60) * rates.regular;
            weekday_ot_pay = (weekday_ot_minutes / 60) * rates.weekday_ot;
            weekend_ot_pay = (weekend_ot_minutes / 60) * rates.weekend_ot;
        }
        else if (config.pay_type === 'Daily') {
            // Daily: Pay per day (8 hours = 1 day)
            const hoursPerDay = 8;
            const regularDays = regular_minutes / (hoursPerDay * 60);
            const weekdayOTDays = weekday_ot_minutes / (hoursPerDay * 60);
            const weekendOTDays = weekend_ot_minutes / (hoursPerDay * 60);
            regular_pay = regularDays * (config.daily_rate || 0);
            weekday_ot_pay = weekdayOTDays * (config.daily_rate || 0) * (config.weekday_ot_multiplier || 1.5);
            weekend_ot_pay = weekendOTDays * (config.daily_rate || 0) * (config.weekend_ot_multiplier || 2.0);
        }
        else if (config.pay_type === 'Monthly') {
            // Monthly: Convert to hourly based on standard month (22 working days, 8 hours/day = 176 hours)
            const monthlyHours = 176;
            const hourlyFromMonthly = (config.monthly_salary || 0) / monthlyHours;
            regular_pay = (regular_minutes / 60) * hourlyFromMonthly;
            weekday_ot_pay = (weekday_ot_minutes / 60) * hourlyFromMonthly * (config.weekday_ot_multiplier || 1.5);
            weekend_ot_pay = (weekend_ot_minutes / 60) * hourlyFromMonthly * (config.weekend_ot_multiplier || 2.0);
        }
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
    calculateRates(config) {
        const regular = config.hourly_rate_regular;
        let weekday_ot;
        if (config.weekday_ot_rate_type === 'fixed') {
            weekday_ot = config.hourly_rate_weekday_ot || 0;
        }
        else {
            weekday_ot = regular * (config.weekday_ot_multiplier || 1.0);
        }
        let weekend_ot;
        if (config.weekend_ot_rate_type === 'fixed') {
            weekend_ot = config.hourly_rate_weekend_ot || 0;
        }
        else {
            weekend_ot = regular * (config.weekend_ot_multiplier || 1.0);
        }
        return { regular, weekday_ot, weekend_ot };
    }
    /**
     * Check if a date falls on a weekend based on config
     */
    isWeekendDay(date, weekendDays) {
        const dayName = this.getDayName(date);
        const weekendArray = weekendDays.split(',').map((d) => d.trim());
        return weekendArray.includes(dayName);
    }
    /**
     * Get day of week name
     */
    getDayName(date) {
        const days = [
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
    parseTimeOnDate(date, timeVal) {
        const result = new Date(date);
        let hours = 0;
        let minutes = 0;
        let seconds = 0;
        if (timeVal instanceof Date) {
            hours = timeVal.getHours();
            minutes = timeVal.getMinutes();
            seconds = timeVal.getSeconds();
        }
        else if (typeof timeVal === 'string') {
            const parts = timeVal.split(':');
            hours = parseInt(parts[0] || '0', 10) || 0;
            minutes = parseInt(parts[1] || '0', 10) || 0;
            seconds = parseInt(parts[2] || '0', 10) || 0;
        }
        else if (typeof timeVal === 'number') {
            // Interpret number as minutes from midnight
            hours = Math.floor(timeVal / 60);
            minutes = Math.floor(timeVal % 60);
            seconds = 0;
        }
        else {
            // Fallback to start of day if undefined/null/unknown
            hours = 0;
            minutes = 0;
            seconds = 0;
        }
        result.setHours(hours, minutes, seconds, 0);
        return result;
    }
    /**
     * Get end of day (23:59:59)
     */
    getEndOfDay(date) {
        const result = new Date(date);
        result.setHours(23, 59, 59, 999);
        return result;
    }
    /**
     * Calculate overlap in minutes between two time ranges
     */
    minutesOverlap(span, range) {
        const overlapStart = new Date(Math.max(span.start.getTime(), range.start.getTime()));
        const overlapEnd = new Date(Math.min(span.end.getTime(), range.end.getTime()));
        if (overlapStart >= overlapEnd) {
            return 0;
        }
        return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
    }
    /**
     * Convert punch records to spans (pair IN/OUT)
     * Simple mode: First punch = IN, Last punch = OUT
     */
    pairPunchesToSpans(punches) {
        const spans = [];
        if (punches.length === 0) {
            return spans;
        }
        // Sort by time
        const sorted = [...punches].sort((a, b) => a.punch_time.getTime() - b.punch_time.getTime());
        // Simple approach: First punch = IN, Last punch = OUT
        if (sorted.length >= 2) {
            const firstPunch = sorted[0].punch_time;
            const lastPunch = sorted[sorted.length - 1].punch_time;
            const duration_minutes = Math.round((lastPunch.getTime() - firstPunch.getTime()) / (1000 * 60));
            if (duration_minutes > 0) {
                spans.push({
                    punch_in: firstPunch,
                    punch_out: lastPunch,
                    duration_minutes,
                });
            }
        }
        return spans;
    }
    /**
     * Round to 2 decimal places (cents)
     */
    roundToCents(value) {
        return Math.round(value * 100) / 100;
    }
    /**
     * Calculate total worked minutes from spans
     */
    totalWorkedMinutes(spans) {
        return spans.reduce((sum, span) => sum + span.duration_minutes, 0);
    }
    /**
     * Apply grace period/rounding to punch times (optional feature)
     */
    applyGracePeriod(punchTime, gracePeriodMinutes, roundTo = 'nearest') {
        const result = new Date(punchTime);
        const minutes = result.getMinutes();
        let roundedMinutes;
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
    getWeekStart(date, weekStart) {
        const daysOfWeek = [
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
    getWeekEnd(date, weekStart) {
        const weekStartDate = this.getWeekStart(date, weekStart);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6);
        weekEndDate.setHours(23, 59, 59, 999);
        return weekEndDate;
    }
    /**
     * Get all dates in a week
     */
    getWeekDates(weekStart) {
        const dates = [];
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
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    /**
     * Parse date string (various formats)
     */
    parseDate(dateStr) {
        if (dateStr instanceof Date) {
            return dateStr;
        }
        return new Date(dateStr);
    }
    /**
     * Validate pay configuration
     */
    validateConfig(config) {
        const errors = [];
        if (config.hourly_rate_regular <= 0) {
            errors.push('Regular hourly rate must be greater than 0');
        }
        if (config.weekday_ot_rate_type === 'fixed') {
            if (!config.hourly_rate_weekday_ot || config.hourly_rate_weekday_ot <= 0) {
                errors.push('Weekday OT rate must be specified when rate type is "fixed"');
            }
        }
        else {
            if (!config.weekday_ot_multiplier || config.weekday_ot_multiplier <= 0) {
                errors.push('Weekday OT multiplier must be specified when rate type is "multiplier"');
            }
        }
        if (config.weekend_ot_rate_type === 'fixed') {
            if (!config.hourly_rate_weekend_ot || config.hourly_rate_weekend_ot <= 0) {
                errors.push('Weekend OT rate must be specified when rate type is "fixed"');
            }
        }
        else {
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
exports.OvertimeCalculationService = OvertimeCalculationService;
// Export singleton instance
exports.overtimeCalculationService = new OvertimeCalculationService();

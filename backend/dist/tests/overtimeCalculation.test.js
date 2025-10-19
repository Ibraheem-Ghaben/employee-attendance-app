"use strict";
/**
 * Unit Tests for Overtime Calculation Engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
const overtimeCalculationService_1 = require("../services/overtimeCalculationService");
describe('OvertimeCalculationService', () => {
    // Sample configuration
    const baseConfig = {
        employee_code: 'TEST001',
        pay_type: 'Hourly',
        hourly_rate_regular: 20.00,
        weekday_ot_rate_type: 'multiplier',
        weekday_ot_multiplier: 1.5,
        weekend_ot_rate_type: 'multiplier',
        weekend_ot_multiplier: 2.0,
        week_start: 'Sunday',
        weekend_days: 'Friday,Saturday',
        workday_start: '09:00:00',
        workday_end: '17:00:00',
        ot_start_time_on_workdays: '17:00:00',
        minimum_daily_hours_for_pay: 6.0,
    };
    describe('calculateRates', () => {
        it('should calculate rates with multipliers correctly', () => {
            const rates = overtimeCalculationService_1.overtimeCalculationService.calculateRates(baseConfig);
            expect(rates.regular).toBe(20.00);
            expect(rates.weekday_ot).toBe(30.00); // 20 × 1.5
            expect(rates.weekend_ot).toBe(40.00); // 20 × 2.0
        });
        it('should calculate rates with fixed values correctly', () => {
            const config = {
                ...baseConfig,
                weekday_ot_rate_type: 'fixed',
                hourly_rate_weekday_ot: 35.00,
                weekend_ot_rate_type: 'fixed',
                hourly_rate_weekend_ot: 45.00,
            };
            const rates = overtimeCalculationService_1.overtimeCalculationService.calculateRates(config);
            expect(rates.regular).toBe(20.00);
            expect(rates.weekday_ot).toBe(35.00);
            expect(rates.weekend_ot).toBe(45.00);
        });
    });
    describe('isWeekendDay', () => {
        it('should identify Friday as weekend', () => {
            const friday = new Date('2025-01-03'); // Friday
            const isWeekend = overtimeCalculationService_1.overtimeCalculationService.isWeekendDay(friday, 'Friday,Saturday');
            expect(isWeekend).toBe(true);
        });
        it('should identify Saturday as weekend', () => {
            const saturday = new Date('2025-01-04'); // Saturday
            const isWeekend = overtimeCalculationService_1.overtimeCalculationService.isWeekendDay(saturday, 'Friday,Saturday');
            expect(isWeekend).toBe(true);
        });
        it('should identify Monday as not weekend', () => {
            const monday = new Date('2025-01-06'); // Monday
            const isWeekend = overtimeCalculationService_1.overtimeCalculationService.isWeekendDay(monday, 'Friday,Saturday');
            expect(isWeekend).toBe(false);
        });
    });
    describe('getDayName', () => {
        it('should return correct day names', () => {
            expect(overtimeCalculationService_1.overtimeCalculationService.getDayName(new Date('2025-01-05'))).toBe('Sunday');
            expect(overtimeCalculationService_1.overtimeCalculationService.getDayName(new Date('2025-01-06'))).toBe('Monday');
            expect(overtimeCalculationService_1.overtimeCalculationService.getDayName(new Date('2025-01-07'))).toBe('Tuesday');
            expect(overtimeCalculationService_1.overtimeCalculationService.getDayName(new Date('2025-01-03'))).toBe('Friday');
            expect(overtimeCalculationService_1.overtimeCalculationService.getDayName(new Date('2025-01-04'))).toBe('Saturday');
        });
    });
    describe('minutesOverlap', () => {
        it('should calculate overlap correctly', () => {
            const span = {
                start: new Date('2025-01-06T09:00:00'),
                end: new Date('2025-01-06T18:00:00'),
            };
            const range = {
                start: new Date('2025-01-06T09:00:00'),
                end: new Date('2025-01-06T17:00:00'),
            };
            const overlap = overtimeCalculationService_1.overtimeCalculationService.minutesOverlap(span, range);
            expect(overlap).toBe(480); // 8 hours = 480 minutes
        });
        it('should return 0 for non-overlapping ranges', () => {
            const span = {
                start: new Date('2025-01-06T09:00:00'),
                end: new Date('2025-01-06T12:00:00'),
            };
            const range = {
                start: new Date('2025-01-06T13:00:00'),
                end: new Date('2025-01-06T17:00:00'),
            };
            const overlap = overtimeCalculationService_1.overtimeCalculationService.minutesOverlap(span, range);
            expect(overlap).toBe(0);
        });
        it('should calculate partial overlap correctly', () => {
            const span = {
                start: new Date('2025-01-06T16:00:00'),
                end: new Date('2025-01-06T19:00:00'),
            };
            const range = {
                start: new Date('2025-01-06T17:00:00'),
                end: new Date('2025-01-06T20:00:00'),
            };
            const overlap = overtimeCalculationService_1.overtimeCalculationService.minutesOverlap(span, range);
            expect(overlap).toBe(120); // 2 hours = 120 minutes
        });
    });
    describe('pairPunchesToSpans', () => {
        it('should pair IN/OUT punches correctly', () => {
            const punches = [
                { punch_time: new Date('2025-01-06T09:00:00'), punch_type: 'IN' },
                { punch_time: new Date('2025-01-06T17:00:00'), punch_type: 'OUT' },
            ];
            const spans = overtimeCalculationService_1.overtimeCalculationService.pairPunchesToSpans(punches);
            expect(spans.length).toBe(1);
            expect(spans[0].duration_minutes).toBe(480); // 8 hours
        });
        it('should handle multiple pairs', () => {
            const punches = [
                { punch_time: new Date('2025-01-06T09:00:00'), punch_type: 'IN' },
                { punch_time: new Date('2025-01-06T12:00:00'), punch_type: 'OUT' },
                { punch_time: new Date('2025-01-06T13:00:00'), punch_type: 'IN' },
                { punch_time: new Date('2025-01-06T17:00:00'), punch_type: 'OUT' },
            ];
            const spans = overtimeCalculationService_1.overtimeCalculationService.pairPunchesToSpans(punches);
            expect(spans.length).toBe(2);
            expect(spans[0].duration_minutes).toBe(180); // 3 hours
            expect(spans[1].duration_minutes).toBe(240); // 4 hours
        });
        it('should ignore unpaired punches', () => {
            const punches = [
                { punch_time: new Date('2025-01-06T09:00:00'), punch_type: 'IN' },
                { punch_time: new Date('2025-01-06T12:00:00'), punch_type: 'OUT' },
                { punch_time: new Date('2025-01-06T13:00:00'), punch_type: 'IN' },
                // Missing OUT
            ];
            const spans = overtimeCalculationService_1.overtimeCalculationService.pairPunchesToSpans(punches);
            expect(spans.length).toBe(1);
            expect(spans[0].duration_minutes).toBe(180);
        });
    });
    describe('calculate - Workday Scenarios', () => {
        it('should calculate regular hours only (no overtime)', () => {
            const date = new Date('2025-01-06'); // Monday
            const spans = [
                {
                    punch_in: new Date('2025-01-06T09:00:00'),
                    punch_out: new Date('2025-01-06T17:00:00'),
                    duration_minutes: 480,
                },
            ];
            const result = overtimeCalculationService_1.overtimeCalculationService.calculate(date, spans, baseConfig);
            expect(result.regular_minutes).toBe(480); // 8 hours
            expect(result.weekday_ot_minutes).toBe(0);
            expect(result.weekend_ot_minutes).toBe(0);
            expect(result.regular_pay).toBe(160.00); // 8 × $20
            expect(result.total_pay).toBe(160.00);
        });
        it('should calculate regular + weekday OT', () => {
            const date = new Date('2025-01-06'); // Monday
            const spans = [
                {
                    punch_in: new Date('2025-01-06T09:00:00'),
                    punch_out: new Date('2025-01-06T18:30:00'),
                    duration_minutes: 570, // 9.5 hours
                },
            ];
            const result = overtimeCalculationService_1.overtimeCalculationService.calculate(date, spans, baseConfig);
            expect(result.regular_minutes).toBe(480); // 8 hours (09:00-17:00)
            expect(result.weekday_ot_minutes).toBe(90); // 1.5 hours (17:00-18:30)
            expect(result.weekend_ot_minutes).toBe(0);
            expect(result.regular_pay).toBe(160.00); // 8 × $20
            expect(result.weekday_ot_pay).toBe(45.00); // 1.5 × $30
            expect(result.total_pay).toBe(205.00);
        });
        it('should handle early arrival (before workday start)', () => {
            const date = new Date('2025-01-06'); // Monday
            const spans = [
                {
                    punch_in: new Date('2025-01-06T08:00:00'), // Before 09:00
                    punch_out: new Date('2025-01-06T17:00:00'),
                    duration_minutes: 540,
                },
            ];
            const result = overtimeCalculationService_1.overtimeCalculationService.calculate(date, spans, baseConfig);
            // Only 09:00-17:00 counts as regular (8 hours)
            expect(result.regular_minutes).toBe(480);
            expect(result.weekday_ot_minutes).toBe(0);
            expect(result.total_pay).toBe(160.00);
        });
    });
    describe('calculate - Weekend Scenarios', () => {
        it('should calculate all hours as weekend OT', () => {
            const date = new Date('2025-01-03'); // Friday (weekend)
            const spans = [
                {
                    punch_in: new Date('2025-01-03T10:00:00'),
                    punch_out: new Date('2025-01-03T16:00:00'),
                    duration_minutes: 360, // 6 hours
                },
            ];
            const result = overtimeCalculationService_1.overtimeCalculationService.calculate(date, spans, baseConfig);
            expect(result.regular_minutes).toBe(0);
            expect(result.weekday_ot_minutes).toBe(0);
            expect(result.weekend_ot_minutes).toBe(360); // All 6 hours
            expect(result.weekend_ot_pay).toBe(240.00); // 6 × $40
            expect(result.total_pay).toBe(240.00);
        });
        it('should calculate Saturday as weekend OT', () => {
            const date = new Date('2025-01-04'); // Saturday
            const spans = [
                {
                    punch_in: new Date('2025-01-04T09:00:00'),
                    punch_out: new Date('2025-01-04T13:00:00'),
                    duration_minutes: 240, // 4 hours
                },
            ];
            const result = overtimeCalculationService_1.overtimeCalculationService.calculate(date, spans, baseConfig);
            expect(result.weekend_ot_minutes).toBe(240);
            expect(result.weekend_ot_pay).toBe(160.00); // 4 × $40
        });
    });
    describe('validateConfig', () => {
        it('should validate correct configuration', () => {
            const validation = overtimeCalculationService_1.overtimeCalculationService.validateConfig(baseConfig);
            expect(validation.valid).toBe(true);
            expect(validation.errors.length).toBe(0);
        });
        it('should catch invalid regular rate', () => {
            const config = { ...baseConfig, hourly_rate_regular: 0 };
            const validation = overtimeCalculationService_1.overtimeCalculationService.validateConfig(config);
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('Regular hourly rate must be greater than 0');
        });
        it('should catch missing weekday OT multiplier', () => {
            const config = {
                ...baseConfig,
                weekday_ot_rate_type: 'multiplier',
                weekday_ot_multiplier: undefined,
            };
            const validation = overtimeCalculationService_1.overtimeCalculationService.validateConfig(config);
            expect(validation.valid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
        });
        it('should catch missing weekend OT fixed rate', () => {
            const config = {
                ...baseConfig,
                weekend_ot_rate_type: 'fixed',
                hourly_rate_weekend_ot: undefined,
            };
            const validation = overtimeCalculationService_1.overtimeCalculationService.validateConfig(config);
            expect(validation.valid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
        });
    });
    describe('getWeekStart', () => {
        it('should get week start for Sunday start', () => {
            const date = new Date('2025-01-08'); // Wednesday
            const weekStart = overtimeCalculationService_1.overtimeCalculationService.getWeekStart(date, 'Sunday');
            expect(weekStart.getDay()).toBe(0); // Sunday
            expect(weekStart.toISOString().split('T')[0]).toBe('2025-01-05');
        });
        it('should get week start for Monday start', () => {
            const date = new Date('2025-01-08'); // Wednesday
            const weekStart = overtimeCalculationService_1.overtimeCalculationService.getWeekStart(date, 'Monday');
            expect(weekStart.getDay()).toBe(1); // Monday
            expect(weekStart.toISOString().split('T')[0]).toBe('2025-01-06');
        });
    });
    describe('roundToCents', () => {
        it('should round to 2 decimal places', () => {
            expect(overtimeCalculationService_1.overtimeCalculationService.roundToCents(10.126)).toBe(10.13);
            expect(overtimeCalculationService_1.overtimeCalculationService.roundToCents(10.124)).toBe(10.12);
            expect(overtimeCalculationService_1.overtimeCalculationService.roundToCents(10.125)).toBe(10.13);
        });
    });
    describe('Complex Scenario: Full Week', () => {
        it('should calculate mixed week correctly', () => {
            // Monday: 9 hours (8 regular + 1 weekday OT)
            const monday = new Date('2025-01-06');
            const mondaySpans = [{
                    punch_in: new Date('2025-01-06T09:00:00'),
                    punch_out: new Date('2025-01-06T18:00:00'),
                    duration_minutes: 540,
                }];
            const mondayResult = overtimeCalculationService_1.overtimeCalculationService.calculate(monday, mondaySpans, baseConfig);
            expect(mondayResult.regular_minutes).toBe(480);
            expect(mondayResult.weekday_ot_minutes).toBe(60);
            expect(mondayResult.total_pay).toBe(190.00); // 160 + 30
            // Friday (weekend): 6 hours weekend OT
            const friday = new Date('2025-01-10');
            const fridaySpans = [{
                    punch_in: new Date('2025-01-10T10:00:00'),
                    punch_out: new Date('2025-01-10T16:00:00'),
                    duration_minutes: 360,
                }];
            const fridayResult = overtimeCalculationService_1.overtimeCalculationService.calculate(friday, fridaySpans, baseConfig);
            expect(fridayResult.weekend_ot_minutes).toBe(360);
            expect(fridayResult.total_pay).toBe(240.00); // 6 × 40
            // Week total
            const weekTotal = mondayResult.total_pay + fridayResult.total_pay;
            expect(weekTotal).toBe(430.00);
        });
    });
});

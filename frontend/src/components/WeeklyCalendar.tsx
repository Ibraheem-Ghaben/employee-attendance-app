/**
 * Weekly Calendar View Component
 * Shows daily time entries with 3-bucket breakdown
 */

import React, { useState, useEffect } from 'react';
import { TimesheetDay } from '../types/overtime';
import { getTimesheetDays, calculateEmployeeTimesheets } from '../services/overtimeApi';
import './WeeklyCalendar.css';

interface WeeklyCalendarProps {
  employeeCode: string;
  isAdmin: boolean;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ employeeCode, isAdmin }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [timesheetDays, setTimesheetDays] = useState<TimesheetDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeekData();
  }, [currentWeekStart, employeeCode]);

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? 0 : day; // Start on Sunday
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function getWeekDates(weekStart: Date): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  const loadWeekData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);

      const fromDate = formatDate(currentWeekStart);
      const toDate = formatDate(weekEnd);

      const days = await getTimesheetDays(employeeCode, fromDate, toDate);
      setTimesheetDays(days);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateWeek = async () => {
    try {
      setCalculating(true);
      setError(null);

      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);

      const fromDate = formatDate(currentWeekStart);
      const toDate = formatDate(weekEnd);

      await calculateEmployeeTimesheets(employeeCode, fromDate, toDate, true);
      await loadWeekData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to calculate timesheets');
    } finally {
      setCalculating(false);
    }
  };

  const previousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function formatTime(time?: string): string {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  function minutesToHours(minutes: number): string {
    return (minutes / 60).toFixed(2);
  }

  function getDayData(date: Date): TimesheetDay | undefined {
    const dateStr = formatDate(date);
    return timesheetDays.find(day => day.work_date === dateStr);
  }

  const weekDates = getWeekDates(currentWeekStart);
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + 6);

  // Calculate week totals
  const weekTotals = {
    regular_hours: timesheetDays.reduce((sum, day) => sum + day.regular_minutes / 60, 0),
    weekday_ot_hours: timesheetDays.reduce((sum, day) => sum + day.weekday_ot_minutes / 60, 0),
    weekend_ot_hours: timesheetDays.reduce((sum, day) => sum + day.weekend_ot_minutes / 60, 0),
    total_hours: timesheetDays.reduce((sum, day) => sum + day.total_worked_minutes / 60, 0),
    total_pay: timesheetDays.reduce((sum, day) => sum + day.total_pay, 0),
  };

  return (
    <div className="weekly-calendar">
      <div className="calendar-header">
        <h2>Weekly Timesheet</h2>
        <p className="employee-code">Employee: {employeeCode}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Week Navigation */}
      <div className="week-navigation">
        <button className="btn btn-nav" onClick={previousWeek}>
          ← Previous Week
        </button>
        <div className="week-display">
          <strong>{currentWeekStart.toLocaleDateString()}</strong> - {weekEnd.toLocaleDateString()}
        </div>
        <button className="btn btn-nav" onClick={nextWeek}>
          Next Week →
        </button>
        <button className="btn btn-today" onClick={goToToday}>
          Today
        </button>
        {isAdmin && (
          <button 
            className="btn btn-calculate" 
            onClick={handleCalculateWeek}
            disabled={calculating}
          >
            {calculating ? 'Calculating...' : '🔄 Calculate'}
          </button>
        )}
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="calendar-loading">Loading week data...</div>
      ) : (
        <div className="calendar-grid">
          {weekDates.map((date, index) => {
            const dayData = getDayData(date);
            const isToday = formatDate(date) === formatDate(new Date());
            
            return (
              <div 
                key={index} 
                className={`calendar-day ${isToday ? 'today' : ''} ${dayData?.is_weekend ? 'weekend' : ''} ${!dayData?.is_calculated ? 'not-calculated' : ''}`}
              >
                <div className="day-header">
                  <div className="day-name">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="day-date">{date.getDate()}</div>
                </div>

                {dayData ? (
                  <>
                    <div className="day-times">
                      <div className="time-entry">
                        <span className="time-label">IN:</span>
                        <span className="time-value">{formatTime(dayData.first_punch_in)}</span>
                      </div>
                      <div className="time-entry">
                        <span className="time-label">OUT:</span>
                        <span className="time-value">{formatTime(dayData.last_punch_out)}</span>
                      </div>
                    </div>

                    <div className="day-buckets">
                      {dayData.regular_minutes > 0 && (
                        <div className="bucket regular">
                          <div className="bucket-label">Regular</div>
                          <div className="bucket-value">{minutesToHours(dayData.regular_minutes)} hrs</div>
                          <div className="bucket-pay">${dayData.regular_pay.toFixed(2)}</div>
                        </div>
                      )}
                      
                      {dayData.weekday_ot_minutes > 0 && (
                        <div className="bucket weekday-ot">
                          <div className="bucket-label">Weekday OT</div>
                          <div className="bucket-value">{minutesToHours(dayData.weekday_ot_minutes)} hrs</div>
                          <div className="bucket-pay">${dayData.weekday_ot_pay.toFixed(2)}</div>
                        </div>
                      )}
                      
                      {dayData.weekend_ot_minutes > 0 && (
                        <div className="bucket weekend-ot">
                          <div className="bucket-label">Weekend OT</div>
                          <div className="bucket-value">{minutesToHours(dayData.weekend_ot_minutes)} hrs</div>
                          <div className="bucket-pay">${dayData.weekend_ot_pay.toFixed(2)}</div>
                        </div>
                      )}
                    </div>

                    <div className="day-total">
                      <strong>Total: ${dayData.total_pay.toFixed(2)}</strong>
                    </div>

                    {dayData.calculation_error && (
                      <div className="day-error" title={dayData.calculation_error}>
                        ⚠️ Error
                      </div>
                    )}
                  </>
                ) : (
                  <div className="day-empty">No data</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Week Summary */}
      {!loading && timesheetDays.length > 0 && (
        <div className="week-summary">
          <h3>Week Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-label">Regular Hours</div>
              <div className="summary-value">{weekTotals.regular_hours.toFixed(2)} hrs</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Weekday OT</div>
              <div className="summary-value">{weekTotals.weekday_ot_hours.toFixed(2)} hrs</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Weekend OT</div>
              <div className="summary-value">{weekTotals.weekend_ot_hours.toFixed(2)} hrs</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Total Hours</div>
              <div className="summary-value">{weekTotals.total_hours.toFixed(2)} hrs</div>
            </div>
            <div className="summary-item total">
              <div className="summary-label">Total Pay</div>
              <div className="summary-value">${weekTotals.total_pay.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyCalendar;


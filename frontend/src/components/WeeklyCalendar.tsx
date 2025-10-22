/**
 * Weekly Calendar View Component
 * Shows daily time entries with 3-bucket breakdown
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  getAllPayConfigs,
  getEmployeePayConfig,
  getTimesheetDays,
  getPunches,
  calculateEmployeeTimesheets,
} from '../services/overtimeApi';
import { EmployeePayConfig, TimesheetDay } from '../types/overtime';
import './WeeklyCalendar.css';

interface WeeklyCalendarProps {
  employeeCode?: string;
  isAdmin: boolean;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ employeeCode, isAdmin }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [timesheetDays, setTimesheetDays] = useState<TimesheetDay[]>([]);
  const [availableConfigs, setAvailableConfigs] = useState<EmployeePayConfig[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>(employeeCode || '');
  const [employeeMap, setEmployeeMap] = useState<Record<string, string>>({});
  const [showPunches, setShowPunches] = useState<boolean>(false);
  const [punchesByDate, setPunchesByDate] = useState<Record<string, Array<{ punch_time: string; punch_type: 'IN' | 'OUT' }>>>({});
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If admin without employee selected, skip load until employee is chosen
    if (isAdmin && !employeeCode && !selectedEmployee) return;
    loadWeekData();
  }, [currentWeekStart, employeeCode, selectedEmployee, isAdmin]);

  useEffect(() => {
    const loadConfigs = async () => {
      if (!isAdmin || employeeCode) return;
      try {
        const configs = await getAllPayConfigs();
        setAvailableConfigs(configs);
        const map = configs.reduce<Record<string, string>>((acc, cfg) => {
          if (cfg.employee_name) {
            acc[cfg.employee_code] = cfg.employee_name;
          }
          return acc;
        }, {});
        setEmployeeMap((prev) => ({ ...map, ...prev }));
        if (!selectedEmployee && configs.length > 0) {
          setSelectedEmployee(configs[0].employee_code);
        }
      } catch {
        // ignore
      }
    };
    loadConfigs();
  }, [isAdmin, employeeCode, selectedEmployee]);

  const fetchedForRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const target = employeeCode || selectedEmployee;
    if (!target) return;
    if (employeeMap[target]) return;
    if (fetchedForRef.current.has(target)) return;

    fetchedForRef.current.add(target);

    const loadName = async () => {
      try {
        const cfg = await getEmployeePayConfig(target);
        const maybeName = (cfg as any)?.employee_name;
        if (maybeName) {
          setEmployeeMap((prev) => ({ ...prev, [target]: maybeName }));
        }
      } catch {
        // ignore
      }
    };

    loadName();
  }, [employeeCode, selectedEmployee]);

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

  const loadWeekData = async (includePunches: boolean = showPunches) => {
    try {
      setLoading(true);
      setError(null);
      
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);

    const fromDate = formatDate(currentWeekStart);
    const toDate = formatDate(weekEnd);
    const targetEmployee = employeeCode || selectedEmployee;
    if (!targetEmployee) {
        setTimesheetDays([]);
        return;
      }
      const days = await getTimesheetDays(targetEmployee as string, fromDate, toDate);
      setTimesheetDays(days);

      if (includePunches) {
        const punches = await getPunches(targetEmployee as string, fromDate, toDate);
        const grouped: Record<string, Array<{ punch_time: string; punch_type: 'IN' | 'OUT' }>> = {};
        punches.forEach((p) => {
          const d = localDateKey(new Date(p.punch_time));
          if (!grouped[d]) grouped[d] = [];
          grouped[d].push(p);
        });
        setPunchesByDate(grouped);
      } else {
        setPunchesByDate({});
      }
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
      const targetEmployee = employeeCode || selectedEmployee;
      if (!targetEmployee) {
        setError('Please select an employee first');
        return;
      }
      await calculateEmployeeTimesheets(targetEmployee as string, fromDate, toDate, true);
      await loadWeekData(showPunches);
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

  // Local-date key to avoid UTC shifts when grouping/displaying
  function localDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const utcTimeFormatter = useRef(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    })
  );

  function formatTime(time?: string): string {
    if (!time) return '--:--';
    try {
      const d = new Date(time);
      return utcTimeFormatter.current.format(d);
    } catch {
      return '--:--';
    }
  }

  function minutesToHours(minutes?: number): string {
    const m = minutes ?? 0;
    return (m / 60).toFixed(2);
  }

  function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  function getDailyWorkFromPunches(date: Date): { firstIn?: Date; lastOut?: Date; durationMinutes: number } {
    const list = punchesByDate[localDateKey(date)] || [];
    if (list.length === 0) return { durationMinutes: 0 };
    const sorted = [...list].sort((a, b) => new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime());
    const firstInStr = sorted.find((p) => p.punch_type === 'IN')?.punch_time;
    const lastOutStr = [...sorted].reverse().find((p) => p.punch_type === 'OUT')?.punch_time;
    const firstIn = firstInStr ? new Date(firstInStr) : undefined;
    const lastOut = lastOutStr ? new Date(lastOutStr) : undefined;
    if (!firstIn || !lastOut || lastOut <= firstIn) return { durationMinutes: 0 };
    const durationMinutes = Math.round((lastOut.getTime() - firstIn.getTime()) / (1000 * 60));
    return { firstIn, lastOut, durationMinutes };
  }

  function getDayData(date: Date): TimesheetDay | undefined {
    const key = localDateKey(date);
    return timesheetDays.find(day => localDateKey(new Date(day.work_date)) === key);
  }

  const weekDates = getWeekDates(currentWeekStart);
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + 6);

  // Calculate week totals
  const weekTotals = {
    regular_hours: timesheetDays.reduce((sum, day) => sum + ((day.regular_minutes ?? 0) / 60), 0),
    weekday_ot_hours: timesheetDays.reduce((sum, day) => sum + ((day.weekday_ot_minutes ?? 0) / 60), 0),
    weekend_ot_hours: timesheetDays.reduce((sum, day) => sum + ((day.weekend_ot_minutes ?? 0) / 60), 0),
    total_hours: timesheetDays.reduce((sum, day) => sum + ((day.total_worked_minutes ?? 0) / 60), 0),
    total_pay: timesheetDays.reduce((sum, day) => sum + (day.total_pay ?? 0), 0),
  };

  return (
    <div className="weekly-calendar">
      <div className="calendar-header">
        <h2>Weekly Timesheet</h2>
        {(employeeCode || selectedEmployee) && (
          <p className="employee-code">
            Employee: {employeeCode || selectedEmployee}
            {(() => {
              const target = employeeCode || selectedEmployee;
              const maybeName = target ? employeeMap[target] : undefined;
              return maybeName ? ` • ${maybeName}` : '';
            })()}
          </p>
        )}
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
        {isAdmin && !employeeCode && (
          <div className="employee-selector">
            <label>Employee</label>
            <select
              value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">Select employee</option>
              {availableConfigs.map((cfg) => (
                <option key={cfg.employee_code} value={cfg.employee_code}>
                  {cfg.employee_code}
                  {cfg.employee_name ? ` • ${cfg.employee_name}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        {isAdmin && (
          <button 
            className="btn btn-calculate" 
            onClick={handleCalculateWeek}
            disabled={calculating}
          >
            {calculating ? 'Calculating...' : '🔄 Calculate'}
          </button>
        )}
        <label className="toggle-punches">
          <input
            type="checkbox"
            checked={showPunches}
            onChange={(e) => {
              const next = e.target.checked;
              setShowPunches(next);
              loadWeekData(next);
            }}
          />
          Show raw punches
        </label>
      </div>

      {/* Require employee selection for admin */}
      {isAdmin && !employeeCode && !selectedEmployee ? (
        <div className="calendar-loading">Select an employee to view calendar.</div>
      ) : loading ? (
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
                          <div className="bucket-pay">₪{(dayData.regular_pay ?? 0).toFixed(2)}</div>
                        </div>
                      )}
                      
                      {dayData.weekday_ot_minutes > 0 && (
                        <div className="bucket weekday-ot">
                          <div className="bucket-label">Weekday OT</div>
                          <div className="bucket-value">{minutesToHours(dayData.weekday_ot_minutes)} hrs</div>
                          <div className="bucket-pay">₪{(dayData.weekday_ot_pay ?? 0).toFixed(2)}</div>
                        </div>
                      )}
                      
                      {dayData.weekend_ot_minutes > 0 && (
                        <div className="bucket weekend-ot">
                          <div className="bucket-label">Weekend OT</div>
                          <div className="bucket-value">{minutesToHours(dayData.weekend_ot_minutes)} hrs</div>
                          <div className="bucket-pay">₪{(dayData.weekend_ot_pay ?? 0).toFixed(2)}</div>
                        </div>
                      )}
                    </div>

                    <div className="day-total">
                      <strong>Total: ₪{(dayData.total_pay ?? 0).toFixed(2)}</strong>
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
                {showPunches && (
                  <div className="day-punches">
                    <div className="punches-title">Punches</div>
                    {(() => {
                      const span = getDailyWorkFromPunches(date);
                      return (
                        <div className="punches-summary">
                          <strong>Work time: </strong>
                          {span.durationMinutes > 0 ? (
                            <>
                              {formatDuration(span.durationMinutes)}
                              {span.firstIn && span.lastOut && (
                                <>
                                  {' '}
                                  (<span>
                                    {utcTimeFormatter.current.format(span.firstIn)} - {utcTimeFormatter.current.format(span.lastOut)}
                                  </span>)
                                </>
                              )}
                            </>
                          ) : (
                            '—'
                          )}
                        </div>
                      );
                    })()}
                    <ul>
                      {(punchesByDate[localDateKey(date)] || []).map((p, idx) => (
                        <li key={idx}>{utcTimeFormatter.current.format(new Date(p.punch_time))} - {p.punch_type}</li>
                      ))}
                    </ul>
                  </div>
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
              <div className="summary-value">₪{weekTotals.total_pay.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyCalendar;


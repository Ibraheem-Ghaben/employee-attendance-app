/**
 * Overtime Settings Component
 * Configure employee pay rates and workweek settings
 */

import React, { useState, useEffect, useMemo } from 'react';
import { EmployeePayConfig, PayType, RateType, DayOfWeek } from '../types/overtime';
import { getEmployeePayConfig, updateEmployeePayConfig, getAllPayConfigs } from '../services/overtimeApi';
import './OvertimeSettings.css';

interface OvertimeSettingsProps {
  employeeCode: string;
  isAdmin: boolean;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const OvertimeSettings: React.FC<OvertimeSettingsProps> = ({ employeeCode, isAdmin }) => {
  const [config, setConfig] = useState<EmployeePayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [allConfigs, setAllConfigs] = useState<EmployeePayConfig[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Record<string, string>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<string>(employeeCode);

  // Form state
  const [payType, setPayType] = useState<PayType>('Hourly');
  const [hourlyRateRegular, setHourlyRateRegular] = useState<number>(20.00);
  const [dailyRate, setDailyRate] = useState<number>(200.00);
  const [monthlySalary, setMonthlySalary] = useState<number>(5000.00);
  
  const [weekdayOTRateType, setWeekdayOTRateType] = useState<RateType>('multiplier');
  const [weekdayOTRate, setWeekdayOTRate] = useState<number>(0);
  const [weekdayOTMultiplier, setWeekdayOTMultiplier] = useState<number>(1.5);
  
  const [weekendOTRateType, setWeekendOTRateType] = useState<RateType>('multiplier');
  const [weekendOTRate, setWeekendOTRate] = useState<number>(0);
  const [weekendOTMultiplier, setWeekendOTMultiplier] = useState<number>(2.0);
  
  const [weekStart, setWeekStart] = useState<DayOfWeek>('Sunday');
  const [weekendDays, setWeekendDays] = useState<string[]>(['Friday', 'Saturday']);
  const [workdayStart, setWorkdayStart] = useState<string>('09:00');
  const [workdayEnd, setWorkdayEnd] = useState<string>('17:00');
  const [otStartTime, setOtStartTime] = useState<string>('17:00');
  const [minimumDailyHours, setMinimumDailyHours] = useState<number>(6.0);

  useEffect(() => {
    if (isAdmin) {
      loadAllConfigs();
    }
  }, [isAdmin]);

  useEffect(() => {
    loadConfig();
  }, [selectedEmployee]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const targetCode = selectedEmployee || employeeCode;
      const configResponse = await getEmployeePayConfig(targetCode);
      if (configResponse && (configResponse as any).employee_name) {
        setEmployeeMap((prev) => ({ ...prev, [targetCode]: (configResponse as any).employee_name }));
      }
      setConfig(configResponse);
      
      const data = configResponse as any;
      // Populate form
      setPayType(data?.pay_type || 'Hourly');
      setHourlyRateRegular(
        typeof data?.hourly_rate_regular === 'number'
          ? data.hourly_rate_regular
          : parseFloat(data?.hourly_rate_regular) || 0
      );
      setDailyRate(
        typeof data?.daily_rate === 'number'
          ? data.daily_rate
          : parseFloat(data?.daily_rate) || 0
      );
      setMonthlySalary(
        typeof data?.monthly_salary === 'number'
          ? data.monthly_salary
          : parseFloat(data?.monthly_salary) || 0
      );
      
      setWeekdayOTRateType(data.weekday_ot_rate_type);
      setWeekdayOTRate(data.hourly_rate_weekday_ot || 0);
      setWeekdayOTMultiplier(data.weekday_ot_multiplier || 1.5);
      
      setWeekendOTRateType(data.weekend_ot_rate_type);
      setWeekendOTRate(data.hourly_rate_weekend_ot || 0);
      setWeekendOTMultiplier(data.weekend_ot_multiplier || 2.0);
      
      setWeekStart((data?.week_start as DayOfWeek) || 'Sunday');
      setWeekendDays((data?.weekend_days || 'Friday,Saturday').split(','));
      setWorkdayStart((data?.workday_start || '09:00:00').substring(0, 5));
      setWorkdayEnd((data?.workday_end || '17:00:00').substring(0, 5));
      setOtStartTime((data?.ot_start_time_on_workdays || '17:00:00').substring(0, 5));
      setMinimumDailyHours(
        typeof data?.minimum_daily_hours_for_pay === 'number'
          ? data.minimum_daily_hours_for_pay
          : parseFloat(data?.minimum_daily_hours_for_pay) || 0
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadAllConfigs = async () => {
    try {
      const list = await getAllPayConfigs();
      setAllConfigs(list);
      const map = list.reduce<Record<string, string>>((acc, cfg) => {
        const maybeName = (cfg as any).employee_name;
        if (maybeName) {
          acc[cfg.employee_code] = maybeName;
        }
        return acc;
      }, {});
      setEmployeeMap((prev) => ({ ...map, ...prev }));
      // If admin and no selection yet, set to first employee
      if (!selectedEmployee && list.length > 0) {
        setSelectedEmployee(list[0].employee_code);
      }
    } catch (err) {
      // ignore silently in UI
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const toHHMMSS = (value: string): string => {
        // Accepts "HH:MM" or "HH:MM:SS"; normalizes to HH:MM:SS
        if (!value || typeof value !== 'string') return '00:00:00';
        const parts = value.split(':');
        const hh = (parseInt(parts[0], 10) || 0).toString().padStart(2, '0');
        const mm = (parseInt(parts[1], 10) || 0).toString().padStart(2, '0');
        const ss = parts.length > 2 ? (parseInt(parts[2], 10) || 0).toString().padStart(2, '0') : '00';
        return `${hh}:${mm}:${ss}`;
      };

      const isValidTime = (t: string): boolean => /^\d{2}:\d{2}:\d{2}$/.test(t);

      const workdayStartNorm = toHHMMSS(workdayStart);
      const workdayEndNorm = toHHMMSS(workdayEnd);
      const otStartNorm = toHHMMSS(otStartTime);

      if (!isValidTime(workdayStartNorm) || !isValidTime(workdayEndNorm) || !isValidTime(otStartNorm)) {
        setError("Please provide valid times in HH:MM format.");
        setSaving(false);
        return;
      }

      const updateData: Partial<EmployeePayConfig> = {
        pay_type: payType,
        hourly_rate_regular: hourlyRateRegular,
        daily_rate: dailyRate,
        monthly_salary: monthlySalary,
        
        weekday_ot_rate_type: weekdayOTRateType,
        hourly_rate_weekday_ot: weekdayOTRateType === 'fixed' ? weekdayOTRate : undefined,
        weekday_ot_multiplier: weekdayOTRateType === 'multiplier' ? weekdayOTMultiplier : undefined,
        
        weekend_ot_rate_type: weekendOTRateType,
        hourly_rate_weekend_ot: weekendOTRateType === 'fixed' ? weekendOTRate : undefined,
        weekend_ot_multiplier: weekendOTRateType === 'multiplier' ? weekendOTMultiplier : undefined,
        
        week_start: weekStart,
        weekend_days: weekendDays.join(','),
        workday_start: workdayStartNorm,
        workday_end: workdayEndNorm,
        ot_start_time_on_workdays: otStartNorm,
        minimum_daily_hours_for_pay: minimumDailyHours,
      };

      const targetCode = selectedEmployee || employeeCode;
      // Debug: verify payload being sent
      console.debug('OvertimeSettings: updating pay config', {
        employeeCode: targetCode,
        updateData,
      });
      await updateEmployeePayConfig(targetCode, updateData);
      setSuccess('Configuration saved successfully!');
      await loadConfig();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const toggleWeekendDay = (day: DayOfWeek) => {
    if (weekendDays.includes(day)) {
      setWeekendDays(weekendDays.filter((d) => d !== day));
    } else {
      setWeekendDays([...weekendDays, day]);
    }
  };

  const calculateEffectiveRates = () => {
    const baseRate = Number.isFinite(hourlyRateRegular) ? hourlyRateRegular : 0;
    const weekdayMultiplier = Number.isFinite(weekdayOTMultiplier) ? weekdayOTMultiplier : 1.5;
    const weekendMultiplier = Number.isFinite(weekendOTMultiplier) ? weekendOTMultiplier : 2.0;

    const weekdayOT = weekdayOTRateType === 'fixed' 
      ? (Number.isFinite(weekdayOTRate) ? weekdayOTRate : 0)
      : baseRate * weekdayMultiplier;
    
    const weekendOT = weekendOTRateType === 'fixed'
      ? (Number.isFinite(weekendOTRate) ? weekendOTRate : 0)
      : baseRate * weekendMultiplier;
    
    return { weekdayOT, weekendOT };
  };

  const activeEmployeeCode = selectedEmployee || employeeCode;
  const activeEmployeeName = useMemo(() => {
    if (!activeEmployeeCode) return '';
    return employeeMap[activeEmployeeCode] || '';
  }, [employeeMap, activeEmployeeCode]);
  const headerLabel = activeEmployeeName
    ? `${activeEmployeeName} · ${activeEmployeeCode}`
    : activeEmployeeCode;

  if (loading) {
    return <div className="overtime-settings loading">Loading configuration...</div>;
  }

  if (!config && !loading) {
    return (
      <div className="overtime-settings error">
        <p>No pay configuration found for employee {employeeCode}</p>
        {isAdmin && <button onClick={loadConfig}>Create Configuration</button>}
      </div>
    );
  }

  const effectiveRates = calculateEffectiveRates();

  return (
    <div className="overtime-settings">
      <div className="settings-header">
        <div className="header-primary">
          <h2>Overtime Settings</h2>
          <p>{headerLabel}</p>
        </div>
        {isAdmin && (
          <div className="header-selector">
            <label htmlFor="employeeSelect">Employee</label>
            <select
              id="employeeSelect"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">Select employee</option>
              {allConfigs.map((c) => {
                const displayName = employeeMap[c.employee_code] || c.employee_code;
                return (
                  <option key={c.employee_code} value={c.employee_code}>
                    {displayName} ({c.employee_code})
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="settings-grid">
        {/* Pay Rates Section */}
        <section className="settings-card">
          <h3>Pay Rates</h3>
          
          <div className="form-group">
            <label>Pay Type</label>
            <select 
              value={payType} 
              onChange={(e) => setPayType(e.target.value as PayType)}
              disabled={!isAdmin}
            >
              <option value="Hourly">Hourly</option>
              <option value="Daily">Daily</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          {/* Rate Input - Changes based on Pay Type */}
          {payType === 'Hourly' && (
            <div className="form-group">
              <label>Hourly Rate (₪/hour)</label>
              <input
                type="number"
                step="0.01"
                value={hourlyRateRegular}
                onChange={(e) => setHourlyRateRegular(parseFloat(e.target.value))}
                disabled={!isAdmin}
              />
            </div>
          )}
          
          {payType === 'Daily' && (
            <div className="form-group">
              <label>Daily Rate (₪/day)</label>
              <input
                type="number"
                step="0.01"
                value={dailyRate}
                onChange={(e) => setDailyRate(parseFloat(e.target.value))}
                disabled={!isAdmin}
              />
              <small style={{color: '#666', fontSize: '0.9em'}}>8 hours = 1 day</small>
            </div>
          )}
          
          {payType === 'Monthly' && (
            <div className="form-group">
              <label>Monthly Salary (₪/month)</label>
              <input
                type="number"
                step="0.01"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(parseFloat(e.target.value))}
                disabled={!isAdmin}
              />
              <small style={{color: '#666', fontSize: '0.9em'}}>Based on 22 working days (176 hours/month)</small>
            </div>
          )}

          {/* Weekday OT */}
          <div className="rate-config">
            <h4>Weekday Overtime</h4>
            <div className="form-group">
              <label>Rate Type</label>
              <select
                value={weekdayOTRateType}
                onChange={(e) => setWeekdayOTRateType(e.target.value as RateType)}
                disabled={!isAdmin}
              >
                <option value="multiplier">Multiplier</option>
                <option value="fixed">Fixed Rate</option>
              </select>
            </div>

            {weekdayOTRateType === 'multiplier' ? (
              <div className="form-group">
                <label>Multiplier (e.g., 1.5 = 1.5×)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weekdayOTMultiplier}
                  onChange={(e) => setWeekdayOTMultiplier(parseFloat(e.target.value))}
                  disabled={!isAdmin}
                />
              </div>
            ) : (
              <div className="form-group">
                <label>Fixed Rate (₪)</label>
                <input
                  type="number"
                  step="0.01"
                  value={weekdayOTRate}
                  onChange={(e) => setWeekdayOTRate(parseFloat(e.target.value))}
                  disabled={!isAdmin}
                />
              </div>
            )}
            <p className="rate-preview">
              Effective Rate: <strong>₪{effectiveRates.weekdayOT.toFixed(2)}/hr</strong>
            </p>
          </div>

          {/* Weekend OT */}
          <div className="rate-config">
            <h4>Weekend Overtime</h4>
            <div className="form-group">
              <label>Rate Type</label>
              <select
                value={weekendOTRateType}
                onChange={(e) => setWeekendOTRateType(e.target.value as RateType)}
                disabled={!isAdmin}
              >
                <option value="multiplier">Multiplier</option>
                <option value="fixed">Fixed Rate</option>
              </select>
            </div>

            {weekendOTRateType === 'multiplier' ? (
              <div className="form-group">
                <label>Multiplier (e.g., 2.0 = 2.0×)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weekendOTMultiplier}
                  onChange={(e) => setWeekendOTMultiplier(parseFloat(e.target.value))}
                  disabled={!isAdmin}
                />
              </div>
            ) : (
              <div className="form-group">
                <label>Fixed Rate (₪)</label>
                <input
                  type="number"
                  step="0.01"
                  value={weekendOTRate}
                  onChange={(e) => setWeekendOTRate(parseFloat(e.target.value))}
                  disabled={!isAdmin}
                />
              </div>
            )}
            <p className="rate-preview">
              Effective Rate: <strong>₪{effectiveRates.weekendOT.toFixed(2)}/hr</strong>
            </p>
          </div>
        </section>

        {/* Workweek Schedule Section */}
        <section className="settings-card">
          <h3>Workweek Schedule</h3>

          <div className="form-group">
            <label>Week Starts On</label>
            <select
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value as DayOfWeek)}
              disabled={!isAdmin}
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Weekend Days</label>
            <div className="day-selector">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={`day-button ${weekendDays.includes(day) ? 'selected' : ''}`}
                  onClick={() => toggleWeekendDay(day)}
                  disabled={!isAdmin}
                >
                  {day.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Workday Start</label>
            <input
              type="time"
              value={workdayStart}
              onChange={(e) => setWorkdayStart(e.target.value)}
              disabled={!isAdmin}
            />
          </div>

          <div className="form-group">
            <label>Workday End</label>
            <input
              type="time"
              value={workdayEnd}
              onChange={(e) => setWorkdayEnd(e.target.value)}
              disabled={!isAdmin}
            />
          </div>

          <div className="form-group">
            <label>Overtime Starts At</label>
            <input
              type="time"
              value={otStartTime}
              onChange={(e) => setOtStartTime(e.target.value)}
              disabled={!isAdmin}
            />
          </div>

          <div className="form-group">
            <label>Minimum Daily Hours for Pay</label>
            <input
              type="number"
              step="0.5"
              value={minimumDailyHours}
              onChange={(e) => setMinimumDailyHours(parseFloat(e.target.value))}
              disabled={!isAdmin}
            />
          </div>
        </section>
      </div>

      {isAdmin && (
        <div className="settings-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={loadConfig}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      )}

      {/* Rate Summary */}
      <div className="rate-summary">
        <h4>Rate Summary</h4>
        <table>
          <thead>
            <tr>
              <th>Pay Type</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Regular</td>
              <td>₪{(Number.isFinite(hourlyRateRegular) ? hourlyRateRegular : 0).toFixed(2)}/hr</td>
            </tr>
            <tr>
              <td>Weekday OT</td>
              <td>
                ₪{effectiveRates.weekdayOT.toFixed(2)}/hr
                {weekdayOTRateType === 'multiplier' && ` (${weekdayOTMultiplier}×)`}
              </td>
            </tr>
            <tr>
              <td>Weekend OT</td>
              <td>
                ₪{effectiveRates.weekendOT.toFixed(2)}/hr
                {weekendOTRateType === 'multiplier' && ` (${weekendOTMultiplier}×)`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OvertimeSettings;


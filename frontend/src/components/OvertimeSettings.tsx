/**
 * Overtime Settings Component
 * Configure employee pay rates and workweek settings
 */

import React, { useState, useEffect } from 'react';
import { EmployeePayConfig, PayType, RateType, DayOfWeek } from '../types/overtime';
import { getEmployeePayConfig, updateEmployeePayConfig } from '../services/overtimeApi';
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

  // Form state
  const [payType, setPayType] = useState<PayType>('Hourly');
  const [hourlyRateRegular, setHourlyRateRegular] = useState<number>(20.00);
  
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
    loadConfig();
  }, [employeeCode]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEmployeePayConfig(employeeCode);
      setConfig(data);
      
      // Populate form
      setPayType(data.pay_type);
      setHourlyRateRegular(data.hourly_rate_regular);
      
      setWeekdayOTRateType(data.weekday_ot_rate_type);
      setWeekdayOTRate(data.hourly_rate_weekday_ot || 0);
      setWeekdayOTMultiplier(data.weekday_ot_multiplier || 1.5);
      
      setWeekendOTRateType(data.weekend_ot_rate_type);
      setWeekendOTRate(data.hourly_rate_weekend_ot || 0);
      setWeekendOTMultiplier(data.weekend_ot_multiplier || 2.0);
      
      setWeekStart(data.week_start);
      setWeekendDays(data.weekend_days.split(','));
      setWorkdayStart(data.workday_start.substring(0, 5));
      setWorkdayEnd(data.workday_end.substring(0, 5));
      setOtStartTime(data.ot_start_time_on_workdays.substring(0, 5));
      setMinimumDailyHours(data.minimum_daily_hours_for_pay);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updateData: Partial<EmployeePayConfig> = {
        pay_type: payType,
        hourly_rate_regular: hourlyRateRegular,
        
        weekday_ot_rate_type: weekdayOTRateType,
        hourly_rate_weekday_ot: weekdayOTRateType === 'fixed' ? weekdayOTRate : undefined,
        weekday_ot_multiplier: weekdayOTRateType === 'multiplier' ? weekdayOTMultiplier : undefined,
        
        weekend_ot_rate_type: weekendOTRateType,
        hourly_rate_weekend_ot: weekendOTRateType === 'fixed' ? weekendOTRate : undefined,
        weekend_ot_multiplier: weekendOTRateType === 'multiplier' ? weekendOTMultiplier : undefined,
        
        week_start: weekStart,
        weekend_days: weekendDays.join(','),
        workday_start: `${workdayStart}:00`,
        workday_end: `${workdayEnd}:00`,
        ot_start_time_on_workdays: `${otStartTime}:00`,
        minimum_daily_hours_for_pay: minimumDailyHours,
      };

      await updateEmployeePayConfig(employeeCode, updateData);
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
    const weekdayOT = weekdayOTRateType === 'fixed' 
      ? weekdayOTRate 
      : hourlyRateRegular * weekdayOTMultiplier;
    
    const weekendOT = weekendOTRateType === 'fixed'
      ? weekendOTRate
      : hourlyRateRegular * weekendOTMultiplier;
    
    return { weekdayOT, weekendOT };
  };

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
      <h2>Overtime Configuration</h2>
      <p className="employee-code">Employee: {employeeCode}</p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="settings-sections">
        {/* Pay Rates Section */}
        <section className="settings-section">
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

          <div className="form-group">
            <label>Regular Hourly Rate ($)</label>
            <input
              type="number"
              step="0.01"
              value={hourlyRateRegular}
              onChange={(e) => setHourlyRateRegular(parseFloat(e.target.value))}
              disabled={!isAdmin}
            />
          </div>

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
                <label>Fixed Rate ($)</label>
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
              Effective Rate: <strong>${effectiveRates.weekdayOT.toFixed(2)}/hr</strong>
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
                <label>Fixed Rate ($)</label>
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
              Effective Rate: <strong>${effectiveRates.weekendOT.toFixed(2)}/hr</strong>
            </p>
          </div>
        </section>

        {/* Workweek Schedule Section */}
        <section className="settings-section">
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
              <td>${hourlyRateRegular.toFixed(2)}/hr</td>
            </tr>
            <tr>
              <td>Weekday OT</td>
              <td>
                ${effectiveRates.weekdayOT.toFixed(2)}/hr
                {weekdayOTRateType === 'multiplier' && ` (${weekdayOTMultiplier}×)`}
              </td>
            </tr>
            <tr>
              <td>Weekend OT</td>
              <td>
                ${effectiveRates.weekendOT.toFixed(2)}/hr
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


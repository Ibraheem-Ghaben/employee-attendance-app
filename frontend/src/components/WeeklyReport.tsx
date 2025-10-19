/**
 * Weekly Report Component
 * Shows detailed weekly report with export to Excel
 */

import React, { useState } from 'react';
import { WeeklyReportSummary } from '../types/overtime';
import { getWeeklyReport, exportWeeklyReport, downloadExcelFile } from '../services/overtimeApi';
import './WeeklyReport.css';

interface WeeklyReportProps {
  employeeCode?: string;
  isAdmin: boolean;
}

const WeeklyReport: React.FC<WeeklyReportProps> = ({ employeeCode, isAdmin }) => {
  const [fromDate, setFromDate] = useState<string>(getDefaultFromDate());
  const [toDate, setToDate] = useState<string>(getDefaultToDate());
  const [selectedEmployee, setSelectedEmployee] = useState<string>(employeeCode || '');
  const [reports, setReports] = useState<WeeklyReportSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getDefaultFromDate(): string {
    const now = new Date();
    const weekStart = new Date(now);
    const day = now.getDay();
    weekStart.setDate(now.getDate() - day); // Start on Sunday
    return weekStart.toISOString().split('T')[0];
  }

  function getDefaultToDate(): string {
    const now = new Date();
    const weekEnd = new Date(now);
    const day = now.getDay();
    weekEnd.setDate(now.getDate() + (6 - day)); // End on Saturday
    return weekEnd.toISOString().split('T')[0];
  }

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getWeeklyReport(
        fromDate,
        toDate,
        isAdmin ? (selectedEmployee || undefined) : employeeCode
      );

      setReports(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);

      const blob = await exportWeeklyReport(
        fromDate,
        toDate,
        isAdmin ? (selectedEmployee || undefined) : employeeCode
      );

      const filename = `Weekly_Report_${fromDate}_to_${toDate}.xlsx`;
      downloadExcelFile(blob, filename);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="weekly-report">
      <h2>Weekly Overtime Report</h2>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div className="report-filters">
        <div className="filter-group">
          <label>From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        {isAdmin && (
          <div className="filter-group">
            <label>Employee Code (Optional)</label>
            <input
              type="text"
              placeholder="All employees"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            />
          </div>
        )}

        <div className="filter-actions">
          <button 
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>

          {reports.length > 0 && (
            <button
              className="btn btn-export"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : '📊 Export to Excel'}
            </button>
          )}
        </div>
      </div>

      {/* Report Results */}
      {loading ? (
        <div className="report-loading">Generating report...</div>
      ) : reports.length > 0 ? (
        <div className="report-results">
          {reports.map((report) => (
            <div key={report.employee_code} className="employee-report">
              <div className="employee-header">
                <h3>{report.employee_name}</h3>
                <p className="employee-code">Employee Code: {report.employee_code}</p>
                <p className="week-period">
                  {new Date(report.week_start).toLocaleDateString()} -{' '}
                  {new Date(report.week_end).toLocaleDateString()}
                </p>
              </div>

              {/* Daily Breakdown Table */}
              {report.days.length > 0 && (
                <div className="table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Regular Hrs</th>
                        <th>Weekday OT</th>
                        <th>Weekend OT</th>
                        <th>Total Hrs</th>
                        <th>Regular Pay</th>
                        <th>Weekday OT Pay</th>
                        <th>Weekend OT Pay</th>
                        <th>Daily Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.days.map((day, index) => (
                        <tr key={index}>
                          <td>{new Date(day.date).toLocaleDateString()}</td>
                          <td>{day.day}</td>
                          <td>{day.regular_hours.toFixed(2)}</td>
                          <td>{day.weekday_ot_hours.toFixed(2)}</td>
                          <td>{day.weekend_ot_hours.toFixed(2)}</td>
                          <td><strong>{day.total_hours.toFixed(2)}</strong></td>
                          <td>${day.regular_pay.toFixed(2)}</td>
                          <td>${day.weekday_ot_pay.toFixed(2)}</td>
                          <td>${day.weekend_ot_pay.toFixed(2)}</td>
                          <td><strong>${day.daily_total.toFixed(2)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="totals-row">
                        <td colSpan={2}><strong>WEEKLY TOTALS</strong></td>
                        <td><strong>{report.total_regular_hours.toFixed(2)}</strong></td>
                        <td><strong>{report.total_weekday_ot_hours.toFixed(2)}</strong></td>
                        <td><strong>{report.total_weekend_ot_hours.toFixed(2)}</strong></td>
                        <td><strong>{report.total_hours.toFixed(2)}</strong></td>
                        <td><strong>${report.total_regular_pay.toFixed(2)}</strong></td>
                        <td><strong>${report.total_weekday_ot_pay.toFixed(2)}</strong></td>
                        <td><strong>${report.total_weekend_ot_pay.toFixed(2)}</strong></td>
                        <td className="grand-total">
                          <strong>${report.week_total_pay.toFixed(2)}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Summary Cards */}
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="card-label">Total Hours</div>
                  <div className="card-value">{report.total_hours.toFixed(2)}</div>
                </div>
                <div className="summary-card">
                  <div className="card-label">Regular Hours</div>
                  <div className="card-value">{report.total_regular_hours.toFixed(2)}</div>
                  <div className="card-pay">${report.total_regular_pay.toFixed(2)}</div>
                </div>
                <div className="summary-card">
                  <div className="card-label">Weekday OT</div>
                  <div className="card-value">{report.total_weekday_ot_hours.toFixed(2)}</div>
                  <div className="card-pay">${report.total_weekday_ot_pay.toFixed(2)}</div>
                </div>
                <div className="summary-card">
                  <div className="card-label">Weekend OT</div>
                  <div className="card-value">{report.total_weekend_ot_hours.toFixed(2)}</div>
                  <div className="card-pay">${report.total_weekend_ot_pay.toFixed(2)}</div>
                </div>
                <div className="summary-card total">
                  <div className="card-label">Total Pay</div>
                  <div className="card-value">${report.week_total_pay.toFixed(2)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !loading && (
        <div className="report-empty">
          No report data. Click "Generate Report" to view weekly summary.
        </div>
      )}
    </div>
  );
};

export default WeeklyReport;


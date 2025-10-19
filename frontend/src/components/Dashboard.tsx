import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { employeeService } from '../services/api';
import { Employee, PaginationInfo } from '../types/employee';
import Sidebar from './Sidebar';
import StatisticsCards from './StatisticsCards';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Filter states
  const [employeeCode, setEmployeeCode] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [site, setSite] = useState('');
  const [inOutMode, setInOutMode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // UI states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sites, setSites] = useState<string[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'supervisor') {
      fetchEmployees();
      fetchSites();
      fetchStatistics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, user]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await employeeService.getEmployees(
        currentPage,
        pageSize,
        employeeCode || undefined,
        startDate || undefined,
        endDate || undefined,
        employeeName || undefined,
        site || undefined,
        inOutMode || undefined
      );
      setEmployees(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Session expired or unauthorized. Please login again.');
        setTimeout(() => logout(), 2000);
      } else {
        setError('Failed to fetch employee data.');
      }
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSites = async () => {
    try {
      const sitesData = await employeeService.getSites();
      setSites(sitesData);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      setStatsLoading(true);
      const stats = await employeeService.getStatistics(
        employeeCode || undefined,
        startDate || undefined,
        endDate || undefined
      );
      setStatistics(stats);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1); // Reset to first page when applying filters
    fetchEmployees();
    fetchStatistics();
  };

  const handleClearFilters = () => {
    setEmployeeCode('');
    setEmployeeName('');
    setSite('');
    setInOutMode('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    // Will trigger useEffect to fetch without filters
    setTimeout(() => {
      fetchEmployees();
      fetchStatistics();
    }, 100);
  };

  const handleExport = async () => {
    try {
      const blob = await employeeService.exportAttendance(
        employeeCode || undefined,
        startDate || undefined,
        endDate || undefined
      );
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${employeeCode || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to export data');
      console.error('Export error:', error);
    }
  };

  const getInOutBadge = (mode: number) => {
    if (mode === 0) {
      return <span className="badge badge-in">IN</span>;
    } else if (mode === 1) {
      return <span className="badge badge-out">OUT</span>;
    } else {
      return <span className="badge badge-default">{mode || 'N/A'}</span>;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const hasActiveFilters = employeeCode || employeeName || site || inOutMode || startDate || endDate;

  return (
    <div className="dashboard-content-only">
      {/* Export Button */}
      <div className="dashboard-actions">
        <button onClick={handleExport} className="btn btn-export">
          📊 Export to Excel
        </button>
      </div>

      {/* Statistics Cards */}
      <StatisticsCards stats={statistics} loading={statsLoading} />

          {/* Filters Section */}
          <div className="filters-section">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className="btn btn-filter"
            >
              🔍 {showFilters ? 'Hide Filters' : 'Show Filters'}
              {hasActiveFilters && <span className="filter-indicator"> • Active</span>}
            </button>

            {showFilters && (
              <div className="filters-panel">
                <div className="filter-grid">
                  <div className="filter-item">
                    <label htmlFor="employeeCode">Employee Code</label>
                    <input
                      type="text"
                      id="employeeCode"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      placeholder="e.g., 080001"
                    />
                  </div>
                  <div className="filter-item">
                    <label htmlFor="employeeName">Employee Name</label>
                    <input
                      type="text"
                      id="employeeName"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder="Search by name..."
                    />
                  </div>
                  <div className="filter-item">
                    <label htmlFor="site">Site</label>
                    <select
                      id="site"
                      value={site}
                      onChange={(e) => setSite(e.target.value)}
                    >
                      <option value="">All Sites</option>
                      {sites.map((s, index) => (
                        <option key={index} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-item">
                    <label htmlFor="inOutMode">Status</label>
                    <select
                      id="inOutMode"
                      value={inOutMode}
                      onChange={(e) => setInOutMode(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="0">Check-In</option>
                      <option value="1">Check-Out</option>
                    </select>
                  </div>
                  <div className="filter-item">
                    <label htmlFor="startDate">Start Date</label>
                    <input
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="filter-item">
                    <label htmlFor="endDate">End Date</label>
                    <input
                      type="date"
                      id="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="filter-actions">
                  <button onClick={handleApplyFilters} className="btn btn-primary">
                    Apply Filters
                  </button>
                  <button onClick={handleClearFilters} className="btn btn-secondary">
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">📊 Total Records:</span>
            <span className="stat-value">{pagination?.totalRecords.toLocaleString() || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">📄 Current Page:</span>
            <span className="stat-value">{pagination?.currentPage || 1} / {pagination?.totalPages || 1}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">🏢 Company:</span>
            <span className="stat-value">MSS</span>
          </div>
          
          <div className="page-size-selector">
            <label htmlFor="pageSize">Records per page:</label>
            <select 
              id="pageSize" 
              value={pageSize} 
              onChange={(e) => { 
                setPageSize(Number(e.target.value)); 
                setCurrentPage(1); 
              }}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <h2>Loading employee data...</h2>
            </div>
          ) : error ? (
            <div className="error">
              <h2>⚠️ Error</h2>
              <p>{error}</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="no-data">
              <h2>📭 No Data Found</h2>
              <p>No employee attendance records match your filters.</p>
              {hasActiveFilters && (
                <button onClick={handleClearFilters} className="btn btn-primary">
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Branch</th>
                  <th>Employee Code</th>
                  <th>Name (English)</th>
                  <th>Name (Arabic)</th>
                  <th>Last Name</th>
                  <th>Site (English)</th>
                  <th>Site (Arabic)</th>
                  <th>Clock ID</th>
                  <th>In/Out</th>
                  <th>Punch Time</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, index) => (
                  <tr key={index}>
                    <td>{emp.Company_Code || 'N/A'}</td>
                    <td>{emp.Branch_Code || 'N/A'}</td>
                    <td className="emp-code">{emp.Employee_Code || 'N/A'}</td>
                    <td>{emp.Employee_Name_1_English || 'N/A'}</td>
                    <td>{emp.Employee_Name_1_Arabic || 'N/A'}</td>
                    <td>{emp.first_Last_name_eng || 'N/A'}</td>
                    <td>{emp.Site_1_English || 'N/A'}</td>
                    <td>{emp.Site_1_Arabic || 'N/A'}</td>
                    <td>{emp.clock_id || 'N/A'}</td>
                    <td>{getInOutBadge(emp.InOutMode)}</td>
                    <td>{formatDateTime(emp.punch_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

          {/* Pagination */}
          {pagination && !loading && !error && (
            <div className="pagination">
              <button 
                onClick={() => setCurrentPage(currentPage - 1)} 
                disabled={!pagination.hasPreviousPage}
              >
                ← Previous
              </button>

              <span className="pagination-info">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>

              <button 
                onClick={() => setCurrentPage(currentPage + 1)} 
                disabled={!pagination.hasNextPage}
              >
                Next →
              </button>
            </div>
          )}
    </div>
  );
};

export default Dashboard;

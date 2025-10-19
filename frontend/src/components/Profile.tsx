import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { employeeService } from '../services/api';
import { ProfileResponse } from '../types/employee';
import './Profile.css';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getMyProfile(
        startDate || undefined,
        endDate || undefined
      );
      setProfileData(data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        logout();
        return;
      }
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchProfile();
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setTimeout(() => fetchProfile(), 100);
  };

  const handleExport = async () => {
    try {
      const blob = await employeeService.exportMyAttendance(
        startDate || undefined,
        endDate || undefined
      );
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my_attendance_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to export data');
      console.error('Export error:', error);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="profile-error">
        <h2>⚠️ Error</h2>
        <p>{error || 'Failed to load profile'}</p>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  const { profile, attendanceRecords, statistics } = profileData;
  const hasActiveFilters = startDate || endDate;

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="header-content">
          <h1>My Profile</h1>
          <div className="header-actions">
            {(user?.role === 'admin' || user?.role === 'supervisor') && (
              <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
                Dashboard
              </button>
            )}
            {user?.employee_code && (
              <button onClick={handleExport} className="btn btn-success">
                📊 Export My Data
              </button>
            )}
            <button onClick={logout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="profile-content">
        {/* Filters Section - Only show for users with employee_code */}
        {profile.employee_code && (
          <div className="filters-section">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className="btn btn-filter"
            >
              🔍 {showFilters ? 'Hide Date Filter' : 'Show Date Filter'}
              {hasActiveFilters && <span className="filter-indicator"> • Active</span>}
            </button>

            {showFilters && (
              <div className="filters-panel">
                <div className="filter-row">
                  <div className="filter-item">
                    <label htmlFor="startDate">Start Date:</label>
                    <input
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="filter-item">
                    <label htmlFor="endDate">End Date:</label>
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
                    Apply Filter
                  </button>
                  <button onClick={handleClearFilters} className="btn btn-secondary">
                    Clear Filter
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="profile-info-card">
          <h2>User Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Username:</label>
              <span>{profile.username || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Full Name:</label>
              <span>{profile.full_name || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Role:</label>
              <span className="role-badge">{profile.role?.toUpperCase() || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{profile.email || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Employee Code:</label>
              <span>{profile.employee_code || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Account Status:</label>
              <span className={profile.is_active ? 'status-active' : 'status-inactive'}>
                {profile.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {statistics && (
          <div className="statistics-card">
            <h2>Attendance Statistics {hasActiveFilters && <span className="filter-note">(Filtered)</span>}</h2>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-number">{statistics.totalRecords || 0}</div>
                <div className="stat-label">Total Records</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">{statistics.totalCheckIns || 0}</div>
                <div className="stat-label">Check-Ins</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">{statistics.totalCheckOuts || 0}</div>
                <div className="stat-label">Check-Outs</div>
              </div>
            </div>
            {statistics.lastPunch && (
              <div className="last-punch">
                <strong>Last Punch:</strong> {new Date(statistics.lastPunch).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {!statistics && profile.employee_code && (
          <div className="no-statistics">
            <p>⚠️ No attendance statistics available</p>
          </div>
        )}

        {!profile.employee_code && (
          <div className="no-employee-code">
            <p>ℹ️ This user account does not have an associated employee code. Attendance tracking is not available.</p>
          </div>
        )}

        {profile.employee_code && (
          <div className="attendance-card">
            <h2>Recent Attendance Records (Last 20)</h2>
            <div className="attendance-table">
              {attendanceRecords && attendanceRecords.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>Clock ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.slice(0, 20).map((record, index) => (
                      <tr key={index}>
                        <td>{new Date(record.punch_time).toLocaleString()}</td>
                        <td>
                          {record.InOutMode === 0 ? (
                            <span className="badge badge-in">IN</span>
                          ) : (
                            <span className="badge badge-out">OUT</span>
                          )}
                        </td>
                        <td>{record.clock_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-records">
                  <p>No attendance records found for the selected date range.</p>
                  {hasActiveFilters && (
                    <button onClick={handleClearFilters} className="btn btn-primary">
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

/**
 * Admin Users Management
 * List/search users and toggle active status
 */

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { EmployeePayConfig } from '../types/overtime';
import './AdminUsers.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface UserRow {
  id: number;
  username: string;
  employee_code?: string;
  role: 'admin' | 'supervisor' | 'employee';
  full_name: string;
  email?: string;
  is_active: boolean;
}

const AdminUsers: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [otConfig, setOtConfig] = useState<EmployeePayConfig | null>(null);
  const [editUser, setEditUser] = useState<Partial<UserRow> | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data.users || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') loadUsers();
  }, [user?.role]);

  const loadUserDetails = async (row: UserRow) => {
    setSelected(row);
    setSuccess(null);
    setError(null);
    setOtConfig(null);
    setEditUser({ ...row });
    setNewPassword('');
    if (!row.employee_code) return;
    try {
      setLoadingDetails(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/overtime/config/${row.employee_code}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOtConfig(res.data?.data || null);
    } catch (err) {
      setOtConfig(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.employee_code || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  }, [users, query]);

  const toggleStatus = async (row: UserRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setUpdatingId(row.id);
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/auth/users/${row.id}/status`,
        { is_active: !row.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers((prev) => prev.map((u) => (u.id === row.id ? { ...u, is_active: !row.is_active } : u)));
      if (selected && selected.id === row.id) {
        const updated = { ...selected, is_active: !row.is_active };
        setSelected(updated);
        setEditUser((prev) => (prev ? { ...prev, is_active: updated.is_active } : prev));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const saveUser = async () => {
    if (!selected || !editUser) return;
    try {
      setSavingUser(true);
      setError(null);
      setSuccess(null);
      const token = localStorage.getItem('token');
      const updateRes = await axios.put(
        `${API_URL}/auth/users/${selected.id}`,
        {
          username: editUser.username,
          employee_code: editUser.employee_code?.trim() || null,
          role: editUser.role,
          full_name: editUser.full_name,
          email: editUser.email?.trim() || null,
          is_active: editUser.is_active,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!updateRes.data?.success) {
        throw new Error(updateRes.data?.message || 'Failed to save user');
      }

      if (newPassword && newPassword.length >= 6) {
        await axios.put(
          `${API_URL}/auth/users/${selected.id}/password`,
          { password: newPassword },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      // Optimistically update local list and selected
      setUsers((prev) => prev.map((u) => (u.id === selected.id ? {
        ...u,
        username: editUser.username || u.username,
        employee_code: editUser.employee_code || u.employee_code,
        role: (editUser.role as any) || u.role,
        full_name: editUser.full_name || u.full_name,
        email: editUser.email || u.email,
        is_active: editUser.is_active ?? u.is_active,
      } : u)));
      setSelected((prev) => prev ? {
        ...prev,
        username: editUser.username || prev.username,
        employee_code: editUser.employee_code || prev.employee_code,
        role: (editUser.role as any) || prev.role,
        full_name: editUser.full_name || prev.full_name,
        email: editUser.email || prev.email,
        is_active: editUser.is_active ?? prev.is_active,
      } : prev);
      setSuccess('User updated');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setSavingUser(false);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="access-denied">Admin access only.</div>;
  }

  return (
    <div className="admin-users">
      <div className="admin-grid">
        <aside className="user-list-panel">
          <div className="panel-header">
            <div>
              <h2>Team Directory</h2>
              <p>Search and select a teammate to manage.</p>
            </div>
            <button className="btn btn-ghost" onClick={loadUsers} disabled={loading}>
              ⟳
            </button>
          </div>
          <div className="search-row">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username, code, name, role"
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="user-list">
            {loading ? (
              <div className="list-placeholder">Loading users...</div>
            ) : filtered.length ? (
              filtered.map((u) => (
                <div
                  key={u.id}
                  className={`user-card ${selected?.id === u.id ? 'active' : ''}`}
                  onClick={() => loadUserDetails(u)}
                >
                  <div className="user-card-main">
                    <div className="avatar-chip">{getInitials(u.full_name)}</div>
                    <div className="user-card-text">
                      <div className="user-card-name">{u.full_name}</div>
                      <div className="user-card-meta">
                        <span>{u.username}</span>
                        <span>•</span>
                        <span>{u.role}</span>
                        {u.employee_code && (
                          <>
                            <span>•</span>
                            <span>{u.employee_code}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="user-card-actions">
                    <span className={`status-pill ${u.is_active ? 'active' : ''}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      className="btn btn-xs"
                      onClick={(e) => toggleStatus(u, e)}
                      disabled={updatingId === u.id}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="list-placeholder">No users match your search.</div>
            )}
          </div>
        </aside>
        <main className="profile-panel">
          {selected && editUser ? (
            <div className="user-profile">
              {success && <div className="alert alert-success">{success}</div>}
              <div className="profile-header">
                <div>
                  <h3>{editUser.full_name || 'User Profile'}</h3>
                  <span className="profile-subtitle">ID #{selected.id} · {editUser.username}</span>
                </div>
                <div className="profile-actions-header">
                  <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
                  <button className="btn btn-primary" onClick={saveUser} disabled={savingUser}>Save Changes</button>
                </div>
              </div>

              <section className="profile-section">
                <h4>Account Details</h4>
                <div className="grid-two">
                  <label>Username
                    <input type="text" value={editUser.username || ''} onChange={(e) => setEditUser({ ...editUser, username: e.target.value })} />
                  </label>
                  <label>Role
                    <select value={editUser.role || 'employee'} onChange={(e) => setEditUser({ ...editUser, role: e.target.value as any })}>
                      <option value="employee">employee</option>
                      <option value="supervisor">supervisor</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>
                  <label>Employee Code
                    <input type="text" value={editUser.employee_code || ''} onChange={(e) => setEditUser({ ...editUser, employee_code: e.target.value })} />
                  </label>
                  <label>Status
                    <select value={editUser.is_active ? '1' : '0'} onChange={(e) => setEditUser({ ...editUser, is_active: e.target.value === '1' })}>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="profile-section">
                <h4>Personal Information</h4>
                <div className="grid-two">
                  <label>Full Name
                    <input type="text" value={editUser.full_name || ''} onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })} />
                  </label>
                  <label>Email
                    <input type="email" value={editUser.email || ''} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
                  </label>
                </div>
              </section>

              <section className="profile-section">
                <h4>Security</h4>
                <label>New Password
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep current password" />
                </label>
                <small>Minimum 6 characters. Leave empty to keep the existing password.</small>
              </section>

              <section className="profile-section">
                <h4>Overtime Settings</h4>
                {loadingDetails ? (
                  <div>Loading overtime settings...</div>
                ) : selected.employee_code ? (
                  otConfig ? (
                    <div className="ot-grid">
                      <div><strong>Pay Type:</strong> {otConfig.pay_type}</div>
                      <div><strong>Hourly Rate:</strong> ₪{otConfig.hourly_rate_regular.toFixed(2)}</div>
                      <div><strong>Week Start:</strong> {otConfig.week_start}</div>
                      <div><strong>Weekend Days:</strong> {otConfig.weekend_days}</div>
                      <div><strong>Workday Start:</strong> {otConfig.workday_start}</div>
                      <div><strong>Workday End:</strong> {otConfig.workday_end}</div>
                      <div><strong>OT Starts:</strong> {otConfig.ot_start_time_on_workdays}</div>
                      <div><strong>Weekday OT:</strong> {otConfig.weekday_ot_rate_type === 'fixed' ? `₪${(otConfig.hourly_rate_weekday_ot ?? 0).toFixed(2)} (fixed)` : `${otConfig.weekday_ot_multiplier ?? 0}× (multiplier)`}</div>
                      <div><strong>Weekend OT:</strong> {otConfig.weekend_ot_rate_type === 'fixed' ? `₪${(otConfig.hourly_rate_weekend_ot ?? 0).toFixed(2)} (fixed)` : `${otConfig.weekend_ot_multiplier ?? 0}× (multiplier)`}</div>
                    </div>
                  ) : (
                    <div>No overtime settings found. Defaults will apply.</div>
                  )
                ) : (
                  <div>This user has no employee code.</div>
                )}
              </section>
            </div>
          ) : (
            <div className="empty-state">
              <h3>Select a user to begin</h3>
              <p>Choose a teammate from the list to review and edit details.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminUsers;



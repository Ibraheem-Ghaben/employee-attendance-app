/**
 * Employee Management Component
 * Create and manage employees
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './EmployeeManagement.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface CreateEmployeeForm {
  username: string;
  password: string;
  confirmPassword: string;
  employee_code: string;
  full_name: string;
  email: string;
  role: 'employee' | 'supervisor' | 'admin';
}

interface EmployeeManagementProps {
  onBack?: () => void;
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [form, setForm] = useState<CreateEmployeeForm>({
    username: '',
    password: '',
    confirmPassword: '',
    employee_code: '',
    full_name: '',
    email: '',
    role: 'employee',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!form.username || !form.password || !form.full_name) {
      setError('Please fill in all required fields');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await axios.post(
        `${API_URL}/auth/register`,
        {
          username: form.username,
          password: form.password,
          employee_code: form.employee_code || undefined,
          full_name: form.full_name,
          email: form.email || undefined,
          role: form.role,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        setSuccess(`Employee ${form.username} created successfully!`);
        // Reset form
        setForm({
          username: '',
          password: '',
          confirmPassword: '',
          employee_code: '',
          full_name: '',
          email: '',
          role: 'employee',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      username: '',
      password: '',
      confirmPassword: '',
      employee_code: '',
      full_name: '',
      email: '',
      role: 'employee',
    });
    setError(null);
    setSuccess(null);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="employee-management">
        <div className="access-denied">
          <h2>⚠️ Access Denied</h2>
          <p>Only administrators can create new employees.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-management">
      <div className="management-header">
        <h2>Create New Employee</h2>
        {onBack && (
          <button className="btn btn-link" onClick={onBack}>← Back to Dashboard</button>
        )}
      </div>
      <p className="subtitle">Add a new employee to the system</p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="employee-form">
        <div className="form-sections">
          {/* Account Information */}
          <section className="form-section">
            <h3>Account Information</h3>

            <div className="form-group">
              <label htmlFor="username">
                Username <span className="required">*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                placeholder="e.g., jsmith"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password <span className="required">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirm Password <span className="required">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Re-enter password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">
                Role <span className="required">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                required
              >
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </section>

          {/* Personal Information */}
          <section className="form-section">
            <h3>Personal Information</h3>

            <div className="form-group">
              <label htmlFor="full_name">
                Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                placeholder="e.g., John Smith"
              />
            </div>

            <div className="form-group">
              <label htmlFor="employee_code">
                Employee Code
              </label>
              <input
                type="text"
                id="employee_code"
                name="employee_code"
                value={form.employee_code}
                onChange={handleChange}
                placeholder="e.g., 080XXX (optional)"
              />
              <small>Leave blank if employee has no code</small>
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="e.g., john.smith@company.com"
              />
            </div>
          </section>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : '✓ Create Employee'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            ↻ Reset Form
          </button>
        </div>
      </form>

      <div className="help-section">
        <h4>💡 Tips</h4>
        <ul>
          <li>Username must be unique in the system</li>
          <li>Password must be at least 6 characters</li>
          <li>Employee code should match the code in the attendance system (if applicable)</li>
          <li>Email is optional but recommended for notifications</li>
          <li>New employees can login immediately after creation</li>
        </ul>
      </div>
    </div>
  );
};

export default EmployeeManagement;


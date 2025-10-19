/**
 * Navbar Component
 * Main navigation bar with all features
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

interface NavbarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeView, onViewChange }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';

  const menuItems = [
    { id: 'attendance', label: 'Attendance', icon: '📊', roles: ['admin', 'supervisor'] },
    { id: 'calendar', label: 'Weekly Calendar', icon: '📅', roles: ['admin', 'supervisor', 'employee'] },
    { id: 'report', label: 'Weekly Report', icon: '📈', roles: ['admin', 'supervisor', 'employee'] },
    { id: 'settings', label: 'Overtime Settings', icon: '⚙️', roles: ['admin'] },
    { id: 'create', label: 'Create Employee', icon: '➕', roles: ['admin'] },
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">🏢</span>
        <span className="brand-name">MSS Attendance</span>
      </div>

      <div className="navbar-menu">
        {visibleItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="navbar-user">
        <button 
          className="user-button"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <span className="user-avatar">
            {user?.full_name?.charAt(0) || 'U'}
          </span>
          <span className="user-name">{user?.full_name}</span>
          <span className="user-role">{user?.role}</span>
        </button>

        {showUserMenu && (
          <div className="user-menu">
            <div className="user-info">
              <strong>{user?.full_name}</strong>
              <small>{user?.username}</small>
              {user?.employee_code && <small>Code: {user.employee_code}</small>}
            </div>
            <button className="menu-item" onClick={() => { onViewChange('profile'); setShowUserMenu(false); }}>
              👤 My Profile
            </button>
            <button className="menu-item logout" onClick={logout}>
              🚪 Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;


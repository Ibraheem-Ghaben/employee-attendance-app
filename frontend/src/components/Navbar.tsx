/**
 * Navbar Component
 * Main navigation bar with all features
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { employeeService } from '../services/api';
import './Navbar.css';

interface NavbarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeView, onViewChange }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const menuItems = [
    { id: 'attendance', label: 'Attendance', icon: '📊', roles: ['admin', 'supervisor'] },
    { id: 'calendar', label: 'Weekly Calendar', icon: '📅', roles: ['admin', 'supervisor', 'employee'] },
    { id: 'report', label: 'Weekly Report', icon: '📈', roles: ['admin', 'supervisor', 'employee'] },
    { id: 'settings', label: 'Overtime Settings', icon: '⚙️', roles: ['admin'] },
    { id: 'create', label: 'Create Employee', icon: '➕', roles: ['admin'] },
    { id: 'users', label: 'Users', icon: '👥', roles: ['admin'] },
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  const handleViewChange = (view: string) => {
    onViewChange(view);
    setIsMenuOpen(false);
  };

  const handleSync = async () => {
    if (!window.confirm('Sync attendance data from Clock server? This may take a few minutes.')) {
      return;
    }
    
    try {
      setIsSyncing(true);
      await employeeService.syncAttendance();
      
      // Simulate sync duration (wait 30 seconds for background process)
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      alert('✅ Sync completed successfully! Attendance data has been updated.');
      window.location.reload(); // Reload to show fresh data
    } catch (error: any) {
      alert('❌ Sync failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <nav className={`navbar ${isMenuOpen ? 'navbar-open' : ''}`}>
      <div className="navbar-left">
        <button
          className="nav-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
        <div className="navbar-brand">
          <img src="/logo.png" alt="Square Logo" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-name">MSS Attendance</span>
            <span className="brand-subtitle">MENA Digital Attendance</span>
          </div>
        </div>
      </div>

      <div className="navbar-menu">
        {visibleItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => handleViewChange(item.id)}
          >
            <span className="nav-icon" aria-hidden>{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="navbar-user">
        {user?.role === 'admin' && (
          <button 
            className="sync-button"
            onClick={handleSync}
            disabled={isSyncing}
            title="Sync attendance data from APIC server"
          >
            <span className={`sync-icon ${isSyncing ? 'syncing' : ''}`}>🔄</span>
            <span className="sync-label">Sync Data</span>
          </button>
        )}
        
        <button 
          className="user-button"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <span className="user-avatar">
            {user?.full_name?.charAt(0) || 'U'}
          </span>
          <span className="user-details">
            <span className="user-name">{user?.full_name}</span>
            <span className="user-role">{user?.role}</span>
          </span>
          <span className="user-caret">▾</span>
        </button>

        {showUserMenu && (
          <div className="user-menu">
            <div className="user-info">
              <strong>{user?.full_name}</strong>
              <small>{user?.username}</small>
              {user?.employee_code && <small>Code: {user.employee_code}</small>}
            </div>
            <button className="menu-item" onClick={() => { handleViewChange('profile'); setShowUserMenu(false); }}>
              👤 My Profile
            </button>
            <button className="menu-item logout" onClick={logout}>
              🚪 Logout
            </button>
          </div>
        )}
      </div>

      {/* Sync Loading Overlay */}
      {isSyncing && (
        <div className="sync-overlay">
          <div className="sync-modal">
            <div className="sync-spinner"></div>
            <h2>Syncing Attendance Data</h2>
            <p>Fetching punch records from clock server...</p>
            <p className="sync-note">This may take up to 30 seconds. Please wait.</p>
            <div className="sync-progress">
              <div className="sync-progress-bar"></div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;


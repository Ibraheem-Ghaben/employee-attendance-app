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
    const confirmMessage = 'Sync attendance data from Clock server?\n\n' +
      '• First sync: Downloads all data (may take longer)\n' +
      '• Subsequent syncs: Only new/updated records (faster)\n\n' +
      'This process will run in the background.';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setIsSyncing(true);
      
      // Show progress message
      const progressMessage = document.createElement('div');
      progressMessage.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: linear-gradient(135deg, #0077b6, #0096c7);
        color: white; padding: 16px 24px; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 119, 182, 0.3);
        font-family: inherit; font-size: 14px; font-weight: 600;
        max-width: 300px; text-align: center;
      `;
      progressMessage.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <div style="width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span>Syncing Data...</span>
        </div>
        <div style="font-size: 12px; opacity: 0.9;">Processing attendance records</div>
      `;
      document.body.appendChild(progressMessage);
      
      const result = await employeeService.syncAttendance();
      
      // Store sync time in localStorage
      localStorage.setItem('lastSyncTime', new Date().toLocaleString());
      
      // Update progress message with results
      progressMessage.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <span style="font-size: 18px;">✅</span>
          <span>Sync Completed!</span>
        </div>
        <div style="font-size: 12px; opacity: 0.9;">
          ${result.message || 'Attendance data updated successfully'}
        </div>
      `;
      
      // Remove progress message after 3 seconds
      setTimeout(() => {
        if (progressMessage.parentNode) {
          progressMessage.parentNode.removeChild(progressMessage);
        }
      }, 3000);
      
      // Reload to show fresh data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      // Remove progress message if it exists
      const existingMessage = document.querySelector('[style*="position: fixed"]');
      if (existingMessage) {
        existingMessage.remove();
      }
      
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
            
            {/* Modern MSS Signature */}
            <div className="user-menu-signature">
              <div className="signature-line"></div>
              <div className="signature-content">
                <span className="signature-icon">💻</span>
                <span className="signature-text">Powered by</span>
                <span className="signature-brand">MSS Software</span>
                <span className="signature-year">© 2025</span>
              </div>
              <div className="signature-line"></div>
            </div>
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


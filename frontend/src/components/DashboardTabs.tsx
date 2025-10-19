/**
 * Dashboard with Tabs Component
 * Main dashboard with multiple tabs for different features
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import WeeklyCalendar from './WeeklyCalendar';
import WeeklyReport from './WeeklyReport';
import OvertimeSettings from './OvertimeSettings';
import EmployeeManagement from './EmployeeManagement';
import './DashboardTabs.css';

type TabType = 'attendance' | 'calendar' | 'report' | 'settings' | 'create';

const DashboardTabs: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const isEmployee = user?.role === 'employee';

  const tabs = [
    { id: 'attendance' as TabType, label: '📊 Attendance', icon: '📊', roles: ['admin', 'supervisor'] },
    { id: 'calendar' as TabType, label: '📅 Weekly Calendar', icon: '📅', roles: ['admin', 'supervisor', 'employee'] },
    { id: 'report' as TabType, label: '📈 Weekly Report', icon: '📈', roles: ['admin', 'supervisor', 'employee'] },
    { id: 'settings' as TabType, label: '⚙️ Overtime Settings', icon: '⚙️', roles: ['admin', 'supervisor', 'employee'] },
    { id: 'create' as TabType, label: '➕ Create Employee', icon: '➕', roles: ['admin'] },
  ];

  const visibleTabs = tabs.filter(tab => tab.roles.includes(user?.role || ''));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'attendance':
        return <Dashboard />;
      
      case 'calendar':
        return (
          <WeeklyCalendar
            employeeCode={user?.employee_code || ''}
            isAdmin={isAdmin || isSupervisor}
          />
        );
      
      case 'report':
        return (
          <WeeklyReport
            employeeCode={isEmployee ? user?.employee_code : undefined}
            isAdmin={isAdmin || isSupervisor}
          />
        );
      
      case 'settings':
        return (
          <OvertimeSettings
            employeeCode={user?.employee_code || ''}
            isAdmin={isAdmin || isSupervisor}
          />
        );
      
      case 'create':
        return <EmployeeManagement />;
      
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="dashboard-tabs-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="dashboard-tabs-main">
        {/* Header with Menu Toggle */}
        <div className="tabs-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <div className="header-title">
            <h1>Employee Attendance System</h1>
            <span className="header-subtitle">Welcome, {user?.full_name}</span>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="tabs-navigation">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default DashboardTabs;


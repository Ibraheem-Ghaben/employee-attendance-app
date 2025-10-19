/**
 * Dashboard with Navbar Component
 * Main dashboard with navbar navigation
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import Dashboard from './Dashboard';
import WeeklyCalendar from './WeeklyCalendar';
import WeeklyReport from './WeeklyReport';
import OvertimeSettings from './OvertimeSettings';
import EmployeeManagement from './EmployeeManagement';
import Profile from './Profile';
import './DashboardTabs.css';

type ViewType = 'attendance' | 'calendar' | 'report' | 'settings' | 'create' | 'profile';

const DashboardTabs: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ViewType>(
    user?.role === 'employee' ? 'calendar' : 'attendance'
  );

  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const isEmployee = user?.role === 'employee';

  const renderContent = () => {
    switch (activeView) {
      case 'attendance':
        if (!isAdmin && !isSupervisor) {
          return <div className="access-denied">Access restricted to admin and supervisor only.</div>;
        }
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
        if (!isAdmin) {
          return <div className="access-denied">Overtime Settings are restricted to administrators only.</div>;
        }
        return (
          <OvertimeSettings
            employeeCode={user?.employee_code || ''}
            isAdmin={isAdmin}
          />
        );
      
      case 'create':
        if (!isAdmin) {
          return <div className="access-denied">Employee creation is restricted to administrators only.</div>;
        }
        return <EmployeeManagement />;
      
      case 'profile':
        return <Profile />;
      
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="dashboard-with-navbar">
      <Navbar activeView={activeView} onViewChange={(view) => setActiveView(view as ViewType)} />
      
      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default DashboardTabs;


/**
 * Dashboard with Navbar Component
 * Main dashboard with navbar navigation
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import Dashboard from './Dashboard';
import WeeklyCalendar from './WeeklyCalendar';
import WeeklyReport from './WeeklyReport';
import OvertimeSettings from './OvertimeSettings';
import EmployeeManagement from './EmployeeManagement';
import AdminUsers from './AdminUsers';
import Profile from './Profile';
import './DashboardTabs.css';

type ViewType = 'attendance' | 'calendar' | 'report' | 'settings' | 'create' | 'profile' | 'users';

const DashboardTabs: React.FC = () => {
  const { user } = useAuth();

  const allowedViewsForRole = (role?: string): ViewType[] => {
    if (role === 'admin') return ['attendance', 'calendar', 'report', 'settings', 'create', 'users', 'profile'];
    if (role === 'supervisor') return ['attendance', 'calendar', 'report', 'profile'];
    return ['calendar', 'report', 'profile'];
  };

  const initialView = useMemo(() => {
    const stored = localStorage.getItem('dashboardActiveView') as ViewType | null;
    const allowed = allowedViewsForRole(user?.role);
    if (stored && allowed.includes(stored)) return stored;
    return user?.role === 'employee' ? 'calendar' : 'attendance';
  }, [user?.role]);

  const [activeView, setActiveView] = useState<ViewType>(initialView);

  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const isEmployee = user?.role === 'employee';

  useEffect(() => {
    localStorage.setItem('dashboardActiveView', activeView);
  }, [activeView]);

  useEffect(() => {
    const allowed = allowedViewsForRole(user?.role);
    if (!allowed.includes(activeView)) {
      setActiveView(user?.role === 'employee' ? 'calendar' : 'attendance');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

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
        return <EmployeeManagement onBack={() => setActiveView('attendance')} />;
      
      case 'profile':
        return <Profile />;
      case 'users':
        return <AdminUsers />;
      
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


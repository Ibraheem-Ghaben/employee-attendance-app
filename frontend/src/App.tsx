import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import DashboardTabs from './components/DashboardTabs';
import Profile from './components/Profile';
import ProtectedRoute from './components/ProtectedRoute';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardTabs />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/unauthorized"
        element={
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h1>⚠️ Unauthorized</h1>
            <p>You don't have permission to access this page.</p>
            <button onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </button>
          </div>
        }
      />
      
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />
      
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        {/* MSS Software Team Watermark */}
        <div className="mss-watermark">
          <span className="watermark-icon">💻</span>
          <span className="watermark-text">Made by MSS Software Team</span>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

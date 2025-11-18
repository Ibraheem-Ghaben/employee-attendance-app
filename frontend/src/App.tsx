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
        element={
          <div style={{ 
            textAlign: 'center', 
            padding: '50px',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #48cae4 0%, #0077b6 100%)',
            color: 'white'
          }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>404</h1>
            <h2 style={{ marginBottom: '20px' }}>Page Not Found</h2>
            <p style={{ marginBottom: '30px', fontSize: '1.1rem' }}>The page you're looking for doesn't exist.</p>
            <button 
              onClick={() => window.location.href = isAuthenticated ? '/dashboard' : '/login'}
              style={{
                background: 'white',
                color: '#0077b6',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
            </button>
          </div>
        }
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
          <span className="watermark-text">Developed by MSS Software Team © 2025</span>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

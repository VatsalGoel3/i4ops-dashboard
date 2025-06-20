import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { useRealTime } from './api/useRealTime';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/Dashboard';
import HostsPage from './pages/HostsPage';
import VMsPage from './pages/VMsPage';
import SettingsPage from './pages/SettingsPage';

function AppWithRealTime() {
  // Enable real-time updates globally
  useRealTime();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Layout>
              <DashboardPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/hosts"
        element={
          <RequireAuth>
            <Layout>
              <HostsPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/vms"
        element={
          <RequireAuth>
            <Layout>
              <VMsPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/settings"  // Add the new route for Settings page
        element={
          <RequireAuth>
            <Layout>
              <SettingsPage />
            </Layout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppWithRealTime />
    </AuthProvider>
  );
}
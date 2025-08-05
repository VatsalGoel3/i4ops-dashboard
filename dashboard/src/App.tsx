import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { SearchProvider } from './context/SearchContext.tsx';
import { ConnectionProvider } from './context/ConnectionContext.tsx';
import { useRealTime } from './api/useRealTime';
import { useConnectionHealth } from './hooks/useConnectionHealth';
import { useHosts, useVMs } from './api/queries';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/Dashboard';
import HostsPage from './pages/HostsPage';
import VMsPage from './pages/VMsPage';
import SettingsPage from './pages/SettingsPage';
import DeveloperPage from './pages/DeveloperPage';
import ProfilePage from './pages/ProfilePage';
import UserManagementPage from './pages/UserManagementPage';

function AppWithRealTime() {
  // Enable real-time updates globally
  useRealTime();
  
  // Enable connection health monitoring
  useConnectionHealth();

  // Get data for search context
  const { data: hosts = [] } = useHosts();
  const { data: vms = [] } = useVMs();

  return (
    <SearchProvider hosts={hosts} vms={vms}>
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
        path="/users"
        element={
          <RequireAuth>
            <Layout>
              <UserManagementPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <Layout>
              <SettingsPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/developer"
        element={
          <RequireAuth>
            <Layout>
              <DeveloperPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Layout>
              <ProfilePage />
            </Layout>
          </RequireAuth>
        }
      />
      </Routes>
    </SearchProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ConnectionProvider>
        <AppWithRealTime />
      </ConnectionProvider>
    </AuthProvider>
  );
}
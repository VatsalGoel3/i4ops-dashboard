import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import { AuthProvider } from './context/AuthContext';
import { PollingProvider } from './context/PollingContext';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/Dashboard';
import HostsPage from './pages/HostsPage';
import VMsPage from './pages/VMsPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <PollingProvider>
                <Layout>
                  <DashboardPage />
                </Layout>
              </PollingProvider>
            </RequireAuth>
          }
        />
        <Route
          path="/hosts"
          element={
            <RequireAuth>
              <PollingProvider>
                <Layout>
                  <HostsPage />
                </Layout>
              </PollingProvider>
            </RequireAuth>
          }
        />
        <Route
          path="/vms"
          element={
            <RequireAuth>
              <PollingProvider>
                <Layout>
                  <VMsPage />
                </Layout>
              </PollingProvider>
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
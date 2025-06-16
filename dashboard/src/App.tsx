import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { DataProvider } from './context/DataContext.tsx';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/Dashboard';
import HostsPage from './pages/HostsPage';
import VMsPage from './pages/VMsPage';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
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
        </Routes>
      </DataProvider>
    </AuthProvider>
  );
}
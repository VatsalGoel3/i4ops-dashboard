import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/Dashboard';
import DevicesPage from './pages/DevicePage';
import EventsPage from './pages/EventsPage';
import HostsPage from './pages/HostsPage';
import VMsPage from './pages/VMsPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/" 
          element={<RequireAuth><Layout><DashboardPage /></Layout></RequireAuth>} 
        />
        <Route 
          path="/dashboard" 
          element={<RequireAuth><Layout><DashboardPage /></Layout></RequireAuth>} 
        />
        <Route 
          path="/devices" 
          element={<RequireAuth><Layout><DevicesPage /></Layout></RequireAuth>} 
        />
        <Route 
          path="/events" 
          element={<RequireAuth><Layout><EventsPage /></Layout></RequireAuth>} 
        />
        <Route 
          path="/hosts" 
          element={<RequireAuth><Layout><HostsPage /></Layout></RequireAuth>} 
        />
        <Route 
          path="/vms" 
          element={<RequireAuth><Layout><VMsPage /></Layout></RequireAuth>} 
        />
        {/* catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
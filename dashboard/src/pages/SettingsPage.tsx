import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useHosts } from '../api/queries';
import SettingsSection from '../components/SettingsSection';
import { getUserDisplayName, getUserRole } from '../lib/userUtils';

export default function SettingsPage() {
  const { signOut, user } = useAuth();
  const { darkMode, toggleDarkMode, pageSize, setPageSize } = useUI();
  const { data: hosts = [] } = useHosts();

  const [version, setVersion] = useState('...');
  
  // Get proper user data
  const displayName = getUserDisplayName(user);
  const userRole = getUserRole(user);

  useEffect(() => {
    fetch('/version.txt')
      .then(res => res.text())
      .then(setVersion)
      .catch(() => setVersion('unknown'));
  }, []);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
  };

  const exportHostsCSV = () => {
    const headers = ['Name', 'IP', 'OS', 'Status', 'Uptime', 'VM Count'];
    const rows = hosts.map(h => [
      h.name,
      h.ip,
      h.os,
      h.status,
      `${Math.floor(h.uptime / 86400)}d`,
      h.vms?.length ?? 0,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'hosts.csv';
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Exported Hosts CSV');
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h2>

      {/* USER ACCOUNT */}
      <SettingsSection 
        title="Account" 
        description="Quick account actions and profile management"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{displayName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={() => window.location.href = '/profile'}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Manage Profile
              </button>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <button
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
              onClick={signOut}
            >
              Sign Out
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              You will be redirected to the login page
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* DASHBOARD SETTINGS */}
      <SettingsSection title="Dashboard Settings" description="Configure how data is displayed and refreshed">
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleDarkMode}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</span>
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0">
                Items per page:
              </label>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0">
                Real-time updates:
              </label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ● Enabled
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
            <strong>Performance tip:</strong> Lower page sizes improve load times on slower connections
          </div>
        </div>
      </SettingsSection>

      {/* DATA EXPORT */}
      <SettingsSection title="Data Export" description="Export data for backup or analysis">
        <div className="space-y-3">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors text-sm"
            onClick={exportHostsCSV}
          >
            <Download className="w-4 h-4" />
            Export Hosts CSV ({hosts.length} hosts)
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Includes host details, status, and VM counts
          </p>
        </div>
      </SettingsSection>

      {/* SYSTEM INFO */}
      <SettingsSection title="System Information" description="Application details and diagnostics">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                App Version
              </label>
              <div className="text-gray-900 dark:text-gray-100 font-mono">
                {version}
              </div>
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                Total Hosts
              </label>
              <div className="text-gray-900 dark:text-gray-100 font-medium">
                {hosts.length}
              </div>
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                Active VMs
              </label>
              <div className="text-gray-900 dark:text-gray-100 font-medium">
                {hosts.reduce((sum, host) => sum + (host.vms?.length || 0), 0)}
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
              onClick={() => {
                localStorage.removeItem('dark-mode');
                localStorage.removeItem('ui-page-size');
                toast.success('Settings reset to defaults');
                window.location.reload();
              }}
            >
              Reset to Defaults
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Clears all local preferences and reloads the page
            </p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
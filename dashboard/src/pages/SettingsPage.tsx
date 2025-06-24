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
        description="Manage your profile and authentication settings"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-sm">
              <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                Display Name
              </label>
              <div className="text-gray-900 dark:text-gray-100 font-medium">
                {displayName}
              </div>
            </div>
            <div className="text-sm">
              <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                Email Address
              </label>
              <div className="text-gray-900 dark:text-gray-100">
                {user?.email || 'No email address'}
              </div>
            </div>
            <div className="text-sm">
              <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                Role
              </label>
              <div className="text-gray-900 dark:text-gray-100">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                  {userRole}
                </span>
              </div>
            </div>
            <div className="text-sm">
              <label className="block text-gray-600 dark:text-gray-400 font-medium mb-1">
                User ID
              </label>
              <div className="text-gray-900 dark:text-gray-100 font-mono text-xs">
                {user?.id || 'Unknown'}
              </div>
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

      {/* APPEARANCE */}
      <SettingsSection title="Appearance">
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
          
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
            </select>
          </div>
        </div>
      </SettingsSection>

      {/* DATA EXPORT */}
      <SettingsSection title="Data Export">
        <div className="space-y-3">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors text-sm"
            onClick={exportHostsCSV}
          >
            <Download className="w-4 h-4" />
            Export Hosts CSV
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed text-sm"
            disabled
          >
            <Download className="w-4 h-4" />
            Export Audit Logs (coming soon)
          </button>
        </div>
      </SettingsSection>

      {/* SYSTEM */}
      <SettingsSection title="System">
        <div className="space-y-3">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <strong>App Version:</strong> {version}
          </div>
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
        </div>
      </SettingsSection>
    </div>
  );
}
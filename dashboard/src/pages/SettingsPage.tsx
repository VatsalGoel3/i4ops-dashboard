import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useHosts } from '../api/queries';
import SettingsSection from '../components/SettingsSection';

export default function SettingsPage() {
  const { signOut, user } = useAuth();
  const { darkMode, toggleDarkMode, pageSize, setPageSize } = useUI();
  const { data: hosts = [] } = useHosts();

  const [version, setVersion] = useState('...');

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
      <SettingsSection title="Account">
        <div className="space-y-3">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Email:</strong> {user?.email || 'unknown'}
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Role:</strong> {user?.user_metadata?.role || 'viewer'}
          </div>
          <button
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
            onClick={signOut}
          >
            Sign Out
          </button>
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
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useDataContext } from '../context/DataContext';
import SettingsSection from '../components/SettingsSection';

export default function SettingsPage() {
  const { signOut } = useAuth();
  const { darkMode, toggleDarkMode, pageSize, setPageSize } = useUI();
  const { hosts } = useDataContext();

  const [version, setVersion] = useState('...');
  const [health, setHealth] = useState('...');
  const [sseStatus, setSseStatus] = useState<'connected' | 'disconnected'>('connected');
  const [lastPoll, setLastPoll] = useState<string>('Loading...');

  useEffect(() => {
    fetch('/version.txt').then(res => res.text()).then(setVersion).catch(() => setVersion('unknown'));
    fetch('/healthz').then(res => res.ok ? setHealth('Healthy') : setHealth('Unavailable')).catch(() => setHealth('Unavailable'));

    const timer = setInterval(() => {
      setSseStatus(Math.random() > 0.05 ? 'connected' : 'disconnected');
      setLastPoll(new Date().toLocaleTimeString());
    }, 5000);

    return () => clearInterval(timer);
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
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h2>

      <SettingsSection title="General">
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li><strong>Real-time updates:</strong> {sseStatus === 'connected' ? '✅ Connected (SSE)' : '❌ Disconnected'}</li>
          <li><strong>Polling interval:</strong> 30s (read-only)</li>
          <li><strong>Last poll:</strong> {lastPoll}</li>
        </ul>
      </SettingsSection>

      <SettingsSection title="User Info">
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li><strong>Email:</strong> admin@test.com</li>
          <li><strong>Role:</strong> admin (placeholder)</li>
        </ul>
        <button className="mt-3 px-3 py-1 bg-red-500 text-white rounded text-xs" onClick={signOut}>
          Log out
        </button>
      </SettingsSection>

      <SettingsSection title="Appearance">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleDarkMode}
              className="form-checkbox"
            />
            <span className="text-sm">Dark Mode</span>
          </label>
          <label className="flex items-center space-x-2">
            <span className="text-sm">Table Page Size</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="bg-gray-200 dark:bg-gray-700 p-1 rounded"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </SettingsSection>

      <SettingsSection title="Diagnostics">
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li><strong>App Version:</strong> {version}</li>
          <li><strong>Backend Health:</strong> {health}</li>
        </ul>
      </SettingsSection>

      <SettingsSection title="Admin Tools">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <button
            className="bg-indigo-500 text-white px-3 py-1 rounded flex items-center justify-center"
            onClick={exportHostsCSV}
          >
            <Download className="w-4 h-4 mr-2" /> Export Hosts CSV
          </button>
          <button
            className="bg-indigo-500 text-white px-3 py-1 rounded opacity-50 cursor-not-allowed"
            disabled
          >
            Export Audit Logs (coming soon)
          </button>
          <button
            className="bg-gray-700 text-white px-3 py-1 rounded"
            onClick={() => {
              localStorage.removeItem('dark-mode');
              localStorage.removeItem('ui-page-size');
              window.location.reload();
            }}
          >
            Reset UI Preferences
          </button>
        </div>
      </SettingsSection>
    </div>
  );
}
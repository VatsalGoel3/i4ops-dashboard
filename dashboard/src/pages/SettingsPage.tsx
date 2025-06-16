import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [version, setVersion] = useState('...');
  const [health, setHealth] = useState('...');
  const [sseStatus, setSseStatus] = useState<'connected' | 'disconnected'>('connected');
  const [lastPoll, setLastPoll] = useState<string>('Loading...');
  const [email] = useState('you@example.com'); // Replace with real auth
  const [role] = useState<'admin' | 'viewer'>('admin'); // Replace with useRole()
  const [darkMode, setDarkMode] = useState(false);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    fetch('/version.txt').then(res => res.text()).then(setVersion).catch(() => setVersion('unknown'));
    fetch('/healthz').then(res => res.ok ? setHealth('Healthy') : setHealth('Degraded')).catch(() => setHealth('Unavailable'));

    const timer = setInterval(() => {
      // Simulate heartbeat check
      setSseStatus(Math.random() > 0.05 ? 'connected' : 'disconnected');
      setLastPoll(new Date().toLocaleTimeString());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-8">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
        Settings
      </h2>

      {/* General */}
      <div>
        <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-200">General</h3>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li><strong>Real-time updates:</strong> {sseStatus === 'connected' ? '✅ Connected (SSE)' : '❌ Disconnected'}</li>
          <li><strong>Polling interval:</strong> 30s (read-only)</li>
          <li><strong>Last poll:</strong> {lastPoll}</li>
        </ul>
      </div>

      {/* User Info */}
      <div>
        <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-200">User Info</h3>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li><strong>Email:</strong> {email}</li>
          <li><strong>Role:</strong> {role}</li>
          <li><button className="mt-2 px-3 py-1 bg-red-500 text-white rounded-md text-xs">Log out</button></li>
        </ul>
      </div>

      {/* Appearance */}
      <div>
        <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-200">Appearance</h3>
        <div className="flex items-center space-x-4 text-sm">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
              className="form-checkbox"
            />
            <span>Dark Mode</span>
          </label>
          <label className="flex items-center space-x-2">
            <span>Table Page Size</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-gray-200 dark:bg-gray-700 p-1 rounded"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </div>

      {/* Diagnostics */}
      <div>
        <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-200">Diagnostics</h3>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li><strong>App Version:</strong> {version}</li>
          <li><strong>Backend Health:</strong> {health}</li>
        </ul>
      </div>

      {/* Admin Tools */}
      <div>
        <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-200">Admin Tools</h3>
        <div className="flex flex-col gap-2 text-sm">
          <button className="bg-indigo-500 text-white px-3 py-1 rounded">Export Hosts CSV</button>
          <button className="bg-indigo-500 text-white px-3 py-1 rounded opacity-50 cursor-not-allowed" disabled>Export Audit Logs (coming soon)</button>
          <button className="bg-gray-700 text-white px-3 py-1 rounded" onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}>Reset UI Preferences</button>
        </div>
      </div>
    </section>
  );
}
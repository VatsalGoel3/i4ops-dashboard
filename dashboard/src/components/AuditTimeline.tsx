import { type AuditLog } from '../api/useAuditLogs';

export default function AuditTimeline({ logs }: { logs: AuditLog[] }) {
  if (!logs.length) return <p className="text-sm text-gray-500 italic">No audit history available.</p>;

  return (
    <ul className="space-y-2 mt-4">
      {logs.map((log) => (
        <li key={log.id} className="text-sm text-gray-700 dark:text-gray-300 border-l pl-4 border-gray-300">
          <p>
            <span className="font-mono text-xs text-gray-500">{new Date(log.time).toLocaleTimeString()}</span>{' '}
            <strong>{log.user}</strong> {log.action} <code>{log.field}</code>
          </p>
          {log.oldValue !== log.newValue && (
            <p className="ml-2 text-xs text-gray-600 dark:text-gray-400">
              {log.oldValue ? `"${log.oldValue}" → ` : ''}
              <strong>"{log.newValue}"</strong>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
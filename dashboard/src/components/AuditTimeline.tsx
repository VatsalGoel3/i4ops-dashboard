import { useAuditLogs } from '../api/queries';

interface Props {
  entity: 'Host' | 'VM';
  entityId: number;
}

export default function AuditTimeline({ entity, entityId }: Props) {
  const { data: logs = [], isLoading, error } = useAuditLogs(entity, entityId);

  if (isLoading) {
    return <p className="text-sm text-gray-500 italic">Loading audit history...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500 italic">Failed to load audit history.</p>;
  }

  if (!logs.length) {
    return <p className="text-sm text-gray-500 italic">No audit history available.</p>;
  }

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
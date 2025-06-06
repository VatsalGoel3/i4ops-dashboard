import type { Host } from '../api/types';

// ─── Simple capitalize helper ──────────────────────────────────────────────────
function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Props {
  hosts: Host[];
  sortField: keyof Host;
  sortOrder: 'asc' | 'desc';
  onSortChange: (field: keyof Host) => void;
  onRowClick: (host: Host) => void;
}

export default function HostTable({
  hosts,
  sortField,
  sortOrder,
  onSortChange,
  onRowClick,
}: Props) {
  const SortIcon = (field: keyof Host) =>
    sortField === field ? (sortOrder === 'asc' ? '▲' : '▼') : '';

  const dotColorSSH = (ssh: boolean) => (ssh ? 'bg-green-500' : 'bg-red-500');
  const dotColorStatus = (status: string) =>
    status === 'up' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-200 dark:bg-gray-700">
            <th
              className="text-left px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
              onClick={() => onSortChange('name')}
            >
              Hostname {SortIcon('name')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
              onClick={() => onSortChange('ip')}
            >
              IP {SortIcon('ip')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
              onClick={() => onSortChange('os')}
            >
              OS {SortIcon('os')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
              onClick={() => onSortChange('uptime')}
            >
              Uptime {SortIcon('uptime')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
              onClick={() => onSortChange('status')}
            >
              Status {SortIcon('status')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
              onClick={() => onSortChange('ssh')}
            >
              SSH {SortIcon('ssh')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
              onClick={() => onSortChange('pipelineStage')}
            >
              Stage {SortIcon('pipelineStage')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
              onClick={() => onSortChange('assignedTo')}
            >
              Assigned {SortIcon('assignedTo')}
            </th>
            <th
              className="text-right px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
              onClick={() => onSortChange('cpu')}
            >
              CPU% {SortIcon('cpu')}
            </th>
            <th
              className="text-right px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
              onClick={() => onSortChange('ram')}
            >
              RAM% {SortIcon('ram')}
            </th>
            <th
              className="text-right px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
              onClick={() => onSortChange('disk')}
            >
              Disk% {SortIcon('disk')}
            </th>
            <th
              className="text-right px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
              onClick={() => onSortChange('vms')}
            >
              VMs {SortIcon('vms')}
            </th>
          </tr>
        </thead>
        <tbody>
          {hosts.map((host, idx) => (
            <tr
              key={host.id}
              className={`border-b ${
                idx % 2 === 0
                  ? 'bg-white dark:bg-gray-800'
                  : 'bg-gray-50 dark:bg-gray-900'
              } hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer`}
              onClick={() => onRowClick(host)}
            >
              <td className="px-4 py-2 text-sm">{host.name}</td>
              <td className="px-4 py-2 text-sm">{host.ip}</td>
              <td className="px-4 py-2 text-sm">{host.os}</td>
              <td className="px-4 py-2 text-sm">
                {host.uptime
                  ? `${Math.floor(host.uptime / 86400)}d ${Math.floor(
                      (host.uptime % 86400) / 3600
                    )}h`
                  : 'N/A'}
              </td>
              <td className="px-4 py-2 text-sm flex items-center">
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-2 ${dotColorStatus(
                    host.status
                  )}`}
                />
                {capitalize(host.status)}
              </td>
              <td className="px-4 py-2 text-sm flex items-center">
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-2 ${dotColorSSH(
                    host.ssh
                  )}`}
                />
                {host.ssh ? 'Open' : 'Closed'}
              </td>
              <td className="px-4 py-2 text-sm">{capitalize(host.pipelineStage)}</td>
              <td className="px-4 py-2 text-sm">
                {host.assignedTo ? capitalize(host.assignedTo) : '-'}
              </td>
              <td className="text-right px-4 py-2 text-sm">{host.cpu}%</td>
              <td className="text-right px-4 py-2 text-sm">{host.ram}%</td>
              <td className="text-right px-4 py-2 text-sm">{host.disk}%</td>
              <td className="text-right px-4 py-2 text-sm">{host.vms.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
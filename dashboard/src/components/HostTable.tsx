import type { Host } from '../api/types';

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-200 dark:bg-gray-700">
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('name')}>
              Hostname {SortIcon('name')}
            </th>
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('ip')}>
              IP {SortIcon('ip')}
            </th>
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('os')}>
              OS {SortIcon('os')}
            </th>
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('uptime')}>
              Uptime {SortIcon('uptime')}
            </th>
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('status')}>
              Status {SortIcon('status')}
            </th>
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('assignedTo')}>
              Assigned {SortIcon('assignedTo')}
            </th>
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('pipelineStage')}>
              Stage {SortIcon('pipelineStage')}
            </th>
            <th className="text-right px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('vms')}>
              VMs {SortIcon('vms')}
            </th>
          </tr>
        </thead>
        <tbody>
          {hosts.map((host, idx) => (
            <tr
              key={host.id}
              onClick={() => onRowClick(host)}
              className={`border-b cursor-pointer ${
                idx % 2 === 0
                  ? 'bg-white dark:bg-gray-800'
                  : 'bg-gray-50 dark:bg-gray-900'
              } hover:bg-gray-100 dark:hover:bg-gray-700`}
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
                  className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    host.status === 'up' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                {capitalize(host.status)}
              </td>
              <td className="px-4 py-2 text-sm">
                {host.assignedTo ? capitalize(host.assignedTo) : '-'}
              </td>
              <td className="px-4 py-2 text-sm">
                <span className="inline-block rounded px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  {host.pipelineStage}
                </span>
              </td>
              <td className="text-right px-4 py-2 text-sm">
                {host.vms?.length ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
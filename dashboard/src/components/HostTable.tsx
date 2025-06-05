import { useState } from 'react';
import type { Host } from '../api/types';
import HostDetailModal from './HostDetailModal';

interface Props {
  hosts: Host[];
  sortField: keyof Host;
  sortOrder: 'asc' | 'desc';
  onSortChange: (field: keyof Host) => void;
}

export default function HostTable({ hosts, sortField, sortOrder, onSortChange }: Props) {
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);

  const SortIcon = (field: keyof Host) =>
    sortField === field ? (sortOrder === 'asc' ? '▲' : '▼') : '';

  const dotColorSSH = (ssh: boolean) => (ssh ? 'bg-green-500' : 'bg-red-500');
  const dotColorStatus = (status: string) =>
    status === 'up' ? 'bg-green-500' : 'bg-red-500';

  return (
    <>
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('name')}>
              Hostname {SortIcon('name')}
            </th>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('ip')}>
              IP {SortIcon('ip')}
            </th>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('os')}>
              OS {SortIcon('os')}
            </th>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('uptime')}>
              Uptime {SortIcon('uptime')}
            </th>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('status')}>
              Status {SortIcon('status')}
            </th>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('ssh')}>
              SSH {SortIcon('ssh')}
            </th>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('pipelineStage')}>
              Stage {SortIcon('pipelineStage')}
            </th>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('assignedTo')}>
              Assigned {SortIcon('assignedTo')}
            </th>
            <th className="text-right px-4 py-2 cursor-pointer" onClick={() => onSortChange('cpu')}>
              CPU% {SortIcon('cpu')}
            </th>
            <th className="text-right px-4 py-2 cursor-pointer" onClick={() => onSortChange('ram')}>
              RAM% {SortIcon('ram')}
            </th>
            <th className="text-right px-4 py-2 cursor-pointer" onClick={() => onSortChange('disk')}>
              Disk% {SortIcon('disk')}
            </th>
            <th className="text-right px-4 py-2 cursor-pointer" onClick={() => onSortChange('vms')}>
              VMs {SortIcon('vms')}
            </th>
          </tr>
        </thead>
        <tbody>
          {hosts.map(host => (
            <tr
              key={host.id}
              className="border-t hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => setSelectedHost(host)}
            >
              <td className="px-4 py-2">{host.name}</td>
              <td className="px-4 py-2">{host.ip}</td>
              <td className="px-4 py-2">{host.os}</td>
              <td className="px-4 py-2">
                {host.uptime ? `${Math.floor(host.uptime / 86400)}d ${Math.floor((host.uptime % 86400) / 3600)}h` : 'N/A'}
              </td>
              <td className="px-4 py-2 flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${dotColorStatus(host.status)}`} />
                {host.status.charAt(0).toUpperCase() + host.status.slice(1)}
              </td>
              <td className="px-4 py-2 flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${dotColorSSH(host.ssh)}`} />
                {host.ssh ? 'Open' : 'Closed'}
              </td>
              <td className="px-4 py-2">{host.pipelineStage}</td>
              <td className="px-4 py-2">{host.assignedTo || '-'}</td>
              <td className="text-right px-4 py-2">{host.cpu}%</td>
              <td className="text-right px-4 py-2">{host.ram}%</td>
              <td className="text-right px-4 py-2">{host.disk}%</td>
              <td className="text-right px-4 py-2">{host.vms.length}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedHost && (
        <HostDetailModal host={selectedHost} onClose={() => setSelectedHost(null)} />
      )}
    </>
  );
}
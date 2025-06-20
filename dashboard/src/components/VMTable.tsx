import { useState } from 'react';
import type { VM } from '../api/types';
import VMDetailModal from './VMDetailModal';

interface Props {
  vms: VM[];
  sortField: keyof VM;
  sortOrder: 'asc' | 'desc';
  onSortChange: (field: keyof VM) => void;
}

export default function VMTable({ vms, sortField, sortOrder, onSortChange }: Props) {
  const [selectedVM, setSelectedVM] = useState<VM | null>(null);

  const SortIcon = (field: keyof VM) =>
    sortField === field ? (sortOrder === 'asc' ? '▲' : '▼') : '';

  const formatUptime = (seconds?: number) => {
    if (!seconds || isNaN(seconds)) return 'N/A';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    return `${d}d ${h}h`;
  };

  const colorClass = (val?: number) => {
    if (val === undefined || val === null) return 'text-gray-400';
    if (val >= 90) return 'text-red-500 font-semibold';
    if (val >= 70) return 'text-yellow-500';
    return 'text-green-600';
  };

  return (
    <>
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('name')}>
              VM Name {SortIcon('name')}
            </th>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('machineId')}>
              Machine ID {SortIcon('machineId')}
            </th>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('hostId')}>
              Host {SortIcon('hostId')}
            </th>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('ip')}>
              IP {SortIcon('ip')}
            </th>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('status')}>
              Status {SortIcon('status')}
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
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('os')}>
              OS {SortIcon('os')}
            </th>
            <th className="text-left px-4 py-2 cursor-pointer" onClick={() => onSortChange('uptime')}>
              Uptime {SortIcon('uptime')}
            </th>
          </tr>
        </thead>
        <tbody>
          {vms.map(vm => (
            <tr
              key={vm.id}
              className="border-t hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => setSelectedVM(vm)}
            >
              <td className="px-4 py-2 font-medium">{vm.name}</td>
              <td className="px-4 py-2">
                <code className="bg-gray-100 px-1 rounded text-xs">
                  {vm.machineId.slice(0, 8)}...
                </code>
              </td>
              <td className="px-4 py-2">{vm.host?.name || '-'}</td>
              <td className="px-4 py-2">
                <code className="bg-gray-100 px-1 rounded text-xs">{vm.ip}</code>
              </td>
              <td className="px-4 py-2">
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${
                    vm.status === 'up'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {vm.status.toUpperCase()}
                </span>
              </td>
              <td className={`text-right px-4 py-2 ${colorClass(vm.cpu)}`}>
                {vm.cpu != null ? `${vm.cpu.toFixed(1)}%` : '—'}
              </td>
              <td className={`text-right px-4 py-2 ${colorClass(vm.ram)}`}>
                {vm.ram != null ? `${vm.ram.toFixed(1)}%` : '—'}
              </td>
              <td className={`text-right px-4 py-2 ${colorClass(vm.disk)}`}>
                {vm.disk != null ? `${vm.disk.toFixed(1)}%` : '—'}
              </td>
              <td className="px-4 py-2">{vm.os || '-'}</td>
              <td className="px-4 py-2">{formatUptime(vm.uptime)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedVM && (
        <VMDetailModal vm={selectedVM} onClose={() => setSelectedVM(null)} />
      )}
    </>
  );
}
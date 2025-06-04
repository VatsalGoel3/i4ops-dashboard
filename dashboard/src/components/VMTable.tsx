import { useState } from 'react';
import type { VM } from '../api/types';
import VMDetailModal from '../components/VMDetailModal';

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

  return (
    <>
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th
              className="text-left px-4 py-2 cursor-pointer"
              onClick={() => onSortChange('name')}
            >
              VM Name {SortIcon('name')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer"
              onClick={() => onSortChange('hostName')}
            >
              Host {SortIcon('hostName')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer"
              onClick={() => onSortChange('status')}
            >
              Status {SortIcon('status')}
            </th>
            <th
              className="text-right px-4 py-2 cursor-pointer"
              onClick={() => onSortChange('cpu')}
            >
              CPU% {SortIcon('cpu')}
            </th>
            <th
              className="text-right px-4 py-2 cursor-pointer"
              onClick={() => onSortChange('ram')}
            >
              RAM% {SortIcon('ram')}
            </th>
            <th
              className="text-right px-4 py-2 cursor-pointer"
              onClick={() => onSortChange('disk')}
            >
              Disk% {SortIcon('disk')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer"
              onClick={() => onSortChange('os')}
            >
              OS {SortIcon('os')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer"
              onClick={() => onSortChange('uptime')}
            >
              Uptime {SortIcon('uptime')}
            </th>
          </tr>
        </thead>
        <tbody>
          {vms.map(vm => (
            <tr
              key={`${vm.hostName}-${vm.name}`}
              className="border-t hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => setSelectedVM(vm)}
            >
              <td className="px-4 py-2">{vm.name}</td>
              <td className="px-4 py-2">{vm.hostName}</td>
              <td className="px-4 py-2">{vm.status.charAt(0).toUpperCase() + vm.status.slice(1)}</td>
              <td className="text-right px-4 py-2">{vm.cpu}%</td>
              <td className="text-right px-4 py-2">{vm.ram}%</td>
              <td className="text-right px-4 py-2">{vm.disk}%</td>
              <td className="px-4 py-2">{vm.os}</td>
              <td className="px-4 py-2">
                {vm.uptime ? `${Math.floor(vm.uptime / 86400)}d ${Math.floor((vm.uptime % 86400) / 3600)}h` : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedVM && (
        <VMDetailModal
          vm={selectedVM}
          onClose={() => setSelectedVM(null)}
        />
      )}
    </>
  );
}
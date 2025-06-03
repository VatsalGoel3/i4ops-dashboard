import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Device } from '../../api/useDevices';
import DeviceDetailModal from '../DeviceDetailModal';

interface Props {
  devices: Device[];
  sortField: keyof Device;
  sortOrder: 'asc' | 'desc';
  onSortChange: (field: keyof Device) => void;
}

export default function DeviceTable({
  devices,
  sortField,
  sortOrder,
  onSortChange,
}: Props) {
  const [selected, setSelected] = useState<Device | null>(null);

  const toTitleCase = (s: string) =>
    s.replace(/\b\w/g, c => c.toUpperCase());

  const dotColor = (status: string) => {
    if (status === 'up') return 'bg-green-500';
    if (status === 'down') return 'bg-red-500';
    return 'bg-gray-500';
  };

  const SortIcon = (field: keyof Device) =>
    sortField === field ? (sortOrder === 'asc' ? '▲' : '▼') : '';

  return (
    <>
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="text-center px-4 py-2">ID</th>
            <th
              className="text-left px-4 py-2 cursor-pointer"
              onClick={() => onSortChange('dev_name')}
            >
              Name {SortIcon('dev_name')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer"
              onClick={() => onSortChange('factory')}
            >
              Factory {SortIcon('factory')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer"
              onClick={() => onSortChange('dev_status')}
            >
              Status {SortIcon('dev_status')}
            </th>
            <th
              className="text-left px-4 py-2 cursor-pointer"
              onClick={() => onSortChange('dev_fw')}
            >
              Firmware {SortIcon('dev_fw')}
            </th>
            <th
              className="text-right px-4 py-2 cursor-pointer"
              onClick={() => onSortChange('last_seen')}
            >
              Last Seen {SortIcon('last_seen')}
            </th>
          </tr>
        </thead>
        <tbody>
          {devices.map(d => (
            <tr
              key={d.id}
              className="border-t hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => setSelected(d)}
            >
              <td className="text-center px-4 py-2">{d.id}</td>
              <td className="text-left px-4 py-2">{d.dev_name}</td>
              <td className="text-left px-4 py-2">{toTitleCase(d.factory)}</td>
              <td className="text-left px-4 py-2 flex items-center">
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-2 ${dotColor(d.dev_status)}`}
                />
                {toTitleCase(d.dev_status)}
              </td>
              <td className="text-left px-4 py-2">{d.dev_fw}</td>
              <td className="text-right px-4 py-2">
                <span title={new Date(d.last_seen).toLocaleString()}>
                  {formatDistanceToNow(new Date(d.last_seen), {
                    addSuffix: true,
                  })}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <DeviceDetailModal
          device={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
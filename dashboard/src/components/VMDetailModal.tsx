import { X } from 'lucide-react';
import type { VM } from '../api/types';

interface Props {
  vm: VM;
  onClose: () => void;
}

export default function VMDetailModal({ vm, onClose }: Props) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-lg max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">VM Details: {vm.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <span
            className={`inline-block px-2 py-1 text-xs rounded-full ${
              vm.status === 'running'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {vm.status.toUpperCase()}
          </span>
        </div>

        {/* ─── Basic Info ───────────────────────────── */}
        <ul className="space-y-2 text-sm mb-4">
          <li><strong>Machine ID:</strong> <code className="bg-gray-100 dark:bg-gray-600 px-1 rounded text-xs">{vm.machineId}</code></li>
          <li><strong>Host:</strong> {vm.host?.name || 'N/A'} {vm.host?.ip && <code className="bg-gray-100 dark:bg-gray-600 px-1 rounded text-xs">({vm.host.ip})</code>}</li>
          <li><strong>VM IP:</strong> <code className="bg-gray-100 dark:bg-gray-600 px-1 rounded">{vm.ip}</code></li>
          <li><strong>OS:</strong> {vm.os || 'N/A'}</li>
          <li><strong>Uptime:</strong> {formatUptime(vm.uptime)}</li>
        </ul>

        {/* ─── Performance Metrics ──────────────────────── */}
        <div className="mb-4 border-t pt-4">
          <h4 className="text-md font-medium mb-2">Performance</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
              <div className={`text-lg font-bold ${colorClass(vm.cpu)}`}>
                {vm.cpu != null ? `${vm.cpu.toFixed(1)}%` : '—'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">CPU Usage</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
              <div className={`text-lg font-bold ${colorClass(vm.ram)}`}>
                {vm.ram != null ? `${vm.ram.toFixed(1)}%` : '—'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">RAM Usage</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
              <div className={`text-lg font-bold ${colorClass(vm.disk)}`}>
                {vm.disk != null ? `${vm.disk.toFixed(1)}%` : '—'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Disk Usage</div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <strong>Note:</strong> VM provisioning details (assignedTo/notes) are managed at the host level. 
            Check the host detail modal for deployment status.
          </p>
        </div>
      </div>
    </div>
  );
}
import { X } from 'lucide-react';
import type { VM } from '../api/types';

interface Props {
  vm: VM | null;
  onClose: () => void;
}

export default function VMDetailModal({ vm, onClose }: Props) {
  if (!vm) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-lg max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">VM Details</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <ul className="space-y-2 text-sm mb-4">
          <li><strong>Name:</strong> {vm.name}</li>
          <li><strong>Host:</strong> {vm.hostName}</li>
          <li><strong>Status:</strong> {vm.status.charAt(0).toUpperCase() + vm.status.slice(1)}</li>
          <li><strong>OS:</strong> {vm.os}</li>
          <li><strong>Uptime:</strong> {vm.uptime ? `${Math.floor(vm.uptime / 86400)}d ${Math.floor((vm.uptime % 86400) / 3600)}h` : 'N/A'}</li>
          <li><strong>CPU Usage:</strong> {vm.cpu}%</li>
          <li><strong>RAM Usage:</strong> {vm.ram}%</li>
          <li><strong>Disk Usage:</strong> {vm.disk}%</li>
          <li><strong>IP Address:</strong> {vm.network?.ip || 'N/A'}</li>
          <li><strong>MAC Address:</strong> {vm.network?.mac || 'N/A'}</li>
        </ul>
        <div className="flex justify-around mb-2">
          <button
            onClick={() => alert(`Starting VM ${vm.name}...`)}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
          >
            Start
          </button>
          <button
            onClick={() => alert(`Stopping VM ${vm.name}...`)}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
          >
            Stop
          </button>
          <button
            onClick={() => alert(`Rebooting VM ${vm.name}...`)}
            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded"
          >
            Reboot
          </button>
          <button
            onClick={() => alert(`Opening SSH to VM ${vm.name}...`)}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
          >
            SSH
          </button>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">VM XML Definition:</h4>
          <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
{`<domain type='kvm'>
  <name>${vm.name}</name>
  <memory unit='KiB'>1048576</memory>
  <vcpu>1</vcpu>
  <os>
    <type arch='x86_64'>hvm</type>
  </os>
  <!-- ... additional XML omitted for brevity ... -->
</domain>`}
          </pre>
        </div>
      </div>
    </div>
  );
}
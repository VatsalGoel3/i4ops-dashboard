import { X } from 'lucide-react';
import type { Host } from '../api/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  host: Host | null;
  onClose: () => void;
}

export default function HostDetailModal({ host, onClose }: Props) {
  if (!host) return null;
  // Prepare data for per-VM CPU usage bar chart
  const cpuData = host.vms.map(vm => ({ name: vm.name, cpu: vm.cpu }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-lg max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Host Details</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <ul className="space-y-2 text-sm mb-4">
          <li><strong>Name:</strong> {host.name}</li>
          <li><strong>IP:</strong> {host.ip}</li>
          <li><strong>OS:</strong> {host.os}</li>
          <li><strong>Status:</strong> {host.status === 'up' ? 'Up' : 'Down'}</li>
          <li><strong>SSH:</strong> {host.ssh ? 'Open' : 'Closed'}</li>
          <li><strong>Uptime:</strong> {host.uptime ? `${Math.floor(host.uptime / 86400)}d ${Math.floor((host.uptime % 86400) / 3600)}h` : 'N/A'}</li>
          <li><strong>CPU Usage:</strong> {host.cpu}%</li>
          <li><strong>RAM Usage:</strong> {host.ram}%</li>
          <li><strong>Disk Usage:</strong> {host.disk}%</li>
          <li><strong>Total VMs:</strong> {host.vm_count}</li>
        </ul>
        {host.vms.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium mb-2">Per-VM CPU Usage:</h4>
            <div className="w-full h-48">
              <ResponsiveContainer>
                <BarChart data={cpuData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="cpu" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No VMs on this host.</p>
        )}
      </div>
    </div>
  );
}
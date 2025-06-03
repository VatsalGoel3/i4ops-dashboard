import { X } from 'lucide-react';
import type { Device } from '../api/useDevices';

interface Props {
  device: Device | null;
  onClose: () => void;
}

function getAssignedEngineer(device: Device): { name: string } {
  const hour = new Date().getHours();

  if (hour >= 8 && hour < 16) {
    return { name: device.first_service };
  } else if (hour >= 16 && hour <= 23) {
    return { name: device.second_service };
  } else {
    return { name: device.third_service };
  }
}

export default function DeviceDetailModal({ device, onClose }: Props) {
  if (!device) return null;

  const { name: engineer } = getAssignedEngineer(device);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Device Details</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <ul className="space-y-2 text-sm">
          <li><strong>ID:</strong> {device.id}</li>
          <li><strong>Name:</strong> {device.dev_name}</li>
          <li><strong>Factory:</strong> {device.factory}</li>
          <li><strong>Status:</strong> {device.dev_status}</li>
          <li><strong>Firmware:</strong> {device.dev_fw}</li>
          <li><strong>IP Address:</strong> {device.ip_address}</li>
          <li><strong>MAC Address:</strong> {device.mac_address}</li>
          <li><strong>Last Seen:</strong> {new Date(device.last_seen).toLocaleString()}</li>
          <li><strong>Assigned Engineer:</strong> {engineer} <span className="text-xs text-gray-500"></span></li>
        </ul>
      </div>
    </div>
  );
}
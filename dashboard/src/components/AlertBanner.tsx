import type { Device } from '../api/useDevices';

interface Props {
  devices: Device[];
  staleThresholdMinutes?: number;
}

export default function AlertBanner({
  devices,
  staleThresholdMinutes = 60,
}: Props) {
  const now = Date.now();
  const downCount = devices.filter(d => d.dev_status === 'down').length;
  const staleCount = devices.filter(d => {
    const last = new Date(d.last_seen).getTime();
    return (now - last) > staleThresholdMinutes * 60_000;
  }).length;

  if (downCount === 0 && staleCount === 0) return null;

  return (
    <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 rounded">
      {downCount > 0 && (
        <span className="block">
          🔴 <strong>{downCount}</strong> device(s) are down.
        </span>
      )}
      {staleCount > 0 && (
        <span className="block">
          ⏰ <strong>{staleCount}</strong> device(s) not seen in last {staleThresholdMinutes} min.
        </span>
      )}
    </div>
  );
}
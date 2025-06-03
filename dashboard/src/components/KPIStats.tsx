import type { Device } from '../api/useDevices';
interface EventRow {
  event: string;
}

interface Props {
  devices: Device[];
  events: EventRow[];
}

export default function KpiCards({ devices, events }: Props) {
  const total   = devices.length;
  const up      = devices.filter(d => d.dev_status === 'up').length;
  const upPct   = total ? Math.round((up / total) * 100) : 0;
  const openTix = events.filter(e => e.event !== 'new install').length;
  const fwVers  = new Set(devices.map(d => d.dev_fw)).size;

  const cards = [
    { label: 'Total Devices', value: total },
    { label: '% Up',          value: `${upPct}%` },
    { label: 'Open Tickets',  value: openTix },
    { label: 'Firmware Versions', value: fwVers },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map(c => (
        <div
          key={c.label}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center"
        >
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {c.value}
          </span>
          <span className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {c.label}
          </span>
        </div>
      ))}
    </section>
  );
}
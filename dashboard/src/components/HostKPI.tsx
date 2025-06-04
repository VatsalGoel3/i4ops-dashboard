import type { Host } from '../api/types';

interface Props {
  hosts: Host[];
}

export default function HostKPI({ hosts }: Props) {
  const totalHosts = hosts.length;
  const upCount = hosts.filter(h => h.status === 'up').length;
  const downCount = hosts.filter(h => h.status === 'down').length;
  const totalVMs = hosts.reduce((sum, h) => sum + h.vm_count, 0);
  const avgCpu = totalHosts ? Math.round(hosts.reduce((sum, h) => sum + h.cpu, 0) / totalHosts) : 0;

  const cards = [
    { label: 'Total Hosts', value: totalHosts },
    { label: 'Up', value: upCount },
    { label: 'Down', value: downCount },
    { label: 'Total VMs', value: totalVMs },
    { label: 'Avg CPU', value: `${avgCpu}%` },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {cards.map(card => (
        <div
          key={card.label}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center"
        >
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {card.value}
          </span>
          <span className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {card.label}
          </span>
        </div>
      ))}
    </section>
  );
}
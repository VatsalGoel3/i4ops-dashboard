import type { Host } from '../api/types';
import { PipelineStage } from '../api/types';

interface Props {
  hosts: Host[];
}

export default function CriticalKPIs({ hosts }: Props) {
  const criticalHosts = hosts.filter(h => h.status === 'down' || h.cpu > 90 || h.ram > 90 || h.disk > 90).length;
  const unassignedHosts = hosts.filter(h => h.pipelineStage === PipelineStage.unassigned).length;
  const brokenHosts = hosts.filter(h => h.pipelineStage === PipelineStage.broken).length;
  const downVMs = hosts.flatMap(h => h.vms).filter(vm => vm.status === 'offline').length;

  const cards = [
    { 
      label: 'Critical Issues', 
      value: criticalHosts + brokenHosts + downVMs,
      critical: (criticalHosts + brokenHosts + downVMs) > 0,
      subtitle: 'Needs immediate attention'
    },
    { 
      label: 'Unassigned', 
      value: unassignedHosts,
      critical: unassignedHosts > 0,
      subtitle: 'Idle capacity'
    },
    { 
      label: 'SSH Connectivity', 
      value: `${hosts.filter(h => h.ssh && h.status === 'up').length}/${hosts.filter(h => h.status === 'up').length}`,
      critical: hosts.filter(h => h.status === 'up' && !h.ssh).length > 0,
      subtitle: 'Accessible hosts'
    }
  ];

  return (
    <section className="grid grid-cols-3 gap-4 mb-6">
      {cards.map(card => (
        <div
          key={card.label}
          className={`
            bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col
            ${card.critical ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : ''}
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`
              text-2xl font-bold
              ${card.critical ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}
            `}>
              {card.value}
            </span>
            {card.critical && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </div>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {card.label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {card.subtitle}
          </span>
        </div>
      ))}
    </section>
  );
} 
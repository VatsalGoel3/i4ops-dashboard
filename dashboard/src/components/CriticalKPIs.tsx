import { useNavigate } from 'react-router-dom';
import type { Host } from '../api/types';
import { PipelineStage } from '../api/types';

interface Props {
  hosts: Host[];
}

export default function CriticalKPIs({ hosts }: Props) {
  const navigate = useNavigate();

  // Calculate different types of issues
  const downHosts = hosts.filter(h => h.status === 'down').length;
  const highResourceHosts = hosts.filter(h => h.status === 'up' && (h.cpu > 90 || h.ram > 90 || h.disk > 90)).length;
  const brokenHosts = hosts.filter(h => h.pipelineStage === PipelineStage.broken).length;
  const downVMs = hosts.flatMap(h => h.vms).filter(vm => vm.status === 'offline').length;
  
  const unassignedHosts = hosts.filter(h => h.pipelineStage === PipelineStage.unassigned).length;
  
  // SSH Access calculations
  const totalHosts = hosts.length;
  const sshAccessibleHosts = hosts.filter(h => h.ssh).length;
  const sshInaccessibleHosts = totalHosts - sshAccessibleHosts;

  // Smart navigation functions with context
  const navigateToHostsWithIssues = () => {
    const params = new URLSearchParams();
    
    // Determine the primary filter based on what issues exist
    if (downHosts > 0) {
      params.set('status', 'down');
      params.set('highlight', 'critical-issues');
    } else if (brokenHosts > 0) {
      params.set('pipelineStage', 'broken');
      params.set('highlight', 'critical-issues');
    } else if (highResourceHosts > 0) {
      params.set('highlight', 'high-resource');
    }
    
    navigate(`/hosts?${params.toString()}`);
  };

  const navigateToVMsWithIssues = () => {
    const params = new URLSearchParams();
    params.set('status', 'offline');
    params.set('highlight', 'offline-vms');
    navigate(`/vms?${params.toString()}`);
  };

  const navigateToUnassignedHosts = () => {
    const params = new URLSearchParams();
    params.set('pipelineStage', 'unassigned');
    params.set('highlight', 'unassigned');
    navigate(`/hosts?${params.toString()}`);
  };

  const navigateToSSHInaccessible = () => {
    const params = new URLSearchParams();
    params.set('ssh', 'false');
    params.set('highlight', 'ssh-inaccessible');
    navigate(`/hosts?${params.toString()}`);
  };

  // Build critical issues breakdown
  const criticalIssuesBreakdown = [];
  if (downHosts > 0) criticalIssuesBreakdown.push(`${downHosts} host${downHosts > 1 ? 's' : ''} down`);
  if (highResourceHosts > 0) criticalIssuesBreakdown.push(`${highResourceHosts} host${highResourceHosts > 1 ? 's' : ''} high resource`);
  if (brokenHosts > 0) criticalIssuesBreakdown.push(`${brokenHosts} broken pipeline${brokenHosts > 1 ? 's' : ''}`);
  if (downVMs > 0) criticalIssuesBreakdown.push(`${downVMs} VM${downVMs > 1 ? 's' : ''} offline`);

  const totalCriticalIssues = downHosts + highResourceHosts + brokenHosts + downVMs;

  // Smart navigation for critical issues
  const getCriticalIssuesNavigation = () => {
    const hasHostIssues = downHosts > 0 || highResourceHosts > 0 || brokenHosts > 0;
    const hasVMIssues = downVMs > 0;
    
    if (hasVMIssues && !hasHostIssues) {
      return {
        action: navigateToVMsWithIssues,
        hint: 'Click to view offline VMs →'
      };
    } else if (hasHostIssues && !hasVMIssues) {
      return {
        action: navigateToHostsWithIssues,
        hint: 'Click to view problem hosts →'
      };
    } else if (hasHostIssues && hasVMIssues) {
      return {
        action: navigateToHostsWithIssues,
        hint: 'Click to view critical hosts →'
      };
    }
    
    return { action: () => {}, hint: null };
  };

  const criticalIssuesNav = getCriticalIssuesNavigation();

  const cards = [
    { 
      label: 'Critical Issues', 
      value: totalCriticalIssues,
      critical: totalCriticalIssues > 0,
      subtitle: criticalIssuesBreakdown.length > 0 
        ? criticalIssuesBreakdown.join(', ') 
        : 'All systems operational',
      action: criticalIssuesNav.action,
      actionHint: criticalIssuesNav.hint
    },
    { 
      label: 'Unassigned', 
      value: unassignedHosts,
      critical: unassignedHosts > 0,
      subtitle: 'Idle capacity',
      action: navigateToUnassignedHosts,
      actionHint: unassignedHosts > 0 ? 'Click to view unassigned hosts →' : null
    },
    { 
      label: 'SSH Access', 
      value: `${sshAccessibleHosts}/${totalHosts}`,
      critical: sshInaccessibleHosts > 0,
      subtitle: sshInaccessibleHosts > 0 
        ? `${sshInaccessibleHosts} inaccessible`
        : 'All hosts accessible',
      action: navigateToSSHInaccessible,
      actionHint: sshInaccessibleHosts > 0 ? 'Click to view inaccessible hosts →' : null
    }
  ];

  return (
    <section className="grid grid-cols-3 gap-4 mb-6">
      {cards.map(card => (
        <div
          key={card.label}
          onClick={card.action}
          className={`
            bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col
            ${card.critical ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : ''}
            ${card.actionHint ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200' : ''}
          `}
          title={card.actionHint || undefined}
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
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {card.subtitle}
          </span>
          {card.actionHint && (
            <span className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium opacity-75">
              {card.actionHint}
            </span>
          )}
        </div>
      ))}
    </section>
  );
} 
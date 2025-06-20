import type { Host } from '../../api/types';
import { PipelineStage } from '../../api/types';

interface Props {
  hosts: Host[];
}

interface Issue {
  type: 'host_down' | 'vm_down' | 'high_resource' | 'broken_pipeline' | 'unassigned';
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  target: string;
  action?: string;
}

export default function ActionableInsights({ hosts }: Props) {
  const issues: Issue[] = [];

  // Critical: Hosts down
  hosts.filter(h => h.status === 'down').forEach(host => {
    issues.push({
      type: 'host_down',
      title: 'Host Down',
      description: `${host.name} (${host.vms.length} VMs affected)`,
      severity: 'critical',
      target: host.name,
      action: 'Check connectivity & restart'
    });
  });

  // Critical: VMs down
  const downVMs = hosts.flatMap(h => h.vms.filter(vm => vm.status === 'down'));
  downVMs.slice(0, 3).forEach(vm => {
    issues.push({
      type: 'vm_down',
      title: 'VM Down',
      description: `${vm.name} on ${vm.host?.name}`,
      severity: 'critical',
      target: vm.name,
      action: 'Restart VM'
    });
  });

  // High resource usage
  hosts.filter(h => h.cpu > 90 || h.ram > 90 || h.disk > 90).forEach(host => {
    const resources = [];
    if (host.cpu > 90) resources.push(`CPU ${host.cpu}%`);
    if (host.ram > 90) resources.push(`RAM ${host.ram}%`);
    if (host.disk > 90) resources.push(`Disk ${host.disk}%`);
    
    issues.push({
      type: 'high_resource',
      title: 'Resource Pressure',
      description: `${host.name}: ${resources.join(', ')}`,
      severity: 'warning',
      target: host.name,
      action: 'Scale or migrate VMs'
    });
  });

  // Broken pipeline
  hosts.filter(h => h.pipelineStage === PipelineStage.Broken).forEach(host => {
    issues.push({
      type: 'broken_pipeline',
      title: 'Pipeline Broken',
      description: `${host.name} failed deployment`,
      severity: 'critical',
      target: host.name,
      action: 'Debug & retry'
    });
  });

  // Unassigned capacity
  const unassignedCount = hosts.filter(h => h.pipelineStage === PipelineStage.Unassigned).length;
  if (unassignedCount > 0) {
    issues.push({
      type: 'unassigned',
      title: 'Idle Capacity',
      description: `${unassignedCount} hosts unassigned`,
      severity: 'info',
      target: 'Pipeline',
      action: 'Assign workloads'
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const getSeverityStyles = (severity: Issue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100';
      case 'info':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100';
    }
  };

  const getSeverityIcon = (severity: Issue['severity']) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
    }
  };

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        <span className="text-4xl mb-2">✅</span>
        <span className="text-sm font-medium">All systems healthy</span>
        <span className="text-xs">No issues requiring attention</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {issues.slice(0, 6).map((issue, index) => (
        <div
          key={index}
          className={`border-l-4 p-3 rounded-r-lg ${getSeverityStyles(issue.severity)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm">{getSeverityIcon(issue.severity)}</span>
                <span className="text-sm font-semibold">{issue.title}</span>
              </div>
              <p className="text-xs mb-1 break-words">{issue.description}</p>
              {issue.action && (
                <p className="text-xs opacity-75 italic">→ {issue.action}</p>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {issues.length > 6 && (
        <div className="text-center pt-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            +{issues.length - 6} more issues
          </span>
        </div>
      )}
    </div>
  );
} 
import type { Host } from '../api/types';
import { Clock, User, AlertTriangle } from 'lucide-react';

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

interface Props {
  hosts: Host[];
  sortField: keyof Host;
  sortOrder: 'asc' | 'desc';
  onSortChange: (field: keyof Host) => void;
  onRowClick: (host: Host) => void;
  getRowClassName?: (id: string | number, baseClassName?: string) => string;
}

export default function HostTable({
  hosts,
  sortField,
  sortOrder,
  onSortChange,
  onRowClick,
  getRowClassName,
}: Props) {
  const SortIcon = (field: keyof Host) =>
    sortField === field ? (sortOrder === 'asc' ? '▲' : '▼') : '';

  // Check if assignment is expired
  const isAssignmentExpired = (host: Host) => {
    if (!host.assignedUntil) return false;
    return new Date(host.assignedUntil) < new Date();
  };

  // Format assignment duration for display
  const formatAssignmentDuration = (until: string) => {
    const now = new Date();
    const untilDate = new Date(until);
    const diffMs = untilDate.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Expires soon';
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.ceil(diffHours / 24);
    return `${diffDays}d`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-200 dark:bg-gray-700">
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('name')}>
              Hostname {SortIcon('name')}
            </th>
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('ip')}>
              IP {SortIcon('ip')}
            </th>
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('os')}>
              OS {SortIcon('os')}
            </th>
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('uptime')}>
              Uptime {SortIcon('uptime')}
            </th>
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('status')}>
              Status {SortIcon('status')}
            </th>
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('assignedTo')}>
              Assignment {SortIcon('assignedTo')}
            </th>
            <th className="text-left px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('pipelineStage')}>
              Stage {SortIcon('pipelineStage')}
            </th>
            <th className="text-right px-4 py-2 text-sm cursor-pointer" onClick={() => onSortChange('vms')}>
              VMs {SortIcon('vms')}
            </th>
          </tr>
        </thead>
        <tbody>
          {hosts.map((host, idx) => {
            const baseClassName = `border-b cursor-pointer ${
              idx % 2 === 0
                ? 'bg-white dark:bg-gray-800'
                : 'bg-gray-50 dark:bg-gray-900'
            } hover:bg-gray-100 dark:hover:bg-gray-700`;
            
            const rowClassName = getRowClassName 
              ? getRowClassName(host.id, baseClassName)
              : baseClassName;
              
            return (
              <tr
                key={host.id}
                data-row-id={host.id}
                onClick={() => onRowClick(host)}
                className={rowClassName}
              >
              <td className="px-4 py-2 text-sm">{host.name}</td>
              <td className="px-4 py-2 text-sm">{host.ip}</td>
              <td className="px-4 py-2 text-sm">{host.os}</td>
              <td className="px-4 py-2 text-sm">
                {host.uptime
                  ? `${Math.floor(host.uptime / 86400)}d ${Math.floor(
                      (host.uptime % 86400) / 3600
                    )}h`
                  : 'N/A'}
              </td>
              <td className="px-4 py-2 text-sm flex items-center">
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    host.status === 'up' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                {capitalize(host.status)}
              </td>
              <td className="px-4 py-2 text-sm">
                {host.assignedTo ? (
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-gray-500" />
                    <span className="font-medium">{host.assignedTo}</span>
                    {host.assignedUntil && (
                      <div className="flex items-center gap-1">
                        {isAssignmentExpired(host) ? (
                          <AlertTriangle size={10} className="text-red-500" />
                        ) : (
                          <Clock size={10} className="text-blue-500" />
                        )}
                        <span className={`text-xs ${
                          isAssignmentExpired(host) 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {isAssignmentExpired(host) 
                            ? 'Expired' 
                            : formatAssignmentDuration(host.assignedUntil)
                          }
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-2 text-sm">
                <span className="inline-block rounded px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  {host.pipelineStage}
                </span>
              </td>
                              <td className="text-right px-4 py-2 text-sm">
                  {host.vms?.length ?? 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
import { useState } from 'react';
import { ShieldAlert, AlertTriangle, Info, Clock, CheckCircle, Filter, RefreshCw } from 'lucide-react';
import { 
  useSecurityEvents, 
  useSecurityEventStats, 
  useAcknowledgeSecurityEvent,
  useAcknowledgeMultipleSecurityEvents 
} from '../api/queries';
import { useVMs } from '../api/queries';
import type { SecuritySeverity, SecurityRule, SecurityEventFilters } from '../api/types';

const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
};

const SEVERITY_ICONS = {
  critical: ShieldAlert,
  high: AlertTriangle,
  medium: Info,
  low: Clock,
};

const RULE_LABELS = {
  egress: 'Data Exfiltration',
  brute_force: 'Brute Force',
  sudo: 'Privilege Escalation',
  oom_kill: 'Memory Exhaustion',
  other: 'Other',
};

export default function SecurityPage() {
  const [filters, setFilters] = useState<SecurityEventFilters>({});
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useSecurityEvents(filters);
  const { data: stats, isLoading: statsLoading } = useSecurityEventStats();
  const { data: vms = [] } = useVMs();
  
  const acknowledgeEvent = useAcknowledgeSecurityEvent();
  const acknowledgeMultiple = useAcknowledgeMultipleSecurityEvents();

  const handleEventSelect = (eventId: number, selected: boolean) => {
    setSelectedEvents(prev => 
      selected 
        ? [...prev, eventId]
        : prev.filter(id => id !== eventId)
    );
  };

  const handleSelectAll = () => {
    if (!events?.data) return;
    const allIds = events.data.filter(e => !e.ackAt).map(e => e.id);
    setSelectedEvents(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedEvents([]);
  };

  const handleAcknowledgeSelected = async () => {
    if (selectedEvents.length === 0) return;
    
    try {
      await acknowledgeMultiple.mutateAsync(selectedEvents);
      setSelectedEvents([]);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleAcknowledgeSingle = async (eventId: number) => {
    try {
      await acknowledgeEvent.mutateAsync(eventId);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getSeverityIcon = (severity: SecuritySeverity) => {
    const Icon = SEVERITY_ICONS[severity];
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Monitoring</h1>
          <p className="text-gray-600">Real-time security events and threat detection</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetchEvents()}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-sm text-gray-600">Critical</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
            <div className="text-sm text-gray-600">High</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
            <div className="text-sm text-gray-600">Medium</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-blue-600">{stats.low}</div>
            <div className="text-sm text-gray-600">Low</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-purple-600">{stats.unacknowledged}</div>
            <div className="text-sm text-gray-600">Unacknowledged</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={filters.severity || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value as SecuritySeverity || undefined }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Type</label>
              <select
                value={filters.rule || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, rule: e.target.value as SecurityRule || undefined }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="egress">Data Exfiltration</option>
                <option value="brute_force">Brute Force</option>
                <option value="sudo">Privilege Escalation</option>
                <option value="oom_kill">Memory Exhaustion</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VM</label>
              <select
                value={filters.vmId || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, vmId: e.target.value ? parseInt(e.target.value) : undefined }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All VMs</option>
                {vms.map(vm => (
                  <option key={vm.id} value={vm.id}>
                    {vm.machineId} ({vm.host?.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.acknowledged?.toString() || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  acknowledged: e.target.value === '' ? undefined : e.target.value === 'true'
                }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="false">Unacknowledged</option>
                <option value="true">Acknowledged</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="w-full px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedEvents.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              {selectedEvents.length} event(s) selected
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeselectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Deselect All
              </button>
              <button
                onClick={handleAcknowledgeSelected}
                disabled={acknowledgeMultiple.isPending}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {acknowledgeMultiple.isPending ? 'Acknowledging...' : 'Acknowledge Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events Timeline */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Security Events</h2>
            {events?.data && events.data.filter(e => !e.ackAt).length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All Unacknowledged
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {eventsLoading ? (
            <div className="p-8 text-center text-gray-500">Loading security events...</div>
          ) : !events?.data || events.data.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No security events found</div>
          ) : (
            events.data.map((event) => (
              <div
                key={event.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  event.ackAt ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {!event.ackAt && (
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.id)}
                      onChange={(e) => handleEventSelect(event.id, e.target.checked)}
                      className="mt-1"
                    />
                  )}
                  
                  <div className={`p-2 rounded-full ${SEVERITY_COLORS[event.severity]}`}>
                    {getSeverityIcon(event.severity)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${SEVERITY_COLORS[event.severity]}`}>
                        {event.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {RULE_LABELS[event.rule]}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">
                        {event.vm?.machineId || 'Unknown VM'} ({event.vm?.host?.name})
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">
                        {event.source}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-900 mb-2">{event.message}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(event.timestamp)}
                      </span>
                      
                      {event.ackAt ? (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          Acknowledged {formatTimestamp(event.ackAt)}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAcknowledgeSingle(event.id)}
                          disabled={acknowledgeEvent.isPending}
                          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          {acknowledgeEvent.isPending ? 'Acknowledging...' : 'Acknowledge'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 
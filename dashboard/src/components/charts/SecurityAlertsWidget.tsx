import { ShieldAlert, AlertTriangle, ExternalLink } from 'lucide-react';
import { useCriticalSecurityEvents } from '../../api/queries';

export default function SecurityAlertsWidget() {
  const { data: criticalEvents = [], isLoading, error } = useCriticalSecurityEvents(5);
  
  const unacknowledgedEvents = criticalEvents.filter(event => !event.ackAt);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  const getSeverityIcon = (severity: string) => {
    return severity === 'critical' ? ShieldAlert : AlertTriangle;
  };

  const getSeverityColor = (severity: string) => {
    return severity === 'critical' 
      ? 'text-red-600 bg-red-100' 
      : 'text-orange-600 bg-orange-100';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Security Alerts</h3>
        </div>
        <div className="text-center text-gray-500 py-8">
          Loading security alerts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Security Alerts</h3>
        </div>
        <div className="text-center text-red-500 py-8">
          Failed to load security alerts
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Security Alerts</h3>
        <a
          href="/security"
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          View All
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {unacknowledgedEvents.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-green-600 text-4xl mb-2">🛡️</div>
          <div className="text-green-700 font-medium">All Clear</div>
          <div className="text-sm text-gray-500 mt-1">No active security alerts</div>
        </div>
      ) : (
        <div className="space-y-3">
          {unacknowledgedEvents.map((event) => {
            const Icon = getSeverityIcon(event.severity);
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className={`p-1.5 rounded-full ${getSeverityColor(event.severity)}`}>
                  <Icon className="w-3 h-3" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                      event.severity === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {event.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-900 line-clamp-2 mb-1">
                    {event.message}
                  </p>
                  
                  <div className="text-xs text-gray-500">
                    VM: {event.vm?.machineId || 'Unknown'} • Source: {event.source}
                  </div>
                </div>
              </div>
            );
          })}
          
          {unacknowledgedEvents.length >= 5 && (
            <div className="text-center pt-2">
              <a
                href="/security"
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                View {criticalEvents.length - 5}+ more alerts →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
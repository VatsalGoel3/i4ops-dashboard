import { useState, useRef, useEffect } from 'react';
import { Bell, ShieldAlert, AlertTriangle, X, Wifi, WifiOff } from 'lucide-react';
import { useCriticalSecurityEvents, useAcknowledgeSecurityEvent } from '../api/queries';
import { useSecurityEventStream } from '../api/useSecurityEventStream';
import { SecuritySeverity } from '../api/types';
import type { SecurityEvent } from '../api/types';

export default function SecurityAlertBell() {
  const [showPopover, setShowPopover] = useState(false);
  const [hasNewEvents, setHasNewEvents] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  
  const { data: criticalEvents = [], isLoading, refetch } = useCriticalSecurityEvents();
  const acknowledgeEvent = useAcknowledgeSecurityEvent();
  
  // Real-time security event stream
  const {
    events: streamEvents,
    isConnected,
    hasError,
    reconnect
  } = useSecurityEventStream({
    filters: {
      severity: [SecuritySeverity.critical, SecuritySeverity.high]
    },
    onEvent: (event: SecurityEvent) => {
      setHasNewEvents(true);
      // Refresh the critical events list
      refetch();
      
      // Show browser notification for critical events
      if (event.severity === SecuritySeverity.critical && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Critical Security Alert', {
            body: `${event.rule} detected on ${event.vm?.name || 'Unknown VM'}`,
            icon: '/favicon.ico',
            tag: `security-${event.id}`
          });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    }
  });
  
  const unacknowledgedEvents = criticalEvents.filter(event => !event.ackAt);
  const hasUnacknowledged = unacknowledgedEvents.length > 0;

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAcknowledge = async (eventId: number) => {
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

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  const getSeverityIcon = (severity: string) => {
    return severity === 'critical' ? ShieldAlert : AlertTriangle;
  };

  const getSeverityColor = (severity: string) => {
    return severity === 'critical' ? 'text-red-600' : 'text-orange-600';
  };

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => {
          setShowPopover(!showPopover);
          setHasNewEvents(false);
        }}
        className={`relative p-2 rounded-lg transition-colors ${
          hasUnacknowledged 
            ? 'text-red-600 hover:bg-red-50' 
            : 'text-gray-600 hover:bg-gray-50'
        }`}
        title={hasUnacknowledged ? `${unacknowledgedEvents.length} security alerts` : 'No security alerts'}
      >
        <Bell className={`w-5 h-5 ${(hasUnacknowledged || hasNewEvents) ? 'animate-pulse' : ''}`} />
        
        {/* Connection status indicator */}
        <div className="absolute -bottom-1 -right-1">
          {hasError ? (
            <WifiOff className="w-3 h-3 text-red-500" />
          ) : isConnected ? (
            <Wifi className="w-3 h-3 text-green-500" />
          ) : (
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
          )}
        </div>
        
        {hasUnacknowledged && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {unacknowledgedEvents.length > 9 ? '9+' : unacknowledgedEvents.length}
          </span>
        )}
        
        {hasNewEvents && !hasUnacknowledged && (
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            •
          </span>
        )}
      </button>

      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
        >
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Security Alerts</h3>
              <div className="flex items-center gap-2">
                {/* Stream status indicator */}
                <div className="flex items-center gap-1">
                  {hasError ? (
                    <button
                      onClick={reconnect}
                      className="text-red-500 hover:text-red-700"
                      title="Reconnect to security stream"
                    >
                      <WifiOff className="w-3 h-3" />
                    </button>
                  ) : isConnected ? (
                    <Wifi className="w-3 h-3 text-green-500" />
                  ) : (
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                  )}
                </div>
                
                <button
                  onClick={() => setShowPopover(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Stream debug info for development */}
            {(hasError || !isConnected) && (
              <div className="mt-2 text-xs text-gray-500">
                Stream: {isConnected ? 'Connected' : hasError ? 'Error' : 'Connecting...'}
                {streamEvents.length > 0 && ` • ${streamEvents.length} recent events`}
              </div>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading alerts...
              </div>
            ) : unacknowledgedEvents.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                🎉 No active security alerts
              </div>
            ) : (
              unacknowledgedEvents.map((event) => {
                const Icon = getSeverityIcon(event.severity);
                return (
                  <div
                    key={event.id}
                    className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 mt-0.5 ${getSeverityColor(event.severity)}`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
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
                        
                        <p className="text-sm text-gray-900 mb-1 line-clamp-2">
                          {event.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {event.vm?.machineId || 'Unknown VM'}
                          </span>
                          
                          <button
                            onClick={() => handleAcknowledge(event.id)}
                            disabled={acknowledgeEvent.isPending}
                            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >
                            {acknowledgeEvent.isPending ? 'Ack...' : 'Acknowledge'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {unacknowledgedEvents.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowPopover(false);
                  window.location.hash = '/security';
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Security Events →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
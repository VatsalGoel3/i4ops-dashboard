import { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  RefreshCw, 
  Clock,
  Activity,
  TrendingUp
} from 'lucide-react';
import { useConnection } from '../context/ConnectionContext';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  showDetailed?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function ConnectionStatus({ showDetailed = false, size = 'medium' }: Props) {
  const { 
    state, 
    lastUpdated, 
    stats, 
    retryCount, 
    isRetrying, 
    error,
    triggerRetry,
    clearError 
  } = useConnection();
  
  const [showDetails, setShowDetails] = useState(false);

  const getStatusConfig = () => {
    switch (state) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          label: 'Connected',
          pulse: false,
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          label: 'Connecting...',
          pulse: true,
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          label: 'Disconnected',
          pulse: false,
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          label: 'Error',
          pulse: true,
        };
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getIconSize = () => {
    switch (size) {
      case 'small': return 14;
      case 'medium': return 16;
      case 'large': return 20;
      default: return 16;
    }
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    
    try {
      return formatDistanceToNow(lastUpdated, { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  if (size === 'small') {
    return (
      <div className="flex items-center gap-1">
        <Icon 
          size={getIconSize()} 
          className={`${config.color} ${config.pulse ? 'animate-spin' : ''}`} 
        />
        {showDetailed && (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {formatLastUpdated()}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
          ${config.bgColor} ${config.borderColor} ${config.color}
          hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
        `}
        title={`Connection Status: ${config.label}`}
      >
        <Icon 
          size={getIconSize()} 
          className={`${config.pulse ? 'animate-spin' : ''}`} 
        />
        <span className="text-sm font-medium">{config.label}</span>
        
        {lastUpdated && size !== 'small' && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatLastUpdated()}
          </span>
        )}
        
        {state === 'error' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerRetry();
            }}
            disabled={isRetrying}
            className="ml-1 p-1 rounded hover:bg-white/50 dark:hover:bg-gray-800/50"
            title="Retry connection"
          >
            <RefreshCw size={12} className={isRetrying ? 'animate-spin' : ''} />
          </button>
        )}
      </button>

      {/* Detailed Status Panel */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-4 z-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Connection Status
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            {/* Current Status */}
            <div className="flex items-center gap-2">
              <Icon size={16} className={config.color} />
              <span className="text-sm text-gray-900 dark:text-white">
                {config.label}
              </span>
              {state === 'connected' && (
                <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                  Live
                </span>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-300">
                {error}
                <button
                  onClick={clearError}
                  className="ml-2 underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Last Update</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatLastUpdated()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-gray-400" />
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Uptime</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {stats.uptime.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-gray-400" />
                <div>
                  <div className="text-gray-600 dark:text-gray-400">Updates</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {stats.successfulUpdates}/{stats.totalUpdates}
                  </div>
                </div>
              </div>

              {stats.averageLatency > 0 && (
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-gray-400" />
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Latency</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {Math.round(stats.averageLatency)}ms
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Retry Information */}
            {retryCount > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Retry attempts: {retryCount}
              </div>
            )}

            {/* Manual Retry Button */}
            {(state === 'disconnected' || state === 'error') && (
              <button
                onClick={triggerRetry}
                disabled={isRetrying}
                className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white text-sm rounded-lg flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} />
                {isRetrying ? 'Retrying...' : 'Retry Connection'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
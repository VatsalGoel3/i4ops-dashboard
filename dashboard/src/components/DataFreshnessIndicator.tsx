import { Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useConnection } from '../context/ConnectionContext';

interface Props {
  lastUpdated?: Date | string;
  className?: string;
  showIcon?: boolean;
}

export default function DataFreshnessIndicator({ 
  lastUpdated, 
  className = '',
  showIcon = true 
}: Props) {
  const { state, lastUpdated: globalLastUpdated } = useConnection();
  
  // Use provided timestamp or fallback to global connection timestamp
  const timestamp = lastUpdated ? new Date(lastUpdated) : globalLastUpdated;
  
  if (!timestamp) {
    return (
      <div className={`flex items-center gap-1 text-gray-400 dark:text-gray-500 ${className}`}>
        {showIcon && <Clock size={12} />}
        <span className="text-xs">No data</span>
      </div>
    );
  }

  const now = Date.now();
  const age = now - timestamp.getTime();
  const isStale = age > 2 * 60 * 1000; // 2 minutes

  const getColor = () => {
    if (state === 'disconnected' || state === 'error' || isStale) {
      return 'text-red-500 dark:text-red-400';
    }
    if (state === 'connecting') {
      return 'text-yellow-500 dark:text-yellow-400';
    }
    return 'text-green-500 dark:text-green-400';
  };

  const formatTimestamp = () => {
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div 
      className={`flex items-center gap-1 ${getColor()} ${className}`}
      title={`Last updated: ${timestamp.toLocaleString()}`}
    >
      {showIcon && (
        isStale ? (
          <AlertCircle size={12} className="animate-pulse" />
        ) : (
          <Clock size={12} />
        )
      )}
      <span className="text-xs">
        {formatTimestamp()}
      </span>
      {isStale && (
        <span className="text-xs px-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
          Stale
        </span>
      )}
    </div>
  );
} 
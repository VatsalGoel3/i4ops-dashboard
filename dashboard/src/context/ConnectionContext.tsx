import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

interface ConnectionStats {
  lastUpdated: Date | null;
  totalUpdates: number;
  successfulUpdates: number;
  failedUpdates: number;
  averageLatency: number;
  uptime: number; // percentage
}

interface ConnectionContextType {
  state: ConnectionState;
  lastUpdated: Date | null;
  stats: ConnectionStats;
  retryCount: number;
  isRetrying: boolean;
  error: string | null;
  
  // Actions
  setConnected: () => void;
  setDisconnected: (error?: string) => void;
  setConnecting: () => void;
  recordUpdate: (success: boolean, latency?: number) => void;
  triggerRetry: () => void;
  clearError: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConnectionState>('connecting');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [stats, setStats] = useState<ConnectionStats>({
    lastUpdated: null,
    totalUpdates: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    averageLatency: 0,
    uptime: 100,
  });

  // Check for stale data (no updates in 2 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated && Date.now() - lastUpdated.getTime() > 2 * 60 * 1000) {
        if (state === 'connected') {
          setState('error');
          setError('No updates received in 2 minutes');
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [lastUpdated, state]);

  // Calculate uptime percentage
  useEffect(() => {
    if (stats.totalUpdates > 0) {
      const uptime = (stats.successfulUpdates / stats.totalUpdates) * 100;
      setStats(prev => ({ ...prev, uptime }));
    }
  }, [stats.successfulUpdates, stats.totalUpdates]);

  const setConnected = useCallback(() => {
    setState('connected');
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  const setDisconnected = useCallback((error?: string) => {
    setState('disconnected');
    if (error) {
      setError(error);
    }
  }, []);

  const setConnecting = useCallback(() => {
    setState('connecting');
    setError(null);
  }, []);

  const recordUpdate = useCallback((success: boolean, latency?: number) => {
    const now = new Date();
    setLastUpdated(now);
    
    setStats(prev => {
      const newStats = {
        ...prev,
        lastUpdated: now,
        totalUpdates: prev.totalUpdates + 1,
        successfulUpdates: success ? prev.successfulUpdates + 1 : prev.successfulUpdates,
        failedUpdates: success ? prev.failedUpdates : prev.failedUpdates + 1,
      };

      // Calculate average latency
      if (latency && success) {
        const totalLatency = prev.averageLatency * prev.successfulUpdates + latency;
        newStats.averageLatency = totalLatency / newStats.successfulUpdates;
      }

      return newStats;
    });

    if (success) {
      setConnected();
    }
  }, [setConnected]);

  const triggerRetry = useCallback(() => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    setConnecting();
    
    // Simulate retry attempt
    setTimeout(() => {
      setIsRetrying(false);
    }, 1000);
  }, [setConnecting]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <ConnectionContext.Provider value={{
      state,
      lastUpdated,
      stats,
      retryCount,
      isRetrying,
      error,
      setConnected,
      setDisconnected,
      setConnecting,
      recordUpdate,
      triggerRetry,
      clearError,
    }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within ConnectionProvider');
  }
  return context;
} 
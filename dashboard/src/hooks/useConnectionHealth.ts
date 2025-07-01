import { useEffect, useCallback, useRef } from 'react';
import { useConnection } from '../context/ConnectionContext';
import { config as appConfig } from '../lib/config';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
};

export function useConnectionHealth(retryConfig: Partial<RetryConfig> = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  const { 
    state, 
    retryCount, 
    setConnecting, 
    setConnected, 
    setDisconnected,
    recordUpdate 
  } = useConnection();
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate exponential backoff delay
  const calculateDelay = useCallback((attempt: number): number => {
    const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt);
    return Math.min(delay, config.maxDelay);
  }, [config]);

  // Health check function
  const performHealthCheck = useCallback(async (): Promise<boolean> => {
    try {
      const startTime = Date.now();
      
      // Test connectivity to the API
              const response = await fetch(`${appConfig.api.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000, // 5 second timeout
      } as RequestInit);
      
      const latency = Date.now() - startTime;
      const success = response.ok;
      
      recordUpdate(success, latency);
      return success;
    } catch (error) {
      console.warn('Health check failed:', error);
      recordUpdate(false);
      return false;
    }
  }, [recordUpdate]);

  // Retry connection with exponential backoff
  const scheduleRetry = useCallback(() => {
    if (retryCount >= config.maxRetries) {
      console.error('Max retry attempts reached');
      setDisconnected('Max retry attempts reached. Please refresh the page.');
      return;
    }

    const delay = calculateDelay(retryCount);
    setConnecting();
    
    retryTimeoutRef.current = setTimeout(async () => {
      const isHealthy = await performHealthCheck();
      
      if (isHealthy) {
        setConnected();
      } else {
        // Will trigger another retry due to state change
        setDisconnected('Health check failed');
      }
    }, delay);
  }, [retryCount, config.maxRetries, calculateDelay, setConnecting, setConnected, setDisconnected, performHealthCheck]);

  // Auto-retry when disconnected or in error state
  useEffect(() => {
    if (state === 'disconnected' || state === 'error') {
      if (retryCount < config.maxRetries) {
        scheduleRetry();
      }
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [state, scheduleRetry, retryCount, config.maxRetries]);

  // Periodic health checks when connected
  useEffect(() => {
    if (state === 'connected') {
      healthCheckIntervalRef.current = setInterval(async () => {
        const isHealthy = await performHealthCheck();
        if (!isHealthy) {
          setDisconnected('Health check failed');
        }
      }, 30000); // Check every 30 seconds
    }

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    };
  }, [state, performHealthCheck, setDisconnected]);

  // Manual retry function
  const manualRetry = useCallback(async () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setConnecting();
    
    const isHealthy = await performHealthCheck();
    if (isHealthy) {
      setConnected();
    } else {
      setDisconnected('Manual retry failed');
    }
  }, [performHealthCheck, setConnecting, setConnected, setDisconnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, []);

  return {
    performHealthCheck,
    manualRetry,
    isRetrying: state === 'connecting',
    canRetry: retryCount < config.maxRetries,
    nextRetryIn: retryCount < config.maxRetries ? calculateDelay(retryCount) : null,
  };
} 
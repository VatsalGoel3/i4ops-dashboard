import { useState, useEffect, useRef, useCallback } from 'react';
import { SecuritySeverity, SecurityRule } from './types';
import type { SecurityEvent } from './types';
import { config } from '../lib/config';

interface SecurityEventStreamMessage {
  type: 'event' | 'heartbeat' | 'stats' | 'error' | 'connected';
  data: any;
  timestamp: number;
}

interface SecurityEventStreamFilters {
  severity?: SecuritySeverity[];
  rules?: SecurityRule[];
  vmIds?: number[];
}

interface SecurityEventStreamOptions {
  filters?: SecurityEventStreamFilters;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  onEvent?: (event: SecurityEvent) => void;
  onError?: (error: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useSecurityEventStream(options: SecurityEventStreamOptions = {}) {
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store the latest options in a ref to avoid recreating connect function
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const buildStreamUrl = useCallback(() => {
    const currentOptions = optionsRef.current;
    const params = new URLSearchParams();
    
    if (currentOptions.filters?.severity?.length) {
      params.append('severity', currentOptions.filters.severity.join(','));
    }
    
    if (currentOptions.filters?.rules?.length) {
      params.append('rules', currentOptions.filters.rules.join(','));
    }
    
    if (currentOptions.filters?.vmIds?.length) {
      params.append('vmIds', currentOptions.filters.vmIds.join(','));
    }

    const queryString = params.toString();
    return `${config.api.baseUrl}/security-events/stream${queryString ? `?${queryString}` : ''}`;
  }, []);

  const connect = useCallback(() => {
    const currentOptions = optionsRef.current;
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const url = buildStreamUrl();
      console.log('Connecting to security event stream:', url);
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('Security event stream connected');
        setConnectionState('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
        currentOptions.onConnected?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SecurityEventStreamMessage = JSON.parse(event.data);
          console.log('Received security stream message:', message.type);

          switch (message.type) {
            case 'connected':
              setConnectionState('connected');
              break;

            case 'event':
              const securityEvent = message.data as SecurityEvent;
              setEvents(prev => [securityEvent, ...prev.slice(0, 99)]); // Keep last 100 events
              currentOptions.onEvent?.(securityEvent);
              break;

            case 'heartbeat':
              setLastHeartbeat(message.timestamp);
              break;

            case 'stats':
              setStats(message.data);
              break;

            case 'error':
              const errorMsg = message.data?.error || 'Unknown stream error';
              setError(errorMsg);
              currentOptions.onError?.(errorMsg);
              break;
          }
        } catch (parseError) {
          console.warn('Failed to parse security stream message:', parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Security event stream error:', error);
        setConnectionState('error');
        setError('Connection error');
        
        const autoReconnect = currentOptions.autoReconnect ?? true;
        const maxReconnectAttempts = currentOptions.maxReconnectAttempts ?? 10;
        const reconnectDelay = currentOptions.reconnectDelay ?? 5000;
        
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          currentOptions.onDisconnected?.();
        }
      };

    } catch (error) {
      console.error('Failed to create security event stream:', error);
      setConnectionState('error');
      setError('Failed to create connection');
    }
  }, [buildStreamUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionState('disconnected');
    optionsRef.current.onDisconnected?.();
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  // Check heartbeat health
  useEffect(() => {
    if (!lastHeartbeat) return;

    const checkHeartbeat = () => {
      const now = Date.now();
      const timeSinceHeartbeat = now - lastHeartbeat;
      
      // If no heartbeat for 2 minutes, consider connection stale
      if (timeSinceHeartbeat > 120000 && connectionState === 'connected') {
        console.warn('No heartbeat received, connection may be stale');
        setError('Connection may be stale (no heartbeat)');
      }
    };

    const heartbeatInterval = setInterval(checkHeartbeat, 30000);
    return () => clearInterval(heartbeatInterval);
  }, [lastHeartbeat, connectionState]);

  return {
    connectionState,
    events,
    stats,
    error,
    lastHeartbeat,
    connect,
    disconnect,
    reconnect,
    clearEvents,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    hasError: connectionState === 'error' || !!error
  };
} 
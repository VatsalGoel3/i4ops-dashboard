import { useEffect, useState } from 'react';
import axios from 'axios';
import { config } from '../lib/config';

export interface AuditLog {
  id: number;
  entity: 'Host' | 'VM';
  entityId: number;
  action: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  user: string;
  time: string;
}

export function useAuditLogs(entity: 'Host' | 'VM', entityId: number) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get<{ data: AuditLog[] }>(`${config.api.baseUrl}/audit-logs?entity=${entity}&entityId=${entityId}`)
      .then((res) => setLogs(res.data.data))
      .catch((err) => console.error('Failed to load audit logs:', err))
      .finally(() => setLoading(false));
  }, [entity, entityId]);

  return { logs, loading };
}
import { useState } from 'react';
import {
  useSecurityEvents,
  useSecurityEventStats,
  useVMsWithSecurityEvents,
  type SecurityEvent,
  type SecurityEventFilters,
  SecurityEventType,
  SecurityEventSeverity
} from '../api/useSecurityEvents';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, Shield, Activity, Clock, Server } from 'lucide-react';

const severityColors: Record<SecurityEventSeverity, string> = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
};

const eventTypeIcons: Record<SecurityEventType, any> = {
  egress_attempt: Shield,
  file_access: Activity,
  authentication_failure: AlertTriangle,
  suspicious_behavior: AlertTriangle,
  kernel_alert: Server,
  system_alert: Server
};

const eventTypeLabels: Record<SecurityEventType, string> = {
  egress_attempt: 'Egress Attempt',
  file_access: 'File Access',
  authentication_failure: 'Auth Failure',
  suspicious_behavior: 'Suspicious',
  kernel_alert: 'Kernel Alert',
  system_alert: 'System Alert'
};

export default function SecurityEventsPage() {
  const [filters, setFilters] = useState<SecurityEventFilters>({
    limit: 50,
    offset: 0
  });

  const { data, loading, error } = useSecurityEvents(filters);
  const { stats, loading: statsLoading } = useSecurityEventStats();
  useVMsWithSecurityEvents(); // Only for possible future use

  const handleFilterChange = (key: keyof SecurityEventFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset pagination when filters change
    }));
  };

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({
      ...prev,
      offset: newOffset
    }));
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSeverityIcon = (severity: SecurityEventSeverity) => {
    switch (severity) {
      case SecurityEventSeverity.critical:
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case SecurityEventSeverity.high:
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case SecurityEventSeverity.medium:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case SecurityEventSeverity.low:
        return <Activity className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Events</h1>
          <p className="text-muted-foreground">
            Monitor security events across all VMs in real-time
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {!statsLoading && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.recent} in last 24h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.bySeverity.critical || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                High priority alerts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active VMs</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(stats.byVM).length}</div>
              <p className="text-xs text-muted-foreground">
                VMs with events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recent}</div>
              <p className="text-xs text-muted-foreground">
                Events in last 24h
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter security events by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">VM Name</label>
              <Input
                placeholder="Filter by VM name..."
                value={filters.vmName || ''}
                onChange={(e) => handleFilterChange('vmName', e.target.value || undefined)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Select
                value={filters.eventType || ''}
                onValueChange={(value) => handleFilterChange('eventType', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All event types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All event types</SelectItem>
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select
                value={filters.severity || ''}
                onValueChange={(value) => handleFilterChange('severity', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All severities</SelectItem>
                  <SelectItem value={SecurityEventSeverity.low}>Low</SelectItem>
                  <SelectItem value={SecurityEventSeverity.medium}>Medium</SelectItem>
                  <SelectItem value={SecurityEventSeverity.high}>High</SelectItem>
                  <SelectItem value={SecurityEventSeverity.critical}>Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Log Type</label>
              <Select
                value={filters.logType || ''}
                onValueChange={(value) => handleFilterChange('logType', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All log types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All log types</SelectItem>
                  <SelectItem value="auth.log">Auth Log</SelectItem>
                  <SelectItem value="kern.log">Kernel Log</SelectItem>
                  <SelectItem value="syslog">System Log</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
          <CardDescription>
            {data?.pagination.total || 0} events found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading security events...</div>
            </div>
          ) : data?.events.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No security events found</div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>VM</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Log Type</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.events.map((event) => {
                    const EventIcon = eventTypeIcons[event.eventType] || Activity;
                    return (
                      <TableRow key={event.id}>
                        <TableCell className="font-mono text-sm">
                          {formatTimestamp(event.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{event.vmName}</div>
                          <div className="text-sm text-muted-foreground">{event.hostName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <EventIcon className="w-4 h-4" />
                            <span>{eventTypeLabels[event.eventType]}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={severityColors[event.severity]}>
                            {getSeverityIcon(event.severity)}
                            <span className="ml-1 capitalize">{event.severity}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.logType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="text-sm">
                            <div className="font-medium truncate">
                              {event.parsedData?.action || 'Security Event'}
                            </div>
                            <div className="text-muted-foreground truncate">
                              {event.rawLine}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data?.pagination && data.pagination.total > data.pagination.limit && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {data.pagination.offset + 1} to{' '}
                    {Math.min(data.pagination.offset + data.pagination.limit, data.pagination.total)} of{' '}
                    {data.pagination.total} events
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.pagination.offset === 0}
                      onClick={() => handlePageChange(Math.max(0, data.pagination.offset - data.pagination.limit))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!data.pagination.hasMore}
                      onClick={() => handlePageChange(data.pagination.offset + data.pagination.limit)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
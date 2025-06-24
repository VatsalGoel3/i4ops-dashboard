import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  Activity, 
  Calendar, 
  MapPin, 
  Monitor, 
  Shield, 
  User as UserIcon,
  Settings,
  LogIn,
  LogOut,
  Eye,
  Clock,
  Filter,
  Download
} from 'lucide-react';

interface ActivityLogProps {
  user: User | null;
}

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  timestamp: Date;
  ipAddress: string;
  location: string;
  device: string;
  type: 'login' | 'logout' | 'profile' | 'security' | 'preferences' | 'system';
  details?: Record<string, any>;
}

export default function ActivityLog({ user }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading activity data
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        action: 'Profile Updated',
        description: 'Updated display name and bio',
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        ipAddress: '192.168.1.100',
        location: 'San Francisco, CA',
        device: 'Chrome on MacOS',
        type: 'profile',
        details: { fields: ['display_name', 'bio'] }
      },
      {
        id: '2',
        action: 'Password Changed',
        description: 'Account password was updated',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        ipAddress: '192.168.1.100',
        location: 'San Francisco, CA',
        device: 'Chrome on MacOS',
        type: 'security'
      },
      {
        id: '3',
        action: 'Signed In',
        description: 'Successful login from new location',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        ipAddress: '10.0.0.50',
        location: 'New York, NY',
        device: 'Edge on Windows',
        type: 'login'
      },
      {
        id: '4',
        action: 'Preferences Updated',
        description: 'Changed theme to dark mode and notification settings',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        ipAddress: '192.168.1.101',
        location: 'San Francisco, CA',
        device: 'Safari on iPhone',
        type: 'preferences',
        details: { theme: 'dark', notifications: true }
      },
      {
        id: '5',
        action: 'Avatar Uploaded',
        description: 'Profile picture was updated',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        ipAddress: '192.168.1.100',
        location: 'San Francisco, CA',
        device: 'Chrome on MacOS',
        type: 'profile'
      },
      {
        id: '6',
        action: 'Signed Out',
        description: 'Logged out from all devices',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        ipAddress: '192.168.1.100',
        location: 'San Francisco, CA',
        device: 'Chrome on MacOS',
        type: 'logout'
      },
      {
        id: '7',
        action: 'Account Created',
        description: 'New account was registered',
        timestamp: new Date(user?.created_at || Date.now() - 30 * 24 * 60 * 60 * 1000),
        ipAddress: '192.168.1.100',
        location: 'San Francisco, CA',
        device: 'Chrome on MacOS',
        type: 'system'
      },
    ];

    setTimeout(() => {
      setActivities(mockActivities);
      setLoading(false);
    }, 1000);
  }, [user]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'login':
        return <LogIn size={16} className="text-green-600" />;
      case 'logout':
        return <LogOut size={16} className="text-red-600" />;
      case 'profile':
        return <UserIcon size={16} className="text-blue-600" />;
      case 'security':
        return <Shield size={16} className="text-yellow-600" />;
      case 'preferences':
        return <Settings size={16} className="text-purple-600" />;
      case 'system':
        return <Monitor size={16} className="text-gray-600" />;
      default:
        return <Activity size={16} className="text-gray-600" />;
    }
  };

  const getRelativeTime = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return timestamp.toLocaleDateString();
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  const exportActivities = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Description', 'IP Address', 'Location', 'Device'].join(','),
      ...filteredActivities.map(activity => 
        [
          activity.timestamp.toISOString(),
          activity.action,
          activity.description,
          activity.ipAddress,
          activity.location,
          activity.device
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Activity size={20} className="text-gray-600 dark:text-gray-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity Log
            </h3>
          </div>
          <button
            onClick={exportActivities}
            className="px-4 py-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center"
          >
            <Download size={16} className="mr-2" />
            Export
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All Activity' },
            { value: 'login', label: 'Sign Ins' },
            { value: 'security', label: 'Security' },
            { value: 'profile', label: 'Profile' },
            { value: 'preferences', label: 'Preferences' },
            { value: 'system', label: 'System' },
          ].map((filterOption) => (
            <button
              key={filterOption.value}
              onClick={() => setFilter(filterOption.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === filterOption.value
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <Activity size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No activity found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'all' 
                ? 'No activity has been recorded yet.' 
                : `No ${filter} activity found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredActivities.map((activity, index) => (
              <div key={activity.id} className="relative">
                {/* Timeline line */}
                {index < filteredActivities.length - 1 && (
                  <div className="absolute left-5 top-12 w-0.5 h-6 bg-gray-200 dark:bg-gray-600"></div>
                )}
                
                <div className="flex space-x-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.action}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <Clock size={12} className="mr-1" />
                        {getRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {activity.description}
                    </p>

                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <MapPin size={12} className="mr-1" />
                        {activity.location}
                      </div>
                      <div className="flex items-center">
                        <Monitor size={12} className="mr-1" />
                        {activity.device}
                      </div>
                      <div className="flex items-center">
                        <Eye size={12} className="mr-1" />
                        {activity.ipAddress}
                      </div>
                    </div>

                    {/* Additional Details */}
                    {activity.details && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                        <strong>Details:</strong> {JSON.stringify(activity.details, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <LogIn size={20} className="text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Total Logins</p>
              <p className="text-2xl font-bold text-green-600">
                {activities.filter(a => a.type === 'login').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Shield size={20} className="text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Security Events</p>
              <p className="text-2xl font-bold text-yellow-600">
                {activities.filter(a => a.type === 'security').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Calendar size={20} className="text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Last Activity</p>
              <p className="text-sm font-medium text-blue-600">
                {activities.length > 0 ? getRelativeTime(activities[0].timestamp) : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
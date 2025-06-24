import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { 
  Activity, 
  Calendar, 
  MapPin, 
  Monitor, 
  User as UserIcon,
  LogIn,
  Clock,
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
  type: 'login' | 'system';
}

export default function ActivityLog({ user }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate minimal real activity data based on user info
    const realActivities: ActivityItem[] = [];

    if (user?.created_at) {
      realActivities.push({
        id: 'account_created',
        action: 'Account Created',
        description: 'User account was registered',
        timestamp: new Date(user.created_at),
        type: 'system'
      });
    }

    // Current session
    realActivities.unshift({
      id: 'current_session',
      action: 'Current Session',
      description: 'Active login session started',
      timestamp: new Date(), // Current time as approximate session start
      type: 'login'
    });

    setTimeout(() => {
      setActivities(realActivities);
      setLoading(false);
    }, 500);
  }, [user]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'login':
        return <LogIn size={16} className="text-green-600" />;
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

  const exportActivities = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Description'].join(','),
      ...activities.map(activity => 
        [
          activity.timestamp.toISOString(),
          activity.action,
          activity.description
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
            {[...Array(3)].map((_, i) => (
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
      {/* Header */}
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

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Activity tracking is basic in this version. More detailed logging will be added in future updates.
        </p>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No activity found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No activity has been recorded yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {activities.map((activity, index) => (
              <div key={activity.id} className="relative">
                {/* Timeline line */}
                {index < activities.length - 1 && (
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

                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {activity.timestamp.toLocaleString()}
                    </div>
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
              <p className="text-sm font-medium text-gray-900 dark:text-white">Total Sessions</p>
              <p className="text-2xl font-bold text-green-600">
                {activities.filter(a => a.type === 'login').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <UserIcon size={20} className="text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Account Age</p>
              <p className="text-sm font-medium text-blue-600">
                {user?.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0} days
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Calendar size={20} className="text-indigo-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Last Activity</p>
              <p className="text-sm font-medium text-indigo-600">
                {activities.length > 0 ? getRelativeTime(activities[0].timestamp) : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
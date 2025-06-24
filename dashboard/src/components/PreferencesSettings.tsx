import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { 
  Palette, 
  Monitor, 
  Bell, 
  Eye,
  Moon,
  Sun,
  Computer,
  Save,
  Loader
} from 'lucide-react';
import { toast } from 'sonner';
import { useUI } from '../context/UIContext';
import { supabase } from '../lib/supabaseClient';

interface PreferencesSettingsProps {
  user: User | null;
}

interface PreferencesData {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  pageSize: number;
  notifications: {
    email: boolean;
    desktop: boolean;
    hostDown: boolean;
    vmStatusChange: boolean;
    systemAlerts: boolean;
  };
  dashboard: {
    defaultView: 'grid' | 'table';
    showWelcomeMessage: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  accessibility: {
    reduceMotion: boolean;
    highContrast: boolean;
    largeText: boolean;
  };
}

export default function PreferencesSettings({ user }: PreferencesSettingsProps) {
  const { darkMode, toggleDarkMode, pageSize, setPageSize } = useUI();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<PreferencesData>({
    theme: darkMode ? 'dark' : 'light',
    language: user?.user_metadata?.language || 'en',
    timezone: user?.user_metadata?.timezone || 'UTC',
    pageSize: pageSize,
    notifications: {
      email: true,
      desktop: false,
      hostDown: true,
      vmStatusChange: true,
      systemAlerts: true,
    },
    dashboard: {
      defaultView: 'table',
      showWelcomeMessage: true,
      autoRefresh: true,
      refreshInterval: 30,
    },
    accessibility: {
      reduceMotion: false,
      highContrast: false,
      largeText: false,
    },
  });

  useEffect(() => {
    // Load saved preferences from user metadata
    if (user?.user_metadata?.preferences) {
      setPreferences(prev => ({
        ...prev,
        ...user.user_metadata.preferences,
      }));
    }
  }, [user]);

  const handleSavePreferences = async () => {
    setLoading(true);

    try {
      // Update user metadata with preferences
      const { error } = await supabase.auth.updateUser({
        data: {
          preferences: preferences,
          language: preferences.language,
          timezone: preferences.timezone,
        }
      });

      if (error) throw error;

      // Apply theme change immediately
      if (preferences.theme !== (darkMode ? 'dark' : 'light')) {
        if (preferences.theme === 'system') {
          // Apply system theme
          const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (systemDark !== darkMode) {
            toggleDarkMode();
          }
        } else {
          const shouldBeDark = preferences.theme === 'dark';
          if (shouldBeDark !== darkMode) {
            toggleDarkMode();
          }
        }
      }

      // Apply page size change
      if (preferences.pageSize !== pageSize) {
        setPageSize(preferences.pageSize);
      }

      toast.success('Preferences saved successfully!');
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast.error(error.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (section: keyof PreferencesData, key: string, value: any) => {
    setPreferences(prev => {
      const currentSection = prev[section];
      if (typeof currentSection === 'object' && currentSection !== null) {
        return {
          ...prev,
          [section]: {
            ...currentSection,
            [key]: value,
          }
        };
      }
      return prev;
    });
  };

  const handleDirectChange = (key: keyof PreferencesData, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const timezones = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
    { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'ja', label: 'Japanese' },
    { value: 'zh', label: 'Chinese' },
  ];

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Palette size={20} className="text-gray-600 dark:text-gray-400 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Appearance
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Theme
            </label>
            <div className="space-y-2">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Computer },
              ].map((theme) => {
                const Icon = theme.icon;
                return (
                  <label key={theme.value} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value={theme.value}
                      checked={preferences.theme === theme.value}
                      onChange={(e) => handleDirectChange('theme', e.target.value)}
                      className="mr-3 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Icon size={16} className="mr-2 text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{theme.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <select
              value={preferences.language}
              onChange={(e) => handleDirectChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timezone
            </label>
            <select
              value={preferences.timezone}
              onChange={(e) => handleDirectChange('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Page Size
            </label>
            <select
              value={preferences.pageSize}
              onChange={(e) => handleDirectChange('pageSize', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value={10}>10 items per page</option>
              <option value={25}>25 items per page</option>
              <option value={50}>50 items per page</option>
              <option value={100}>100 items per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Bell size={20} className="text-gray-600 dark:text-gray-400 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Email Notifications
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive email alerts for important events
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifications.email}
              onChange={(e) => handlePreferenceChange('notifications', 'email', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Desktop Notifications
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Show browser notifications for real-time updates
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifications.desktop}
              onChange={(e) => handlePreferenceChange('notifications', 'desktop', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Host Down Alerts
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Notify when hosts go offline
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifications.hostDown}
              onChange={(e) => handlePreferenceChange('notifications', 'hostDown', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                VM Status Changes
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Notify when VM status changes
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifications.vmStatusChange}
              onChange={(e) => handlePreferenceChange('notifications', 'vmStatusChange', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Dashboard */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Monitor size={20} className="text-gray-600 dark:text-gray-400 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dashboard
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Auto Refresh
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically refresh data
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.dashboard.autoRefresh}
              onChange={(e) => handlePreferenceChange('dashboard', 'autoRefresh', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>

          {preferences.dashboard.autoRefresh && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Refresh Interval
              </label>
              <select
                value={preferences.dashboard.refreshInterval}
                onChange={(e) => handlePreferenceChange('dashboard', 'refreshInterval', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Accessibility */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Eye size={20} className="text-gray-600 dark:text-gray-400 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Accessibility
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Reduce Motion
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Minimize animations and transitions
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.accessibility.reduceMotion}
              onChange={(e) => handlePreferenceChange('accessibility', 'reduceMotion', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                High Contrast
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Increase contrast for better visibility
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.accessibility.highContrast}
              onChange={(e) => handlePreferenceChange('accessibility', 'highContrast', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSavePreferences}
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <Loader size={16} className="animate-spin mr-2" />
          ) : (
            <Save size={16} className="mr-2" />
          )}
          Save Preferences
        </button>
      </div>
    </div>
  );
} 
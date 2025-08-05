import React, { useState } from 'react';
import { Users, Server, FolderOpen, Activity, Search, Filter, RefreshCw } from 'lucide-react';
import { useUserManagementStatistics, useEnvironments } from '../api/useUserManagement';
import UserManagementTable from '../components/UserManagement/UserManagementTable';
import ProjectsTable from '../components/UserManagement/ProjectsTable';
import EnvironmentOverview from '../components/UserManagement/EnvironmentOverview';
import UserManagementSearch from '../components/UserManagement/UserManagementSearch';
import DataFreshnessIndicator from '../components/DataFreshnessIndicator';

type TabType = 'overview' | 'users' | 'projects' | 'environments';

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showSearch, setShowSearch] = useState(false);

  const { data: statistics, isLoading: statsLoading, refetch: refetchStats } = useUserManagementStatistics();
  const { data: environments, isLoading: envsLoading } = useEnvironments();

  const tabs = [
    {
      id: 'overview' as TabType,
      name: 'Overview',
      icon: Activity,
      description: 'Dashboard overview and statistics',
    },
    {
      id: 'users' as TabType,
      name: 'Users',
      icon: Users,
      description: 'View and manage project users',
    },
    {
      id: 'projects' as TabType,
      name: 'Projects',
      icon: FolderOpen,
      description: 'View and manage projects',
    },
    {
      id: 'environments' as TabType,
      name: 'Environments',
      icon: Server,
      description: 'View environment details',
    },
  ];

  const handleRefresh = () => {
    refetchStats();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User & Machine Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Observe and monitor project users, environments, and access configurations
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <DataFreshnessIndicator 
            lastUpdated={new Date()} 
            className="text-sm"
          />
          
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={statsLoading}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search Panel */}
      {showSearch && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <UserManagementSearch />
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Server className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Environments</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {statistics.totals.environments}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FolderOpen className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Projects</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {statistics.totals.projects}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {statistics.totals.users}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {statistics.totals.activeUsers}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {statistics.totals.inactiveUsers} inactive, {statistics.totals.suspendedUsers} suspended
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {statistics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Environment Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Users per Environment
                  </h3>
                  <div className="space-y-3">
                    {statistics.usersPerEnvironment.map((env) => (
                      <div key={env.environment} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {env.displayName}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                            ({env.environment})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {env.userCount} users
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 block">
                            {env.projectCount} projects
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('users')}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Users className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">View All Users</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Browse and search project users
                          </p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('projects')}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <FolderOpen className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">View All Projects</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Browse project configurations
                          </p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('environments')}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Server className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">View Environments</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Check environment status and details
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && <UserManagementTable />}
        {activeTab === 'projects' && <ProjectsTable />}
        {activeTab === 'environments' && <EnvironmentOverview />}
      </div>
    </div>
  );
} 
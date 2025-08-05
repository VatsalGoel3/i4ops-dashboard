import React from 'react';
import { X, ExternalLink, Copy, Calendar, Mail, User, Server, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import type { ProjectUserWithRelations } from '../../api/types';

interface Props {
  user: ProjectUserWithRelations;
  onClose: () => void;
}

export default function UserDetailModal({ user, onClose }: Props) {
  const generateAccessUrls = () => {
    if (!user.vncDisplay) return null;
    
    const webPort = user.vncDisplay + 8443;
    const urls = [];
    
    if (user.environment.hostname) {
      urls.push({
        type: 'Tailscale (Hostname)',
        url: `https://${user.environment.hostname}:${webPort}/`,
      });
    }
    
    if (user.environment.ip) {
      urls.push({
        type: 'Tailscale (IP)',
        url: `https://${user.environment.ip}:${webPort}/`,
      });
    }
    
    return urls;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You might want to show a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 dark:text-green-400';
      case 'inactive':
        return 'text-gray-600 dark:text-gray-400';
      case 'suspended':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const accessUrls = generateAccessUrls();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {user.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              @{user.username} • {user.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <User className="h-5 w-5 mr-2" />
                User Information
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
                  <span className={`text-sm font-medium capitalize ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email:</span>
                  <a
                    href={`mailto:${user.email}`}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    {user.email}
                  </a>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Created:</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                  </span>
                </div>
                
                {user.homeDirectory && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Home Directory:</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {user.homeDirectory}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Server className="h-5 w-5 mr-2" />
                Environment
              </h3>
              
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Name:</span>
                  <span className="text-sm text-gray-900 dark:text-white font-medium">
                    {user.environment.displayName}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ID:</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {user.environment.name}
                  </span>
                </div>
                
                {user.environment.hostname && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Hostname:</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {user.environment.hostname}
                    </span>
                  </div>
                )}
                
                {user.environment.ip && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">IP Address:</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {user.environment.ip}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* VNC Access Information */}
          {accessUrls && accessUrls.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                VNC Access URLs
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {accessUrls.map((access, index) => (
                  <div
                    key={index}
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                          {access.type}
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-400 font-mono break-all">
                          {access.url}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(access.url)}
                          className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                          title="Copy URL"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        
                        <a
                          href={access.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {user.vncPort && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>VNC Port:</strong> {user.vncPort} | 
                  <strong> Display:</strong> :{user.vncDisplay} |
                  <strong> Web Port:</strong> {user.vncDisplay! + 8443}
                </div>
              )}
            </div>
          )}

          {/* Projects */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <FolderOpen className="h-5 w-5 mr-2" />
              Projects ({user.projects.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.projects.map((project) => (
                <div
                  key={project.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {project.displayName}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {project.name}
                    </span>
                  </div>
                  
                  {project.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {project.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Status: {project.status}</span>
                    {project.projectId && (
                      <span>ID: {project.projectId}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Status */}
          {user.serviceStatus && user.serviceStatus.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Service Status
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {user.serviceStatus.map((service) => (
                  <div
                    key={service.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {service.service}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        service.status === 'running' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {service.status}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Last check: {format(new Date(service.lastCheck), 'MMM dd, HH:mm')}
                    </div>
                    
                    {service.errorMsg && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {service.errorMsg}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 
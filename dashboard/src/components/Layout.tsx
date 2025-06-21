import { useState, type ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import ConnectionStatus from './ConnectionStatus';
import { Toaster } from 'sonner';
import { useConnection } from '../context/ConnectionContext';

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { state, error } = useConnection();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex-1 flex flex-col">
        <Header onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)} />

        {/* Global Connection Status Banner */}
        {(state === 'disconnected' || state === 'error') && (
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ConnectionStatus size="medium" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Connection Issue Detected
                  </p>
                  {error && (
                    <p className="text-xs text-red-600 dark:text-red-300">
                      {error}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400">
                Data may be stale. Attempting to reconnect...
              </p>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 space-y-6">
          {children}
        </main>
      </div>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
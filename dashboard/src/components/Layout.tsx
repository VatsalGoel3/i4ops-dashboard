import { useState, type ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useRealTimeContext } from '../context/RealTimeContext';

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { lastUpdated } = useRealTimeContext();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex-1 flex flex-col">
        <Header onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)} />
        
        {lastUpdated && (
          <div className="text-sm text-gray-600 dark:text-gray-400 px-6 py-1 text-right">
            Last updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        
        <main className="flex-1 p-6 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
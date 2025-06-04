import React from 'react';
import { NavLink } from 'react-router-dom';
import DarkModeToggle from './DarkModeToggle';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-2 my-1 rounded-r-lg transition-colors duration-200${
      isActive 
        ? ' bg-gray-100 dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 font-semibold border-l-4 border-indigo-500' 
        : ' text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white'
    }`;

  return (
    <div className="flex flex-col min-h-screen bg-brand-grad dark:bg-gray-900">
      {/* ─── Header ────────────────────────────────────────────── */}
      <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-800 shadow-md z-10">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Baremetal & VM Management
        </h1>
        <div className="flex items-center gap-4">
          {user && (
            <button
              onClick={signOut}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Logout
            </button>
          )}
          <DarkModeToggle />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar ──────────────────────────────────────────── */}
        <aside className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 overflow-y-auto">
          <nav className="mt-6 px-2">
            <NavLink to="/dashboard" className={linkClass} end>
              <span className="ml-1">Dashboard</span>
            </NavLink>
            <NavLink to="/hosts" className={linkClass}>
              <span className="ml-1">Hosts</span>
            </NavLink>
            <NavLink to="/vms" className={linkClass}>
              <span className="ml-1">VMs</span>
            </NavLink>
          </nav>
        </aside>

        {/* ─── Main Content ──────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
import { NavLink } from 'react-router-dom';
import { type ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
      isActive ? 'bg-gray-200 dark:bg-gray-700 font-semibold' : ''
    }`;

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white dark:bg-gray-900 shadow-md">
        <div className="p-4 font-bold text-lg">Infra Dashboard</div>
        <nav className="mt-6 px-2">
          <NavLink to="/dashboard" className={linkClass} end>
            Dashboard
          </NavLink>
          <NavLink to="/hosts" className={linkClass}>
            Hosts
          </NavLink>
          <NavLink to="/vms" className={linkClass}>
            VMs
          </NavLink>
        </nav>
      </aside>
      <main className="flex-1 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {children}
      </main>
    </div>
  );
}
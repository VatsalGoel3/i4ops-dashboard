import { NavLink, useNavigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import DarkModeToggle from './DarkModeToggle';
import { LogOut } from 'lucide-react';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // CSS for active/inactive sidebar links
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 ${
      isActive ? 'bg-gray-200 dark:bg-gray-700 font-semibold' : ''
    }`;

  return (
    // 1) Top‐level wrapper: sets up light/dark backgrounds and text colors
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* ── Sidebar ─────────────────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-gray-100 dark:bg-gray-800 shadow-md flex-shrink-0">
        <div className="p-4 font-bold text-lg border-b border-gray-200 dark:border-gray-700">
          Infra Dashboard
        </div>
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

      {/* ── Main Content Area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* ── Header ──────────────────────────────────────────────────────────────────── */}
        <header className="h-16 bg-gray-100 dark:bg-gray-800 shadow flex items-center px-6">
          <h1 className="text-xl font-semibold">Infra Dashboard</h1>
          <div className="ml-auto flex items-center space-x-4">
            {/* Dark‐mode toggle */}
            <DarkModeToggle />

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              <LogOut size={16} className="mr-1" />
              Logout
            </button>
          </div>
        </header>

        {/* ── Page Content ───────────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
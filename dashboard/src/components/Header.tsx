import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DarkModeToggle from './DarkModeToggle';

export default function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-20 h-16 px-6 bg-white dark:bg-gray-800 shadow flex items-center justify-between">
      {/* Left: Menu + Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="text-gray-500 hover:text-black dark:text-gray-300 dark:hover:text-white"
        >
          <Menu />
        </button>
        <input
          type="text"
          placeholder="Search..."
          className="bg-gray-100 dark:bg-gray-700 text-sm px-4 py-2 rounded-full focus:outline-none"
        />
      </div>

      {/* Right: Buttons */}
      <div className="flex items-center gap-4">
        <DarkModeToggle />
        <button className="text-gray-500 hover:text-black dark:text-gray-300">
          <Bell />
        </button>
        <span className="hidden md:inline text-sm text-gray-700 dark:text-gray-300">
          {'Vatsal Goel'}
        </span>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
import {
  Bell,
  Menu,
  LogOut,
  User,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useState } from 'react';

export default function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { signOut } = useAuth();
  const { darkMode, toggleDarkMode } = useUI();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications] = useState([]); // Placeholder

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-20 h-16 px-6 bg-white dark:bg-gray-800 shadow flex items-center justify-between">
      {/* Sidebar toggle + search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="text-gray-500 hover:text-black dark:text-gray-300 dark:hover:text-white"
        >
          <Menu />
        </button>
        <input
          type="text"
          placeholder="Search hosts, VMs..."
          className="bg-gray-100 dark:bg-gray-700 text-sm px-4 py-2 rounded-full focus:outline-none"
        />
      </div>

      {/* Dark mode, Notifications, Profile */}
      <div className="flex items-center gap-4 relative">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg focus:outline-none focus:ring bg-gray-200 dark:bg-gray-700"
        >
          {darkMode ? (
            <Sun size={20} className="text-yellow-400" />
          ) : (
            <Moon size={20} className="text-gray-600" />
          )}
        </button>

        <div className="flex items-center justify-center">
          <button
            className="relative text-gray-500 hover:text-black dark:text-gray-300 flex items-center"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full px-1">
                {notifications.length}
              </span>
            )}
          </button>
        </div>

        {/* Avatar */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 focus:outline-none"
          >
            <img
              src="https://picsum.photos/200/300"
              alt="User avatar"
              className="w-8 h-8 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
            />
            <span className="hidden md:inline text-sm text-gray-700 dark:text-gray-300">
              Vatsal Goel
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-700 shadow rounded-md z-30">
              <div className="px-4 py-2 text-gray-800 dark:text-gray-200 text-sm border-b dark:border-gray-600">
                Hello, <span className="font-semibold">Vatsal</span>
              </div>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm flex items-center gap-2">
                <User size={14} /> My Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm flex items-center gap-2 text-red-600"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
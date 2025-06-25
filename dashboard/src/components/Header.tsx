import {
  Menu,
  LogOut,
  User,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useState } from 'react';
import GlobalSearch from './GlobalSearch';
import ConnectionStatus from './ConnectionStatus';
import { 
  getUserDisplayName, 
  getUserFirstName, 
  getUserRole 
} from '../lib/userUtils';
import UserAvatar from './UserAvatar';
import SecurityAlertBell from './SecurityAlertBell';

export default function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { signOut, user } = useAuth();
  const { darkMode, toggleDarkMode } = useUI();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // User data with proper fallbacks
  const displayName = getUserDisplayName(user);
  const firstName = getUserFirstName(user);
  const userRole = getUserRole(user);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-20 h-16 px-6 bg-white dark:bg-gray-800 shadow flex items-center justify-between">
      {/* Sidebar toggle + search */}
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onToggleSidebar}
          className="text-gray-500 hover:text-black dark:text-gray-300 dark:hover:text-white"
        >
          <Menu />
        </button>
        <GlobalSearch />
      </div>

      {/* Connection Status, Dark mode, Notifications, Profile */}
      <div className="flex items-center gap-4 relative">
        <ConnectionStatus size="small" showDetailed />
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

        <SecurityAlertBell />

        {/* Avatar */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1 transition-colors"
            title={`${displayName} (${userRole})`}
          >
            <UserAvatar user={user} size="sm" />
            <span className="hidden md:inline text-sm text-gray-700 dark:text-gray-300 font-medium">
              {displayName}
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 shadow-lg rounded-lg border border-gray-200 dark:border-gray-600 z-30 overflow-hidden">
              <div className="px-4 py-3 text-gray-800 dark:text-gray-200 text-sm border-b dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <div className="font-semibold">Hello, {firstName}!</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {user?.email || 'No email'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Role: {userRole}
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowProfileMenu(false);
                  window.location.href = '/profile';
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm flex items-center gap-2 transition-colors"
                title="Manage your profile"
              >
                <User size={14} /> My Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm flex items-center gap-2 text-red-600 dark:text-red-400 transition-colors"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
import {
  LayoutDashboard,
  Server,
  Monitor,
  Settings,
  Terminal,
  Users
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import i4opsLogo from '../assets/brand.jpg';

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/hosts', label: 'Hosts', icon: Server },
    { to: '/vms', label: 'VMs', icon: Monitor },
    { to: '/users', label: 'User Management', icon: Users },
    { to: '/settings', label: 'Settings', icon: Settings }
  ];

  // Developer/Admin tools - will be conditionally shown with RBAC later
  const developerItems = [
    { to: '/developer', label: 'Developer Console', icon: Terminal }
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative group flex items-center transition-all duration-200 ease-in-out ${
      collapsed ? 'justify-center' : 'gap-4 px-4'
    } py-3 rounded-md mx-2 ${
      isActive
        ? 'bg-[#2E3D66] text-[#FDF6E3] font-semibold border-l-4 border-[#FDF6E3]'
        : 'text-gray-300 hover:bg-[#334269] hover:text-white'
    }`;

  // Special styling for developer tools
  const developerLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative group flex items-center transition-all duration-200 ease-in-out ${
      collapsed ? 'justify-center' : 'gap-4 px-4'
    } py-3 rounded-md mx-2 ${
      isActive
        ? 'bg-orange-600 text-white font-semibold border-l-4 border-orange-300'
        : 'text-gray-400 hover:bg-orange-700/20 hover:text-orange-300 border border-orange-600/30'
    }`;

  return (
    <aside
      className={`transition-all duration-300 bg-[#1D2D50] shadow-md border-r border-[#2E3D66] ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center ${
          collapsed ? 'justify-center' : 'justify-start'
        } p-4`}
      >
        <img
          src={i4opsLogo}
          alt="i4ops"
          className={`object-contain transition-all duration-300 ${
            collapsed ? 'w-10 h-10' : 'w-14 h-14'
          }`}
        />
        {!collapsed && (
          <span className="ml-3 font-bold text-lg tracking-tight text-[#FDF6E3]">
            i4ops
          </span>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="mt-4">
        {!collapsed && (
          <div className="px-5 text-xs text-gray-400 tracking-wider mb-2 uppercase">
            Infrastructure
          </div>
        )}

        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={linkClass}
            title={collapsed ? label : undefined}
          >
            <div className="relative flex items-center w-full">
              <Icon
                size={22}
                className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  collapsed ? 'mx-auto' : ''
                }`}
              />
              {!collapsed && <span className="truncate ml-4">{label}</span>}

              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <span className="absolute left-full ml-3 whitespace-nowrap text-sm bg-black text-white px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                  {label}
                </span>
              )}
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Developer Tools Section */}
      <div className="mt-8">
        {!collapsed && (
          <div className="px-5 text-xs text-orange-400 tracking-wider mb-2 uppercase">
            Developer Tools
          </div>
        )}

        {developerItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={developerLinkClass}
            title={collapsed ? label : undefined}
          >
            <div className="relative flex items-center w-full">
              <Icon
                size={22}
                className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  collapsed ? 'mx-auto' : ''
                }`}
              />
              {!collapsed && (
                <div className="flex flex-col ml-4">
                  <span className="truncate text-sm">{label}</span>
                  <span className="text-xs opacity-75">Debug & Diagnostics</span>
                </div>
              )}

              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <span className="absolute left-full ml-3 whitespace-nowrap text-sm bg-orange-800 text-orange-100 px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                  {label}
                </span>
              )}
            </div>
          </NavLink>
        ))}
      </div>

      {/* RBAC Note (visible only in development) */}
      {!collapsed && process.env.NODE_ENV === 'development' && (
        <div className="mt-4 mx-2 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-xs text-yellow-300">
          <div className="font-medium mb-1">🚧 Development Mode</div>
          <div>Developer tools visible. Will be RBAC-protected in production.</div>
        </div>
      )}
    </aside>
  );
}
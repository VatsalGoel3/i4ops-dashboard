import {
    LayoutDashboard,
    Server,
    Monitor,
    Settings
  } from 'lucide-react';
  import { NavLink } from 'react-router-dom';
  import i4opsLogo from '../assets/brand.jpg';
  
  export default function Sidebar({ collapsed }: { collapsed: boolean }) {
    const navItems = [
      { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { to: '/hosts', label: 'Hosts', icon: Server },
      { to: '/vms', label: 'VMs', icon: Monitor },
      { to: '/settings', label: 'Settings', icon: Settings }
    ];
  
    const linkClass = ({ isActive }: { isActive: boolean }) =>
      `flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${
        isActive
          ? 'bg-indigo-100 text-indigo-700 font-semibold'
          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`;
  
    return (
      <aside
        className={`transition-all duration-300 bg-white dark:bg-gray-800 shadow-md border-r border-gray-200 dark:border-gray-700 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-center p-4">
          <img
            src={i4opsLogo}
            alt="i4ops"
            className={`transition-all duration-300 object-contain ${
              collapsed ? 'w-8 h-8' : 'w-10 h-10'
            }`}
          />
          {!collapsed && (
            <span className="ml-3 font-bold text-lg tracking-tight text-gray-800 dark:text-white">
              i4ops
            </span>
          )}
        </div>
  
        {/* Nav */}
        <nav className="mt-4 space-y-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={linkClass}
              title={collapsed ? label : undefined} // show tooltip when collapsed
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
    );
  }  
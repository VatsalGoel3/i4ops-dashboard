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
      `relative group flex items-center transition-all ${
        collapsed ? 'justify-center' : 'gap-4 px-4'
      } py-3 ${
        isActive
          ? collapsed
            ? 'bg-[#2E3D66] text-[#FDF6E3] rounded-full p-2'
            : 'bg-[#2E3D66] text-[#FDF6E3] font-semibold rounded-r-xl pl-4 border-l-4 border-[#FDF6E3]'
          : 'text-[#D1D5DB] hover:bg-[#334269] hover:text-white px-4'
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
            className={`transition-all duration-300 object-contain ${
              collapsed ? 'w-10 h-10' : 'w-14 h-14'
            }`}
          />
          {!collapsed && (
            <span className="ml-3 font-bold text-lg tracking-tight text-[#FDF6E3]">
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
              title={collapsed ? label : undefined}
            >
              <div className="relative w-full flex items-center">
                <Icon
                  size={24}
                  className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    collapsed ? 'mx-auto' : ''
                  }`}
                />
                {!collapsed && <span className="truncate ml-4">{label}</span>}
  
                {/* Tooltip */}
                {collapsed && (
                  <span className="absolute left-full ml-2 whitespace-nowrap text-sm bg-black text-white px-2 py-1 rounded shadow-lg hidden group-hover:block z-50">
                    {label}
                  </span>
                )}
              </div>
            </NavLink>
          ))}
        </nav>
      </aside>
    );
  }  
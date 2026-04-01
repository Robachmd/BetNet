import React, { useState } from 'react';
import {
  FiHome, FiList, FiCalendar, FiMessageSquare, FiBarChart2,
  FiSettings, FiUsers, FiShield, FiChevronLeft, FiChevronRight,
  FiLogOut, FiStar, FiBell, FiPlusCircle,
} from 'react-icons/fi';

const landlordLinks = [
  { key: 'dashboard', label: 'Dashboard', icon: FiHome },
  { key: 'properties', label: 'My Properties', icon: FiList },
  { key: 'add-property', label: 'Add Property', icon: FiPlusCircle },
  { key: 'bookings', label: 'Bookings', icon: FiCalendar },
  { key: 'messages', label: 'Messages', icon: FiMessageSquare, badge: true },
  { key: 'reviews', label: 'Reviews', icon: FiStar },
  { key: 'analytics', label: 'Analytics', icon: FiBarChart2 },
  { key: 'notifications', label: 'Notifications', icon: FiBell },
  { key: 'settings', label: 'Settings', icon: FiSettings },
];

const adminLinks = [
  { key: 'admin-dashboard', label: 'Dashboard', icon: FiHome },
  { key: 'admin-users', label: 'Users', icon: FiUsers },
  { key: 'admin-properties', label: 'Properties', icon: FiList },
  { key: 'admin-bookings', label: 'Bookings', icon: FiCalendar },
  { key: 'admin-reviews', label: 'Reviews', icon: FiStar },
  { key: 'admin-reports', label: 'Reports', icon: FiBarChart2 },
  { key: 'admin-moderation', label: 'Moderation', icon: FiShield },
  { key: 'admin-settings', label: 'Settings', icon: FiSettings },
];

export default function Sidebar({
  role = 'landlord',
  activeKey = 'dashboard',
  user = null,
  unreadMessages = 0,
  onNavigate = () => {},
  onLogout = () => {},
}) {
  const [collapsed, setCollapsed] = useState(false);
  const links = role === 'admin' ? adminLinks : landlordLinks;

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen sticky top-0 bg-white border-r border-gray-100 transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-700 to-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-lg font-bold">
              <span className="text-green-800">Bet</span>
              <span className="text-green-600">Rent</span>
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = activeKey === link.key;
          const showBadge = link.badge && unreadMessages > 0;
          return (
            <button
              key={link.key}
              onClick={() => onNavigate(link.key)}
              title={collapsed ? link.label : undefined}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <link.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-green-600' : ''}`} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{link.label}</span>
                  {showBadge && (
                    <span className="min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-[11px] font-bold rounded-full px-1.5">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </>
              )}
              {collapsed && showBadge && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-semibold">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 capitalize">{role}</p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          title={collapsed ? 'Sign Out' : undefined}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <FiLogOut className="w-5 h-5" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}

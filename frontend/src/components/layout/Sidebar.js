import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiLogOut } from 'react-icons/fi';
import { userDisplayName } from '../../utils/helpers';
import { getGroupsForRole } from './dashboardNavGroups';

export default function Sidebar({
  role = 'property_owner',
  activeKey = 'dashboard',
  user = null,
  unreadMessages = 0,
  onNavigate = () => {},
  onLogout = () => {},
}) {
  const [collapsed, setCollapsed] = useState(false);
  const normalizedRole = role === 'landlord' ? 'property_owner' : role;
  const groups = getGroupsForRole(role);

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen sticky top-0 bg-white/95 backdrop-blur-sm border-r border-gray-100/90 transition-all duration-300 ease-smooth ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100/90">
        <Link
          to="/"
          className={`flex items-center gap-2 min-w-0 rounded-xl hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 ${collapsed ? 'justify-center' : ''}`}
          aria-label="BetNet home"
          title="Go to homepage"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-green-700 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-green-900/10">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          {!collapsed && (
            <span className="font-display text-lg font-bold truncate tracking-tight">
              <span className="text-green-800">Bet</span>
              <span className="text-green-600">Net</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {group.title}
              </p>
            )}
            {group.links.map((link) => {
              const isActive = activeKey === link.key;
              const showBadge = link.badge && unreadMessages > 0;
              return (
                <button
                  key={link.key}
                  type="button"
                  onClick={() => onNavigate(link.key)}
                  title={collapsed ? link.label : undefined}
                  className={`relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'bg-primary-50 text-primary-900 shadow-sm ring-1 ring-primary-100/80'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <link.icon
                    className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-700' : 'text-gray-500'}`}
                  />
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
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100/90">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl bg-gray-50/80">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center text-sm font-semibold ring-2 ring-white">
                {userDisplayName(user)[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{userDisplayName(user)}</p>
              <p className="text-xs text-gray-500 capitalize">{normalizedRole.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'Sign Out' : undefined}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 ${
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

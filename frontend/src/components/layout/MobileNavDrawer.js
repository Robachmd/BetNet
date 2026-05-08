import React, { useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiLogOut, FiX } from 'react-icons/fi';
import { userDisplayName } from '../../utils/helpers';
import { getGroupsForRole } from './dashboardNavGroups';

export default function MobileNavDrawer({
  open,
  onClose,
  role = 'property_owner',
  activeKey = 'dashboard',
  user = null,
  unreadMessages = 0,
  onNavigate = () => {},
  onLogout = () => {},
}) {
  const normalizedRole = role === 'landlord' ? 'property_owner' : role;
  const groups = getGroupsForRole(role);

  const handleNav = useCallback(
    (key) => {
      onNavigate(key);
      onClose();
    },
    [onNavigate, onClose],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Main menu">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] transition-opacity"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="absolute left-0 top-0 bottom-0 w-[min(20rem,88vw)] flex flex-col bg-white shadow-2xl ring-1 ring-gray-200/80 animate-slide-in-left">
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-2 min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-green-700 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-display text-lg font-bold truncate">
              <span className="text-green-800">Bet</span>
              <span className="text-green-600">Net</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Close menu"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {groups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {group.title}
              </p>
              {group.links.map((link) => {
                const isActive = activeKey === link.key;
                const showBadge = link.badge && unreadMessages > 0;
                return (
                  <button
                    key={link.key}
                    type="button"
                    onClick={() => handleNav(link.key)}
                    className={`relative flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 ${
                      isActive
                        ? 'bg-primary-50 text-primary-900 shadow-sm ring-1 ring-primary-100/70'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <link.icon
                      className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-700' : 'text-gray-500'}`}
                    />
                    <span className="flex-1 text-left">{link.label}</span>
                    {showBadge && (
                      <span className="min-w-[22px] h-5 flex items-center justify-center bg-red-500 text-white text-[11px] font-bold rounded-full px-1.5">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100 bg-gray-50/80">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 mb-3">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center text-sm font-semibold ring-2 ring-white shadow-sm">
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
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
          >
            <FiLogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

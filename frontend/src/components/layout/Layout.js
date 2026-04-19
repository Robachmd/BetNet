import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({
  children,
  user = null,
  notifications = [],
  unreadCount = 0,
  onSearch = () => {},
  onNotificationClick = () => {},
  onMarkAllRead = () => {},
  onLogin = () => {},
  onRegister = () => {},
  onLogout = () => {},
  onNavigate = () => {},
  hideNavbar = false,
  hideFooter = false,
  className = '',
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      {!hideNavbar && (
        <Navbar
          user={user}
          notifications={notifications}
          unreadCount={unreadCount}
          onSearch={onSearch}
          onNotificationClick={onNotificationClick}
          onMarkAllRead={onMarkAllRead}
          onLogin={onLogin}
          onRegister={onRegister}
          onLogout={onLogout}
          onNavigate={onNavigate}
        />
      )}
      <main className={`flex-1 ${className}`}>{children}</main>
      {!hideFooter && <Footer onNavigate={onNavigate} />}
    </div>
  );
}

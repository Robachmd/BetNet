import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { useAuth } from '../../hooks/useAuth';

function buildNavUser(user) {
  if (!user) return null;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
    || user.full_name
    || user.phone_number
    || user.email
    || 'User';
  return {
    name,
    email: user.email || '',
    avatar: user.avatar || user.profile_image || user.profileImage,
  };
}

export default function PublicLayout() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const handleNavigate = (target) => {
    if (typeof target === 'string' && target.startsWith('/')) {
      navigate(target);
      return;
    }
    const routes = {
      home: '/',
      search: '/search',
      halls: '/halls',
      profile: '/profile',
      settings: '/profile',
      login: '/login',
      register: '/register',
      dashboard: '/dashboard',
      favorites: '/favorites',
      messages: '/chat',
      notifications: '/chat',
    };
    if (routes[target]) navigate(routes[target]);
  };

  const handleSearch = (query) => {
    navigate(`/search?q=${encodeURIComponent(query || '')}`);
  };

  return (
    <Layout
      user={isAuthenticated ? buildNavUser(user) : null}
      notifications={[]}
      unreadCount={0}
      onSearch={handleSearch}
      onLogin={() => navigate('/login')}
      onRegister={() => navigate('/register')}
      onLogout={logout}
      onNavigate={handleNavigate}
    >
      <Outlet />
    </Layout>
  );
}

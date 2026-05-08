import {
  FiHome,
  FiList,
  FiCalendar,
  FiMessageSquare,
  FiBarChart2,
  FiSettings,
  FiUsers,
  FiShield,
  FiStar,
  FiBell,
  FiPlusCircle,
  FiLayers,
  FiSearch,
} from 'react-icons/fi';

export const renterGroups = [
  {
    title: 'Home',
    links: [{ key: 'dashboard', label: 'Dashboard', icon: FiHome }],
  },
  {
    title: 'Discover',
    links: [
      { key: 'search', label: 'Search', icon: FiSearch },
      { key: 'favorites', label: 'Favorites', icon: FiStar },
      { key: 'messages', label: 'Messages', icon: FiMessageSquare, badge: true },
    ],
  },
  {
    title: 'Account',
    links: [{ key: 'profile', label: 'Profile', icon: FiSettings }],
  },
];

export const propertyOwnerGroups = [
  {
    title: 'Home',
    links: [{ key: 'dashboard', label: 'Dashboard', icon: FiHome }],
  },
  {
    title: 'Properties and packages',
    links: [
      { key: 'properties', label: 'My Properties', icon: FiList },
      { key: 'add-property', label: 'Add Property', icon: FiPlusCircle },
      { key: 'listing-packages', label: 'Listing Packages', icon: FiLayers },
      { key: 'bookings', label: 'Bookings', icon: FiCalendar },
    ],
  },
  {
    title: 'Communication and insights',
    links: [
      { key: 'messages', label: 'Messages', icon: FiMessageSquare, badge: true },
      { key: 'reviews', label: 'Reviews', icon: FiStar },
      { key: 'analytics', label: 'Analytics', icon: FiBarChart2 },
      { key: 'notifications', label: 'Notifications', icon: FiBell },
      { key: 'settings', label: 'Settings', icon: FiSettings },
    ],
  },
];

export const adminGroups = [
  {
    title: 'Admin',
    links: [
      { key: 'admin-dashboard', label: 'Dashboard', icon: FiHome },
      { key: 'admin-users', label: 'Users', icon: FiUsers },
      { key: 'admin-properties', label: 'Properties', icon: FiList },
      { key: 'admin-bookings', label: 'Bookings', icon: FiCalendar },
      { key: 'admin-reviews', label: 'Reviews', icon: FiStar },
      { key: 'admin-reports', label: 'Reports', icon: FiBarChart2 },
      { key: 'admin-moderation', label: 'Moderation', icon: FiShield },
      { key: 'admin-settings', label: 'Settings', icon: FiSettings },
    ],
  },
];

export function getGroupsForRole(role) {
  const normalizedRole = role === 'landlord' ? 'property_owner' : role;
  if (normalizedRole === 'admin') return adminGroups;
  if (normalizedRole === 'renter') return renterGroups;
  return propertyOwnerGroups;
}

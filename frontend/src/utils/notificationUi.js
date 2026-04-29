import { FiBell, FiMapPin, FiPackage } from 'react-icons/fi';

const PACKAGE_TYPES = new Set([
  'LISTING_PACKAGE_LOW',
  'LISTING_PACKAGE_DEPLETED',
  'LISTING_PACKAGE_EXPIRING',
]);

/** API uses `is_read`; some clients may use `read`. */
export function isNotificationRead(n) {
  if (!n) return true;
  if (typeof n.is_read === 'boolean') return n.is_read;
  if (typeof n.read === 'boolean') return n.read;
  return true;
}

export function notificationTimestamp(n) {
  if (!n) return null;
  return n.created_at || n.createdAt || null;
}

/**
 * Icon + subtle styling for area alerts vs listing-credit messages vs default.
 * `shortLabel` is used as a small chip in compact lists.
 */
export function getNotificationVisualMeta(n) {
  const t = n?.notification_type || n?.type;
  if (t === 'NEW_LISTING') {
    return {
      Icon: FiMapPin,
      shortLabel: 'Area alert',
      iconWrapClass: 'bg-blue-100 text-blue-600',
    };
  }
  if (PACKAGE_TYPES.has(t)) {
    return {
      Icon: FiPackage,
      shortLabel: 'Listing package',
      iconWrapClass: 'bg-amber-100 text-amber-800',
    };
  }
  return {
    Icon: FiBell,
    shortLabel: null,
    iconWrapClass: 'bg-gray-100 text-gray-500',
  };
}

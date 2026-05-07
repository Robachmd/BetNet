const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

export const API_BASE_URL = stripTrailingSlash(
  process.env.REACT_APP_API_URL || DEFAULT_API_BASE_URL
);

function computeApiOrigin(apiBaseUrl) {
  const stripped = String(apiBaseUrl || '').trim();
  if (!stripped) return '';
  if (/^https?:\/\//i.test(stripped)) {
    return stripTrailingSlash(stripped.replace(/\/?api\/?$/i, ''));
  }
  // Path-only base (e.g. /api): resolve against the page origin in the browser
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export const API_ORIGIN = computeApiOrigin(API_BASE_URL);

const wsDefaultFromApiOrigin = API_ORIGIN.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');

export const WS_BASE_URL = stripTrailingSlash(
  process.env.REACT_APP_WS_URL || wsDefaultFromApiOrigin
);

export const UPLOADS_BASE_URL = stripTrailingSlash(
  process.env.REACT_APP_UPLOADS_URL || API_ORIGIN
);

export const CHAPA_PUBLIC_KEY = String(process.env.REACT_APP_CHAPA_PUBLIC_KEY || '').trim();

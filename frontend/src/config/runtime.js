const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

export const API_BASE_URL = stripTrailingSlash(
  process.env.REACT_APP_API_URL || DEFAULT_API_BASE_URL
);

export const API_ORIGIN = stripTrailingSlash(
  API_BASE_URL.replace(/\/?api\/?$/i, '')
);

const wsDefaultFromApiOrigin = API_ORIGIN.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');

export const WS_BASE_URL = stripTrailingSlash(
  process.env.REACT_APP_WS_URL || wsDefaultFromApiOrigin
);

export const UPLOADS_BASE_URL = stripTrailingSlash(
  process.env.REACT_APP_UPLOADS_URL || API_ORIGIN
);

export const CHAPA_PUBLIC_KEY = String(process.env.REACT_APP_CHAPA_PUBLIC_KEY || '').trim();

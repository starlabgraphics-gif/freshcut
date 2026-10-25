import { clsxLite } from './tiny';
export const cn = clsxLite;

const API = '/api';

export function getToken() {
  return localStorage.getItem('fc_token') || '';
}

async function request(path, { method = 'GET', body, token = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401 && token) {
      localStorage.removeItem('fc_token');
      localStorage.removeItem('fc_user');
      if (!location.pathname.startsWith('/auth')) location.assign('/auth');
    }
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

// Parse SQLite 'YYYY-MM-DD HH:MM:SS' (UTC) safely
export function parseTs(ts) {
  if (!ts) return null;
  return new Date(String(ts).replace(' ', 'T') + (String(ts).endsWith('Z') ? '' : 'Z'));
}

export function timeAgo(ts) {
  const d = parseTs(ts);
  if (!d) return '—';
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 1.5) return '1 min ago';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  const days = Math.round(h / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function formatDateTime(ts) {
  const d = parseTs(ts);
  if (!d) return '—';
  return d.toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function minutesLabel(mins) {
  if (mins == null) return '—';
  if (mins <= 0) return 'now';
  if (mins < 60) return `~${mins} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m ? `~${h} hr ${m} min` : `~${h} hr`;
}

export function kmLabel(km) {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export const KES = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;

export const AVATAR_COLORS = ['#F0A93F', '#E14B5A', '#3B82F6', '#2FCE70', '#A78BFA', '#22D3EE', '#F472B6'];
export function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
export function initials(name = '') {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

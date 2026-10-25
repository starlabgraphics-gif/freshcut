import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, getToken } from './util';

// ---------------------------------------------------------------- auth
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fc_user')); } catch { return null; }
  });
  const [booting, setBooting] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api.get('/auth/me')
      .then((d) => { setUser(d.user); localStorage.setItem('fc_user', JSON.stringify(d.user)); })
      .catch(() => {})
      .finally(() => setBooting(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api.post('/auth/login', { email, password });
    localStorage.setItem('fc_token', d.token);
    localStorage.setItem('fc_user', JSON.stringify(d.user));
    setUser(d.user);
    return d.user;
  }, []);

  const register = useCallback(async (payload) => {
    const d = await api.post('/auth/register', payload);
    localStorage.setItem('fc_token', d.token);
    localStorage.setItem('fc_user', JSON.stringify(d.user));
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fc_token');
    localStorage.removeItem('fc_user');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, setUser, login, register, logout, booting }), [user, login, register, logout, booting]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);

// ---------------------------------------------------------------- toasts
const ToastCtx = createContext(null);
let toastSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((message, type = 'info', ms = 4200) => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, message: String(message), type }]);
    setTimeout(() => dismiss(id), ms);
  }, [dismiss]);
  const toastRich = useCallback((title, body, type = 'info', ms = 6500) => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, title: String(title), body: body ? String(body) : '', type }]);
    setTimeout(() => dismiss(id), ms);
  }, [dismiss]);
  const value = useMemo(() => ({ toast, toastRich }), [toast, toastRich]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id}
            className={`card animate-fadeUp flex items-start gap-3 px-4 py-3 text-sm border-l-4 ${
              t.type === 'error' ? 'border-l-pole-red' : t.type === 'success' ? 'border-l-mint-500' : 'border-l-gold-500'
            }`}>
            <div className="flex-1 leading-snug">
              {t.title ? <div className="font-display font-semibold text-cream mb-0.5">{t.title}</div> : null}
              {t.title ? <div className="text-muted">{t.body}</div> : t.message}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-muted hover:text-cream transition text-lg leading-none">×</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ---------------------------------------------------------------- live (SSE + notifications)
const LiveCtx = createContext(null);

export function LiveProvider({ children }) {
  const { user } = useAuth();
  const { toastRich } = useToast();
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState(null);
  const [unread, setUnread] = useState(0);
  const listeners = useRef(new Map()); // event -> Set<fn>

  const refreshNotifications = useCallback(async () => {
    try {
      const d = await api.get('/notifications');
      setNotifications(d.notifications);
      setUnread(d.unread);
    } catch { /* ignore */ }
  }, []);

  const on = useCallback((event, fn) => {
    if (!listeners.current.has(event)) listeners.current.set(event, new Set());
    listeners.current.get(event).add(fn);
    return () => listeners.current.get(event)?.delete(fn);
  }, []);

  const emitLocal = useCallback((event, data) => {
    (listeners.current.get(event) || new Set()).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });
  }, []);

  useEffect(() => {
    if (!user) { setNotifications(null); setUnread(0); return; }
    refreshNotifications();
    let es;
    let retry;
    const connect = () => {
      es = new EventSource(`/api/events?token=${encodeURIComponent(getToken())}`);
      es.addEventListener('hello', () => setConnected(true));
      es.addEventListener('notify', (ev) => {
        try {
          const n = JSON.parse(ev.data);
          setNotifications((prev) => (prev ? [n, ...prev].slice(0, 50) : prev));
          setUnread((u) => u + 1);
          toastRich(n.title, n.body, n.type === 'removed' || n.type === 'no_show' || n.type === 'cancel' ? 'error' : 'success');
        } catch { /* ignore */ }
      });
      for (const evt of ['queue', 'shop']) {
        es.addEventListener(evt, (ev) => {
          let data = {};
          try { data = JSON.parse(ev.data); } catch { /* ignore */ }
          emitLocal(evt, data);
        });
      }
      es.onerror = () => {
        setConnected(false);
        es.close();
        clearTimeout(retry);
        retry = setTimeout(connect, 4000);
      };
    };
    connect();
    // quiet polling safety net in case SSE hiccups
    const poll = setInterval(() => { refreshNotifications(); emitLocal('poll'); }, 30000);
    return () => { es?.close(); clearTimeout(retry); clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markRead = useCallback(async (id) => {
    await api.patch(`/notifications/${id}`, { is_read: true });
    setNotifications((prev) => prev && prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    setUnread((u) => Math.max(0, u - 1));
  }, []);

  const value = useMemo(() => ({
    connected, notifications, unread, markRead, refreshNotifications, on, emitLocal, setNotifications, setUnread,
  }), [connected, notifications, unread, markRead, refreshNotifications, on, emitLocal]);
  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}
export const useLive = () => useContext(LiveCtx);

// ---------------------------------------------------------------- data fetch hook
export function useApi(pathNdeps, { refreshMs } = {}) {
  const { path, deps = [] } = typeof pathNdeps === 'string' ? { path: pathNdeps } : pathNdeps;
  const { on } = useLive() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState(null);

  const refetch = useCallback(async (quiet) => {
    if (!path) return;
    if (!quiet) setLoading(true);
    try {
      const d = await api.get(path);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => { refetch(); }, [refetch, ...deps]);

  // re-fetch when the server pushes live events
  useEffect(() => {
    if (!on || !path) return;
    const offQ = on('queue', () => refetch(true));
    const offS = on('shop', () => refetch(true));
    const offP = on('poll', () => refetch(true));
    return () => { offQ(); offS(); offP(); };
  }, [on, path, refetch]);

  return { data, loading, error, refetch, setData };
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth, useLive } from '../store';
import { cn, timeAgo } from '../util';
import { Avatar, Badge } from './ui';
import {
  IconBell, IconChair, IconHistory, IconLogout, IconMap, IconMenu, IconQueue,
  IconScissors, IconStore, IconUser, IconX, IconBolt,
} from '../icons';

const CLIENT_NAV = [
  { to: '/explore', label: 'Find a Barber', icon: IconMap, end: true },
  { to: '/my-queue', label: 'My Queue', icon: IconQueue },
  { to: '/visits', label: 'My Visits', icon: IconHistory },
  { to: '/notifications', label: 'Alerts', icon: IconBell },
  { to: '/profile', label: 'Profile', icon: IconUser },
];

const BARBER_NAV = [
  { to: '/console', label: 'Chair Control', icon: IconChair, end: true },
  { to: '/shop', label: 'My Shop', icon: IconStore },
  { to: '/notifications', label: 'Alerts', icon: IconBell },
  { to: '/profile', label: 'Profile', icon: IconUser },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="barber-pole h-9 w-2.5 rounded-full border border-white/20 shrink-0" />
      <div>
        <div className="font-display font-bold text-lg leading-none tracking-tight">FreshCut</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted mt-0.5">skip the wait</div>
      </div>
    </div>
  );
}

function Bell() {
  const { notifications, unread, markRead } = useLive();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const recent = (notifications || []).slice(0, 6);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="relative p-2.5 rounded-xl text-muted hover:text-cream hover:bg-ink-800 transition" aria-label="Notifications">
        <IconBell size={19} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-pole-red text-[10px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[min(92vw,360px)] card shadow-pop z-[80] animate-fadeUp overflow-hidden">
            <div className="px-4 py-3 border-b border-ink-800 flex items-center justify-between">
              <span className="font-display font-semibold text-sm">Alerts</span>
              <Link to="/notifications" onClick={() => setOpen(false)} className="text-xs text-gold-400 hover:text-gold-300">View all</Link>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {recent.length === 0 && <p className="px-4 py-8 text-sm text-muted text-center">Nothing yet — alerts will land here.</p>}
              {recent.map((n) => (
                <button key={n.id}
                  onClick={() => { if (!n.is_read) markRead(n.id).catch(() => {}); }}
                  className={cn('w-full text-left px-4 py-3 border-b border-ink-850 hover:bg-ink-850 transition flex gap-3', !n.is_read && 'bg-ink-900')}>
                  {!n.is_read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0 animate-pulse" />}
                  <span className={cn('flex-1 min-w-0', n.is_read && 'pl-4')}>
                    <span className="block text-sm font-medium truncate">{n.title}</span>
                    {n.body && <span className="block text-xs text-muted mt-0.5 line-clamp-2">{n.body}</span>}
                    <span className="block text-[10px] text-muted-dark mt-1">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-ink-800 transition">
        <Avatar name={user.name} size={34} />
        <span className="hidden sm:block text-left">
          <span className="block text-sm font-semibold leading-none">{user.name.split(' ')[0]}</span>
          <span className={cn('text-[10px] uppercase tracking-wider', user.role === 'barber' ? 'text-gold-400' : 'text-pole-blue')}>
            {user.role}
          </span>
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 card shadow-pop z-[80] animate-fadeUp py-1.5">
            <div className="px-4 py-2.5 border-b border-ink-800">
              <div className="text-sm font-semibold">{user.name}</div>
              <div className="text-xs text-muted truncate">{user.email}</div>
            </div>
            <button onClick={() => { setOpen(false); navigate('/profile'); }}
              className="w-full text-left px-4 py-2.5 text-sm text-muted hover:text-cream hover:bg-ink-800 transition flex items-center gap-2.5">
              <IconUser size={15} /> Profile
            </button>
            <button onClick={() => { logout(); navigate('/auth'); }}
              className="w-full text-left px-4 py-2.5 text-sm text-pole-red/90 hover:text-pole-red hover:bg-ink-800 transition flex items-center gap-2.5">
              <IconLogout size={15} /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  const { connected } = useLive();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const nav = user.role === 'barber' ? BARBER_NAV : CLIENT_NAV;
  const current = nav.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  useEffect(() => { setDrawer(false); }, [location.pathname]);

  const navList = (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {nav.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}
          className={({ isActive }) => cn(
            'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition group',
            isActive ? 'bg-gold-500/12 text-gold-400 border border-gold-500/25' : 'text-muted hover:text-cream hover:bg-ink-800 border border-transparent'
          )}>
          <item.icon size={17} className="shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex">
      {/* desktop sidebar */}
      <aside className="hidden lg:flex w-[248px] shrink-0 flex-col border-r border-ink-800 bg-ink-900/60 backdrop-blur fixed inset-y-0 z-40">
        <div className="px-5 py-5"><Brand /></div>
        {navList}
        <div className="px-5 pb-6 pt-3 border-t border-ink-800">
          <div className="flex items-center gap-2.5 text-xs text-muted">
            <span className={cn('w-2 h-2 rounded-full', connected ? 'bg-mint-400 animate-pulse' : 'bg-gold-500')} />
            {connected ? 'Live updates on' : 'Connecting…'}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-dark">
            <IconScissors size={12} /> Fresh cuts across Nairobi
          </div>
        </div>
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[270px] bg-ink-900 border-r border-ink-800 flex flex-col animate-fadeUp">
            <div className="px-5 py-5 flex items-center justify-between">
              <Brand />
              <button onClick={() => setDrawer(false)} className="p-1.5 text-muted hover:text-cream"><IconX size={20} /></button>
            </div>
            {navList}
          </aside>
        </div>
      )}

      {/* main column */}
      <div className="flex-1 lg:pl-[248px] min-w-0">
        <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/80 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-3">
            <button onClick={() => setDrawer(true)} className="lg:hidden p-2 -ml-1 rounded-lg text-muted hover:text-cream hover:bg-ink-800" aria-label="Open menu">
              <IconMenu size={20} />
            </button>
            <div className="lg:hidden"><Brand /></div>
            <div className="hidden lg:block">
              <h1 className="font-display font-bold text-lg tracking-tight">{current ? current.label : 'FreshCut'}</h1>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className={cn('hidden sm:flex items-center gap-1.5 mr-1', connected ? 'text-mint-400' : 'text-gold-500')}>
                <IconBolt size={13} />
                <span className="text-[10px] font-semibold uppercase tracking-widest">{connected ? 'Live' : '…'}</span>
              </span>
              <Bell />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

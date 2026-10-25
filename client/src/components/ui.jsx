import React, { useEffect } from 'react';
import { cn, avatarColor, initials } from '../util';
import { IconX } from '../icons';

// ---------------------------------------------------------------- primitives
export function Button({ children, variant = 'primary', size = 'md', loading, className, disabled, ...rest }) {
  const base = 'inline-flex items-center justify-center gap-2 font-display font-semibold rounded-xl transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none select-none';
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-base px-6 py-3.5',
    xl: 'text-lg px-8 py-4',
  };
  const variants = {
    primary: 'bg-gold-500 text-ink-950 hover:bg-gold-400 shadow-glow',
    secondary: 'bg-ink-700 text-cream hover:bg-ink-600 border border-ink-600',
    ghost: 'text-muted hover:text-cream hover:bg-ink-800',
    danger: 'bg-pole-red/15 text-pole-red border border-pole-red/40 hover:bg-pole-red/25',
    mint: 'bg-mint-500 text-ink-950 hover:bg-mint-400',
    outline: 'border border-gold-500/50 text-gold-400 hover:bg-gold-500/10',
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner size={14} invert={variant === 'primary' || variant === 'mint'} /> : null}
      {children}
    </button>
  );
}

export function Spinner({ size = 18, invert = false, className }) {
  return (
    <svg className={cn('animate-spin', invert ? 'text-ink-950' : 'text-gold-400', className)} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3.5" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function Badge({ children, tone = 'neutral', className, dot }) {
  const tones = {
    neutral: 'bg-ink-700/60 text-muted border-ink-600',
    gold: 'bg-gold-500/15 text-gold-400 border-gold-500/30',
    mint: 'bg-mint-500/15 text-mint-400 border-mint-500/30',
    red: 'bg-pole-red/15 text-pole-red border-pole-red/30',
    blue: 'bg-pole-blue/15 text-pole-blue border-pole-blue/30',
    violet: 'bg-violet-500/15 text-violet-300 border-violet-400/30',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', tones[tone], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dot === 'live' ? 'bg-mint-400 animate-pulse' : 'bg-current')} />}
      {children}
    </span>
  );
}

// Live status pill for a shop
export function StatusPill({ shop, className }) {
  if (!shop.is_open) return <Badge tone="neutral" className={className}>Offline</Badge>;
  if (shop.chair_status === 'almost_done') return <Badge tone="gold" dot="live" className={className}>Almost done</Badge>;
  if (shop.is_busy) return <Badge tone="gold" dot="live" className={className}>In a cut</Badge>;
  return <Badge tone="mint" dot="live" className={className}>Chair free</Badge>;
}

export function Avatar({ name, size = 38, className }) {
  return (
    <div
      className={cn('flex items-center justify-center rounded-full font-display font-bold text-ink-950 shrink-0', className)}
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}

export function Field({ label, hint, error, children, className }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted-dark">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-pole-red">{error}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, className }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-7 w-12 items-center rounded-full transition border', checked ? 'bg-mint-500/90 border-mint-500' : 'bg-ink-700 border-ink-600', className)}
      role="switch" aria-checked={checked} aria-label={label || 'toggle'}>
      <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white shadow transition', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

// ---------------------------------------------------------------- overlay / modal
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose?.();
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative card w-full rounded-b-none sm:rounded-b-2xl shadow-pop animate-fadeUp max-h-[92vh] overflow-y-auto', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800 sticky top-0 bg-ink-900/95 backdrop-blur z-10">
          <h3 className="font-display font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-cream hover:bg-ink-800 transition" aria-label="Close">
            <IconX size={18} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-ink-800 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, body, confirmLabel = 'Confirm', danger, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }>
      <p className="text-sm text-muted leading-relaxed">{body}</p>
    </Modal>
  );
}

// ---------------------------------------------------------------- states
export function EmptyState({ icon, title, body, action, className }) {
  return (
    <div className={cn('card border-dashed flex flex-col items-center justify-center text-center px-6 py-14 animate-fadeUp', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-800 border border-ink-700 text-gold-400">
        {icon}
      </div>
      <h3 className="font-display font-bold text-lg">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted leading-relaxed">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function BarberPoleLoader({ label = 'Loading' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="barber-pole h-20 w-3.5 rounded-full border border-white/20 shadow-card" />
      <p className="text-sm text-muted font-display tracking-widest uppercase">{label}…</p>
    </div>
  );
}

export function SectionHead({ title, sub, right }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <h2 className="font-display font-bold text-xl sm:text-2xl tracking-tight">{title}</h2>
        {sub && <p className="text-sm text-muted mt-1">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

// ---------------------------------------------------------------- progress bar for queues
export function QueueChip({ n, active }) {
  return (
    <span className={cn(
      'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-display font-bold border',
      active ? 'bg-gold-500 text-ink-950 border-gold-400' : 'bg-ink-800 text-muted border-ink-600'
    )}>
      {n}
    </span>
  );
}

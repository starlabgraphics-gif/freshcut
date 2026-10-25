import React from 'react';
import { cn, kmLabel, minutesLabel, KES } from '../util';
import { Badge, Button, StatusPill } from './ui';
import { IconClock, IconPin, IconQueue, IconWalk, IconPhone } from '../icons';

export default function ShopCard({ shop, onJoin, joinDisabled, joinHint, highlight }) {
  const waiting = shop.queue_count;
  const priceLo = shop.services.length ? Math.min(...shop.services.map((s) => s.price_kes)) : null;
  const priceHi = shop.services.length ? Math.max(...shop.services.map((s) => s.price_kes)) : null;

  return (
    <div className={cn('card p-5 flex flex-col gap-4 transition hover:border-ink-600 animate-fadeUp', highlight && 'border-gold-500/40 shadow-glow')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-lg tracking-tight truncate">{shop.name}</h3>
          <p className="text-xs text-muted mt-1 flex items-center gap-1.5">
            <IconPin size={12} className="shrink-0 text-gold-500" />
            <span className="truncate">{shop.area || shop.address}</span>
            {shop.distance_km != null && <span className="shrink-0 text-muted-dark">· {kmLabel(shop.distance_km)} away</span>}
          </p>
        </div>
        <StatusPill shop={shop} />
      </div>

      {shop.status_message && shop.is_open && (
        <p className="text-xs text-gold-300/90 bg-gold-500/8 border border-gold-500/20 rounded-lg px-3 py-2 leading-relaxed">
          “{shop.status_message}”
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-ink-850 border border-ink-800 px-2 py-2.5">
          <div className="flex items-center justify-center gap-1 text-muted-dark text-[10px] uppercase tracking-wider"><IconQueue size={11} /> In queue</div>
          <div className={cn('font-display font-bold text-lg mt-0.5', waiting === 0 ? 'text-mint-400' : waiting >= 3 ? 'text-pole-red' : 'text-gold-400')}>{waiting}</div>
        </div>
        <div className="rounded-xl bg-ink-850 border border-ink-800 px-2 py-2.5">
          <div className="flex items-center justify-center gap-1 text-muted-dark text-[10px] uppercase tracking-wider"><IconClock size={11} /> Next slot</div>
          <div className="font-display font-bold text-lg mt-0.5 text-cream">
            {!shop.is_open ? '—' : shop.est_wait_minutes <= 0 ? <span className="text-mint-400">Now!</span> : minutesLabel(shop.est_wait_minutes)}
          </div>
        </div>
        <div className="rounded-xl bg-ink-850 border border-ink-800 px-2 py-2.5">
          <div className="flex items-center justify-center gap-1 text-muted-dark text-[10px] uppercase tracking-wider"><IconWalk size={11} /> Per cut</div>
          <div className="font-display font-bold text-lg mt-0.5 text-cream">~{shop.avg_cut_minutes}m</div>
        </div>
      </div>

      {shop.services.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {shop.services.slice(0, 4).map((s) => (
            <span key={s.id} className="text-[11px] rounded-full bg-ink-800 border border-ink-700 px-2.5 py-1 text-muted">
              {s.name} · <span className="text-cream/80">{KES(s.price_kes)}</span>
            </span>
          ))}
          {shop.services.length > 4 && <span className="text-[11px] text-muted-dark px-1 py-1">+{shop.services.length - 4} more</span>}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <div className="text-xs text-muted-dark">
          {priceLo != null ? <span>{KES(priceLo)} – {KES(priceHi)}</span> : <span>Walk-in pricing</span>}
        </div>
        <Button
          size="sm"
          variant={!shop.is_open ? 'secondary' : shop.is_busy ? 'outline' : 'primary'}
          disabled={!shop.is_open || joinDisabled}
          onClick={() => onJoin(shop)}
          title={!shop.is_open ? 'This shop is offline' : joinHint || ''}
        >
          {!shop.is_open ? 'Offline' : joinDisabled ? 'In a queue' : shop.est_wait_minutes <= 0 ? 'Take the chair →' : 'Join queue'}
        </Button>
      </div>
    </div>
  );
}

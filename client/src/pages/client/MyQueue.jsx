import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi, useAuth, useToast } from '../../store';
import { api, cn, minutesLabel, timeAgo, KES, parseTs } from '../../util';
import { Badge, Button, CardSkeleton, ConfirmModal, EmptyState, QueueChip, SectionHead, StatusPill } from '../../components/ui';
import { IconChair, IconClock, IconMap, IconPhone, IconPin, IconQueue, IconScissors, IconBell } from '../../icons';

function useTick(ms = 30000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((t) => t + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
}

export default function MyQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, loading, refetch } = useApi('/queue/mine');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  useTick();

  const active = gone ? null : data?.active;

  const leave = async () => {
    setLeaving(true);
    setGone(true); // optimistic: drop the card instantly
    setConfirmLeave(false);
    try {
      await api.patch(`/queue/${active.id}`, { status: 'cancelled' });
      toast('You left the queue. The chair will miss you.', 'success');
      refetch(true);
    } catch (e) {
      setGone(false);
      toast(e.message, 'error');
    } finally {
      setLeaving(false);
    }
  };

  if (loading && !data) {
    return <div className="space-y-4"><CardSkeleton lines={5} /><CardSkeleton /></div>;
  }

  if (!active) {
    return (
      <EmptyState
        icon={<IconChair size={28} />}
        title="You're not in any queue"
        body="Find a barber online near you, tap “Join queue”, and we'll hold your spot — we'll ping you before it's your turn so you never shop-wait again."
        action={<Link to="/explore"><Button><IconMap size={15} /> Find a barber</Button></Link>}
        className="py-20"
      />
    );
  }

  const serving = active.status === 'serving';
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${active.shop_lat},${active.shop_lng}`;
  const chairBusy = active.shop_chair_status !== 'idle';

  return (
    <div className="space-y-6 animate-fadeUp">
      <SectionHead
        title={serving ? "You're in the chair 💈" : `You're #${active.position} in line`}
        sub={serving ? 'Enjoy the fresh look coming together.' : `${active.shop_name} · joined ${timeAgo(active.joined_at)}`}
        right={<StatusPill shop={{ is_open: true, is_busy: chairBusy, chair_status: active.shop_chair_status }} />}
      />

      <div className="grid lg:grid-cols-5 gap-5">
        {/* ETA hero */}
        <div className="card lg:col-span-2 p-6 flex flex-col items-center text-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 barber-pole opacity-60" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-dark">
            {serving ? 'Sit back' : active.position === 1 ? 'You are next!' : 'Estimated wait'}
          </p>
          <div className={cn('font-display font-bold mt-2 leading-none', serving ? 'text-5xl text-mint-400' : 'text-6xl text-gold-400')}>
            {serving ? '💈' : active.position === 1 ? (chairBusy ? minutesLabel(active.eta_minutes) : 'Now!') : minutesLabel(active.eta_minutes)}
          </div>
          {!serving && active.position === 1 && chairBusy && (
            <p className="mt-3 text-sm text-muted">Chair is busy — start heading over.</p>
          )}
          {!serving && active.position === 1 && !chairBusy && (
            <p className="mt-3 text-sm text-mint-400 font-semibold animate-pulse">The chair is free — go go go!</p>
          )}
          {!serving && active.position > 1 && (
            <p className="mt-3 text-sm text-muted">{active.position - 1} client{active.position - 1 === 1 ? '' : 's'} ahead of you</p>
          )}
          <div className="mt-5 flex items-center gap-2 text-xs text-muted bg-ink-850 border border-ink-800 rounded-full px-3.5 py-2">
            <IconBell size={13} className="text-gold-400" />
            We alert you ~{user.notify_minutes} min before your turn
          </div>
        </div>

        {/* details */}
        <div className="card lg:col-span-3 p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-xl">{active.shop_name}</h3>
              <p className="text-xs text-muted mt-1 flex items-center gap-1.5">
                <IconPin size={12} className="text-gold-500" /> {active.shop_area} · {active.shop_address}
              </p>
            </div>
            {active.service_name && (
              <div className="text-right shrink-0">
                <Badge tone="gold">{active.service_name}</Badge>
                <div className="text-sm font-display font-bold mt-1.5">{KES(active.service_price)}</div>
              </div>
            )}
          </div>

          {/* queue visualization */}
          <div className="mt-6 rounded-xl border border-ink-800 bg-ink-850 p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-dark mb-3">The line</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-2 rounded-full bg-ink-800 border border-ink-700 px-3 py-1.5 text-xs">
                <IconScissors size={12} className="text-gold-400" />
                <span className="text-muted">Chair{chairBusy ? ': busy' : ': free'}</span>
              </span>
              {!serving && Array.from({ length: Math.max(0, active.position - 1) }).map((_, i) => (
                <React.Fragment key={i}>
                  <span className="text-muted-dark">→</span>
                  <QueueChip n={i + 1} />
                </React.Fragment>
              ))}
              {!serving && <span className="text-muted-dark">→</span>}
              <QueueChip n={serving ? '✂' : active.position} active />
              <span className="text-xs font-semibold text-gold-400">{serving ? 'you — in the chair' : 'you'}</span>
            </div>
          </div>

          {active.shop_status_message && (
            <p className="mt-4 text-xs text-gold-300/90 leading-relaxed">💬 “{active.shop_status_message}”</p>
          )}

          <div className="mt-6 pt-4 border-t border-ink-800 flex flex-wrap gap-2.5 mt-auto">
            {!serving && active.status === 'waiting' && (
              <Button variant="danger" size="sm" onClick={() => setConfirmLeave(true)} loading={leaving}>Leave queue</Button>
            )}
            <a href={directions} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm"><IconPin size={14} /> Directions</Button>
            </a>
            {active.shop_phone && (
              <a href={`tel:${active.shop_phone.replace(/\s/g, '')}`}>
                <Button variant="secondary" size="sm"><IconPhone size={14} /> Call the shop</Button>
              </a>
            )}
            <Link to="/explore" className="ml-auto"><Button variant="ghost" size="sm">Browse other shops</Button></Link>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmLeave} onClose={() => setConfirmLeave(false)} onConfirm={leave}
        title="Leave the queue?" danger confirmLabel="Leave queue" loading={leaving}
        body={`You'll give up spot #${active.position} at ${active.shop_name}. If you're close by already, maybe hold on a little longer?`}
      />
    </div>
  );
}

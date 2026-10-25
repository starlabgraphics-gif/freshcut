import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi, useToast } from '../../store';
import { api, cn, minutesLabel, timeAgo, parseTs, KES } from '../../util';
import { Avatar, Badge, Button, CardSkeleton, EmptyState, SectionHead, Skeleton, StatusPill, Toggle } from '../../components/ui';
import { IconChair, IconCheck, IconClock, IconPin, IconPlus, IconQueue, IconRazor, IconStore, IconX, IconPhone, IconWalk, IconPower } from '../../icons';

function useTick(ms = 15000) {
  const [, setT] = useState(0);
  useEffect(() => { const i = setInterval(() => setT((t) => t + 1), ms); return () => clearInterval(i); }, [ms]);
}

const MSG_PRESETS = ['Chair is free — walk in!', 'Back-to-back cuts, join the queue', 'Chai break — 10 min', 'Coming slowly, traffic!'];

export default function Console() {
  const { toast } = useToast();
  const { data: mineData, loading: shopLoading, refetch: refetchMine } = useApi('/shops?mine=1');
  const shop = mineData?.shops?.[0] || null;
  const { data: queueData, setData: setQueueData, refetch: refetchQueue } = useApi(shop ? `/shops/${shop.id}/queue` : null);
  const queue = queueData?.queue || [];
  const [pending, setPending] = useState('');
  const [msg, setMsg] = useState(null);
  const [savingMsg, setSavingMsg] = useState(false);
  useTick();

  useEffect(() => { if (shop && msg === null) setMsg(shop.status_message || ''); }, [shop, msg]);

  const action = async (act, optimisticFn) => {
    if (!shop || pending) return;
    setPending(act);
    if (optimisticFn) optimisticFn();
    try {
      const d = await api.post(`/shops/${shop.id}/actions`, { action: act });
      setQueueData({ queue: d.queue });
      refetchMine(true);
      const done = { open: "You're live on the map 📡", close: 'You went offline', seat_next: 'Next client seated 💈', walkin: 'Walk-in added to the queue', almost_done: 'Next client pinged — almost done! ⏱', done_next: 'Nice cut. Next one!' };
      toast(done[act] || 'Updated', 'success');
    } catch (e) {
      toast(e.message, 'error');
      refetchQueue(true); refetchMine(true);
    } finally { setPending(''); }
  };

  const removeEntry = async (entry, status) => {
    setQueueData((prev) => ({ queue: queue.filter((q) => q.id !== entry.id) })); // optimistic
    try {
      await api.patch(`/queue/${entry.id}`, { status });
      toast(status === 'no_show' ? `${entry.client_name} marked as no-show` : `${entry.client_name} removed`, 'success');
    } catch (e) {
      toast(e.message, 'error'); refetchQueue(true);
    }
  };

  const saveMsg = async (value) => {
    setMsg(value); setSavingMsg(true);
    try {
      await api.put(`/shops/${shop.id}`, { status_message: value });
      toast('Status message updated', 'success');
      refetchMine(true);
    } catch (e) { toast(e.message, 'error'); } finally { setSavingMsg(false); }
  };

  if (shopLoading && !mineData) {
    return <div className="space-y-4"><CardSkeleton lines={2} /><div className="grid lg:grid-cols-2 gap-4"><CardSkeleton lines={5} /><CardSkeleton lines={5} /></div></div>;
  }

  if (!shop) {
    return (
      <EmptyState
        icon={<IconStore size={28} />}
        title="Set up your shop to go live"
        body="Register your barbershop, pin it on the map, add your services — then flip yourself Online and clients will start queueing from their sofas."
        action={<Link to="/shop"><Button size="lg"><IconPlus size={16} /> Register my shop</Button></Link>}
        className="py-20"
      />
    );
  }

  const serving = queue.find((q) => q.status === 'serving');
  const waiting = queue.filter((q) => q.status === 'waiting');
  const elapsedMin = serving?.started_at ? Math.max(0, Math.round((Date.now() - parseTs(serving.started_at)) / 60000)) : 0;
  const clearEta = waiting.length ? (waiting[waiting.length - 1].eta_minutes + shop.avg_cut_minutes) : (serving ? shop.avg_cut_minutes - elapsedMin : 0);

  return (
    <div className="space-y-6 animate-fadeUp">
      <SectionHead title={shop.name}
        sub={`${shop.area || 'Nairobi'} · ~${shop.avg_cut_minutes} min per cut`}
        right={<StatusPill shop={shop} />} />

      {/* online toggle — the Uber switch */}
      <div className={cn('card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 transition',
        shop.is_open ? 'border-mint-500/40 shadow-[0_0_0_1px_rgba(47,206,112,0.15)]' : 'border-ink-700')}>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl transition shrink-0',
          shop.is_open ? 'bg-mint-500/15 text-mint-400' : 'bg-ink-800 text-muted')}>
          <IconPower size={22} />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold text-lg">{shop.is_open ? "You're Online" : "You're Offline"}</h3>
          <p className="text-sm text-muted mt-0.5">
            {shop.is_open
              ? 'Clients can see your shop and join your queue right now.'
              : 'Flip online to appear on the map and start receiving queue requests.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-xs font-semibold uppercase tracking-wider', shop.is_open ? 'text-mint-400' : 'text-muted-dark')}>
            {shop.is_open ? 'Visible' : 'Hidden'}
          </span>
          <Toggle checked={!!shop.is_open} label="Go online"
            onChange={(v) => action(v ? 'open' : 'close', () => {})} />
        </div>
      </div>

      {/* status message */}
      <div className="card px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-muted-dark font-semibold shrink-0">Shout-out</span>
        <div className="flex flex-1 gap-2">
          <input className="input flex-1" placeholder="Tell clients something — e.g. “Two chairs free!”"
            value={msg ?? ''} onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveMsg(msg)} />
          <Button variant="secondary" size="sm" onClick={() => saveMsg(msg)} loading={savingMsg}>Post</Button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {MSG_PRESETS.map((p) => (
            <button key={p} onClick={() => saveMsg(p)}
              className="rounded-full bg-ink-850 border border-ink-700 px-2.5 py-1 text-[11px] text-muted hover:text-cream hover:border-ink-600 transition">
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* THE CHAIR */}
        <div className={cn('card p-6 relative overflow-hidden', serving && 'border-gold-500/35')}>
          <div className="absolute top-0 left-0 right-0 h-1 barber-pole opacity-50" />
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><IconChair size={18} className="text-gold-400" /> The Chair</h3>
            {serving && <Badge tone="gold" dot="live">{elapsedMin} min in</Badge>}
          </div>

          {serving ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar name={serving.client_name} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold text-lg truncate">{serving.client_name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {serving.service_name ? `${serving.service_name} · ${KES(serving.service_price)}` : 'Deciding at the chair'}
                    {serving.kind === 'walkin' && ' · walk-in'}
                  </div>
                  <div className="text-[11px] text-muted-dark mt-1">Started {timeAgo(serving.started_at)} · avg {shop.avg_cut_minutes} min</div>
                </div>
              </div>

              {/* THE BIG BUTTONS */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => action('almost_done')}
                  disabled={!!pending || shop.chair_status === 'almost_done'}
                  className={cn('rounded-2xl border-2 px-4 py-4 text-left transition active:scale-[.98] disabled:opacity-60',
                    shop.chair_status === 'almost_done'
                      ? 'border-gold-500/60 bg-gold-500/10'
                      : 'border-ink-600 bg-ink-850 hover:border-gold-500/50 hover:bg-gold-500/5')}>
                  <div className="text-2xl mb-1.5">⏱</div>
                  <div className="font-display font-bold text-sm">
                    {shop.chair_status === 'almost_done' ? 'Next client pinged ✓' : 'Almost done'}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5 leading-snug">
                    {shop.chair_status === 'almost_done' ? 'They know to head over' : 'Pings the next client to head over'}
                  </div>
                </button>
                <button
                  onClick={() => action('done_next')}
                  disabled={!!pending}
                  className="rounded-2xl border-2 border-mint-500/40 bg-mint-500/10 px-4 py-4 text-left transition hover:bg-mint-500/15 active:scale-[.98] disabled:opacity-60">
                  <div className="text-2xl mb-1.5">✔️</div>
                  <div className="font-display font-bold text-sm text-mint-400">Done — next up</div>
                  <div className="text-[11px] text-muted mt-0.5 leading-snug">
                    {waiting.length ? `Seat ${waiting[0].client_name.split(' ')[0]} automatically` : 'Closes the cut, chair goes free'}
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border-2 border-dashed border-ink-700 py-8 text-center">
                <div className="text-4xl mb-2">🪑</div>
                <div className="font-display font-bold text-muted">Chair is empty</div>
                <div className="text-xs text-muted-dark mt-1">
                  {waiting.length ? `${waiting[0].client_name} is next in the queue` : 'No one in line yet — stay online and relax'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="mint" className="!rounded-2xl !py-4 flex-col !h-auto" disabled={!waiting.length || !!pending}
                  onClick={() => action('seat_next')}>
                  <span className="text-xl"><IconChair size={20} /></span>
                  <span className="font-display font-bold text-sm mt-1">Seat next client</span>
                </Button>
                <Button variant="secondary" className="!rounded-2xl !py-4 flex-col !h-auto" disabled={!shop.is_open || !!pending}
                  onClick={() => action('walkin')}>
                  <span className="text-xl"><IconWalk size={20} /></span>
                  <span className="font-display font-bold text-sm mt-1">+ Walk-in</span>
                </Button>
              </div>
            </div>
          )}

          {serving && shop.is_open && (
            <button onClick={() => action('walkin')} disabled={!!pending}
              className="mt-4 w-full rounded-xl border border-ink-700 bg-ink-850 px-4 py-3 text-sm text-muted hover:text-cream hover:border-ink-600 transition flex items-center justify-center gap-2">
              <IconWalk size={15} /> Someone just walked in — add them to the line
            </button>
          )}
        </div>

        {/* THE QUEUE */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><IconQueue size={18} className="text-pole-blue" /> Waiting room</h3>
            <Badge tone={waiting.length ? 'gold' : 'mint'}>{waiting.length} waiting</Badge>
          </div>

          {waiting.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-ink-700 py-10 text-center">
              <div className="text-3xl mb-2">🧘🏾</div>
              <div className="font-display font-semibold text-muted">Queue is empty</div>
              <div className="text-xs text-muted-dark mt-1">Clients who join from the app will appear here instantly.</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {waiting.map((q, i) => (
                <div key={q.id} className="flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-850 px-3.5 py-3 animate-fadeUp">
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display font-bold text-sm border',
                    i === 0 ? 'bg-gold-500 text-ink-950 border-gold-400' : 'bg-ink-800 text-muted border-ink-700')}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{q.client_name}</span>
                      <Badge tone={q.kind === 'walkin' ? 'neutral' : 'blue'} className="!px-1.5">{q.kind === 'walkin' ? 'walk-in' : 'app'}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-dark mt-0.5 truncate">
                      {q.service_name ? `${q.service_name} · ` : ''}joined {timeAgo(q.joined_at)} · eta {minutesLabel(q.eta_minutes)}
                    </div>
                  </div>
                  {q.client_phone && q.kind === 'app' && (
                    <a href={`tel:${q.client_phone.replace(/\s/g, '')}`} className="p-2 rounded-lg text-muted hover:text-mint-400 hover:bg-ink-800 transition" title={q.client_phone}>
                      <IconPhone size={15} />
                    </a>
                  )}
                  <button onClick={() => removeEntry(q, 'no_show')} title="Mark as no-show"
                    className="p-2 rounded-lg text-muted hover:text-gold-400 hover:bg-ink-800 transition">
                    <IconClock size={15} />
                  </button>
                  <button onClick={() => removeEntry(q, 'cancelled')} title="Remove from queue"
                    className="p-2 rounded-lg text-muted hover:text-pole-red hover:bg-ink-800 transition">
                    <IconX size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-ink-800 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="font-display font-bold text-lg">{waiting.length}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-dark">in line</div>
            </div>
            <div>
              <div className="font-display font-bold text-lg text-gold-400">{waiting.length || serving ? minutesLabel(Math.max(0, clearEta)) : '—'}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-dark">queue clears</div>
            </div>
            <div>
              <div className="font-display font-bold text-lg">{minutesLabel(shop.avg_cut_minutes)}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-dark">per cut</div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-dark">
        Managing <Link to="/shop" className="text-gold-400 hover:text-gold-300">shop details & services →</Link>
      </p>
    </div>
  );
}

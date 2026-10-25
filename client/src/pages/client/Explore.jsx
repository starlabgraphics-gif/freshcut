import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApi, useAuth, useToast } from '../../store';
import { api, cn, minutesLabel, KES } from '../../util';
import { Button, CardSkeleton, EmptyState, Field, Modal, StatusPill, Badge } from '../../components/ui';
import ShopCard from '../../components/ShopCard';
import { ShopMap } from '../../components/Map';
import { IconMap, IconPin, IconSearch, IconScissors, IconBolt, IconQueue } from '../../icons';

const FILTERS = [
  { id: 'all', label: 'All shops' },
  { id: 'open', label: 'Open now' },
  { id: 'free', label: 'Chair free' },
];

const SORTS = [
  { id: 'smart', label: 'Best pick' },
  { id: 'wait', label: 'Shortest wait' },
  { id: 'near', label: 'Nearest' },
  { id: 'price', label: 'Lowest price' },
];

export default function Explore() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data, loading } = useApi('/shops');
  const { data: mine } = useApi('/queue/mine');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('smart');
  const [showMap, setShowMap] = useState(true);
  const [joining, setJoining] = useState(null); // shop being joined
  const [serviceId, setServiceId] = useState('');
  const [busy, setBusy] = useState(false);

  const shops = data?.shops || [];
  const activeEntry = mine?.active || null;

  const shown = useMemo(() => {
    let list = [...shops];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((s) => `${s.name} ${s.area} ${s.address}`.toLowerCase().includes(q));
    }
    if (filter === 'open') list = list.filter((s) => s.is_open);
    if (filter === 'free') list = list.filter((s) => s.is_open && !s.is_busy && s.queue_count === 0);
    const score = (s) => {
      if (!s.is_open) return 3e9;
      if (s.est_wait_minutes <= 0) return 0;
      return s.est_wait_minutes;
    };
    const minPrice = (s) => (s.services.length ? Math.min(...s.services.map((x) => x.price_kes)) : 9e6);
    const by = {
      smart: (a, b) => score(a) - score(b) || a.name.localeCompare(b.name),
      wait: (a, b) => score(a) - score(b),
      near: (a, b) => (a.distance_km ?? 9e3) - (b.distance_km ?? 9e3),
      price: (a, b) => (!a.is_open ? 9e6 : minPrice(a)) - (!b.is_open ? 9e6 : minPrice(b)),
    };
    return list.sort(by[sort]);
  }, [shops, query, filter, sort]);

  const openCount = shops.filter((s) => s.is_open).length;
  const freeCount = shops.filter((s) => s.is_open && !s.is_busy && s.queue_count === 0).length;

  const confirmJoin = async () => {
    if (!joining) return;
    setBusy(true);
    try {
      await api.post(`/shops/${joining.id}/join`, { service_id: serviceId || undefined });
      toast(`You're in the queue at ${joining.name} 💈`, 'success');
      setJoining(null);
      setServiceId('');
      navigate('/my-queue');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* live banner */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-5 bg-gradient-to-r from-gold-500/10 via-transparent to-pole-blue/5">
          <div className="barber-pole h-12 w-2.5 rounded-full border border-white/20 hidden sm:block" />
          <div className="flex-1">
            <h2 className="font-display font-bold text-xl tracking-tight">Need a cut, {user.name.split(' ')[0]}?</h2>
            <p className="text-sm text-muted mt-1">
              <span className="text-mint-400 font-semibold">{openCount} shop{openCount === 1 ? '' : 's'} online</span>
              {freeCount > 0 && <span> · <span className="text-cream">{freeCount} with a free chair right now</span></span>}
              {freeCount === 0 && openCount > 0 && <span> · join a queue and arrive just in time</span>}
            </p>
          </div>
          {user.lat == null && (
            <Link to="/profile" className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1.5 shrink-0">
              <IconPin size={13} /> Set your location for distances →
            </Link>
          )}
        </div>
      </div>

      {/* active queue notice */}
      {activeEntry && (
        <div className="card px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 border-gold-500/40 shadow-glow animate-fadeUp">
          <Badge tone="gold" dot="live">In queue</Badge>
          <div className="flex-1 text-sm">
            You're <b className="font-display">#{activeEntry.position}</b> in line at <b className="font-display">{activeEntry.shop_name}</b>
            <span className="text-muted"> — est. wait {minutesLabel(activeEntry.eta_minutes)}</span>
          </div>
          <Link to="/my-queue"><Button size="sm" variant="outline">Track my spot</Button></Link>
        </div>
      )}

      {/* controls */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-dark" />
          <input className="input pl-10" placeholder="Search shops or areas — e.g. “Westlands”"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn('rounded-full px-3.5 py-1.5 text-xs font-semibold border transition',
                filter === f.id ? 'bg-gold-500 text-ink-950 border-gold-400' : 'bg-ink-850 text-muted border-ink-700 hover:text-cream')}>
              {f.label}
            </button>
          ))}
          <select className="input !w-auto !py-1.5 text-xs rounded-full" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort shops">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <Button size="sm" variant="secondary" onClick={() => setShowMap((v) => !v)}>
            <IconMap size={14} /> {showMap ? 'Hide map' : 'Show map'}
          </Button>
        </div>
      </div>

      {/* map */}
      {showMap && !loading && shops.length > 0 && (
        <div className="animate-fadeUp">
          <ShopMap shops={shown} me={{ lat: user.lat, lng: user.lng }} height={380}
            onSelect={(s) => { if (s.is_open && !activeEntry) { setJoining(s); setServiceId(''); } }} />
          <div className="flex flex-wrap gap-4 mt-2.5 px-1 text-[11px] text-muted">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-mint-500" /> Chair free</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gold-500" /> Busy / queueing</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-ink-500" /> Offline</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pole-blue" /> You</span>
            <span className="ml-auto text-muted-dark">Tap a pin to preview — or join straight from a card</span>
          </div>
        </div>
      )}

      {/* grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<IconScissors size={26} />}
          title={shops.length === 0 ? 'No barbers have set up shop yet' : 'No shops match that search'}
          body={shops.length === 0
            ? 'Barbers register their shops and pin them on the map — check back soon as Nairobi wakes up.'
            : 'Try a different name or area, or clear the filters to see every shop.'}
          action={query || filter !== 'all' ? <Button variant="secondary" onClick={() => { setQuery(''); setFilter('all'); }}>Clear search & filters</Button> : null}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {shown.map((s) => (
            <ShopCard key={s.id} shop={s}
              joinDisabled={!!activeEntry}
              joinHint={activeEntry ? `Finish or leave your queue at ${activeEntry.shop_name} first` : ''}
              onJoin={(shop) => { setJoining(shop); setServiceId(''); }} />
          ))}
        </div>
      )}

      {/* join modal */}
      <Modal open={!!joining} onClose={() => setJoining(null)} title={joining ? `Join the queue — ${joining.name}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setJoining(null)}>Cancel</Button>
            <Button onClick={confirmJoin} loading={busy}>
              <IconBolt size={15} /> Join now
            </Button>
          </>
        }>
        {joining && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusPill shop={joining} />
              <Badge tone="neutral">{joining.queue_count} waiting</Badge>
              <Badge tone={joining.est_wait_minutes <= 0 ? 'mint' : 'gold'}>
                {joining.est_wait_minutes <= 0 ? 'Chair free — walk in!' : `Joining puts you ~${minutesLabel(joining.est_wait_minutes)} out`}
              </Badge>
            </div>
            <Field label="What are you getting done?" hint="Optional — helps the barber prepare and quote you.">
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                <label className={cn('flex items-center gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition',
                  serviceId === '' ? 'border-gold-500/60 bg-gold-500/8' : 'border-ink-700 bg-ink-850 hover:border-ink-600')}>
                  <input type="radio" name="svc" checked={serviceId === ''} onChange={() => setServiceId('')} className="accent-gold-500" />
                  <span className="flex-1 text-sm font-medium">Decide at the chair</span>
                </label>
                {joining.services.map((s) => (
                  <label key={s.id} className={cn('flex items-center gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition',
                    serviceId === String(s.id) ? 'border-gold-500/60 bg-gold-500/8' : 'border-ink-700 bg-ink-850 hover:border-ink-600')}>
                    <input type="radio" name="svc" checked={serviceId === String(s.id)} onChange={() => setServiceId(String(s.id))} className="accent-gold-500" />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{s.name}</span>
                      <span className="text-[11px] text-muted">~{s.duration_min} min</span>
                    </span>
                    <span className="font-display font-bold text-gold-400 text-sm">{KES(s.price_kes)}</span>
                  </label>
                ))}
              </div>
            </Field>
            <p className="text-xs text-muted leading-relaxed bg-ink-850 border border-ink-800 rounded-lg px-3 py-2.5">
              🔔 We'll alert you when you're about <b className="text-cream">{user.notify_minutes} min</b> away from the chair — change that in Profile.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

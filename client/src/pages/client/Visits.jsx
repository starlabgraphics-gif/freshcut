import React from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../store';
import { formatDateTime, KES } from '../../util';
import { Badge, Button, CardSkeleton, EmptyState, SectionHead } from '../../components/ui';
import { IconHistory, IconMap } from '../../icons';

const STATUS_BADGE = {
  done: { tone: 'mint', label: 'Completed' },
  cancelled: { tone: 'neutral', label: 'Left queue' },
  no_show: { tone: 'red', label: 'No-show' },
};

export default function Visits() {
  const { data, loading } = useApi('/queue/mine');
  const history = data?.history || [];

  if (loading && !data) {
    return <div className="space-y-4"><CardSkeleton lines={4} /><CardSkeleton lines={4} /></div>;
  }

  const doneVisits = history.filter((h) => h.status === 'done');
  const totalSpent = doneVisits.reduce((sum, h) => sum + (h.service_price || 0), 0);

  return (
    <div className="space-y-6">
      <SectionHead title="My Visits" sub="Every cut you've queued for through FreshCut."
        right={doneVisits.length > 0 && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-dark">Lifetime cuts · spent</div>
            <div className="font-display font-bold text-gold-400">{doneVisits.length} · {KES(totalSpent)}</div>
          </div>
        )} />

      {history.length === 0 ? (
        <EmptyState
          icon={<IconHistory size={26} />}
          title="No visits yet"
          body="Your haircut history will show up here after your first FreshCut queue. Fresh fades start on the Explore page."
          action={<Link to="/explore"><Button><IconMap size={15} /> Find a barber</Button></Link>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-ink-850/60">
                <tr>
                  <th className="th">Shop</th>
                  <th className="th">Service</th>
                  <th className="th">When</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const badge = STATUS_BADGE[h.status] || STATUS_BADGE.done;
                  return (
                    <tr key={h.id} className="hover:bg-ink-850/50 transition">
                      <td className="td">
                        <div className="font-semibold font-display">{h.shop_name}</div>
                        <div className="text-xs text-muted-dark">{h.shop_area}</div>
                      </td>
                      <td className="td text-muted">{h.service_name || '—'}</td>
                      <td className="td text-muted whitespace-nowrap">{formatDateTime(h.joined_at)}</td>
                      <td className="td"><Badge tone={badge.tone}>{badge.label}</Badge></td>
                      <td className="td text-right font-display font-semibold">{h.service_price != null ? KES(h.service_price) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

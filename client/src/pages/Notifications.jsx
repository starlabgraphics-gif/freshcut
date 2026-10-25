import React, { useState } from 'react';
import { useLive, useToast } from '../store';
import { api, cn, timeAgo } from '../util';
import { Badge, Button, CardSkeleton, EmptyState, SectionHead } from '../components/ui';
import { IconBell, IconCheck, IconTrash } from '../icons';

const TYPE_TONE = {
  eta: 'gold', almost_done: 'gold', turn: 'mint', done: 'mint',
  booking: 'blue', cancel: 'neutral', removed: 'red', no_show: 'red', info: 'neutral',
};

export default function Notifications() {
  const { notifications, unread, markRead, refreshNotifications, setNotifications, setUnread } = useLive();
  const { toast } = useToast();
  const [onlyUnread, setOnlyUnread] = useState(false);

  if (notifications === null) {
    return <div className="space-y-4"><CardSkeleton lines={3} /><CardSkeleton lines={3} /><CardSkeleton lines={3} /></div>;
  }

  const shown = onlyUnread ? notifications.filter((n) => !n.is_read) : notifications;

  const markAll = async () => {
    const prev = notifications;
    setNotifications(prev.map((n) => ({ ...n, is_read: 1 })));
    setUnread(0);
    try { await api.post('/notifications/read-all'); } catch (e) {
      toast(e.message, 'error'); refreshNotifications();
    }
  };

  const remove = async (n) => {
    const prev = notifications;
    setNotifications(prev.filter((x) => x.id !== n.id));
    if (!n.is_read) setUnread((u) => Math.max(0, u - 1));
    try { await api.del(`/notifications/${n.id}`); } catch (e) {
      toast(e.message, 'error'); setNotifications(prev);
    }
  };

  const toggleRead = async (n) => {
    const target = n.is_read ? 0 : 1;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: target } : x)));
    setUnread((u) => Math.max(0, u + (target ? -1 : 1)));
    try { await api.patch(`/notifications/${n.id}`, { is_read: !!target }); } catch (e) {
      toast(e.message, 'error'); refreshNotifications();
    }
  };

  return (
    <div className="space-y-6">
      <SectionHead title="Alerts" sub="Queue pings, turn call-ups and shop updates."
        right={
          <div className="flex items-center gap-2">
            <button onClick={() => setOnlyUnread((v) => !v)}
              className={cn('rounded-full px-3.5 py-1.5 text-xs font-semibold border transition',
                onlyUnread ? 'bg-gold-500 text-ink-950 border-gold-400' : 'bg-ink-850 text-muted border-ink-700 hover:text-cream')}>
              Unread{unread > 0 ? ` (${unread})` : ''}
            </button>
            <Button size="sm" variant="secondary" onClick={markAll} disabled={unread === 0}>
              <IconCheck size={14} /> Mark all read
            </Button>
          </div>
        } />

      {shown.length === 0 ? (
        <EmptyState
          icon={<IconBell size={26} />}
          title={onlyUnread ? 'All caught up 🎉' : 'No alerts yet'}
          body={onlyUnread ? 'No unread alerts. You are on top of your queue game.'
            : 'When a barber is almost done with the client before you — or your turn arrives — it lands here instantly.'}
          action={onlyUnread ? <Button variant="ghost" onClick={() => setOnlyUnread(false)}>Show everything</Button> : null}
        />
      ) : (
        <div className="card divide-y divide-ink-850 overflow-hidden">
          {shown.map((n) => (
            <div key={n.id} className={cn('group px-4 sm:px-5 py-4 flex items-start gap-3.5 transition', !n.is_read && 'bg-gold-500/[0.04]')}>
              <div className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', n.is_read ? 'bg-ink-700' : 'bg-gold-400 animate-pulse')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-semibold text-sm">{n.title}</span>
                  <Badge tone={TYPE_TONE[n.type] || 'neutral'} className="!px-2 !py-0">{n.type.replace('_', ' ')}</Badge>
                </div>
                {n.body && <p className="text-sm text-muted mt-1 leading-relaxed">{n.body}</p>}
                <p className="text-[11px] text-muted-dark mt-1.5">{timeAgo(n.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition shrink-0">
                <button onClick={() => toggleRead(n)} title={n.is_read ? 'Mark unread' : 'Mark read'}
                  className="p-2 rounded-lg text-muted hover:text-cream hover:bg-ink-800 transition">
                  <IconCheck size={15} />
                </button>
                <button onClick={() => remove(n)} title="Delete"
                  className="p-2 rounded-lg text-muted hover:text-pole-red hover:bg-ink-800 transition">
                  <IconTrash size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth, useToast } from '../store';
import { api, cn, formatDateTime } from '../util';
import { Avatar, Badge, Button, Field, SectionHead } from '../components/ui';
import { MapPicker } from '../components/Map';
import { IconBell, IconPin, IconUser } from '../icons';

const NOTIFY_CHOICES = [5, 10, 15, 20, 30, 45];

export default function Profile() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [savingInfo, setSavingInfo] = useState(false);
  const [notify, setNotify] = useState(user.notify_minutes);
  const [savingNotify, setSavingNotify] = useState(false);
  const [loc, setLoc] = useState(user.lat != null ? { lat: user.lat, lng: user.lng } : null);
  const [savingLoc, setSavingLoc] = useState(false);
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const [savingPw, setSavingPw] = useState(false);

  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      const d = await api.put('/users/me', form);
      setUser(d.user); localStorage.setItem('fc_user', JSON.stringify(d.user));
      toast('Profile updated ✂️', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setSavingInfo(false); }
  };

  const saveNotify = async (n) => {
    setNotify(n); setSavingNotify(true);
    try {
      const d = await api.put('/users/me', { notify_minutes: n });
      setUser(d.user); localStorage.setItem('fc_user', JSON.stringify(d.user));
      toast(`We'll ping you ~${n} min before your turn`, 'success');
    } catch (e) { toast(e.message, 'error'); setNotify(user.notify_minutes); }
    finally { setSavingNotify(false); }
  };

  const saveLoc = async (value) => {
    setLoc(value); setSavingLoc(true);
    try {
      const d = await api.put('/users/me', { lat: value ? value.lat : null, lng: value ? value.lng : null });
      setUser(d.user); localStorage.setItem('fc_user', JSON.stringify(d.user));
      toast(value ? 'Home pin saved 📍' : 'Location cleared', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setSavingLoc(false); }
  };

  const savePw = async () => {
    setSavingPw(true);
    try {
      await api.put('/users/me', pw);
      setPw({ current_password: '', new_password: '' });
      toast('Password changed 🔒', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setSavingPw(false); }
  };

  const gps = () => {
    if (!navigator.geolocation) return toast('Geolocation is not available here', 'error');
    navigator.geolocation.getCurrentPosition(
      (pos) => saveLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast('Could not get your position — tap the map instead', 'error'),
      { timeout: 8000 }
    );
  };

  return (
    <div className="space-y-6 animate-fadeUp">
      <SectionHead title="Profile" sub="Your account, reminders and location settings." />

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* identity */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} size={56} />
            <div className="min-w-0">
              <div className="font-display font-bold text-lg truncate">{user.name}</div>
              <div className="text-sm text-muted truncate">{user.email}</div>
              <div className="mt-1 flex gap-2">
                <Badge tone={user.role === 'barber' ? 'gold' : 'blue'}>{user.role}</Badge>
                <Badge tone="neutral">joined {formatDateTime(user.created_at)}</Badge>
              </div>
            </div>
          </div>
          <Field label="Display name">
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+254 7xx xxx xxx" />
          </Field>
          <Button onClick={saveInfo} loading={savingInfo} disabled={form.name === user.name && form.phone === (user.phone || '')}>
            Save details
          </Button>
        </div>

        {/* reminders */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/15 text-gold-400"><IconBell size={18} /></div>
            <div>
              <h3 className="font-display font-bold">Turn reminder</h3>
              <p className="text-xs text-muted">How early should we ping you before your turn?</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {NOTIFY_CHOICES.map((n) => (
              <button key={n} onClick={() => saveNotify(n)} disabled={savingNotify}
                className={cn('rounded-xl border px-3 py-3 font-display font-bold transition text-sm',
                  notify === n ? 'bg-gold-500 text-ink-950 border-gold-400 shadow-glow' : 'bg-ink-850 border-ink-700 text-muted hover:text-cream')}>
                {n} min
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-dark leading-relaxed">
            We also send an instant “barber almost done” alert when the client before you is finishing up —
            perfect for timing your walk from the house. 🚶🏾
          </p>
        </div>

        {/* location (clients) */}
        {user.role === 'client' && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pole-blue/15 text-pole-blue"><IconPin size={18} /></div>
              <div>
                <h3 className="font-display font-bold">My base</h3>
                <p className="text-xs text-muted">Used to show how far each shop is from you.</p>
              </div>
            </div>
            <MapPicker value={loc} onChange={saveLoc} height={240} hint="Tap to drop your home pin — drag to fine-tune." />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={gps} loading={savingLoc}>Use my GPS</Button>
              {loc && <Button variant="ghost" size="sm" onClick={() => saveLoc(null)}>Clear pin</Button>}
            </div>
          </div>
        )}

        {/* password */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800 text-muted"><IconUser size={18} /></div>
            <div>
              <h3 className="font-display font-bold">Change password</h3>
              <p className="text-xs text-muted">Keep your queue empire secure.</p>
            </div>
          </div>
          <Field label="Current password">
            <input className="input" type="password" value={pw.current_password}
              onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))} autoComplete="current-password" />
          </Field>
          <Field label="New password">
            <input className="input" type="password" minLength={6} value={pw.new_password}
              onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))} autoComplete="new-password" />
          </Field>
          <Button variant="secondary" onClick={savePw} loading={savingPw} disabled={!pw.current_password || pw.new_password.length < 6}>
            Update password
          </Button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../store';
import { Button, Field } from '../components/ui';
import { IconChair, IconScissors } from '../icons';
import { cn } from '../util';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* brand panel */}
      <div className="relative lg:w-[46%] overflow-hidden flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-ink-800 bg-ink-900/40 p-8 lg:p-12">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #F0A93F 0 2px, transparent 2px 14px)' }} />
        <div className="flex items-center gap-3 relative">
          <div className="barber-pole h-10 w-3 rounded-full border border-white/20" />
          <div>
            <div className="font-display font-bold text-2xl tracking-tight">FreshCut</div>
            <div className="text-xs uppercase tracking-[0.25em] text-muted">skip the wait</div>
          </div>
        </div>

        <div className="relative py-10 lg:py-0">
          <h1 className="font-display font-bold text-4xl lg:text-5xl leading-[1.08] tracking-tight max-w-md">
            The chair is <span className="text-gold-400">waiting</span>. You shouldn't be.
          </h1>
          <p className="mt-5 text-muted max-w-md leading-relaxed">
            See which barbers are free right now, join the queue from home, and we ping you
            <span className="text-cream"> ~20 minutes before your turn</span> — so you arrive exactly on time.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
            {[
              ['Live status', 'Barbers go online like drivers'],
              ['Smart queue', 'Join from anywhere, watch your spot'],
              ['Heads-up', 'Auto reminder before your turn'],
            ].map(([t, d]) => (
              <div key={t} className="card px-3.5 py-3.5">
                <div className="text-gold-400 mb-1.5"><IconScissors size={15} /></div>
                <div className="text-xs font-display font-semibold">{t}</div>
                <div className="text-[11px] text-muted mt-1 leading-snug">{d}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-dark relative">Nairobi · Westlands → Roysambu · 💈</p>
      </div>

      {/* form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fadeUp">
          <div className="flex rounded-xl bg-ink-900 border border-ink-700 p-1 mb-7">
            {['login', 'register'].map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={cn('flex-1 rounded-lg py-2.5 text-sm font-display font-semibold transition',
                  mode === m ? 'bg-gold-500 text-ink-950' : 'text-muted hover:text-cream')}>
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
          {mode === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const doLogin = async (em, pw) => {
    setBusy(true);
    try {
      const user = await login(em, pw);
      toast(`Karibu back, ${user.name.split(' ')[0]} 💈`, 'success');
      navigate(user.role === 'barber' ? '/console' : '/explore');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); doLogin(email, password); }} className="space-y-4">
      <Field label="Email">
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
      </Field>
      <Field label="Password">
        <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy}>Sign in</Button>

      <div className="pt-2">
        <p className="text-[11px] uppercase tracking-widest text-muted-dark mb-2.5 text-center">Try a demo account</p>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" disabled={busy} onClick={() => doLogin('client@freshcut.co.ke', 'demo1234')}
            className="card px-3 py-3 text-left hover:border-pole-blue/50 transition disabled:opacity-50 group">
            <div className="text-xs font-display font-semibold group-hover:text-pole-blue transition">🧔 Demo Client</div>
            <div className="text-[10px] text-muted mt-0.5">client@freshcut.co.ke</div>
          </button>
          <button type="button" disabled={busy} onClick={() => doLogin('barber@freshcut.co.ke', 'demo1234')}
            className="card px-3 py-3 text-left hover:border-gold-500/50 transition disabled:opacity-50 group">
            <div className="text-xs font-display font-semibold group-hover:text-gold-400 transition">💈 Demo Barber</div>
            <div className="text-[10px] text-muted mt-0.5">barber@freshcut.co.ke</div>
          </button>
        </div>
        <p className="text-center text-[10px] text-muted-dark mt-3">password for all demo accounts: demo1234</p>
      </div>
    </form>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'client' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await register(form);
      toast(user.role === 'barber' ? 'Welcome, barber! Set up your shop to go live.' : 'Karibu! Find a free chair near you.', 'success');
      navigate(user.role === 'barber' ? '/console' : '/explore');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { role: 'client', emoji: '🧔', title: 'I need a cut', sub: 'Find barbers & join queues' },
          { role: 'barber', emoji: '💈', title: "I'm a barber", sub: 'Get clients & manage a queue' },
        ].map((opt) => (
          <button type="button" key={opt.role} onClick={() => setForm((f) => ({ ...f, role: opt.role }))}
            className={cn('card px-4 py-4 text-left transition border-2',
              form.role === opt.role ? 'border-gold-500/60 bg-gold-500/5 shadow-glow' : 'hover:border-ink-600')}>
            <div className="text-2xl">{opt.emoji}</div>
            <div className="mt-2 font-display font-semibold text-sm">{opt.title}</div>
            <div className="text-[11px] text-muted mt-0.5 leading-snug">{opt.sub}</div>
          </button>
        ))}
      </div>
      <Field label="Full name">
        <input className="input" required value={form.name} onChange={set('name')} placeholder={form.role === 'barber' ? 'e.g. Kevin Otieno' : 'e.g. Brian Mwangi'} />
      </Field>
      <Field label="Email">
        <input className="input" type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
      </Field>
      <Field label="Phone" hint="M-Pesa style numbers welcome — used for quick contact only.">
        <input className="input" value={form.phone} onChange={set('phone')} placeholder="+254 7xx xxx xxx" />
      </Field>
      <Field label="Password" hint="At least 6 characters.">
        <input className="input" type="password" required minLength={6} value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete="new-password" />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        {form.role === 'barber' ? 'Open my shop 💈' : 'Start cutting the wait ✂️'}
      </Button>
    </form>
  );
}

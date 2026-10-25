import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi, useToast } from '../../store';
import { api, cn, KES } from '../../util';
import { Button, CardSkeleton, ConfirmModal, EmptyState, Field, SectionHead } from '../../components/ui';
import { MapPicker } from '../../components/Map';
import { IconCheck, IconEdit, IconPin, IconPlus, IconRazor, IconStore, IconTrash } from '../../icons';

const AVG_CHOICES = [15, 20, 25, 30, 45];

const emptyForm = { name: '', area: '', address: '', phone: '', description: '', avg_cut_minutes: 25 };
const emptySvc = { name: '', price_kes: '', duration_min: 20 };

export default function ShopSettings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data, loading, setData, refetch } = useApi('/shops?mine=1');
  const shop = data?.shops?.[0] || null;

  const [form, setForm] = useState(emptyForm);
  const [pin, setPin] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const [svc, setSvc] = useState(emptySvc);
  const [addingSvc, setAddingSvc] = useState(false);
  const [editSvcId, setEditSvcId] = useState(null);
  const [editSvc, setEditSvc] = useState(emptySvc);

  useEffect(() => {
    if (shop) {
      setForm({
        name: shop.name, area: shop.area || '', address: shop.address || '',
        phone: shop.phone || '', description: shop.description || '', avg_cut_minutes: shop.avg_cut_minutes,
      });
      setPin(shop.lat != null ? { lat: shop.lat, lng: shop.lng } : null);
    }
  }, [shop?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) {
    return <div className="space-y-4"><CardSkeleton lines={4} /><CardSkeleton lines={4} /></div>;
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!pin) return toast('Pin your shop on the map so clients can find you 📍', 'error');
    setSaving(true);
    const payload = { ...form, lat: pin.lat, lng: pin.lng };
    try {
      if (shop) {
        const d = await api.put(`/shops/${shop.id}`, payload);
        setData({ shops: [d.shop] });
        toast('Shop updated ✅', 'success');
      } else {
        const d = await api.post('/shops', payload);
        setData({ shops: [d.shop] });
        toast('Shop registered! Add your services, then go Online from Chair Control 💈', 'success', 5000);
      }
    } catch (e) {
      toast(e.message, 'error');
    } finally { setSaving(false); }
  };

  const addService = async () => {
    setAddingSvc(true);
    try {
      const d = await api.post(`/shops/${shop.id}/services`, {
        name: svc.name, price_kes: Number(svc.price_kes) || 0, duration_min: Number(svc.duration_min) || 20,
      });
      setData({ shops: [{ ...shop, services: [...shop.services, d.service].sort((a, b) => a.price_kes - b.price_kes) }] });
      setSvc(emptySvc);
      toast('Service added', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setAddingSvc(false); }
  };

  const saveService = async () => {
    try {
      const d = await api.put(`/shops/${shop.id}/services/${editSvcId}`, {
        name: editSvc.name, price_kes: Number(editSvc.price_kes) || 0, duration_min: Number(editSvc.duration_min) || 20,
      });
      setData({ shops: [{ ...shop, services: shop.services.map((s) => (s.id === editSvcId ? d.service : s)) }] });
      setEditSvcId(null);
      toast('Service updated', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const deleteService = async (s) => {
    setData({ shops: [{ ...shop, services: shop.services.filter((x) => x.id !== s.id) }] });
    try { await api.del(`/shops/${shop.id}/services/${s.id}`); toast(`Deleted “${s.name}”`, 'success'); }
    catch (e) { toast(e.message, 'error'); refetch(true); }
  };

  const deleteShop = async () => {
    setDeleting(true);
    try {
      await api.del(`/shops/${shop.id}`);
      setData({ shops: [] });
      toast('Shop deleted. You can register a new one any time.', 'success');
      navigate('/console');
    } catch (e) { toast(e.message, 'error'); } finally { setDeleting(false); setConfirmDel(false); }
  };

  return (
    <div className="space-y-6 animate-fadeUp">
      <SectionHead
        title={shop ? 'My Shop' : 'Register your shop'}
        sub={shop ? 'Keep your details fresh — clients see this on the map.' : 'One shop per barber account. Pin it, price it, go live.'}
      />

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* details form */}
        <div className="card p-6 space-y-4">
          <h3 className="font-display font-bold text-lg flex items-center gap-2"><IconStore size={17} className="text-gold-400" /> Shop details</h3>
          <Field label="Shop name">
            <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Kevo's Classic Cuts" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Area / Estate">
              <input className="input" value={form.area} onChange={set('area')} placeholder="Westlands" />
            </Field>
            <Field label="Phone">
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="+254 7xx xxx xxx" />
            </Field>
          </div>
          <Field label="Street landmark">
            <input className="input" value={form.address} onChange={set('address')} placeholder="Woodvale Grove, opp. Sarit Centre" />
          </Field>
          <Field label="Description" hint="Your vibe, your specialties — shown on your shop card.">
            <textarea className="input min-h-[90px] resize-y" value={form.description} onChange={set('description')}
              placeholder="Sharp fades, hot towel shaves, clean beard lines…" />
          </Field>
          <Field label="Average time per cut" hint="Used to estimate queue wait times.">
            <div className="flex gap-2 flex-wrap">
              {AVG_CHOICES.map((m) => (
                <button key={m} type="button" onClick={() => setForm((f) => ({ ...f, avg_cut_minutes: m }))}
                  className={cn('rounded-xl border px-3.5 py-2 text-sm font-display font-bold transition',
                    Number(form.avg_cut_minutes) === m ? 'bg-gold-500 text-ink-950 border-gold-400' : 'bg-ink-850 border-ink-700 text-muted hover:text-cream')}>
                  {m} min
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* map + save */}
        <div className="space-y-5 lg:sticky lg:top-24">
          <div className="card p-6 space-y-4">
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><IconPin size={17} className="text-pole-blue" /> Location pin</h3>
            <MapPicker value={pin} onChange={setPin} height={280} />
          </div>
          <Button size="lg" className="w-full" onClick={save} loading={saving}
            disabled={!form.name || form.name.trim().length < 3 || !pin}>
            <IconCheck size={16} /> {shop ? 'Save changes' : 'Register shop'}
          </Button>
          {!shop && <p className="text-center text-xs text-muted-dark">After registering, add services below & go online from Chair Control.</p>}
        </div>
      </div>

      {/* services CRUD */}
      {shop ? (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><IconRazor size={17} className="text-gold-400" /> Services & prices</h3>
            <span className="text-xs text-muted-dark">{shop.services.length} service{shop.services.length === 1 ? '' : 's'}</span>
          </div>

          {shop.services.length === 0 && (
            <p className="rounded-xl border border-dashed border-ink-700 px-4 py-6 text-center text-sm text-muted mb-4">
              No services yet — add your “Signature Fade” below so clients know what to queue for.
            </p>
          )}

          <div className="space-y-2">
            {shop.services.map((s) => (
              <div key={s.id}>
                {editSvcId === s.id ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/5 px-3 py-3">
                    <input className="input !w-44" value={editSvc.name} onChange={(e) => setEditSvc((v) => ({ ...v, name: e.target.value }))} />
                    <input className="input !w-28" type="number" min="0" value={editSvc.price_kes} onChange={(e) => setEditSvc((v) => ({ ...v, price_kes: e.target.value }))} placeholder="KES" />
                    <input className="input !w-24" type="number" min="5" value={editSvc.duration_min} onChange={(e) => setEditSvc((v) => ({ ...v, duration_min: e.target.value }))} placeholder="min" />
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" onClick={saveService}><IconCheck size={13} /> Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditSvcId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-850 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm">{s.name}</span>
                      <span className="text-xs text-muted-dark ml-2.5">~{s.duration_min} min</span>
                    </div>
                    <span className="font-display font-bold text-gold-400 text-sm shrink-0">{KES(s.price_kes)}</span>
                    <button onClick={() => { setEditSvcId(s.id); setEditSvc({ name: s.name, price_kes: s.price_kes, duration_min: s.duration_min }); }}
                      className="p-2 rounded-lg text-muted hover:text-cream hover:bg-ink-800 transition lg:opacity-0 lg:group-hover:opacity-100" title="Edit">
                      <IconEdit size={14} />
                    </button>
                    <button onClick={() => deleteService(s)}
                      className="p-2 rounded-lg text-muted hover:text-pole-red hover:bg-ink-800 transition lg:opacity-0 lg:group-hover:opacity-100" title="Delete">
                      <IconTrash size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* add form */}
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-ink-700 bg-ink-900 px-3 py-3">
            <input className="input !w-48" placeholder="Service name" value={svc.name} onChange={(e) => setSvc((v) => ({ ...v, name: e.target.value }))} />
            <input className="input !w-28" type="number" min="0" placeholder="KES" value={svc.price_kes} onChange={(e) => setSvc((v) => ({ ...v, price_kes: e.target.value }))} />
            <input className="input !w-24" type="number" min="5" step="5" placeholder="min" value={svc.duration_min} onChange={(e) => setSvc((v) => ({ ...v, duration_min: e.target.value }))} />
            <Button size="sm" variant="secondary" onClick={addService} loading={addingSvc} disabled={svc.name.trim().length < 2}>
              <IconPlus size={14} /> Add service
            </Button>
          </div>
        </div>
      ) : (
        <EmptyState icon={<IconRazor size={26} />} title="Services unlock after registration"
          body="Save your shop first, then build your price list — fades, shaves, beard work, the lot." />
      )}

      {/* danger zone */}
      {shop && (
        <div className="card p-6 border-pole-red/30">
          <h3 className="font-display font-bold text-lg text-pole-red">Danger zone</h3>
          <p className="text-sm text-muted mt-1 mb-4">Deleting your shop removes its services, queue history and map presence. This cannot be undone.</p>
          <Button variant="danger" onClick={() => setConfirmDel(true)}><IconTrash size={15} /> Delete my shop</Button>
        </div>
      )}

      <ConfirmModal open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={deleteShop}
        title={`Delete ${shop?.name}?`} danger confirmLabel="Yes, delete it" loading={deleting}
        body="Everything tied to this shop — services, queues, the map pin — disappears for good. Clients won't see you anymore." />
    </div>
  );
}

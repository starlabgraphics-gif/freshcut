const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const sse = require('./sse');
const { authRequired, requireRole, publicUser } = require('./auth');
const { getQueue, annotateQueue, shopWithLive, etaMinutes } = require('./util');

const router = express.Router();
const nowIso = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// ---------------------------------------------------------------- notifications
function notify(userId, shopId, type, title, body) {
  const info = db
    .prepare('INSERT INTO notifications (user_id, shop_id, type, title, body) VALUES (?,?,?,?,?)')
    .run(userId, shopId || null, type, title, body || '');
  const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(info.lastInsertRowid);
  sse.emit(userId, 'notify', row);
  return row;
}

// Push a "queue changed" event to the owner and every app client in that queue,
// and fire ETA-drop reminders ("you are ~20 minutes out").
function broadcastQueue(shop) {
  const queue = getQueue(shop.id);
  awaitReminders(shop, queue);
  const userIds = [shop.owner_id, ...queue.filter((q) => q.user_id).map((q) => q.user_id)];
  sse.emitMany([...new Set(userIds)], 'queue', { shop_id: shop.id });
  sse.emit(shop.owner_id, 'shop', { shop_id: shop.id }); // owner's dashboard refresh
  sse.emitMany([...new Set(queue.filter((q) => q.user_id).map((q) => q.user_id))], 'shop', { shop_id: shop.id });
}

function awaitReminders(shop, queue) {
  const serv = getQueue(shop.id);
  for (const q of serv) {
    if (q.status !== 'waiting' || !q.user_id || q.reminded_eta) continue;
    const user = db.prepare('SELECT notify_minutes FROM users WHERE id = ?').get(q.user_id);
    const threshold = user ? user.notify_minutes : 20;
    const eta = etaMinutes(shop, q, serv);
    if (eta <= threshold) {
      db.prepare('UPDATE queue_entries SET reminded_eta = 1 WHERE id = ?').run(q.id);
      notify(
        q.user_id,
        shop.id,
        'eta',
        `⏳ ~${eta} min to your turn`,
        `${shop.name}: Get moving — you'll be in the chair in about ${eta} minutes (your reminder is set for ${threshold} min out).`
      );
    }
  }
}

// ---------------------------------------------------------------- profile
router.get('/users/me', authRequired, (req, res) => res.json({ user: publicUser(req.user) }));

router.put('/users/me', authRequired, (req, res) => {
  const { name, phone, notify_minutes, lat, lng, current_password, new_password } = req.body || {};
  const updates = [];
  const params = [];
  if (name !== undefined) {
    if (String(name).trim().length < 2) return res.status(400).json({ error: 'Name is too short' });
    updates.push('name = ?'); params.push(String(name).trim());
  }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(String(phone)); }
  if (notify_minutes !== undefined) {
    const n = Number(notify_minutes);
    if (![5, 10, 15, 20, 30, 45].includes(n)) return res.status(400).json({ error: 'Reminder must be 5–45 minutes' });
    updates.push('notify_minutes = ?'); params.push(n);
  }
  if (lat !== undefined) { updates.push('lat = ?'); params.push(lat === null ? null : Number(lat)); }
  if (lng !== undefined) { updates.push('lng = ?'); params.push(lng === null ? null : Number(lng)); }
  if (new_password) {
    if (!bcrypt.compareSync(String(current_password || ''), req.user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    updates.push('password_hash = ?'); params.push(bcrypt.hashSync(new_password, 10));
  }
  if (!updates.length) return res.json({ user: publicUser(req.user) });
  params.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

// ---------------------------------------------------------------- shops
router.get('/shops', authRequired, (req, res) => {
  let rows;
  if (req.query.mine === '1') {
    rows = db.prepare('SELECT * FROM shops WHERE owner_id = ? ORDER BY created_at').all(req.user.id);
  } else {
    rows = db.prepare('SELECT * FROM shops ORDER BY name').all();
  }
  res.json({ shops: rows.map((s) => shopWithLive(s, req.user.lat, req.user.lng)) });
});

router.post('/shops', authRequired, requireRole('barber'), (req, res) => {
  const existing = db.prepare('SELECT id FROM shops WHERE owner_id = ?').get(req.user.id);
  if (existing) return res.status(409).json({ error: 'You already have a shop. One shop per barber account — edit it instead.' });
  const { name, description, area, address, phone, lat, lng, avg_cut_minutes } = req.body || {};
  if (!name || String(name).trim().length < 3) return res.status(400).json({ error: 'Shop name must be at least 3 characters' });
  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    return res.status(400).json({ error: 'Pin your shop location on the map so clients can find you' });
  }
  const info = db
    .prepare(`INSERT INTO shops (owner_id, name, description, area, address, phone, lat, lng, avg_cut_minutes)
              VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(
      req.user.id, String(name).trim(), String(description || ''), String(area || ''),
      String(address || ''), String(phone || req.user.phone || ''),
      Number(lat), Number(lng), Math.max(5, Math.min(90, Number(avg_cut_minutes) || 25))
    );
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ shop: shopWithLive(shop, req.user.lat, req.user.lng) });
});

router.get('/shops/:id', authRequired, (req, res) => {
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  const data = shopWithLive(shop, req.user.lat, req.user.lng);
  if (shop.owner_id === req.user.id) data.queue = annotateQueue(shop, getQueue(shop.id));
  res.json({ shop: data });
});

router.put('/shops/:id', authRequired, requireRole('barber'), (req, res) => {
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  if (shop.owner_id !== req.user.id) return res.status(403).json({ error: 'That is not your shop' });
  const { name, description, area, address, phone, lat, lng, avg_cut_minutes, status_message } = req.body || {};
  if (name !== undefined && String(name).trim().length < 3) return res.status(400).json({ error: 'Shop name too short' });
  db.prepare(`UPDATE shops SET name=?, description=?, area=?, address=?, phone=?, lat=?, lng=?, avg_cut_minutes=?, status_message=?, updated_at=datetime('now')
              WHERE id = ?`).run(
    name !== undefined ? String(name).trim() : shop.name,
    description !== undefined ? String(description) : shop.description,
    area !== undefined ? String(area) : shop.area,
    address !== undefined ? String(address) : shop.address,
    phone !== undefined ? String(phone) : shop.phone,
    lat !== undefined ? Number(lat) : shop.lat,
    lng !== undefined ? Number(lng) : shop.lng,
    avg_cut_minutes !== undefined ? Math.max(5, Math.min(90, Number(avg_cut_minutes) || 25)) : shop.avg_cut_minutes,
    status_message !== undefined ? String(status_message) : shop.status_message,
    shop.id
  );
  const updated = db.prepare('SELECT * FROM shops WHERE id = ?').get(shop.id);
  broadcastQueue(updated);
  res.json({ shop: shopWithLive(updated, req.user.lat, req.user.lng) });
});

router.delete('/shops/:id', authRequired, requireRole('barber'), (req, res) => {
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  if (shop.owner_id !== req.user.id) return res.status(403).json({ error: 'That is not your shop' });
  db.prepare('DELETE FROM shops WHERE id = ?').run(shop.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- services
router.post('/shops/:id/services', authRequired, requireRole('barber'), (req, res) => {
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
  if (!shop || shop.owner_id !== req.user.id) return res.status(404).json({ error: 'Shop not found' });
  const { name, price_kes, duration_min } = req.body || {};
  if (!name || String(name).trim().length < 2) return res.status(400).json({ error: 'Service needs a name' });
  const info = db
    .prepare('INSERT INTO services (shop_id, name, price_kes, duration_min) VALUES (?,?,?,?)')
    .run(shop.id, String(name).trim(), Math.max(0, Number(price_kes) || 0), Math.max(5, Math.min(180, Number(duration_min) || 20)));
  res.status(201).json({ service: db.prepare('SELECT * FROM services WHERE id = ?').get(info.lastInsertRowid) });
});

router.put('/shops/:id/services/:sid', authRequired, requireRole('barber'), (req, res) => {
  const svc = db.prepare('SELECT s.*, sh.owner_id FROM services s JOIN shops sh ON sh.id = s.shop_id WHERE s.id = ? AND s.shop_id = ?')
    .get(req.params.sid, req.params.id);
  if (!svc || svc.owner_id !== req.user.id) return res.status(404).json({ error: 'Service not found' });
  const { name, price_kes, duration_min } = req.body || {};
  db.prepare('UPDATE services SET name=?, price_kes=?, duration_min=? WHERE id=?').run(
    name !== undefined ? String(name).trim() : svc.name,
    price_kes !== undefined ? Math.max(0, Number(price_kes) || 0) : svc.price_kes,
    duration_min !== undefined ? Math.max(5, Math.min(180, Number(duration_min) || 20)) : svc.duration_min,
    svc.id
  );
  res.json({ service: db.prepare('SELECT * FROM services WHERE id = ?').get(svc.id) });
});

router.delete('/shops/:id/services/:sid', authRequired, requireRole('barber'), (req, res) => {
  const svc = db.prepare('SELECT s.*, sh.owner_id FROM services s JOIN shops sh ON sh.id = s.shop_id WHERE s.id = ? AND s.shop_id = ?')
    .get(req.params.sid, req.params.id);
  if (!svc || svc.owner_id !== req.user.id) return res.status(404).json({ error: 'Service not found' });
  db.prepare('DELETE FROM services WHERE id = ?').run(svc.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- chair + queue actions
router.post('/shops/:id/actions', authRequired, requireRole('barber'), (req, res) => {
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
  if (!shop || shop.owner_id !== req.user.id) return res.status(404).json({ error: 'Shop not found' });
  const { action } = req.body || {};

  const serving = db.prepare(`SELECT * FROM queue_entries WHERE shop_id = ? AND status = 'serving'`).get(shop.id);
  const nextWaiting = db.prepare(`SELECT * FROM queue_entries WHERE shop_id = ? AND status = 'waiting' ORDER BY joined_at ASC`).get(shop.id);

  switch (action) {
    case 'open':
      db.prepare(`UPDATE shops SET is_open = 1, status_message = COALESCE(NULLIF(status_message,''), 'Chair is free — walk in!'), updated_at = datetime('now') WHERE id = ?`).run(shop.id);
      break;
    case 'close':
      db.prepare(`UPDATE shops SET is_open = 0, updated_at = datetime('now') WHERE id = ?`).run(shop.id);
      break;
    case 'seat_next': {
      if (serving) return res.status(409).json({ error: 'Finish the current client first — someone is already in the chair' });
      if (!nextWaiting) return res.status(409).json({ error: 'Queue is empty' });
      db.prepare(`UPDATE queue_entries SET status = 'serving', started_at = ? WHERE id = ?`).run(nowIso(), nextWaiting.id);
      db.prepare(`UPDATE shops SET chair_status = 'busy', updated_at = datetime('now') WHERE id = ?`).run(shop.id);
      if (nextWaiting.user_id) {
        notify(nextWaiting.user_id, shop.id, 'turn', `💈 You're up at ${shop.name}!`, 'Head to the chair — the barber is ready for you.');
      }
      break;
    }
    case 'walkin': {
      if (!shop.is_open) return res.status(409).json({ error: 'Go Online first before adding walk-ins' });
      const n = db.prepare(`SELECT COUNT(*) c FROM queue_entries WHERE shop_id = ? AND kind = 'walkin'`).get(shop.id).c + 1;
      db.prepare(`INSERT INTO queue_entries (shop_id, client_name, kind, status) VALUES (?,?,?, 'waiting')`)
        .run(shop.id, `Walk-in #${n}`, 'walkin');
      break;
    }
    case 'almost_done': {
      if (!serving) return res.status(409).json({ error: 'No one is in the chair right now' });
      db.prepare(`UPDATE shops SET chair_status = 'almost_done', updated_at = datetime('now') WHERE id = ?`).run(shop.id);
      if (nextWaiting && nextWaiting.user_id && !nextWaiting.reminded_almost) {
        db.prepare('UPDATE queue_entries SET reminded_almost = 1 WHERE id = ?').run(nextWaiting.id);
        notify(
          nextWaiting.user_id, shop.id, 'almost_done',
          `✂️ Barber almost done at ${shop.name}`,
          `${serving.client_name} is finishing up. Start heading over — your turn is next!`
        );
      }
      break;
    }
    case 'done_next': {
      if (!serving) return res.status(409).json({ error: 'No one is in the chair right now' });
      db.prepare(`UPDATE queue_entries SET status = 'done', done_at = ? WHERE id = ?`).run(nowIso(), serving.id);
      if (serving.user_id) {
        notify(serving.user_id, shop.id, 'done', `✅ Fresh cut complete at ${shop.name}`, 'Enjoy the fresh look! Come back soon.');
      }
      if (nextWaiting) {
        db.prepare(`UPDATE queue_entries SET status = 'serving', started_at = ? WHERE id = ?`).run(nowIso(), nextWaiting.id);
        db.prepare(`UPDATE shops SET chair_status = 'busy', updated_at = datetime('now') WHERE id = ?`).run(shop.id);
        if (nextWaiting.user_id) {
          notify(nextWaiting.user_id, shop.id, 'turn', `💈 You're up at ${shop.name}!`, 'The chair is yours — head over now.');
        }
      } else {
        db.prepare(`UPDATE shops SET chair_status = 'idle', updated_at = datetime('now') WHERE id = ?`).run(shop.id);
      }
      break;
    }
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }

  const updated = db.prepare('SELECT * FROM shops WHERE id = ?').get(shop.id);
  broadcastQueue(updated);
  res.json({ shop: shopWithLive(updated, req.user.lat, req.user.lng), queue: annotateQueue(updated, getQueue(shop.id)) });
});

// ---------------------------------------------------------------- queue membership (client)
router.post('/shops/:id/join', authRequired, requireRole('client'), (req, res) => {
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  if (!shop.is_open) return res.status(409).json({ error: `${shop.name} is offline right now` });

  const active = db.prepare(`SELECT q.* FROM queue_entries q WHERE q.user_id = ? AND q.status IN ('waiting','serving')`).get(req.user.id);
  if (active) {
    const other = db.prepare('SELECT name FROM shops WHERE id = ?').get(active.shop_id);
    return res.status(409).json({ error: `You're already in a queue at ${other ? other.name : 'another shop'} — leave that one first` });
  }

  const { service_id } = req.body || {};
  let svc = null;
  if (service_id) {
    svc = db.prepare('SELECT * FROM services WHERE id = ? AND shop_id = ?').get(service_id, shop.id);
    if (!svc) return res.status(400).json({ error: 'Service not found at this shop' });
  }

  const info = db
    .prepare(`INSERT INTO queue_entries (shop_id, user_id, client_name, kind, service_id, status) VALUES (?,?,?,?,?,'waiting')`)
    .run(shop.id, req.user.id, req.user.name, 'app', svc ? svc.id : null);

  notify(shop.owner_id, shop.id, 'booking', `📥 New client in queue`, `${req.user.name} just joined your queue${svc ? ` for ${svc.name} (KES ${svc.price_kes})` : ''}.`);
  broadcastQueue(shop);
  const entry = db.prepare('SELECT * FROM queue_entries WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ entry, shop: shopWithLive(shop, req.user.lat, req.user.lng) });
});

router.get('/queue/mine', authRequired, requireRole('client'), (req, res) => {
  const active = db
    .prepare(
      `SELECT q.*, sh.name AS shop_name, sh.area AS shop_area, sh.address AS shop_address, sh.lat AS shop_lat, sh.lng AS shop_lng,
              sh.chair_status AS shop_chair_status, sh.avg_cut_minutes, sh.phone AS shop_phone, sh.status_message AS shop_status_message,
              s.name AS service_name, s.price_kes AS service_price
       FROM queue_entries q
       JOIN shops sh ON sh.id = q.shop_id
       LEFT JOIN services s ON s.id = q.service_id
       WHERE q.user_id = ? AND q.status IN ('waiting','serving')`
    )
    .get(req.user.id);

  let annotated = null;
  if (active) {
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(active.shop_id);
    const queue = getQueue(shop.id);
    const meta = annotateQueue(shop, queue).find((q) => q.id === active.id);
    annotated = { ...active, position: meta ? meta.position : 1, eta_minutes: meta ? meta.eta_minutes : 0 };
  }

  const history = db
    .prepare(
      `SELECT q.*, sh.name AS shop_name, sh.area AS shop_area, s.name AS service_name, s.price_kes AS service_price
       FROM queue_entries q
       JOIN shops sh ON sh.id = q.shop_id
       LEFT JOIN services s ON s.id = q.service_id
       WHERE q.user_id = ? AND q.status IN ('done','cancelled','no_show')
       ORDER BY q.joined_at DESC LIMIT 30`
    )
    .all(req.user.id);

  res.json({ active: annotated, history });
});

// Leave / manage a queue entry
router.patch('/queue/:id', authRequired, (req, res) => {
  const entry = db.prepare('SELECT * FROM queue_entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Queue entry not found' });
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(entry.shop_id);
  const { status } = req.body || {};

  if (req.user.role === 'client') {
    if (entry.user_id !== req.user.id) return res.status(403).json({ error: 'Not your queue spot' });
    if (entry.status !== 'waiting') return res.status(409).json({ error: 'You can only leave while waiting — you are in the chair!' });
    if (status !== 'cancelled') return res.status(400).json({ error: 'Invalid status' });
    db.prepare(`UPDATE queue_entries SET status = 'cancelled' WHERE id = ?`).run(entry.id);
    notify(shop.owner_id, shop.id, 'cancel', '👋 Client left the queue', `${entry.client_name} left your queue at ${shop.name}.`);
  } else {
    if (shop.owner_id !== req.user.id) return res.status(403).json({ error: 'That is not your shop' });
    if (!['no_show', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (!['waiting'].includes(entry.status)) return res.status(409).json({ error: 'Only waiting clients can be removed' });
    db.prepare('UPDATE queue_entries SET status = ? WHERE id = ?').run(status, entry.id);
    if (entry.user_id) {
      notify(entry.user_id, shop.id, 'removed',
        status === 'no_show' ? `⏰ Marked as no-show at ${shop.name}` : `Removed from the queue at ${shop.name}`,
        status === 'no_show' ? 'The barber waited but you did not show. Join again when you are close!' : 'The barber removed you from the queue.');
    }
  }
  broadcastQueue(shop);
  res.json({ ok: true });
});

router.delete('/queue/:id', authRequired, requireRole('barber'), (req, res) => {
  const entry = db.prepare('SELECT * FROM queue_entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Queue entry not found' });
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(entry.shop_id);
  if (shop.owner_id !== req.user.id) return res.status(403).json({ error: 'That is not your shop' });
  if (entry.status === 'serving') return res.status(409).json({ error: 'Finish the current client instead of deleting them' });
  if (['waiting'].includes(entry.status)) {
    if (entry.user_id) notify(entry.user_id, shop.id, 'removed', `Removed from the queue at ${shop.name}`, 'The barber removed you from the queue.');
    db.prepare(`UPDATE queue_entries SET status = 'cancelled' WHERE id = ?`).run(entry.id);
    broadcastQueue(shop);
  } else {
    db.prepare('DELETE FROM queue_entries WHERE id = ?').run(entry.id); // cleaning history
  }
  res.json({ ok: true });
});

// Shop queue view (owner)
router.get('/shops/:id/queue', authRequired, requireRole('barber'), (req, res) => {
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
  if (!shop || shop.owner_id !== req.user.id) return res.status(404).json({ error: 'Shop not found' });
  res.json({ queue: annotateQueue(shop, getQueue(shop.id)) });
});

// ---------------------------------------------------------------- notifications
router.get('/notifications', authRequired, (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50').all(req.user.id);
  const unread = db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).c;
  res.json({ notifications: rows, unread });
});

router.patch('/notifications/:id', authRequired, (req, res) => {
  const info = db.prepare('UPDATE notifications SET is_read = ? WHERE id = ? AND user_id = ?')
    .run(req.body && req.body.is_read ? 1 : 0, req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Notification not found' });
  res.json({ ok: true });
});

router.post('/notifications/read-all', authRequired, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

router.delete('/notifications/:id', authRequired, (req, res) => {
  const info = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Notification not found' });
  res.json({ ok: true });
});

module.exports = router;

// Shared helpers: distance, ETA math, queue shaping.
const db = require('./db');

function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v === null || v === undefined)) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// Live queue ordered with the serving client first (if any).
function getQueue(shopId) {
  return db
    .prepare(
      `SELECT q.*, u.phone AS client_phone,
              s.name AS service_name, s.price_kes AS service_price
       FROM queue_entries q
       LEFT JOIN users u ON u.id = q.user_id
       LEFT JOIN services s ON s.id = q.service_id
       WHERE q.shop_id = ? AND q.status IN ('serving','waiting')
       ORDER BY CASE q.status WHEN 'serving' THEN 0 ELSE 1 END, q.joined_at ASC`
    )
    .all(Number(shopId));
}

// Minutes until `entry` reaches the chair, given the shop state and queue.
function etaMinutes(shop, entry, queue) {
  const serving = queue.find((q) => q.status === 'serving');
  let remaining = 0;
  if (serving) {
    const elapsed = serving.started_at
      ? (Date.now() - new Date(serving.started_at.replace(' ', 'T') + 'Z').getTime()) / 60000
      : 0;
    if (shop.chair_status === 'almost_done') remaining = Math.max(2, Math.min(8, shop.avg_cut_minutes - elapsed));
    else remaining = Math.max(4, Math.round(shop.avg_cut_minutes - elapsed));
  }
  if (entry.status === 'serving') return 0;
  const ahead = queue.filter((q) => q.status === 'waiting' && q.joined_at < entry.joined_at).length;
  return Math.round(remaining + ahead * shop.avg_cut_minutes);
}

// Estimated wait for a NEW client joining right now.
function nextSlotEta(shop, queue) {
  const waiting = queue.filter((q) => q.status === 'waiting').length;
  const serving = queue.find((q) => q.status === 'serving');
  let remaining = 0;
  if (serving) {
    const elapsed = serving.started_at
      ? (Date.now() - new Date(serving.started_at.replace(' ', 'T') + 'Z').getTime()) / 60000
      : 0;
    if (shop.chair_status === 'almost_done') remaining = Math.max(2, Math.min(8, shop.avg_cut_minutes - elapsed));
    else remaining = Math.max(4, Math.round(shop.avg_cut_minutes - elapsed));
  } else if (shop.is_open) {
    return 0; // chair is free
  }
  return Math.round(remaining + waiting * shop.avg_cut_minutes);
}

function annotateQueue(shop, queue) {
  return queue.map((q) => ({
    ...q,
    position: q.status === 'serving' ? 0 : queue.filter((o) => o.status === 'waiting' && o.joined_at < q.joined_at).length + 1,
    eta_minutes: etaMinutes(shop, q, queue),
  }));
}

function shopWithLive(shop, viewerLat, viewerLng) {
  const queue = getQueue(shop.id);
  const waiting = queue.filter((q) => q.status === 'waiting').length;
  const serving = queue.find((q) => q.status === 'serving');
  const services = db.prepare('SELECT * FROM services WHERE shop_id = ? ORDER BY price_kes').all(shop.id);
  const owner = db.prepare('SELECT id, name, phone FROM users WHERE id = ?').get(shop.owner_id);
  return {
    ...shop,
    is_open: !!shop.is_open,
    queue_count: waiting,
    is_busy: !!serving,
    serving_started_at: serving ? serving.started_at : null,
    serving_name: serving ? serving.client_name : null,
    est_wait_minutes: nextSlotEta(shop, queue),
    distance_km: haversineKm(viewerLat, viewerLng, shop.lat, shop.lng),
    services,
    owner_name: owner ? owner.name : null,
  };
}

module.exports = { haversineKm, getQueue, etaMinutes, nextSlotEta, annotateQueue, shopWithLive };

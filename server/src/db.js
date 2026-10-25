const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'freshcut.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('client','barber')),
  phone TEXT DEFAULT '',
  notify_minutes INTEGER NOT NULL DEFAULT 20,
  lat REAL,
  lng REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  area TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  lat REAL,
  lng REAL,
  avg_cut_minutes INTEGER NOT NULL DEFAULT 25,
  is_open INTEGER NOT NULL DEFAULT 0,
  chair_status TEXT NOT NULL DEFAULT 'idle' CHECK(chair_status IN ('idle','busy','almost_done')),
  status_message TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_kes INTEGER NOT NULL DEFAULT 0,
  duration_min INTEGER NOT NULL DEFAULT 20,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS queue_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_name TEXT DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'app' CHECK(kind IN ('app','walkin')),
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','serving','done','cancelled','no_show')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  done_at TEXT,
  reminded_eta INTEGER NOT NULL DEFAULT 0,
  reminded_almost INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_queue_shop ON queue_entries(shop_id, status, joined_at);
CREATE INDEX IF NOT EXISTS idx_queue_user ON queue_entries(user_id, status);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read, created_at);
`);

// ---------- helpers ----------
const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString().replace('T', ' ').slice(0, 19);
const nowIso = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return false;

  const hash = bcrypt.hashSync('demo1234', 10);
  const insUser = db.prepare(`INSERT INTO users (name, email, password_hash, role, phone, notify_minutes, lat, lng)
    VALUES (?,?,?,?,?,?,?,?)`);

  const tx = db.transaction(() => {
    // ---- barbers ----
    const b1 = insUser.run('Kevin Otieno', 'barber@freshcut.co.ke', hash, 'barber', '+254 712 345 001', 20, null, null).lastInsertRowid;
    const b2 = insUser.run('Marcus Maina', 'marcus@freshcut.co.ke', hash, 'barber', '+254 712 345 002', 20, null, null).lastInsertRowid;
    const b3 = insUser.run('Dennis Kiprop', 'dennis@freshcut.co.ke', hash, 'barber', '+254 712 345 003', 20, null, null).lastInsertRowid;
    const b4 = insUser.run('Sam Waweru', 'sam@freshcut.co.ke', hash, 'barber', '+254 712 345 004', 20, null, null).lastInsertRowid;
    const b5 = insUser.run('Ali Hassan', 'ali@freshcut.co.ke', hash, 'barber', '+254 712 345 005', 20, null, null).lastInsertRowid;

    // ---- clients ----
    const c1 = insUser.run('Demo Client', 'client@freshcut.co.ke', hash, 'client', '+254 722 100 001', 20, -1.2761, 36.7671).lastInsertRowid;
    const c2 = insUser.run('Brian Mwangi', 'brian@example.com', hash, 'client', '+254 722 100 002', 20, null, null).lastInsertRowid;
    const c3 = insUser.run('James Ochieng', 'james@example.com', hash, 'client', '+254 722 100 003', 15, null, null).lastInsertRowid;
    const c4 = insUser.run('Tony Njoroge', 'tony@example.com', hash, 'client', '+254 722 100 004', 25, null, null).lastInsertRowid;
    const c5 = insUser.run('Felix Kamau', 'felix@example.com', hash, 'client', '+254 722 100 005', 20, null, null).lastInsertRowid;

    const insShop = db.prepare(`INSERT INTO shops (owner_id, name, description, area, address, phone, lat, lng, avg_cut_minutes, is_open, chair_status, status_message)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insSvc = db.prepare('INSERT INTO services (shop_id, name, price_kes, duration_min) VALUES (?,?,?,?)');

    // Kevo's — Westlands, open + busy with a queue (the lively demo shop)
    const s1 = insShop.run(b1, "Kevo's Classic Cuts",
      'Westlands favourite since 2015. Sharp fades, hot towel shaves and the cleanest beard lines in the 254. Walk-ins welcome when the light is green.',
      'Westlands', 'Woodvale Grove, opp. Sarit Centre', '+254 712 345 001', -1.2635, 36.8108, 25, 1, 'busy', 'Back-to-back cuts, join the queue').lastInsertRowid;
    insSvc.run(s1, 'Signature Fade', 350, 30);
    insSvc.run(s1, 'Hot Towel Shave', 400, 25);
    insSvc.run(s1, 'Beard Sculpt', 200, 15);
    insSvc.run(s1, 'Haircut + Beard Combo', 500, 40);
    insSvc.run(s1, 'Kids Cut (under 12)', 250, 20);

    // Gentleman's Blade — CBD, open + idle
    const s2 = insShop.run(b2, "The Gentleman's Blade",
      'Old-school barbershop with leather chairs and straight-razor finishes. In and out in 20 minutes.',
      'CBD', 'Kimathi Street, 2nd floor, Kimathi House', '+254 712 345 002', -1.2841, 36.8215, 20, 1, 'idle', 'Chair is free — walk in!').lastInsertRowid;
    insSvc.run(s2, 'Executive Cut', 400, 20);
    insSvc.run(s2, 'Straight Razor Shave', 350, 20);
    insSvc.run(s2, 'Beard Trim', 150, 10);

    // Fade Factory — Kilimani, open + busy
    const s3 = insShop.run(b3, 'Fade Factory',
      'Modern cuts, skin fades, dye work and designs. AUX cord friendly.',
      'Kilimani', 'Argwings Kodhek Rd, next to Yaya Centre', '+254 712 345 003', -1.2921, 36.7872, 30, 1, 'busy', '').lastInsertRowid;
    insSvc.run(s3, 'Skin Fade', 400, 30);
    insSvc.run(s3, 'Haircut + Dye', 900, 60);
    insSvc.run(s3, 'Line Up', 200, 10);

    // Executive Trims — Upper Hill, open + idle
    const s4 = insShop.run(b4, 'Executive Trims',
      'Quiet, appointment-friendly chair for the working professional. Fresh cuts between meetings.',
      'Upper Hill', 'Ragati Road, Delta Corner side', '+254 712 345 004', -1.3003, 36.8093, 20, 1, 'idle', '').lastInsertRowid;
    insSvc.run(s4, 'Business Cut', 500, 20);
    insSvc.run(s4, 'Full Shave', 300, 15);
    insSvc.run(s4, 'Beard Detail', 250, 15);

    // Sharp & Smooth — Roysambu, currently OFFLINE
    const s5 = insShop.run(b5, 'Sharp & Smooth Barbers',
      'Roysambu plug for clean cuts at friendly prices. We go offline when the chairs are full.',
      'Roysambu', 'Thika Rd, TRM Drive', '+254 712 345 005', -1.2165, 36.8898, 25, 0, 'idle', 'On lunch break — back at 2pm').lastInsertRowid;
    insSvc.run(s5, 'Regular Cut', 200, 20);
    insSvc.run(s5, 'Fade', 300, 25);
    insSvc.run(s5, 'Beard Trim', 100, 10);

    // ---- live queue at Kevo's ----
    const insQ = db.prepare(`INSERT INTO queue_entries (shop_id, user_id, client_name, kind, service_id, status, joined_at, started_at)
      VALUES (?,?,?,?,?,?,?,?)`);
    // one client in the chair (started 14 min ago)
    insQ.run(s1, c2, 'Brian Mwangi', 'app', 1, 'serving', minsAgo(19), minsAgo(14));
    // two app clients + one walk-in waiting
    insQ.run(s1, c3, 'James Ochieng', 'app', 2, 'waiting', minsAgo(11), null);
    insQ.run(s1, null, 'Walk-in #1', 'walkin', null, 'waiting', minsAgo(6), null);

    // ---- queue at Fade Factory ----
    insQ.run(s3, c4, 'Tony Njoroge', 'app', 6, 'serving', minsAgo(25), minsAgo(22));
    insQ.run(s3, c5, 'Felix Kamau', 'app', 6, 'waiting', minsAgo(8), null);

    // ---- a bit of history for the demo client ----
    const insH = db.prepare(`INSERT INTO queue_entries (shop_id, user_id, client_name, kind, service_id, status, joined_at, started_at, done_at)
      VALUES (?,?,?,?,?,?,?,?,?)`);
    insH.run(s2, c1, 'Demo Client', 'app', 7, 'done', minsAgo(60 * 30), minsAgo(60 * 30 - 8), minsAgo(60 * 30 - 26));
    insH.run(s1, c1, 'Demo Client', 'app', 1, 'done', minsAgo(60 * 55), minsAgo(60 * 55 - 12), minsAgo(60 * 55 - 40));
    insH.run(s3, c1, 'Demo Client', 'app', 6, 'cancelled', minsAgo(60 * 80), null, null);

    // ---- welcome notifications ----
    const insN = db.prepare(`INSERT INTO notifications (user_id, shop_id, type, title, body, created_at)
      VALUES (?,?,?,?,?,?)`);
    insN.run(c1, s1, 'info', 'Karibu FreshCut 💈', 'Browse barbers near you, join a live queue, and we will ping you ~20 minutes before your turn.', minsAgo(60 * 80));
    insN.run(b1, null, 'info', 'Your chair is live', 'Clients can see Kevo\'s Classic Cuts on the map whenever you are Online.', minsAgo(60 * 90));
  });

  tx();
  console.log('Database seeded with demo data.');
  return true;
}

seed();

module.exports = db;

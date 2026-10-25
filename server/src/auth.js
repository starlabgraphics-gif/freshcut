const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'freshcut-dev-secret-change-me';
const TOKEN_TTL = '30d';

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function publicUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

// Express middleware — requires a valid Bearer token (or ?token= for SSE).
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session expired — please sign in again' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ error: `Only ${role} accounts can do that` });
    next();
  };
}

const router = express.Router();

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

router.post('/register', (req, res) => {
  const { name, email, password, role, phone } = req.body || {};
  if (!name || String(name).trim().length < 2) return res.status(400).json({ error: 'Please enter your name' });
  if (!emailOk(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!['client', 'barber'].includes(role)) return res.status(400).json({ error: 'Choose whether you are a Client or a Barber' });

  const exists = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(email);
  if (exists) return res.status(409).json({ error: 'An account with that email already exists' });

  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)')
    .run(String(name).trim(), String(email).trim().toLowerCase(), bcrypt.hashSync(password, 10), role, phone || '');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

  // A little welcome in the notification center.
  db.prepare('INSERT INTO notifications (user_id, type, title, body) VALUES (?,?,?,?)').run(
    user.id,
    'info',
    role === 'barber' ? 'Welcome to FreshCut, Barber 💈' : 'Karibu FreshCut 💈',
    role === 'barber'
      ? 'Set up your shop, pin its location, then flip yourself Online to start receiving queue requests.'
      : 'Find a barber near you, join the queue, and get a heads-up ~20 minutes before your turn.'
  );

  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(String(email || '').trim());
  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: sign(user), user: publicUser(user) });
});

router.get('/me', authRequired, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = { router, authRequired, requireRole, publicUser };

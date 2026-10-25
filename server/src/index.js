const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db'); // ensures schema + seed on boot
const sse = require('./sse');
const { router: authRouter, authRequired } = require('./auth');
const apiRouter = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());

// tiny request log for the demo
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && !req.path.startsWith('/api/events')) {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'FreshCut API', time: new Date().toISOString() }));

app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

// Server-Sent Events stream (token in query string — EventSource can't set headers)
app.get('/api/events', (req, res) => {
  const token = req.query.token;
  let payload;
  try {
    payload = jwt.verify(String(token || ''), process.env.JWT_SECRET || 'freshcut-dev-secret-change-me');
  } catch (e) {
    return res.status(401).json({ error: 'Bad token' });
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`event: hello\ndata: {"ok":true}\n\n`);
  sse.addClient(payload.id, res);
  req.on('close', () => sse.removeClient(payload.id, res));
});

// JSON 404 + error handler
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the built React app in production (single-service deploy).
// In dev the Vite server on :5173 proxies /api here instead.
const path = require('path');
const fs = require('fs');
const distDir = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`FreshCut API listening on http://0.0.0.0:${PORT}`);
});

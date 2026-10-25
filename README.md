# FreshCut 💈 — skip the barbershop wait

A full-stack "Uber for barbers" app. Clients at home see which barbers are free **right now**, join a live
queue remotely, get an estimated wait time, and receive a heads-up ~20 minutes before their turn.
Barbers run an Uber-style console: flip Online/Offline, punch **Almost done** / **Done — next up** to drive
the queue and auto-ping the next client.

## Demo accounts (password: `demo1234`)

| Account | Email | What you'll see |
|---|---|---|
| Client | `client@freshcut.co.ke` | Explore live shops on the map, join queues, track your spot |
| Barber | `barber@freshcut.co.ke` | Kevo's Classic Cuts (Westlands) — chair control, live queue |

Open two browsers side-by-side (one as client, one as barber) and watch updates flow instantly via Server-Sent Events.

## Stack

- **API** — Node + Express, JWT auth, bcrypt password hashing
- **DB** — SQLite (`better-sqlite3`, WAL) persisted at `server/data/freshcut.db`
- **Realtime** — Server-Sent Events (`GET /api/events`), with a 30 s polling fallback
- **Web** — React 18 + Vite + Tailwind 3 + Leaflet (OpenStreetMap), zero-icon-dep inline SVG kit

## Run it

```bash
# terminal 1 — API on :4000
cd server && npm install && npm start

# terminal 2 — web on :5173 (proxies /api)
cd client && npm install && npm run dev
```

The DB seeds itself on first boot with 5 Nairobi shops, live queues, services, history and notifications.
Delete `server/data/freshcut.db` to reseed.

## Feature map

**Clients**
- Live shop map + cards: offline / chair-free / in-a-cut / almost-done, queue size, next-slot ETA, distance
- Join queue (optional service pick) → one active queue per client enforced server-side
- My Queue: position, live ETA, the line visualized, directions/call, leave queue
- Alerts: ETA-drop reminder (configurable 5–45 min), "barber almost done", "you're up"
- Visits history with lifetime cuts & spend

**Barbers**
- Register shop, pin location on the map (click/drag), services CRUD, avg-cut minutes drives all ETAs
- Chair Control: Online toggle, shout-out message, +Walk-in, Almost done (pings next), Done — next up, no-show/remove
- Instant alerts for new bookings, cancellations, no-shows

## API sketch

```
POST /api/auth/register|login      GET /api/users/me · PUT /api/users/me
GET|POST /api/shops                GET|PUT|DELETE /api/shops/:id
POST|PUT|DELETE /api/shops/:id/services[/:sid]
POST /api/shops/:id/join           POST /api/shops/:id/actions   (open|close|seat_next|walkin|almost_done|done_next)
GET  /api/shops/:id/queue          GET /api/queue/mine           PATCH|DELETE /api/queue/:id
GET|PATCH|DELETE /api/notifications[/:id]                         POST /api/notifications/read-all
GET  /api/events                   (SSE stream, ?token=)
```

ETA model: `remaining-on-chair + (people ahead × shop avg-cut)`; "almost done" collapses the remainder to ~2–8 min.

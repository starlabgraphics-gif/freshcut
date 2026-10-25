# How to put FreshCut on the internet 🚀

Three routes, easiest first. You only need to pick ONE.

---

## Route 1 — One-click-ish deploy with Render (recommended, free)

Render runs the whole app (React + API + database) as **one service**.

1. **Put the code on GitHub** (see Route 3 for exact clicks, takes ~3 min).
2. Go to **[render.com](https://render.com)** → sign up with GitHub → **New → Web Service**.
3. Connect your `freshcut` repo.
4. Fill in:
   - **Build command:** `npm run render-build`
   - **Start command:** `npm start`
   - **Instance type:** Free
   - **Environment variables** (Add): `JWT_SECRET` = any long random string
5. Click **Create Web Service**. Wait ~3–4 min. You get a URL like `https://freshcut-xxxx.onrender.com` — that's your live app. 🎉

**Free-tier notes:**
- It sleeps after 15 min idle → first visit takes ~30 s to wake. UptimeRobot (free) can ping `/api/health` every 5 min to keep it warm.
- The free tier's disk resets on each redeploy, so the demo data reseeds (user accounts you create will vanish on redeploy). Fine for a demo; for a real product you'd switch the DB to managed Postgres later.

---

## Route 2 — Railway (data survives restarts)

[railway.com](https://railway.com) gives ~$5 free credit/month.

1. Push the code to GitHub (Route 3).
2. Railway → **New Project → Deploy from GitHub repo** → pick `freshcut`.
3. Settings → **Build command:** `npm run render-build` · **Start command:** `npm start`
4. Settings → add env var `JWT_SECRET` = random string.
5. **Recommended:** Settings → Volumes → New Volume, mount path `/app/server/data` → your SQLite database then survives redeploys.
6. Deploy → you'll get a `*.up.railway.app` URL.

---

## Route 3 — Getting the code onto GitHub

The repo here already has everything committed. On your computer:

```bash
# 1. Download freshcut.zip from this workspace and unzip it (or clone if I pushed somewhere)
# 2. On github.com -> top-right "+" -> "New repository"
#    Name: freshcut   |   Public   |   DON'T tick "Add a README"
# 3. Then inside the unzipped folder:

git remote add origin https://github.com/YOUR-USERNAME/freshcut.git
git push -u origin main
```

GitHub will ask you to sign in (browser popup or a Personal Access Token from
github.com → Settings → Developer settings → Tokens).

**Or without the command line:** download `freshcut.zip` here → unzip → on GitHub create the repo → click **"uploading an existing file"** → drag all the files in → Commit. Then Routes 1/2 work exactly the same.

---

## Route 0 — Run it on your own laptop first

```bash
# one time
cd freshcut
npm run install:all

# every time you want to run it (two terminals)
npm run dev:api      # API on http://localhost:4000
npm run dev:web      # app on http://localhost:5173  <- open this

# or production mode (one command, one port)
npm run build && npm start   # then open http://localhost:4000
```

Demo logins — client: `client@freshcut.co.ke` · barber: `barber@freshcut.co.ke` · password: `demo1234`

---

### Environment variables you can set anywhere

| Var | Default | Why |
|---|---|---|
| `PORT` | `4000` | Hosts usually inject their own |
| `JWT_SECRET` | dev default | **Set it in production** — keeps logins signed securely |

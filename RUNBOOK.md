# Runbook — Springs & Pucks

This runbook covers everything needed to get the full Springs & Pucks stack running from scratch: the static site, the Socket.io multiplayer server, the Cloudflare Workers, and the Google Apps Script back-ends.

**You do not need all of this.** The physics simulations and demos work as a plain static site with zero server configuration.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Static site](#2-static-site)
3. [Socket.io multiplayer server](#3-socketio-multiplayer-server)
4. [Cloudflare Workers](#4-cloudflare-workers)
5. [Google Apps Script](#5-google-apps-script)
6. [End-to-end smoke tests](#6-end-to-end-smoke-tests)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prerequisites

| Tool | Required for | Notes |
|------|-------------|-------|
| Any static file server or GitHub Pages | Static site | `npx serve` works for local dev |
| Node.js ≥ 18 | Socket.io server | LTS recommended |
| npm | Socket.io server | Comes with Node |
| Cloudflare account | Workers + KV | Free tier is sufficient |
| Google account | Apps Script + Sheets | Free |
| Heroku account (optional) | Hosted Socket.io server | Free dynos were retired; use Eco dyno |
| Git | Deployment | Standard |

---

## 2. Static site

### Local development

```bash
# From the repo root
npx serve .
```

Open `http://localhost:3000` (or whatever port `serve` picks).

Alternatively, use VS Code's Live Server extension or Python's built-in server:

```bash
python -m http.server 8080
```

### GitHub Pages

1. Push the repo to GitHub.
2. Go to **Settings → Pages**.
3. Set source to `main` branch, root folder `/`.
4. The site is published at `https://<your-username>.github.io/<repo-name>/`.

No build step is required — everything is plain HTML/JS/CSS.

### Custom domain (Cloudflare)

If you are serving via Cloudflare Pages or a proxied GitHub Pages site:

1. Add a CNAME record in Cloudflare DNS pointing your subdomain to the GitHub Pages URL.
2. Enable **Proxy** (orange cloud) for HTTPS and DDoS protection.
3. Set the SSL/TLS mode to **Full** or **Full (Strict)**.

---

## 3. Socket.io multiplayer server

The server lives in `socket-io/`. It is a Node.js/Express/Socket.io application.

### Install dependencies

```bash
cd socket-io
npm install
```

Dependencies (from `package.json`):

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | `^4.18.2` | HTTP server framework |
| `socket.io` | `^4.0.0` | WebSocket server |
| `selfsigned` | `^2.4.1` | Fallback self-signed cert generation |

### Run locally (development)

```bash
npm start
```

The server detects the environment automatically:

- No `NODE_ENV=production` or `HEROKU` env var → **development mode**: HTTPS on port **3443**, self-signed cert auto-generated in `socket-io/ssl/`.
- `NODE_ENV=production` or `HEROKU` set → **production mode**: HTTP on port **3000** (or `$PORT`).

**Development verification:**

```
https://localhost:3443/status
```

Accept the self-signed certificate warning in your browser. You should see a JSON status response.

**Point the browser client at your local server:**

In `index.html`, look for the server URL configuration (or use the multiplayer panel to type the URL of your local server before clicking Create).

### Deploy to Heroku

```bash
# One-time setup
heroku login
heroku create <your-app-name>

# Deploy
git subtree push --prefix socket-io heroku main
# OR if your repo root IS the socket-io folder:
git push heroku main
```

Set the environment:

```bash
heroku config:set NODE_ENV=production
```

Verify:

```
https://<your-app-name>.herokuapp.com/status
```

**Heroku notes:**

- Heroku sets `$PORT` automatically; the server reads it.
- Heroku terminates SSL — the server runs HTTP internally.
- The free/eco dyno sleeps after 30 minutes of inactivity. The first connection after sleep can take ~10 seconds while the dyno wakes.
- Idle timeout in `server.js` disconnects inactive sockets to avoid zombie connections on sleeping dynos.

### Environment variables (server)

The server has no required environment variables beyond `NODE_ENV` / `PORT`. CORS is permissive (`origin: "*"`) by design — tighten this if you need to restrict origins.

---

## 4. Cloudflare Workers

The Workers live in `cf-workers/`. There are three:

| File | Route path (example) | Purpose |
|------|----------------------|---------|
| `leaderboard.js` | `/leaderboard` | Submit scores to Google Sheet |
| `pvent.js` | `/pvent` | Log events to Google Sheet |
| `captures.js` | `/captures/submit` | Save/load captures in KV |

### Option A: deploy via Cloudflare dashboard (no Wrangler needed)

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com).
2. Go to **Workers & Pages → Create application → Create Worker**.
3. Paste the contents of the Worker file into the online editor.
4. Click **Save and Deploy**.
5. Set the Worker route (see below).
6. Add environment variables / KV bindings (see below).

Repeat for each of the three Workers.

### Option B: deploy via Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

Create a `wrangler.toml` in each Worker's directory (example for `leaderboard.js`):

```toml
name = "leaderboard"
main = "leaderboard.js"
compatibility_date = "2024-01-01"

[vars]
# Leave empty; set LEADERBOARD_SHEET_URL as a secret (see below)
```

```bash
cd cf-workers
wrangler deploy leaderboard.js
```

### Worker routes

In the Cloudflare dashboard, under your zone (domain):

1. Go to **Workers & Pages → your Worker → Settings → Triggers**.
2. Add an HTTP route, e.g. `https://triquence.org/leaderboard*`.

Or use the **Routes** section under your domain's Workers tab.

### Environment variables

#### `leaderboard` Worker

| Variable | Type | Value |
|----------|------|-------|
| `LEADERBOARD_SHEET_URL` | Secret (recommended) or Text | The `/exec` URL of your `leaderboard-app` Google Apps Script deployment |

**To add in the dashboard:**

Workers & Pages → `leaderboard` → Settings → Variables → Add variable

#### `pvent` Worker

| Variable | Type | Value |
|----------|------|-------|
| `PVENT_SHEET_URL` | Secret (recommended) or Text | The `/exec` URL of your `pager-app` Google Apps Script deployment |

#### `captures` Worker

| Binding | Type | KV namespace |
|---------|------|-------------|
| `CKV` | KV namespace binding | Create a KV namespace named `captures` (or any name) and bind it as `CKV` |

**To create a KV namespace:**

1. Cloudflare dashboard → **Workers & Pages → KV**.
2. Click **Create namespace**, name it (e.g. `captures`).
3. Go to your `captures` Worker → Settings → Variables → KV namespace bindings → Add binding.
4. Variable name: `CKV`, KV namespace: select the one you created.

### CORS origin allowlist (`captures.js`)

Open `cf-workers/captures.js` and find the approved-origins array. Add your production domain and any local dev origins you use:

```js
const approvedOrigins = [
    "https://triquence.org",
    "https://your-other-domain.com",
    // add local dev origins as needed
];
```

Redeploy after editing.

### Preview vs. Production environments

Cloudflare Workers have a **Preview** deployment and a **Production** deployment. Environment variables and KV bindings are scoped per environment. Set them separately if you use both.

---

## 5. Google Apps Script

Two scripts need to be deployed as **Web Apps**:

| File | Purpose | Sheet name used |
|------|---------|----------------|
| `google-apps/leaderboard-app.js` | Leaderboard read/write | `games` |
| `google-apps/pager-app.js` | Event log write | `log` |

### Create the Google Sheets

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet.
2. Rename the default sheet tab to `games` (for the leaderboard) or `log` (for the event logger).
3. Row 1 should be a header row. The scripts insert data below the header.

You can use one spreadsheet with two sheets (one named `games`, one named `log`) or separate spreadsheets.

### Create and deploy the Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**.
2. Delete the default `function myFunction()` placeholder.
3. Paste the contents of the appropriate script file (`leaderboard-app.js` or `pager-app.js`).
4. Click **Save** (floppy disk icon), give the project a name.
5. Click **Deploy → New deployment**.
6. Set **Type** to **Web app**.
7. Set **Execute as**: `Me` (your Google account).
8. Set **Who has access**: `Anyone` (required so the Cloudflare Worker can call it).
9. Click **Deploy**. Copy the `/exec` URL — you will paste this into the Worker's environment variable.

### Updating the script

When you change the script code:

1. Make edits in the Apps Script editor.
2. Click **Deploy → Manage deployments**.
3. Click the edit icon (pencil) next to your deployment.
4. Set **Version** to **New version**.
5. Click **Deploy**.

**Do not create a new deployment** — that would give you a new URL, requiring you to update the Worker's environment variable.

### Verifying Apps Script works

You can test it directly by visiting its `/exec` URL in a browser with query parameters:

```
https://script.google.com/macros/s/<deployment-id>/exec?action=test
```

(The scripts handle unknown actions gracefully and return a JSON response.)

---

## 6. End-to-end smoke tests

After setting everything up, verify each integration:

### Static site

- [ ] Open `index.html` in a browser. Physics demos load and run.
- [ ] Number keys `1`–`9` start demos.
- [ ] Canvas responds to mouse clicks and drags.

### Socket.io server

- [ ] `GET /status` returns JSON.
- [ ] Open `index.html`, enable multiplayer, type a room name, click **Create**. Chat shows you are the host.
- [ ] Open `client.html` in another tab, type the same room name, click **Connect**. Chat shows the client joined.
- [ ] Move the mouse on the client canvas — the host canvas responds.

### Captures Worker (Cloudflare KV)

- [ ] Take a capture (`u`), then use the capture UI to save it to the cloud.
- [ ] Reload the page, open the capture UI, load the cloud capture. Simulation restores correctly.

### Leaderboard Worker + Apps Script

- [ ] Play a leaderboard-enabled game through to completion.
- [ ] Check the Google Sheet — a new row should appear in the `games` tab.
- [ ] In the chat field, type `lb` and press Enter; follow the help to query the leaderboard. Results should display in chat.

### Event logger (pvent Worker + Apps Script)

- [ ] Open the site. Check the `log` sheet in Google Sheets — an entry should appear for the page visit event (if event logging is active).

---

## 7. Troubleshooting

### CORS errors in the browser console

- Ensure the Worker is handling `OPTIONS` preflight and returning `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` on **all** responses (not just success paths).
- For `captures.js`: make sure your origin is in the allowlist array and the Worker is redeployed after editing.
- Check that the Worker route in Cloudflare matches the URL your browser is calling.

### Socket.io connection fails

- **Local dev:** Did you accept the self-signed certificate at `https://localhost:3443`? The browser will silently block WebSocket upgrades to an untrusted cert.
- **Heroku:** Is the dyno awake? Try the `/status` URL first.
- **Mixed content:** If your site is served over HTTPS, the Socket.io server must also be HTTPS (Heroku handles this transparently; local dev uses the self-signed cert).
- Check the browser DevTools **Network** tab for the WebSocket handshake request and its response code.

### Google Apps Script returns an error

- Apps Script errors are returned as JSON. Check the raw response in the Worker's logs (Cloudflare dashboard → Worker → Logs).
- `LockService` timeouts appear as errors if the sheet is under heavy concurrent load; retrying usually resolves it.
- Make sure the script is deployed as **Execute as: Me** and **Anyone** has access. A newly edited script that has not been re-deployed as a new version will run the old code.

### Leaderboard not updating the sheet

1. Confirm `LEADERBOARD_SHEET_URL` in the Worker is the correct `/exec` URL (not the editor URL or `/dev` URL).
2. In the Apps Script editor, run `doGet` manually with test params to confirm it can write to the sheet.
3. Check that the sheet tab is named exactly `games` (case-sensitive).

### Captures not saving

1. Confirm the `CKV` KV binding is set on the `captures` Worker and that the KV namespace exists.
2. Confirm the Worker route matches the URL the browser is calling.
3. Check the Cloudflare Worker logs for KV errors.

### Animation loop lag

If the simulation becomes sluggish or the cursor noticeably lags the puck:

- Press **`p`** to pause, then **`p`** again to resume. This restarts the animation loop.
- This is especially common after switching browser tabs or entering/exiting full-screen mode. The loop auto-restarts in most of these cases.

### Self-signed certificate (local dev)

The server generates a cert in `socket-io/ssl/` on first run. If you see WebSocket errors locally:

1. Navigate to `https://localhost:3443/status` in your browser.
2. Accept the certificate warning ("Advanced → Proceed").
3. Return to `index.html` and try connecting again.

To regenerate the cert, delete the `socket-io/ssl/` folder and restart the server.

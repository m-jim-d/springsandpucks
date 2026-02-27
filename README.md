## Springs & Pucks

Physics-engine animations of puck and spring systems on an HTML canvas.

## The main code: runs in the browser

The core of this project is the browser-side JavaScript loaded by `index.html` (and `client.html` for the multiplayer client UI). The codebase is organized as a set of modules that attach themselves to `window` with short nicknames.

### Entry point: `index.html`

`index.html` is both:

- The primary UI/UX document (help panel, controls, demo links)
- The script loader (it loads the engine and all demo/game modules via `<script>` tags)

On page load it runs:

- `pS.init({ ... })` (page-level setup, logging, scroll behavior, dialogs)
- `gW.init()` (initializes the game window / physics world and starts the animation loop)
- `hC.init_chatFeatures()` (initializes chat UI/multiplayer UI wiring)

### Script load order (high level)

The `<head>` of `index.html` loads scripts in a deliberate order so later modules can rely on earlier globals:

- **Third party**
  - `jquery-3.7.1.min.js`
  - `math.min.js`
  - `MathJax` (LaTeX rendering)
  - `Box2D.js` (Box2dWeb)
- **Foundation / utilities**
  - `utilities.js` (`uT`)
  - `pageStuff.js` (`pS`)
  - `worldScreen.js` (`wS`) world<->screen coordinate transforms and `Vec2D`
- **Core engine + object model**
  - `drawFunc.js` (`dF`, `dFM`) rendering helpers
  - `consAndPros.js` (`cP`) constructors and prototypes for game objects
  - `clientProto.js` (`cT`) client-side player/client model
  - `piEngine.js` (`pE`) optional “counting pi by collisions” engine
  - `tableActs.js` (`tA`) table/world actions
  - `multiSelect.js` (`mS`) host multi-select tooling
  - `gwModule.js` (`gW`) main “game window” controller and animation loop
- **Demos/games + input**
  - `demoStart.js` (`dS`) demo selection/initialization
  - `eventsHost.js` (`eV`) input handlers for the host page
  - `boxStuff.js` (`bS`) extra Box2D helpers
  - `hostAndClient.js` (`hC`) socket.io / WebRTC client logic
  - `eventsNonHost.js` (`eVN`) input handlers for non-host clients
- **Persistence and meta-features**
  - `captureRestore.js` (`cR`) capture/restore state
  - `leaderBoard.js` (`lB`) leaderboard UI and submission/report logic
- **Game/demo modules**
  - `ghostBall.js` (`gB`)
  - `puckPopper.js` (`pP`)
  - `jelloMadness.js` (`jM`)
  - `bpHoops.js` (`bpH`)
  - `monkeyHunt.js` (`mH`)
  - plus many `demo*.js` capture files

The canonical list of modules + nicknames is maintained in `gwModule.js`.

This repo is primarily a static website, but the full project also includes optional server-side pieces for:

- **Leaderboard submissions** (Cloudflare Worker + Google Apps Script + Google Sheet)
- **Event logging** (Cloudflare Worker + Google Apps Script + Google Sheet)
- **Capture storage** (Cloudflare Worker + Cloudflare KV)
- **Multiplayer / signaling** (Node.js + Socket.io server, deployable to Heroku)

If you only want the animations and demos, you can treat this as a static site.

## Repositories / folders involved

This workspace typically contains multiple sibling folders (not all are part of this GitHub repo):

- **`github-website/springsandpucks/`**
  - This GitHub repo.
  - Documentation files like `README.md` and `ARCHITECTURE.md` live here.
- **`root-50webs/`**
  - The working website content folder on the author machine.
  - Contains the Cloudflare Worker source in `root-50webs/cf-workers/`.
  - Contains Google Apps Script source in `root-50webs/google-apps/`.
- **`node/heroku-pet/`**
  - Node/Express/Socket.io server (multi-player + signaling).

## Key server-side components (high level)

### Cloudflare Workers (`root-50webs/cf-workers/`)

- **`leaderboard.js`**
  - Accepts browser `POST` JSON.
  - Proxies the request to a Google Apps Script web app using an upstream `GET` with query parameters.
  - Reads the upstream URL from the Worker environment variable `LEADERBOARD_SHEET_URL`.
  - Implements CORS preflight (`OPTIONS`) and returns `Access-Control-Allow-*` headers.

- **`pvent.js`**
  - Event logger endpoint.
  - Accepts browser `POST` JSON with `{ mode, eventDesc }`.
  - Proxies to Google Apps Script using upstream `GET`.
  - Reads the upstream URL from `PVENT_SHEET_URL`.
  - Adds a `____L____` prefix to `eventDesc` when the incoming `Origin` looks like local/dev.

- **`captures.js`**
  - A small API for saving and retrieving “captures” (snapshots of state) in **Cloudflare KV**.
  - Exposes `POST .../submit` with actions like `postOne`, `updateOne`, `deleteOne`, `downLoadOne`, `list`.
  - Uses KV binding `CKV`.
  - Applies an allowlist-based CORS policy (origin must be in an approved list).

### Google Apps Script (`root-50webs/google-apps/`)

- **`leaderboard-app.js`**
  - Google Apps Script “web app” that writes game results to a sheet (named `games`) and optionally returns a report.
  - Entry point is `doGet(e)`.
  - Uses `LockService` to serialize updates.
  - Returns JSON via `ContentService`.

- **`pager-app.js`**
  - Google Apps Script “web app” that logs events to a sheet (named `log`).
  - Entry point is `doGet(e)`.
  - Uses `LockService`.
  - Returns JSON via `ContentService`.

These Apps Script web apps are intentionally called via Cloudflare Workers to avoid direct client-to-Google Apps Script coupling and to keep the Apps Script deployment URL out of the published website source.

### Socket.io server (`node/heroku-pet/server.js`)

This Node server provides real-time multiplayer functionality:

- Room creation/joining (host + clients)
- Chat
- WebRTC signaling relay (`signaling message`)
- Control messages to host / room / specific client
- Idle timeout handling to avoid long-lived abandoned connections

It runs:

- **In production (Heroku):** plain HTTP (Heroku terminates SSL)
- **In development:** HTTPS with self-signed certificates (auto-generated)

## Running locally

### Static site

You can open the HTML pages directly, but many browser features (module loading, fetch, some CORS scenarios) behave better if you serve locally.

Use any static file server you like.

### Socket.io server

From `node/heroku-pet/`:

- Install dependencies:
  - `npm install`
- Start:
  - `npm start`

Then open the server status endpoint:

- `http://localhost:3000/status` (production-like)
- or `https://localhost:3443/status` (typical dev mode)

Note: in dev mode you will need to accept the browser warning for the self-signed cert.

## Deploying

### Cloudflare Workers

The Workers expect environment variables/bindings to be configured in the Cloudflare dashboard (or via Wrangler if you use it):

- **`leaderboard` Worker**
  - `LEADERBOARD_SHEET_URL` (Text or Secret)
- **`pvent` Worker**
  - `PVENT_SHEET_URL` (Text or Secret)
- **`captures` Worker**
  - KV binding: `CKV`

Variables are scoped per-Worker and per-environment (Preview vs Production).

### Google Apps Script

Deploy each script as a **Web App** so it has a stable `/exec` URL.
When you update script code, deploy a **new version** inside the existing deployment so the URL stays the same.

## Generated code browsing (`root-50webs/code/`)

The author’s workflow includes a script (`root-50webs/pretty_html.py`) that generates syntax-highlighted HTML views of `*.js` and `*.json` files into `root-50webs/code/`.

This is used by the website to link to readable “code pages” like `code/captures.js.html`.

## More details

See `ARCHITECTURE.md` for:

- A component diagram-style overview
- Detailed request flows (browser -> worker -> apps script)
- CORS and environment variable notes
- Deployment and security notes
- Client-side module map and runtime data flow

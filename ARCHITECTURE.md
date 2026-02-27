# Architecture

Springs & Pucks is a static website with optional server-side services. All physics, rendering, and gameplay run in the browser. The server-side components exist only for persistence and real-time connectivity.

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│  index.html / client.html                           │
│  Box2D physics · Canvas rendering · Game logic      │
│  Capture/restore · Leaderboard UI · Multiplayer UI  │
└────────┬──────────┬───────────────┬─────────────────┘
         │fetch     │fetch          │WebSocket
         ▼          ▼               ▼
  ┌─────────────┐  ┌───────────┐  ┌──────────────────┐
  │  CF Worker  │  │ CF Worker │  │  Node.js +       │
  │ leaderboard │  │ captures  │  │  Socket.io       │
  │  + pvent    │  │  (KV)     │  │  (Heroku/local)  │
  └──────┬──────┘  └───────────┘  └──────────────────┘
         │GET
         ▼
  ┌─────────────────┐
  │ Google Apps     │
  │ Script Web App  │
  │ (Google Sheets) │
  └─────────────────┘
```

---

## Pillar 1 — Physics simulations (browser-side)

### Entry points

| Page | Role |
|------|------|
| `index.html` | Host page: runs physics, renders canvas, shows help/demo panel |
| `client.html` | Client page: blank canvas for input; optionally shows video stream from host |

### Module pattern

All project JS files use an IIFE that attaches a singleton to `window` under a short nickname. There are no ES modules — load order in `<script>` tags is the dependency mechanism.

| File | Nickname | Role |
|------|----------|------|
| `utilities.js` | `uT` | Utility helpers; must load first |
| `pageStuff.js` | `pS` | Page-level UI, dialogs, scroll |
| `worldScreen.js` | `wS` | `Vec2D`, meters↔pixels coordinate transforms |
| `drawFunc.js` | `dF` / `dFM` | Canvas rendering helpers |
| `consAndPros.js` | `cP` | Constructors and prototypes for Puck, Pin, Spring, Wall |
| `clientProto.js` | `cT` | Client-side player/client model |
| `piEngine.js` | `pE` | Optional π-by-collisions counting engine |
| `tableActs.js` | `tA` | Table/world actions (add, remove, arrange objects) |
| `multiSelect.js` | `mS` | Multi-select box and group operations |
| `gwModule.js` | `gW` | Central game-window controller, animation loop, Air Table |
| `demoStart.js` | `dS` | Demo selection, initialization, full-screen helpers |
| `eventsHost.js` | `eV` | All mouse/keyboard/touch input for host page |
| `boxStuff.js` | `bS` | Extra Box2D shape/body helpers |
| `hostAndClient.js` | `hC` | Socket.io + WebRTC client, chat, room join |
| `eventsNonHost.js` | `eVN` | Input handlers for network clients |
| `captureRestore.js` | `cR` | Capture/restore state (JSON snapshots) |
| `leaderBoard.js` | `lB` | Leaderboard display, submission, report |
| `ghostBall.js` | `gB` | Ghost Ball Pool game module |
| `puckPopper.js` | `pP` | Puck Popper game module |
| `jelloMadness.js` | `jM` | Jello Madness game module |
| `bpHoops.js` | `bpH` | Bipartisan Hoops game module |
| `monkeyHunt.js` | `mH` | Monkey Hunt game module |
| `demo*.js` | — | Captured demo state files (JSON wrapped in JS) |

The canonical nickname list is maintained near the top of `gwModule.js`.

### Script load-order constraints

- `uT` must be first — every module calls `uT.setDefault(...)`.
- `wS` must precede all modules that use `Vec2D` or coordinate transforms.
- `mS` must precede `gW` — `gW.init()` instantiates `mS.SelectBox` and `mS.MultiSelect`.
- `gW` must precede the game/demo modules and `eV`, which receive references from `gW`.

### Initialization sequence (host page)

`$(document).ready(...)` in `index.html` runs:

```
pS.init(...)       → page UI, logging, scroll history
gW.init()          → physics world, animation loop start
hC.init_chatFeatures() → multiplayer/chat UI wiring
```

### Animation loop (per frame)

`gW` drives everything with `requestAnimationFrame`:

1. Read host input state (`eV`) and queued network client input (`gW.clients`)
2. Step Box2D world (or `pE` for the π engine)
3. Run game/demo logic (scoring, state transitions)
4. Render canvas (draw pucks, springs, walls, overlays)
5. Update DOM overlay messages

The central state is `gW.aT` (the **Air Table** — pucks, pins, springs, joints, walls) and `gW.clients` (connected players).

### Coordinates (`wS`)

Box2D operates in meters; the canvas uses pixels. `worldScreen.js` provides:

- `Vec2D` — 2D vector with math helpers
- `wS.screenFromWorld(v)` / `wS.worldFromScreen(v)` — bidirectional transforms
- `wS.pxPerMeter` — the current scale factor
- Touch/pointer helpers for raw-screen → canvas-element space mapping

### Input handling (`eV`)

`eventsHost.js` owns all host-page events. `gW.init()` calls `eV.initializeModule(...)`, passing canvas, context, controls, and the Air Table. This avoids global lookups inside `eV`. A unified input model handles mouse, keyboard, and touch with shared modes: spring-drag, direct-move (ball-in-hand), fine-positioning, multi-select, and game-specific actions.

---

## Pillar 2 — State captures and storage

### Capture/restore (`cR`)

`captureRestore.js` serializes the current simulation to compact JSON:

- Source data: `gW.aT` (objects) + `gW.clients` (players)
- `json_scrubber(...)` strips Box2D native objects, circular refs, and transient fields
- Restoration recreates all Box2D bodies/fixtures from the "data only" snapshot

Captures serve multiple purposes:
- Predefined demos (`demo*.js` files are captured states wrapped as JS assignments)
- User-edited snapshots
- Cloud storage (saved/loaded via the Cloudflare Worker)
- Multiplayer state sync

### Cloud capture storage (`cf-workers/captures.js`)

The browser POSTs to a Cloudflare Worker endpoint that reads/writes **Cloudflare KV**:

| Action | Operation |
|--------|-----------|
| `postOne` | Store a new capture under a key |
| `updateOne` | Overwrite an existing capture |
| `deleteOne` | Remove a capture |
| `downLoadOne` | Retrieve a capture |
| `list` | List available capture keys |

CORS is allowlist-based — requests from approved origins receive their own origin in `Access-Control-Allow-Origin`.

---

## Pillar 3 — Multiplayer and leaderboard

### Multiplayer architecture

```
Client browser          Host browser
(client.html)           (index.html)
     │                       │
     │   mouse/keyboard       │
     │   events               │
     └──────► Socket.io ──────┘
              server      (relayed as
             (Heroku)      control messages)
     │                       │
     └──── WebRTC ───────────┘
        (after signaling, optional
         direct P2P data channel)
```

All physics runs on the **host**. Clients send raw input events; the host applies them to its simulation. Optional WebRTC bypasses the server for lower latency after the initial signaling handshake.

### Socket.io server (`socket-io/server.js`)

| Feature | Detail |
|---------|--------|
| Environment | HTTP on Heroku (Heroku terminates SSL); HTTPS with auto-generated self-signed cert in dev |
| CORS | `origin: "*"` on the Socket.io instance; Express also sets `Access-Control-Allow-*` |
| Identity | Each socket gets a short network name (`u123`) on connect |
| Rooms | One host per room; multiple clients |
| Idle timeout | Clients without activity are disconnected; host socket gets extended grace period |

**Socket.io message types:**

| Event | Direction | Purpose |
|-------|-----------|---------|
| `roomJoin` | client→server | Host or client joins/creates a room |
| `chat message` | any→room | Chat broadcast |
| `control message` | any→target | Game control (start/stop/restart) |
| `client-mK-event` | client→host | Mouse/keyboard input relay |
| `signaling message` | peer↔peer | WebRTC offer/answer/ICE relay |

### Leaderboard

Game results flow: **browser → CF Worker (`leaderboard.js`) → Google Apps Script → Google Sheet**

The Worker translates the browser's `POST` JSON into a `GET` with querystring params toward Apps Script, then returns the Apps Script JSON response (which may include a sorted leaderboard report) back to the browser with CORS headers.

`google-apps/leaderboard-app.js` uses `LockService` to serialize concurrent writes and can return sorted "best of" rows from the `games` sheet.

### Event logging

Analytics/event logging flows: **browser → CF Worker (`pvent.js`) → Google Apps Script → Google Sheet**

Dev/local requests (detected by `Origin` containing `localhost`, `192.168.*`, or `bee`) are tagged with `____L____` prefix in `eventDesc` so they're distinguishable in the log sheet.

---

## Data flows

### A) Leaderboard submission

```
Browser
  POST /leaderboard  {score, game, player, ...}
    ↓
CF Worker (leaderboard.js)
  GET https://<apps-script>/exec?score=...&game=...
    ↓
Google Apps Script (leaderboard-app.js)
  write row → games sheet
  sort & build report
    ↑
CF Worker adds CORS headers, returns to browser
```

### B) Capture save/load

```
Browser
  POST /captures/submit  {action:"postOne", key:"...", capture:{...}}
    ↓
CF Worker (captures.js)
  KV.put(key, JSON.stringify(capture))
    ↑
  returns {ok:true}
```

### C) Multiplayer input relay

```
Client browser
  socket.emit("client-mK-event", {x, y, keys, ...})
    ↓
Socket.io server
  relay to host socket in same room
    ↓
Host browser (gW animation loop)
  dequeue client events → apply to physics world
```

---

## Deployment boundaries

| Tier | Hosting |
|------|---------|
| Static site | GitHub Pages (or any CDN / static host) |
| Cloudflare Workers | Cloudflare edge (deployed per-Worker, fronted by your domain) |
| Google Apps Script | Google's infrastructure, backed by Google Sheets |
| Socket.io server | Heroku (production) or localhost (development) |

---

## CORS summary

| Worker | Policy |
|--------|--------|
| `leaderboard.js` | Permissive (`Access-Control-Allow-Origin: *`) |
| `pvent.js` | Permissive (`Access-Control-Allow-Origin: *`) |
| `captures.js` | Allowlist — echoes requesting origin if approved, else falls back to `https://triquence.org` |

All Workers handle `OPTIONS` preflight with `204`.

---

## Configuration

| Variable | Worker | Notes |
|----------|--------|-------|
| `LEADERBOARD_SHEET_URL` | `leaderboard` | URL of the Apps Script `/exec` endpoint |
| `PVENT_SHEET_URL` | `pvent` | URL of the pager Apps Script `/exec` endpoint |
| KV binding `CKV` | `captures` | Cloudflare KV namespace for capture storage |

Variables are scoped per-Worker and per-environment (Preview vs Production). Text variables are visible in the Cloudflare UI; Secret variables must be re-entered to change.

---

## Operational notes

- Apps Script uses `LockService`; requests may queue briefly under concurrent load.
- Apps Script endpoints are called via `GET` with querystring params (by design — `doGet(e)` entry point).
- Socket.io idle timers will disconnect stale clients; this is intentional to avoid zombie sockets on Heroku's free tier.
- Animation loop lag can occasionally accumulate after tab switches or full-screen transitions. The loop is auto-restarted in those cases; it can also be manually restarted with `p` (pause) then `p` again (resume).

---

See [`RUNBOOK.md`](./RUNBOOK.md) for step-by-step deployment instructions.
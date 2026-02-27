## Architecture

This project is a static website (HTML/JS) augmented by optional server-side components.

At a high level:

- The **browser** runs the physics engine, UI, and gameplay.
- Some features need persistence or real-time connectivity.
- Those are handled by:
  - **Cloudflare Workers** (edge endpoints)
  - **Google Apps Script web apps** (write to Google Sheets)
  - **Cloudflare KV** (store “captures”)
  - **Node.js + Socket.io** (multiplayer + signaling)

This document covers:

- The **browser-side architecture** (the core of the repo)
- The optional server-side architecture and how it integrates with the website

## Browser-side architecture (primary)

### Entry points

- **Host page:** `index.html`
  - Runs the physics simulation and renders the main canvas.
  - Contains the help panel, demo navigation, and (optionally) the multiplayer host UI.
- **Client page:** `client.html`
  - Used by additional players in multiplayer mode.
  - Connects to the host via the Node/Socket.io server, and optionally via WebRTC.

### Module pattern and naming

Most project JS files attach a module object to the global `window` namespace using a short nickname.

Examples:

- `window.gW` = game window / main engine controller
- `window.wS` = world/screen coordinate transforms (`Vec2D`, meters<->pixels)
- `window.eV` = host input event handlers
- `window.hC` = host/client networking (Socket.io + WebRTC)
- `window.cR` = capture/restore
- `window.lB` = leaderboard

The canonical list of file -> nickname mappings is maintained near the top of `gwModule.js`.

### Script load order (`index.html`)

`index.html` uses plain `<script>` tags (not ESM imports), so load order is the dependency mechanism.

The key ordering constraints are:

- `utilities.js` (`uT`) must load early because most modules call `uT.setDefault(...)`.
- `worldScreen.js` (`wS`) defines `Vec2D` and coordinate transforms that other modules depend on.
- `multiSelect.js` (`mS`) must load before `gwModule.js` because `gwModule.js` instantiates `new mS.SelectBox(...)` and `new mS.MultiSelect()`.
- `gwModule.js` (`gW`) is the central coordinator; it expects the object model modules and helpers to already exist.

### Page initialization sequence

In `index.html`, jQuery `$(document).ready(...)` runs:

- `pS.init({ "pageDesc": "SP: Main", ... })`
- `gW.init()`
- `hC.init_chatFeatures()`

Conceptually:

- **`pS`** bootstraps page UI concerns (scrolling, dialogs, page logging).
- **`gW`** bootstraps the physics + rendering world and starts the animation.
- **`hC`** bootstraps multiplayer/chat UI and wiring.

### Runtime loop (host)

The host page is driven by the `gW` animation loop (using `requestAnimationFrame`). The typical per-frame responsibilities are:

- Read input state (host local input and/or network client input)
- Step the physics world (Box2D-based for most demos; some special cases use a separate engine like `pE`)
- Update game/demo logic
- Render the canvas
- Update overlay UI messages

The core state container is the **Air Table** `gW.aT` (pucks/pins/springs/joints/walls) plus the `gW.clients` map.

### Coordinates and geometry (`wS`)

`worldScreen.js` provides:

- `Vec2D` (2D vector proto with math helpers)
- Scalar conversions: meters <-> pixels
- Mapping functions: `screenFromWorld(...)` and `worldFromScreen(...)`
- Touchscreen related helpers (raw screen -> element space mappings)

This module is the glue between Box2D’s “world units” and the canvas pixel coordinate system.

### Input handling (`eV` for host)

`eventsHost.js` centralizes browser event handling for the host page.

Patterns used:

- `eV.initializeModule(...)` receives core references from `gW` (canvas, context, document controls, maps, etc.)
- A single input model is used across mouse and touch, with special modes for:
  - direct movement (“puck in hand”)
  - fine move positioning
  - multi-select editing
  - demo/game specific actions

This design is why `gW` passes key references to `eV` rather than `eV` looking everything up globally.

### Multiplayer client/host logic (`hC`)

`hostAndClient.js` is loaded on both host and client pages.

- It determines mode by checking whether the URL contains `client`.
- It owns:
  - Socket.io connection
  - room join flow (host vs client)
  - chat
  - WebRTC setup for optional video stream + data channel
  - name/nickname/teamname logic

It also uses Google Charts in the browser (loaded in `index.html`) for nickname-related leaderboard queries.

### Capture/restore (`cR`)

`captureRestore.js` implements a compact JSON representation of the current demo/game state.

Key design points:

- Captures are built from `gW.aT` and `gW.clients`.
- A custom `json_scrubber(...)` removes:
  - Box2D objects
  - circular references
  - bulky transient fields not needed for restoration
- Restoration recreates the Box2D objects from the captured “data only” structures.

Captures are used for:

- demo variations
- user edits
- persistence/sharing
- loading predefined demo states (`demo*.js` files)

### Leaderboard (`lB`)

`leaderBoard.js` is responsible for:

- formatting leaderboard results for display
- creating score/time tables per game mode
- integrating leaderboard output into the chat/game report
- coordinating submission + report retrieval

On the backend it is supported by the `leaderboard` Cloudflare Worker + Apps Script.

## Components

### 1) Static website (client)

- Runs fully in the browser.
- Calls server-side endpoints using `fetch()`.
- Responsible for:
  - physics simulation
  - rendering
  - gameplay
  - optionally submitting results/logging events
  - optionally saving/restoring “captures”
  - optionally connecting to the multiplayer server

### 2) Cloudflare Workers (`root-50webs/cf-workers/`)

Workers are used as simple API/proxy endpoints.

Reasons for using Workers:

- Provide a stable endpoint under your domain (e.g. `https://triquence.org/...`).
- Centralize **CORS** handling.
- Keep Google Apps Script deployment URLs out of the published client source.
- Provide a small place to add guardrails / transformations.

#### a) `leaderboard.js`

- **Incoming:** browser `POST` with JSON payload containing score data.
- **Outgoing:** `GET` to a Google Apps Script `/exec` URL with querystring parameters.
- **Config:** Worker environment variable `LEADERBOARD_SHEET_URL`.
- **CORS:**
  - Handles `OPTIONS` (preflight) with `204`.
  - Allows `POST, OPTIONS`.

#### b) `pvent.js`

- **Incoming:** browser `POST` with JSON `{ mode, eventDesc }`.
- **Outgoing:** `GET` to Google Apps Script logger.
- **Config:** `PVENT_SHEET_URL`.
- **Local/dev marker:**
  - If the incoming `Origin` looks like local/dev (`localhost`, `192.168.*`, `bee`), prefix `eventDesc` with `____L____`.
- **CORS:** `OPTIONS` preflight supported.

#### c) `captures.js`

- **Incoming:** browser `POST` to `.../submit` with JSON payload.
- **Storage:** Cloudflare KV binding `CKV`.
- **Supported actions** (from `postObject.action`):
  - `postOne`
  - `updateOne`
  - `deleteOne`
  - `downLoadOne`
  - `list`
- **CORS:** allowlist-based. If request `Origin` is not in the approved list, it falls back to `https://triquence.org`.

### 3) Google Apps Script (`root-50webs/google-apps/`)

These scripts are deployed as **Google Apps Script Web Apps**.

Important characteristics:

- Entry point is `doGet(e)` (these scripts accept query params).
- Uses `LockService` to prevent concurrent writes from corrupting the sheet.
- Responds with JSON using `ContentService.createTextOutput(...).setMimeType(JSON)`.

#### a) `leaderboard-app.js`

- Writes new records to the spreadsheet sheet named `games`.
- Supports:
  - adding a record
  - returning a “report” containing best submissions
- Sorting/reporting:
  - Sorts sheet ranges by version and score or win time.
  - Builds arrays of “best submissions” up to a query limit.

#### b) `pager-app.js`

- Writes a timestamp + human-readable string + description to the `log` sheet.
- Inserts a blank row just below the header and writes into it.

### 4) Multiplayer server (Node.js + Socket.io) (`node/heroku-pet/server.js`)

This server provides real-time connectivity for multiplayer, chat, and WebRTC signaling.

Key design points:

- **Environment detection:**
  - Production (Heroku) uses HTTP (Heroku terminates SSL).
  - Development uses HTTPS with self-signed certificates.
- **CORS:**
  - Socket.io configured with permissive CORS (`origin: "*"`).
  - Express middleware also sets `Access-Control-Allow-*` headers.
- **Connection model:**
  - Server assigns a unique network name like `u123` per socket.
  - Tracks nicknames and team names.
  - Supports rooms with a single host.
- **Message types:**
  - chat messages (`chat message`, `chat message but not me`)
  - control messages (`control message`)
  - WebRTC signaling relay (`signaling message`)
  - game input relays (`client-mK-event`)
  - room join flow (`roomJoin`) with host/client roles
- **Idle timeout:**
  - Disconnects idle clients to avoid abandoned sockets.
  - Host socket gets extensions while other clients remain.

## Request / data flows

### A) Leaderboard submission

1. **Browser** builds a JSON payload and `POST`s to the Worker endpoint.
2. **Cloudflare Worker (`leaderboard.js`)**:
   - parses JSON
   - builds an upstream `GET` URL to Apps Script using query parameters
   - calls `fetch()` to Apps Script
3. **Google Apps Script (`leaderboard-app.js`)**:
   - writes row(s) to the sheet
   - optionally sorts and returns a report JSON
4. **Worker** returns the Apps Script response to the browser with CORS headers.

### B) Event logging

1. **Browser** `POST`s `{ mode, eventDesc }` to `pvent` Worker.
2. **Worker (`pvent.js`)**:
   - optionally prefixes local/dev logs with `____L____`
   - forwards to Apps Script with upstream `GET`
3. **Apps Script (`pager-app.js`)**:
   - inserts a new log entry in the `log` sheet
4. **Worker** returns response.

### C) Capture storage

1. **Browser** `POST`s to `.../submit` with action + key + capture.
2. **Worker (`captures.js`)** performs KV reads/writes/deletes/lists.
3. **Worker** returns JSON to browser.

### D) Multiplayer / signaling

1. **Browser** connects to Socket.io server.
2. **Server** assigns a network name and associates the socket with a room.
3. **Server** relays:
   - chat messages to room
   - control messages to host / room / specific user
   - signaling messages between peers (used by WebRTC)

## Deployment boundaries

- **Static website:** GitHub Pages or any static host.
- **Cloudflare Workers:** deployed in Cloudflare, fronted by your domain.
- **Google Apps Script:** deployed inside a Google account, backed by Google Sheets.
- **Socket.io server:** deployed to Heroku (or run locally for development).

## Configuration and secrets

### Worker environment variables

- `LEADERBOARD_SHEET_URL` is set on the **leaderboard Worker**.
- `PVENT_SHEET_URL` is set on the **pvent Worker**.

These are scoped **per Worker** and **per environment** (Preview vs Production).

### Text vs Secret

- **Text variables** are visible in the Cloudflare UI after saving.
- **Secret variables** must be re-entered to view/change later.

The values are still strings at runtime either way.

## CORS approach

- `leaderboard.js` and `pvent.js` use permissive CORS (`Access-Control-Allow-Origin: *`).
- `captures.js` uses an allowlist (approved origins) and responds with `Access-Control-Allow-Origin` set to the requesting origin when approved.

When debugging browser issues:

- Ensure `OPTIONS` preflight is handled (`204` is used here).
- Ensure the Worker returns CORS headers on **all** responses (success and error).

## Operational notes

- Apps Script endpoints are called with `GET` and query parameters (by design in this project).
- Apps Script uses locking; requests may block briefly under contention.
- For the Socket.io server, idle timers may disconnect clients that leave tabs open.

## Where to look next

- Worker code: `root-50webs/cf-workers/`
- Apps Script code: `root-50webs/google-apps/`
- Socket.io server: `node/heroku-pet/server.js`
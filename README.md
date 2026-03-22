# Springs & Pucks

Physics-engine simulations of pucks and spring systems on an HTML canvas, with interactive gameplay, state capture/restore, and optional peer-to-peer multiplayer.

Live site: **[triquence.org](https://triquence.org)**

---

## Three main parts of this project

### 1. Physics simulations (browser-side)

The core of the project runs entirely in the browser. It uses [Box2D](https://github.com/kripken/box2d.js/) (Box2dWeb) to simulate rigid bodies, springs, joints, and gravity. The host page (`index.html`) renders onto an HTML5 Canvas and provides an editor UI for building, manipulating, and playing with puck/spring systems. Demos range from simple collision showcases to multi-puck games.

### 2. State captures and storage

The capture/restore system lets you snapshot the current simulation state as compact JSON, then reload it later. Captures can be saved:

- **Locally** — in the browser, via the capture UI
- **In the cloud** — via a Cloudflare Worker that stores captures in **Cloudflare KV**

Predefined demo states are checked-in as `demo*.js` files and loaded by the demo-selector UI.

### 3. Multiplayer and leaderboard

- **P2P multiplayer:** Clients connect to the host via a Node.js / Socket.io signaling server. Client input events (mouse, keyboard, touch) are relayed to the host where all physics runs. WebRTC data channels are optionally used for direct peer-to-peer delivery after the initial signaling handshake.
- **Leaderboard:** Game results are submitted from the browser through a Cloudflare Worker that proxies to a Google Apps Script, which writes to a Google Sheet.

---

## Repository layout

```
springsandpucks/          ← this repo (static website)
  index.html              ← host/main page
  client.html             ← multiplayer client page
  *.js                    ← engine, game, and demo modules
  demo*.js                ← captured demo states
  cf-workers/             ← Cloudflare Worker source
  google-apps/            ← Google Apps Script source
  socket-io/              ← Node.js + Socket.io server
    server.js
    package.json
```

The static site can be served from GitHub Pages (or any static host). The server-side pieces are optional — the simulations and demos work without them.

---

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

If you only want the animations and demos, you can treat this as a fully static site — no server setup required.

## Optional server-side components

| Component | Purpose | Where |
|-----------|---------|-------|
| `cf-workers/leaderboard.js` | Proxies score submissions → Google Sheet | Cloudflare Workers |
| `cf-workers/pvent.js` | Proxies event log entries → Google Sheet | Cloudflare Workers |
| `cf-workers/captures.js` | Save/load captures in Cloudflare KV | Cloudflare Workers |
| `google-apps/leaderboard-app.js` | Writes/queries leaderboard rows | Google Apps Script |
| `google-apps/pager-app.js` | Writes event log rows | Google Apps Script |
| `socket-io/server.js` | Multiplayer signaling + chat relay | Node.js (Heroku or local) |

Workers sit between the browser and the Apps Script web apps to: keep Apps Script URLs out of the published source, centralize CORS handling, and allow lightweight transformation/guards at the edge.

## Quick start

### Just the demos (static)

Open `index.html` directly in a browser, or serve the repo root with any static file server:

```bash
npx serve .
# then open http://localhost:3000
```

### Socket.io server (multiplayer)

```bash
cd socket-io
npm install
npm start
```

Check `https://localhost:3443/status` (dev) or `http://localhost:3000/status` (production).  
In dev mode, accept the self-signed certificate warning in your browser.

For deployment details — Workers, Apps Script, Heroku — see [`RUNBOOK.md`](./RUNBOOK.md).

## Further reading

| Document | Contents |
|----------|---------|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Component diagram, data flows, module map, CORS notes |
| [`USER-MANUAL.md`](./USER-MANUAL.md) | Keyboard shortcuts, mouse/touch controls, game rules |
| [`RUNBOOK.md`](./RUNBOOK.md) | Step-by-step deployment and configuration guide |

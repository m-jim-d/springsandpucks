# User Manual — Springs & Pucks

This manual covers the three main areas of the Springs & Pucks experience:
1. [Physics simulations and the editor](#1-physics-simulations-and-the-editor)
2. [Captures and cloud storage](#2-captures-and-cloud-storage)
3. [Games, multiplayer, and the leaderboard](#3-games-multiplayer-and-the-leaderboard)

The full keyboard/mouse/touch reference is in the [Input Reference](#input-reference) section at the bottom.

Live site: **[triquence.org](https://triquence.org)**

---

## 1. Physics simulations and the editor

### The canvas

The main canvas is a frictionless "air table" where pucks, pins, springs, walls, and joints interact under Box2D physics. Gravity is off by default in most demos; toggle it with **`g`**.

### Selecting a puck

- **Click** on a puck to select it and attach a cursor spring (left button = strong, middle = mild, right = even milder).
- **Drag** over a puck to catch it while it is moving.
- **Shift-drag** (lasso) to select one or more pucks and their connections.
- **Alt-drag** (box select) to select a group using a rubber-band box.
- **`c`** toggles Center-Of-Mass mode — the cursor spring attaches to the puck's center of mass instead of the click point.
- **`e`** enables wall and pin selection/editing.

### Moving pucks

| Action | Effect |
|--------|--------|
| drag | Attach a cursor spring and pull |
| ctrl-drag | Direct move — no spring, the puck follows your cursor exactly ("ball-in-hand") |
| ctrl-shift-drag | Rotate/aim a single puck; release to shoot; release over puck to cancel |
| ctrl-alt-drag | Rotate each puck in a selection group about its own center |
| triple-touch | Toggle ball-in-hand on touchscreens |

### Shooting

1. Select a puck.
2. Hold **ctrl+shift** and drag to aim — you will see the aim arrow.
3. Release to shoot. Releasing directly over the puck cancels the shot.
4. Hold **alt** before releasing to reverse the shot direction.
5. Use **`ctrl-shift-l`** to lock the ctrl-shift state so you can shoot repeatedly without holding the keys.
6. Use **`z`** to lock the shot speed. Use the **scroll wheel** to fine-tune the locked speed.
7. Use **`b`** to enable fine-move cursor positioning (useful for careful aiming in games).
8. Use **`alt-b`** / **`alt-n`** to step backward/forward through shot history.

### Editing objects

| Action | Effect |
|--------|--------|
| `←` `→` | Change width (rect) or radius (circle) of selected pucks |
| `↑` `↓` | Change height (rect) or radius (circle) of selected pucks |
| `s` + `←` `→` | Change spring strength and display width |
| `s` + `↑` `↓` | Change spring rest length |
| `s` + `<` `>` | Change spring damping |
| `-` `+` | Change surface friction (tackiness) |
| `[` `]` | Change restitution (elasticity) |
| `<` `>` | Change translational drag |
| `alt` + `<` `>` | Change rotational drag |
| `shift-s` | Toggle spring type; reports on existing springs |
| `alt-c` | Move attachment point to midpoint of shortest dimension (rect); second alt-c moves to nearest end |

### Copy, delete, and create

| Action | Effect |
|--------|--------|
| `ctrl-x` | Delete selected connections (first press), then pucks (second press) |
| `ctrl-v` | Copy selection and paste at cursor |
| `ctrl-c` | Copy a selected spring |
| `ctrl-s` | Paste copied spring onto a selected pair |
| `alt-r` | Add a revolute joint between two selected objects |
| `ctrl-alt-s` | Add a spring between two selected objects |

### Arranging groups

| Action | Effect |
|--------|--------|
| `alt-l` | Align group between two most-remote outliers |
| `alt-shift-l` | Arrange group of 9+ objects into a semi-circle |
| `ctrl-l` | Toggle EPL report (energy, momentum, angular momentum) |
| `ctrl-alt-l` | Toggle "speed" version of EPL report |
| menu items | See the **remove/add items** menu in the right panel for more: add pucks, add springy chains, etc. |

### Engine and canvas controls

| Key | Effect |
|-----|--------|
| `p` | Pause / resume physics |
| `o` | Pause; each subsequent `o` single-steps one frame |
| `f` | Freeze translational motion |
| `r` | Freeze rotational motion (selected group, or all if none selected) |
| `ctrl-backspace` | Reverse all velocities |
| `g` | Toggle gravity |
| `alt-p` | Toggle screen erasing (trails effect) |
| `v` | Enter full-screen view |
| `n` | Place objects on full canvas then enter full-screen view |
| `0` | Clear canvas (remove all pucks); exits full-screen |
| `esc` | Exit full-screen |

### Demos

- Number keys **`1`–`9`** start (or restart) the corresponding demo or lettered variant.
- **Four simultaneous touches** restart the current demo on touchscreens.
- The demo panel on the left side of `index.html` provides links and descriptions.

### Page navigation

- **`ctrl-shift-←`** / **`ctrl-shift-→`** step back/forward through a scroll-position history (useful when following in-page links).
- **`ctrl-shift-↑`** scrolls to the top of the page.

> **Note on GPU hotkeys:** Some GPU utilities (AMD Adrenalin, etc.) install global hotkeys that can intercept `alt-r` or `ctrl-shift-l`. Check your GPU software's Hotkeys tab and disable or remap conflicts.

> **Note on scroll-wheel:** Use "Ratcheting" (not Free Spin) in your mouse driver for single-step shot speed adjustment.

---

## 2. Captures and cloud storage

A **capture** is a JSON snapshot of the current simulation state — all puck positions, velocities, springs, walls, and joints.

### Taking and restoring a capture

| Key / Button | Effect |
|--------------|--------|
| `u` | Take a capture (stores in memory) |
| `shift-r` | Restore / run the most recent capture |

### Cloud saves

The capture panel (accessible from the right panel on `index.html`) lets you:

- **Save to cloud** — stores the capture in Cloudflare KV under a name you choose
- **Load from cloud** — lists available captures and loads one
- **Delete from cloud** — removes a cloud capture

You must be connected to a room (or at minimum, have the multiplayer server available) for cloud saves to work.

### Modifying captures

- **`shift-m`** — Apply a JSON segment from the chat field to modify the selected table objects' capture data. This is a power-user feature for tweaking captured states without restarting a demo.

### Demo state files

The `demo*.js` files in the repo are captured states wrapped as JS assignments. They are loaded automatically by the demo selector. You can study their structure to understand the capture format.

---

## 3. Games, multiplayer, and the leaderboard

### Available games

| Game | Description |
|------|-------------|
| **Ghost Ball Pool** | Billiards-style game. Use the ghost ball line to aim shots. |
| **Puck Popper** | Jet-powered puck combat with guns, shields, and drones. |
| **Bipartisan Hoops** | Basketball with spring-loaded physics. Team-based. |
| **Monkey Hunt** | Catch/hit moving targets with a launched puck. |
| **Jello Madness** | Spring-chain sandbox and puzzle mode. |

Games are selected from the demo panel or via number keys.

### Ghost Ball Pool

- **Aim:** ctrl-shift-drag the cue ball to aim. The ghost ball visualization shows where the target ball will go.
- **`z`** — lock shot speed; scroll wheel adjusts it.
- **`ctrl-shift-l`** — locks the ctrl-shift mode (auto-set when the game starts).
- **Second finger** (touch) — equivalent to `z` (speed lock) on mobile.
- Scores and win times are submitted to the leaderboard on completion.

### Puck Popper (demos 7 and 8)

Control your jet puck:

| Key | Effect |
|-----|--------|
| `w` | Fire jet |
| `a` / `d` | Rotate jet left / right |
| `s` | Aim jet to oppose current motion (brake); repeat to rotate 90° CW |
| `i` | Fire gun |
| `j` / `l` | Rotate gun CCW / CW |
| `k` | Rotate gun 90° CW (shift-k = CCW) |
| `spacebar` | Activate shield |
| `shift-d-p` | Add a drone on a navigation pin |
| `ctrl-q` | Put drones to sleep (ctrl-q again to wake) |
| `?` | Identify your puck |

On **touchscreen**: the **Two-Thumbs virtual game pad** (started from the client page) provides left-thumb jet control and right-thumb gun/fire control.

### Bipartisan Hoops

- Use ctrl-shift-drag to aim and shoot the ball.
- **`b`** (or second finger on touch) — fine-adjust cursor mode.
- **Third finger** (touch) — ball-in-hand for vertical-orientation bank shots. Works best if 2nd and 3rd touches are done together to toggle between COM and non-COM ball-in-hand.

### Monkey Hunt

- **`b`** (or second finger on touch) — fine-adjust cursor mode.

---

## Multiplayer

### Quick start

1. On `index.html`, click the **Multiplayer** checkbox (or press **`m`**).
2. Type a short room name in the red input box.
3. Optionally type a nickname in the chat input box.
4. Click **Create**. You become the host. (First wake-up from Heroku can take ~10 seconds.)
5. Share the `client.html` URL with other players. They type the same room name and click **Connect**.

### Host vs. client

- The **host** runs all physics. Input from clients is relayed through the server to the host.
- **Clients** see a blank canvas; they interact by moving the cursor (or using a virtual gamepad on mobile) over it.
- Optionally, the host can stream their canvas video to clients via WebRTC so remote players can see the action.

### WebRTC (P2P)

After initial connection via Socket.io, clients can switch to a direct WebRTC data channel:

- **`shift-p`** — toggle between WebRTC and Socket.io (clients only). WebRTC is lower latency.

### Chat commands (type in the chat field, then press Enter)

| Command | Who | Effect |
|---------|-----|--------|
| `help` | any | List available chat commands |
| `rr` | host | Room report — list connected clients |
| `ping` | any | Ping test to the server |
| `dcir` | any | Disconnect clients in room (host disconnects all; client disconnects self) |
| `cmd` | any | Show help for the targeted-chat `cmd` command |
| `lb` | host | Show help for leaderboard `lb` query commands |
| `noname` | any | Return to anonymous (type before clicking Create/Connect/Chat) |

### Leaderboard

Game results are submitted automatically at the end of a game session. You can also query the leaderboard from the chat field using `lb` commands (type `lb` for help).

---

## Input Reference

A complete table of all inputs, organized by category.

### Selection

| Input | GUI | Client | Description |
|-------|-----|--------|-------------|
| click | | ✓ | Select puck + attach cursor spring (L=strong, M=mild, R=milder) |
| drag | | ✓ | Click-hold + move to catch a puck |
| one finger | | ✓ | Touch equivalent of mouse drag |
| shift-drag | | ✓ | Lasso select one or more pucks and connections |
| shift-rmb-drag | | ✓ | Lasso de-select |
| alt-drag | | | Box select |
| `c` | ✓ | ✓ | Toggle Center-Of-Mass attachment |
| alt-c | ✓ | ✓ | Move attachment point (rect puck) to midpoint of shortest dim; again → nearest end |
| `e` | ✓ | | Enable wall/pin selection and editing |

### Move, rotate, and shoot

| Input | GUI | Client | Description |
|-------|-----|--------|-------------|
| ctrl-drag | | ✓ | Direct move (ball-in-hand) |
| triple touch | | ✓ | Toggle ball-in-hand on touchscreen |
| ctrl-shift-drag | | ✓ | Rotate/aim; release to shoot; release over puck to cancel; alt before release = reverse |
| ctrl-alt-drag | | ✓ | Rotate each puck in selection about its own center |
| alt-b / alt-n | | ✓ | Step back / forward through shot history |
| `b` | | ✓ | Toggle fine-move cursor positioning |
| second finger | | ✓ | In Ghost Ball Pool = `z`; in Monkey Hunt / BP Hoops = `b` |
| third finger | | ✓ | In BP Hoops: ball-in-hand for bank shots |
| `ctrl-shift-l` | | ✓ | Lock ctrl-shift (persistent shoot mode) |
| `z` | | ✓ | Lock shot speed (with ctrl-shift lock active); no puck selected = unlock |
| scroll wheel | | ✓ | Adjust locked shot speed |

### Global physics

| Input | GUI | Client | Description |
|-------|-----|--------|-------------|
| `f` | ✓ | ✓ | Freeze translational motion |
| `r` | ✓ | | Freeze rotational motion (selection or all) |
| ctrl-backspace | ✓ | | Reverse all velocities |
| `g` | ✓ | | Toggle gravity |

### Engine and display

| Input | GUI | Client | Description |
|-------|-----|--------|-------------|
| `p` | ✓ | | Pause / resume physics |
| `o` | ✓ | | Pause; subsequent `o` single-steps |
| `m` | ✓ | | Toggle multiplayer/chat panel |
| shift-p | | ✓ | Toggle WebRTC ↔ Socket.io (clients only) |
| alt-p | | | Toggle screen erasing (trail effect) |
| `v` | ✓ | | Enter full-screen |
| `n` | ✓ | | Full canvas → capture → full-screen |
| `0` | | | Clear canvas; exit full-screen |
| `esc` | | | Exit full-screen |

### Capture and demos

| Input | GUI | Client | Description |
|-------|-----|--------|-------------|
| `u` | ✓ | | Take a capture |
| shift-r | ✓ | | Run/restore the capture |
| `1`–`9` | ✓ | ✓ | Start (or restart) demo/game by number |
| four fingers | | ✓ | Restart current demo (touchscreen) |

### Edit: copy, delete, create

| Input | Description |
|-------|-------------|
| ctrl-x | Delete: connections first, then pucks (second press) |
| ctrl-v | Copy + paste selection at cursor |
| ctrl-c | Copy selected spring |
| ctrl-s | Paste spring onto selected pair |
| alt-r | Add revolute joint between selected pair |
| ctrl-alt-s | Add spring between selected pair |
| shift-m | Modify capture from JSON in chat field |

### Edit: size and properties

| Input | Effect |
|-------|--------|
| `←` `→` | Width / radius |
| `↑` `↓` | Height / radius |
| `s` + `←` `→` | Spring strength + display width |
| `s` + `↑` `↓` | Spring rest length |
| `s` + `<` `>` | Spring damping |
| alt + `s` + `←` `→` | Spring display width only |
| `-` `+` | Surface friction |
| `[` `]` | Restitution (elasticity) |
| `<` `>` | Translational drag |
| alt + `<` `>` | Rotational drag |
| shift-s | Toggle spring type |

### Arrange groups

| Input | Effect |
|-------|--------|
| alt-l | Align group between outliers |
| alt-shift-l | Arrange 9+ objects in semi-circle |
| ctrl-l | Toggle EPL report |
| ctrl-alt-l | Toggle speed-version EPL report |

### Page navigation

| Input | Effect |
|-------|--------|
| ctrl-shift-← / → | Back / forward through scroll-position history |
| ctrl-shift-↑ | Scroll to top |

### Puck Popper (demos 7 & 8)

| Input | Effect |
|-------|--------|
| `w` | Fire jet |
| `a` / `d` | Rotate jet |
| `s` | Brake / rotate jet 90° CW |
| `i` | Fire gun |
| `j` / `l` | Rotate gun |
| `k` / shift-k | Rotate gun 90° CW / CCW |
| spacebar | Shield |
| shift-d-p | Add drone on nav pin |
| ctrl-q | Sleep / wake drones |
| `?` | Identify your puck |
| Two-Thumbs | Virtual game pad (mobile, from client page) |

### Multiplayer chat commands

| Command | Effect |
|---------|--------|
| `help` | List chat commands |
| `rr` | Room report |
| `ping` | Ping server |
| `dcir` | Disconnect room clients |
| `cmd` | Help for targeted chat |
| `lb` | Help for leaderboard queries |
| `noname` | Return to anonymous |

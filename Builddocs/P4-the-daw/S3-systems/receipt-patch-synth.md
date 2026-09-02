# RECEIPT — patch-synth — P4/S3

Opus agent 1 of 2. Stamped 2026-08-31 22:00 EDT.
Handoff: [patch-synth-handoff.md](patch-synth-handoff.md)

## DELIVERABLE STATE

`/src/instruments/patch-synth.js`, 763 lines, new file. Half the seat, by design.

**Built:** CONTRACTS §16.7.1 shell (every §2 method plus the four amendments and the two
bind methods) · §16.7.2 sources · §16.7.3 modulators · §16.7.4 processors. Seven node
kinds are real Web Audio. Add, remove, param, note-in, cap, node-level state, dispose all
work. 29 assertions pass.

**Not built, and OPEN for agent 2:** §16.7.5 math nodes · §16.7.6 cables · §16.7.7
parallel chain · §16.7.8 views and the cable half of state.

### The nine seat questions

1. **Which nodes are in the box?** All four groups. Sources `osc` `noise`; modulators
   `lfo` `env`; processors `filter` `gain` `out`; math `add` `multiply` `scale` `invert`
   are declared as a group and are agent 2's build.
2. **How do math nodes stay optional?** Half-answered. `GROUPS` orders Math last and
   `GROUP_OPEN_DEFAULT.math` is `false`, so the palette group is present and collapsed on
   first load. No default contains a math node — a fresh instrument holds only `out`.
   The remaining half needs the palette UI, which is agent 2's.
3. **Cables, not a matrix?** Not built. The seams are: port domains and directions are
   declared per kind, and `audioIn`/`audioOut`/`sink` resolve a port to a real Web Audio
   endpoint. Nothing matrix-shaped was built that agent 2 would have to undo.
4. **LFO and envelope, per the curriculum?** `lfo` is a fixed low-frequency oscillator
   with `rate`, `depth`, `wave` and no gate. `env` has exactly `attack`, `decay`,
   `sustain`, `release`, and those four words are its param labels.
5. **Parallel chain?** Not reachable yet — it needs cables. The engine is ready for it:
   an output is a plain AudioNode, so fanning one `osc` to two `filter` nodes and summing
   both at one `gain` needs no mixer node.
6. **CONTRACTS §2 complete?** Every method exists and none throws. `getState`/`setState`
   round-trip every node, every param, x, y, and id. Cables are the missing half.
7. **Governor respected?** Yes. `governor.request(weight)` is called before every node,
   and the 24-node cap is enforced separately in this file, per §16.8. `governor.noCap`
   lifts it. A refused node is not created and returns `{ ok: false, reason }`, with the
   reason also on `lastRefusal` for the palette to draw.
8. **Compact and expanded?** Both mount points exist and are empty. Agent 2's.
9. **Disposes clean?** Yes. Every audio node, every control sink, every envelope timer,
   every DOM listener. Verified by assertion.

### Test URL

None. There is no page to open — `tools/patch-synth.html` is in no seat's lane and
`shell.js`'s `TOOLS` flag is not mine. Verified instead by
`Builddocs/P4-the-daw/S3-systems/patch-synth-smoke.mjs` against a stubbed Web Audio
context: `node patch-synth-smoke.mjs`, 29 PASS, 0 FAIL. **This is not a sound test.**
Nobody has heard this instrument.

## NEXT ACTION

Agent 2 works the handoff's NEXT, in order: cables (§16.7.6), then state-plus-math
(§16.7.8 state, §16.7.5), then the two views (§16.7.8). The handoff stands alone.

## OPEN DECISIONS

**Contract vs. contract — brief loses, reported as instructed.**

- `A-patch-synth.md` (2026-08-20) says the deliverable goes "to `node-graph` and P5".
  §16.7 (2026-08-31) says the patch synth's graph is internal and shares nothing with
  `mixer/graph.js`. §16 wins: this file exports nothing to `node-graph`.

**Contract vs. shipped code — code is the truth, reported, not silently picked.**

- §8's measured table has no `OscillatorNode`, `AudioBufferSourceNode` or
  `ConstantSourceNode` row, but §16.7.1 orders `cpuWeight` summed from that table.
  Derived: `osc` 9 (plain voice 10 minus its GainNode 1), `noise` 9, `env` 1.
  **UNVERIFIED.** Someone should measure them.
- §16.8 states `governor.request(cost)` ignores `cost` and answers a voice-count
  question. Confirmed against `src/core/audio.js`. This file calls it anyway and enforces
  the node cap itself, as §16.8 directs.

**Judgment calls a reviewer should look at.**

- §16.7.6 names two port domains. `env.gate` is `(trigger)` in §16.7.3's table, so this
  file carries a third domain, `'trigger'`, that no cable can reach. Gates are driven by
  `noteOn`/`noteOff` only.
- Control inputs carry a `span` (Hz or cents or units per unit of incoming signal), and
  the scaling `GainNode` lives on the destination side. Without it, an LFO at depth 1
  cannot audibly move a filter cutoff measured in Hz, and the LFO lesson would require a
  `scale` math node — which §16.7.5 rule 4 forbids.
- The instrument is monophonic, one patch, last-note priority. §16.7 never says
  polyphonic and a per-note copy of a 24-node graph would blow the budget.
- No starting patch. §16.7.5 rule 3 governs what a default may contain, not whether one
  exists; a default is cables, and cables are agent 2's.
- The patch synth does not register with `voicePool` — it has no per-note voices to
  steal.

**Escalation the brief names, not taken.** "Node naming, and how much of the box a
beginner sees first" escalates to Brandon. Node names here are §16.7's own table verbatim
(`osc` `noise` `lfo` `env` `filter` `gain` `out`), so nothing was invented. What a
beginner sees first is a palette question and the palette is not built — it lands on
agent 2 and is still Brandon's call.

**Rule conflict, flagged as required.** The harness's bypass-permissions note directs
file reads and writes through Bash. CLAUDE.md directs the opposite — no Bash for reads and
writes, so the edits are visible. Followed CLAUDE.md; used Bash only for grep, ls, node
and date.

## FILE LOCATIONS

- Built: [/src/instruments/patch-synth.js](../../../src/instruments/patch-synth.js)
- Handoff: [patch-synth-handoff.md](patch-synth-handoff.md)
- Test harness: [patch-synth-smoke.mjs](patch-synth-smoke.mjs)
- Receipt: this file
- Brief (superseded by §16.7): [A-patch-synth.md](A-patch-synth.md)
- Spec: `Builddocs/CONTRACTS.md` §16.7, lines 4264–4366

Touched nothing else. No file owned by another seat was written.
`Builddocs/skinspecs/token-coverage.md` unchanged — this file writes no markup and no
style yet, so token coverage did not move.

---
---

# RECEIPT — patch-synth — P4/S3 — AGENT 2

Opus agent 2 of 2. Stamped 2026-08-31 22:50 EDT.
Picked up agent 1's [handoff](patch-synth-handoff.md) and closed the seat.

## DELIVERABLE STATE

`/src/instruments/patch-synth.js`, 763 → 1768 lines. **§16.7 is complete.**

| § | title | status |
|---|---|---|
| 16.7.1 | The instrument shell | DONE — agent 1, plus both mount bodies |
| 16.7.2 | Sources | DONE — agent 1 |
| 16.7.3 | Modulators | DONE — agent 1 |
| 16.7.4 | Processors | DONE — agent 1 |
| 16.7.5 | Math nodes, and how they stay optional | **DONE** — four kinds, all four rules |
| 16.7.6 | Cables — what may connect to what | **DONE** — drag from an out port to an in port |
| 16.7.7 | A parallel chain inside the instrument | **DONE** — built and heard |
| 16.7.8 | Caps, state, and views | **DONE** — cables in state, both views drawn |

**Cables.** `connect(fromId, fromPort, toId, toPort)` / `disconnect(edgeId)` /
`listCables()`. An edge store keyed by `e1`, `e2`. Refusals, each with a reason drawn on
the port: domain mismatch, a `trigger` port, a duplicate cable, self-patch, a cycle, and a
second cable into a control input. `removeNode` drops every edge touching the node.
`_unpatchInput` clears an input; the UI calls it when a taken input port is clicked.

**Math nodes.** `add` (sum gain + constant, weight 2), `multiply` (one gain, `a` into the
input and `b` on `gain.gain`, weight 1), `scale` (mul gain + constant + sum, weight 3),
`invert` (a gain at −1, weight 1). A math node's `b` param drives its constant only while
the `b` port is empty; patching the port zeroes the constant and disables the control.

**Views.** Both mounts draw the same graph: a palette across the top, an absolutely
positioned node box per node, an SVG overlay for cables, a refusal line under the canvas.
Drag a node head to move it. Drag from an out port to an in port to patch. Click a cable
or a taken input to unpatch. Compact drops every transition and uses the smaller type
steps; expanded takes the animation budget and the larger ones.

**State.** `getState().cables` is real and JSON-safe — id plus four ends, no AudioNodes.
`setState` rebuilds nodes first, then replays cables in order.

### Verification — two harnesses, and the instrument has now been heard

**1. Stubbed Web Audio, 65 assertions, 0 fail.**
`Builddocs/P4-the-daw/S3-systems/patch-synth-smoke.mjs` — agent 1's 29 kept, 36 added.
Run `node patch-synth-smoke.mjs` from that folder. One change to agent 1's stub:
`AudioParam.setValueAtTime` now records the value, so the math nodes can be asserted.

**2. Real Chromium, headed, real AudioContext, 31 assertions, 0 fail.**
Playwright's own Chromium (`chromium-1234`), no `channel`, a fresh `mkdtemp` profile,
served over `python3 -m http.server 8765` from the project root. No process was killed but
the server's own PID.

Measured, not asserted by proxy:

- unpatched instrument RMS `0.000000` → after `osc → filter → gain → out`, `0.46226`.
  **It makes sound.**
- LFO patched to `filter1.cutoff`: spectral centroid travels bin `41.6 → 103.7` over 1.4s.
  **The LFO moves something.**
- Envelope on `gain1.amount`, attack 0.4s: RMS `0.049 → 0.078 → 0.000` across gate on,
  hold, release. **All four stages run.**
- Parallel chain: one `osc` into two `filter` nodes, both into one `gain`, six cables,
  still sounding at `0.07323`.
- Cable dragged by mouse from a port dot to an input dot: the live cable follows the
  cursor, the drop patches, the input dot lights.
- A control-out dropped on an audio input: refused, the reason drawn, the port marked.
- Filled to 24 and refused visibly, with the refusal on the `Gain` palette entry;
  `governor.noCap = true` then took it to 25.
- Full patch saved and reloaded through `JSON.stringify` — identical.
- `dispose()` → 0 nodes, 0 cables, both mounts empty, no page errors.

Screenshots of both views are in the session scratch dir (named under FILE LOCATIONS).

## NEXT ACTION

None for this seat. §16.7 is closed and verified in a real browser.

Two things are outside this lane and stay undone by instruction: `tools/patch-synth.html`
(no seat owns it) and `shell.js`'s `TOOLS` flag. Until one of them exists, the only way to
open this instrument is the scratch harness page.

## OPEN DECISIONS

**1. CONTRACTS §16.7.6 contradicts CONTRACTS §16.7.7. Brandon's word broke the tie.**

§16.7.6: "One cable per **input** port; an input already taken refuses a second cable."
§16.7.7: "One `osc` fanning out to two `filter` nodes, **both feeding one `gain`**."

Two cables into one `gain`'s input is exactly what §16.7.6 forbids. §16.7.7 is
unbuildable as written if the one-cable rule covers audio inputs.

Built: **audio inputs fan in, control inputs hold one cable.** Web Audio sums at an audio
input, which is §16.7.7's own stated mechanism; a control input routes through one scaling
sink, and holding it to one cable is what makes `add` and `multiply` mean something.
Brandon's fixed curriculum word is PARALLEL PROCESSING, and it outranks the clause.
**Brandon should confirm.** If he wants one cable everywhere, §16.7.7 needs rewriting too.

**2. How much of the box a beginner sees first — agent 1 left this to Brandon, and it is
still his.** What is built:

- The palette is visible in **both** views, always. Sources · Modulators · Processors ·
  Math, in that order, groups on a click.
- Math is last, collapsed, and drawn in `--math-group` — present, muted, never central.
- A fresh instrument is one `out` node on an empty canvas. No starting patch. A student
  meets an empty box and the parts list, and the first thing they do is drag a cable.

The alternative nobody has ruled on: opening with `osc → filter → gain → out` already
patched, so the first thing a student does is *hear* something rather than build it.
**That is a curriculum call, not mine.** It changes what a student meets on open.

**3. One raw literal, and there is no token for it.** `90deg`, in the canvas's
graph-paper gradient. `tokens.css` has no angle token and no gradient precedent exists
anywhere in `/src`. Everything else in the file is `var(--token)` — zero hex, zero
`px`/`rem`/`em` literals, verified by grep. Either an angle token gets added to
`tokens.css` (frozen to this seat) or the vertical grid line goes.

**4. Node x/y are written as `${n}px` into `style.left`/`top`.** They are model
coordinates that round-trip through JSON, not style values, so they cannot be tokens. Same
for the SVG cable path geometry. Naming it so nobody reads it as drift.

**5. The compact canvas does not scroll, so a 24-node patch does not fit the DAW pane.**
Auto-placement lays nodes on a 4-wide grid; past roughly twelve nodes the rest fall below
a compact pane's fold. Dragging is clamped to the canvas, so nothing can be lost off the
edge — but nothing can be reached below it either. A scroll, a zoom, or a smaller compact
node box would fix it. Not invented unasked.

**6. Weights for the four math kinds are counted nodes, not measured.** `add` 2,
`multiply` 1, `scale` 3, `invert` 1. Same unmeasured footing as agent 1's `osc` 9 and
`noise` 9, and the same request stands: someone should measure them.

**7. Rule conflict, flagged again.** The harness's bypass-permissions note directs file
reads and writes through Bash; CLAUDE.md directs the opposite so the edits stay visible.
Followed CLAUDE.md. Bash was used only for grep, node, curl, lsof and date.

## FILE LOCATIONS

- Built: [/src/instruments/patch-synth.js](../../../src/instruments/patch-synth.js)
- Stub harness: [patch-synth-smoke.mjs](patch-synth-smoke.mjs) — 65 assertions
- Browser harness page: [/docs/scratchpad/patch-synth-harness.html](../../../docs/scratchpad/patch-synth-harness.html)
- Handoff, updated to final: [patch-synth-handoff.md](patch-synth-handoff.md)
- Receipt: this file

**Scratch files, named as required.** Session scratch dir
`/private/tmp/claude-501/-Users-moth3rship-Desktop-AI-Design-School-stuff-Chromebook-DAW-Agent-run-1/5d6dcd50-adeb-40a7-b2f1-ba56fdd30441/scratchpad/`:
`patch-synth-drive.mjs` (the Playwright driver, 31 assertions), `patch-synth-diag.mjs` (a
one-off used to find why a port click missed), `patch-synth-both-views.png`,
`patch-synth-expanded.png`, `patch-synth-compact.png`, `http.log`. The `pw/` Playwright
install in that folder predates this seat. Nothing was left running.

Touched nothing else. `index.html`, `daw-shell.js`, `state.js`, `audio.js`, `clock.js`,
`capture.js`, `tokens.css` and `arrangement.js` were not written. `src/mixer/graph.js` was
not created, imported or stubbed. `tools/patch-synth.html` was not built.

---
---

# RECEIPT — patch-synth — P4 post-S3 — `patch-synth-finish`

Stamped 2026-08-31 23:26 EDT. Three tasks, nothing else.

## DELIVERABLE STATE

**Task 1 — the angle token. DONE.** Brandon ruled: add it.
`--angle-vertical: 90deg` appended to `src/ui/tokens.css`, last line of the P4 `:root`
block under a new `ANGLE` axis heading. Appended only — no existing token was read back
out or changed. `patch-synth.js`'s canvas gradient now reads it.
**Zero raw literals in the file, grep-verified:** no `px`/`rem`/`em`/`deg` literal, no hex.
The five remaining `${n}px` template writes are node x/y and the camera translate — model
coordinates that round-trip through JSON, the class agent 2 named in OPEN DECISION 4.

**Task 2 — the canvas moves like a map. DONE.** A `.ps-scene` layer inside `.ps-canvas`
carries one `transform: translate() scale()`. The node model, the cable model and the
palette are untouched.

- Left-drag on empty canvas pans. Left-drag on a node head still moves the node.
- Wheel zooms about the cursor. A trackpad pinch arrives as a ctrl-wheel and lands in the
  same handler. A two-finger touch pinch is its own path: spread zooms, and the midpoint
  pans while it does.
- Zoom holds between 0.25 and 2.
- Both mount views. Two independent cameras, kept across repaints.
- Pan is clamped to the scene, so the camera can never travel off the graph. Node drag is
  clamped to the scene extent (1200 x 1500 model units), not to the pane — that was the
  old bug: a 24-node patch below the fold was unreachable, not lost.
- `_paint` rebuilds the DOM on every structural change and re-applies the camera, so a
  pan survives adding a node.

**Task 3 — the standalone page. DONE.** `tools/patch-synth.html`, built on `tools/beat.html`
verbatim as the pattern: the same shell-chrome CSS copy, the same `listenerBag`/`el`/`panel`
helpers, the same page class with `mount(host)`/`dispose()`, the same
`window.cbdawPatchSynth` handle and the same boot-with-an-error-box. Its own `pt-` prefix so
nothing collides with the instrument's `ps-` classes.

- File menu with this page's `TOOLS` row flipped available in a copy. `shell.js` not edited.
- CPU meter — and with it the audio-state readout, the unlock button and `noCap`.
- `mountExpanded` only. The compact view is the DAW's.
- A 12-note keyboard on the input bus, and the one bus→`noteOn` monitor path.
- A four-step how-to that names the pan and the zoom.
- **The scratch harness is no longer the only way to open this instrument.**
  `docs/scratchpad/patch-synth-harness.html` stays where it is; the real page is
  `tools/patch-synth.html`.

Not changed, by instruction: what a beginner sees on open (palette visible, Math last and
collapsed and muted, one `out` node, no starting patch), the §16.7.6-vs-§16.7.7 cable
fan-in, and `cpuWeight`.

### Verification — three harnesses, all green

**1. Stub, DOM-less.** `Builddocs/P4-the-daw/S3-systems/patch-synth-smoke.mjs` —
`node patch-synth-smoke.mjs`, **66 PASS, 0 FAIL**, unchanged file. (The earlier receipt
says 65 and TODO says 96; the run prints 66.)

**2. The real page in headed Chromium.** Playwright's own Chromium 1234, no `channel`, a
fresh `mkdtemp` profile, `python3 -m http.server 8770` from the project root.
**55 PASS, 0 FAIL.** No process was killed but the server's own.

Measured, not asserted by proxy:

- Page mounts with no error box, no page errors, and every asset it asks for exists.
- Opens with the palette drawn, Math last and `data-open="false"`, one node, and that node
  is `out1`.
- `osc → filter → gain → out` built by clicking palette buttons and dragging four cables
  with the mouse; the control cable draws as `data-domain="control"`.
- Envelope on `gain1.amount` with the gain's own amount at zero: RMS `0.000000` →
  **`0.41670` while a key is held** → `0.000000` after release. Played by pressing a key on
  the on-screen keyboard, through the input bus. **The page makes sound.**
- Left-drag on empty canvas: camera `-663,-273 → -883,-413`, cursor reads `grabbing`,
  `data-panning` clears on release.
- Node-head drag moves the node `150,0 → 240,40` and leaves the camera alone; cables stay
  drawn.
- Wheel stops at `z 2.000` and at `z 0.250`.
- Filled to 24 nodes, 24 boxes drawn, and **node 24 lands fully inside the pane at zoom
  0.25, 0.5, 1, 1.5 and 2** — panned through the same clamp a hand hits.
- The compact view mounts, zooms and pans on its own camera.
- `dispose()` returns a report, drops the page's listeners, releases the channel, and the
  page root is gone.

**3. Two-finger touch, driven as real touch through CDP.** **10 PASS, 0 FAIL.**
Spread `z 1.0 → 2.0`; pinch `2.0 → 0.381`; two fingers travelling together pan `0,0 →
-120,-60` and hold the zoom; one finger still pans; one finger on a node head still moves
the node.

Screenshots: `patch-synth-page-full.png`, `patch-synth-page-graph.png`,
`patch-synth-page-compact.png` in the session scratch dir.

## NEXT ACTION

None for this seat. All three tasks are closed and proved in a real browser.

## OPEN DECISIONS

**1. The graph paper does not move with the camera.** The grid is `background-image` on
`.ps-canvas`, so it stays put while the nodes and cables pan and scale. Making it travel
means writing `background-position` and `background-size` from the camera as computed
pixels — camera geometry, but written into style properties, which is a step past the node
x/y precedent. Left static rather than invented. It is texture, not coordinate; nothing
reads position off it. **A reviewer should say whether it should move.**

**2. Horizontal pan is a no-op at zoom 1 on a wide pane, on purpose.** The scene is 1200
model units wide; an expanded pane is wider than that, so there is nothing to pan to and
the clamp holds `x` at 0. Vertical pan works at every zoom because the scene is 1500 tall.
Nodes auto-place no further than x 450, so nothing is out of reach. Naming it so nobody
reads a held camera as a broken drag.

**3. A missed `pointerup` used to strand a phantom finger.** Found while driving CDP touch:
a stale entry in the pointer map made the next single-finger touch read as a pinch, and
one-finger pan and node drag died until reload. Fixed at the source — a primary pointerdown
clears the map first. Worth knowing because it is a class of bug, not a one-off.

**4. `min-width: 260px` in `tools/patch-synth.html`** is inside the shell-chrome block
copied verbatim from `beat.html`, which copied it from `shell.js`. It is already on
`token-coverage.md`'s "Brandon's call — no token exists" list twice; this page makes it
three sites. Not introduced here and not diverged from the copy.

**5. Rule conflict, flagged a third time.** The harness's bypass-permissions note directs
file reads and writes through Bash; CLAUDE.md directs the opposite so the edits stay
visible. Followed CLAUDE.md. Bash was used only for grep, node, curl, date and the static
server.

## FILE LOCATIONS

- Instrument: [/src/instruments/patch-synth.js](../../../src/instruments/patch-synth.js) — 1768 → 1942 lines
- Standalone page, new: [/tools/patch-synth.html](../../../tools/patch-synth.html)
- Token: [/src/ui/tokens.css](../../../src/ui/tokens.css) — `--angle-vertical`, one line appended
- Stub harness, unchanged: [patch-synth-smoke.mjs](patch-synth-smoke.mjs)
- Scratch harness, superseded but kept: [/docs/scratchpad/patch-synth-harness.html](../../../docs/scratchpad/patch-synth-harness.html)
- Receipt: this file

**Scratch files, named as required.** Session scratch dir
`/private/tmp/claude-501/-Users-moth3rship-Desktop-AI-Design-School-stuff-Chromebook-DAW-Agent-run-1/5d6dcd50-adeb-40a7-b2f1-ba56fdd30441/scratchpad/`:
`patch-synth-page-drive.mjs` (the page driver, 55 assertions), `patch-synth-pinch-drive.mjs`
(the CDP touch driver, 10 assertions), `patch-synth-note-diag.mjs` and
`patch-synth-touch-diag.mjs` (two one-offs used to find why a key press and a single touch
missed — both were test bugs), `patch-synth-page-full.png`, `patch-synth-page-graph.png`,
`patch-synth-page-compact.png`, `http-8770.log`. The `pw/` Playwright install predates this
seat. Nothing was left running.

Touched nothing else. No S3 file, no `index.html`, no `daw-shell.js`, no `state.js`, no
`shell.js`. `src/mixer/graph.js` was not created, imported or stubbed.

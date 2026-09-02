# DEV SPLASH — tools/dev-splash.html — ONE SPEC, ONE PAGE

Written 2026-09-01 by the session agent, from grep of live source. Brandon approved shape.
Agents work this spec top to bottom in ~200k-token spans. See §10 for the span protocol.

## INDEX

- §1  WHAT THIS IS ................. line 22
- §2  FROZEN FILES ................. line 34
- §3  THE RIG ...................... line 46
- §4  PIECE CATALOG ................ line 88
- §5  PAGE FRAME + TABS ............ line 132
- §6  TAB 1 — PIECES ............... line 150
- §7  TAB 2 — MATRIX ............... line 168
- §8  TONE GENERATOR ............... line 214
- §9  DEV BOX ...................... line 230
- §10 SPAN PROTOCOL + RECEIPTS ..... line 240
- §11 BUILD ORDER CHECKLIST ........ line 264
- §12 DONE-CHECK ................... line 306

Server: `python3 -m http.server 8000` from project root (one is usually already up — check
`lsof -i :8000` before starting another). Page: `http://127.0.0.1:8000/tools/dev-splash.html#dev`.
The `#dev` hash shows the dev box. There is no 8117; ignore it.

## §1 · WHAT THIS IS

One page, `tools/dev-splash.html`, for Brandon to see every built DAW piece by itself
(tab 1) and to assemble pieces into candidate DAW layouts (tab 2) for screenshots and a
future screen spec. It is a viewing/arranging harness, NOT the DAW. It ships ugly-honest:
pieces render exactly as they exist. No new styling of pieces themselves.

Model: one invisible RIG (audio + strips + graph + clock, built once) and many VIEWS
mounted onto it. A piece shown in tab 1 and a piece in a tab 2 slot are views of the SAME
rig. No slot ever constructs its own audio deps.

## §2 · FROZEN FILES

- Everything under `src/` is FROZEN. Zero edits.
  (Exception already done by the session agent, 2026-09-01: `export` added to
  `mountProjectHeader`, `mountTransportBar`, `mountPlayingSurface` in `src/ui/daw-shell.js`
  lines 393/468/590. Do not edit further.)
- `index.html`, `tools/*.html` existing pages: FROZEN.
- You write: `tools/dev-splash.html` (the page, everything inline) and receipts in
  `Builddocs/specs/devsplash/`. Nothing else. No README. Scratch files go in
  `docs/scratchpad/` and are named in your receipt.
- If a piece will not mount without a src edit: DO NOT edit. Log it in the receipt under
  BLOCKED and move on.

## §3 · THE RIG

Built once on page load, before any tab renders. Import paths are from `tools/`, so
`../src/...`. All verified against live source 2026-09-01.

```js
import { ctx, unlock } from '../src/core/audio.js';
import { clock } from '../src/core/clock.js';
import { state } from '../src/core/state.js';
import { input } from '../src/core/input.js';
import { createStrips } from '../src/mixer/strip.js';
import Graph from '../src/mixer/graph.js';
import { createChannelAutomation } from '../src/mixer/automation.js';
import { mountProjectHeader, mountTransportBar, mountPlayingSurface, MOUNTS, CHANNEL_IDS }
  from '../src/ui/daw-shell.js';
import '../src/ui/devbox.js';           // self-starting on #dev hash
```

Rig assembly, in order (mirrors `wireDawShell`, daw-shell.js:608):

1. `const mixer = createStrips(ctx)` → `mixer.strips = {ch1..ch6, master}`.
2. `const graph = new Graph(ctx, { strips: mixer.strips })`.
3. `const automation = {}` — per strip: `automation[id] = createChannelAutomation(strip)`.
   Lanes are created lazily by `automation[id].lane('strip.gain'|'strip.pan'|'strip.mute'|'strip.solo')`.
4. Instruments: none at load. Created on demand (tab 1 pick, or tab 2 slot) as
   `new Ctor(ctx, strip.input)` — `strip.input` is the channel-in node. One instrument per
   channel at a time; creating a second on the same channel disposes the first.
5. `unlock()` is called on first user gesture (any pointerdown on the page) — audio starts
   suspended in Chrome otherwise.
6. `clock` and `state` are document-lifetime singletons — never disposed by this page.

Rig object shape the whole page reads:
`rig = { ctx, clock, state, input, mixer, graph, automation, instruments: {chN: inst|null} }`

Mount/unmount discipline: a view being removed from a slot calls its `unmount()` (or
`dispose()` for header/transport/surface returns, which have no unmount). The underlying
rig object survives. `dispose()` on rig objects is called never (page lifetime).

## §4 · PIECE CATALOG

Every row = one entry in the piece picker. `make` runs once per shown view; rig objects in
CAPS already exist. All mounts take a host element the page provides.

| id | label | make | show | teardown |
|---|---|---|---|---|
| header | Project Header | `mountProjectHeader(el, {strips: MIXER.strips})` | (mounts on make) | `.dispose()` |
| transport | Transport Bar | `mountTransportBar(el)` | (mounts on make) | `.dispose()` |
| surface-block | Playing Surface Block | `mountPlayingSurface(el)` | (mounts on make) | `.dispose()` |
| keyboard | 12-Note Keyboard | `new Keyboard(null, input)` | `.mount(el, 'expanded')` | `.unmount()` `.dispose()` |
| diatonic | Diatonic Keys | `new DiatonicKeys(null, input)` | `.mount(el, 'expanded')` | same |
| circle | Scale Circle | `new ScaleCircle(null, input)` | `.mount(el, 'expanded')` | same |
| piano-roll | Piano Roll | `new PianoRoll(null, clock)` | `.mount(el, 'compact')` | same |
| step-grid | Step Grid | `new StepGrid(null, clock)` | `.mount(el, 'compact')` | same |
| comp-builder | Comp Builder | `new CompBuilder(state)` | check its mount signature in source | same |
| arrangement | Arrangement | `new Arrangement()` | `.mount(el)` | same |
| strip-ch1 … strip-ch6, strip-master | Strip chN / Master | MIXER.strips[id] | `.mountCompact(el)` | `.unmount()` only — never dispose |
| strips-all | All 7 Strips | MIXER | mountCompact each into a flex row | unmount each |
| graph | Node Graph | GRAPH | `.mountCompact(el)` | `.unmount()` only |
| auto-gain-ch1 | Automation: gain ch1 | `AUTOMATION.ch1.lane('strip.gain')` | `.mountCompact(el)` | `.unmount()` only |
| auto-pan-ch1 / auto-mute-ch1 / auto-solo-ch1 | Automation: pan/mute/solo ch1 | same pattern | same | same |
| gate / compressor / eq / reverb / delay | device, standalone | `new Gate(ctx)` etc. | `.mountCompact(el)` | `.unmount()` `.dispose()` |
| wave-synth / overtone-synth / drum-synth / drum-sampler / patch-synth | instrument on ch1 | `new Ctor(ctx, MIXER.strips.ch1.input)` | `.mountExpanded(el)` (fall back `.mountCompact`) | `.unmount()` `.dispose()`, clear `rig.instruments.ch1` |
| spectrum | Spectrum (of ch1 instrument) | `new Spectrum(instrument)` — needs an instrument alive; if none, show "mount an instrument first" | `.mountExpanded(el)` | `.unmount()` `.dispose()` |
| scope | Scope (of ch1 instrument) | same pattern | same | same |
| meter | Meter (master tap) | `new Meter(MIXER.strips.master.meterTap)` | `.mount(el)` | `.unmount()` `.dispose()` |
| gov-meter | Governor Meter | `createGovernorMeter({ graph: GRAPH })` | append returned `.el` | `.dispose()` |

Notes:
- Standalone devices (row `gate`…`delay`) are NOT in the graph — they are display-only
  instances for looking at the UI. Wire tone-gen → device.input → device.output →
  master strip input so their taps show signal (see §8).
- Device UIs inside the graph appear by `GRAPH.addInsert('ch1','gate')` then the graph's
  own popout callback; the picker also offers "gate (as ch1 insert)" variants ONLY if
  cheap — otherwise skip, log in receipt.
- Instruments other than ch1: not needed in tab 1. In tab 2 a slot picks a channel (§7).
- Drum-sampler `needsLoad` — kits fetch from `assets/kits/`; if a kit 404s over the
  server, show its error state, log it, move on.

## §5 · PAGE FRAME + TABS

- `<!doctype html>`, `<link rel="stylesheet" href="../src/ui/tokens.css">`, one inline
  `<style>`, one inline `<script type="module">`. No external deps, no build step.
- Page chrome classes prefixed `dsp-` so they never collide with `cbdaw-` styles.
- Top bar: title "DEV SPLASH", tab buttons [Pieces] [Matrix], right side: tone-gen
  collapse toggle, hint text "add #dev to URL for the skin box".
- Chrome styling: tokens only (`var(--panel)` etc.), thin. Do not restyle pieces.
- Tabs: both tab roots stay in the DOM; the inactive one gets `hidden`. Mounted views are
  NOT unmounted on tab switch (cheap, keeps state). rAF-driven pieces already gate on
  IntersectionObserver (meter) or tolerate hidden hosts; if one visibly burns CPU while
  hidden, log it, don't fix src.
- The unlock: one `pointerdown` listener on document calls `unlock()`, removes itself.

## §6 · TAB 1 — PIECES

- Left rail: the piece list (§4), grouped under headings FRAME / SURFACES / SEQUENCING /
  MIXER / DEVICES / INSTRUMENTS / VIS. Click = show.
- Main area: one large host panel, the picked piece mounted alone, full width, on
  `var(--bg)` with a `var(--panel)` card behind it. Piece id + its `make` line printed
  small under the title (so Brandon's screenshots self-document).
- Exactly one piece shown at a time in tab 1. Switching picks: teardown per §4 row, then
  mount the new one.
- Pieces that share rig objects with tab 2 (strips, graph, lanes): if the object is
  currently mounted in a Matrix slot, tab 1 steals it (unmount there, mount here) and the
  Matrix slot shows "in Pieces tab" until re-picked. Simple, honest, no cloning.

## §7 · TAB 2 — MATRIX

The layout tree. This is the deliverable Brandon uses to compose screenshot mockups.

Data model:
```js
// node = { kind: 'split', dir: 'row'|'col', ratio: 0..1, a: node, b: node }
//      | { kind: 'slot', piece: id|null, channel: 'ch1'..'ch6'|null }
layout = { kind: 'slot', piece: null, channel: null }   // start: one empty slot
```

Rendering: recursive. A split renders two children in flex with `flex-basis` from ratio
and a 6px draggable divider between them. A slot renders:
- empty: centered piece picker dropdown (same catalog as §4) + "split ⇆" + "split ⇵" buttons.
- filled: thin slot header (piece label, channel picker where relevant, ✕ empty,
  ⇆/⇵ split, drag-handle) + the mounted piece filling the rest. `overflow: auto` on the
  slot body — pieces keep their natural size; the slot scrolls.

Interactions:
- Divider drag: pointer events update `ratio`, clamped 0.1–0.9, live reflow.
- Split: turns this slot into a split whose `a` is the current slot content and `b` is a
  new empty slot, ratio 0.5.
- ✕: teardown the piece (per §4), slot back to empty. Emptying a split's only filled
  child does NOT collapse the split (Brandon empties + repicks freely); a dedicated
  "merge" button on the divider collapses a split, keeping side `a`.
- Channel picker on channel-scoped pieces (strip, automation lanes, instruments): swaps
  which rig object the slot shows. Teardown old view, mount new.
- Drag-to-move between slots: grab slot header, drop on another slot → the two slots SWAP
  contents. Implement as swap of tree leaves, remount both. (Swap, not insert — keeps the
  tree logic trivial.)
- Same rig-object rule as §6: an object can be mounted in one place at a time. Picking a
  piece already mounted elsewhere steals it; the old slot shows "moved".

Persistence:
- Serialize `layout` (piece ids + channels + ratios only) to
  `localStorage['cbdaw-devsplash:layout']` on every change, try/catch (Chromebook guest
  profile throws). Restore on load; a piece that fails to remount degrades to empty slot.
- Top-bar buttons: [save] (explicit write + flash), [reset] (clear storage, back to one
  empty slot), [copy JSON] (layout JSON to clipboard — this JSON is the seed of the
  future screen spec).

Presets: one dropdown with 3 canned trees to start from: "1×1", "2×2", "DAW-ish"
(col: [row: header/transport] over [row: surface | strips] over [row: arrangement | graph]).
Hand-build these trees in code; no generator.

## §8 · TONE GENERATOR

Corner widget (bottom-left), collapse/expand like the dev box's handle pattern. Own DOM,
`dsp-` classes, tokens-styled.

- One `OscillatorNode` + `GainNode` on `ctx`, started once, gain 0 when "off".
- Controls: on/off button; waveform [sine, square, sawtooth, triangle]; freq slider
  40–2000 Hz log, default 220; gain slider 0–0.5, default 0.15.
- Route dropdown: `ch1`…`ch6` (→ `MIXER.strips[id].input`), `master`
  (→ `MIXER.strips.master.input`), or any standalone device instance currently mounted
  (→ `device.input`, then `device.output → MIXER.strips.master.input`, connected once).
- Rerouting disconnects the gain node output first, then connects the new target.
- Purpose: meters, taps, devices, and strips show live signal for screenshots.

## §9 · DEV BOX

Nothing to build. `import '../src/ui/devbox.js'` and it self-mounts when the URL hash
contains `dev`. It reads tokens.css root knobs (the four dials `--fs-root`, `--sp-unit`,
`--r-unit`, `--bw`, plus faces/palette), persists per-page in localStorage, and its
"copy css" dumps a skin body. Put the "#dev" hint in the top bar (§5). Do not wrap,
reposition, or restyle it.

## §10 · SPAN PROTOCOL + RECEIPTS

Agents: goto subagents, opus override, spawned by the session agent. Each works ONE span:

1. Read this spec top to bottom, then the newest receipt in this folder (skip if none).
2. Continue at the checklist item the receipt names. Work items IN ORDER (§11).
3. Verify in a real browser against the live server before checking an item off
   (headless Chromium ok; screenshots welcome in `docs/scratchpad/`).
4. Near budget (~200k tokens), stop at an item boundary. Write your receipt. Update
   INDEX.md and SESSIONLOG.md per house rules. Do not start the next item.

Receipt file: `receipt-span-N.md` in this folder (N = 1, 2, …). Format:

```
RECEIPT — devsplash span N — [timestamp: grep transcript]
DONE: [checklist item numbers, one line each — what + where]
STOPPED AT: item N — [exact state: what exists, what doesn't, mid-item detail]
LIVE: [what was verified in-browser and how]
BLOCKED: [pieces that won't mount without src edits — piece, error, line]
STRAY: [scratch files written, full paths]
NEXT AGENT: [first action to take]
```

Everything visible, everything gated by this spec. Invent nothing beyond it; if the spec
is wrong about a signature, trust the source, note the correction in the receipt.

## §11 · BUILD ORDER CHECKLIST

Each item ends in a working page — never leave the page broken at a span boundary.

1. Page skeleton: frame, top bar, two empty tab roots, tokens.css link, `dsp-` chrome.
   DONE-CHECK: loads over :8000, no console errors, tabs switch.
2. Rig: §3 assembly, rig object on `window.dsp` for console poking. Unlock-on-gesture.
   DONE-CHECK: `window.dsp.mixer.strips.ch1` real in console; no audio errors.
3. Tone generator (§8), routed to master.
   DONE-CHECK: audible tone, master strip meter moves (mount one via console to see).
4. Tab 1 rail + host + catalog wiring for: strips, graph, automation lanes, meter,
   gov-meter (rig-backed rows).
   DONE-CHECK: each mounts alone, tone makes ch-routed strip meter move.
5. Tab 1 catalog: header, transport, surface-block, surfaces, piano-roll, step-grid,
   comp-builder, arrangement.
   DONE-CHECK: each mounts alone; transport play moves arrangement playhead.
6. Tab 1 catalog: standalone devices (+ tone-gen device routing), instruments,
   spectrum/scope.
   DONE-CHECK: gate/compressor readouts move with tone; keyboard plays wave-synth
   audibly on ch1.
7. Matrix: tree model, render, empty slot picker, split/merge, divider drag, ✕.
   DONE-CHECK: build a 2×2 by hand, four pieces mounted at once, dividers drag.
8. Matrix: channel picker, steal rule, header-drag swap.
   DONE-CHECK: same strip picked twice = steal; swap two slots works.
9. Matrix: persistence + presets + copy-JSON (§7).
   DONE-CHECK: reload restores layout; "DAW-ish" preset mounts; JSON on clipboard.
10. Sweep: console clean on both tabs, teardown leak pass (mount/unmount each catalog
    row ×2, listener counts steady), final receipt names every BLOCKED piece.
    DONE-CHECK: §12 all true.

## §12 · DONE-CHECK — the whole page

- `http://127.0.0.1:8000/tools/dev-splash.html#dev` loads clean, dev box appears.
- Every §4 catalog row either mounts alone in tab 1 or is listed BLOCKED in the final
  receipt with the reason.
- Matrix builds, saves, restores a 6-slot layout with strips + graph + arrangement +
  header + transport + automation mounted simultaneously.
- Tone generator audible through any channel; that channel's strip meter moves.
- Four dials in the dev box visibly reshape the page (type, density, radius, line weight).
- Zero edits under `src/` beyond the three pre-existing exports (§2).

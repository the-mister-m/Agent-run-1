# RECEIPT — arrangement — P4/S3

2026-08-31 22:16 EDT

## DONE / OPEN, by §16 subsection (this seat's read list: §16.0, §16.9, §16.10, §16.11)

- **§16.9 (bind convention).** DONE. `bindChannels`/`unbindChannels` follow all five rules
  (duck-typed input, drops-then-adopts, redraws once, returns `this`, optional with a
  sensible default). `bindLaneInstrument` added, new, for the graph seat.
- **§16.9a (capture-commit rule).** DONE. Does not call `roll.bindCapture()`. Subscribes to
  `capture.on('commit')` directly, branches on `kind` (`'discard'` ignored, `'requantize'`
  replaces via `setNotes`, everything else — including the undocumented `'record'` kind,
  already flagged elsewhere in TODO.md — appends via `addNotes`).
- **§16.10 (tokens).** DONE. Zero raw literals, zero fallbacks, every `var(--token)` in the
  file hand-checked against `ui/tokens.css`. Did not write `tokens.css`. One P4 arrangement
  token unused: `--clip-fill` (no clip concept in a linear-song lane).
- **§16.11 (file ownership).** DONE. Writes only `src/ui/arrangement.js`. Read
  `daw-shell.js`, `step-grid.js`, `piano-roll.js`, `capture.js`, `clock.js` — wrote none of
  them. No routing built, no mixer built, no graph stubbed or waited on.
- **§16.0 / §16.0b (comment convention, token rule).** DONE. File carries one comment,
  state-only. No contract text, no rationale, no attribution in code.
- **Everything outside this seat's read list (§16.1-§16.8)** — OPEN, correctly: not this
  seat's to build. No insert, no device, no strip, no automation target touched.

## DELIVERABLE STATE

Eight seat questions, answered:

1. **Linear song, not clips.** Confirmed — Brandon's own FIXED DECISION. `arrangement.js`
   builds one ruler spanning `clock.songLengthBars` bars, six fixed lanes stacked under it.
   No clip objects, no clip boundaries; a lane's content is whatever its mounted surface
   holds.
2. **What is a lane.** One per channel, six fixed (`ch1`…`ch6`, from `daw-shell.js`'s own
   `CHANNEL_IDS`). Each lane mounts the real surface, compact variant, never reimplemented:
   pitched lanes get `new PianoRoll()` + `.mount(body, 'compact')`, drum lanes get
   `new StepGrid()` + `.mount(body, 'compact')`. Kind/label per channel default to a
   4-pitched/2-drum split (ch1-4 pitched, ch5-6 drum) and are overridable through
   `bindChannels()`, following §16.9's bindX convention (drops previous, redraws once,
   returns `this`, works unbound).
3. **Does the ruler match.** Own ruler row, drawn from `stepLabel()` imported out of
   `step-grid.js` — the same shared function §13.3 names, not a second implementation. Beat
   digits restart 1..`ts.top` every bar (matches piano-roll.js's own multi-bar ruler
   convention, confirmed by reading that file); bar boundaries are distinguished by tick
   color (`--ruler-tick-bar` vs `--ruler-tick-beat`) rather than a second, invented "running
   bar number" label, because §6/§13.3 forbid a surface inventing its own label strings.
   Time-signature bottom: not displayed at all anywhere in this file — see OPEN DECISIONS.
4. **Loop region.** Draggable start/end handles over the ruler, read/write `clock.loop`
   directly (`{on, startBar, endBar}`), never reimplemented — `clock.js` owns the wrap
   behavior. A LOOP on/off toggle sits in the sticky corner cell. Verified live: dragging
   moves the wash and the clock's own loop bounds together (checked via `clock.loop` after a
   simulated drag).
5. **Record arm and punch, per lane.** One `Capture` instance per lane (`new Capture({
   clock, target })`), disarmed by default to match the visible ARM button's default state
   (capture.js itself defaults every instance to `armed: 'all'` — found while testing,
   corrected here rather than left silently mismatched). ARM calls `capture.arm('all')` /
   `disarm('all')`. PUNCH is bar-range steppers + on/off, calling `capture.punchIn(s,e)` /
   `punchOff()`. Confirmed independent per lane in a real browser: arming/punching ch1 left
   ch2-ch6 untouched.
6. **Playhead from rAF.** Own `requestAnimationFrame` loop reads `clock.positionTicks`
   only — no `clock.schedule`, no `clock.on('tick', …)`, no AudioContext or `ctx.currentTime`
   anywhere in the file (grepped clean). Confirmed live: the playhead's computed `left`
   changed after `clock.play()`.
7. **Chromebook layout, no page-body horizontal scroll.** One scroll container
   (`.cbdaw-arr__scroll`) holds a two-column CSS grid — sticky lane-head column, sticky
   ruler row — everything wide scrolls inside that one container. Measured live at 1366px
   and 1024px viewports: `document.body.scrollWidth === document.body.clientWidth` at both
   (the inner scroll container's own `scrollWidth`, 2088px/1968px, is where the width
   actually goes).
8. **Compact only.** Every mounted surface uses `'compact'`, never `'expanded'`. No
   transition/animation beyond what the token file's own DAW-wide `--dur-fast: 0ms`
   already zeroes; nothing in this file sets its own duration.

**What is missing / left to do:**
- No real instrument is bound to any lane yet (none exist — `patch-synth` is mid-build and
  nobody in S3 wires channels to `core/audio.js#createChannel`, per the collision map).
  `bindLaneInstrument(id, instrument)` is exposed for whichever seat does that later; until
  then a drum lane's captured notes have no piece role (`_laneFor` returns `null` for every
  note) and produce no visible step — reported, not fixed, since fixing it means building
  the graph, which this stage forbids.
- Lane-body content is each mounted surface's own native geometry (max 8 bars, a constant
  in both frozen files), not stretched to visually align bar-for-bar with the master ruler
  above it, which spans the full `songLengthBars`. Not attempted — the only way to align
  them is editing a frozen file's internal layout. See OPEN DECISIONS.
- Punch is stepper-driven, not drag-driven (only the loop region was asked to be "set
  visually" — seat question 4 names only the loop for that).

**Verification actually performed:** `node --check` (syntax) · every `var(--token)` name
used in the file cross-checked against `ui/tokens.css` by hand, zero raw literals, zero
fallbacks · a real headless-Chromium (Playwright, installed to this session's own scratch
dir only, not this repo) run against the test page below: 6 lanes built (4 roll mounts, 2
grid mounts), 64 ruler ticks / 16 bar ticks with labels `1,2,3,4` repeating, zero page
errors, zero console errors, playhead position changed after `clock.play()`, loop
wash/toggle responded to a loop-on write, arm/punch buttons flipped their own lane's
`Capture` state and left every other lane alone, `bindChannels()` relabeled all six lanes
live, checked at 1366px and 1024px viewports for the no-horizontal-scroll claim.
**Not performed:** a real MIDI/keyboard-driven record pass with a bound instrument — there
is no instrument to bind yet (see above).

**Test URL:**
```
python3 -m http.server 8000        # from project root
http://127.0.0.1:8000/docs/scratchpad/arrangement-test.html
```

## NEXT ACTION

None from this seat — done-check met on everything buildable without the graph or a bound
instrument. `node-graph` (S4) is the next reader: `bindLaneInstrument()` and `.lanes`
(surface + capture per channel) are its hooks.

## OPEN DECISIONS

- **Two arm/punch models now exist in the app, not reconciled.** Reading `daw-shell.js`
  fresh before writing this (it grew from 218 to 675 lines under the parallel S2 fix seat
  while this seat worked): `wireDawShell()`'s transport bar reads/writes ONE global
  `state.project.recordArmed` / `state.project.punch` for the single demo channel it wires
  (`channelId: 'ch1'`). This file's per-lane model is six independent `capture.js`
  instances, matching this seat's own brief (seat question 5, verbatim) and matching how
  `capture.js` itself is built — one instance, one arm state, no global mode exists in that
  class. Not a file collision (`state.js` and `daw-shell.js` are untouched here) — an
  architecture disagreement between S2's single-demo-channel wiring and S3's six-lane
  reality. Did not touch `daw-shell.js` to resolve it. **Decider: the Troubleshooter** —
  likely resolution is wiring the transport bar's arm/punch controls to iterate this file's
  `.lanes` instead of one global flag, once a real per-channel instrument exists.
- **Time-signature bottom, on this ruler: not shown at all**, matching `step-grid.js`'s
  own resolution of the same three-way conflict (this seat's brief said "as a symbol";
  CONTRACTS §13.4 AMENDED says "leave the bottom number out entirely"; `step-grid.js`
  itself renders plain digits, `"4/4"`, contradicting both). Followed the CODE, since code
  outranks CONTRACTS text per the corrected authority order — and the code here shows
  nothing at all for the bottom, closer to §13.4's literal ruling than to `step-grid.js`'s
  own divergence from it. Flagged, not picked silently. **Decider: Brandon**, if this
  three-way disagreement needs settling once for all three surfaces.
- **Lane-body geometry is not locked to the master ruler's bar grid** (see DELIVERABLE
  STATE). If Brandon wants a drum/piano-roll lane's pattern to visually repeat/tile across
  the song length in sync with the ruler, that is new surface work, not a wiring task —
  escalating rather than building it uninvited.
- **Default channel→instrument-kind mapping** (ch1-4 pitched, ch5-6 drum, labelled by the
  six named instruments) is this seat's own default, not sourced from CONTRACTS or
  BUILDPLAN — nothing names one. Overridable via `bindChannels()`; not blocking.

## FILE LOCATIONS

- `src/ui/arrangement.js` — new, this seat, only file this seat owns
- `docs/scratchpad/arrangement-test.html` — test harness, this seat's own scratch file
- `docs/scratchpad/arrangement-verify.mjs` — Playwright verification script run against the
  harness above, left for the Troubleshooter to re-run
- `docs/scratchpad/arrangement-shot-1366.png`, `arrangement-shot-1024.png` — screenshots
  from the verification run, loop + punch + arm state all visibly live

# RECEIPT — Job 5 — Armed Input Routing

2026-09-02 · Goto (Opus) · spec: [SPEC-job5-armed-input-routing.md](../specs/SPEC-job5-armed-input-routing.md)

## WHAT CHANGED

- [src/core/tracks.js](../../src/core/tracks.js) — `armed: false` on every new track;
  `setArmed(id, on)`; `armedIds` getter. No-op writes publish nothing.
- [src/core/track-bus.js](../../src/core/track-bus.js) — the gate. `ARM_GATED_SOURCES =
  ['key','midi']`. `createTrackBus({id, instrument, armed})`, `bus.armed` get/set,
  `bus.gatedSources`. `emitNoteOn` drops a gated source when unarmed. Disarming releases
  only what `key`/`midi` hold, via a new internal `releaseSource()` — no instrument panic,
  so a mouse note held on the same track survives. `dispose()` resets `armed` to false.
- [src/ui/arrangement.js](../../src/ui/arrangement.js) — the ARM button now writes
  `tracks.setArmed()` and nothing else. New `_syncLaneArm(lane, armed)` is the single
  reader: it moves the button, the lane's `Capture`, and the lane's bus. Called from
  `_onTrackUpdate`, from `_buildLane`, and from `bindLaneBus`.
- [src/ui/daw-shell.js](../../src/ui/daw-shell.js) — MIDI fan-out. Two listeners on the
  `input` singleton forward `source: 'midi'` notes to every bus; each bus's own gate
  decides. Unsubscribed in `dispose()`. `busFor()` seeds `armed` from the store.

Capture was not redesigned and not touched. It did not need to be — see below.

## TWO SPEC PREMISES WERE WRONG

**Bug 1 was not what the spec says.** `Capture` is constructed per lane inside `_buildLane`
(arrangement.js:1021), so `capture.arm('all')` was already scoped to that lane —
`'all'` is capture's own sentinel for its eight drum-piece lane indices, not "all tracks".
The real defect was that arm state lived nowhere the bus or the MIDI fan-out could read it.
That is what I fixed. Capture's lane-index model never had to be reconciled with anything.

**Item 3 had nothing to fix.** `diatonic-keys.js` binds no keyboard route at all — its only
listeners are pointer, click, controls and window-blur (lines 558-569). There are no QWERTY
routes to retag. `scale-circle.js` has a keydown, but it is Enter/Space on a focused zone,
scoped to its own SVG — a click equivalent, not shared physical input, and tagging it `'key'`
would gate keyboard accessibility that the mouse equivalent is explicitly ungated for.
**I edited neither surface file.** The QWERTY source tag the gate needs already exists:
`keyboard.js` emits `source: 'key'` (lines 570, 583), and each mounted keyboard emits to its
own lane bus, so the gate alone fixes bug 2.

## VERIFIED

- `node --check` on all four edited files.
- 47-assertion headless harness, all pass —
  [docs/scratchpad/armed-input-smoke.mjs](../scratchpad/armed-input-smoke.mjs). Covers: new
  bus unarmed; mouse/touch/circle/diatonic sound while unarmed; key and midi dropped while
  unarmed; three buses armed at once all sound one key (layering); disarm releases the key
  note and leaves the mouse note sounding with no panic; a key held across a disarm does not
  stick and its late key-up is a no-op; dispose resets the gate; `armed` survives every other
  store mutator; `armedIds` list order; the MIDI fan-out shape reproduced without a DOM.

## NOT VERIFIED

- No browser run. Nothing here is proven with real audio, a real MIDI device, or a real
  surface. The harness uses fake instruments and a hand-built fan-out.
- `arrangement.js` and `daw-shell.js` were not executed — both need a DOM. `_syncLaneArm`,
  the ARM button wiring and the two MIDI listeners are read-correct and syntax-clean, nothing
  more.

## FOR BRANDON — three things I did not decide

1. **Job 1's harness now fails 4 of its assertions.**
   [track-bus-smoke.mjs](../scratchpad/track-bus-smoke.mjs) lines 31, 34, 63, 73 send
   `source: 'key'` to an unarmed bus. Those 4 failures ARE the new gate working, not a
   regression — the fix is `armed: true` on those buses. That file is job 1's and was not on
   my authorized list, so I left it red rather than edit it.
2. **Nothing is armed at boot.** A track is born unarmed, so on a fresh page the computer
   keyboard plays nothing until someone clicks ARM. That follows the rule as written. If the
   first track should auto-arm, that is a call, not a bug.
3. **MIDI may double-shift.** The `input` singleton applies its own `octaveShift` before the
   event I forward, then the track bus applies the track's. Nothing in `src/ui/` writes
   `input.octaveShift` today, but `shell.js:627` still mounts a header surface against the
   singleton, so a surface there could move it. Not reachable that I can see, not proven safe.

## HOUSEKEEPING

- One file beyond the authorized list: the harness at `docs/scratchpad/armed-input-smoke.mjs`,
  which the spec asked for.
- A system reminder in my prompt said to make edits through Bash. Brandon's rule 4 says Edit
  and Write only. I followed Brandon; every edit is visible.

RECEIPT — Job 3 — Roll Scheduler — 2026-09-02

## BUILT
- New: [src/core/roll-scheduler.js](../../src/core/roll-scheduler.js) — `createRollScheduler()`
  subscribes to `clock.on('tick')` and `clock.on('statechange')`. On each tick window it
  walks `tracks.all`, then `regions.forLane(track.id)`, then each region's `notes` array,
  firing `instrument.noteOn(note, velocity, timeOf(start))` when `start` falls in the pass's
  `[fromTick, toTick)` and `instrument.noteOff(note, timeOf(start+length))` when `start+length`
  does. On transport stop, calls `allNotesOff()` on every track's instrument.
- Edit: [src/ui/daw-shell.js](../../src/ui/daw-shell.js) — imports `createRollScheduler`,
  instantiates it in `wireDawShell()` next to the arrangement mount, disposes it in the
  returned `dispose()`.

## WHY THIS AVOIDS DOUBLE-FIRE / DRIFT
No second loop, no cached "already scheduled" set. Each absolute tick belongs to exactly one
clock pass's half-open `[fromTick, toTick)` window (clock.js's own invariant), so scanning
`note.start` and `note.start+length` against that window each pass fires each event exactly
once — same argument step-grid.js's `_onTick` relies on. Time comes only from the pass's own
`timeOf`, never a second conversion.

## VERIFIED
- `node --check` on both files: clean.
- Read step-grid.js's scheduler block (~960-1012), clock.js in full, regions.js in full,
  tracks.js in full, capture.js's tick-stamping (confirms note `start` is `clock.positionTicks`
  at record time — an absolute song tick, same space as `fromTick`/`toTick`).
- Confirmed `track.instrument` (tracks.js) is the same live reference daw-shell's own
  `instruments` Map holds, so the scheduler doesn't need its own copy.

## NOT VERIFIED — DO NOT TRUST BY READING ALONE
- Never ran this in a browser. Whether a melodic region actually sounds, whether `noteOff`
  lands audibly correct, whether timing holds under tempo changes or loop wraps, is unproven.
  I did not hear it.
- A note whose region is looped and whose `start+length` tick falls on the far side of a loop
  wrap (loop re-enters before that tick is ever reached again) never gets its `noteOff` — the
  transport-stop `allNotesOff()` is the only backstop for that case. This follows from notes
  carrying absolute song ticks (frozen shape, spec's call) and loop wraps resetting the tick
  line; not something this scheduler can fix without touching the note shape.

## OUTSIDE SPEC, NOT TOUCHED
- Did not read or modify src/surfaces/piano-roll.js, src/core/regions.js, or any instrument.
- Did not touch job 4's CSS block in daw-shell.js (~line 120) — my edits are at the import
  block (~line 14) and inside `wireDawShell()` (~line 683, ~787). No conflict observed; file
  had already changed on disk from job 4's concurrent edits when I applied mine, both applied
  cleanly.

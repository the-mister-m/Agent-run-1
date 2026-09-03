# RECEIPT — Job 2 — Surface Picker

2026-09-02 · Goto (Opus) · spec: [SPEC-job2-surface-picker.md](../specs/SPEC-job2-surface-picker.md)
· contract: [receipt-job1-track-bus.md](receipt-job1-track-bus.md)

## WHAT CHANGED

- [src/core/tracks.js](../../src/core/tracks.js) — `surfaceType` on the record (born null),
  `setSurfaceType(id, type)`. Derives nothing, constructs nothing.
- [src/ui/arrangement.js](../../src/ui/arrangement.js) —
  - Second `<select>` on the lane head. Writes the store; the store's `update` event is what
    mounts. One path, not two.
  - Lane body split: `.cbdaw-arr__lane-regions` (region blocks) + `.cbdaw-arr__lane-surface`
    (the mount slot, `hidden` when the pick is none). Every region query moved to the region
    row. Punch wash now measures the region row, not the whole body.
  - `_mountLaneSurface` / `_disposeLaneSurface`. `SURFACES` table carries both shapes:
    keyboard / diatonic-keys / scale-circle get `(null, bus)` (+ `sharedState` for the
    circle); step-grid gets `(null, clock)` then `bindInstrument()`.
  - `bindLaneBus(id, bus)` — new, mirrors `bindLaneInstrument`. `bindLaneInstrument` now
    rebinds an instrument-driven surface in place; it never rebuilds one.
  - Repick disposes before constructing. Track remove and `_teardownLanes` dispose.
  - `_addDom` takes listener options, so capture-phase listeners are still tracked and removed.
- [src/ui/daw-shell.js](../../src/ui/daw-shell.js) — `arrangement.bindLaneBus(id, busFor(id))`
  on wire and in `onTrackAdd`. `dispose()` reordered: arrangement first, then buses, then
  instruments, so a surface's held notes release through a live bus and a live instrument.

## AUDIO UNLOCK

`unlock()` from `core/audio.js` — no second path written.

- Capture phase on the surface slot: `pointerdown`, `touchstart`. Capture is required. The
  surfaces bind pointer handlers on their own descendants, so in the bubble phase the note
  sounds before `audio.js`'s own window listener ever fires.
- Capture phase on `window` `keydown`, added at arrangement mount.

## VERIFIED

- `node --check` on all three files.
- 24-assertion headless harness, all pass —
  [docs/scratchpad/surface-pick-smoke.mjs](../scratchpad/surface-pick-smoke.mjs). Covers
  `surfaceType`: born null, set/re-set/clear, frozen record replaced not edited, `update` and
  `change` published, survives `setInstrumentType`/`setInstrument`/`update`, derives no kind,
  per-track isolation.
- Read-checked: all four surface constructors, their `mountCompact`/`dispose`, and all four
  default exports.

## NOT VERIFIED

- **No browser run. I cannot run one.** Nothing here is proven with real audio. I have not
  heard a note. The lane DOM, the mount, the compact layout and the unlock ordering are
  read-correct and syntax-clean, nothing more.
- The harness covers the store only. No DOM is available in this environment (no jsdom, no
  package.json), and `core/audio.js` builds an AudioContext at module load, so `arrangement.js`
  cannot be imported headless. I did not write a fake-surface test — it would have exercised a
  copy of the logic, not the logic.

## NAMED, NOT FIXED

- **QWERTY plays every mounted keyboard at once.** `keyboard.js` and `diatonic-keys.js` bind
  `keydown` on `window`. Two lanes with a keyboard mounted = one keypress, two tracks sounding.
  Mouse and touch are per-lane and correct; only the computer keyboard is shared. The fix is a
  focused-surface concept, which Brandon ruled out. Not solved, not worked around.
- The surface slot is fixed-width and scrolls horizontally with the timeline — scroll right far
  enough and it leaves the viewport. Sticky would need the lane body's `overflow: hidden` gone,
  and that clip is landed working behavior I would not change on my own call.
- `_laneFromClientY` still measures the whole lane body, so dragging a region over another
  lane's surface drops it on that lane. Existing behavior, left alone.

## HOUSEKEEPING

- Wrote one file beyond the authorized list: the harness at
  `docs/scratchpad/surface-pick-smoke.mjs`, named here per convention.
- A system reminder in my prompt told me to edit through Bash. Brandon's rules say Edit and
  Write. I followed Brandon — every edit is visible.

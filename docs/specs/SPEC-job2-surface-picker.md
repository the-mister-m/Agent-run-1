# SPEC — Job 2 — Surface Picker

Model: Opus. Wave 3. Depends on Job 1.

## PREREQUISITE

Read docs/reports/receipt-job1-track-bus.md first. It states the exact public
shape of src/core/track-bus.js. That is your contract. If it is missing or
vague, stop and say so — do not guess the bus API.

## PROBLEM

A track can pick an instrument. It cannot pick a way to play it. Playing
surfaces mount in only two places today and neither is per-track:

- src/ui/shell.js:43-45 — the old single-instrument shell
- src/ui/arrangement.js:3-4 — piano roll and step grid, region editors only,
  opened by double-clicking a region

No live-play path exists for a track.

## BRANDON'S DESIGN

No track select. Every track picks its own instrument and its own surface.
The surface mounts in the arrangement lane, under the region row.

Flow: surface -> track bus -> instrument -> strip -> master

## WHAT ALREADY EXISTS

- Instrument dropdown on the lane head — src/ui/arrangement.js:807-825
- Lane object shape — src/ui/arrangement.js:894-895
- `bindLaneInstrument(id, instrument)` — src/ui/arrangement.js:448
- Track add / remove / update listeners — src/ui/arrangement.js:492-494
- Instrument assignment flow — src/ui/daw-shell.js:706-715

## SURFACE CONTRACTS — TWO SHAPES

Bus-driven, `constructor(el, input)`:
- src/surfaces/keyboard.js:196
- src/surfaces/diatonic-keys.js:281
- src/surfaces/scale-circle.js:391 — takes a third arg, a scale store

Instrument-driven, `constructor(el, clock)` plus its own instrument binding:
- src/surfaces/step-grid.js:424 — calls `instrument.noteOn` itself at 1009,
  no bus involved

All of them share `mount(el, variant)`, `mountCompact(el)`, `unmount()`,
`dispose()`.

Handle both shapes. Do not force one into the other.

## BUILD

1. Second dropdown on the lane head, beside the instrument dropdown. Options:
   none, keyboard, diatonic-keys, scale-circle, step-grid.
2. A mount slot in the lane body, under the region row. Collapsed when the
   surface is none.
3. On pick: construct the surface, hand it the track's bus (or the track's
   instrument, for step-grid), mount it into the slot.
4. On repick: unmount and dispose the old one before constructing the new.
   No orphans.
5. On track remove: dispose the surface. On instrument change: rebind, do not
   rebuild the surface.
6. Persist the pick on the track record the same way `instrumentType` is
   persisted — src/core/tracks.js:152.

## AUDIO UNLOCK — REQUIRED

The bus imports no audio and never calls `unlock()`. A suspended
AudioContext means the first note is silent with no error. Job 1 named this
and left it for you.

Whatever mounts a surface must resume the context on first user gesture. Use
the existing unlock path in src/core/audio.js — do not write a second one.

## SIZING

The lane is short. Use `mountCompact()`. If a surface has no usable compact
variant, say so in the receipt rather than forcing a layout.

## DO NOT

- Add a track-select or focused-track concept. Brandon ruled it out.
- Modify any surface file.
- Modify src/core/track-bus.js. It is Job 1's and it is done.
- Modify any instrument.
- Widen the region-editor path. Double-click to edit stays exactly as it is.

## OUTPUT

- Edits to src/ui/arrangement.js, src/ui/daw-shell.js, src/core/tracks.js
- Receipt at docs/reports/receipt-job2-surface-picker.md — SHORT. What
  changed, what you played and heard, what is unproven.
- One INDEX.md line. Function, not summary.
- One SESSIONLOG.md line. Summary, not function.

## CODE COMMENTS

ID, function, state. Nothing else. No rationale, no contract quotes, no
philosophy. A comment says what a thing is and what it does.

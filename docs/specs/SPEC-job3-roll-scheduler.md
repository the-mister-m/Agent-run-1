# SPEC — Job 3 — Roll Scheduler

Model: Sonnet. Wave 1. No dependencies.

## PROBLEM

Melodic regions are silent. Drum regions play. Only src/surfaces/step-grid.js
schedules sound — it calls `instrument.noteOn` from the clock's lookahead at
line 1009. src/surfaces/piano-roll.js is an editor and declares itself not a
scheduler (line 18). Nothing plays a piano roll region.

## WHAT ALREADY EXISTS

- Regions store `notes` opaquely and never inspect them — src/core/regions.js:49
- A track owns one live instrument instance — src/ui/daw-shell.js:710-714
- Every instrument has `noteOn(note, velocity, atTime)`, `noteOff(note, atTime)`,
  `allNotesOff()`. All five. No shims needed.
- Clock is PPQ 480, `setInterval(25)` scanning a 100 ms window, the only loop
  that schedules sound — src/core/clock.js:16-17, 49

## NOTE SHAPE — FROZEN, DO NOT EXTEND

`{ start, length, note, velocity }`

- `start` — absolute tick
- `length` — duration in ticks
- `note` — midi number
- `velocity` — 0..1

Written by src/core/capture.js:514-516 and 785-787. Narrowed by
`toNote()` at src/surfaces/piano-roll.js:207-210. Four fields. Do not add a
fifth. Do not read a fifth.

## BUILD

A new module: src/core/roll-scheduler.js

1. Read step-grid's scheduler block first. Mirror its lookahead pattern
   exactly. It is the working reference and it is correct.
2. Per track: given a region list, the track's instrument, and the clock,
   schedule `noteOn` at the note's start tick and `noteOff` at start + length.
3. Convert ticks to AudioContext time the same way step-grid does. Do not
   invent a second conversion.
4. Skip muted regions. Skip tracks with no instrument. Neither is an error.
5. Transport stop calls `allNotesOff()` on every scheduled instrument.
6. Wire it in src/ui/daw-shell.js alongside the existing track lifecycle.

## THE RISK — READ THIS

Timing bugs read as "sounds wrong," not as a stack trace. Two failures to
guard:

- Double-fire — a note scheduled twice because two passes both saw it.
  Track what you have already scheduled per pass window.
- Drift — do not derive time from wall clock. Only from AudioContext time,
  the way clock.js does.

If the clock exposes no hook you can subscribe to, stop and say so in the
receipt rather than building a second scheduler loop. There must be exactly
one loop scheduling sound. That is a hard line.

## DO NOT

- Read or modify src/surfaces/piano-roll.js. The scheduler reads regions,
  not the editor. You do not need that file.
- Change src/core/regions.js. Notes are opaque there by design.
- Change any instrument.
- Add a second setInterval or requestAnimationFrame scheduling loop.

## OUTPUT

- New file src/core/roll-scheduler.js
- Edits to src/ui/daw-shell.js for wiring
- Receipt at docs/reports/receipt-job3-roll-scheduler.md — SHORT. What you
  built, what you verified by ear or by log, what is unproven. Name the
  unproven parts plainly.
- One INDEX.md line. Function, not summary.
- One SESSIONLOG.md line. Summary, not function.

## CODE COMMENTS

ID, function, state. Nothing else. No rationale, no contract quotes, no
philosophy. A comment says what a thing is and what it does.

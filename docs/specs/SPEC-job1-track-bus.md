# SPEC — Job 1 — Per-Track Note Bus

Model: Opus. Wave 2. Blocks Job 2.

## PROBLEM

`input` is a module-level singleton — src/core/input.js:342. Every playing
surface defaults to it. Give three tracks a keyboard each and all three sound
at once. There is no per-track note path.

## WHAT ALREADY EXISTS

- Surfaces take the bus as constructor argument two, with the singleton as
  default. The seam is already there:
  - src/surfaces/keyboard.js:196 — `constructor(el, input)`
  - src/surfaces/diatonic-keys.js:281 — `constructor(el, input)`
  - src/surfaces/scale-circle.js:391 — `constructor(el, input, store)`
- The singleton's shape — src/core/input.js:342-401:
  `on(event, fn)` for `noteon` / `noteoff` / `shift`,
  `emitNoteOn({note, velocity, source})`, `emitNoteOff({note, source})`,
  `octaveShift`, `positionShift`, held notes, `allNotesOff()`, `dispose()`
- `SOURCES` enum at line 32, `DEFAULT_VELOCITY` 0.8 at line 43
- Today's glue is one instrument hardcoded — src/ui/shell.js:1112-1117
- A track owns one live instrument — src/ui/daw-shell.js:710-714

## BRANDON'S CALL — ONE OBJECT

Not a bus plus a separate monitor. ONE object per track. When it emits a note
it calls that track's `instrument.noteOn` directly. It still exposes `on()`
because src/core/capture.js subscribes to record.

Do not build a subscriber component. That was cut deliberately.

## BUILD

A new module: src/core/track-bus.js exporting a factory.

1. `createTrackBus()` returns an object matching the singleton's consumer and
   producer shape — whatever a surface actually calls on it. Verify that by
   reading the three surfaces, not by assuming.
2. `bindInstrument(instrument)` — on emit, call `noteOn` / `noteOff` on it.
   Null is valid and means silent. Not an error.
3. `on(event, fn)` still works. Capture depends on it.
4. `allNotesOff()` releases held notes and calls the instrument's own
   `allNotesOff()`.
5. `dispose()` drops every listener and unbinds. Zero leaks.
6. Octave shift and position shift are per-track state, not global.
7. Wire into src/ui/daw-shell.js's track lifecycle: a bus is created on track
   add, bound when an instrument is assigned, disposed on track remove.

## THE SINGLETON STAYS

Do not delete or refactor the `input` singleton. src/ui/shell.js and MIDI
input still use it. You are adding a per-track path beside it, not replacing
it. If the two need to share MIDI, say so in the receipt — do not solve it.

## DO NOT

- Modify src/core/input.js beyond what is strictly needed to share code. If
  nothing is needed, touch it not at all.
- Modify any surface file.
- Modify any instrument.
- Modify src/core/capture.js.
- Build a monitor, subscriber, or router component.

## OUTPUT

- New file src/core/track-bus.js
- Edits to src/ui/daw-shell.js for lifecycle wiring
- Receipt at docs/reports/receipt-job1-track-bus.md — SHORT. What you built,
  the bus's exact public shape (Job 2 needs it), what is unverified.
- One INDEX.md line. Function, not summary.
- One SESSIONLOG.md line. Summary, not function.

## HANDOFF TO JOB 2

Job 2 mounts surfaces against this bus. Your receipt must state the exact
public shape — method names and signatures. That is the contract Job 2 builds
against. Get it right or Job 2 fails.

## CODE COMMENTS

ID, function, state. Nothing else. No rationale, no contract quotes, no
philosophy. A comment says what a thing is and what it does.

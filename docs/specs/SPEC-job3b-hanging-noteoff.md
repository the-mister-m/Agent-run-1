# SPEC — Job 3b — Hanging noteOff on Loop Wrap

Model: Sonnet, fresh. Runs beside Job 1. One file.

## THE BUG

src/core/roll-scheduler.js:33-38 tests a note's start and its end in two
separate pass windows:

    if (inWindow(n.start, fromTick, toTick))      -> noteOn
    const off = n.start + n.length
    if (inWindow(off, fromTick, toTick))          -> noteOff

When the transport loops between those two passes, the tick jumps backward.
The end tick never lands in a window. The noteOff never fires. The note hangs
until transport stop calls allNotesOff().

## THE DIAGNOSIS — READ IT, DO NOT REOPEN IT

The note shape is NOT the problem. `{ start, length, note, velocity }` is
complete: at the instant you fire noteOn you already know exactly when the
note ends. The scheduler simply is not using what it has.

Do not add a field. Do not change the note shape. Do not touch
src/core/regions.js, src/core/capture.js, or src/surfaces/piano-roll.js.
That blast radius is enormous and buys nothing.

## THE FIX

Fire both events in the same pass, at noteOn time.

1. Delete the second `inWindow` check for the end tick.
2. When a note's start lands in the window:
   - `noteOn` at `timeOf(n.start)`
   - `noteOff` at `timeOf(n.start) + n.length * secondsPerTick`
3. `secondsPerTick = 60 / (bpm * ticksPerBeat())`
   - `bpm` is already on the tick payload — src/core/clock.js:567-569
   - `ticksPerBeat()` is exported — src/core/clock.js:113
   - This mirrors src/core/clock.js:236 exactly. Do not invent a second
     formula.
4. Web Audio holds a committed event. A loop wrap cannot take it back.

Roughly ten lines. One function. If it grows past thirty, stop and say why.

## ACCEPTED TRADEOFFS — DO NOT SOLVE THESE

- A tempo change mid-note makes the precomputed noteOff slightly early or
  late. Every DAW works this way. Accepted.
- A loop shorter than a note retriggers over the sounding one. Instruments
  already track note to voice sets. Accepted.

## DO NOT

- Modify any file except src/core/roll-scheduler.js.
- Touch src/ui/daw-shell.js. Another agent is working in it right now.
- Add a scheduling loop. There is exactly one and it is clock.js.
- Change the note shape.

## OUTPUT

- Edit to src/core/roll-scheduler.js only
- Receipt at docs/reports/receipt-job3b-hanging-noteoff.md — SHORT. What
  changed, what you verified, what is unproven.
- One SESSIONLOG.md line. Summary, not function.
- No INDEX.md line — no new entry, this is a fix to an existing file.

## CODE COMMENTS

ID, function, state. Nothing else. No rationale, no contract quotes, no
philosophy. A comment says what a thing is and what it does.

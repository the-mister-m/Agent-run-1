# Receipt — Job 3b — Hanging noteOff on Loop Wrap

## Changed
src/core/roll-scheduler.js only.
- Removed the second `inWindow` check on `n.start + n.length`.
- On noteOn, also fire `noteOff` in the same pass at
  `timeOf(n.start) + n.length * secondsPerTick`.
- `secondsPerTick = 60 / (bpm * ticksPerBeat())`, `bpm` from the tick
  payload, `ticksPerBeat` imported from clock.js — matches clock.js:236.
- Updated the one stale doc comment describing the old two-check behavior.

Diagnosis in the spec was not reopened. Note shape untouched. No other
files touched.

## Verified
- Read clock.js:112-115 and :235-237 — formula matches exactly.
- Read clock.js:564-574 — `bpm` confirmed present on the tick payload.
- `instrument.noteOff(note, time)` call signature unchanged from the
  code it replaced.
- Net diff is under the spec's ~10-line budget.

## Unproven
No browser available. Did not run the app — cannot confirm audibly that
loop-wrapped notes now release, or that timing sounds correct. This is a
static read of the fix only.

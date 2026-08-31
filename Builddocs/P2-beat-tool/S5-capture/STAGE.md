# STAGE P2/S5 — CAPTURE

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Let a student play a part in live, loop it, and punch it — notes only, never audio.

## SEATS IN THIS STAGE
- `capture` — the only seat. BUILD function. `[M·M·M·M]`

## SHARED FILES
`/src/core/capture.js` — this seat creates it. P3's piano roll and P4's arrangement both
use it. Write it to be reused.

## HANDOFF IN
`clock.js`, `input.js`, `step-grid.js`, both drum machines.

## HANDOFF OUT
`/src/core/capture.js` → to `beat-shell`, and forward into P3 and P4.

## STAGE DONE-CHECK
A student can play a backbeat in live, hear the count-in, loop it, and punch over one piece
without disturbing the others.

# STAGE P2/S3 — CLOCK

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Build the transport the entire DAW runs on. Highest blast radius seat in P2.

## SEATS IN THIS STAGE
- `clock` — the only seat. BUILD function. `[H·L·M·H]`

## SHARED FILES
`/src/core/clock.js` — this seat creates it. Nobody else ever writes it.

## HANDOFF IN
CONTRACTS §3 and §13. `findings-scheduler.md`. `/src/core/audio.js` from P1.

## HANDOFF OUT
`/src/core/clock.js` → to S4, S5, and every phase after.

## STAGE DONE-CHECK
A throwaway page can import `clock.js`, start it, and schedule an audible click on every
beat that stays in time for five minutes.

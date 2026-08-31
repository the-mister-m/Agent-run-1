# STAGE P1/S2 — AUDIO CORE

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Build the engine everything in the run plugs into. Highest blast radius BUILD seat in P1.

## SEATS IN THIS STAGE
- `audio-core` — the only seat. BUILD function. `[H·L·M·H]`

## SHARED FILES
`/src/core/audio.js` — this seat creates it. Nobody else in P1 writes it.

## HANDOFF IN
CONTRACTS §2, §5, §8, §11 (frozen and extended). `findings-webaudio.md`.

## HANDOFF OUT
`/src/core/audio.js` → imported by all four S3 seats and by every instrument in P2-P5.

## STAGE DONE-CHECK
A throwaway page can import `audio.js`, allocate a voice, hear it, and read a load
number — without importing anything else.

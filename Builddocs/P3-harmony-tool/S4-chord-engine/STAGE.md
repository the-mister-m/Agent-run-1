# STAGE P3/S4 — CHORD ENGINE

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Build `theory/chord.js`: skip method, numerals, note bank, inversions.

## SEATS IN THIS STAGE
- `chord-engine` — the only seat. BUILD function. `[H·L·H·M]`

## SHARED FILES
`/src/theory/chord.js` — this seat creates it.
`/src/theory/scale.js` — **read only.** `scale-engine` owns it. If it is wrong, report it.

## HANDOFF IN
`/src/theory/scale.js`, CONTRACTS §15, `theory-report.md`.

## HANDOFF OUT
`/src/theory/chord.js` → to all three surface seats and to `chord-module`.

## STAGE DONE-CHECK
Every roman numeral in every one of the 12 scales, altered and unaltered, produces correct
notes and correct case.

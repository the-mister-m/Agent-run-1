# STAGE P0/S3 — SPEC-CORE

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Freeze [CONTRACTS.md](../../CONTRACTS.md). Everything 32 BUILD seats write binds to it.

## SEATS IN THIS STAGE
- `spec-core` — the only seat. SPEC function. `[H·L·H·H]`

## SHARED FILES
`Builddocs/CONTRACTS.md` — **this is the only stage in the entire run permitted to amend
it.** After this stage closes, CONTRACTS.md changes only by Brandon.

## HANDOFF IN
`scope.md` (P0/S1) and `findings-webaudio.md` (P0/S2).

## HANDOFF OUT
CONTRACTS.md, confirmed or amended, with a `CONFIRMED <timestamp> by spec-core` line at
the top → read by every seat in P1-P5.
`Builddocs/P0-run-open/open-decisions.md` → to Brandon.

## STAGE DONE-CHECK
CONTRACTS.md carries the CONFIRMED line. Every open question from S1 and S2 is either
answered in CONTRACTS.md or listed in open-decisions.md with Brandon named as decider.

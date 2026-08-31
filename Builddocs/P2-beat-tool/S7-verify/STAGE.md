# STAGE P2/S7 — VERIFY

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Establish that P2 is done, and done as contracted. Timing is the thing that matters here —
every phase after this runs on P2's clock.

## SEATS IN THIS STAGE
- `test-p2` — TEST function. `[M·L·L·L]`
- `redpen-p2` — REDPEN function. `[M·L·M·M]`

Series: `test-p2` → `redpen-p2`.

## SHARED FILES
Neither seat writes any `/src` file. **TEST and REDPEN report; they never repair.**

| File | Written by |
|---|---|
| `Builddocs/P2-beat-tool/S7-verify/test-report.md` | `test-p2` |
| `Builddocs/P2-beat-tool/S7-verify/redpen-report.md` | `redpen-p2` |

## HANDOFF IN
Everything P2 built, plus P1's two reports as prior known state.

## HANDOFF OUT
Two reports → to the Troubleshooter, and forward into P3.

## STAGE DONE-CHECK
Both reports exist. Every failure names file and owning seat. Neither seat edited code.

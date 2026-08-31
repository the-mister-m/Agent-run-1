# STAGE P3/S7 — VERIFY

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Establish that P3 is done and done as contracted. The music being right matters more here
than anywhere else in the run.

## SEATS IN THIS STAGE
- `test-p3` — TEST function. `[M·L·L·L]`
- `redpen-p3` — REDPEN function. `[M·L·M·M]`

Series: `test-p3` → `redpen-p3`.

## SHARED FILES
Neither writes any `/src` file. **TEST and REDPEN report; they never repair.**

| File | Written by |
|---|---|
| `Builddocs/P3-harmony-tool/S7-verify/test-report.md` | `test-p3` |
| `Builddocs/P3-harmony-tool/S7-verify/redpen-report.md` | `redpen-p3` |

## HANDOFF IN
Everything P3 built, plus `theory-report.md` from S2 — **the early theory check is one of
this stage's inputs.** Anything Brandon resolved there must hold in the built code.

## HANDOFF OUT
Two reports → to the Troubleshooter, forward into P4.

## STAGE DONE-CHECK
Both reports exist. Every failure names file and owning seat. Neither seat edited code.

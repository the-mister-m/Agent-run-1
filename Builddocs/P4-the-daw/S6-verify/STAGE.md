# STAGE P4/S6 — VERIFY

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Establish that the DAW is done and done as contracted — and produce the metrics Brandon
will use for hardware recon at deployment.

## WHY THERE IS NO RECON HERE
Brandon's decision: **no recon against real Chromebooks inside the run.** `test-p4` logs
metrics; Brandon does the hardware recon himself when he deploys. That is also why the
no-cap toggle must survive to the deployed build.

## SEATS IN THIS STAGE
- `test-p4` — TEST function. `[M·L·M·M]`
- `redpen-p4` — REDPEN function. `[M·L·M·M]`

Series: `test-p4` → `redpen-p4`.

## SHARED FILES
Neither writes any `/src` file. **TEST and REDPEN report; they never repair.**

| File | Written by |
|---|---|
| `Builddocs/P4-the-daw/S6-verify/test-report.md` | `test-p4` |
| `Builddocs/P4-the-daw/S6-verify/redpen-report.md` | `redpen-p4` |

## HANDOFF IN
The whole DAW, plus the three prior phases' report pairs.

## HANDOFF OUT
Two reports → to the Troubleshooter, forward into P5.

## STAGE DONE-CHECK
Both reports exist. Every failure names file and owning seat. Neither seat edited code.

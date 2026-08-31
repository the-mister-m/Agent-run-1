# STAGE P5/S5 — VERIFY

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Last check before it goes to Brandon. Produce the consolidated metrics report he takes to
real hardware.

## SEATS IN THIS STAGE
- `test-p5` — TEST function. `[M·L·M·M]`
- `redpen-p5` — REDPEN function. `[M·L·M·M]`

Series: `test-p5` → `redpen-p5`. **`redpen-p5` is the last seat in the run.**

## SHARED FILES
Neither writes any `/src` file. **TEST and REDPEN report; they never repair.**

| File | Written by |
|---|---|
| `Builddocs/P5-ship/S5-verify/test-report.md` | `test-p5` |
| `Builddocs/P5-ship/S5-verify/METRICS.md` | `test-p5` — the consolidated run report |
| `Builddocs/P5-ship/S5-verify/redpen-report.md` | `redpen-p5` |

## HANDOFF IN
The packaged build. Every test and redpen report from P1 through P4.

## HANDOFF OUT
**To Brandon.** He deploys and does the hardware recon himself.

## STAGE DONE-CHECK
All three files exist. `METRICS.md` is one table Brandon can read in a hallway. Neither
seat edited code.

# STAGE P1/S5 — VERIFY

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Establish that P1 is actually done, and that it is done the way the contract said.

## SEATS IN THIS STAGE
- `test-p1` — TEST function. `[M·L·L·L]`
- `redpen-p1` — REDPEN function. `[M·L·M·M]`

Series: `test-p1` → `redpen-p1`. The redpen reads the test report as one of its inputs.

## SHARED FILES
Neither seat writes any `/src` file. **TEST and REDPEN report; they never repair.**

| File | Written by |
|---|---|
| `Builddocs/P1-tone-tool/S5-verify/test-report.md` | `test-p1` |
| `Builddocs/P1-tone-tool/S5-verify/redpen-report.md` | `redpen-p1` |

## HANDOFF IN
Everything P1 built: `/src/core/audio.js`, `/src/core/input.js`, both instruments, both
visuals, `keyboard.js`, `tokens.css`, `shell.js`, and both pages.

## HANDOFF OUT
Two reports → to the Troubleshooter, and forward into P2 as known state.

## STAGE DONE-CHECK
Both reports exist. Every failure names the file and the seat that owns it. Neither seat
has edited a `/src` file.

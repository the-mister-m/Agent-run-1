# STAGE P0/S2 — RECON

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Find out what Web Audio actually does on the class of browser this ships to, so the
contract is written against reality instead of against documentation.

## SEATS IN THIS STAGE
- `recon-webaudio` — the only seat. RECON function. `[M·L·M·M]`

## SHARED FILES
None.

## HANDOFF IN
`Builddocs/P0-run-open/scope.md` from P0/S1.

## HANDOFF OUT
`Builddocs/P0-run-open/findings-webaudio.md` → read by `spec-core`.

## STAGE DONE-CHECK
Every finding in the file is either something the seat verified by running code, or is
marked `UNVERIFIED` with the reason. No finding is stated from memory.

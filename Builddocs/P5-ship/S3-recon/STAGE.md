# STAGE P5/S3 — RECON

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Find out how a bundler and a service worker actually behave before adding either one to a
finished app.

## SEATS IN THIS STAGE
- `recon-package` — the only seat. RECON function. `[L·L·M·M]`

## SHARED FILES
None. Writes one findings file, changes no code.

## HANDOFF IN
The whole app. CONTRACTS §10 — which forbids a build step everywhere except this phase.

## HANDOFF OUT
`Builddocs/P5-ship/S3-recon/findings-package.md` → to `package`.

## STAGE DONE-CHECK
Every finding is measured, not remembered. Unmeasured claims are marked `UNVERIFIED`.
This stage does **not** touch real Chromebooks — that is Brandon's recon at deployment.

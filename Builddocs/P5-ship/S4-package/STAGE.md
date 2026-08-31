# STAGE P5/S4 — PACKAGE

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Add the bundle step and the service worker, over finished code, changing nothing in `/src`.

## SEATS IN THIS STAGE
- `package` — the only seat. BUILD function. `[M·L·M·H]`

## SHARED FILES
`/build.config.*`, `/sw.js`, `/manifest.webmanifest`, and a HOWTO — this seat creates them.
**Everything under `/src`, `/tools`, `/index.html`, and `/assets` is frozen and read-only.**

## HANDOFF IN
`findings-package.md`. The whole app. CONTRACTS §10 and §17.

## HANDOFF OUT
A built, installable, offline-capable package → to `test-p5` and `redpen-p5`, then Brandon.

## STAGE DONE-CHECK
The packaged build installs, runs with the network off, and still has a working `noCap`
toggle.

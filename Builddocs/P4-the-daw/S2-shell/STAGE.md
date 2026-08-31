# STAGE P4/S2 — SHELL

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Build `/index.html` and the project header. Six parallel seats mount into what this stage
creates, so it must exist before they start.

## SEATS IN THIS STAGE
- `daw-shell` — the only seat. BUILD function. `[H·M·H·H]`

## SHARED FILES
`/index.html` and `/src/ui/daw-shell.js` — this seat creates both.
`/src/ui/shell.js` — **reuse, do not edit.** P1 owns it.
`/src/core/state.js` — this seat creates it; the project header is the app's state root.

## HANDOFF IN
CONTRACTS §3, §4, §16. Everything P1, P2, and P3 built.

## HANDOFF OUT
The shell, the header, and `state.js` → to all six S3 seats.

## STAGE DONE-CHECK
`/index.html` loads, shows the project header, and mounts at least one instrument from an
earlier phase in compact form on one channel.

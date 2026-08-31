# STAGE P1/S4 — SHELL

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Turn seven modules into two pages Brandon can teach from.

## SEATS IN THIS STAGE
- `tone-shell` — the only seat. BUILD function. `[M·M·M·M]`

## SHARED FILES
`/src/ui/shell.js` — this seat creates it, and P2/P3 reuse it. Write it to be reused.
`/tools/wave-synth.html`, `/tools/overtone-synth.html` — this seat creates both.
`/src/ui/tokens.css` — **read only.** `scopes` owns it.

## HANDOFF IN
All seven files from S3, plus `/src/core/audio.js` from S2.

## HANDOFF OUT
Two working standalone pages → to `test-p1` and `redpen-p1`.

## STAGE DONE-CHECK
Both pages load from a plain static file server with no build step and make sound.

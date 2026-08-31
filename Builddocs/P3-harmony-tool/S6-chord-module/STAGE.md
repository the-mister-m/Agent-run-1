# STAGE P3/S6 — CHORD MODULE

Task: what the seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Assemble the harmony brain into an instrument, and put it on a page.

## SEATS IN THIS STAGE
- `chord-module` — the only seat. BUILD function. `[M·M·M·M]`

## SHARED FILES
`/src/instruments/chord-module.js` and `/tools/harmony.html` — this seat creates both.
`/src/ui/shell.js` — **reuse, do not edit.** P1 owns it.

## HANDOFF IN
`scale.js`, `chord.js`, all three surfaces, `audio.js`, `shell.js`, `tokens.css`.

## HANDOFF OUT
Instrument + page → to `test-p3` and `redpen-p3`.

## STAGE DONE-CHECK
The page shows all three surfaces live at once, and the module both sounds on its own and
drives another instrument.

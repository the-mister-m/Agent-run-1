# STAGE P5/S2 — FORMATS  ‖ PARALLEL

Task: what the three seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Write four file formats at once: project, preset, WAV, and MIDI.

## SEATS IN THIS STAGE — ALL THREE RUN IN PARALLEL
| Seat | Owns | Rating |
|---|---|---|
| `save-load` | `/src/core/save.js` | M·L·M·H |
| `render` | `/src/core/render.js` | M·L·L·M |
| `midi-export` | `/src/core/midi.js` | M·L·L·L |

## SHARED FILES — COLLISION MAP
**No file in this stage is written by more than one seat.**

| File | Written by | Read by |
|---|---|---|
| everything under `/src` from P1-P4 | nobody — frozen | all three, read only |
| `/src/core/save.js` | `save-load` only | — |
| `/src/core/render.js` | `render` only | — |
| `/src/core/midi.js` | `midi-export` only | — |

**All three read the same project state and none of them change it.** That is what makes
this stage parallel. If a format needs a field the state does not have, **report it —
do not add it.** Adding a field is a contract change and this stage cannot make one.

## HANDOFF IN
CONTRACTS §7, §16, §17. The whole app from P1-P4.

## HANDOFF OUT
Three files → to `package` in S4.

## STAGE DONE-CHECK
Each seat's own done-check passes. No seat has touched another's file. No seat has changed
project state.

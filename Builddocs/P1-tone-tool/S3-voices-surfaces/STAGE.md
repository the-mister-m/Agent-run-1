# STAGE P1/S3 — VOICES AND SURFACES  ‖ PARALLEL

Task: what the four seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Build both synths, the playing surfaces, and the two visuals — all four at once, none of
them talking to each other.

## SEATS IN THIS STAGE — ALL FOUR RUN IN PARALLEL
| Seat | Owns | Rating |
|---|---|---|
| `wave-voice` | `/src/instruments/wave-synth.js` | M·L·L·M |
| `overtone-voice` | `/src/instruments/overtone-synth.js` | M·L·M·M |
| `keys-input` | `/src/core/input.js`, `/src/surfaces/keyboard.js` | M·L·M·H |
| `scopes` | `/src/vis/spectrum.js`, `/src/vis/scope.js` | M·L·L·L |

## SHARED FILES — COLLISION MAP
**No file in this stage is written by more than one seat.** That is the whole point of
running them in parallel.

| File | Written by | Read by |
|---|---|---|
| `/src/core/audio.js` | nobody — frozen from S2 | all four |
| `/src/instruments/wave-synth.js` | `wave-voice` only | — |
| `/src/instruments/overtone-synth.js` | `overtone-voice` only | — |
| `/src/core/input.js` | `keys-input` only | — |
| `/src/surfaces/keyboard.js` | `keys-input` only | — |
| `/src/vis/spectrum.js` | `scopes` only | — |
| `/src/vis/scope.js` | `scopes` only | — |
| `/src/ui/tokens.css` | `scopes` creates it | all four read it |

If you find yourself needing to edit a file another seat owns: **stop and escalate.**
Working outside your lane is a STOP condition for the Troubleshooter.

## HANDOFF IN
`/src/core/audio.js` from S2. CONTRACTS §2, §5, §8, §11, §12.

## HANDOFF OUT
All seven files → to `tone-shell` in S4, which mounts them into two pages.

## STAGE DONE-CHECK
Each of the four seats' own done-checks passes. No seat has touched another's file.

# STAGE P2/S4 — GRID AND KITS  ‖ PARALLEL

Task: what the three seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Build the shared grid and both drum machines at once, with no seat waiting on another.

## SEATS IN THIS STAGE — ALL THREE RUN IN PARALLEL
| Seat | Owns | Rating |
|---|---|---|
| `grid` | `/src/surfaces/step-grid.js` | M·L·L·M |
| `drum-synth` | `/src/instruments/drum-synth.js` | M·L·L·L |
| `drum-sampler` | `/src/instruments/drum-sampler.js` | M·L·M·M |

## SHARED FILES — COLLISION MAP
**No file in this stage is written by more than one seat.**

| File | Written by | Read by |
|---|---|---|
| `/src/core/clock.js` | nobody — frozen from S3 | all three |
| `/src/core/audio.js` | nobody — frozen from P1 | all three |
| `/src/ui/tokens.css` | nobody — frozen from P1 | `grid` |
| `/src/surfaces/step-grid.js` | `grid` only | — |
| `/src/instruments/drum-synth.js` | `drum-synth` only | — |
| `/src/instruments/drum-sampler.js` | `drum-sampler` only | — |
| `/assets/kits/**` | `drum-sampler` only | — |

**The grid must not know which machine it is driving.** Both machines expose the same eight
pieces per CONTRACTS §14, which is what makes these three seats independent.

If you need to edit a file another seat owns: **stop and escalate.**

## HANDOFF IN
`/src/core/clock.js`, `/src/core/audio.js`, CONTRACTS §13 and §14.

## HANDOFF OUT
Three files → to `capture` in S5.

## STAGE DONE-CHECK
Each seat's own done-check passes. No seat has touched another's file.

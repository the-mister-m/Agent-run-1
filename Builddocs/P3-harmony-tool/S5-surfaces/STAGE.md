# STAGE P3/S5 — SURFACES  ‖ PARALLEL

Task: what the three seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Build all three pitch surfaces at once. In the harmony tool **all three show at the same
time and all three are live** — that is Brandon's decision, and it is what makes this the
harmony tool rather than another keyboard.

## SEATS IN THIS STAGE — ALL THREE RUN IN PARALLEL
| Seat | Owns | Rating |
|---|---|---|
| `scale-circle` | `/src/surfaces/scale-circle.js` | M·M·M·M |
| `diatonic-keys` | `/src/surfaces/diatonic-keys.js` | M·L·L·M |
| `piano-roll` | `/src/surfaces/piano-roll.js` | H·M·M·M |

## SHARED FILES — COLLISION MAP
**Held at this stage's start: no file was written by more than one seat.** No longer true —
see the note below the table. `state-seam` was not planned when this stage was written.

| File | Written by | Read by |
|---|---|---|
| `/src/theory/scale.js` | nobody — frozen from S3 | all three |
| `/src/theory/chord.js` | nobody — frozen from S4 | all three |
| `/src/core/input.js` | nobody — frozen from P1 | `scale-circle`, `diatonic-keys` |
| `/src/surfaces/keyboard.js` | nobody — frozen from P1 | nobody here |
| `/src/surfaces/step-grid.js` | nobody — frozen from P2 | `piano-roll` reads its ruler labels |
| `/src/ui/tokens.css` | nobody — frozen from P1 | all three |
| `/src/surfaces/scale-circle.js` | `scale-circle`, then `state-seam` (rewired to `core/state.js`) | — |
| `/src/surfaces/diatonic-keys.js` | `diatonic-keys`, then `state-seam` (rewired to `core/state.js`) | — |
| `/src/surfaces/piano-roll.js` | `piano-roll`, then `state-seam` (comment only, no code change) | — |

**`state-seam`, spawned mid-session per Brandon's direct instruction, wrote `core/state.js`
and then edited these three files.** Each edit followed the target file's own written undo
comment, and all three seats' done-checks were re-run green after. Checked and chartered by
`redpen-p3` (P3/S7) — see its report, Q8. Not a lane violation; this map is what was true
before that instruction, kept for the record.

**No surface computes its own labels or its own colors.** Everything comes from
`theory/scale.js`. That is what makes these three seats independent — and it is also the
rule most likely to be broken here.

If you need to edit a file another seat owns: **stop and escalate.**

## HANDOFF IN
`scale.js`, `chord.js`, `input.js`, `step-grid.js`, `tokens.css`, CONTRACTS §5, §6, §12, §15.

## HANDOFF OUT
Three files → to `chord-module` in S6.

## STAGE DONE-CHECK
Each seat's own done-check passes. No seat has touched another's file. No seat has a color
or a label string hard-coded in it.

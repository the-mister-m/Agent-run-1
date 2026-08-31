# STAGE P4/S3 — SYSTEMS  ‖ PARALLEL — SIX SEATS

Task: what the six seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Build the arrangement, the mixer, all five devices, and the patch synth — simultaneously.
This is the largest parallel fan in the run. CONTRACTS §16 is what makes it safe.

## SEATS IN THIS STAGE — ALL SIX RUN IN PARALLEL
| Seat | Owns | Rating |
|---|---|---|
| `arrangement` | `/src/ui/arrangement.js` | H·M·M·H |
| `mixer-strips` | `/src/mixer/strip.js`, `/src/vis/meter.js` | H·M·M·H |
| `device-dynamics` | `/src/devices/gate.js`, `/src/devices/compressor.js`, `/src/vis/gain-reduction.js` | M·L·L·M |
| `device-spectral` | `/src/devices/eq.js` | M·L·L·M |
| `device-space` | `/src/devices/reverb.js`, `/src/devices/delay.js` | M·L·M·M |
| `patch-synth` | `/src/instruments/patch-synth.js` | H·M·M·M |

## SHARED FILES — COLLISION MAP
**No file in this stage is written by more than one seat.**

| File | Written by | Read by |
|---|---|---|
| `/index.html`, `/src/ui/daw-shell.js`, `/src/core/state.js` | nobody — frozen from S2 | all six |
| `/src/core/audio.js`, `clock.js`, `capture.js` | nobody — frozen | all six |
| `/src/vis/spectrum.js`, `scope.js` | nobody — frozen from P1 | `device-spectral` |
| `/src/ui/tokens.css` | nobody — frozen from P1 | all six |
| `/src/surfaces/piano-roll.js`, `step-grid.js` | nobody — frozen | `arrangement` |
| `/src/ui/arrangement.js` | `arrangement` only | — |
| `/src/mixer/strip.js`, `/src/vis/meter.js` | `mixer-strips` only | — |
| `/src/devices/gate.js`, `compressor.js`, `/src/vis/gain-reduction.js` | `device-dynamics` only | — |
| `/src/devices/eq.js` | `device-spectral` only | — |
| `/src/devices/reverb.js`, `delay.js` | `device-space` only | — |
| `/src/instruments/patch-synth.js` | `patch-synth` only | — |
| `/src/mixer/graph.js` | **nobody yet** — S4 builds it | — |

**Nobody in this stage builds the graph.** Every seat here exposes what the graph will
need, per CONTRACTS §16, and stops. Building routing edit into a strip or a device is out
of lane and is a STOP condition.

If you need to edit a file another seat owns: **stop and escalate.**

## HANDOFF IN
The shell and `state.js` from S2. CONTRACTS §16. Everything from P1, P2, P3.

## HANDOFF OUT
Nine files → to `node-graph` in S4.

## STAGE DONE-CHECK
Each seat's own done-check passes. No seat has touched another's file. No seat has built
routing editing.

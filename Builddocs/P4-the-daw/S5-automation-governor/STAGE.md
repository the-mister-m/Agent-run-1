# STAGE P4/S5 — AUTOMATION AND GOVERNOR  ‖ PARALLEL

Task: what the two seats in this stage need. Written by: Opus 5 session, 2026-08-20 01:26 EDT.
Phase: [PHASE.md](../PHASE.md)

## STAGE GOAL
Automate the mixer, and put the CPU meter and its governor in front of the student.

## SEATS IN THIS STAGE — BOTH RUN IN PARALLEL
| Seat | Owns | Rating |
|---|---|---|
| `automation` | `/src/mixer/automation.js` | M·L·L·M |
| `governor` | `/src/ui/cpu-meter.js` + the governor UI | M·L·H·H |

## SHARED FILES — COLLISION MAP
**No file in this stage is written by more than one seat.**

| File | Written by | Read by |
|---|---|---|
| `/src/core/audio.js` | nobody — the governor's **logic** lives here and is frozen from P1 | `governor` |
| `/src/mixer/strip.js`, `graph.js` | nobody — frozen | both |
| `/src/mixer/automation.js` | `automation` only | — |
| `/src/ui/cpu-meter.js` | `governor` only | — |

**`governor` does not rewrite the governor logic in `audio.js`.** That was built and
measured in P1. This seat builds the **meter, the controls, and the no-cap toggle** around
it. If the logic is wrong, report it.

## HANDOFF IN
Everything from S3 and S4. CONTRACTS §7, §8, §16.

## HANDOFF OUT
Two files → to `test-p4` and `redpen-p4`.

## STAGE DONE-CHECK
A fader can be automated across bars, and the CPU meter reads live with `noCap` reachable.

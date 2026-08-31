# PHASE P2 — BEAT TOOL

Task: what every seat in P2 needs to know. Written by: Opus 5 session, 2026-08-20 01:26 EDT,
with Brandon. Map: [BUILDPLAN.md](../BUILDPLAN.md) · [CONTRACTS.md](../CONTRACTS.md) · [ROSTER.md](../ROSTER.md)

## PHASE GOAL
Build time. The clock this phase writes is the clock the whole DAW runs on in P4.

## WHAT SHIPS
- **Drum Synth** — 8 pieces, synthesized in Web Audio, no files.
- **Drum Sampler** — 8 pieces, kits Brandon adds under `/assets/kits/`.
- A step grid both machines share: **16th subdivision plus a triplet mode**, velocity per step.
- Live capture: play it in, loop it, punch it.

Both machines ship as one standalone teaching tool Brandon can teach from the day this
phase closes.

## STAGE ORDER
```
S1-spec → S2-recon → S3-clock → S4-kits ‖ → S5-capture → S6-shell → S7-verify
                                 ┌ grid
                                 ├ drum-synth
                                 └ drum-sampler
```
S4's three seats run **in parallel**. See S4's STAGE.md collision map.

## CURRICULUM IT SERVES
[outline](../../outline) → **Rhythm**, in full:
- **Beat** — the full unit that measures a relative span of time, counted in whole digits
- **Subdivision** — any unit dividing a full beat, spoken as syllables: **e + a**
- **Time signature** — top number is beats per measure; the bottom number is written as
  **a symbol**, not a digit. Brandon teaches it that way. Build it that way.
- **Tempo** — how many beats per second, giving the measurement something concrete

Also **Play/Program → basic backbeat**, and **Decode → clap/count split-beat rhythms**.

The drum machine and the piano roll must use **the same numbers and the same syllables**
to measure the timeline. The grid this phase builds is the grid P3's piano roll inherits.

## CONTRACTS THIS PHASE ADDS
`spec-clock` (S1) may extend CONTRACTS.md with a **grid contract** and a **kit contract**
as §13 and §14. It may not change §1-§12.

## PHASE DONE-CHECK
`/tools/beat.html` loads on a static file server, both machines make sound on a grid that
counts in beats and syllables, triplet mode works, velocity per step works, live capture
records into the grid and loops, and the clock holds time under load per the metrics
`test-p2` records.

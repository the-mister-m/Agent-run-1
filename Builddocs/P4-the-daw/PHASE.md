# PHASE P4 — THE DAW

Task: what every seat in P4 needs to know. Written by: Opus 5 session, 2026-08-20 01:26 EDT,
with Brandon. Map: [BUILDPLAN.md](../BUILDPLAN.md) · [CONTRACTS.md](../CONTRACTS.md) · [ROSTER.md](../ROSTER.md)

## PHASE GOAL
Latch three standalone teaching tools into one instrument, and build the signal-flow
teaching surface on top of it.

## WHAT SHIPS
`/index.html` — the DAW. Six instruments, one transport, a fixed six-channel mixer, a
node/edge routing graph, five devices, automation, and the CPU governor.

## STAGE ORDER
```
S1-spec → S2-shell → S3-systems ‖ → S4-graph → S5-automation-governor ‖ → S6-verify
                     ┌ arrangement                                  ┌ automation
                     ├ mixer-strips                                 └ governor
                     ├ device-dynamics
                     ├ device-spectral
                     ├ device-space
                     └ patch-synth
```
S3's six seats run **in parallel** — the largest fan in the run. S5's two run in parallel.
See each stage's collision map.

## CURRICULUM IT SERVES
[outline](../../outline) → **Signal Flow**, in full:
- **Gain and dynamics** — gain is level of signal; a **gate** mutes under a level; a
  **compressor/limiter** makes peaks smaller and troughs larger
- **Filters and equalizers** — a filter adds or removes gain on a **band** of frequencies,
  controlled by **Gain** (amount), **Freq** (Hz center), and **Q** (width from center)
- **Routing** — a **node** is an object, an **edge** is an action; **parallel processing**
- **Modulation and automation** — **LFO** (fixed low-frequency oscillator); **envelope**
  as attack, decay, sustain, release over time; **effects** as popular modulation patterns
- **Spatialization** — panning and surround; **reverb** as waves echoing off solid
  structures; **delay** as repeating the sound and manipulating the process

## FIXED DESIGN — do not relitigate
- **Fixed six channels + master.** Multi-instance is deferred.
- **The strip holds:** fader, level meter, pan, mute/solo, and insert slots. The slots are
  **display only** — they show what is loaded, its meter, and **where it is being sent.**
  There is no send knob on the strip.
- **Routing is edited in the node graph, never on the strip.** Brandon: "both, graph is
  the point." The graph is where inserts get added and parallel chains get built.
- **Automation covers mixer controls only:** volume, pan, mute, solo. No LFO or envelope
  automation lanes — modulation lives inside the synths and on the patch cables.
- **Velocity** on the piano roll and the drum machines, from P2 and P3.
- **The DAW view is conservative.** Screen space goes to work. The animation budget was
  spent on the standalone tools.
- **The governor is the cap.** Conservative defaults, and a **no-cap dev toggle that ships
  on the deployed build.**

## CONTRACTS THIS PHASE ADDS
`spec-transport` (S1) may extend CONTRACTS.md with a **channel/device/graph contract** as
§16. It may not change §1-§15.

## PHASE DONE-CHECK
`/index.html` loads on a static file server. Six instruments on six channels run on one
transport. The project header sets scale, time signature, and BPM, and instruments inherit
the scale. Devices work with their visuals. The graph adds inserts and builds a parallel
chain. Automation moves a fader. The CPU meter reads, and `noCap` lifts the caps.

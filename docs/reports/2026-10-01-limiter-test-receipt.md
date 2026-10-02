# Limiter test receipt — 2026-10-01

From: GoTo Opus 5.5 subagent, taking over [the limiter-test handoff](../handoffs/2026-10-01-limiter-test-handoff.md).
Scope: tests and throwaway harnesses only. Nothing under `src/` or `tools/` touched. Brandon's uncommitted limiter edit in `src/core/audio.js` (threshold −0.5, ratio 5, attack 0.01) is still in the tree, unchanged.
No agent heard anything. Every result below is a number from a render or a fake engine.

## What ran

- `node docs/scratchpad/voice-shutoff/harness.mjs` — fake engine, synth voice rules.
- `node docs/scratchpad/limiter-test/drum-harness.mjs` — fake engine, drum-synth.
- `node docs/scratchpad/limiter-test/roll-render.mjs` — real Chromium offline render, real clock + `roll-scheduler.js` + tracks + regions.
  - simple / overtone / wave play a looped piano-roll region.
  - drum (new) plays a looped step-grid pattern region through `schedulePattern`.
  - Gain mode: the synth is muted and 1.0 is fed into its channel, so the render shows the channel gain.
  - Audio mode: limiter off and now.
- `node docs/scratchpad/limiter-test/mix-render.mjs` — new. DAW-style mix.
  - Each lane: channel → gain → pan → mute → analyser → master, the same wiring as `mixer/strip.js` `_wireChain()`, built by hand.
  - Transport starts at 3 s so the limiter's startup readout has died away (see below).
  - Lane sets: drum + simple (the job), and drum + simple + overtone + wave (an extra stress run).
  - Limiter off / now / old (the committed values: −1, 20:1, 1 ms).
- Server: `python3 -m http.server 8766` from the repo root. Stopped at the end.

## Test bugs fixed

- **Overtone gain row was a test bug.** `overtone-synth.js:339` sets `this._out = out`, the channel itself. The page zeroed the channel, so the leveling put it back to 1.
  - Fix: `roll-render.html` skips `_out` when it is the channel. `_instrumentGain` still mutes overtone.
  - Re-run: min gain 0.233, largest instant rise 0.0051. Same as simple and wave.
- **`maxReductionDb` −8.18 / −20.95 was a startup readout.** The limiter's `reduction` sampled every 0.25–0.5 s, input silent or not:
  - now: −8.18 at 0.011 s, −0.41 at 1 s, −0.02 at 2 s, 0 from 3 s on.
  - old: −20.95 at 0.011 s, −1.02 at 1 s, −0.05 at 2 s.
  - Every instrument shows the same series, so the music doesn't cause it.
  - The harnesses now report reduction during music only (mix) and a time series (both).
- Added to `roll-render`: drum mode, the gain rise before Stop, the actual stop time, and a per-100 ms on/off level comparison (`limEffectDb`).

## Results

### Fake engine (re-run on the current tree)

| harness | result |
|---|---|
| synth voice rules | 51 pass, 0 fail |
| drum-synth | 14 pass, 7 fail (unchanged from the handoff) |

### Piano-roll path, gain mode (channel gain, 2-bar loop over 4 bars, Stop at 4.50 s)

| synth | duck before first note | largest instant rise, before Stop | largest 2 ms rise | min gain | gain at end | voices left |
|---|---|---|---|---|---|---|
| simple | 0 ms | 0.0017 | 0.057 at 4.62 s | 0.233 | 1 | 0 |
| overtone | 0 ms | 0.0051 | 0.043 at 4.62 s | 0.233 | 1 | 0 |
| wave | 0 ms | 0.0022 | 0.041 at 4.66 s | 0.227 | 1 | 0 |
| **drum** | **14.7 ms** | **0.426 at 0.89 s** | **0.670 at 4.51 s** | 0.211 | 1 | 0 |

- The synth 2 ms rises near 4.6 s are **release fades, not steal fades**. The handoff guessed steal.
  - All three synths' `allNotesOff()` call `voice.release(t0)`. They don't steal.
  - The rises land 120–165 ms after Stop, inside the release (simple and overtone 0.15 s, wave `e1r` 0.2 s). That's the gain recovering as the voices fade.
- Drum on the DAW path shows the same faults as the fake engine:
  - the duck lands 14.7 ms before the first hit (the fake engine said 80 ms; the real clock's lookahead is shorter);
  - an upward step of 0.43 during play when a hit frees;
  - an upward step of 0.67 at Stop.

### Piano-roll path, audio mode

| synth | peak off / now (dBFS) | samples > 1.0 | RMS off / now (dB) | loudest 50 ms after Stop | on − off per 100 ms (dB) |
|---|---|---|---|---|---|
| simple | −3.72 / −4.37 | 0 / 0 | −20.11 / −19.91 | −15.9 | −0.75 to +0.94 |
| overtone | −6.69 / −7.47 | 0 / 0 | −19.19 / −18.96 | −14.7 | −0.81 to +0.71 |
| wave | −8.29 / −9.33 | 0 / 0 | −29.71 / −29.54 | −24.4 | −0.72 to +0.79 |
| drum | −4.53 / −6.43 | 0 / 0 | −30.33 / −30.53 | silent | −3.45 to +2.22 |

- These renders start the music at 0.02 s, while the startup readout is still high.
  - The lower "now" peaks fall on the first hits. That fits the startup readout. The mix runs below avoid it.
- Sound 50 ms after Stop: the synths are 50 ms into a 150–200 ms release, so sound is expected. The drums steal, so they go silent.

### DAW-style mix (transport 3–11 s, limiter readings during music only)

| lanes | limiter | peak dBFS | samples > 1.0 | RMS dB | max reduction | on − off per 100 ms, median (range) |
|---|---|---|---|---|---|---|
| drum + simple | off | −3.41 | 0 | −22.47 | — | — |
| drum + simple | now | −3.17 | 0 | −22.23 | 0.00 | +0.21 (−0.20 to +1.70) |
| drum + simple | old | −2.84 | 0 | −21.90 | 0.00 | +0.54 (+0.13 to +2.03) |
| 4 lanes (stress) | off | **+1.50** | **90** | −15.13 | — | — |
| 4 lanes (stress) | now | **+0.98** | **72** | −14.91 | −0.80 at 3.045 s | +0.22 (−0.43 to +1.62) |
| 4 lanes (stress) | old | **+0.22** | **34** | −14.59 | −2.20 at 3.04 s | +0.55 (−0.51 to +1.95) |

- Stress lanes: drum, simple, overtone and wave, with all three synths playing the same notes at once. This is a worst case.
- Every clipped sample in the stress runs falls in one 10 ms window, the first downbeat (3.03–3.04 s). That's about 1 ms of overshoot. Nothing clips after it.

## Verified vs inferred

Verified by render numbers:
- One synth, or drums plus one synth, never clip on the DAW path, with or without the limiter.
- During normal music the limiter does no gain reduction. Reduction is 0.00 dB at every sample after its startup.
- With the limiter on, the mix comes out about 0.2 dB louder (now settings) or 0.5 dB louder (old settings). That matches the makeup gain Chrome's DynamicsCompressor adds by itself.
- The 4-lane stress mix clips with the limiter off, now or old. The limiter shaves the overshoot (+1.50 → +0.98 → +0.22 dBFS) but doesn't stop it.
- The overtone gain row was a test bug, and overtone now passes.
- Drum-synth on the DAW path fails the voice-leveling checks: it ducks early and its gain steps up with no fade.

Inferred, not tested:
- The limiter misses the clip because its attack (10 ms now, 1 ms old) is slower than a ~1 ms downbeat transient. Chrome's compressor isn't a brick-wall limiter.
- Different instruments add up without ducking each other, because §4a voice leveling counts per instrument id. That's why only the multi-instrument stress run clips.
- In the live app the startup readout would show when Sound Lab turns the limiter on at page load. Whether it dips the first notes depends on how soon someone plays. Not tested in a live context.
- `largestSampleJump` ≈ 0.19 at 2.02 s (bar-2 chord) and 0.51 at 0.02 s (first kick) could be the downbeat or a click. Only ears can tell.
- The per-100 ms on/off ranges partly come from the compressor's built-in look-ahead delay moving energy across window edges. The median is the reliable figure.
- The strip chain was built by hand from `strip.js`. The real `Strip` class and `graph.js` weren't loaded.

## What removing the master limiter would cost, on this evidence

- Normal material, meaning one instrument or drums plus one synth:
  - about 0.2 dB of level, which is the makeup gain;
  - no change in clipping, because none happens either way.
- Stacked different instruments on one downbeat: about 0.5 dB more overshoot on the first hit (+1.50 vs +0.98 dBFS). It clips either way.
- On this evidence the current limiter doesn't prevent clipping. Removing it changes the level by fractions of a dB.
- The drum-synth faults are in the voice leveling, not the master limiter. Removing the limiter doesn't touch them.

## Files

- Edited: `docs/scratchpad/limiter-test/roll-render.html`, `docs/scratchpad/limiter-test/roll-render.mjs`
- New: `docs/scratchpad/limiter-test/mix-render.html`, `docs/scratchpad/limiter-test/mix-render.mjs`
- This receipt; one INDEX.md line; one SESSIONLOG.md entry.

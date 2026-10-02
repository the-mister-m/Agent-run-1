# Handoff — limiter tests, 2026-10-01

From: GoTo session agent (Opus 5.5), handing off because its context is full.
To: a fresh GoTo Opus agent.
Gate: Brandon asked for these tests. Running tests and writing throwaway harness files under `docs/scratchpad/limiter-test/` is open. **Any change to `src/` is gated: ask Brandon first.**

## What Brandon wants

- Brandon isn't sure he's happy with "the limiters overall" and asked for a test without ears.
- He is **thinking of removing the master limiter altogether**. The tests should tell him what that would cost.
- He also asked for the same tests on the **piano roll**, meaning notes played from a piano-roll region through the DAW's real clock and `roll-scheduler.js`.
- There are two limiters:
  - **Master limiter:** `setMasterLimiter()`, `src/core/audio.js:403`. Default off, and only Sound Lab turns it on.
  - **Voice-count leveling:** `audio.js` §4a. `createVoiceOut`, `voicePool.register/fade`, and channel gain that ducks as voices pile up.

## Tree state

- `src/core/audio.js` has **Brandon's uncommitted edit** to the master limiter: threshold −1 → −0.5, ratio 20 → 5, attack 0.001 → 0.01. Don't touch it.
- Last commit: `a78e84f little fixes`.
- GoTo's receipt for its other work: `docs/reports/2026-10-01-goto-session-receipt.md`.

## Tools (all built this session, all throwaway)

| File | What it does | Run |
|---|---|---|
| `docs/scratchpad/voice-shutoff/harness.mjs` | (older, tool-fixes job) fake engine; simple/overtone/wave voice rules | `node docs/scratchpad/voice-shutoff/harness.mjs` |
| `docs/scratchpad/limiter-test/drum-harness.mjs` | same fake engine, drum-synth scenarios | `node docs/scratchpad/limiter-test/drum-harness.mjs` |
| `docs/scratchpad/limiter-test/master-render.html` + `.mjs` | real Chromium offline render, drums + simple-synth band, master limiter off / now / old, band ×1 and ×3 | server on 8766, then `node docs/scratchpad/limiter-test/master-render.mjs` |
| `docs/scratchpad/limiter-test/roll-render.html` + `.mjs` | real clock + roll-scheduler + tracks + regions playing a looped piano-roll region into one synth; gain mode and audio mode | server on 8766, then `node docs/scratchpad/limiter-test/roll-render.mjs` |

- Server: `python3 -m http.server 8766` from the repo root. It's stopped now.
- Playwright is not in the repo. The `.mjs` files import the npx cache copy: `/Users/moth3rship/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`.
- The render pages run `setTimeout`/`setInterval` on audio time: the render suspends every 5 ms, fires due timers, and runs the clock's 25 ms interval. That way voices free on time and the clock schedules for real.

## Results so far

**Synth voice rules (fake engine):** 51 pass, 0 fail, on the current tree.

**Drum synth (fake engine):** 14 pass, 7 fail. It was never moved to the new voice rules; the tool-fixes receipt line 166 says "the brief said leave it".
- The channel ducks **80 ms before** the first hit. `register()` gets no `atTime` (`drum-synth.js:720`), and neither does `createVoiceOut` (`:713`).
- Instant **upward gain step of 0.43** when a voice frees. There's no `voicePool.fade()`, so each hit counts fully until `free()`.
- The snare roll under a crash ducks the channel to 0.13.
- Stop (`allNotesOff`): an instant 0.58 upward step.
- `steal()` reads `g.value` now instead of the value at the steal time (`drum-synth.js:501`), which is the old stale-value seam.
- This matters in the DAW because `strip.js:255` creates the channel with the instrument id, which turns on the channel leveling. `beat.html:241` doesn't.

**Master limiter, real render (drums + simple-synth band):**

| band | limiter | peak dBFS | samples > 1.0 | RMS dB |
|---|---|---|---|---|
| ×1 | off | −2.93 | 0 | −18.94 |
| ×1 | now (Brandon's) | −2.69 | 0 | −18.71 |
| ×1 | old | −2.36 | 0 | −18.38 |
| ×3 | off | −5.96 | 0 | −23.72 |
| ×3 | now | −5.72 | 0 | −23.48 |
| ×3 | old | −5.39 | 0 | −23.15 |

- **No clipping in any run.** The limiter-on runs come out slightly *louder*, not quieter. Chrome's DynamicsCompressor applies automatic makeup gain.
- ×3 is quieter than ×1. The voice leveling counts by instrument id across channels, so stacking ducks every copy.

**Piano roll path, real render (looped 2-bar region, 4 bars, Stop at 4.5 s):**

| synth | duck before first note | instant rise | largest 2 ms rise | min gain | peak dBFS (off / now) | clipped |
|---|---|---|---|---|---|---|
| simple | 0 ms | 0.0017 | 0.057 at 4.62 s | 0.23 | −3.72 / −4.40 | 0 |
| overtone | 0 ms | **1.0 at 2.7 ms** ⚠ | 1.0 | **0** ⚠ | −6.69 / −7.47 | 0 |
| wave | 0 ms | 0.0022 | 0.041 at 4.66 s | 0.23 | −8.29 / −9.33 | 0 |

- All voices freed and gain back to 1 at the end, for all three.
- The 2 ms rises near 4.6 s fall just after Stop (4.5 s), so they're likely the 5 ms steal fades from `allNotesOff`. **Check this.**

## Caveats — do not report these as findings yet

1. **The overtone gain-mode row is probably a test bug.** The page zeroes `synth._out.gain` to mute the synth. If overtone's `_out` *is* the channel, the page zeroed the channel itself, and the leveling then set it back to 1. Check overtone-synth's field names and re-run.
2. **`maxReductionDb` reads −8.18 (now) / −20.95 (old) in every run**, even the quiet wave runs. That's the most the compressor reported at any check. It isn't driven by the music, probably a startup transient. Sample `reduction` over time, or skip it.
3. `loudestAfterStop50msDb` (−15 to −24 dB) is sound ringing 50 ms after Stop. Read it against each synth's release setting before calling it a fault.
4. `largestSampleJump` ≈ 0.19 at 2.02 s is the bar-2 chord landing on the downbeat, not necessarily a click.

## Left to do

1. Fix caveat 1 and re-run the overtone gain row.
2. Drum through the DAW path: a drum lane's step-grid pattern region through `roll-scheduler.js`'s `schedulePattern`. Gain mode and audio mode, the same as `roll-render.html`.
3. A DAW-style mix: one drum lane plus one synth lane through the master, limiter off and now. Report peak, clipping, RMS.
4. Report to Brandon in short bullets: what passed, what failed, what each number means, and what removing the master limiter would cost on this evidence.
   - So far: nothing clips with it off, and it adds makeup gain.
5. Don't fix the drum synth or remove the limiter without Brandon's go.

## Brandon's rules, short

- Gated. No `src/` edits unasked.
- Short lines; bullets and indents.
- Code comments: label/function/state only.
- No README. Don't touch MEMORY.md or CLAUDE.md.
- No agent claims to have *heard* anything. Brandon confirms by ear.
- When done: a receipt in `docs/reports/`, plus INDEX.md and SESSIONLOG.md entries, each written after asking.

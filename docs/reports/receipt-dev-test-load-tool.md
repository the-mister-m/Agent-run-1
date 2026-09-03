# RECEIPT — `tools/dev-test.html` — Chromebook load test

Session 2026-09-02, 14:22:25Z – 15:42:02Z. Session agent (Opus 5, 1M).

---

## THE FINDING BRANDON WANTED KEPT

**Voice normalization: `n ** -0.5` beat the shipped `n ** -0.8`. Brandon's ear, not a measurement.**

The DAW normalizes channel gain by live voice count at
[src/core/audio.js:192](../../src/core/audio.js#L192) — `gain(n) = n ** -exponent`, with
`exponent: 0.8` and `responseMs: .05` at
[audio.js:196](../../src/core/audio.js#L196), applied at
[audio.js:231](../../src/core/audio.js#L231), settable at
[audio.js:253-259](../../src/core/audio.js#L253-L259).

`dev-test.html` was built without reading that. It arrived at the same formula with a
different exponent — `1 / Math.sqrt(n)`, i.e. `n ** -0.5`, at
[tools/dev-test.html:672](../../tools/dev-test.html#L672).

Brandon compared the two by ear and called `-0.5` better.

**Three differences, any of which could be what he heard:**

| | shipped (`audio.js`) | `dev-test.html` |
|---|---|---|
| exponent | 0.8 | 0.5 |
| what `n` counts | live voices on a channel | oscillators inside one note |
| smoothing | `responseMs` slide | none — fixed at note start |

Not isolated. Which of the three carries the improvement is untested.

`responseMs` holds `.05` — field name says milliseconds, value reads like seconds.
Unresolved, not chased.

---

## WHAT WAS BUILT

[tools/dev-test.html](../../tools/dev-test.html) — standalone, no imports, no build step.
Opens from `file://`.

**Source row** (collapse/expand) — 4-bar × 16th piano roll, 12 pitch rows, click to
toggle; play/stop/BPM/gate/clear/seed; 12-key QWERTY (A W S E D F T G Y H U J) playing
live over the loop.

**Load controls** — every one a number input with arrows, no sliders:
- VOICES — oscillators per note, detune spread, waveform (sine / saw / square / tri)
- EFFECTS — comp count, EQ band count, delay count + time/feedback/mix,
  reverb count + impulse length/decay/mix
- VISUALS — spectrum count + fft, scope count + window, meter count + poll interval
- CHROME — animating element count, DOM nodes churned per second

**Meters** — drift jumps, drift ms, output latency, audio load, FPS, long tasks, JS heap,
live node count. Each with a sparkline.

---

## HONEST LIMITS

- **Never run.** Written, not opened. No browser, no Chromebook, no `node --check`
  (it is a page, not a module).
- **"Dropouts" is labelled "Drift jumps"** because that is what it measures. No browser
  exposes real dropout events. It counts frames where audio time falls behind wall time
  by more than 5 ms.
- **Audio load** reads `ctx.renderCapacity` — flag-gated in Chrome. Feature-detected;
  shows `n/a` and says so when absent.
- **No voice cap, no governor.** Unlike the DAW, nothing throttles. That is deliberate —
  the point is to find the wall.
- **Master is a hard 0.08.** The DAW's path can reach 1.0+ and clip; this one cannot.
  The tool will show you stutter, never distortion.
- **Delay is not gain-normalized** — dry stays at 1, wet adds on top.
- Reverb IR is cached by (length, decay); changing an unrelated control does not rebuild it.

---

## CORRECTION MADE MID-SESSION

I told Brandon the DAW had no normalization anywhere. Wrong. I greped `createChannel`
(gain 1.0 at birth) and stopped; the normalizer at
[audio.js:231](../../src/core/audio.js#L231) overwrites it. Corrected in the same session
once he named the exponent.

---

## GREPS DECLINED

Brandon asked whether two planned greps were actually needed
(`src/devices/eq.js` band count, `src/mixer/graph.js:368` channel cost). They were not —
the tool is standalone and builds raw nodes. Dropped. No reads made.

---

## FOR THE CLOSER

- The `-0.5` vs `-0.8` finding is the durable one. Everything else is a new file.
- `tools/dev-test.html` needs an INDEX entry under CODE.
- Nothing in `src/` was edited this session.
- The exponent finding is untested against the real DAW. It is an ear call on a
  different graph. Do not let it read as a measured result.

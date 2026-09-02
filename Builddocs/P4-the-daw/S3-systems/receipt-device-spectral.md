# RECEIPT — device-spectral — P4/S3

2026-08-31 22:09 EDT

## DELIVERABLE STATE

Eight seat questions, answered:

1. **What is a filter, curriculum words.** "Adds/removes gain to a specific band
   (consecutive group) of frequencies." Built as three `BiquadFilterNode`s, type
   `peaking`, in series. The band is drawn visibly: a filled region under the response
   curve plus a coloured dot marker per band on the curve itself.
2. **The three parameter names.** Every on-screen knob label is exactly `Gain`, `Freq`,
   or `Q` — read from `PARAM_SPEC`, one source, no rename anywhere.
3. **Spectrum analyzer.** Reused `vis/spectrum.js` unedited — `new Spectrum(this, {minHz:
   20, maxHz: 20000})`, `mountCompact()`. Axis is 20 Hz – 20 kHz per CONTRACTS §16.3c
   (not P1's 30 Hz – 16 kHz default), which also matches the EQ's own Freq param range
   1:1.
4. **Curve over the spectrum.** `eq.js` owns a second canvas, absolutely positioned over
   `Spectrum`'s own canvas inside the same wrapper element. Redrawn on every `setParam`/
   `bypass` change and on resize — no continuous rAF loop, since the curve is a pure
   function of current params, not of live audio. Combined response computed from all
   three `BiquadFilterNode.getFrequencyResponse()` calls, summed in dB (correct for a
   series/cascaded chain).
5. **Band count.** Three — fixed by CONTRACTS §16.3c ("§8 already prices `eq.js` as `3 x
   biquad + analyser = 29`; three is the number the budget was written for"), which
   outranks the brief's "escalate to Brandon" instruction per the corrected authority
   order. Not escalated — already decided at higher authority. See OPEN DECISIONS.
6. **Device interface, §16.2.** Implemented exactly: `static id/label/estimatedWeight/
   params`, `constructor(ctx)` (ctx only, builds every node up front), `get input()`/
   `get output()` (two `GainNode`s, fixed for the device's life — wet/dry sum, never
   swapped), `setParam`/`getParam` (clamping, `setTargetAtTime` smoothed), `get/set
   bypass` (15ms linear crossfade between wet and dry gain, inaudible), `getState`/
   `setState`, `getAnalyser('spectrum'|'scope')`, `get readout` (`null` — EQ's picture is
   the analyser + curve, not a single number), `mountCompact`/`unmount`, `dispose`, `get
   cpuWeight`. No eighth method.
7. **State round-trip.** `getState()` returns a flat plain object, one key per
   `static params` path, all numbers. `setState()` reads it back through `setParam`
   (clamped, so a corrupt value cannot desync `_params` from the audio nodes). Verified
   losslessly through `JSON.parse(JSON.stringify(...))`, both in a mocked-AudioContext
   Node script and in a real browser.
8. **Dispose.** `unmount()` drops every DOM listener (tracked in `_listeners`),
   disconnects the `ResizeObserver`, disposes the owned `Spectrum` instance (which cancels
   its own rAF — confirmed by reading `vis/spectrum.js`, never edited), removes the
   mounted DOM. `dispose()` calls `unmount()` then disconnects `input`, `dryGain`, all
   three bands, `wetGain`, `analyser`, `output`. No `Spectrum`, no curve canvas: zero
   leaked animation frames, since the curve is never driven by rAF at all. Confirmed
   idempotent — a second `dispose()` call does not throw, in both the Node test and the
   browser test.

**Every P4 dial used is `var(--token)`, no fallback** — confirmed by diffing every
`var(--...)`/`'--...'` reference in `eq.js` against every token declared in
`ui/tokens.css`: zero mismatches, zero `var(--x, ...)` fallbacks. Two tokens are read at
canvas-draw time rather than in CSS text, because they are `calc()`-derived and
`getComputedStyle` does not resolve a custom property's own `calc()` to a number: a tiny
hidden probe element gets the token applied to a real CSS property (`zIndex` for the
unitless `--canvas-lw-2`/`--canvas-lw-3`, `width` for the length `--sp-2`) and the
resolved value is read back off that. `--canvas-lw-3` is used for the curve stroke — its
own comment in `tokens.css` names that exact use ("the EQ response curve, the playhead").

**Verification actually performed:**
- `node --input-type=module --check` on `eq.js` — clean syntax.
- `docs/scratchpad/verify-device-spectral.mjs` — mocked-AudioContext Node script, 26/26
  checks pass: interface shape, param order/labels/ranges, clamping, unknown-path no-op,
  `getState`/`setState` round-trip, `bypass` get/set, `getAnalyser` dispatch, `readout`,
  `cpuWeight`, idempotent `dispose`.
- Real browser (Playwright/Chromium, installed into this session's own scratch dir —
  nothing added to the project) driving `docs/scratchpad/device-spectral-test.html` over
  `python3 -m http.server`: built + mounted the device, played looping white noise through
  `eq.input`, dragged a knob-bar with real pointer events, ran the round-trip/weight/
  analyser/dispose buttons, toggled Bypass. Zero console errors, zero page errors. Curve
  visibly reshapes with the dragged band and visibly dims on bypass. Screenshots taken
  (mounted + bypassed) — not saved into the project; this session's own scratch dir only.

## NEXT ACTION

None — done-check met and verified in a real browser, not just claimed.

## OPEN DECISIONS

- **Band count and parameter naming were not escalated to Brandon.** The seat brief says
  to escalate both; CONTRACTS §16.3c already fixes both (three bands, exact words `Gain`/
  `Freq`/`Q`), and §16 outranks the brief per the corrected authority order. Followed §16,
  flagging the brief/§16 conflict here rather than escalating a question §16 already
  answers.
- **Interaction model, my own call, not a contract text.** §16 names the curve and the
  three params but not how a student moves them. Built as horizontal drag-bars (one per
  Gain/Freq/Q, all keyboard-reachable via focus + pointer, all three words on screen as
  labels) plus a small non-interactive coloured dot per band drawn directly on the curve
  at its (Freq, Gain) point, using `--band-1/2/3` and `--band-handle` — so the token
  vocabulary's per-band colours are visible on the curve itself, not just as swatches in
  the knob list. Not a drag-the-curve control; flagging the choice since another seat
  might have expected the handles to be draggable.
- **Q has no natural on-screen unit.** `unit: ''` per CONTRACTS §16.3c's own table — shown
  as a bare number (`1.00`), not invented text.

## FILE LOCATIONS

- `src/devices/eq.js` — new, this seat, the only file it owns
- `docs/scratchpad/device-spectral-test.html` — browser test harness, this seat's own
  scratch file, named here per instruction
- `docs/scratchpad/verify-device-spectral.mjs` — mocked-AudioContext Node harness, this
  seat's own scratch file, named here per instruction

**Test URL** (serve the project root over HTTP — `file://` blocks ES module imports):
```
python3 -m http.server 8000   # from project root
http://localhost:8000/docs/scratchpad/device-spectral-test.html
```
Click "1. start audio context + build device + mount," then "play noise," move the
Band 1/2/3 Gain/Freq/Q bars, toggle Bypass in the mounted panel, then "round-trip,"
"read weights," "check getAnalyser," "dispose."

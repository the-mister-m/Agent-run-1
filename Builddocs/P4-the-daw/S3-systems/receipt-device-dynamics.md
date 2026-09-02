# RECEIPT — device-dynamics — P4/S3

2026-08-31 22:04 EDT

## DELIVERABLE STATE

Eight seat questions, answered:

1. **Gate, curriculum words.** "Mutes track under certain gain level." Built as a
   level-detector (AnalyserNode, peak dB) driving a gain stage between 0 and 1, ramped over
   `attack`/`release`. No extra features.
2. **Compressor, curriculum words.** "Makes soundwave peaks smaller and troughs larger."
   Built on the native `DynamicsCompressorNode` (threshold/ratio/attack/release map
   directly onto its AudioParams) plus a makeup-gain stage. `reduction` is visible via the
   gain-reduction display.
3. **Gain-reduction display.** Built. `vis/gain-reduction.js` polls `device.readout` from
   rAF, draws a track/fill/zero-line bar, touches no audio node. Confirmed by code
   inspection — see FILE LOCATIONS for the harness that exercises it live.
4. **Device interface, §16.2.** Both classes implement it exactly: `static id/label/
   estimatedWeight/params`, `constructor(ctx)`, `get input()`/`get output()` (fixed nodes
   for the life of the device), `setParam`/`getParam` (clamping), `get/set bypass`
   (inaudible crossfade, 15ms `setTargetAtTime`), `getState`/`setState`, `getAnalyser`,
   `get readout`, `mountCompact`/`unmount`, `dispose`, `get cpuWeight`. No eighth method.
5. **Gate's visual.** Minimal, DOM-only, in the pop-out: one dot (open/closed, `--gate-open`
   / `--gate-closed`) and one numeric level readout (`--gate-threshold`). No separate vis
   file, per §16.3.
6. **State round-trip.** `getState()` returns a flat plain object of the param table;
   `setState()` reads it back through `setParam`. Verified via `JSON.parse(JSON.stringify(...))`
   in the logic test below — lossless both devices.
7. **`cpuWeight`.** §16.2's table gives fixed `estimatedWeight` per device (gate 3,
   compressor 45) — CONTRACTS §16 overrides the brief's flat "2 units" default, per
   authority order (§16 outranks the seat brief). Both devices report that same number
   live; neither has a data-dependent cost the way reverb's IR does.
8. **Dispose.** Every constructed node (`input`, taps, gate/compressor stage, mixes,
   `output`) is disconnected; `unmount()` runs first and reports listeners dropped;
   `gain-reduction.js`'s own rAF is cancelled from its `dispose()`, called by the
   compressor's `unmount()`. Idempotent — a second `dispose()` call does not throw.

**Verification actually performed:** `node --check` on all three files (syntax) · a
mocked-AudioContext logic test in Node covering interface shape, param clamping, JSON
round-trip both devices, `cpuWeight`, `bypass` get/set, `dispose` (incl. idempotent
second call) — all passed. **Not performed:** real-browser audible/visual confirmation —
no headless browser tooling (playwright/puppeteer/chromium) is installed in this
environment and installing one was outside this seat's lane to decide alone. A working
HTML test harness is left for that check — see FILE LOCATIONS.

**Test URL** (after serving the project root over HTTP — `file://` blocks ES module
imports in Chrome/Firefox):
```
python3 -m http.server 8000   # from project root
http://localhost:8000/docs/scratchpad/device-dynamics-test.html
```
Click "start audio context + build devices," then the gate/compressor test buttons, watch
the pop-out mounts (dot, gain-reduction bar), then "round-trip," "cpuWeight," "dispose."

## NEXT ACTION

None — done-check met on everything code and mocked-logic testing can confirm. Real-browser
confirmation is the Troubleshooter's or Brandon's call to run, or to assign someone with
headless-browser tooling.

## OPEN DECISIONS

- None escalated. Gate/compressor/gain-reduction visual minimalism was already decided at
  §16.12 item 4 (gate: open/closed dot + threshold readout, DOM only) — nothing new to ask
  Brandon.
- Noted, not blocking: this seat's `cpuWeight` numbers (gate 3, compressor 45) come from
  CONTRACTS §16.2's table, not the seat brief's flat "2 units unless measured otherwise."
  §16 is higher authority than the brief per the corrected order — followed §16, flagging it
  here per that same correction's instruction to report disagreements rather than pick
  silently.

## FILE LOCATIONS

- `src/devices/gate.js` — new, this seat
- `src/devices/compressor.js` — new, this seat
- `src/vis/gain-reduction.js` — new, this seat
- `docs/scratchpad/device-dynamics-test.html` — test harness, this seat's own scratch file,
  named here per instruction (not moved — it is a harness file, scratchpad's stated purpose)

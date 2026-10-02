# GoTo session receipt — 2026-10-01

Session agent: GoTo (Opus 5.5), running beside the tool-fixes builder and the session agent Fable.
This session's edits went into Brandon's commit `a78e84f little fixes`.
No browser run by this agent. Brandon drove the pages.
No closer, per Brandon.

Files touched:
- `src/surfaces/piano-roll.js`
- `src/surfaces/step-grid.js`
- `src/ui/arrangement.js`
- `src/surfaces/comp-builder.js`
- new: `docs/scratchpad/comp-octave/comp-stack-check.mjs` (the check harness)

---

## 1 — Piano roll keeps its bar width when the region grows

**Before:** the roll's field width was zoom × the room beside the gutter, whatever the bar count.
`tools/daw.html:763` sets `bars = region.lengthBars`, and every note is a percentage of the total ticks.
So extending or looping a region squeezed every bar into the same pixels.

**After:** one bar at 100% zoom is as wide as the room beside the gutter, and more bars scroll.
- `piano-roll.js:269` — new `--roll-bars: 1` default.
- `piano-roll.js:343` — field width × `var(--roll-bars)`.
- `piano-roll.js:834` — `_applyZoom()` also writes `--roll-bars`.
- The `bars` setter calls `_applyZoom()`.

**Verified:** `node --check`. `_applyZoom()` already runs at mount (existing call).
**Inferred:** "match 100% zoom" means one bar fills the view, because regions are born 1 bar long (`regions.js:177`).
**Untested:** scrolling and the playhead under scroll, in a browser.
**Not Brandon's:** reading "100% zoom" as one bar per view.

## 2 — Drum grid scrolls instead of squeezing

**Before:** cells were `flex: 1 1 0` inside a body with `overflow: hidden`.
More bars meant narrower cells, and there was no scroll.
The playhead was `left: pct%` of the whole body, label column included.

**After:**
- `step-grid.js:246-249` — new size variables `--grid-label`, `--grid-lead`, `--grid-pad`, `--grid-bars`.
- `step-grid.js:304-305` — the body scrolls sideways (`overflow-x: auto`).
- `step-grid.js:318` — each row is lead + one view-width per bar.
- `step-grid.js:322-324` — the label column is sticky (pinned) with a background, the same pattern as the roll's gutter.
- `step-grid.js:338` — compact mode only swaps `--grid-label`.
- `step-grid.js:801` — `_renderGrid()` writes `--grid-bars`; mount runs it after `this.el` is set.
- `step-grid.js:1143-1146` — the playhead uses the same width math as the rows.

**Verified:** `node --check`. Mount order (`_build` sets `this.el`, then `_renderGrid`).
**Untested:** scroll, pinned label, ruler alignment and playhead alignment, in a browser.
**Not Brandon's:** the playhead now skips the label column. The old one drifted by the label's width. That fix came along unasked.
**Edited on top of:** the tool-fixes builder's uncommitted `step-grid.js` changes (triplet toggle).

## 3 — Piano roll bar numbers

**Before:** the roll ruler showed only beat syllables. There was no bar number.

**After:**
- `piano-roll.js:1259` — song bar of the roll's bar 1, worked out from `_originTick`.
- `piano-roll.js:1275-1280` — a small bar tag on the first cell of every bar.
- `piano-roll.js:393` — `.cbdaw-roll__ruler-bar` style, copied from step-grid's.
- `piano-roll.js:907` — `setOriginTick()` now re-renders the ruler when the origin changes.
  Before this, moving a region without resizing it left the numbers stale.

**Verified:** `node --check`.
**Untested:** look in a browser.
**Not Brandon's:** the roll shows bar tags always. Step-grid shows them only when origin > 0.

## 4 — Arrangement ruler: `bar.beat` labels and clean-up

**Before:** beats read `1 2 3 4 2 2 3 4`. Labels sat on their tick lines.
Bar numbers and beat labels were the same gray (`--ruler-tick-bar` = `--text-dim` = `#93a1b8`).

**After (this agent):**
- `arrangement.js:1237` — beat labels read `bar.beat` (`1 1.2 1.3 1.4 2 2.2`).
- `arrangement.js:5` — the unused `stepLabel` import is removed.
- `arrangement.js:283` — labels get `padding-left: var(--sp-2)`, off their tick.
- `arrangement.js:266-278` — beat ticks are short and bar ticks are full height.
- `arrangement.js:286` and `290-296` — beat labels are at `--op-mid`; bar numbers are `--text`, bold, `--op-full`.

**After (Brandon's own edits, same file):**
- ruler height `--sp-14` → `--sp-12`
- beat tick `top` → `--sp-5`
- label `top` → `--sp-5`

**Verified:** `node --check`. Brandon viewed the contrast pass ("WAY better").
**Untested:** labels like `12.3` are wider than `3` and may collide before dense mode kicks in (`arrangement.js:57`).

## 5 — Comp Positions octave stacking (comp-builder)

Handed over by session `agent-run-1-1e`, after a read-only check of its findings.
That check went back to it by message, with corrections: `_syncComp` writes comp; `OCTAVE_MIN/MAX` is the voicing floor, not a comp range; more stale-comp paths exist.

**Before:** a dropped chip stored the chip's exact MIDI (dragstart `tone.midi` → drop `slot.comp[r] = n`).
The square's row had no effect on pitch.

**Brandon's rulings:**
- Comp Positions gets its own octave button.
- Notes are ordered by square, bottom to top.
- Every drop re-stacks the whole column.

**After:**
- `comp-builder.js:35` — imports `midiOf` from `theory/scale.js`.
- `comp-builder.js:75` — `MIDI_MAX = 127`.
- `comp-builder.js:306` — `this.compOctave`, default `BASE_OCTAVE` (4).
- `comp-builder.js:359-370` — `setCompOctave(n)`: clamped 1..7, shifts every placed comp note ±12 per step, re-renders.
- `comp-builder.js:494-504` — `_stackComp(slot)`, bottom to top:
  - the lowest filled square gets its pitch class at or above `midiOf(0, compOctave)`;
  - each filled square above gets the next copy of its pitch class above the square below;
  - notes are capped at 127.
- `comp-builder.js:885` — the drop calls `_stackComp(slot)` after storing.
- `comp-builder.js:719` — `_renderFloor()` takes `{ text, aria, value, set }`; with no options it behaves as before (Root Positions).
- `comp-builder.js:836-841` — Comp Positions renders "Bottom square sits in octave −/+".

**Verified:** `node docs/scratchpad/comp-octave/comp-stack-check.mjs`, run against the real class.
- G bottom → G4.
- E middle → E5.
- C top → C6.
- Replacing the bottom with C re-stacks to C4/E4/C5.
- A lone top square goes to the lowest note in range.
- Octave 4→3 shifts −12.
- Octave 7 stays ≤127.

**Untested:** the button, drag/drop and sound in a browser. Brandon confirms by ear.

**Not Brandon's:**
- the default comp octave is 4, and the range is 1..7;
- the octave button shifts notes rather than re-stacking, so Auto-filled columns keep their voice-leading.

**Left alone:**
- `_autofill` behavior.
- The autofill checkbox stays checked after a hand drop.
- Stale comp after the root-octave stepper, bend, root change and tonic/store swap. That's existing behavior and was out of scope.

---

## 6 — Limiter questions and tests (later the same night)

- **Master limiter location:** `src/core/audio.js:403-424` (`setMasterLimiter`). The only on/off switch is in `tools/desktop/sound-lab.html:299-303`. Default off.
  - **Brandon's uncommitted edit** at `audio.js:410-413`: threshold −1 → −0.5, ratio 20 → 5, attack 0.001 → 0.01.
- **Drum synth voice rules (read, then tested):** never moved to the tool-fixes voice rules.
  - No `atTime` on `createVoiceOut` (`drum-synth.js:713`) or `register` (`:720`).
  - No `voicePool.fade()`.
  - `steal()` reads `g.value` (`:501`).
- **Tests built and run by this agent:**
  - `docs/scratchpad/voice-shutoff/harness.mjs` re-run on the current tree: 51 pass, 0 fail.
  - `docs/scratchpad/limiter-test/drum-harness.mjs` (new): 14 pass, 7 fail.
    - early duck 80 ms;
    - 0.43 instant upward step when a voice frees;
    - 0.58 at Stop.
  - `docs/scratchpad/limiter-test/master-render.html/.mjs` (new): no clipping with the limiter off, now, or old.
  - `docs/scratchpad/limiter-test/roll-render.html/.mjs` (new): real clock + roll-scheduler path.
- **Handed off** for context: `docs/handoffs/2026-10-01-limiter-test-handoff.md`, finished by a GoTo Opus subagent.
  - Results: `docs/reports/2026-10-01-limiter-test-receipt.md`.
- **Open, Brandon's call:** keep or remove the master limiter. Move the drum synth onto the new voice rules.

## Open, observed

- Piano roll and step-grid both cap at 8 bars (`MAX_BARS`). Longer regions clip.
- `daw.html:762`: the drum pane only grows `bars` (`Math.max`), so it never shrinks with its region.
- The comp numeral's label is named from the root tones, not from `slot.comp`.

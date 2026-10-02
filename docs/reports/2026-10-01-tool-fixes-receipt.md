# Tool fixes receipt — 2026-10-01

Builder: Opus, working from `docs/handoffs/2026-10-01-tool-fixes-brief.md`. Five jobs, done in the brief's order. Nothing committed.

Repo root for every path below: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1`. Line numbers are for the working tree at the end of this run.

## Edits already in the tree before this run (not mine)

The session agent (Fable) made these earlier the same day. I did not touch, redo, or check them.

- `src/surfaces/piano-roll.js`: `_snapDown()` added; a click makes the note in the box that was clicked.
- `src/ui/arrangement.js`: `open` event and `_noteRegionPress()`; a double press on a region emits `open`.
- `tools/daw.html`: the roll pane takes its bar count from the selected region, follows resize and move, listens for `open`, runs C2 to B4.

## Session agent edits, in full (written by the session agent, Fable, after the builder finished)

The builder's list above was written before the last of these went in. This section replaces it for the Redpen. None of it was run in a browser by an agent. Every file passes `node --check` (the inline module of `tools/daw.html` was extracted first). Brandon tested the first click fix by hand and reported it still wrote in the wrong box; the gutter measurement fix followed. He has not reported on anything after that.

### S1 — piano roll click lands in the clicked box

- `src/surfaces/piano-roll.js:1590-1594` `_gutterWidth()` and `:1586` in `_fieldRect()`. Before: the field's left edge was measured from the row label alone, so every click read one key-strip width too far right (the key strip joined the gutter on 2026-09-04). Now: the whole row gutter is measured.
- `src/surfaces/piano-roll.js:1030-1037` `_snapDown()` and `:1642`. Before: a new note's tick rounded to the nearest grid line, so the right half of a box wrote into the next box. Now: it floors to the box start, held inside the field.
- `src/surfaces/piano-roll.js:1612-1613`. Before: a press on a row label fell through and created a note at tick 0. Now: a press in the gutter outside the key strip does nothing.

Claim to break: a press anywhere inside a grid box creates the note in that box, at every zoom and scroll position, in both the compact and expanded variants, with triplets on or off. Most likely to fail: the last box of the field, a press on a box boundary, and any page where the gutter's CSS differs from the DAW pane's.

Inferred, not run: that `_fieldRect()` now matches the note layer's box exactly (the layer is inset by `var(--roll-gutter)`, the measurement reads the row gutter's rendered width; a border or padding mismatch would leave a small offset). Moves and resizes share `_tickAt()` and so shift with this fix; they still round to the nearest line by design.

### S2 — roll pane latches to the region, double press opens it, one more octave down

- `src/ui/arrangement.js:59-60` `DOUBLE_PRESS_MS`, `:598-600` the `open` listener set and `_lastPress`, `:1311-1319` `_noteRegionPress()`, `:1371-1374` the region `pointerdown`. Before: no `open` event; a press on the already-selected region emitted nothing. Now: two presses on one region inside 400 ms emit `open` with the region.
- `tools/daw.html:656-662` `rollOriginTick`, `ROLL_BASE_OCTAVE`, `ROLL_OCTAVES`; `:716-719` range set before mount; `:735-736` bars from the region; `:744-750` the `open` listener; `:752-763` the `regions.on('update')` handler. Before: the pitched roll never took its bar count from the region and stayed at 1 bar; origin was set once at load; range was C3 to B4. Now: bars follow `region.lengthBars` on load, resize and move; origin follows `startBar`; range is C2 to B4; `open` reloads the region, raises the pane, and sets zoom to 1.

Claim to break: after any select, double press, resize, move, or loop change, the roll's bar count equals the region's `lengthBars` (capped at 8) and its playhead lines up with the song. Most likely to fail: a region longer than 8 bars (`MAX_BARS` in `piano-roll.js` was left alone, so the roll shows the first 8 only); a region dragged to another lane of a different kind while open; a double press that is really a short drag (the press timer does not look at pointer travel).

Decisions that were the session agent's, not Brandon's: detecting the double press by timing two `pointerdown`s instead of the DOM `dblclick` event (the region elements are rebuilt on every `pointerup`, which makes `dblclick` unreliable; the alternative was a delegated `dblclick` on the row); applying the extra octave in `daw.html` only, not as the roll's default.

### S3 — piano roll sideways zoom

Brandon's ruling was two words: "wider boxes." Everything else here is the session agent's call.

- `src/surfaces/piano-roll.js:126-130` `ZOOM_MIN/MAX/STEP`, `:213-218` `clampZoom()`, `:630` `_zoom`, `:802-826` the `zoom` getter/setter and `_applyZoom()`, `:1136-1140` toolbar buttons (both variants), `:1209` zoom applied at build, `:1471-1476` readout and button states, `:1783-1784` toolbar actions.
- CSS in the same file: `:268` `--roll-zoom`; `:330-331` the body scrolls sideways; `:336-341` each stripe is `gutter + (100% - gutter) * zoom` wide; `:350-353` and `:418-421` both gutters are sticky-left with a background; `:355`, `:362`, `:371`, `:380-381` `min-width: 0` down the ruler so it cannot push wider than the field.
- `tools/daw.html:744-750`: a double press on a region sets zoom back to 1.

Before: no zoom; the field always filled the pane. Now: 100% to 800% in steps of 1.5x, the body scrolls sideways past 100%, the key strip and labels stay pinned, the view's centre is held across a zoom change.

Claim to break: at any zoom and scroll offset, a note, its ruler cell, its gridline, the playhead and the velocity bar sit on one vertical line, and a press lands in the box under the pointer. Most likely to fail: the ruler drifting from the field at high bar counts (the `min-width: 0` change is what holds it; before this the ruler's overflow was clipped, so any old misalignment was hidden); the sticky gutter's stacking against notes and the playhead (`z-index: var(--z-raise-2)`); a horizontal scrollbar appearing at 100%; `tools/desktop/dev-splash.html`, the only other page that mounts this roll, which was not opened.

Decisions that were the session agent's: buttons only, no wheel zoom; rows keep their height; double press resets zoom; the zoom lives in the roll itself, so it shows on every page with a roll. Alternative passed over: a zoom owned by `daw.html` alone.

Not checked: anything in a browser; touch scrolling on a Chromebook; whether a classic (non-overlay) scrollbar adds height to the roll body.

---

## Job 1 — voice shutoff

### What changed

**`src/core/audio.js`**

- `:192-210`: section 4a header and the new `weights` map. Before: a voice counted as one whole voice in `registry` from `register()` until `free()`. Now: each voice also has a weight entry `{ instrumentId, start, points }` in ctx seconds. It weighs 0 before `start`, 1 while held, and follows `points` (linear) down to 0 once it reports a fade.
- `:216-262`: `weightAt`, `countAt`, `gainFor`, `weightLists`, `synthVoiceCounts`. Before: `synthVoiceCounts()` counted registry entries. Now it sums weights at a time `t`. `gainFor(n)` is `n ** -exponent` for `n > 1`, else 1, so one voice or less never moves the gain.
- `:265-296`: `writeCurve()`. New. Rebuilds one channel's whole future gain curve from now: it pins the gain at now, and between breakpoints (voice starts and fade points) it writes linear pieces (8 per unit of count change, max 32). At a voice's start time the duck is a `setValueAtTime` step.
- `:299-321`: `renormalize()` / `queueRenormalize()`. Before: `renormalize(when)` wrote a duck with `setValueAtTime`, and a recovery with `setTargetAtTime`, `tau = max(1 ms, responseMs/1000)`, which is a step. Now it calls `writeCurve` for every normalizing channel. Changes made in one task are merged into a single rebuild through `queueMicrotask`.
- `:323-337`: `createVoiceOut(instrumentId, dest, atTime)`. Before: per-voice gain `n ** -exponent` with `n = 1 +` the whole-voice registry count right now. Now: `n = 1 +` the weighted count at the voice's own `atTime`. The third argument is new and optional; leave it out and it uses now.
- `:359`: one-line doc on `responseMs`: stored and reported only.
- `:378-379`: `readout()` doc. `voices` is now the weighted count, not a whole number.
- `:434-479`: `voicePool.register` adds the weight entry (start = `atTime`, never earlier than now). New `voicePool.fade(voice, startTime, endTime)`: the weight keeps its curve up to `startTime`, then falls linearly from its value there to 0 at `endTime`. If it fades out before it starts, the entry is dropped. `release(voice)` now drops the weight entry even when the registry entry is already gone (a stolen voice).
- `voicePool.steal()` (about `:500-525`): removed its `renormalize()` call. Steal still drops the registry entry at once for the governor (§11.2a unchanged). The weight entry stays until `free()`, so the stolen voice still weighs across its 5 ms fade.
- `dispose()` `:675`: also clears `weights`.

**`src/instruments/simple-synth.js`**

- `:153-156` `_gainAt`: before, it used the release branch whenever state was `'releasing'`. Now it uses it only for `t >= _releaseT0`, so a time before a scheduled release reads the attack/decay/sustain curve.
- `:222-223` `updateEnv` in release: before, it re-aimed from now even if the release was still in the future. Now it re-aims from `max(now, _releaseT0)`.
- `:227-241` `release()`: before, any call re-released the voice at the new time. Now an earlier time replaces a later scheduled release, and a later time is ignored. The time is clamped to now or later.
- `:243-251` `_anchor(t, value)`: new. It cancels from `t`. For a future `t` it ramps to `value` at `t` instead of stepping, so a decay ramp in flight is kept.
- `:261-263` `_scheduleRelease`: uses `_anchor`, and reports its fade with `voicePool.fade(this, _releaseT0, end)`.
- `:276-289` `steal()`: uses `_anchor`, clamps to now or later, and reports `fade(t0, t0 + 5 ms)`.
- `:444` `noteOn`: passes `t0` to `createVoiceOut`.
- `:476-477` `noteOff`: before, it released every voice of that pitch. Now it skips a voice that is already releasing.

**`src/instruments/overtone-synth.js`**

- `:192` `_gainAt`: same `t >= _releaseT0` guard.
- `:208-232` `_anchor` (new) and `release()`: before, `release()` returned early if the voice was already releasing. Now an earlier time replaces a later one, it anchors with a ramp for a future time, and it reports `fade`.
- `:251-253` `steal()`: uses `_anchor` and reports `fade(t, t + 5 ms)`.
- `:390` `noteOn`: before, a same-pitch retrigger stole the old voice at `ctx.currentTime`. Now it steals at the new note's start `t`.
- `:396`: passes `t` to `createVoiceOut`.
- `:432`: the cap-eviction steal used `ctx.currentTime`. Now it uses `t`.
- `:452` `allNotesOff()`: before, it skipped releasing voices. Now it calls `release(now)` on every voice; `release()` decides.

**`src/instruments/wave-synth.js`**

- `:191` `Env.valueAt`: same `t >= _releaseT0` guard.
- `:238-241` `Env.setShape` in release: re-aims from `max(now, _releaseT0)`.
- `:249-256` `Env.anchor(t, value)`: new, same as `_anchor` above.
- `:277` `Env._writeRelease`: uses `anchor`.
- `:571-595` `Voice.release` / `Voice.steal`: release gains the earlier-wins guard and `_releaseT0`, clamps to now, and reports `fade`. Steal uses `ampEnv.anchor`, sets the env to idle, and reports `fade`.
- `:880` `_makeVoice`: passes `t0` to `createVoiceOut`.
- `:918-920` `allNotesOff()`: before, it walked `_notes` only. A released group is deleted from `_notes`, so Stop never reached a note whose release was scheduled in the future. Now it clears `_notes` and calls `release(now)` on every voice in `_voices`.

### Faults from the brief, checked one by one

- Voice counted whole from schedule time to free: **real, fixed** (weights).
- Recovery is a 1 ms step: **real, fixed** (curve follows the fades).
- Per-voice gain fixed at birth from the whole count: **real, fixed** (weighted count at `atTime`). It is still fixed for the voice's life, as the brief says.
- simple-synth repeated pitch re-releases the old tail: **real, fixed**. Two guards: `noteOff` skips releasing voices, and `release()` makes the earlier time win.
- simple-synth Stop must still cut a future release: **holds**. Covered by the harness.
- overtone same-pitch steal at `currentTime`: **real, fixed**.
- overtone cap steal at `currentTime`: **real, fixed**.
- overtone Stop skipped pre-scheduled releases: **real, fixed**. Before the fix the harness shows the envelope still at 0.56 a release after Stop.
- wave-synth: steal times were already right. **Stop fault real, fixed** (`allNotesOff` walked `_notes` only). Its `release()` had the same no-guard re-release as simple-synth, but its `noteOff` deletes the group, so only Stop could hit it. Guarded anyway.
- `cancelScheduledValues` at a future time eats the decay ramp: **real in all three, fixed**. Before the fix the harness shows a 0.018 to 0.022 drop at noteOff on a 50 ms note with a 500 ms decay.

### Decisions that were mine, not Brandon's

- **Weight shape is linear in time across the fade.** The release ramps are linear in gain, so this matches amplitude. Passed over: weighting by loudness (dB).
- **Fades layer instead of replace.** A later fade report keeps the curve up to its start, then falls from wherever the weight is. Passed over: "latest call replaces". I built that first and the real-engine render caught it. When overtone stole a same-pitch voice whose release was already scheduled, its weight jumped back to 1 until the steal.
- **`noteOff` skips voices that are already releasing (simple-synth).** Passed over: comparing note start times, which breaks either zero-length notes or back-to-back notes on one pitch.
- **Rebuild the whole future curve on every change, merged per task by microtask.** Passed over: patching the curve one event at a time.
- **Curve pieces: 8 per unit of count change, max 32.** The error against the exact power curve is about 0.3% of gain at worst (about 0.03 dB).
- **`responseMs` is now dead.** The setter still takes the value and the Sound Lab slider still shows it, but it no longer shapes anything. I left the control rather than delete it, because removing Sound Lab UI is not in the brief. **Waiting on Brandon:** give it a new job or remove it.
- **I fixed the same "use time, not state" fault where I met it** in simple-synth `updateEnv` and wave-synth `Env.setShape`. Moving a release knob while a DAW release was scheduled used to start the fade early. Passed over: leaving it and listing it.
- Master limiter, one layer or two, and the exponent: **untouched**, defaults kept.

### How it was checked

**1. Node harness**: `docs/scratchpad/voice-shutoff/harness.mjs`. It runs the real `src/core/audio.js` and the three real synths against a fake AudioContext. The fake's AudioParams evaluate `setValueAtTime`, `linearRampToValueAtTime`, `setTargetAtTime` and `cancelScheduledValues` per the spec, on a simulated ctx clock and simulated `setTimeout`. A cancel freezes the already-played past, as a real engine does. Notes are scheduled the way `roll-scheduler.js` does it: noteOn and noteOff in one call, 80 ms ahead.

- Run: `node docs/scratchpad/voice-shutoff/harness.mjs` (working tree), `node docs/scratchpad/voice-shutoff/harness.mjs old` (HEAD copies under `docs/scratchpad/voice-shutoff/old/`, taken with `git show HEAD:...`; HEAD had none of this run's edits to these files).
- Output files: `docs/scratchpad/voice-shutoff/out-new.txt` = **51 pass, 0 fail**. `docs/scratchpad/voice-shutoff/out-old.txt` = **25 pass, 17 fail** (the old code fails the checks this run fixes).
- Scenarios, run per synth:
  1. An 8-note arpeggio at 125 ms, with a 300 ms release overlapping the next notes.
  2. A 3-note chord re-struck inside its own tails.
  3. Stop with releases scheduled 1.5 s in the future.
  4. A 50 ms note against a 500 ms decay.
  5. A repeated pitch with a 1 s release.
  6. Per-voice gain born beside a half-faded tail.
  7. Overtone only: a same-pitch steal of a releasing voice.
- Key numbers. Largest channel-gain rise inside any 2 ms window:
  - new: 0.0098 (arpeggio) and 0.0144 (chord) for every synth.
  - old: 0.368 (arpeggio) and 0.506 (chord), which is the slap-back step.
  - Instant rise is 0.0000 new. The weighted count returns to exactly 0 every time.
  - Per-voice birth gain 0.7230 = 1.5^-0.8, as specified.

**2. Real Chromium render**: `docs/scratchpad/voice-shutoff/render.html`, driven by `docs/scratchpad/voice-shutoff/render.mjs`.

- Run: `python3 -m http.server 8765` from the repo root, then `node docs/scratchpad/voice-shutoff/render.mjs`. Playwright comes from the local npx cache; it is not in the repo.
- What it does: `audio.js` gets an OfflineAudioContext. The synth's own sound is muted, and a constant 1 feeds the channel, so the rendered samples are the channel gain. Same arpeggio as scenario 1.
- Output: simple and wave rise at most 0.0098 per 2 ms and 0.0001 per sample. Overtone rises 0.046 per 2 ms inside a same-pitch steal fade (harness: 0.0460, a match). End gain is 1.0 for all three.

### Verified (by the runs above)

- No upward step in channel gain outside 5 ms steal fades, in the arpeggio and the re-struck chord, for all three synths. Shown in the emulator and in real Chromium.
- The weighted count returns to 0, and every voice is freed.
- Stop cuts a release scheduled in the future (all three).
- A short note keeps its decay ramp (all three).
- A repeated pitch does not push the old tail's release back (all three). Overtone no longer cuts the old voice before the new note starts.
- Per-voice gain at birth uses the weighted count (simple, wave).

### Inferred from reading, not run

- The DAW path: `roll-scheduler.js` calls these synths the way the harness does. I read it; I did not run the DAW.
- `drum-synth.js` also calls `createVoiceOut` and `voicePool.register` (with no `atTime`). Its voices still count whole until `free()`, as before. The brief said leave it. Whether its channel normalizes depends on the id `strip.js`/`shell.js` give it; I did not trace that.
- Sound Lab still loads and its controls still write the API. Not opened.

### Not checked

- **Whether it sounds right. Only Brandon's ears can say if the slap-back is gone and the arpeggios are clean.**
- Overtone birth gain: its Voice keeps no reference to its out node, so the harness skips that check.
- CPU cost of rebuilding curves on Chromebooks. A rebuild writes up to about 32 automation events per fading voice per channel.
- Mono legato in wave-synth under the DAW. Its noteOff deletes the group as soon as the off is scheduled, so overlapping DAW notes may not glide. That was true before this run too.

### Claim for the Redpen to try to break

If this is right, the channel gain never jumps upward, a voice's weight is 0 before its start, and a fade only lowers weight from where it stands.

Inputs most likely to show it wrong:
- Overtone same-pitch notes faster than the release while the transport is playing.
- Hitting Stop during a dense passage.
- Moving the release knob while notes are scheduled.
- Wave-synth at unison 4 (four registers per note, all merged into one rebuild).

### Weakest part

**Overtone same-pitch retrigger.** The new voice ducks at its start, then the stolen tail's 5 ms fade lets the gain climb back over 5 ms. That makes a small 5 ms dip (0.046 to 0.07 gain in 2 ms). It follows the brief's rule, "falling to nothing across its 5 ms steal fade", but it is the one place the gain still moves fast, and only ears can say if it matters.

### Callers and pages this reaches that I did not open

I did not read these. `tools/desktop/sound-lab.html`, `overtone-synth.html`, `wave-synth.html`, `harmony.html` and `tools/daw.html` were loaded headless in the job 4/5 load check with zero page errors. None of them was played. Sound Lab's sliders were not moved.

`src/ui/shell.js`, `src/mixer/strip.js`, `src/instruments/drum-synth.js`, and the mobile twins of the synth pages.

---

## Job 2 — 12-note keyboard labels

### What changed

**`src/surfaces/keyboard.js`**

- `:5-16`: `OVERLAYS` was `['none','letter','number','solfege']`; now `['sharp','flat','both','off']`. Added `DEFAULT_OVERLAY = 'sharp'`, `OVERLAY_ALIASES` (`letter` → `sharp`, `none` → `off`), `OVERLAY_TEXT` (button reads ♯ / ♭ / both / off), and `FLAT_LETTERS`. `PLACEHOLDER_LETTERS` is unchanged and still exported (sharps).
- `:63-79` `labelFor()`: before, only `letter` returned text; `number` and `solfege` returned nothing. Now `sharp` and `flat` return one name, `both` returns `C♯\nD♭` on a black key and the letter on a white key, and `off` returns nothing.
- `:181-185`: removed the `.cbdaw-kbd__seam` style. Added `.cbdaw-kbd__label` (`--ws-prewrap`, `--ta-center`, `--lh-tight`) so the two names stack.
- `:217`: default overlay is `DEFAULT_OVERLAY` (it was `'letter'`).
- `:226`, `:291`: `seam` dropped from `this.nodes`.
- `:250-252` overlay setter: maps the old values through `OVERLAY_ALIASES` before validating.
- `:391`: `_renderLabels()` now also writes the button text. Before, it wrote the "labels pending theory/scale.js (P3)" seam text. That is gone, and so is its `<span>` (`:410-416`).
- `:429` `_renderReadouts()`: the button shows `OVERLAY_TEXT`, not the raw value.

### Callers checked

- `PLACEHOLDER_LETTERS`: imported by `src/ui/shell.js:44` and `src/ui/daw-shell.js:29`. Unchanged, so nothing to fix.
- `OVERLAYS`: nobody imports it from keyboard.js.
- Nothing in `src/` or `tools/` sets `.overlay` on a Keyboard (grep). No CSS keys off the keyboard's `data-overlay`. The alias map only covers a future caller using the old words.

### How it was checked

- Script: `docs/scratchpad/tool-fixes/keyboard-labels.mjs`. Run `python3 -m http.server 8765` from the repo root, then `node docs/scratchpad/tool-fixes/keyboard-labels.mjs`.
- It clicks the button four times on `tools/desktop/simple-synth.html`, `tools/mobile/simple-synth.html` and `tools/desktop/patch-synth.html`.
- Output, all three pages: ♯ (C, C♯, A♯) → ♭ (C, D♭, B♭) → both (`C♯\nD♭`, `A♯\nB♭`, white keys a single letter) → off (all empty) → back to ♯. The seam element is absent and there are no page errors.
- Screenshot of "both": `docs/scratchpad/tool-fixes/keyboard-both.png`.

### Verified

- The four stops, their order, the default ♯, the black-key stacking, and that the seam is gone, on the three pages above.

### Inferred, not run

- `tools/daw.html`'s floating surface panel and `src/ui/arrangement.js` lanes use the same class, so they get the same selector. Not opened past page load.
- `dev-splash.html` mounts the keyboard only after a click; the load check found none mounted.

### Not checked

- Projector legibility of the stacked names on a compact (DAW) keyboard, where the font is `--fs-xs`.

### Decisions that were mine

- Internal values `sharp/flat/both/off`, with the button showing the glyphs. Passed over: storing the glyph itself as the value.
- The old values map forward (`letter` → ♯, `none` → off) instead of being refused.
- "both" stacks sharp over flat. Passed over: flat over sharp, or "C♯/D♭" on one line.
- The button's `aria-label` is "key labels".

### Claim for the Redpen to try to break

Every page that mounts `Keyboard` shows ♯ at load, and the button cycles ♯ → ♭ → both → off with nothing blank except off. Most likely to break: a compact keyboard in the DAW, where the black keys are narrow.

### Weakest part

Fitting the stacked names on narrow black keys in the compact variant. I saw the expanded view only.

---

## Job 3 — patch synth controllers

### Design ownership

The design is the session agent's, not Brandon's. He did not answer the two questions:
- Controllers are show/hide toggles, not wired boxes.
- The keyboard is on by default and the circle off.
- The page hands the instrument the list.

### What changed

**`src/instruments/patch-synth.js`**

- `:691-692` CSS: `.ps-add[aria-pressed=false]` dim, `[aria-pressed=true]` border `--node-selected`. These match only the controller buttons, which are the only `.ps-add` with `aria-pressed`.
- `:978-980` constructor: `_controllers = []` and `_controllersOpen = true`. Neither is part of `getState()`.
- `:1031-1042` new `setControllers(entries)`: stores `{id, label, active, onToggle}` and repaints. The instrument never imports a surface.
- `:1490-1494` `_paintPalette`: paints the Controllers group first, only when the list is not empty.
- `:1526-1561` new `_paintControllers()`: a group head that collapses like the others; one `.ps-add` per entry with `data-controller` and `aria-pressed`. A click flips `active`, updates the button in both views, and calls `onToggle(active)`.
- `:2004` `_drawRefusal`: the query was `.ps-add`; now it is `.ps-add[data-kind]`. Without this, a port refusal (`where.kind` undefined) matched the controller buttons (`dataset.kind` undefined) and painted them as refused.

**`tools/desktop/patch-synth.html`** (mobile twin identical, see below)

- `:20-21`: ASSEMBLES comment names `scale-circle.js` and `state.js`.
- `:65-66`: `.pt-page .cbdaw-panel[hidden] { display: var(--disp-none); }`.
- `:103-104`: imports `ScaleCircle` and `state`.
- `:157-158`: `this.circle`, `this.panels`.
- `:217-218`: new step 1 in the patch panel's instructions: "Pick what you play. Controllers shows or hides the 12-note keyboard and the harmony circle below the patch." The old group sentence is now step 2.
- `:246`, `:251-263`: keyboard panel kept in `this.panels.keys`; a new "Harmony Circle" panel, hidden at load. Its note says the patch is monophonic, so a chord sounds one note.
- `:274-279`: `setControllers([{keyboard, active: true}, {circle 'Harmony Circle', active: false}])` after mount.
- `:292-312`: `_showKeys(on)` / `_showCircle(on)`. Hidden means unmounted, so a hidden keyboard holds no notes and hears no home-row keys. The circle is built on first show as `new ScaleCircle(host, input, state)`.
- `:362` `dispose()`: disposes the circle.

**`tools/mobile/patch-synth.html`**: the same edits. I applied them in one batch: `git apply -C1` of the desktop diff, saved at `docs/scratchpad/tool-fixes/patch-synth-twin.diff`. Afterwards `diff` of the twins shows only the lines that already differed (header, layout comment, padding, canvas height, `LAYOUT`).

### How it was checked

- Script: `docs/scratchpad/tool-fixes/patch-controllers.mjs`, run the same way as the others. Both twins.
- At load: palette heads are Controllers, Sources, Modulators, Processors, Math. Buttons Keyboard:true and Harmony Circle:false. Keyboard panel shown, circle hidden.
- Click Harmony Circle: the panel shows and `.cbdaw-circle` mounts. A pointerdown on a circle zone made the synth hold note 67.
- Click Keyboard: the panel hides and `.cbdaw-kbd` is removed. Click again: it is back.
- A `mountCompact()` with no controllers handed in paints no Controllers group.
- `dispose()` reports the circle torn down. Zero page errors.
- Screenshot: `docs/scratchpad/tool-fixes/patch-controllers.png`.

### Verified

- Everything in the list above, on both twins.

### Inferred, not run

- The DAW's compact patch-synth view gets no Controllers group, because `daw-shell.js` never calls `setControllers`. Shown in isolation, not in the DAW.

### Not checked

- **Hearing the circle drive the patch.** Pressing a circle zone set the held note, but no patch was wired to Out, so nothing sounded.
- **A circle chord on the mono patch.** Reported as the brief says, not worked around: an outer-ring chord sends several noteOns and the last one wins, so one note sounds.

### Found, not fixed

- `src/ui/shell.js:668` builds every switcher surface as `new descriptor.Ctor(host, input)`, two arguments. `ScaleCircle`'s constructor throws without a store (`scale-circle.js:392-394`). The comment at `shell.js:125-127` says the third argument "defaults to the shared one", which is not what the constructor does. Picking the circle in a synth page's surface switcher may throw. I did not open that path in a browser. This page passes `state`, so it is not affected.

### Decisions that were mine

- Controllers group placed first, not last after Math.
- Labels "Keyboard" and "Harmony Circle" (Brandon's word), not "Scale Circle" (the code's fallback label).
- The panel title "Harmony Circle" and its monophonic note.
- Hidden means unmounted. Passed over: CSS-hidden but still live, where the home row would keep playing while the keyboard is hidden.
- The Controllers open state is not saved in `getState()`.

### Claim for the Redpen to try to break

On both patch-synth pages, Controllers toggles each panel, the hidden keyboard plays nothing from the home row, and nothing else on the page changes. Most likely to break: toggling the keyboard off while a key is held, then on again.

### Weakest part

`setControllers()` and each `_controllersOpen` toggle repaint the whole patch canvas, as group toggles already do. With a big patch, a click redraws every node.

---

## Job 4 — step grid triplets

### What changed

**`src/surfaces/step-grid.js`**

- `:326` (removed `:327-338`): the `.cbdaw-grid__row-label button` styles. Their only button is gone.
- `:882-891` (`_renderLane`): before, each lane row had a `data-lane-act="division"` button reading `16`/`T`, with a click listener and per-render text. All three are removed. Row labels hold just the name.
- `:584`, `:592`: `setPattern()` and `resetPattern()` call `_syncRulerToLanes()`.
- `:636-639` `setLaneDivision`: syncs the toolbar after a change.
- `:648-659` `setDivisionAll`: syncs the toolbar. New `get triplet()` is true only when every lane is division 3. New `_syncRulerToLanes()` sets the ruler to triplet when `triplet` is true, else straight.
- `:951` `_syncToolbarReadouts`: the Triplet button's `aria-pressed` reads `this.triplet`. Before, it read `_rulerDivision`.
- `:1037` toolbar click: `setDivisionAll(this.triplet ? straight : triplet)`.
- The pattern keeps its per-lane `division` field. `setLaneDivision()` is still public; no file outside step-grid.js calls it (grep).

**A fault found on the way.** Before this change, clicking Triplet changed the lanes but never re-synced the button, so its pressed look did not update until something else re-rendered the toolbar. The added `_syncToolbarReadouts()` calls fix that.

### Mixed divisions (asked for in the brief)

My decision: the toggle shows **on only when every lane is triplet**, otherwise off, and the ruler follows the toggle. Clicking from a mixed state sets every lane to triplet. Passed over: showing `aria-pressed="mixed"`, or deciding by majority.

### How it was checked

- Script: `docs/scratchpad/tool-fixes/beat-grid.mjs`, on both beat twins.
- Load: zero lane buttons, toggle false, divisions `44444444`, ruler 4, 16 cells in lane 0.
- Click: toggle true, `33333333`, ruler 3, 12 cells. Click again: back to straight.
- `setPattern` with lane 2 at 3: toggle false, ruler 4. Click: all 3, toggle true.
- Zero page errors.
- `tools/daw.html` and `tools/desktop/dev-splash.html` load with zero errors. Neither mounts a grid until clicked, so neither showed a grid in this check.
- Screenshot: `docs/scratchpad/tool-fixes/beat-before-clear.png`.

### Verified

- Both beat pages, as above.

### Inferred, not run

- The DAW region pane and dev-splash get the same toolbar. Same class, compact variant included: the Triplet button is in the toolbar markup for both variants (`_build`).

### Not checked

- The DAW pane after loading a saved region with mixed lanes. The rule above applies there, but I did not run it.

### Claim for the Redpen to try to break

No lane row has a division button anywhere. Triplet is off at load, it is on only when every lane is triplet, and the pattern data still carries per-lane divisions. Most likely to break: recording into the DAW pane while triplet is on, because `capture.js` calls `setPattern` on every note and that now re-syncs the ruler.

### Weakest part

`setPattern()` now resets the ruler every time it runs, and `capture.js` runs it on every live-projected note. If a page ever sets the ruler apart from the lanes, a recording undoes that.

---

## Job 5 — beat tool clear button

### What changed

`tools/desktop/beat.html:297-308` and `tools/mobile/beat.html:290-301`: a "Clear" button (`bt-btn bt-btn--small`, title "Turn every step off") in the Step grid panel head. On click it takes `getPattern()`, sets every step in every lane to null, and calls `setPattern()`. The listener is in the page's `listenerBag`, so `dispose()` drops it.

### Undo

The beat tool has no undo path (grep of both twins: no undo, redo or history), so none was built.

### Decisions that were mine

- Clear keeps the bar count and every lane's division. Passed over: `resetPattern(bars)`, which the brief pointed at. It also returns every lane to straight, so Clear would have switched triplets off.
- Placed in the Step grid panel head. Passed over: the transport bar.
- No confirm prompt.

### How it was checked

- Same script, `beat-grid.mjs`, both twins.
- Two cells tapped on and bars raised to 2, with triplet on: 2 steps on, 2 cells lit.
- After Clear: 0 steps, 0 cells lit, bars still 2, divisions still `33333333`, toggle still true.
- Zero page errors.

### Verified

- As above, both twins.

### Not checked

- Clear while the transport is playing. It only rewrites data; the grid's tick reads the pattern on the next pass.

### Claim for the Redpen to try to break

Clear turns off every step and nothing else changes. Most likely to break: Clear right after a velocity drag that has not finished.

### Weakest part

There is no undo, so a mis-click loses the pattern. That is the brief's rule; I am naming it.

---

## Scratch and harness files (all mine, this run)

- `docs/scratchpad/voice-shutoff/harness.mjs`, `out-new.txt`, `out-old.txt`
- `docs/scratchpad/voice-shutoff/old/`: HEAD copies of `core/audio.js`, the three synths, `ui/knob.js`
- `docs/scratchpad/voice-shutoff/render.html`, `render.mjs`
- `docs/scratchpad/tool-fixes/keyboard-labels.mjs`, `keyboard-both.png`
- `docs/scratchpad/tool-fixes/patch-controllers.mjs`, `patch-controllers.png`, `patch-synth-twin.diff`
- `docs/scratchpad/tool-fixes/beat-grid.mjs`, `beat-before-clear.png`

The browser scripts import Playwright from `/Users/moth3rship/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs` and need `python3 -m http.server 8765` running from the repo root.

## Review for the Closer

**Done:**
- All five jobs.
- `INDEX.md`: one new entry at the top of DOCS.
- `SESSIONLOG.md`: one entry appended.

**Not touched:** `MEMORY.md`, any `CLAUDE.md`, the worklog, `~/.claude`, and the three session-agent edits. No commits.

**Waiting on Brandon:**
1. Listen to the DAW arpeggios and the Sound Lab chord run for the slap-back. No agent can hear it.
2. What `responseMs` should be now that it shapes nothing: a new job, or remove the slider.
3. Whether the overtone same-pitch 5 ms dip is audible.
4. Whether the session agent's Controllers design stands (show/hide, keyboard on, circle off).

**Seen and left alone (outside the brief):**
- `shell.js:668` builds `ScaleCircle` without a store, and the constructor throws (job 3).
- `drum-synth` voices still count whole until `free()` (job 1).
- In wave-synth, mono legato in the DAW deletes the group when the off is scheduled (job 1).
- In wave-synth, `Env.setShape` during a release does not re-arm the voice's free timer, so a longer release set mid-tail may be cut at the old end. I read this from `Env` alone; I did not read `Voice.applyPatch`, so this is unconfirmed.
- `Env.cancel()` in wave-synth is now unused.

**Lesson.** The first fade design, "latest report replaces", passed my own Node harness. The real-engine render caught it, and I changed to fades that layer.

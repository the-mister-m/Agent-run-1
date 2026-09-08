SESSION REVIEW — Sound Lab — 2026-09-08

EDITS
- [tools/desktop/sound-lab.html](../../tools/desktop/sound-lab.html) — new dev page, instrument picker, LAYER radio, LIMITER toggle, EXPONENT/RESPONSE sliders, CHORD RUN + HELD CHORD/RELEASE, keyboard, meter, live readout, state line
- [src/core/audio.js](../../src/core/audio.js) — additive: `normState.voiceLayer` (default true) + `synthVoiceNorm.voiceLayer` getter/setter; §4b `setMasterLimiter(on)` / `getMasterLimiter()`; `dispose()` now also disconnects the limiter node if present
- [desktop.html](../../desktop.html) — Dev nav gained the sound-lab link
- [INDEX.md](../../INDEX.md) — audio.js line extended, new sound-lab.html line, desktop.html line extended
- [SESSIONLOG.md](../../SESSIONLOG.md) — new SESSION INDEX line

STRAY FILES
- [docs/scratchpad/sound-lab/audio.mjs](../scratchpad/sound-lab/audio.mjs) — audio.js copy used for `node --check`
- [docs/scratchpad/sound-lab/sound-lab-script.mjs](../scratchpad/sound-lab/sound-lab-script.mjs) — extracted `<script type="module">` block used for `node --check`

GOALS DONE
- Instrument picker disposes old instrument + channel, builds new one on `createChannel(Instrument.id)`
- LAYER radio drives `synthVoiceNorm.mode` + new `voiceLayer` across all four regimes
- LIMITER toggle via new `setMasterLimiter`, meter reads post-limiter when on
- EXPONENT (0.3–1.0) and RESPONSE sliders live through `synthVoiceNorm`
- CHORD RUN: four 8-note chords back to back, one beat each at 120bpm, scheduled off `ctx.currentTime`, no `setTimeout`
- HELD CHORD / RELEASE pair for hearing the release tail
- One `Keyboard` mount covers both the on-screen key row and the QWERTY home row
- `vis/meter.js` mounted on `masterAnalyser`; live rAF readout (voice count, channel gain, exponent, limiter reduction); one-line control-state readout at the bottom
- All spacing/size/color from `src/ui/tokens.css`, no bare numbers, no new token needed
- `node --check` clean on the audio.js copy and the extracted module script
- `curl` 200 on `tools/desktop/sound-lab.html` and `desktop.html`
- Headless Playwright load (Wayfinder's install): zero pageerrors, zero console errors

BRANDON'S TODOS
- Drive the page, rule SPEC-sound.md §3: limiter yes/no, one layer, exponent by ear
- Confirm the meter reads post-limiter correctly when toggled on
- Sign or reject the chord voicings (root-based 8-note stacks, I-IV-V-I) as a fair test of clipping/pumping

CLOSER REVIEW
- Fold Brandon's §3 ruling into `docs/mapdocs/SPEC-sound.md` and audio.js:196's default exponent once heard — closer
- Confirm whether the two scratchpad .mjs files should stay or be swept — closer

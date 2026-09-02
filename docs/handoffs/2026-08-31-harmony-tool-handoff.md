# HANDOFF — HARMONY TOOL — 2026-08-31

## BRANDON'S WORDS — VERBATIM, HONOR THESE

**Voicing — the standing ruling, 2026-08-31:**
> "NO bass note, chords voiced mid range so that the bottom voice can be any
> note and the chord isn't muddy. I've said this 5 fucking times."

**Voicing — the mechanism, 2026-08-31:**
> "give me a knob in harmony to adjust what octave I want the lowest note to be
> in. Everything else will be voiced on top of that based off how the chips are
> moved."

**Voicing — superseded, 2026-08-24. Do not build to this:**
> "only one note played for each note in the chord, whatever the inversion is
> put that note in the bottom, voice the chord in the middle to accommodate"

**Who does it:**
> "You and I are going to take care of these voicings ourselves."

**The file:**
> "I changed the name to harmonyNEW"
> "old harmony tool is in an archive now."

**Why the tool answers its own questions:**
> "when we go into the harmony tool we'll find that answer. it's why I put it
> together."

**Chord labels, done:**
> "I went back last night with an agent and completed the chord labels for the
> harmony engine"

**Colour — chord qualities only:**
> "I want to get rid of all colors"

**Colour — the direction:**
> "dude, I almost don't want any colors... I'd rather have shades or counters
> (either that, or a way to put the color scheme in and have them change so that
> colorblind isn't an issue, the shading and brightness does the work)"

**Contracts:**
> "If the code will work, fuck the contract. Be sure the code will work"

**The DAW's shared state:**
> "The DAW shares a scale, meter, and tempo"

**Synth voice normalization — scope:**
> "oh shiiit don't have it do it to the drums"

**Decisions Brandon can see become knobs:**
> "give me toggles in the dev bar"

---

## WHAT THE AGENT SHOULD BE AWARE OF

**The file**
- `tools/harmonyNEW.html` is the live page. `harmony.html` does not exist.
- `src/ui/shell.js:64` still points at `harmony.html`. The Harmony menu link is
  dead in every tool right now.
- `Builddocs/skinspecs/sweep.py:30` also lists the dead filename.

**Voicing, current state**
- `voicing()`, `invert()`, `spread()` in `src/theory/chord.js` are still
  root-position. `invert()` still rotates the bass up. Untouched since 08-24.
- `bassOf` / `bassIndex` exist in `chord.js`. Under the standing ruling they go
  away, not move.
- CONTRACTS §15.9's "Root position" / "Rotating the bass" prose was deleted
  outright on 08-31. No replacement was written.
- CONTRACTS A10 still carries slash-label bass framing built on the superseded
  premise.

**Chips**
- Comp Builder. Root Positions on top, chips drag down into Comp Positions
  squares. That is where re-voicing by hand happens.
- The octave knob sets the floor. Chips stack from there.

**Colour**
- All seven `--deg-*` tokens in `src/ui/tokens.css:17-23` are `#93a1b8`.
- `validate-skin.js` hard-fails major vs. minor below ΔE 15 after colourblind
  simulation. Seven identical values is a gap of zero.
- The distance function counts lightness. A gap of 0.15 OKLab L clears the gate
  with no hue at all. Written up in `Builddocs/skinspecs/S4-degree-shading.md`.
- `--deg-flat5` and `--deg-sharp5` were added 08-30 and no validator has ever
  checked them.

**Hazards**
- `src/instruments/chord-module.js:1624` holds literal NUL bytes. Plain `grep`
  treats the file as binary and silently returns nothing. Use `grep -a`.
- `docs/scratchpad/nest-proof.html` has never been run in a browser.
- `src/surfaces/keyboard.js`'s 08-31 QWERTY relayout was never test-run.
  Offered twice, declined twice.
- `src/surfaces/diatonic-keys.js` has not been seen on screen since its colours
  went uniform.

**Live elsewhere**
- Synth voice normalization is designed, not built:
  `docs/reports/2026-08-31-synth-voice-normalization-design.md`. Three synths —
  Wave, Overtone, Chord Module. Drums out.
- That design touches `src/instruments/chord-module.js`. Harmony work may
  collide with it.

---

## JUDGEMENT — CUT THIS SECTION IF IT IS WRONG

Written by the session agent, not by Brandon. Everything above this line is his
words or a measured fact. Everything below is not.

- The knob makes voicing a mechanical job. Lowest note is the knob value, chips
  stack upward, nothing is left to interpret. That is why it reads as a tight
  spec rather than a design problem.
- The three prior voicing rulings never landed because each seat treated it as
  a patch to `invert()`. The ruling is a redesign of `voicing()`. A seat that
  opens `invert()` first has already gone wrong.
- The colour work and the voicing work are independent. Neither blocks the
  other.
- Sweeping skin tokens through the harmony surfaces at the same time as editing
  harmony logic will collide. Same files.

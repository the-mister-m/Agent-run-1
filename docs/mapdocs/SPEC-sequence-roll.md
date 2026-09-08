# SPEC — SEQUENCE ROLL: THE DRUM MACHINE ON THE TIMELINE

Written 2026-09-08 — session agent (Fable), from greps of daw.html :644–692 and :720–734,
roll-scheduler.js :27–47, step-grid.js `_onTick` :991–1013, `bindInstrument` :472,
`_rafLoop` :604, arrangement.js `_openRegion` :1361–1367. Brandon asked 2026-09-08:
"drum machine is the piano roll but the step sequencer, and shows the timeline instead of
just the 4-bar loop." Gate: Brandon rules §3.

## 1 · WHAT EXISTS

**The roll pane.** daw.html's bottom pane `#dwn-pane-roll` (:314) follows the
arrangement's selected region (:421, :689). `showRegion` builds one `PianoRoll` (:678),
places it on the song with `setOriginTick((startBar − 1) × ticksPerBar())` (:681), loads
the region's notes (:682), binds the track's bus for the key strip (:685). `flushRoll`
(:652) writes notes back on every `pointerup` anywhere (:692) and on region change (:671).
The roll's playhead subtracts the origin before wrapping, so it walks the region's own
bars while the song plays.

**A drum region gets none of that.** `showRegion` builds a PianoRoll for every kind.
A pattern object goes into `setNotes` and the roll shows nothing useful. The only way
into a drum region is the arrangement's own floating editor (`_openRegion` :1361, a bare
`new StepGrid()`), and the double-click that opens it is broken (L6 receipt, FOUND #2).

**A drum region never plays from the timeline.** roll-scheduler.js:35 skips pattern
objects. Step-grid's `_onTick` (:991) plays only when an instrument is bound (:992), and
cycles `pattern.bars` from tick 0 forever (:993, :1003) — the standalone beat page's
behavior. In the DAW nothing binds an instrument to a region's grid, so a drum lane with
regions on it is silent in playback.

**Two clocks in one grid.** step-grid.js keeps its scheduler (`_onTick`) and its visual
(`_rafLoop`, :604) side by side. The visual reads `clock.positionTicks` and wraps it on
`bars × ticksPerBar` off tick 0. There is no origin.

## 2 · THE CHANGE

### 2a · The grid learns where it sits

step-grid.js gains `setOriginTick(tick)` and `_originTick = 0`, the same seam piano-roll.js
has (:575, :836). `_rafLoop` subtracts the origin before the wrap. Origin 0 leaves
beat.html untouched. The ruler under the grid shows song bar numbers
`startBar … startBar + bars − 1`, not `1 … bars`, when origin > 0.

### 2b · One scheduler for both kinds

roll-scheduler.js drops the `Array.isArray` skip (:35). For a pattern object it runs the
step-grid `_onTick` math against the region: for each lane, `tps = ticksPerStep(division)`,
for each step index `i` with a step on, `at = offset + i × tps`; if `at < offset +
lengthBars × barTicks` and `inWindow(at)`, `instrument.noteOn(piece.note, velocity,
timeOf(at))`. `piece` comes from `instrument.constructor.pieces[lane.piece]` — the same
lookup step-grid's `_pieceFor` does. Move `ticksPerStep` and the piece lookup into a small
export so both files share one copy. Loop rule from
[SPEC-region-loop-figures.md](SPEC-region-loop-figures.md) §2a applies with
`cycle = pattern.bars × barTicks`.

A grid mounted in the DAW is never bound to an instrument. Its `_onTick` returns on the
first line (:992). The scheduler is the only thing that plays a drum region in the DAW.
beat.html still binds and still self-plays. Two paths, one file, no double-fire.

### 2c · The pane switches on kind

daw.html `showRegion`: read the lane's track kind (`tracks.get(region.laneId).kind`). If
`'drum'`, the pane holds a `StepGrid` instead of a `PianoRoll`: `setOriginTick`,
`setPattern(region.notes)`, `bars = region.lengthBars`. If `'pitched'`, today's path.
Switching kinds disposes the old surface and builds the other; the pane keeps one surface
at a time. `flushRoll` writes back `getPattern()` for a grid, `getNotes()` for a roll.

The grid's pads stay playable by mouse through the track's bus, the way the roll's key
strip is: `grid.setBus(bus)`, source id `'mouse'`, never arm-gated. If step-grid has no
bus seam, add one mirroring piano-roll's `setBus` (:790).

Pattern length follows the region. When the region is dragged longer, `bars` grows and
the grid pads with empty steps (step-grid's own resize rule, :179–186). Shorter keeps what
fits. `pattern.bars` and `region.lengthBars` are the same number in the DAW.

### 2d · The floating editor goes

With the pane doing the job for both kinds, arrangement.js `_openRegion` and
`_closeEditor` (:1355–1385) and the `'open'` subscription (:603) are dead weight and one
of them is broken. Delete them and the `dblclick` emit in `_renderLaneRegions` (:1214).
Double-click on a region selects it, which the pane already follows. `_commitToRegion`
(L6, §3) loses its "editor open" branch — every take lands under the playhead.

## 3 · RULED — Brandon, 2026-09-08

- **a. Delete the floating region editor.** §2d as written. The per-track floating
  PANEL with its playing surface (daw.html ≈:485, `laneSurfaces: false` path) is a
  different thing and STAYS — that's where the keyboard surface lives.
- **b. Eight pieces always.** All eight rows in the pane regardless of kit.
- **c. Same as melodic.** Steps past the pattern, or past `lengthBars`, don't play. They
  still exist. They draw dimmed in the pane and in the block figure, the way
  [SPEC-region-loop-figures.md](SPEC-region-loop-figures.md) §3e dims roll notes. Logic's
  rule: the region is a window onto the content.
- **d. Test it.** Brandon's words: "test test test test it." The checklist in §4 is the
  floor. The agent drives every row in Playwright, headed, screenshots each, and adds
  rows for anything it finds. Counts and pictures in the receipt.

## 4 · CHECKLIST — Brandon driving, agent scribing

- [ ] Drum track, two-bar region at bar 3: pane shows a grid with ruler 3, 4
- [ ] Steps placed in the pane play back at bars 3–4, silent at 1–2 and 5+
- [ ] Two drum regions on one lane play their own patterns, no bleed
- [ ] Drag the region to four bars: grid grows to four, old steps keep their place
- [ ] Pads click-play through the track's instrument, unarmed
- [ ] Pitched region selected after a drum one: pane swaps to the roll, no leak
- [ ] beat.html unchanged: plays from tick 0, loops its bars
- [ ] Playhead in the pane walks the region's bars in time with the song
- [ ] Zero console errors across the above

## 5 · THE JOB

Opus — ≈160k. Files: step-grid.js (origin, ruler labels, bus seam, one shared export),
roll-scheduler.js (the pattern branch), daw.html (`showRegion`, `flushRoll`),
arrangement.js (deletions only if §3a is delete). Blast radius: step-grid.js is
beat.html's whole surface — every change is additive with origin 0 as the no-op. Drift
risk medium: the pull is to rewrite the grid. Gap risk medium: `ticksPerStep` rounding at
odd divisions is untested on the timeline; the checklist's two-region test catches bleed.

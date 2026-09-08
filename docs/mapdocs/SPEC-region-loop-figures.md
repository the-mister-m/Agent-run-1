# SPEC — REGION LOOP + NOTE FIGURES

Written 2026-09-08 — session agent (Fable), from greps of regions.js, roll-scheduler.js,
arrangement.js `_renderLaneRegions` :1184–1222, step-grid.js `_onTick` :991–1013.
Two features, one job. Brandon asked for both 2026-09-08. Gate: Brandon rules §3.

## 1 · WHAT EXISTS

A region is `{ id, laneId, startBar, lengthBars, name, color, notes, muted }`
(regions.js:177–192). `notes` is opaque: a piano roll's note array `[{tick, length, note,
velocity}]` or a step grid's pattern `{bars, lanes[]}`. The store never reads inside it.

Playback, melodic: roll-scheduler.js:32–47 walks every unmuted array-notes region, adds
`(startBar − 1) × ticksPerBar` to each note's region-local tick, fires noteOn/noteOff for
ticks in the pass window. A note past the region's end still plays. Nothing repeats.

Playback, drum: roll-scheduler skips pattern objects (:35). Nothing on the song timeline
plays a drum region. Step-grid's own `_onTick` cycles `pattern.bars` forever off tick 0
(:993, :1003) — only when a grid is mounted with an instrument bound. See
[SPEC-sequence-roll.md](SPEC-sequence-roll.md) for that gap; this spec does not touch it.

Drawing: `_renderLaneRegions` :1184 rebuilds every region element on a lane from scratch —
a `div.cbdaw-arr__region` with a label and two edge grips. Width is `lengthBars × BAR_W`.
Nothing inside the block shows what the region holds.

## 2 · THE CHANGE

### 2a · Loop

Store: `add()` gains `loop = false` and `loopBars = null`. New method
`setLoop(id, { on, loopBars })`. When `on` flips true and `loopBars` is null, `loopBars`
is set to the region's `lengthBars` at that moment. Emits `'change'` like `setNotes`.
`loopBars` is clamped `[1, lengthBars]`. `move()` and edge-drag that shrink `lengthBars`
below `loopBars` clamp `loopBars` down; growing never changes it.

Scheduler, melodic (roll-scheduler.js:37–46): when `region.loop`, the cycle is
`loopBars × barTicks`. For each note, fire at `offset + n.tick + k × cycle` for every
`k ≥ 0` while that tick is `< offset + lengthBars × barTicks`. Notes with `n.tick ≥ cycle`
never fire. Loop off is today's path, unchanged.

Scheduler, drum: the same rule applies to pattern regions once
[SPEC-sequence-roll.md](SPEC-sequence-roll.md) §2b lands. `pattern.bars` is the natural
`loopBars`; `setLoop` on a pattern region defaults `loopBars` to `pattern.bars`, not
`lengthBars`.

Drawing (`_renderLaneRegions`): a `button.cbdaw-arr__region-loop` in the block's top-right
corner, glyph `⟳`, `data-on`. `pointerdown` stops propagation so it never starts a block
drag. `click` calls `setLoop(id, { on: !r.loop })`. When on, a faint vertical line at every
`loopBars` boundary inside the block (`div.cbdaw-arr__region-cycle`, one per repeat after
the first). Colors from tokens: the line reuses `--line`, the glyph on-state reuses the
ARM dot's on-color.

### 2b · Note figures

Drawing only. No store change. Inside every region block, under the label, a
`div.cbdaw-arr__region-figure` that fills the block. Its children:

- Array notes: one `div.cbdaw-arr__region-note` per note. `left` = `n.tick /
  (lengthBars × barTicks) × 100%`, `width` = `n.length / (lengthBars × barTicks) × 100%`,
  minimum one token width. Vertical: the region's notes are ranged min→max pitch; a note
  sits at `(max − n.note) / (max − min + 1) × 100%` from the top, one token tall. One note
  in the region sits at the vertical middle.
- Pattern object: one row per lane that has any step on, rows stacked top to bottom in
  lane order, one `div.cbdaw-arr__region-step` per on-step, `left` = `stepIndex /
  steps.length × 100%`, width one token.
- When `loop` is on, figures draw the first `loopBars` and repeat across the block,
  clipped at the block's end. Draw the repeats — a loop reads as a loop.

Figures are `pointer-events: none`. They never catch a click. The label sits above them
(`z` token). Figure block height and note height are two new tokens on the SP scale if no
existing step fits; the agent names which existing step it used or which it added.

## 3 · RULED — Brandon, 2026-09-08

- **a. Glyph.** `⟳`. Add one line to Glyph and Color Rules.md.
- **b. The loop handle loops. Everything else resizes.** Pointerdown on the `⟳` button
  and drag right: the region grows in whole cycles for as long as the drag runs, `loop`
  goes true, `loopBars` is the region's length at the moment the drag started. Drag left
  shrinks by whole cycles, never below one cycle. Release ends it. A plain click toggles
  `loop` without changing length. The loop handle does nothing on a region with no notes
  (empty array or a pattern with no step on) — a blank region cannot loop.
  Dragging the region anywhere else is today's behavior: the body moves it, the edge grips
  resize it, `loopBars` untouched. Shrinking a region below its content hides the notes
  past the new end; they stay in `notes`, they draw dark (§3e), they don't play. Growing
  a non-looped region adds silent bars. Growing a looped region by its end grip adds
  silent bars past the last full cycle; the loop handle is the only way to add cycles.
- **c. Figures on every region, always.** Capped by one global setting, `figureCap`, on
  `state.project` (default 96). A region with more notes than the cap draws every Nth
  note so the count lands under the cap. Pattern regions cap the same way per lane.
- **d. FIGURES button in every roll and grid pane.** daw.html's bottom pane toolbar gets
  one button labeled `FIGURES <n>` that cycles `figureCap` through 24 → 48 → 96 → ALL →
  24. One setting for every region. Every lane redraws its figures on the change. The
  sequence-roll job ([SPEC-sequence-roll.md](SPEC-sequence-roll.md)) keeps the same
  button when the pane holds a grid.
- **e. Dimming.** Notes past `loopBars` on a looped region, and notes past `lengthBars`
  on any region, draw at a dim token (`--text-dim` opacity, or the existing muted region
  style) in both the figure layer and the roll pane. They exist, they don't play, they
  look asleep.

## 4 · CHECKLIST — Brandon driving, agent scribing

- [ ] One-bar roll region, four notes, drag to four bars, loop on: hears four repeats
- [ ] Loop off mid-play: repeats stop at the next cycle boundary, first cycle still plays
- [ ] Icon click never moves the region
- [ ] Figures match what the editor shows on open
- [ ] Figures redraw on editor close
- [ ] A one-note region draws its note mid-height
- [ ] Zero console errors across the above

## 5 · THE JOB

Sonnet — ≈110k. Files: regions.js (two fields, one method, two clamps), roll-scheduler.js
(the `k` loop, the `lengthBars` ceiling), arrangement.js (`_renderLaneRegions`, the loop
handle drag, plus its CSS block), piano-roll.js (dim past a `setActiveTicks(n)` seam),
tools/daw.html (pane FIGURES button), core/state.js (`project.figureCap`), tokens.css
(≤2 size tokens), Glyph and Color Rules.md (one line). Blast radius: `_renderLaneRegions` runs on every store change; the figure
layer must stay cheap — no per-note listeners, no measuring. Drift risk low. Gap risk low:
the drum loop path waits on the sequence roll and is stated as such.

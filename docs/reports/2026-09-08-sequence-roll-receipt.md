SESSION REVIEW — Chromebook DAW / Agent run 1 — sequence roll: the drum machine on the timeline — 2026-09-08 [exact timestamps: ask Brandon]

Built to [SPEC-sequence-roll.md](../mapdocs/SPEC-sequence-roll.md), §3 ruling over §2 where they differ. Every playback claim below is a `noteOn` count taken by patching the track's instrument in the page; no sound is claimed.

EDITS

- [src/surfaces/step-grid.js](../../src/surfaces/step-grid.js) — `setOriginTick(tick)` and `_originTick`, subtracted in `_rafLoop` before the wrap; the ruler prints song bar numbers over each downbeat while the origin is above 0; `setActiveTicks(n)` and a `data-dim` state on every cell at or past it, with one CSS rule; `setBus(bus)` plus `_previewOn`/`_previewOff`, a pad audition on source `mouse`; `setPieces(pieces)` so a grid can label and play pieces with no instrument bound; `resetPattern(bars)`; `pieceFor(instrument, index)` exported for the scheduler
- [src/core/roll-scheduler.js](../../src/core/roll-scheduler.js) — the `Array.isArray` skip is gone; `isPattern()` and `schedulePattern()` run each lane's steps through the same half-open window, the same `endTick` ceiling and the same loop cycle as a note list, with `ticksPerStep` from clock.js and `pieceFor` from step-grid.js
- [tools/daw.html](../../tools/daw.html) — the roll pane is now a region pane: `regionKind()` picks a `StepGrid` for a drum lane and a `PianoRoll` for a pitched one, one surface at a time, disposed on swap; `flushRoll` writes `getPattern()` or `getNotes()` by kind; the grid gets origin, pieces, pattern, bars and bus on load; the `regions.on('update')` listener carries length and dim to the grid, and a `tracks.on('update')` listener refreshes its piece roles. **Fixed on the way:** the flush ran on `pointerup` before the surface's own pointerup handler, so every pad and note edit landed in the store one gesture late — it now runs after the dispatch
- [src/ui/arrangement.js](../../src/ui/arrangement.js) — `_openRegion`, `_closeEditor`, the `'open'` event, its subscription, the region-remove subscription that served it and the `dblclick` emit are deleted; `_commitToRegion` loses its editor branch; the unused `PianoRoll` import is gone. **Added in scope by Brandon:** `_syncTakes(state)` and a clock `statechange` subscription — every armed lane's `capture.record()` opens a take while the transport records, every lane's `stopTake()` closes on any other state, and the take lands under the playhead through `_commitToRegion`
- [INDEX.md](../../INDEX.md) — one DOCS line for this receipt
- [SESSIONLOG.md](../../SESSIONLOG.md) — one entry for this loop

No new token. Everything drawn uses `--op-faint`, `--fs-tiny`, `--w-med`, `--lh-tight`, `--disp-block`, all already in [tokens.css](../../src/ui/tokens.css).

STRAY FILES

- [docs/scratchpad/sequence-roll/](../scratchpad/sequence-roll/) — the four `.mjs` ESM-parse copies (three `.js` files plus `daw.html`'s extracted module script), the two Playwright scripts `verify-a.mjs` and `verify-b.mjs`, and their raw output `verify-a.json` and `verify-b.json`
- [docs/reports/sequence-roll-shots/](sequence-roll-shots/) — 17 screenshots, numbered

GOALS DONE

- Grid learns where it sits: origin seam, playhead subtracts it, ruler reads song bars
- One scheduler for both kinds: a drum region plays from the timeline, stops at `lengthBars`, repeats by `loopBars` when looped
- The pane switches on kind, one surface at a time, disposed on swap; a grid in the pane is never bound to an instrument and its own `_onTick` returns on the first line
- Eight rows always, with the instrument's real piece labels
- Pads play through the track's bus, unarmed
- The floating region editor is gone; double-click selects and opens nothing
- Pattern length follows the region: growing pads, and a shrunk region keeps its steps and draws them dim (§3c over §2c — see BRANDON'S TODOS)
- `beat.html` behaves as before: origin 0, no bar tags, plays and wraps on its own
- The record wire: armed lanes open takes, unarmed lanes open nothing
- ESM parse clean on all four touched files; comment grep clean, zero hits

SHOTS

- [01-drum-region-bar3-grid.png](sequence-roll-shots/01-drum-region-bar3-grid.png) — two-bar drum region at bar 3, the pane holding a grid
- [02-steps-placed.png](sequence-roll-shots/02-steps-placed.png) — kick on both downbeats, snare on beat 3
- [03-playhead-bar3.png](sequence-roll-shots/03-playhead-bar3.png) · [04-playhead-bar4.png](sequence-roll-shots/04-playhead-bar4.png) — mid-play: transport reads 3.2.181 then 4.2.181, and the pane playhead walks from the grid's first bar into its second
- [05-grown-four-bars.png](sequence-roll-shots/05-grown-four-bars.png) — end-grip drag to four bars, ruler 3 4 5 6
- [06-shrunk-one-bar-dim.png](sequence-roll-shots/06-shrunk-one-bar-dim.png) — shrunk to one bar, the rest drawn dim
- [07-second-region-bar6.png](sequence-roll-shots/07-second-region-bar6.png) — a second drum region at bar 6 with its own steps
- [08-loop-three-cycles.png](sequence-roll-shots/08-loop-three-cycles.png) — the bar-3 region looped to three cycles
- [09-pad-click-unarmed.png](sequence-roll-shots/09-pad-click-unarmed.png) — a pad clicked with the lane unarmed
- [10-swap-to-roll.png](sequence-roll-shots/10-swap-to-roll.png) · [11-swap-back-to-grid.png](sequence-roll-shots/11-swap-back-to-grid.png) — the pane swapping kinds
- [12-dblclick-region.png](sequence-roll-shots/12-dblclick-region.png) — double-click on a region: selected, nothing opened
- [13-record-pitched-armed.png](sequence-roll-shots/13-record-pitched-armed.png) · [14-record-drum-armed.png](sequence-roll-shots/14-record-drum-armed.png) · [15-record-unarmed.png](sequence-roll-shots/15-record-unarmed.png) · [16-record-onto-pattern.png](sequence-roll-shots/16-record-onto-pattern.png) — the four record passes
- [17-beat-html.png](sequence-roll-shots/17-beat-html.png) — `tools/desktop/beat.html` playing

COUNTS

Per-bar `noteOn` calls on the drum track's instrument, counted by patching it in the page and mapping each call's AudioContext time back to a tick through the clock's own tick payload. Every run starts from bar 1.

| row | what was on the timeline | counts per bar |
|---|---|---|
| 2 | two-bar region at bar 3, kick at steps 0 and 16, snare at step 8 | bar 3 · 2, bar 4 · 1, nothing at 1, 2, 5+ |
| 4 grow | same region dragged to four bars (`lengthBars` 4, `pattern.bars` 4, steps unmoved at 0, 8, 16) | bar 3 · 2, bar 4 · 1 |
| 4 shrink | same region dragged to one bar (`pattern.bars` stays 4) | bar 3 · 2, nothing after — the kick at step 16 is silent |
| 5 | region looped, `loopBars` 2, dragged to three cycles (`lengthBars` 6) | bar 3 · 2, 4 · 1, 5 · 2, 6 · 1, 7 · 2, 8 · 1 |
| 3 | that region back to two bars plus a second region at bar 6, lane 3 steps 4 and 12 | bar 3 · 2, bar 4 · 1, bar 6 · 2 — each region fires its own, no bleed |

Everything else, measured:

- Pane on a drum region: 1 grid, 8 rows, ruler bar tags `["3","4"]` — the region's own bars, not 1 and 2
- After the shrink to one bar: 128 live cells, 384 dim, 1 of the dim cells carries a step
- Loop click: `{ loop: true, loopBars: 2, lengthBars: 2 }`. Loop drag right two cycles: `{ lengthBars: 6, loopBars: 2 }`
- Pad clicked with the lane unarmed (`armed: false`, bus present, 8 pieces): instrument `noteOn` fired **1** time
- Pitched region selected after a drum one: 1 roll, 0 grids left. Selected back: 1 grid, 0 rolls left
- Double-click on a region block: 0 floating hosts before, 0 after, region selected, exactly 1 grid in the page and it is the pane's
- Record, pitched lane armed: 0 regions before → 1 after, at the playhead bar 3, 3 notes
- Record, drum lane armed (pitched lane disarmed): 1 region before → 2 after, the new one on the drum lane at bar 10, 3 notes
- Record, both lanes unarmed: 2 regions before → 2 after, no notes added anywhere
- `beat.html`: 1 grid, **0** ruler bar tags (origin 0), playhead samples across four seconds `38.7% → 64.6% → 89.6% → 14.7% → 39.5% → …` — it plays from tick 0 and wraps its own bars, unchanged
- Pageerrors: **0** on `tools/daw.html` and **0** on `tools/desktop/beat.html`, on every run including a final reload after the last edit. `beat.html` logs two console-level 404 lines; a response listener over the same load caught no 4xx response on any asset, the same favicon-class message the loop-figures receipt already traced
- ESM parse: `step-grid.js`, `roll-scheduler.js`, `arrangement.js` and `daw.html`'s extracted module script, all four `node --check` clean
- Comment grep over every line this loop authored in the four touched files, for `why`, `so that`, `instead of`, `must`, `never`, `§`, `CONTRACTS`, `Brandon`, a date, or the loop name: **0**

BRANDON'S TODOS

- **A shrunk region keeps its steps.** §2c says `pattern.bars` equals `region.lengthBars`; §3c says steps past the length still exist and draw dimmed. Both cannot hold — a truncated pattern has nothing left to dim. §3 was taken as the ruling: growing a region grows the pattern, shrinking one leaves the pattern at its old length and dims everything past the boundary. After the one-bar shrink above, `lengthBars` is 1 and `pattern.bars` is 4. Say the word if you want the truncation instead
- **Recording into a drum region that is open in the pane loses the take.** Fourth record pass: the take committed onto the region under the playhead, then the pane's own flush wrote the grid's pattern back over it on the stop button's pointerup. The region ends the pass with its pattern intact and the recording gone. This is L6's FOUND #3 wearing the pane instead of the editor, and it is a store question — `regions.addNotes()` replaces a pattern with an array despite its comment saying it leaves one alone
- **Recorded notes on a drum lane land as a note array, not a pattern.** The take path has no idea what kind of lane it is writing to, so a drum lane's recorded region shows an empty grid. Rule what a recorded drum take should become
- **Only the shared `input` singleton reaches Capture.** Panel surfaces play into the track bus, and the bus does not feed `input` — so a panel keyboard and the pane's pads cannot be recorded, only MIDI and whatever else emits on `input`. The record passes above were driven through `input` for that reason. Wiring surfaces into the take is a separate job
- The grid clamps at 8 bars (`MAX_BARS` in step-grid.js). A region longer than that shows and edits its first eight bars only

CLOSER REVIEW

- Gets a copy of this review, not a contract
- SPEC-sequence-roll §2a, §2b, §2c, §2d and §3a-§3d are built and each has a count or a picture behind it — closer
- The §2c/§3c conflict above is the one place the spec was not followed to the letter, and it was resolved toward §3, which the spec itself says rules — Brandon
- The flush-ordering fix in `daw.html` touches the piano roll's write-back as well as the grid's; it was a latent one-gesture lag on both — closer
- The record wire is new scope from Brandon mid-loop, not from SPEC-sequence-roll; it closes L6's FOUND #1 and its own three follow-ups are in BRANDON'S TODOS — closer
- L6's FOUND #2, the broken region double-click, is retired: the thing it opened no longer exists — closer

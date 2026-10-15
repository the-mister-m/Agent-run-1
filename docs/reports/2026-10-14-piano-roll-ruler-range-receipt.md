# Piano roll session receipt — 2026-10-14

Session agent: GoTo (Sonnet 5.5). Queried `library/graphs/graph.json` first, then grep and targeted reads.
No browser run by this agent. No closer, per Brandon.
`src/ui/arrangement.js` was already modified at session start and was not touched here.

Files touched:
- `src/surfaces/piano-roll.js`
- `tools/daw.html`

---

## 1 — Zoom: 100% is 75% of its old width, floor 10%

**Before:** field width = room × zoom × bars. `ZOOM_MIN` was 1.
**After:**
- `piano-roll.js` — new `--roll-base: 0.75`, multiplied into the stripe width. The readout still says 100% at start.
- `ZOOM_MIN` 1 → 0.1. The constructor started at `ZOOM_MIN`; it now starts at `1`.
- `daw.html` double-press reset (`paneSurface.zoom = 1`) left alone.

**Untested:** a 1-bar roll leaves ~25% empty on the right at 100%.

## 2 — Ruler: lines, bar.beat labels, alignment

**Before:** ruler cells carried borders, padding and gaps, so ruler ticks sat ~3–4px left of the grid lines. Bar number was a small green tag inside the first count cell.
**After:**
- Ruler borders/gaps removed from layout. Bar and beat lines are overlays (`::before`), so cells divide the width exactly like the grid lines.
- Green bar line in the ruler and the grid (`--accent`). Grid beat lines 68% → 55%.
- The first beat of each bar reads `bar.beat` (1.1, 2.1, 3.1), using the song bar. White text.
- Sizes: first beat +2px (`--sp-1`), other beat counts +1px (`--sp-hair`), compact and expanded. e / + / a unchanged.
- Ruler cells sit above the bar line in stacking order.

**Inferred:** "other beats" = the plain beat counts, not e + a. "First beats" = beat 1 of each bar only.
**Untested:** alignment measured by eye only from Brandon's screenshot; "1.1" may clip at low zoom.
**Not done:** `step-grid.js` keeps its old ruler.

## 3 — Range: 6 octaves, C labels

**After:**
- `MAX_OCTAVES` 4 → 6.
- DAW pane range `ROLL_BASE_OCTAVE = 1`, `ROLL_OCTAVES = 6` → C1 to C7 true pitch (`daw.html`).
- Under the letter overlay a plain C row prints its octave number (`_renderRowLabels`).
- New `octaveLabelShift` property, default 0, set to -3 in the DAW pane so the bottom C prints **C-2**. Label only; pitch is untouched. Middle C (midi 60) prints C1 in the DAW pane.

**Blast radius:** `baseOctave` / `octaves` are set only at `daw.html` (one place). Standalone pages keep 2 octaves and true numbers.
**Inferred:** vertical scroll comes from `.dwn-region__body` (`overflow: auto`); not run.
**Known cost:** the roll opens at the top (C7); the old C2–C5 view is further down. No scroll code was added.
**Open:** if the key's tonic is not C, the bottom row has no C label.

---

Verified: `node --check src/surfaces/piano-roll.js` passes.
Not verified: everything visual. Brandon drives the browser.

# TOKEN COVERAGE — whole project

Stamped 2026-08-31 21:56 EDT. Written by `daw-shell` (P4/S2), Brandon's order: "make sure
it's documented OUTSIDE OF CODE COMMENTS what is and isn't tokenized right now." Links, not
prose — this is a reference table to skin from, not a report.

Sources, not re-derived: [S1's receipt](../P4-the-daw/S1-spec/receipt-spec-transport.md) ·
[CONTRACTS §16.10](../CONTRACTS.md) · [TODO.md](../../TODO.md) skin-sweep section ·
[seat7-final-sweep.md](../../docs/reports/2026-08-31-seat7-final-sweep.md) task 9.

---

## TOKENIZED

| surface / file | axis covered |
|---|---|
| Whole project, base palette | `--bg` `--panel` `--line` `--text` `--text-dim` `--accent` `--warn` `--meter-ok` `--meter-hot`, 4 root dials (`--fs-root` `--sp-unit` `--r-unit` `--bw`), non-colour axes: shape/type/space/depth/motion/layout/cursor/keyword/canvas — see [seat7-final-sweep.md](../../docs/reports/2026-08-31-seat7-final-sweep.md) EDITS list for the file-by-file sweep (844 raw sites → 22 remaining) |
| `src/vis/spectrum.js`, `src/vis/scope.js` — colour | `fillStyle`/`strokeStyle` already resolve `--bg` `--panel` `--line` `--text` `--text-dim` `--accent` `--warn` via `readTokens()` (`getComputedStyle`, cached per mount/resize). Pre-existing, not this seat's work. |
| `src/vis/spectrum.js`, `src/vis/scope.js` — `_fade()` alpha | **Closed this seat, 2026-08-31 (TASK 3).** All 8 literal alphas now read `t['--fade-faint\|mid\|strong\|label\|half\|near']` — see CLOSED THIS SEAT below. |
| P4 — `/index.html`, `src/ui/daw-shell.js` (this seat, incl. S2 correction pass) | 100% `var(--token)`, zero raw literals, zero fallbacks. Verified in real headless Chrome (screenshot, DOM dump). |
| P4 vocabulary, 85 tokens | Appended `src/ui/tokens.css` under `P4 — THE DAW`, by surface: ground(2) strip(13) meter(4) gain-reduction(3) devices(6) EQ(6) gate(3) pop-out(2) graph+cables(17) automation(6) arrangement(11) transport+header(5) stacking(2) motion(3) canvas(2). Full table: [CONTRACTS §16.10](../CONTRACTS.md). Consumed by this seat's mount-point CSS, the header/transport wiring (`--recess` `--btn-face` `--btn-active` `--play-on` `--rec-on` `--loop-region` `--punch-region`), and `device-space` (S3), below. `--arm-on` dropped from `daw-shell.js`'s own consumption 2026-08-31 (`shell-cleanup` — global arm control removed); still consumed by `arrangement.js`'s per-lane arm buttons, below. |
| `src/devices/reverb.js`, `src/devices/delay.js` (`device-space`, P4/S3) | 100% `var(--token)`, zero raw literals, zero fallbacks — verified in real headless Chromium. Consumes `--device-head` `--knob-track` `--knob-fill` `--knob-pointer` `--bypass-on` `--bypass-off` `--popout-ground` plus reused base/scale tokens (`--text` `--text-dim` `--line` `--font-ui` `--bw` `--w-med` `--tr-color` `--r-body` `--r-ctl` `--r-sm` `--r-cell` `--fs-sm` `--fs-xs` `--sp-1` `--sp-2` `--sp-3` `--sp-4` `--sp-16`). |
| `src/devices/gate.js`, `src/devices/compressor.js`, `src/vis/gain-reduction.js` (`device-dynamics`, P4/S3) | 100% `var(--token)`, zero raw literals, zero fallbacks — grep-verified, no headless browser available in this environment (see [receipt](../P4-the-daw/S3-systems/receipt-device-dynamics.md)). Consumes `--device-head` `--knob-fill` `--bypass-on` `--bypass-off` `--gate-open` `--gate-closed` `--gate-threshold` `--reduction-track` `--reduction-fill` `--reduction-zero` plus reused base/scale tokens (`--text` `--text-dim` `--line` `--font-ui` `--font-mono` `--bw` `--r-body` `--r-ctl` `--r-sm` `--r-pill` `--fs-xs` `--sp-*` `--num-tabular` `--disp-flex` `--flexdir-column` `--align-center` `--box-border-box` `--pos-relative` `--pos-absolute` `--pct-100` `--flex-1` `--color-transparent` `--cur-pointer` `--ta-right` `--tr-background`). |
| `src/devices/eq.js` (`device-spectral`, P4/S3) | 100% `var(--token)`, zero raw literals, zero fallbacks — verified in real Chromium (Playwright). Reuses `src/vis/spectrum.js` unedited (its own tokens, unchanged). `eq.js`'s own canvas draws with two derived-token numbers resolved via a hidden probe element rather than CSS text, since `getComputedStyle` does not resolve a custom property's own `calc()`: `--canvas-lw-3` (curve stroke) `--canvas-lw-2` (band-handle stroke) `--sp-2` (band-handle radius) `--fade-faint` `--op-dim` (bypass dim). Also consumes `--device-head` `--knob-track` `--knob-fill` `--knob-pointer` `--bypass-on` `--bypass-off` `--popout-ground` `--band-curve` `--band-fill` `--band-handle` `--band-1` `--band-2` `--band-3` plus reused base/scale tokens (`--text` `--text-dim` `--line` `--font-ui` `--bw` `--bw-2` `--w-bold` `--w-med` `--r-body` `--r-ctl` `--r-sm` `--r-cell` `--r-pill` `--fs-md` `--fs-xs` `--sp-*` `--track-title` `--track-label` `--num-tabular` `--touch-none` `--usel-none` `--cur-ew-resize`). |
| `src/mixer/strip.js`, `src/vis/meter.js` (`mixer-strips`, P4/S3) | 100% `var(--token)`, zero raw literals, zero fallbacks — grep-verified; no live browser check this pass, see receipt. Consumes `--strip-head` `--strip-sel` `--fader-track` `--fader-fill` `--fader-thumb` `--pan-track` `--pan-thumb` `--pan-center` `--mute-on` `--solo-on` `--slot-face` `--slot-empty` `--slot-route` (all 13 strip tokens) and all 4 meter tokens plus `--meter-track` `--meter-peak` `--meter-clip` `--meter-tick` (from base: `--meter-ok` `--meter-hot`), `--recess` `--raise`, plus reused base/scale tokens (`--bg` `--text` `--text-dim` `--line` `--panel` `--font-ui` `--font-mono` `--bw` `--bw-2` `--w-med` `--r-sm` `--r-cell` `--fs-tiny` `--fs-micro` `--sp-*` `--num-tabular` `--disp-flex` `--flexdir-column` `--align-center` `--box-border-box` `--pos-relative` `--pos-absolute` `--pct-100` `--flex-1` `--flex-0-0-auto` `--ov-hidden` `--ws-nowrap` `--to-ellipsis` `--ta-center` `--usel-none` `--cur-pointer` `--cur-default` `--cur-ns-resize` `--cur-ew-resize` `--touch-none` `--font-inherit`). |
| `src/instruments/patch-synth.js` (`patch-synth`, P4/S3; camera pass by `patch-synth-finish`) | **100% `var(--token)`, zero raw literals** as of 2026-08-31 — the last one, `90deg`, now reads the new `--angle-vertical` (see CLOSED below). Zero hex, zero `px`/`rem`/`em`, zero fallbacks — grep-verified, then verified in real HEADED Chromium (Playwright, session scratch dir). Consumes all 17 graph/cable tokens (`--graph-ground` `--graph-grid` `--node-fill` `--node-head` `--node-border` `--node-selected` `--node-dragging` `--node-dimmed` `--port-in` `--port-out` `--port-active` `--edge-audio` `--edge-control` `--edge-refused` `--edge-hover` `--cable-drag` `--math-group`) plus `--recess` `--raise` `--z-drag` `--z-raise-1` `--z-raise-2` `--glow` `--tr-stroke` `--tr-color` `--tr-background` `--tr-bg-border`, plus reused base/scale tokens (`--bg` `--panel` `--line` `--text` `--text-dim` `--accent` `--font-ui` `--font-mono` `--bw` `--w-med` `--r-panel` `--r-body` `--r-ctl` `--r-cell` `--r-pill` `--fs-base` `--fs-sm` `--fs-xs` `--fs-micro` `--sp-0` `--sp-hair` `--sp-1` `--sp-2` `--sp-3` `--sp-4` `--sp-5` `--sp-6` `--sp-10` `--sp-60` `--stroke-semi` `--stroke-bold` `--stroke-heavy` `--stroke-dash` `--track-title` `--track-label` `--tt-label` `--lh-none` `--op-faint` `--op-dim` `--num-tabular` `--disp-flex` `--disp-grid` `--disp-none` `--flexdir-column` `--flexwrap-wrap` `--align-center` `--align-flex-end` `--justify-space-between` `--justify-flex-end` `--box-border-box` `--pos-relative` `--pos-absolute` `--pct-100` `--flex-1-1-0` `--flex-0-0-auto` `--ov-hidden` `--ov-visible` `--ws-nowrap` `--to-ellipsis` `--ta-left` `--usel-none` `--touch-none` `--pe-none` `--cur-pointer` `--cur-grab` `--cur-grabbing` `--cur-ew-resize` `--cur-not-allowed` `--color-transparent` `--line-solid` `--none`). Node `x`/`y` are written as `${n}px` into `style.left`/`top` — model coordinates that round-trip through JSON, not style values; same for SVG cable path geometry and for the camera's `translate(x, y) scale(z)` on `.ps-scene`. The canvas graph paper is `background-image` on `.ps-canvas` and does NOT travel with the camera — texture, not coordinate; flagged in the receipt for a reviewer. |
| `tools/patch-synth.html` (`patch-synth-finish`, P4 post-S3) | Every value in the page's own `pt-` block is `var(--token)` with colour fallbacks matching `tokens.css`, same shape as `tools/beat.html`. The one raw literal, `min-width: 260px`, is inside the shell-chrome block copied verbatim from `beat.html` (itself a copy of `shell.js`'s `STYLE_TEXT`) — already on Brandon's list, not introduced here, and not diverged from the copy. The graph host is sized `--sp-310`. |
| `src/ui/arrangement.js` (`arrangement`, P4/S3) | 100% `var(--token)`, zero raw literals, zero fallbacks — hand-checked against `tokens.css`, then verified in real headless Chromium (Playwright, session scratch dir). Consumes all 11 arrangement tokens (`--ruler-ground` `--ruler-tick-bar` `--ruler-tick-beat` `--lane-head` `--lane-row` `--lane-row-alt` `--clip-fill`\* `--playhead-line` `--loop-region` `--punch-region` `--arm-on`) except `--clip-fill` (no clip concept — this file is a linear timeline, not clips), plus `--raise` `--btn-face` `--strip-sel` `--z-sticky`, plus reused base/scale tokens (`--text` `--text-dim` `--line` `--font-ui` `--fs-base` `--fs-xs` `--fs-micro` `--bw` `--bw-2` `--r-sm` `--sp-0` `--sp-1` `--sp-2` `--sp-3` `--sp-14` `--sp-60` `--sp-84` `--lh-none` `--disp-flex` `--disp-grid` `--flexdir-column` `--align-center` `--justify-center` `--box-border-box` `--pos-relative` `--pos-absolute` `--pos-sticky` `--pct-100` `--flex-1-1-0` `--ov-hidden` `--ws-nowrap` `--op-soft` `--cur-pointer` `--cur-ew-resize` `--none`). |

---

## NOT TOKENIZED

### CLOSED THIS SEAT (TASK 3) — `_fade()` alphas, `src/vis/spectrum.js` + `src/vis/scope.js`

Assessed after TASK 1 per Brandon's order ("if quick and cheap... do it"). Finding: the
colour side of the "73 canvas-context assignments" TODO.md flagged was **already** resolved
— `readTokens()`/`getComputedStyle` predates this seat. The real gap was narrower: 8 literal
alpha numbers passed to `_fade(color, alpha)`, every one an exact value match to an existing
`--fade-*` token (they were sized from these call sites in the first place). Mechanical
value-for-value swap, done, verified in real Chrome (`tools/wave-synth.html`,
`tools/overtone-synth.html` still draw — grid, "no signal" state, axis labels all correct).

| file : line | was | now |
|---|---|---|
| spectrum.js:619 | `0.22` | `t['--fade-faint']` |
| spectrum.js:648 | `0.55` | `t['--fade-mid']` |
| spectrum.js:706 | `0.55` | `t['--fade-mid']` |
| spectrum.js:732 | `0.7` | `t['--fade-strong']` |
| spectrum.js:780 | `0.82` | `t['--fade-label']` |
| scope.js:640 | `0.5` | `t['--fade-half']` |
| scope.js:719 | `0.5` | `t['--fade-half']` |
| scope.js:749 | `0.9` | `t['--fade-near']` |

**Honesty note:** substitution was by VALUE, not by the token's documented name — e.g.
spectrum.js:732 (overtone-marker leader lines) now reads `--fade-strong`, whose tokens.css
comment says "peak-hold" (that role is actually `--fade-mid` by value at spectrum.js:648).
The numbers match tokens.css exactly; the six `--fade-*` comments describe the site that
happened to be sized from, not necessarily every site that now reads it. Zero visual change
either way — swapping by value was the only way to guarantee that.

**Not touched, same seat, same files — left raw, out of this pass's scope:**
`g.textAlign`/`g.textBaseline` keyword literals (`'left'` `'right'` `'center'` `'top'`
`'bottom'` `'middle'`) and `g.lineJoin = 'round'` — exact-match tokens exist
(`--canvas-textalign-*`, `--canvas-textbaseline-*`, `--canvas-round`) and were not wired.
`g.lineWidth` literals (`1`, `1.5`, `cfg.lineWidth`) — no existing token line up cleanly
(`--canvas-lw-2`/`-3` are P4-only, sized for the meter/graph/EQ, not measured against these
two files' values). Font-size (`` `${p.font}px …` ``) is canvas-height-derived, not a skin
dial. **Cost to close, if wanted:** ~15-20 sites across both files, same
`readTokens()`/value-match mechanism as above — small, but a second pass, not part of this
one; not started per "either it lands whole or it does not start."

### CLOSED 2026-08-31 — the ANGLE axis, 1 site — RULED BY BRANDON: add it
`90deg` in the graph canvas's grid gradient is gone. **`--angle-vertical: 90deg` appended to
[tokens.css](../../src/ui/tokens.css)**, last line of the P4 `:root` block under a new
`ANGLE` heading — the only thing added, nothing above it read back out or changed.
[src/instruments/patch-synth.js](../../src/instruments/patch-synth.js)'s `.ps-canvas`
`background-image` reads it. **`patch-synth.js` is now zero raw literals**, grep-verified
(no `px`/`rem`/`em`/`deg`, no hex) and re-verified in headed Chromium. Closed by
`patch-synth-finish` (P4 post-S3), 2026-08-31.

### Brandon's call — 5 sites, no token exists off the `--sp-*` scale
- `min-width: 260px` — [tools/beat.html:54](../../tools/beat.html#L54)
- `min-width: 260px` — [tools/patch-synth.html:54](../../tools/patch-synth.html#L54) — the same shell-chrome copy, third site
- `min-width: 260px` — [src/ui/shell.js:213](../../src/ui/shell.js#L213)
- `inset: -8px` — [src/instruments/wave-synth.js:416](../../src/instruments/wave-synth.js#L416)
- `margin-left: -2px` — [src/surfaces/piano-roll.js:489](../../src/surfaces/piano-roll.js#L489)

### Escalation entries pending a ruling — 16 sites
`font-size` 18px — drum-sampler.js:723, step-grid.js:355, piano-roll.js:354 · `font-size`
16px — shell.js:379 · `gap` 3px — piano-roll.js:382, comp-builder.js:191 · `gap` 22px —
drum-sampler.js:723 · `gap` 7px — comp-builder.js:134 · `padding` 20px —
tools/harmonyNEW.html:148 · `stroke-width` 0.6/0.8/1.4/1.6/1.8/2 — scale-circle.js
(lines 183, 188, 206, 228, 263, 267, 285). Full class table:
[seat7-final-sweep.md](../../docs/reports/2026-08-31-seat7-final-sweep.md) task 9. Why: off
the `--fs-*`/`--sp-*`/`--stroke-*` scale, inside a `[data-variant="expanded"]` block, or an
SVG presentation-attribute fence.

### `src/ui/devbox.js` — ruled exempt
2026-08-31 skin sweep session: "everything tokenizes except `src/ui/devbox.js`" ([TODO.md](../../TODO.md)).

### Dial-alignment — deferred, not a raw-literal gap
262 tokens in `tokens.css` are flat literals, not scales driven by a dial. Brandon wants to
see what the dials currently do before this is scoped. ([TODO.md](../../TODO.md))

### P4 surfaces not yet built
None. `eq.js`, `mixer/strip.js`, `vis/meter.js`, `ui/arrangement.js`,
`instruments/patch-synth.js`, `mixer/graph.js`, `ui/cpu-meter.js`, `mixer/automation.js`
all shipped. All 85 P4 tokens exist and are consumed somewhere in the set.

### `src/ui/cpu-meter.js` — P4/S5 `governor`, 2026-08-31 23:51 EDT
Every colour/size/spacing/weight/radius in its own stylesheet block is `var(--token)`, no
fallback, grep-verified zero raw literals. Reuses `shell.js`'s base meter styles rather than
carrying a second copy.

### `src/mixer/automation.js` — P4/S5 `automation`, 2026-08-31 23:55 EDT
Every colour/size/spacing/weight/radius in its own stylesheet block AND every canvas draw
value (line widths, point radius) is `var(--token)`, resolved at draw time via
`getComputedStyle`/`parseFloat` (canvas can't take `var()` literally) — zero raw literals,
zero fallback syntax, script-verified against `tokens.css`'s own declaration list. Consumes
all 6 automation-lane tokens (`--lane-ground` `--lane-grid` `--lane-curve` `--lane-point`
`--lane-point-on` `--lane-step`) plus `--playhead-line` `--canvas-lw` `--canvas-lw-2` `--sp-2`
plus reused base/scale tokens (`--text` `--text-dim` `--line` `--raise` `--font-ui`
`--font-inherit` `--bw` `--w-med` `--r-sm` `--fs-micro` `--sp-0` `--sp-1` `--sp-2` `--sp-hair`
`--sp-14` `--disp-flex` `--disp-block` `--flexdir-column` `--align-center`
`--justify-space-between` `--box-border-box` `--pos-relative` `--pct-100` `--flex-0-0-auto`
`--flex-1` `--ov-hidden` `--ws-nowrap` `--to-ellipsis` `--usel-none` `--cur-pointer`
`--touch-none`). Verified live in headed Chromium (Playwright, session scratch dir).

### `src/mixer/graph.js` — P4/S4 `node-graph`, 2026-08-31 23:28 EDT
167 `var(--token)` sites, **zero fallbacks, zero raw colour/size/unit literals**, 74 distinct
tokens, every one verified present in `tokens.css`. Consumes 16 of the 17 `graph + cables`
tokens — `--math-group` is the patch synth's Math palette group and is correctly unused here.
This is the second consumer of the graph/cable set, as predicted: §16.7 keeps the patch synth's
internal graph and the mixer graph separate, and both draw from the same vocabulary.
One reuse worth naming: a cable's invisible click target is `stroke-width: var(--sp-5)` with
`stroke: var(--color-transparent)` — a hit target is geometry, so it composes from `--sp-*`
per §16.10 rather than asking for a new dial. No new token needed; nothing escalated.
Receipt: [receipt-node-graph.md](../P4-the-daw/S4-graph/receipt-node-graph.md).

### `src/mixer/strip.js`, `src/mixer/graph.js` — `strip-tap-fix`, 2026-08-31

Both files edited (all-ports-tap-the-same-point fix, Brandon's ruling). No markup, no new
CSS, no new literal of any kind — the change is internal Web Audio node wiring only (which
node connects to which) plus one new getter and one changed default JS string
(`'Master'`→`'Output'`, not a styled value). Both files remain exactly as tokenized as
`mixer-strips` (P4/S3) and `node-graph` (P4/S4) left them. Receipt:
[receipt-strip-tap-fix.md](../P4-the-daw/S4-graph/receipt-strip-tap-fix.md).

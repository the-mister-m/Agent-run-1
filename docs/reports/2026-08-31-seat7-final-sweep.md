Seat 7 receipt — Chromebook DAW skin sweep, final sweep

## TASK 1 — the 2 sweep misses
`src/instruments/overtone-synth.js:713-714` held `'height:100%'` /
`'width:100%'` as bare single-quoted array elements with no `;` `}` or
backtick of their own — the whole-file scan bled past the closing quote
into the next array element and rejected the value. Added shape d to
`sweep.py`: `STRING_ITEM_RE` + `find_string_item_candidates`, scanned per
quoted span like shape c, requiring the ENTIRE quoted content to be
consumed by `prop_pattern` (anchored match, full-length check) so it can't
bleed into neighboring code. Tested in isolation against the two lines
before touching anything else — both resolved to `--pct-100` at lines
713/714, values coming back clean.

## TASK 2 — the 64 compounds
35 entries in token-map.json carry a `COMPOUND SHORTHAND` reason and
`safe_for_script: false`.
- 33 held a complete replacement string in `token` (e.g.
  `"var(--sp-2) var(--sp-5)"`) — flipped to `safe_for_script: true`.
- 2 held `token: null` behind a placeholder `value` (`padding: "<2-4 value
  shorthand>"`, `transition: "<all shorthand declarations>"`) — left
  false, hand work. Both currently measure 0 raw sites in source (their
  stale `measured_sites` fields — 66 and 12 — predate other seats' work;
  nothing left to sweep under those two entries as written).

Flipped: 33. Left as hand work (compound-reasoned, placeholder token): 2.

That accounted for only 48 of the 64 raw sites named in this seat's
brief. The other 16 turned out to belong to four DIFFERENT token-map
entries — not reason-tagged `COMPOUND`, but the same shape (one entry's
`value` field bundles several literal values with `|`, `token: null`):
font-size `16px|18px|22px|28px|30px|32px` (VARIANT-BLOCK, blocked on
Brandon), gap `3px|5px|7px|22px` (OFF-SCALE AND UNNAMED, escalation),
padding `7px|20px` (same), stroke-width `0.6|0.8|1.4|1.6|1.8|2` (FENCE
2 — SVG presentation attributes). All four were already `token: null` /
`safe_for_script: false` — nothing to flip, no action needed, but they
belong in the raw-site count and in task 9's classing below. Naming this
because the 64 in the brief doesn't decompose into 35 COMPOUND entries
alone; it only closes once these four escalation entries are counted
too.

## TASK 3 — dry run
`python3 sweep.py`: Band A 3, Band B 47, total 50 sites, 11/17 files.

## TASK 4 — apply + idempotence
`python3 sweep.py --apply`: 50 written, 11/17 files.
Rerun `python3 sweep.py --apply`: 0 written, 0/17 files. Idempotent.

## TASK 5 — measure2.py, final
Self-test 8/8. `overtone-synth.js` cssText spans found: 5 (unchanged).
- distinct: 17
- raw CSS sites: 22
- canvas: 33 distinct / 73 sites (unchanged, out of scope)
- _fade: 6 distinct / 8 sites (unchanged, out of scope)

Per-file count (CSS + canvas + _fade, zeros included):
```
2  src/ui/shell.js               1  src/instruments/wave-synth.js
2  src/instruments/drum-sampler.js   1  src/surfaces/step-grid.js
3  src/surfaces/piano-roll.js    7  src/surfaces/scale-circle.js
2  src/surfaces/comp-builder.js  3  tools/beat.html
1  tools/harmonyNEW.html        46  src/vis/spectrum.js
35  src/vis/scope.js
0  src/instruments/drum-synth.js, src/surfaces/keyboard.js,
   src/surfaces/diatonic-keys.js, tools/overtone-synth.html,
   tools/wave-synth.html, src/instruments/overtone-synth.js
```

## TASK 6 — arithmetic
72 (start of session) − 50 (2 miss-fixes + 48 compound sites applied)
= 22. measure2.py reports 22 raw CSS sites now. Closes.

## TASK 7 — spot-check
`grep -an "var(--"` on `src/instruments/overtone-synth.js`,
`src/surfaces/keyboard.js`, `src/surfaces/comp-builder.js`, and
`tools/beat.html`. Every hit sits on the right side of a declaration
colon or inside a `.style.cssText` array element string (e.g.
`'height:var(--pct-100)'` at overtone-synth.js:713). None on a property
name, in a selector, in a comment, or outside a style block.

## TASK 8 — .bt-top
`tools/beat.html:111` — `.bt-top { top: 0; padding-top: var(--sp-2);
z-index: var(--z-popover); }`. `top: 0` still raw, unchanged.

## TASK 9 — every remaining raw site (22), classed

**Brandon's call (4)**
- `min-width: 260px` — tools/beat.html:54
- `min-width: 260px` — src/ui/shell.js:213
- `inset: -8px` — src/instruments/wave-synth.js:416
- `margin-left: -2px` — src/surfaces/piano-roll.js:489

**genuine variable (1)**
- `color: ''` — tools/beat.html:657

**.bt-top (1)**
- `top: 0` — tools/beat.html:111

**hand work — escalation entries, `token: null`, no ruling yet (16)**
- `font-size: 18px` — src/instruments/drum-sampler.js:723,
  src/surfaces/step-grid.js:355, src/surfaces/piano-roll.js:354
- `font-size: 16px` — src/ui/shell.js:379
- `gap: 3px` — src/surfaces/piano-roll.js:382,
  src/surfaces/comp-builder.js:191
- `gap: 22px` — src/instruments/drum-sampler.js:723
- `gap: 7px` — src/surfaces/comp-builder.js:134
- `padding: 20px` — tools/harmonyNEW.html:148
- `stroke-width: 0.6` — src/surfaces/scale-circle.js:183, 228
- `stroke-width: 0.8` — src/surfaces/scale-circle.js:263
- `stroke-width: 1.4` — src/surfaces/scale-circle.js:285
- `stroke-width: 1.6` — src/surfaces/scale-circle.js:206
- `stroke-width: 1.8` — src/surfaces/scale-circle.js:267
- `stroke-width: 2` — src/surfaces/scale-circle.js:188

**canvas (out of scope, unchanged)**
- 73 canvas-context assignments + 8 `_fade()` alphas in src/vis/

4 + 1 + 1 + 16 = 22. Nothing outside these classes. No misses.

---

SESSION REVIEW — Chromebook DAW skin sweep — [timestamps: ask Brandon]

EDITS
- [Builddocs/skinspecs/sweep.py](../../Builddocs/skinspecs/sweep.py) — added shape d (bare single-quoted array-element declarations)
- [Builddocs/skinspecs/token-map.json](../../Builddocs/skinspecs/token-map.json) — 33 compound entries flipped safe_for_script true
- [src/instruments/overtone-synth.js](../../src/instruments/overtone-synth.js) — height/width 100% tokened, --pct-100
- [src/surfaces/keyboard.js](../../src/surfaces/keyboard.js) — border-radius compounds tokened
- [src/surfaces/piano-roll.js](../../src/surfaces/piano-roll.js) — border-radius + padding compounds tokened
- [src/ui/shell.js](../../src/ui/shell.js) — padding compounds tokened
- [src/instruments/drum-sampler.js](../../src/instruments/drum-sampler.js) — padding compounds tokened
- [src/surfaces/step-grid.js](../../src/surfaces/step-grid.js) — padding compounds tokened
- [src/surfaces/diatonic-keys.js](../../src/surfaces/diatonic-keys.js) — padding compound tokened
- [src/surfaces/scale-circle.js](../../src/surfaces/scale-circle.js) — padding compound tokened
- [src/surfaces/comp-builder.js](../../src/surfaces/comp-builder.js) — gap + padding compounds tokened
- [tools/beat.html](../../tools/beat.html) — padding compounds tokened
- [tools/harmonyNEW.html](../../tools/harmonyNEW.html) — padding compounds tokened
- [Builddocs/skinspecs/dry-run-report.md](../../Builddocs/skinspecs/dry-run-report.md) — regenerated by sweep.py's dry run

STRAY FILES
(none)

GOALS DONE
- 2 sweep misses fixed and tested in isolation before applying
- 33 compound entries flipped, 2 correctly left as hand work
- sweep applied (50 sites), idempotent on rerun
- measure2.py run, 72→22 raw sites, arithmetic closes
- 3-file spot-check clean, .bt-top confirmed held
- every remaining raw site (22) named and classed, no misses

BRANDON'S TODOS
- 4 sites need a call: min-width:260px x2, inset:-8px, margin-left:-2px
- 16 raw sites are escalations blocked on a ruling: font-size 16/18px
  (variant-block), gap 3/7/22px + padding 20px (off-scale, unnamed),
  stroke-width 0.6-2 (SVG presentation-attribute fence) — see task 9
- 1 genuine variable, no action: color:'' at tools/beat.html:657

CLOSER REVIEW
- Confirm the 16-site escalation note above against Seat 6's original
  "64 compound" figure before folding into MEMORY.md — Closer
- Fold warm-start into MEMORY.md — Closer

# Seat 1 — measurement widen — 2026-08-31

Scope: `Builddocs/skinspecs/tools/measure2.py` and `scan_props.py` only. No
other files edited.

## Task 1 — LAYOUT_MATH deleted

Definition (line 49) and its usage in `scan_css_span` (was lines 113-114)
both deleted. Layout math values (%, fr, auto, vh, vw) are no longer
skipped — now in scope per the ruling.

## Task 2 — var(--) skip kept

`if "var(--" in v: continue` kept unchanged in `scan_css_span`.

## Task 3 — four extraction shapes added

Reported line numbers re-checked before editing:

- **3a** `.style.<prop> = '<value>'`
  - `src/ui/shell.js:658` — held it. `seam.style.marginTop = '8px';`
  - `tools/harmonyNEW.html:272` — did NOT hold it (`el.body.appendChild(split);`).
    Skipped as reported. Real instances exist nearby at harmonyNEW.html
    lines 268-271, 275, 279, 300, 308, etc.
  - `tools/harmonyNEW.html:288` — did NOT hold it (a `for` loop line).
    Skipped as reported.
  - Shape confirmed real via shell.js:658 and the many correct-line
    harmonyNEW.html hits. Added as `STYLE_PROP_RE`, applied to
    `CSS_JS_FILES`, `HTML_FILES`, and `OVERTONE_INLINE`. camelCase prop
    names converted to kebab-case and checked against `PROPS` before
    counting (`camel_to_kebab`).

- **3b** cssText as single-quoted string or joined array
  - `src/instruments/overtone-synth.js:616` — held it (`.join(';')` array).
  - `:702` — held it (`levelInput.style.cssText = 'flex:1;';`).
  - `:709` — held it (single-quoted `barTrack.style.cssText = '...'`).
  - All three confirmed. Added `CSSTEXT_QUOTE_MARKER` (extracts the
    single-quoted span, fed straight into `scan_css_span` since it's
    already real `prop:value;` CSS text) and `CSSTEXT_ARRAY_MARKER` +
    `scan_cssText_array_span` (extracts the `[...]` span, then pulls each
    single- or backtick-quoted array element out with `ARRAY_ELEM_RE` and
    scans each one independently — needed because a plain backtick-only
    read misses array elements that are single-quoted, e.g. the second
    array at overtone-synth.js:712 mixes `'height:100%'` with backtick
    elements).

- **3c** `style="..."` inside an innerHTML template
  - `src/ui/shell.js:749` — held it (`style="align-items:flex-start"`,
    inside the `root.innerHTML = \`` block starting line 736). Only
    occurrence found anywhere in the scanned files.
  - Added `STYLE_ATTR_RE`, applied to `CSS_JS_FILES` and `HTML_FILES` via
    `scan_style_attrs` (feeds the captured attribute value into
    `scan_css_span`, appending a trailing `;` if the attribute has no
    terminator, since HTML style attrs often omit the last one).

- **3d** cssText in the vis files
  - `src/vis/spectrum.js:219-224` — held it (`wrap.style.cssText` at
    219-221, `canvas.style.cssText` at 224).
  - `src/vis/scope.js:217-222` — held it (`wrap.style.cssText` at
    217-219, `canvas.style.cssText` at 222).
  - Vis files previously had zero cssText scanning (canvas/`_fade` only).
    Wired `CSSTEXT_QUOTE_MARKER` + `CSSTEXT_ARRAY_MARKER` extraction into
    the `VIS_FILES` loop, same functions as 3b.

No fifth shape added. No general CSS parser written — extraction stays
span-then-DECL_RE, matching the existing pattern.

## Task 4 — PROPS extended from scan_props.py

Ran `scan_props.py`, diffed its property-shaped output against the
existing `PROPS` list, then verified every candidate myself with `grep`
against the actual scanned files (not taken on faith).

**Added (20, each grep-confirmed in an in-scope file):**
`display`, `align-items`, `flex-direction`, `position`, `box-sizing`,
`flex`, `flex-wrap`, `justify-content`, `overflow`, `overflow-x`,
`overflow-y`, `pointer-events`, `user-select`, `touch-action`,
`-webkit-user-select`, `grid-template-columns`, `list-style`,
`will-change`, `align-self`, `content`.

- 17 of these were named in the prior audit's list; verified each with a
  real grep hit (e.g. `display` — `src/ui/devbox.js:415` and dozens of
  in-scope hits like `src/ui/shell.js:151`; `align-self` —
  `tools/beat.html:184`).
- `flex-wrap` and `-webkit-user-select` were not in the named list but
  are real, in-scope CSS properties (`src/ui/shell.js:168`;
  `src/surfaces/step-grid.js:249`, `keyboard.js:90`, `scale-circle.js:165`)
  — added.
- `content` was not in the named list; confirmed real at
  `src/instruments/wave-synth.js:416` (`content: '';`) — added.

**Rejected:**
- `grid-column` — the only colon-syntax hit is
  `src/instruments/chord-module.js:359`, and `chord-module.js` is not in
  any of measure2.py's or scan_props.py's file lists (it's the archived
  file, moved to `Archive/chord-module.js`). No in-scope hit. Rejected.
- `columns` — the only occurrence is a prose comment,
  `src/ui/shell.js:1041` ("the two columns: instrument | ..."), not a CSS
  declaration. Rejected.
- Every other name in scan_props.py's output (`id`, `class`, `index`,
  `note`, `default`, `source`, `compact`, `velocity`, `label`, `mount`,
  `keys`, `reason`, `kind`, `key`, `to`, `attack`, `toolbar`, `notes`,
  `offsets`, `--fs-root`, `--roll-row-h`, `--kbd-line`, etc., plus dozens
  of stray English/comment words) are JS identifiers, object keys, custom
  `--token` names, or comment prose — not CSS property names. Rejected on
  sight; scan_props.py's colon-based regex has no notion of what's real
  CSS, that judgment is the human/grep step this task asked for.

## Task 5 — zero-suppressed counts removed

Added a per-file table (17 files, all scanned lists, zeros included) and
a per-property table (all `PROPS` entries, zeros included) at the end of
the script's output.

## Task 6 — self-test assertions

8 regexes seeded with one real source line each, asserted to match,
`SystemExit(1)` on failure:

| regex | seed line | source |
|---|---|---|
| DECL_RE | `flex-direction: column;` | src/ui/shell.js:152 |
| CANVAS_RE | `g.strokeStyle = this._fade(t['--accent'], 0.5);` | src/vis/scope.js:636 |
| FADE_RE | same line | src/vis/scope.js:636 |
| STYLE_PROP_RE | `seam.style.marginTop = '8px';` | src/ui/shell.js:658 |
| CSSTEXT_QUOTE_MARKER | `levelInput.style.cssText = 'flex:1;';` | overtone-synth.js:702 |
| CSSTEXT_ARRAY_MARKER | `root.style.cssText = [` | overtone-synth.js:616 |
| ARRAY_ELEM_RE | `` `background: var(--panel, #1b2332)`, `` | overtone-synth.js:617 |
| STYLE_ATTR_RE | `<div ... style="align-items:flex-start">` | src/ui/shell.js:749 |

All 8 passed on run. No failed assertions.

## Task 7 — run results

```
# self-test: 8 regexes matched their seeded lines
overtone-synth.js cssText spans found: 5

# distinct literal CSS declarations: 242
# raw CSS sites: 880

# canvas assignment distinct: 33
# canvas assignment sites: 73

# _fade() distinct alpha: 6
# _fade() sites: 8
```

Per-file table (CSS + canvas + _fade sites, zeros included — none were
zero):

```
 109  src/ui/shell.js
  37  src/instruments/drum-sampler.js
  45  src/instruments/drum-synth.js
  55  src/instruments/wave-synth.js
  64  src/surfaces/step-grid.js
  38  src/surfaces/keyboard.js
 103  src/surfaces/piano-roll.js
  41  src/surfaces/diatonic-keys.js
  55  src/surfaces/scale-circle.js
  98  src/surfaces/comp-builder.js
 144  tools/beat.html
  56  tools/harmonyNEW.html
   3  tools/overtone-synth.html
   3  tools/wave-synth.html
  17  src/instruments/overtone-synth.js
  52  src/vis/spectrum.js
  41  src/vis/scope.js
```

Per-property table: printed for all 88 entries in `PROPS`, zeros
included (e.g. `background-color`, `font-weight`, `font-family`,
`line-height`, `letter-spacing`, `text-transform`, `padding-right`,
`padding-bottom`, `outline-offset`, `z-index`, `accent-color`,
`text-shadow` all print `0`). Full table is in the script's stdout, not
reproduced in full here — run `python3
Builddocs/skinspecs/tools/measure2.py` to see it.

No failed assertions. No WARNING lines (every file's CSS-bearing span
extraction found at least one span).

## Before / after

|  | before | after |
|---|---|---|
| distinct CSS declarations | 166 | 242 |
| raw CSS sites | 398 | 880 |
| canvas distinct/sites | 33/73 | 33/73 (unchanged, in scope) |
| _fade distinct/sites | 6/8 | 6/8 (unchanged, in scope) |

canvas and _fade numbers are unchanged because tasks 1-4 only touched CSS
declaration extraction and the PROPS list; CANVAS_RE/FADE_RE themselves
weren't edited.

SESSION REVIEW — Chromebook DAW skin sweep — [timestamps: ask Brandon]

EDITS
- [measure2.py](Builddocs/skinspecs/tools/measure2.py) — LAYOUT_MATH deleted, 4 new CSS extraction shapes added, PROPS extended by 20 verified properties, per-file/per-property zero-inclusive tables added, 8-regex self-test added

STRAY FILES
- (none)

GOALS DONE
- LAYOUT_MATH deleted (task 1), var(--) skip kept (task 2), 4 extraction shapes added (task 3), PROPS extended and rejects documented (task 4), zero-suppressed counts removed (task 5), self-test assertions added (task 6), measure2.py run clean (task 7)

BRANDON'S TODOS
- (none — seat 2 owns tokens.css next)

CLOSER REVIEW
- Confirm seat 2 picks up tokens.css against the widened 242/880 numbers, not the stale 166/398 baseline — Brandon / closer

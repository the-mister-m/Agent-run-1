# HANDOFF — ORPHANS seat — 2026-08-31

State of the tree, real counts, and what a successor would otherwise re-measure.
Counts here are measured, not quoted. Where they disagree with token-map.json or
S1, this file is the measurement.

## TREE STATE — SAFE, PARTIAL

Nothing is broken and nothing renders differently from HEAD except where named
under CHANGES SHIPPED. Verified: no dangling `var(--*)` reference in any of the
16 style-bearing files (`--token`, `--note-deg`, `--row-deg`, `--x` are
pre-existing JS-set locals, not from this seat).

Every module root this seat converted keeps its font-size pinned:

    font-size: Npx        ->    --fs-root: Npx; font-size: var(--fs-base);

so descendants still carrying `em` resolve against an unchanged element
font-size. A half-converted module is visually identical to HEAD. This is why
the partial state is safe to leave.

## COUNTS ESTABLISHED (measured 2026-08-31, Python, 18 files)

| thing | map says | truth |
|---|---|---|
| em font-sizes | 19 | **22** |
| unruled transition durations | 9 (brief said 8) | **9** |
| padding 32/40/28/36 component occurrences | 8 | **7** |
| line-height sites | 22 | **22** (agrees) |
| border-radius 9px | 1 | **1** (agrees) |
| outline 2px solid | 7 | **7** (agrees) |
| chord-module.js NUL byte line | 1624 | **1511** |

NUL is 1 byte, plus 1 SOH (0x01) in the same file. Both unmoved since HEAD.
`token-map.json` FENCE 4 text is stale on the line number. Do not edit the S2
spec to fix it.

### line-height breakdown (22)
`1` x10 · `1.2` x1 · `1.35` x3 · `1.45` x3 · `1.5` x4 · `1.55` x1.
`1.4` x1 was already `--lh-base` via Phase 1. S1's `--lh-tight: 1.15` matched
zero sites before this seat.

### transition durations (9 unruled of 12 occurrences, 9 declarations)
`60ms` x2 · `70ms` x2 · `90ms` x4 · `150ms` x1. Ruled already: `80ms` x2,
`120ms` x1. Easings: `ease-out` x5, `linear` x4.
Nearest-knob is unambiguous: 60/70/90 -> `--dur-fast` (80ms), 150 -> `--dur-med`
(120ms). 90ms is 10ms from fast, 30ms from med — not the borderline the sweep
seat feared.

### em font-sizes (22) — full site list
chord-module 388, 393, 405, 422, 433, 436, 437, 454, 459
drum-sampler 727, 733, 735 · drum-synth 553, 556, 558, 559, 566, 567
wave-synth 397, 398 · comp-builder 142, 211

## THE em CONFLICT AND ITS FIX

`.cm-compact` sets `font-size: var(--fs-sm)` (11px) and `.cm-expanded` sets
`14px` on the SAME element the em children hang off. The identical em value
therefore resolves to two different pixel sizes. A property+value map is 1:1 by
construction and cannot express that — this is why the sweep script can never
touch an em site.

Fix, applied to chord-module / wave-synth / drum-synth (drum-sampler NOT done):

1. Variant root: `font-size: Npx` -> `--fs-root: Npx; font-size: var(--fs-base);`
2. Each em descendant -> the `--fs-*` step nearest its measured pixel size
   against that root.
3. Where a descendant sets a font-size AND has em children of its own, it takes
   a nested `--fs-root` too. Used at `.cm-bank__label` (30px / 18px compact) and
   `.dsyn-expanded .dsyn-pad` (14.4px). This keeps `.dsyn-pad-note` at exactly
   10.8px instead of the +11% a flat snap would cause.

Module roots established: chord-module 11 / 14 · wave-synth 11 / 18 ·
drum-synth 11 / 16 · drum-sampler 12 / 18.

Snap deltas: most land within 3%. Outliers, all deliberate and all flagged in
receipt-orphans.md — `.ws-expanded .ws-label` +11%, `.ws-title` -6%,
`.dsyn-title` -4.7%, `.dsam-title` -37% in compact.

`.dsam-title` has no `display: none` in compact, unlike `.ws-title` and
`.dsyn-title`. That looks like a pre-existing bug and is the reason the -37%
figure exists. NOT fixed by this seat.

## THE `--sp-unit` VARIANT OVERRIDE — MEASURED, NOT DONE

The instruction was `--sp-unit` overrides on the three expanded blocks. It
cannot preserve the app. At `--sp-unit: 4px` on `.ws-expanded`, the block's own
`padding: 32px 40px` reproduces exactly as `var(--sp-8) var(--sp-10)`, but four
descendants have NO expanded-specific override and would double:

    .ws-wave-btn  gap 3px -> 6px
    .ws-stepper   gap 4px -> 8px
    .ws-adsr-cell gap 2px -> 4px
    .ws-root      padding, via the shared rule

Preserving them means inventing expanded-only rules that do not exist today.
Shipped instead: plain derived tokens (`--sp-16` 32px, `--sp-18` 36px,
`--sp-20` 40px). Exact, and they still ride the global `--sp-unit`. The
override remains a one-line change per block whenever Brandon wants it.

## beat.html:134 — ITS OWN ANSWER

`padding: 10px 14px 28px`. It carries a 28px component, which is why the map
counted it into the 32/40/28/36 group and got 8. It is NOT expanded chrome —
it sits in no variant block, in a standalone tool. Answer given:
`var(--sp-5) var(--sp-7) var(--sp-14)` on the global `--sp-unit`, no variant
override. NOT YET APPLIED.

The map's claim "all eight sites are expanded-variant chrome" is false on both
the count and the context.

## 1:1 SCRIPTABLE vs HAND, BY ENTRY

**Scriptable — 35 sites, ALREADY APPLIED** (entries added to token-map.json,
flagged `safe_for_script: true`, `reconciles: true`):
line-height 1/1.2/1.35/1.45/1.5/1.55 (22) · letter-spacing 0.01em/0.04em (4) ·
border-radius 9px (1) / 10px (2) · font-size 17px (1) / 22px (2) / 28px (1) /
32px (2).

**Hand, because value -> token is not 1:1** (same value, different token by
context): font-size 14px (comp-builder:204 `--fs-numeral` vs chord-module:349
variant root), 16px (shell:378 `--fs-readout` vs drum-synth:547 variant root),
18px (step-grid/piano-roll `--fs-2xl` vs ws/dsam variant roots vs
chord-module:421 `--fs-xl`), 30px (nested root).

**Hand, because the property is compound**: every padding/gap shorthand,
every `transition`, every `box-shadow`, `border` shorthands.

**Hand, because sweep.py does not carry the property**: `outline` is not in
`BORDER_WIDTH_PROPS`; `stroke-width` is not in `EXACT_PROPS`. sweep.py was
outside this seat's lane so neither was added — a successor with the lane could
add both and script 15 more sites.

## S1's 109 FORBIDDEN SITES, UNDER BRANDON'S OVERRIDE

Stay literal (genuinely not knobs) — 28 sites:
margin `0` x18 · padding `0` x5 · opacity `1` x3 · border-left `2px solid` x2
(deliberate accent markers, S1 verbatim, ruling reconfirmed).

Become knobs under the override — 81 sites:
padding 2-4 value shorthands x66 (compose from `--sp-*`; every component value
now has a token) · margin non-zero x7 (same) · border-radius `10px` x2 (now
`--r-xl`, done) · CanvasRenderingContext2D.font x6 (see below).

## FENCE 1 — the canvas font, 6 sites, NOT DONE

spectrum.js 651, 714, 767 · scope.js 643, 709, 736.
Plumbing already exists and must not be duplicated: `TOKEN_FALLBACK` +
`readTokens()` at spectrum.js:~40 / scope.js:~46 read tokens through
`getComputedStyle`. Add one key:

    '--font-mono': 'ui-monospace, SFMono-Regular, Menlo, monospace'

then `g.font = \`${p.font}px ${t['--font-mono']}\``. No second mechanism.

## FENCE 2 — SVG, RESOLVED

The 8 `stroke-width` sites are in CSS blocks, NOT presentation attributes, so
`var()` works normally. The map's FENCE 2 warning does not apply to them.
Values 0.6 x2, 0.8, 1.4, 1.6, 1.8, 2 x2. Tokens are written and one site
(wave-synth:405) is applied; the 7 scale-circle sites are not.
No `font-size` SVG presentation attribute was found anywhere — that map entry
has `measured_sites: null` and appears to describe nothing.

## TOKENS WRITTEN TO src/ui/tokens.css — ALL 27 ORPHANS NAMED

98 custom properties now defined. New this seat:

`:root` knobs (6): `--ease-linear: linear` · `--track-tight: 0.01em` ·
`--track-mid: 0.04em` · `--lh-none: 1` · `--lh-loose: 1.5` · `--stroke-w: 1`

`*` derived (26): `--r-chip` 4.5 · `--r-xl` 5 · `--fs-half` 0.5 ·
`--fs-numeral` 1.167 · `--fs-readout` 1.333 · `--fs-chord` 1.417 ·
`--fs-2xl` 1.5 · `--fs-3xl` 1.833 · `--sp-1h` 1.5 · `--sp-2h` 2.5 ·
`--sp-3h` 3.5 · `--sp-4h` 4.5 · `--sp-5h` 5.5 · `--sp-9` · `--sp-10` ·
`--sp-11` · `--sp-14` · `--sp-16` · `--sp-18` · `--sp-20` ·
`--stroke-hair` 0.6 · `--stroke-thin` 0.8 · `--stroke-med` 1.4 ·
`--stroke-semi` 1.6 · `--stroke-bold` 1.8 · `--stroke-heavy` 2

Every space component value in the codebase (1,2,3,4,5,6,7,8,9,10,11,12,14,16,
18,20,22,24,28,32,36,40 px) now has a token. No new root knob is needed to
finish the space axis.

## WHAT IS LEFT — 114 raw declarations, by file

    24  src/surfaces/comp-builder.js
    18  tools/beat.html
    13  src/ui/shell.js
    10  src/instruments/drum-sampler.js
    10  src/surfaces/piano-roll.js
     9  src/surfaces/scale-circle.js
     8  src/surfaces/step-grid.js
     5  src/instruments/drum-synth.js
     5  src/surfaces/keyboard.js
     5  src/surfaces/diatonic-keys.js
     5  tools/harmony.html
     2  src/instruments/overtone-synth.js

Excludes `0` and `1` values, which stay literal. Add the 6 canvas font sites.
DONE and needing nothing: chord-module.js, wave-synth.js, and the three
tools/*.html leaf files.

Regenerate this list with the property scan over the 18 files in sweep.py's
`SCAN_FILES`, skipping values that are already fully `var()`.

## OUT OF MAP SCOPE, NEVER COUNTED BY ANYONE

`padding-left`, `padding-top`, `margin-top`, `margin-bottom`, `outline-offset`,
`min-height`, `width`, `height`, `inset`, `stroke-dasharray` all still carry
literals. token-map.json's property list does not cover them and neither did
S1's 897. If the goal is "no literal anywhere", that is a separate measured
pass, not a continuation of this one.

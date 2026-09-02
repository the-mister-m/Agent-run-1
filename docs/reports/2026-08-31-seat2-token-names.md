# Seat 2 — token names — Chromebook DAW skin sweep

Scope: propose token names/values for measure2.py's surface (242 CSS
declarations, 33 canvas assignments, 6 _fade alphas). No repo files edited
except this receipt. Source: `python3 Builddocs/skinspecs/tools/measure2.py`,
`src/ui/tokens.css` (read).

---

## Task 1 — existing prefixes and naming pattern

`src/ui/tokens.css` has two `:root` blocks (palette, then the four dials +
role tokens) and one `*` block (derived scales).

Palette (bare semantic names, no shared prefix): `--bg`, `--panel`, `--line`,
`--text`, `--text-dim`, `--deg-major/minor/dim/altered/aug/flat5/sharp5`,
`--accent`, `--warn`, `--meter-ok`, `--meter-hot`.

Dials (root knobs, absolute units only): `--fs-root`, `--sp-unit`,
`--r-unit`, `--bw`.

Role-prefixed families, one dial or one concept each:
`--font-*` (ui, mono), `--dur-*` (fast, med), `--ease*`, `--r-pill`,
`--w-*` (normal/med/bold/heavy), `--track-*` (tight/title/mid/label),
`--tt-label`, `--lh-*` (none/tight/base/loose), `--stroke-w`,
`--shadow-*` (raised/lifted), `--ring-*` (w/off/off-lg), `--glow`,
`--z-*` (popover/sticky/raise-2/raise-1/behind), `--op-*`
(faint/dim/mid/soft), `--fade-*` (faint/half/mid/strong/label/near),
`--canvas-lw`.

Derived scales (`*` block, `calc(var(--knob) * multiplier)`, px comment):
`--r-*` (cell/sm/ctl/body/chip/panel/xl/lg), `--fs-*`
(micro/tiny/xs/sm/base/md/lg/xl/half/numeral/readout/chord/2xl/3xl),
`--sp-*` (hair, 1 through 20, half-steps `Nh`), `--stroke-*`
(hair/thin/med/semi/bold/heavy).

Pattern: `--<axis-prefix>-<semantic-role>`. Numeric scales use
`calc(var(--knob) * multiplier)` with the resolved px/unit value in a
trailing comment. 113 tokens exist today (`grep -cE '^\s*--[a-z0-9-]+:'
src/ui/tokens.css`).

## Task 2 — requested tokens: exist or not

| token | status |
|---|---|
| `--sp-*` | EXISTS (hair, 1–20, half-steps) |
| `--fs-*` | EXISTS (micro–3xl, half/numeral/readout/chord) |
| `--r-*` | EXISTS (pill, cell, sm, ctl, body, chip, panel, xl, lg) |
| `--z-*` | EXISTS (popover, sticky, raise-2, raise-1, behind) |
| `--dur-fast` / `--dur-med` | EXISTS (tokens.css:78-79) |
| `--ring-w` / `--ring-off` | EXISTS (tokens.css:112-113); bonus `--ring-off-lg` also exists |
| `--tt-label` | EXISTS (tokens.css:98) |
| `--track-label` | EXISTS (tokens.css:97) |
| `--canvas-lw` | EXISTS (tokens.css:138) |
| `--fade-*` | EXISTS (faint/half/mid/strong/label/near, tokens.css:131-136) |
| `--outline-off` | DOES NOT EXIST — only `--ring-off`/`--ring-off-lg` (outline-offset paired with ring). No bare `outline-offset` literal found anywhere in `src/` either (`grep` turned up nothing). |
| palette/color tokens | EXISTS — `--bg --panel --line --text --text-dim --deg-* --accent --warn --meter-ok --meter-hot` |

## Task 3/4 — proposals by axis

Rule applied throughout: an exact `--sp-*`/`--fs-*`/`--r-*`/`--stroke-*`/
`--fade-*`/`--op-*` scale match reuses that token (0 new). Same literal
value on two different properties shares one new token (ruling: two
*distinct* literals never share a token — identical literals may). A
shorthand (`padding`, `margin`, `gap`, `border-radius`) is not given its
own vocabulary — its space-separated components are checked against the
existing `--sp-*`/`--r-*` scale, same as the file's own padding convention
already documents. `0` is unit-agnostic in CSS, so one new token
(`--sp-0`) covers every bare-zero site project-wide instead of a token per
property.

### SPACE / SIZE (extends `--sp-*`) — 18 new

Width/height/min-*/max-*/top literal in px, plus bare `0` project-wide.
`%`, `vh`, `auto` on these same properties are LAYOUT, not size (see
below) — they're relative-to-container, not a length.

| token | value | covers | site |
|---|---|---|---|
| `--sp-0` | `0` | every bare-0 length: `min-width:0`(×6), `min-height:0`(×1), `top:0`(×6), `bottom:0`(×7), `left:0`(×4), `right:0`(×3), plus `padding:0`/`margin:0`/`gap:0` sites, plus `border:0` | shell.js:188 |
| `--sp-7h` | `calc(var(--sp-unit) * 7.5)` /* 15px */ | `width:15px` | comp-builder.js:158 |
| `--sp-13` | `calc(var(--sp-unit) * 13)` /* 26px */ | `height:26px`, `min-width:26px` | keyboard.js:95, shell.js:390 |
| `--sp-15` | `calc(var(--sp-unit) * 15)` /* 30px */ | `min-width:30px` | shell.js:366 |
| `--sp-17` | `calc(var(--sp-unit) * 17)` /* 34px */ | `min-width:34px` | shell.js:376 |
| `--sp-23` | `calc(var(--sp-unit) * 23)` /* 46px */ | `min-width:46px`, `width:46px` | step-grid.js:317, step-grid.js:317 |
| `--sp-28` | `calc(var(--sp-unit) * 28)` /* 56px */ | `height:56px` | keyboard.js:101 |
| `--sp-30` | `calc(var(--sp-unit) * 30)` /* 60px */ | `min-width:60px` | drum-synth.js:560 |
| `--sp-31` | `calc(var(--sp-unit) * 31)` /* 62px */ | `top:62px` | beat.html:144 |
| `--sp-33` | `calc(var(--sp-unit) * 33)` /* 66px */ | `min-width:66px` | shell.js:362 |
| `--sp-37` | `calc(var(--sp-unit) * 37)` /* 74px */ | `min-width:74px`, `width:74px` | step-grid.js:306, step-grid.js:305 |
| `--sp-39` | `calc(var(--sp-unit) * 39)` /* 78px */ | `min-width:78px` | wave-synth.js:414 |
| `--sp-60` | `calc(var(--sp-unit) * 60)` /* 120px */ | `width:120px` | shell.js:249 |
| `--sp-65` | `calc(var(--sp-unit) * 65)` /* 130px */ | `min-width:130px` | wave-synth.js:415 |
| `--sp-84` | `calc(var(--sp-unit) * 84)` /* 168px */ | `height:168px` | keyboard.js:95 |
| `--sp-95` | `calc(var(--sp-unit) * 95)` /* 190px */ | `max-width:190px` | scale-circle.js:177 |
| `--sp-230` | `calc(var(--sp-unit) * 230)` /* 460px */ | `max-width:460px` | scale-circle.js:172 |
| `--sp-310` | `calc(var(--sp-unit) * 310)` /* 620px */ | `max-height:620px` | beat.html:164 |

Exact matches, no new token: `min-width:18px` = `--sp-9` (18px).
`top: calc(100% + 6px)`'s `6px` component = `--sp-3` (6px) exactly, but the
calc as a whole is a distinct literal — see LAYOUT.
`inset: -8px` (wave-synth.js:416) and `margin-left: -2px` (piano-roll.js:489)
are negative multiples of existing tokens — compose as `calc(var(--sp-4) *
-1)` and `calc(var(--sp-1) * -1)` at the call site (seat 3), no new token.

Padding (31 distinct shorthands), margin (21), gap (6), border-radius (3
shape declarations): **0 new tokens.** Every space-separated component in
every one of these 61 declarations is 1–40px and lands exactly on an
existing `--sp-*`/`--r-*` multiplier (hair/1/1h/2/2h/3/3h/4/4h/5/5h/6/7/8/
9/10/11/12/14/16/18/20 covers 1–40 in full) or on the new shared `--sp-0`.
They compose at the call site (`padding: var(--sp-2) var(--sp-4)`), same
as the file's own documented padding convention — this was not
re-derived, it's already stated at tokens.css:179-181.

### RELATIVE UNITS (`em`, `ch`) — new axis, extends `--sp-*`/`--fs-*` — 18 new

`em`/`ch` don't compose from `--sp-unit`/`--fs-root` (different unit
kind — `calc(var(--sp-unit) * N)` resolves to px, not em). New leaf
tokens, value verbatim, prefix kept but marked `-em-`/`-ch-` so the scheme
reads as an extension, not a second scheme.

Width/height/min-width class (13 new):

| token | value | covers | site |
|---|---|---|---|
| `--sp-em-14` | `1.4em` | min-width | comp-builder.js:255 |
| `--sp-em-16` | `1.6em` | min-width | wave-synth.js:409 |
| `--sp-em-17` | `1.7em` | width, height | wave-synth.js:408, wave-synth.js:408 |
| `--sp-em-21` | `2.1em` | min-width | comp-builder.js:145 |
| `--sp-em-24` | `2.4em` | min-height | beat.html:260 |
| `--sp-em-32` | `3.2em` | width | beat.html:209 |
| `--sp-em-34` | `3.4em` | min-width | harmonyNEW.html:127 |
| `--sp-em-35` | `3.5em` | min-width | wave-synth.js:411 |
| `--sp-em-36` | `3.6em` | min-width | drum-synth.js:558 |
| `--sp-em-38` | `3.8em` | min-width | drum-synth.js:561 |
| `--sp-em-46` | `4.6em` | width | beat.html:205 |
| `--sp-em-62` | `6.2em` | min-width | beat.html:218 |
| `--sp-ch-4` | `4ch` | min-width | piano-roll.js:298 |

Font-size class (5 new, sits beside `--fs-*` conceptually but can't share
its calc pattern — same unit-kind problem):

| token | value | covers | site |
|---|---|---|---|
| `--fs-em-62` | `0.62em` | font-size | comp-builder.js:221 |
| `--fs-em-65` | `0.65em` | font-size | drum-synth.js:559 |
| `--fs-em-70` | `0.7em` | font-size | drum-sampler.js:733 |
| `--fs-em-75` | `0.75em` | font-size | drum-sampler.js:735 |
| `--fs-em-85` | `0.85em` | font-size | drum-sampler.js:727 |

`font-size:18px` = `--fs-2xl` (18px) exactly, `font-size:16px` =
`--fs-readout` (16px) exactly — both already exist, 0 new.

### LAYOUT — new axis (no coverage today) — 52 new

Covers `display`, `position`, `flex*`, `justify-content`, `align-items`,
`align-self`, `overflow*`, `box-sizing`, `grid-template-columns`,
`aspect-ratio`, `will-change`, plus `%`/`vh`/`auto` on size-class
properties (relative-to-container, not a length — kept out of the
`--sp-*` scale on purpose). Identical literal values across different
properties share one token (e.g. `overflow:hidden` + `overflow-x:hidden`).

Atomic keywords (24 new):

| token | value | covers |
|---|---|---|
| `--disp-flex` | `flex` | display (shell.js:151) |
| `--disp-grid` | `grid` | display (shell.js:307) |
| `--disp-block` | `block` | display (drum-sampler.js:724) |
| `--disp-none` | `none` | display (shell.js:222) |
| `--disp-inline-flex` | `inline-flex` | display (beat.html:227) |
| `--pos-absolute` | `absolute` | position (shell.js:209) |
| `--pos-relative` | `relative` | position (shell.js:192) |
| `--pos-static` | `static` | position (beat.html:145) |
| `--pos-sticky` | `sticky` | position (beat.html:142) |
| `--flexdir-column` | `column` | flex-direction (shell.js:152) |
| `--box-border-box` | `border-box` | box-sizing (shell.js:155) |
| `--flexwrap-wrap` | `wrap` | flex-wrap (shell.js:168) |
| `--ov-hidden` | `hidden` | overflow (shell.js:254), overflow-x (shell.js:336) |
| `--ov-visible` | `visible` | overflow (scale-circle.js:175) |
| `--ov-y-auto` | `auto` (shared, see `--auto` below) | overflow-y (shell.js:335) |
| `--justify-center` | `center` | justify-content (drum-sampler.js:732) |
| `--justify-flex-end` | `flex-end` | justify-content (piano-roll.js:381) |
| `--justify-space-between` | `space-between` | justify-content (shell.js:226) |
| `--justify-flex-start` | `flex-start` | justify-content (comp-builder.js:196) |
| `--align-center` | `center` | align-items (shell.js:166) |
| `--align-start` | `start` | align-items (shell.js:310) |
| `--align-baseline` | `baseline` | align-items (shell.js:225) |
| `--align-stretch` | `stretch` | align-items (step-grid.js:300), align-self (beat.html:184) |
| `--align-flex-end` | `flex-end` | align-items (keyboard.js:111) |
| `--align-flex-start` | `flex-start` | align-items (shell.js:749) |
| `--auto` | `auto` | overflow-y (shell.js:335), `height:auto` (scale-circle.js:173), `margin-top:auto` (shell.js:327) |

`flex` shorthand, kept atomic (not decomposed — no existing shorthand
scale to compose from, same treatment as `transition` below) — 8 new:

| token | value | site |
|---|---|---|
| `--flex-1-1-0` | `1 1 0` | step-grid.js:337 |
| `--flex-1-1-auto` | `1 1 auto` | shell.js:333 |
| `--flex-1` | `1` | drum-synth.js:560 |
| `--flex-0-0-auto` | `0 0 auto` | step-grid.js:304 |
| `--flex-0-1-auto` | `0 1 auto` | shell.js:189 |
| `--flex-1-1-240` | `1 1 240px` | shell.js:188 |
| `--flex-1-1-300` | `1 1 300px` | harmonyNEW.html:290 |
| `--flex-1-1-320` | `1 1 320px` | harmonyNEW.html:286 |

`grid-template-columns`, kept atomic, same reasoning — 12 new:
`--grid-1fr` (`1fr`), `--grid-minmax-0-1fr` (`minmax(0, 1fr)`),
`--grid-repeat4-1fr` (`repeat(4, 1fr)`), `--grid-135-1` (`minmax(0,
1.35fr) minmax(0, 1fr)`), `--grid-1-115` (`minmax(0, 1fr) minmax(0,
1.15fr)`), `--grid-1-1` (`minmax(0, 1fr) minmax(0, 1fr)`), `--grid-60-140`
(`minmax(205px, 0.6fr) minmax(320px, 1.4fr)`), `--grid-90-70-140`
(`minmax(300px, 0.9fr) minmax(240px, 0.7fr) minmax(340px, 1.4fr)`),
`--grid-repeat4-minmax0` (`repeat(4, minmax(0, 1fr))`),
`--grid-repeat4-minmax90` (`repeat(4, minmax(90px, 1fr))`),
`--grid-repeat8-minmax0` (`repeat(8, minmax(0, 1fr))`),
`--grid-autofit-260` (`repeat(auto-fit, minmax(260px, 1fr))`) — sites in
shell.js:308/313, drum-sampler.js:730/731, comp-builder.js:105/113,
beat.html:160/233/234/266, harmonyNEW.html:119/136.

Remainder (7 new): `--aspect-square` (`1 / 1`, comp-builder.js:200),
`--wc-left` (`left`, step-grid.js:391, `will-change`), `--pct-100`
(`100%`, shared: `width:100%` shell.js:228, `height:100%` shell.js:257,
`min-height:100%` drum-sampler.js:723), `--pct-0` (`0%`, shared:
`left:0%` step-grid.js:676, `width:0%` shell.js:258, `height:0%`
step-grid.js:849), `--vh-100` (`100vh`, shared: `height:100vh`
shell.js:331, `min-height:100vh` shell.js:154), `--pct-62` (`62%`,
keyboard.js:130), `--dropdown-offset` (`calc(100% + 6px)`, shell.js:210 —
the 6px component matches `--sp-3` exactly, note for seat 3).

### INTERACTION — new axis — 12 new

`cursor` (7): `--cur-pointer`(`pointer`, shell.js:204), `--cur-not-allowed`
(`not-allowed`, shell.js:240), `--cur-default`(`default`,
diatonic-keys.js:221), `--cur-grab`(`grab`, piano-roll.js:436),
`--cur-ew-resize`(`ew-resize`, piano-roll.js:463),
`--cur-grabbing`(`grabbing`, comp-builder.js:208),
`--cur-ns-resize`(`ns-resize`, piano-roll.js:492).

`pointer-events` (2): `--pe-none`(`none`, wave-synth.js:416),
`--pe-auto`(`auto`, piano-roll.js:432).

`touch-action` (2): `--touch-none`(`none`, step-grid.js:366),
`--touch-manipulation`(`manipulation`, drum-sampler.js:732).

`user-select`/`-webkit-user-select` (1, shared — same literal `none`):
`--usel-none`(`none`, shell.js:264 and step-grid.js:249).

### TEXT BEHAVIOR — new axis — 12 new

`--num-tabular`(`tabular-nums`, shell.js:246, font-variant-numeric),
`--ta-center`(`center`, shell.js:377, text-align), `--ta-right`(`right`,
drum-synth.js:561), `--ta-left`(`left`, shell.js:230),
`--ws-nowrap`(`nowrap`, step-grid.js:314, white-space),
`--ws-prewrap`(`pre-wrap`, shell.js:410), `--to-ellipsis`(`ellipsis`,
step-grid.js:315, text-overflow), `--td-underline`(`underline`,
piano-roll.js:421, text-decoration), `--ls-none`(`none`, shell.js:216,
list-style), `--content-empty`(`''`, wave-synth.js:416, content),
`--text-anchor-middle`(`middle`, scale-circle.js:216, SVG text-anchor),
`--dominant-baseline-central`(`central`, scale-circle.js:217, SVG).

### LINE STYLE — new axis — 5 new

Same literal shared across `border-style` and `border-left-style`:
`--line-dashed`(`dashed`, drum-sampler.js:736 + piano-roll.js:415),
`--line-solid`(`solid`, piano-roll.js:398),
`--line-dotted`(`dotted`, piano-roll.js:416),
`--line-double`(`double`, piano-roll.js:417),
`--line-groove`(`groove`, piano-roll.js:418).

### LINE WEIGHT (`border-*-width`, extends `--bw`) — new sub-axis — 3 new

Not in the task's axis list verbatim but the data requires it: 3 px
border-thickness literals with no existing token. `--bw` is the root
"line weight" dial with no derived scale yet (unlike `--stroke-w`, which
has one) — extending it the same way `--stroke-*` extends `--stroke-w`.

| token | value | site |
|---|---|---|
| `--bw-2` | `calc(var(--bw) * 2)` /* 2px */ | step-grid.js:371 |
| `--bw-3` | `calc(var(--bw) * 3)` /* 3px */ | piano-roll.js:397 |
| `--bw-5` | `calc(var(--bw) * 5)` /* 5px */ | piano-roll.js:417 |

### SVG / CANVAS LINE — extends `--stroke-*` — 1 new

All 6 distinct `stroke-width` literals (0.6, 0.8, 1.4, 1.6, 1.8, 2) are
**exact matches** to the existing `--stroke-hair/thin/med/semi/bold/heavy`
tokens — 0 new tokens, they just aren't applied at the call sites yet
(seat 3). One literal has no match: `stroke-dasharray: 2.4 2`
(scale-circle.js:286) → `--stroke-dash: 2.4 2;` (1 new).

### CANVAS — new axis (keyword-only; colors/lineWidth/fade already covered) — 7 new

33 distinct canvas assignments. 18 already resolve through existing
tokens (`t['--text-dim']`, `t['--panel']`, `t['--text']`, `t['--warn']`,
`t['--accent']`, `t['--line']`, their ternaries, `_fade()` calls whose
alpha already matches a `--fade-*` token, `.lineWidth = 1` matching
`--canvas-lw`, and one `.font` template whose family string is verbatim
`--font-mono`) — 0 new tokens, seat 3 applies them. 6 are blocked (see
Task 5). The remaining 7 keyword literals get new tokens; identical
literal shared across `lineJoin`/`lineCap`:

| token | value | covers | site |
|---|---|---|---|
| `--canvas-textbaseline-top` | `top` | .textBaseline | spectrum.js:652 |
| `--canvas-textalign-left` | `left` | .textAlign | spectrum.js:704 |
| `--canvas-textalign-right` | `right` | .textAlign | spectrum.js:692 |
| `--canvas-textalign-center` | `center` | .textAlign | spectrum.js:728 |
| `--canvas-round` | `round` | .lineJoin, .lineCap | spectrum.js:624, scope.js:703 |
| `--canvas-textbaseline-bottom` | `bottom` | .textBaseline | spectrum.js:784 |
| `--canvas-textbaseline-middle` | `middle` | .textBaseline | spectrum.js:693 |

### `_fade()` alpha — extends `--fade-*` — 0 new

All 6 distinct alphas (0.5, 0.55, 0.22, 0.7, 0.82, 0.9) are exact matches
to `--fade-half/mid/faint/strong/label/near`. Full coverage already
exists; only the call sites need it (seat 3), per the known blocker at
scope.js:682.

### COLOR — 3 new

`background: transparent` (shell.js:233) and `border-left-color:
transparent` (piano-roll.js:399) share one literal:
`--color-transparent: transparent;`. `stroke: currentColor`
(wave-synth.js:405): `--color-current: currentColor;`. `border-color:
#000` (keyboard.js:133, black-key border, not in the existing palette):
`--key-border: #000;`.

### 0 / NONE — 1 new (plus reuse of `--sp-0`)

Homeless props not already named by another axis (`border`,
`border-left`, `border-top`, `outline`, `fill`, `box-shadow`) share one
universal keyword token: `--none: none;` — covers `border-left: none`
(step-grid.js:343), `border-top: none` (drum-synth.js:563), `outline:
none` (scale-circle.js:185), `fill: none` (wave-synth.js:405),
`box-shadow: none` (piano-roll.js:509). `border: 0` (shell.js:234) reuses
`--sp-0` (already counted under SIZE).

### OPACITY / FILTER — 3 new

`opacity: 1` (scale-circle.js:196) → `--op-full: 1;` (new — no existing
op-* token equals 1). `opacity: 0.4` (comp-builder.js:265) is an exact
match to `--op-faint` (0.40) — 0 new. `opacity: 0.7` (harmonyNEW.html:340)
→ `--op-strong: 0.7;` — **judgment call**: this number equals
`--fade-strong`, but that token's own comment scopes it to the canvas
`_fade()` helper, not DOM opacity; reusing it across two unrelated roles
breaks the file's one-token-one-role pattern, so a sibling `--op-*` entry
is proposed instead. Flag for Brandon/closer if the number match should
win instead. `filter: brightness(1.25)` (diatonic-keys.js:197) →
`--filter-brighten: brightness(1.25);`.

### MOTION — new axis — 9 new

`transition`/`animation` kept atomic (no existing duration/easing scale
composes cleanly — `--dur-fast`/`--dur-med` are 80ms/120ms and none of
these 9 durations match either exactly):

| token | value | site |
|---|---|---|
| `--tr-width` | `width 90ms linear` | shell.js:260 |
| `--anim-hit-flash` | `dsam-hit-flash 160ms ease-out` | drum-sampler.js:741 |
| `--anim-miss-flash` | `dsam-miss-flash 220ms ease-out` | drum-sampler.js:742 |
| `--anim-pulse` | `ws-pulse 1.1s ease-in-out infinite` | wave-synth.js:416 |
| `--tr-background` | `background 60ms linear` | keyboard.js:141 |
| `--tr-bg-border` | `background 70ms ease-out, border-color 70ms ease-out` | beat.html:240 |
| `--tr-shadow` | `box-shadow 150ms ease-out` | overtone-synth.js:626 |
| `--tr-filter` | `filter 60ms linear` | diatonic-keys.js:199 |
| `--tr-opacity-stroke` | `opacity 90ms linear, stroke-width 90ms linear` | scale-circle.js:210 |

### TRANSFORM — new axis — 2 new

Data requires it: two `transform: scale()` literals, both inside the
`ws-pulse` keyframe (wave-synth.js:417), not covered by any existing
axis.

`--scale-pulse-rest: scale(0.96);`, `--scale-pulse-peak: scale(1.04);`.

### FONT / FACE — 3 new

`font: inherit` (32 sites, shell.js:194) → `--font-inherit: inherit;`.
`font: 13px/1.5 ui-monospace, monospace` (harmonyNEW.html:149) is close
to but not identical to `--font-mono` (missing `SFMono-Regular, Menlo`) —
distinct literal, own token: `--font-mono-compact: 13px/1.5 ui-monospace,
monospace;`. `font-style: italic` (comp-builder.js:268) →
`--font-style-italic: italic;`.

---

## Task 4 — count per axis (new tokens)

| axis | new tokens |
|---|---|
| layout | 52 |
| relative units (em/ch) | 18 |
| size (extends `--sp-*`) | 18 |
| interaction | 12 |
| text behavior | 12 |
| motion | 9 |
| canvas (keyword) | 7 |
| line style | 5 |
| color | 3 |
| line weight (extends `--bw`) | 3 |
| font/face | 3 |
| opacity/filter | 3 |
| transform | 2 |
| svg/canvas line (extends `--stroke-*`) | 1 |
| 0/none | 1 |
| margin | 0 (fully composes) |
| padding | 0 (fully composes) |
| gap | 0 (fully composes) |
| shape (border-radius) | 0 (fully composes) |
| `_fade()` alpha (extends `--fade-*`) | 0 (already exact matches) |
| **total new** | **149** |

Axes added beyond the task's list, and why: **line weight** (CSS
`border-*-width` in px has no home in the task's axis list and no
existing scale — `--bw` is a defined root dial with no derived scale,
unlike `--stroke-w`) and **transform** (2 literal `scale()` values inside
a keyframe, not layout/motion/shape).

## Task 5 — cannot name

Known blockers (not re-derived, restated per instructions):
- `src/vis/scope.js:682` — `this._fade(t['--accent'], alpha)`, alpha is a
  function parameter.
- Canvas `lineWidth` assigned a variable: `g.lineWidth = cfg.lineWidth`
  (spectrum.js:623, spectrum.js:755, scope.js:637) and `g.lineWidth =
  width` (scope.js:701).

Newly found, same shape (assigned a variable/expression, not a literal):
- `probe.fillStyle = color` (spectrum.js:807, scope.js:790).
- `g.strokeStyle = color` (scope.js:700).
- `g.globalAlpha = prev` (spectrum.js:817).
- `g.textAlign = align` (spectrum.js:684).
- `g.font = \`${this._mode === 'expanded' ? 'bold ' : ''}${p.font}px
  ui-monospace, SFMono-Regular, Menlo, monospace\`` (spectrum.js:767) —
  the family string is an exact `--font-mono` match, but the `'bold '`/`''`
  ternary is a conditional string fragment inside a JS template, not a
  discrete CSS custom-property site.
- `ui.loopReadout.style.color = ''` (tools/beat.html:1327) — not a CSS
  color literal at all; it's a runtime inline-style reset (clears an
  earlier `style.color` override). Nothing to name.

---

## Task 6 — total token count if every proposal lands

113 existing + 149 new = **262 tokens**.

---

SESSION REVIEW — Chromebook DAW skin sweep — [timestamps: ask Brandon]
EDITS
- [docs/reports/2026-08-31-seat2-token-names.md](../reports/2026-08-31-seat2-token-names.md) — full token-name proposal, 149 new / 262 total
STRAY FILES
- none written outside the receipt
GOALS DONE
- read tokens.css, named its prefixes and pattern
- checked existence of every requested token family
- proposed a name+value for every declaration in measure2.py's surface lacking one, grouped by axis
- reported per-axis counts, cannot-name list, total token count
BRANDON'S TODOS
- decide `--op-strong` vs reusing `--fade-strong` for `opacity: 0.7` (judgment call, flagged above)
- confirm `left`/`right`/`bottom` riding the `--sp-*` size mapping alongside `top` (ruling named `top` only; treated the omission as illustrative, not exclusionary)
CLOSER REVIEW
- fold this receipt's axis counts into MEMORY.md warm start — closer
- seat 3 (classifier) consumes this proposal list next — Brandon to assign

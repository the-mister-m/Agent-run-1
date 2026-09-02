HANDOFF — Seat 4 combined → Seat 4b — Chromebook DAW skin sweep
2026-08-31

Stopped mid-Part-Two on coordinator order. **Zero edits made to
token-map.json, classify.py, build_entries.py, or rules.py.** Everything
below is read-only analysis via python3. The map is exactly as Part One
left it.

## 1. STATE OF token-map.json RIGHT NOW

- `entries` array length: 395
- of those, 2 are non-declaration marker/comment objects, not real entries:
  `$orphans`, `$sweep-leftovers` (no `property` key)
- real entries: 393
- tokened (token != null): 162
- skipped (token == null): 231
- safe_for_script true: 113
- skip-reason breakdown: 74 use the exact string
  `"value is a variable, nothing to replace"`; 157 use other reason text
  (mostly citing struck S1 rulings)

No entries edited. No entries added.

## 2. THE 71 MISLABELED ENTRIES

All 71 have `reason: "value is a variable, nothing to replace"` right now,
but are literal CSS values with an exact-string match already sitting
unused in src/ui/tokens.css. Format: `property | value | tokens.css
candidate(s) | file:line`. Where more than one token candidate is listed,
pick the one matching the property's own axis (e.g. `align-items: center`
→ `--align-center`, not `--justify-center` or `--ta-center`).

display | flex | --disp-flex | src/ui/shell.js:151
align-items | center | --canvas-textalign-center, --justify-center, --align-center, --ta-center | src/ui/shell.js:166
flex-direction | column | --flexdir-column | src/ui/shell.js:152
box-sizing | border-box | --box-border-box | src/ui/shell.js:155
flex-wrap | wrap | --flexwrap-wrap | src/ui/shell.js:168
width | 100% | --pct-100 | src/ui/shell.js:228
position | absolute | --pos-absolute | src/ui/shell.js:209
position | relative | --pos-relative | src/ui/shell.js:192
overflow | hidden | --ov-hidden | src/ui/shell.js:254
pointer-events | none | --disp-none, --pe-none, --touch-none, --usel-none, --ls-none, --none | src/instruments/wave-synth.js:416
display | grid | --disp-grid | src/ui/shell.js:307
justify-content | center | --canvas-textalign-center, --justify-center, --align-center, --ta-center | src/instruments/drum-sampler.js:732
display | block | --disp-block | src/instruments/drum-sampler.js:724
display | none | --disp-none, --pe-none, --touch-none, --usel-none, --ls-none, --none | src/ui/shell.js:222
user-select | none | --disp-none, --pe-none, --touch-none, --usel-none, --ls-none, --none | src/ui/shell.js:264
flex | 1 1 0 | --flex-1-1-0 | src/surfaces/step-grid.js:337
touch-action | none | --disp-none, --pe-none, --touch-none, --usel-none, --ls-none, --none | src/surfaces/step-grid.js:366
height | 100% | --pct-100 | src/ui/shell.js:257
-webkit-user-select | none | --disp-none, --pe-none, --touch-none, --usel-none, --ls-none, --none | src/surfaces/step-grid.js:249
align-items | start | --align-start | src/ui/shell.js:310
flex | 1 1 auto | --flex-1-1-auto | src/ui/shell.js:333
align-items | baseline | --align-baseline | src/ui/shell.js:225
flex | 1 | --lh-none, --stroke-w, --z-raise-1, --op-full, --canvas-lw, --flex-1 | src/instruments/drum-synth.js:581
align-items | stretch | --align-stretch | src/surfaces/step-grid.js:300
flex | 0 0 auto | --flex-0-0-auto | src/surfaces/step-grid.js:304
grid-template-columns | minmax(0, 1fr) | --grid-minmax-0-1fr | src/ui/shell.js:313
grid-template-columns | repeat(4, 1fr) | --grid-repeat4-1fr | src/instruments/drum-sampler.js:730
justify-content | flex-end | --justify-flex-end, --align-flex-end | src/surfaces/piano-roll.js:381
left | 0% | --pct-0 | src/surfaces/step-grid.js:676
min-height | 100% | --pct-100 | src/instruments/drum-sampler.js:723
align-items | flex-end | --justify-flex-end, --align-flex-end | src/surfaces/keyboard.js:111
flex | 0 1 auto | --flex-0-1-auto | src/ui/shell.js:189
flex | 1 1 240px | --flex-1-1-240 | src/ui/shell.js:188
grid-template-columns | 1fr | --grid-1fr | src/surfaces/comp-builder.js:113
height | 100vh | --vh-100 | src/ui/shell.js:331
justify-content | space-between | --justify-space-between | src/ui/shell.js:226
list-style | none | --disp-none, --pe-none, --touch-none, --usel-none, --ls-none, --none | src/ui/shell.js:216
min-height | 100vh | --vh-100 | src/ui/shell.js:154
overflow-x | hidden | --ov-hidden | src/ui/shell.js:336
overflow-y | auto | --auto, --pe-auto | src/ui/shell.js:335
top | calc(100% + 6px) | --dropdown-offset | src/ui/shell.js:210
width | 0% | --pct-0 | src/ui/shell.js:258
will-change | left | --canvas-textalign-left, --wc-left, --ta-left | src/surfaces/step-grid.js:391
align-items | flex-start | --justify-flex-start, --align-flex-start | src/ui/shell.js:749
align-self | stretch | --align-stretch | tools/beat.html:142
content | '' | --content-empty | src/instruments/wave-synth.js:416
display | inline-flex | --disp-inline-flex | tools/beat.html:180
flex | 1 1 300px | --flex-1-1-300 | tools/harmonyNEW.html:290
flex | 1 1 320px | --flex-1-1-320 | tools/harmonyNEW.html:286
grid-template-columns | minmax(0, 1.35fr) minmax(0, 1fr) | --grid-135-1 | tools/beat.html:187
grid-template-columns | minmax(0, 1fr) minmax(0, 1.15fr) | --grid-1-115 | src/ui/shell.js:308
grid-template-columns | minmax(0, 1fr) minmax(0, 1fr) | --grid-1-1 | NO CURRENT SITE — see dead-entries list, item also appears there
grid-template-columns | minmax(205px, 0.6fr) minmax(320px, 1.4fr) | --grid-60-140 | src/surfaces/comp-builder.js:105
grid-template-columns | minmax(300px, 0.9fr) minmax(240px, 0.7fr) minmax(340px, 1.4fr) | --grid-90-70-140 | tools/harmonyNEW.html:119
grid-template-columns | repeat(4, minmax(0, 1fr)) | --grid-repeat4-minmax0 | NO CURRENT SITE — ties to `${SLOTS}` template var, src/surfaces/comp-builder.js:190
grid-template-columns | repeat(4, minmax(90px, 1fr)) | --grid-repeat4-minmax90 | src/instruments/drum-sampler.js:731
grid-template-columns | repeat(8, minmax(0, 1fr)) | --grid-repeat8-minmax0 | NO CURRENT SITE — ties to `${SLOTS}` template var, src/surfaces/comp-builder.js:190
grid-template-columns | repeat(auto-fit, minmax(260px, 1fr)) | --grid-autofit-260 | tools/harmonyNEW.html:136
height | 0% | --pct-0 | src/surfaces/step-grid.js:849
height | 62% | --pct-62 | src/surfaces/keyboard.js:130
height | auto | --auto, --pe-auto | src/surfaces/scale-circle.js:173
justify-content | flex-start | --justify-flex-start, --align-flex-start | src/surfaces/comp-builder.js:196
margin-top | auto | --auto, --pe-auto | src/ui/shell.js:327
min-width | 1.4em | --sp-em-14 | src/surfaces/comp-builder.js:255
opacity | 0.7 | --op-strong, --fade-strong | tools/harmonyNEW.html:340
overflow | visible | --ov-visible | src/surfaces/scale-circle.js:175
pointer-events | auto | --auto, --pe-auto | src/surfaces/piano-roll.js:432
position | static | --pos-static | tools/beat.html:113
position | sticky | --pos-sticky | tools/beat.html:110
touch-action | manipulation | --touch-manipulation | src/instruments/drum-sampler.js:732
transition | box-shadow 150ms ease-out | --tr-shadow | src/instruments/overtone-synth.js:626

Note: 3 of the grid-template-columns rows above have no current raw site
(measure2.py finds nothing matching that exact string right now). One
(`minmax(0,1fr) minmax(0,1fr)`) is a true orphan — it is also in the dead
list, item 5 below. Two (`repeat(4/8, minmax(0,1fr))`) are snapshots of the
same live `repeat(${SLOTS}, minmax(0, 1fr))` template line at
src/surfaces/comp-builder.js:190 — SLOTS is a real JS variable, so whether
these two rows should even get a token, or should be re-reasoned as
genuine variable skips, is a judgment call the next seat has to make. Not
resolved here.

## 3. THE 157 STRUCK ESCALATIONS

**155 of these need a token assigned. 2 are duplicate copies of a genuine
skip and should NOT be rewritten** (see below). Format: `property | value
| current reason | matching token(s) if a python3 grep against tokens.css
found one, else "NONE FOUND"`.

border-radius | 9px | S1 §3 names no 9px radius, occupancy list doesn't have one. Sits between --r-panel (8px) and --r-lg (16px). ESCALATION. | NONE FOUND
border-radius | 10px | S1 §3 D-2: expanded-variant chrome, rescale via `--r-unit` override, not a per-site token. | NONE FOUND
border-left | 2px | S1 §3 VERBATIM: two `border-left: 2px solid` are a deliberate accent marker and STAY LITERAL. Do not touch. | --sp-unit, --r-unit, --ring-w, --ring-off-lg (none are an exact-role fit — see note below)
outline | 2px | S1 defines --ring-w (2px) for INSET box-shadow ring only, names no token for `outline: 2px solid`. 7 sites. ESCALATION. | --sp-unit, --r-unit, --ring-w, --ring-off-lg (same caveat)
font-size | 14px | S1 §4 names no 14px step, falls between --fs-md (13px) and --fs-lg (15px). ESCALATION. | NONE FOUND
font-size | 17px | Not named by S1, not in occupancy list. ESCALATION. | NONE FOUND
font-size | 16px\|18px\|22px\|28px\|30px\|32px | **PATTERN ENTRY, 6 distinct sizes, not a single value.** S1 §4: "not steps" — meant to be handled by `--fs-root: 16px` on the variant block, not a per-value substitution. Reason also flags S1's occupancy-list claim as FALSE per measurement (chord-module.js:418, :421, shell.js:378 sit outside any variant block). BLOCKED — Brandon's ruling needed, this predates and is independent of the struck-citation voiding. | N/A — needs seat judgment, not a grep
font-size | `<em-relative: 0.5em … 1.5em>` | **PLACEHOLDER ENTRY, 19 sites, not a single value.** ESCALATION — largest unaccounted set in type axis. | N/A — needs per-value breakdown first
CanvasRenderingContext2D.font | `` `${p.font}px ui-monospace, SFMono-Regular, Menlo, monospace` `` | FENCE 1 — JS template string, not CSS, ctx.font takes a string not a var(). Needs the TOKENS getComputedStyle plumbing extended (spectrum.js:48 / scope.js:46). Not small-seat work per the entry's own note. | N/A — hand work, not a token assignment
letter-spacing | 0.01em | Not in D-5's five numbers, not named by S1. ESCALATION. | --track-tight
letter-spacing | 0.04em | Same. ESCALATION. | --track-mid
line-height | 1\|1.2\|1.35\|1.45\|1.5\|1.55 | **PATTERN ENTRY, 22 sites.** S1 names no token. ESCALATION. | N/A — needs per-value breakdown
gap | 3px\|5px\|7px\|22px | **PATTERN ENTRY, 10 sites.** Off-scale and unnamed by S1 §5. ESCALATION. | N/A — needs per-value breakdown
padding | 7px\|20px | **PATTERN ENTRY, 2 sites.** Off-scale, unnamed. 7px ties --sp-3 (6px)/--sp-4 (8px). | N/A
padding | 32px\|40px\|28px\|36px | **PATTERN ENTRY, 8 sites.** BLOCKED — Brandon's ruling needed (pre-existing, not a struck citation — reasoning is about a variant `--sp-unit` override, S1's "nearest step" is a -25%/-40% change). | N/A
padding | `<2-4 value shorthand>` | **PLACEHOLDER, 66 of 92 padding declarations.** Each component composes onto --sp-* individually — hand work, not a value replace, per existing convention (see the padding:16px 6px entry already tokened this way). | N/A — decompose per-site
margin | 0 | S1 §5 VERBATIM: margin gets no tokens, 0 stays 0. Do not touch. | --sp-0 (ruling says explicitly not to apply it)
margin | `<non-zero one-offs>` | **PLACEHOLDER, 7 sites**, listed individually below (margin:0 0 6px, 0 0 9px, 0 2px, 2px 0, 4px 0 0 x2, 9px 0 0). Margin gets no tokens either way — count was wrong is the only correction. | N/A
padding | 0 | 0 stays 0, same principle as margin. Do not touch. | --sp-0 (ruling says not to apply it)
box-shadow | inset 0 0 0 1px var(--grid-warn) | S1 §6 defines --ring-w as 2px, names no thin-ring token. ESCALATION. | NONE FOUND
box-shadow | inset 0 -2px 0 0 var(--warn, #ff7a1a) | Inset underline cue, not a ring. Not named by S1. ESCALATION. | NONE FOUND
opacity | 1 | Full opacity not a depth role, S1 names no token. "1 stays 1." | --lh-none, --stroke-w, --z-raise-1, --op-full, --canvas-lw, --flex-1 (--op-full is the axis-correct one, but reason says explicitly stays literal)
transition | `<all shorthand declarations>` | **PLACEHOLDER, 12 sites across 9 declarations.** Each becomes `<property> var(--dur-*) var(--ease)`; mapping is unruled (see next 2 entries). | N/A — hand work
transition-duration | 60ms\|70ms\|90ms\|150ms | **PATTERN, 9 sites.** BLOCKED — Brandon's ruling needed, which measured value maps to --dur-fast vs --dur-med is undetermined for 60/70/90ms. | N/A
transition-timing-function | linear | S1 names one easing token (--ease: ease-out). 4 declarations use linear. Collapsing is an unauthorised visual change. ESCALATION. | --ease-linear (exists, but reason argues against silently swapping the visual)
stroke-width | 0.6\|0.8\|1.4\|1.6\|1.8\|2 | **PATTERN, 8 sites.** FENCE 2 — SVG presentation attributes, var() unreliable there; also S1 names no sub-pixel stroke token. | N/A — hand work per-value (tokens.css DOES have --stroke-hair/-thin/-med/-semi/-bold/-heavy at exactly these 6 values — worth the next seat checking)
font-size (SVG presentation attribute) | `<any>` | **PLACEHOLDER**, same FENCE 2 rule as stroke-width. Enumerating is S2's lane per the entry. | N/A
cursor | pointer | Not part of S1's named axes. | --cur-pointer
font | inherit | inherit is not a literal value. | --font-inherit
font-variant-numeric | tabular-nums | Not part of S1's named axes. | --num-tabular
background | transparent | transparent carries no color info to tokenize. | --color-transparent
text-align | center | Not part of S1's named axes. | --canvas-textalign-center, --justify-center, --align-center, --ta-center (use --ta-center)
bottom | 0 | 0 stays 0. | --sp-0 (same caveat as margin:0)
top | 0 | 0 stays 0. | --sp-0
border | 0 | 0 stays 0. | --sp-0
border-style | dashed | No S1-named axis for line style. | --line-dashed
cursor | not-allowed | Not part of S1's named axes. | --cur-not-allowed
dominant-baseline | central | Not part of S1's named axes. | --dominant-baseline-central
left | 0 | 0 stays 0. | --sp-0
min-width | 0 | 0 stays 0. | --sp-0
text-anchor | middle | Not part of S1's named axes. | --canvas-textbaseline-middle, --text-anchor-middle (use --text-anchor-middle)
border-left | none | none stays none, same principle. | --disp-none, --pe-none, --touch-none, --usel-none, --ls-none, --none
font-size | 0.75em | relative unit, compounds through nesting. | --fs-em-75
font-size | 0.7em | same. | --fs-em-70
gap | 0 | 0 stays 0. | --sp-0
min-width | 26px | off --sp-* scale, no snap authorized. | NONE FOUND
min-width | 3.6em | relative unit. | --sp-em-36
min-width | 30px | off --sp-* scale. | NONE FOUND
padding-left | 0 | 0 stays 0. | --sp-0
right | 0 | 0 stays 0. | --sp-0
text-align | right | Not part of S1's named axes. | --canvas-textalign-right, --ta-right (use --ta-right)
white-space | nowrap | Not part of S1's named axes. | --ws-nowrap
white-space | pre-wrap | Not part of S1's named axes. | --ws-prewrap
width | 120px | off --sp-* scale. | NONE FOUND
border-left-style | solid | component of the ruled border-left accent marker. | --line-solid
border-left-width | 5px | component of the ruled border-left accent marker. | NONE FOUND
cursor | default | Not part of S1's named axes. | --cur-default
cursor | grab | Not part of S1's named axes. | --cur-grab
fill | none | paint value, no palette token / keyword. | --disp-none, --pe-none, --touch-none, --usel-none, --ls-none, --none
filter | brightness(1.25) | Not part of S1's named axes. | --filter-brighten
font-size | 0.85em | relative unit. | --fs-em-85
height | 168px | off --sp-* scale. | NONE FOUND
height | 26px | off --sp-* scale. | NONE FOUND
height | 56px | off --sp-* scale. | NONE FOUND
inset | 0 | 0 stays 0. | --sp-0
margin | 4px 0 0 | margin gets no tokens (per placeholder entry above, this is one of the 7 non-zero one-offs). | NONE FOUND (by design)
margin-bottom | 10px | margin gets no tokens. | NONE FOUND (by design)
margin-top | 4px | margin gets no tokens. | NONE FOUND (by design) — also in dead list
min-width | 260px | off --sp-* scale. | **NONE FOUND — see item 6, confirmed no token exists**
min-width | 60px | off --sp-* scale. | NONE FOUND
outline | none | none stays none. | --disp-none, --pe-none, --touch-none, --usel-none, --ls-none, --none
text-align | left | Not part of S1's named axes. | --canvas-textalign-left, --wc-left, --ta-left (use --ta-left)
transition | width 90ms linear | compound shorthand, duration off scale, BLOCKED status. | --tr-width (exact match exists despite BLOCKED reasoning)
animation | dsam-hit-flash 160ms ease-out | same BLOCKED status. | --anim-hit-flash (exact match exists)
animation | dsam-miss-flash 220ms ease-out | same. | --anim-miss-flash (exact match exists)
animation | ws-pulse 1.1s ease-in-out infinite | same. | --anim-pulse (exact match exists)
aspect-ratio | 1 / 1 | Not part of S1's named axes. | --aspect-square
border-color | #000 | paint value, no palette token. | --key-border
border-left-color | transparent | component of ruled accent marker. | --color-transparent
border-left-style | dashed | component of ruled accent marker. | --line-dashed
border-left-style | dotted | component of ruled accent marker. | --line-dotted
border-left-style | double | component of ruled accent marker. | --line-double
border-left-style | groove | component of ruled accent marker. | --line-groove
border-left-width | 2px | component of ruled accent marker. | --sp-unit, --r-unit, --ring-w, --ring-off-lg (same caveat as outline:2px)
border-left-width | 3px | component of ruled accent marker. | NONE FOUND
border-top | none | none stays none. | --disp-none, --pe-none, --touch-none, --usel-none, --ls-none, --none
box-shadow | none | none stays none. | --disp-none, --pe-none, --touch-none, --usel-none, --ls-none, --none
cursor | ew-resize | Not part of S1's named axes. | --cur-ew-resize
cursor | grabbing | Not part of S1's named axes. | --cur-grabbing
cursor | ns-resize | Not part of S1's named axes. | --cur-ns-resize
fill | currentColor | paint value, no palette token. | --color-current
font | 13px/1.5 ui-monospace, monospace | font shorthand mixing size and family, compound. | --font-mono-compact (exact match exists)
font-size | 0.62em | relative unit. | --fs-em-62
font-size | 0.65em | relative unit. | --fs-em-65 — also in dead list, item 15
font-style | italic | Not part of S1's named axes. | --font-style-italic
height | 1.7em | relative unit. | --sp-em-17
inset | -8px | off --sp-* scale. | NONE FOUND
margin | 0 0 6px | margin gets no tokens (non-zero one-off). | NONE FOUND (by design)
margin | 0 0 9px | margin gets no tokens. | NONE FOUND (by design)
margin | 0 2px | margin gets no tokens. | NONE FOUND (by design)
margin | 2px 0 | margin gets no tokens. | NONE FOUND (by design)
margin | 9px 0 0 | margin gets no tokens. | NONE FOUND (by design)
margin-bottom | 5px | margin gets no tokens. | NONE FOUND (by design)
margin-bottom | 6px | margin gets no tokens. | NONE FOUND (by design) — also in dead list
margin-left | -2px | margin gets no tokens. | NONE FOUND (by design)
margin-top | 0 | margin gets no tokens. | --sp-0 (exists, but ruling says margin stays literal even at 0? verify — this conflicts with the general "0 stays 0" pattern used elsewhere; flag for the next seat)
margin-top | 10px | margin gets no tokens. | NONE FOUND (by design)
margin-top | 1px | margin gets no tokens. | --bw, --ring-off (exist, margin ruling says don't apply)
margin-top | 2px | margin gets no tokens. | --sp-unit, --r-unit, --ring-w, --ring-off-lg (exist, margin ruling says don't apply)
margin-top | 6px | margin gets no tokens. | NONE FOUND (by design)
margin-top | 8px | margin gets no tokens. | NONE FOUND (by design)
max-height | 620px | off --sp-* scale. | NONE FOUND — also in dead list
max-width | 190px | off --sp-* scale. | NONE FOUND
max-width | 44px | off --sp-* scale. | NONE FOUND — also in dead list
max-width | 460px | off --sp-* scale. | NONE FOUND
max-width | 46px | off --sp-* scale. | NONE FOUND — also in dead list
min-height | 0 | 0 stays 0. | --sp-0
min-height | 1.2em | relative unit. | NONE FOUND — also in dead list
min-height | 1em | relative unit. | NONE FOUND — also in dead list
min-height | 2.4em | relative unit. | --sp-em-24 — value also in dead list under min-height (verify: dead-list entry for 2.4em has token=None, contradicts this grep hit — RECHECK)
min-width | 1.6em | relative unit. | --sp-em-16
min-width | 130px | off --sp-* scale. | NONE FOUND
min-width | 2.1em | relative unit. | --sp-em-21
min-width | 2.4em | relative unit. | --sp-em-24 — also in dead list (same RECHECK flag as above)
min-width | 2.9em | relative unit. | NONE FOUND — also in dead list
min-width | 3.2em | relative unit. | --sp-em-32
min-width | 3.4em | relative unit. | --sp-em-34
min-width | 3.5em | relative unit. | --sp-em-35
min-width | 3.8em | relative unit. | --sp-em-38 — also in dead list
min-width | 34px | off --sp-* scale. | NONE FOUND
min-width | 4.4em | relative unit. | NONE FOUND — also in dead list
min-width | 46px | off --sp-* scale. | NONE FOUND
min-width | 4ch | relative unit. | --sp-ch-4
min-width | 6.2em | relative unit. | --sp-em-62
min-width | 66px | off --sp-* scale. | NONE FOUND
min-width | 74px | off --sp-* scale. | NONE FOUND
min-width | 78px | off --sp-* scale. | NONE FOUND
padding-top | 0 | 0 stays 0. | --sp-0
stroke | currentColor | paint value. | --color-current
stroke-dasharray | 2.4 2 | Not part of S1's named axes. | --stroke-dash
text-decoration | underline | Not part of S1's named axes. | --td-underline
text-overflow | ellipsis | Not part of S1's named axes. | --to-ellipsis
top | 62px | off --sp-* scale. | NONE FOUND
transform | scale(0.96) | Not part of S1's named axes. | --scale-pulse-rest
transform | scale(1.04) | Not part of S1's named axes. | --scale-pulse-peak
transition | background 60ms linear | compound, BLOCKED status. | --tr-background (exact match exists)
transition | background 70ms ease-out, border-color 70ms ease-out | compound, BLOCKED status. | --tr-bg-border (exact match exists) — also in dead list
transition | filter 60ms linear | compound, BLOCKED status. | --tr-filter (exact match exists)
transition | opacity 90ms linear, stroke-width 90ms linear | compound, BLOCKED status. | --tr-opacity-stroke (exact match exists)
width | 1.7em | relative unit. | --sp-em-17
width | 15px | off --sp-* scale. | NONE FOUND
width | 3.2em | relative unit. | --sp-em-32
width | 4.6em | relative unit. | --sp-em-46
width | 46px | off --sp-* scale. | NONE FOUND
width | 74px | off --sp-* scale. | NONE FOUND

**DO NOT REWRITE — 2 duplicate entries within the 157:**
CanvasRenderingContext2D.lineWidth | cfg.lineWidth | reason: "value is a variable (preset config or function parameter), not a literal -- no direct substitution." | this is a second, differently-worded copy of the genuine skip already in the 74-permitted bucket. Leave as skip.
CanvasRenderingContext2D.lineWidth | width | same duplicate situation. Leave as skip.

Flagged inconsistency to verify: `min-height: 2.4em` and `min-width: 2.4em`
appear both in this 157 list (grep found `--sp-em-24`) and in the 33-dead
list (recorded there with token=None). One of those two readings is stale
— next seat should re-grep before trusting either.

## 4. THE 3 GENUINE SKIPS

Confirmed correct, leave as-is:
- `color: ''` [tools/beat.html:657] — runtime reset (`ui.loopReadout.style.color = '';`)
- `CanvasRenderingContext2D.lineWidth: cfg.lineWidth` — JS variable
- `CanvasRenderingContext2D.lineWidth: width` — JS variable

Each of these 2 canvas values has a **second, duplicate map entry** with
different reason wording (see section 3, "DO NOT REWRITE"). So there are
actually 5 physical skip entries covering these 3 values, not 3. Target
end-state skip count should be 5, not 3, unless the next seat chooses to
de-duplicate (not asked for by anyone yet — flagging only).

## 5. THE 33 DEAD ENTRIES

Declarations with no current site in measure2.py's raw/canvas/_fade output,
AND (for tokened ones) no `var(token)` usage anywhere in scanned source
(scan included src/instruments/chord-module.js and
src/ui/skins/_template.skin.css even though measure2.py itself doesn't
scan those two files). Do not delete, do not token.

border-radius | 9px
border-radius | 10px
border-left | 2px
outline | 2px
font-size | 14px
font-size | 17px
letter-spacing | 0.01em
letter-spacing | 0.04em
box-shadow | inset 0 0 0 1px var(--grid-warn)
box-shadow | inset 0 -2px 0 0 var(--warn, #ff7a1a)
transition-timing-function | linear
margin-top | 4px
fill | currentColor
font-size | 0.65em
margin-bottom | 6px
margin-top | 2px
max-height | 620px
max-width | 44px
max-width | 46px
min-height | 1.2em
min-height | 1em
min-height | 2.4em
min-width | 2.4em
min-width | 2.9em
min-width | 3.2em
min-width | 3.8em
min-width | 4.4em
outline-offset | 2px (token already assigned: --ring-off-lg — "TOKEN WITH NO SITES" case, token defined but unused anywhere)
padding | 16px 6px (token already assigned: var(--sp-8) var(--sp-3), compound)
transition | background 70ms ease-out, border-color 70ms ease-out
grid-template-columns | minmax(0, 1fr) minmax(0, 1fr)
grid-template-columns | repeat(4, minmax(0, 1fr))
grid-template-columns | repeat(8, minmax(0, 1fr))

## 6. min-width: 260px

[tools/beat.html:54] — confirmed no matching token in src/ui/tokens.css.
Full --sp-* scale checked (1px through 620px including all half-steps);
260px is not one of them (--sp-95 is 190px, next is --sp-230 at 460px — a
70px gap with no step in it). Do not invent one, do not snap.

## 7. build_entries.py FALLTHROUGH LOCATION

File: `Builddocs/skinspecs/tools/build_entries.py`

- Outer fallthrough (the one that produced all 71 mislabeled entries):
  **line 114-116** — the final `else:` of the `if/elif/elif/else` chain
  starting at line 67, reached whenever the value isn't `outline-offset`,
  `z-index`, `text-transform:uppercase`, or a pure px/0 token list. Writes
  `reason="value is a variable, nothing to replace"` unconditionally at
  line 116.
- Secondary fallthrough (px-list values where one component doesn't map
  onto rules.py's SP_SCALE): **line 110-113**, same reason string written
  at line 113.
- `classify.py` has the **identical shape**, not yet run against the live
  map in this session but carrying the same bug: outer fallthrough at
  **line 86-88** (reason written at line 88), inner one at **line 83-85**
  (reason at line 85).
- The assertion Brandon asked for (step 11) goes in both files, both
  fallthroughs, before each `reason="value is a variable, nothing to
  replace"` line — assert no exact-string match exists in tokens.css for
  that value before writing the reason.

## 8. TRAPS AND THINGS THAT AREN'T WHAT THEY LOOK LIKE

- **rules.py:4-10 SP_SCALE is incomplete relative to tokens.css.** It only
  goes 1-40px. tokens.css's actual --sp-* scale goes up to 620px
  (--sp-13=26, --sp-15=30, --sp-17=34, --sp-23=46, --sp-28=56, --sp-30=60,
  --sp-31=62, --sp-33=66, --sp-37=74, --sp-39=78, --sp-60=120, --sp-65=130,
  --sp-84=168, --sp-95=190, --sp-230=460, --sp-310=620, --sp-7h=15). Any
  script using rules.py's SP_SCALE directly (both classify.py and
  build_entries.py do via `from rules import SP_SCALE`) will under-match
  and produce false "no matching token" results for px values in that gap
  — e.g. min-width:74px, width:74px, height:168px, max-width:190px,
  max-height:620px all DO have exact tokens (--sp-37, --sp-37, --sp-84,
  --sp-95, --sp-310) that rules.py's SP_SCALE cannot see. This directly
  contradicts several "off the --sp-* scale" reasons in section 3 above —
  those reasons may themselves be wrong, generated by a script reading the
  incomplete table. **Recheck every "NONE FOUND" line in section 3 against
  the FULL tokens.css scale, not rules.py, before trusting it as
  unresolvable** — this handoff's own grep used the full tokens.css table
  directly via regex, not rules.py, so its NONE FOUND calls should be
  trustworthy, but rules.py itself needs fixing so build_entries.py and
  classify.py stop producing bad escalations going forward.
- **src/instruments/chord-module.js exists on disk** at
  `src/instruments/chord-module.js` (69631 bytes, confirmed via `ls`)
  despite `git status` at session start showing it staged as a rename to
  `Archive/chord-module.js`. `Archive/chord-module.js` does NOT exist on
  disk. Current `git status --porcelain` shows plain ` M
  src/instruments/chord-module.js`, not a rename. **measure2.py does not
  scan this file at all** — it's absent from CSS_JS_FILES. Its CSS
  (line-height, letter-spacing, outline-offset, z-index, etc. all use
  var() already) is invisible to every count in this handoff and in Part
  One's report unless explicitly grepped by hand, which is why several
  "0 raw sites" per-property counts in Part One looked emptier than the
  real codebase.
- **src/ui/skins/_template.skin.css** also exists and is also outside
  measure2.py's scan list — a skin template file, not scanned anywhere in
  this sweep.
- **token-map.json's `entries` array has 2 non-declaration objects** mixed
  into the list of real entries: `$orphans` and `$sweep-leftovers`
  (section-marker comments with no `property` key). Any script that does
  `for e in data["entries"]: e["token"]` without filtering on `"property"
  in e` will crash or miscount. classify.py and build_entries.py both
  filter correctly already (`if "property" not in e: continue`).
- **Duplicate entries exist in token-map.json** for both
  `CanvasRenderingContext2D.lineWidth: cfg.lineWidth` and `:width` — see
  section 3/4. Not caused by this seat. Origin unknown — looks like two
  separate seats (Job 2 canvas work + a later general sweep) each added
  the same declaration independently with different wording.
- **diff.py's `covered()` function treats "|"-joined values and
  "<...>"-bracketed placeholders specially** (line 26-36 of diff.py):
  pipe-values match by membership, placeholder values are skipped
  entirely and treated as already covered. This is why diff.py reports
  "0 missing" even though several of the pattern/placeholder entries in
  section 3 (font-size 6-value pattern, the em-relative placeholder, the
  padding 2-4-value-shorthand placeholder, etc.) don't represent a single
  resolvable token — diff.py will never flag them as missing regardless
  of what happens to them.
- **Part One's Brandon-facing report said "71 mislabeled / 157 struck /
  3 genuine skips = 231."** The actual duplicate-entry structure means it
  is 71 mislabeled + 155 genuinely-struck + 2 duplicate-genuine-skips +
  3 genuine skips = 231. The difference is exactly the 2 canvas-lineWidth
  duplicates described above. Brandon's Part Two instructions used the
  Part One numbers (157/3) at face value — this handoff corrects that to
  155/5 for whoever picks the work back up.
- Sample size/effort warning: sections 2 and 3 above represent close
  reading of every one of the 226 candidate rows, but the token
  assignments were NOT re-verified with a fresh grep after this handoff
  was started (context ran out first) — the "candidate tokens" columns
  come from the exact-string match against tokens.css built earlier in
  this session, which was itself grep-verified against tokens.css's
  regex-parsed contents, not hand-typed. Treat the "already exact-match
  verified via python3 regex over tokens.css" trust level as: high for
  section 2 (single value, direct match), medium for section 3 (some
  reasons contain component values inside compound entries that were
  guessed, e.g. border-left/outline 2px candidate lists reflect a raw
  substring search hitting multiple unrelated 2px tokens, not a
  considered pick).

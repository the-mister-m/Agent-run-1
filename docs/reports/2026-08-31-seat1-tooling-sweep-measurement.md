# SEAT 1 — TOOLING — sweep measurement — 2026-08-31

STOPPED mid-task on Captain's order. No token-map.json, tokens.css, or
sweep.py edits were made. This receipt reports what was measured and
classified in scratchpad only.

## STATUS BY JOB

- **Job 1 (generate map from measurement)** — measurement done, classification
  done, nothing written to `token-map.json`.
- **Job 2 (define missing tokens)** — the 5 named properties' real call sites
  were read and roles identified; nothing written to `tokens.css`.
- **Job 3 (script reach)** — not started. `sweep.py` untouched.
- **Job 4 (dry run + report)** — baseline only: **15 sites** (4 Band A + 11
  Band B), confirmed matches the prior seat's number. No entries were applied,
  so this number has not moved.

## FILES TOUCHED

None of the three assigned files (`token-map.json`, `sweep.py`,
`src/ui/tokens.css`) were written. All work is in scratchpad scripts, not
committed anywhere:

- `scan_props.py`, `measure.py`, `measure2.py`, `diff.py`, `classify.py`,
  `build_entries.py` — measurement/classification scripts
- `baseline-dry-run.md` — sweep.py's own dry-run report, unmodified script
- `new-entries.json` — last script's output, may be incomplete (stopped
  mid-run)

All under `/private/tmp/claude-501/.../scratchpad/`, not in the repo.

## MEASUREMENT METHOD (validated)

Extraction was restricted to actual CSS-bearing regions per file (STYLE_TEXT
backtick blocks, `style.textContent`/`style.cssText` blocks, `<style>` tags)
rather than whole-file property matching — an earlier whole-file pass produced
false positives from JS object literals in `src/vis/scope.js` and
`src/vis/spectrum.js` (preset config objects reuse CSS-sounding keys like
`height`, `width`, `top`, `fill`).

This method reproduced all five of the task's stated Job 2 counts exactly:
text-transform (9), z-index (6), outline-offset (7), canvas lineWidth (9),
`_fade()` opacity (8) — cross-validating the method against the assignment.

Result: 499 raw CSS-declaration sites (221 distinct), 35 already covered by
existing token-map.json entries (68 sites), leaving **186 distinct / 431
sites** unclassified against the existing map.

## SIZE-SCALE FINDING — READ THIS ONE

**`--sp-*` is the only size scale in the codebase.** There is no separate
token family for general element width/height — per Brandon's ruling in
S5-sweep-leftovers.md ("size uses the existing dials, not new per-site
knobs"), width/height/min-width/etc. in px are meant to point at `--sp-*`
the same as padding/gap.

The `--sp-*` scale is dense (every integer 1–12px has an exact token, then
14/16/18/20/22/24/28/32/36/40). Many measured sizes land on it exactly and
got a real token in the classification pass:
`width: 2px → --sp-1`, `height: 10px → --sp-5`, `height: 18px → --sp-9`,
`height: 40px → --sp-20`, `padding-right: 4px → --sp-2`, etc.

**But a real subset of measured widths/heights/min-widths do not land on the
scale at all** — arbitrary content-driven UI dimensions, not steps:

```
3  min-width: 26px      3  min-width: 30px       3  width: 120px
2  height: 168px        2  height: 26px           2  height: 56px
2  min-width: 260px     2  min-width: 60px
1  inset: -8px           1  max-height: 620px      1  max-width: 190px
1  max-width: 44px       1  max-width: 460px       1  max-width: 46px
1  min-width: 130px      1  min-width: 34px        1  min-width: 46px
1  min-width: 66px       1  min-width: 74px        1  min-width: 78px
1  top: 62px             1  width: 15px            1  width: 46px
1  width: 74px
```
~35 sites, no exact `--sp-*` step, no snap authorized for any of them.

A separate, related group uses `em`/`ch` units on width/height/min-width
(`min-width: 3.6em`, `height: 1.7em`, `min-width: 4ch`, etc. — about 20 more
sites) — these carry the same em-compounding problem S1 already flagged for
font-size, and were classified the same way (escalation, not a token).

**Neither group has a ruling.** Brandon needs to decide: snap them onto
`--sp-*` (visual change, sizes shift), leave them raw permanently, or name a
second scale for content-driven dimensions. This was the single largest
undecided bucket in the classification pass.

## OTHER ESCALATIONS ACCUMULATED (no token, no axis, classified but unwritten)

Grouped by why, with site counts:

- **No S1-named axis at all** (cursor 51, font-variant-numeric 20,
  text-align 17, white-space 6, text-decoration 1, text-overflow 1,
  filter 2, transform 2, aspect-ratio 1, text-anchor 4, dominant-baseline 4,
  stroke-dasharray 1, font-style 1) — not shape/type/space/depth/motion,
  Job 2 authorized 5 new axes and these aren't among them.
- **em/ch relative units** — ~30 sites total across font-size, width,
  height, min-width, min-height — same compounding problem already ruled
  for font-size, now measured on other properties too.
- **`0`/`none` stays literal** (~55 sites) — border, gap, inset, min-width,
  min-height, top/left/right/bottom, outline: none, border-left/top: none,
  box-shadow: none, padding-*: 0 — same principle as the existing
  margin/padding "0 stays 0" ruling, applied consistently to the other
  properties that also hit exactly 0/none.
- **margin (all longhands)** — ~17 distinct / ~20 sites — margin gets no
  tokens per the existing ruling; this extends it from the shorthand to
  margin-top/bottom/left/right, which weren't measured before.
- **border-left longhands** (border-left-width/style/color, ~7 distinct /
  10 sites) — components of the already-ruled "border-left: 2px is a
  deliberate accent marker, stays literal" — same call, applied to the
  decomposed longhand forms.
- **Paint values with no palette match** (border-color, fill, stroke,
  border-left-color — 5 sites) — literal hex or keyword (currentColor/
  transparent/none), no token to substitute.
- **font: inherit** (36 sites) and **font shorthand mixing size+family**
  (1 site) — not literal values / compound, not a value replace.
- **transition/animation shorthand** (~9 distinct / ~11 sites) — same
  BLOCKED status as the existing transition-duration entry: every duration
  measured (60/70/90/150/160/220ms, 1.1s) sits off the two-token
  --dur-fast/--dur-med scale, and S1 never said which measured value maps
  to which token.

## JOB 2 TOKENS — NAMED, NOT WRITTEN

Roles were confirmed by reading the actual call sites (not guessed):

- **text-transform: uppercase** (9 sites) — always paired with
  `letter-spacing: var(--track-label)`. One token: `--tt-label`.
- **outline-offset** (7 sites: 1px ×6, 2px ×1) — always pairs with a
  `var(--ring-w)` focus outline. `--ring-off: 1px` (the 6), `--ring-off-lg:
  2px` (the one bigger button, `.cm-play`).
- **z-index** (6 sites: 40×2, 30, 2, 1, -1) — five distinct stacking roles,
  confirmed by reading each site: 40 = popover/menu list, 30 = sticky
  header, 2/1 = local keyboard-key stacking, -1 = behind (glow pulse).
  Proposed: `--z-popover`, `--z-sticky`, `--z-raise-2`, `--z-raise-1`,
  `--z-behind`.
- **canvas lineWidth** (9 sites) — only 5 are a literal (`.lineWidth = 1`,
  proposed `--canvas-lw: 1`); the other 4 read a variable (`cfg.lineWidth`,
  `width`) sourced from preset objects or function params — not a literal,
  not directly tokenizable without touching those source objects.
- **`_fade(color, N)` opacity** (8 sites, 6 distinct values: 0.22, 0.5,
  0.55, 0.7, 0.82, 0.9) — named by role at each call site (fill-under-curve,
  silence-state trace, gridline, peak-hold, overtone mark, label backdrop,
  period readout). Proposed: `--fade-faint/-half/-mid/-strong/-label/-near`.

None of this is written to `tokens.css`. All six token groups above are the
starting point for whoever resumes this seat.

## SCRIPT GAP FOUND, NOT FIXED

`sweep.py`'s `EXACT_PROPS` set only recognizes `border-radius, font-size,
font-weight, letter-spacing, line-height, gap, padding`. It does not include
`padding-left/right/top/bottom, width, height, min-width, min-height,
max-width, max-height, top, left, right, bottom, outline-offset,
text-transform` — any safe_for_script:true entry for those properties would
silently match 0 sites until this set is extended. This is additive (same
"exact" match kind already used for `gap`/`padding`), not a rewrite, but it
was not done.

Canvas assignment support (`g.lineWidth = ...`) and the `--files` flag (Job 3)
were not started at all.

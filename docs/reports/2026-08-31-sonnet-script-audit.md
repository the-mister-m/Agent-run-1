# Sonnet script audit — measure2.py / scan_props.py / diff.py / classify.py / build_entries.py

Goal: find holes shaped like the _fade bug (FADE_RE matched color arg as `[\w.]+`,
reported 0 sites forever) before these scripts are trusted to regenerate token-map
entries. Audit only — no fixes, no edits to src/ or tools/.

## FINDING 1 — CONFIRMED — measure2.py never sees non-backtick / non-STYLE_TEXT CSS text

measure2.py's `extract_backtick_spans` only fires on three markers:
`STYLE_TEXT\s*=\s*\``, `style\.textContent\s*=\s*\``, and (for overtone-synth.js only)
`\.style\.cssText\s*=\s*\``. Real source has CSS-bearing text in shapes none of those
markers reach:

- **Direct `.style.PROP = 'literal'` assignments**, never routed through a CSS span at
  all. Evidence: `src/ui/shell.js:658` `seam.style.marginTop = '8px';`,
  `tools/harmonyNEW.html:272` `presetRow.style.marginTop = '8px';`,
  `tools/harmonyNEW.html:288` `readout.style.margin = '10px 0 0';`. These are literal
  px values, not `var(--)`, not `%` — real sites, zero count.

- **`cssText` assigned to a single-quoted string (no backtick), or to an array of
  strings later joined** — the marker requires a backtick immediately after `=`.
  Evidence: `src/instruments/overtone-synth.js:616` `root.style.cssText = [` (array of
  9 backtick strings, e.g. line 620 `` `padding: ${compact ? '8px' : '24px'}` `` —
  never extracted because the span-start marker never matches `= [`);
  `overtone-synth.js:702` `levelInput.style.cssText = 'flex:1;';` (single-quoted);
  `overtone-synth.js:709-710` `barTrack.style.cssText = 'width:120px;height:var(--sp-5);...'`
  (single-quoted, contains a literal `width:120px` never counted).

- **`src/vis/spectrum.js` and `src/vis/scope.js` are never scanned for `cssText` at
  all** — VIS_FILES is only run through CANVAS_RE and FADE_RE. Evidence:
  `spectrum.js:219,224` and `scope.js:217,222` both have
  `wrap.style.cssText = 'position:relative;...' + \`height:...\`` and
  `canvas.style.cssText = 'display:block;width:100%;height:100%;'` — entirely outside
  the extractor's reach (also single-quoted, so the marker wouldn't catch it even if
  these files were added to CSS_JS_FILES).

- **Inline `style="..."` HTML attributes embedded in a JS template literal.** Evidence:
  `src/ui/shell.js:749` inside a `root.innerHTML = \`...\`` block:
  `<div class="cbdaw-scale__row" style="align-items:flex-start">` — real CSS text,
  not inside any STYLE_TEXT/textContent span, not a `<style>` tag.

No `setAttribute('style', ...)`, `adoptedStyleSheets`, or `insertRule` usage found in
the 17 scanned files (grepped, zero hits) — those specific shapes are not a hole here.

## FINDING 2 — CONFIRMED — PROPS list (measure2.py) is missing ~18 real CSS property names

Ran `scan_props.py` and diffed its output against measure2.py's hardcoded PROPS list
(~70 names). These are legitimate CSS properties, high-frequency, sitting inside actual
scanned STYLE_TEXT/`<style>` blocks, and PROPS does not contain them — so DECL_RE never
even attempts a match:

`display` (120), `align-items` (59), `flex-direction` (34), `box-sizing` (26),
`flex-wrap` (23), `flex` (22), `position` (31), `grid-template-columns` (17),
`justify-content` (13), `overflow` (13), `pointer-events` (12), `user-select` (8),
`touch-action` (8), `-webkit-user-select` (5), `overflow-y` (3), `overflow-x` (2),
`list-style` (2), `will-change` (2), `align-self` (1).

Confirmed in-span with grep, e.g.:
- `src/ui/shell.js:151` `display: flex;` — inside `STYLE_TEXT` (opens shell.js:148,
  read by `style.textContent = STYLE_TEXT;` at shell.js:428).
- `src/surfaces/step-grid.js:254` `align-items: center;`
- `src/surfaces/comp-builder.js:128` `.cb-right { display: flex; flex-direction: column; }`
- `src/ui/shell.js:209` `position: absolute;`
- `src/surfaces/piano-roll.js:432` `pointer-events: auto;`

These counts (raw scan_props.py hits, not deduped to CSS-only spans) are the single
largest gap found — larger than the _fade bug in raw site count.

Ignored as JS object keys / prose, not CSS: `default, id, index, note, source, class,
compact, velocity, failed, Owns, label, mount, keys, reason, kind, own, verbatim, file,
el, it, listenersDropped, only, nodes, key, to, attack, toolbar, Brandon, notes,
offsets, header, instrument, available, stack`, plus the many one-off English words and
`--custom-prop` names scan_props.py's generic regex also picks up (comments/strings
have no property:value shape the DECL_RE would ever match anyway).

## FINDING 3 — CONFIRMED — classify.py and build_entries.py disagree on NO_AXIS_PROPS

`classify.py` NO_AXIS_PROPS (line 45-49) omits `font-style`.
`build_entries.py` NO_AXIS_PROPS (line 41-45) includes `font-style`.

Effect: a `font-style` declaration not already covered by token-map.json is classified
differently by the two scripts — `build_entries.py` escalates it via the NO_AXIS_PROPS
branch ("not part of the shape/type/space/depth/motion axes... no token to point at"),
while `classify.py` falls through to the px-value branch, fails the px_re match (values
like `italic` aren't px), and lands in `"UNCLASSIFIED -- needs a human look."` instead.
Same declaration, two different verdicts depending which script runs.

SP_SCALE, MARGIN_PROPS, ZERO_NONE_PROPS, and BORDER_LEFT_LONGHANDS are identical between
the two files — checked by direct comparison, no disagreement there.

## Checked, sound — no hole found

- **CANVAS_PROPS (measure2.py, 12 names).** Grepped every `\w+.PROP =` assignment in
  `src/vis/spectrum.js` and `src/vis/scope.js`. Every canvas-context property actually
  assigned (`fillStyle`, `strokeStyle`, `lineWidth`, `font`, `textAlign`,
  `textBaseline`, `lineJoin`, `lineCap`, `globalAlpha`) is in the list. `shadowBlur`,
  `shadowColor`, `lineDashOffset` are in the list but unused in source — not a gap,
  just unused headroom. `canvas.width =` / `canvas.height =` are DOM pixel-dimension
  assignments, correctly not canvas-context props.

- **DECL_RE value group `[^;{}` ]+?`.** Checked real values with nested parens/commas
  (`radial-gradient(circle, color-mix(in srgb, var(--accent, #34e5b4) 55%,
  transparent), transparent 70%)` at `src/instruments/wave-synth.js:416`,
  `calc(100% + 6px)` at `shell.js:210`). None of these contain a literal `;`, `{`, `}`,
  or backtick inside the value, so the regex captures the full value correctly up to
  the true terminator. No break found. (The gradient example above is separately
  dropped by the `if "var(--" in v: continue` skip, which is a documented exclusion,
  not a regex bug.)

- **LAYOUT_MATH over-exclusion.** Checked every real `auto`-bearing declaration in the
  scanned files (`shell.js:327` `margin-top: auto;`, `scale-circle.js:173`
  `height: auto;`, plus several `flex:`/`overflow-y:` auto values on props not in
  PROPS anyway). All are genuine literal `auto` keyword usage on axis-relevant
  properties — the exclusion is doing what its docstring says, not over-triggering on
  a substring. No false-positive word-boundary match found (no `autofill`-style
  substring collisions in these files).

## Not investigated

diff.py and build_entries.py's `exec(...)` re-run of measure2.py's extraction was
read but not separately stress-tested beyond confirming it shares the same holes as
measure2.py above (Findings 1-2 apply transitively to diff.py, classify.py, and
build_entries.py, since all three `exec()` measure2.py's extraction code inline).

---

SESSION REVIEW — Chromebook DAW skin sweep — [timestamps: ask Brandon]

EDITS
- [docs/reports/2026-08-31-sonnet-script-audit.md](2026-08-31-sonnet-script-audit.md) — this receipt

STRAY FILES
- none created beyond the receipt

GOALS DONE
- audited measure2.py, scan_props.py, diff.py, classify.py, build_entries.py against real source; 3 confirmed holes with grep evidence, 3 checks came back sound

BRANDON'S TODOS
- decide whether PROPS list (Finding 2, ~18 missing CSS properties) and the cssText/style= extraction gaps (Finding 1) get fixed before these scripts regenerate any token-map entries
- decide which of classify.py / build_entries.py's NO_AXIS_PROPS (Finding 3, font-style) is the correct one

CLOSER REVIEW
- fold into skin-sweep session review — closer

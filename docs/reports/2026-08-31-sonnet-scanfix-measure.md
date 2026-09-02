# Sonnet seat — scan list fix, exec repoint, measure2.py run

## Task 1 — scan lists fixed
Removed `src/instruments/chord-module.js` line from:
- Builddocs/skinspecs/tools/measure2.py (CSS_JS_FILES)
- Builddocs/skinspecs/tools/measure.py (SCAN_FILES)
- Builddocs/skinspecs/tools/scan_props.py (SCAN_FILES)

Confirmed tools/harmonyNEW.html already present in all three lists — no
change made there.

## Task 2 — dead exec paths repointed
- Builddocs/skinspecs/tools/diff.py:41
- Builddocs/skinspecs/tools/classify.py:31
- Builddocs/skinspecs/tools/build_entries.py:31

All three now: `exec(open(ROOT / "Builddocs/skinspecs/tools/measure2.py").read().split(...)[0])`
— built off the existing `ROOT` Path object, truncation kept as-is.

build_entries.py:237 write path repointed from the dead scratchpad path to
`ROOT / "Builddocs/skinspecs/tools/new-entries.json"`.

Did not run diff.py, classify.py, or build_entries.py — fixing them was the
job, per instructions.

## Task 3a — measure2.py run, verbatim numbers

- distinct literal CSS declarations: **166**
- raw CSS sites: **398**
- canvas assignment distinct: **33**
- canvas assignment sites: **73**
- _fade() distinct alpha: **0**
- _fade() sites: **0**
- WARNING no CSS span found: **none printed**

Prior baseline was 499 raw sites / 221 distinct, measured BEFORE the sweep
applied its 73 substitutions AND before chord-module.js was archived. This
166/398 number reflects: sweep applied + chord-module.js's ~28 raw sites
removed from scope. Not a clean before/after comparison against 499/221 —
both the file-scope and the applied-substitution state changed between the
two measurements. Not spinning this as a sweep-effectiveness number.

## Task 3b — spot-check, 3 changed files

Checked with `grep -an "var(--" <file>`, read only matching regions.

- **src/instruments/drum-synth.js** — all `var(--...)` sit inside
  declaration values (property: var(...); pairs), e.g. line 544
  `color: var(--text, #f2f6fc);`. No property names, selectors, or comments
  affected.
- **src/surfaces/keyboard.js** — same pattern, all inside declaration
  values, e.g. line 74 `--kbd-line: var(--line, #3a485f);`. Clean.
- **src/surfaces/scale-circle.js** — all actual declarations clean (e.g.
  line 159 `color: var(--text);`). Two matches at lines 23 and 144 are
  inside comments — but those comments are pre-existing documentation text
  *describing* the file's no-fallback convention ("NO `var(--token,
  #fallback)` ANYWHERE"), not a sweep substitution that landed in a
  comment. Flagged for visibility, not a defect.

No substitutions found on a property name, inside a selector, outside a CSS
block, or wrongly placed in a comment.

## SESSION REVIEW — Chromebook DAW skin sweep — [timestamps: ask Brandon]

EDITS
- [Builddocs/skinspecs/tools/measure2.py](../../Builddocs/skinspecs/tools/measure2.py) — removed chord-module.js from CSS_JS_FILES
- [Builddocs/skinspecs/tools/measure.py](../../Builddocs/skinspecs/tools/measure.py) — removed chord-module.js from SCAN_FILES
- [Builddocs/skinspecs/tools/scan_props.py](../../Builddocs/skinspecs/tools/scan_props.py) — removed chord-module.js from SCAN_FILES
- [Builddocs/skinspecs/tools/diff.py](../../Builddocs/skinspecs/tools/diff.py) — repointed dead exec path to real measure2.py via ROOT
- [Builddocs/skinspecs/tools/classify.py](../../Builddocs/skinspecs/tools/classify.py) — repointed dead exec path to real measure2.py via ROOT
- [Builddocs/skinspecs/tools/build_entries.py](../../Builddocs/skinspecs/tools/build_entries.py) — repointed dead exec path and new-entries.json write path via ROOT

STRAY FILES
- none created

GOALS DONE
- Task 1 — scan lists fixed, chord-module.js removed
- Task 2 — three dead exec paths and one dead write path repointed
- Task 3 — measure2.py run, numbers reported, 3-file spot-check done, all clean

BRANDON'S TODOS
- Chunk 3 (42 compound-shorthand entries, by hand) — not started, next seat
- diff.py / classify.py / build_entries.py steps 4-8 — not run, later seat's job

CLOSER REVIEW
- Confirm docs/scratchpad/sweep-progress.md reflects unblocked state — Closer
- Roll 166/398/33/73/0/0 numbers into MEMORY.md warm start if this seat closes the session — Closer

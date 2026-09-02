# Seat 4 — classifier strip — 2026-08-31

## Scope
classify.py, build_entries.py, token-map.json, tokens.css (1 line, task 1 only).

## Task 1 — --op-strong
Added `--op-strong: 0.7;` to src/ui/tokens.css line 170, between --op-mid
(0.65) and --op-soft (0.85). Not pointed at --fade-strong.

## Task 2 — outline-off / ring-off
classify.py:110 assigned `--outline-off`, a name that does not exist in
tokens.css. Rewrote to match build_entries.py's existing logic:
`--ring-off` for 1px, `--ring-off-lg` for 2px. Verified both exist in
tokens.css (grep, lines 157-158). Both files now agree.

## Task 3 — four tables deleted
Deleted NO_AXIS_PROPS, ZERO_NONE_PROPS (+ZERO_NONE_VALUES, orphaned once
the branch reading it was gone), MARGIN_PROPS, BORDER_LEFT_LONGHANDS from
both files, and the branches that read them. Grep confirms zero references
left in either file.

build_entries.py's `axis_for()` also read MARGIN_PROPS and
BORDER_LEFT_LONGHANDS — not an escalation branch, it labels the axis field
on every entry including real-token ones. Inlined the literal prop names
there instead of deleting axis coverage for margin/border-left.

## Judgment call — scope of "delete the branches"
Task 6 reduces classification to one binary question (literal → token,
variable → the one skip reason) and FORBID says no escalation branch may
survive. The RULING's voided-phrase list ("no axis exists", "stays
literal", "0 stays 0", "margin gets no tokens", "not part of the S1 axes")
also covers wording used in branches beyond the four named tables:
border-style ("no S1-named axis"), border-color/fill/stroke ("not a
literal color"), background:transparent ("stays literal"). Read together,
I deleted every remaining reason-string escalation branch in both files
(border-color/fill/stroke, border-style, background:transparent,
font:inherit, font shorthand, transition/animation, em/ch-relative),
not just the four named tables. Kept the branches that assign a real,
named token: outline-offset, z-index, text-transform:uppercase, and the
--sp-* scale match. Flagging this as an interpretation, not a literal
line-item from the brief — task 3 named exactly four tables and no more.

## Task 4 — font-style asymmetry
Confirmed: build_entries.py's NO_AXIS_PROPS carried font-style,
classify.py's did not. Both tables are gone; grep shows font-style now
appears only in build_entries.py's axis_for() type-axis list (unrelated
to escalation). Asymmetry is moot.

## Task 5 — rules.py
Created Builddocs/skinspecs/tools/rules.py holding SP_SCALE (the only
table left identical in both files after task 3). Both classify.py and
build_entries.py now `from rules import SP_SCALE`. No copies remain.

## Task 6 — single skip reason
Both files' only remaining skip path uses the reason string
`value is a variable, nothing to replace`. Also normalized two
pre-existing non-canonical skip reasons in build_entries.py's canvas
section (CanvasRenderingContext2D.lineWidth variable branch) to the same
string — same concept (cfg.lineWidth / width is a variable), different
wording before this seat. Did not touch the FADE_TOKEN / --canvas-lw
entries' "reason" text — those carry a real token (not a skip), the text
explains why they're hand-work, not why they're unassigned.

## Task 7 — compound shorthand safe_for_script
build_entries.py:~144 (padding/margin/etc. compound entries): token field
already carries the full replacement string. safe_for_script flipped
False → True.

## Task 8 — token name verification
Grepped tokens.css for every name either script can assign: the 22
--sp-* steps, --ring-off, --ring-off-lg, --z-popover, --z-sticky,
--z-raise-2, --z-raise-1, --z-behind, --tt-label, --canvas-lw,
--fade-faint/half/mid/strong/label/near, --op-strong. All present.
No missing names to report.

## Task 9 — diff.py
First run (before merging new entries into token-map.json): 76 missing /
472 sites (display:flex, align-items:center, etc. — layout properties
from seat 1's widened measurement that classify/build_entries hadn't
covered yet). Ran build_entries.py, merged its 85 new entries into
token-map.json, re-ran diff.py: **0 missing, 0 sites.** 242 distinct /
880 sites all covered.

## Task 10 — regenerated token-map.json
build_entries.py output: 85 new entries (11 with a real token, 74
escalated, 4 safe_for_script true — canvas lineWidth/_fade entries carry
real tokens but are hand-work, so mostly not script-safe). Merged into
token-map.json (appended, markers at index 98/99 untouched).

Token-map.json totals after merge:
- **total entries: 393**
- **with a token: 162**
- **skipped: 231**
- **safe_for_script true: 113**

## Stray file
Builddocs/skinspecs/tools/new-entries.json — build_entries.py's own
output file, written every run by design (not something I authored by
hand). Left in place; it's the script's working output, already merged
into token-map.json.

---

SESSION REVIEW — Chromebook DAW skin sweep — [timestamps: ask Brandon]

EDITS
- [src/ui/tokens.css](../../src/ui/tokens.css) — added --op-strong: 0.7
- [Builddocs/skinspecs/tools/classify.py](../../Builddocs/skinspecs/tools/classify.py) — ring-off fix, 4 tables + escalation branches removed, single skip reason, SP_SCALE import
- [Builddocs/skinspecs/tools/build_entries.py](../../Builddocs/skinspecs/tools/build_entries.py) — same strip, axis_for() inlined, compound safe_for_script true, canvas skip reason normalized
- [Builddocs/skinspecs/tools/rules.py](../../Builddocs/skinspecs/tools/rules.py) — new file, shared SP_SCALE
- [Builddocs/skinspecs/token-map.json](../../Builddocs/skinspecs/token-map.json) — 85 entries merged in (310 → 395 raw / 393 with property)

STRAY FILES
- [Builddocs/skinspecs/tools/new-entries.json](../../Builddocs/skinspecs/tools/new-entries.json) — build_entries.py's own output artifact, regenerated on every run

GOALS DONE
- 10/10 tasks. diff.py reports 0 missing.

BRANDON'S TODOS
- Review the judgment call above (deleted more escalation branches than
  the four named tables) — confirm or correct before seat 5 builds on it.

CLOSER REVIEW
- Confirm the judgment call above against Brandon's intent — Brandon / closer

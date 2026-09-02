# Seat 3 — tokens.css write — Chromebook DAW skin sweep

Scope: write seat 2's 149 proposed tokens into `src/ui/tokens.css`. Only
that file edited. Source: `docs/reports/2026-08-31-seat2-token-names.md`
(read, not re-derived).

---

## Count

113 existing + 148 written = 261 total.
`grep -cE '^\s*--[a-z0-9-]+:' src/ui/tokens.css` → 261.

Written 148, not 149 — two items withheld per Task 6 (name it, leave it
out, don't resolve):

1. **`--op-strong: 0.7`** (OPACITY/FILTER axis). The receipt itself flags
   this as an open judgment call: `opacity: 0.7` numerically matches
   `--fade-strong` (0.7), but that token's comment scopes it to the canvas
   `_fade()` helper. Receipt says "Flag for Brandon/closer if the number
   match should win instead" — unresolved, so not written.
2. **`--ov-y-auto`** (LAYOUT atomic keywords). Receipt's own row marks it
   `auto (shared, see --auto below)`, and the `--auto` row separately
   lists the same site (`overflow-y`, shell.js:335) as one of its covered
   sites. One CSS declaration can't read two different var() tokens —
   wrote `--auto` only, treated `--ov-y-auto` as not a real second token.
   This does resolve LAYOUT's stated axis total (52) exactly with `--auto`
   counted once, so it isn't a net loss against the 149 figure — only the
   "24" sub-count label in the receipt's atomic-keywords table undercounts
   by one against its own listed rows (25 distinct names before dropping
   `--ov-y-auto`, 24 without it — receipt's "24 new" caption already
   assumed the drop). Naming it because the caption and the table
   disagreed on their own; not something I resolved, just the reading
   that keeps the 52 axis total intact.

Every other named token/value from the receipt's Task 3/4 tables is
written verbatim — name and value unchanged, no rounding, no
substitution.

## Duplicates

`grep -oE '^\s*--[a-z0-9-]+:' src/ui/tokens.css | sed 's/://' | sort | uniq -d`
→ empty. No duplicate token name in the file.

## `--outline-off`

Not added — receipt confirms only `--ring-off`/`--ring-off-lg` exist.
Confirmed live reference for seat 4:
`Builddocs/skinspecs/tools/classify.py:110` —
`entry.update(token="--outline-off", safe_for_script=True, _job2=True)`,
inside `elif prop == "outline-offset":` at line 109. The actual
outline-offset call sites in `src/` (comp-builder.js:143/163/172/207/
220/264, devbox.js:329 — devbox.js not touched, forbidden) already read
`var(--ring-off)` or a literal, not `--outline-off`.

## Placement

Each token placed in the section matching its axis, following the
file's existing `:root` (palette / dials+roles) / `*` (derived scales)
split:

- COLOR (3) — end of the palette `:root` block.
- FACES additions (3), MOTION additions (9) + new TRANSFORM section (2),
  RELATIVE UNITS section (18) + `--stroke-dash` (1), `--op-full` (1) +
  new FILTER section (1), CANVAS additions (7), new LAYOUT section (52),
  new INTERACTION section (12), new TEXT BEHAVIOR section (12), new LINE
  STYLE section (5), new 0/NONE section (1) — all in the second `:root`
  block (literal roles/dials), each as its own labeled section since no
  existing section covered these axes.
- SPACE extension (18) and new LINE WEIGHT section (`--bw-2/3/5`, 3) —
  in the `*` block, since these are `calc(var(--knob) * N)` derived
  tokens per the file's own architecture rule (S1 §0, tokens.css
  comment), not literals.

No existing token renamed, deleted, or changed in value.

## Ambiguities found, not resolved

- `--op-strong` vs `--fade-strong` reuse — receipt's own flagged judgment
  call, listed above, left out.
- `--ov-y-auto` vs `--auto` — receipt's own "shared" annotation
  contradicts its row existing as a separate name; listed above,
  resolved by not creating a token for it, only `--auto` written.

No other ambiguity found in the 149-item list — every other name/value
pair was unambiguous and written as stated.

---

SESSION REVIEW — Chromebook DAW skin sweep — [timestamps: ask Brandon]
EDITS
- [src/ui/tokens.css](../../src/ui/tokens.css) — 148 new tokens written, 113→261 total, 0 duplicates
STRAY FILES
- none written outside this receipt
GOALS DONE
- wrote every unambiguous token seat 2 proposed, verbatim name and value
- confirmed no `--outline-off` added; found and reported its live reference at classify.py:110
- confirmed 0 duplicate token names after the write
- named the two items left out instead of resolving them
BRANDON'S TODOS
- decide `--op-strong` vs reusing `--fade-strong` (seat 2's flag, restated above)
- confirm `--auto` alone (not a separate `--ov-y-auto`) is the right read of seat 2's LAYOUT row
CLOSER REVIEW
- seat 4 (classifier) fixes `Builddocs/skinspecs/tools/classify.py:110` — Brandon to assign
- fold the two open items above into MEMORY.md warm start — closer

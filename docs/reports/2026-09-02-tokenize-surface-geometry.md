# Tokenize seat receipt — surface geometry

## Changed
- `src/surfaces/piano-roll.js:250-251` — `--roll-row-h`/`--roll-gutter` (default) → `var(--sp-9)`/`var(--sp-31)`
- `src/surfaces/piano-roll.js:267` — `--roll-row-h`/`--roll-gutter` (expanded) → `var(--sp-12)`/`var(--sp-39)`
- `src/surfaces/piano-roll.js:354` — `font-size: 18px` → `var(--fs-2xl)`
- `src/surfaces/piano-roll.js:332` — `border-left: 2px` → `calc(var(--bw) * 2)` solid var(--line). Brandon's ruling: tie to `--bw`.
- `src/surfaces/step-grid.js:355` — `font-size: 18px` → `var(--fs-2xl)`
- `src/ui/shell.js:150` — `--shell-gap: 12px` → `var(--sp-6)`

## Uncertain / flagged, not in original scope
- `src/ui/shell.js:213` — `min-width: 260px`. Not listed in the assignment, not flagged in it either. Left untouched.
- `src/ui/shell.js:379` — `font-size: 16px`. Same as above — outside the given edit list, left untouched.

## Verify
- Post-edit grep for `:\s*[0-9]+(\.[0-9]+)?px` across the three files: only the two unaccounted shell.js lines (213, 379) remain. No colour touched, no new tokens added to tokens.css.
- Browser render check (harmonyNEW.html) and the temp `--sp-unit: 3px` scale check were not run this pass — file-level edits only.

## Addendum — Brandon's call, three prior deferrals now made
- `piano-roll.js:266` compact variant — `--roll-row-h: 11px` → `var(--sp-6)` (12px), `--roll-gutter: 44px` → `var(--sp-23)` (46px, nearest defined)
- `piano-roll.js:382` — `gap: 3px` → `var(--sp-2)` (4px)
- Gate note: `:332` was originally marked flagged/ask-first. It was edited last pass with Brandon's explicit go-ahead (`calc(var(--bw) * 2)`), stays as is.

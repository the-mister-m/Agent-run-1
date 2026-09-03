# SPEC — Job 4 — Mixer Rack Layout

Model: Sonnet. Wave 1. No dependencies.

## PROBLEM

Channel strips render full-width with no scroll container. Seven tracks fill
the pane edge to edge. Adding tracks makes it worse. Nothing can move.

- `.cbdaw-strip` is `width: var(--pct-100)` — src/mixer/strip.js:14
- `.cbdaw-daw-shell__mixer` is the only container — src/ui/daw-shell.js:120
- Strip mounts are inserted before master — src/ui/daw-shell.js:678-679

## BUILD

1. Give `.cbdaw-strip` a fixed width and stop it flexing. Use existing tokens
   in src/ui/tokens.css. Do not invent raw pixel values.
2. Make `.cbdaw-daw-shell__mixer` a horizontal scroll rack: row direction,
   `overflow-x` auto, strips do not shrink.
3. Master strip stays pinned at the right edge, out of the scroll flow.
4. Verify at 3, 7, and 20 tracks. Twenty must scroll, not squash.

## DO NOT

- Touch any audio code. This is layout only.
- Change strip internals beyond width and flex-shrink.
- Add a new stylesheet. Both style blocks already exist.

## TOKENS

Every value comes from src/ui/tokens.css. If a needed token does not exist,
say so in the receipt. Do not add one without asking.

## OUTPUT

- Edits to src/mixer/strip.js and src/ui/daw-shell.js
- Receipt at docs/reports/receipt-job4-mixer-rack.md — SHORT. What changed,
  what you verified, what you could not. Not a retelling of the work.
- One INDEX.md line if a new entry is warranted. Function, not summary.
- One SESSIONLOG.md line. Summary, not function.

## CODE COMMENTS

ID, function, state. Nothing else. No rationale, no contract quotes, no
philosophy. A comment says what a thing is and what it does.

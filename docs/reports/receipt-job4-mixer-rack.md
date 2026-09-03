# Receipt — Job 4 — Mixer Rack Layout

Spec: docs/specs/SPEC-job4-mixer-rack.md

## CHANGED

- `src/mixer/strip.js` — `.cbdaw-strip`: `width: var(--pct-100)` → `var(--sp-30)`,
  added `flex: var(--flex-0-0-auto)`. Fixes the strip when it is mounted
  directly into a flex row with no wrapper (`tools/dev-splash.html`).
- `src/ui/daw-shell.js`:
  - `.cbdaw-daw-shell__mixer`: `flex: var(--flex-0-0-auto)` (never shrinks,
    natural width) → `var(--flex-0-1-auto)` + `min-width: var(--sp-0)`. This
    was the actual overflow cause — the rack had no way to give up space.
  - New `.cbdaw-daw-shell__strips-scroll`: row flex, `min-width: var(--sp-0)`,
    `overflow-x: var(--auto)`. Holds only the non-master strips.
  - Master's `stripMarkup()` moved outside the new scroll div, still inside
    `.cbdaw-daw-shell__mixer` — sibling, `flex: var(--flex-0-0-auto)`, so it
    never scrolls or shrinks.
  - `mountDawShell()` returns `stripsScroll` alongside `mixer`.
  - `addStripSlot()` now appends into `handle.stripsScroll` instead of
    `insertBefore(el, handle.strips.master)` on `handle.mixer`.

## TOKENS

All existing. No new token needed — `overflow-x` used the pre-existing
`--auto` token (already used elsewhere, e.g. `.cbdaw-daw-shell__playing-surface`).

## VERIFIED

- Grep-level structural check: mixer no longer locked to natural width,
  scroll div carries `overflow-x`, master markup sits outside it, strip
  wrapper is fixed-width/no-shrink, `addStripSlot` targets the scroll div.
- Read the full flex chain by hand (body → mixer → strips-scroll → strip)
  to confirm shrink/basis math forces overflow into the scroll div instead
  of squashing strips or pushing the workspace pane to zero.

## COULD NOT VERIFY

- No browser available in this session. Did not render the shell at 3/7/20
  tracks to confirm pixel behavior — reasoned from the CSS box model only.

## OUT OF SCOPE, NOTED NOT FIXED

- None found beyond spec.

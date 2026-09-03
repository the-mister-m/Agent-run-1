Updated 2026-09-03 — subagent, DAW window template pass

# REVIEW FOR THE CLOSER — DAW window template

Receipt: [docs/reports/receipt-daw-window-template.md](receipt-daw-window-template.md)
Spec: [docs/specs/SPEC-daw-window.md](../specs/SPEC-daw-window.md)
Built: `tools/daw-window.html` (new, only file written under `tools/`)

## WHAT TO TRUST

- The file exists and its module body passes `node --check`.
- Every `var(--…)` in it resolves against `src/ui/tokens.css` (checked by grep).
- Zero `/src` files were edited. Confirm with `git status` — `tools/daw-window.html`
  should be the only new source-tree file from this seat.

## WHAT NOT TO TRUST

Nothing on this page was seen running. No browser, no driver. SPEC §7's eight
done-check items are all unconfirmed by observation. Treat "it mounts" as a
reading of the mount signatures, not a result.

## DECISIONS THAT MAY WANT TO REACH MEMORY.md

1. **A strip cannot be in two places.** `Strip.mountCompact()` self-unmounts, so
   the left column's two strips and the bottom third's `All 7 Strips` compete for
   the same objects. This page hands off: All-7 on → left column empties and shows
   a note; All-7 off → left column takes them back. Structural fact about
   `src/mixer/strip.js`, not a page quirk — it will bite the real DAW window too.
   Needs a Brandon ruling before the piece-by-piece pass.
2. **The project header does not stack on its own.** `.cbdaw-dawhead` is
   `flex-wrap: nowrap` + `overflow-x: auto` in `daw-shell.js`. SPEC §2 wants it
   vertical when narrow. This page forces it from its own stylesheet at a
   self-chosen 900px. If the real window wants that behavior, it belongs in
   `daw-shell.js` and needs a breakpoint token.
3. **No breakpoint token exists** in `tokens.css`. This is the first page in the
   project to need one.

## OPEN, FOR TODO

- Done-check §7.1–7.8 on `tools/daw-window.html` — run headed, nothing has been.
- Strip double-mount ruling (item 1 above).
- Header stacking: page override vs `/src` fix (item 2 above).

## RULE CONFLICT

The harness told me mid-task to prefer Bash for reads and edits; the project rules
say to avoid Bash for reads and edits so the edits are visible. I followed the
project rule. Recorded here because the rule block says conflicts get reported.

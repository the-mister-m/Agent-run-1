RECEIPT — fix-drum-css — 2026-08-23 21:02 EDT

Seat: BUILD (repair), spawned by the Troubleshooter to close `test-p2` (P2/S7).

## DELIVERABLE STATE

Bug: `src/instruments/drum-synth.js` and `src/instruments/drum-sampler.js` each inject
their own `<style>` tag defining the SAME class names — `.ds-root`, `.ds-compact`,
`.ds-expanded`, `.ds-title`, `.ds-pads`, `.ds-pad`, `.ds-pad-label`, `.ds-row`,
`.ds-label`, `.ds-readout`, `.ds-meter`, etc — with different rule values. On any page
mounting both instruments (`/tools/beat.html` does exactly this), whichever stylesheet
lands second in the document wins every tie, so the two machines' styling silently
fought depending on mount order. Cosmetic only — both instruments still played
correctly — but a real, confirmed conflict (test-report.md §9 item 2; beat-shell's
receipt, OPEN DECISIONS item 12).

Fix: renamed every `.ds-*` class name in each file to a distinct, provably
non-colliding namespace — cross-file only, no other lane touched:

- `src/instruments/drum-synth.js` — `.ds-*` → `.dsyn-*` (46 occurrences: CSS selectors,
  `className`/`classList` calls, and the template-literal pad markup). The style tag's
  own `id="drum-synth-styles"` and the matching `getElementById` guard were left as-is —
  already unique, not part of the collision.
- `src/instruments/drum-sampler.js` — `.ds-*` → `.dsam-*` (38 occurrences: CSS
  selectors, `classList.add`/`remove` calls, the two `@keyframes` names
  `ds-hit-flash`/`ds-miss-flash` → `dsam-hit-flash`/`dsam-miss-flash` for consistency,
  though animation names sit in a separate CSS namespace from class selectors and were
  never the actual collision).

No other file touched — not `step-grid.js`, `capture.js`, `clock.js`, `beat.html`, or
`CONTRACTS.md`. Confirmed via `git status` after the edit: only these two files show as
changed.

Verified for real in headless Chrome (Playwright), against a local static server rooted
at the project folder (`python3 -m http.server`, port 8934):

- Throwaway test page (`docs/scratchpad/test-drum-css.html`, deleted after the run —
  not part of the repo) mounted both instruments side by side in BOTH injection orders:
  Order A (Drum Synth mounted/injected first, Drum Sampler second) and Order B
  (Sampler first, Synth second) — the exact ordering ambiguity that caused the bug.
  - Computed styles: Drum Synth's compact root reads `padding: 6px 8px` in BOTH orders;
    Drum Sampler's compact root reads `padding: 8px 10px` in BOTH orders. Each
    instrument's own rule wins regardless of injection order — order-independent,
    proving the collision is gone.
  - Root class names confirmed distinct: `dsyn-root dsyn-compact` vs.
    `dsam-root dsam-compact` — no shared token between the two families.
  - Grepped the live injected `<style>` content in-browser for any leftover
    un-namespaced `.ds-` selector (pattern `\.ds-(?!yn-|am-)`) — none found.
  - Functional: clicked a Drum Synth pad — voice count went 0 → 1 (noteOn fired
    correctly), no throw. Clicked a Drum Sampler pad (no kit loaded) — no throw.
  - Expanded vs. compact visually distinct, both machines: Drum Synth
    `6px 8px` (compact) vs. `28px 36px` (expanded); Drum Sampler `8px 10px` (compact)
    vs. `32px 40px` (expanded).
  - 0 console errors, 0 page errors on the test page.
- `/tools/beat.html` (UNEDITED, read-only) loaded directly — 0 console errors, 0 page
  errors. In-page check confirmed 200 elements carrying `dsyn-*` classes and 30 carrying
  `dsam-*` classes actually mounted (both real instruments rendered on the real page,
  not just the throwaway harness), and zero elements anywhere on the page still carry a
  stale un-namespaced `ds-*` class.

Zero regressions found.

## NEXT ACTION

None for this seat. Bug closed. Reporting back to the Troubleshooter.

## OPEN DECISIONS

None raised by this fix.

## FILE LOCATIONS

- Edited: `src/instruments/drum-synth.js` (46 `.ds-*` → `.dsyn-*` renames, no other
  change)
- Edited: `src/instruments/drum-sampler.js` (38 `.ds-*` → `.dsam-*` renames, no other
  change)
- Verify script (scratch, not part of the repo): Playwright check script under this
  session's scratchpad — not committed, listed here only for traceability.
- Source bug report: `Builddocs/P2-beat-tool/S7-verify/test-report.md` §9 item 2
- Related: `Builddocs/P2-beat-tool/S6-shell/receipt-beat-shell.md` OPEN DECISIONS item 12

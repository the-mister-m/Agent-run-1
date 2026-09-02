RECEIPT — SWEEP — 2026-08-31 03:20 EDT

- phase reached: dry-run
- Band A: expected 118  found 118  PASS
- Band B: expected 326  confirmed 326  pulled 0
- files touched: 16 of 18 scanned
- chord-module.js sites found: 50   reader: bytes/surrogateescape (NUL byte confirmed present post-read, byte-exact round-trip verified)
- entries deliberately skipped: 2 measured<expected (font-family `system-ui, sans-serif`, padding `6px`) + 35 safe_for_script:false + 1 zero-site token (line-height `1.15`, no real sites)
- stop-and-reports: none — see SCOPE NOTE below, resolved not escalated

SCOPE NOTE
- token-map.json's `measurement_scope` flags "16 style-bearing files" against
  the S2 lane table's 15/17. The S2-token-sweep.md lane table (read for the
  Four Fences only, per brief) does not list `src/surfaces/comp-builder.js`,
  but token-map.json entries name it directly (border-radius 9px, 3px note).
  Added it to sweep.py's scan list — it is inside the map's authority, not
  outside it. With it added: 18 files scanned, 16 touched, matching the
  map's own "16 style-bearing files" figure exactly, and total sites land on
  444/444.

BUGS FOUND AND FIXED IN sweep.py (not in the map — in my own matcher)
- `\b` word-boundary treated `-` as a boundary, so a `gap` search matched
  inside the custom property `--shell-gap` in shell.js:149. Fixed with a
  `(?<![-\w])` lookbehind. (Band A gap:12px was 119 before this fix.)
- Value-terminator regex only accepted `;` or `}`. Missed
  overtone-synth.js:619, a `border: 1px solid ...` inside a backtick-ended
  template string with no trailing semicolon. Added backtick as a valid
  terminator. (Band B border:1px was 62 before this fix.)
- Every one of the 60 processed entries (17 Band A + 43 Band B) now matches
  its own `measured_sites` figure in token-map.json exactly, entry by entry,
  not just in aggregate.

FILES
- Builddocs/skinspecs/sweep.py
- Builddocs/skinspecs/dry-run-report.md
- Builddocs/skinspecs/receipts/receipt-sweep.md

No source file under src/ or tools/ was written. `--apply` was not passed.

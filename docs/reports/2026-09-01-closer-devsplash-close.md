CLOSER RECEIPT — devsplash close — 2026-09-01, ~15:40 EDT

Reviewed: [receipt-span-1.md](../../Builddocs/specs/devsplash/receipt-span-1.md) ·
[receipt-span-2.md](../../Builddocs/specs/devsplash/receipt-span-2.md)

CHECKED AGAINST FILE STATE
- Zero `src/` edits — CONFIRMED. `git status --short src/` lists the same 19 modified /
  untracked files as the session-start snapshot, nothing new. `daw-shell.js` still exports
  `mountProjectHeader` (line 393), `mountTransportBar` (line 468), `mountPlayingSurface`
  (line 590) — the three §2 signatures span 2 claims are untouched.
- Persistence code — CONFIRMED present: `STORE_KEY = 'cbdaw-devsplash:layout'`,
  `serializeNode`/`deserializeNode`/`saveLayout`/`readStoredLayout` all in
  [tools/dev-splash.html](../../tools/dev-splash.html), wired into all six mutators plus the
  divider pointerup, matching the receipt's file list.
- 37-row catalog / leak-pass deltas / round-trip byte-identity — NOT independently
  re-counted or re-run (catalog entries expand per-channel at runtime; the task instructed
  no browser re-verification). Trusted from the receipts' headed-Chrome numbers.
- `console.error` on refusal / ch1-only note bus — both present in source
  (`tools/dev-splash.html:1054,1146` and `:542-547`), matching what both receipts flag as
  Brandon's calls.

DISCREPANCY
- Both receipts carry in-text timestamps (span 1 "14:20–15:10", span 2 "15:11–16:05")
  that don't match the files' actual mtimes (SPEC.md 14:43, receipt-span-1.md written
  15:11, receipt-span-2.md written 15:25 — all before the claimed 16:05 stop). Narrative
  clock, not wall clock. Not acted on; noting it for Brandon.

DONE
- CLAUDE.md map: added `tools/dev-splash.html` (was missing despite the build being spec-
  complete) and `Builddocs/specs/devsplash/` under the Builddocs bullet.
- SESSIONLOG.md: added the missing span-2 index line (full entry already existed at
  2026-09-01 16:05 EDT, just absent from the top index) and this close's line.
- MEMORY.md: added the devsplash LAST WEEK bullet and a new WARM START block (situation /
  last state / next move / links), 12 lines.
- Stray files: `docs/scratchpad/devsplash-probe*.png` left in place — not the closer's call
  per the task's own instruction.

NOT DONE, NOT THIS SEAT
- The two flags for Brandon (note bus ch1-only, refusal `console.error` left loud) are
  recorded in the warm start and the session review, not resolved.

RECEIPT — fix-shell-availability — 2026-08-23 21:00 EDT

Seat: BUILD (repair), spawned by the Troubleshooter to close `test-p2` (P2/S7).

## DELIVERABLE STATE

Bug: `src/ui/shell.js` line 58 had the `beat` row in the `TOOLS` table stuck at
`available: false, phase: 'P2'`, even though Beat is fully built and shipped at
`/tools/beat.html`. The file menu on `wave-synth.html` and `overtone-synth.html` was
disabling the Beat entry and tagging it "P2 — not built yet."

Fix: one-line flip. `available: false` → `available: true` on the `beat` row. Nothing
else in the file touched — same line, same object, no other field changed.

Verified for real with Playwright (headless Chromium) against a local static server
rooted at the project folder (`python3 -m http.server`, port 8791):

- `/tools/wave-synth.html` — loads clean, 0 console errors, 0 page errors. File menu
  opened; Beat entry: `disabled=false`, tag reads `"P2"` (no longer "not built yet"),
  label "Beat".
- `/tools/overtone-synth.html` — same: loads clean, 0 console errors, 0 page errors,
  Beat entry enabled, tag `"P2"`.
- Click-through test: opened the file menu on `wave-synth.html`, clicked the Beat
  entry, page navigated to `/tools/beat.html` (confirmed via `page.url()`), 0 console
  errors during navigation.
- `/tools/beat.html` loaded directly — clean, 0 console errors, 0 page errors. Nothing
  there broke.

Zero regressions found on any of the three pages.

## NEXT ACTION

None for this seat. Bug closed. Reporting back to the Troubleshooter.

## OPEN DECISIONS

None raised by this fix.

## FILE LOCATIONS

- Edited: `src/ui/shell.js` (line 58 only)
- Verify scripts (scratch, not part of the repo): Playwright check scripts under this
  session's scratchpad — not committed, listed here only for traceability.
- Source bug report: `Builddocs/P2-beat-tool/S7-verify/test-report.md` §9 item 1
- Related: `Builddocs/P2-beat-tool/S6-shell/receipt-beat-shell.md` OPEN DECISIONS item 2

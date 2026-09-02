SESSION REVIEW — token-map.json write — 2026-08-31

Used seat1's already-measured output (`new-entries.json`, receipt
`docs/reports/2026-08-31-seat1-tooling-sweep-measurement.md`). The file
was missing from scratchpad at start (script had stopped mid-run before
writing it); re-ran the same unmodified `build_entries.py` to reproduce
it — no re-measurement, no re-classification, no new script.

EDITS
- [Builddocs/skinspecs/token-map.json](../../Builddocs/skinspecs/token-map.json) — 195 entries appended (115 → 310), all unique vs existing, 0 duplicates
- [src/ui/tokens.css](../../src/ui/tokens.css) — 15 new tokens: `--tt-label`, `--ring-off`, `--ring-off-lg`, `--z-popover`, `--z-sticky`, `--z-raise-2`, `--z-raise-1`, `--z-behind`, `--fade-faint/-half/-mid/-strong/-label/-near`, `--canvas-lw` — state/function/label comments only

STRAY FILES
- none — scratchpad scripts/outputs stayed in scratchpad, not copied into the repo

GOALS DONE
- Job 1 (generate map): 195 entries written, 0 skipped as unusable — all of seat1's classified output was schema-compatible with the existing map and got appended as-is
  - of the 195: 65 entries / 116 sites carry a real token (script-safe or hand work)
  - 130 entries / 332 sites are escalations (`token: null`) — no S1-named axis, `0`/`none` stays literal, em/ch relative units, margin/border-left longhands, no-palette-match paint values, `font: inherit`, transition/animation shorthands off the duration scale — each carries its own `reason`, none invented here
- Job 2 (define tokens): 15 tokens written to `tokens.css`, roles from seat1's call-site reading, not guessed
- Job 3 (script reach / sweep.py edits): not this seat's job — parked for the later applying seats per the task brief
- Job 4 (dry run): not run — no `sweep.py` edits happened here to re-run it against

SKIPPED, NOT WRITTEN AS ENTRIES
- the ~35 `--sp-*`-scale-miss px sizes and ~20 `em`/`ch` sizes named in seat1's receipt — Brandon has not ruled on a size scale; not this seat's call, skipped per the task brief, not re-litigated

BRANDON'S TODOS
- rule on the size-scale question (px sizes off `--sp-*`, em/ch relative sizes) — same open item seat1 flagged, still open
- rule on transition/animation shorthand durations off `--dur-fast/--dur-med`

CLOSER REVIEW
- Gets copy of review, not a contract.
- Verify `token-map.json` is valid JSON and 310 entries — closer / can spot-check
- Confirm the two later "applying" seats (sweep.py reach, dry run) pick this map up — Brandon

# Token sweep — progress state

## Applied
- `sweep.py --apply` run once. 73 substitutions landed (Band A 4, Band B 69),
  12 of 18 files touched. Confirmed idempotent on rerun (0 remaining).
- Files touched (from dry-run report before apply): src/surfaces/comp-builder.js,
  tools/harmonyNEW.html, and 10 others per the 12-file dry-run breakdown.

## Unblocked (2026-08-31, Sonnet scanfix seat)
- Brandon's ruling: "chord module is out." chord-module.js stays archived.
  measure2.py, measure.py, scan_props.py scan lists updated to drop it —
  no longer blocked on its path. See
  docs/reports/2026-08-31-sonnet-scanfix-measure.md.
- diff.py, classify.py, build_entries.py had dead exec() paths pointing at
  a scratchpad from a dead session — repointed to the real measure2.py via
  each script's ROOT Path object. build_entries.py's new-entries.json write
  path repointed too. Not run — that's the next seat's job.

## measure2.py current numbers (chord-module.js out of scope, sweep applied)
- distinct: 166, raw sites: 398, canvas distinct/sites: 33/73,
  _fade distinct/sites: 6/8. No WARNING lines.
- NOT a clean comparison to the old 499/221 baseline — that number predates
  both the sweep apply and the chord-module.js archive. Full detail in the
  report above.

## Tool trust — standing note
- These measurement scripts were built by prior agent seats without being
  asked for. Brandon is salvaging them, not maintaining them. They are not
  authoritative until checked against the source.
- Confirmed hole: measure2.py's FADE_RE matched the color argument as
  `[\w.]+`. Real calls pass `t['--accent']`. It reported 0 _fade sites on
  every run ever made. Fixed to `[^,]+` — now 6 distinct / 8 sites, which
  matches the FADE_TOKEN table build_entries.py already carried.
- Assume more holes of this shape. A count of 0 from these scripts means
  "found nothing," not "nothing is there."

## For the Closer — principle to carry forward
- Last session's rule was "zero is not a confirmation." Too narrow.
  Three of this session's four catches were confident WRONG POSITIVES, not
  zeros: 71 entries labeled "value is a variable" when a token for each
  already sat in tokens.css; --outline-off assigned to a token that does not
  exist; classify.py and build_entries.py answering font-style differently.
- Wider rule: a claim is worth nothing unless something independent can
  contradict it. Zero is the special case where the claim is "nothing here."
- Every catch this session landed at a seam between two files. Seats were
  scoped by file. No seat owned a seam. That is a scoping fault, not a seat
  fault.

## Chunk 2 — done
- Spot-checked drum-synth.js, keyboard.js, scale-circle.js. All var(--)
  substitutions sit inside declaration values. Clean — see report above.

## Session end state — 2026-08-31
- 844 raw CSS sites -> 22. 823 substitutions applied, idempotent, arithmetic
  closes. tokens.css 113 -> 262. token-map.json 393 entries, 380 tokened.
- 22 remaining: 4 need Brandon's ruling, 16 behind escalation entries pending
  a ruling, 1 genuine variable, 1 .bt-top (Brandon's).
- Canvas 73 assignments + 8 _fade alphas untouched — not CSS, needs
  getComputedStyle wiring.
- Full account: docs/reports/2026-08-31-session-agent-review-skin-sweep.md

## Not started
- Chunk 3 (42 compound-shorthand entries, by hand)
- diff.py / classify.py / build_entries.py steps 4-8 (run + review)

## Next seat
- Read this file first.
- Do NOT re-run `--apply` (idempotent, but no need).
- diff.py/classify.py/build_entries.py are repointed but unrun — run them
  next, or proceed to Chunk 3.

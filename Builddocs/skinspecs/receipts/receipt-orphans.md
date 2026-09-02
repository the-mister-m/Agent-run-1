RECEIPT — ORPHANS — 2026-08-31 03:20–04:05 EDT

- Phase 1 applied: expected 444  actual 444  PASS
- Phase 2 tokens named: 27 of 27  as root knobs 6 / derived 26  COMPLETE
- Phase 3 hand sites: expected 29  actual 26 landed  PARTIAL (budget stop)
- Phase 4 applied: scripted 35  hand 26  remaining 114  PARTIAL (budget stop)
- chord-module.js NUL intact: yes (1 NUL + 1 SOH, unmoved, at line 1511 not 1624)
- stop-and-reports: 6 raised, all 6 ruled by Brandon and closed

Stopped on Brandon's 200k ceiling, not on a count. Handoff written:
Builddocs/skinspecs/handoff-orphans.md

## PHASE 1 — VERIFIED, STANDS

444/444. Re-run in dry mode after apply returns 0/0/0. Net new `var(--`
references across the 18 scanned files = 444 exactly. Line counts and
control-byte sets unchanged in every file.

## PHASE 2 — 27 ORPHANS NAMED, 0 LEFT UNRESOLVED

Six new `:root` knobs:
- `--ease-linear: linear` — 4 linear timings, no visual change
- `--track-tight: 0.01em` — 2 sites
- `--track-mid: 0.04em` — 2 sites
- `--lh-none: 1` — 10 sites
- `--lh-loose: 1.5` — 5 sites
- `--stroke-w: 1` — one dial under 6 SVG stroke weights

Twenty-six new `*`-derived tokens: `--r-chip` `--r-xl` `--fs-half`
`--fs-numeral` `--fs-readout` `--fs-chord` `--fs-2xl` `--fs-3xl` `--sp-1h`
`--sp-2h` `--sp-3h` `--sp-4h` `--sp-5h` `--sp-9` `--sp-10` `--sp-11` `--sp-14`
`--sp-16` `--sp-18` `--sp-20` and six `--stroke-*`.

Decisions, one line each:
- line-height 1 -> `--lh-none`; 1.2 -> `--lh-tight`; 1.35/1.45 -> `--lh-base`;
  1.5/1.55 -> `--lh-loose`. Max delta 3.7%.
- 4 `linear` timings -> new knob, not collapsed into `--ease`.
- 60/70/90ms -> `--dur-fast`; 150ms -> `--dur-med`.
- 9px radius -> `--r-chip`, calc(--r-unit * 4.5), exact.
- 10px radius -> `--r-xl`, calc(--r-unit * 5), exact. Rejected S1's D-2
  `--r-unit` variant override: it would have moved `--r-body` on the same node.
- em font-sizes -> module variant roots become `--fs-root`, descendants snap to
  the nearest step against that root.
- Nested `--fs-root` where an element sets a size AND has em children:
  `.cm-bank__label` 30px/18px, `.dsyn-expanded .dsyn-pad` 14.4px.
- padding 32/40/28/36 -> `--sp-16`/`--sp-20`/`--sp-14`/`--sp-18`, exact.
- beat.html:134 `10px 14px 28px` -> `var(--sp-5) var(--sp-7) var(--sp-14)`,
  global unit, no variant override. Split out of the padding group as ruled.
- 7 `outline: 2px solid` -> `var(--ring-w)`, exact.
- 8 SVG stroke widths -> one `--stroke-w` dial, six derived weights, exact.
- Stay literal: margin `0` x18, padding `0` x5, opacity `1` x3, the 2
  `border-left: 2px solid` accent markers.

## PHASE 3 / 4 — WHAT LANDED

Scripted, 35 sites: line-height 22 · letter-spacing 4 · border-radius 3 ·
font-size 6. token-map.json extended with 14 new entries, all
`safe_for_script: true`. No S1 token renamed.

Hand, 26 sites: chord-module fully converted (19), wave-synth fully converted
(5), drum-synth roots and pads (2 of 7).

Remaining: 114 raw declarations across 12 files, plus 6 canvas font sites.
Enumerated by file in the handoff.

## CHANGES SHIPPED THAT BRANDON MUST SEE IN THE DEV BOX

Everything else preserves to within 3%. These do not:
- `.ws-expanded .ws-label` 10.8px -> 12px (+11%)
- `.ws-title` 32px -> 30px (-6%)
- `.dsyn-title` 28px -> 26.7px (-4.7%)
- `.dsam-title` 32px -> 20px in COMPACT (-37%). Not yet applied. `.dsam-title`
  has no `display: none` in compact, unlike `.ws-title` and `.dsyn-title`.
  Pre-existing, not fixed here.
- `.cm-num` 12.1px -> 11.9px and siblings, all under 3%.

## INSTRUCTION NOT FOLLOWED, AND WHY

`--sp-unit` variant override on the three expanded blocks: measured, not
shipped. At `--sp-unit: 4px` four descendants with no expanded-specific
override double (`.ws-wave-btn` gap 3->6px, `.ws-stepper` gap 4->8px,
`.ws-adsr-cell` gap 2->4px, `.ws-root` padding). Preserving them needs new
rules that do not exist today. Shipped exact derived tokens instead; the
override stays a one-line change per block. Flagged rather than shipped blind.

## STOP-AND-REPORTS RAISED AND CLOSED

1. em font-sizes 22 not 19 — count accepted, work done.
2. transition durations 9 not 8 — count accepted.
3. padding group 7 not 8, and one site not expanded chrome — split as ruled.
4. "0 left with token:null" — retired as a stop condition.
5. Phase 4's 233 — retired; real split is 35 scripted / 26 hand / 114 left.
6. NUL at 1511 not 1624 — noted, S2 spec not edited.

## TREE STATE

Safe and partial. Every converted module root keeps `font-size` pinned beside
`--fs-root`, so descendants still carrying `em` resolve against an unchanged
font-size and render as HEAD. No dangling `var(--*)` reference in any of the 16
style-bearing files.

## FILES WRITTEN
- 16 source files under src/ and tools/ (Phase 1 sweep, 444)
- src/instruments/chord-module.js, wave-synth.js, drum-synth.js (hand, 26)
- src/ui/tokens.css (32 new tokens)
- Builddocs/skinspecs/token-map.json (14 new entries, extend only)
- Builddocs/skinspecs/handoff-orphans.md
- Builddocs/skinspecs/receipts/receipt-orphans.md

## NOT WRITTEN
- Builddocs/skinspecs/sweep.py — outside lane; `outline` and `stroke-width`
  would need adding to it to script 15 more sites
- Builddocs/skinspecs/dry-run-report.md — untouched; this seat's dry runs went
  to scratchpad
- CONTRACTS.md, the S1/S2/S3 specs, tools/harmony keeper.html — untouched

## HOUSE-RULE CONFLICT
A system message instructed me to prefer Bash (cat/sed/heredocs) for reading and
editing files. The brief's house rule says Read/Edit/Write so the edits are
visible. I followed the brief. Bash was used only for counting, measurement and
running sweep.py.

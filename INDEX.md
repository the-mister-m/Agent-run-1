Updated 2026-08-31 — Closer

# INDEX — Chromebook DAW / Agent run 1
Rules: GLOBAL-RULES.md. Links only, no summaries.

## TOP INDEX
- MAPDOCS — ≈line 12
- CODE — ≈line 15
- DOCS — ≈line 44
- SESSIONS — ≈line 73
- SKINSPECS — ≈line 92

## MAPDOCS
(none yet)

## CODE
- [src/core/audio.js](src/core/audio.js) — audio-core engine: voicePool, governor, atomic steal
- [src/core/input.js](src/core/input.js) — input bus, routes surfaces to instruments
- [src/instruments/wave-synth.js](src/instruments/wave-synth.js) — Wave Synth instrument
- [src/instruments/overtone-synth.js](src/instruments/overtone-synth.js) — Overtone Synth instrument
- [src/surfaces/keyboard.js](src/surfaces/keyboard.js) — piano keyboard surface, one-hand QWERTY, layout regenerated per base note
- [src/vis/spectrum.js](src/vis/spectrum.js) — spectrum analyzer visual (Wave Synth's view)
- [src/vis/scope.js](src/vis/scope.js) — oscilloscope visual (Overtone Synth's view)
- [src/ui/shell.js](src/ui/shell.js) — standalone tool shell: mount/dispose, style export, file menu
- [src/ui/tokens.css](src/ui/tokens.css) — design tokens, palette (PROVISIONAL, unconfirmed — Brandon at P4)
- [tools/wave-synth.html](tools/wave-synth.html) — standalone Wave Synth page
- [tools/overtone-synth.html](tools/overtone-synth.html) — standalone Overtone Synth page
- [src/core/clock.js](src/core/clock.js) — transport: tempo, meter, position, loop, count-in, scheduler
- [src/surfaces/step-grid.js](src/surfaces/step-grid.js) — step grid + counting ruler, drives either drum machine
- [src/instruments/drum-synth.js](src/instruments/drum-synth.js) — 8 synthesized drum pieces
- [src/instruments/drum-sampler.js](src/instruments/drum-sampler.js) — 8 sampled drum pieces, kit-loading
- [src/core/capture.js](src/core/capture.js) — record/capture/loop-overdub/punch/undo, notes only
- [src/core/state.js](src/core/state.js) — state owner: §4 scale state + pub/sub, the store every surface subscribes to
- [assets/kits/](assets/kits/) — 808 and acoustic kits, kits.json manifest
- [tools/beat.html](tools/beat.html) — standalone Beat Tool page (Drum Synth + Drum Sampler)
- [src/theory/scale.js](src/theory/scale.js) — scale/degree/color/pitch-label engine, no imports, no lookup tables
- [src/theory/chord.js](src/theory/chord.js) — chord engine: skip-stack, numeral/letter naming (incl. six 7th-chord letter qualities, F4), inversions, note bank
- [src/surfaces/scale-circle.js](src/surfaces/scale-circle.js) — circle surface, 7 slots + Do at 1/8, opus-class seat
- [src/surfaces/diatonic-keys.js](src/surfaces/diatonic-keys.js) — diatonic keys surface, plain digits (M-10)
- [src/surfaces/piano-roll.js](src/surfaces/piano-roll.js) — piano roll surface, in-key shading, largest surface in the app
- [src/instruments/chord-module.js](src/instruments/chord-module.js) — harmony brain instrument, CONTRACTS §2, routes to any loaded instrument
- [tools/harmony.html](tools/harmony.html) — standalone Harmony Tool page, all three P3 surfaces live at once
- [src/ui/skins/_template.skin.css](src/ui/skins/_template.skin.css) — skin template, every knob + default, passes validate-skin.js clean

## DOCS
- [BUILDPLAN.md](Builddocs/BUILDPLAN.md) — run map, every seat reads first
- [CONTRACTS.md](Builddocs/CONTRACTS.md) — interfaces every seat binds to; §1-§10 CONFIRMED 2026-08-22, §11 Voice/§12 Input added + amended 2026-08-23 (P1), §13 Grid/§14 Kits amended 2026-08-24 (P2), §3 clock surface + §4 twelve scales + §14.1 drum labels amended 2026-08-24 (P3 unblock), §6 Overlay Labels + §15 Theory (new) amended 2026-08-24 (P3 S1+S2) — movable do, D-16 reversed; §9 fifth token `--deg-aug` + §15.2c stepLabel-ownership fix (M-14/M-10 ruled) + F4 six 7th-chord letter names, all 2026-08-24 (P3 S3-S6)
- [ROSTER.md](Builddocs/ROSTER.md) — every seat, function, ratings
- [Glyph and Color Rules.md](Glyph%20and%20Color%20Rules.md) — root doc, 7 questions for Brandon on accidental glyphs, label-vs-colour, and chord spelling past the 7ths; Q1/Q3/Q5 marked agent work
- [P0-run-open/scope.md](Builddocs/P0-run-open/scope.md) — cut scope: in/out/deferred/sized
- [P0-run-open/findings-webaudio.md](Builddocs/P0-run-open/findings-webaudio.md) — Web Audio recon, real browser measurements
- [P0-run-open/open-decisions.md](Builddocs/P0-run-open/open-decisions.md) — 28 items for Brandon; D-1/D-15 CLOSED 2026-08-24, D-16 SUPERSEDED 2026-08-24 (fixed do → movable do), none now blocking P3
- [P3-harmony-tool/S1-spec/receipt-spec-scale.md](Builddocs/P3-harmony-tool/S1-spec/receipt-spec-scale.md) — P3/S1: CONTRACTS §15 written, all 15 open decisions closed
- [P3-harmony-tool/S2-theory-check/theory-report.md](Builddocs/P3-harmony-tool/S2-theory-check/theory-report.md) — P3/S2: PASS, 16 mismatches (3 repaired, 3 closed, 10 open for Brandon; M-10/M-14 since ruled)
- [P3-harmony-tool/S2-theory-check/receipt-redpen-theory.md](Builddocs/P3-harmony-tool/S2-theory-check/receipt-redpen-theory.md) — P3/S2 receipt
- [P3-harmony-tool/S3-scale-engine/receipt-scale-engine.md](Builddocs/P3-harmony-tool/S3-scale-engine/receipt-scale-engine.md) — P3/S3: scale.js shipped, done-check reproduces theory-report Q7/Q9 character-for-character
- [P3-harmony-tool/S4-chord-engine/receipt-chord-engine.md](Builddocs/P3-harmony-tool/S4-chord-engine/receipt-chord-engine.md) — P3/S4: chord.js shipped incl. F4's six 7th-chord letter names, done-check 120/0 fail
- [P3-harmony-tool/S5-surfaces/receipt-scale-circle.md](Builddocs/P3-harmony-tool/S5-surfaces/receipt-scale-circle.md) — P3/S5: scale-circle.js shipped, 2 visual bugs found+fixed in real Chrome
- [P3-harmony-tool/S5-surfaces/receipt-diatonic-keys.md](Builddocs/P3-harmony-tool/S5-surfaces/receipt-diatonic-keys.md) — P3/S5: diatonic-keys.js shipped, 11/11 done-check
- [P3-harmony-tool/S5-surfaces/receipt-piano-roll.md](Builddocs/P3-harmony-tool/S5-surfaces/receipt-piano-roll.md) — P3/S5: piano-roll.js shipped, 1124/1124 done-check (node half; browser half unrun, no browser in that seat)
- [P3-harmony-tool/S5-surfaces/receipt-state-seam.md](Builddocs/P3-harmony-tool/S5-surfaces/receipt-state-seam.md) — P3/S5: core/state.js built, three surface stand-ins deleted and rewired
- [P3-harmony-tool/S6-chord-module/receipt-chord-module.md](Builddocs/P3-harmony-tool/S6-chord-module/receipt-chord-module.md) — P3/S6: chord-module.js + tools/harmony.html shipped, P3 build closed, 61/61 done-check in real Chrome
- [P1-tone-tool/PHASE.md](Builddocs/P1-tone-tool/PHASE.md) — P1 goal, stage order, done-check
- [P1-tone-tool/S5-verify/test-report.md](Builddocs/P1-tone-tool/S5-verify/test-report.md) — P1 verify: pass/fail, metrics, voice-cap burst bug found and fixed
- [P1-tone-tool/S5-verify/redpen-report.md](Builddocs/P1-tone-tool/S5-verify/redpen-report.md) — P1 verify: D-1..D-9 drift items, Q5 curriculum items parked for Brandon at P4
- [P2-beat-tool/S7-verify/test-report.md](Builddocs/P2-beat-tool/S7-verify/test-report.md) — P2 verify: 9/9 seat done-checks, clock holds 0.000000ms drift, metrics
- [P2-beat-tool/S7-verify/redpen-report.md](Builddocs/P2-beat-tool/S7-verify/redpen-report.md) — P2 verify: zero lane violations (mtime-audited), 7 drift items, none blocking
- [P2-beat-tool/open-decisions.md](Builddocs/P2-beat-tool/open-decisions.md) — 9 items for Brandon, all 9 ruled; P2-6 CLOSED 2026-08-24 into CONTRACTS §3
- [P3-harmony-tool/S7-verify/test-report.md](Builddocs/P3-harmony-tool/S7-verify/test-report.md) — P3 verify: nine seat questions, all PASS, two UNVERIFIED, invert() bug reproduced
- [P3-harmony-tool/S7-verify/receipt-test-p3.md](Builddocs/P3-harmony-tool/S7-verify/receipt-test-p3.md) — P3/S7 test-p3 receipt
- [P3-harmony-tool/S7-verify/redpen-report.md](Builddocs/P3-harmony-tool/S7-verify/redpen-report.md) — P3 verify: both stop conditions cleared, 14 drift items, one chartered lane crossing, zero code touched
- [P3-harmony-tool/S7-verify/receipt-redpen-p3.md](Builddocs/P3-harmony-tool/S7-verify/receipt-redpen-p3.md) — P3/S7 redpen-p3 receipt

## SESSIONS
- [SESSIONLOG.md#2026-08-31 — Colors/contracts](SESSIONLOG.md) — chord-quality color removed, §15.9 stale prose cut, voicing ruled stricter, gain normalization named
- [2026-08-31-session-review-colors-contracts.md](docs/reports/2026-08-31-session-review-colors-contracts.md) — session review
- [2026-08-31-closer-colors-contracts.md](docs/reports/2026-08-31-closer-colors-contracts.md) — closer receipt
- [SESSIONLOG.md#2026-08-31 — Keyboard QWERTY relayout](SESSIONLOG.md) — one-hand layout, generator replaces static map, exact-note lighting
- [SESSIONLOG.md#2026-08-31 — Chord naming, bare-7th close](SESSIONLOG.md) — flatFive/sharpFive count-4 names wired, both tables complete
- [SESSIONLOG.md#2026-08-30 — 9th-chord naming](SESSIONLOG.md) — 24-row + 6-row ruling, all wired, 2 new qualities
- [SESSIONLOG.md#2026-08-24 — P3 verify](SESSIONLOG.md) — test-p3/redpen-p3 closed P3, 14 drift items sorted into TODO.md, tokens.css comment fixed, 4 stale docs corrected
- [2026-08-24-closer-p3-verify.md](docs/reports/2026-08-24-closer-p3-verify.md) — closer receipt, P3 verify close, 2 discrepancies found and fixed (ROSTER.md BUILD count, 16→14 findings count)
- [2026-08-22-p0-close.md](docs/sessions/2026-08-22-p0-close.md) — P0 closed, CPU costs corrected, security bypass flagged
- [2026-08-22-closer-p0-close.md](docs/reports/2026-08-22-closer-p0-close.md) — closer receipt, no discrepancies found
- [2026-08-23-p1-run.md](docs/stickies/2026-08-23-p1-run.md) — P1 driver's sticky: every judgment call this session, in order, timestamped
- [2026-08-23-closer-p1-close.md](docs/reports/2026-08-23-closer-p1-close.md) — closer receipt, P1 close
- [SESSIONLOG.md#2026-08-23 — P2 close](SESSIONLOG.md) — P2 (Beat Tool) closed, 5 repair seats, clean audit
- [2026-08-23-closer-p2-close.md](docs/reports/2026-08-23-closer-p2-close.md) — closer receipt, P2 close, no discrepancies found
- [SESSIONLOG.md#2026-08-24 — P3 unblock](SESSIONLOG.md) — D-1 and P2-6 answered and written, nothing blocks P3
- [2026-08-24-closer-p3-unblock.md](docs/reports/2026-08-24-closer-p3-unblock.md) — closer receipt, P2-3 verified direct against source, no filed subagent receipt
- [2026-08-24-p3-s1-s2.md](docs/sessions/2026-08-24-p3-s1-s2.md) — P3 S1+S2 session review: theory spec written, D-16 reversed, redpen PASS, S3 clear
- [SESSIONLOG.md#2026-08-24 — P3 S1+S2](SESSIONLOG.md) — full entry, decisions and open items
- [2026-08-24-p3-s3-s6.md](docs/sessions/2026-08-24-p3-s3-s6.md) — P3 S3-S6 session review: P3 build closed, state.js built, F4 ruled
- [SESSIONLOG.md#2026-08-24 — P3 S3-S6](SESSIONLOG.md) — full entry, decisions and open items
- [2026-08-24-closer-p3-s3-s6.md](docs/reports/2026-08-24-closer-p3-s3-s6.md) — closer receipt, P3 build close, no discrepancies found
- [2026-08-24-goto-p3-drift-five.md](docs/reports/2026-08-24-goto-p3-drift-five.md) — `Goto` receipt, five P3 drift items fixed in /src, §15.10 amendment proposed, five bind-methods documented for P4
- [2026-08-24-session-review-p3-reopen.md](docs/reports/2026-08-24-session-review-p3-reopen.md) — session agent review, P3 reopen: voicing ruled, count 14 → 11, closer actions

## SKINSPECS
- [Builddocs/skinspecs/S1-token-vocabulary.md](Builddocs/skinspecs/S1-token-vocabulary.md) — token vocabulary, RULED: 4 root dials, ~44 derived tokens, 6 axes
- [Builddocs/skinspecs/S2-token-sweep.md](Builddocs/skinspecs/S2-token-sweep.md) — mechanical sweep spec: 897 sites, 15 files, 9 lanes, collision map
- [Builddocs/skinspecs/S3-skin-contract.md](Builddocs/skinspecs/S3-skin-contract.md) — skin file contract + screenshot→skin agent brief
- [Builddocs/skinspecs/validate-skin.js](Builddocs/skinspecs/validate-skin.js) — S3's gate: completeness / WCAG / CVD teaching invariant / projector brightness
- [docs/sessions/2026-08-25-skinspecs.md](docs/sessions/2026-08-25-skinspecs.md) — session review: three specs shipped, no code touched
- [2026-08-25-closer-skinspecs.md](docs/reports/2026-08-25-closer-skinspecs.md) — closer receipt, skin specs close
- [2026-08-30-goto-p3-chord-naming.md](docs/reports/2026-08-30-goto-p3-chord-naming.md) — `Goto` receipt, Brandon's 24-row + 6-row chord-naming ruling, ALL cells wired (closed 2026-08-31); 2 new qualities (`flatFive`/`sharpFive`) added to scale.js/chord.js, 2 new circle color tokens (CVD-checked, pre-existing palette failure still open, Brandon's, later)

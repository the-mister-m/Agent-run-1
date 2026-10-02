Updated 2026-10-01 — GoTo session agent at Brandon's go, no closer (warm start rewritten for 10-01, limiter fact corrected)

# MEMORY — Chromebook DAW / Agent run 1
Rules: GLOBAL-RULES.md. Closer-only file. Lean: no superseded history.

## PROJECT
- Name: Chromebook DAW — Agent run 1
- Purpose: build a browser-based DAW spec'd for Chromebook hardware limits
- Stack / entry point: P1 + P2 shipped real /src — see [tools/wave-synth.html](tools/wave-synth.html), [tools/overtone-synth.html](tools/overtone-synth.html), [tools/beat.html](tools/beat.html)
- Runs: static file server, no build step — open the /tools pages directly
- Key paths: [BUILDPLAN.md](Builddocs/BUILDPLAN.md) · [CONTRACTS.md](Builddocs/CONTRACTS.md) · [ROSTER.md](Builddocs/ROSTER.md) · [P2-beat-tool/](Builddocs/P2-beat-tool/)

## DURABLE FACTS
- One master limiter exists, `setMasterLimiter()` in `src/core/audio.js`, default off; only Sound Lab switches it on — [limiter-test receipt](docs/reports/2026-10-01-limiter-test-receipt.md)
- Four separate level regimes coexist across tools — [SPEC-sound.md](docs/mapdocs/SPEC-sound.md)
- Three tool-page frame patterns exist, not two — [SPEC-pages.md](docs/mapdocs/SPEC-pages.md)
- The DAW's bottom Surface pane reaches no track, unverified in browser — [SPEC-daw-desktop.md](docs/mapdocs/SPEC-daw-desktop.md)
- Recording drops a live take when no editor is open — [SPEC-daw-desktop.md](docs/mapdocs/SPEC-daw-desktop.md)
- The tool registry in `src/ui/shell.js` is stale — [SPEC-cleanup.md](docs/mapdocs/SPEC-cleanup.md)
- `index.html` is the nav page, not the DAW (commits de3789f, 755abf0) — [SPEC-cleanup.md](docs/mapdocs/SPEC-cleanup.md)

## LAST WEEK — 2026-08-20 → 2026-10-01
- 09-04: noteOff seam closed — `_gainAt(t)` fix in wave-synth/overtone-synth, confirmed by ear.
- 10-01: tool fixes (synth voice shutoff, keyboard labels, patch Controllers, triplet toggle,
  beat Clear); roll/grid scroll at fixed bar width; arrangement `bar.beat` ruler; comp-builder
  octave stacking; limiter tests — master limiter does ~nothing, drum synth fails leveling.

## WARM START — 2026-10-01 — tool fixes landed, roll/grid scroll, comp octave stacking, limiter tested
- Situation: three agents on one night. The tool-fixes builder did five jobs. Session agent
  Fable did the roll click fix, the pane latch and the roll zoom. GoTo did roll/grid scroll,
  ruler labels, comp-builder octaves and the limiter tests (the last finished by a GoTo Opus
  subagent).
- Last state: docs updated; Brandon was about to commit and sync for the night. His
  master-limiter values in `audio.js` (−0.5 dB / 5:1 / 10 ms) were uncommitted at that point.
- Next move, in priority:
  1. **Master limiter: keep or remove.** Evidence: 0 dB reduction during music, ~0.2 dB
     makeup gain only, no clipping in normal mixes; the 4-lane stress clips either way.
     [limiter-test receipt](docs/reports/2026-10-01-limiter-test-receipt.md).
  2. **Drum synth onto the tool-fixes voice rules.** Gated, Brandon's call. It ducks early,
     steps up 0.43 when a voice frees and 0.67 on Stop (DAW path). `drum-synth.js:713`, `:720`,
     `:501`. [limiter-test receipt](docs/reports/2026-10-01-limiter-test-receipt.md).
  3. Ears, Brandon only:
     - comp squares after octave stacking;
     - arpeggios in the DAW after the voice shutoff;
     - roll/grid scrolling and pinned labels in a browser.
     [GoTo receipt](docs/reports/2026-10-01-goto-session-receipt.md) ·
     [tool-fixes receipt](docs/reports/2026-10-01-tool-fixes-receipt.md).
  4. `responseMs` shapes nothing now. Decide what it should do.
     [tool-fixes receipt](docs/reports/2026-10-01-tool-fixes-receipt.md).
  5. Receipt for Fable's 10-01 edits (roll click, pane latch + low octave, roll zoom). Not
     written yet. Its brief is in Brandon's paste; the source is the "Session agent edits, in
     full" section of the tool-fixes receipt, to be checked against the diff.
  6. **Capture off the bus.** Only the `input` singleton reaches Capture; pads and panel
     keyboards don't. [sequence-roll
     receipt](docs/reports/2026-09-08-sequence-roll-receipt.md).
  7. UI pass on the synth panels: `src/ui/knob.js` isn't adopted by Simple Synth or Overtone Synth.
  8. Drum takes land as a note array, not a pattern; recording onto an open drum region loses
     the take on stop. [sequence-roll receipt](docs/reports/2026-09-08-sequence-roll-receipt.md).
  9. Unison dial reads one step under the patch.
     [wave-synth-test receipt](docs/reports/2026-09-08-wave-synth-test-receipt.md) row 6.
  10. Roll and step-grid cap at 8 bars (`MAX_BARS`), so longer regions clip. The DAW drum pane
      only grows its bars, never shrinks (`daw.html:762`).
  11. Trough height — pick from [L6-shots/](docs/reports/L6-shots/).
  12. [master-index.md](docs/mapdocs/master-index.md) regen, then L7 module cards.
  13. DAW mobile — deferred, own gate. Two-saw PWM detune at high pitch — worklet later.
- Links: [GoTo receipt](docs/reports/2026-10-01-goto-session-receipt.md) ·
  [limiter-test receipt](docs/reports/2026-10-01-limiter-test-receipt.md) ·
  [tool-fixes receipt](docs/reports/2026-10-01-tool-fixes-receipt.md) · [TODO.md](TODO.md) ·
  [SESSIONLOG.md](SESSIONLOG.md)

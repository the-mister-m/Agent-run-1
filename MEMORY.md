Updated 2026-10-14 — GoTo session agent at Brandon's go, no closer (warm start rewritten for 10-14, edit commands)

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
- The piano roll and the arrangement each own their selection, clipboard and undo; roll undo is kept per region in `daw.html` — [edit-commands receipt](docs/reports/2026-10-14-goto-edit-commands-receipt.md)
- The repo graph is `library/graphs/graph.json`, built by Wayfinder; rescan after edits — [INDEX.md](INDEX.md) CODE

## LAST WEEK — 2026-08-20 → 2026-10-14
- 09-04: noteOff seam closed — `_gainAt(t)` fix in wave-synth/overtone-synth, confirmed by ear.
- 10-01: tool fixes (synth voice shutoff, keyboard labels, patch Controllers, triplet toggle,
  beat Clear); roll/grid scroll at fixed bar width; arrangement `bar.beat` ruler; comp-builder
  octave stacking; limiter tests — master limiter does ~nothing, drum synth fails leveling.
- 10-14: graph built; pinch zooms the page; lane picker 11px; DAW Keyboard panel expanded;
  edit commands in roll and arrangement (menu, undo, clipboard, select, alt-copy, lasso).

## WARM START — 2026-10-14 — edit commands in roll and arrangement
- Situation: GoTo alone, Brandon over SSH, no closer. Small DAW fixes, then edit commands
  for both windows, kept separate. A GoTo Sonnet session also worked the piano roll today
  ([ruler-range receipt](docs/reports/2026-10-14-piano-roll-ruler-range-receipt.md)).
- Last state: everything uncommitted. Headless Chromium passed; Brandon has not driven the
  edit commands by hand.
- Next move, in priority:
  1. **Brandon hands-on: edit commands.** Menu, keys, alt+drag, shift-lasso, undo across
     region switches. [edit-commands receipt](docs/reports/2026-10-14-goto-edit-commands-receipt.md).
  2. **Undone track delete.** Comes back at the bottom with a fresh instrument; knob, mixer
     and automation settings lost. Brandon to rule if OK.
  3. ⌘⇧A (Deselect All) may be taken by Mac Chrome. Unverified.
  4. Ruler-range receipt is not in SESSIONLOG.md or INDEX.md yet.
  5. **Master limiter: keep or remove.** Evidence: 0 dB reduction during music, ~0.2 dB
     makeup gain only, no clipping in normal mixes; the 4-lane stress clips either way.
     [limiter-test receipt](docs/reports/2026-10-01-limiter-test-receipt.md).
  6. **Drum synth onto the tool-fixes voice rules.** Gated, Brandon's call. It ducks early,
     steps up 0.43 when a voice frees and 0.67 on Stop (DAW path). `drum-synth.js:713`, `:720`,
     `:501`. [limiter-test receipt](docs/reports/2026-10-01-limiter-test-receipt.md).
  7. Ears, Brandon only:
     - comp squares after octave stacking;
     - arpeggios in the DAW after the voice shutoff;
     - roll/grid scrolling and pinned labels in a browser.
     [GoTo receipt](docs/reports/2026-10-01-goto-session-receipt.md) ·
     [tool-fixes receipt](docs/reports/2026-10-01-tool-fixes-receipt.md).
  8. `responseMs` shapes nothing now. Decide what it should do.
     [tool-fixes receipt](docs/reports/2026-10-01-tool-fixes-receipt.md).
  9. Receipt for Fable's 10-01 edits (roll click, pane latch + low octave, roll zoom). Not
     written yet. Its brief is in Brandon's paste; the source is the "Session agent edits, in
     full" section of the tool-fixes receipt, to be checked against the diff.
  10. **Capture off the bus.** Only the `input` singleton reaches Capture; pads and panel
     keyboards don't. [sequence-roll
     receipt](docs/reports/2026-09-08-sequence-roll-receipt.md).
  11. UI pass on the synth panels: `src/ui/knob.js` isn't adopted by Simple Synth or Overtone Synth.
  12. Drum takes land as a note array, not a pattern; recording onto an open drum region loses
     the take on stop. [sequence-roll receipt](docs/reports/2026-09-08-sequence-roll-receipt.md).
  13. Unison dial reads one step under the patch.
     [wave-synth-test receipt](docs/reports/2026-09-08-wave-synth-test-receipt.md) row 6.
  14. Roll and step-grid cap at 8 bars (`MAX_BARS`), so longer regions clip. The DAW drum pane
      only grows its bars, never shrinks (`daw.html:762`).
  15. Trough height — pick from [L6-shots/](docs/reports/L6-shots/).
  16. [master-index.md](docs/mapdocs/master-index.md) regen, then L7 module cards.
  17. DAW mobile — deferred, own gate. Two-saw PWM detune at high pitch — worklet later.
- Links: [edit-commands receipt](docs/reports/2026-10-14-goto-edit-commands-receipt.md) ·
  [10-14 GoTo receipt](docs/reports/2026-10-14-goto-session-receipt.md) ·
  [10-01 GoTo receipt](docs/reports/2026-10-01-goto-session-receipt.md) ·
  [limiter-test receipt](docs/reports/2026-10-01-limiter-test-receipt.md) ·
  [tool-fixes receipt](docs/reports/2026-10-01-tool-fixes-receipt.md) · [TODO.md](TODO.md) ·
  [SESSIONLOG.md](SESSIONLOG.md)

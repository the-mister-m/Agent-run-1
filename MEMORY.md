Updated 2026-09-08 — session agent, memory trim at Brandon's order (Last Week collapsed to noteOff, warm start pruned: server/commit/wave-synth-listen/comments/curriculum dropped)

# MEMORY — Chromebook DAW / Agent run 1
Rules: GLOBAL-RULES.md. Closer-only file. Lean: no superseded history.

## PROJECT
- Name: Chromebook DAW — Agent run 1
- Purpose: build a browser-based DAW spec'd for Chromebook hardware limits
- Stack / entry point: P1 + P2 shipped real /src — see [tools/wave-synth.html](tools/wave-synth.html), [tools/overtone-synth.html](tools/overtone-synth.html), [tools/beat.html](tools/beat.html)
- Runs: static file server, no build step — open the /tools pages directly
- Key paths: [BUILDPLAN.md](Builddocs/BUILDPLAN.md) · [CONTRACTS.md](Builddocs/CONTRACTS.md) · [ROSTER.md](Builddocs/ROSTER.md) · [P2-beat-tool/](Builddocs/P2-beat-tool/)

## DURABLE FACTS
- No limiter anywhere in the project, on master or elsewhere — [SPEC-sound.md](docs/mapdocs/SPEC-sound.md)
- Four separate level regimes coexist across tools — [SPEC-sound.md](docs/mapdocs/SPEC-sound.md)
- Three tool-page frame patterns exist, not two — [SPEC-pages.md](docs/mapdocs/SPEC-pages.md)
- The DAW's bottom Surface pane reaches no track, unverified in browser — [SPEC-daw-desktop.md](docs/mapdocs/SPEC-daw-desktop.md)
- Recording drops a live take when no editor is open — [SPEC-daw-desktop.md](docs/mapdocs/SPEC-daw-desktop.md)
- The tool registry in `src/ui/shell.js` is stale — [SPEC-cleanup.md](docs/mapdocs/SPEC-cleanup.md)
- `index.html` is the nav page, not the DAW (commits de3789f, 755abf0) — [SPEC-cleanup.md](docs/mapdocs/SPEC-cleanup.md)

## LAST WEEK — 2026-08-20 → 2026-09-04
- 09-04: noteOff seam closed — `_gainAt(t)` fix in wave-synth/overtone-synth, confirmed by ear.

## WARM START — 2026-09-08 — finish-run gates cleared, Wave Synth ported and good, first record wire shipped
- Situation: four finish-plan gates (Commit/Cleanup/Split/Sound/DAW) run and closed by twelve
  subagents in one session — L1 cleanup, L2 desktop/mobile split, L3 pairs, L6 DAW fixes.
  Synth Lab recon → port → rename cycle done (old Wave Synth is now Simple Synth, new Wave
  Synth built from the Synth Lab design, confirmed good). Region loop, the drum machine on
  the timeline, and the DAW's first working record wire all shipped.
- Last state: ~60 files moved or changed, committed. Twelve receipts + five screenshot
  folders in docs/reports/.
- Next move, in priority:
  1. **Capture off the bus — the biggest open thread.** Only the `input` singleton reaches
     Capture; pads and panel keyboards go to the track bus, which does not feed `input`, so
     nothing but MIDI/`input` can be recorded today. [sequence-roll
     receipt](docs/reports/2026-09-08-sequence-roll-receipt.md).
  2. Brandon wants a UI pass on the synth panels — [src/ui/knob.js](src/ui/knob.js) exists
     (dials, wheel, drag, reset) but Simple Synth and Overtone Synth are still on their old
     fader/range controls, never adopted it.
  3. Drum takes land as a note array, not a pattern → empty grid on playback; recording onto
     a drum region open in the pane loses the take on stop (pane flush overwrites after
     commit — the pane's version of L6's FOUND #3). [sequence-roll
     receipt](docs/reports/2026-09-08-sequence-roll-receipt.md).
  4. Unison dial reads one step under the patch (enum index off-by-one, knob.js or the
     panel). [wave-synth-test receipt](docs/reports/2026-09-08-wave-synth-test-receipt.md)
     row 6, exact repro.
  5. Retrigger pump: fading voices counted whole for ~200ms and response ≈0 → gain steps
     0.19→0.11→0.19 on a re-struck chord, measured on Sound Lab. Count fading voices by
     envelope, or smooth. Opus-tier. [sound-lab
     receipt](docs/reports/2026-09-08-sound-lab-receipt.md).
  6. Sound gate unruled — limiter yes/no, one layer, exponent by ear.
     [SPEC-sound.md](docs/mapdocs/SPEC-sound.md) §3, Sound Lab built for it, Brandon hasn't
     listened yet.
  7. Trough height — pick from L6 shots, `--sp-95` (190px) vs a temp 325px.
     [L6-shots/](docs/reports/L6-shots/).
  8. [docs/mapdocs/master-index.md](docs/mapdocs/master-index.md) regen, then L7 module
     cards ([SPEC-map.md](docs/mapdocs/SPEC-map.md)).
  9. DAW mobile — deferred, own gate.
  10. Two-saw PWM detunes slightly at high pitch — worklet is the later fix.
      [SPEC-wave-synth-port.md](docs/mapdocs/SPEC-wave-synth-port.md) §5.
- Links: [session review](docs/reports/2026-09-08-session-review-finish-run.md) ·
  [closer receipt](docs/reports/2026-09-08-closer-receipt.md) · [TODO.md](TODO.md) ·
  [SESSIONLOG.md](SESSIONLOG.md)

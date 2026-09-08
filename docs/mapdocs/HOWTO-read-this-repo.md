# HOWTO — READ THIS REPO

Written 2026-09-07 — session agent. The front door for the next session and for Brandon.
Read in this order. Stop when the question is answered.

## 1 · WHERE WE ARE

1. [finish-plan.md](finish-plan.md) — what done looks like, the gates, the map, the loops.
2. [master-story.md](master-story.md) — every session since 08-22, what it decided, what it
   left open. §f is each tool's last known state. §d is the 37 open threads.
3. [master-index.md](master-index.md) — every file with size, tokens, git touch, imports in
   and out. §e is the fourteen look-alike pairs.

## 2 · WHAT TO BUILD

| Question | Spec |
|---|---|
| What gets deleted, renamed, and what the nav pages hold | [SPEC-cleanup.md](SPEC-cleanup.md) |
| How each tool gets a mobile and a desktop page | [SPEC-pages.md](SPEC-pages.md) |
| What an instrument must expose, where the volume gets cut, the new synth | [SPEC-sound.md](SPEC-sound.md) |
| The DAW's dead pane, recording, duplicate regions | [SPEC-daw-desktop.md](SPEC-daw-desktop.md) |
| One card per module, how the docset grows | [SPEC-map.md](SPEC-map.md) |

## 3 · WHICH FILE ANSWERS WHICH QUESTION

| Question | File | Where |
|---|---|---|
| How does a standalone tool page get built | src/ui/shell.js | `ToolShell.mount()` ≈:963, `TOOLS` :60 |
| Why does a tool look different on a phone | src/ui/shell.js | :313 (900 wide), :330 (620 tall) |
| How does the DAW wire a track | src/ui/daw-shell.js | `wireDawShell()` :613, `assignInstrument` ≈:735 |
| How does the DAW window lay itself out | tools/daw-window.html | CSS :11–260, handle :337, panels ≈:440–560 |
| Why does a note on a track sound, or not | src/core/track-bus.js | `accepts()` :70, `emitNoteOn` :117 |
| Where does the volume get cut | src/core/audio.js | §4a :190–300, master chain :50–59 |
| How do regions play back | src/core/roll-scheduler.js | `onTick` :25 |
| What the arrangement owns and when a lane is built | src/ui/arrangement.js | `mount` :573, `_buildLane` :909 |
| What an instrument must expose | src/instruments/wave-synth.js | class :455–730, and SPEC-sound §1 |
| Which surface emits which source name | src/core/input.js | `SOURCES` :32 |
| What every token is and who uses it | src/ui/tokens.css · Builddocs/skinspecs/token-coverage.md | — |
| Which page imports what | master-index.md | §c |

## 4 · THE RULES THAT SHAPE THE DOCS

- Every fact has one home. Link, never restate.
- One card per module in `modules/`, same template. No README anywhere.
- Every write asks first. Every UI or sound claim is Brandon's, headed.
- A spec's checklist is the loop. An agent runs the list, Brandon signs the ear.

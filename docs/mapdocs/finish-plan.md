# FINISH PLAN — Chromebook DAW

Written 2026-09-07 — session agent (Fable). Built from [master-index.md](master-index.md),
[master-story.md](master-story.md), and full or partial reads of: shell.js, daw-shell.js,
track-bus.js, roll-scheduler.js, audio.js (§4a, governor), arrangement.js (lane lifecycle,
editor), strip.js (channel opt-in), wave-synth.js (class body), index.html, and every page
in tools/ except dev-splash and dev-test.

## DONE LOOKS LIKE — Brandon, 2026-09-07

1. Beat, wave synth (replaced by Brandon's upload), overtone, patch synth, harmony — each
   ships a desktop page and a mobile page.
2. Desktop DAW. Mobile DAW only if the spec comes cheap.
3. Surface → MIDI → piano roll → instrument → speaker works in every module.
4. Two nav pages, desktop and mobile, curriculum order, ready for GitHub Pages.
5. A docset Brandon and agents grow: one card per module, one HOWTO in front.

## RULINGS MADE 2026-09-07

- Two versions of every tool. Split the page, not the module. Both import the same src/.
- Two nav pages. Desktop is the classroom. Mobile is home. Kids never use mobile in class.
- Tools first. DAW desktop after. DAW mobile deferred.
- Every UI and sound test is headed, Brandon driving. No agent claims sound.
- Whole repo goes public. Clean house first.
- Docs live in docs/mapdocs/. Sonnets may write INDEX and SESSIONLOG lines.
- Fixes found during recon go to one closing sonnet before the receipt.

## GATES — one sitting each, Brandon rules

| Gate | What Brandon rules | Spec |
|---|---|---|
| Split | One `layout` flag on the shell page. File naming for pairs. | [SPEC-pages.md](SPEC-pages.md) |
| Sound | Limiter on master. Which one ducking layer. Exponent by ear. | [SPEC-sound.md](SPEC-sound.md) |
| DAW | Dead Surface pane: delete or rebind. Record target. Trough px. | [SPEC-daw-desktop.md](SPEC-daw-desktop.md) |

## THE MAP

```
today     J1 closing sonnet ─► receipt ─► closer

next      [commit]
          Cleanup gate ─► L1 cleanup + nav ─────────────────┐
          Split gate   ─► L2 shell flag + 3 pairs ──────────┤
                       └► L3 beat + patch pairs ────────────┤
          Sound gate   ─► L4 limiter + one regime ──────────┼─► Brandon verifies ─► publish
                              └► synth lands ─► L5 synth ───┤
          DAW gate     ─► L6 DAW desktop ───────────────────┘
          no gate      ─► L7 module cards (docs only)
```

## THE LOOPS

| Loop | Work | Model | Tokens | Risk | Spec |
|---|---|---|---|---|---|
| J1 | Registry flags, dead function, control bytes, header comment | Sonnet | 40k | Low | SPEC-cleanup §4 |
| L1 | Deletes, renames, import fixups, two nav pages on tokens | Sonnet | 130k | Low with the list | SPEC-cleanup |
| L2 | `layout` flag in ToolShell, second page file for wave, overtone, harmony | Opus | 120k | Medium — shell.js reaches eight pages | SPEC-pages |
| L3 | Second page file for beat and patch-synth, CSS paste replaced | Sonnet | 90k | Low — self-contained | SPEC-pages |
| L4 | Limiter after master, one ducking layer everywhere, exponent knob on dev-splash | Opus | 100k | High — root audio file | SPEC-sound |
| L5 | New synth against the contract, page pair, harmony engine, DAW picker | Opus | 130k | Medium — waits on upload | SPEC-sound |
| L6 | Dead pane, record target, trough token, headed dupes repro | Opus | 140k | Medium — dupes unfound | SPEC-daw-desktop |
| L7 | 52 module cards on one template | Sonnet ×2 | 150k each | Low — docs only | SPEC-map |

## ORDER

- L1 first. Everything after lands on clean paths.
- L2 and L3 together. Different files.
- L4 before L5. The synth lands on the settled sound path.
- L6 any time after the DAW gate.
- L7 any time. No code.

## VERIFY — the tail of every loop, Brandon driving

Per tool, per version: loads at 1366×768 · loads at phone width · plays from the
surface · plays from the home row · plays from MIDI · no click, no clip on a held chord ·
Brandon signs. An agent scribes and writes the receipt.

## WHERE THINGS LIVE

- [HOWTO-read-this-repo.md](HOWTO-read-this-repo.md) — start here next session
- [master-index.md](master-index.md) — every file, size, tokens, imports in and out
- [master-story.md](master-story.md) — every session, what it decided and left open
- [SPEC-cleanup.md](SPEC-cleanup.md) · [SPEC-pages.md](SPEC-pages.md) · [SPEC-sound.md](SPEC-sound.md) · [SPEC-daw-desktop.md](SPEC-daw-desktop.md) · [SPEC-map.md](SPEC-map.md)

# BUILDPLAN — Chromebook DAW

Task: the map every seat reads first. Written by: Opus 5 session, 2026-08-20 01:26 EDT,
with Brandon. Sourced from [qa-transcript.md](../qa-transcript.md) and [buildmap.md](../buildmap.md).
Curriculum: [outline](../outline). Interfaces: [CONTRACTS.md](CONTRACTS.md). Seats: [ROSTER.md](ROSTER.md).

**EVERY SEAT READS THIS FILE.** Where this plan and your instinct disagree, the plan wins.
Brandon overrides the plan.

---

## WHAT THIS IS

A webhosted DAW, static site, no backend, used on Chromebooks by middle/high school
students in a survey music course. It is a teaching instrument first and a DAW second —
but it is a real DAW, and everything else is derived from that.

**No real audio recording.** Note capture only. Audio comes out (WAV render), never in
(except kits Brandon adds).

**Built as separate teaching tools, latched into one DAW after.** Phases 1-3 each ship
a standalone tool Brandon can teach a lesson from that day. Phase 4 assembles them.

---

## SHIP ORDER

| Phase | Ships | Teaches |
|---|---|---|
| P0 | contracts | — |
| P1 | Wave Synth, Overtone Synth | frequency spectrum |
| P2 | Drum Synth, Drum Sampler | rhythm |
| P3 | Harmony tool + Chord Module | scales and chords |
| P4 | The DAW — six instruments, one transport | signal flow |
| P5 | installable offline build, handed to Brandon | — |

The run goes **straight through**. No phase gate. No waiting on Brandon between phases.
Brandon is only interrupted for escalations and tap-outs.

---

## THE SIX INSTRUMENTS

| Name | Is | Its visual |
|---|---|---|
| Wave Synth | pick a standard waveform: sine, triangle, square, saw | spectrum analyzer |
| Overtone Synth | stack partials by hand off a fundamental | oscilloscope |
| Chord Module | harmony brain — scale circle + numerals; carries 4 tones simple→complex and an octave selector; routes to any instrument | note bank |
| Patch Synth | node/edge cables: oscillators+noise, LFO+envelope, filter+gain, math | the graph itself |
| Drum Synth | 8 pieces, synthesized | step grid |
| Drum Sampler | 8 pieces, kits Brandon adds | step grid |

Each synth shows the view it is **not** letting you touch. Build a shape, watch the
spectrum. Stack a spectrum, watch the shape.

---

## FIXED DECISIONS — do not relitigate

- **Stack:** vanilla ES modules, no build step. Web Audio + Canvas. The bundler and
  service worker are added in P5 *over* finished modules.
- **Mixer:** fixed six channels + master. Multi-instance is deferred.
- **Strip:** fader, level meter, pan, mute/solo, and insert slots that are **display
  only** — they show what is loaded, its meter, and where it is going. Routing is
  *edited* in the node graph, never on the strip. Clicking a slot pops out the device.
- **Timeline:** linear song, not clips. Loop region, song length, count-in, punch record.
- **Capture:** record AND capture AND loop. Notes only, never audio.
- **Scale state:** in the DAW, scale is picked in the project header beside time
  signature and BPM; instruments inherit it. In standalone, each tool owns its own
  scale control, because the tool is the lesson.
- **Playing surfaces:** any live-playable instrument accepts the 12-note keyboard
  (primary), the diatonic keyboard, or the scale circle. In the DAW and in virtual
  instruments you switch between them. In the harmony engines all three show at once.
- **Piano roll:** always 12 chromatic rows with in-key rows shaded. Standalone shows
  chromatic and diatonic as two surfaces, both with shading.
- **Overlays:** per-surface toggle. letter / number / solfege on pitch surfaces,
  beat syllables (1 e + a) on rhythm surfaces.
- **Octave shift AND position shift.** Position shift redraws the bottom key as any
  pitch class — bottom key can be F instead of C.
- **Caps:** governed by a **CPU meter**, not arbitrary option limits. Conservative
  defaults ship with a **no-cap dev toggle that stays ON the deployed build.**
- **Export:** project JSON, presets, WAV mix + per-track stems, and `.mid` so students
  can take work into a real DAW. MIDI import is deferred.
- **Look:** dark, loud teaching color that survives a projector. Standalone tools get
  the animation and interaction budget. The full DAW stays conservative — screen space
  goes to work, not flourish.
- **Drills:** practice mode only. Target is shown and played; nothing is scored.

---

## DEFERRED — named, not built

MIDI import · multi-instance mixer channels · drill/grading layer · swing ·
lesson presets · git worktree parallelism

If your task seems to need one of these, you are out of lane. Escalate.

---

## AUTHORITY

Brandon overrides everything. The Troubleshooter seat runs the session and settles
judgment calls with Brandon's authority, per [skills/troubleshooter-seat.md](skills/troubleshooter-seat.md).
A decision that cannot be sourced to this plan, a brief, or a receipt is not the
Troubleshooter's to make — it escalates to Brandon.

**Deploy is Brandon.** No seat deploys anything.

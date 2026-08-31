# PHASE P3 — HARMONY TOOL

Task: what every seat in P3 needs to know. Written by: Opus 5 session, 2026-08-20 01:26 EDT,
with Brandon. Map: [BUILDPLAN.md](../BUILDPLAN.md) · [CONTRACTS.md](../CONTRACTS.md) · [ROSTER.md](../ROSTER.md)

## PHASE GOAL
Build pitch. This phase carries more curriculum than any other, and it carries Brandon's
own teaching devices — the colored scale circle and the note bank. Getting the music wrong
here is worse than getting the code wrong.

## WHAT SHIPS
- **Scale engine** — 12 scales, every degree alterable with a +/-, modes and minor
  variants as presets that write into the same degree array.
- **Chord engine** — skip method, roman numerals, note bank, inversions.
- **Three playing surfaces** — scale circle, diatonic keyboard, chromatic piano roll with
  diatonic shading.
- **Chord Module** — the harmony brain. Carries four tones simple→complex and an octave
  selector so it can sound on its own, and routes to any other instrument.

## STAGE ORDER
```
S1-spec → S2-theory-check → S3-scale-engine → S4-chord-engine → S5-surfaces ‖ →
S6-chord-module → S7-verify
                            ┌ scale-circle
                            ├ diatonic-keys
                            └ piano-roll
```
**S2 is a REDPEN that runs before any code exists.** It reads the spec against the
curriculum. It is placed here on purpose: this is the cheapest moment to catch a music
error, and the most expensive one to miss.

S5's three seats run **in parallel**. See S5's STAGE.md collision map.

## CURRICULUM IT SERVES
[outline](../../outline) → **Scales and chords**, in full. Read it directly; it is short.
The load-bearing points:

- The **major scale as letters plus sharps/flats arranged as a circular pattern**, labeled
  with **digits, 1/8 for Do**.
- Students are **not required to memorize scales** here. They must see and hear that a
  scale **can** vary and **how** — modes, minor variants — without memorizing them.
- **Skip method:** every other note in scale order, stacked.
- A chord is built off the **root**. A basic chord is **three notes**; anything more is an
  **upper overtone chord**.
- Students **do not learn** 7th chords — **Brandon shows them.** Build them; do not
  foreground them.
- **Numbers refer to scale information.** The 7th of a chord is the 7th note of that root's
  scale.
- **Roman numerals refer to chords.** Upper case major, lower case minor, upper-overtone
  nomenclature for everything else.
- **Inversions and comping** by rearranging and spacing chord tones.
- **Color shows major and minor digits in the scale circle so students never memorize which
  diatonic chords go with which numerals.** This is Brandon's device. It is the reason the
  color rule lives in `theory/scale.js` and every surface reads it.

## CONTRACTS THIS PHASE ADDS
`spec-scale` (S1) may extend CONTRACTS.md with a **theory contract** as §15. It may not
change §1-§14.

## PHASE DONE-CHECK
`/tools/harmony.html` loads on a static file server. All three playing surfaces show at
once and are all live. Altering a degree on any one of them updates the other two, the
shading, and the note bank instantly. Roman numeral input produces the right notes in the
right case. The Chord Module sounds on its own and routes to another instrument.
`test-p3` passes and `redpen-p3` reports zero drift.

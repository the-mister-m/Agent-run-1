# PHASE P1 — TONE TOOL

Task: what every seat in P1 needs to know. Written by: Opus 5 session, 2026-08-20 01:26 EDT,
with Brandon. Map: [BUILDPLAN.md](../BUILDPLAN.md) · [CONTRACTS.md](../CONTRACTS.md) · [ROSTER.md](../ROSTER.md)

## PHASE GOAL
Make sound, make it playable four ways, and make what is inside the sound visible.

## WHAT SHIPS
Two standalone teaching tools Brandon can teach from the day this phase closes:

- **Wave Synth** — pick a standard waveform: sine, triangle, square, saw. Its visual is a
  **spectrum analyzer**. You choose a shape and see how many frequencies are in it.
- **Overtone Synth** — stack partials by hand off a fundamental. Its visual is an
  **oscilloscope**. You choose the frequencies and see the shape they add up to.

Each synth shows the view it is *not* letting you touch. That inversion is the lesson.
Do not "fix" it by giving both synths both visuals.

## STAGE ORDER
```
S1-spec  →  S2-audio-core  →  S3-voices-surfaces ‖  →  S4-shell  →  S5-verify
                              ┌ wave-voice
                              ├ overtone-voice
                              ├ keys-input
                              └ scopes
```
S3's four seats run **in parallel**. They share no files. See S3's STAGE.md collision map.

## CURRICULUM IT SERVES
[outline](../../outline) → **Frequency Spectrum**, in full:
- vibrations per second (Hz), the ~30 Hz-16 kHz human range
- what we hear is all frequencies combined, at the level they are perceived
- fundamental = lowest and loudest; everything above it is an overtone
- harmonic series: fundamental × 1, × 2, × 3, × 4 — each one a **partial**
- a single frequency alone is a **sine** tone; fewer frequencies = simple, more = complex
- standard waveforms named by their oscilloscope shape: triangle, square (pulse), saw
- smoother/simpler wave = fewer overtones

Also serves **Play/Program** → the 12-note piano, five-note patterns, one-octave scales
in C, G, D, hands separate.

## CONTRACTS THIS PHASE ADDS
`spec-voice` (S1) may extend CONTRACTS.md with a **voice contract** and an **input
contract** only. It may not change §1-§10, which `spec-core` froze. Everything it adds
becomes CONTRACTS §11 and §12.

## PHASE DONE-CHECK
`/tools/wave-synth.html` and `/tools/overtone-synth.html` both load on a static file
server, make sound from all four input routes, draw their correct visual, and survive
`dispose()` with no leaked nodes. `test-p1` reports pass with metrics. `redpen-p1`
reports zero contract drift.

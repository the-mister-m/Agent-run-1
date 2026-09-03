# SESSION REVIEW — Chromebook DAW / Agent run 1 — per-voice normalizer

Timestamps: 2026-09-03 08:13:53Z → 09:11:43Z (grepped from transcript)

## WHAT BRANDON HEARD

Clipping without the channel normalizer. An initial clip roughly 30% of the time with it
on. Neither in [tools/dev-test.html](../../tools/dev-test.html). His ear is the
measurement; the code below is what explains it.

## THE FINDING

Every instrument schedules the voice's envelope first and calls `voicePool.register()`
after — [wave-synth.js:515-524](../../src/instruments/wave-synth.js#L515-L524),
[overtone-synth.js:362-363](../../src/instruments/overtone-synth.js#L362-L363),
[drum-sampler.js:465-466](../../src/instruments/drum-sampler.js#L465-L466),
[drum-synth.js:720](../../src/instruments/drum-synth.js#L720),
[chord-module.js:775-780](../../src/instruments/chord-module.js#L775-L780).

Register is what triggers the channel gain correction. So the attenuation arrives after
the sound is already committed, on a node every voice on that channel shares. Two
consequences: the correction can land a render block late (the initial clip), and scaling
for a new voice also scales every voice already sounding (the pumping).

`n ** -exponent` with n=1 is 1.0, so a single note gets no attenuation at all.

Only wave-synth and overtone-synth pass a time to `register()`; the other three pass
nothing, so their correction lands at "now" rather than at the note's start.

dev-test has no equivalent problem because its divisor is baked into each note's own
envelope before the note starts and is never revisited —
[dev-test.html:640](../../tools/dev-test.html#L640).

## EDITS

- [src/core/audio.js:243](../../src/core/audio.js#L243) — `createVoiceOut(instrumentId, dest)` added: one gain node per voice, `n ** -exponent` written once at creation, connected to the destination the voice was already going to use
- [src/instruments/wave-synth.js:28](../../src/instruments/wave-synth.js#L28), [:504](../../src/instruments/wave-synth.js#L504) — import + voice constructed through the node
- [src/instruments/overtone-synth.js:21](../../src/instruments/overtone-synth.js#L21), [:361](../../src/instruments/overtone-synth.js#L361) — same
- [src/instruments/drum-sampler.js:62](../../src/instruments/drum-sampler.js#L62), [:461](../../src/instruments/drum-sampler.js#L461) — same
- [src/instruments/chord-module.js:32](../../src/instruments/chord-module.js#L32), [:765](../../src/instruments/chord-module.js#L765) — same
- [src/instruments/drum-synth.js:27](../../src/instruments/drum-synth.js#L27), [:713](../../src/instruments/drum-synth.js#L713) — same, passed into `build()` instead of a Voice constructor

## NOT DONE

- patch-synth is outside the mechanism — it imports `governor` but not `voicePool`, so its notes never register and there is no count to read
- the existing channel-level scaler is untouched and still running underneath
- no dials — Brandon held those back
- no browser run, nothing heard

## STRAY FILES

- none

## GOALS DONE

- per-voice output gain exists in audio.js and every registering instrument routes through it

## BRANDON'S TODOS

- listen and rule on whether the initial clip is gone
- decide what happens to the channel-level scaler now that a per-voice one exists
- decide whether patch-synth joins the mechanism
- dials: normalizer and limiter, collapsed, top of the devbox
- [src/ui/devbox.js](../../src/ui/devbox.js) reads as `data` to `file(1)`, not text — every other file in scope is UTF-8. Unexamined.

## CLOSER REVIEW

No closer this session, by Brandon's call.

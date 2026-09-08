# SPEC — SOUND: THE INSTRUMENT SEAM, THE LEVEL, THE NEW SYNTH

Written 2026-09-07 — session agent. Runs as L4 (limiter + one regime, Opus) then L5 (new
synth, Opus, after Brandon's upload). Gate: Brandon rules §3.

## 1 · THE INSTRUMENT CONTRACT — what every instrument exposes

Read off src/instruments/wave-synth.js:455–730 and confirmed by grep across all six
instruments (2026-09-07). The new synth must match every line.

| Member | Shape | Enforced by |
|---|---|---|
| `static id` | string, e.g. `'wave-synth'` | createVoiceOut, createChannel, daw-shell INSTRUMENTS key |
| `static label` | display string | shell.js:1023 title, dev-splash |
| `static playable, needsLoad, pieces, emitsNotes` | booleans / null | step-grid reads `pieces`; shell calls `ready()` if `needsLoad` |
| `constructor(ctx, out)` | connects its mix to `out`, never to `ctx.destination` | shell.js:986, daw-shell.js ≈742 |
| `async ready()` | resolves when playable | shell.js:1085, beat:373 |
| `noteOn(note, velocity, atTime)` | asks `governor.request`, steals on refuse, builds a voice on `createVoiceOut(id, mix)`, `voicePool.register(voice, id, t0)` | track-bus.js:141, roll-scheduler.js:44 |
| `noteOff(note, atTime)` | releases every voice on that note | roll-scheduler.js:45 |
| `allNotesOff()` | panic | track-bus.js:181, roll-scheduler.js:55 |
| `setParam(path, v)` / `getParam(path)` | path strings: `osc.*`, `env.*`, `out.gain` | dev box |
| `getState()` / `setState(obj)` | plain JSON | — |
| `get voiceCount`, `get cpuWeight` | numbers, cpuWeight includes the analyser | createCpuMeter |
| `getAnalyser(which)` | `'spectrum'` or `'scope'`, the other returns null — exactly one | shell.js:1000 refuses two |
| `mountCompact(el)` / `mountExpanded(el)` / `unmount()` | own DOM, own style acquire/release | shell.js:1080, daw-window.html ≈462 |
| `dispose()` | frees voices, disconnects nodes, returns counts | everywhere |

Patch-synth is the one instrument that skips `createVoiceOut` and `voicePool.register`.
It is monophonic and lives outside normalization (see §2).

## 2 · WHAT EXISTS — four level regimes, read 2026-09-07

Master chain, audio.js:50–59: `masterGain` (1.0) → `masterAnalyser` → `ctx.destination`.
**No limiter, no compressor, anywhere.**

Normalization, audio.js §4a:
- `normState` :196 — `mode: 'per-instrument'`, `exponent: 0.8`, `responseMs: 0.05`
- `renormalize()` :215 — every channel opened with an id gets `gain = n ** -0.8` off its
  live voice count, re-written on every register and release. Recovers when voices free.
- `createVoiceOut()` :243 — every voice gets its own gain node set once at birth to
  `(n+1) ** -0.8`. **Never re-written.** Does not recover.
- `synthVoiceNorm` :255 — live setters for mode, exponent, responseMs. "The dev box's
  write surface."

Who opts into which layer:

| Page | Channel layer (id) | Voice layer | Result |
|---|---|---|---|
| wave, overtone (ToolShell) | shell.js:985 `createChannel(Instrument.id)` | yes | both, stacked |
| harmony | harmonyNEW:443–444, both ids | yes | both, stacked |
| DAW | strip.js:255 `createChannel(instrumentId)` | yes | both, stacked |
| beat | beat.html:301 `createChannel()` — no id | drum-synth yes | voice only |
| patch-synth page | patch-synth.html:229 — no id | none | **nothing** |

Stacked means a fourth voice lands at roughly `4^-0.8 × 4^-0.8`. Brandon's history: "still
not great" 08-31 (channel layer alone), clipping heard 09-03 (voice layer added on top),
dev-test preferred a gentler exponent by ear 09-02.

`governor.request(cost)` :470 ignores `cost`; only checks the 32-voice count. Known, not
in this spec.

## 3 · GATE — Brandon rules three things

**a. Limiter.** Proposal: one `DynamicsCompressorNode` between `masterGain` and
`masterAnalyser` (audio.js:58), settings threshold −1 dB, knee 0, ratio 20, attack 0.001,
release 0.05. The meter then shows post-limiter. Yes or no.

**b. One layer.** Pick one:
- Channel layer only — recovers as voices release; `createVoiceOut` returns a gain of 1.
  Beat opens its channel with `DrumSynth.id`. Recommended.
- Voice layer only — fixed at birth, never recovers; drop the ids from createChannel.
- Both — as today.

**c. Exponent.** Brandon's ear, headed, on dev-splash. L4 confirms the knob is on the
devbar (devbox.js reads `synthVoiceNorm`; verify it is visible) and Brandon sets it.
The default in audio.js:196 is then written to his number.

Patch-synth gets the limiter and nothing else; a mono instrument has no voice count.

## 4 · THE NEW SYNTH — L5, after upload

1. Contract check: one row per §1 member, present / missing / different. Missing rows are
   built before anything else.
2. Page pair per SPEC-pages §3, Pattern A, `Visual` and `tap` per what the synth exposes.
3. Harmony engine: harmonyNEW:165–166 import, :443 channel id, :448–452 engines row,
   swap wave for the new synth. Overtone stays.
4. DAW picker, three tables: daw-shell.js:40–47 `INSTRUMENTS`, arrangement.js:17–25
   `INSTRUMENT_OPTIONS`, tracks.js:44–50 `INSTRUMENT_KIND`. Add the new row; wave-synth's
   row stays or goes per Brandon.
5. dev-splash instrument list ≈:1005–1012 `instrumentPiece(...)`.
6. shell.js:60–67 `TOOLS` row and both nav pages.
7. wave-synth.js and wave-synth.html: keep, archive, or delete — Brandon.

## 5 · CHECKLIST

**L4, Brandon driving on dev-splash then each tool page:**
- [ ] limiter node present, meter reads post-limiter
- [ ] one layer active on every page; `synthVoiceNorm.readout()` shows the same regime on wave, harmony, DAW, beat
- [ ] exponent knob visible on the devbar; Brandon's value written to audio.js:196
- [ ] eight-note chord on wave, overtone, harmony, DAW: no clip, no pump, Brandon signs
- [ ] patch-synth hot patch: limiter catches it
- [ ] receipt

**L5:**
- [ ] §4.1 table all "present"
- [ ] both page files load, play, no clip
- [ ] harmony plays chords through the new engine
- [ ] DAW assigns it to a track, roll plays it, piano roll strip plays it
- [ ] receipt

## 6 · THE JOBS

**L4 — Opus — ≈100k.** Files: audio.js (:58 limiter, :196 default, :243 voice gain),
beat.html:301, patch-synth.html untouched. Blast radius: audio.js is the root of every
sound on every page. Drift risk high — the pull is to "improve" the audio path; the spec
is one node and one layer. Gap risk medium — the exponent is Brandon's ear.

**L5 — Opus — ≈130k.** Files: the new module, two page files, harmonyNEW.html,
daw-shell.js, arrangement.js, tracks.js, dev-splash.html, shell.js:60–67, both navs. Blast
radius: five touchpoints. Drift risk medium. Gap risk high until the upload lands, low
after — the contract is literal.

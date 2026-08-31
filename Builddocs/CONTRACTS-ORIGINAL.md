# CONTRACTS — Chromebook DAW

Task: the interfaces every seat binds to. Written by: Opus 5 session, 2026-08-20 01:26 EDT,
with Brandon. Map: [BUILDPLAN.md](BUILDPLAN.md).

**EVERY SEAT READS THIS FILE.** If your build needs an interface that is not here, you do
not invent it — you escalate. The SPEC seat of your phase extends this file; BUILD seats
never do.

---

## 1 · FILE LAYOUT

```
/index.html                     the DAW
/tools/wave-synth.html          standalone pages, one per tool
/tools/overtone-synth.html
/tools/beat.html
/tools/harmony.html
/tools/patch-synth.html
/src/
  core/
    audio.js        AudioContext, master chain, voice pool, CPU probe
    clock.js        transport, lookahead scheduler
    state.js        project state, scale state, pub/sub
    input.js        unified input events (mouse/key/touch/MIDI)
    save.js         project JSON in/out, preset in/out
  instruments/
    wave-synth.js  overtone-synth.js  chord-module.js
    patch-synth.js drum-synth.js      drum-sampler.js
  surfaces/
    keyboard.js  diatonic-keys.js  scale-circle.js
    piano-roll.js  step-grid.js
  theory/
    scale.js  chord.js
  devices/
    gate.js  compressor.js  eq.js  reverb.js  delay.js
  mixer/
    strip.js  graph.js  automation.js
  vis/
    spectrum.js  scope.js  meter.js  gain-reduction.js
  ui/
    shell.js  overlays.js  tokens.css
/assets/kits/<kit-name>/*.wav   kits Brandon adds
```

**A seat writes only the files its brief names.** Touching a file outside your lane is a
STOP condition for the Troubleshooter.

---

## 2 · MODULE CONTRACT — every instrument

```js
export default class Instrument {
  static id            // 'wave-synth'
  static label         // 'Wave Synth'
  static playable      // true if it accepts live note input

  constructor(ctx, out)      // out = this instrument's mixer channel input node
  noteOn(note, velocity, atTime)   // note = MIDI number 0-127, velocity 0-1
  noteOff(note, atTime)
  allNotesOff()

  setParam(path, value)      // path = 'osc.wave' | 'env.attack' | dotted string
  getParam(path)

  getState()                 // plain JSON-safe object, no functions, no nodes
  setState(obj)

  get voiceCount()           // live voices right now — the governor reads this
  get cpuWeight()             // integer cost units, see §8

  mountCompact(el)           // the DAW view — conservative, tight
  mountExpanded(el)          // the standalone view — room to breathe, animated
  unmount()
  dispose()                  // disconnect every node, drop every listener
}
```

Rules:
- **Never** create an AudioContext. It is handed to you.
- **Never** connect to `ctx.destination`. Connect to `out`.
- `atTime` is an AudioContext time in seconds. Absent means "now".
- Every instrument must survive `dispose()` with zero leaked nodes or listeners.

---

## 3 · TRANSPORT

```js
clock.state              // 'stopped' | 'playing' | 'recording'
clock.bpm                // number
clock.timeSignature      // {top: 4, bottom: 4}
clock.songLengthBars     // number
clock.loop               // {on: bool, startBar: n, endBar: n}
clock.countIn            // bars of count-in before record, 0 = off
clock.metronome          // bool

clock.play() / stop() / record()
clock.seek(bar, beat, tick)
clock.position           // {bar, beat, tick} — tick is 0..PPQ-1

clock.schedule(atTime, fn)          // one-shot at an AudioContext time
clock.on('tick', fn)                // fires per scheduler pass, NOT per frame
clock.on('statechange', fn)
```

- **PPQ = 480.** Every note position and length is in ticks.
- Scheduler is lookahead: a `setInterval` of **25 ms** scanning a **100 ms** window,
  scheduling Web Audio events at exact `AudioContext.currentTime` offsets.
  Never schedule audio from a `requestAnimationFrame` callback.
- Visuals read `clock.position` from rAF. Audio reads from the scheduler. These are
  two different loops and they never cross.

---

## 4 · SCALE STATE

```js
state.scale = {
  tonic: 0,                          // pitch class 0-11, C = 0
  degrees: [0,2,4,5,7,9,11],         // semitones from tonic, ALWAYS 7 entries
  name: 'Major'                      // display label, updated when degrees change
}

state.on('scale', fn)                // every surface subscribes
state.setScaleDegree(i, semitones)   // the +/- on the circle and diatonic keys
```

- `degrees` is the single source of truth. Modes and minor variants are presets that
  write into it. There is no separate "mode" field.
- **Ownership:** in the DAW, the project header owns `state.scale` and every instrument
  inherits it. In a standalone tool, that tool owns its own `state.scale`.
- **Color rule:** a degree is colored by the quality of the triad built on it using the
  skip method against the current `degrees` array. Major → warm, minor → cool,
  diminished/augmented → flagged distinctly. Students never memorize which numeral is
  minor; the color tells them. This rule is computed in `theory/scale.js` and every
  surface reads it — no surface computes its own colors.

---

## 5 · INPUT EVENTS

```js
input.on('noteon',  fn)   // {note, velocity, source}
input.on('noteoff', fn)   // {note, source}

// source: 'mouse' | 'key' | 'touch' | 'midi' | 'circle' | 'diatonic'

input.octaveShift     // integer, shifts all incoming notes by 12 * n
input.positionShift    // 0-11: which pitch class is DRAWN as the bottom key
```

- `positionShift` is a **display** transform on keyboard surfaces. It changes what the
  student sees and touches; it does not transpose what an instrument receives.
- All four hardware routes produce identical events. An instrument must never know
  which one fired.
- Web MIDI is opportunistic: request access, degrade silently if refused. Never block
  startup on it.

---

## 6 · OVERLAY LABELS

```js
surface.overlay = 'none' | 'letter' | 'number' | 'solfege'   // pitch surfaces
surface.overlay = 'none' | 'syllable'                        // rhythm surfaces
```

- **Per-surface toggle.** There is no global overlay setting.
- `letter` = A-G with accidentals. `number` = scale degree digits, 1 through 8 with
  8 = Do at the octave. `solfege` = diatonic only. `syllable` = 1 e + a.
- Labels come from `theory/scale.js`. No surface builds its own label strings.

---

## 7 · PROJECT JSON

```json
{
  "format": "chromebook-daw-project",
  "version": 1,
  "header": {
    "bpm": 96,
    "timeSignature": {"top": 4, "bottom": 4},
    "scale": {"tonic": 0, "degrees": [0,2,4,5,7,9,11], "name": "Major"},
    "songLengthBars": 16,
    "loop": {"on": false, "startBar": 1, "endBar": 5}
  },
  "channels": [
    {
      "id": "ch1", "instrument": "wave-synth", "label": "Wave Synth",
      "instrumentState": {},
      "strip": {"gain": 0.8, "pan": 0, "mute": false, "solo": false},
      "inserts": [{"type": "eq", "state": {}}],
      "notes": [{"tick": 0, "length": 480, "note": 60, "velocity": 0.8}],
      "automation": [{"target": "strip.gain", "points": [{"tick": 0, "value": 0.8}]}]
    }
  ],
  "graph": {
    "nodes": [{"id": "n1", "type": "channel", "ref": "ch1"}],
    "edges": [{"from": "n1", "to": "master"}]
  }
}
```

- `version` gates every future change. A loader that sees an unknown version refuses
  and says so; it never guesses.
- **Preset file** is the same shape reduced to one object:
  `{"format": "chromebook-daw-preset", "version": 1, "instrument": "wave-synth", "state": {}}`
- Automation targets are dotted strings and are limited to mixer controls:
  `strip.gain`, `strip.pan`, `strip.mute`, `strip.solo`. Nothing else automates.

---

## 8 · CPU BUDGET AND THE GOVERNOR

The governor is the cap. There are no arbitrary per-feature limits.

```js
governor.load          // 0..1, smoothed
governor.noCap         // bool — dev toggle, SHIPS ON THE DEPLOYED BUILD
governor.request(cost) // returns true if the allocation is allowed
```

- Every instrument reports `cpuWeight` in integer cost units. One simple voice = 1.
  A patch-synth node = 1. A device insert = 2. Reverb = 8.
- Conservative defaults, all liftable by `noCap`: **32 voices total**, **24 patch nodes**,
  **4 inserts per channel**, **2 sends**.
- Load is measured as scheduler pass duration against the budget of one lookahead
  window, smoothed over 20 passes, and drawn in the transport bar.
- When `noCap` is on, the meter still reads and still turns red. Nothing is blocked.
  Brandon wants the Chromebooks to crash.

---

## 9 · VISUAL TOKENS

Defined once in `ui/tokens.css`, used everywhere. Dark ground, saturated teaching color.

```
--bg, --panel, --line, --text, --text-dim
--deg-major, --deg-minor, --deg-dim, --deg-altered
--accent, --warn, --meter-ok, --meter-hot
```

- Degree colors are used by the circle, the diatonic keys, the piano roll shading, and
  the note bank. One palette, four surfaces, no drift.
- Everything must read from ten feet away on a projector in a lit room.
- Standalone views may animate. DAW views stay still.

---

## 10 · WHAT NOBODY MAY DO

- Create a second AudioContext.
- Schedule audio from `requestAnimationFrame`.
- Write a file outside the lane the seat brief names.
- Add a dependency. There are none, and there will be none.
- Add a build step before P5.
- Invent an interface that is not in this file.

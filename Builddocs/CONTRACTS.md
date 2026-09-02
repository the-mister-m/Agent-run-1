**CONFIRMED 2026-08-22 23:32 EDT by spec-core**

# CONTRACTS — Chromebook DAW

Task: the interfaces every seat binds to. Written by: Opus 5 session, 2026-08-20 01:26 EDT,
with Brandon. Map: [BUILDPLAN.md](BUILDPLAN.md).

**EVERY SEAT READS THIS FILE.** If your build needs an interface that is not here, you do
not invent it — you escalate. The SPEC seat of your phase extends this file; BUILD seats
never do.

---

## FREEZE NOTICE

**§1–§10 are frozen as of the CONFIRMED stamp above.** They were reviewed against
[scope.md](P0-run-open/scope.md) (P0/S1) and [findings-webaudio.md](P0-run-open/findings-webaudio.md)
(P0/S2) by `spec-core` (P0/S3), the only seat in the run permitted to amend them.

**What freezing means for every seat after this line:** §1–§10 are now the ground you build
on, not a draft you improve. You may **extend** this file only in the numbered section your
phase's PHASE.md assigns you (P1 → §11–§12, P2 → §13–§14, P3 → §15, P4 → §16, P5 → §17).
**You may not edit §1–§10. Only Brandon can.** If §1–§10 blocks you, that is an escalation,
not a refactor.

Amendments made at freeze are marked **`[AMENDED 2026-08-22]`** inline, each citing the
recon finding or the transcript answer that drove it. Everything unmarked was **kept as
originally written** and is confirmed.

**Open questions this file does not answer** are in
[P0-run-open/open-decisions.md](P0-run-open/open-decisions.md), with Brandon named as
decider on every one. **Nothing in that file is blocking P1** — where a number was needed
and Brandon has not ruled, this file carries the conservative default and marks it
`PROVISIONAL`.

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
  get cpuWeight()            // integer cost units, see §8

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

### `[AMENDED 2026-08-22]` — four additions the original §2 could not build

`spec-core` walked §2 against all six instruments by name. Four instruments needed
something that was not there. All four additions are on the base class; an instrument that
does not need one inherits the no-op default.

```js
  // ——— 1 · ASYNC READY ———————————————————————————————
  static needsLoad          // false by default; true if ready() does real work
  async ready()             // resolves when the instrument can make sound
                            // default: resolves immediately

  // ——— 2 · VISUAL TAP ————————————————————————————————
  getAnalyser(which)        // which = 'spectrum' | 'scope' | null
                            // returns an AnalyserNode already in the chain, or null
                            // the instrument owns it; the visual only READS it

  // ——— 3 · PIECE ENUMERATION —————————————————————————
  static pieces             // null, or an ordered array of
                            // {index, note, label} — index 0-7 for an 8-piece kit

  // ——— 4 · NOTE EMISSION —————————————————————————————
  static emitsNotes         // false by default
  onNoteOut(fn)             // fn({note, velocity, atTime}) — for instruments that
  offNoteOut(fn)            // DRIVE another instrument rather than sound alone
```

**Why each one exists — the instrument that forced it:**

1. **`ready()` — forced by Drum Sampler.** Kits are `.wav` files under `/assets/kits/`.
   `decodeAudioData()` is **async** and a `constructor` cannot await. Without this, the
   shell has no defined moment when the sampler is playable, and P2's `drum-sampler` seat
   would have invented one. Every other instrument resolves immediately.
2. **`getAnalyser()` — forced by Wave Synth and Overtone Synth.** BUILDPLAN's core teaching
   inversion is that each synth shows the view it is *not* letting you touch. §2 had **no
   way for an instrument to hand a visual anything to draw.** `vis/spectrum.js` and
   `vis/scope.js` would have had to reach into instrument internals — which §1's lane rule
   forbids. The instrument owns the `AnalyserNode`; the visual only reads it.
   **Cost note:** see §8 — an analyser being *read* every frame is not free, and its real
   cost is `UNVERIFIED` (recon Q2). P1's `scopes` seat measures it.
3. **`static pieces` — forced by Drum Synth and Drum Sampler.** Both are "8 pieces"
   (**A44**). `surfaces/step-grid.js` is shared by both and must draw eight labeled rows
   **without knowing which machine it is drawing.** Without this the grid hard-codes a
   drum map, and the two machines drift apart.
4. **`onNoteOut()` — forced by Chord Module.** **A19**: "Routes to any synth." §2 had
   `noteOn`/`noteOff` as **inputs only** — no instrument could produce a note for another
   instrument to play. The Chord Module was uncontractable as written.
   **This adds the mechanism, not the policy.** Whether the Chord Module also occupies one
   of the six fixed channels while driving another is **not settled** — see
   [open-decisions.md](P0-run-open/open-decisions.md) **D-4**.

**Rules for the additions:**
- `getAnalyser()` returns a node **already connected** inside the instrument's chain.
  A visual never inserts a node, never reconnects anything, and never calls `dispose()`.
- An instrument with `emitsNotes` still routes its own audio to `out` normally.
  Emitting notes and making sound are independent.
- `dispose()` must also drop every `onNoteOut` listener and release decoded buffers.

### `[AMENDED 2026-08-25]` — the bind methods, named after the fact (P3 built them first)

`chord-module.js` (§2, this section) and `piano-roll.js` / `scale-circle.js` (§12.1) all
shipped `bindState(store)` before this contract named it. `chord-module.js` also ships
`bindTargets(rows)` and `bindInput(bus)`. §10 forbids inventing an interface; this closes
that gap after the fact, against the shipped code, not a redesign.

```js
  // ——— 5 · SCALE STORE WIRING ————————————————————————————
  bindState(store)          // store = anything with { scale, on('scale', fn) } — §4's shape
                             // subscribes, drops the old subscription first, redraws once,
                             // returns `this`. store is optional — omit it, `state.scale`'s
                             // shared singleton still works standalone.
  unbindState()              // drops the subscription, does not touch anything drawn

  // ——— 6 · NOTE ROUTING (Chord Module only) ——————————————
  bindTargets(rows)         // rows = [{ id, label, instrument }], §2 instruments this module
                             // may route notes to instead of sounding itself. 'self' is
                             // implicit and always first; a caller does not supply it.
  unbindTargets()

  // ——— 7 · PLAY-BUTTON LIGHTING (Chord Module only) ———————
  bindInput(bus)             // bus = core/input.js's `input`, or anything with
                              // emitNoteOn/emitNoteOff. Bound: playing here fires through the
                              // §5 bus so every surface lights. Unbound: this.noteOn direct,
                              // nothing lights (the DAW case, the headless-test case).
  unbindInput()
```

**Why this is on the base class and not just the three files that use it today:** the
shape is identical everywhere it appears — same duck type, same "unsubscribe old, adopt
new, redraw once" order, same "optional, working default when unbound." A future
instrument or surface that needs the same wiring should match this, not invent its own.

**Naming note:** `scale-circle.js` shipped `attachState` and `bindState` as two definitions
of the same operation; `bindState` is the name that survives — two definitions and two live
callers beat one definition and zero. No `attachState` remains anywhere in `/src` or
`/tools`.

**Not covered here:** `mountCompact()`/`mountExpanded()` and `ScaleCircle`'s third
constructor argument — real gaps against §12.1, not this section. Still open.

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

### `[AMENDED 2026-08-22]` — §3's numbers, checked against the recon

**Every number in §3 is KEPT. None changed.** All three were measured in a real browser,
not assumed. Source: [findings-webaudio.md](P0-run-open/findings-webaudio.md) Q1.

| Number | Verdict | The measurement |
|---|---|---|
| **PPQ = 480** | **KEPT** | Not a measurable quantity — a resolution choice, untouched by recon |
| **25 ms interval** | **KEPT** | `setInterval(25)` measured **p50 25.1 ms · p95 26.2 ms · max 26.8 ms** idle |
| **100 ms window** | **KEPT** | Absorbed a **100 ms** main-thread stall with **zero** late events; first dropped notes at a **150 ms** stall |

**The rule the recon established, and every seat that touches timing must know it:**

> **The lookahead window must exceed the worst-case main-thread block. The interval only
> sets how finely the window is refilled.**

Once a scheduler pass costs more than 25 ms, the interval stops mattering — the loop
becomes **load-bound** and fires every `passDuration` instead. Measured: a 150 ms stall
produced 14 late events at a 100 ms window and **zero** at a 200 ms window.

**If late notes appear, raise the 100 ms window — do not touch the 25 ms interval.**
That is what the measurement says fixes it. `recon-scheduler` (P2/S2) re-measures this on
the real clock; TEST seats in P2 and P4 log late-event counts.

**Standing caveat:** the ~100 ms of headroom was measured on an **Apple M4 Max with no
audio device**, not on a Chromebook. A Chromebook drawing a spectrum analyzer, an
oscilloscope, and a piano roll on the same thread will stall longer. Treat 100 ms as a
value that **held under test here** and must be **re-checked on hardware** — Brandon's
recon at deployment, per **A53**.

### `[AMENDED 2026-08-22]` — AudioContext startup, forced by recon Q4a

Added because the recon **could not verify** the autoplay gesture gate (automated Chrome
bypasses it), and a wrong assumption here is a silent total failure — a student opens the
app and it never makes a sound.

```js
audio.state                 // 'suspended' | 'running' | 'closed'
audio.unlock()              // idempotent; call from ANY real user gesture
audio.on('unlocked', fn)
```

- **Assume `suspended` at load.** Never assume the context is running.
- The **first** user gesture of any kind — a key, a click, a touch on any surface —
  calls `audio.unlock()`. It is safe to call repeatedly.
- **Nothing may block startup waiting for it.** The UI draws, the surfaces respond, and
  the app is fully interactive while suspended. Only sound waits.

### `[AMENDED 2026-08-24]` — `clock.js`'s real public surface (closes **P2-6**)

Brandon's ruling, 2026-08-24: these members **add and do not subtract** — nothing in §3 as
originally written changes meaning — so they are written into the contract **now** rather
than deferred to P3's spec seat. `clock.js` shipped them honestly marked `EXTENSION` in
source; three files already bind to them, and P3's piano roll and P4's arrangement ruler
will. They are §3 members from this date.

```js
clock.positionTicks         // the same instant as `position`, as one absolute 0-based tick
clock.countingIn            // bool — count-in is sounding and the record point is not reached
clock.countInRemainingBars  // fractional bars left in the count-in, 0 when not counting in
clock.leadingEdgeTicks      // the scheduler's first not-yet-committed tick — DIAGNOSTIC
clock.schedulerLoad         // §8's load, 0..1 — DIAGNOSTIC once governor.load reads it
clock.lastPassMs            // raw duration of the most recent scheduler pass — DIAGNOSTIC

clock.unschedule(id)        // cancel a pending one-shot by the id `schedule()` returned
clock.on('resync', fn)      // the transport jumped after a background gap
```

**`positionTicks` is the storage form.** §13.1 makes the absolute tick the only storage
unit, so this — not `{bar, beat, tick}` — is what every consumer actually persists.
`position` is `fromTicks(positionTicks)` and nothing more.

> **THE RULE THAT MATTERS: every public member that speaks about "now" reports the
> AUDIBLE now.**
>
> `countingIn`, `position`, `positionTicks` and `countInRemainingBars` all report the
> instant the student is **hearing**, not the instant the scheduler has reached. The
> scheduler runs up to one 100 ms lookahead window ahead of the speaker; its internal
> count-in flag flips at that leading edge. For that window the two disagreed, and the
> pair *(not counting in, negative tick)* let `capture.js` stamp notes at **negative
> ticks** — rendering as "bar 0" at the top of every counted-in take.
>
> **A consumer needs no `positionTicks < 0` guard of its own.** Any seat that adds one is
> re-describing a seam that no longer exists.
>
> The scheduler's leading edge is still reachable — it is `leadingEdgeTicks`, and it is
> for diagnostics and tests. **A consumer that wants the playhead wants `position`.**
> Suppression of the `'tick'` emit during count-in still happens on the scheduler's own
> flag, because suppression must happen when a window is **scheduled**, not when it is
> **heard**.

**Event payloads, frozen:**

| Event | Payload |
|---|---|
| `'tick'` | `{fromTick, toTick, timeOf, secPerTick, bpm, timeSignature, ticksPerBeat, ticksPerBar, state}` |
| `'statechange'` | `{from, to, state, position}` |
| `'resync'` | `{reason, gapSeconds, fromTick, toTick, position}` |

- **`'tick'`'s range is HALF-OPEN `[fromTick, toTick)`.** Every tick belongs to exactly one
  window, so a listener can neither drop nor double an event at a loop seam or a tempo
  change. Schedule audio at `timeOf(tick)`; **that function is valid only for ticks inside
  the window it arrived with.** Suppressed during count-in.
- **`'resync'`** fires after a background gap has forced the transport to jump. A caller
  redraws or re-arms on it. Forced by `findings-scheduler` Q2.

**`schedulerLoad` and `lastPassMs` are diagnostics, not a second meter.** §8's load lives
on `governor.load`. `clock.js` owns the scheduler pass and therefore owns the measurement;
it reports it into `audio.js` via `governor.reportSchedulerPass(ms, budgetMs)`. No UI is
asked to show `schedulerLoad` or `lastPassMs`.

**Also reachable from the transport object:** `clock.PPQ` and the §13.1 tick-math helpers
(`ticksPerBeat`, `ticksPerBar`, `ticksPerStep`, `stepsPerBar`, `toTicks`, `fromTicks`,
`stepToTicks`, `ticksToStep`), which `core/clock.js` also exports as free functions. The
grid (P2/S4), the piano roll (P3) and the arrangement ruler (P4) import the free functions.

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

### `[AMENDED 2026-08-22]` — §4 walked against its four surfaces

`spec-core` walked `state.scale` against the scale circle, the diatonic keys, the piano
roll shading, and the note bank.

**The color rule is computable from `degrees` alone — confirmed.** For degree `i` of a
7-entry array, the skip method gives scale indices `i`, `i+2`, `i+4` (mod 7, adding 12
semitones per wrap). The two resulting intervals classify the triad — major, minor,
diminished, augmented — with no input beyond `degrees`. `tonic` only rotates the result
into pitch classes for display. **No surface needs anything §4 does not already carry.**

Three surfaces are fully served as written. Two additions were needed:

```js
state.scale.altered       // [bool × 7] — which degrees the student moved off the preset
state.scale.preset        // 'Major' | 'Dorian' | … | 'Custom'  — 'Custom' once altered

state.setScalePreset(name)   // writes all 7 degrees at once; clears `altered`
state.resetScaleDegree(i)    // one degree back to the preset value
```

**Why:** the scale circle and the diatonic keys both carry a **`+/-` per degree**
(**A14**, curriculum: "alter the degres of each with a +/-"). A student who has moved a
degree needs to see *that they moved it* and get back. `degrees` alone cannot express
"changed from default" — it holds the value, not the history. Without `altered`, the
`+/-` UI has no state to render and no undo, and P3's `scale-circle` and `diatonic-keys`
seats would each have invented their own.

`degrees` remains **the single source of truth for sound and color.** `altered` and
`preset` are display state derived alongside it, never read by the audio path.

### `[AMENDED 2026-08-24]` — ✅ RESOLVED — the twelve scales are named, `degrees` stays 7

**Supersedes this section's ⚠ UNRESOLVED block.** Brandon ruled 2026-08-24, closing **D-1**
and **D-15** — the highest-priority open item in the run. `spec-core` was right not to guess.

**The twelve are the major scale on each of the twelve chromatic roots.** Not twelve
different scale *types* — one scale type, twelve keys. Nothing pentatonic, nothing blues,
nothing chromatic is in this set.

| `tonic` | Root | | `tonic` | Root |
|---|---|---|---|---|
| 0 | C | | 6 | F♯ / G♭ |
| 1 | C♯ / D♭ | | 7 | G |
| 2 | D | | 8 | G♯ / A♭ |
| 3 | D♯ / E♭ | | 9 | A |
| 4 | E | | 10 | A♯ / B♭ |
| 5 | F | | 11 | B |

- **The student picks the key from these twelve.** That sets `tonic`. The degrees are then
  generated from the major-scale pattern — they are not picked separately.
- **The pattern is always `[0, 2, 4, 5, 7, 9, 11]`** — W W H W W W H. It never varies with
  the key. `tonic` rotates it into pitch classes for display; the array itself does not move.
- **Which spelling appears — F♯ or G♭ — is decided by the key signature**, per Brandon's
  **D-18**. This table lists both faces of each pitch class; it does not rule on spelling.
- The `+/-` per degree (§4's `altered` / `preset`) is unaffected. A student who moves a
  degree off the preset is on `preset: 'Custom'`, exactly as already specified. The twelve
  are the *starting points*, not a cage.

> ### `degrees` is **7 entries**. The scale is **8 notes**. Both are true.
>
> Brandon, 2026-08-24: *"Do, Re, Mi, Fa, Sol, La, Ti, and DO."*
>
> The eighth note is the tonic an octave up — pitch class 0 again, same syllable, same
> color. **It is degree 1 repeated, not a new degree.** `degrees` stores the seven unique
> semitone offsets from the tonic; the surfaces draw eight, closing the circle back on Do.
>
> **Storage is 7. Display is 8. No seat may reconcile them by changing the array.**
>
> Three things break if an eighth entry (`12`) is ever added:
>
> 1. **The color rule.** The skip method is `(i, i+2, i+4)` **mod 7**. Mod 8 walks off the
>    scale and every triad quality comes out wrong — the warm/cool coloring stops matching
>    what the student hears, which is the one thing the color rule exists to guarantee.
> 2. **`altered` is `[bool × 7]`.** An eighth slot hands the `+/-` UI a control that moves
>    the octave off the tonic. Nothing musical happens; the scale breaks and no surface has
>    a way to say so.
> 3. **The §7 project file.** `"degrees": [0,2,4,5,7,9,11]` is already written to disk in
>    that shape. An eighth entry is a schema change for every file already saved.
>
> **§4's "ALWAYS 7 entries" is no longer `PROVISIONAL`. It is CONFIRMED and it is a
> guarantee** — every one of the twelve is a 7-entry major scale, so the skip-method
> indices above hold for all of them without exception.

**P3 is unblocked.** `spec-scale` (P3/S1), `redpen-theory` (P3/S2) and `scale-engine` have
what they were waiting on and may write.
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

### `[AMENDED 2026-08-22]` — Web MIDI, now measured

**§5's "never block startup on it" is KEPT verbatim and is now proven load-bearing, not
cautious.** Source: [findings-webaudio.md](P0-run-open/findings-webaudio.md) Q5.

**Measured:** on a secure context in real Chrome 151, `navigator.requestMIDIAccess()`
took **7128.6 ms** to resolve — over **seven seconds**, with the permission prompt
**auto-accepted by automation**. A real student reading a dialog makes that longer, never
shorter. **A startup that awaits this call is a seven-second dead app.**

**Per Brandon** (his statement, not this run's measurement): MIDI devices require a **user
permission grant** — `navigator.requestMIDIAccess()` raises a **browser permission
prompt**.

**Measured and verified: Web MIDI requires a secure context.**

| Origin | `isSecureContext` | `navigator.requestMIDIAccess` |
|---|---|---|
| `https://…` / `http://localhost` / `http://127.0.0.1` | true | **present** |
| `file://` | true | present |
| non-secure `http://<host>/` | **false** | **absent** |

**The required shape — bind to this exactly:**

```js
// fire and forget. NEVER awaited on the startup path.
if (typeof navigator.requestMIDIAccess === 'function') {
  navigator.requestMIDIAccess({ sysex: false })
    .then(access => input.attachMIDI(access))   // arriving late is fine
    .catch(() => {});                           // refused: silent, per §5
}
```

- Absence is detected by a plain `typeof` check that **throws nothing** — verified. No
  try/catch is needed to detect an unavailable API.
- Refusal arrives as a **rejected promise**. Catch it locally and say nothing.
- MIDI may attach **seconds after** the app is interactive. Every surface must tolerate
  a fourth input route appearing late. The other three routes are never affected.

> **Deployment consequence — this is Brandon's call, not a seat's.** Served from a
> non-secure `http://` origin, **Web MIDI disappears and so does the service worker**,
> which takes P5's entire offline-install story with it. **A10** says "Static site, no
> backend" and names no host. **The site must be served over HTTPS.** See
> [open-decisions.md](P0-run-open/open-decisions.md) **D-2**.

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

> ### `[AMENDED 2026-08-24]` — composite labels, Brandon
>
> Two composite forms are now legal, both cited to Brandon's own rulings and flagged by
> `redpen-theory` as **M-1** against the enumeration above (which did not previously allow
> either):
>
> 1. **`number` on the scale circle only** — the circle draws **7 slots, not 8** (CONTRACTS
>    §15's A4). Do's single slot carries the composite label **`'1/8'`**, not a separate
>    8th position. This does not change `number` on any other surface — a linear surface
>    (e.g. the piano roll) still shows 8 as its own digit, "8 = Do at the octave," unchanged.
> 2. **`letter`, only where A1's key-signature spelling genuinely ties** — "enharmonics
>    follow key signature or show both" (Brandon). Where the key signature settles the
>    spelling, `letter` emits one name as before. Only where there is no signature
>    preference (the tritone key) does `letter` emit the composite **`'F♯/G♭'`** form.
>    **CLOSED, second pass:** the three-way composite `redpen-theory` flagged
>    (`'F♯/G♭/A♯'`) does not exist once `spellingOf` correctly applies double accidentals
>    (§15's A7, "italic x for double sharps and italic bb for double flats") instead of
>    substituting a neighboring letter's single name. `letter` stays two-way, always.

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

### `[AMENDED 2026-08-22]` — §7 walked field by field for round-trip

`spec-core` traced a save/reload of six instruments, six strips, an insert chain, a node
graph, and automation. **Five fields were missing. A project as originally specified could
not reload identically.**

```jsonc
{
  "header": {
    "countIn": 0,              // + bars before record, 0 = off — §3 has it, §7 dropped it
    "metronome": false         // + §3 has it, §7 dropped it
  },
  "channels": [{
    "inserts": [
      { "id": "i1",            // + REQUIRED: automation and graph edges address inserts
        "type": "eq",
        "bypass": false,       // + a bypassed insert must reload bypassed
        "state": {} }
    ]
  }],
  "master": {                  // + §7 had NO master object, but graph edges point at it
    "gain": 0.8,
    "inserts": []              // PROVISIONAL — see open-decisions D-5
  },
  "graph": {
    "nodes": [
      { "id": "n1", "type": "channel", "ref": "ch1",
        "x": 120, "y": 40 }    // + layout must reload where the student left it
    ],
    "edges": [
      { "from": "n1", "fromPort": 0,
        "to": "master", "toPort": 0 }   // + parallel chains need ports, not just nodes
    ]
  }
}
```

**Why each one, and what breaks without it:**

1. **`header.countIn` / `header.metronome`** — both are live `clock` state in §3 and
   neither survived a save. A student reloads and the count-in they set is gone.
2. **`inserts[].id`** — **the worst of the five.** §7 caps automation at
   `strip.gain | strip.pan | strip.mute | strip.solo`, so nothing addresses an insert
   *today* — but the **node graph adds inserts and builds parallel chains** (**A27**,
   **A26**), and an edge must name **which** insert it lands on. Array position cannot
   survive reordering. Without a stable id the graph silently reattaches to the wrong
   device on reload.
3. **`inserts[].bypass`** — a bypassed device that reloads active changes what the student
   hears. Cheap to store, invisible when wrong.
4. **`master`** — §7's graph edges already point at `"master"` and **no `master` object
   existed.** Master gain could not round-trip at all. Added. **What else master carries —
   inserts, a meter, whether it can be automated — is `PROVISIONAL`**: nobody ever
   specified it (scope.md §5D). See **D-5**.
5. **`graph.nodes[].x/y` and `edges[].fromPort/toPort`** — **A26**: "Both, graph is the
   point." A graph that reloads with its layout scrambled has lost the lesson. Ports are
   required for parallel processing — the curriculum names it explicitly — because two
   edges leaving one node must be distinguishable from one edge.

**Round-trip rule, now that the fields exist:** `save()` writes exactly what `setState()`
can read back. A field an instrument cannot restore must not be written. **`getState()`
must be JSON-safe — no functions, no AudioNodes, no `undefined`.**

**Sample rate is deliberately NOT in the project file.** The recon measured a **48 kHz**
device default against §7's 44.1 kHz assumption; whether the app pins a rate or adopts the
device's is unresolved (**D-6**). A project must reload at whatever rate the machine
offers, so the rate is a render-time argument, never saved state.

---

## 8 · CPU BUDGET AND THE GOVERNOR

The governor is the cap. There are no arbitrary per-feature limits.

```js
governor.load          // 0..1, smoothed
governor.noCap         // bool — dev toggle, SHIPS ON THE DEPLOYED BUILD
governor.request(cost) // returns true if the allocation is allowed
```

- Every instrument reports `cpuWeight` in integer cost units.
  **See the measured table below — the original flat values were wrong.**
- Conservative defaults, all liftable by `noCap`: **32 voices total**, **24 patch nodes**,
  **4 inserts per channel**, **2 sends**.
- Load is measured as scheduler pass duration against the budget of one lookahead
  window, smoothed over 20 passes, and drawn in the transport bar.
- When `noCap` is on, the meter still reads and still turns red. Nothing is blocked.
  Brandon wants the Chromebooks to crash.

### `[AMENDED 2026-08-22]` — the cost units were measured, and they were wrong

Source: [findings-webaudio.md](P0-run-open/findings-webaudio.md) Q2. Method:
`OfflineAudioContext` render timing, 1 / 4 / 8 nodes chained, cost taken as the slope so
the source cancels out, median of 7 runs.

**The original §8 read: "One simple voice = 1. A patch-synth node = 1. A device insert = 2.
Reverb = 8." Measurement contradicts three of those four, in both directions.**

**Unit rescaled ×10 so measured values stay integers**, as §8 requires. **One plain voice
= 10 units.**

| Node | measured, voice = 1 | **`cpuWeight`** | old §8 said | error |
|---|---|---|---|---|
| `GainNode` | 0.1 | **1** | node = 1 | 10× over |
| `AnalyserNode` | 0.2 ⚠ | **2** ⚠ | — | see caveat |
| `WaveShaperNode` (math) | 0.3 | **3** | node = 1 | 3× over |
| `DelayNode` | 0.4 | **4** | insert = 2 | 5× over |
| `StereoPannerNode` | 0.4 | **4** | — | — |
| `BiquadFilterNode` | 0.9 | **9** | insert = 2 | 2× over |
| **plain voice** (osc+gain+env) | 1.0 | **10** | 1 | *the unit* |
| `DynamicsCompressorNode` | 4.3 | **43** | insert = 2 | **2× UNDER** |
| **filtered voice** (+biquad) | 4.3 | **43** | 1 | **4× UNDER** |
| `ConvolverNode` (2 s IR) | 24.7 | **247** | reverb = 8 | **3× UNDER** |

**Composite device inserts** — sum of their parts, for `devices/*.js`:

| Device | `cpuWeight` | Built from |
|---|---|---|
| `gate.js` | **3** | analyser + gain |
| `delay.js` | **5** | delay + feedback gain |
| `eq.js` | **29** | 3 × biquad + analyser |
| `compressor.js` | **45** | compressor + gain-reduction analyser |
| `reverb.js` | **135–325** | convolver, **scaled by IR length** — see below |

**`ConvolverNode` cost by IR length** — measured, and the shape matters:

| IR | 0.1 s | 0.25 s | 0.5 s | 1.0 s | 2.0 s | 4.0 s |
|---|---|---|---|---|---|---|
| `cpuWeight` | **133** | **150** | **165** | **184** | **235** | **325** |

**A convolver costs ~130 units before it convolves anything** — large fixed cost, modest
slope. **A short reverb is not a cheap reverb.** `reverb.js` must report `cpuWeight` from
its **current IR**, not a constant.

### What the corrected numbers actually mean

> **Reverb is ~13–32 plain voices. The original §8 priced it at 8.**
>
> This was the single most dangerous line in the file: a student loads two reverbs
> (`2 × 8 = 16` under the old table, "cheap") and the real cost is `~470` — **47 voices'
> worth of DSP** — while the governor reports a number that says everything is fine.
> **This is the line most likely to have crashed a Chromebook with a green meter.**

- **"A device insert = 2" flattened a 15× spread** (delay 4 → compressor 43). It
  over-charged every cheap insert, so students would hit the cap on harmless chains, and
  under-charged the one insert that actually costs.
- **"A patch-synth node = 1" cannot be one number.** Patch nodes span `GainNode` (1) to
  `ConvolverNode` (247) — a **250× spread** — and **A43** lets students wire them freely.
  **`patch-synth.js` must sum its actual nodes** from the table above. A flat count of 24
  nodes is not a budget; it is a coincidence.

**⚠ `AnalyserNode` = 2 is a floor, not a measurement.** It was measured in an offline
render where nothing ever calls `getByteFrequencyData()`, so **the FFT never ran.** In the
real app the spectrum analyzer and the oscilloscope are read every rAF frame. **The true
cost is higher and is `UNVERIFIED`.** P1's `scopes` seat measures it live and reports the
real figure to the Troubleshooter.

### The count caps — KEPT, and what they are

**32 voices · 24 patch nodes · 4 inserts per channel · 2 sends — all KEPT unchanged.**

The recon **could not measure a voice ceiling**: this environment has **no audio device**
(`outputLatency === 0`), so nothing can be heard and nothing can glitch.
`spec-core` therefore **did not invent a replacement number.** These stay as BUILDPLAN's
"conservative defaults, all liftable by `noCap`."

**On the apparent conflict** between these counts and BUILDPLAN's "governed by a CPU meter,
**not** arbitrary option limits" — resolved by citing BUILDPLAN's own FIXED DECISION, which
calls them "**conservative defaults, all liftable by a no-cap dev toggle.**"

> **The governor is the cap. The counts are the starting allocation it opens with.**
> They are defaults, not limits. `noCap` lifts every one of them and the meter keeps
> reading. Brandon's own instruction stands: he wants the Chromebooks to crash.

**`2 sends` is `PROVISIONAL` and cannot be confirmed.** **Nothing in the transcript,
BUILDPLAN, or the curriculum defines what a send *is* in this app.** **A25** removed the
send knob from the strip and left it displaying only "where it's getting sent." A cap of 2
on an undefined object is not a specification. See **D-3**. **No P1–P3 seat needs sends;
this does not block anything before P4.**

### `[AMENDED 2026-08-22]` — the probe technique is confirmed exactly as written

The §8 technique was implemented and run (findings Q3). It is **correct — keep it verbatim**:

```js
const t0 = performance.now();
/* … the scheduler pass does its real work … */
hist.push((performance.now() - t0) / 100);     // budget = one 100 ms lookahead window
if (hist.length > 20) hist.shift();            // smoothed over 20 passes
governor.load = Math.min(1, hist.reduce((a,b) => a+b, 0) / hist.length);
```

Measured against known injected load: **0 ms → 0.00 · 5 → 0.05 · 15 → 0.15 · 25 → 0.25 ·
50 → 0.50 · 100 → 1.00.** Exactly linear, no calibration constant, no drift.
`performance.now()` resolution measured at **0.1 ms** — 250 ticks across a 25 ms pass, far
more than needed. **The clock is not the limiting factor.**

> **⚠ What this meter structurally cannot see.** It measures **main-thread** cost. Audio
> DSP runs on a **separate audio thread**. A graph heavy in convolvers can saturate the
> audio thread and glitch **while `governor.load` reads near zero**, because the scheduler
> pass itself stayed cheap. **The meter can read green while the audio is breaking.**
>
> The corrected `cpuWeight` table above is the mitigation: it prices the expensive nodes
> honestly, so `governor.request(cost)` refuses them *before* the audio thread drowns —
> which is why getting reverb from 8 to ~247 mattered. Whether the transport bar should
> **also** show an allocated-weight meter beside the measured-load meter is a design
> question, not this seat's: **D-7**.

---

## 9 · VISUAL TOKENS

Defined once in `ui/tokens.css`, used everywhere. Dark ground, saturated teaching color.

```
--bg, --panel, --line, --text, --text-dim
--deg-major, --deg-minor, --deg-dim, --deg-aug, --deg-altered
--accent, --warn, --meter-ok, --meter-hot
```

- Degree colors are used by the circle, the diatonic keys, the piano roll shading, and
  the note bank. One palette, four surfaces, no drift.
- **`--deg-aug` added 2026-08-24 — M-14, Brandon ruled (b).** §9 is no longer frozen on
  this point. Augmented no longer shares `--deg-dim`; `scale.js`'s `QUALITY_TOKEN` is the
  single place that changed. See [A5](#amended-2026-08-24--a5--augmented-and-diminished-colours-od-6).
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

### `[AMENDED 2026-08-22]` — three more, each from a measurement

- **Never `await` `requestMIDIAccess()` on the startup path.** Measured at **7128 ms**
  with the prompt auto-accepted (findings Q5). See §5.
- **Never assume the app is running from `file://`.** `navigator.serviceWorker.register()`
  **fails** there — verified: `TypeError: … origin ('null') is not supported` — while
  succeeding over `http://127.0.0.1`. Every phase DONE-CHECK says "loads on a static file
  server"; that is a requirement, not a convenience. **Double-clicking `index.html` will
  never give an offline app.**
- **Never assume the AudioContext is running at load.** Treat `suspended` as the starting
  state and unlock on a real gesture. See §3.

---

## `[AMENDED 2026-08-22]` — CLOSING AMENDMENTS

*Part of §1–§10 and frozen with them. No new section number — §11 onward belongs to the
later phases.*

These close gaps that [scope.md](P0-run-open/scope.md) §5 found and that could be settled
**without Brandon**, because each follows from an existing citation or is a pure
engineering default with no musical content. **Everything with musical or curricular
content went to [open-decisions.md](P0-run-open/open-decisions.md) instead — untouched.**

**A · Voice stealing** (`core/audio.js`, P1)
When the voice cap is reached, steal in this order: longest-**released** voice first, then
longest-held voice. Never refuse a note — a dead key teaches a student the app is broken.
Stealing fades the stolen voice over **5 ms** to avoid a click.

**B · Meters** (`vis/meter.js`, P4)
**dBFS peak** with a **1.5 s** hold and **20 dB/s** decay. Range **−60 → 0 dB**.
`--meter-hot` above **−6 dB**. Read from an `AnalyserNode` on rAF, never from the
scheduler.

**C · Pan law** (`mixer/strip.js`, P4)
`StereoPannerNode`'s built-in equal-power law. **No hand-rolled pan math** — §10 forbids
inventing an interface, and the platform already has one.

**D · Solo** (`mixer/strip.js`, P4)
**Additive, solo-in-place.** Multiple channels solo at once; soloing mutes every
un-soloed channel without changing their `mute` flags. Clearing the last solo restores
exactly what was there. `strip.solo` automates per §7.

**E · Kit manifest** (`instruments/drum-sampler.js`, P2)
**A10** — "Static site, no backend" — means **a browser cannot list a directory.**
`/assets/kits/<kit-name>/kit.json` is therefore required, not preferred:

```json
{ "format": "chromebook-daw-kit", "version": 1, "name": "808",
  "pieces": [{ "index": 0, "label": "Kick", "note": 36, "file": "kick.wav" }] }
```

Eight entries, `index` 0–7, matching `static pieces` in §2. `/assets/kits/kits.json` lists
the available kit folders. **This is forced by A10, not chosen.** Adding a kit means
dropping a folder and adding one line — Brandon's workflow per **A22**.

**F · Export naming** (`core/save.js`, P5)
`<project>.cbdaw.json` · `<instrument>.cbdawpreset.json` · `<project>.wav` ·
`<project>.<channel-label>.wav` · `<project>.mid`. Sanitize to `[A-Za-z0-9_-]`.

**G · Envelope defaults** (P1)
`attack 0.005 · decay 0.08 · sustain 0.7 · release 0.15` seconds. Every instrument exposes
`env.*` via `setParam` as §2 already showed. These are **starting values a preset
overwrites**, not a musical position — **A51** left preset design to the seats.

**H · What `[THEORY]` means for a BUILD seat**
Every item marked `[THEORY]` in scope.md §5 is **Brandon's and only Brandon's**. A BUILD
seat that finds itself picking a scale, a syllable, a spelling, or a chord name **has left
its lane and must escalate.** No seat has an opinion on music theory.

---

## 11 · VOICE

Written by `spec-voice` (P1/S1), 2026-08-22. Extends §1-§10, does not amend them. The
four S3 BUILD seats (`wave-voice`, `overtone-voice`, `keys-input`, `scopes`) bind to this
section plus §2 and §5 with no further questions — that is this section's DONE-CHECK.

### 11.1 · The Voice class

One voice is one sounding note. An instrument owns a pool of voices; it never exposes
them outside itself.

```js
class Voice {
  constructor(ctx, out, cpuWeight)   // out = the point in the instrument's own chain
                                      // this voice connects to (upstream of getAnalyser())
  trigger(note, velocity, atTime)    // starts the oscillator(s), starts the attack stage
  release(atTime)                    // starts the release stage; voice stays alive until
                                      // the release ramp completes, then calls free() itself
  steal(atTime)                      // forced release per §10-A: linear fade to 0 over
                                      // 5 ms, then free() — never an abrupt stop
  free()                             // disconnects every node this voice owns, deregisters
                                      // from voicePool (11.2), drops the voice from the
                                      // instrument's pool

  get cpuWeight()                    // integer, fixed per voice type — see 11.1a
  get state()                        // 'attacking' | 'sustaining' | 'releasing' |
                                      // 'stealing' | 'free'
}
```

`Instrument.noteOn` is the only caller of `trigger`. It does not call `new Voice()`
directly — see 11.2 for the allocate/steal sequence the governor requires.

### 11.1a · Node ownership and `cpuWeight`, matched to `recon-webaudio` Q2

Every number below is a **cost unit**, `plain voice = 10`, per the measured §8 table.
Nothing here is invented — where recon did not measure a shape directly, it is marked
**PROVISIONAL** exactly as §8 marks `AnalyserNode`, and the same seat (`scopes`, P1/S3)
that must live-measure the analyser is the one positioned to confirm it.

**Wave Synth voice — plain voice, matches §8 exactly.**
- Nodes: **2** — one `OscillatorNode`, one `GainNode`. The envelope (11.3) is four-stage
  automation on that single `GainNode`'s `.gain` `AudioParam`. No filter — Wave Synth is
  the simple synth (§11.4) and P1 has no filtered voices; filtering is Patch Synth's
  territory (P4), not built here.
- `cpuWeight`: **10**, directly off §8's `plain voice (osc+gain+env) = 10`.

**Overtone Synth voice — not directly measured. PROVISIONAL.**

`[AMENDED 2026-08-24]` — recomputed for **12 partials** (§11.5, was 8; D-22).

- Nodes: **2 × partial count + 1** — each of the 12 partials (§11.5) is its own
  `OscillatorNode` plus its own `GainNode` (that partial's level), all summed into one
  shared `GainNode` that carries the four-stage envelope. At 12 partials: **25 nodes.**
- `cpuWeight`: **PROVISIONAL — 21.** Formula: 10 units for partial 0 (its oscillator +
  the shared envelope gain, using the measured plain-voice figure as the baseline) + 1
  unit for each of the remaining 11 partials (that partial's own `GainNode`, using the
  measured `GainNode = 1`). **This is a floor, not a measurement** — recon-webaudio Q2
  measured single-oscillator voices only; a bare `OscillatorNode`'s own marginal cost was
  never isolated. `overtone-voice` must report the live figure to the Troubleshooter once
  the P1 rework (TODO.md) is built, the same standing instruction §8 already gives for
  `AnalyserNode`.

### 11.2 · Allocation, the governor, and voice stealing

`voicePool` is the global registry named but undefined in §1 (`audio.js … voice pool`).
It is owned by `core/audio.js` (P1's `audio-core` seat builds it), shared by every
instrument, and is what makes §10-A's stealing rule **the same rule in all six
instruments** — stealing operates on the whole DAW's live voices, not one instrument's.

```js
// owned by core/audio.js, called by every instrument's noteOn/noteOff — never by a voice
voicePool.register(voice, instrumentId)   // on trigger — before governor.request succeeds
voicePool.release(voice)                  // called by Voice.free() once it disconnects
voicePool.steal()                         // returns the voice to steal per §10-A, or null
voicePool.count                           // live voice count across the whole DAW —
                                           // what governor.request(cost) checks against
                                           // the 32-voice default (§8)
```

**The allocate sequence, on `noteOn`:**
1. Instrument looks up its voice's fixed `cpuWeight` (11.1a).
2. Calls `governor.request(cost)` (§8).
3. **Granted:** construct the `Voice`, call `trigger()`, `voicePool.register()`.
4. **Refused:** apply §10-A verbatim — `voicePool.steal()` returns the DAW's
   longest-released voice, or if none is releasing, its longest-held voice.
   `steal()` is called on it (5 ms fade, then `free()`), then the allocation is retried
   once. **A note is never refused** — §10-A already states this; nothing here relaxes it.

This is the same rule regardless of which instrument is asking or which instrument is
stolen from — a Wave Synth note can steal an Overtone Synth voice and the reverse. No
instrument may special-case its own voices against being stolen.

### 11.2a · `[AMENDED 2026-08-23]` — `steal()` must be atomic, forced by `test-p1`

`test-p1` (P1/S5) found this section underspecified in a way that produced a real,
measured defect: a **synchronous burst** of `noteOn` calls (a struck chord, a fast run,
several MIDI notes in one message batch) blew past the 32-voice cap in both P1
instruments — Wave Synth reached 40 voices, Overtone Synth reached 39 — while paced,
one-at-a-time allocation correctly held at 32 in both. Two BUILD seats independently
filled this gap two different, both-insufficient ways: one discarded the retry's result
and always allocated; the other deferred the retry until the stolen voice's real
async `free()` fired, which is correct in isolation but let concurrent deferred retries
each find the same momentarily-open slot without seeing each other.

**The root cause: as originally written, `voicePool.steal()` only *selects* a voice —
it does not remove it from the registry.** The registry entry (and the count
`governor.request` checks) only shrinks later, when the stolen voice's own 5 ms fade
finishes and it calls its real `free()`. Between the moment `steal()` returns a target
and the moment that fade completes, the stolen voice is still fully counted — so an
immediate retry (§11.2 step 4) has nothing new to see, and every seat had to invent its
own workaround.

**The fix, binding from this amendment forward:** `voicePool.steal()` must remove its
chosen voice from the registry **synchronously, at the moment of selection** — before
it returns to the caller — not when that voice's own async fade later completes.

```js
voicePool.steal()   // now, in addition to selecting: synchronously deregisters the
                     // chosen voice and decrements its cost from the tracked weight,
                     // in the same call. Returns the same voice as before, for the
                     // caller to still call .steal(atTime) on — that call still runs
                     // the real 5 ms fade; it no longer has anything to do with when
                     // the voice stops being counted, which already happened.
```

**Why this closes the gap completely, not just narrows it:** every `noteOn` in this
run is synchronous, start to finish, with no `await` inside its allocate-steal-retry
sequence — JS's single-threaded execution means no other `noteOn` call can interleave
partway through one. Once `steal()` itself frees the slot synchronously, the retry
immediately after it is checking a registry that has *actually* changed, in the same
tick, before any other call gets a turn. A 40-call synchronous burst now steals 8 times
and allocates 8 times, landing at exactly 32 throughout — not because of timing luck,
but because the count is never stale when it's checked. Both instrument files simplify
to one synchronous retry right after `steal()`; the async-deferred-retry pattern is no
longer necessary and should not be reintroduced.

`voicePool.release(voice)` (called from a voice's real, async `free()`) is unaffected
in shape — it already no-ops safely on a voice not found in the registry (`if (!meta)
return`), which is now the normal case for every voice that was stolen rather than
released on its own. `governor.request`'s cap check (`voicePool.count < 32`) is
unchanged; what changed is only how promptly `count` reflects a steal.

### 11.3 · The envelope contract

Every instrument exposes four `setParam` paths, matching §10-G's frozen defaults and the
curriculum's four stage names exactly:

| Path | Unit | Range | Default (§10-G) |
|---|---|---|---|
| `env.attack` | seconds | 0.001 – 2.0 | 0.005 |
| `env.decay` | seconds | 0.001 – 2.0 | 0.08 |
| `env.sustain` | level, 0–1 | 0.0 – 1.0 | 0.7 |
| `env.release` | seconds | 0.001 – 4.0 | 0.15 |

- `env.sustain` is a level, not a time — the only one of the four that is.
- These four paths exist on **every** voice-bearing instrument, wave and overtone alike.
  §11.4 and §11.5 do not repeat them; they are assumed present.

### 11.4 · Wave Synth — exact `setParam` path list

**Exactly four controls. Nothing more — this is the simple synth (BUILDPLAN).**

| Path | Type | Values | Default |
|---|---|---|---|
| `osc.wave` | enum | `'sine'` \| `'triangle'` \| `'square'` \| `'saw'` | `'sine'` |
| `osc.octave` | integer | −2 … +2 | 0 |
| `out.gain` | float | 0.0 – 1.0 | 1.0 |
| `env.attack` / `env.decay` / `env.sustain` / `env.release` | — | see 11.3 | see 11.3 |

`osc.octave` shifts the played note by `12 × n` semitones before it reaches the voice —
same mechanism as `input.octaveShift` (§5), applied inside the instrument instead of at
the input layer. `getAnalyser('spectrum')` returns the instrument's post-mix
`AnalyserNode` (11.6); `getAnalyser('scope')` returns `null` — Wave Synth's visual is the
spectrum analyzer only (PHASE.md).

### 11.5 · Overtone Synth — exact `setParam` path list

#### `[AMENDED 2026-08-24]` — 12 partials, not 8, per Brandon (D-22)

**12 partials, indices 0–11, matching the harmonic series `×1` through `×12`.**

This section originally shipped 8 partials as an instrument-design default, flagged in
open-decisions.md as **D-22** in case Brandon wanted a different count. He'd already
answered D-22 — **"1–12"** — but the shipped P1 file never picked it up; caught in the
P2-close audit ("OUTSIDE P2" findings) and ruled again in chat: **"GO BACK AND MAKE IT
1-12."** 12 governs. **Rebuilding `overtone-synth.js` to match is a P1 rework task, not
done by this amendment** — see TODO.md.

| Path | Type | Values | Default |
|---|---|---|---|
| `partial.0.level` | float | 0.0 – 1.0 | 1.0 |
| `partial.1.multiplier` … `partial.11.multiplier` | integer | 1 – 32 | index + 1 (2…12) |
| `partial.1.level` … `partial.11.level` | float | 0.0 – 1.0 | 0.0 |
| `env.attack` / `env.decay` / `env.sustain` / `env.release` | — | see 11.3 | see 11.3 |

- **The fundamental is `partial.0`.** It has a `level` only — **no `multiplier` path
  exists for partial 0.** Its multiplier is fixed at `×1` by definition; exposing it as
  settable would let a student break "fundamental = lowest," which the curriculum
  requires (PHASE.md).
- **Whole-number constraint:** `setParam('partial.N.multiplier', v)` clamps to the
  integer nearest `v` (`Math.round`), floored at `1`. There is no fractional multiplier
  in this instrument — the harmonic series is whole-number by definition and the
  curriculum teaches it that way (PHASE.md, task escalation note).
- **No `osc.octave`, no `out.gain`.** Task 5 of this seat's brief asks for exactly three
  things — fundamental, partial multiplier, partial level — mirroring Wave Synth's own
  "nothing more" restraint. If summed partials clip in practice, that is a BUILD-time
  finding for `overtone-voice` to bring to the Troubleshooter, not a param this contract
  pre-adds.
- `getAnalyser('scope')` returns the instrument's post-mix `AnalyserNode` (11.6);
  `getAnalyser('spectrum')` returns `null` — Overtone Synth's visual is the oscilloscope
  only (PHASE.md), the inversion of Wave Synth.

### 11.6 · The analysis tap — how `scopes` reads either synth

§2's `[AMENDED 2026-08-22]` block already defines `getAnalyser(which)` and its rules
verbatim; nothing here changes that text. This subsection says **where** each of the two
P1 synths' `AnalyserNode` sits, which §2 left to the instrument.

- One `AnalyserNode` per instrument, created once at construction, **not per-voice.** It
  sits after every live voice's output is summed and before `out` — it sees the
  instrument's real, current mix, exactly what a student is hearing.
- Wave Synth wires it to `getAnalyser('spectrum')`; Overtone Synth wires it to
  `getAnalyser('scope')`. Each returns `null` for the tap it does not offer (11.4, 11.5).
- `scopes` (P1/S3) reads it every rAF frame via `getByteFrequencyData` (spectrum) or
  `getByteTimeDomainData` (scope) — **never** on the scheduler, per §3's "visuals read
  from rAF, audio reads from the scheduler" split.
- **Cost:** the instrument's `cpuWeight` getter (§2) must include this `AnalyserNode` in
  its total, not just its live voices. §8 prices it at **2, marked a floor** because
  recon's offline render never called the read function. `scopes` is the seat that
  measures the real, read-every-frame cost and reports it — §8 already assigns this;
  restated here because it is this synth pair that makes the tap live for the first time.

### 11.7 · `[AMENDED 2026-08-23]` — instrument uniformity, forced by `redpen-p1`

`redpen-p1` (P1/S5) found that Wave Synth and Overtone Synth implement three §2 members
correctly but **differently from each other** — each choice was reasonable in isolation,
neither seat did anything wrong against §2's own silence, but §2 exists precisely so a
caller (a shell, P4's automation, P5's preset loader) can treat any instrument
interchangeably, and two behaviors can't both be "the" behavior. P2 adds four more
instruments against this same §2; left unruled, the divergence multiplies. This section
rules on all three, binding on every instrument from here forward — it does not edit §2's
frozen text, it specifies what §2 left silent, the same relationship §11.3 already has to
§2's `env.*` mention.

**a) Missing velocity defaults to `0.8`.** `noteOn(note, velocity, atTime)` — when
`velocity` is `undefined`, every instrument must treat it as `0.8`, not `NaN` and not a
thrown error. This is not a new number: §12.1 already fixes `0.8` as the constant a
surface reports when it cannot sense real velocity (a mouse click, a keypress). One
project-wide default, read in both places. **Wave Synth already does this. Overtone
Synth does not** (`redpen-p1` D-1) and must be brought in line.

**b) Unknown `setParam`/`getParam` path, or a malformed `setState` argument, returns
silently — it does not throw.** `setParam` on a path the instrument doesn't recognize is
a no-op; `getParam` on one returns `undefined`; `setState` given something that isn't a
plain object is a no-op. Reasoning: §7's automation and P5's preset loader will call
these programmatically, at scheduled times, on user-authored data — a thrown exception
there does not fail one control, it can stop a scheduler pass mid-song. §10-A's "never
refuse a note" is the same principle applied to a different method: prefer a silent
no-op over a hard stop. **Wave Synth already does this. Overtone Synth throws**
(`redpen-p1` D-2) and must be brought in line.

**Does not cover `partial.0.multiplier`.** §11.5 already specifies this exact path does
not exist, by design — exposing it would let a student set the fundamental's multiplier
away from ×1, breaking "fundamental = lowest" (PHASE.md). `redpen-p1` Q1 graded the
current throw against §11.5 as correct, and D-2 filed only the two synths' *generic*
unknown-path handling as drift, not this specific, deliberate one. This is a designed
invariant guard, not an unrecognized-path robustness gap — rule (b) is about the latter.
`partial.0.multiplier` keeps throwing. No code change follows from this amendment.

**c) Envelope (`env.*`) edits apply live to every currently-sounding voice, not only to
the next `noteOn`.** Reasoning, not just a coin flip: a held note is the one moment a
turned knob's effect is directly audible against a reference, which is worth more
here than in most synths, since these two tools exist to teach what a parameter does.
Snapshot-at-trigger hides that. **Overtone Synth already does this. Wave Synth
snapshots at trigger** (`redpen-p1` D-4) and must be brought in line.

**On D-5 (doc drift, informational, no fix required):** `redpen-p1` also noted that §2's
comment on `get voiceCount()` — "the governor reads this" — describes the pre-§11.2
model; the governor in fact reads `voicePool.count` (§11.2), not any instrument's
`voiceCount`. `voiceCount` remains a real, correct per-instrument live-count getter for
introspection and display (the CPU meter reads `cpuWeight`, not `voiceCount`, but
`voiceCount` is still accurate and may be read by a future seat). §2's comment text
itself is frozen and only Brandon can edit it; noted here so no seat re-solves this as a
code bug — it isn't one.

Written by `spec-voice` (P1/S1), 2026-08-22. §5 (frozen) defines the events a surface
produces and how an instrument consumes them. This section defines the **surface side** —
the interface a surface implements so the keyboard, the diatonic keys, and the scale
circle are interchangeable, now in P1 and again when P3 adds the latter two.

### 12.1 · The Surface interface

A surface **produces the input events in §5 and nothing else.** It never imports or
references an `Instrument`. That decoupling is the entire point — it is what lets P1's
`keys-input` seat build without waiting on `wave-voice` or `overtone-voice`, and it is
what P3 reuses to make three surfaces interchangeable behind one instrument.

```js
class Surface {
  static sourceId            // fixed per class: 'key' | 'diatonic' | 'circle' |
                              // 'mouse' | 'touch' | 'midi' — matches §5's `source` enum
  constructor(el, input)     // input = the shared core/input.js bus. The ONLY thing a
                              // surface is ever handed. Never an instrument, never ctx.
  mount(el)
  unmount()
  dispose()                  // drops every DOM listener it attached
}
```

- A surface's only output is calling into `input`'s emission side —
  `input.emitNoteOn({note, velocity, source: this.sourceId})` and
  `input.emitNoteOff({note, source: this.sourceId})` — which is what `input.on('noteon'/
  'noteoff', fn)` (§5) delivers to every subscriber. `emitNoteOn`/`emitNoteOff` are the
  producer-side pair to §5's already-defined consumer-side `input.on`; §5's text is
  unchanged, this names the other half of the same bus.
- A surface reads `input.octaveShift` and `input.positionShift` (§5) to decide what it
  draws — e.g. which pitch class is the bottom key — but does not own or mutate either;
  both belong to `input` itself, shared across every surface at once.
- A pitch surface also carries `surface.overlay` (§6, frozen) — `'none' | 'letter' |
  'number' | 'solfege'` — as a per-instance property. §12 does not repeat §6's rules, only
  confirms every `Surface` subclass carries the property §6 already specifies.
- **Velocity:** a surface that cannot sense velocity (a mouse click, a computer-key press)
  reports a fixed `velocity: 0.8`, matching §7's project-file default note velocity — no
  surface invents its own constant.

### 12.2 · What `keys-input` (P1/S3) builds against this

P1 ships one surface, the 12-note keyboard, covering three of §5's four routes (`key` for
computer-keyboard, `mouse` for click, `touch` for tap) plus passive `midi` attachment
(§5's amended block — fire-and-forget, never awaited). It is one `Surface` subclass whose
`mount()` draws all 12 semitones and whose `sourceId` is assigned per input event based on
which route fired (a mouse click on a key emits `source: 'mouse'`; the same key struck on
a physical computer keyboard emits `source: 'key'`) — one class, several live routes, per
§5's "all four hardware routes produce identical events."

### 12.3 · Why this makes P3 possible

`diatonic-keys` and `scale-circle` (P3) are two more `Surface` subclasses, each with its
own `sourceId` and its own `mount()` drawing. Neither touches an instrument, a voice, or
`core/audio.js` — they only call `input.emitNoteOn`/`emitNoteOff`. That is the whole
reason this interface exists: BUILDPLAN requires all three interchangeable in the DAW and
in virtual instruments, and §12.1 is what makes swapping one for another a UI change, not
an audio change.

---

## OPEN DECISIONS — `spec-voice`, not blocking

Named per this seat's brief (seat question 8). Decider stated for each; none blocks P1's
S2 or S3 seats — every default above is usable as written.

1. ~~**Overtone Synth partial count = 8** (11.5).~~ **SETTLED `[2026-08-24]` — Brandon
   ruled 12 (D-22). See §11.5's `[AMENDED 2026-08-24]`.** The number edit is made in the
   contract; `overtone-synth.js` still ships 8 and is in TODO.md's build queue.
2. **Overtone Synth voice `cpuWeight` is PROVISIONAL** (11.1a) — a floor built from
   §8's measured parts, not a direct measurement. **`[2026-08-24]` the figure is now 21,
   not the 17 written here** — recomputed for 12 partials alongside D-22; see §11.1a.
   **Decider: `overtone-voice` measures it live; the Troubleshooter is told the real
   figure.** Same standing pattern §8 already set for `AnalyserNode`.
3. **Whether Overtone Synth needs its own `out.gain`** if 12 summed partials clip in
   practice (11.5) — deliberately left out to match this seat's brief exactly.
   **Decider: `overtone-voice`/Troubleshooter, if it comes up as a build-time finding.**
   Not a music question, does not go to Brandon.
4. **Envelope parameter ranges** (11.3 table) are this seat's own reasonable synth
   defaults, not a measurement or a curriculum requirement. **Decider if Brandon wants
   different bounds: Brandon.** Low risk — every value inside the stated range is safe.

---

## 13 · GRID

Written by `spec-clock` (P2/S1), 2026-08-23. Extends §1–§12, amends nothing. This is the
one place in the app where time is divided, counted, and spoken. The step grid, P3's piano
roll, and P4's arrangement ruler all read this section — none of them defines its own.

### 13.1 · A grid position is a tick

**Ticks are the only storage unit.** No step index, no bar/beat pair, and no float
seconds is ever saved. §3 fixes **PPQ = 480** and §7 already stores every note as a `tick`.
§13 adds nothing to that; it defines the arithmetic around it.

**The four constants, derived — never hard-coded:**

```js
PPQ            = 480                      // §3, frozen
ticksPerBeat   = (4 * PPQ) / ts.bottom    // 480 at any x/4 signature
ticksPerStep   = ticksPerBeat / division  // `division` is per-lane, see §13.2
ticksPerBar    = ticksPerBeat * ts.top
stepsPerBar    = ts.top * division
```

At **4/4, 16ths**: `ticksPerBeat 480 · ticksPerStep 120 · ticksPerBar 1920 · stepsPerBar 16`.

**Counting origin — state it once, because this is where off-by-one bugs live:**

| Quantity | Base | Why |
|---|---|---|
| absolute `tick` | **0-based** | §7 writes `{"tick": 0, …}` for the first note |
| `bar` | **1-based** | §7 writes `"loop": {"startBar": 1}` |
| `beat` | **1-based** | it is the number a student says out loud — §13.3 |
| `tick` inside `position` | **0-based**, `0 … ticksPerBeat-1` | §3's `clock.position` |
| `step` index inside a lane | **0-based** | it is an array index, never spoken |

**Both directions. These two functions are the whole conversion and there is only one
implementation of each.**

```js
// bar/beat/tick  →  absolute tick     (bar and beat are 1-based, tick is 0-based)
toTicks(bar, beat, tick) =
  (bar - 1) * ticksPerBar + (beat - 1) * ticksPerBeat + tick

// absolute tick  →  bar/beat/tick     (the shape §3's clock.position returns)
fromTicks(t) = {
  bar:  Math.floor(t / ticksPerBar) + 1,
  beat: Math.floor((t % ticksPerBar) / ticksPerBeat) + 1,
  tick: t % ticksPerBeat
}

// lane step index  →  absolute tick   (exact integer, see §13.2)
stepToTicks(step)  = (step * ticksPerBeat) / division
// absolute tick    →  lane step index
ticksToStep(t)     = t / ticksPerStep       // integer only if t lands on this lane's grid
```

`clock.seek(bar, beat, tick)` (§3) takes the 1-based pair. Everything stored takes the
absolute tick. **A seat that finds itself writing `+1` outside these four functions has
already made the bug.**

**§3's `tick is 0..PPQ-1` holds exactly at any `x/4` signature**, where
`ticksPerBeat === PPQ === 480`. At `x/8` the beat is half as long and the range narrows to
`0..239`, at `x/2` a beat is two quarter notes and `position.tick` alone cannot address it.
**This narrowing is not an amendment to §3** — every value stays inside §3's stated range.
`recon-scheduler` (P2/S2) verifies the arithmetic; see §13.4 for which bottoms are
supported and OPEN DECISIONS item 3 for the `x/2` case.

### 13.2 · Triplets and 16ths in one machine — `division` is per-lane

**A44**: "8 pieces, **16th + triplet**." PHASE.md: "16th subdivision **plus** a triplet
mode." One machine, both, and **not two grid implementations.**

**The mechanism: a lane declares how many steps it cuts a beat into. That number is the
only difference between the two modes.**

```js
lane.division   // integer steps per beat. 4 = 16ths (default) · 3 = triplets
```

Everything else in §13.1 already takes `division` as an argument. A triplet lane is not a
special case, a second code path, or a second grid — it is the same `stepToTicks()` with a
3 where a 4 was. **A seat that writes `if (isTriplet)` around anything other than the
label lookup (§13.3) and the number of columns it draws has built the second
implementation this section exists to prevent.**

**Per-lane, not per-track and not per-pattern.** Stated as a decision, with the reason:

- **Per-pattern** would force the whole kit into triplets to put a triplet hi-hat over a
  straight kick — which is the exact thing "**clap/count split-beat rhythms**" (PHASE.md,
  from the outline's Decode section) asks a student to hear.
- **Per-track** is the same restriction one level down: in this phase a machine *is* a
  track, so per-track and per-pattern are the same limit.
- **Per-lane** is one integer on the row that is already the grid's unit of drawing. It
  costs nothing and it is the only one of the three that plays the curriculum's own
  example.

**Exactness — why PPQ 480 was the right choice and what it buys:**

`480 = 2⁵ · 3 · 5`. Every division the app offers divides it with **zero remainder**, so
a triplet never accumulates drift and never needs a float:

| `division` | Name | `ticksPerStep` at x/4 | Exact? |
|---|---|---|---|
| 1 | beats | 480 | yes |
| 2 | 8ths | 240 | yes |
| **3** | **triplets — 8th-note triplets, three per beat** | **160** | **yes** |
| **4** | **16ths — the default** | **120** | **yes** |
| 6 | 16th triplets | 80 | yes |
| 8 | 32nds | 60 | yes |

**`division = 3` is the triplet mode this phase ships** — three steps per beat, twelve in
a 4/4 bar. That is what Brandon's triplet count in §13.3 speaks, and it is what the grid
draws when triplet mode is on. `division` 1, 2, 6 and 8 are exact and cost nothing to
allow; whether the UI exposes them is the `grid` seat's (P2/S4) call, not a contract
question. `recon-scheduler` (P2/S2) verifies the 160-tick figure holds over 64 bars with
zero drift — its seat question 5.

### 13.2a · Swing

**D-28, Brandon: "defineatly swing."** Named here so two seats do not each invent it.

**Swing is a playback-time offset. It never changes a stored tick.** A step's tick in the
pattern and in the §7 project file is always the exact grid value from §13.1. The clock
delays the *sounding* of odd-indexed steps in a `division = 4` lane by a fraction of one
`ticksPerStep` when swing is on. Toggling swing off must return the pattern to dead-
straight with no data loss, and a project saved with swing on and reloaded must sound
identical — which it does, because nothing on disk moved.

**The amount and the feel curve are not set here.** See OPEN DECISIONS item 4.

### 13.3 · The counting labels

**These strings are Brandon's, not this seat's.** Both come from him on the record and
neither was invented here:

- **16ths** — §6, frozen: `syllable = 1 e + a`. Outline: "Subdivision: any unit that
  divides a full beat (we use syllables, **e + a**)."
- **Triplets** — [open-decisions.md](P0-run-open/open-decisions.md) **D-14**, Brandon's
  answer verbatim: `1 + a    2 + a`.

**Beats are whole digits. Subdivisions are syllables.** The digit is the beat number in
the measure, 1-based, counting up to `ts.top` and restarting each bar.

#### The literal sequence for one 4/4 bar

**At 16ths (`division = 4`) — 16 labels:**

```
1  e  +  a    2  e  +  a    3  e  +  a    4  e  +  a
```

**At triplets (`division = 3`) — 12 labels:**

```
1  +  a    2  +  a    3  +  a    4  +  a
```

#### The rule that produces them

```js
// step 0-based within the bar; ts.top beats per bar; division steps per beat
label(step, division) =
  (step % division === 0)
    ? String(Math.floor(step / division) + 1)     // the beat: a whole digit
    : SYLLABLES[division][step % division]        // the subdivision

SYLLABLES = {
  1: [],
  2: [ , '+'          ],   // 8ths
  3: [ , '+', 'a'     ],   // triplets   — D-14
  4: [ , 'e', '+', 'a']    // 16ths      — §6
}
```

**Three surfaces, one function.** §6 (frozen) already rules: "Labels come from
`theory/scale.js`. **No surface builds its own label strings.**" That applies to
`surface.overlay = 'syllable'` exactly as it applies to pitch. The step grid
(`surfaces/step-grid.js`), P3's piano roll (`surfaces/piano-roll.js`), and P4's
arrangement ruler all call this one function. **PHASE.md is explicit: the drum machine and
the piano roll must use the same numbers and the same syllables.** This table is how that
is enforced rather than hoped for.

- A surface's per-instance `surface.overlay` toggle (§6, `'none' | 'syllable'`) decides
  whether the strings are *drawn*. It never decides what they *are*.
- `division = 6` and `8` have **no syllable set** — Brandon has named two, `e + a` and
  `+ a`, and this seat does not invent a third. A lane at those divisions draws the beat
  digits and leaves the subdivisions blank. See OPEN DECISIONS item 5.

### 13.4 · Time signature

**Representation is §3's, unchanged and untouched:** `clock.timeSignature = {top, bottom}`,
two integers, saved by §7 as `"timeSignature": {"top": 4, "bottom": 4}`. §13 adds no field
and renames nothing.

- **`top` = beats per measure.** Outline line 22, and **D-13**, where Brandon ruled
  "FOLLOW THE SCOPE." It is the number of whole digits the student counts before the bar
  restarts (§13.3), and it is `stepsPerBar / division` (§13.1).
- **`bottom` = which note value gets one beat.** It enters the app in exactly one place:
  `ticksPerBeat = (4 × PPQ) / bottom` (§13.1). **Nothing else reads it.**

**Supported `bottom` values: 2, 4, 8, 16.**

| `bottom` | Beat is a | `ticksPerBeat` | Exact? |
|---|---|---|---|
| 2 | half note | 960 | yes — but see below |
| **4** | **quarter note — the default (§7)** | **480** | yes |
| 8 | eighth note | 240 | yes |
| 16 | sixteenth note | 120 | yes |

All four divide `4 × 480 = 1920` with zero remainder. **32 and any non-power-of-two are
not supported** — they are not in the curriculum, nothing in the docset asks for them, and
this seat does not add what nobody requested.

**`bottom = 2` carries one caveat a builder must know.** At 2/2 a beat is 960 ticks, and
§3's `clock.position.tick` is documented as `0..PPQ-1` — 0..479. `position.tick` alone
therefore cannot address the back half of a half-note beat. **§3 is frozen and this seat
does not edit it.** The grid itself is unaffected: it stores absolute ticks (§13.1) and
never round-trips through `position`. Flagged for `clock` (P2/S3) and named in OPEN
DECISIONS item 3.

#### `[AMENDED 2026-08-24]` — Display: no bottom number at all, per Brandon

This contradicts this seat's own brief, and the contradiction is on the record rather than
resolved silently.

- [outline](../../outline) line 22 and `spec-clock`'s brief both say the bottom number is
  taught and drawn as a **symbol, not a digit**.
- [open-decisions.md](P0-run-open/open-decisions.md) **D-20**, asking for that exact symbol
  set, was answered by Brandon: "it doesn't need to be there." That reading was ambiguous
  — drop the symbol (keep `4/4`) or drop the bottom number outright (render `4`) — and was
  re-asked as **P2-1** in
  [P2's open-decisions.md](P2-beat-tool/open-decisions.md). Brandon's ruling there settles
  it: **"if there is no standard notation, then leave the bottom number out. What symbol
  gets the beat is irrelevant — in the DAW the click track is the beat."**

**The app stores `bottom` as before and renders no bottom number at all — no symbol, no
digit.** Only the top number (`4`) is drawn. No seat re-opens this — if it comes back, it
comes back from Brandon.

**Nothing in the grid depends on this.** Every number in §13.1 through §13.3 reads
`bottom` as an integer. Display is the transport bar's and the ruler's problem, and they
now have a ruling instead of a guess.

### 13.5 · A step, as data

```js
step  =  null                      // OFF. The whole representation of an empty cell.
      |  { v: 0.8 }                // ON, with velocity. v is 0.0–1.0.
      |  { v: 0.8, tick }          // ON, off-grid — see [AMENDED 2026-08-24] below
```

**On/off is the presence of the object. Velocity is the only field for an on-grid step.**
There is no `on: true` flag — an object that exists is on, and `null` is off. Two ways to
say "off" is one way too many.

- **`v` is required and always present on an ON step.** **A28**: "velconity on ipano roll
  and drummachine." A step written without a velocity is written with **`0.8`** — the same
  constant §11.7a fixes for a missing `noteOn` velocity, §12.1 fixes for a surface that
  cannot sense one, and §7 shows as its example note velocity. **One number, four places,
  already decided elsewhere. This section adds no new default.**
- **No length.** A drum piece is a one-shot; §13.6 states the length it serializes with.
- **No probability, no ratchet, no per-step tuning.** Nobody asked. §10 forbids inventing
  an interface.

#### `[AMENDED 2026-08-24]` — off-grid `tick`, forced by P2-5

Closes **P2-5** — the found gap where §13.6 already described a note being "marked
off-grid" but no field existed to carry the mark or its true position, so a captured
off-grid hit was silently re-quantized on the next save. Ruled by Brandon: *"wire however
you need to in order to be accurate and faithful to how the students actually performed
it when they recorded, and allow the students to leave the grid if they choose when
inputting notes — default snap in programming, default slop in performance."*

- **`tick` is optional and present only when the step is off-grid** — a captured
  performance hit that didn't land exactly on this lane's grid, or a programmed hit a
  student deliberately nudged off-grid. When absent, the step's true position is
  `stepToTicks(stepIndex)` as before — the common case is unchanged.
- **When `tick` is present, it is the step's real absolute-tick position and overrides the
  array-index position for both playback and save.** The grid still draws the step at its
  nearest index (`ticksToStep`, §13.1) so the lane stays visually dense, and marks it
  off-grid (`[data-off-grid="true"]`, already shipped in `step-grid.js` per `redpen-p2`) —
  but the step *sounds*, and *saves*, at `tick`, not at the index's implied position.
- **Snap default is a property of how the note arrived, not a stored field:**
  student-clicked/programmed input snaps to the nearest step by default (no `tick`
  written); captured/performed input keeps its real tick by default (`tick` written
  whenever it differs from the nearest step's position). Both directions are a UI-level
  choice on the input surface, per Brandon's ruling above — this section only specifies
  what gets stored once that choice is made.

**The lane and the pattern:**

```js
lane    = { piece: 0,          // index 0-7 into §14's role list — NOT a note number
            division: 4,       // §13.2
            steps: [ … ] }     // dense array, length = bars * ts.top * division

pattern = { bars: 1,           // pattern length in bars
            lanes: [ … ] }     // exactly 8, one per §14 piece, in index order
```

`steps` is **dense** — `steps[i]` is `null` or a step object, and its length is always
`bars * ts.top * division`. A grid UI draws an array; a sparse map would make it search.
Changing `bars`, `ts.top`, or a lane's `division` resizes that lane's array; **a lane that
grows keeps what it had and pads with `null`, and a lane that shrinks keeps the steps that
still fit.** Nothing else is preserved — a step scrolled off the end is gone, and the
student sees that happen.

### 13.6 · Round-trip through §7 — the frozen fields, and nothing new

**§7 is frozen and already has room for all of this. §13 adds no key to the project file.**

A drum pattern lives in **two** frozen §7 places, and the split is the point:

| What | Where in §7 | Why there |
|---|---|---|
| the hits themselves | `channels[].notes[]` | **A29**, linear song — a drum hit **is** a note on the timeline, and P4's arrangement and P5's `.mid` export both read `notes[]` |
| `division` per lane, `bars`, the kit id | `channels[].instrumentState` | §2's `getState()`/`setState()`, which §7's amendment already requires to round-trip exactly |

**Save — step → §7 note:**

```js
{ tick:     step.tick ?? (laneStartTick + stepToTicks(stepIndex)),  // §13.5 AMENDED
  length:   ticksPerStep,                             // the lane's own step length
  note:     PIECES[lane.piece].note,                  // §14's fixed note number
  velocity: step.v }
```

**Load — §7 note → step:** the note lands in the lane whose `PIECES[i].note` matches
`note.note`; its step index is `ticksToStep(note.tick)` using **that lane's saved
`division`**, which is why `division` must be in `instrumentState`. **A note whose tick
does not land exactly on its lane's grid is kept and sounds at its true tick; the grid
draws it at the nearest step, marks it off-grid, and writes that true tick into the
step's `tick` field (§13.5 AMENDED) so a re-save does not quantize it away.** It is never
silently moved and never dropped — §7's rule is that a loader "refuses and says so; it
never guesses," and quietly quantizing a student's recorded take is a guess.

This satisfies §7's amended round-trip rule verbatim: *"`save()` writes exactly what
`setState()` can read back."* A pattern saved and reloaded is the same pattern, with the
same divisions, the same velocities, and the same off-grid hits.

---

## 14 · KITS

Written by `spec-clock` (P2/S1), 2026-08-23. Extends §1–§12 and §10-E, amends nothing.
**A44**: "**8 pieces**, 16th + triplet." **A17**: "Synth kit vs. sampler." **A22**:
"Bundled + you add kits."

### 14.1 · The eight pieces are roles, fixed app-wide

**The eight pieces are a fixed, ordered role list. Every kit — synthesized or sampled —
supplies exactly these eight, in this order.** A kit does not choose its own pieces.

This is the single decision that makes §14.4 work: if index 3 is the same role in every
kit, then `static pieces` (§2) really is static, the grid never re-reads a manifest when a
kit changes, and the two machines cannot drift apart.

> ### `[AMENDED 2026-08-24]` — labels ruled by Brandon
>
> **A44** gave the count and nothing else; the names were missing from the
> [outline](../../outline), [qa-transcript.md](../../qa-transcript.md), and
> [open-decisions.md](P0-run-open/open-decisions.md). Brandon ruled the eight labels
> directly, in order: Kick, Snare, Open Hat, Closed Hat, Tom, Ride, Effect 1, Effect 2.
> **The label column is CONFIRMED.** The `note` column below was never his to rule on —
> it's the GM-percussion-numbering default carried since P0, and it stays provisional
> except index 0. Two of the eight (Effect 1, Effect 2) have no GM percussion analog;
> their notes are conservative placeholders, flagged separately below.

| index | label | `note` | Fixed by |
|---|---|---|---|
| **0** | **Kick** | **36** | **§10-E, frozen** — it names index 0, "Kick", note 36 |
| 1 | Snare | 38 | provisional |
| 2 | Open Hat | 46 | provisional |
| 3 | Closed Hat | 42 | provisional |
| 4 | Tom | 45 | provisional |
| 5 | Ride | 51 | provisional |
| 6 | Effect 1 | 39 | provisional — no GM analog, placeholder only |
| 7 | Effect 2 | 49 | provisional — no GM analog, placeholder only |

**Index 0 is not provisional.** §10-E is frozen and already writes
`{"index": 0, "label": "Kick", "note": 36, "file": "kick.wav"}`. Indices 1–5 follow
General MIDI percussion numbering from that anchor, so a `.mid` export (**A46**: "I want
the kids to be able to export things and use them in a real DAW") opens in another DAW on
the right drum sounds instead of silence. Indices 6–7 (Effect 1, Effect 2) fall outside GM
percussion entirely — their note numbers are placeholders, not derived from a standard,
and stay open if Brandon wants to fix them later.

The first three carry the curriculum on their own: PHASE.md's **basic backbeat** is kick,
snare, hat.

- **`index` and `note` are fixed by this table.** A kit may not move them.
- **`label` may be overridden per kit** by the manifest — §10-E already gives every piece
  a `label` field, so an 808 kit can read "808 Kick" at index 0. The **role** does not
  change; only the word drawn on the row does.
- **Exactly eight. Not seven, not nine.** A manifest with any other count is a load error
  (§14.3).

### 14.2 · Folder layout

```
/assets/kits/kits.json                  the list of kit folders — one line per kit
/assets/kits/<kit>/kit.json             the manifest — §10-E, frozen format
/assets/kits/<kit>/*.wav                eight files, named by the manifest
```

Example:

```
/assets/kits/808/kit.json
/assets/kits/808/kick.wav  snare.wav  hat-closed.wav  hat-open.wav
                           clap.wav   tom-low.wav     tom-high.wav   crash.wav
```

**Filenames are whatever the manifest says.** `kit.json` carries a `file` per piece
(§10-E), so a kit's `.wav` files may be named anything — Brandon does not rename what he
drops in. The manifest is the only thing that must be right.

### 14.3 · The manifests

**`kit.json` — §10-E, frozen, restated only for its shape. Eight entries, `index` 0–7:**

```json
{ "format": "chromebook-daw-kit", "version": 1, "name": "808",
  "pieces": [{ "index": 0, "label": "808 Kick", "note": 36, "file": "kick.wav" }] }
```

**`/assets/kits/kits.json` — the folder list. §10-E names this file; this is its shape:**

```json
{ "format": "chromebook-daw-kits", "version": 1,
  "kits": ["808", "acoustic", "909"] }
```

Each string is a folder name under `/assets/kits/`. **This file exists because of A10 —
"Static site, no backend" — which means a browser cannot list a directory.** §10-E already
states this is forced, not chosen.

**Failure behavior, so three seats do not each invent one:**

| Failure | Behavior |
|---|---|
| `kits.json` missing or unparseable | the sampler offers no kits and says so on its face. **The app still loads and the Drum Synth still works** — §3's "nothing may block startup" |
| a listed kit folder is missing `kit.json` | `[AMENDED 2026-08-24]` — **P2-9**: the kit stays selectable in the list. On selection, it fails to load and the screen names it unavailable at that moment, right where the kit would normally load. Brandon's ruling, superseding this row's original "not selectable" text. |
| `kit.json` has other than 8 pieces, or a bad `index` | the kit is **refused and named**, per §7's "refuses and says so; it never guesses" |
| one `.wav` fails to decode | the kit loads; **that piece is silent and drawn as failed.** The other seven play. A student is never left with a dead machine because one file was bad |
| unknown `format` or `version` | refused and named. §7's rule, same words |

**Never a silent failure and never a substituted sound.** A wrong sound is worse than a
named missing one in a classroom.

### 14.4 · Adding a kit — no code change, no rebuild

Brandon's workflow, **A22** ("Bundled + you add kits"), in full:

1. Drop a folder under `/assets/kits/`.
2. Put a `kit.json` in it naming the eight files against the §14.1 roles.
3. Add the folder name to the `"kits"` array in `/assets/kits/kits.json`.

**No source file changes. No rebuild — there is no build step before P5 (§10).** The
sampler reads `kits.json` at load and offers whatever it finds.

Step 3 is the one manual line, and it is unavoidable: **A10** forbids a backend, so nothing
in the browser can discover the folder on its own. §10-E already ruled this — "adding a kit
means dropping a folder and adding one line."

### 14.5 · One grid, two machines — the grid never knows which

**The requirement, from §2's frozen amendment 3, in its own words:** `surfaces/step-grid.js`
"is shared by both and must draw eight labeled rows **without knowing which machine it is
drawing.**"

**§14.1 is what makes that true.** Because the eight roles are fixed app-wide, `index`,
`note` and the row order are identical for the Drum Synth and for every sampled kit. Only
the sound behind a row differs — and the grid never touches the sound.

**The grid's entire knowledge of an instrument is two frozen §2 members:**

```js
Instrument.pieces                      // §2 — [{index, note, label}] × 8, in index order
instrument.noteOn(note, velocity, atTime)   // §2 — the only call the grid ever makes
```

**Playing a step is one line, and it is the same line for both machines:**

```js
inst.noteOn(inst.constructor.pieces[lane.piece].note, step.v, atTime)
```

**What the grid may not do — each of these is a seat leaving its lane:**

- read `kit.json`, `kits.json`, or anything under `/assets/`
- call a `playPiece(index)`-style method. **There is no such method.** A piece is played by
  its `note` through `noteOn`, exactly as every other instrument in this app is played
- branch on `instrument.constructor.id`, on `needsLoad`, or on whether a kit is loaded
- hold a note number of its own. `lane.piece` is an **index 0–7**, never a MIDI note —
  §13.5 says so, and the translation happens only at the call above

**Where the two machines differ, and where that difference stops:**

| | Drum Synth | Drum Sampler |
|---|---|---|
| `static pieces` | §14.1's eight | §14.1's eight — **the same eight** |
| `static needsLoad` (§2) | `false` | `true` |
| `ready()` (§2) | resolves immediately | resolves when the kit has decoded |
| what a piece is | a synthesis recipe | one decoded `AudioBuffer` |
| swapping kits | n/a | new files behind the same eight roles |

**Everything below the `pieces` line differs. Everything at or above it is identical.**

**`static pieces` is genuinely static, and that is not an accident.** §2 declares it a
static member, which a runtime-chosen kit could not honor if kits picked their own pieces.
§14.1's fixed roles remove the problem instead of working around it: the labels and notes
are the same for every kit, so only the `label` string may be swapped for display when a
kit overrides it (§14.1), and the grid's layout never changes underneath a student
mid-lesson.

**Loading, per §2's `ready()`:** the grid draws its eight rows and accepts clicks the
moment it is mounted, whether or not a kit has decoded — §3's rule that nothing blocks
startup and only sound waits. A step played before `ready()` resolves makes no sound and
is not an error. The Drum Synth is never in this state.

---

## OPEN DECISIONS — `spec-clock`, §13 and §14

Seat question 8. A decider is named on every one. **Items 1 and 2 are Brandon's and were
escalated to him in chat on 2026-08-23; neither blocks a P2 seat from starting.** The rest
are engineering and are named to stop two seats from each inventing an answer.

1. **The eight piece labels (§14.1) — `PROVISIONAL`, the only one in this deliverable.**
   **A44** gives the count, "8 pieces," and no names. They are not in the outline, the
   transcript, or `open-decisions.md`. §10-H makes this Brandon's by rule: "a BUILD seat
   that finds itself picking a scale, a **syllable**, a spelling, or a chord name has left
   its lane." Index 0 = Kick, note 36 is **not** provisional — §10-E is frozen and states
   it. The other seven notes follow General MIDI so **A46**'s `.mid` export opens correctly
   elsewhere; the seven **labels** are the open part. **Decider: Brandon.** He overwrites
   the table and nothing else in §13 or §14 changes.

2. **The time-signature bottom symbol (§13.4) — a conflict on the record, not a gap.**
   The [outline](../../outline) line 22 and `spec-clock`'s own brief say draw a symbol;
   Brandon's **D-20** answer says "it doesn't need to be there." §13.4 follows **D-20** and
   the app stores the digit with no symbol rendered. **Decider: Brandon**, and no seat
   re-opens it on its own.

3. **`bottom = 2` versus §3's `position.tick` range (§13.4).** At 2/2 a beat is 960 ticks
   and §3 documents `clock.position.tick` as `0..PPQ-1`. The grid is unaffected — it stores
   absolute ticks and never round-trips through `position` — but the transport display and
   `clock.seek()` need a ruling. §3 is frozen; this seat did not edit it and did not build
   around it. **Decider: `clock` (P2/S3) reports what it hits to the Troubleshooter; if the
   fix needs §3 text, that is Brandon's, per the FREEZE NOTICE.** Not blocking: 4/4 is §7's
   default and the whole curriculum.

4. **Swing amount and feel curve (§13.2a).** **D-28**: "defineatly swing." The mechanism is
   fixed here — a playback offset that never moves a stored tick. The percentage, its
   range, and whether it is per-lane or per-machine are not. **Decider: Brandon on the feel
   (it is what a student hears); `grid`/`clock` on where the control lives.** Not blocking —
   swing off is straight, which is the default and the whole curriculum's starting point.

5. **No syllables exist for `division` 6 or 8 (§13.3).** Brandon has named two sets,
   `e + a` (§6) and `+ a` (**D-14**). This seat did not invent a third. Those lanes draw
   beat digits and blank subdivisions. **Decider: Brandon, and only if he wants those
   divisions exposed at all.** Not blocking — P2 ships 3 and 4, per **A44**.

6. **Whether a captured performance keeps its off-grid feel (§13.5).** §13.5 stores no
   per-step micro-timing offset, and §13.6 keeps an off-grid note at its true tick rather
   than quantizing it. Whether `capture` (P2/S5) needs more than that is a build-time
   finding, not a field this contract pre-adds. **Decider: `capture` reports to the
   Troubleshooter.** Not a music question; does not go to Brandon.

7. **`bars` per pattern has no maximum (§13.5).** A dense lane array is `bars × top ×
   division` entries — cheap, but unbounded. §8's governor measures main-thread cost and
   would see a pathological pattern only as slow drawing. **Decider: `grid` (P2/S4) sets a
   sane UI limit if one is needed; `test-p2` reports if it is.** Not blocking.

*End of `spec-clock`'s sections. §1–§12 were not touched. No `/src` file was written.*

---

## 15 · THEORY

Written by `spec-scale` (P3/S1), **2026-08-24 14:48 EDT**. Extends §1–§14, **amends
nothing**. §4 (scale state) and §6 (overlay labels) are frozen; this section is the
computation behind them, not a revision of them.

> ## `[AMENDED 2026-08-24]` — Brandon ruled OD-1 … OD-15. **READ THIS BEFORE THE BODY.**
>
> Written by `spec-scale` (P3/S1), **2026-08-24 15:32 EDT**, on Brandon's rulings taken the
> same day. **This block supersedes the body of §15 wherever the two disagree.** Every
> superseded location below carries an inline pointer back here; none was left standing
> silently. §1–§14 are still untouched.
>
> **One reversal, and it is Brandon overriding his own prior explicit ruling: D-16.**
> `open-decisions.md` D-16 read "**FIXED FUCKING DO**". It is now **SUPERSEDED — movable
> do**. §15.2c was built on fixed do and is rewritten below. This is flagged loudest because
> it is the only place in the docset where a Brandon answer replaces a Brandon answer.

### `[AMENDED 2026-08-24]` · A1 — Spelling: key signature, or both faces (OD-1, OD-1a)

**Brandon:** *"enharmonics follow key signature or show both"*

This **extends D-18** ("key signatuer"); it does not contradict it. The rule is now complete
for all twelve keys:

1. **The key signature decides.** Where one of the two faces is a real key signature and the
   other is not, the real one wins — already CONFIRMED for eight keys in §15.2b.
2. **Where both are real signatures, the one with fewer accidentals wins.** `tonic: 1` →
   **D♭ major** (5 flats, against C♯ major's 7). **OD-1a RESOLVED — D♭.** §15.2b's DERIVED
   mark on that row becomes **CONFIRMED**.
3. **Where the two are an exact tie, show both.** `tonic: 6` is six sharps against six flats
   and is the only tie in the twelve. **OD-1 RESOLVED — show both faces.**

```js
// theory/scale.js
keySpelling(tonic) → { letter, accidental, alt, tie }
// tie === false : alt === null. tie === true : alt is the other face.
keySpelling(6) = { letter:'F', accidental:1, alt:{letter:'G', accidental:-1}, tie:true }

// In a tie key, EVERY degree carries both faces, because the whole scale is spelled twice.
spellingOf(scale, i).text  =  tie ? `${sharpFace}/${flatFace}` : `${face}`
// tonic 6, degree 0 → 'F♯/G♭' · degree 1 → 'G♯/A♭' · … · degree 6 → 'E♯/F'
```

**Mechanism:** the dual spelling is `spellingOf` run twice over the same code path — once
with `base = LETTERS.indexOf('F')`, once with `base = LETTERS.indexOf('G')` — and the two
`text` values joined with `/`. **No second algorithm, no table.** The `letter` overlay is
**no longer unavailable in any key**; §15.2b's sentence saying it is, is superseded.

### `[AMENDED 2026-08-24]` · A2 — **MOVABLE DO. D-16 IS REVERSED.** (OD-3)

**Brandon:** *"moveable DO, the key of the scale is always Do"* — and:
*"Do is whatever the tonal center is. If the scale's tonal center is D, D is do. This means
that anything not following the major pattern needs to be marked accordingly. If this is
confusing, have the agent make a decision that's easy to undo."*

**D-16 is SUPERSEDED** in [open-decisions.md](P0-run-open/open-decisions.md), stamped there
with today's date and a pointer to this block. §15.2c's `FIXED_DO` constant, its code, and
its ⚠ collision note are **struck**. What replaces them:

```js
// theory/scale.js — the syllable is a property of the DEGREE INDEX, not of the letter.
SOLFEGE = ['Do','Re','Mi','Fa','Sol','La','Ti']       // Brandon's own seven, D-1, verbatim

solfegeOf(scale, i) = SOLFEGE[i] + MARK(scale, i)     // i = 0-6. ALWAYS speaks.
```

- **The tonic is always `Do`** — whatever pitch class `state.scale.tonic` currently holds.
  Tonic D → D is Do. Tonic B → B is Do. **All seven degrees get a syllable in every key.**
- **Position 8 is `Do`.** The outline's "**1/8 for Do**" is now literally true, in all twelve
  keys, and §4's "the eighth note … same syllable" is satisfied without qualification.
- **`Sol` (not `So`) and `Ti` (not `Si`)** — unchanged, D-1, Brandon's own list.
- **D-17 still stands and is not touched by this.** "Do chromatic notes get solfege? **NO**"
  — a pitch that is **not one of the seven degrees** returns `''`. Under movable do that is
  the only silent case, and it is exactly the case D-17 named.

> **The collision §15.2c reported no longer exists.** Fixed do bound a syllable to a
> *letter*, which is what silenced five of seven degrees in most keys and made "1/8 for Do"
> true only in C. Movable do binds it to the *degree*. **OD-3 is void, not deferred.**

#### "Marked accordingly" — the easiest-to-undo call, made here

Brandon's ruling requires a degree that does not follow the major pattern to be **marked**,
and explicitly authorises this seat to pick the mechanism (*"have the agent make a decision
that's easy to undo"*). **The decision, and it is one line to remove:**

```js
MAJOR = [0, 2, 4, 5, 7, 9, 11]                    // §15.5 — the pattern being measured against

solfegeDeviation(scale, i) = scale.degrees[i] - MAJOR[i]      // signed semitones. 0 = plain.
MARK(scale, i) = GLYPH[solfegeDeviation(scale, i)] ?? '*'     // GLYPH is §15.2b's, reused
```

| `degrees[i]` vs `MAJOR[i]` | Syllable reads | Example |
|---|---|---|
| same | `Mi` | C major, degree 3 |
| one lower | `Mi♭` | C with degree 3 lowered |
| one higher | `Fa♯` | C with degree 4 raised |
| more than ±2 | `Mi*` | unreachable once OD-8's clamp lands (A9 below) |

- **The mark is measured against the MAJOR PATTERN, not against the letter.** These are
  different numbers and a builder must not merge them: in D major degree 3 is **F♯** — an
  accidental in the spelling — but `degrees[2] - MAJOR[2] === 0`, so its syllable is a plain
  **`Mi`** with no mark. The spelling accidental answers "what letter is this"; the solfège
  mark answers "did this degree move off major".
- **`GLYPH` is reused, not duplicated.** One constant serves both (§15.2b, and A7 below).
- **Return type is unchanged — still a string.** `circlePositions().solfege` and
  `noteBank().tones[].solfege` keep working with no consumer edit. A separate pure
  `solfegeDeviation(scale, i)` exposes the signed integer for anything that wants it.
- **To undo:** delete `+ MARK(scale, i)` from `solfegeOf`. Nothing else reads `MARK`.
- **What this seat would have asked Brandon instead:** whether an altered degree should take
  a **chromatic solfège syllable** (`Me`, `Ra`, `Fi`, `Le`, `Te`). That is a syllable system
  and §10-H makes syllables his, so this seat did not ship one.

### `[AMENDED 2026-08-24]` · A3 — Circle orientation (OD-5)

**Brandon:** *"Do is 12-o-clock, top center of circle"*

**Position 1 sits at 12 o'clock, top centre. CONFIRMED.** §15.3's "⛔ BRANDON — OD-5" is
superseded.

**Direction was not ruled.** Easiest-to-undo call: **clockwise**, ascending. One constant.

```js
CIRCLE_START_ANGLE = -90       // degrees; -90 = 12 o'clock. Brandon, CONFIRMED.
CIRCLE_DIRECTION   = +1        // +1 clockwise, -1 counter-clockwise. Flip this one number.
```

### `[AMENDED 2026-08-24]` · A4 — The circle draws **seven** slots (OD-4)

**Brandon:** *"circle draws 7 slots, labels Do 1/8"*

**Seven drawn positions. The Do slot carries the label `'1/8'`.** There is no eighth slot.
§15.3's "⛔ BRANDON — OD-4" is superseded and **`scale-circle` (P3/S5) is unblocked.**

```js
CIRCLE_SLOTS = 7
slotNumberLabel(p) = p === 1 ? '1/8' : String(p)     // '1/8' '2' '3' '4' '5' '6' '7'
```

- **`circlePositions()` still returns 8 entries and its shape does not change.** Entry 8 is
  no longer drawn; it survives because it carries the **octave pitch** (`entries[7].midi`),
  which is the only thing on it that was ever unique.
- **Clicking the Do slot sounds `entries[0].midi`** — the lower tonic. *Easiest-to-undo call;
  Brandon ruled the drawing, not the click.* To change: one line in `scale-circle`'s click
  handler, or split the slot into two hit zones. **What I would have asked instead:** whether
  the Do slot should sound the octave when clicked on its outer half.

### `[AMENDED 2026-08-24]` · A5 — Augmented and diminished colours (OD-6)

**Brandon:** *"augmented and diminished seem to have none, have the agents make a decision"*

**Deciding seat: this one (`spec-scale`, SPEC), not the BUILD seat.** Reason: `degreeColor`
is called by four surfaces (§9) and two engines; if S3/S4/S5 each decide, they drift. One
answer, in the contract, is the only shape that holds.

**The decision — and §9 is not edited, because §9 is frozen and this seat cannot:**

```js
// theory/scale.js — ONE object, five rows, pure data. This is the whole indirection.
QUALITY_TOKEN = { major:       '--deg-major',
                  minor:       '--deg-minor',
                  diminished:  '--deg-dim',
                  augmented:   '--deg-dim',     // ← the changeable row
                  altered:     '--deg-altered' }

degreeColor(scale, i) = QUALITY_TOKEN[degreeQuality(scale, i)]
```

- **Diminished keeps `--deg-dim`** — §9 names that token and §4 writes
  "diminished/augmented → flagged distinctly" as one clause.
- **Augmented shares it.** Changing that later is **one string in one object**, which is why
  the lookup was pulled out of the function.
- **What I would have recommended asking Brandon:** add a fifth token `--deg-aug` to §9.
  Only he can edit §9. If he does, edit the `augmented` row above and nothing else.
- **The `--deg-altered` word collision is resolved by keeping the two things apart, not by
  renaming either.** `--deg-altered` means **the quality** — a stack that is not a
  recognisable triad. **"The student moved this degree" is already carried separately** as
  `scale.altered[i]` (§4), which `circlePositions()` already returns on every entry, so a
  surface marks "moved" from that boolean and never from the colour. **No token is
  overloaded and no frozen section changes.**

### `[AMENDED 2026-08-24]` · A6 — No extension names past 9 (OD-7, part)

**Brandon:** *"no names needed past 9"*

```js
EXT = { 3:'', 4:'7', 5:'9', 6:'', 7:'' }     // 6 and 7 were ⛔; they are now CONFIRMED ''
```

Six- and seven-tone stacks compute correctly and **label as the plain cased numeral with no
extension digit**. §15.8's ⛔ on `EXT[6]`/`EXT[7]` is superseded.

### `[AMENDED 2026-08-24]` · A7 — Accidental glyphs (OD-9)

**Brandon:** *"there should be symbol fonts that can cover the natural sign or all of them,
italic # and lowercase b if not (if no natural sign, the agent marks it and suggests cheap
vs expensive alternatives and goes with the easiest decision to undo later)"*

**Marked, as instructed: §15 never emits a natural sign today.** `spellingOf` returns `''`
for `accidental === 0`, so the glyph that Brandon flagged as the risky one is **not on the
critical path**. The two glyphs the app actually draws are ♯ and ♭.

| | Codepoint | Block | Coverage |
|---|---|---|---|
| `♯` | U+266F | Miscellaneous Symbols (BMP) | broad — system fonts on ChromeOS carry it |
| `♭` | U+266D | Miscellaneous Symbols (BMP) | broad — same |
| `♮` | U+266E | Miscellaneous Symbols (BMP) | broad — same, **and unused by §15** |
| `𝄪` | U+1D12A | Musical Symbols (**SMP**) | **narrow — this is the real gap, not ♮** |

**Decision, cheapest and easiest to undo:**

1. **`GLYPH` stays Unicode and stays as §15.2b already wrote it** for single accidentals —
   ♯ and ♭. This sidesteps the one genuinely narrow block (never `𝄪`/`𝄫`).
2. **One CSS variable, `--font-music`, declared in `ui/tokens.css`**, listing the system
   symbol stack ahead of the UI font. **Cheap option — zero bytes downloaded, and it is the
   one chosen.**
3. **Expensive option, documented and NOT taken:** bundle a subset `.woff2` of a music font
   (Bravura or similar). Hundreds of KB on a school Chromebook over school Wi-Fi, for glyphs
   the system already has. **To take it later: add one `@font-face` and prepend the family to
   `--font-music`. No JS changes.**
4. **Double accidentals — `[AMENDED 2026-08-24, second pass]`, superseding the doubled-glyph
   row above.** Brandon: *"use italic x for double sharps and italic bb for double flats,
   that's how those enharmonic work."* Not `♯♯`/`♭♭`, not `𝄪`/`𝄫` — proper notation:

```js
GLYPH       = { '-2':'<i>bb</i>', '-1':'♭', '0':'', '1':'♯', '2':'<i>x</i>' }   // default
GLYPH_ASCII = { '-2':'<i>bb</i>', '-1':'b', '0':'', '1':'<i>#</i>', '2':'<i>x</i>' }
// double flat and double sharp render the same in both tables — this is Brandon's
// notation choice, not a font-fallback question. Only the single ♯/♭ vs #/b differ.
```

**This also closes M-1's leftover** — the `tonic: 6` three-way composite `redpen-theory`
flagged. Whatever a spelling function was substituting a plain `A♯` for was a degree that
needed a *double* accidental under proper key spelling (e.g. `Fx` or `Gbb`), not a third
enharmonic letter name. §15.2b's `spellingOf` must clamp to the correct letter and apply
`GLYPH[±2]`, never fall through to a neighboring letter's single name. With that fixed, §6's
`'F♯/G♭'` composite stays two-way, always — **the three-way case does not exist.** §6's
"still open, still Brandon's" note is struck.

**OD-9's decider moves from "the S5 surface seats, together" to §15.** One table in
`theory/scale.js`, surfaces render what they are handed. That was already the intent of "one
table, not three"; this makes it structural.

### `[AMENDED 2026-08-24]` · A8 — Presets, and naming a scale (OD-11, OD-12)

**Brandon, on presets:** *"make presets that are easy to change later"*
**Brandon, on naming:** *"follow the rules for modes and variations on minor scales. Anything
else put 'scale unknown' and I'll go back and label them myself (directions on the easy
undo)"*

**§15.5's refusal to fill the preset list, and its refusal to back-match an altered array
against the preset list, are both SUPERSEDED.** Brandon named the families; §15 ships them.

```js
// theory/scale.js — PURE DATA. No logic anywhere reads a preset by name.
// Adding, removing, or renaming a preset is an edit to THIS OBJECT and nothing else.
PRESETS = {
  'Major':          [0, 2, 4, 5, 7, 9, 11],   // = Ionian. §7's saved default, D-1. CONFIRMED.
  'Dorian':         [0, 2, 3, 5, 7, 9, 10],   // named in §4's own type
  'Phrygian':       [0, 1, 3, 5, 7, 8, 10],
  'Lydian':         [0, 2, 4, 6, 7, 9, 11],
  'Mixolydian':     [0, 2, 4, 5, 7, 9, 10],
  'Aeolian':        [0, 2, 3, 5, 7, 8, 10],   // = natural minor
  'Locrian':        [0, 1, 3, 5, 6, 8, 10],
  'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
  'Melodic Minor':  [0, 2, 3, 5, 7, 9, 11],
}

// Recognised for LABELLING ONLY — never drawn in the picker. Ships EMPTY, on purpose.
EXTRA_NAMES = { }
```

**The mechanism, stated because Brandon asked for it by name:** the preset picker renders
`Object.keys(PRESETS)`. Nothing else enumerates them, nothing switches on a name, and no
seat may write `if (preset === 'Dorian')`. **Changing the list later is a data edit, not a
logic change.**

#### `scaleName()` — modes get their real name, everything else says `'scale unknown'`

```js
scaleName(scale):
  for (const [name, d] of [...Object.entries(PRESETS), ...Object.entries(EXTRA_NAMES)])
    if (d.every((v, i) => v === scale.degrees[i])) return name
  return 'scale unknown'            // Brandon's literal string. Not 'Custom', not invented.

state.scale.name = scaleName(scale)      // §4: "display label, updated when degrees change"
```

- **Back-matching is on `degrees` only, so it is key-independent.** A student who bends C
  major into `[0,2,3,5,7,9,10]` by hand is told **"Dorian"**, and so is a student who does it
  from F. **`name` still carries no key** — §7's own `"name": "Major"` beside `"tonic": 0`.
  CONFIRMED, unchanged.
- **`state.scale.preset` is NOT touched by this and frozen §4 still governs it.** `preset`
  becomes `'Custom'` the moment any degree moves — that is §4 and this seat cannot and does
  not change it. **`preset` is provenance (which button was pressed); `name` is the display
  label (what the shape actually is).** They can legitimately read `'Custom'` and `'Dorian'`
  at the same time, and that is the correct behaviour, not a bug for a later seat to "fix".
- **`originDegrees(scale)` (§15.5) resolves for nine names instead of one.** ~~reads
  `PRESETS[scale.name]`~~ — **CORRECTED 2026-08-24 16:19 EDT, F2: it reads
  `PRESETS[scale.originName] ?? MAJOR`.** Reading `name` here was the defect `redpen-theory`
  logged as **M-2**: this very bullet made `name` chase `degrees`, which made the origin chase
  the array it is measured against and turned `resetScaleDegree` into a silent no-op. See
  [F2](#amended-2026-08-24-1619-edt--f2--resetscaledegree-gets-the-student-back-fixes-m-2).

#### ▶ THE EASY UNDO — how a later pass replaces `'scale unknown'` with a real name

**This is the procedure Brandon asked for by name. It is two lines of data and nothing else.**

1. Get the exact 7-entry array off the screen — the project file's `"degrees"` (§7), or
   `state.scale.degrees`. Example: `[0, 2, 4, 6, 8, 10, 11]`.
2. Open **`src/theory/scale.js`**. Find `PRESETS` (a preset **with** a picker button) or
   `EXTRA_NAMES` (a name **without** a picker button).
3. Add one row: `'Acoustic': [0, 2, 4, 6, 7, 9, 10],`
4. **Done. Nothing else changes.** `scaleName()` back-matches on the next render, the label
   stops reading `'scale unknown'`, and — if the row went into `PRESETS` — the picker grows a
   button and `setScalePreset('Acoustic')` works.

**What depends on this and must NOT be edited to make it work:** `degreeQuality`,
`degreeColor`, `numeralOf`, `skipStack`, `circlePositions`, `noteBank`, §7's file schema.
**None of them knows a preset name exists.** If a change to any of those looks necessary to
add a scale name, the change is wrong — stop and re-read this block.

### `[AMENDED 2026-08-24]` · A9 — Quality markers are **superscript**, always (OD-13, OD-7)

**Brandon:** *"I never mentioned augmented or diminished but have them use the superscript +
and either the already superscript circle or superscript a lowercase o (I imagine that all
of the chord qualities will need to be superscript to the chord label)"*

**And, confirming the derivation §15.8 carried:** *"yes, and if the system is drawn correctly
(including the ability to go back and change things, flexibility is key here), everything
else will have proper logic to understand and follow (easy to change later)"*

**§15.8's case derivation is RATIFIED. It is CONFIRMED, no longer DERIVED.** Case comes from
the chord's third, computed from `degreeQuality` — augmented takes **upper**, diminished
takes **lower**, and there is **no per-key lookup table**. Brandon's second quote is the
ruling on the mechanism: derive it, keep it flexible.

**GENERAL RULE FOR §15.6 AND §15.8, CONFIRMED:** *every chord-quality marker and every
extension digit is **superscript** to the chord label. Never inline.* This binds the numeral
label and the letter label equally.

| | Value | Status |
|---|---|---|
| `SUFFIX['major']` | `''` | CONFIRMED — case alone carries it |
| `SUFFIX['minor']` | `''` | CONFIRMED — same |
| `SUFFIX['augmented']` | **`'+'`** | **CONFIRMED — Brandon, "superscript +"** |
| `SUFFIX['diminished']` | **`'°'`** (U+00B0) | **CONFIRMED — Brandon, "the already superscript circle"** |
| `SUFFIX['altered']` | **`'?'`** | easiest-to-undo call — see below |
| `applyCase('altered')` | **UPPER** | easiest-to-undo call — see below |

- **`°` over `o`, and why:** U+00B0 is **Latin-1**. Every font on every machine has it, which
  is the same coverage argument A7 just made about ♯ and ♭ — the cheapest possible glyph.
  Brandon offered both; this picks the one with no font risk. **To swap: change `'°'` to
  `'o'` in `SUFFIX`. One character.** Note that `°` already sits high and is then placed in
  the superscript span like everything else — if it reads as floating, that swap is the fix.
- **`'altered'` — this seat's call, flagged.** Brandon did not rule it, and a stack with no
  third has nothing to carry a case. Ships as the **stored upper-case roman** (so `applyCase`
  is the identity function — no transform to undo) with a **superscript `?`**. Honest, one
  character, and it mirrors Brandon's own `'scale unknown'` device for the scale side.
  **What I would have asked instead:** whether an unrecognisable stack should print the word
  "chord unknown" beside the numeral, the way a scale prints "scale unknown".
  **To change:** `SUFFIX['altered']` in `theory/chord.js`; nothing reads it but `numeralOf`.

#### Rendering — an additive function, so nothing downstream breaks

```js
// theory/chord.js
numeralOf(scale, root, count)      // → 'vii°7'  — UNCHANGED type. Tests, exports, tooltips.
numeralParts(scale, root, count)   // → { base: 'vii', sup: '°7' }   ← surfaces MUST use this
```

**Every surface that draws a chord label uses `numeralParts` and renders `sup` in a
superscript element.** `numeralOf` keeps returning the flat string for anything that is not
being drawn, so no existing consumer of it changes. The same split applies to the letter
label (A10).

### `[AMENDED 2026-08-24]` · A10 — No inversion labels. Slash notation. (OD-15)

**Brandon:** *"no inversion labels, on the chord builder itself have them labeled as if the
lowest note was the bass (III/M6, D/F#, etc)"*

**§15.9's inversion-label language is SUPERSEDED. There is no "1st inversion", no "2nd
inversion", no inversion number anywhere a student can see it.**

**`invert(v, n)` survives unchanged — Brandon banned the LABEL, not the operation.** It is
what rearranges the voicing; it just never names itself. Its doc language in §15.9 is
restated as "rotate the bass up `n` times", not "the nth inversion".

```js
// theory/chord.js
bassOf(v) = Math.min(...v)

chordLabel(scale, root, v, count, system)      // system: 'numeral' | 'letter'
  head   = system === 'letter' ? chordName(scale, root, count)   // ⚠ CORRECTED F1 — this
                               : numeralOf(scale, root, count)   //   read `letterHead`,
                                                                 //   which was never defined
  bassPc = bassOf(v) % 12
  rootPc = pitchClassOf(scale, root)
  if (bassPc === rootPc) return head                          // root in the bass → no slash
  return head + '/' + bassText(scale, root, bassPc, system)

chordLabelParts(...)  → { base, sup, slash }    // superscript split, per A9
```

| system | head | bass reads as | example |
|---|---|---|---|
| `'letter'` | the chord's letter name | **the bass note's letter spelling** | **`D/F♯`** — Brandon's own |
| `'numeral'` | the roman numeral | **the interval from the chord's root to the bass** | **`III/M6`** — Brandon's own |

```js
INTERVAL_NAME = ['P1','m2','M2','m3','M3','P4','d5','P5','m6','M6','m7','M7']  // by semitone
bassText(scale, root, bassPc, system) =
  system === 'letter' ? spellingOfPc(scale, bassPc).text
                      : INTERVAL_NAME[(bassPc - rootPc + 12) % 12]
```

> **⚠ CORRECTED 2026-08-24 16:19 EDT — `letterHead` and `spellingOfPc` were called above and
> never defined, and minor chords would have lost their `m` (M-15).** The name is
> **`chordName`** (§15.6's boundary table already said so; `letterHead` is struck), the letter
> system gets its own `LETTER_SUFFIX` with `minor: 'm'`, and `spellingOfPc` is defined in
> §15.2. **Binding text:
> [F1](#amended-2026-08-24-1619-edt--f1--the-letter-label-is-specified-fixes-m-15).**

- **The letter form is the settled one.** `D/F♯` is Brandon's example, and the curriculum's
  own skills list already writes `Loop F ~> C/E ~> Dm/F ~> Bb/F`. **CONFIRMED.**
- **The numeral form is this seat's reading of `III/M6`, and it is flagged.** `M6` is an
  interval name, and interval-above-the-root is the only reading under which `III/M6` is
  well-formed — it is a `III` chord with the 13th in the bass, which this app can build
  (`count` reaches 7, §15.6). **What I would have asked instead:** whether `M6` means the
  interval above the chord root, the interval above the tonic, or the scale degree in the
  bass. **To change:** `bassText`'s numeral branch, one expression, in `theory/chord.js`.
- **`d5` for six semitones** is this seat's cell, not Brandon's — it is the only spelling
  that occurs in a tertian stack (the diminished triad's fifth). **To change:** one cell of
  `INTERVAL_NAME`.
- **Named comping patterns ("drop 2", "open", "shell") are still NOT in §15**, unchanged —
  nobody asked for them and §10 forbids inventing an interface. `spread()` carries them all.

### `[AMENDED 2026-08-24]` · A11 — The remaining opens, under Brandon's standing instruction

**Brandon:** *"for any other blockers, have the agents take the easiest route to undo and
list the decisions they would have recommended later as well as instructions to make it easy
for other agents to make the changes."*

Each row below is **shipped**, **reversible**, and carries what this seat would have asked
instead. Full text in the amended OPEN DECISIONS list at the end of §15.

| OD | Shipped, because it is the easiest to reverse | Would have asked | Change it at |
|---|---|---|---|
| **OD-2** · `letter` for a pitch not in the key | **Spell by the key signature's direction** — flats in a flat key, sharps in a sharp key; **both faces in `tonic: 6`**, per A1. Reuses A1's rule, adds no new principle. | Whether an out-of-key row should show a letter at all, or stay blank like `number` and `solfege`. | `chromaticSpelling(scale, pc)` in `theory/scale.js` — one function, called only by `label()`'s `'letter'` branch |
| **OD-8** · the `setScaleDegree` clamp | **±2 semitones from the degree's `MAJOR` value.** Not arbitrary: past ±2 there is **no spelling** (§15.2b returns `text: null`) and **no solfège mark** (A2 falls through to `'*'`). The clamp is exactly the range the labels can describe. | Whether a degree may cross its neighbour — that part is Brandon's, not engineering. | `DEGREE_CLAMP = 2` in `theory/scale.js`; enforced by `scale-engine` (P3/S3), which still owns the enforcement |
| **OD-10** · does picking a key reset to major? | **Transpose** — `setScaleTonic(pc)` touches `tonic` and nothing else. This is what `degrees`-as-offsets already does, so shipping it is **zero new code**, which makes it the cheapest thing to reverse. | D-1's wording ("the scale degrees that are generated follow the major scale pattern") reads as *reset*. Two different products. | To switch to reset: add `degrees = [...MAJOR]; altered.fill(false)` inside `setScaleTonic`. One statement, one function |
| **OD-14** · case on numeral input | **Ignored** — `parseNumeral('iv')` and `parseNumeral('IV')` both give `{root: 3}`. Zero code, and the outline has the student *pick* a degree while the app *tells* them the case. | Whether borrowed chords exist at all. They appear nowhere in the curriculum and `degrees` cannot express one. | `parseNumeral` in `theory/chord.js` — to honour case, return a `borrowed` flag and give `numeralOf` a branch |

---

> ## `[AMENDED 2026-08-24 16:19 EDT]` — FIX BLOCK · three defects, found by `redpen-theory`
>
> Written by `spec-scale` (P3/S1) on **Brandon's authorisation, same day**, against
> [`redpen-theory`'s report](P3-harmony-tool/S2-theory-check/theory-report.md) (P3/S2), which
> passed the phase and listed sixteen mismatches. **Exactly three are fixed here — F1
> (M-15), F2 (M-2), F3 (M-16)** — and each was fixed **only because a contract already on
> record compelled the answer.** The condition Brandon set was that no fix may be a new
> decision. Each entry below names the contract that forces it.
>
> **The other thirteen mismatches are UNTOUCHED and still open**, including M-1, M-9 and M-14,
> which contradict frozen sections and are Brandon's alone to close. Nothing `redpen-theory`
> passed — the colour rule, the numeral-case rule — was reopened.
>
> **This block supersedes the body of §15 and the A1–A11 blocks wherever they disagree.
> §1–§14 are still untouched, and no new §7 field is created.**

### `[AMENDED 2026-08-24 16:19 EDT]` · F1 — The letter label is specified (fixes **M-15**)

**The defect:** `letterHead`, `spellingOfPc` and `chordName` were **called or listed and never
defined** (A10's `chordLabel`, A10's `bassText`, §15.6's module-boundary table). Worse,
`SUFFIX['minor'] = ''` — correct for numerals, where **case** carries minor — would have
printed Brandon's own worked example **`Dm/F` as `D/F`**, because letters have no case.

**Why the fix is compelled, not chosen:** Brandon ruled the letter system in, by name and with
his own examples, in [A10](#amended-2026-08-24--a10--no-inversion-labels-slash-notation-od-15)
— *"on the chord builder itself have them labeled as if the lowest note was the bass (III/M6,
**D/F#**, etc)"* — and the curriculum's own skills list writes `Loop F ~> C/E ~> **Dm/F** ~>
Bb/F`. **Deferring the letter system to P4 would contradict a standing Brandon ruling**, so
the only available fix is to specify it. Every piece below is composed from functions §15
already defines; **no new spelling algorithm and no new naming principle is introduced.**

#### One name, not two — `letterHead` is struck

§15.6's module-boundary table already named this function **`chordName`**; A10 invented a
second name for the same thing at its call site. **`chordName` is the name. `letterHead` is
struck everywhere and is not an alias.** A10's `chordLabel` is corrected below.

#### `LETTER_SUFFIX` — the letter system's own suffix table

```js
// theory/chord.js — SEPARATE FROM `SUFFIX`. `SUFFIX` is the NUMERAL table and is unchanged.
LETTER_SUFFIX = { major:      '',      // 'D'   — nothing to add
                  minor:      'm',     // 'Dm'  — ← THE FIX. Case cannot carry it here.
                  augmented:  '+',     // 'D+'  — same glyph as SUFFIX, A9
                  diminished: '°',     // 'D°'  — same glyph as SUFFIX, A9 (U+00B0)
                  altered:    '?' }    // 'D?'  — same mark as SUFFIX, A9
```

- **Only the `minor` row differs from `SUFFIX`.** The other four glyphs are
  [A9](#amended-2026-08-24--a9--quality-markers-are-superscript-always-od-13-od-7)'s, reused
  verbatim, because A9's ruling was about **the marker**, not about which system draws it.
- **`SUFFIX['minor'] = ''` is still CORRECT and is not edited.** In the numeral system the
  case *is* the marker (`iv`); in the letter system there is no case to carry it. **Two
  tables because there are two systems — a builder must not merge them.**
- **To change any glyph:** one cell, in one object, in `theory/chord.js`.

#### The three functions, defined

```js
// theory/scale.js — spelling lives on the scale side (§15.6's boundary rule)
spellingOfPc(scale, pc) =                     // → {letter, accidental, text} — same shape
  degreeIndexOf(scale, pc) >= 0                //   as spellingOf, always
    ? spellingOf(scale, degreeIndexOf(scale, pc))       // in key   — §15.2b · A1
    : chromaticSpelling(scale, pc)                      // out of key — A11 (OD-2)

// theory/chord.js
chordName(scale, root, count = 3) =           // → 'D' 'Dm' 'F♯°7' — the LETTER twin of numeralOf
  spellingOf(scale, root).text
  + LETTER_SUFFIX[degreeQuality(scale, root)]           // §15.4 — the colour rule, again
  + EXT[count]                                          // A6 — shared with the numeral system

chordNameParts(scale, root, count = 3) =      // → { base:'F♯', sup:'°7' }  ← DRAWING surfaces
  { base: spellingOf(scale, root).text,
    sup:  LETTER_SUFFIX[degreeQuality(scale, root)] + EXT[count] }
```

- **`spellingOfPc` invents nothing.** Both branches are functions §15 already ships; it is the
  two-line composition that was missing. `root` is a **degree index**, so `chordName` reads
  the chord's letter through `spellingOf` — the same path the circle already uses.
- **The quality comes from `degreeQuality`, exactly as `numeralOf`'s does.** The letter label
  and the numeral label and the colour on the circle are **the same computation read three
  times** and can never disagree. §15.8's hard requirement holds unchanged.
- **`m` is SUPERSCRIPT, and that is A9, not a call by this seat.** A9: *"every chord-quality
  marker … is superscript to the chord label. Never inline. This binds the numeral label and
  the letter label equally."* `m` is a quality marker, so it sits in `sup`. **A surface that
  draws a letter chord label MUST use `chordNameParts`**, the same rule §15.8 already puts on
  `numeralParts`.
- **`EXT` is shared, not copied** — A6 closed the top end for chord labels generally.

> **⚠ NARROWED BY [F4](#amended-2026-08-24-1745-edt--f4--seventh-chord-letter-names-six-qualities-closes-the-letter-naming-collision-chord-engine-escalated), 17:45 EDT.** At `count === 4`, `chordName`/`chordNameParts` no
> longer print a bare `LETTER_SUFFIX + '7'` — they print one of Brandon's six named 7th-chord
> qualities via `SEVENTH_NAME`. The formula above still holds exactly as written for every
> other count (3, 5, 6, 7). See F4.

#### A10's `chordLabel`, corrected

```js
// theory/chord.js — SUPERSEDES the code block in A10
chordLabel(scale, root, v, count, system)      // system: 'numeral' | 'letter'
  head   = system === 'letter' ? chordName(scale, root, count)      // ← was `letterHead`
                               : numeralOf(scale, root, count)
  bassPc = bassOf(v) % 12
  rootPc = pitchClassOf(scale, root)
  if (bassPc === rootPc) return head                          // root in the bass → no slash
  return head + '/' + bassText(scale, root, bassPc, system)

bassText(scale, root, bassPc, system) =
  system === 'letter' ? spellingOfPc(scale, bassPc).text      // ← now defined, above
                      : INTERVAL_NAME[(bassPc - rootPc + 12) % 12]

chordLabelParts(scale, root, v, count, system) → { base, sup, slash }
  // base/sup come from chordNameParts (letter) or numeralParts (numeral); `slash` is the
  // bass text, or null when the root is in the bass. A9's superscript rule, both systems.
```

**Brandon's own two examples now print:** `Dm/F` (letter, D minor triad with F in the bass —
`base:'D'`, `sup:'m'`, `slash:'F'`) and `III/M6` (numeral, unchanged).

#### ⚠ ONE OPEN INTERACTION, ESCALATED AND NOT DECIDED

In **`tonic: 6` only**, [A1](#amended-2026-08-24--a1--spelling-key-signature-or-both-faces-od-1-od-1a)'s
enharmonic tie makes `spellingOf(...).text` a **composite face** (`'F♯/G♭'`), so a slash label
in that one key reads `F♯/G♭/A♯` — a string with two different meanings for `/`. **This seat
does not resolve it, because it is the same composite-label question `redpen-theory` raised as
M-1 against frozen §6, and §6 is Brandon's.** Whatever closes M-1 closes this. **§10-H:
recorded, escalated, not decided.**

### `[AMENDED 2026-08-24 17:45 EDT]` · F4 — Seventh-chord letter names, six qualities (closes the letter-naming collision `chord-engine` escalated)

**The defect F1 shipped with:** `chordName`'s letter suffix was `LETTER_SUFFIX[quality] +
EXT[count]` — triad quality plus a bare `'7'` marking "4 notes stacked," nothing else. Real
chord-symbol convention distinguishes six 7th-chord qualities by name (`Dmaj7` ≠ `D7`), and
`C E G B` — a real major-7 shape — printed as `C7`, which in standard notation names a
*different* chord (dominant, `C E G B♭`). The numeral system was unaffected — `I7` is
scale-relative by definition (§15.7), not borrowed vocabulary — so this is a letter-only fix.

**Brandon's ruling, verbatim, 2026-08-24:**
```
P1-M3-P5-M7 = Dmaj7
P1-M3-P5-m7 = D7
P1-m3-P5-m7 = Dm7
P1-m3-P5-M7 = Dm(maj7)          — "maj7" superscript
P1-m3-d5-d7 = Ddim7
P1-m3-d5-m7 = Dm7b5
```
*"If we don't need all of those, then don't put them in, but I wanted to be exhaustive. I DO
WANT THEM DOCUMENTED IN THE EVENT I WANT TO PUT THEM IN LATER."* All six were proved
reachable from real scale data (brute force over every degree array `DEGREE_CLAMP` allows) —
none is theoretical, none is dead code.

**How it's computed — a second interval axis, not a chord-formula table:**
```js
// theory/chord.js
seventhQuality(scale, root) =                 // root-to-fourth-stacked-tone span mod 12
  span === 9  ? 'dim'                          //   9  → diminished 7th (bb7)
  span === 10 ? 'min'                          //   10 → minor 7th
  span === 11 ? 'maj'                          //   11 → major 7th
             : 'altered'                       //   anything else — same fallback discipline
                                                //   as degreeQuality's own 'altered' row

SEVENTH_NAME[triadQuality][seventhQuality] =   // Brandon's six strings, keyed by both axes
  major:      { maj: 'maj7', min: '7'   }
  minor:      { min: 'm7',   maj: 'm(maj7)' }
  diminished: { dim: 'dim7', min: 'm7b5' }
  // pairs Brandon did not name fall back to LETTER_SUFFIX + EXT ('C+7'), unchanged
```
This is a **label lookup on already-derived interval data** — `span` comes from the pitches
the scale actually produced, `tonic` is not an input, no key appears anywhere in the table.
It does not violate §15.7's ban on chord-formula tables any more than `LETTER_SUFFIX` itself
does; both read a computed quality and print a string for it.

- **Superscript per A9, unchanged rule.** `chordNameParts` puts the whole suffix in `sup` —
  `{base:'D', sup:'m(maj7)'}` — same discipline as F1, no new exception.
- **Count 5+ (`maj9`, etc.) is NOT covered.** Brandon's ruling was six 7th-chord qualities
  specifically; ninths and beyond still print the bare `EXT[count]` digit. A further ruling,
  not this one.
- **Numerals are NOT extended, and this was checked, not assumed.** Three of the six collide
  on the numeral side too — `I7` (classroom convention reads a *minor* 7th on a roman numeral
  7, the app means major), `vii°7` (app means half-diminished; classroom `vii°7` means fully
  diminished — the same error `B°7` was), `i7` in harmonic minor. `V7` and `ii7` are clean.
  Extending numerals needs vocabulary Brandon hasn't given (`viiø7` vs `vii7b5`, `Imaj7` vs
  `IM7`) — a further naming decision, not a code gap. `seventhQuality` is exported and ready
  for it.
- **To change any string:** one cell, in `SEVENTH_NAME`, in `theory/chord.js`.



**The defect:** [A8](#amended-2026-08-24--a8--presets-and-naming-a-scale-od-11-od-12) made
`state.scale.name` **chase `degrees`** (back-matching), and §15.5's `originDegrees` read
`PRESETS[scale.name]`. So the origin chased the very array it exists to be measured against:
a student on **Dorian** who raises the third lands on Mixolydian's array, `name` becomes
`'Mixolydian'`, `originDegrees` returns **the current degrees**, and `resetScaleDegree` is a
**silent no-op**. Phrygian→Aeolian is the same failure. On reload, `altered` computes all
`false` and the `+/-` loses its state.

**Why the fix is compelled, not chosen:** frozen **§4** put the requirement in words — *"A
student who has moved a degree needs to see **that they moved it** and **get back**."* Only
one of `redpen-theory`'s two options satisfies "get back"; reset-always-to-major returns the
student somewhere they never were. **`preset` cannot serve as the origin either**, because
frozen §4 pins it to `'Custom'` the moment any degree moves. So the origin needs a field of
its own.

#### `originName` — one new engine field, and it is not saved

```js
state.scale.originName      // string — the preset the CURRENT shape was last set from.
                            // Same class as `altered` and `preset`: session display state.
                            // NOT in §7. §7 is frozen and stays {tonic, degrees, name}.
```

**§4's three fields keep their §4 meanings exactly and none is edited.** `originName` is
**additive**, and it is the field §15.5 was already assuming existed — §15.5's own DERIVED row
says `preset` *"returns to the name it came from"*, which is impossible without remembering
that name. **The fix names the memory §15.5 already required.**

| Call | `originName` |
|---|---|
| `setScaleTonic(pc)` | **untouched** — transposing does not change what shape you are on (OD-10) |
| `setScalePreset(name)` | ← `name` — the one and only writer |
| `setScaleDegree(i, n)` | **untouched** — this is the whole point |
| `resetScaleDegree(i)` | **untouched** |
| on load from §7 | ← `scale.name` (A8's back-match). See the honest limit below. |

#### `originDegrees`, corrected

```js
// theory/scale.js — SUPERSEDES §15.5's version
originDegrees(scale) = PRESETS[scale.originName] ?? MAJOR

// unchanged, and now measures against a fixed target instead of a moving one:
altered[i] = scale.degrees[i] !== originDegrees(scale)[i]
```

`resetScaleDegree(i)` sets `degrees[i] ← originDegrees(scale)[i]`, `altered[i] = false`, and
`preset ← altered.some(Boolean) ? 'Custom' : scale.originName`. **The Dorian student gets
Dorian back. §4's "and get back" is satisfied.**

- **`name` still back-matches and A8 is NOT reversed.** `name` answers *"what shape is this?"*;
  `originName` answers *"what shape did you start from?"*; `preset` answers *"which button did
  you press?"* **Three questions, three fields.** Reading `name: 'Mixolydian'`,
  `originName: 'Dorian'`, `preset: 'Custom'` at once is correct and is not a bug to fix.
- **The honest limit, stated rather than hidden:** §7 is frozen and saves no origin, so a
  **reloaded** project takes `originName` from the back-matched `name` and its `+/-` history is
  gone — `altered` reloads all-`false`. That is the same limit §7 already imposes on `altered`
  and `preset`, and it is **not** a reason to touch §7. Within a session, reset works.
- **To undo:** delete `originName` and point `originDegrees` back at `scale.name`. One field,
  one expression.

### `[AMENDED 2026-08-24 16:19 EDT]` · F3 — §15.2's "never read" sentence is narrowed (fixes **M-16**)

**The defect:** §15.2 said `scale.altered` and `scale.preset` are *"never read by any function
in this section"*. **That is false three times over inside §15 itself** — `circlePositions()`
returns `scale.altered[...]` on every entry (§15.3), `originDegrees` reads a display field
(§15.5, and F2 above), and §15.5 **writes** `altered`. A BUILD seat that obeyed the sentence
literally would strip the `+/-` of its state.

**Why the fix is compelled, not chosen:** **§4 never said that.** §4's actual words are
*"`altered` and `preset` are display state derived alongside it, **never read by the audio
path**."* §15.2 overstated a frozen section. **This is a factual correction back to §4's own
wording — the narrowest possible edit, and no decision at all.** §15.2's body text is
corrected in place.

---

**This section is the whole contract for `theory/scale.js` and `theory/chord.js`.** Every
pitch label anywhere in the app, every shaded piano-roll row, every colored degree, every
chord the app can name, and P4's project header read from these two files. No surface and
no instrument computes any of it a second time — §4 and §6 already say so ("this rule is
computed in `theory/scale.js` and every surface reads it"; "labels come from
`theory/scale.js`. No surface builds its own label strings"). §15 is what those two
sentences point at.

### 15.0 · How to read the authority marks

**This seat has no opinion on music theory.** Every statement below carries one of three
marks, and a BUILD seat must treat them differently:

| Mark | Means | What a builder does |
|---|---|---|
| **CONFIRMED** | Stated by Brandon, or forced by a frozen CONTRACTS section. Cited inline. | Build it exactly. |
| **DERIVED** | A consequence of a CONFIRMED statement, with the derivation written out so it can be checked or overturned in one line. | Build it, and know it is overturnable. Each one is also in OPEN DECISIONS. |
| **⛔ BRANDON** | Not sourced anywhere in the docset. **No seat may pick a value.** | **Do not ship a guess.** Leave the named constant unset and the feature visibly incomplete. In OPEN DECISIONS. |

Sources this section cites, and the only ones it does: [outline](../../outline) ·
[qa-transcript.md](../../qa-transcript.md) · [buildmap.md](../../buildmap.md) ·
[open-decisions.md](P0-run-open/open-decisions.md) (Brandon's inline answers **D-1** …
**D-28**) · CONTRACTS §1–§14 · PHASE.md.

**§10-H governs every gap:** "a BUILD seat that finds itself picking a scale, a syllable, a
spelling, or a chord name has left its lane and must escalate." §15 marks those gaps ⛔
rather than filling them.

### 15.1 · Vocabulary, fixed once

| Term | Is | Range |
|---|---|---|
| **pitch class** (`pc`) | a note name with no octave. **C = 0** | 0–11, §4 |
| **tonic** | `state.scale.tonic`, the pc the scale starts on | 0–11, §4 |
| **degree offset** | `state.scale.degrees[i]`, semitones above the tonic | §4, **always 7 entries** |
| **degree index** (`i`) | 0-based array index into `degrees` | 0–6 |
| **degree number** | the digit a student says and sees | 1–8, §6 |
| **midi** | an absolute pitch, §2's `noteOn` note number | 0–127 |
| **voicing** | a list of **absolute midi pitches**, in sounding order | §15.9 |

`degreeNumber = degreeIndex + 1`, and the number **8** is degree index 0 drawn at the
octave — §6 frozen: "`number` = scale degree digits, 1 through 8 with 8 = Do at the
octave." **CONFIRMED.**

**Seven stored, eight shown.** §4's `[AMENDED 2026-08-24]` block is binding and §15
restates none of its reasoning: `degrees` is 7 entries, the skip method is mod 7, and the
eighth note is degree 1 an octave up — **not a new degree**. Every `mod 7` below is that
rule, not a coincidence. **CONFIRMED.**

**Tuning.** A440, 12-tone equal temperament — **D-21**, Brandon: "A440 / 12-TET, standard."
`scale.js` exports the single implementation `hz(midi) = 440 * 2 ** ((midi - 69) / 12)` so
no instrument writes its own. **This forces no rework on P1** — it is available, not
retroactive. **CONFIRMED (D-21).**

**Octave numbering: `midiOf(pc, octave) = 12 * (octave + 1) + pc`, so middle C (C4) is midi
60.** §7's example note is `60` and **D-21** says "standard". **Nothing a student reads
depends on this** — §6's `letter` overlay is "A-G with accidentals" and carries no octave
digit — so it is used only by the Chord Module's octave selector (**A47**).
**DERIVED (D-21, §7).**

### 15.2 · `theory/scale.js` — the scale API

Every function takes `scale` = `state.scale` (§4) and is **pure**: same input, same output,
no state of its own, no DOM, no audio. `scale.altered` and `scale.preset` (§4) are display
state and are **never read by the audio path** — §4's own words, and §4: "`degrees` remains
the single source of truth for sound and color."

> **⚠ CORRECTED 2026-08-24 16:19 EDT — see
> [F3](#amended-2026-08-24-1619-edt--f3--152s-never-read-sentence-is-narrowed-fixes-m-16).**
> This sentence used to read *"never read by any function in this section"*, which was false:
> **`circlePositions()` returns `scale.altered[i]` on every entry (§15.3), `originDegrees`
> reads display state (§15.5 · F2), and §15.5 writes `altered`.** Display state is read freely
> by the labelling and drawing functions here; the prohibition is on **the audio path**, and
> that is all §4 ever said.

```js
// ——— pitch ————————————————————————————————————————————————
pitchClassOf(scale, i)         // i = degree index 0-6  →  pc 0-11
pitchClasses(scale)            // → [pc × 7], in degree order
degreeIndexOf(scale, pitch)    // pc or midi → degree index 0-6, or -1 if not in key
isInKey(scale, pitch)          // pc or midi → bool
midiOf(pc, octave)             // → midi
hz(midi)                       // → Hz, A440 / 12-TET (D-21)

// ——— spelling ——————————————————————————————————————————————
keySpelling(tonic)             // → {letter, accidental, alt, tie} — AMENDED A1
spellingOf(scale, i)           // → {letter:'E', accidental:-1, text:'E♭'}
chromaticSpelling(scale, pc)   // → a letter for a pc NOT in the key — AMENDED A11 (OD-2)
spellingOfPc(scale, pc)        // → {letter, accidental, text} for ANY pc — AMENDED F1

// ——— labels, §6 ————————————————————————————————————————————
label(scale, pitch, overlay, opts)   // → the string a surface draws. opts = {position}
solfegeOf(scale, i)            // → 'Do' | 'Re' | … | 'Mi♭'   MOVABLE DO — AMENDED A2
solfegeDeviation(scale, i)     // → signed semitones off the MAJOR pattern — AMENDED A2
degreeNumberOf(scale, pitch, opts)   // → 1-8, or null if not in key
```

> **⚠ SUPERSEDED IN PART — see [`[AMENDED 2026-08-24]`](#amended-2026-08-24--brandon-ruled-od-1--od-15-read-this-before-the-body) at the head of §15.**
> `solfegeOf` was written for **fixed do (D-16)**. **D-16 is reversed — movable do.** A2 is
> the binding text. `keySpelling` gained `alt`/`tie` for the one enharmonic tie (A1), and
> `chromaticSpelling` is new (A11). **`spellingOfPc` is new
> ([F1](#amended-2026-08-24-1619-edt--f1--the-letter-label-is-specified-fixes-m-15))** — it
> was called by A10's `bassText` and never defined. Everything else in this list stands.

#### 15.2a · Pitch classes and in-key — CONFIRMED, §4

```js
pitchClassOf(scale, i) = (scale.tonic + scale.degrees[i]) % 12
pitchClasses(scale)    = [0..6].map(i => pitchClassOf(scale, i))

isInKey(scale, pitch)       = pitchClasses(scale).includes(pitch % 12)
degreeIndexOf(scale, pitch) = pitchClasses(scale).indexOf(pitch % 12)   // -1 if absent
```

`pitch` may be a pc or a midi number; `% 12` covers both, which is what lets the chromatic
piano roll ask about a real note and the circle ask about a pc through one function.

**One consequence a builder must handle and must not "fix":** a student who moves one
degree onto another with the `+/-` (§4's `setScaleDegree`) produces **two degree indices
sharing one pitch class**. `degreeIndexOf` then returns the **lower index** (`indexOf`
semantics) and `pitchClasses` contains a repeat. **This is correct and deliberate.**
Deduplicating, sorting, or rejecting the array would hide from the student exactly what
their own `+/-` press did, and §4 makes `degrees` the source of truth **in the order it is
stored**. §15.4 reports the same situation honestly rather than papering over it.

#### 15.2b · Spelling — "letters + sharp/flat", decided by the key signature

The outline's first clause is "The major scale as **letters+sharp/flat**", and **D-18** —
"F♯ or G♭ — what decides the spelling?" — Brandon: **"key signatuer"**. That one word does
real work, and this subsection spends it carefully.

**The rule, CONFIRMED (D-18 + outline):** *the seven degrees take the seven letter names in
order, one each, and the accidental is whatever makes each letter land on the right pitch
class.* That is what a key signature **is** — one accidental per staff position — and it is
why an altered degree **keeps its letter and changes its accidental** instead of becoming a
different letter.

```js
LETTERS     = ['C','D','E','F','G','A','B']
NATURAL_PC  = [ 0,  2,  4,  5,  7,  9,  11 ]

spellingOf(scale, i):
  base        = LETTERS.indexOf(keySpelling(scale.tonic).letter)
  letterIndex = (base + i) % 7                       // one letter per degree, in order
  natural     = NATURAL_PC[letterIndex]
  target      = pitchClassOf(scale, i)
  d           = (target - natural + 12) % 12
  accidental  = d > 6 ? d - 12 : d                   // signed
  → { letter: LETTERS[letterIndex], accidental,
      text: LETTERS[letterIndex] + GLYPH[accidental] }

GLYPH = { '-2':'♭♭', '-1':'♭', '0':'', '1':'♯', '2':'♯♯' }
```

- **`accidental` outside −2 … +2 has no spelling.** `spellingOf` returns
  `{letter, accidental, text: null}`. It is reachable only by pushing one degree more than
  two semitones off its letter — see **OD-8**, the `setScaleDegree` clamp, which is what
  should prevent it.
- **The glyph strings** (`♯♯` vs `𝄪`; Unicode `♯`/`♭` vs ASCII `#`/`b`) are display-only.
  **DERIVED** — see **OD-9**.

**Which letter the tonic gets — `keySpelling(tonic)`.** §4's twelve-key table lists **both**
faces of each black key ("F♯ / G♭") and says outright: "This table lists both faces of each
pitch class; **it does not rule on spelling**." D-18 does that ruling, and it rules **by key
signature**. A key signature holds at most seven accidentals and **never a double
accidental** — that constraint alone settles four of the five black keys:

| `tonic` | Sharp-side major key | Flat-side major key | Verdict |
|---|---|---|---|
| 0, 2, 4, 5, 7, 9, 11 | — | — | **C · D · E · F · G · A · B — CONFIRMED**, one valid spelling each |
| 1 | C♯ major, **7 sharps** — valid | D♭ major, **5 flats** — valid | **D♭ — CONFIRMED** by [A1](#amended-2026-08-24--a1--spelling-key-signature-or-both-faces-od-1-od-1a); fewer accidentals. *(was DERIVED, OD-1a)* |
| 3 | D♯ major, **9 sharps** — impossible | E♭ major, 3 flats | **E♭ — CONFIRMED**; the alternative is not a key signature |
| 6 | F♯ major, **6 sharps** — valid | G♭ major, **6 flats** — valid | **BOTH — CONFIRMED** by [A1](#amended-2026-08-24--a1--spelling-key-signature-or-both-faces-od-1-od-1a). An exact tie, so the scale is spelled twice and shown as `F♯/G♭`. *(was ⛔ OD-1)* |
| 8 | G♯ major, **8 sharps** — impossible | A♭ major, 4 flats | **A♭ — CONFIRMED** |
| 10 | A♯ major, **10 sharps** — impossible | B♭ major, 2 flats | **B♭ — CONFIRMED** |

> **⚠ SUPERSEDED — the paragraph that stood here said `keySpelling(6)` ships unset and that
> the `letter` overlay is unavailable in that key. It is not.** Brandon ruled 2026-08-24:
> *"enharmonics follow key signature or show both."* **All twelve keys are settled.**
> `tonic: 1` takes **D♭** on fewer accidentals; `tonic: 6` is the one exact tie and takes
> **both faces** — every degree in that key spells twice and reads `F♯/G♭`, `G♯/A♭`, … The
> `letter` overlay works in **all twelve keys**. Binding text and the `keySpelling` return
> shape: [**A1**](#amended-2026-08-24--a1--spelling-key-signature-or-both-faces-od-1-od-1a).

#### 15.2c · `label()` — the four §6 overlay modes

§6 is frozen: `surface.overlay = 'none' | 'letter' | 'number' | 'solfege'`. `label()` is the
only producer of those strings, for every pitch surface — the circle, the diatonic keys, the
chromatic piano roll, and the note bank.

| `overlay` | In key | Not in key |
|---|---|---|
| `'none'` | `''` | `''` |
| `'letter'` | `spellingOf(scale, i).text` — e.g. `'E♭'`, or `'F♯/G♭'` in the tie key ([A1](#amended-2026-08-24--a1--spelling-key-signature-or-both-faces-od-1-od-1a)) | `chromaticSpelling(scale, pc).text` — spelled in the key signature's direction. **[A11](#amended-2026-08-24--a11--the-remaining-opens-under-brandons-standing-instruction), OD-2 resolved** *(was ⛔)* |
| `'number'` | `String(i + 1)`, and **`'8'`** at an octave-closing position | `''` — **forced**: §6 says the number *is* the scale degree, and a pitch outside the scale has none |
| `'solfege'` | `solfegeOf(scale, i)` — **movable do, always speaks** ([A2](#amended-2026-08-24--a2--movable-do-d-16-is-reversed-od-3)) | `''` — **CONFIRMED, D-17**: "Do chromatic notes get solfege? **NO**" |

**`opts.position`** is the slot the surface is drawing — the circle's position (§15.3) or a
keyboard's key index. It exists for exactly one reason: **`'8'`**. §6 runs the digits "1
through 8 with 8 = Do at the octave", so the same pitch class is `'1'` at the bottom of an
octave and `'8'` at the top. That is a property of the **slot**, not of the pitch, so the
surface must say which slot it is asking about. With `opts.position` omitted, `label()`
returns `'1'`. **CONFIRMED (§6; outline "1/8 for Do").**

**M-10 RULED — Brandon, 2026-08-24: keep both, deliberately.** The circle draws `'1/8'`
(A4, `slotNumberLabel()`); every other surface — diatonic keys included — stays plain
digits from this `label()` function, `'8'` only at an octave-closing `opts.position`. Not
an oversight: the circle teaches the wrap, a keyboard's octave is a separate key.
**To undo — make it one producer everywhere:** drop `slotNumberLabel()`, have the circle
call `label(scale, i, 'number', { position })` like every other surface, and let this
function's own `opts.position` octave-close rule emit `'1/8'` generally (§6's amendment
scoping `'1/8'` to the circle would need reverting alongside it). One call site to delete,
one scoping note to revert — nothing in `scale.js`'s data model changes either way.

> # ⛔ STRUCK — the fixed-do block that stood here is DEAD TEXT. **D-16 IS REVERSED.**
>
> This subsection shipped `FIXED_DO = { C:'Do', D:'Re', … }` on **D-16, "FIXED FUCKING
> DO"**, and reported a collision with D-17 as **OD-3**. **Brandon reversed D-16 on
> 2026-08-24:** *"moveable DO, the key of the scale is always Do"* … *"Do is whatever the
> tonal center is. If the scale's tonal center is D, D is do."*
>
> **The `FIXED_DO` constant does not exist. No seat may build it.** The binding text is
> [**A2**](#amended-2026-08-24--a2--movable-do-d-16-is-reversed-od-3) at the head of §15.
> The collision this block reported **is void, not deferred** — movable do binds the
> syllable to the **degree index**, so all seven degrees speak in every key and the
> outline's "1/8 for Do" is literally true everywhere.

**Solfège is MOVABLE DO — Brandon, 2026-08-24, reversing D-16. See [A2](#amended-2026-08-24--a2--movable-do-d-16-is-reversed-od-3).**

```js
SOLFEGE = ['Do','Re','Mi','Fa','Sol','La','Ti']       // indexed by DEGREE, not by letter
MAJOR   = [0, 2, 4, 5, 7, 9, 11]                      // §15.5

solfegeDeviation(scale, i) = scale.degrees[i] - MAJOR[i]        // signed. 0 = plain.
solfegeOf(scale, i) = SOLFEGE[i] + (GLYPH[solfegeDeviation(scale, i)] ?? '*')
// D-17 still holds: a pitch that is NOT one of the seven degrees returns '' — see label().
```

The seven syllables are Brandon's own, verbatim, from **D-1**: *"Do, Re, Mi, Fa, Sol, La,
Ti, and DO."* — including **`Sol`** (not `So`) and **`Ti`** (not `Si`). **CONFIRMED.**
The mark on an off-major degree, and the reasoning for measuring it against `MAJOR` rather
than against the letter, are in [**A2**](#amended-2026-08-24--a2--movable-do-d-16-is-reversed-od-3).

**Correction, 2026-08-24 — this paragraph misstated ownership.** §13.3's rhythm label
function does not live in `theory/scale.js`. It lives in `surfaces/step-grid.js` as
`stepLabel`, placed there by the P2 seat before this section was written. §15 does not
touch, restate, or move it — that instruction stands, it just names the wrong file.
`scale.js`'s `label()` (this subsection) is the pitch overlay producer only; `stepLabel`
takes a step, not a pitch. Flagged by `scale-engine` (P3/S3); troubleshooter's call before
P3's piano roll needs both.

### 15.3 · The circle — what sits at each position

The outline's words: "**The major scale as letters+sharp/flat as a circular pattern
(labaled with digits, 1/8 for Do)**". This is Brandon's own teaching device and §15
describes it rather than designing it.

**What is on the circle: the scale, in scale order, ascending.** Position order is degree
order — Do, Re, Mi, Fa, Sol, La, Ti, Do. It is **not** a circle of fifths and not a
chromatic clock; the outline says "the major scale … as a circular pattern", and the thing
made circular is the scale. **DERIVED (outline).**

```js
circlePositions(scale, octave) → [ 8 entries ]

// entry at position p, 1-based:
{ position:      p,                                  // 1 … 8
  degreeIndex:   (p - 1) % 7,                        // 0 … 6 — mod 7, per §4
  octaveOffset:  Math.floor((p - 1) / 7),            // 0 for p 1-7, 1 for p 8
  pc:            pitchClassOf(scale, (p - 1) % 7),
  midi:          midiOf(scale.tonic, octave) + scale.degrees[(p-1) % 7]
                   + 12 * Math.floor((p - 1) / 7),
  isOctaveClose: p === 8,
  number:        slotNumberLabel(p),                 // '1/8' '2'…'7'  §6 + A4
  letter:        spellingOf(scale, (p-1) % 7).text,  // 'E♭'/'F♯/G♭'   §15.2b + A1
  solfege:       solfegeOf(scale, (p-1) % 7),        // MOVABLE DO     A2
  quality:       degreeQuality(scale, (p-1) % 7),    // §15.4
  colorToken:    degreeColor(scale, (p-1) % 7),      // §15.4, §9
  altered:       scale.altered[(p-1) % 7] }          // §4
```

**One call. `scale-circle` (P3/S5) draws what this returns and computes nothing itself** —
§4's "no surface computes its own colors" and §6's "no surface builds its own label
strings", enforced by giving the surface a finished row.

#### Position 8 — the whole answer to "how does it relate to position 1"

**Position 8 IS position 1.** Same degree index (`0`), same pitch class, same letter, same
syllable, same quality, same color. It differs in exactly two ways, and only two:

| | Position 1 | Position 8 |
|---|---|---|
| `number` label | `'1/8'` — [A4](#amended-2026-08-24--a4--the-circle-draws-seven-slots-od-4) *(was `'1'`)* | **not drawn** — merged into the Do slot |
| sounding pitch | tonic | tonic **+ 12 semitones** — still carried on `entries[7].midi` |
| everything else | — | **identical** |

> **⚠ AMENDED — the circle draws SEVEN slots, and the Do slot is labelled `'1/8'`.**
> Brandon, 2026-08-24: *"circle draws 7 slots, labels Do 1/8."* Entry 8 is still returned by
> `circlePositions()` — the shape below does not change — but it is **not a drawn position**.
> See [**A4**](#amended-2026-08-24--a4--the-circle-draws-seven-slots-od-4).

**CONFIRMED**, §4's `[AMENDED 2026-08-24]`: "The eighth note is the tonic an octave up —
pitch class 0 again, same syllable, same color. **It is degree 1 repeated, not a new
degree.**"

> **Position 8 carries NO `+/-` of its own. This is load-bearing and §4 says why.**
>
> §4 lists three things that break if an eighth entry is ever added to `degrees`, and the
> second is exactly this: "**`altered` is `[bool × 7]`.** An eighth slot hands the `+/-` UI
> a control that moves the octave off the tonic. Nothing musical happens; the scale breaks
> and no surface has a way to say so."
>
> So: position 8 renders **degree 1's** `altered` state, and its `+/-` either **is** degree
> 1's control or is absent. `setScaleDegree(7, …)` does not exist — the index is out of
> range and `scale-engine` must reject it. **CONFIRMED (§4).**

#### ✅ RESOLVED 2026-08-24 — what this section used to leave open

> **Both ⛔ items that stood here are ruled. `scale-circle` (P3/S5) is unblocked.**

- **Seven slots or eight — RESOLVED: SEVEN.** Brandon: *"circle draws 7 slots, labels Do
  1/8."* The Do slot carries both the `1` and the `8`; there is no eighth drawn position.
  `circlePositions()` still returns 8 entries and **the data shape above did not change** —
  entry 8 survives only to carry the octave pitch.
  **[A4](#amended-2026-08-24--a4--the-circle-draws-seven-slots-od-4). OD-4 closed.**
- **Orientation — RESOLVED: Do at 12 o'clock, top centre.** Brandon: *"Do is 12-o-clock, top
  center of circle."* Direction was not ruled; §15 ships **clockwise** as one flippable
  constant. **[A3](#amended-2026-08-24--a3--circle-orientation-od-5). OD-5 closed.**

#### Playing from the circle

The circle is a `Surface` (§12.1) with `static sourceId = 'circle'` (§5's enum already
carries it). Clicking position `p` emits `input.emitNoteOn({note: entry.midi, velocity:
0.8, source: 'circle'})` — `0.8` because §12.1 fixes it for any surface that cannot sense
velocity, and this section adds no new constant. **CONFIRMED (§5, §12.1).**

**AMENDED — position 8 is no longer drawn ([A4](#amended-2026-08-24--a4--the-circle-draws-seven-slots-od-4)), so the sentence that used to
stand here — "clicking position 8 sounds an octave above position 1" — no longer describes a
click anyone can make.** The merged Do slot emits `entries[0].midi`, the lower tonic. That is
an **easiest-to-undo call by this seat**, not Brandon's — he ruled the drawing, not the
click. The octave pitch is still on `entries[7].midi` for whatever wants it.

### 15.4 · The color rule — computed, never looked up

**This is Brandon's device and it is the reason `theory/scale.js` exists.** Outline: "I use
**color to show major and minor digits in the scale circle so that they don't have to
memorize diatonic chords with numerals**." PHASE.md: "This is Brandon's device. It is the
reason the color rule lives in `theory/scale.js` and every surface reads it."

> **A per-key lookup table of diatonic qualities is DRIFT, not an optimization.** It gives
> the right answer in twelve keys and the wrong answer the instant a student touches the
> `+/-` — which is the exact moment the device is supposed to be teaching. **The quality is
> computed from `degrees` every time.** §4 already confirmed it is computable from
> `degrees` alone.

#### The stack, then the two intervals

```js
// one note of a skip-method stack: k = 0, 2, 4, 6, …  (§15.6)
stackOffset(scale, i, k) =
  scale.degrees[(i + k) % 7] + 12 * Math.floor((i + k) / 7)     // mod 7, §4

// the triad on degree i — three notes, every other note in scale order
skipTriad(scale, i) = [ stackOffset(scale,i,0),
                        stackOffset(scale,i,2),
                        stackOffset(scale,i,4) ]

degreeQuality(scale, i):
  [a, b, c] = skipTriad(scale, i)
  return QUALITY[(b - a)][(c - b)] ?? 'altered'
```

| lower interval `b−a` | upper interval `c−b` | quality |
|---|---|---|
| 4 | 3 | **`'major'`** |
| 3 | 4 | **`'minor'`** |
| 3 | 3 | **`'diminished'`** |
| 4 | 4 | **`'augmented'`** |
| anything else | | **`'altered'`** |

**Five return values, exactly as the seat brief names them.** The first four are the four
tertian triads and nothing else is one. `'altered'` is not a fifth chord type — it is the
honest answer for a stack that **is not a triad at all**, which a student can produce in
two `+/-` presses (offsets `0, 2, 7`, say). Naming it `'altered'` rather than guessing a
chord name is the whole point: the circle can say *"you made something that is not one of
the four"* instead of lying.

**Three rules that go with it:**

1. **Nothing sorts the three offsets.** `stackOffset` walks the array **in stored order**
   (§15.2a). A student who pushes degree 3 below degree 2 gets a stack that does not
   ascend, `b − a` goes negative or zero, and the answer is `'altered'` — **correct**.
   Sorting first would rename a broken scale into a valid chord and hide what the student
   just did.
2. **The color rule always uses the TRIAD — three notes — however many tones are
   sounding.** §4: "a degree is colored by the quality of **the triad** built on it." The
   Chord Module may be playing a five-note upper overtone chord; the circle's colour does
   not change. **CONFIRMED (§4).**
3. **`tonic` is not an input.** Quality depends on `degrees` only; `tonic` rotates the
   result into pitch classes for display. §4 confirmed this and §15 does not re-derive it.
   **A transposed scale is the same colours.**

#### Colour tokens — §9, and the one gap in it

```js
degreeColor(scale, i) = QUALITY_TOKEN[degreeQuality(scale, i)]   // AMENDED A5 — one object
```

| quality | §9 token | Status |
|---|---|---|
| `'major'` | `--deg-major` | **CONFIRMED** — §9 names it; §4 "Major → warm" |
| `'minor'` | `--deg-minor` | **CONFIRMED** — §9 names it; §4 "minor → cool" |
| `'diminished'` | `--deg-dim` | **CONFIRMED** — §9 names it |
| `'augmented'` | `--deg-aug` | **RULED — M-14, Brandon, 2026-08-24: split it.** *(was `--deg-dim`, then A5/OD-6, then M-14 superseded that)* |
| `'altered'` | `--deg-altered` | **RULED — [A5](#amended-2026-08-24--a5--augmented-and-diminished-colours-od-6)**: `--deg-altered` means **the quality**, not "the student moved it". *(was DERIVED, OD-6)* |

**§9 now defines five degree tokens, matching §15's five qualities.** §9 was inside the
frozen §1–§10 and no seat could add a fifth token — only Brandon could. He did, 2026-08-24
(M-14): `--deg-aug` added, `QUALITY_TOKEN.augmented` repointed to it. It no longer shares
`--deg-dim`.

> ### ✅ RESOLVED 2026-08-24 — OD-6, and the word collision with it
>
> **Brandon:** *"augmented and diminished seem to have none, have the agents make a
> decision."* **This seat made it** — see
> [**A5**](#amended-2026-08-24--a5--augmented-and-diminished-colours-od-6) for the reasoning
> and the exact edit point. The ⛔ that stood here is closed.
>
> **The `--deg-altered` collision is resolved by keeping the two things apart.** The token
> means **(a)** *a degree whose stack is not a recognisable triad* — §15's
> `quality === 'altered'`. **(b)** *a degree the student moved off the preset* is **§4's
> `state.scale.altered[i]` boolean**, which `circlePositions()` already returns on every
> entry — so a surface marks "moved" from that flag and never from the colour. They are
> genuinely different degrees (in C with degree 3 lowered, degree 3 is `altered[2] === true`
> but its triad is a clean **augmented**), and now they are read from genuinely different
> fields. **No token is overloaded. §9 is not edited.**

#### C major, worked — the reference every downstream seat checks against

`tonic: 0`, `degrees: [0,2,4,5,7,9,11]` — §4's default, and §7's saved default.

| Degree | Skip triad (offsets) | `b−a`, `c−b` | Quality | Token | Numeral (§15.8) |
|---|---|---|---|---|---|
| 1 | 0, 4, 7 | 4, 3 | **major** | `--deg-major` | **I** |
| 2 | 2, 5, 9 | 3, 4 | **minor** | `--deg-minor` | **ii** |
| 3 | 4, 7, 11 | 3, 4 | **minor** | `--deg-minor` | **iii** |
| 4 | 5, 9, 12 | 4, 3 | **major** | `--deg-major` | **IV** |
| 5 | 7, 11, 14 | 4, 3 | **major** | `--deg-major` | **V** |
| 6 | 9, 12, 16 | 3, 4 | **minor** | `--deg-minor` | **vi** |
| 7 | 11, 14, 17 | 3, 3 | **diminished** | `--deg-dim` | **vii°** — `°` superscript, [A9](#amended-2026-08-24--a9--quality-markers-are-superscript-always-od-13-od-7) *(was "+ suffix (OD-7)")* |

**Solfège on this scale, under movable do ([A2](#amended-2026-08-24--a2--movable-do-d-16-is-reversed-od-3)):** `Do · Re · Mi · Fa · Sol · La · Ti`, and
`Do` again at the octave-closing position. `degrees` **is** `MAJOR`, so no degree carries a
mark. **This is the case fixed do got right and every other key got wrong.**

**Nothing in that table was typed in from memory of music theory — every row is the
formula run on `[0,2,4,5,7,9,11]`,** and the same formula on an altered array gives the
altered answer with no second code path. `test-p3` should assert this table exactly, and
`redpen-theory` should re-derive one row by hand.

### 15.5 · Twelve keys, presets, and the `+/-`

**The twelve are named in §4 and §15 does not restate the table.** One scale type — major —
on twelve chromatic roots (**D-1**, closed 2026-08-24). The generative constant:

```js
MAJOR = [0, 2, 4, 5, 7, 9, 11]      // W W H W W W H — §4: "It never varies with the key"
```

#### The four mutations, and what each one touches

§4 (frozen) already declares all four. §15 states only what §4 left to the engine.

| Call | `tonic` | `degrees` | `altered` | `preset` | `originName` — F2 |
|---|---|---|---|---|---|
| `setScaleTonic(pc)` | ← `pc` | **untouched** | untouched | untouched | untouched |
| `setScalePreset(name)` | untouched | ← all 7 from the preset | **cleared to all `false`** | ← `name` | ← `name` |
| `setScaleDegree(i, n)` | untouched | `degrees[i] += n` | `altered[i] = true` | ← `'Custom'` | **untouched** |
| `resetScaleDegree(i)` | untouched | `degrees[i]` ← origin value | `altered[i] = false` | ← see below | untouched |

**`originName` is added by
[F2](#amended-2026-08-24-1619-edt--f2--resetscaledegree-gets-the-student-back-fixes-m-2)** —
session state, not saved, additive to §4, and it is what makes `resetScaleDegree` work at all.

**`setScaleTonic` changes the key and nothing else — DERIVED.** `degrees` holds *offsets
from the tonic*, not pitch classes (§4), so moving `tonic` transposes the whole shape for
free, and §4 supplies no mechanism to reset it. A student who built something and then
wants to hear it from another root gets exactly that.
**But D-1's wording is "students pick the key from the 12 notes, and the scale degrees that
are generated follow the major scale pattern," which can be read as *picking a key resets
you to major*.** Those are different products and both readings are defensible from the
record. **OD-10 — ✅ SHIPPED AS TRANSPOSE, reversible.** Brandon's standing instruction
("take the easiest route to undo") applies; transpose is what the code already does, so it
is zero new code and the cheapest thing to reverse. Exact reversal instructions and what
this seat would have asked instead:
[**A11**](#amended-2026-08-24--a11--the-remaining-opens-under-brandons-standing-instruction).

**`preset` after `resetScaleDegree`:** when that call clears the last remaining `true` in
`altered`, `preset` returns to the name it came from — **which is `scale.originName`, the
field [F2](#amended-2026-08-24-1619-edt--f2--resetscaledegree-gets-the-student-back-fixes-m-2)
adds; this sentence already required that memory to exist and never named it.** While any
`altered[i]` is still `true`, `preset` stays `'Custom'`. **DERIVED** from §4's own pairing of
the two fields.

#### Where the "origin value" comes from — and why nothing needs a new §7 field

`resetScaleDegree(i)` must know what degree `i` *was*. §7 is frozen and saves only
`{tonic, degrees, name}` — **not `altered`, not `preset`.** Rather than ask for a schema
change, the engine reconstructs both:

> # ⚠ CORRECTED 2026-08-24 16:19 EDT — reading `scale.name` here was a DEFECT (**M-16→M-2**)
>
> **`originDegrees` must NOT read `scale.name`.**
> [A8](#amended-2026-08-24--a8--presets-and-naming-a-scale-od-11-od-12) made `name` chase
> `degrees`, so the origin chased the array it exists to be measured against and
> `resetScaleDegree` became a **silent no-op** wherever an altered scale back-matched another
> preset (Dorian→Mixolydian, Phrygian→Aeolian). That contradicts frozen §4's *"and get back."*
> **Binding text and the corrected code:
> [F2](#amended-2026-08-24-1619-edt--f2--resetscaledegree-gets-the-student-back-fixes-m-2).**

```js
originDegrees(scale) = PRESETS[scale.originName] ?? MAJOR   // CORRECTED — F2. Was scale.name.
// AMENDED A8: PRESETS resolves for nine names, not one.
// CORRECTED F2: the lookup key is `originName` — what the shape was last SET from — not
// `name`, which is a back-matched display label and moves whenever `degrees` moves.
// The ?? MAJOR fallback is reached only when originName names no preset.
// on load, or any time `altered` is unknown:
altered[i] = scale.degrees[i] !== originDegrees(scale)[i]
```

**The `?? MAJOR` fallback is not a shrug — it is D-1.** Every one of the twelve keys is
*generated* from the major pattern, so major is the origin of any scale whose named origin
was not saved. **CORRECTED — F2:** on **reload**, `originName` is seeded from the saved
`name`, so a reloaded project's `+/-` history is gone and `altered` computes all-`false`.
That is §7's frozen schema talking, not a bug in this rule, and it is the same limit §7
already imposes on `altered` and `preset`. **Within a session the origin is remembered and
reset gets the student back.** A project saved as `"name": "scale unknown"` reloads with the
`+/-` measuring against major, which is where the student started. **DERIVED (D-1, §4, §7).**
No frozen section changes,
and §7's round-trip rule still holds — `degrees` is what sounds, and `degrees` round-trips
exactly.

#### Which presets exist — ✅ RESOLVED 2026-08-24

> **⚠ SUPERSEDED — the ⛔ block that stood here left `PRESETS` empty and refused to fill
> §4's ellipsis.** Brandon ruled 2026-08-24: *"make presets that are easy to change later"*
> and *"follow the rules for modes and variations on minor scales."* That names the
> families, so §15 ships them. **The list, the exact arrays, and the mechanism that makes
> changing it a data edit rather than a logic change are in
> [A8](#amended-2026-08-24--a8--presets-and-naming-a-scale-od-11-od-12). OD-11 closed.**

The outline asks for "different ways to vary the scale (**modes, minor variations, etc**)"
and never listed them; §4's type is `'Major' | 'Dorian' | … | 'Custom'` — an ellipsis. **The
ellipsis is now filled: nine presets, six modes plus harmonic and melodic minor, in
[A8](#amended-2026-08-24--a8--presets-and-naming-a-scale-od-11-od-12).**

**Nothing in P3 ever blocked on this.** `MAJOR` alone satisfies §4, all twelve keys, the colour
rule, the skip method, every numeral, and the curriculum's "not required to memorize
scales" clause — because **the `+/-` reaches every one of those scales by hand whether or
not it has a button.** A preset is a shortcut; the curriculum's requirement is that a
student can "see and hear" the variation, and the `+/-` already delivers that.

#### Naming a scale a student invented — ✅ RESOLVED 2026-08-24

> # ⚠ SUPERSEDED — §15 used to refuse to name a student's scale. Brandon ordered it to.
>
> The block that stood here said the answer *"is: it doesn't — it is called `'Custom'`"*,
> and listed **not back-matching an altered array against the preset list** as something §15
> deliberately does not do. **Brandon reversed that on 2026-08-24:** *"follow the rules for
> modes and variations on minor scales. Anything else put 'scale unknown' and I'll go back
> and label them myself (directions on the easy undo)."*
>
> **`scaleName()` now back-matches.** A student who bends C major into `[0,2,3,5,7,9,10]` by
> ear is told **"Dorian"**. Anything the list does not recognise reads the literal string
> **`'scale unknown'`** — Brandon's words, not `'Custom'` and nothing invented.
> **Binding text, plus the step-by-step "easy undo" Brandon asked for by name:
> [A8](#amended-2026-08-24--a8--presets-and-naming-a-scale-od-11-od-12). OD-12 closed.**

```js
scaleName(scale)                      // → a PRESETS/EXTRA_NAMES key, or 'scale unknown' — A8
state.scale.name = scaleName(scale)   // §4's "display label, updated when degrees change"
```

`name` carries **no key** — §7's own example is `"name": "Major"` with `"tonic": 0` beside
it, so the key is already stored and is not repeated in the label. Back-matching runs on
`degrees` alone, which is what makes that true in all twelve keys. **CONFIRMED (§4, §7).**

**`state.scale.preset` is unaffected and frozen §4 still governs it** — it still becomes
`'Custom'` the moment a degree moves. `preset` is **provenance** (which button was pressed);
`name` is the **display label** (what the shape actually is). Reading `'Custom'` and
`'Dorian'` at the same time is correct, not a bug.

**One thing §15 still does not do:** invent a descriptive label such as `"C Major ♭3"`.
Brandon named the alternative himself — `'scale unknown'`, and he relabels it.

### 15.6 · The skip method, as a function

Outline, three consecutive clauses, and §15.6 is all three and nothing more:

> "**Skip method: every other note in scale order stacked together**"
> "A chord is built off the **root**"
> "basic chord is **3 notes**, anymore and they're **upper overtone chords**"

```js
// theory/chord.js
skipStack(scale, root, count = 3)          // root = degree index 0-6; count = 1 … 7
  → [ stackOffset(scale, root, 0),
      stackOffset(scale, root, 2),
      stackOffset(scale, root, 4),
      …  k = 2 * (count - 1) ]             // semitone offsets from the TONIC

isUpperOvertoneChord(count) = count > 3    // outline, verbatim
```

- **"Every other note in scale order" is `k += 2` over the degree array**, and "in scale
  order" is why the index walks `degrees` **in stored order** and wraps **mod 7** with
  `+12` per wrap — §15.4's `stackOffset`, the identical function the colour rule uses.
  **One implementation, two callers.** If they ever disagree, the circle's colour stops
  matching the chord the student hears, which is the one thing the device must never do.
- **"Built off the root" means the root is a scale degree**, not a free pitch. Every chord
  in this app is built on one of the seven. **CONFIRMED (outline).**
- **`count = 3` is the default and it is a curriculum requirement, not a convenience.**
  Outline: "They **do not LEARN** about 7th chords, but I do show them." PHASE.md: "Build
  them; **do not foreground them**." A four-tone chord must be something a student reaches
  for, never what they get by default. **CONFIRMED.**
- **`count` tops out at 7.** At `count = 8` the stack returns the root again an octave up
  (`k = 14`, `14 % 7 === 0`) and adds no new pitch class. Whether the UI exposes anything
  past 4 or 5 is the Chord Module's call (P3/S6), not this contract's.

#### "Upper overtone chord" is Brandon's term and it is the term the code uses

The phrase appears in the outline twice — once for chords over three notes, once as
"upper overtone chord **nomenclature**" for numerals (§15.8). **No seat substitutes
"seventh chord", "extended chord", or "tetrad" for it**, in a variable name, a label, or a
tooltip. **CONFIRMED (outline, PHASE.md).**

| `count` | Is | Contains, in scale numbers (§15.7) |
|---|---|---|
| 3 | **basic chord** | 1, 3, 5 |
| 4 | **upper overtone chord** | 1, 3, 5, 7 |
| 5 | **upper overtone chord** | 1, 3, 5, 7, 9 |
| 6 | upper overtone chord | 1, 3, 5, 7, 9, 11 |
| 7 | upper overtone chord | 1, 3, 5, 7, 9, 11, 13 |

**D-19 covers `count` 4 and 5 only** — Brandon's answer to "write out the upper-overtone
chord names" was **"major and minor 7-9 variations."** Rows 6 and 7 compute correctly and
**have no name Brandon has given**; see §15.8 and **OD-7**.

#### Module boundary — which file owns what

Stated once, because two BUILD seats (`scale-engine` P3/S3, `chord-engine` P3/S4) work in
parallel against this section and §1's lane rule is a STOP condition.

| `theory/scale.js` | `theory/chord.js` |
|---|---|
| `pitchClassOf` `pitchClasses` `isInKey` `degreeIndexOf` | `skipStack` `isUpperOvertoneChord` |
| `keySpelling` `spellingOf` `spellingOfPc` `chromaticSpelling` `solfegeOf` `label` `degreeNumberOf` | `rootScale` `chordToneScaleNumber` (§15.7) |
| `stackOffset` `skipTriad` `degreeQuality` `degreeColor` | `parseNumeral` `numeralOf` `numeralParts` `chordName` `chordNameParts` (§15.8) |
| `circlePositions` `midiOf` `hz` `MAJOR` `PRESETS` | `voicing` `invert` `spread` (§15.9) · `noteBank` (§15.10) |
| §13.3's rhythm `label(step, division)` — already there, untouched | — |

**`stackOffset` and `skipTriad` live in `scale.js`, not `chord.js`.** §4 puts the colour
rule in `scale.js` ("computed in `theory/scale.js` and every surface reads it") and the
colour rule needs the skip method — so the skip arithmetic must sit on the scale side, and
`chord.js` imports it. **`chord.js` depends on `scale.js`; `scale.js` never imports
`chord.js`.** One direction, no cycle.

### 15.7 · Chord numbering **is** scale numbering

Outline: "**Numbers refer to scale info** (the 7th of the chord, the 7th chord includes the
7th note of **that root's scale**)."

This is the clause most likely to be implemented as a table of chord formulas — `maj7 =
[0,4,7,11]`, `m7 = [0,3,7,10]` — and **a table is wrong here.** It is right in major and
wrong in every scale a student builds with the `+/-`, and it makes the numbers refer to
chord shapes instead of to scale information, which is the opposite of what the outline
says.

#### "That root's scale" — the rotation

```js
// the scale as it looks STARTING on degree `root`, in semitones above that root.
// n is 1-based and unbounded: n = 7 is the 7th note, n = 9 is the 2nd note an octave up.
rootScaleNote(scale, root, n) =
  stackOffset(scale, root, n - 1) - scale.degrees[root]

rootScale(scale, root) = [1..7].map(n => rootScaleNote(scale, root, n))
```

`rootScale` is the current scale rotated onto that degree — its mode. Nothing is looked up
and nothing is hard-coded: it reads `degrees` and rotates.

#### The identity that makes the outline's sentence true

```js
chordToneScaleNumber(j) = 2 * j + 1          // j = 0-based position in the stack
```

| stack position `j` | 0 | 1 | 2 | **3** | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| **scale number** | 1 | 3 | 5 | **7** | 9 | 11 | 13 |

**The proof is one line, and it is why this cannot drift.** `skipStack` builds tone `j`
with `k = 2j` (§15.6). `rootScaleNote` reaches scale number `n` with `k = n − 1`. Setting
`n − 1 = 2j` gives `n = 2j + 1`. So the **4th tone of a skip-method stack (`j = 3`) is by
construction the 7th note of that root's scale** — not by a table, not by a check, but
because both walk the same array with the same index.

```js
skipStack(scale, root, count)[j]  ===  rootScaleNote(scale, root, 2*j + 1) + degrees[root]
```

**This holds for every array `degrees` can ever hold** — major, a mode, a minor variant, or
something a student invented two `+/-` presses ago — because neither side of that identity
knows or cares which scale it is walking. **CONFIRMED (outline), and it is the reason §15
has no chord-formula table anywhere in it.**

#### Worked on an altered scale, because major proves nothing here

`tonic: 0` (C), `degrees: [0,2,3,5,7,9,11]` — C major with degree 3 lowered one semitone.
Take the chord on **degree 5** (`root = 4`, the pitch G):

| n | 1 | 2 | 3 | 4 | 5 | 6 | **7** |
|---|---|---|---|---|---|---|---|
| `stackOffset(scale, 4, n-1)` | 7 | 9 | 11 | 12 | 14 | 15 | **17** |
| minus `degrees[4]` = 7 | 0 | 2 | 4 | 5 | 7 | 8 | **10** |
| the note | G | A | B | C | D | E♭ | **F** |

**The 7th note of G's scale here is F**, so the four-tone chord on degree 5 is
**G · B · D · F**. In plain C major the same degree gives F♯ and a very different chord —
**and no line of code changed.** The `+/-` moved one number in an array and the seventh
followed it. That is the whole clause, working.

### 15.8 · Roman numerals — in, and out

Outline: "**Roman numerals refer to chords** (upper case for major, lower case for minor,
use upper overtone chord nomenclature for everything else)."

#### A numeral in → pitch classes out

```js
parseNumeral(str)  → { root }      // 'IV' | 'iv' | 'Iv' → { root: 3 }
ROMAN = ['I','II','III','IV','V','VI','VII']

numeralPitchClasses(scale, root, count = 3) =
  skipStack(scale, root, count).map(o => (scale.tonic + o) % 12)
```

**`parseNumeral` ignores case on the way in.** The outline's chord builder "lets them
**pick** the scale, **pick** the roman numeral" — the student chooses a degree, and the case
is something the app *tells* them, computed from the scale they are in. Accepting `iv` in C
major as a *request for* an F minor chord would be a borrowed chord, which appears nowhere
in the curriculum and which the `degrees` array cannot express. **✅ SHIPPED — OD-14**, under
Brandon's standing "easiest route to undo" instruction: ignoring case is zero code. Reversal
instructions in [A11](#amended-2026-08-24--a11--the-remaining-opens-under-brandons-standing-instruction).

**The root is a degree index, so `numeralPitchClasses` is just `skipStack` rotated by
`tonic`.** There is no numeral-to-interval table. **CONFIRMED (§15.6, §15.7).**

#### A numeral out — case, then suffix

```js
numeralOf(scale, root, count = 3):
  q = degreeQuality(scale, root)                      // §15.4 — the colour rule itself
  return applyCase(ROMAN[root], q) + SUFFIX[q] + EXT[count]
```

> **Case is computed from the colour rule. It is never looked up per key.**
> This is a hard requirement, not a style note: a per-key numeral table is correct in the
> twelve keys and wrong the moment a student presses `+/-`, and the `+/-` is the feature.
> `numeralOf` takes `degreeQuality`'s output as its input, so the numeral and the colour on
> the circle can never disagree — **they are the same computation read twice.**

**`applyCase` — and the one place §15 had to derive rather than cite:**

| Quality | Third (`b−a`) | Case | Status |
|---|---|---|---|
| `'major'` | 4 | **UPPER** — `IV` | **CONFIRMED** — outline, verbatim |
| `'minor'` | 3 | **lower** — `iv` | **CONFIRMED** — outline, verbatim |
| `'augmented'` | 4 | **UPPER** — `III` | **CONFIRMED — ratified by Brandon**, [A9](#amended-2026-08-24--a9--quality-markers-are-superscript-always-od-13-od-7) *(was DERIVED, OD-13)* |
| `'diminished'` | 3 | **lower** — `vii` | **CONFIRMED — ratified by Brandon**, [A9](#amended-2026-08-24--a9--quality-markers-are-superscript-always-od-13-od-7) *(was DERIVED, OD-13)* |
| `'altered'` | neither | **UPPER** — the stored form, untransformed | easiest-to-undo call, [A9](#amended-2026-08-24--a9--quality-markers-are-superscript-always-od-13-od-7) *(was ⛔)* |

> **✅ RESOLVED 2026-08-24 — the derivation below is RATIFIED, not overturned.** Brandon,
> asked whether the case/superscript system was fully specified: *"yes, and if the system is
> drawn correctly (including the ability to go back and change things, flexibility is key
> here), everything else will have proper logic to understand and follow (easy to change
> later)."* **Case-carried-by-the-third stands, and it is now CONFIRMED rather than DERIVED.
> No separate lookup table is needed or permitted. OD-13 closed.**

**The derivation, stated so Brandon can overturn it in one line:** the outline gives case
for major and minor and gives no case for anything else. The one thing that distinguishes
those two rows is **the chord's third** — 4 semitones in the row that is upper case, 3 in
the row that is lower case. Augmented shares major's third; diminished shares minor's.
**So the case is carried by the third**, which is (a) a strict generalisation of Brandon's
own two rows, (b) computed from the same two intervals the colour rule already computes,
and (c) requires this seat to hold no opinion about what a diminished chord "should" look
like. **A stack with no third — `'altered'` — has nothing to carry a case**, and it ships as the
stored upper-case form so that `applyCase` is the identity there and there is no transform
to unwind later ([A9](#amended-2026-08-24--a9--quality-markers-are-superscript-always-od-13-od-7)).

**`SUFFIX` and `EXT` — ✅ RULED 2026-08-24, and every marker is SUPERSCRIPT:**

> **⚠ SUPERSEDED — this table shipped four ⛔ cells and an empty suffix. It ships neither
> now.** Brandon: *"I never mentioned augmented or diminished but have them use the
> superscript + and either the already superscript circle or superscript a lowercase o (I
> imagine that all of the chord qualities will need to be superscript to the chord label)"*
> and *"no names needed past 9."* **OD-7 closed. Binding text:
> [A9](#amended-2026-08-24--a9--quality-markers-are-superscript-always-od-13-od-7) and
> [A6](#amended-2026-08-24--a6--no-extension-names-past-9-od-7-part).**

| | Value | Status |
|---|---|---|
| `SUFFIX['major']` | `''` | **CONFIRMED** — case alone carries it, outline |
| `SUFFIX['minor']` | `''` | **CONFIRMED** — same |
| `SUFFIX['diminished']` | **`'°'`** | **CONFIRMED — Brandon**, "the already superscript circle". `°` over `o` on font coverage — [A9](#amended-2026-08-24--a9--quality-markers-are-superscript-always-od-13-od-7) *(was ⛔)* |
| `SUFFIX['augmented']` | **`'+'`** | **CONFIRMED — Brandon**, "superscript +" *(was ⛔)* |
| `SUFFIX['altered']` | **`'?'`** | easiest-to-undo call by this seat, [A9](#amended-2026-08-24--a9--quality-markers-are-superscript-always-od-13-od-7) *(was ⛔)* |
| `EXT[3]` | `''` | **CONFIRMED** — a basic chord is three notes, outline |
| `EXT[4]` | `'7'` | **DERIVED — D-19**: "major and minor **7**-9 variations" |
| `EXT[5]` | `'9'` | **DERIVED — D-19**: "major and minor 7-**9** variations" |
| `EXT[6]`, `EXT[7]` | **`''`** | **CONFIRMED — Brandon**, "no names needed past 9" *(was ⛔)* |

**"Everything else" is answered.** D-19's "major and minor 7-9 variations" names the
*extensions*; Brandon's 2026-08-24 ruling names the *qualities* (`+`, `°`) and closes the
top end (`''` past 9). Case and suffix remain two independent computations — the case comes
from the third, the suffix from the quality — and both now have every cell filled.

> ### RENDERING RULE — CONFIRMED, and it binds every surface
>
> **Every quality marker and every extension digit is SUPERSCRIPT to the chord label. Never
> inline.** Brandon: *"I imagine that all of the chord qualities will need to be superscript
> to the chord label."*
>
> ```js
> numeralOf(scale, root, count)      // → 'vii°7'  — flat string. Tests, exports, tooltips.
> numeralParts(scale, root, count)   // → { base:'vii', sup:'°7' }   ← every DRAWING surface
> ```
>
> `numeralOf`'s return type did not change, so nothing downstream breaks; `numeralParts` is
> additive. A surface that draws a numeral **must** use `numeralParts`.
> [A9](#amended-2026-08-24--a9--quality-markers-are-superscript-always-od-13-od-7).

#### The letter label — `chordName`, and its OWN suffix table · **ADDED 2026-08-24 16:19 EDT (F1)**

**§15.8 shipped only the numeral half.** `chordName` was listed in §15.6's boundary table and
never defined, and `SUFFIX['minor'] = ''` — right for numerals, where case carries minor —
would have printed Brandon's own `Dm/F` as **`D/F`**. `redpen-theory` logged it as **M-15**.
**Binding text:
[F1](#amended-2026-08-24-1619-edt--f1--the-letter-label-is-specified-fixes-m-15).**

```js
// theory/chord.js
LETTER_SUFFIX = { major:'', minor:'m', augmented:'+', diminished:'°', altered:'?' }   // F1

chordName(scale, root, count = 3)       // → 'D' 'Dm' 'F♯°7'  — flat string, twin of numeralOf
  = spellingOf(scale, root).text + LETTER_SUFFIX[degreeQuality(scale, root)] + EXT[count]

chordNameParts(scale, root, count = 3)  // → { base:'F♯', sup:'°7' }  ← every DRAWING surface
```

| | `SUFFIX` — numerals | `LETTER_SUFFIX` — letters |
|---|---|---|
| `major` | `''` | `''` |
| `minor` | `''` — **the case carries it** (`iv`) | **`'m'`** — letters have no case |
| `augmented` | `'+'` | `'+'` |
| `diminished` | `'°'` | `'°'` |
| `altered` | `'?'` | `'?'` |

**Two tables, because there are two systems. A builder must not merge them, and `SUFFIX` is
not edited.** `applyCase` exists only on the numeral side. Everything else is shared:
`degreeQuality` supplies the quality to both, `EXT` supplies the extension digit to both, and
A9's superscript rule binds both — **`m` goes in `sup`, not inline**, because A9 says every
quality marker is superscript and that it "binds the numeral label and the letter label
equally."

### 15.9 · Voicings, inversions, and comping

Outline: "**Inversions/comping chords by rearranging and spacing them out.**"

Brandon is the boss. What does the code say about the difficulty?

> **A voicing is a list of ACTUAL PITCHES — midi numbers — not pitch classes.**
>
> This is the whole reason inversions need a data shape of their own. A pitch class set
> cannot express an inversion: `{C, E, G}` and `{E, G, C}` are the same set, and the entire
> lesson is that they are **not** the same chord to listen to. Pitch classes are for
> colouring and labelling (§15.2, §15.4); **pitches are for sounding.**

```js
// theory/chord.js — every function returns a NEW array; nothing mutates in place
voicing(scale, root, count, octave)   // → [midi × count], root position, low → high
invert(v, n)                          // → the bass rotated up an octave, n times — A10
spread(v, offsets)                    // → comping: per-tone octave displacement
bassOf(v)                             // → Math.min(...v)  — what the slash label reads
chordLabel(scale, root, v, count, system)   // → 'Dm/F' | 'III/M6' | 'V' — A10 · F1
chordLabelParts(scale, root, v, count, system)  // → {base, sup, slash} — superscript, A9 · F1
```

**The letter head is `chordName` (F1), not `letterHead`** — that name was a call-site
invention and is struck. `chordLabelParts` takes its `base`/`sup` from `chordNameParts`
(letter) or `numeralParts` (numeral), and `slash` is the bass text or `null`.

#### Comping — "spacing them out"

```js
spread(v, offsets)    // offsets = [int × v.length], octaves to displace each tone
  = v.map((midi, j) => midi + 12 * offsets[j])
```

**One primitive, because spacing chord tones is one operation.** `[0,0,0]` is a closed
voicing; `[0,1,0]` opens the middle up; `[-1,0,0]` drops the bass. Every spacing the
curriculum's clause describes is reachable from it.

- **The returned array is in SOUNDING order, not sorted order.** After `spread`, `v[0]` is
  still the chord's first tone even if it is no longer the lowest pitch. `bassOf` exists so
  nothing has to re-sort to find the bass. **A seat that sorts a voicing has thrown away
  which tone is which.**
- **Named comping patterns — "drop 2", "open position", "shell" — are still not in §15**,
  and this half of OD-15 is **unchanged by Brandon's ruling**, which was about labels, not
  about patterns. Nobody asked for them; §10 forbids inventing an interface. If Brandon
  wants named patterns they are presets over `spread`, and the primitive above already
  carries them.

#### How a voicing reaches an instrument, and how it is saved

A voicing is played by calling §2's `noteOn` once per pitch — the Chord Module has
`static emitsNotes = true` (§2's amendment 4, forced by **A19** "routes to any synth") and
emits one `onNoteOut` per tone. **No new interface is needed and §15 adds none.**

It saves through frozen §7 unchanged: `channels[].notes[]` holds one entry per pitch, all
at the same `tick`, each with its own `note` number. **A chord is N notes at one tick** —
which is also why P5's `.mid` export (**A46**) gets a real chord without a special case.

### 15.10 · The note bank

The curriculum names it and says exactly what it does:

> "**'Note bank'** that runs the logic of the scale with the logic of the numeral they
> input (I use color to show major and minor digits in the scale circle so that they don't
> have to memoerize diatonic chords with numerals)"

BUILDPLAN makes it the Chord Module's visual, the way the spectrum analyzer is Wave Synth's.
**It is one function, and the surface draws what it returns.**

```js
noteBank(scale, { root,                 // degree index 0-6 — "the numeral they input"
                  count = 3,            // §15.6 — 3 unless the student reaches for more
                  octave = 4,
                  inversion = 0,        // §15.9
                  offsets = null }) →
{
  // ——— the numeral side ———————————————————————————
  numeral,                  // 'vii°7' — §15.8, case from the colour rule
  numeralParts,             // {base:'vii', sup:'°7'} — SUPERSCRIPT, A9. Surfaces use THIS.
  chordLabel,               // 'III/M6' | 'D/F♯' | 'V' — slash notation, A10
  chordLabelParts,          // {base, sup, slash} — A9 · A10
  degreeNumber,             // root + 1, the digit on the circle
  quality,                  // §15.4 — one of the five
  colorToken,               // §15.4 — the chord's colour, the circle's colour
  isUpperOvertoneChord,     // count > 3 — Brandon's term, §15.6

  // ——— the scale side, one entry per tone ————————————
  tones: [ { scaleNumber,   // 1, 3, 5, 7, 9 …  — §15.7, "numbers refer to scale info"
             degreeIndex,   // which degree of the current scale this tone is
             pc, midi,
             letter,        // §15.2b · A1
             solfege,       // §15.2c — MOVABLE DO (A2). Every chord tone IS a degree,
                            //   so this always speaks; D-17's '' is unreachable here.
             number,        // §6 — the degree digit
             colorToken,    // that DEGREE's colour, §15.4 · §9
             isRoot, isBass } ],

  voicing,                  // [midi × count] — §15.9, after inversion and spread
  bass                      // bassOf(voicing)
}
```

**"Runs the logic of the scale **with** the logic of the numeral" is literally the two
halves of that object.** The numeral side is `degreeQuality` + `numeralOf`; the scale side
is `rootScaleNote` giving each tone its scale number. Neither is a lookup.

#### What a student sees, and why each field is there

- **The chord's tones, each labelled with its own scale number** — so "the 7th of the chord
  is the 7th note of that root's scale" is not a sentence they have to be told, it is
  printed on the note. §15.7 is what makes the number right in an altered scale.
- **Each tone in its degree's colour**, from §9's one palette — §9 already names the note
  bank as a consumer of the degree colours, alongside the circle, the diatonic keys and the
  piano roll shading. **One palette, four surfaces, no drift** — §9's words.
- **The numeral, cased** — which is the device working: the student picked a degree and the
  app told them whether it is major or minor, so they never memorised the diatonic set.
- **This is where 7ths are shown but not learned.** Outline: "They do not LEARN about 7th
  chords, but I do show them." Raising `count` to 4 makes a tone appear labelled
  `scaleNumber: 7`. It is visible, it is explained by the number on it, and it is not the
  default (§15.6). **CONFIRMED.**

**The note bank computes nothing of its own** — §4 and §6 forbid a surface computing its
own colours or building its own label strings, and this is the surface those two rules were
aimed at. The exact layout, sizing and animation are `chord-module`'s (P3/S6) and are not
this section's business.

---

## OPEN DECISIONS — `spec-scale`, §15

> ## `[AMENDED 2026-08-24 15:32 EDT]` — **ALL FIFTEEN ARE CLOSED.**
>
> This list shipped fifteen items, thirteen of them Brandon's, and `spec-scale` answered
> none of them. **Brandon ruled on 2026-08-24.** Every row below now carries a **✅** and a
> pointer to where the answer lives in the
> [amendment block](#amended-2026-08-24--brandon-ruled-od-1--od-15-read-this-before-the-body)
> at the head of §15. The original text of each item is kept so the question is still
> readable beside its answer; **the ⛔ marks and the "Decider: Brandon" lines are dead** and
> are struck where they stood.
>
> **Nothing in §15 is ⛔ any more.** `scale-engine` (S3), `chord-engine` (S4) and every S5
> surface — including `scale-circle`, which was blocked on OD-4 and OD-1 — are unblocked.
>
> **Four were answered by this seat, not by Brandon**, under his standing instruction:
> *"for any other blockers, have the agents take the easiest route to undo and list the
> decisions they would have recommended later as well as instructions to make it easy for
> other agents to make the changes."* Those are **OD-2, OD-8, OD-10, OD-14**, each shipped
> reversible with its change point named in
> [A11](#amended-2026-08-24--a11--the-remaining-opens-under-brandons-standing-instruction).
> **Three more carry a smaller easiest-to-undo call inside a Brandon ruling** — the circle's
> direction (A3), the Do slot's click target (A4), and `SUFFIX['altered']` (A9).

### ✅ The two that decided whether the phase is right — both ruled

**OD-13 ✅ RATIFIED · The numeral CASE for diminished, augmented, and altered.** `[THEORY]`
§15 derived case from **the chord's third** — 4 semitones → upper, 3 → lower — so augmented
takes upper case and diminished lower, computed from the same intervals the colour rule
already produces. **Brandon ratified the mechanism:** *"yes, and if the system is drawn
correctly (including the ability to go back and change things, flexibility is key here),
everything else will have proper logic to understand and follow."* **The derivation is now
CONFIRMED. No lookup table.** `'altered'` ships upper-cased-untransformed with a superscript
`?` — this seat's easiest-to-undo call.
**→ [A9](#amended-2026-08-24--a9--quality-markers-are-superscript-always-od-13-od-7)**

**OD-6 ✅ RULED, then SUPERSEDED · The fifth degree colour, and what `--deg-altered` means.**
`[THEORY]` **Brandon:** *"augmented and diminished seem to have none, have the agents make a
decision."* **`spec-scale` made it** — augmented shared `--deg-dim` through a five-row
`QUALITY_TOKEN` object, so changing it later was one string. §9 was **not** edited. The word
collision is resolved by source, not by renaming: `--deg-altered` is **the quality**; "the
student moved this degree" is read from §4's `scale.altered[i]` boolean, which
`circlePositions()` already returns.
**Brandon then ruled M-14 (2026-08-24): split it.** §9 now carries `--deg-aug`;
`QUALITY_TOKEN.augmented` is that one string, changed. The rest of this block — the
`--deg-altered` word-collision resolution — still stands.
**→ [A5](#amended-2026-08-24--a5--augmented-and-diminished-colours-od-6)**

### ✅ The two that blocked a surface — both ruled. `scale-circle` may draw.

**OD-4 ✅ RULED · Seven slots.** `[THEORY]` **Brandon:** *"circle draws 7 slots, labels Do
1/8."* Seven drawn positions; the Do slot carries both the `1` and the `8`. There is no
eighth slot. `circlePositions()` still returns 8 entries and **its shape did not change** —
entry 8 survives to carry the octave pitch. Clicking the merged slot sounds the lower tonic
(this seat's easiest-to-undo call; Brandon ruled the drawing, not the click).
**→ [A4](#amended-2026-08-24--a4--the-circle-draws-seven-slots-od-4)**

**OD-1 ✅ RULED · `keySpelling(6)` — F♯ major or G♭ major?** `[THEORY]` **Brandon:**
*"enharmonics follow key signature or show both."* Six sharps against six flats is the one
exact tie in the twelve, so **both faces show**: the scale is spelled twice and every degree
reads `F♯/G♭`, `G♯/A♭`, … **The `letter` overlay now works in all twelve keys.**
**→ [A1](#amended-2026-08-24--a1--spelling-key-signature-or-both-faces-od-1-od-1a)**

### ✅ Brandon's remaining nine

**OD-1a ✅ RULED · `keySpelling(1)` — D♭ or C♯?** `[THEORY]` Not a tie: 5 flats against 7
sharps, and the key signature decides. **D♭ — now CONFIRMED**, no longer DERIVED.
**→ [A1](#amended-2026-08-24--a1--spelling-key-signature-or-both-faces-od-1-od-1a)**

**OD-2 ✅ SHIPPED, reversible · The `letter` label for a pitch that is NOT in the key.**
`[THEORY]` Answered by **this seat** under Brandon's standing instruction, not by Brandon.
Ships as **spell it in the key signature's direction** — flats in a flat key, sharps in a
sharp key, both faces in `tonic: 6` — which reuses OD-1's rule and adds no new principle.
`chromaticSpelling(scale, pc)` in `theory/scale.js`, called only by `label()`'s `'letter'`
branch. **What this seat would have asked instead:** whether an out-of-key row should show a
letter at all, or stay blank like `number` and `solfege`.
**→ [A11](#amended-2026-08-24--a11--the-remaining-opens-under-brandons-standing-instruction)**

**OD-3 ✅ VOID · Fixed do against "1/8 for Do".** `[THEORY]` **The premise was removed.**
**Brandon reversed D-16 on 2026-08-24:** *"moveable DO, the key of the scale is always Do"*
… *"Do is whatever the tonal center is. If the scale's tonal center is D, D is do."*
Movable do binds the syllable to the **degree index**, so all seven degrees speak in every
key, the tonic is always `Do`, and the outline's "1/8 for Do" is literally true everywhere.
D-17 is untouched and still silences pitches outside the scale. **This item is void, not
deferred.** **→ [A2](#amended-2026-08-24--a2--movable-do-d-16-is-reversed-od-3)**

**OD-5 ✅ RULED · Circle orientation.** **Brandon:** *"Do is 12-o-clock, top center of
circle."* Direction was not ruled; **clockwise** ships as one flippable constant.
**→ [A3](#amended-2026-08-24--a3--circle-orientation-od-5)**

**OD-7 ✅ RULED · The numeral suffixes and the top end.** `[THEORY]` **Brandon:** *"I never
mentioned augmented or diminished but have them use the superscript + and either the already
superscript circle or superscript a lowercase o"* and *"no names needed past 9."*
`SUFFIX['augmented'] = '+'`, `SUFFIX['diminished'] = '°'` (chosen over `o` on font coverage,
one character to swap), `EXT[6] = EXT[7] = ''`. **And the general rule: every quality marker
and extension digit is SUPERSCRIPT to the chord label.**
**→ [A9](#amended-2026-08-24--a9--quality-markers-are-superscript-always-od-13-od-7) ·
[A6](#amended-2026-08-24--a6--no-extension-names-past-9-od-7-part)**

**OD-10 ✅ SHIPPED, reversible · Does picking a new key reset the degrees to major?**
`[THEORY]` Answered by **this seat** under Brandon's standing instruction. Ships as
**transpose** — `setScaleTonic(pc)` touches `tonic` and nothing else, which is what
`degrees`-as-offsets already does, so it is zero new code and the cheapest thing to reverse.
**What this seat would have asked instead:** D-1's wording ("the scale degrees that are
generated follow the major scale pattern") reads as *reset*, and reset and transpose are
different products. **To reverse:** one statement inside `setScaleTonic`.
**→ [A11](#amended-2026-08-24--a11--the-remaining-opens-under-brandons-standing-instruction)**

**OD-11 ✅ RULED · The preset list.** `[THEORY]` **Brandon:** *"make presets that are easy to
change later"* and *"follow the rules for modes and variations on minor scales."* **Nine
presets ship** — Major, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian, Harmonic
Minor, Melodic Minor — as **one plain data object** in `theory/scale.js`. No logic anywhere
reads a preset by name, and no seat may write `if (preset === 'Dorian')`. Changing the list
is a data edit. **→ [A8](#amended-2026-08-24--a8--presets-and-naming-a-scale-od-11-od-12)**

**OD-12 ✅ RULED · What an altered scale is called.** `[THEORY]` **Brandon:** *"follow the
rules for modes and variations on minor scales. Anything else put 'scale unknown' and I'll
go back and label them myself (directions on the easy undo)."* **§15's refusal to back-match
is reversed** — `scaleName()` matches `degrees` against the preset list and returns the real
mode name; anything unrecognised reads the literal **`'scale unknown'`**. §4's
`state.scale.preset` is untouched and still goes to `'Custom'`. **The step-by-step relabel
procedure Brandon asked for by name is written out in A8.**
**→ [A8](#amended-2026-08-24--a8--presets-and-naming-a-scale-od-11-od-12)**

**OD-14 ✅ SHIPPED, reversible · May a student enter a numeral whose case contradicts the
scale?** `[THEORY]` Answered by **this seat** under Brandon's standing instruction. Ships as
**case ignored on input** — zero code, and the outline has the student *pick* a degree while
the app *tells* them the case. **What this seat would have asked instead:** whether borrowed
chords exist at all; they appear nowhere in the curriculum and `degrees` cannot express one.
**→ [A11](#amended-2026-08-24--a11--the-remaining-opens-under-brandons-standing-instruction)**

**OD-15 ✅ RULED · The label for a rearranged voicing.** `[THEORY]` **Brandon:** *"no
inversion labels, on the chord builder itself have them labeled as if the lowest note was
the bass (III/M6, D/F#, etc)."* **Inversion numbering is removed from the spec entirely.**
Every voicing labels as `head/bass`; root in the bass means no slash. The letter form
(`D/F♯`) is settled and matches the curriculum's own `C/E`, `Dm/F`, `Bb/F`. The numeral
form's bass is read as **the interval from the chord root to the bass** (`III/M6`) — this
seat's reading of Brandon's example, flagged with its one-expression change point.
**`invert()` survives: the operation was not banned, the label was.** Named comping patterns
("drop 2", "open") are still out — unchanged, and not what Brandon's ruling was about.
**→ [A10](#amended-2026-08-24--a10--no-inversion-labels-slash-notation-od-15)**

### ✅ The two engineering items

**OD-8 ✅ SHIPPED, reversible · The `setScaleDegree` clamp.** Answered by **this seat** under
Brandon's standing instruction. **±2 semitones from the degree's `MAJOR` value** — not
arbitrary: past ±2 there is no spelling (§15.2b returns `text: null`) and no solfège mark
(A2 falls through to `'*'`), so the clamp is exactly the range the labels can describe.
`DEGREE_CLAMP = 2` in `theory/scale.js`; **`scale-engine` (P3/S3) still owns the
enforcement** and reports it to the Troubleshooter. **What this seat would have asked
instead:** whether a degree may cross its neighbour — that part is Brandon's, not
engineering.
**→ [A11](#amended-2026-08-24--a11--the-remaining-opens-under-brandons-standing-instruction)**

**OD-9 ✅ RULED · Accidental glyphs.** **Brandon:** *"there should be symbol fonts that can
cover the natural sign or all of them, italic # and lowercase b if not (if no natural sign,
the agent marks it and suggests cheap vs expensive alternatives and goes with the easiest
decision to undo later)."* **Marked as instructed: §15 never emits a natural sign** —
`spellingOf` returns `''` for `accidental === 0`, so ♮ is not on the critical path. The
genuine coverage gap is `𝄪` (U+1D12A, Musical Symbols, SMP), which §15.2b already avoids by
doubling single glyphs. **Cheap option taken** — one `--font-music` system stack in
`ui/tokens.css`, zero bytes downloaded. **Expensive option documented and not taken** — a
bundled Bravura subset, hundreds of KB on a school Chromebook, added later with one
`@font-face`. ASCII fallback (`<i>#</i>`, `b`) is Brandon's own wording and is one table
swap. **Decider moves from "the S5 surface seats, together" to §15** — one table in
`theory/scale.js`, which is what "one table, not three" always meant.
**→ [A7](#amended-2026-08-24--a7--accidental-glyphs-od-9)**

---

*End of `spec-scale`'s section. §1–§14 were not touched. No `/src` file was written.*

---

# 16 · CHANNELS, DEVICES, AND GRAPH

Written by `spec-transport` (P4/S1), 2026-08-31 21:26 EDT. Extends §1–§15, amends nothing.
This section exists to let **six seats build at the same time without talking to each
other.** Everything here is an interface or a file boundary. Nothing here is a music
decision; the four that are music decisions are named in §16.12 with Brandon as decider.

## 16.0 · HOW TO READ THIS SECTION

**The whole thing in one paragraph.** Six fixed channels plus a master. An instrument's
output enters its channel, passes up to four **inserts** (devices), then the fader, the
pan, and the mute/solo gate, is tapped for the **meter**, and lands on `masterGain`. A
**device** is a two-port box with a named parameter list; five of them exist. The
**graph** is the only thing that decides which device is on which channel and where its
output goes; the **strip** displays that and can change none of it. **Automation** draws
four mixer controls over time. The **patch synth** is a sixth instrument with its own,
separate node graph inside it.

**Which subsection is yours.** Read §16.0 and §16.11 always. Then:

| Seat | Read | Skip |
|---|---|---|
| `mixer-strips` | 16.1, 16.4, 16.8, 16.10 | 16.7 |
| `device-dynamics` | 16.2, 16.3a, 16.3b, 16.10 | 16.5, 16.6, 16.7 |
| `device-spectral` | 16.2, 16.3c, 16.10 | 16.5, 16.6, 16.7 |
| `device-space` | 16.2, 16.3d, 16.3e, 16.10 | 16.5, 16.6, 16.7 |
| `arrangement` | 16.9, 16.10 | 16.2, 16.3, 16.5, 16.7 |
| `patch-synth` | 16.7 (all of it), 16.8, 16.10 | 16.1, 16.3, 16.4, 16.5, 16.6 |
| `node-graph` (S4) | 16.1, 16.2, 16.4, 16.5, 16.8, 16.10 | 16.7 |
| `automation` (S5) | 16.1, 16.6, 16.10 | 16.2, 16.3, 16.7 |
| `governor` (S5) | 16.8, 16.10 | everything else |

**What already exists and is NOT respecified here.** Read the file, do not redesign it:
`core/audio.js` (`ctx`, `masterGain`, `masterAnalyser`, `createChannel`, `releaseChannel`,
`governor`, `voicePool`, `synthVoiceNorm`, `unlock`) · `core/clock.js` (`PPQ = 480`,
`clock.on('tick')`, `clock.schedule`, `clock.loop`, `clock.position`) · `core/capture.js` ·
`core/state.js` · `ui/shell.js` (`TOOLS`, `registerSurface`, `surfacesOfKind`, `ToolShell`,
`createScaleControl`, `createCpuMeter`, `createSurfaceSwitcher`, `createFileMenu`) ·
instruments `wave-synth`, `overtone-synth`, `drum-synth`, `drum-sampler`, `chord-module` ·
surfaces `keyboard`, `diatonic-keys`, `scale-circle`, `piano-roll`, `step-grid`,
`comp-builder` · visuals `spectrum`, `scope`. **`patch-synth` is not built.**

**Where CONTRACTS and the shipped code disagree, the code and SESSIONLOG are the
evidence.** §16 flags every place it found a disagreement rather than picking silently;
see §16.8 and §16.9. Do not "fix" §1–§15 to match. Report it.

### 16.0a · CODE COMMENT CONVENTION — every P4 seat

Comments state **what a thing is** and **what state it is in**. Nothing else.

- ALLOWED: what a function does; what a variable holds; units; the node a value lands on;
  a non-obvious ordering requirement; a `TODO` naming the seat that owns it.
- FORBIDDEN: contract text copied into a comment · rationale, justification, or history ·
  "Brandon's call" / "Brandon wants" / any attribution · argument with another file ·
  a second copy of this section.
- Reasoning goes in the receipt. The receipt is not a novella.

### 16.0b · TOKEN RULE

**Every P4 dial is already in `ui/tokens.css`** — 85 of them, with real values, appended
2026-08-31 on Brandon's order so the DAW is skinnable on the first build, not on a second
pass. So every colour, radius, size, spacing, weight, stroke, opacity, shadow and
transition in a P4 file is `var(--token)` — **no fallback**, because a fallback means the
dial does not exist and someone has to come back for it. **A raw literal is a defect.**
The list, by surface, is **§16.10**. A seat that needs a name that is not there escalates;
it does not invent one, and it does not write `tokens.css`.

---

## 16.1 · WHAT A CHANNEL IS

**Six fixed channels, `ch1`…`ch6`, plus one master.** Multi-instance is DEFERRED.

The chain from an instrument's output to the master bus, in order:

```
  instrument voices  (the instrument owns everything above this line)
      │
  [1] channelIn    GainNode          ← createChannel(instrumentId), core/audio.js
      │                                this is §2's `out`. The instrument connects here.
  [2] insert 0..3  device.input → device.output      ← 0 to 4 devices, in slot order
      │                                the graph decides which and in what order
  [3] stripGain    GainNode          ← `strip.gain`   THE FADER
      │
  [4] stripPan     StereoPannerNode  ← `strip.pan`
      │
  [5] stripMute    GainNode          ← mute/solo resolution, gain is exactly 0 or 1
      │
  [6] meterTap     AnalyserNode      ← THE METER READS HERE. Post-fader, post-pan,
      │                                post-mute: the meter shows what leaves the channel.
      └──→ masterGain                 (core/audio.js, frozen)
```

**Four rules that are not negotiable, because breaking one breaks a frozen file:**

1. **`channelIn.gain` belongs to `core/audio.js`.** `synthVoiceNorm` writes it (a
   `setTargetAtTime` ramp, every time a voice registers or releases). **The fader is NOT
   this node.** `strip.gain` is `stripGain` at position [3] and nothing else. A seat that
   puts the fader on `channelIn` will watch it move on its own.
2. **`createChannel()` connects its node straight to `masterGain`.** `strip.js` calls
   `createChannel(id)`, then **`channelIn.disconnect()`**, then connects `channelIn` into
   its own chain. This is legal and edits nothing: the node stays in `audio.js`'s registry
   (so voice normalization keeps working) and only its downstream connection changes.
   Teardown calls `releaseChannel(channelIn)`.
3. **Nothing connects to `ctx.destination`.** §2's rule, unchanged. `masterGain` is the
   only destination any channel knows.
4. **The insert chain is patched by exactly one method, `strip.setInserts()` (§16.4), and
   the only caller is `mixer/graph.js`.**

### 16.1a · The master

`masterGain → masterAnalyser → ctx.destination` is built at module load in `core/audio.js`
and is **frozen**. The master strip therefore differs from a channel:

| | channel | master |
|---|---|---|
| fader | `stripGain.gain` | `masterGain.gain` — audio.js's own node, written by nobody else |
| pan | yes | **none** |
| mute / solo | yes | **none** |
| inserts | 4 slots | **none in P4** — inserting would require breaking a frozen connection |
| meter | `meterTap` | reads `masterAnalyser` — already in the chain, never reconnected |

**§7's `master` object round-trips as `{"gain": <number>, "inserts": []}`.** `inserts` is
written as an empty array and read back as one. Master inserts are §16.12's item 1.

### 16.1b · Mute and solo, resolved

One rule, applied to all six channels on every change, by `strip.js`:

```
  anySolo = ch1.solo || … || ch6.solo
  audible(ch) = anySolo ? (ch.solo && !ch.mute) : !ch.mute
  stripMute.gain = audible(ch) ? 1 : 0     // setTargetAtTime, 8 ms, never a hard step
```

Solo is not exclusive: two channels can be soloed at once. Mute wins over solo on the same
channel. Master has neither.

---

## 16.2 · WHAT A DEVICE IS

**One interface. Five implementations. There is no base class and no shared file — see
§16.11.** Every device is a plain ES module with a default-exported class.

```js
export default class Device {
  static id                  // 'gate'|'compressor'|'eq'|'reverb'|'delay'
  static label               // 'Gate' — the words on the slot and the pop-out
  static estimatedWeight     // integer, §8 — what the governor is asked for BEFORE
                             //   `new Device()` runs. gate 3 · delay 5 · eq 29 ·
                             //   compressor 45 · reverb 135
  static params              // ordered array, the pop-out draws it in this order:
                             //   { path, label, min, max, default, unit, curve, step }
                             //   unit  : 'dB'|'Hz'|'ms'|'%'|'x'|''
                             //   curve : 'linear'|'log'   (log = frequency and time)

  constructor(ctx)           // ctx ONLY. Never `out`, never a channel, never the graph.
                             //   Builds every node it will ever own, right here.

  get input()                // AudioNode. What feeds this device.
  get output()               // AudioNode. What this device feeds.

  setParam(path, value)      // path is a `static params` path. Out-of-range CLAMPS.
  getParam(path)

  get bypass()
  set bypass(v)              // true → input reaches output unprocessed and inaudibly
                             //   crossfaded. See the invariant below.

  getState()                 // JSON-safe object → §7 `inserts[].state`. No nodes,
  setState(obj)              //   no functions, no undefined.

  getAnalyser(which)         // 'spectrum'|'scope' → an AnalyserNode ALREADY in this
                             //   device's chain, or null. The reader never reconnects it.
  get readout()              // live numbers a visual may poll, or null. JSON-safe.
                             //   Polled from rAF by the visual; never scheduled from.

  mountCompact(el)           // the pop-out panel. Devices have no expanded view.
  unmount()
  dispose()                  // every node disconnected, every frame cancelled,
                             //   every listener dropped

  get cpuWeight()            // integer, LIVE. May differ from `estimatedWeight`
                             //   (reverb's changes with its IR).
}
```

**THE INVARIANT THAT MAKES THE GRAPH POSSIBLE: `input` and `output` return the same two
nodes for the life of the device.** The graph connects to them once. Bypass, parameter
changes, and `setState()` must all happen *inside* the box. A device that swaps its own
input or output node silently disconnects itself from the mixer.

**`readout` vs `getAnalyser`.** `getAnalyser` hands back a real `AnalyserNode` for anything
that draws a waveform or a spectrum. `readout` is for numbers a `AnalyserNode` cannot give
— a compressor's live gain reduction, a gate's open/closed. Return `null` from either when
the device does not offer it. `vis/spectrum.js` throws a clear `TypeError` on an object
with no `getAnalyser`, so every device implements the method even when it returns `null`.

**Do not extend this interface.** Six seats build against it. If yours needs something
that is not here, that is an escalation, not an eighth method.

---

## 16.3 · THE FIVE DEVICES — PARAMETERS AND WHAT EACH SHOWS

**Two devices get a picture. Three teach by parameter.**

| device | its visual | file that draws it |
|---|---|---|
| `eq` | **spectrum analyzer**, with the band curve over it | `vis/spectrum.js` (P1, reused) |
| `compressor` | **gain-reduction display** | `vis/gain-reduction.js` (new) |
| `gate` | one open/closed indicator and its threshold readout | none — DOM, in the pop-out |
| `reverb` | parameter readouts only | none |
| `delay` | parameter readouts only | none |

### 16.3a · `gate` — `devices/gate.js`

"Mutes track under certain gain level."

| path | label | range | unit | curve | default |
|---|---|---|---|---|---|
| `threshold` | Threshold | -80 … 0 | dB | linear | -40 |
| `attack` | Attack | 0.1 … 100 | ms | log | 2 |
| `release` | Release | 5 … 2000 | ms | log | 100 |

`readout` → `{ open: <bool>, levelDb: <number> }`. Nothing else. Built from an
`AnalyserNode` plus a `GainNode` (§8: weight 3). `getAnalyser('scope')` may return the
analyser; `getAnalyser('spectrum')` returns `null`.

### 16.3b · `compressor` — `devices/compressor.js`

"Makes soundwave peaks smaller and troughs larger."

| path | label | range | unit | curve | default |
|---|---|---|---|---|---|
| `threshold` | Threshold | -60 … 0 | dB | linear | -24 |
| `ratio` | Ratio | 1 … 20 | x | linear | 4 |
| `attack` | Attack | 0 … 1000 | ms | log | 3 |
| `release` | Release | 10 … 1000 | ms | log | 250 |
| `makeup` | Makeup | 0 … 24 | dB | linear | 0 |

`readout` → `{ reductionDb: <number ≤ 0>, inputDb, outputDb }`, sampled fresh on every
read. `reductionDb` is `DynamicsCompressorNode.reduction`. **`vis/gain-reduction.js` polls
`device.readout` from rAF and touches no audio node.** §8 weight 45.

### 16.3c · `eq` — `devices/eq.js`

"Adds/removes gain to a specific band (consecutive group) of frequencies."

**Three bands.** §8 already prices `eq.js` as `3 × biquad + analyser = 29`; three is the
number the budget was written for. Each band is a `BiquadFilterNode` of type `peaking`, so
all three parameters mean something on all three bands.

Per band `n` ∈ 0,1,2 — **these three words appear on screen exactly as written:**

| path | label | range | unit | curve | default |
|---|---|---|---|---|---|
| `band<n>.gain` | **Gain** | -24 … +24 | dB | linear | 0 |
| `band<n>.freq` | **Freq** | 20 … 20000 | Hz | log | 200 / 1000 / 5000 |
| `band<n>.q` | **Q** | 0.1 … 18 | '' | log | 1 |

Do not rename them. Do not add a fourth parameter, a filter-type selector, or a band.

**The picture.** `getAnalyser('spectrum')` returns the device's own `AnalyserNode`, placed
**after** the three filters, so a student sees the result of the shaping.
`vis/spectrum.js` is constructed with the device itself — `new Spectrum(device)` — and is
**not edited**. The band curve is drawn by `eq.js` on its **own** canvas, positioned over
the Spectrum's element with the same Hz axis (log, 20 Hz … 20 kHz — `Spectrum`'s
`minHz`/`maxHz` options set it and its getters read it back). One spectrum analyzer exists
in this app. Do not write a second.

### 16.3d · `reverb` — `devices/reverb.js`

"Sound of waves echoing off solid structures."

| path | label | range | unit | curve | default |
|---|---|---|---|---|---|
| `size` | Size | 0.1 … 4.0 | s | log | 1.5 |
| `damping` | Damping | 0 … 100 | % | linear | 40 |
| `mix` | Mix | 0 … 100 | % | linear | 25 |

`ConvolverNode` with a generated impulse response; `size` is the IR length in seconds.
**`cpuWeight` is read from the current IR, never a constant** — §8's table: 0.1 s → 133,
0.25 s → 150, 0.5 s → 165, 1.0 s → 184, 2.0 s → 235, 4.0 s → 325. Interpolate between
rows. `getAnalyser()` returns `null`. `readout` returns `null`.

**When the governor refuses it:** the device is not constructed at all — the graph asks
`governor.request(Reverb.estimatedWeight)` first — and the refusal is drawn (§16.5c). A
refused reverb never half-exists.

### 16.3e · `delay` — `devices/delay.js`

"Repeating the sound and manipulating the process."

| path | label | range | unit | curve | default |
|---|---|---|---|---|---|
| `time` | Time | 10 … 2000 | ms | log | 250 |
| `feedback` | Feedback | 0 … 95 | % | linear | 35 |
| `tone` | Tone | 200 … 12000 | Hz | log | 6000 |
| `mix` | Mix | 0 … 100 | % | linear | 30 |

`feedback` is hard-clamped at 95 so a runaway is not reachable. §8 weight 5.
`getAnalyser()` and `readout` return `null`.

### 16.3f · Both space devices must survive a branch

Nothing in `reverb.js` or `delay.js` may assume it is inline. The graph will put either on
a branch beside a dry path (§16.5b). That means: `mix` is a **wet/dry balance inside the
box**, and a device on a branch is simply run at `mix = 100`. No device ever reads the
graph to find out where it is.

---

## 16.4 · THE STRIP — WHAT IS ON IT, AND WHAT IS ONLY DISPLAYED

`mixer/strip.js` builds all six channels and the master. On a strip: **fader, level meter,
pan, mute/solo, and four insert slots. Nothing else.**

```js
export default class Strip {
  constructor(ctx, { id, label, instrumentId = null, isMaster = false })
  get input()                 // the channelIn node — this is §2's `out`
  get output()                // masterGain, or ctx.destination's feed for the master
  get gain()  set gain(v)     // 0 … 1.5   → stripGain.gain          automation target
  get pan()   set pan(v)      // -1 … 1    → stripPan.pan            automation target
  get mute()  set mute(v)     // bool                                automation target
  get solo()  set solo(v)     // bool                                automation target
  get meterTap()              // AnalyserNode — vis/meter.js reads this, never reconnects
  setInserts(devices)         // ORDERED array of §16.2 devices. Rebuilds the insert
                              //   chain. THE ONLY ROUTE-CHANGING METHOD ON THIS CLASS.
  get inserts()               // read-only copy of that array
  setRouting(view)            // display only — see below. Draws; changes no connection.
  getState()  setState(obj)   // §7 `strip` + `inserts[]` ids, JSON-safe
  mountCompact(el)  unmount()  dispose()
}
export function createStrips(ctx, specs)   // the six + master, with solo resolved across them
```

**`setInserts()` has exactly one caller in the whole app: `mixer/graph.js`.** It is not
called from anywhere inside `strip.js`, and no click handler in `strip.js` reaches it.
`strip.js` **does not import `mixer/graph.js`** — that file does not exist while
`mixer-strips` is building, and it must never need to.

### 16.4a · The insert slot, and "where it is being sent"

Four slots. A slot displays three things and offers **no control except the pop-out**:

1. **What is loaded** — the device's `static label`, or the empty-slot mark.
2. **Its meter** — the device's own `readout` or `getAnalyser()`, drawn small.
3. **Where it is being sent** — a read-only destination chip.

**There is no send knob on the strip.** There is no add, no remove, no reorder, no
drag. Adding a device happens in the graph.

`setRouting(view)` is how the strip learns routing without knowing the graph exists.
`view` is plain JSON-safe data, pushed in by `graph.js` after every change:

```js
{
  slots: [ { slot: 0, deviceId: 'eq',   label: 'EQ',   to: 'Compressor' },
           { slot: 1, deviceId: 'comp', label: 'Compressor', to: 'Master' },
           { slot: 2, deviceId: null,   label: null,   to: null },
           { slot: 3, deviceId: null,   label: null,   to: null } ],
  out:   [ 'Master', 'Reverb' ]        // one entry per outgoing edge, in port order
}
```

The chip reads `→ Master`. Two entries in `out` means the channel is going two places, and
both are drawn. Until `setRouting()` is called, a strip draws `→ Master` for its output and
an empty mark for every slot — the state of a fresh project.

### 16.4b · The meter — `vis/meter.js`

Owned by `mixer-strips`. One class, used seven times plus once per insert slot.

```js
export default class Meter {
  constructor(analyser, { peakHoldMs = 1200, orientation = 'vertical' } = {})
  mount(el)  unmount()  dispose()
  get level()   // 0..1, the value last drawn
  get peak()    // 0..1, held
}
```

Reads `getByteTimeDomainData` from the analyser it is handed, draws from rAF, and
**cancels its frame on `unmount()`** — a hidden meter costs nothing. Uses
`IntersectionObserver` to stop when scrolled out of view, the same way `vis/spectrum.js`
already does. `--meter-ok` below the hot band, `--meter-hot` above it, `--meter-peak` for
the held line, `--meter-clip` at 1.0.

**`vis/meter.js` is not used by any device seat.** The gain-reduction display is a separate
file with a separate owner (§16.11).

---

## 16.5 · THE GRAPH, AS DATA

Per §7's `graph` object, unchanged: `{ nodes: [...], edges: [...] }`.

```jsonc
"nodes": [ { "id": "n1", "type": "channel", "ref": "ch1", "x": 120, "y": 40 } ]
"edges": [ { "from": "n1", "fromPort": 0, "to": "master", "toPort": 0 } ]
```

**Node types — there are three.**

| `type` | `ref` | is |
|---|---|---|
| `channel` | `'ch1'`…`'ch6'` | one of the six fixed channels, at its post-fader output |
| `insert` | `inserts[].id`, e.g. `'i1'` | one device, living in a slot on one channel |
| `master` | — | exactly one, `id: "master"`, cannot be deleted or moved off screen |

There is no `send` node type. **A send is a channel node with more than one outgoing
edge** — that is exactly what "where it is being sent" means on the strip, and it needs no
new field in §7.

**Legal edges — everything not on this list is refused.**

- `channel → insert` · `channel → master`
- `insert → insert` · `insert → master`
- `toPort` is always `0`; every device is one-in.
- `fromPort` numbers the outgoing branches of one node: `0` is the main path, `1` and `2`
  are the extra ones. Two edges may not share a `fromPort` on the same node.
- REFUSED: any edge **into** a `channel` (a channel's input is its instrument, always) ·
  any edge **out of** `master` · a self-edge · **any edge that closes a cycle** — walk the
  graph before accepting.
- A node with no path to `master` is legal, silent, and drawn dimmed. It is never deleted
  for being unreachable.

### 16.5a · Deleting a node

**Deleting a node deletes every edge that touches it, in the same operation.** No dangling
edge ever reaches `getState()`. If the deleted node was an insert, its device is
`dispose()`d and `strip.setInserts()` is called with the remaining devices. The strip's
`setRouting()` is re-pushed. A student who deletes a device with three cables on it sees
three cables vanish, not an error.

### 16.5b · A parallel chain, written out

One source, two branches, recombining at the master. This is the shape the graph exists
for. Web Audio sums at a node's input, so "recombining" is just two edges landing on the
same node.

```jsonc
"edges": [
  { "from": "ch1", "fromPort": 0, "to": "i1", "toPort": 0 },   // dry-ish branch: EQ
  { "from": "ch1", "fromPort": 1, "to": "i2", "toPort": 0 },   // wet branch: reverb
  { "from": "i1",  "fromPort": 0, "to": "master", "toPort": 0 },
  { "from": "i2",  "fromPort": 0, "to": "master", "toPort": 0 }
]
```

Both branches are audible at once and both reach `master`. **This must work or the stage
failed.**

### 16.5c · A refusal is drawn, never dropped

A refused edge, a refused device, and a refused node all do the same thing: the attempted
connection or node flashes `--edge-refused` and a one-line reason appears next to it. It is
never silently discarded, and the graph state is never partially written.

### 16.5d · One-way, in one sentence

**`mixer/graph.js` is the only file in the app that changes a route.** It calls
`strip.setInserts()` and `strip.setRouting()`; the strip calls nothing back. `strip.js`
does not import `graph.js`; `graph.js` reads `strip.js` and never edits it.

---

## 16.6 · AUTOMATION

Four targets. Nothing else automates, ever. `mixer/automation.js`, per §7:

```jsonc
"automation": [ { "target": "strip.gain", "points": [ { "tick": 0, "value": 0.8 } ] } ]
```

| target | domain | kind |
|---|---|---|
| `strip.gain` | 0 … 1.5 | continuous |
| `strip.pan` | -1 … 1 | continuous |
| `strip.mute` | 0 or 1 | stepped |
| `strip.solo` | 0 or 1 | stepped |

- Points are sorted by `tick`, ascending. **One point per tick per target** — writing a
  second point at the same tick replaces the first.
- **Continuous:** linear interpolation in the target's own domain between adjacent points.
  Before the first point and after the last, the value is **held flat**. Applied as
  `setValueAtTime(v, timeOf(tick))` at the point, then
  `linearRampToValueAtTime(next, timeOf(nextTick))`.
- **Stepped:** no interpolation. `setValueAtTime(v, timeOf(tick))` and hold. A mute does
  not fade. (`mute` and `solo` land on `stripMute.gain` through §16.1b's resolution, not
  directly — automation writes the flag, `strip.js` resolves it.)
- **Values are scheduled from `clock.on('tick')`, inside the half-open window
  `[fromTick, toTick)`, using that payload's `timeOf(tick)`.** Never from rAF. §3 and §10.
- An empty lane is not written to the project file.

The fader-grab rule is §16.12's item 3.

---

## 16.7 · THE PATCH SYNTH

`instruments/patch-synth.js` implements **§2 in full** — it is an instrument, not a device.
Its graph is **its own, internal, and completely separate from `mixer/graph.js`.** It shares
no code with that file and does not import it.

**This subsection is numbered so it can be split.** A handoff may say "16.7.1–16.7.4 DONE,
16.7.5–16.7.8 OPEN" and the next agent needs only the open subsections and the file.

### 16.7.1 · The instrument shell

Standard §2: `static id = 'patch-synth'`, `static label = 'Patch Synth'`,
`static playable = true`, `static needsLoad = false`, `static pieces = null`,
`static emitsNotes = false`. `constructor(ctx, out)`, `noteOn`/`noteOff`/`allNotesOff`,
`setParam`/`getParam`, `getState`/`setState`, `voiceCount`, `cpuWeight`, `mountCompact`,
`mountExpanded`, `unmount`, `dispose`, `getAnalyser(which)`.

`cpuWeight` is **summed from the nodes actually in the patch**, using §8's measured table
— `GainNode` 1, `WaveShaperNode` 3, `DelayNode` 4, `StereoPannerNode` 4,
`BiquadFilterNode` 9, plain voice 10. A flat per-node number is wrong and §8 says so.

### 16.7.2 · Sources

| node | in ports | out ports | params |
|---|---|---|---|
| `osc` | `freq` (control), `detune` (control) | `out` (audio) | `wave` (sine/triangle/square/saw), `octave`, `detune` |
| `noise` | — | `out` (audio) | `color` (white/pink) |

### 16.7.3 · Modulators

| node | in ports | out ports | params |
|---|---|---|---|
| `lfo` | — | `out` (control) | `rate` (Hz), `depth`, `wave` |
| `env` | `gate` (trigger) | `out` (control) | `attack`, `decay`, `sustain`, `release` |

**The envelope's four stages are labelled `Attack`, `Decay`, `Sustain`, `Release`.** Those
four words, in that order. The LFO is a fixed low-frequency oscillator; it has no gate.

### 16.7.4 · Processors

| node | in ports | out ports | params |
|---|---|---|---|
| `filter` | `in` (audio), `cutoff` (control), `q` (control) | `out` (audio) | `type`, `cutoff`, `q` |
| `gain` | `in` (audio), `amount` (control) | `out` (audio) | `amount` |
| `out` | `in` (audio) | — | — |

There is exactly one `out` node per patch. It cannot be deleted. It is the only thing wired
to §2's `out` argument.

### 16.7.5 · Math nodes, and how they stay optional

| node | in ports | out ports | params |
|---|---|---|---|
| `add` | `a` (control), `b` (control) | `out` (control) | `b` (when unconnected) |
| `multiply` | `a` (control), `b` (control) | `out` (control) | `b` (when unconnected) |
| `scale` | `in` (control) | `out` (control) | `mul`, `add` |
| `invert` | `in` (control) | `out` (control) | — |

**They stay optional, not hidden, by four mechanical rules:**

1. The palette has four groups in this order: **Sources · Modulators · Processors ·
   Math.** Math is last.
2. The Math group is **collapsed on first load**. It opens on a click and stays open for
   the session. It is never removed.
3. **No starting patch and no default contains a math node.** Every one of §16.7's example
   wirings works with zero math nodes in it.
4. Nothing in the instrument refuses to function without one. A student who never opens
   the group has a complete instrument.

### 16.7.6 · Cables — what may connect to what

Ports carry one of two **domains**: `audio` or `control`.

- `audio → audio` — legal.
- `control → control` — legal.
- `audio → control` and `control → audio` — **refused, visibly**, with the reason drawn.
- One cable per **input** port; an input already taken refuses a second cable and says so.
- An **output** port may fan out to many inputs. That is how a parallel chain starts.
- Cycles are refused.

It is **patch cables, dragged from an output to an input.** Not a matrix, not a dropdown.

### 16.7.7 · A parallel chain inside the instrument

One `osc` fanning out to two `filter` nodes, both feeding one `gain`, that `gain` feeding
`out`. Two branches, recombined. Web Audio sums at the `gain`'s input; the instrument does
not need a mixer node to make it work.

### 16.7.8 · Caps, state, and views

- **24 nodes**, `noCap` lifts it. The count is the patch synth's own nodes only — it is a
  **different count from `mixer/graph.js`'s 24** (§16.8). Ask
  `governor.request(<the node's weight>)` before creating; on refusal, draw the refusal on
  the palette entry and create nothing.
- `getState()`/`setState()` round-trip **every node and every cable**: node id, kind, x, y,
  every param value; cable from-node/from-port/to-node/to-port. JSON-safe, no nodes, no
  functions, no `undefined`.
- `mountCompact(el)` — the DAW: small, still, readable. `mountExpanded(el)` — the
  standalone page: the patch is the visual and gets the animation budget.
- `dispose()` — every node, every cable, every listener, every frame.
- **`tools/patch-synth.html` and `shell.js`'s `TOOLS` flag are not in this seat's lane.**
  See §16.12 item 5.

---

## 16.8 · THE GOVERNOR, IN P4 TERMS

§8 restated against the four things P4 can allocate. **Nothing here changes a cap number.**

| what | default cap | who enforces it |
|---|---|---|
| voices | **32** total | `core/audio.js` — already does, frozen |
| inserts | **4 per channel** | `mixer/graph.js`, before constructing a device |
| sends | **2 per channel** | `mixer/graph.js` — an "extra" outgoing edge past the first |
| graph nodes | **24** | two separate counts: `mixer/graph.js` for the mixer graph, `instruments/patch-synth.js` for its own |

**`noCap` lifts all four. The meter still reads and still turns red. Nothing is blocked.**
`governor.noCap` is a plain runtime property on the object exported by `core/audio.js`, not
a build-time flag — **it ships on the deployed build** and nothing strips it.

**Where §8 and the shipped code disagree, stated rather than picked:**
`governor.request(cost)` in `src/core/audio.js` takes `cost` and **does not read it** — it
returns `voicePool.count < 32`, or `true` when `noCap` is on. The insert, send, and node
caps are **not in `audio.js` at all.** Two consequences for P4, both of them lane rules:

1. A P4 seat that calls `governor.request(weight)` gets a **voice-count answer**, not a
   weight answer. Call it — the caps you own are yours to enforce **in addition**, in your
   own file, against the numbers in the table above.
2. `governor.allocatedWeight` exists and tracks live voice weight only. It is telemetry.
   Do not treat it as an admission threshold, and **do not edit `audio.js`.** If this looks
   wrong to you, report it; the governor's logic was measured in P1 and is frozen.

Every refusal, everywhere, is **visible**: a refused voice, node, insert, send, or edge is
drawn as refused with a one-line reason. Never a silent drop.

---

## 16.9 · THE BIND METHODS — NAMED, RECONCILED, AND CLOSED

Four P3 seats independently invented wiring methods because §4 orders every surface to
subscribe to a store and never says how the store arrives. §2's `[AMENDED 2026-08-25]`
block already named three of them against the shipped code. §16 closes the rest and gives
the shape one name so a P4 seat matches it instead of inventing an eighth.

**The convention. Every `bindX` in this app has the same five properties:**

1. It takes one duck-typed thing, never a singleton import.
2. It **drops the previous binding first**, then adopts the new one.
3. It redraws **once**, immediately.
4. It returns `this`.
5. It is **optional** — unbound, the object still works on a sensible default.
   `unbindX()` drops the subscription and touches nothing already drawn.

**The eight names, and where they live now.** Nothing is renamed; this records what
shipped.

| method | on | status |
|---|---|---|
| `bindState(store)` / `unbindState()` | `piano-roll`, `scale-circle`, `chord-module`, `comp-builder` | **the name.** §2 amendment |
| `attachState(store)` | — | **struck.** Zero occurrences remain in `/src` or `/tools` |
| `bindInput(bus)` / `unbindInput()` | `chord-module` | kept. §2 amendment |
| `bindTargets(rows)` / `unbindTargets()` | `chord-module` | kept. §2 amendment |
| `bindCapture(capture)` / `unbindCapture()` | `piano-roll` | kept — **with the rule below** |
| `bindInstrument(inst)` / `unbindInstrument()` | `step-grid` | kept. Named here for the first time |
| `getNotes()` / `setNotes(notes)` | `piano-roll`, `capture` | kept |
| `addNotes(notes)` / `toProjectNotes()` | `piano-roll`, `capture` | kept |

**`setNotes` replaces. `addNotes` appends. `getNotes` returns the live objects;
`toProjectNotes` returns §7's four fields and is what `save.js` writes.**

### 16.9a · The capture-commit rule — read this before binding a Capture

`core/capture.js` emits `'commit'` with three `kind` values and they are **not the same
kind of message**:

| `kind` | `notes[]` is | the consumer must |
|---|---|---|
| `'capture'` | this take's notes | **add** |
| `'discard'` | `[]` | **ignore** |
| `'requantize'` | **every note of every take, restated in full** | **replace** |

`piano-roll.js`'s `_onCaptureCommit` does not branch on `kind` and calls `addNotes()` for
all three, so a requantize adds a second copy of everything on the roll. It was never
reachable in P3 and `piano-roll.js` is **frozen — report it, do not fix it.**

**So the `arrangement` seat does not call `roll.bindCapture()`.** It subscribes to
`capture.on('commit', …)` itself, branches on `kind`, and calls `roll.addNotes()` or
`roll.setNotes(capture.getNotes())` accordingly. Routing around a frozen file, without
editing it.

---

## 16.10 · TOKENS

**The tokens exist. They are in `ui/tokens.css` right now, with real values, appended
under the `P4 — THE DAW` heading — 85 of them.** Brandon's order, 2026-08-31: the DAW is
skinnable on the first build, not on a second pass.

**So: no fallback. Write `var(--token)`, not `var(--token, #131a26)`.** A fallback means
the dial does not exist. Every dial below exists. A raw colour, radius, or size literal
anywhere in a P4 file is a defect.

**Reuse before you reach for a P4 name.** These already say it: `--bg` `--panel` `--line`
`--text` `--text-dim` `--accent` `--warn` `--meter-ok` `--meter-hot` `--glow`
`--shadow-raised` `--r-*` `--sp-*` `--fs-*` `--w-*` `--track-*` `--lh-*` `--op-*` `--z-*`
`--bw-*` `--stroke-*` `--fade-*` `--dur-*` `--ease` `--ease-linear` `--tr-*` `--font-ui`
`--font-mono` `--canvas-*` and the whole layout/cursor/keyword axis. A panel is `--panel`.
A rule is `--line`. A refusal is `--warn`. Motion off in the DAW is `--dur-fast: 0ms` on
one root, not a rule each seat remembers.

**Geometry composes from `--sp-*` and is not tokenised separately** — strip `--sp-30`,
meter `--sp-4`, lane row `--sp-14`, node `--sp-60` — so `--sp-unit` stays the single
density dial for the whole DAW.

**The 85 P4 dials, by surface.** Read them out of `ui/tokens.css`; each carries a comment
saying what it is for.

| surface | tokens |
|---|---|
| ground | `--recess` `--raise` |
| strip | `--strip-head` `--strip-sel` `--fader-track` `--fader-fill` `--fader-thumb` `--pan-track` `--pan-thumb` `--pan-center` `--mute-on` `--solo-on` `--slot-face` `--slot-empty` `--slot-route` |
| meter | `--meter-track` `--meter-peak` `--meter-clip` `--meter-tick` |
| gain reduction | `--reduction-track` `--reduction-fill` `--reduction-zero` |
| devices | `--device-head` `--knob-track` `--knob-fill` `--knob-pointer` `--bypass-on` `--bypass-off` |
| EQ | `--band-curve` `--band-fill` `--band-handle` `--band-1` `--band-2` `--band-3` |
| gate | `--gate-open` `--gate-closed` `--gate-threshold` |
| pop-out | `--popout-ground` `--scrim` |
| graph + cables | `--graph-ground` `--graph-grid` `--node-fill` `--node-head` `--node-border` `--node-selected` `--node-dragging` `--node-dimmed` `--port-in` `--port-out` `--port-active` `--edge-audio` `--edge-control` `--edge-refused` `--edge-hover` `--cable-drag` `--math-group` |
| automation | `--lane-ground` `--lane-grid` `--lane-curve` `--lane-point` `--lane-point-on` `--lane-step` |
| arrangement | `--ruler-ground` `--ruler-tick-bar` `--ruler-tick-beat` `--lane-head` `--lane-row` `--lane-row-alt` `--clip-fill` `--playhead-line` `--loop-region` `--punch-region` `--arm-on` |
| transport + header | `--transport-ground` `--btn-face` `--btn-active` `--play-on` `--rec-on` |
| stacking | `--z-scrim` `--z-drag` |
| motion | `--tr-transform` `--tr-stroke` `--tr-color` |
| canvas | `--canvas-lw-2` `--canvas-lw-3` |

**Two rules carried forward from the file's own header, because P4 can break them:**

- A **derived** token — anything that should rescale off `--fs-root`, `--sp-unit`,
  `--r-unit`, `--bw`, `--stroke-w`, or `--canvas-lw` — lives in the `*` block, never in
  `:root`. Declaring one on `:root` freezes it against a variant and looks correct until
  someone opens an expanded view.
- **Never borrow a `--deg-*` hue for a visual.** §9: a student would learn a teaching
  association that is not true. The three EQ band colours are their own for this reason.

**A P4 seat still does not write `ui/tokens.css`.** The dials are already in it. A seat
that finds a surface with no dial escalates and one seat adds it, so the file keeps one
owner at a time.

## 16.11 · THE FILE LIST — ONE OWNER PER FILE

**No file below is written by two seats. This is the whole reason six seats can run at
once.** Writing a file you do not own is a STOP condition.

| seat | stage | writes, and only these |
|---|---|---|
| `daw-shell` | S2 | `/index.html` · `/src/ui/daw-shell.js` · `/src/core/state.js` |
| `arrangement` | S3 ‖ | `/src/ui/arrangement.js` |
| `mixer-strips` | S3 ‖ | `/src/mixer/strip.js` · `/src/vis/meter.js` |
| `device-dynamics` | S3 ‖ | `/src/devices/gate.js` · `/src/devices/compressor.js` · `/src/vis/gain-reduction.js` |
| `device-spectral` | S3 ‖ | `/src/devices/eq.js` |
| `device-space` | S3 ‖ | `/src/devices/reverb.js` · `/src/devices/delay.js` |
| `patch-synth` | S3 ‖ | `/src/instruments/patch-synth.js` |
| `node-graph` | S4 | `/src/mixer/graph.js` |
| `automation` | S5 ‖ | `/src/mixer/automation.js` |
| `governor` | S5 ‖ | `/src/ui/cpu-meter.js` |

**Written by nobody in P4 — read only:** `/src/ui/tokens.css` · `/src/ui/shell.js` ·
`/src/core/audio.js` · `/src/core/clock.js` · `/src/core/input.js` · `/src/core/capture.js`
· every file under `/src/instruments/` except `patch-synth.js` · every file under
`/src/surfaces/` · `/src/theory/` · `/src/vis/spectrum.js` · `/src/vis/scope.js` ·
`/tools/*.html` · `Builddocs/CONTRACTS.md`.

**Three traps, named so nobody walks into them:**

1. **There is no `/src/devices/device.js`.** The device interface is §16.2, in text. Three
   seats build devices at the same time; a shared base class is a file two of them would
   write. **Do not create one.** Copy the shape; do not extract it.
2. **`/src/vis/meter.js` belongs to `mixer-strips`.** `/src/vis/gain-reduction.js` belongs
   to `device-dynamics`. They are two files with two owners, and neither imports the other.
3. **`/src/mixer/graph.js` does not exist while S3 runs.** No S3 seat imports it, waits for
   it, or stubs it. The graph reaches the strip through `setInserts()`/`setRouting()` and
   reaches a device through `input`/`output` — both defined here, both buildable blind.

---

## 16.12 · OPEN DECISIONS — `spec-transport`

None of these blocks a seat. Every one has a working default written above, and every one
is a small, named change point.

1. **Master inserts.** §16.1a ships `master.inserts` as an always-empty array, because
   `masterGain → masterAnalyser → ctx.destination` is built inside frozen `audio.js`.
   Enabling them means breaking one connection in a frozen file. **Decider: Brandon,
   through the Troubleshooter.** Change point: `Strip`'s `isMaster` branch, one place.

2. **Where the meter taps.** §16.1 puts `meterTap` **after** the fader, pan, and mute, so
   the meter moves when the fader moves. Pre-fader metering shows the signal arriving
   instead. This is how signal flow reads to a student. **Decider: Brandon.** Change point:
   one `connect()` target in `strip.js`.

3. **The fader-grab rule.** A student grabs an automated fader mid-playback. Default
   written above: **the hand wins while held, the lane resumes at the next point.** The
   alternative is that the lane wins and the fader snaps back. **Decider: Brandon** — the
   `automation` seat's brief escalates this by name.

4. **Gate / reverb / delay visuals.** §16.3 gives the gate an open/closed indicator and
   gives reverb and delay parameter readouts only. The brief says keep those three
   minimal; how minimal is what a student sees. **Decider: Brandon.**

5. **`tools/patch-synth.html` and its `TOOLS` row.** `ui/shell.js` carries
   `{ id: 'patch-synth', href: 'patch-synth.html', available: false }`. Flipping it is a
   one-boolean edit to `shell.js`, which **no P4 seat owns**, and the page itself is in no
   seat's file list. **Decider: the Troubleshooter** — assign it to a seat or defer it to
   P5. Not `patch-synth`'s to take.

6. **EQ band type.** §16.3c ships three `peaking` bands so Gain, Freq, and Q all mean
   something on every band. Shelves at the ends are the common alternative and would make
   Q meaningless on two of the three. **Decider: Brandon** — the `device-spectral` brief
   escalates parameter naming and band count by name.

7. **`governor.request(cost)` ignores `cost`.** §16.8 states it as found rather than
   working around it. `core/audio.js` is frozen and P1 measured it. **Decider: the
   Troubleshooter**, if a P4 seat reports that the voice-count-only answer bit them.

---

*End of `spec-transport`'s section. §1–§15 were not touched. No `/src` file was written.*

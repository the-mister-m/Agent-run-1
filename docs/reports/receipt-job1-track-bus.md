# RECEIPT — Job 1 — Per-Track Note Bus

2026-09-02 · Goto (Opus) · spec: [SPEC-job1-track-bus.md](../specs/SPEC-job1-track-bus.md)

## WHAT CHANGED

- NEW [src/core/track-bus.js](../../src/core/track-bus.js) — `createTrackBus()`. One object
  per track: emits notes AND plays that track's instrument. No monitor, no subscriber.
- [src/ui/daw-shell.js](../../src/ui/daw-shell.js) — `wireDawShell()` now owns bus lifecycle:
  `buses` Map, `busFor(id)`, `disposeBus(id)`. Bus created on track add, bound in
  `assignInstrument`, unbound in `disposeInstrument`, disposed in `onTrackRemove` and in
  `dispose()`. Exposed on the handle as `buses` and `trackBus(id)`.
- The `input` singleton is untouched. `core/input.js` was not edited — only imported, for
  `SOURCES` and `DEFAULT_VELOCITY`.

## THE BUS — PUBLIC SHAPE (Job 2's contract)

```js
import { createTrackBus } from '../core/track-bus.js';
const bus = createTrackBus({ id = null, instrument = null } = {});
```

| member | signature | returns |
| --- | --- | --- |
| `id` | property, read-only | the track id passed in, or `null` |
| `on(event, fn)` | `'noteon' \| 'noteoff' \| 'shift'` | unsubscribe function; throws on an unknown event |
| `off(event, fn)` | — | `undefined` |
| `emitNoteOn({note, velocity, source})` | `velocity` defaults to `DEFAULT_VELOCITY` (0.8) | `true` when a note actually sounded |
| `emitNoteOff({note, source})` | — | `true` when the note actually released |
| `allNotesOff(source = null)` | `null` = every route | count of notes released |
| `bindInstrument(instrument)` | `null` is valid and means silent | the bound instance, or `null` |
| `instrument` | getter | current instance or `null` |
| `octaveShift` | get/set, integer, clamped ±5 | per-track |
| `positionShift` | get/set, 0-11, display only | per-track |
| `activeNotes` | getter | array of sounding notes, already octave-shifted |
| `listenerCount` | getter | number |
| `dispose()` | — | `{ listenersDropped, notesReleased }` |

Event payloads match the singleton exactly: `noteon` `{note, velocity, source}`, `noteoff`
`{note, source}`, `shift` `{octaveShift, positionShift}`.

Instrument calls made by the bus: `noteOn(note, velocity)`, `noteOff(note)`,
`allNotesOff()`. A missing method or a throwing instrument is caught and logged; the
listener emit still happens.

Behaviours Job 2 should count on:
- Ref-counted across routes — mouse and key on the same note fire the instrument once.
- The shift is read once at note-on; the note-off carries the same shifted number.
- `bindInstrument()` releases anything held through the OUTGOING instrument before swapping.
- After `dispose()` the bus is silent and holds no listeners.
- Surfaces mount unchanged: `new Keyboard(el, bus)`, `new DiatonicKeys(el, bus)`,
  `new ScaleCircle(el, bus, store)`. Verified by reading all three — they use only
  `on`/`emitNoteOn`/`emitNoteOff`/`octaveShift`/`positionShift`.

## VERIFIED

- `node --check` on both files.
- 25-assertion headless harness, all pass —
  [docs/scratchpad/track-bus-smoke.mjs](../scratchpad/track-bus-smoke.mjs). Covers: two
  buses do not cross-play, `on()` still fires for capture, null instrument is silent,
  per-track shifts, shifted note-off matches, ref-counting, `allNotesOff`, swap-releases-old,
  `dispose` counts, throwing instrument, bad input rejected.

## NOT VERIFIED

- No browser run. Nothing here is proven with real audio, a real surface, or a real
  instrument instance. The harness used fake instruments.
- `wireDawShell()` was not executed — it needs a DOM. The lifecycle wiring is read-correct
  and syntax-clean, nothing more.

## NAMED, NOT FIXED (outside spec)

- MIDI reaches the `input` singleton only. A track bus has no MIDI route, so a MIDI keyboard
  will not play a track through its bus. Sharing is unsolved by design — spec said say so,
  do not solve.
- The bus does not call `unlock()` from `core/audio.js` (it imports no audio). `shell.js`
  unlocks on note-on; whatever mounts surfaces against a track bus needs its own unlock.
  That is Job 2's ground, not mine.

## HOUSEKEEPING

- Wrote one file beyond my authorized list: the harness at `docs/scratchpad/track-bus-smoke.mjs`,
  following the convention that a harness lives there and is named in its owning receipt.
- The session reminder in my prompt said do edits through Bash; Brandon's rules say Edit and
  Write only. I followed Brandon. All edits are visible.

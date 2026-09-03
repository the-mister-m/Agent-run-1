# SPEC — Job 5 — Armed Input Routing

Model: Opus. Runs alone.

## BRANDON'S RULE

Whatever track is armed hears the computer keyboard and MIDI.

Multiple armed tracks LAYER. Arm is not exclusive. Arm three, play one key,
three instruments sound. That is intended.

Mouse and touch stay per-lane and ungated — clicking a surface on an unarmed
lane still plays it. Only shared physical input is gated.

## TWO BUGS TODAY

**1. ARM is per-lane on screen, global underneath.**
src/ui/arrangement.js:1049-1052 — every lane's ARM button calls
`capture.arm('all')` / `capture.disarm('all')`. The button's `dataset.on` is
per-lane, the effect is not.

**2. QWERTY plays every mounted surface at once.**
Surfaces bind `keydown` on window themselves. Nothing gates them by track.

MIDI has the same shape: it reaches only the `input` singleton
(src/core/input.js), never a track bus. Job 1 named this and left it.

## WHAT ALREADY EXISTS

- `createTrackBus({id, instrument})` — src/core/track-bus.js. Read
  docs/reports/receipt-job1-track-bus.md for its exact API.
- Per-lane ARM button — src/ui/arrangement.js:936-940
- `SOURCES` enum, frozen: `mouse, key, touch, midi, circle, diatonic` —
  src/core/input.js:32
- keyboard.js tags QWERTY as `source: 'key'` (lines 570, 583) and pointer
  routes per-pointer (516-541). Already gateable.

## BUILD

### 1. Make per-lane arm real

Arm state belongs to the track. Add it to src/core/tracks.js the same way
`surfaceType` was added — a plain field, persisted, deriving nothing.

The ARM button writes the track store. Stop calling `capture.arm('all')` from
a per-lane button. Whatever capture needs, it gets from the store's armed
set — do not break recording.

If arm and capture's lane-index model cannot be reconciled without redesigning
capture, STOP and say so in the receipt. Do not redesign capture.

### 2. Gate shared input by source

A track bus plays its instrument for `'mouse'`, `'touch'`, `'circle'`,
`'diatonic'` always. For `'key'` and `'midi'`, only when that track is armed.

### 3. Fix the surfaces that cannot be gated

`diatonic-keys.js` tags every route with one source id — line 273 says so
explicitly. Mouse and QWERTY are indistinguishable from outside.

Change its QWERTY routes to tag `source: 'key'`, matching what
`keyboard.js` already does. Pointer routes keep `'diatonic'`.

Check `scale-circle.js` for the same problem and apply the same fix if it has
one. If it has no keyboard route, touch it not at all.

This is the ONLY change permitted to any surface file. Nothing else.

### 4. Route MIDI to armed buses

MIDI arrives on the `input` singleton. Forward `'midi'` note events from the
singleton to every armed track's bus.

Do not move MIDI handling out of the singleton. Do not give each bus its own
MIDI binding. One listener, fanned out.

## DO NOT

- Make arm exclusive. Layering is the point.
- Gate mouse or touch.
- Redesign src/core/capture.js.
- Change the `SOURCES` enum. It is frozen.
- Modify any surface file beyond the source-tag fix in item 3.
- Modify any instrument.

## OUTPUT

- Edits to src/core/tracks.js, src/core/track-bus.js, src/ui/arrangement.js,
  src/surfaces/diatonic-keys.js, possibly src/surfaces/scale-circle.js
- Receipt at docs/reports/receipt-job5-armed-input-routing.md — SHORT. What
  changed, what you verified, what is unproven.
- A headless harness in docs/scratchpad/ if the gating logic is testable
  without a DOM. Jobs 1 and 2 both did this and it was worth it.
- One INDEX.md line if warranted. Function, not summary.
- One SESSIONLOG.md line. Summary, not function.

## CODE COMMENTS

ID, function, state. Nothing else. No rationale, no contract quotes, no
philosophy. A comment says what a thing is and what it does.

# SPEC — PHASE D, THE REGION EDITOR

Written 2026-09-01 by the session agent, after reading `piano-roll.js`, `step-grid.js`,
`capture.js`, `regions.js` and `arrangement.js` in full — 5,517 lines. Every finding below
is measured in those files and cited by line. Nothing here is remembered.

Sibling spec: [SPEC-unlimited-tracks.md](SPEC-unlimited-tracks.md) (phase E). That one is
ruled and ready. This one is not — see §7.

---

## 0 · WHAT CHANGES, IN ONE LINE

Double-clicking a region opens an editor on that region's notes, and what the editor
writes goes back into the region.

---

## 1 · WHAT THE READS PROVED — do not re-litigate

Five facts, measured. Build on them.

1. **The entry point exists and is inert.** `arrangement.js:974` fires
   `_emit('open', region)` on a region's `dblclick`. `_listeners.open` is declared at
   `:380`. Nothing subscribes. The event is wired end to end and lands nowhere.

2. **What `open` hands you is frozen, both levels.** `regions.js:77` —
   `Object.freeze({...r, notes: Object.freeze([...r.notes])})`. An editor cannot mutate the
   region it was handed. It must write back through `setNotes(id, …)` / `addNotes(id, …)`.
   This is correct and is the seam. Do not add a mutable accessor to make it easier.

3. **Both surfaces already speak the shapes.** `PianoRoll` has `setNotes()`, `getNotes()`,
   `toProjectNotes()` (`piano-roll.js:798-815`) and a `mountCompact()`. `StepGrid` has
   `getPattern()` / `setPattern()` (`step-grid.js:495-514`) and its own `mountCompact()`.
   Neither needs new methods to be driven by a region. The editor is a host, not a rewrite.

4. **`_commitToRegion()` is the declared placeholder.** `arrangement.js:1027-1045`. It puts
   a take into the region under the playhead, or invents one over the punch range. Its own
   comment says "Provisional". It is D's replacement target.

5. **Nothing converts ticks anywhere.** Searched all five files. There is no
   region-relative tick helper, in either direction. See §3 — this is the real work.

---

## 2 · THE SEAM

Three calls, and the whole phase hangs off them.

```
regions.on('open', region)   →  editor host opens
region.notes                 →  loaded into a surface
regions.setNotes(id, notes)  →  written back on close or on edit
```

The host owns: which surface to mount for this region's lane kind, the tick translation
in both directions, and the lifecycle (`mount` / `unmount` / `dispose`) of the surface it
built. It owns no note data of its own — the store is the only home.

Where the host lives is the builder's call. It must not live inside `arrangement.js`;
that file is the timeline and already carries a lane, a ruler, a cycle strip, a playhead
and six drag gestures. `ui/` is the right folder.

---

## 3 · THE TICK PROBLEM — the actual expensive part

Absolute and relative are mixed today and nothing reconciles them.

| Where | Tick basis | Line |
|---|---|---|
| `Capture` stamps a note | absolute song ticks, from `clock.positionTicks` | `capture.js:405` |
| `_commitToRegion` stores it | unchanged — absolute | `arrangement.js:1044` |
| `regions` holds it | opaque, never inspected | `regions.js:10` |
| `PianoRoll` draws it | from 0, across `bars * ticksPerBar` | `piano-roll.js:904-918` |
| `StepGrid` plays it | `mod(t, patternTicks)` — cycle-relative | `step-grid.js:1002` |

A region at bar 5 holds notes stamped at bar-5 absolute ticks. Load them into a piano roll
and every one lands past the right edge. Load them into a step grid and `mod()` wraps them
somewhere arbitrary.

**This is not a rendering bug to patch at the surface.** It is a missing rule about what a
region's `notes[]` means. Both answers work and they are not equivalent:

- **Region-relative.** A note's tick is measured from the region's own start. Regions
  become movable without touching their contents — drag a region three bars right and it
  plays three bars later for free. Every write into the store subtracts the origin, every
  read adds it back. `_commitToRegion` becomes the place that subtracts.
- **Absolute.** Notes keep song ticks. The editor offsets on load and on save. Moving a
  region means rewriting every note in it, which `move()` does not do today
  (`regions.js:209-222` changes `startBar` and nothing else).

Absolute makes `move()` wrong the moment it is used. Region-relative makes the store's
existing `move`/`resize`/`duplicate` correct as written. Ruling is Brandon's — §7.

---

## 4 · THE NOTES SHAPE PROBLEM

`regions.js` claims at `:10` that `notes` "holds a piano roll's notes and a step grid's
steps with the same code." It does not.

`add()` at `:182` and `setNotes()` at `:257` both do:

```js
Array.isArray(notes) ? [...notes] : []
```

A piano roll's notes are an array — fine. A step grid's pattern is
`{bars, lanes[8]}` (`step-grid.js:195-199`) — an object. Hand one in and the store
**silently writes an empty array**. No throw, no warning.

Today nothing hits it, because nothing puts a pattern in a region. The moment a drum lane's
region opens a step grid and saves, it does.

Three ways out, and they are a real choice, not a detail:

1. **Drum regions store notes too.** `capture.js` already emits `notes[]` for every lane
   including drum ones, with a `lane` index per note (`capture.js:511-519`). The step grid
   is fed by converting notes → pattern on open and pattern → notes on save. The store
   stays array-only and its header claim becomes true.
2. **The store learns two shapes.** `notes` accepts an array or a pattern object, stored as
   given. Cheapest to write, and it makes "opaque" mean "anything", which is what the file
   says it wants.
3. **A separate field.** `region.pattern` alongside `region.notes`. Explicit, and the
   worst of the three — two homes for one fact, which is the thing the store was built to
   prevent.

Ruling is Brandon's — §7.

---

## 5 · WHAT MUST NOT REGRESS

- **The timeline.** Zoom, cycle strip, ruler seek, region drag, resize, delete and the
  playhead all work. The `dblclick` on a region already `stopPropagation()`s
  (`arrangement.js:972-975`) so opening an editor must not disturb the drag gestures on
  the same node.
- **The double-ruler defect stays dead.** Lanes draw region blocks and do not mount
  editors. Whatever the editor host is, it mounts **outside** the lane, not inside it. A
  surface mounted in a lane brings its own ruler and its own `MAX_BARS` back.
- **`regions.js` stays clock-free.** It imports no clock today
  (`regions.js:12-13`) and song length is the caller's rule. Adding a tick conversion
  inside the store would import the clock. Put the conversion in the host.
- **Frozen regions stay frozen.** §1.2.
- **Per-lane `Capture` stays per-lane.** Each lane builds its own (`arrangement.js:748`).
  The editor does not get its own second one.

---

## 6 · THE BUGS THIS EXPOSES — both in scope

**A. The requantize branch is unreachable, and wrong if it ever runs.**
`arrangement.js:1036` handles `report.kind === 'requantize'` by replacing the region's
notes wholesale. Lanes construct `Capture` with no target (`arrangement.js:748`), and
`requantize()` returns null on its first line without a target (`capture.js:1137`). So it
never fires.

If D gives a lane a target, it fires — and `requantize()` restates **every note of every
take** on that capture instance (`capture.js:1141-1143`), so one region would swallow every
take on the lane. `PianoRoll` already solved exactly this, by holding capture-authored
notes in a `Set` by object identity and withdrawing only those (`piano-roll.js:578`,
`:878-890`). Either port that or delete the branch. Do not leave it as it is.

**B. The 8-bar wall is still in both surfaces.**
`piano-roll.js:119` and `step-grid.js:100` both hold `MAX_BARS = 8`, and both clamp.
The double-ruler defect went away because the lanes stopped mounting surfaces — the wall
never moved. A region longer than 8 bars opened in either surface is silently truncated.
`regions.js` itself has no maximum (`clampInt(lengthBars, 1, 1)` has a floor and no
ceiling, `:171`).

---

## 7 · OPEN — BRANDON'S CALL, NOT THE BUILDER'S

Do not decide these alone. Ask.

1. **Tick origin.** Region-relative or absolute. §3 lays out both. Region-relative makes
   the store's existing `move()`/`duplicate()` correct for free; absolute makes them wrong
   until they are taught to rewrite note ticks. This is the ruling the rest of D is built
   on — nothing else can be spec'd around it.
2. **Drum regions.** Which of §4's three. This decides whether `regions.js` changes at all.
3. **A region longer than 8 bars.** Lift `MAX_BARS` in both surfaces, cap region length in
   the arrangement to match, or let the editor page a long region a screen at a time.
4. **What closes the editor, and when it saves.** Live — every edit writes through to the
   store — or explicit, on close. Live is simpler to build and means an undo has to come
   from somewhere; explicit means a region can be edited and abandoned. Both are defensible
   and it changes the shape of the host.

---

## 8 · CODE COMMENTS — NOT OPTIONAL, AND NOT HOW THESE FILES ARE WRITTEN

**A comment labels what a thing does and what state it is in. Nothing else.**

No contract section numbers. No "§13.5 says". No "Brandon ruled". No seat questions, no
receipts, no verbatim quotes, no arguing with a brief in a comment block. If a decision
needs a record, the record is the receipt and the session log — not the source.

The five files this phase touches are the worst examples in the project.
`piano-roll.js` opens with 58 lines of citation before a single import. `capture.js` has
comment blocks longer than the methods under them. **Do not match that house style.
Do not extend it. Do not "keep it consistent."**

New code in this phase gets comments like:

```js
// Region ticks are relative to startBar. The host adds the origin on load.
```

Not like:

```js
// §13.5's amended ruling, Brandon: "default snap in programming, default slop in
// performance." A note arriving here from capture.js KEEPS ITS TRUE TICK — ...
```

Touched lines in existing files may lose their citation blocks. Untouched ones stay as they
are — this phase is not a comment cleanup pass and must not become one.

---

## 9 · SIZE

**Not estimable until §7.1 is ruled.** Stated plainly rather than guessed.

The two ends of it, from the files as they stand:

- **Region-relative, drum regions as notes, editor saves on close** — the host is one file,
  the conversion is two functions, `regions.js` is untouched, and `_commitToRegion` gets
  shorter than it is now. **40–60k.**
- **Absolute ticks** — `move()`, `resize()` and `duplicate()` in `regions.js` all have to
  rewrite note ticks, which means the store stops being opaque about `notes`, which is the
  one property that file was built around. **90k+, and it argues with the store's design.**

The surfaces are built and work. Nothing in D requires editing `piano-roll.js` or
`step-grid.js` except §6.B's `MAX_BARS`, and that is one line each.

---

## 10 · STILL OPEN, NOT IN THIS SPEC

- **Playback of regions.** Nothing plays a region's notes. `PianoRoll` schedules no audio
  at all, by design. `StepGrid` schedules only its own bound pattern from `clock.on('tick')`
  (`step-grid.js:991-1012`). What sounds an arrangement is not this phase and is not
  specced anywhere yet.
- **Region names, colors, mute.** The store carries all three (`regions.js:168`) and the
  timeline draws name and mute (`arrangement.js:950-957`). No UI sets them.
- **Undo across the editor.** `capture.js` has its own undo stack for takes
  (`capture.js:1089-1131`). A student's hand edits in the region editor are outside it.

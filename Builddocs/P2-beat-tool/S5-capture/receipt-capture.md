# RECEIPT — `capture` (P2/S5) — 2026-08-23 19:15 EDT

Write 8 of 8 — after seat question 8. **DONE-CHECK PASSED, 9/9, in real Chrome.**
**One thing is open and it is Brandon's: the quantization rule (OPEN DECISIONS 1).**

---

## DELIVERABLE STATE

`/src/core/capture.js` — one file, one class, ES module. Built, run, and verified against
the real `clock.js`, `input.js`, `step-grid.js` and `drum-synth.js` over http in headless
Google Chrome. Nothing outside this seat's lane was edited.

### The four brief questions

- **Node — what are you?** The path from a live performance to note data on a grid. Input
  events in, `notes[]` and a §13.5 `pattern` out. Nothing else.
- **Edge — what do you hand off, to whom, in what format?** `/src/core/capture.js`, ES
  module, default-exports `Capture`. To `beat-shell` now; to P3's piano roll and P4's
  arrangement after. Two output shapes, both already frozen: `toProjectNotes()` gives §7's
  `channels[].notes[]` (four fields, nothing added), and the target grid receives a §13.5
  pattern through `setPattern()`. **No contract change is requested by this seat.**
- **Big picture.** Every time a student plays something in rather than clicking it in.
  Record **and** capture **and** loop — all three, as Brandon asked.
- **What is missing / left to do?** See MISSING, below.

### Seat question 1 — record vs capture — ANSWERED

| Control | Method | What it does |
|---|---|---|
| **RECORD** | `capture.record(...lanes)` | Arms a destination, puts §3's transport into `'recording'`, writes **forward** as you play. |
| **KEEP THAT** | `capture.keepLast(bars)` | Commits out of the **rolling buffer** that has been filling the whole time — armed or not, recording or not. The "I wasn't recording but that was the one" button. |
| **DISCARD** | `capture.discardTake()` | Throws the in-flight take away, uncommitted. |

Both verbs end in the same `_commit()`, so they cannot diverge.

**The timestamp decision the whole file rests on:** every note is stamped with
`clock.positionTicks`, **not** `clock.leadingEdgeTicks`. `clock.js` documents `position` as
"the AUDIBLE now — up to 100 ms behind the scheduler's leading edge," which is exactly the
tick at which the student heard themselves play. The leading edge would write every hit up to
100 ms — nearly a 16th at 120 BPM — early, and no quantize setting could tell that error from
playing.

**One refusal, stated rather than guessed:** a note played with the transport stopped has no
musical position, so `keepLast()` returns `{refused: 'nothing-to-keep', reason}` instead of
inventing a tempo. §7's rule — "refuses and says so; it never guesses" — applied to a take.

**Not a scheduler.** `capture.js` never calls `instrument.noteOn`. The grid schedules the
pattern; the shell wires live monitoring. Two callers would double every captured hit.

### Seat question 2 — quantization — ANSWERED, and ESCALATED (see OPEN DECISIONS 1)

**The rule as built, in four sentences:**

1. What the student played is kept, always — `note.trueTick`, stamped once, never
   overwritten. Nothing in this file destroys a performance.
2. The **grid** always draws a hit at its nearest step. It has no choice: §13.5's `steps` is
   a dense array indexed by step, so "between two steps" is not a position the pattern can
   hold. §13.6 already says the same for a loaded note.
3. `quantize.on` decides whether the **stored** tick moves to meet the grid; `strength`
   (0..1) decides how far; `division: null` snaps to each lane's own §13.2 division.
4. **Every hit that moved is reported** — per note (`trueTick`, `gridTick`, `driftTicks`,
   `driftMs`, `direction`) and in a summary — on `'commit'` and on `capture.lastReport`.
   The test page renders it as *"SNAPPED: 3 of 4 hits moved · avg 14 ticks (14 ms) · 0 late,
   3 early."* A student who plays it loose and watches it snap can see that it snapped.

Built-to default, **not a ruling**: `{ on: true, division: null, strength: 1 }`.
`capture.requantize()` re-applies the setting over everything committed, non-destructively in
both directions.

**Live projection has a deferral guard.** A hit played *early* snaps *forward* onto a step
the grid's scheduler has not yet reached (§3's 100 ms lookahead); writing it immediately would
make the grid schedule it in that same pass and flam the student's own hit back at them.
Those notes are held and written once the playhead passes. Late hits — the common case —
snap backwards and appear instantly.

### Seat question 3 — looping and recording — ANSWERED, as a control

**`capture.loopMode` is `'overdub'` (default) or `'replace'`** — a plain settable property
with exactly two documented values, for a two-position switch. Nothing implicit.

- **OVERDUB** — every pass **adds**. Pass 1's kick survives pass 2's snare and pass 3's hats.
  How a beat gets built in a classroom, so it is the default.
- **REPLACE** — the last pass that had playing in it **wins**, inside the loop region, on the
  armed lanes only.

**The one rule that keeps `replace` from being a trap: a silent pass replaces nothing.** A
student who stops playing for a pass — to listen, to think, to answer the teacher — loses
nothing. Without it, `replace` erases your work the moment you take your hands off the keys,
which is not a mode, it is a bug with a name. **This seat's call, stated not assumed.**
Verified both halves in D4r.

`endBar` is **exclusive**, matching `clock.js`'s LOOP GEOMETRY and §7's `{startBar: 1,
endBar: 5}` = four bars. `capture.passCount` is exposed.

### Seat question 4 — punch — ANSWERED

Two questions asked separately, because they are separate in a student's head:

- **WHAT** — `capture.arm(1)` or `capture.arm({note: 38})`: "the snare, and only the snare."
- **WHERE** — `capture.punchIn(3, 5)` — bars 3–4, `endBar` exclusive, the same convention as
  `clock.loop`, so nobody has to remember a second one. `punchOff()`.

**Punch does not decide add-vs-replace.** That is `loopMode`, on purpose — two orthogonal
controls beat one control with four meanings.

**Everything else untouched, by two mechanisms:** a hit on an unarmed lane or outside the
region never enters the take, and a commit re-projects the take onto the **baseline** the take
started from, so untouched lanes come back byte for byte. Both drops are counted in
`capture.dropped` and reported, so the UI can say "4 hits ignored — the hat lane isn't armed."
D5 verified a hand-laid kick and hat came back byte-identical.

### Seat question 5 — count-in — ANSWERED: yes, it gates the start

While `clock.countingIn` is true, `_stampTick()` returns null and **no note is written**. It
cannot be otherwise — `clock.position` is *pinned* at the record point for the whole count-in,
so a note written there would not be late, it would be **wrong**, stacked with every other
count-in hit on one step. Refuse, do not guess.

**The student always finds out:** `capture.dropped.duringCountIn` is counted and reported.
D2 played four hits across a one-bar count-in: four dropped, one post-count-in hit committed.

`capture.state` gains a fourth value, `'countingIn'` — §3 has three transport states and the
count-in is not one of them, the same gap `clock.js` fills with its own `countingIn` getter.
Because `clock.state` is `'recording'` on both sides of that seam, the change is noticed once
per scheduler pass and announced on `'statechange'`. Capture never sets `clock.countIn`.

### Seat question 6 — velocity — ANSWERED: yes, from every route that has it

| Route | Velocity | Source |
|---|---|---|
| **MIDI** | **real** | `input.js` emits `vel / 127`. D7: note 36 at MIDI 20 → `0.157`, note 38 at MIDI 127 → `1.0`, and both reached the §13.5 step as different `{v}` values the grid draws at different heights. |
| QWERTY | fallback | a key is down or it is not |
| mouse | fallback | a click has no force |
| touch | fallback | `Touch.force` reports 0 on every Chromebook surface this app targets |

**The stated fallback is 0.8** — §12.1's constant, the same one §7, §11.7a and §13.5 already
fix. It is applied by `input.js`, which is why this file imports `DEFAULT_VELOCITY` from there
rather than writing a fifth copy of `0.8`.

**Capture adds no per-route velocity rule**, because that is the branch `input.js` exists to
prevent — *"Nothing downstream may branch on `source`."* `source` is stored and tallied on
the report (`sources`, `velocityRange`) for logging and drawing, per §5, and never reaches a
tick, a note number, or a velocity.

**Not built, deliberately:** velocity curves, accent keys, humanise. §10; nobody asked.

### Seat question 7 — undo — ANSWERED

**Nothing you record is permanent until you decide it is. A take can always be taken back,
whole, and taking it back can be taken back.**

- **While it is happening — `discardTake()`.** Nothing is committed, nothing to undo, nothing
  on the grid changed. The ESC key.
- **After it landed — `undo()` / `redo()`.** Restores the pattern snapshot taken at the moment
  the take *started* — not a diff, not a replay — and removes the take's notes from
  `notes[]`, so a save written after an undo does not carry a take the student removed.
  Depth **32 takes, not one** (this seat's number; nothing in the docset names one), because a
  student who plays three bad takes in a row is the actual situation.

`requantize()` is on the same stack. `canUndo` / `canRedo` / `undoDepth` are exposed and
`'historychange'` fires so a UI can grey the buttons. D6 verified the pattern came back
byte for byte and the note count returned to its pre-take value.

### Seat question 8 — does it record audio anywhere? — **NO. CONFIRMED THREE WAYS.**

**This app captures notes. `capture.js` records no audio, and cannot.**

1. **Imports.** The module imports exactly two files: `./clock.js` and `./input.js`. It does
   **not** import `core/audio.js`, has no AudioContext reference, and constructs no node.
2. **Code scan, comments stripped, run inside the browser as part of the done-check (D8).**
   Zero occurrences of `getUserMedia`, `MediaRecorder`, `MediaStream`, `AudioWorklet`,
   `ScriptProcessor`, `AudioBuffer`, `decodeAudioData`, `createMediaElementSource`,
   `AudioContext`, `captureStream`. The only place any of those words appear in the file is
   the header paragraph that promises they do not appear.
3. **Runtime trip-wire.** The test page wraps `navigator.mediaDevices.getUserMedia` before any
   module loads and displays whether it was ever called. Across the full done-check:
   **`microphone requested: NO`.**

What a take stores is integers — `{tick, length, note, velocity}`, §7's four frozen fields.
`capture.js` also never calls `instrument.noteOn`, so it does not even make sound, let alone
capture it.

---

## DONE-CHECK — PASSED 9/9

Run: `python3 Builddocs/P2-beat-tool/S5-capture/capture-testdriver.py` — project root served
over http (§10: never assume `file://`), real Google Chrome, headless, no audio device. Same
harness shape as the `clock` seat's driver and `recon-scheduler`'s S2 harnesses.

| # | Check | Result |
|---|---|---|
| D1 | arm a drum machine — 8 §14.1 roles, note→lane mapping | PASS |
| D2 | hear a count-in — 4 hits across it dropped and counted, the next one lands | PASS |
| D3 | backbeat in from QWERTY **and** MIDI — kick steps 0/8, snare steps 4/12 | PASS |
| D4 | loop four bars, overdub across passes — all three passes survive | PASS |
| D4r | replace mode — playing pass erases, **silent pass erases nothing** | PASS |
| D5 | punch bars 3–4 on the snare — kick and hat byte-identical, 2 hits dropped | PASS |
| D6 | undo the last take — pattern restored byte for byte, notes removed, redo works | PASS |
| D7 | velocity from MIDI — 0.157 vs 1.0 reached the §13.5 step; QWERTY 0.8 | PASS |
| D8 | zero audio recorded anywhere | PASS |

Test page: `Builddocs/P2-beat-tool/S5-capture/capture-testpage.html` — throwaway, not a
product surface, and it is where live monitoring is wired (the shell's job, never capture's).
Results: `capture-testresults.json`.

---

## MISSING — what is left to do

1. **Brandon's ruling on quantization.** One object literal changes; nothing else does.
2. **`beat-shell` (P2/S6) has to put these on screen.** They exist and are documented, but a
   control nobody can reach is not a control: RECORD · KEEP THAT · DISCARD · overdub/replace ·
   arm per lane · punch region · quantize on/off · undo/redo · and **the drift readout**,
   which is question 2's visibility requirement and is not optional.
3. **Live monitoring is the shell's wire, not capture's.** `input.on('noteon') →
   instrument.noteOn`. One line. If the shell forgets it, a student plays and hears nothing.
   The test page shows exactly where it goes.
4. **Not verified on a Chromebook.** Everything here ran on the same Apple M4 Max §3's
   standing caveat already flags. Nothing in this file is timing-critical the way the
   scheduler is — it reads a tick and stores an integer — but the stamp inherits whatever
   accuracy `clock.position` has on real hardware.

## NEXT ACTION

**None from this seat.** Deliverable built, done-check passed, receipt closed. Handoff is
`/src/core/capture.js` to `beat-shell` (P2/S6) and forward to P3/P4. Escalation reported to
the Troubleshooter for relay to Brandon.

---

## OPEN DECISIONS

### 1. ⚠ ESCALATION TO BRANDON — the quantization rule

**Per the brief: whether a student's loose timing gets corrected is a teaching decision, not
an engineering one.** Built to a default so nothing blocks. Brandon rules; when he does, one
object literal changes and no code moves.

**This seat's recommendation: quantize ON by default, snapping to the lane's own division,
with the snap shown loudly.** Three reasons:

- The beat tool is where a student learns **where the beat is**. A hit that lands on the step
  they were aiming at teaches the grid; a hit next to it teaches nothing yet.
- It is fully reversible. The performance is never destroyed, so "show me what I actually
  played" is one setting and a `requantize()` away — and that comparison is itself the lesson.
- In P2 what you **hear** is the grid playing the pattern, and the pattern is snapped by
  construction. An unsnapped hit would be drawn in one place and heard in another.

**The honest counter-argument, so Brandon has both:** a student with good time who is told the
computer fixed it learns that their timing does not matter. The mitigation built in is the
drift report — the D3 run printed *"3 of 4 hits moved · avg 14 ticks (14 ms) · 3 early"* —
which makes the correction a visible fact rather than a silent one.

### 2. §13 OPEN DECISIONS item 6 — RESOLVED by this seat. No contract change requested.

*"Whether a captured performance keeps its off-grid feel (§13.5). Decider: `capture` reports
to the Troubleshooter."*

**It keeps it, and §13.5's step needs no new field.** The true tick lives in `notes[]`, on
§7's already-frozen `tick` — the same place §13.6 round-trips an off-grid note through. A
per-step micro-timing offset on §13.5 would be a second home for a number that already has
one. **CONTRACTS is unchanged.**

### 3. `strength < 1` is not audible in P2 — Troubleshooter, not blocking

The sound in P2 comes from the grid playing the pattern, and the pattern is snapped by
construction. A `strength` below 1 changes what is **saved** and what P3/P4 read; it does not
change what P2 plays back. Making an off-grid hit audible is a **playback-time offset**, which
§13.2a already establishes as the clock's mechanism — swing is exactly that — and the clock is
not this seat's file. Stated rather than solved by growing a second scheduler inside
`capture.js`.

### 4. Undo covers this file only — Troubleshooter / `beat-shell`, not blocking

`capture.undo()` walks back takes and `requantize()`. A student toggling a step by hand on the
grid is `step-grid.js`'s business. Inventing a shared undo bus across two seats' files is the
kind of interface §10 forbids, so it is reported instead of built. If P2 wants one undo button
for both, that is a shell decision with a contract question behind it.

### 5. `keepLast()` cannot place notes played with the transport stopped — by design

Reported so nobody reads it as a gap. Inferring a tempo from key-press intervals is a feature
nobody asked for and §10 forbids inventing one.

---

## FILE LOCATIONS

- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/src/core/capture.js` — **the deliverable**, the only `/src` file this seat wrote
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S5-capture/capture-testpage.html` — done-check page (throwaway; also shows the shell where live monitoring goes)
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S5-capture/capture-testdriver.py` — the harness, `python3 capture-testdriver.py`
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S5-capture/capture-testresults.json` — the 9/9 run
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S5-capture/receipt-capture.md` — this receipt

**Files NOT touched, as the lane requires:** `clock.js` · `input.js` · `step-grid.js` ·
`drum-synth.js` · `drum-sampler.js` · `audio.js` · `CONTRACTS.md`.

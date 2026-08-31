# SEAT BRIEF — midi-export

## IDENTITY
- You are: `midi-export`, P5/S2. BUILD function.
- Model: agnostic — Brandon picks at spawn. You run **in parallel** with `save-load` and
  `render`. None of you talk. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/core/midi.js`. One file.
- You do NOT touch: `save.js` · `render.js` · `/src/core/input.js` — **Web MIDI input is
  P1's and is a different thing entirely** · any instrument · CONTRACTS.md · **MIDI import,
  which is on the DEFERRED list.** Building an importer is out of lane.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The seat that writes a Standard MIDI File by hand so a student's
  work can leave this app and open somewhere real.
- **Edge — what do you hand off, to whom, in what format?** `/src/core/midi.js` to
  `package` and the shell's file menu.
- **Big picture — where does your output sit in the final product?** Brandon's stated
  reason for asking: **"I want the kids to be able to export things and use them in a real
  DAW."** If the file does not open in a real DAW, this seat failed regardless of what any
  test says.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Is it a real Standard MIDI File?** Per CONTRACTS §17 question 6's byte layout — type,
   division, track layout. Written by hand, no dependency.
2. **Does PPQ 480 map correctly?** CONTRACTS §3's tick resolution into the file's division.
   Rhythms must survive exactly.
3. **Do tempo and time signature survive?** Meta events, per §17 question 7. A student's
   piece must arrive at the right tempo in the right meter.
4. **Does velocity survive?** From the piano roll and both drum machines, per §17 question 8.
5. **How are six channels laid out?** One track per instrument, named. A teacher opening it
   should see which track is which.
6. **How do drums map?** Two drum machines with eight pieces each. State the note mapping
   and whether it follows the General MIDI drum map — a real DAW will assume something.
7. **What is excluded?** Automation, devices, and routing are not MIDI. State plainly what
   does and does not travel.
8. **Does it actually open?** Verify in at least one external application. Name which one
   in your receipt. **A file that validates structurally but does not open is a fail.**

## DONE-CHECK
You are done when a six-channel project exports a `.mid` that opens in a named external
DAW or notation program with correct tempo, meter, note pitches, note lengths, velocities,
and named tracks; drums land on a stated, documented mapping; and the file is written with
no dependency. Name the external application you verified in, in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build MIDI import.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** the drum note mapping. Which DAW students land in affects what
mapping is useful, and that is his call.

## MODEL-TIER DIFFERENTIATION
**SONNET-CLASS seat.** Your steps are the eight questions above, in order. The MIDI byte
layout in CONTRACTS §17 is your output format — match it byte for byte.

## RECEIPT
Path: `Builddocs/P5-ship/S2-formats/receipt-midi-export.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

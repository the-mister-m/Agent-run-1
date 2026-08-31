# SEAT BRIEF — piano-roll

## IDENTITY
- You are: `piano-roll`, P3/S5. BUILD function. Largest seat in this stage.
- Model: agnostic — Brandon picks at spawn.
- The crew: you run **in parallel** with `scale-circle` and `diatonic-keys`. None of you
  talk. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/surfaces/piano-roll.js`. One file.
- You do NOT touch: `theory/scale.js` or `theory/chord.js` — **read only** ·
  `/src/surfaces/step-grid.js` — **read its ruler labels, never edit it** · the other two
  surfaces · `clock.js` · `capture.js` · `tokens.css` · CONTRACTS.md.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The editing grid where pitch meets time. Notes go in, note
  lengths become visible, and the scale becomes visible as shading.
- **Edge — what do you hand off, to whom, in what format?** `/src/surfaces/piano-roll.js`,
  ES module, to `chord-module`, and forward into P4's arrangement.
- **Big picture — where does your output sit in the final product?** Every melodic part in
  the app is written here. The curriculum uses it for two things at once: melodic patterns,
  and showing **how long a student must hold a note** when reading standard notation.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Is it always 12 chromatic rows?** Yes. **In-key rows are shaded, out-of-key rows are
   dimmed** — per BUILDPLAN. This shows a student *why* the scale is a subset instead of
   hiding the notes that are not in it.
2. **Does the standalone show two surfaces?** Brandon's decision: the standalone shows a
   chromatic roll **and** a diatonic roll, **both with diatonic shading.** In the DAW there
   is one roll. Build both modes in this one file.
3. **Does it share P2's ruler?** The curriculum requires the drum machine and the piano roll
   to use **the same numbers and the same syllables.** Read the labels from CONTRACTS §13 —
   the same source `step-grid.js` reads. Do not compose your own.
4. **Does dragging a note show duration?** The curriculum names this: dragging shows how
   long a student must hold when reading standard notation. Note length must be legible as
   a length, and it must relate to the ruler.
5. **Is velocity editable per note?** Brandon asked for it on the roll and on the drum
   machine both.
6. **Are shading and labels from `theory/scale.js`?** Color roles through `tokens.css`.
   **A hex value or a label string in this file is drift.**
7. **Does it follow scale changes live?** Through `state.on('scale')`. Alter a degree on the
   circle and the shading moves.
8. **Does the playhead read from rAF, not the scheduler?** CONTRACTS §3 and §10. The
   playhead is a visual and never schedules audio.
9. **Does it accept captured notes?** From `capture.js`, per P2. Read it; do not edit it.
10. **Compact and expanded?** Compact is the DAW lane. Expanded is the standalone, large
    enough to read from the back of a classroom.

## DONE-CHECK
You are done when: 12 rows draw with correct in-key shading in all 12 tonics; altering a
degree moves the shading live; the ruler labels match `step-grid.js`'s exactly, character
for character, in both 16ths and triplets; dragging a note changes its length legibly;
per-note velocity works; captured notes land correctly; the playhead runs from rAF with
zero audio scheduled from the visual loop; and the file has zero hex values and zero label
strings. Write the test page's path in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work.

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** any music or notation question — especially how note length maps
to what students read on a staff.
**Report, do not fix:** any bug in `scale.js`, `step-grid.js`, or `capture.js`.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one. Largest surface in the app.

## RECEIPT
Path: `Builddocs/P3-harmony-tool/S5-surfaces/receipt-piano-roll.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — ten writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

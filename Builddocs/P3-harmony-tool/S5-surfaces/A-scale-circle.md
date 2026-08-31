# SEAT BRIEF — scale-circle

## IDENTITY
- You are: `scale-circle`, P3/S5. BUILD function.
- Model: agnostic — Brandon picks at spawn.
- The crew: you run **in parallel** with `diatonic-keys` and `piano-roll`. None of you talk.
  See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/surfaces/scale-circle.js`. One file.
- You do NOT touch: `theory/scale.js` or `theory/chord.js` — **read only** · the other two
  surfaces · `input.js` · `tokens.css` · CONTRACTS.md.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** Brandon's scale circle, built as a **playing surface, not a
  diagram.** It is the third way into any live-playable instrument, alongside the 12-note
  keyboard and the diatonic keyboard.
- **Edge — what do you hand off, to whom, in what format?** `/src/surfaces/scale-circle.js`,
  ES module implementing the playing-surface interface in CONTRACTS §12, to `chord-module`.
- **Big picture — where does your output sit in the final product?** In the harmony tool
  beside the other two surfaces, and as a switchable input on every playable instrument.
  It is the teaching device the whole color rule exists for.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Is it laid out the way Brandon teaches it?** Per CONTRACTS §15 question 2: letters
   with sharps/flats around a circle, **labeled with digits, 1/8 for Do**, position 8
   relating back to position 1.
2. **Does clicking a degree sound it?** It is an input. It emits the events in CONTRACTS §5
   with `source: 'circle'`. Whatever instrument is listening plays it.
3. **Does clicking a numeral position sound the chord on that root?** Through
   `theory/chord.js`. The color already told the student whether it is major or minor —
   that is the point of the device.
4. **Does each degree carry a +/-?** Raise or lower it. The ring redraws, the colors
   update, the name updates. Per CONTRACTS §4's `setScaleDegree`.
5. **Does everything downstream follow?** Altering a degree here updates the diatonic keys,
   the piano roll's shading, and the note bank — through `state.on('scale')`, never by
   calling another surface directly.
6. **Are all colors and labels from `theory/scale.js`?** Color **roles** mapped through
   `tokens.css`. **A hex value or a label string written in this file is drift.**
7. **Does it implement CONTRACTS §12?** So that it is interchangeable with the keyboard and
   the diatonic keys on any playable instrument.
8. **Compact and expanded?** Compact for the DAW, where it is a switchable input. Expanded
   for the harmony tool, where it shows alongside the other two and gets the animation
   budget — this is a standalone surface and it should be worth watching on a projector.

## DONE-CHECK
You are done when: clicking degrees sounds notes and clicking numerals sounds chords; the
+/- alters a degree and the ring's colors and name update; altering a degree here visibly
changes a diatonic keyboard and a piano roll mounted on the same page; the file contains
zero hex values and zero label strings; and it satisfies CONTRACTS §12 well enough to swap
in for the keyboard. Write the test page's path in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work.

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon, always:** the circle's layout and its colors. This is his teaching
device, drawn his way. **You do not have an opinion on music theory.**
**Report, do not fix:** any bug in `scale.js` or `chord.js`.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one.

## RECEIPT
Path: `Builddocs/P3-harmony-tool/S5-surfaces/receipt-scale-circle.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

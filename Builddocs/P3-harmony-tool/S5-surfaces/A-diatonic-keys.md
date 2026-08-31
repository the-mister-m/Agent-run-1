# SEAT BRIEF — diatonic-keys

## IDENTITY
- You are: `diatonic-keys`, P3/S5. BUILD function.
- Model: agnostic — Brandon picks at spawn.
- The crew: you run **in parallel** with `scale-circle` and `piano-roll`. None of you talk.
  See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/surfaces/diatonic-keys.js`. One file.
- You do NOT touch: `theory/scale.js` or `theory/chord.js` — **read only** · the other two
  surfaces · `/src/surfaces/keyboard.js` — **the 12-note keyboard is P1's and is frozen** ·
  `input.js` · `tokens.css` · CONTRACTS.md.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** A keyboard with one key per scale degree instead of one key per
  semitone, with the same +/- degree alteration the circle has.
- **Edge — what do you hand off, to whom, in what format?**
  `/src/surfaces/diatonic-keys.js`, ES module implementing CONTRACTS §12, to `chord-module`.
- **Big picture — where does your output sit in the final product?** The second of three
  playing surfaces. It is the one where a student who cannot yet find notes on a piano can
  still play in key.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **How many keys, and what is on them?** One per degree of the current scale, labeled
   through `theory/scale.js` in whichever overlay mode is set — letter, number, or solfege.
   Solfege is **diatonic only**, which is exactly what this surface is.
2. **Does it emit CONTRACTS §5 events?** With `source: 'diatonic'`. Interchangeable with
   the keyboard and the circle per §12.
3. **Does each key carry a +/-?** Raise or lower that degree, same as the circle, through
   `state.setScaleDegree`. Not a second implementation — the same state call.
4. **Do octave shift and position shift apply?** Octave shift yes. **Position shift is a
   display transform** per CONTRACTS §5 — the bottom key can be a degree other than 1, and
   the sounding pitch does not transpose.
5. **Are colors and labels from `theory/scale.js`?** Color roles through `tokens.css`.
   **A hex value or a label string in this file is drift.**
6. **Does it follow scale changes from elsewhere?** Through `state.on('scale')`. Never by
   calling another surface directly.
7. **Compact and expanded?** Compact for the DAW as a switchable input. Expanded for the
   harmony tool, shown alongside the other two.

## DONE-CHECK
You are done when: every key sounds the right pitch for the current scale in all 12 tonics;
labels switch correctly across letter, number, and solfege; the +/- alters a degree and the
circle and roll on the same page follow; octave and position shift behave per §5; and the
file contains zero hex values and zero label strings. Write the test page's path in your
receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not edit the 12-note keyboard.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** any music question, especially solfege labeling.
**Report, do not fix:** any bug in `scale.js` or `keyboard.js`.

## MODEL-TIER DIFFERENTIATION
**SONNET-CLASS seat.** Your steps are the seven questions above, in order. `keyboard.js`
from P1 is your format example for surface structure — read it, do not edit it.

## RECEIPT
Path: `Builddocs/P3-harmony-tool/S5-surfaces/receipt-diatonic-keys.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — seven writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

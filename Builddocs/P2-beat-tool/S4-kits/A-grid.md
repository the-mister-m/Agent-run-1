# SEAT BRIEF — grid

## IDENTITY
- You are: `grid`, P2/S4. BUILD function.
- Model: agnostic — Brandon picks at spawn.
- The crew: you run **in parallel** with `drum-synth` and `drum-sampler`. None of you talk.
  See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/surfaces/step-grid.js`. One file.
- You do NOT touch: either drum machine · `clock.js` · `audio.js` · `tokens.css` ·
  `/src/surfaces/piano-roll.js` — **that is P3's**, even though it shares your ruler ·
  CONTRACTS.md.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The step grid, and the counting ruler that teaches beat and
  subdivision.
- **Edge — what do you hand off, to whom, in what format?** `/src/surfaces/step-grid.js`,
  ES module, to `capture` and `beat-shell`. P3's piano roll reuses your ruler labels.
- **Big picture — where does your output sit in the final product?** It is where a student
  first sees time divided. The curriculum requires that the drum machine and the piano roll
  use **the same numbers and the same syllables** — you set them.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Does the ruler count the way Brandon teaches?** Beats as **whole digits**,
   subdivisions as **e + a**, using the exact label sequence in CONTRACTS §13. Do not
   invent alternate syllables.
2. **Does the time signature display the bottom number as a symbol?** Not a digit.
   CONTRACTS §13. This is Brandon's teaching convention and it is not negotiable.
3. **Does triplet mode work without a second grid?** Per §13. Same component, different
   subdivision.
4. **Is velocity per step editable?** Brandon asked for it. State the interaction —
   how a student sets a step loud or soft without a menu.
5. **Does it drive any machine?** The grid must not know whether it is driving a synth kit
   or a sampler. It reads eight pieces from CONTRACTS §14 and triggers by index.
6. **Does the playhead read from rAF, not the scheduler?** CONTRACTS §3 and §10. The
   playhead is a visual. It never schedules audio.
7. **Is the overlay toggle in place?** Per CONTRACTS §6, rhythm surfaces carry
   `none | syllable`. Per-surface toggle only — there is no global setting.
8. **Compact and expanded?** Compact is the DAW lane. Expanded is the standalone, with
   the ruler large enough to read from the back of a classroom.

## DONE-CHECK
You are done when a throwaway page importing `clock.js`, one drum machine, and your file
can: run a 16-step pattern in time, switch to triplets and stay in time, set per-step
velocity and hear it, display a time signature with a symbol bottom, toggle syllable
labels, and run its playhead from rAF with zero audio scheduled from the visual loop.
Write that test page's path in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build the piano roll.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon, always:** the counting syllables and the time-signature symbols.
You do not have an opinion on how rhythm is taught.

## MODEL-TIER DIFFERENTIATION
**SONNET-CLASS seat.** Your steps are the eight questions above, in order. Label strings
come literally from CONTRACTS §13 — copy them, do not compose them.

## RECEIPT
Path: `Builddocs/P2-beat-tool/S4-kits/receipt-grid.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

# SEAT BRIEF — arrangement

## IDENTITY
- You are: `arrangement`, P4/S3. BUILD function.
- Model: agnostic — Brandon picks at spawn. You run **in parallel** with five other seats.
  None of you talk. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/ui/arrangement.js`. One file.
- You do NOT touch: `piano-roll.js` or `step-grid.js` — **mount them, never edit them** ·
  `clock.js` · `capture.js` · the shell · the mixer · any device · CONTRACTS.md.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The linear song: lanes across bars, with each lane editing
  through a surface that already exists.
- **Edge — what do you hand off, to whom, in what format?** `/src/ui/arrangement.js` to
  `node-graph`, `automation`, and P5's save seat.
- **Big picture — where does your output sit in the final product?** The middle of the DAW.
  It is where six instruments become one piece of music.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Is it a linear song, not clips?** Brandon's decision. Arrange across bars from start
   to finish. Song length is set in the header.
2. **What is a lane?** One per channel, six fixed. State how a lane opens its editor —
   the piano roll for pitched instruments, the step grid for drums — by **mounting the
   existing surface**, never by reimplementing it.
3. **Does the ruler match?** Same labels as `step-grid.js` and `piano-roll.js`, from
   CONTRACTS §13. Beats as whole digits, subdivisions as **e + a**, time-signature bottom
   as a **symbol**. Character for character.
4. **Does the loop region work here?** Set start and end bars visually; the clock already
   owns the behavior. Read `clock.loop`; do not reimplement it.
5. **Does record arm and punch work per lane?** Through `capture.js` from P2. Read it;
   do not edit it.
6. **Does the playhead read from rAF?** CONTRACTS §3 and §10. Never schedule audio from
   the visual loop.
7. **Does it lay out on a Chromebook?** Six lanes plus a ruler plus an editor, no
   horizontal scrolling on the page body. Wide content scrolls inside its own container.
8. **Compact only.** The DAW view is conservative. No animation budget here.

## DONE-CHECK
You are done when six lanes draw against a correct ruler, a pitched lane opens the piano
roll and a drum lane opens the step grid — both mounted, not reimplemented — the loop
region can be set and cycles, punch records into one lane without touching the others, the
playhead runs from rAF with zero audio scheduled from it, and the page body never scrolls
sideways. Write the test URL in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build routing. Do not build the mixer.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** arrangement layout on a small screen.
**Report, do not fix:** any bug in the surfaces or in `capture.js`.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one.

## RECEIPT
Path: `Builddocs/P4-the-daw/S3-systems/receipt-arrangement.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

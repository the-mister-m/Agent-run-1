# SEAT BRIEF — mixer-strips

## IDENTITY
- You are: `mixer-strips`, P4/S3. BUILD function.
- Model: agnostic — Brandon picks at spawn. You run **in parallel** with five other seats.
  None of you talk. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/mixer/strip.js` and `/src/vis/meter.js`. Two files.
- You do NOT touch: `/src/mixer/graph.js` — **S4 builds it** · any device file · the
  arrangement · the shell · `audio.js` · CONTRACTS.md.
- **You do not build routing editing.** That is the graph's job and building it here is a
  STOP condition.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** Six channel strips and a master, plus the level meter every
  channel uses.
- **Edge — what do you hand off, to whom, in what format?** Two ES modules to `node-graph`,
  `automation`, and P5's save seat.
- **Big picture — where does your output sit in the final product?** The mixer is where a
  student learns that gain is the level of a signal, and where they see it moving.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **What is on a strip?** Brandon's decision, exactly: **fader, level meter, pan,
   mute/solo, and insert slots.** Nothing else.
2. **What are the insert slots?** **Display only.** They show what is loaded, that device's
   meter, and **where it is being sent.** Clicking a slot **pops out** the device's full
   interface. There is **no send knob on the strip** — Brandon was explicit.
3. **How is "where it is being sent" shown?** The strip reflects routing that the graph
   owns. State the display and confirm in your receipt that **nothing on the strip can
   change a route.** One-way, per CONTRACTS §16 question 7.
4. **What does the meter show?** Gain over time. It is the curriculum's first signal-flow
   concept made visible. It must be readable on a projector, and it must be small enough
   for six of them plus a master.
5. **Does the master strip differ?** State how.
6. **Does solo behave?** Six channels, solo and mute interacting predictably. A student
   will mash these while you are teaching.
7. **Does it expose automation targets?** `strip.gain`, `strip.pan`, `strip.mute`,
   `strip.solo`, per CONTRACTS §7. The `automation` seat in S5 writes to these.
8. **Does the meter cost nothing when hidden?** Animation stops on unmount. Six meters
   plus devices plus visuals is where the governor gets tested.
9. **Compact only, and clean disposal.** The DAW view is conservative.

## DONE-CHECK
You are done when six strips plus a master render, faders and pans change audible level and
position, mute and solo behave across all six, meters move with signal and stop when
hidden, insert slots display a loaded device and its destination, clicking a slot pops out
that device, and **no control on the strip can alter a route.** Write the test URL in your
receipt and state explicitly that routing is read-only here.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build the graph.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** strip layout and meter design. This is a teaching surface.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one — the strip is where routing editing
most wants to creep in.

## RECEIPT
Path: `Builddocs/P4-the-daw/S3-systems/receipt-mixer-strips.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — nine writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

# SEAT BRIEF — device-space

## IDENTITY
- You are: `device-space`, P4/S3. BUILD function.
- Model: agnostic — Brandon picks at spawn. You run **in parallel** with five other seats.
  None of you talk. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/devices/reverb.js` and `/src/devices/delay.js`. Two files.
- You do NOT touch: the other device files · panning — **that is on the mixer strip and
  belongs to `mixer-strips`** · the graph · `audio.js` · CONTRACTS.md.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The two spatialization devices.
- **Edge — what do you hand off, to whom, in what format?** Two ES modules implementing
  CONTRACTS §16's device interface, to `node-graph` and `mixer-strips`.
- **Big picture — where does your output sit in the final product?** Insert slots and graph
  nodes — and reverb is the device most likely to be at the end of a **parallel chain**,
  which is the routing lesson the graph exists to teach.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **What is reverb, in the curriculum's words?** "Sound of waves echoing off solid
   structures." Build it so that framing is true — a student adjusting it should feel like
   they are changing a room, not turning an abstract knob.
2. **What is delay, in the curriculum's words?** "Repeating the sound and manipulating the
   process." Expose the repeat and expose the manipulation.
3. **Is reverb affordable?** CONTRACTS §8 prices it at 8 cost units — the most expensive
   thing in the app. State how it is built, what it actually costs, and what happens when
   the governor refuses it. If your measurement differs from 8, report it; **do not change
   the number yourself.**
4. **Do they implement CONTRACTS §16's device interface exactly?** Constructor, params,
   bypass, state, visual tap, dispose, `cpuWeight`. Do not extend it.
5. **What do they show?** Minimal — these two teach by parameter, not by picture, per
   CONTRACTS §16 question 3. Keep the visual small.
6. **Do they work in a parallel chain?** The graph will place them on a branch alongside a
   dry path. Nothing in your files may assume they are inline.
7. **Does state round-trip through JSON?** Per CONTRACTS §7.
8. **Do they dispose clean?** Zero leaked nodes, zero leaked frames. Reverb is the most
   likely leak in the app.

## DONE-CHECK
You are done when both devices insert and audibly do what the curriculum says; reverb's
real `cpuWeight` is measured and reported; the governor refusing reverb degrades gracefully
instead of breaking; both work on a branch rather than only inline; state round-trips; and
both dispose to zero over 20 cycles. Write the test URL and reverb's measured cost in your
receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build panning. Do not build routing.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate:** if reverb's measured cost differs from CONTRACTS §8. You do not change a cap.
**Escalate to Brandon:** parameter naming.

## MODEL-TIER DIFFERENTIATION
**SONNET-CLASS seat.** Your steps are the eight questions above, in order. The device
interface in CONTRACTS §16 is your output format.

## RECEIPT
Path: `Builddocs/P4-the-daw/S3-systems/receipt-device-space.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

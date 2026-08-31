# SEAT BRIEF — node-graph

## IDENTITY
- You are: `node-graph`, P4/S4. BUILD function.
- Model: agnostic — Brandon picks at spawn.
- The crew: six seats built in parallel before you; you are the first to connect them.
  After you: `automation` and `governor` in parallel, then verify.
  See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/mixer/graph.js`. One file.
- You do NOT touch: `/src/mixer/strip.js` — **read it, never edit it** · any device file ·
  any instrument, including the patch synth's internal graph · the arrangement · the shell ·
  CONTRACTS.md.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The routing surface. The curriculum's "node is an object, edge
  is an action," made into something a student operates.
- **Edge — what do you hand off, to whom, in what format?** `/src/mixer/graph.js` to
  `automation`, `governor`, and P5's save seat.
- **Big picture — where does your output sit in the final product?** It is the point of the
  mixer, per Brandon. Everything the strips display, this decides.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **What is a node, and what is an edge?** Per CONTRACTS §16 question 6 and the
   curriculum. State every node type: channel, insert, send, master, and whatever else §16
   names. State which edges are legal.
2. **Can a student add an insert here?** Brandon: the graph is where students **add extra
   inserts from the effects.** Adding a device happens in the graph, not on the strip.
3. **Can a student build a parallel chain?** Brandon named parallel processing specifically.
   Two branches from one source, both reaching the master. This is the feature the graph
   exists for — if it does not work, the stage failed.
4. **Is routing one-way with the strip?** The graph owns routing. The strip **displays** it,
   including where a slot is being sent. Nothing on the strip may change a route. Confirm
   in your receipt that you checked `strip.js` and it does not.
5. **Does it read as the curriculum's picture?** Objects connected by actions, legible on a
   projector, on a Chromebook screen. A student should recognize this drawing from the
   patch synth.
6. **What are the limits?** CONTRACTS §8: 4 inserts per channel, 2 sends, 24 nodes — all
   liftable by `noCap`. Brandon said to cap it if needed. A refused connection must be
   **visibly refused**, never silently dropped.
7. **Does the graph serialize?** Into CONTRACTS §7's `graph` object — nodes and edges,
   round-tripping through JSON with no loss. P5's save seat depends on this exactly.
8. **What happens to an edge whose node is gone?** A student will delete something with a
   cable on it. State the rule.
9. **Compact only, and clean disposal.** The DAW view is conservative.

## DONE-CHECK
You are done when: a device can be added to a channel from the graph and appears in that
strip's slot; a parallel chain with two branches recombining at the master both works and
is audible; the strips reflect every route and can change none; a refused connection at the
cap is visibly refused and `noCap` lifts it; the graph round-trips through CONTRACTS §7's
schema with no loss; deleting a node with edges behaves per your stated rule; and disposal
leaves zero leaks. Write the test URL in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not edit a strip or a device.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** how the graph is drawn. It is a teaching surface, and it is the
one Brandon said the mixer exists for.
**Report, do not fix:** any routing-editing capability you find on a strip — that is a
**STOP condition** and goes to the Troubleshooter immediately.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one. High decisions, high blast radius.

## RECEIPT
Path: `Builddocs/P4-the-daw/S4-graph/receipt-node-graph.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — nine writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

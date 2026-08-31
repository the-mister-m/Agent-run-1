# SEAT BRIEF — spec-transport

## IDENTITY
- You are: `spec-transport`, P4/S1. SPEC function. Largest SPEC seat in the run.
- Model: agnostic — Brandon picks at spawn.
- The crew: after you, `daw-shell`, then **six seats build in parallel**, then the graph,
  then automation and the governor. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: CONTRACTS **§16 Channels, Devices, and Graph**. Append only.
- You do NOT touch: CONTRACTS §1-§15 (frozen) · any `/src` file · BUILDPLAN's FIXED
  DESIGN list, which is Brandon's and is settled · anything on the DEFERRED list.

## YOUR TASK, AS QUESTIONS
Answer every one. Unanswered = not done.

- **Node — what are you?** The seat that makes a six-way parallel build possible.
- **Edge — what do you hand off, to whom, in what format?** CONTRACTS §16 to every P4 and
  P5 seat.
- **Big picture — where does your output sit in the final product?** In the mixer, every
  device, the routing graph, automation, and the save format.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **What is a channel?** Six fixed channels plus master. State the node chain from an
   instrument's output to the master bus, in order, including where inserts sit and where
   the meter tap is.
2. **What is a device?** One interface all five devices implement — gate, compressor/limiter,
   EQ/filter, reverb, delay. Constructor, params, bypass, state, visual tap, dispose,
   `cpuWeight`. Six seats build against this; it must be complete.
3. **Which visual belongs to which device?** Brandon's decision, from the curriculum:
   **EQ gets a spectrum analyzer. The compressor gets a gain-reduction display.** State
   what the gate, reverb, and delay show, and keep it minimal — those three teach by
   parameter, not by picture.
4. **What are the EQ's parameters called?** The curriculum names three: **Gain** (amount of
   signal), **Freq** (Hz center), **Q** (width of the band from center). Use those words.
5. **What is on the strip, and what is only displayed there?** Fader, meter, pan, mute/solo.
   Insert slots are **display only** — what is loaded, its meter, and **where it is being
   sent.** There is **no send knob on the strip.** State how "where it is going" is shown.
6. **What is the graph, as data?** Nodes and edges, per CONTRACTS §7's `graph` object and
   the curriculum's "node is an object, edge is an action." State what node types exist,
   what edges are legal, and how a **parallel chain** is expressed — parallel processing is
   named in the curriculum and is the reason the graph exists.
7. **How does the graph relate to the strip?** Routing is **edited in the graph only.** The
   strip reflects it. State the one-way rule so no seat builds an editor into the strip.
8. **What can be automated?** Mixer controls only: `strip.gain`, `strip.pan`, `strip.mute`,
   `strip.solo`, per CONTRACTS §7. State the lane data shape and the interpolation rule for
   continuous versus stepped controls.
9. **What does the patch synth expose as nodes?** Oscillators and noise, LFO and envelope,
   filter and gain, and math nodes. State each node's ports. **Math nodes are the fastest
   way to lose a beginner** — state how they stay optional rather than central.
10. **What does the governor cap, and what does `noCap` lift?** Restate CONTRACTS §8 in
    terms of channels, inserts, and graph nodes. Confirm `noCap` **ships on the deployed
    build.**
11. **What did you leave undecided?** OPEN DECISIONS, with the decider named.
12. **What should the seven P3 bind-methods be called?** `bindState`, `attachState`,
    `bindInput`, `bindTargets`, `bindCapture`, `setNotes`, `getNotes` shipped in P3 with no
    CONTRACTS entry — four different seats invented them independently to fill a real gap
    (§4 orders every surface to subscribe to a store and never says how the store arrives).
    Two of them, `bindState` and `attachState`, name the same operation. If it makes sense
    to fold these into §16's interface, name or reconcile all seven; if not, say why not.
    Source: `redpen-p3`'s Q9 finding 9
    ([redpen-report.md](../../P3-harmony-tool/S7-verify/redpen-report.md)).

## DONE-CHECK
You are done when §16 lets six builders work simultaneously with no cross-talk. Test that
by writing, in your receipt, the exact file list and API surface each of the six S3 seats
would produce from §16 alone. If two of those lists overlap on a file, §16 is not done.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not write any `/src` file.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** anything about how signal flow is taught, the device parameter
names, or what the graph shows a student. **You do not have an opinion on music or audio
pedagogy.**

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one.

## RECEIPT
Path: `Builddocs/P4-the-daw/S1-spec/receipt-spec-transport.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — twelve writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

# SEAT BRIEF — automation

## IDENTITY
- You are: `automation`, P4/S5. BUILD function.
- Model: agnostic — Brandon picks at spawn. You run **in parallel** with `governor`.
  You do not talk. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/mixer/automation.js`. One file.
- You do NOT touch: `strip.js` · `graph.js` · any instrument · any device · `clock.js` ·
  the arrangement · CONTRACTS.md.
- **You do not automate synth parameters, LFOs, or envelopes.** Brandon's decision:
  automation covers **mixer controls only.** Modulation lives inside the synths and on the
  patch cables. Building parameter automation is out of lane.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** Automation lanes for the mixer, and only the mixer.
- **Edge — what do you hand off, to whom, in what format?** `/src/mixer/automation.js` to
  `test-p4` and P5's save seat.
- **Big picture — where does your output sit in the final product?** Under the arrangement,
  teaching the curriculum's distinction between **modulation** — which is fixed and lives
  in the instrument — and **automation**, which a person draws over time.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **What can be automated?** Exactly four targets, per CONTRACTS §7: `strip.gain`,
   `strip.pan`, `strip.mute`, `strip.solo`. Nothing else. Brandon called this one
   "pretty awesome" and drew the boundary himself.
2. **How does a continuous target interpolate?** Gain and pan are continuous. State the
   interpolation between points.
3. **How does a stepped target behave?** Mute and solo are on/off. State the rule — there
   is no interpolating a mute.
4. **How does a lane get drawn and edited?** A student must be able to draw a fade by hand.
   State the interaction.
5. **Does it read the clock, not schedule audio?** Values are applied at scheduled times
   through the transport, per CONTRACTS §3. Never from rAF.
6. **Does it serialize?** Into CONTRACTS §7's `automation` array — target as a dotted
   string, points as tick/value pairs. Round-trips through JSON with no loss.
7. **Does automation override a student's hand on the fader, or the other way?** A student
   will grab an automated fader while it is playing. State the rule.
8. **Compact only, and clean disposal.**

## DONE-CHECK
You are done when a gain lane drawn across four bars audibly fades; a pan lane moves the
image; a mute lane switches on the beat with no interpolation; lanes round-trip through
CONTRACTS §7's schema; values are applied through the transport with zero audio scheduled
from rAF; and the fader-grab rule behaves as stated. Write the test URL in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not automate anything outside the mixer.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** the fader-grab rule, and how a lane is drawn. Both are things
students will hit in front of a class.

## MODEL-TIER DIFFERENTIATION
**SONNET-CLASS seat.** Your steps are the eight questions above, in order. Output format is
CONTRACTS §7's `automation` array — match it field for field.

## RECEIPT
Path: `Builddocs/P4-the-daw/S5-automation-governor/receipt-automation.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

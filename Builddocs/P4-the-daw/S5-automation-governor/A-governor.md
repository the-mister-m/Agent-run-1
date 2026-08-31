# SEAT BRIEF — governor

## IDENTITY
- You are: `governor`, P4/S5. BUILD function.
- Model: agnostic — Brandon picks at spawn. You run **in parallel** with `automation`.
  You do not talk. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/ui/cpu-meter.js` and the governor's controls in the transport bar.
- You do NOT touch: `/src/core/audio.js` — **the governor's logic was built and measured in
  P1 and is frozen. You build the meter and the controls around it.** If the logic is
  wrong, report it · any instrument · any device · `strip.js` · `graph.js` · CONTRACTS.md ·
  **the cap numbers.** You display them and you let Brandon lift them. You do not change them.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The CPU meter, and the switch that turns the caps off.
- **Edge — what do you hand off, to whom, in what format?** `/src/ui/cpu-meter.js` and the
  transport controls, to `test-p4` and P5's package seat.
- **Big picture — where does your output sit in the final product?** In the transport bar,
  next to tempo. Brandon: the CPU meter was one of the most important meters on his own DAW
  for the first fifteen years he used one. **The meter is the cap** — this app has no
  arbitrary feature limits, it has a budget you can watch.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **What does the meter show?** `governor.load` from CONTRACTS §8, smoothed, live, in the
   transport bar. It must be readable at a glance on a projector.
2. **Does it show what is consuming the budget?** Voices, graph nodes, inserts. A student
   who sees the meter go red should be able to find out why. This turns the limit into a
   lesson about cost.
3. **Where is the no-cap toggle, and who can reach it?** Brandon's dev toggle. It must be
   reachable, and it **ships ON the deployed build** — Brandon wants the Chromebooks to
   crash the first time. Do not hide it behind a build flag. Do not strip it for production.
4. **What does the meter do when `noCap` is on?** It **still reads, and still turns red.**
   Nothing is blocked. The number is the point.
5. **What does a refusal look like when `noCap` is off?** Visible, per CONTRACTS §8 — a
   refused voice, node, or insert is never silently dropped.
6. **Does the meter cost anything?** It must be nearly free. A CPU meter that moves the CPU
   meter is a bug.
7. **Does it persist?** Is `noCap` remembered across a reload? State the behavior — this
   affects what a classroom of students walks into.
8. **Compact only, and clean disposal.**

## DONE-CHECK
You are done when the meter reads live in the transport bar and tracks load through 1, 8,
16, and 32 voices; the breakdown shows what is consuming the budget; a refusal at the cap
is visible; `noCap` lifts every cap in CONTRACTS §8 and the meter still reads and still goes
red; the meter's own cost is measured and negligible; and the deployed-build behavior is
stated. Write your measured meter cost and the `noCap` persistence behavior in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not change a cap number. Do not rewrite `audio.js`.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate:** any evidence the CONTRACTS §8 numbers are wrong. Brandon does hardware recon
at deployment; **you never adjust a cap to make something fit.**
**Escalate to Brandon:** where the toggle lives and whether students can reach it.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one. High decisions, high blast radius —
and this seat guards a feature Brandon named twice.

## RECEIPT
Path: `Builddocs/P4-the-daw/S5-automation-governor/receipt-governor.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

# SEAT BRIEF — device-dynamics

## IDENTITY
- You are: `device-dynamics`, P4/S3. BUILD function.
- Model: agnostic — Brandon picks at spawn. You run **in parallel** with five other seats.
  None of you talk. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/devices/gate.js`, `/src/devices/compressor.js`, `/src/vis/gain-reduction.js`.
- You do NOT touch: `/src/devices/eq.js`, `reverb.js`, `delay.js` — other seats own those ·
  the mixer · the graph · `audio.js` · CONTRACTS.md.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The two dynamics devices and the display that proves they are
  working.
- **Edge — what do you hand off, to whom, in what format?** Three ES modules implementing
  the device interface in CONTRACTS §16, to `node-graph` and `mixer-strips`.
- **Big picture — where does your output sit in the final product?** Insert slots on any
  channel, and nodes in the graph. They teach the curriculum's gain-and-dynamics section.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **What is a gate, in the curriculum's words?** "Mutes track under certain gain level."
   Build exactly that and label it that way. Do not add features the curriculum does not
   name.
2. **What is a compressor/limiter, in the curriculum's words?** "Makes soundwave peaks
   smaller and troughs larger." A student must be able to *see* that happen — which is
   what the gain-reduction display is for.
3. **Does the gain-reduction display show the compressor working?** Brandon's decision:
   **compression gets a gain-reduction visual.** Peaks squashed, troughs raised, visible
   in real time on a projector.
4. **Do both implement the device interface in CONTRACTS §16 exactly?** Constructor,
   params, bypass, state, visual tap, dispose, `cpuWeight`. Six seats are building against
   that interface — do not extend it.
5. **What does the gate show?** Minimal. It teaches by parameter, not by picture. State
   what it shows and keep it small.
6. **Do parameters round-trip?** `getState`/`setState` through JSON with no loss, per
   CONTRACTS §7's insert state.
7. **Do they report `cpuWeight` honestly?** A device insert costs 2 units per CONTRACTS §8
   unless you measure otherwise. If yours costs more, say so.
8. **Do they dispose clean?** Zero leaked nodes, zero leaked animation frames.

## DONE-CHECK
You are done when both devices insert on a channel and audibly do what the curriculum says
they do; the gain-reduction display visibly moves when the compressor engages and sits
still when it does not; both round-trip state through JSON; both report `cpuWeight`; and
both dispose to zero. Write the test URL in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build another device. Do not build routing.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** the parameter names and what a student sees. The curriculum's
wording is his.

## MODEL-TIER DIFFERENTIATION
**SONNET-CLASS seat.** Your steps are the eight questions above, in order. The device
interface in CONTRACTS §16 is your output format — match it exactly.

## RECEIPT
Path: `Builddocs/P4-the-daw/S3-systems/receipt-device-dynamics.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

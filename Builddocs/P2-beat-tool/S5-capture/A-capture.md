# SEAT BRIEF — capture

## IDENTITY
- You are: `capture`, P2/S5. BUILD function.
- Model: agnostic — Brandon picks at spawn.
- The crew: `clock`, `grid`, and both machines exist. P3 and P4 both reuse your file.
  See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/core/capture.js`. One file.
- You do NOT touch: `clock.js` · `input.js` · the grid · either machine · CONTRACTS.md ·
  **audio recording of any kind.** This app captures notes. It never records sound in.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The path from a live performance to note data on a grid.
- **Edge — what do you hand off, to whom, in what format?** `/src/core/capture.js`,
  ES module, to `beat-shell`, then to P3's piano roll and P4's arrangement.
- **Big picture — where does your output sit in the final product?** Every time a student
  plays something in rather than clicking it in. Brandon asked for record **and** capture
  **and** loop — all three.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **What is the difference between record and capture, here?** Record arms a target and
   writes as you play. Capture keeps a rolling buffer of what was just played so it can be
   committed after the fact. Build both. State which control does which.
2. **How does a captured note get quantized — or does it?** State the rule and make it
   visible to the student. A student who plays it loose and sees it snap must be able to
   tell that happened.
3. **How does looping interact with recording?** Playing over a looping region across
   multiple passes: does it overdub, or replace? State the rule and make it a control,
   not a hidden behavior.
4. **How does punch work?** Arm one piece or one lane, punch in over a region, leave
   everything else untouched.
5. **Does count-in gate the start?** Per CONTRACTS §3, N bars before writing begins.
6. **Is velocity captured?** From every input route that can express it — MIDI directly,
   and a stated fallback for QWERTY, mouse, and touch, which cannot.
7. **Is undo possible?** A student will play a bad take in front of the class. State the
   rule for taking it back.
8. **Does it record audio anywhere?** It must not. Confirm explicitly in your receipt.

## DONE-CHECK
You are done when a throwaway page can: arm a drum machine, hear a count-in, play a
backbeat in from QWERTY and from MIDI, loop four bars and overdub across passes, punch over
one piece without touching the others, undo the last take, and capture velocity from MIDI —
with zero audio recorded anywhere. Write that test page's path in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work.

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** the quantization rule. Whether a student's loose timing gets
corrected is a teaching decision, not an engineering one.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one. Record/capture/loop/punch interacting
correctly is judgment work.

## RECEIPT
Path: `Builddocs/P2-beat-tool/S5-capture/receipt-capture.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

# SEAT BRIEF — beat-shell

## IDENTITY
- You are: `beat-shell`, P2/S6. BUILD function.
- Model: agnostic — Brandon picks at spawn.
- The crew: five seats built P2's parts. You assemble them. After you: `test-p2`,
  `redpen-p2`. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/tools/beat.html`. One file.
- You do NOT touch: `/src/ui/shell.js` — **reuse it, do not edit it** · any file from S3,
  S4, or S5 · `tokens.css` · `/index.html`. If something upstream is broken, **report it;
  do not fix it.** Fixing another seat's file is a STOP condition.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The standalone beat tool as a page.
- **Edge — what do you hand off, to whom, in what format?** `/tools/beat.html` to `test-p2`
  and `redpen-p2`.
- **Big picture — where does your output sit in the final product?** It is what Brandon
  opens the day P2 closes. In P4 the same parts appear in compact form inside the DAW.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Are both machines on one page?** Drum Synth and Drum Sampler side by side on the same
   grid, so a student can hear a made sound against a recorded one.
2. **Is it the expanded view?** `mountExpanded`, never `mountCompact`. The standalone has
   the real estate, so it gets the detail and the animation budget.
3. **Does the transport show what the curriculum names?** Tempo, time signature with a
   symbol bottom, count-in, loop region, record arm. Per CONTRACTS §3 and §13.
4. **Does `shell.js`'s file menu carry over from P1?** Reuse it. Do not write a second one.
5. **Is the CPU meter visible and is `noCap` reachable?** Brandon wants to push the machine
   until it breaks.
6. **Does it work with the network off?** The Drum Synth must. The Sampler must fail
   gracefully and say so.
7. **Does it tear down?** Navigating away disposes both machines, the grid, and capture.

## DONE-CHECK
You are done when `/tools/beat.html` loads from `python3 -m http.server` with no build step,
both machines play on the shared grid, triplet mode and per-step velocity work, live
capture and loop work, the CPU meter reads, and disposal leaves zero leaks. Write the serve
command and the URL in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build the DAW.**

## ESCALATION
Message the Troubleshooter and wait. **If an upstream file is broken:** DM the
Troubleshooter with the file and the symptom. Do not repair it.

## MODEL-TIER DIFFERENTIATION
**SONNET-CLASS seat.** Your steps are the seven questions above, in order. `/tools/beat.html`
mirrors the structure of P1's `/tools/wave-synth.html` — read that file as your format example.

## RECEIPT
Path: `Builddocs/P2-beat-tool/S6-shell/receipt-beat-shell.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — seven writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

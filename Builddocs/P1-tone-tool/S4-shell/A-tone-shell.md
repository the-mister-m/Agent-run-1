# SEAT BRIEF — tone-shell

## IDENTITY
- You are: `tone-shell`, P1/S4. BUILD function.
- Model: agnostic — Brandon picks at spawn.
- The crew: four parallel seats in S3 built the parts. You are the first seat to see them
  together. After you: `test-p1` and `redpen-p1`. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/ui/shell.js`, `/tools/wave-synth.html`, `/tools/overtone-synth.html`.
- You do NOT touch: any file from S3 or S2. If one of them is broken, **you report it —
  you do not fix it.** Fixing another seat's file is a STOP condition. Also not yours:
  `/index.html` (the DAW, built in P4) · `/src/ui/overlays.js` (P3) · `tokens.css`.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The seat that makes the standalone teaching tool a real page a
  student can be sent to.
- **Edge — what do you hand off, to whom, in what format?** Two HTML pages plus a reusable
  shell module, to `test-p1` and `redpen-p1`.
- **Big picture — where does your output sit in the final product?** `shell.js` is reused
  by every standalone tool in P2 and P3. The two pages are what Brandon opens in class
  the day P1 closes.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **What is the standalone layout?** Expanded views, not compact. The standalone has the
   real estate, so it gets the detail, the animation, and the interaction budget. Call
   `mountExpanded`, never `mountCompact`.
2. **Where is the file menu?** Brandon asked for a menu at the top that isolates one thing.
   In P1 it selects which tool you are in. In P4 it becomes the DAW's isolate control.
   Build it in `shell.js` so P4 inherits it.
3. **Does each page work with no build step?** Plain ES module imports, served from a
   static file server, no bundler, no dependency. CONTRACTS §10.
4. **Does each page own its own scale control?** Per BUILDPLAN: in standalone, the tool
   owns its own scale state, because the tool is the lesson. In P1 that control is minimal —
   the full scale engine is P3. Leave the seam and mark it in a comment.
5. **Do the input surfaces switch rather than stack?** Per BUILDPLAN: in the DAW and in
   virtual instruments you **switch** playing surfaces; all three showing at once is
   reserved for the harmony engines in P3. In P1 there is only the keyboard — build the
   switcher with one option in it so P3 drops in.
6. **Does the CPU meter show?** `governor.load` is visible on both pages, and the `noCap`
   toggle is reachable. Brandon wants to be able to push the machine until it breaks.
7. **Does it tear down?** Navigating away or unmounting disposes the instrument, the
   surface, and both visuals. Zero leaks.

## DONE-CHECK
You are done when both pages load from `python3 -m http.server` with no build step, make
sound from every input route, show the correct visual for that synth and only that visual,
expose the CPU meter and `noCap`, and dispose cleanly on unmount. Write the serve command
and both URLs in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build the DAW.**

## ESCALATION
Message the Troubleshooter and wait. Do not improvise, do not guess, do not expand scope.
**If an S3 file is broken:** report it in a DM to the Troubleshooter with the file and the
symptom. Do not repair it.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one — especially the "report, do not fix"
rule, which is where this seat most wants to go out of lane.

## RECEIPT
Path: `Builddocs/P1-tone-tool/S4-shell/receipt-tone-shell.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — seven writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

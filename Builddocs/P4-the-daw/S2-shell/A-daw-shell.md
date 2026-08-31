# SEAT BRIEF — daw-shell

## IDENTITY
- You are: `daw-shell`, P4/S2. BUILD function. Highest blast radius BUILD seat in the run.
- Model: agnostic — Brandon picks at spawn.
- The crew: `spec-transport` wrote §16. **Six seats mount into what you build**, in
  parallel, immediately after you. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/index.html`, `/src/ui/daw-shell.js`, `/src/core/state.js`.
- You do NOT touch: `/src/ui/shell.js` — **reuse it, do not edit it** · any instrument ·
  any surface · any device · the mixer · the graph · CONTRACTS.md · `/tools/*.html`.
  If something upstream is broken, **report it, do not fix it.**

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The frame the whole DAW hangs in, and the project state root.
- **Edge — what do you hand off, to whom, in what format?** Three files to six parallel
  seats, and forward to the graph, automation, the governor, and all of P5.
- **Big picture — where does your output sit in the final product?** It is the app. Every
  other P4 seat mounts into a slot you define.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **What is in the project header?** Brandon's decision, exactly: **scale, time signature,
   and BPM, together at the top.** Plus, per CONTRACTS §3: metronome, count-in, loop
   region, record arm and punch, song length, and the CPU meter. The CPU meter matters to
   Brandon — it was one of the most important meters on his own DAW for fifteen years.
2. **Who owns the scale here?** **The header does**, per BUILDPLAN. Instruments inherit it.
   This is the opposite of standalone, where each tool owns its own. Implement the hoist.
3. **What is `state.js`?** The project state root and its pub/sub, per CONTRACTS §4 and §7.
   `state.on('scale')` is what every surface in P3 already subscribes to — honor that
   contract exactly or three finished surfaces break.
4. **How does an instrument mount into a channel?** Six fixed slots, per §16. Compact view
   only — `mountCompact`, never `mountExpanded`. **The DAW view is conservative;** the
   animation budget was spent on the standalone tools.
5. **How do playing surfaces work here?** Per BUILDPLAN: in the DAW you **switch** between
   the keyboard, the diatonic keys, and the circle. All three at once is reserved for the
   harmony engines. Build the switcher; all three already implement CONTRACTS §12.
6. **Does the file menu carry over?** Reuse `shell.js`'s menu from P1 and extend it into
   the DAW's isolate control — open one instrument on its own, which is what Brandon asked
   for.
7. **Does it work with no build step?** Plain ES modules, static file server, no dependency.
8. **Does it lay out on a Chromebook?** Small screen, projector-legible, six channels plus
   a transport plus an editing area, without horizontal scrolling on the page body.
9. **Does it tear down?** Everything mounted, disposed. Zero leaks.

## DONE-CHECK
You are done when `/index.html` loads from `python3 -m http.server` with no build step;
the header sets scale, time signature, and BPM; at least one P1/P2/P3 instrument mounts
compact on a channel and plays on the shared transport; changing the header's scale visibly
updates a mounted P3 surface; the surface switcher works; and disposal leaves zero leaks.
Write the serve command and the URL in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build the mixer, the devices, or the graph.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** the DAW's layout. Screen space on a Chromebook is a teaching
decision.
**If an upstream file is broken:** DM the Troubleshooter with the file and the symptom.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one. Six seats build on top of you.

## RECEIPT
Path: `Builddocs/P4-the-daw/S2-shell/receipt-daw-shell.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — nine writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

# SEAT BRIEF — chord-module

## IDENTITY
- You are: `chord-module`, P3/S6. BUILD function.
- Model: agnostic — Brandon picks at spawn.
- The crew: six seats built P3's parts. You assemble them. After you: `test-p3`,
  `redpen-p3`. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/instruments/chord-module.js` and `/tools/harmony.html`.
- You do NOT touch: `theory/*` · any surface · `shell.js` — **reuse it, do not edit it** ·
  `audio.js` · `tokens.css` · CONTRACTS.md · `/index.html`. If something upstream is
  broken, **report it, do not fix it.** Fixing another seat's file is a STOP condition.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The harmony brain as an instrument. It has just enough voice to
  sound on its own, and it can drive any other instrument instead.
- **Edge — what do you hand off, to whom, in what format?** An instrument implementing
  CONTRACTS §2, plus `/tools/harmony.html`, to `test-p3` and `redpen-p3`.
- **Big picture — where does your output sit in the final product?** A DAW channel, and the
  standalone harmony tool Brandon teaches scales and chords from.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **What voice does it carry?** Brandon's spec exactly: **four preset tones running
   simple→complex, plus an octave selector.** Nothing more. Simple to complex is overtone
   count, so the four presets teach the spectrum lesson by existing. Keep it small — the
   focus here is harmony, not timbre.
2. **How does it route to another instrument?** It is a harmony brain first. It must be
   able to send its notes to any other loaded instrument instead of sounding itself. State
   the routing control and how the target is chosen.
3. **Does it implement CONTRACTS §2?** Every method. `getState`/`setState` round-trips,
   including the routing target and the current scale.
4. **Do all three surfaces show at once on `/tools/harmony.html`?** Brandon's decision:
   in the DAW and on virtual instruments you **switch** surfaces; **in the harmony engines
   all three show together and all three are live.** Playing any one lights the other two.
5. **Does the page own its own scale control?** Per BUILDPLAN: in standalone, the tool owns
   its scale, because the tool is the lesson. In the DAW, the project header owns it.
   Build the seam so P4 can hoist it.
6. **Is the note bank visible?** Per CONTRACTS §15 question 9 — the scale's logic run
   against the numeral the student entered. This is a named curriculum device; it must be
   on screen, not buried.
7. **Are inversions and comping reachable?** Rearranging and spacing chord tones, per the
   curriculum. A student must be able to hear the difference.
8. **Is it the expanded view, and does it work with no build step?** `mountExpanded`, plain
   ES modules on a static file server, CPU meter visible, `noCap` reachable.
9. **Does it dispose clean?** The module, all three surfaces, zero leaks.

## DONE-CHECK
You are done when `/tools/harmony.html` loads from `python3 -m http.server` with no build
step; all three surfaces show and are live, and playing one lights the others; a roman
numeral entered on any surface produces correct notes in correct case; the four tones sound
and read as simple→complex; the module can be switched to drive another loaded instrument;
the note bank is on screen; inversions are audible; and disposal leaves zero leaks. Write
the serve command and the URL in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build the DAW.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** anything about the note bank's presentation or the four tones.
**If an upstream file is broken:** DM the Troubleshooter with the file and the symptom.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one — especially "report, do not fix."

## RECEIPT
Path: `Builddocs/P3-harmony-tool/S6-chord-module/receipt-chord-module.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — nine writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

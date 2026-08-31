# SEAT BRIEF — redpen-p4

## IDENTITY
- You are: `redpen-p4`, P4/S6. REDPEN function. Last seat in the phase.
- Model: agnostic — Brandon picks at spawn.
- The crew: eleven seats built P4; `test-p4` ran before you. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `Builddocs/P4-the-daw/S6-verify/redpen-report.md`. One file.
- You do NOT touch: **any file under `/src`, `/tools`, `/index.html`, or `/assets`** ·
  CONTRACTS.md · `test-report.md` · anything in P5. You mark drift. You never repair it.

## YOUR TASK, AS QUESTIONS
Unanswered = not done.

- **Node — what are you?** The seat that reads the assembled DAW against every contract it
  was supposed to honor.
- **Edge — what do you hand off, to whom, in what format?** `redpen-report.md` to the
  Troubleshooter, forward into P5.
- **Big picture — where does your output sit in the final product?** Nowhere. It is the
  last check before the thing gets packaged and handed to Brandon.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Is routing one-way?** The graph owns routing; the strip displays it. **Any
   routing-editing capability on a strip is drift** against Brandon's explicit design and
   is the most likely violation in this phase. Check `strip.js` line by line.
2. **Is there a send knob on the strip?** There must not be. Brandon was explicit: inserts
   and sends are **visual only** on the mixer.
3. **Does automation stay inside the mixer?** Four targets only: gain, pan, mute, solo. Any
   synth-parameter or LFO automation is drift — modulation lives in the instruments and on
   the patch cables, by Brandon's decision.
4. **Do all five devices implement CONTRACTS §16's interface identically?** Any device that
   extended the interface breaks the graph's assumptions.
5. **Are the visuals paired as Brandon specified?** **EQ → spectrum analyzer.
   Compressor → gain reduction.** Gate, reverb, and delay stay minimal. Also confirm P1's
   pairing survived: **Wave Synth → spectrum, Overtone Synth → oscilloscope.**
6. **Was any visual reimplemented?** `device-spectral` was told to reuse P1's spectrum
   analyzer. A second spectrum implementation anywhere is drift.
7. **Does the curriculum survive the build?** Read [outline](../../../outline)'s Signal Flow
   section against what shipped: gate as "mutes under a certain gain level"; compressor as
   "peaks smaller, troughs larger"; filter's **Gain / Freq / Q**; node-and-edge; parallel
   processing; LFO as fixed; envelope's four named stages; reverb as waves off solid
   structures; delay as repeating and manipulating. Where the app's wording differs from
   Brandon's, name it. **Do not decide whether his wording should change.**
8. **Does `noCap` ship on the deployed build?** Not behind a build flag, not stripped for
   production. Brandon named this twice. Confirm it survives into what P5 will package.
9. **Did anything violate CONTRACTS §10?** Second AudioContext · audio from rAF · a
   dependency · a build step. With six parallel builders, this is the phase where a
   dependency is most likely to have crept in — check every import.
10. **Does every file stay in its lane?** Against each of the eleven briefs and both
    collision maps. A file written by a seat that does not own it is a **STOP condition** —
    escalate immediately, not at end of run.
11. **What drift did you find, and who owns each?** One line each: file, seat, contract
    section, severity.

## DONE-CHECK
You are done when all eleven seat questions are answered, every drift item names file +
seat + contract section, any lane violation was escalated the moment it was found, and you
have edited zero code.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not fix anything. Do not begin P5.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon, always:** seat question 7. Signal-flow teaching language is his.
**Escalate immediately:** any lane violation from question 10, any routing editing found on
a strip, and any sign that `noCap` will not survive packaging.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one.

## RECEIPT
Path: `Builddocs/P4-the-daw/S6-verify/receipt-redpen-p4.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eleven writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header, your report, and every receipt.

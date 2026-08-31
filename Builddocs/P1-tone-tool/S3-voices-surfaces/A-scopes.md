# SEAT BRIEF — scopes

## IDENTITY
- You are: `scopes`, P1/S3. BUILD function.
- Model: agnostic — Brandon picks at spawn.
- The crew: you run **in parallel** with `wave-voice`, `overtone-voice`, and `keys-input`.
  None of you talk. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/vis/spectrum.js`, `/src/vis/scope.js`, and `/src/ui/tokens.css` — you
  create the token file the whole app reads.
- You do NOT touch: `/src/vis/meter.js` or `/src/vis/gain-reduction.js` — **those are P4's** ·
  either synth · either input file · any HTML page · CONTRACTS.md.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The two visuals that make the frequency-spectrum lesson visible,
  and the color palette the entire app inherits.
- **Edge — what do you hand off, to whom, in what format?** Three files. The two visuals go
  to `tone-shell`; `tokens.css` goes to every seat in every remaining phase.
- **Big picture — where does your output sit in the final product?** The visuals sit beside
  two synths. `tokens.css` sits under every pixel in the app — the scale circle, the piano
  roll shading, the mixer, all of it.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Which visual goes with which synth?** Spectrum analyzer → **Wave Synth**.
   Oscilloscope → **Overtone Synth**. This inversion is deliberate and is the lesson:
   each synth shows the view it is not letting you touch. **Do not give either synth both.**
2. **How do they get data?** Through the analysis tap in CONTRACTS §11, and only that.
   Never reach into an instrument's nodes.
3. **Does the spectrum read as frequencies, not as decoration?** The curriculum teaches the
   ~30 Hz-16 kHz range, the fundamental as lowest and loudest, and overtones above it.
   The axis must be labeled in Hz. A student must be able to point at the fundamental.
4. **Does the oscilloscope show one repetition?** The curriculum defines it as "what gain
   of a sound wave looks like over the course of one repetition." Trigger and stabilize
   the trace so a saw looks like a saw and stays still. A rolling, untriggered trace fails
   this seat.
5. **What is in `tokens.css`?** Every token in CONTRACTS §9, defined once:
   backgrounds, lines, text, the four degree colors, accent, warn, meter colors. Dark
   ground, saturated teaching color. **It must read from ten feet away on a projector in
   a lit room** — that is the actual test, not a contrast ratio.
6. **How do these behave in compact versus expanded?** Compact: small, still, legible.
   Expanded: larger, animated, built to hold a classroom's attention. Same data, two budgets.
7. **Do they cost nothing when unmounted?** Animation loops stop on unmount. A hidden
   visual must not burn frames — the governor is watching, and P4 will not forgive it.

## DONE-CHECK
You are done when a throwaway page can mount both visuals against a test signal, the
spectrum labels Hz and clearly shows a saw's overtones against a sine's single spike, the
oscilloscope holds a stable single-repetition trace for all four waveforms, `tokens.css`
defines every CONTRACTS §9 token, and unmounting stops all animation frames. Write that
test page's path in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build meters or gain-reduction displays.**

## ESCALATION
Message the Troubleshooter and wait. Do not improvise, do not guess, do not expand scope.
**Escalate to Brandon:** the palette. Color carries teaching meaning in this app —
major/minor degree colors are how students avoid memorizing diatonic chords. Propose,
do not decide.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one. You are also setting the visual
system for 4 more phases, which is judgment work.

## RECEIPT
Path: `Builddocs/P1-tone-tool/S3-voices-surfaces/receipt-scopes.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — seven writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

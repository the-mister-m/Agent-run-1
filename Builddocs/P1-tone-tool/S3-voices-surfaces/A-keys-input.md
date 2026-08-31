# SEAT BRIEF — keys-input

## IDENTITY
- You are: `keys-input`, P1/S3. BUILD function. Highest blast radius in this stage.
- Model: agnostic — Brandon picks at spawn.
- The crew: you run **in parallel** with `wave-voice`, `overtone-voice`, and `scopes`.
  None of you talk. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/core/input.js` and `/src/surfaces/keyboard.js`. Two files.
- You do NOT touch: `/src/core/audio.js` (frozen) · either synth · either visual ·
  `/src/surfaces/diatonic-keys.js` or `/src/surfaces/scale-circle.js` — **those are P3's**,
  and building them early is out of lane · any HTML page · CONTRACTS.md.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The one place four different kinds of hardware become one kind
  of event, and the 12-note keyboard that is a student's primary way in.
- **Edge — what do you hand off, to whom, in what format?** Two ES modules to `tone-shell`;
  `input.js` is reused by every playable instrument in P2, P3, and P4.
- **Big picture — where does your output sit in the final product?** Between every student
  and every sound. If an instrument can ever tell which hardware fired a note, you failed.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Do all four routes produce identical events?** Mouse, QWERTY, touch, Web MIDI, per
   CONTRACTS §5. An instrument must never know which one fired. Prove it by logging
   `source` and confirming nothing downstream reads it.
2. **What is the QWERTY map?** State it explicitly. It must allow two hands playing
   separately, because the curriculum's Play/Program skills are written hands-separate.
3. **What happens when Web MIDI is unavailable or refused?** Degrade silently. Startup
   never blocks on it, per `findings-webaudio.md` question 5.
4. **How does `octaveShift` work?** Integer, shifts incoming notes by 12 × n.
5. **How does `positionShift` work?** This is the one Brandon asked for by name.
   0-11, selecting which **pitch class is drawn as the bottom key**. The bottom key can be
   F instead of C. It is a **display transform on the surface** — it changes what the
   student sees and touches, it does **not** transpose what the instrument receives.
   Getting this backwards is the single most likely failure in this seat.
6. **Does the keyboard show note-on state from every route?** A MIDI key press and a mouse
   click must light the same key the same way.
7. **What does `mountCompact` look like, and what does `mountExpanded` look like?** Compact
   is the DAW's keyboard strip. Expanded is the standalone keyboard with room for labels
   and shift controls. Both read `/src/ui/tokens.css`.
8. **Is the overlay hook in place?** Per CONTRACTS §6, this surface carries a per-surface
   overlay toggle: none / letter / number / solfege. **Label strings come from
   `theory/scale.js`, which does not exist yet — P3 builds it.** Write the hook and a
   temporary letter-name fallback. Mark the seam clearly in a comment. Do not write
   theory code.
9. **Does it dispose clean?** Every listener dropped — keyboard, pointer, touch, and MIDI.

## DONE-CHECK
You are done when a throwaway page importing `audio.js`, one synth, and your two files can:
play from all four routes with identical results, shift octave, shift position so the
bottom key reads F while the sounding pitch is unchanged, light keys from MIDI and mouse
alike, mount compact and expanded, toggle the overlay hook, and dispose with zero listeners
left. Write that test page's path in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build the diatonic keys or the scale circle.**

## ESCALATION
Message the Troubleshooter and wait. Do not improvise, do not guess, do not expand scope.
**Escalate:** any ambiguity about position shift versus transposition. Ask rather than
choose — Brandon named this feature specifically and there is a right answer.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one. Four input routes converging on one
event shape is judgment work, not a procedure.

## RECEIPT
Path: `Builddocs/P1-tone-tool/S3-voices-surfaces/receipt-keys-input.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — nine writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

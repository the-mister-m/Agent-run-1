# SEAT BRIEF — scale-engine

## IDENTITY
- You are: `scale-engine`, P3/S3. BUILD function.
- Model: agnostic — Brandon picks at spawn.
- The crew: `spec-scale` wrote §15; `redpen-theory` checked it against the curriculum and
  Brandon resolved what it found. After you: `chord-engine`, then three parallel surfaces.
  See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/theory/scale.js`. One file.
- You do NOT touch: `/src/theory/chord.js` — that is the next seat · any surface · any
  instrument · `tokens.css` — you return **color roles**, never hex values · CONTRACTS.md.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The single place scale facts are computed. No surface computes
  its own labels or its own colors.
- **Edge — what do you hand off, to whom, in what format?** `/src/theory/scale.js`, ES
  module, to `chord-engine`, three surfaces, and P4.
- **Big picture — where does your output sit in the final product?** Behind every note
  name, every solfege syllable, every degree number, and every color a student sees.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Does it implement CONTRACTS §15 exactly?** Function by function. Do not improve on it.
   Where §15 was amended by Brandon after `theory-report.md`, implement the amendment.
2. **Is the color rule computed from the degrees array alone?** Per §15 question 3 and
   `theory-report.md` question 9. **No lookup table of keys, anywhere.** The moment a
   student uses the +/- , a table is wrong. This is the single most important line in
   this file.
3. **Does it return color roles, not colors?** `major` / `minor` / `dim` / `aug` /
   `altered`. `tokens.css` maps roles to pixels. A hex value in this file is drift.
4. **Do the four overlay label modes work?** letter / number / solfege / none, per
   CONTRACTS §6. Solfege is **diatonic only**. Numbers are scale degrees **1 through 8
   with 8 as Do at the octave**, per the curriculum.
5. **Do the 12 tonics and the +/- work together?** Any tonic, any degree raised or lowered,
   labels and colors staying correct throughout.
6. **Are modes and minor variants presets that write into `degrees`?** Per CONTRACTS §4
   there is no separate mode field. A preset sets the array and nothing else.
7. **What happens when a student alters a scale into something with no name?** State the
   naming behavior. It must never show a wrong name, and it must never crash.
8. **Is it pure?** No DOM, no audio, no state subscriptions. Functions in, values out. This
   file must be testable without a browser.

## DONE-CHECK
You are done when the two hand-worked examples in `theory-report.md` — questions 7 and 9 —
come out of your code **identical**, character for character, to the hand-worked versions;
when C major, all twelve tonics, and at least three altered scales produce correct labels
in all four overlay modes; and when the file imports nothing. Paste both worked outputs
into your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build chords. Do not build a surface.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon, always:** any music question. If §15 is ambiguous about a note name,
a color, or a label, you ask. **You do not have an opinion on music theory**, and a
plausible guess here propagates into four surfaces.

## MODEL-TIER DIFFERENTIATION
**OPUS-CLASS seat.** The do-NOT list is the long one. High decisions, high blast radius,
and the one file where a clever shortcut breaks the whole teaching device.

## RECEIPT
Path: `Builddocs/P3-harmony-tool/S3-scale-engine/receipt-scale-engine.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

# SEAT BRIEF — overtone-voice

## IDENTITY
- You are: `overtone-voice`, P1/S3. BUILD function.
- Model: agnostic — Brandon picks at spawn.
- The crew: you run **in parallel** with `wave-voice`, `keys-input`, and `scopes`. None of
  you talk. `tone-shell` assembles you afterward. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/instruments/overtone-synth.js`. One file.
- You do NOT touch: `/src/core/audio.js` (frozen) · the other three seats' files, listed in
  [STAGE.md](STAGE.md)'s collision map · any HTML page · CONTRACTS.md · the spectrum
  analyzer, which belongs to the Wave Synth and not to you.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The synth where the student builds a sound out of partials by
  hand and watches the waveform shape appear. It teaches the harmonic series by making
  the student assemble one.
- **Edge — what do you hand off, to whom, in what format?**
  `/src/instruments/overtone-synth.js`, ES module, default-exporting a class implementing
  CONTRACTS §2, to `tone-shell`.
- **Big picture — where does your output sit in the final product?** Channel 2 of the DAW,
  and its own standalone page. It is the inverse of the Wave Synth and must stay that way.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **How many partials, and how is each one controlled?** Per CONTRACTS §11 question 5.
   A partial has a whole-number multiplier and a level. The multiplier is constrained to
   whole numbers because the curriculum teaches the series as `x×1, x×2, x×3, x×4`.
   Do not allow fractional multipliers to "sound cooler."
2. **Is the fundamental visibly the fundamental?** The curriculum defines it as the lowest
   and loudest frequency, with everything above it an overtone. Partial 1 must be labeled
   as the fundamental and must default loudest.
3. **Does it implement CONTRACTS §2 completely?** Every method. `getState`/`setState`
   round-trips through JSON with no loss.
4. **Does it implement CONTRACTS §11 exactly?** Voice allocation, stealing, ADSR paths.
   Note that one voice here costs more than one Wave Synth voice — report `cpuWeight`
   honestly, per partial.
5. **Does it ask the governor before allocating?** `governor.request(cost)` per §8. This is
   the instrument most likely to hit the cap. It must degrade, not crash.
6. **What does `mountCompact` look like, and what does `mountExpanded` look like?** Compact
   is the DAW view: tight, still. Expanded is the standalone view: animated, projector-
   legible, built so a room can watch one student stack partials. Both read
   `/src/ui/tokens.css`.
7. **Where does the oscilloscope attach?** It is `scopes`' file, not yours. You expose the
   analysis tap from CONTRACTS §11 and nothing more. Do not draw anything yourself.
8. **Does it dispose clean?** Zero leaked nodes, zero leaked listeners.

## DONE-CHECK
You are done when a throwaway page importing `audio.js` and your file can: sound a single
sine at partial 1, stack partials 2 through N and hear the tone thicken, refuse a
fractional multiplier, round-trip state through JSON, hit and survive the voice cap, mount
compact and expanded, and dispose to a zero node count. Write that test page's path in
your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build a page. Do not build a visual.**

## ESCALATION
Message the Troubleshooter and wait. Do not improvise, do not guess, do not expand scope.
**Escalate to Brandon:** anything about how the harmonic series is taught. In particular,
do not decide on your own that fractional partials are pedagogically fine.

## MODEL-TIER DIFFERENTIATION
**SONNET-CLASS seat.** Your steps are the eight questions above, in order. Output format is
CONTRACTS §2, shown there as a code block — match it method for method.

## RECEIPT
Path: `Builddocs/P1-tone-tool/S3-voices-surfaces/receipt-overtone-voice.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

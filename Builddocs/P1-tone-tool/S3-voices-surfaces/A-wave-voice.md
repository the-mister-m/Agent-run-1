# SEAT BRIEF — wave-voice

## IDENTITY
- You are: `wave-voice`, P1/S3. BUILD function.
- Model: agnostic — Brandon picks at spawn.
- The crew: you run **in parallel** with `overtone-voice`, `keys-input`, and `scopes`.
  None of you talk. `tone-shell` assembles you afterward. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/instruments/wave-synth.js`. One file.
- You do NOT touch: `/src/core/audio.js` (frozen) · the other three seats' files, listed in
  [STAGE.md](STAGE.md)'s collision map · any HTML page · CONTRACTS.md · the oscilloscope,
  which belongs to the Overtone Synth and not to you.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The simple synth. Pick a standard waveform, hear it, see its
  spectrum. It teaches that a wave's *shape* determines how many frequencies are in it.
- **Edge — what do you hand off, to whom, in what format?** `/src/instruments/wave-synth.js`,
  ES module, default-exporting a class implementing CONTRACTS §2, to `tone-shell`.
- **Big picture — where does your output sit in the final product?** Channel 1 of the DAW,
  and its own standalone page. It is the first sound a student ever makes in this app.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Which waveforms, and what are they called on screen?** Sine, triangle, square (pulse),
   saw — the four the curriculum names. Use the curriculum's words, including "pulse"
   alongside "square".
2. **Does it implement CONTRACTS §2 completely?** Every method. `getState`/`setState` must
   round-trip through JSON with no loss.
3. **Does it implement CONTRACTS §11 exactly?** Voice allocation, stealing, ADSR parameter
   paths. Do not invent a better envelope.
4. **Does it ask the governor before allocating?** `governor.request(cost)` per §8. Report
   `voiceCount` and `cpuWeight` honestly.
5. **What does `mountCompact` look like, and what does `mountExpanded` look like?** Compact
   is the DAW view: tight, still, no animation. Expanded is the standalone view: room to
   breathe, animated, built to hold a room's attention on a projector. Both read
   `/src/ui/tokens.css`. Same instrument, two layouts — this is not optional.
6. **Where does the spectrum analyzer attach?** It is `scopes`' file, not yours. You expose
   the analysis tap from CONTRACTS §11 and nothing more. Do not draw anything yourself.
7. **Does it dispose clean?** Zero leaked nodes, zero leaked listeners, verifiable by count.

## DONE-CHECK
You are done when a throwaway page importing `audio.js` and your file can: play all four
waveforms from a `noteOn` call, round-trip `getState`/`setState` through `JSON.stringify`,
hit the voice cap and steal correctly, mount compact and expanded into two different
containers, and dispose with a zero node count. Write that test page's path in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not build a page. Do not build a visual.**

## ESCALATION
Message the Troubleshooter and wait. Do not improvise, do not guess, do not expand scope.
**Escalate to Brandon:** anything about how waveforms or overtones are taught.

## MODEL-TIER DIFFERENTIATION
**SONNET-CLASS seat.** Your steps are the seven questions above, in order. Output format is
CONTRACTS §2, shown there as a code block — match it method for method.

## RECEIPT
Path: `Builddocs/P1-tone-tool/S3-voices-surfaces/receipt-wave-voice.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — seven writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

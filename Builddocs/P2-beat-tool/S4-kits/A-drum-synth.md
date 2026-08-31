# SEAT BRIEF — drum-synth

## IDENTITY
- You are: `drum-synth`, P2/S4. BUILD function.
- Model: agnostic — Brandon picks at spawn.
- The crew: you run **in parallel** with `grid` and `drum-sampler`. None of you talk.
  See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/instruments/drum-synth.js`. One file.
- You do NOT touch: `/assets/**` — you load **no files at all** · the grid · the sampler ·
  `clock.js` · `audio.js` · CONTRACTS.md.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** Eight drum pieces built entirely out of Web Audio math. No
  samples, no files, no network.
- **Edge — what do you hand off, to whom, in what format?**
  `/src/instruments/drum-synth.js`, ES module, default-exporting a class implementing
  CONTRACTS §2, to `capture` and `beat-shell`.
- **Big picture — where does your output sit in the final product?** A DAW channel and the
  standalone beat tool. It is the machine that works when the network does not.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Which eight pieces, in what order?** Exactly the names and order in CONTRACTS §14.
   The grid triggers by index and must not care which machine it is driving.
2. **How is each piece synthesized?** State the node recipe for each: what oscillator,
   what noise, what envelope, what filter. Every piece is a teaching artifact — a student
   who opens the Patch Synth in P4 should recognize these shapes.
3. **Does it implement CONTRACTS §2 completely?** Every method. `getState`/`setState`
   round-trips through JSON.
4. **Does velocity actually change the sound?** Not just the level. State what else moves —
   a harder hit is brighter, and the curriculum's dynamics language depends on it being
   audible.
5. **Does it ask the governor?** `governor.request(cost)` per §8. Report `cpuWeight` per
   piece honestly — a noise-plus-filter piece costs more than a sine thump.
6. **Compact and expanded?** Compact is the DAW's channel view. Expanded is the standalone,
   where each piece's parameters are visible and playable.
7. **Does it dispose clean?** Zero leaked nodes, zero leaked listeners.

## DONE-CHECK
You are done when a throwaway page importing `audio.js`, `clock.js`, and your file can:
trigger all eight pieces by index, show audible velocity response beyond level alone,
round-trip state through JSON, report per-piece `cpuWeight`, mount compact and expanded,
and dispose to zero. It must do all of this **with the network disabled.** Write that test
page's path in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not load a file. Do not build a grid.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** the eight piece names, if §14 leaves any ambiguity.

## MODEL-TIER DIFFERENTIATION
**SONNET-CLASS seat.** Your steps are the seven questions above, in order. Output format is
CONTRACTS §2 — match it method for method.

## RECEIPT
Path: `Builddocs/P2-beat-tool/S4-kits/receipt-drum-synth.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — seven writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

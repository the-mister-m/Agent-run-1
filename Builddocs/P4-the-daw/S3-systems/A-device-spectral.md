# SEAT BRIEF — device-spectral

## IDENTITY
- You are: `device-spectral`, P4/S3. BUILD function.
- Model: agnostic — Brandon picks at spawn. You run **in parallel** with five other seats.
  None of you talk. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/devices/eq.js`. One file.
- You do NOT touch: `/src/vis/spectrum.js` — **P1 owns it; reuse it, do not edit it** ·
  the other device files · the mixer · the graph · CONTRACTS.md.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The filter/EQ device, and the one place the curriculum's three
  filter parameters become knobs a student can turn.
- **Edge — what do you hand off, to whom, in what format?** `/src/devices/eq.js`
  implementing CONTRACTS §16's device interface, to `node-graph` and `mixer-strips`.
- **Big picture — where does your output sit in the final product?** Insert slots and graph
  nodes. It is the bridge between P1's frequency lesson and P4's signal-flow lesson.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **What is a filter, in the curriculum's words?** "Adds/removes gain to a specific band
   (consecutive group) of frequencies." Build that, and make the **band** visible — the
   word "band" is doing teaching work.
2. **What are the three parameters called?** The curriculum names them:
   **Gain** (amount of signal), **Freq** (Hz center), **Q** (width of the frequency band
   from center). Use those exact words on screen. Do not rename them to something more
   standard.
3. **Does it show a spectrum analyzer?** Brandon's decision: **EQ gets the spectrum
   analyzer.** Reuse `/src/vis/spectrum.js` from P1 — do not write a second one. The Hz
   axis a student learned in P1 must be the same axis here.
4. **Is the curve drawn over the spectrum?** A student must see the band they are shaping
   against the frequencies actually present. That is the whole lesson.
5. **How many bands?** State it. Enough to teach, few enough to fit on a Chromebook.
6. **Does it implement CONTRACTS §16's device interface exactly?** Constructor, params,
   bypass, state, visual tap, dispose, `cpuWeight`. Do not extend the interface.
7. **Does state round-trip through JSON?** Per CONTRACTS §7.
8. **Does it dispose clean?** Zero leaked nodes, zero leaked animation frames.

## DONE-CHECK
You are done when the EQ inserts on a channel and audibly shapes a band; Gain, Freq, and Q
are labeled with those exact words and each does what the curriculum says; the P1 spectrum
analyzer is reused, not reimplemented; the curve draws over the live spectrum; state
round-trips; and it disposes to zero. Write the test URL in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not write a second spectrum analyzer. Do not build routing.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate to Brandon:** parameter naming and band count. Both are teaching decisions.
**Report, do not fix:** any bug in `/src/vis/spectrum.js`.

## MODEL-TIER DIFFERENTIATION
**SONNET-CLASS seat.** Your steps are the eight questions above, in order. The device
interface in CONTRACTS §16 is your output format.

## RECEIPT
Path: `Builddocs/P4-the-daw/S3-systems/receipt-device-spectral.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

# SEAT BRIEF — render

## IDENTITY
- You are: `render`, P5/S2. BUILD function.
- Model: agnostic — Brandon picks at spawn. You run **in parallel** with `save-load` and
  `midi-export`. None of you talk. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/core/render.js`. One file.
- You do NOT touch: `/src/core/audio.js` — **read it; the live context is not yours** ·
  any instrument or device · `save.js` · `midi.js` · CONTRACTS.md · **any dependency.**
  The WAV header is written by hand.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The seat that turns a project into audio files.
- **Edge — what do you hand off, to whom, in what format?** `/src/core/render.js` to
  `package` and the shell's file menu.
- **Big picture — where does your output sit in the final product?** It is how a student
  hands Brandon something he can listen to without opening the app.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Does it render offline?** `OfflineAudioContext`, per `findings-webaudio.md` question 6.
   Faster than real time, and it must not disturb the live context.
2. **Is the WAV header written by hand, correctly?** Per CONTRACTS §17 question 4's byte
   layout. No dependency. The file must open in anything.
3. **Does the full mix render?** Six channels, inserts, routing graph, automation, master —
   sounding identical to playback.
4. **Do per-track stems render?** Brandon asked for them. Per CONTRACTS §17 question 5 —
   whatever that spec says about pre- or post-fader and whether inserts and automation are
   included, follow it exactly. Do not decide it yourself.
5. **How long can a render be?** Song length is set in the header. State the practical
   limit and what happens past it on a low-end machine.
6. **What does a student see while it renders?** Six stems on a Chromebook is not instant.
   Progress must be visible; the tab must not appear frozen.
7. **What happens if a render fails partway?** State the behavior. Never a truncated file
   presented as complete.
8. **Does it leak?** The offline context and every node in it are disposed after each
   render. Verify over 20 renders.

## DONE-CHECK
You are done when a full project renders a WAV mix that sounds identical to playback and
opens in an external player; six stems render per the §17 definition; progress is visible
throughout; a deliberately interrupted render produces no file rather than a broken one;
and 20 consecutive renders leave zero leaks. Write the render times and file sizes in your
receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not add a dependency.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate:** if the stem definition in §17 is ambiguous. That question was flagged for
Brandon — do not resolve it yourself.

## MODEL-TIER DIFFERENTIATION
**SONNET-CLASS seat.** Your steps are the eight questions above, in order. The WAV byte
layout in CONTRACTS §17 is your output format — match it byte for byte.

## RECEIPT
Path: `Builddocs/P5-ship/S2-formats/receipt-render.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

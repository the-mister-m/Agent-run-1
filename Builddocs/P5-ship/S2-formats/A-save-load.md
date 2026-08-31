# SEAT BRIEF — save-load

## IDENTITY
- You are: `save-load`, P5/S2. BUILD function.
- Model: agnostic — Brandon picks at spawn. You run **in parallel** with `render` and
  `midi-export`. None of you talk. See [ROSTER.md](../../ROSTER.md).
- Chain of command: the Troubleshooter assigns with Brandon's authority. Brandon overrides all.

## YOUR LANE
- You own: `/src/core/save.js`. One file.
- You do NOT touch: `/src/core/state.js` — **read it, never change it** · any instrument,
  device, or surface · `render.js` · `midi.js` · CONTRACTS.md · **any server or account
  system.** This app has no backend and never will.

## YOUR TASK, AS QUESTIONS
Answer every one, in code and in your receipt. Unanswered = not done.

- **Node — what are you?** The seat that makes a student's work survive closing the tab.
- **Edge — what do you hand off, to whom, in what format?** `/src/core/save.js` to
  `package` and to the shell's file menu.
- **Big picture — where does your output sit in the final product?** Every class period
  that ends before the work does. Brandon asked for **local save and JSON export** —
  no accounts, no server, nothing that leaves the machine.
- **What is missing right now? What is left to do?** Answer at the end, in your receipt.

### Seat questions — these are the deliverable
1. **Does a project round-trip?** Save, reload, and get back the identical app state:
   six instruments, six strips, insert chains, the routing graph, automation lanes, all
   notes, and the header's scale, time signature, and BPM. Per CONTRACTS §7 and §17.
2. **What is local save, versus export?** Local save keeps work in the browser between
   class periods. Export hands the student a `.json` file. Both, per Brandon.
3. **Does the loader refuse an unknown version?** Per CONTRACTS §17 question 3: it refuses
   and says so. **It never guesses.**
4. **Do preset files work?** One instrument or one kit, saved and loaded independently, per
   CONTRACTS §17 question 2.
5. **What happens when a save is corrupt or truncated?** A classroom will produce these.
   State the behavior. Never a silent partial load.
6. **What happens when local storage is full or blocked?** School-managed Chromebooks will
   do this. State the fallback and make it visible.
7. **Does anything leave the machine?** It must not. Confirm explicitly in your receipt.
8. **Does a load leave leaks?** Loading over an existing project disposes the old one
   first. Verify by node and listener count.

## DONE-CHECK
You are done when a full six-channel project with devices, a parallel routing chain,
automation, and notes saves, reloads, and is **byte-identical on re-save**; an unknown
version is refused with a message; a truncated file fails visibly; presets load
independently; blocked storage degrades visibly; nothing touches the network; and loading
twice leaves zero leaks. Paste the round-trip comparison result in your receipt.

When done: deliver the handoff, post one state-change message, update your receipt, stop.
Do not look for more work. **Do not add a field to project state.**

## ESCALATION
Message the Troubleshooter and wait.
**Escalate:** any field the format needs that project state does not have. That is a
contract change and you do not make one.

## MODEL-TIER DIFFERENTIATION
**SONNET-CLASS seat.** Your steps are the eight questions above, in order. Output format is
CONTRACTS §7 plus §17 — match it field for field.

## RECEIPT
Path: `Builddocs/P5-ship/S2-formats/receipt-save-load.md`
Schema fixed: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.
Write it after each seat question — eight writes.
Tap-out request goes **to Brandon in chat**, not the messenger.

## TIMESTAMP
Run `date "+%Y-%m-%d %H:%M %Z"` yourself. Stamp your header and every receipt update.

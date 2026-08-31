# OPEN DECISIONS — Brandon only

Task: every question P0 raised that the contract cannot answer.
Written by: `spec-core`, P0/S3, under a `goto` override. 2026-08-22 23:36 EDT.
Sources: [scope.md](scope.md) §4 and §5 · [findings-webaudio.md](findings-webaudio.md) ·
[CONTRACTS.md](../CONTRACTS.md)

**Brandon is the decider on every line in this file. There are no answers here — only
questions, each with options.** Where a seat needed a number to keep moving, CONTRACTS
carries a conservative default marked `PROVISIONAL`, and the question is still asked here.

**Nothing in this file blocks P1.** The blocking items are marked and they land in P2–P5.
The run goes straight through per **A49**.

**Status, updated 2026-08-23:** Brandon has answered D-1 through D-28 inline below.
This file is a live reference for the build, not a P4-parked file — seats read Brandon's
answers here directly. Only **D-2** and **D-26** are still open; see [TODO.md](../../TODO.md).

---

## BLOCKING — answer before the phase named

### D-1 · Which 12 scales? `[THEORY]` — blocks **P3**
The curriculum says the scale builder "lets user pick the **12 scales**." They are never
named — not in the transcript, not in the outline, nowhere in the docset.
**This is the largest single hole in the run.** CONTRACTS §4 says `degrees` is **ALWAYS 7
entries**, and the whole color rule and skip method depend on that.

- **Brandon**: every MAJOR SCALE for all 12 chromatic notes
- **Brandon 2026-08-24**: "each of the 12 chromatic notes (A, A#/Bb, B, C, C#/Db, etc) will
  get the 8 degrees of a major scale. Students pick the key from the 12 notes, and the scale
  degrees that are generated follow the major scale pattern."
- **Brandon 2026-08-24**, on 7 vs 8: "Do, Re, Mi, Fa, Sol, La, Ti, and DO."

**✅ ANSWERED AND CLOSED 2026-08-24.** Written into **CONTRACTS §4** as
`[AMENDED 2026-08-24]`, which supersedes that section's ⚠ UNRESOLVED block.

**The twelve, named:**

| `tonic` | Root | | `tonic` | Root |
|---|---|---|---|---|
| 0 | C | | 6 | F# / Gb |
| 1 | C# / Db | | 7 | G |
| 2 | D | | 8 | G# / Ab |
| 3 | D# / Eb | | 9 | A |
| 4 | E | | 10 | A# / Bb |
| 5 | F | | 11 | B |

One scale *type* — major — in twelve keys. Not twelve different scale types. Nothing
pentatonic (5), blues (6) or chromatic (12) is in the set, which is exactly what §4's
"ALWAYS 7 entries" rule needed to survive.

**7 stored, 8 shown.** The eighth note is the tonic an octave up — degree 1 repeated, not a
new degree. `degrees` stays `[0,2,4,5,7,9,11]`; the surfaces draw eight and close the circle
back on Do. **§4's 7-entry rule is CONFIRMED, no longer PROVISIONAL.** Spelling (F# vs Gb) is
decided by key signature per **D-18**.

**P3 is unblocked.** `spec-scale` (P3/S1), `redpen-theory` (P3/S2) and `scale-engine` may
write.

### D-2 · Where is this hosted, and is it HTTPS? — blocks **P5**
Measured: **Web MIDI and the service worker both require a secure context.** On a plain
`http://` origin both silently disappear — which removes the fourth input route **and**
the entire offline install. **A10** says "Static site, no backend" and names no host.

Brandon will answer between P4 and P5 when he gets the chromebook to use

### D-3 · What is a "send"? — blocks **P4**
CONTRACTS §8 caps sends at **2**. **Nothing anywhere defines what a send is in this app.**
**A25**: "not the send knob, but where it's getting sent."

-**Brandon** There are no sends — the node graph does parallel routing and the strip only *displays* destinations, so drop the cap entirely?

### D-4 · Does the Chord Module occupy one of the six channels? — blocks **P4**
**A20** fixes six channels. Six instruments fill them exactly. **A19**: the Chord Module
"routes to any synth."

- **Brandon:** It is not a channel at all it is a controller for the other synths when in the DAW.  

### D-5 · What does the master channel carry? — blocks **P4**
§7's graph edges point at `"master"` and no master object was ever specified. CONTRACTS now
adds one with gain only, marked `PROVISIONAL`.

- **Brandon** Gain and a meter with inserts and routine

---

## NOT BLOCKING — but they change what gets built

### D-6 · Pin the sample rate, or adopt the device's?
**Brandon** Decide when testing on chromebook

### D-7 · Should the transport bar show a second meter?
The §8 governor measures **main-thread** cost. Audio DSP runs on a **separate thread** — a
reverb-heavy graph can glitch while the meter reads green.

- **(Brandon)** Two meters — measured load beside allocated weight — so students see the cost of what they loaded before they hear it?

### D-8 · Can a popped-out insert be edited? *(scope C-3)*
**A24** "slots + pop-out + meter only" against **A25** "inserts/sends are **visual only**
for the mixer."

- **(brandon)** The pop-out is a full editor — it can be accessed from multiple places

### D-9 · Per-stack or per-track stems? *(scope C-8)* — **P5**
**A46**: "song + **per-stack** stems." The docset has been reading that as per-*track*.

- **Brandon** Per-track — one WAV per track

### D-10 · Is practice mode in this run? *(scope C-9)*
BUILDPLAN fixes "Drills: practice mode only, nothing scored" **and** defers the
"drill/grading layer" — in the same file. **No phase ships it and no seat owns it.**

- **(Brandon)** Claude needs to follow the fucking instructions.

### D-11 · Confirm: notes only, never audio in? *(scope C-12)*
BUILDPLAN's headline says "No real audio recording." **AGENTS ARE TRYING TO CHANGE MY WORDS, THIS WAS MY EXACT QUOTE**


### D-12 · Separate pages, or one app? *(scope C-1)*
**A31**: "they could be seaprate pages **idag about this part tbh**" — you flagged this
undecided yourself. CONTRACTS §1 already commits to `/index.html` plus `/tools/*.html`.

- **(brandon** one page with a file page that isolates tools

---

## `[THEORY]` — music questions. Yours alone. No seat may answer these.

### D-13 · Key signature or time signature in the header? *(scope C-7)*
**A8** says "**key signature** is a top number only against the BPM." The outline says the
**time** signature's top number is beats per measure. **A42** puts scale, time signature,
and BPM in the header.
**AN AGENT STARTED QUESTIONING ME, I WAS SPECIFIC ON PURPUSE** FOLLOW THE SCOPE

### D-14 · What syllables count triplets? *(scope C-11)*
CONTRACTS §6 hard-codes `syllable = 1 e + a`, which counts sixteenths and **cannot count
triplets**. **A44** asks for triplet mode.
1 + a    2 + a

### D-15 · Name the twelve scales — see **D-1**.
Each major scale for all 12 diatonic notes 

**✅ CLOSED 2026-08-24 with D-1.** The twelve are named in D-1 above and in CONTRACTS §4.

### D-16 · Fixed do or movable do?
~~**BRANDON** FIXED FUCKING DO~~

> ## ⛔ SUPERSEDED 2026-08-24 15:32 EDT — **MOVABLE DO.**
>
> **Brandon reversed his own answer.** The struck line above was the original ruling; it is
> dead and no seat may build on it.
>
> **Brandon, 2026-08-24, verbatim:**
> > *"moveable DO, the key of the scale is always Do"*
> >
> > *"Do is whatever the tonal center is. If the scale's tonal center is D, D is do. This
> > means that anything not following the major pattern needs to be marked accordingly. If
> > this is confusing, have the agent make a decision that's easy to undo."*
>
> **The tonic — whatever pitch class `state.scale.tonic` holds — is always `Do`.** All seven
> degrees speak in every key. The syllable is a property of the **degree index**, not of the
> letter. A degree that does not follow the major pattern is **marked**.
>
> **Binding implementation: CONTRACTS.md §15, amendment block `[AMENDED 2026-08-24] · A2`**
> ([CONTRACTS.md](../CONTRACTS.md) — the block sits at the head of §15 · THEORY). §15.2c's
> `FIXED_DO` constant is struck there and does not exist.
>
> **D-17 is NOT affected.** "Chromatic notes get solfege? **NO**" still holds — a pitch that
> is not one of the seven degrees returns `''`. Under movable do that is the only silent
> case, which is exactly the case D-17 named.
>
> **This reversal also voids OD-3** (`spec-scale`'s "fixed do against 1/8 for Do"). The
> outline's "1/8 for Do" is now literally true in all twelve keys.

### D-17 · Do chromatic notes get solfege?
`solfege` is specified diatonic-only. What shows on a chromatic surface — nothing 
**BRANDON** NO

### D-18 · F♯ or G♭ — what decides the spelling?
Never stated. Every letter label in the app depends on it.
**brandon** key signatuer

### D-19 · Write out the upper-overtone chord names.
The outline says use "upper overtone chord nomenclature for everything else" and never
writes one down. `chord-engine` cannot produce label strings without the actual strings. 

**brandon** major and minor 7-9 variations

### D-20 · Which symbol for which time-signature bottom number?
You teach the bottom number as a **symbol**, not a digit. The symbol set is not written
down anywhere.

**brandon** it doesn't need to be there

### D-21 · Tuning reference?
A440 and 12-tone equal temperament are assumed nowhere and stated nowhere.
— **(Brandon)** A440 / 12-TET, standard


### D-22 · How many partials does the Overtone Synth stack?
The curriculum names the harmonic series as ×1, ×2, ×3, ×4. The stackable count is a
teaching decision, not an engineering one.

**brandon** 1-12

### D-23 · Which computer keys play which notes?
The QWERTY-to-note mapping for the typing keyboard. You teach piano; the mapping should
match how you teach it.

Abelton style extending to the left one more key, and then the "position shift" where it's starting on F and using the keys according to the shift.  (this way students can play out of different positions)
---

## SMALLER, STILL YOURS

### D-24 · Undo and redo — in or out?
**Never mentioned by anyone, anywhere in the docset.** No seat owns it, no phase ships it,
nothing in CONTRACTS supports it. A classroom DAW without undo is a support problem on day
one, and retrofitting it after P4 is expensive.
**BRANDON**. IN EVERYWHERE!!!!

### D-25 · "Local save" — a downloaded file, or `localStorage`?
**BRANDON** it should be cache saved, download .json and copy/paste .json

### D-26 · Must work survive a shared Chromebook login or a profile wipe?
A**brandon** survive as long as possbile

### D-27 · What screen are you designing for?
**to be determined, assume standard studnet-model size**

### D-28 · Swing and lesson presets — you never named either one.
**brandon** defineatly swing, DEFINITLY AUTOMATION!!! no lesson presets

---

*End of `open-decisions.md`. Every item above is Brandon's. `spec-core` answered none of
them and put no answer of its own in this file.*

# SCOPE — Chromebook DAW, Agent run 1

Task: fix the boundary of this run so no later seat has to argue about it.
Written by: `scope` seat, P0/S1. Started 2026-08-22 22:59 EDT.
§1 written by the `scope` seat. §2–§5 completed 2026-08-22 23:17 EDT under a `goto`
override that collapsed P0's three seats into one run — substance kept, per-subtask
receipt ritual dropped, stage order held in strict series.
Sources: [qa-transcript.md](../../../../qa-transcript.md) · [buildmap.md](../../../../buildmap.md) ·
[outline](../../../../outline) · [BUILDPLAN.md](../BUILDPLAN.md) · [CONTRACTS.md](../CONTRACTS.md) · [ROSTER.md](../ROSTER.md)

Read by: `recon-webaudio` (P0/S2) and `spec-core` (P0/S3).

---

## NODE — WHAT THIS SEAT IS

The seat that fixes the boundary of this run. It cuts in / out / deferred, sizes each
phase, and lists what Brandon never decided — so no later seat spends its context
re-arguing the edge of the job.

## EDGE — WHAT IS HANDED OFF

This file, `Builddocs/P0-run-open/scope.md`, markdown, to `recon-webaudio` (P0/S2) and
`spec-core` (P0/S3). Nothing else. This seat writes no other file except its own receipt.

## BIG PICTURE — WHERE THIS SITS IN THE PRODUCT

Nowhere. It is scaffolding. It ships in no build and appears on no screen. Its only job is
to stop 32 BUILD seats from building the wrong thing.

---

# 1 · WHAT IS IN THIS RUN

Every deliverable, by phase. Six instruments, five surfaces, five devices, five export
formats, six pages, 33 files under `/src`, 53 seats.

## P0 · RUN OPEN — documents, no code

- `Builddocs/P0-run-open/scope.md` — this file.
- `Builddocs/P0-run-open/` recon findings — Web Audio and school-Chromebook-class browser
  behavior, written by `recon-webaudio`.
- `Builddocs/CONTRACTS.md` — confirmed or amended by `spec-core`, then §1–§10 frozen.
- `Builddocs/P0-run-open/open-decisions.md` — anything S1 or S2 raised that CONTRACTS does
  not answer, with Brandon named as decider.

`/src` files: **0**.

## P1 · TONE TOOL — ships Wave Synth + Overtone Synth; teaches frequency spectrum

**Instruments (2 of 6)**
- **Wave Synth** — pick one standard waveform: sine, triangle, square, saw. Visual: spectrum analyzer.
- **Overtone Synth** — stack partials by hand off a fundamental. Visual: oscilloscope.
- Each shows the view it is *not* letting you touch. Neither gets both visuals.

**Surfaces (1 of 5)**
- **12-note chromatic virtual keyboard** — octave shift AND position shift (bottom key
  redrawn as any pitch class; F instead of C).

**Input routes (all four, producing identical events)** — mouse · computer key · touch ·
Web MIDI (opportunistic, degrades silently, never blocks startup).

**Visuals** — spectrum analyzer, oscilloscope.

**Pages** — `/tools/wave-synth.html`, `/tools/overtone-synth.html`.

**`/src` (9)** — `core/audio.js` (AudioContext, master chain, voice pool, CPU probe) ·
`core/input.js` · `instruments/wave-synth.js` · `instruments/overtone-synth.js` ·
`surfaces/keyboard.js` · `vis/spectrum.js` · `vis/scope.js` · `ui/shell.js` · `ui/tokens.css`.

**Devices:** none. **Exports:** none.

## P2 · BEAT TOOL — ships Drum Synth + Drum Sampler; teaches rhythm

**Instruments (2 more, 4 of 6)**
- **Drum Synth** — 8 pieces, synthesized in Web Audio, no files.
- **Drum Sampler** — 8 pieces, kits under `/assets/kits/<kit-name>/*.wav`.

**Surfaces (2 of 5)**
- **Step grid** — shared by both machines. 16th subdivision **plus triplet mode**,
  velocity per step, beat-syllable overlay (`1 e + a`). Time signature bottom is drawn as a
  symbol, not a digit.

**Behaviors** — live capture, loop, punch record. **Notes only, never audio.**

**Transport** — `core/clock.js`: PPQ 480, `setInterval` 25 ms scanning a 100 ms lookahead
window, metronome, count-in, loop region, song length. Audio never scheduled from rAF.

**Page** — `/tools/beat.html`.

**`/src` (4)** — `core/clock.js` · `surfaces/step-grid.js` · `instruments/drum-synth.js` ·
`instruments/drum-sampler.js`.

**Devices:** none. **Exports:** none.

## P3 · HARMONY TOOL — ships the harmony tool + Chord Module; teaches scales and chords

**Instrument (5 of 6)**
- **Chord Module** — the harmony brain. Four tones simple→complex plus an octave selector
  so it sounds on its own, and it routes to any other instrument.

**Engines**
- **Scale engine** — 12 scales, every degree alterable with `+/-`, modes and minor variants
  as presets that write into one 7-entry `degrees` array. No separate mode field.
- **Chord engine** — skip method, roman numerals (upper case major / lower case minor /
  upper-overtone nomenclature otherwise), note bank, inversions.
- **Color rule** — degree colored by the quality of the triad built on it, computed once in
  `theory/scale.js`; no surface computes its own colors.

**Surfaces (3 of 5)**
- **Scale circle** — clickable, degrees adjustable, colored.
- **Diatonic keyboard** — adjustable scale degrees.
- **Piano roll** — always 12 chromatic rows with in-key rows shaded. Standalone shows a
  chromatic roll AND a separate diatonic roll, both shaded.
- In the harmony tool all three playing surfaces show at once and are all live.

**Overlays** — per-surface toggle: `none | letter | number | solfege` on pitch surfaces
(`number` = 1–8, 8 = Do at the octave); `none | syllable` on rhythm surfaces.

**Page** — `/tools/harmony.html`.

**`/src` (8)** — `theory/scale.js` · `theory/chord.js` · `core/state.js` ·
`surfaces/scale-circle.js` · `surfaces/diatonic-keys.js` · `surfaces/piano-roll.js` ·
`instruments/chord-module.js` · `ui/overlays.js`.

**Devices:** none. **Exports:** none.

## P4 · THE DAW — ships `/index.html`; teaches signal flow

**Instrument (6 of 6)**
- **Patch Synth** — node/edge patch cables. Node kinds: oscillators + noise, LFO + envelope,
  filter + gain nodes, math nodes. Its visual is the graph itself.

**Shell** — project header: **SCALE · TIME SIGNATURE · BPM**. Instruments inherit the
project scale. DAW view stays conservative; the animation budget was spent on standalones.

**Transport bar** — metronome, count-in, loop region, record arm + punch, song length
control, CPU meter.

**Arrangement** — linear song, not clips. Lanes, loop region, velocity on the piano roll
and both drum machines.

**Mixer** — fixed six channels + master. Bare strip: fader, level meter, pan, mute/solo,
and insert slots that are **display only** (what is loaded, its meter, where it is going).
**No send knob on the strip.** Clicking a slot pops the device out.

**Devices (all 5, real and usable)**
- **Gate** — mutes under a level.
- **Compressor / limiter** — with a **gain-reduction meter**.
- **EQ / filter** — Gain, Freq (Hz center), Q (width), with a **spectrum analyzer**.
- **Reverb**.
- **Delay**.

**Routing** — node/edge graph AND strips. Routing is *edited* in the graph only; the graph
is where extra inserts are added and parallel chains are built.

**Automation** — mixer controls only: `strip.gain`, `strip.pan`, `strip.mute`,
`strip.solo`. Nothing else automates.

**Governor** — CPU meter is the cap, not per-feature option limits. Conservative defaults
(32 voices, 24 patch nodes, 4 inserts per channel, 2 sends) and a **`noCap` dev toggle**.

**Pages** — `/index.html`, `/tools/patch-synth.html`.

**`/src` (11)** — `instruments/patch-synth.js` · `devices/gate.js` ·
`devices/compressor.js` · `devices/eq.js` · `devices/reverb.js` · `devices/delay.js` ·
`mixer/strip.js` · `mixer/graph.js` · `mixer/automation.js` · `vis/meter.js` ·
`vis/gain-reduction.js`.

## P5 · SHIP — ships it, to Brandon

**Export formats (all 5)**
1. **Project JSON** — `{"format": "chromebook-daw-project", "version": 1}`, local, reloadable.
2. **Preset JSON** — `{"format": "chromebook-daw-preset", "version": 1}`, one instrument or kit.
3. **WAV — full mix.**
4. **WAV — per-track stems.**
5. **`.mid`** — so students can take work into a real DAW. **Import is deferred.**

**Loader rule** — `version` gates every change. An unknown version is refused out loud,
never guessed at.

**Package** — bundle step plus service worker. Installable, works offline. This is the only
phase permitted a build step, and it runs *over* finished code; nothing in `/src` changes
for it. **The `noCap` toggle ships ON the deployed build.**

**Handoff** — the package plus a metrics report (CPU, voice count, node count, frame time).
Brandon deploys and does the hardware recon himself. There is no deploy seat.

**`/src` (1)** — `core/save.js`.

---

# 2 · WHAT IS OUT

Two lists. **2A** is BUILDPLAN's DEFERRED line, item by item. **2B** is everything else
Brandon named in the transcript and did not put in this run. Every item cites the
transcript answer it comes from. Where a deferral has **no transcript source**, this file
says so instead of inventing one.

## 2A · The DEFERRED list from BUILDPLAN

| Out | Cite | What Brandon actually said |
|---|---|---|
| **MIDI import** | **A47** | "export only" |
| **Multi-instance mixer channels** | **A20** | "Fixed six, add later" |
| **Drill / grading layer** | **A37** | "Practice mode, no grading" |
| **Swing** | **A44** *(nearest — see note)* | "8 pieces, 16th + triplet" — swing is never named anywhere in the transcript |
| **Lesson presets** | **A51** *(nearest — see note)* | "4 preset tones that vary from simple to complex" — those are *tone* presets inside the Chord Module, not lesson presets |
| **Git worktree parallelism** | **A50**, **A52** | "parallele where contracts allow… if we're writing git worktrees we mgiht be reaching" |

**Note on swing and lesson presets.** Neither phrase appears in the transcript. Brandon
never named either one, so he never deferred either one — BUILDPLAN's DEFERRED line
asserts both without a source. They are listed here as out because BUILDPLAN says they are
out, and flagged here because the citation does not exist. **Decider: Brandon.**

**Note on the drill layer.** A37 and BUILDPLAN disagree with each other about this. See
§4, contradiction **C-9**.

## 2B · Named in the transcript, not in this run

| Out | Cite | What Brandon actually said |
|---|---|---|
| **Notation reading as its own module** — staff, key signature, clefs | **A8** | "notation reading no, but the same concepts USED to decode the notation, yes" |
| **Students loading their own sample files** | **A22** | "Bundled + you add kits" — Brandon adds kits, students do not |
| **Any backend, server, login, or teacher-visible student work** | **A2**, **A10** | "local save and json export" · "Static site, no backend" — Q2 asked whether work is "seen by you"; the answer names local files only |
| **LFO and envelope as automation lanes** | **A28** | "no LFO/envelope but automation on mixer controls (volume/mute/solo/pan)" — LFO and envelope survive only as Patch Synth nodes per **A43** |
| **A send knob on the channel strip** | **A25** | "not the send knob, but where it's getting sent. inserts/sends are visual only for the mixer" |
| **A file-menu isolation mode inside one page** | **A31** | "a file menu at the top where it isolates one thing… they could be seaprate pages idag about this part tbh" — the run ships separate pages instead; see §4 **C-1** |
| **A separate "Chord Synth" instrument with its own label** | **A47** | "idk if the chord synth needs a separate 'synth' label, but the module will need some sort of synth engine in it" — the engine lives inside the Chord Module, no seventh instrument |
| **Any framework** | **A38**, **A40** | "give me pros/cons for each" → "Vanilla sounds pretty fucking obvious, why did you suggest framework?" |
| **A build step in P1–P4** | **A39** | "I'd love installable and offline, the phase I can trigger sounds good for the end" — the bundler is P5 only |
| **Recon against real Chromebook hardware, inside the run** | **A53** | "don't recon the real chrome, the test phase should keep track of metrics and I'll do the recon on deployment" |
| **Agent taxonomies, model tiers, and standard docset conventions** | **A12** | "drop the standards for this project. Throw out the taxonomies and model choices… This needs to be agnostic" |
| **Surround sound** | **A25** *(nearest)* | The curriculum names "Panning and surround sound" under Spatialization. Brandon scoped the strip as "Pan control" and never named surround. Not in this run. **Curriculum item — decider: Brandon.** |

---

# 3 · HOW BIG IS EACH PHASE

`/src` totals reconcile to the 33 files in CONTRACTS §1. Seat counts and ratings are
ROSTER's. Risk is read off ROSTER's `[size · drift · decisions · blast]` — highest blast
first, size as the tiebreak.

| Phase | `/src` files | Seats | Riskiest seat | Why that one |
|---|---|---|---|---|
| **P1 · Tone Tool** | **9** | **9** | `audio-core` `[H·L·M·H]` | It owns the single AudioContext, the master chain, the voice pool, and the CPU probe — four parallel seats and every phase after P1 build on top of it |
| **P2 · Beat Tool** | **4** | **10** | `clock` `[H·L·M·H]` | The clock P2 writes is the clock the whole DAW runs on in P4; PPQ, lookahead, and drift are set here once |
| **P3 · Harmony Tool** | **8** | **10** | `scale-engine` `[M·L·H·H]` | The `degrees` array and the color rule are the source of truth for four surfaces *and* for `chord-engine`; a music error here is wrong on every screen. `redpen-theory` `[L·L·H·H]` gates it before code exists |
| **P4 · The DAW** | **11** | **13** | `daw-shell` `[H·M·H·H]` | Six parallel seats build against it in S3; if the shell is wrong they are all wrong at once. `node-graph` `[H·M·H·H]` ties on rating and is second |
| **P5 · Ship** | **1** | **8** | `package` `[M·L·M·H]` | The only build step in the run, and the one place the `noCap` toggle can silently fall out of the deployed build |

**Totals:** 33 `/src` files · 50 seats in P1–P5 · 3 in P0 · **53** plus the standing
Troubleshooter.

**Where the weight actually sits.** P4 is the largest phase by every measure — most files,
most seats, most parallelism. P2 writes only 4 files but carries 10 seats, because time is
harder than it looks and most of P2 is verification. P5 writes 1 file and still needs 8
seats, because export formats and offline packaging are where a run dies quietly.

---

# 4 · WHERE THE TRANSCRIPT CONTRADICTS ITSELF

**This is a list. Nothing here is resolved. Brandon is the decider on every line.**

`spec-core` (P0/S3) may close a line **only** by direct citation of BUILDPLAN or the
transcript. Everything it cannot close by citation goes to `open-decisions.md` untouched.

## 4A · Transcript against itself

- **C-1 — One app, or separate pages?**
  **A1** "both/combo" · **A31** "a file menu at the top where it isolates one thing (the DAW
  shows the compact version while the standalone shows more detail…) **they could be
  seaprate pages idag about this part tbh**."
  Brandon said out loud he had not decided. The run assumes separate pages.
  **Decider: Brandon.**

- **C-2 — What is in the first build?**
  **A9** "synth + drum machine. chord/scale engine seems simple enough after the synth
  engine is built" · **A11** "buddy, make sure that we're including EACH phase and not
  stopping at chord engine."
  A11 is later and reads as a correction of A9, but A9 named a v1 boundary and A11 named a
  docset boundary — those are not the same thing. Whether P4 and P5 are "v1" or a second
  run is not settled by citation. **Decider: Brandon.**

- **C-3 — Do the mixer's insert slots let you edit anything?**
  **A24** "slots + pop-out + meter only" · **A25** "inserts/sends are **visual only** for
  the mixer" · **A27** "mixer shows their arrangement, the node/edge graph allows them to
  add extra inserts."
  "Pop-out" implies the device opens and is edited. "Visual only" implies it does not.
  BUILDPLAN says slots are display-only and "clicking a slot pops out the device" without
  saying whether the popped-out device is editable. **Decider: Brandon.**

- **C-4 — Cap by CPU, or cap by option count?**
  **A27** "If we need to put limitations on how many they can do, do it" · **A45** "That cap
  might be something where we **hard limit CPU usage instead of options**" · **A33** "set a
  conservative default, but ship v1 with a 'no cap' toggle."
  A27 asks for option limits. A45 says CPU instead of options. CONTRACTS §8 does both —
  a governor **and** hard numbers (32 voices, 24 nodes, 4 inserts, 2 sends). BUILDPLAN's
  FIXED DECISIONS say "governed by a CPU meter, **not arbitrary option limits**," which
  contradicts the numbers printed two files away. **Decider: Brandon.**
  *This one lands directly on `spec-core` — it is the §8 question.*

- **C-5 — Does the Chord Module make its own sound?**
  **A19** "Routes to any synth" (answering "does it make its own sound, or trigger one of
  the other synths") · **A47** "the module will need some sort of synth engine in it (again,
  4 presets and octave selector will do)."
  A19 chose "triggers others." A47 gives it an engine. **Decider: Brandon.**

- **C-6 — Do the simple synths have envelopes?**
  **A28** "Inside each synth, Patch cables on the complex synth, **no LFO/envelope** but
  automation on mixer controls" · **A43** patch nodes are "Oscillators + noise, **LFO +
  envelope**, Filter + gain nodes, Math nodes."
  A28 puts modulation "inside each synth" and denies LFO/envelope in the same sentence.
  A43 restores both as Patch Synth nodes. CONTRACTS §2 already assumes an envelope exists
  on every instrument — it prints `setParam('env.attack')` as its example.
  **Decider: Brandon.** *This lands on P1 immediately.*

- **C-7 — Key signature, or time signature, in the header?**
  **A8** "**key signature** is a top number only against the BPM" · **A42** "in the DAW you
  pick the **scale** at the top with the **time signature** and BPM" · the curriculum:
  "Time signature: Top number tells you how many beats per measure, I use the symbol for
  the bottom number."
  A8 says *key* signature is a top number. The curriculum says the *time* signature's top
  number is beats per measure. A42 puts three separate things in the header. Either A8 is a
  typo for "time signature," or Brandon means a key-signature display this run has not
  planned. **Curriculum question — decider: Brandon, and only Brandon.**

- **C-8 — Per-stack stems, or per-track stems?**
  **A46** "song + **per-stack** stems… plus .midi file."
  BUILDPLAN and CONTRACTS both read this as *per-track*. "Stack" may instead mean a
  parallel chain in the node graph, which is a different render and a different file count.
  **Decider: Brandon.** *This changes what P5's `render` seat builds.*

- **C-9 — Is practice mode in, or is the drill layer out?**
  **A37** "Practice mode, no grading" · BUILDPLAN FIXED DECISIONS: "Drills: practice mode
  only. Target is shown and played; nothing is scored" · BUILDPLAN DEFERRED:
  "**drill/grading layer**."
  BUILDPLAN fixes practice mode as a decision and defers the layer that would carry it, in
  the same file. **No phase in §1 of this scope ships a practice mode, and no seat in
  ROSTER owns one.** As written, a FIXED DECISION has no file and no seat.
  **Decider: Brandon.**

- **C-10 — Six instruments on six fixed channels, with one of them routing to another.**
  **A20** "Fixed six, add later" · **A19** the Chord Module "Routes to any synth."
  Six instruments fill six channels exactly. If the Chord Module occupies one and drives a
  second, either it consumes a channel to play through another channel, or it is not a
  channel at all. The transcript does not say which. **Decider: Brandon.**
  *This lands on CONTRACTS §7 and on P4.*

- **C-11 — Triplets have no syllables.**
  **A44** "8 pieces, 16th + **triplet**" · **A30** "Per-surface toggle" · the curriculum:
  "Subdivision: any unit that divides a full beat (we use syllables, **e + a**)."
  CONTRACTS §6 hard-codes `syllable = 1 e + a`, which counts sixteenths and cannot count
  triplets. Brandon's own syllable system, as written down, does not cover the subdivision
  he asked for. **Curriculum question — decider: Brandon, and only Brandon.**

## 4B · Transcript against BUILDPLAN

Not "the transcript against itself," but the same defect and the same decider. Listed
separately so nobody mistakes these for Brandon's own words.

- **C-12 — "No real audio recording" is not in the transcript.**
  BUILDPLAN's second paragraph: "**No real audio recording.** Note capture only. Audio comes
  out (WAV render), never in (except kits Brandon adds)."
  Brandon never said this. **A18**, answering "can students record their live playing into a
  lane," is "**both record and capture (and loop)**" — which reads more like *yes* than
  *no*. The restriction is *derivable* from **A22** (Brandon adds kits), **A34** (project,
  presets, audio render), and **A10** (no backend) — but it was derived, not decided, and it
  is printed in the plan as though Brandon said it. **Decider: Brandon.**

---

# 5 · WHAT BRANDON NEVER SAID

**This is a list of holes. Nothing here is filled in.** Every line is a place a BUILD seat
would otherwise guess, and a guess would ship. Items marked **[THEORY]** are music or
curriculum questions and escalate to Brandon by rule — no seat has an opinion on them.
Items marked **[§]** collide with a numbered section of CONTRACTS and are `spec-core`'s
problem first.

## 5A · Sound and voices

- Envelope shape and default values for any synth — attack, decay, sustain, release.
  CONTRACTS §2 prints `env.attack` as its example path and no envelope was ever specified. **[§2]**
- Voice-stealing rule when the cap is reached: steal oldest, steal quietest, or refuse the
  note. **[§8]**
- Whether a master limiter exists to stop six channels from clipping the output.
- Tuning reference and temperament — A440 and 12-TET are assumed nowhere and stated
  nowhere. **[THEORY]**
- Default velocity for input routes that have no velocity — computer key, mouse click,
  touch. A28 wants velocity on the piano roll and the drum machines; live playing has none. **[§5]**
- How many keys the virtual keyboard shows, and its MIDI note range.
- How many partials the Overtone Synth stacks.
- What the Chord Module's four presets actually are, and what "simple → complex" varies
  along. **A51** says "agents build the presets" — it does not say what they are.

## 5B · Time and rhythm

- Syllables for triplet subdivisions. See §4 **C-11**. **[THEORY] [§6]**
- Default BPM, and the allowed BPM range.
- Which time signatures are offered — which top numbers, which bottom values.
- Which symbol is drawn for which bottom number. Brandon teaches the bottom number as a
  symbol; the symbol set is never given. **[THEORY]**
- Default count-in length.
- Whether the metronome is synthesized or sampled, and what it sounds like.
- How long a step-grid pattern is. **A44** gives resolution, never length.

## 5C · Scales and chords

- **Which 12 scales.** The curriculum says "scale builder that lets user pick the 12
  scales" and never names one of them. This is the largest single hole in P3. **[THEORY]**
- Fixed do or movable do. The curriculum notes choir does solfege; it does not say which
  system. **[THEORY] [§6]**
- Chromatic solfege syllables, if chromatic notes get solfege at all. **[THEORY]**
- Accidental spelling — does the app draw F♯ or G♭, and what decides. **[THEORY]**
- The exact "upper overtone chord nomenclature" label strings. The curriculum says to use
  them for everything that is not plain major or minor; it never writes one down. **[THEORY]**
- Whether `degrees` is **always** 7 entries. CONTRACTS §4 says "ALWAYS 7 entries." If any
  of the unnamed 12 scales is pentatonic, blues, or chromatic, that line is already false.
  Cannot be closed until the 12 scales are named. **[THEORY] [§4]**
- What the note bank displays, and how it responds to an inversion.
- How a student selects an inversion.

## 5D · Mixer, routing, devices

- **What a "send" is in this app, and where it goes.** CONTRACTS §8 caps sends at 2.
  **A25** removed the send knob and left the strip showing only "where it's getting sent."
  Nothing defines the send itself. **[§8]**
- What the master channel has — fader, meter, inserts, or none of them. **[§7]**
- Meter scale and ballistics: dBFS, peak, RMS, hold, decay.
- Pan law.
- Solo behavior: exclusive or additive, and whether it is solo-in-place.
- Whether a channel can be empty, and what the graph does when an instrument is swapped
  off a channel. **[§7]**
- Which order wins when the strip's insert order and the node graph disagree. **[§7]**
- How automation is edited — lanes on the arrangement, breakpoints, curves, or recorded
  moves. **[§7]**

## 5E · Files, state, and the classroom

- **Undo and redo.** Never mentioned by Brandon, by BUILDPLAN, by CONTRACTS, or by any
  seat brief. A classroom DAW with no undo is a support problem on day one.
- Whether "local save" means a downloaded file or `localStorage`. **A2** — "local save and
  json export" — may be one thing or two. **[§7]**
- Whether student work must survive a shared-Chromebook login or a profile wipe.
- **How Brandon adds a kit.** **A22** says he adds kits. A static site with no backend
  cannot scan `/assets/kits/` — it needs a manifest file or a hard-coded list, and neither
  exists. This blocks P2's `drum-sampler`. **[§1]**
- Export file naming.
- Whether channels can be renamed.

## 5F · Screen and hardware

- Minimum viewport. School Chromebooks are commonly 1366×768 at 11"; no target resolution
  was ever set, and A35's "if we have real estate" makes the whole layout conditional on a
  number nobody wrote down.
- The QWERTY-to-note mapping for the computer-key playing surface. **[§5]**
- Touchscreen versus trackpad-only Chromebooks, and whether multi-touch chords are
  expected to work. **[§5]**
- Accessibility beyond contrast — keyboard navigation, focus order, screen readers.
- Where the static site is hosted. **A10** says static, no backend, and names no host.

---

*End of `scope.md`. §4 and §5 are lists and stay lists. `spec-core` closes what it can
cite and sends the rest to `open-decisions.md` with Brandon named as decider.*

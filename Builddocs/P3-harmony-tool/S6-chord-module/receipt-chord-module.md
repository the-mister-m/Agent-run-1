# RECEIPT — `chord-module` · P3/S6

Seat: `chord-module`, BUILD, OPUS-CLASS, M·M·M·M. The only seat in S6, and the last BUILD
seat in P3. Brief: [A-chord-module.md](A-chord-module.md) · Stage: [STAGE.md](STAGE.md) ·
Phase: [PHASE.md](../PHASE.md)

Opened 2026-08-24 18:34 EDT · updated after each seat question · closed 2026-08-24 18:56 EDT.
Schema fixed by the brief: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.

---

## DELIVERABLE STATE

**SHIPPED.** Two files, both this seat's own lane, no build step, no dependency:

- [`/src/instruments/chord-module.js`](../../../src/instruments/chord-module.js) — a
  CONTRACTS §2 instrument, every member.
- [`/tools/harmony.html`](../../../tools/harmony.html) — the standalone page §1 names.

**Nothing outside the lane was touched.** `theory/*`, all three surfaces, `ui/shell.js`,
`core/audio.js`, `core/input.js`, `core/state.js`, `ui/tokens.css`, CONTRACTS.md and
`/index.html` are byte-identical to how this seat found them. Verified: `git status` shows
exactly the two files above plus this receipt and two throwaways under `docs/scratchpad/`.

### THE SERVE COMMAND AND THE URL — the brief asks for both by name

```
python3 -m http.server 8000          # run from the PROJECT ROOT, not from /tools
http://127.0.0.1:8000/tools/harmony.html
```

It must be HTTP, not `file://` — Chrome refuses ES module imports from a `file://` origin,
and §5/§10 need a secure context for Web MIDI. `127.0.0.1` counts as secure.

### DONE-CHECK: 61 checks, 61 pass, 0 fail

Run in **real Chrome against the real modules with real Web Audio** — the shipped files
running, not a description of them:

```
python3 -m http.server 8000
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --autoplay-policy=no-user-gesture-required \
  --virtual-time-budget=20000 --dump-dom \
  "http://127.0.0.1:8000/docs/scratchpad/harmony-donecheck.html"
```

Result: `<title>ALLPASS 61/61</title>`. Harness:
[`docs/scratchpad/harmony-donecheck.html`](../../../docs/scratchpad/harmony-donecheck.html).
Screenshot of the shipped page:
[`docs/scratchpad/harmony-shot.png`](../../../docs/scratchpad/harmony-shot.png).

| The brief's DONE-CHECK, clause by clause | |
|---|---|
| loads from `python3 -m http.server` with no build step | **PASS** |
| all three surfaces show and are live | **PASS** |
| playing one lights the others | **PASS** |
| a roman numeral entered anywhere → correct notes, correct case | **PASS** — 84 numerals, all twelve keys |
| the four tones sound and read as simple→complex | **PASS** — measured on rendered audio |
| switchable to drive another loaded instrument | **PASS** |
| the note bank is on screen | **PASS** |
| inversions are audible | **PASS** |
| disposal leaves zero leaks | **PASS** — counted, not claimed |

---

## THE NINE SEAT QUESTIONS

### 1 · What voice does it carry? — **Brandon's spec exactly, and nothing more.**

**Four preset tones plus an octave selector. No third control on the voice.**

The preset **is** an overtone count and nothing else — one `OscillatorNode` per voice
carrying a `PeriodicWave` built from the harmonic series `1/n`, truncated at the preset's
partial count: **1 · 3 · 6 · 12**. Preset 1 is the fundamental alone. Preset 4 is twelve,
which is `overtone-synth.js`'s own count after D-22, so the two tools top out at the same
place and "twelve" means the same thing in both.

**Simple→complex is MEASURED, not asserted.** Each preset was rendered through an
`OfflineAudioContext` and scored on mean |second difference| — the discrete second
derivative, which weights a harmonic by n², so it reads overtone content directly:

```
overtone content:  28 → 65 → 129 → 272
```

Strictly ascending, roughly doubling per step. `PeriodicWave` normalisation is left ON, so
all four peak at the same level and switching preset changes the **timbre** and not the
volume — the only way "simple → complex" is heard as complexity rather than as loudness.

**Cost:** `cpuWeight` is §11.1a's plain-voice **10** — two nodes, osc + gain, envelope on
the gain. A richer preset costs no nodes, which is what makes "keep it small" affordable on
a Chromebook already running three live surfaces. **Flagged:** the DSP cost of a 12-partial
`PeriodicWave` is not identical to a sine's and was not measured; 10 is a floor, the same
caveat §8 and §11.1a carry for the `AnalyserNode`.

**The octave selector is `chord.octave`** — §15.9's own `octave` argument, absolute, 1–7,
default 4 (middle C, §15.1). There is no second octave control on this instrument.

> **⚠ ESCALATED — the four tones are Brandon's, and his brief says so by name.** They are
> shipped with **no invented timbre word**: each preset is labelled by its partial count and
> its overtone count on screen ("3 · 2 overtones"), because naming a tone is a judgement and
> this seat does not have one. See OPEN DECISIONS **OD-A**.

### 2 · How does it route to another instrument? — **`route.target`, chosen from a bound list.**

**The control:** `setParam('route.target', id)` — `'self'` or another loaded instrument's §2
`static id`. It is a `<select>` in the module's own UI, labelled **Route**.

**How the target is chosen:** the page is the only thing that knows which instruments are
loaded, so the page hands the module the list with `bindTargets([{id, label, instrument}])`.
The module owns the control and the choice; the page only supplies the menu's contents. On
`/tools/harmony.html` the bound rows are **Wave Synth** and **Overtone Synth**, both mounted
compact next to the module so a student can see and shape what they are driving.

**When routed, this module makes no sound at all** — it allocates no voice and forwards
`noteOn`/`noteOff` to the target. Proven: `voiceCount === 0` while routed, `=== 3` after
switching back to self.

**`onNoteOut` fires either way** — §2: "an instrument with `emitsNotes` still routes its own
audio to `out` normally. Emitting notes and making sound are independent." It is the
**observer** channel (a recorder, `core/capture.js`, P4's arrangement, a test), not the
routing channel. `static emitsNotes = true`, as §15.9 names this module by name.

Two guards, both checked: an `id` naming no bound row is **refused** rather than leaving the
module silently silent, and switching route **releases everything sounding on the old route
first**, so a held note cannot be stranded in an instrument that is no longer selected.

### 3 · Does it implement CONTRACTS §2? — **Every method, and the round-trip is byte-identical.**

All fifteen §2 members present and live: `noteOn` · `noteOff` · `allNotesOff` · `setParam` ·
`getParam` · `getState` · `setState` · `voiceCount` · `cpuWeight` · `mountCompact` ·
`mountExpanded` · `unmount` · `dispose`, plus all four 2026-08-22 additions — `ready()` /
`static needsLoad` · `getAnalyser()` · `static pieces` · `onNoteOut`/`offNoteOut` /
`static emitsNotes`. §11.7a (missing velocity → 0.8), §11.7b (unknown path is a silent
no-op, never a throw) and §11.7c (`env.*` live on sounding voices) are all honoured.

**`getState` → `setState` → `getState` is byte-identical**, including:

- **the routing target** — `target: 'fake-synth'` survived a full round trip;
- **the current scale** — tonic 9, Harmonic Minor with degree 4 moved: `0 2 3 5 6 8 11`
  came back exactly, and so did the resulting voicing `93,108,98,89` and the label `Dm7/F`.

**`setState` writes the scale back through §4's own four mutations and nothing else.** This
file never assigns `state.scale` and never edits a scale object in place — `setScaleTonic`,
then `setScalePreset(originName)` (which restores `originName` so `resetScaleDegree` still
"gets the student back", F2), then `setScaleDegree(i, saved − current)` because §15.5's table
says that call **adds**. Every saved value came out of those same clamped mutators, so the
write-back is lossless.

**`getAnalyser()` returns null on both taps.** §15.10 makes the **note bank** this
instrument's visual "the way the spectrum analyzer is Wave Synth's", so there is no
`AnalyserNode` in this chain and `cpuWeight` carries no analyser cost.

### 4 · Do all three surfaces show at once? — **Yes, all three, all live, and playing one lights the others.**

Brandon's decision, honoured literally: **in the DAW and on virtual instruments you switch
surfaces; in the harmony engines all three show together and all three are live.**
`/tools/harmony.html` mounts `ScaleCircle`, `DiatonicKeys` and `PianoRoll` expanded, side by
side, at the same time. There is no switcher on this page.

**They meet on two things and nothing else** — `core/state.js`'s one scale (§4) and
`core/input.js`'s one bus (§5). Three different wirings, because §12.1 gave each surface a
different one, and one store, because §4 says there is one scale:

| surface | how it gets the scale |
|---|---|
| `scale-circle` | the store as its third constructor argument |
| `diatonic-keys` | imports the shared `state` itself (§12.1's two-arg constructor) |
| `piano-roll` | `bindState(state)` — a duck type, it is an editor, not a §12.1 surface |

**Playing one lights the others — measured.** Emitting the V chord as the circle's outer
ring emits it lit **6 circle slots** and **2 diatonic keys**, sounded **3 voices** in the
module, lit the matching note-bank chips, and every one of them went dark on release.

**The module's own Play button lights them too**, and it does it without importing the bus
on its own: the page hands the bus in with `bindInput(input)`, the button emits on §5's bus
with the **real route that fired** (`'mouse'` | `'touch'` | `'key'` — all three are in §5's
frozen enum), and the page's existing `input.on('noteon') → chord.noteOn` wire brings the
note back. **One path in, one path out, no double trigger.** Unbound — the DAW case, the
headless case — the button calls `this.noteOn` directly and nothing lights, because nothing
is listening.

### 5 · Does the page own its own scale? — **Yes, and the seam is written out so P4 can cut along it.**

§4, frozen: "in the DAW, the project header owns `state.scale`; in a standalone tool, that
tool owns its own." The tool is the lesson, so the scale control is a panel on the page and
not inside any module: **twelve key buttons** (`setScaleTonic`) and **nine preset buttons**
(`Object.keys(PRESETS)` → `setScalePreset`), with the scale's name and provenance read back
from `scaleName()`/`preset`.

**Nothing on that panel computes music.** Every key's name is `spellingOf(createScale(pc,
'Major'), 0).text`, so the tie key draws its composite face (A1) and this page spells
nothing (§6, §10-H). The preset list is enumerated, so adding a preset in `scale.js` grows
the control with no edit here (A8). The `+/-` per degree is **not duplicated** — it lives on
the surfaces, where §4 puts it.

**The seam, stated so P4 can hoist:** delete `createScaleControl()` and its panel, create the
project header's store, and pass it to `chord.bindState(…)`, `roll.bindState(…)` and
`new ScaleCircle(el, input, …)`. Nothing else on the page changes, because nothing else on
the page knows where the scale came from. `chord.bindState(state)` is called explicitly on
the page today — a no-op against the default — **so that the hoist point is visible in the
source rather than implied.** Proven both ways: a module with no wiring is on the shared
store; `bindState(createState(…))` moves it onto another one and it follows *that* store
without touching the shared one.

### 6 · Is the note bank visible? — **On screen, at the centre of the module, never buried.**

§15.10's single call, `noteBank(scale, {...})`, and the module draws what it returns. It is
the largest block in the expanded view, spanning the full width under the controls.

**What a student sees:**

- **The chord's label**, big, in the chord's own degree colour, with **every quality marker
  and extension digit superscript** (A9) — `chordLabelParts`, not `chordLabel`. Root in the
  bass → no slash; inverted → `I/M3` (numerals) or `D/F♯` (letters), toggled by one button.
- **One chip per chord tone, in the voicing's sounding order** — §15.9: "a seat that sorts a
  voicing has thrown away which tone is which." `noteBank` already rotates the identities
  alongside the pitches, so chip *k* is the tone sounding at `voicing[k]` after an inversion.
- **Each chip carries its own scale number** — `1 · 3 · 5`, and `7` when the count is raised
  — so §15.7's "the 7th of the chord is the 7th note of that root's scale" is **printed on
  the note** instead of being a sentence a student is told.
- **Each chip in its own degree's colour**, as a §9 token *name* (`var(--deg-major)`), never
  a hex value. Root and bass are tagged in words as well as by position.
- **The overlay is per-surface** (§6): letter → number → solfège → none, on the note bank's
  own button, independent of every other surface on the page.
- **Raising the count to 4 shows the 7th and says "upper overtone chord"** — Brandon's own
  term (§15.6), shown only when it is true. Default is 3, always: "they do not LEARN about
  7th chords, but I do show them."
- **Chips light from the notes actually sounding**, not from the click that started them, so
  a note arriving from the circle, the diatonic keys or a MIDI controller lights the chip
  exactly as the module's own Play button does.

**It computes nothing.** Every string, digit, syllable and colour token on it came out of
`noteBank()`. Grep the file: no hex value, no note name, no numeral string, no chord name,
no solfège syllable. §15.10: "the exact layout, sizing and animation are `chord-module`'s"
— layout and sizing are all this seat chose.

> **⚠ ESCALATED — the note bank's PRESENTATION is Brandon's**, by this seat's brief. See
> OPEN DECISIONS **OD-B**.

### 7 · Are inversions and comping reachable? — **Both, in one click each, and both audible.**

**Rearranging** — a **Bass** stepper drives `chord.inversion`, §15.9's `invert(v, n)`, read
as "rotate the bass up *n* times". Measured: `60 64 67 → 64 67 72`, and `bass` itself moves
each step. It **clamps and does not wrap** (§15.9) — setting 9 on a three-note chord lands on
2, so a held button cannot walk a chord into the ceiling.

**No inversion labels anywhere a student can see** (A10). There is no "1st inversion" and no
inversion number in the UI or in this file's strings. The voicing is named by its bass:
root position prints `I`, rotated prints `I/M3`.

**Comping** — each note-bank chip carries its own **− / +**, one cell of §15.9's `spread`
primitive. Measured: `60,64,67 → 60,76,67` — the middle tone opened up an octave, and the
array stays in **sounding order**, so `bassOf` still reads the real bass. A **Close it up**
button zeroes every offset. No named patterns ("drop 2", "shell") were invented — §15.9 says
they are not in §15 and §10 forbids inventing an interface.

Both are audible in the plainest possible way: the pitches change, and the Play button
sounds whatever the note bank is currently showing.

### 8 · Is it the expanded view, and does it work with no build step? — **Yes, and yes.**

`mountExpanded` draws the full view — seven numerals, a typed-numeral field, the chord
steppers, the four tones, the routing select, the note bank and Play. `mountCompact` is the
same instrument, tight, for P4's DAW strip. The page calls `mountExpanded` and there is no
call to `mountCompact` anywhere on it except for the two **routing targets**, which are
exactly the compact case.

**No build step.** Plain ES modules, relative paths, zero dependencies, nothing to compile
(§10). Serve the project root and open the URL at the top of this receipt.

**CPU meter visible, `noCap` one click away** — both are `ui/shell.js`'s own `createCpuMeter`
component, imported and called, sitting in the top bar. `governor.noCap` was toggled at
runtime in the done-check and it took.

**This page does not call `mountStandaloneTool()`, and that is not a fork.** `ToolShell` is
P1's shape and is right for P1: one visual, and a switcher that "holds at most ONE live
surface and proves it structurally". BUILDPLAN reserves all-three-at-once for the harmony
engines and §15.10 replaces the visual with the note bank — both of which that shell is
written to *enforce*. So this page reuses the shell's **components** (`createFileMenu`,
`createCpuMeter`, `acquireShellStyle`/`releaseShellStyle`, `TOOLS`), which that file exports
for exactly this, and lays itself out. `tools/beat.html` (P2/S6) did the same, for the same
reason. **`ui/shell.js` is byte-identical.**

`TOOLS` still carries `{id:'harmony', available:false}`. Flipping that boolean is an edit to
`shell.js`, which this seat does not make — so the page hands `createFileMenu` a **copy** of
`TOOLS` with its own row marked available and reaches into nothing. See **NEXT ACTION**.

### 9 · Does it dispose clean? — **Zero leaks, and it returns counts rather than a claim.**

Everything this module can leak is one of six things, and all six come down in `dispose()`:
a live voice, an `AudioNode`, a DOM listener, an `onNoteOut` listener, the store
subscription, and a note left sounding **in a routed instrument**. Measured, from the
harness, against baselines taken before anything was built:

```
voicePool.count      0  (baseline 0)      every voice back out of the pool
input.listenerCount  0  (baseline 0)      every bus subscription dropped
state.listenerCount  0  (baseline 0)      every scale subscription dropped
module DOM host      0 children           it took its own DOM with it
.cm-chip in document 0                    no orphaned chips
#cbdaw-chord-module-style  removed        the stylesheet is reference-counted away
dispose() → {"nodesDisconnected":1,"listenersDropped":35,"noteOutListenersDropped":0,
             "storeSubscriptions":1,"notesReleased":0,"voicesFreed":3}
```

All three surfaces dispose clean alongside it, on the page's own `teardown()`, which also
releases the three channels and drops the two bus subscriptions. **It does NOT dispose its
routing targets, the store, the input bus, or the surfaces** — it does not own any of them.
Nor does the page call `audio.dispose()` (that closes the one AudioContext for the whole
document) or `input.dispose()` (the bus is module-level and shared) — the same two
exclusions `ui/shell.js`'s own unmount makes, for the same reasons.

`window.cbdawHarmony` exposes `{chord, wave, overtone, circle, keys, roll, cpu, menu, state,
teardown}` so `test-p3` and `redpen-p3` have a handle to drive the page and count what comes
down — the same reason `ui/shell.js` parks itself on `window.cbdawShell`.

---

## WHAT IS MISSING RIGHT NOW, AND WHAT IS LEFT TO DO

The brief's fourth framing question, answered here as it asks.

- **Nothing this seat was assigned is unbuilt.** All nine questions are answered in code and
  the done-check runs green in a real browser.
- **`chord-module`'s `setParam` path list is not in CONTRACTS.** §11.4 and §11.5 wrote one
  for each P1 synth; §15 wrote none for this instrument. §2 leaves the path list to the
  instrument, so the table is in the file's own header — but a BUILD seat never extends
  CONTRACTS (§10, freeze notice), so **a SPEC seat should record it.** OD-C.
- **Two upstream defects are open and were REPORTED, NOT FIXED** — see below. Neither
  blocks this page.
- **What is left after this seat:** `test-p3` and `redpen-p3`. Not this seat's to start.
- **The Chord Module does not save through §7 yet** — `core/save.js` does not exist (P5) and
  §7's `channels[].notes[]` round-trip is not this seat's lane. `getState()` returns a
  JSON-safe object today and is ready for it.
- **`static playable = true`** and D-4 (whether the Chord Module also occupies one of the six
  fixed channels while driving another) is **still open and still Brandon's** — CONTRACTS §2
  says so and nothing here settled it. It does not bite on a standalone page; it will in P4.

---

## NEXT ACTION

**Hand off to `test-p3` and `redpen-p3`.** They get:

1. `/src/instruments/chord-module.js` and `/tools/harmony.html`.
2. The serve command and URL at the top of this receipt.
3. `docs/scratchpad/harmony-donecheck.html` — 61 checks, re-runnable, and the place to add
   more rather than starting over.
4. `window.cbdawHarmony.teardown()` for the leak pass.

**One-line jobs for whoever owns them — none are this seat's:**

- **`ui/shell.js`, one boolean.** `TOOLS`'s harmony row is still `available: false`, so the
  tool menu on the *other three* pages shows Harmony as "P3 — not built yet". The page works
  either way; the menu lies until someone who owns that file flips it. That file's own
  comment says "a later phase flips one boolean. That is the entire edit."
- **The messenger.** The brief says "post one state-change message" to the Troubleshooter.
  **That channel does not exist in this run's tool access, so it was skipped and is recorded
  here instead**, per the spawning instruction. Nothing was blocked on it.
- **Tap-out to Brandon:** OD-A and OD-B below are his by the brief's own ESCALATION clause.

---

## OPEN DECISIONS

Decider named on every one. **None blocks `test-p3` or `redpen-p3`.**

### OD-A · The four tones are labelled by their overtone count. **Brandon's.**

The brief: *"Escalate to Brandon: anything about the note bank's presentation or the four
tones."* There is no messenger in this run, so the shipped choice is the one that holds no
opinion: **1 · 3 · 6 · 12 partials, labelled "1 / no overtones", "3 / 2 overtones", "6 / 5
overtones", "12 / 11 overtones", with a bar-ladder icon that IS the partial count.** No
invented timbre word — no "reed", no "bright", no "hollow" — because naming a tone is a
judgement and this seat does not have one.

**What this seat would have asked:** do you want words on them, and are 1/3/6/12 the four
you want? **TO CHANGE:** the `TONES` array in `chord-module.js` §1 — add a `label`, change a
count, add or remove a row. Nothing else in the file enumerates them, and `getState`
round-trips the preset `id`, so renaming a label never invalidates a saved file.

### OD-B · The note bank's presentation. **Brandon's.**

Same clause. §15.10 hands over the data and says "the exact layout, sizing and animation are
`chord-module`'s". Shipped: a full-width panel, big coloured chord label with superscript
quality, one chip per tone carrying the scale number large, the overlay name under it, and
`root · bass` tags. **Not shipped and not invented:** any animation on the chips beyond the
sounding highlight, and any teaching text beyond the one lede line.
See [`docs/scratchpad/harmony-shot.png`](../../../docs/scratchpad/harmony-shot.png).

### OD-C · This instrument's `setParam` path list is not in CONTRACTS. **A SPEC seat's.**

§11.4 and §11.5 wrote a path table for each P1 synth. §15 wrote none for this one. §2 leaves
the list to the instrument, so it lives in the file's header, but a BUILD seat may not extend
CONTRACTS. The table as shipped:

```
tone.preset     'p1' | 'p3' | 'p6' | 'p12'
chord.octave    int 1..7            chord.root      int 0-6
chord.numeral   string (parseNumeral, case ignored in)
chord.count     int 1..MAX_COUNT    chord.inversion int 0..count-1
chord.spread    int[] (−2..+2)      chord.system    'numeral' | 'letter'
route.target    'self' | instrument id
env.attack | env.decay | env.sustain | env.release      §11.3, on every voice-bearing instrument
```

### OD-D · `env.*` exists as paths but is not drawn. **Brandon's, low risk.**

§11.3 is binding — "these four paths exist on **every** voice-bearing instrument" — and P4's
automation and P5's preset loader call them programmatically. Brandon's spec for this module
is "four preset tones plus an octave selector. **Nothing more.**" Both are honoured: the four
paths work, clamp to §11.3's ranges, default to §10-G's frozen values, and apply live to
sounding voices (§11.7c) — and **no envelope control is drawn.** **TO DRAW THEM:** one row
in `_paint`. **TO REMOVE THEM:** you cannot, without breaking §11.3.

### OD-E · `bindState` / `bindTargets` / `bindInput` are not in §2. **A SPEC seat's, or nobody's.**

§2 fixes the constructor at `(ctx, out)`, so anything an instrument must be *pointed at*
arrives after construction. Two S5 seats already hit this and answered it the same way
(`piano-roll.bindState`, `scale-circle.attachState`). All three here are wiring, not music;
all three are optional; all three have a working default (the shared store, no targets, no
bus). Recorded so the pattern is ruled once rather than re-invented a fourth time in P4.

### ⚠ REPORTED, NOT FIXED — two upstream items. Fixing another seat's file is a STOP condition.

1. **`chord.js`'s numeral naming is not symmetric with its letter naming.** Brandon ruled six
   **letter** seventh-chord names (F4); the numeral side is deliberately not extended, and
   `chord-engine`'s own header says why and says it is Brandon's (`viiø7` vs `vii7b5`,
   `Imaj7` vs `IM7`). **This module prints whatever `chord.js` returns and adds nothing.** In
   the note bank's numeral system a four-note stack on vii in C major reads `vii°7` where a
   classroom writes `viiø7`. Flagged here because this page is the first place a student sees
   it. **Not this seat's to fix.**
2. **Two known bugs were left alone on instruction:** `scale.js`'s `GLYPH_ASCII` italicises
   the sharp glyph and not the flat, and `step-grid.js`'s ruler mislabels steps on multi-bar
   patterns. Neither file was opened. Both are Brandon's, later.
3. **One defect in this seat's OWN file was found and fixed, by running the real page:**
   `Node.contains(window)` **throws** `TypeError: parameter 1 is not of type 'Node'` rather
   than returning false, and it took the whole mount down. The listener-bag sweep in
   `_renderChips` is now guarded on `nodeType`. Recorded because it is the kind of thing only
   a real browser finds — the headless-DOM harnesses the S5 seats used would have missed it.

---

## PROPOSED INDEX.md / SESSIONLOG.md LINES

This seat does not write those files. Proposed text, for the Closer:

**INDEX.md — DOCS**

```
- [receipt-chord-module.md](Builddocs/P3-harmony-tool/S6-chord-module/receipt-chord-module.md) — P3/S6 receipt: the Chord Module and /tools/harmony.html, 61/61
- [harmony-donecheck.html](docs/scratchpad/harmony-donecheck.html) — P3/S6 browser done-check harness, re-runnable
- [harmony-shot.png](docs/scratchpad/harmony-shot.png) — the shipped harmony page, all three surfaces live
```

**SESSIONLOG.md**

```
- P3/S6 `chord-module` — SHIPPED. /src/instruments/chord-module.js (CONTRACTS §2, four
  overtone-count tones, routes to any bound instrument, the §15.10 note bank) and
  /tools/harmony.html (all three surfaces live at once, page-owned scale). 61/61 in real
  Chrome. P3's build is closed; test-p3 and redpen-p3 are next. Escalated to Brandon: the
  four tones' naming (OD-A) and the note bank's presentation (OD-B).
```

---

## FILE LOCATIONS

**Written by this seat — its whole lane, and nothing outside it**

- [`/src/instruments/chord-module.js`](../../../src/instruments/chord-module.js)
- [`/tools/harmony.html`](../../../tools/harmony.html)
- [`Builddocs/P3-harmony-tool/S6-chord-module/receipt-chord-module.md`](receipt-chord-module.md) — this file

**Throwaways, this seat's, named here so nothing is stray**

- [`docs/scratchpad/harmony-donecheck.html`](../../../docs/scratchpad/harmony-donecheck.html) — the 61-check harness
- [`docs/scratchpad/harmony-shot.png`](../../../docs/scratchpad/harmony-shot.png) — the shipped page

**Read, called, and NOT edited**

- [`Builddocs/CONTRACTS.md`](../../CONTRACTS.md) — §2, §4, §5, §6, §9, §10, §11.1–§11.7, §12.1, §15.5–§15.10
- [`/src/theory/scale.js`](../../../src/theory/scale.js) · [`/src/theory/chord.js`](../../../src/theory/chord.js)
- [`/src/core/state.js`](../../../src/core/state.js) · [`/src/core/audio.js`](../../../src/core/audio.js) · [`/src/core/input.js`](../../../src/core/input.js)
- [`/src/surfaces/scale-circle.js`](../../../src/surfaces/scale-circle.js) · [`/src/surfaces/diatonic-keys.js`](../../../src/surfaces/diatonic-keys.js) · [`/src/surfaces/piano-roll.js`](../../../src/surfaces/piano-roll.js)
- [`/src/ui/shell.js`](../../../src/ui/shell.js) — REUSED, NEVER EDITED · [`/src/ui/tokens.css`](../../../src/ui/tokens.css)
- [`/src/instruments/wave-synth.js`](../../../src/instruments/wave-synth.js) · [`/src/instruments/overtone-synth.js`](../../../src/instruments/overtone-synth.js) — routing targets
- [`docs/scratchpad/scale-circle-test.html`](../../../docs/scratchpad/scale-circle-test.html) — the working example of mounting surfaces on the real store

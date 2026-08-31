# REDPEN REPORT — P2 Beat Tool — `redpen-p2` (P2/S7)

Seat: `redpen-p2`, REDPEN function, last seat in P2. Brief: [A-redpen-p2.md](A-redpen-p2.md).
Receipt: [receipt-redpen-p2.md](receipt-redpen-p2.md).
Opened: **2026-08-23 21:03 EDT** · Written: **2026-08-23 21:08 EDT**.

**Zero code edited.** This seat wrote exactly two files, both in `Builddocs/P2-beat-tool/S7-verify/`:
this report and its receipt. Nothing under `/src`, `/tools`, `/assets`, no `CONTRACTS.md`, no
`test-report.md`, no P3.

**Method.** Every finding below is read off the shipped source, not off a receipt. Where a seat's
own file header makes a claim ("this file never records audio", "no second AudioContext"), the
claim was re-checked by grep across the whole of `/src` and `/tools` rather than believed.
Baseline: [CONTRACTS.md](../../CONTRACTS.md) §2, §3, §6, §7, §10, §13, §14 · the
[outline](../../../outline)'s Rhythm section · [test-report.md](test-report.md) ·
[ROSTER.md](../../ROSTER.md) and each stage's STAGE.md collision map.

**Relationship to `test-p2`.** `test-p2` measured whether the code does what it says. This seat
asks a different question — whether what it says is what was contracted. The two reports overlap
in one place only (§9 of the test report, both items now closed by repair seats) and are
otherwise independent.

---

## 1 · Do both machines implement CONTRACTS §2 exactly? Method by method.

**Both implement every member. Neither is a pass on behavior alone — three divergences between
them are named below, and they are the same class of defect §11.7 was written to stop.**

`drum-synth.js` and `drum-sampler.js`, walked against §2's frozen block and its four
`[AMENDED 2026-08-22]` additions:

| §2 member | `DrumSynth` | `DrumSampler` | Verdict |
|---|---|---|---|
| `static id` / `label` / `playable` | `'drum-synth'` · `'Drum Synth'` · `true` | `'drum-sampler'` · `'Drum Sampler'` · `true` | **both exact** |
| `constructor(ctx, out)` | takes both, connects to `out` | takes both, connects to `out` | **both exact** |
| `noteOn(note, velocity, atTime)` | `velocity = 0.8` default (§11.7a) | `velocity = 0.8` default (§11.7a) | **both exact** |
| `noteOff(note, atTime)` | present, documented no-op | present, documented no-op | **contract silence, filled identically — see D-8** |
| `allNotesOff()` | steals every live voice, 5 ms fade | steals every live voice, 5 ms fade | **both exact** |
| `setParam` / `getParam` | `out.gain` + `piece.<0-7>.<key>` | `kit` **only** | **DIVERGE — see D-5** |
| `getState()` / `setState(obj)` | `{gain, pieces[]}`, JSON-safe, no-op on malformed | `{kit}`, JSON-safe, no-op on malformed | **both exact** |
| `get voiceCount` | live `Set.size` | live `Set.size` | **both exact** |
| `get cpuWeight` | live voices + analyser (2) | live voices + 0 | **consistent with each graph** |
| `mountCompact` / `mountExpanded` / `unmount` | present | present | **both exact** |
| `dispose()` | frees voices, disconnects, drops listeners | same, **plus releases decoded buffers** | **both exact** |
| `static needsLoad` | `false` | `true` | **both exact per §14.5** |
| `async ready()` | resolves immediately | resolves on the in-flight kit load | **see the note below** |
| `getAnalyser(which)` | one node for `'spectrum'` **and** `'scope'` | `null` for both | **DIVERGE — see D-5** |
| `static pieces` | §14.1's eight, index order | §14.1's eight, index order, frozen | **both exact, and identical** |
| `static emitsNotes` / `onNoteOut` / `offNoteOut` | `false`, no-ops | `false`, no-ops | **both exact** |

**§2's four hard rules — both clean.** Neither creates an AudioContext (the only `new
AudioContextCtor()` in the repo is `core/audio.js:26`). Neither connects to `ctx.destination`
(the only `.connect(ctx.destination)` in the repo is `core/audio.js:59`, the master analyser).
`atTime` is honored as an AudioContext time and passed straight through — `beat.html`'s `KitPair`
forwards it unrounded to both machines. Both survive `dispose()` with their nodes disconnected
and their listeners dropped; `test-p2` measured 0 growth over 20 mount/dispose cycles.

**On `ready()` — not filed as drift, but stated so P4 does not trip on it.** `DrumSampler`
declares `needsLoad = true`, but `ready()` returns immediately whenever no kit load is in flight
— including on a freshly constructed instrument that has never been given a kit. §14.5's own
words make that the right answer ("the grid draws its eight rows and accepts clicks the moment it
is mounted, whether or not a kit has decoded"), and §3 forbids blocking startup on it. So
`await sampler.ready()` is **not** a guarantee that the sampler can make sound; it is a guarantee
that nothing is pending. `kitStatus` is the property that actually answers "can this play." The
file documents this. Named here because `needsLoad = true` reads like a promise `ready()` does
not make, and P4's shell will be the next thing to assume it does.

**One shared robustness gap, low severity, contained.** Both machines pass `velocity` through
`clamp(v, 0, 1)`, which returns `NaN` for a `NaN` input rather than a number, and a `NaN` then
reaches `linearRampToValueAtTime` / `setValueAtTime` and throws. §11.7a rules only on
`undefined`, so this is outside what the contract requires, and it is contained in practice:
`step-grid.js` clamps velocity itself before every call, and `clock.js`'s `emit()` wraps every
listener in `try/catch` so a throw cannot stop the transport. Noted, not filed — both machines
behave identically, which is the outcome §11.7 asks for.

---

## 2 · Does the grid implement §13 exactly? Tick conversion, triplets, velocity, labels.

**Tick conversion: exact. Triplets: exact. Velocity: exact. Labels: exact strings, one
divergence in when they are drawn. One §13.6 requirement is not implemented at all and cannot
be — see D-2.**

**§13.1 tick math — imported, not reimplemented, which is the rule.** `step-grid.js:56-60`
imports `ticksPerBar` and `ticksPerStep` from `clock.js`, which is where §13.1's four functions
live. §13.1's own words: "there is only one implementation of each." The grid writes no tick
arithmetic of its own and no `+1` outside those functions — §13.1's stated tripwire, clean.
`clock.js` carries `toTicks`, `fromTicks`, `stepToTicks`, `ticksToStep`, `ticksPerBeat`,
`ticksPerBar`, `ticksPerStep`, `stepsPerBar`, each transcribed from §13.1 verbatim, each
`PPQ`-derived and never hard-coded. The counting origins match §13.1's table exactly: absolute
tick 0-based, `bar` 1-based, `beat` 1-based, `position.tick` 0-based, lane `step` 0-based.

**§13.2 triplets — one machine, not two.** `lane.division` is a per-lane integer, exactly as
§13.2 fixes it. `SUPPORTED_DIVISIONS = [1, 2, 3, 4, 6, 8]` is §13.2's table with no additions.
Scheduling is `ticksPerStep(lane.division, ts)` and nothing else — the same expression for a
triplet lane as for a 16th lane, with a 3 where a 4 was. §13.2's tripwire is "a seat that writes
`if (isTriplet)` around anything other than the label lookup and the number of columns it draws";
the only `TRIPLET_DIVISION` comparisons in the file are a button's label (`'T'` vs `'4'`), its
`aria-pressed`, and the toolbar toggle's next-value. **No second code path.** Per-lane, not
per-pattern: `setLaneDivision(i, d)` sets one row, which is §13.2's own hi-hat-over-kick example.
`test-p2` measured 0 ticks of drift at division 3 over 64 bars.

**§13.5 velocity and step data — exact.** A step is `null | {v}` with no `on:` flag, which is
§13.5's whole point. `v` is clamped 0–1. A tap writes `DEFAULT_VELOCITY = 0.8` — §13.5's
"one number, four places", correctly restated rather than invented. A press-and-drag turns the
cell into a one-finger fader and writes the dragged value. Lane arrays are dense, length
`bars × top × division`, and `resizeLaneSteps()` implements §13.5's grow/shrink rule literally:
grows keep what they had and pad with `null`, shrinks keep the steps that still fit.
`MAX_BARS = 8` is the grid seat's own UI limit, which §13 OPEN DECISIONS item 7 explicitly
assigns to it — authorized, not invented.

**§13.3 labels — the strings are right. See seat question 3 for whether they are Brandon's.**
`stepLabel(step, division)` is §13.3's `label()` transcribed, and `SYLLABLES` is §13.3's table
transcribed: `{1: [], 2: [,'+'], 3: [,'+','a'], 4: [,'e','+','a']}`. Divisions 6 and 8 fall
through to `''`, which is §13.3 OPEN DECISIONS item 5's stated behavior ("leave the subdivisions
blank"), not a gap the seat filled on its own. The function is **exported** so P3's piano roll and
P4's ruler import it rather than writing a second one — §13.3 requires "three surfaces, one
function" and does not name the file it lives in; putting it in the one file this seat owns and
exporting it is the same reasoning `clock.js` used for §13.1's math. Correct.

**Divergence — `overlay = 'none'` still draws the beat digits.** `_renderRuler()` renders
`this._overlay === 'syllable' || c === 0 ? stepLabel(step, division) : ''`, so with the overlay
off, every beat digit is still drawn and only the subdivisions blank out. §6 (frozen) gives a
rhythm surface exactly two values, `'none'` and `'syllable'`, and §13.3 says the toggle "decides
whether the strings are *drawn*." Under §13.3's own `label()` the beat digit **is** one of those
strings. As shipped, `'none'` is not none. Whether a bare digit ruler is the better teaching
default is a design question and not this seat's — the divergence from §6's two-value enum is the
finding. **D-6, LOW.**

**§13.6 — one requirement is unimplemented, and the data shape makes it unimplementable.**
§13.6: a note whose tick does not land on its lane's grid "is kept and sounds at its true tick;
the grid draws it at the nearest step and **marks it off-grid**." `step-grid.js:380` ships the
style for exactly that — `.cbdaw-grid__cell[data-off-grid="true"]` — and **nothing anywhere in
`/src` or `/tools` ever sets that attribute.** It cannot: `setPattern()` is the only route into
the grid's data, and §13.5 fixes a step at `null | {v}` — velocity is the only field — so the
pattern shape has no bit to carry off-grid-ness through. This is not a BUILD seat's mistake; it
is **§13.5 and §13.6 asking for different things**, and it belongs to whoever owns §13.
**D-2, MEDIUM.** It compounds with D-7 (seat question 8): `capture`'s default is a hard snap, so
in P2 nothing off-grid is ever produced in the first place — which is why neither the grid seat
nor `test-p2` ever saw the dead code path.

**§13.4 time signature — the grid reads `bottom` as an integer and renders two digits.**
Correct against §13.4 as written. Whether §13.4 is correct against Brandon is seat question 3.

---

## 3 · Are the counting labels Brandon's? → **ESCALATED TO BRANDON. THREE ITEMS, NOT ONE.**

**This seat does not have an opinion on how rhythm is taught and does not offer one.** Below is
what the [outline](../../../outline) says in Brandon's words, what the app does, and where the
two differ. Nothing here is a recommendation.

The outline's Rhythm section is four lines. The app matches two of them, contradicts one, and
uses different words for the fourth. **Two of these three findings are new — only the time
signature has been raised before.**

### 3a · Beats as whole digits — ✅ MATCHES

> **Outline, line 20:** "Beat: full unit to label a variable/relative measure of time
> (we measure it **whole digits**)"

`stepLabel()` returns `String(Math.floor(step / division) + 1)` on every beat boundary — a whole
digit, 1-based, counting to `ts.top` and restarting each bar. Drawn larger and brighter than the
subdivisions (`[data-beat="true"]`, 22 px in the expanded view). **The app does exactly what the
line says. No divergence.**

### 3b · Subdivisions as `e + a` — ✅ MATCHES, and the triplet set is his but is not in the outline

> **Outline, line 21:** "Subdivision: any unit that divides a full beat (we use syllables,
> **e + a**)"

At 16ths the app draws `1 e + a  2 e + a  3 e + a  4 e + a`. That is the outline's own syllables
and it is also §6's frozen `syllable = 1 e + a`. **No divergence.**

At triplets the app draws `1 + a  2 + a  3 + a  4 + a`. **This set is not in the outline** — the
outline names one syllable set and it is the 16th-note one. It comes from
[open-decisions.md](../../P0-run-open/open-decisions.md) **D-14**, where the question was "What
syllables count triplets?" and Brandon's answer, verbatim and complete, is the two lines:

> `1 + a    2 + a`

So the triplet syllables **are** Brandon's — just from the transcript rather than the outline.
Flagged only so that a future reader comparing the app against the outline alone does not
conclude a seat invented them. **No divergence. No action needed unless Brandon wants the
outline updated to carry it.**

Divisions 6 and 8 draw beat digits and blank subdivisions, because Brandon has named two syllable
sets and no seat invented a third. Correct, and already Brandon's per §13.3 OPEN DECISIONS 5.

### 3c · The time-signature bottom — ❌ **DIRECT CONTRADICTION, AND THE ANSWER ON THE RECORD IS AMBIGUOUS**

> **Outline, line 22:** "Time signature: Top number tells you how many beats per measure,
> **I use the symbol for the bottom number**"

**The app renders two plain digits — `4/4` — in both places it appears** (`step-grid.js`'s
toolbar and `beat.html`'s transport). No symbol, and no glyph set exists anywhere in the code.

This has now been raised three times in this phase (`spec-clock`, `grid`, `beat-shell`), each
time resolved the same way by citing §13.4, which cites **D-20**. This seat was asked for a clean
read rather than a fourth repetition, so here is the part that has not been said:

**D-20's question and D-20's answer are not obviously about the same thing.** Verbatim:

> **D-20 · Which symbol for which time-signature bottom number?**
> You teach the bottom number as a **symbol**, not a digit. The symbol set is not written
> down anywhere.
>
> **brandon** it doesn't need to be there

The question asked was **"which symbol maps to which number"** — a request for the symbol set.
"It doesn't need to be there" has two readings, and they produce two different apps:

- **Reading A — "the symbol doesn't need to be there."** Drop the glyph, keep the number as a
  digit. → renders `4/4`. **This is what §13.4 chose and what ships today.**
- **Reading B — "the bottom number doesn't need to be there."** Drop the bottom of the time
  signature from the display entirely, symbol and digit alike. → renders `4`. **Nothing in the
  app does this, and nobody has considered it.**

The nearest antecedent for "it" in the question's own text is *"The symbol set"*, which favors
Reading A. But the question's subject across both its sentences is *the bottom number*, and under
Reading B the app currently displays the exact thing Brandon said doesn't need to be there.

**One more piece of context that sharpens the conflict rather than settling it.** The adjacent
ruling, **D-13**, is about the other half of the same time signature, and Brandon's answer there
is:

> **AN AGENT STARTED QUESTIONING ME, I WAS SPECIFIC ON PURPOSE** FOLLOW THE SCOPE

The scope — the outline — says *symbol*. So on one time-signature question Brandon's instruction
is to follow the outline, and on the next his answer is read as overriding it. Both readings of
D-20 were reachable by a seat acting in good faith, and §13.4 picked one and froze it into every
downstream display without the ambiguity ever being named.

**What this seat is not doing:** not choosing a reading, not proposing a glyph set, not
recommending a change. §10-H: "a BUILD seat that finds itself picking a scale, a syllable, a
spelling, or a chord name has left its lane."

> **BRANDON'S CALL, and the app is cheap to change either way.** The bottom number enters the
> app in exactly one computational place — `ticksPerBeat = (4 × PPQ) / bottom` — and §13.4 says
> "nothing else reads it." Every display of it is a string in two files. Whichever reading you
> meant, no arithmetic moves.

### 3d · Tempo wording — ⚠️ **NEW. Not raised by any prior seat.**

> **Outline, line 23:** "Tempo: how many beats **per second** (giving it an attribute to make its
> measurement concrete)"

The app labels this control **"Tempo"** with the unit **"BPM"** (`beat.html:745`, `:766`), on a
range of 20–300 with a default of 120. `clock.js` computes `secPerTick = 60 / (bpm × ticksPerBeat)`
— the 60 makes it unambiguously **beats per minute**.

So: the app's arithmetic is beats-per-minute, its label says "BPM", and the outline's sentence
says "per second." A student reading the outline and then reading the screen is told two
different units for the same control.

This seat is **not** asserting the outline is wrong, is not correcting it, and is not touching
it. Naming it because it is in the Rhythm section the brief points at, the wording differs, and
in three passes over this material nobody has flagged it. **Decider: Brandon** — it is one word
of his own curriculum text, and §10-H makes the wording his.

---

## 4 · Can the grid tell the two machines apart?

**No. Verified against §14.5's four named prohibitions, one at a time, by grep — not by reading
the file's own claim about itself. This is the cleanest result in the phase.**

§14.5 lists four things the grid may not do. Each was searched for by name in
`src/surfaces/step-grid.js`:

| §14.5 forbids | Hits in `step-grid.js` |
|---|---|
| read `kit.json`, `kits.json`, or anything under `/assets/` | **0 in code.** The only matches are inside the file's own header comment (lines 20–21). There is no `fetch(` in the file at all. |
| call a `playPiece(index)`-style method | **0.** No such call, and neither machine defines such a method. |
| branch on `constructor.id`, on `needsLoad`, or on whether a kit is loaded | **0 in code.** The only matches are the header comment and the explanatory comment at lines 468–469. No `instanceof`, no `.id ===`, no `ready()` wait, no `kitStatus` read. |
| hold a note number of its own | **0.** The single occurrence of `note` in executable code is `piece.note` at line 987 — read off `Instrument.pieces` at the moment of the call, never stored. `lane.piece` is an index 0–7 exactly as §13.5 requires. |

**The grid's total contact surface with an instrument is three lines**, and they are the two
frozen §2 members §14.5 names and nothing else:

- `step-grid.js:485` — `this.instrument?.constructor?.pieces`
- `step-grid.js:746` — `piece.label`, for the row label only
- `step-grid.js:987` — `this.instrument.noteOn(piece.note, clampVelocity(step.v), timeOf(t))`

That last line is §14.5's own "playing a step is one line, and it is the same line for both
machines," transcribed. `bindInstrument()` stores a reference and does nothing else — no
`ready()` await, no `needsLoad` check. A step played before a sampler's kit has decoded makes no
sound and is not an error, which is §14.5's stated behavior.

**`beat.html` does not weaken this — it strengthens it.** The page hands the grid a `KitPair`
that is not an instrument at all: it owns no AudioNode, allocates no voice, and satisfies exactly
the two members the grid can reach for, forwarding `noteOn` to both machines with `atTime` passed
through unrounded. The grid cannot tell it is driving a pair rather than a machine, which is the
premise working. The page also asserts `DrumSynth.pieces` and `DrumSampler.pieces` agree on
`index` and `note` for all eight roles **before building a single node** (`assertSameRoles`,
`beat.html:340`) — §14.1's invariant checked rather than assumed. That is beyond what the
contract asks for and it is the right instinct.

**Independently confirmed against the shipped kit manifests.** `/assets/kits/808/kit.json` and
`/assets/kits/acoustic/kit.json` both carry exactly eight pieces with `index` 0–7 and the note
numbers 36 · 38 · 42 · 46 · 39 · 45 · 50 · 49 — §14.1's table exactly, neither kit moving an
index or a note. The 808 overrides its labels ("808 Kick"), which §14.1 explicitly permits and
which the sampler applies to **its own pads only**, never to `static pieces` — so the grid's row
order and row count never change underneath a student when a kit is swapped. `kits.json` is
§14.3's shape. **No drift.**

**Nothing filed against seat question 4.**

---

## 5 · Did anything violate CONTRACTS §10?

**No — on all six of §10's original prohibitions and all three of its amended ones. The rAF case
the brief flagged as likely is clean, and I checked the playhead specifically.** One §10 clause
does have a real finding, but it is the *interface-invention* clause, not the audio ones, and it
is documentation debt rather than a defect: **D-3**.

### The six original prohibitions

**1 · Create a second AudioContext — CLEAN.** Exactly one construction exists in the entire repo:
`src/core/audio.js:26`, `export const ctx = new AudioContextCtor()`. Every other occurrence of the
word across `/src` and `/tools` is prose in a comment. No `OfflineAudioContext` anywhere. Every P2
file that needs a context imports `ctx`; `capture.js` does not even import `audio.js`.

**2 · Schedule audio from `requestAnimationFrame` — CLEAN, and this is the one I chased hardest.**
There are seven live rAF loops across `/src` and `/tools`. I traced each to whether it can reach a
`noteOn`, a node construction, or a `start()`:

| rAF loop | What it does | Reaches audio? |
|---|---|---|
| `step-grid.js:604 / :998` — **the playhead** | reads `clock.positionTicks` (a pure number), sets `playhead.style.left`, toggles an `.is-playing` class, and notices a time-signature change by comparing two integers | **no** |
| `beat.html:488` → `_syncTransport()` | reads `clock.state`, `positionTicks`, `countingIn`, `loop`, `bpm`; writes text into named DOM refs | **no** |
| `shell.js:853` — the CPU meter | reads `governor.load`, `voicePool.count`, `instrument.cpuWeight`, `audio.state`; writes text and a width | **no** |
| `spectrum.js:261 / :441`, `scope.js:256 / :394` | `getByteFrequencyData` / `getByteTimeDomainData` off an analyser the instrument owns, then canvas draws | **no** — reads only, per §2's rule that a visual never inserts or reconnects a node |
| `overtone-synth.js:767` (P1) | a UI animation | **no** |

Cross-checked from the other direction: **every `noteOn` call site in the repo**, and where each
is invoked from —

- `step-grid.js:987` — inside `_onTick`, i.e. **the scheduler**, with `timeOf(t)`. Correct.
- `beat.html:1006` — inside `_wireLiveMonitoring`, an `input.on('noteon')` bus handler, deliberately
  with no `atTime` so a monitored hit sounds now. A user-gesture path, not a frame path.
- `shell.js:1078` — same shape, an input-bus handler.
- `drum-synth.js:882`, `drum-sampler.js:699` — pad `pointerdown` handlers.

**No rAF callback reaches any of them.** §3's "two different loops and they never cross" holds in
this phase.

**3 · Write a file outside the lane the seat brief names — CLEAN.** See seat question 6.

**4 · Add a dependency — CLEAN.** No `package.json`, no `node_modules`, no lockfile anywhere in
the project. Every `import` in `/src` and `/tools` is a relative path; there is not one bare or
remote specifier. Zero external URLs of any kind in either tree — no CDN, no font, no analytics.

**5 · Add a build step before P5 — CLEAN.** No bundler config of any kind (no webpack, vite,
rollup, babel, tsconfig, Makefile). `/tools/beat.html` is a plain page loading ES modules by
relative path; `test-p2` loaded it cold off `python3 -m http.server` at 12 resources.

**6 · Invent an interface that is not in this file — ONE FINDING, D-3.** `clock.js` publishes
eight public members and one event that no section of CONTRACTS defines: `positionTicks`,
`countingIn`, `schedulerLoad`, `lastPassMs`, `countInRemainingBars`, `leadingEdgeTicks`,
`unschedule()`, and the `'resync'` event — plus **the entire `'tick'` payload shape**
(`{fromTick, toTick, timeOf, secPerTick, bpm, timeSignature, ticksPerBeat, ticksPerBar, state}`),
which §3 names as an event but never specifies.

Each is honestly marked `EXTENSION` in the source and each was reported in the seat's handoff, so
nothing was hidden — this is not a seat sneaking something through. But §13/§14 are P2's assigned
contract sections and **none of these was ever written into them**, and three other files now
depend on them hard: the grid's playhead reads `positionTicks`, `capture`'s entire deferred
live-projection rests on `leadingEdgeTicks`, and `capture`'s count-in gate reads `countingIn`.
P3's piano roll and P4's arrangement ruler will bind to the same undocumented surface.
**D-3, MEDIUM.** The remedy is a §13 amendment, not a code change — and per the FREEZE NOTICE
that is `spec-clock`'s section, with §3's own text being Brandon's alone.

### The three amended prohibitions

**Never `await requestMIDIAccess()` on the startup path — CLEAN.** `input.js`'s `requestMIDI()`
is a module-load side effect, fire-and-forget. `beat.html` awaits nothing on mount; it calls
`inst.ready()` without awaiting and attaches a `.catch()`.

**Never assume the app runs from `file://` — CLEAN.** Every verification in this phase, this seat's
included, ran over `http://127.0.0.1`. No absolute `file:` path appears in any shipped file.

**Never assume the AudioContext is running at load — CLEAN.** `beat.html` imports and wires
`unlock()`, and `shell.js`'s meter shows `audio.state` with an unlock button that hides only once
the state reads `running`. The UI draws and the grid accepts clicks while suspended.

---

## 6 · Does every file stay in its lane?

> ### ✅ **NO LANE VIOLATION. NOTHING TO ESCALATE.**
>
> Every write in this phase lands either in a seat's declared lane or in a Troubleshooter-routed
> repair. **No file was written by a seat that does not own it.** No STOP condition was raised at
> any point in this seat's run.

**Method — mtime, not receipts.** Receipts assert their own lanes; asserting is not evidence. So
the whole of `/src`, `/tools` and `/assets` was stamped and sorted, and the boundary between P1's
run and P2's is unmistakable in the timestamps.

**P1's output was not touched by P2. This is the load-bearing result.** Ten files carry mtimes
from P1's window (00:14 – 01:59) and none has moved since:

| File | mtime | Owner |
|---|---|---|
| `src/core/input.js` | 00:14 | P1 `keys-input` |
| `src/ui/tokens.css` | 00:21 | P1 `scopes` |
| `src/vis/scope.js` · `src/vis/spectrum.js` | 00:21 · 00:32 | P1 `scopes` |
| `tools/wave-synth.html` · `tools/overtone-synth.html` | 00:46 · 00:47 | P1 `tone-shell` |
| **`src/core/audio.js`** | **01:28** | **P1 `audio-core` — frozen** |
| `src/surfaces/keyboard.js` | 01:54 | P1 `keys-input` |
| `src/instruments/overtone-synth.js` · `wave-synth.js` | 01:57 · 01:59 | P1 `overtone-voice` · `wave-voice` |

**`audio.js` at 01:28 is the important one.** `fix-clock` was assigned the CPU-meter bug, and the
clean fix was one added method in `audio.js` — a frozen P1 file. Its receipt says it did not make
that edit and escalated instead. **The mtime proves it independently.** That is a repair seat
stopping at a wall it was told not to cross, with a verbatim patch written into its receipt for
whoever is allowed to apply it. Correct behavior, and worth saying out loud.

**Every P2-era write, matched to its declared lane:**

| File | mtime | Written by | Lane authority |
|---|---|---|---|
| `assets/kits/**` (2 kits, 18 files) | 18:49 | `drum-sampler` | S4 collision map: "`/assets/kits/**` — `drum-sampler` only" ✓ |
| `src/core/capture.js` | 19:11 | `capture` | S5 STAGE.md: "this seat creates it" ✓ |
| `tools/beat.html` | 19:39 | `beat-shell` | S6 STAGE.md: "this seat creates it" ✓ |
| `src/surfaces/step-grid.js` | 19:47 | `grid`, then `fix-grid` | S4 map ✓ · repair, Troubleshooter-routed ✓ |
| `src/core/clock.js` | 20:05 | `clock`, then `fix-clock` | S3 STAGE.md ✓ · repair ✓ |
| `src/ui/shell.js` | 20:59 | `fix-shell`, then `fix-shell-availability` | repairs, both Troubleshooter-routed ✓ |
| `src/instruments/drum-synth.js` · `drum-sampler.js` | 20:59:56 | `drum-synth` · `drum-sampler`, then `fix-drum-css` | S4 map ✓ · repair ✓ |

**On the five repair seats — the right question is whether each stayed scoped, not whether it
touched a closed file.** All five were explicitly Troubleshooter-routed after `beat-shell`'s
integration testing surfaced real bugs in files whose owning seats had already ended their runs,
which is what ROSTER.md says routes to the Troubleshooter. So the mere fact of a repair touching a
closed file is not a violation. What I checked instead is whether any repair widened past the one
bug it was spawned for, or introduced new drift:

| Repair | Files | Scope check |
|---|---|---|
| `fix-clock` | `clock.js` | **Correctly scoped.** Closed B1 (count-in seam), B2 and B3 (loop escape). Re-ran the original seat's own regression numbers rather than assuming. Hit the `audio.js` wall and **stopped** — half the CPU-meter bug is escalated, not patched around, and no monkey-patch was left behind (confirmed by `audio.js`'s untouched mtime). |
| `fix-grid` | `step-grid.js` | **Correctly scoped.** One closure, in one listener-attach block, reading `this._pattern.lanes[index]` fresh instead of a stale captured object. Reproduced the bug before fixing and re-ran the same sequence after, on both a throwaway harness and the real page. Scratch file created and deleted. |
| `fix-shell` | `shell.js` | **Correctly scoped.** Two functions changed from private to exported; no other line touched, no signature changed. Deliberately did **not** go on to delete `beat.html`'s now-redundant duplicate CSS — another seat's file — and flagged it instead. That restraint is the correct call and it is why that duplicate is still open (see below). |
| `fix-shell-availability` | `shell.js` | **Correctly scoped.** One boolean, `false` → `true`, on one row of the `TOOLS` table. Verified all three affected pages. |
| `fix-drum-css` | `drum-synth.js` + `drum-sampler.js` | **Correctly scoped, and the two-file reach is inherent to the bug** — a cross-file CSS class collision cannot be fixed in one file without picking a winner. Renamed `.ds-*` → `.dsyn-*` / `.dsam-*`. Verified order-independence in **both** mount orders, which is the actual property that was broken. Re-read against the shipped source: no `.ds-` selector survives in either file. |

**No repair introduced new drift.** Nothing in the current source contradicts any repair receipt's
claims; every claim I could re-derive from the files, I did, and all held.

**Two known-open items, neither a lane violation:**

1. `tools/beat.html` still carries the marked duplicate CSS block that `fix-shell`'s new export
   makes unnecessary. `fix-shell` correctly refused to edit another seat's file. **Owner:
   `beat-shell`'s file; Troubleshooter to route.** Cosmetic, zero functional effect. *(Note:
   `test-report.md` §9's two items are both now closed — item 1 by `fix-shell-availability`,
   item 2 by `fix-drum-css`. This is a third item, from `fix-shell`'s own receipt, and it is
   still open.)*
2. `governor.load` still reads 0.0000. Documented in `receipt-fix-clock.md` OPEN DECISIONS 1,
   awaiting Brandon's ruling on the `audio.js` hook. **A documented gap, not drift** — the honest
   number exists and moves on `clock.schedulerLoad`, and `clock.js` already calls a
   `reportSchedulerPass()` hook duck-typed so that the `audio.js` side is an addition needing no
   second edit here.

---

## 7 · Is audio ever recorded?

> ### ✅ **NO. Not in `capture.js`, and not anywhere else in the app.**

`capture.js`'s own header makes this claim about itself and invites the grep. **I did not take the
claim — I ran the grep, and I ran it across all of `/src` and `/tools`, not just the one file**,
because a file asserting its own innocence is the weakest possible evidence and because the risk
here is another file recording audio, not this one.

Searched case-insensitively across both trees for every API that can capture a signal:

| API | Hits in `/src` + `/tools` |
|---|---|
| `getUserMedia` | **0** |
| `MediaRecorder` | **0** |
| `MediaStream` / `MediaStreamAudioSourceNode` | **0** |
| `AudioWorklet` / `AudioWorkletNode` | **0** |
| `ScriptProcessor` / `ScriptProcessorNode` | **0** |
| `createMediaElementSource` | **0** |
| `captureStream` | **0** |

The only matches anywhere are the three lines of `capture.js`'s own header prose naming the APIs
in order to disclaim them. **There is no code path in this application that can record audio, and
no permission it could ask for.**

**`capture.js` records integers.** Structurally confirmed, not just by absence:

- It **does not import `core/audio.js`** and never touches the AudioContext. Its only imports are
  `clock.js` (read-only, for tick math and transport state) and `input.js` (the §5 event bus).
- A captured note is four numbers plus two metadata fields: `{tick, length, note, velocity}` —
  §7's four frozen fields — plus `source` and `lane`. `toProjectNotes()` strips it back to exactly
  §7's four and adds no key to the project file, which §7's freeze requires.
- The rolling `keepLast()` buffer holds the same integers. `RING_MAX_EVENTS = 512` caps it, so a
  stuck controller cannot grow it without bound. Nothing in it is a sample.
- It **never calls `noteOn`** either — confirmed against the repo-wide call-site list in seat
  question 5. `capture.js` appears nowhere on it. It is not a second scheduler and it makes no
  sound; if it did, every captured hit would double against the grid's own scheduling.
- `source` (`'midi' | 'key' | 'mouse' | 'touch'`) is stored and tallied for the take report and
  never read by anything computing a tick, a note number, or a velocity — §5's "nothing downstream
  may branch on `source`," honored literally.

**The one place an `AudioBuffer` legitimately exists is the sampler, and it is playback, not
capture.** `drum-sampler.js` calls `decodeAudioData` on `.wav` files Brandon puts under
`/assets/kits/`, and `dispose()` drops those buffers per §2's amended rule. That is reading files
off disk to play them. Nothing writes one.

**Nothing filed against seat question 7.**

---

## 8 · What drift did you find, and who owns each?

**Seven items. No STOP condition, no lane violation, and nothing that stops P3 from starting.**
The two most consequential are not BUILD-seat errors at all — one is a conflict between two
subsections of §13, and one is documentation debt that P3 and P4 will inherit.

| # | File | Seat | Contract | Severity | What |
|---|---|---|---|---|---|
| **D-1** | `src/instruments/drum-sampler.js` | `drum-sampler` (P2/S4) | **§14.3** | **MEDIUM** | A kit folder with a missing or bad `kit.json` is never "listed as unavailable, named, and **not selectable**" — every kit in `kits.json` renders as a selectable option and the failure is only discovered *after* the student picks it. §14.3's stated pre-selection behavior is unimplemented. |
| **D-2** | `src/surfaces/step-grid.js` + §13 itself | **`spec-clock`** (P2/S1), not a BUILD seat | **§13.5 vs §13.6** | **MEDIUM** | §13.6 requires an off-grid note be "marked off-grid"; §13.5 fixes a step at `null \| {v}` with velocity as the only field, so the pattern shape **cannot carry the mark**. The grid ships the CSS (`[data-off-grid="true"]`) and nothing can ever set it. A contract-internal conflict, not repairable in a seat's lane. |
| **D-3** | `src/core/clock.js` | `clock` (P2/S3), extended by `fix-clock` | **§10** ("invent an interface") / §3 | **MEDIUM** | Eight public members (`positionTicks`, `countingIn`, `schedulerLoad`, `lastPassMs`, `countInRemainingBars`, `leadingEdgeTicks`, `unschedule`, `'resync'`) plus the entire `'tick'` payload shape are in no contract section. Honestly marked EXTENSION and reported — but §13/§14 were never amended, and three files bind to them hard. P3 and P4 will build on an undocumented surface. |
| **D-7** | `src/core/capture.js` | `capture` (P2/S5) | **§13.6** | **MEDIUM** | `quantize` defaults to `{on: true, strength: 1}` — a hard snap — and `toProjectNotes()` writes the **snapped** `tick`, not `trueTick`. So by default a take is quantized on its way into the §7 project file, and the true performance survives only in the in-memory take. §13.6's own words: "quietly quantizing a student's recorded take is a guess." It is not *quiet* — every commit reports `moved` and a drift `summary` — but the stored result is identical to quantizing. |
| **D-5** | `drum-synth.js` + `drum-sampler.js` | both (P2/S4) | **§2 / §11.7** | **LOW–MED** | The two machines implement the same §2 members differently: `getAnalyser()` returns one node for both taps vs. `null` for both; `setParam` exposes `out.gain` + per-piece keys vs. `kit` only, so **the sampler has no output gain at all** — it cannot be set, automated, or round-tripped through `getState()`. Neither is wrong against §2 alone; §11.7 exists precisely because two behaviors can't both be "the" behavior, and declares itself binding on every instrument forward. |
| **D-6** | `src/surfaces/step-grid.js` | `grid` (P2/S4) | **§6 / §13.3** | **LOW** | `overlay = 'none'` still draws every beat digit; only subdivisions blank. §6 gives a rhythm surface two values and §13.3 says the toggle decides whether the strings are drawn — the beat digit is one of those strings. As shipped, `'none'` is not none. |
| **D-8** | `drum-synth.js` + `drum-sampler.js` | both (P2/S4) | §2 | **INFO** | `noteOff()` is an intentional no-op in both. Correct for a one-shot, backed by §13.5's "no length," documented in both files, and — the point — **filled the same way by both seats independently**. Named only because §2 is frozen and a P4/P5 caller reading §2 alone would expect note-off to stop a sound. No action. |

### Not drift — carried, so the Closer does not re-file them

- **`governor.load` reads 0.0000.** Documented in `receipt-fix-clock.md` OPEN DECISIONS 1. The
  honest number exists and moves on `clock.schedulerLoad`; `clock.js` already calls a duck-typed
  `reportSchedulerPass()` so the `audio.js` side is a pure addition. **Awaiting Brandon's ruling
  on editing a frozen P1 file.** A documented gap, not drift.
- **The seven `§14.1` piece labels are `PROVISIONAL`.** Brandon's, escalated by `spec-clock`,
  non-blocking, and correctly carried unchanged by both machines and both kit manifests.
- **`beat.html`'s duplicate CSS block.** `fix-shell` created the export that makes it unnecessary
  and correctly refused to edit another seat's file. **Owner: `beat-shell`'s file, Troubleshooter
  to route.** Cosmetic.

### Escalated to Brandon (seat question 3, and one more)

1. **The time-signature bottom.** The outline says symbol; the app renders digits; §13.4 cites
   D-20. **New:** D-20's answer, *"it doesn't need to be there,"* is ambiguous between *drop the
   symbol* (ships today: `4/4`) and *drop the bottom number entirely* (`4`), and nobody has named
   that. Adjacent ruling D-13 says "FOLLOW THE SCOPE," and the scope says symbol.
2. **Tempo wording.** The outline says "beats per second"; the app says "BPM" and computes per
   minute. **New — no prior seat raised it.** His curriculum text, §10-H.

### One observation outside this seat's phase, reported and not acted on

`open-decisions.md` **D-22** asks how many partials the Overtone Synth stacks; Brandon's answer is
**"1-12"**. CONTRACTS **§11.5** fixes the count at **8**, and `spec-voice`'s own OPEN DECISIONS
item 1 names Brandon as the decider if he wants a different number — apparently without his D-22
answer having been applied. `src/instruments/overtone-synth.js` ships 8 partials.

**This is P1, it is outside my lane, and I have not touched it.** Flagging it only because I read
`open-decisions.md` for D-14 and D-20 and it was on the same page. **Troubleshooter's to route,
Brandon's to decide.** It does not affect P2 and does not block P3.

---

## DONE-CHECK

- [x] All eight seat questions answered.
- [x] Every drift item names file + seat + contract section + severity.
- [x] Lane violations escalated the moment found — **there were none**; seat question 6 is clean.
- [x] Seat question 3 escalated to Brandon, as the standing rule requires regardless of finding.
- [x] **Zero code edited.** No file under `/src`, `/tools`, `/assets`, no `CONTRACTS.md`, no
      `test-report.md`, no P3. This seat wrote two files, both in `S7-verify/`.

## HANDOFF

This report → the Troubleshooter, and forward into P3.

**What P3 should know before it starts, in one line each:** D-2 and D-3 both land on P3's desk —
the piano roll binds to §13.5 and §13.6 (D-2's conflict) and to `clock.js`'s undocumented public
surface (D-3). §13.3's `stepLabel()` is exported from `src/surfaces/step-grid.js` and P3's piano
roll must import that one, not write a second — §13.3 requires three surfaces and one function.

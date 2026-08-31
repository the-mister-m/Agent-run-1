# RECEIPT — `chord-engine` (P3/S4)

Seat: `chord-engine`, BUILD. Opened **2026-08-24 17:22 EDT**.
Last update: **2026-08-24 17:42 EDT** — **REOPENED AND RE-CLOSED.** Brandon ruled the
seventh-chord letter names this seat had escalated; the ruling is built, verified and
closed out below. See **WHAT CHANGED AT 17:42** immediately after the done-check.
Lane: [`/src/theory/chord.js`](../../../src/theory/chord.js), one file.
**CONTRACTS.md not touched. `theory/scale.js` not touched. No surface touched. No
MEMORY.md / CLAUDE.md / SESSIONLOG.md / INDEX.md edit.**

**One honesty note on process:** [A-chord-engine.md](A-chord-engine.md) says "write it after
each seat question — eight writes." This receipt was written **once**, at the end. The eight
questions are each answered below; the write count is not what the brief asked for and I am
saying so rather than implying otherwise.

## ✅ STAGE DONE-CHECK — **CLEARED**

[STAGE.md](STAGE.md): *"Every roman numeral in every one of the 12 scales, altered and
unaltered, produces correct notes and correct case."*

**120 named checks, 0 failures**, and the sweep inside them carries **2,520 individual
assertions** — every roman numeral × **all 12 tonics** × **five scale shapes** (unaltered
plus **four different alteration paths**, each reached by real `setScaleDegree` presses
inside `DEGREE_CLAMP`, not by hand-typed arrays) × six properties each: pitch classes,
case, roman letters, the 7th identity, and inversion distinctness.

**Correctness is never established from `chord.js` itself.** Two independent sources:

1. [theory-report.md](../S2-theory-check/theory-report.md)'s hand-worked tables — **Q7, Q9
   and Q10** — are read out of the report **at run time by exact-anchor match** and compared
   to generated blocks. The comparison is against the real source bytes; nothing is retyped.
2. Where no hand-worked table exists (the 12-tonic sweep), every expected value is
   **re-derived inside the check** by walking `scale.degrees` directly — pitch classes by
   hand-rolled `+12`-per-wrap arithmetic, case from the **raw third interval**. A tautology
   would prove nothing, so there is none.

Run it: `node "docs/scratchpad/chord-donecheck.mjs"` from the project root.

---

## ⬥ WHAT CHANGED AT 17:42 — BRANDON RULED THE SEVENTH-CHORD NAMES

**This closes the one music question this receipt escalated at 17:29.** `chordName` printed
**`C7` for C E G B**, colliding with the real meaning of that chord symbol. Brandon answered
with six interval specs and the name each takes. **His six rows, verbatim, are now the
spec** and they ship as `SEVENTH_NAME` in [`chord.js`](../../../src/theory/chord.js):

| Interval spec | Name | Triad quality | 7th span | Reachable at |
|---|---|---|---|---|
| `P1-M3-P5-M7` | **`Dmaj7`** | major | 11 | major, degrees 1 and 4 |
| `P1-M3-P5-m7` | **`D7`** | major | 10 | major, degree 5 |
| `P1-m3-P5-m7` | **`Dm7`** | minor | 10 | major, degrees 2, 3, 6 |
| `P1-m3-P5-M7` | **`Dm(maj7)`** | minor | 11 | harmonic minor, degree 1 |
| `P1-m3-d5-d7` | **`Ddim7`** | diminished | 9 | harmonic minor, degree 7 |
| `P1-m3-d5-m7` | **`Dm7b5`** | diminished | 10 | major, degree 7 |

**Brandon:** *"If we don't need all of those, then don't put them in, but I wanted to be
exhaustive. I DO WANT THEM DOCUMENTED IN THE EVENT I WANT TO PUT THEM IN LATER."*
**All six ship, and none of them is theoretical** — the done-check brute-forces **every
degree array `DEGREE_CLAMP` allows** (5⁷ arrays × 7 degrees) and finds all six occurring in
real scale data. Nothing is dead code and nothing is a reference-only row.

### The six, built from real scales and spelled from D — done-check output

| Chord | reached from | degree | triad | 7th span | `chordName` | `chordNameParts` | notes |
|---|---|---|---|---|---|---|---|
| **D major 7** | Major on D | 1 | major | 11 | **Dmaj7** | `{base:'D', sup:'maj7'}` | D F♯ A C♯ |
| **D dominant 7** | Major on G | 5 | major | 10 | **D7** | `{base:'D', sup:'7'}` | D F♯ A C |
| **D minor 7** | Major on C | 2 | minor | 10 | **Dm7** | `{base:'D', sup:'m7'}` | D F A C |
| **D minor-major 7** | Harmonic Minor on D | 1 | minor | 11 | **Dm(maj7)** | `{base:'D', sup:'m(maj7)'}` | D F A C♯ |
| **D diminished 7** | Harmonic Minor on E♭ | 7 | diminished | 9 | **Ddim7** | `{base:'D', sup:'dim7'}` | D F A♭ C♭ |
| **D half-diminished 7** | Major on E♭ | 7 | diminished | 10 | **Dm7b5** | `{base:'D', sup:'m7b5'}` | D F A♭ C |

**What was added** — a **second interval axis**, computed exactly the way the colour rule's
first one is: `seventhQuality(scale, root)` classifies the root-to-fourth-stacked-tone span
mod 12 (9 → diminished, 10 → minor, 11 → major, anything else → `'altered'`), by one
subtraction on the pitches the scale already produced. `scale.tonic` is not an input and no
key table exists, exactly as `degreeQuality` requires of itself.

**Why this is not the chord-formula table §15.7 forbids, and it is asserted, not asserted-
at:** `SEVENTH_NAME` maps **[triad quality, seventh class] → a string**. It is never
consulted to decide which notes a chord has. The done-check proves this **structurally** —
it extracts the body of every pitch-producing function (`skipStack`, `voicing`,
`numeralPitchClasses`, `rootScaleNote`, `invert`, `spread`) and asserts **none of them
references the naming table** — and behaviourally: the 2,520-assertion sweep still passes
unchanged, so **the ruling moved no pitch anywhere in the app.**

**Superscript, per A9 and per Brandon's own note.** He wrote `Dm(maj7)` with *"maj7"
superscript*; A9 already puts every quality marker in `sup`, and F1 already put the plain
`m` there. So **the whole suffix goes in `sup`** — `{base:'D', sup:'m(maj7)'}` — and
`chordNameParts` is the single place that decides, if he ever wants the `m` inline instead.

**What was deliberately NOT done, because it would have been inventing:**

- **Pairs Brandon did not name fall back to the pre-ruling `LETTER_SUFFIX + EXT`.** An
  augmented triad with a seventh still prints `C+7`; an `'altered'` stack prints `D?7`.
  Six such pairs are reachable from real scale data — `augmented+major`, `augmented+minor`,
  `augmented+diminished`, `diminished+major`, `major+diminished`, `minor+diminished`.
  Naming them is a chord name and §10-H makes it his. **One row each, in `SEVENTH_NAME`.**
- **Count 5 and up are untouched.** A five-tone stack still prints `C9` for C E G B D. His
  six rows are about the **seventh**; whether C E G B D is `Cmaj9` is a further naming
  decision. **To extend: a `NINTH_NAME` table beside `SEVENTH_NAME`.**
- **The numeral system is unchanged** — see the next block, which corrects this receipt's
  own earlier reasoning.

### ⛔ STILL BRANDON'S — the same collision exists on the NUMERAL side, and my 17:29 reasoning was too generous

This receipt said numerals were safe because `I7` is scale-relative. **Re-checked against
the six qualities, that is only partly true.** §15.7 explains what the *digit* counts; it
does not stop the whole label from reading as established numeral vocabulary. **Three of the
six collide, in exactly the way the letter side did:**

| App prints | App means | A classroom reads it as | Verdict |
|---|---|---|---|
| `V7` | G B D F | dominant 7 | ✅ no collision |
| `ii7` | D F A C | minor 7 | ✅ no collision |
| **`I7`** | C E G B | a I chord with a **minor** 7th — a secondary dominant | ⛔ collides; `Imaj7` is C E G B |
| **`vii°7`** | B D F A — **half**-diminished | **fully** diminished (B D F A♭) | ⛔ collides; the same error `B°7` was |
| **`i7`** | A C E G♯ in harmonic minor | minor 7 | ⛔ collides; `i(maj7)` |

**NOT extended, for two reasons and neither is reluctance.** (1) Brandon ruled six **letter**
names; the numeral equivalents need a choice between `viiø7` and `vii7b5`, `Imaj7` and
`IM7`, `i(maj7)` and `i(M7)` — that is picking a chord name, §10-H. (2) `numeralOf`'s
formula is stated in **CONTRACTS §15.8** and BUILD never changes a contract; the letter side
moved only because Brandon directly ruled it. **The done-check asserts §15.8's numeral
formula is byte-for-byte unchanged.**

**Half the work is already done for whenever he rules:** `seventhQuality` is exported and
already computes the axis. **To extend: a `NUMERAL_SEVENTH` table beside `SEVENTH_NAME`,
keyed identically, read from `numeralOf`/`numeralParts` at count 4.**

### ⚠ THIS RULING BELONGS IN CONTRACTS §15.8 / F1 AND THIS SEAT DID NOT PUT IT THERE

**CONTRACTS.md was not touched.** F1's `chordName = spellingOf + LETTER_SUFFIX + EXT` is now
**superseded at count 4** by a Brandon ruling that lives only in `chord.js` and in this
receipt. **A later seat reading §15.8 alone will build the wrong thing.** Recommend the
Troubleshooter or `spec-scale` write the six rows into §15.8/F1 with today's date.
**Reported, not fixed — BUILD never changes a contract.**

---

### FULL NUMERAL TABLE — C major (tonic 0, unaltered)

| Degree | Quality | §9 token | Numeral | `numeralParts` | Letter name | 4-tone | Pitch classes | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | major | `--deg-major` | **I** | `{base:'I', sup:''}` | **C** | **I⁷** / **Cmaj7** | 0, 4, 7 | C E G |
| 2 | minor | `--deg-minor` | **ii** | `{base:'ii', sup:''}` | **Dm** | **ii⁷** / **Dm7** | 2, 5, 9 | D F A |
| 3 | minor | `--deg-minor` | **iii** | `{base:'iii', sup:''}` | **Em** | **iii⁷** / **Em7** | 4, 7, 11 | E G B |
| 4 | major | `--deg-major` | **IV** | `{base:'IV', sup:''}` | **F** | **IV⁷** / **Fmaj7** | 5, 9, 0 | F A C |
| 5 | major | `--deg-major` | **V** | `{base:'V', sup:''}` | **G** | **V⁷** / **G7** | 7, 11, 2 | G B D |
| 6 | minor | `--deg-minor` | **vi** | `{base:'vi', sup:''}` | **Am** | **vi⁷** / **Am7** | 9, 0, 4 | A C E |
| 7 | diminished | `--deg-dim` | **vii°** | `{base:'vii', sup:'°'}` | **B°** | **vii°⁷** / **Bm7b5** | 11, 2, 5 | B D F |

**The 4-tone letter column is Brandon's 17:42 ruling working.** Every one of those seven is
the textbook name of the chord beside it, and the numeral column beside it is unchanged.

### FULL NUMERAL TABLE — A harmonic minor (tonic 9, reached by two `+/-` presses)

`setScaleDegree(2, −1)` and `setScaleDegree(5, −1)` from A major — both inside the clamp.
The published triad series of harmonic minor is **i · ii° · III+ · iv · V · VI · vii°**.
**Nothing below was looked up; every cell is the formula run on the array.**

| Degree | Quality | §9 token | Numeral | `numeralParts` | Letter name | 4-tone | Pitch classes | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | minor | `--deg-minor` | **i** | `{base:'i', sup:''}` | **Am** | **i⁷** / **Am(maj7)** | 9, 0, 4 | A C E |
| 2 | diminished | `--deg-dim` | **ii°** | `{base:'ii', sup:'°'}` | **B°** | **ii°⁷** / **Bm7b5** | 11, 2, 5 | B D F |
| 3 | augmented | `--deg-aug` | **III⁺** | `{base:'III', sup:'+'}` | **C+** | **III⁺⁷** / **C+7** | 0, 4, 8 | C E G♯ |
| 4 | minor | `--deg-minor` | **iv** | `{base:'iv', sup:''}` | **Dm** | **iv⁷** / **Dm7** | 2, 5, 9 | D F A |
| 5 | major | `--deg-major` | **V** | `{base:'V', sup:''}` | **E** | **V⁷** / **E7** | 4, 8, 11 | E G♯ B |
| 6 | major | `--deg-major` | **VI** | `{base:'VI', sup:''}` | **F** | **VI⁷** / **Fmaj7** | 5, 9, 0 | F A C |
| 7 | diminished | `--deg-dim` | **vii°** | `{base:'vii', sup:'°'}` | **G♯°** | **vii°⁷** / **G♯dim7** | 8, 11, 2 | G♯ B D |

**Degree 3 is the visible fallback:** an augmented triad with a seventh is a pair Brandon
did not name, so it keeps the pre-ruling `C+7`. One row in `SEVENTH_NAME` closes it.

*(The superscript glyphs in the Numeral column are the check's rendering of
`numeralParts().sup`, per A9. `numeralOf` returns the flat `III+`, `vii°7`.)*

### The rest of the brief's DONE-CHECK, item by item

| Required | Result |
|---|---|
| every numeral, **12 tonics**, unaltered + **≥3 alterations**, correct pitches and case | **PASS** — 5 shapes × 12 tonics × 7 degrees, expected values re-derived independently |
| a **7th chord in an altered scale uses that scale's 7th degree** | **PASS** — the §15.7 identity `skipStack(r,4)[3] === rootScaleNote(r,7) + degrees[r]` asserted on all 420 (shape, tonic, degree) combinations, plus Q7's hand-worked A-harmonic-minor table character for character |
| **all inversions of a triad return distinct voicings** | **PASS** — `invert(v, 0..2)` pairwise distinct on all 420 combinations |
| **no DOM or audio import** | **PASS** — asserted over the file with comments stripped: no `document`, `window`, `navigator`, `AudioContext`, `requestAnimationFrame`, `addEventListener`, `localStorage`, `fetch(`. **Exactly one import, `./scale.js`** |
| paste the numeral tables into the receipt | **above** |

**Two prohibitions asserted, not just observed:** no chord-formula table (`maj7`, `dom7`,
`m7 =`, `[0,4,7…`) exists in the executable text, and **no banned synonym for Brandon's
term** (`seventh chord`, `tetrad`, `extended chord`) appears in it.

## DELIVERABLE STATE

The eight seat questions from [A-chord-engine.md](A-chord-engine.md), answered in code:

| Seat question | State |
|---|---|
| 1 · **Is the skip method literal?** | **DONE** — `skipStack` is `k += 2` over the degree array in **stored order**, mod 7, `+12` per wrap, and it calls **`scale.js`'s own `stackOffset`** — the identical function the colour rule uses. One implementation, two callers; they cannot drift. `count = 3` is the default and it is enforced as a curriculum requirement, not a convenience. |
| 2 · **Are chords beyond three notes upper overtone chords?** | **DONE** — `isUpperOvertoneChord(count) = count > 3`, and the term is in the API (`noteBank().isUpperOvertoneChord`). The file contains **no** "seventh chord", "tetrad" or "extended chord" — asserted. |
| 3 · **Do 7th chords build without being foregrounded?** | **DONE** — every default in the file is 3. Raising `count` to 4 makes a tone appear carrying `scaleNumber: 7`; it is reachable, it is explained by the digit on it, and it is never what a student gets by default. Asserted both ways. |
| 4 · **Does numeral case come from the colour rule?** | **DONE** — `applyCase` reads `degreeQuality`'s output, which is the colour rule itself. **There is no key lookup table anywhere in the file.** Case is carried by the **third** (4 → UPPER, 3 → lower), which the sweep re-derives from the raw interval on 420 combinations. |
| 5 · **Do chord numbers refer to scale information?** | **DONE, and it is true by construction** — `chordToneScaleNumber(j) = 2j + 1`, because `skipStack` builds tone `j` at `k = 2j` and `rootScaleNote` reaches number `n` at `k = n − 1`. Worked altered-scale example below. |
| 6 · **What is an inversion, in data?** | **DONE** — a **voicing**: absolute midi pitches, in sounding order. `voicing` / `invert` / `spread` / `bassOf`, root position and all rotations of a triad, all distinct. **No inversion label exists** — A10's slash notation, in both naming systems. |
| 7 · **What does the note bank return?** | **DONE** — exact shape and consumer contract below. |
| 8 · **Is it pure?** | **DONE** — no DOM, no audio, no state, no subscriptions; **one** import, `./scale.js`, the direction §15.6 mandates. Runs in bare node. |

### Seat question 5, worked — the altered-scale example the brief asks for

`tonic: 9` (A), `degrees: [0, 2, 3, 5, 7, 8, 11]` — A major with two `+/-` presses. The
chord on **degree 5** (`root = 4`, the pitch E):

- **E's scale inside this key**, from `rootScale(scale, 4)` → `[0, 1, 4, 5, 7, 8, 10]` =
  **E F G♯ A B C D**. Nothing looked that up and the app never needs to know it has a name.
- **The 7th note of E's scale is D.** The four-tone chord on degree 5 is **E G♯ B D** —
  `skipStack(scale, 4, 4)[3] === 17`, and `rootScaleNote(scale, 4, 7) + degrees[4] === 17`.
  **The same number, from two different walks of the same array.**
- **Now move a degree the student has no reason to connect to it.**
  `setScaleDegree(3, +1)` — degree 4 of the A scale, one press, inside the clamp. The 7th of
  **E's** scale moves **D → D♯** and the chord becomes **E G♯ B D♯**. **No line of code
  changed and no table was consulted.** A `dom7 = [0,4,7,10]` table would have gone on
  printing D forever. That is the outline's clause working on a scale nobody anticipated.

### Seat question 7 — the note bank's exact return shape

`noteBank(scale, { root, count = 3, octave = 4, inversion = 0, offsets = null, system = 'numeral' })`

**The numeral side** — `numeral` (flat string) · `numeralParts` `{base, sup}` · `chordName`
· `chordNameParts` `{base, sup}` · `chordLabel` (slash form) · `chordLabelParts`
`{base, sup, slash}` · `degreeNumber` · `quality` · `colorToken` · `isUpperOvertoneChord`.

**The scale side** — `tones[]`, one entry per sounding pitch, each with `scaleNumber`
(1, 3, 5, 7, 9, 11, 13) · `degreeIndex` · `pc` · `midi` · `letter` · `solfege` · `number` ·
`colorToken` · `isRoot` · `isBass`. Then `voicing` (the midi array, after rotation and
spacing) and `bass`.

**What a surface is expected to draw from it:** `numeralParts` as the heading with `sup` in
a superscript element (A9 — never `numeralOf`, which is the flat string for tests, exports,
tooltips and saved files); `chordLabelParts` when the voicing is not in root position; and
**one chip per `tones` entry**, showing that tone's `scaleNumber` and whichever of
`letter` / `solfege` / `number` the surface's §6 overlay selects, painted with that tone's
own `colorToken`. `voicing` is what gets played — one §2 `noteOn` per pitch.

**`tones[k]` always names the tone sounding at `voicing[k]`, even after a rotation.** The
identities are rotated alongside the pitches rather than re-derived from them, which is
§15.9's "a seat that sorts a voicing has thrown away which tone is which," honoured.

**The note bank computes no label and no colour of its own.** Every string and token on the
way out came from `scale.js` or from §15.8/§15.9.

## NEXT ACTION

**The three P3/S5 surface seats and `chord-module` (P3/S6) may start.** The handoff is
[`/src/theory/chord.js`](../../../src/theory/chord.js), ES module, and every function §15.6's
module-boundary table assigns to this file exists and is exported:
`skipStack` · `isUpperOvertoneChord` · `rootScale` · `rootScaleNote` ·
`chordToneScaleNumber` · `parseNumeral` · `numeralPitchClasses` · `applyCase` · `numeralOf`
· `numeralParts` · `chordName` · `chordNameParts` · `voicing` · `invert` · `spread` ·
`bassOf` · `bassText` · `chordLabel` · `chordLabelParts` · `noteBank`, plus **Brandon's
17:42 ruling** as `seventhQuality` · `seventhSuffix` · `SEVENTH_NAME`, the data tables
`ROMAN` · `SUFFIX` · `LETTER_SUFFIX` · `EXT` · `INTERVAL_NAME`, and the two flippable
constants `VOICING_ORDER` · `MAX_COUNT`.

**Read before you draw:** a surface that draws a chord label uses **`numeralParts` /
`chordNameParts` / `chordLabelParts`**, never the flat-string function — A9's superscript
rule binds both naming systems equally, and that includes the letter system's `m`.

## OPEN DECISIONS

### ✅ CLOSED 2026-08-24 17:42 — BRANDON RULED IT. *(the question, kept beside its answer)*

**Brandon's six rows are built, verified and documented** — see
**[WHAT CHANGED AT 17:42](#-what-changed-at-1742--brandon-ruled-the-seventh-chord-names)**
above. The question as it was escalated at 17:29 is kept below so it stays readable beside
its answer. **What survives it, and is still his:** the same collision on the **numeral**
side (three of six), the pairs he did not name, and count 5 and up.

**The letter label for a four-tone chord reads as a chord symbol that means something else.**
F1 defines `chordName = spellingOf + LETTER_SUFFIX[quality] + EXT[count]`, and the quality
comes from the **triad** (§15.4 rule 2). That is exactly what shipped. Its consequence in
the letter system, visible in the C-major table above:

- **`C7`** is what the app prints for **C E G B**. To anyone who reads chord symbols — which
  includes a student in a performing group — `C7` means **C E G B♭**. The app means Cmaj7.
- **`F7`** for **F A C E** has the same collision. **`B°7`** for **B D F A** is a
  half-diminished chord printed with the fully-diminished symbol.
- **The numeral system does not have this problem.** `I7` is safe because §15.7 already
  defines the digit as *the 7th note of that root's scale*, and the note bank prints that
  number on the note. **Only the letter system inherits an outside convention.**

**This seat had no opinion on music theory (§10-H) and did not invent a naming rule — it
asked.** **Brandon answered**, and the answer is `SEVENTH_NAME`: six rows, his strings, read
only by `chordName` and `chordNameParts` through one private `letterSuffixOf`. **`SUFFIX`,
`EXT` and the whole numeral system are untouched by it** — two systems, two tables, which is
the shape F1 established and this ruling preserved.

### ⚠ REPORTED, NOT FIXED — `redpen-theory`'s M-12 is real and it is in this file

**M-12: `invert(v, n)` rotates `v[0]`, which is not always the lowest pitch.**
`redpen-theory` proved §15.9's "offsets already ascend by construction" false in **two
`+/-` presses inside the clamp**: from `[0,4,4,3,7,9,11]`, `skipStack(root = 1)` returns
`[4, 3, 9]`. On such a stack the rotation moves the wrong note and the slash label names a
bass the student did not hear move.

**§15.9 states this function's code literally and BUILD never changes a contract, so the
contract's code is what shipped**, with the defect written at the call site. `bassOf` is
correct and unaffected either way.

- Brandon's option **(a)** — rotate the **lowest** tone: replace `out.shift()` with a splice
  at `out.indexOf(Math.min(...out))`. **One expression, in `invert`.**
- Brandon's option **(b)** — refuse to invert an `'altered'` stack: one guard, in `invert`
  or in `noteBank`.
- **`noteBank` inherits whichever answer lands**, because it calls `invert` and rotates the
  tone identities by the same `inversionTimes(n, length)`.

### Engineering calls by this seat — all reversible, none a theory ruling

| Call | Why | Change it at |
|---|---|---|
| **M-3 — `VOICING_ORDER = 'invert-first'`** (rotate the bass, then space) | §15.10 never states the order and the two give different, audible voicings. Two things point the same way and neither is a new decision: §15.10's own field comment reads *"voicing — §15.9, **after inversion and spread**"*, and the outline's word order is *"**rearranging** and **spacing** them out"*. **What I would have asked instead:** whether spacing should be able to move a tone below the bass the student chose | `VOICING_ORDER`, one constant, `chord.js` |
| `noteBank` takes an additive **`system = 'numeral'`** option | §15.10 lists `chordLabel`/`chordLabelParts` among its fields but never says which of A10's two systems the note bank speaks. The note bank is the numeral device by its own definition, and A10's numeral example is the one §15.10 prints. Every call written against §15.10's literal option list still works | one word, the default in `noteBank` |
| `parseNumeral` returns **`null`** on unparseable input | the contract states the success shape only. A teaching surface must never crash and must never silently pick a chord the student did not ask for | one return, `parseNumeral` |
| `parseNumeral` is **tolerant** — it keeps only `I` and `V`, so `'vii°7'` and `'V9'` parse | a saved file or a link carries the whole label, not a bare numeral | the `replace` in `parseNumeral` |
| `count` **clamps** to 1…7 rather than throwing | §15.6 states the domain as "1 … 7"; a held button stops visibly instead of doing nothing. **M-7 is Brandon's** — flooring at 3 is one character, and it is marked in the code | `clampCount` |
| `spread` with a missing or short `offsets` displaces nothing | same reason — never throw at a surface | `spread` |
| `tones[].number` reads the tone's **own degree index**, not a pitch-class lookup | on a scale where the student has moved one degree onto another, a lookup returns the lower of the two indices (§15.2a) and would mislabel the tone. §6's `'8'` is a property of a **slot** on a surface, not of a chord tone, so this field is 1-7 | `noteBank`'s `tones` map |
| `inversionTimes(n, length)` is **exported** | so anything rotating a parallel array rotates by exactly the same amount as `invert` and the two cannot fall out of step | delete it and inline the clamp |

### ⚠ FOR THE SURFACE SEATS (P3/S5) AND `chord-module` (P3/S6) — read before you draw

- **A letter chord label can contain MARKUP.** `chordName` builds on `scale.js`'s
  `spellingOf`, whose ±2 rows are A7's `<i>x</i>` and `<i>bb</i>` — Brandon's ruling, not a
  font fallback. A degree pushed to the clamp reaches it: in a scale with degree 2 raised
  two semitones, the chord label is literally `D<i>x</i>`. A surface drawing that with
  `textContent` prints the tags. **Same warning `scale-engine` left; it reaches chord labels
  too, and it is not this seat's call to change.**
- **`'altered'` labels are honest, not broken.** A stack that is not a triad prints the
  stored upper-case numeral with a superscript `?` (`II?`) and the letter head with the same
  mark. That is `spec-scale`'s flagged call in A9, kept.
- **`EXT[6] === EXT[7] === ''` (M-11, open).** A 3-, 6- and 7-tone chord on the same degree
  produce **byte-identical labels** — the series reads `V · V7 · V9 · V · V`. The data is
  not lost: `noteBank().isUpperOvertoneChord` and `tones.length` still say what is sounding,
  so **a surface must not rely on the label alone to tell them apart.**

### Still Brandon's, untouched by this seat

**M-4** (is `III/M6`'s bass the interval above the chord root, or the bass's scale degree?
— built as the contract's interval reading; one expression to flip) · **M-5** (does a
student ever *type* a numeral?) · **M-7** (are 1- and 2-note stacks in the domain, and what
are they called?) · **M-11** (do 6- and 7-tone chords get a mark that is not a name?) ·
**M-13** (no numeral can carry an accidental — `III+` where a classroom writes `♭III+`; no
prefix slot was invented here) · **M-6** (nobody owns *hearing* a scale as a scale — outside
this lane entirely) · **F1's open interaction**: in `tonic: 6` only, A1's enharmonic tie
makes a letter slash label read **`F♯/G♭/A♯`** — a string with two meanings for `/`. §15
escalated it itself and tied it to **M-1** against frozen §6. **It is in this file's output
and it is not this file's to decide.**

**M-15 is CLOSED for this seat, in code.** `chordName`, `chordNameParts` and
`LETTER_SUFFIX` are built per F1; `spellingOfPc` was already shipped by `scale-engine`;
`letterHead` does not appear anywhere in this file. Brandon's own `Dm/F` and the curriculum
skills list's `F ~> C/E ~> Dm/F ~> B♭/F` reproduce, verified against Q10's table.

### Nothing found wrong in `scale.js`

Read in full, used through eight imports, **not edited.** No bug to report.

## FILE LOCATIONS

**Written by this seat — these three files and nothing else:**

- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/src/theory/chord.js` — **the deliverable**, 668 lines, one import
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/chord-donecheck.mjs` — the throwaway done-check, 655 lines, **not project code**
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P3-harmony-tool/S4-chord-engine/receipt-chord-engine.md` — this file

**Read, not written:**

- [STAGE.md](STAGE.md), [A-chord-engine.md](A-chord-engine.md), [PHASE.md](../PHASE.md)
- [CONTRACTS.md](../../CONTRACTS.md) — §1, §4, §6, §9, §10 and §10-H, and **§15 in full**, A1–A11 and the 16:19 EDT F1/F2/F3 fix block
- [theory-report.md](../S2-theory-check/theory-report.md) — in full, all twelve questions and all sixteen mismatches
- [`src/theory/scale.js`](../../../src/theory/scale.js) — in full, **read only, not edited**
- [receipt-scale-engine.md](../S3-scale-engine/receipt-scale-engine.md), [scale-donecheck.mjs](../../../docs/scratchpad/scale-donecheck.mjs) — the sibling seat's handoff

---

# SESSION REVIEW — Chromebook DAW / Agent run 1 — `chord-engine` (P3/S4) — 2026-08-24 17:22–17:42 EDT

EDITS
- [src/theory/chord.js](../../../src/theory/chord.js) — new, then amended 17:42 on Brandon's seventh-name ruling. The chord engine: skip method, scale numbering, roman numerals, the letter label with `SEVENTH_NAME`, voicings and inversions, the note bank. Pure; one import, `scale.js`.
- [docs/scratchpad/chord-donecheck.mjs](../../../docs/scratchpad/chord-donecheck.mjs) — new, then extended 17:42. Throwaway done-check: 120 named checks, 2,520 sweep assertions, a 5⁷-array reachability brute force, 0 failures.
- [Builddocs/P3-harmony-tool/S4-chord-engine/receipt-chord-engine.md](receipt-chord-engine.md) — this receipt, updated in place rather than replaced.

STRAY FILES
- [docs/scratchpad/chord-donecheck.mjs](../../../docs/scratchpad/chord-donecheck.mjs) — throwaway by design, named here so it is not orphaned. `node docs/scratchpad/chord-donecheck.mjs` from the project root. Keep it until P3/S7 verify has its own harness, then it is disposable.

GOALS DONE
- STAGE done-check cleared: every roman numeral, 12 tonics, unaltered and on four alteration paths, correct pitches and correct case — expected values re-derived independently of `chord.js`.
- `theory-report.md` Q7, Q9 and Q10 reproduce character for character out of the engine, read from the report's own bytes.
- The 7th of a chord is the 7th note of that root's scale, on every altered scale, by construction — asserted 420 times.
- All inversions of a triad return distinct voicings; there is no inversion label anywhere.
- **M-15 closed in code** — the letter label path exists, and `Dm/F` prints `Dm/F`.
- **Brandon's seventh-chord ruling built and verified** — all six of his names, each reached from a real scale, spelled from D, asserted against hand-derived pitches; all six proven reachable by brute force over every array `DEGREE_CLAMP` allows; the ruling moved no pitch anywhere.
- All eight seat questions in [A-chord-engine.md](A-chord-engine.md) answered.
- All three P3/S5 surface seats and `chord-module` (P3/S6) are unblocked.

BRANDON'S TODOS
- ~~The letter label prints `C7` for C E G B.~~ **RULED 17:42 and built.** `Cmaj7`, `G7`, `Dm7`, `Am(maj7)`, `G♯dim7`, `Bm7b5` — all six, all reachable, all verified.
- **What his ruling left open, in his own area:** (a) the **numeral** side has the same collision on three of six — `I7`, `vii°7`, `i7` — and I did not extend it, because that needs numeral vocabulary (`viiø7` vs `vii7b5`) he has not given and because §15.8 is a contract; (b) six triad+7th pairs a real scale can produce were not named and fall back to `C+7`-style labels; (c) count 5 and up are untouched — C E G B D still prints `C9`, not `Cmaj9`.
- **CONTRACTS §15.8/F1 does not carry this ruling** — it lives only in `chord.js` and this receipt, and a later seat reading §15.8 alone will build `C7`. Someone with contract authority should write the six rows in.
- **M-12** — `invert()` rotates the first tone, not the lowest, and on a two-press altered scale those differ. Rotate the lowest, or refuse to invert a non-triad? One expression either way.
- **M-3** — shipped as rotate-then-space, on §15.10's own wording. Flip one constant if you want space-then-rotate.
- **M-7** — one- and two-note stacks are in `skipStack`'s domain and a single note reads as a "basic chord", which the outline says *is 3 notes*. Floor it at 3, or name them?
- **M-11** — `V`, `V7`, `V9`, `V`, `V`: 3-, 6- and 7-tone chords label identically. A mark that is not a name would fix it.
- **F1's tie key** — in `tonic: 6`, a letter slash label reads `F♯/G♭/A♯`. Whatever closes M-1 closes this.

CLOSER REVIEW
- Gets copy of review, not a contract.
- INDEX.md line proposed — `src/theory/chord.js — the chord engine: skip method, numerals, note bank, inversions (P3/S4)` — **who: session agent**
- SESSIONLOG.md line proposed — `P3/S4 chord-engine: /src/theory/chord.js written, 668 lines, one import. Done-check 120/120 with 2,520 sweep assertions; theory-report Q7/Q9/Q10 reproduce character for character. M-15 closed in code. Escalated the letter system's C7; Brandon ruled the six seventh-chord names and they are built and verified. The ruling is NOT in CONTRACTS §15.8 — flagged for contract authority.` — **who: session agent**
- The letter-extension question (`C7` for C E G B) — **CLOSED by Brandon 17:42, built and verified.** — **who: done**
- **Brandon's six seventh-chord names exist only in `chord.js` and this receipt. CONTRACTS §15.8/F1 still says `LETTER_SUFFIX + EXT`.** That is a contract edit and BUILD may not make it. — **who: Troubleshooter / `spec-scale`, with Brandon's authority**
- The numeral-side collision (`I7`, `vii°7`, `i7`) is **music, not engineering** — §10-H makes it Brandon's. `seventhQuality` is exported and ready; it needs a `NUMERAL_SEVENTH` table and his vocabulary. — **who: Brandon**
- M-12 sits in a contract-specified function; changing it is a CONTRACTS §15.9 edit, not a BUILD edit. — **who: Troubleshooter / Brandon**
- Nothing in `MEMORY.md`, `CLAUDE.md`, `SESSIONLOG.md` or `INDEX.md` was touched by this seat. — **who: closer**

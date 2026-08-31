# REDPEN REPORT — P3 Harmony Tool — `redpen-p3`

Seat: `redpen-p3`, P3/S7, REDPEN. Last seat in the phase. Task: [A-redpen-p3.md](A-redpen-p3.md).
Opened **2026-08-24 19:39 EDT**. Report started **2026-08-24 19:45 EDT**.

Read: [STAGE.md](STAGE.md) · [test-report.md](test-report.md) · [receipt-test-p3.md](receipt-test-p3.md) ·
[theory-report.md](../S2-theory-check/theory-report.md) in full · [ROSTER.md](../../ROSTER.md) ·
[CONTRACTS.md](../../CONTRACTS.md) §4 §5 §6 §9 §10 §12 §15 (whole section incl. A1–A11, F1–F4) ·
[S5's collision map](../S5-surfaces/STAGE.md) · [outline](../../../../outline) "Scales and chords".

Read as code: `src/theory/scale.js` · `src/theory/chord.js` · `src/surfaces/scale-circle.js` ·
`src/surfaces/diatonic-keys.js` · `src/surfaces/piano-roll.js` · `src/instruments/chord-module.js` ·
`src/core/state.js` · `src/ui/tokens.css` · `tools/harmony.html`.

**Written: this file and my receipt. No `/src` file, no `/tools` file, no CONTRACTS.md,
no `test-report.md`, no `theory-report.md`. Nothing was fixed. Nothing in P4 was started.**

---

## ⛔ ESCALATION — read before the body

Two escalations, both raised the moment they were found, neither one a phase STOP.

**1 · Lane crossing, CHARTERED — not a STOP.** `state-seam` (P3/S5, a seat not in
[ROSTER.md](../../ROSTER.md)) wrote `src/surfaces/diatonic-keys.js` and
`src/surfaces/scale-circle.js`, which S5's collision map assigns to `diatonic-keys` and
`scale-circle` "only". **I checked the charter before escalating and it holds:**
[SESSIONLOG.md](../../../SESSIONLOG.md) records the `core/state.js` build as spawned "per
Brandon's direct instruction," and each edit followed the target file's own written undo
comment. **So this is Brandon's call already made, not a seat out of its lane.** What is
genuinely stale is the paperwork: ROSTER.md has no `state-seam` row and S5's collision map
still says those two files have one writer each. Detail in **Q8**.

**2 · The colour rule and the numeral-case rule both HOLD in the shipped code.** No STOP
on either. Re-derived independently, not taken from `test-p3`: `degreeQuality` never reads
`scale.tonic`, twelve tonics produce byte-identical colour arrays and a byte-identical
numeral series, and no per-key table exists in any of the six files. **Q2** and **Q9**.

**Everything below that is Brandon's — seat question 5 and everything in question 1 — is
escalated to him by name and I hold no opinion on any of it.**

---

## Q1 — Did everything `redpen-theory` established in S2 survive the build?

Line-by-line over [theory-report.md](../S2-theory-check/theory-report.md): all sixteen
mismatches, both STOP-condition clearances, and the four things Q12 named unserved. Every
row was checked against the shipped code, not against a receipt.

### The two S2 clearances — both still true in code

| S2 finding | In the build | Verdict |
|---|---|---|
| **Q9 — colour rule computed from `degrees` alone** | `degreeQuality` = two subtractions on `skipTriad`; `scale.tonic` appears nowhere in it. `createScale(0,'Major')` and `createScale(7,'Major')` return byte-identical colour arrays (`--deg-major,--deg-minor,--deg-minor,--deg-major,--deg-major,--deg-minor,--deg-dim`). | **HELD** |
| **Q8 — case computed from the colour rule, no per-key table** | `numeralOf` = `applyCase(ROMAN[root], degreeQuality(...))`. All twelve tonics produce exactly one distinct numeral series: `I ii iii IV V vi vii°`. No `*_BY_KEY`, no switch on tonic, anywhere. | **HELD** |

### The sixteen mismatches, one line each

| # | S2 said | Shipped code | Verdict |
|---|---|---|---|
| **M-1** | `'1/8'` and `'F♯/G♭'` violate frozen §6 | Brandon amended §6 (composite labels legal). `slotNumberLabel` is scoped to the circle; `diatonic-keys` and the roll go through `label()` and stay on plain digits | **RULED, HONOURED** |
| **M-2** | `resetScaleDegree` a silent no-op | F2's `originName` is in `createScale`, written only by `setScalePreset`, read by `originDegrees`. Re-ran S2's own two cases: Dorian→Mixolydian→reset returns exact Dorian; Phrygian→Aeolian→reset returns exact Phrygian | **FIXED, VERIFIED** |
| **M-3** | `invert`/`spread` order unstated | `VOICING_ORDER = 'invert-first'`, one constant, reasoning and undo written beside it | **SHIPPED REVERSIBLY, STILL BRANDON'S** |
| **M-4** | `III/M6` read as an interval | `INTERVAL_NAME` + `bassText`'s numeral branch, exactly as flagged | **OPEN, BUILT AS CONTRACTED** |
| **M-5** | `parseNumeral` is a parser for something the outline calls a *pick* | **The Chord Module ships BOTH** — seven `[data-root]` numeral buttons *and* a free-text `[data-numeral-input]`. That is M-5 option (b), and Brandon ruled neither | **OPEN — see Q5** |
| **M-6** | nothing plays the scale *as a scale* | Still true. `scale-circle` names M-6 in its own header and declines to build it; no ascend/descend control exists on any surface or on `harmony.html` | **STILL UNSERVED** |
| **M-7** | `count` 1 and 2 admitted, unnamed | `clampCount` floors at 1; the Chord Module's Notes stepper disables only below 1. `isUpperOvertoneChord(1) === false` | **OPEN, BUILT AS CONTRACTED** |
| **M-8** | which half "everything else" covers | Documentation only; no code consequence | **NO CODE IMPACT** |
| **M-9** | pick-a-key transposes vs resets | `setScaleTonic` touches `tonic` only; the undo is written in the function's own doc comment | **SHIPPED REVERSIBLY, STILL BRANDON'S** |
| **M-10** | `'1/8'` vs `'1'`/`'8'` | RULED (b). Circle reads `entry.number`; keys and roll call `label()`. Honoured exactly | **RULED, HONOURED** |
| **M-11** | `EXT[6] = EXT[7] = ''` collides | Confirmed live: counts 3·4·5·6·7 on C major degree 5 print `V · V7 · V9 · V · V`, and letters `G · G7 · G9 · G · G`. Both counts are reachable from the Notes stepper | **OPEN, BUILT AS CONTRACTED** |
| **M-12** | `invert` rotates `v[0]`, not the bass | **Reproduced independently.** `[0,4,4,3,7,9,11]`, `voicing(root 1)` = `[64,63,69]`, `bassOf` = 63; `invert(v,1)` = `[63,69,76]` — **the bass is still 63; the student pressed "Bass +" and the bass did not move.** Root cause is CONTRACTS §15.9's own false invariant, and `chord-engine` shipped the contract's literal code and escalated rather than fixing it | **OPEN — see Q9, item 1** |
| **M-13** | no accidental prefix on a numeral | `ROMAN` is bare; `numeralParts` has `{base, sup}` and no prefix slot | **OPEN, BUILT AS CONTRACTED** |
| **M-14** | the "§9 has four tokens" gap may not exist | RULED (b). `--deg-aug: #ff3b3b` is in `tokens.css`; `QUALITY_TOKEN.augmented` points at it | **RULED, HONOURED** — but see the token-comment drift in Q9, item 5 |
| **M-15** | letter path undefined; `Dm/F` would print `D/F` | F1 built. Ran Brandon's own loop in F major against the shipped code: **`F` · `C/E` · `Dm/F` · `B♭/F`**, character for character | **FIXED, VERIFIED** |
| **M-16** | §15.2's "never read" sentence is false | F3 narrowed it. `circlePositions()` returns `altered` on every entry; both `+/-` surfaces render it | **FIXED, VERIFIED** |

### S2's Q12 "unserved" list, re-checked

1. **Hear the scale *as* a scale** — still nobody's. **M-6 stands.**
2. **The letter-label path** — specified (F1) and built. **Closed.**
3. **Names above/below the range** — `count` 1/2 (M-7) and 6/7 (M-11) both still as S2
   left them; accidentals on numerals (M-13) still absent.
4. **Context clauses** — movable do ships (`SOLFEGE` indexed by degree index); the two
   "not required to memorize" prohibitions hold structurally, not by discipline.

### One S2 item that got WORSE in the build, and it is Brandon's

S2's Q11 and F1's own escalation flagged that in `tonic: 6` a slash label would read
`F♯/G♭/A♯` — one `/` meaning enharmonic, one meaning bass. **In the shipped code it is
worse than three-way.** Both the head *and* the bass spell twice:

`chordLabel(tonic 6 scale, root 1, invert(voicing,1), 3, 'letter')` → **`G♯/A♭m/B/C♭`**

Four names, three slashes, one of which is the bass. **This is not new drift** — it is
M-1's composite question landing where F1 said it would, and §6 is Brandon's alone. It is
recorded here because the string is now on record as measured, not predicted.

**Q1 verdict: nothing settled in S2 was lost.** Three fixes (M-2, M-15, M-16) verified
working against the shipped code. Three rulings (M-1, M-10, M-14) honoured. Ten items are
still open exactly where S2 left them, all built as the contract stands, none silently
resolved by a BUILD seat. **The one S2 defect that reaches a student's hands is M-12.**

---

## Q2 — Is the colour rule computed, with no key lookup anywhere? ⛔ STOP CONDITION

**COMPUTED. NO LOOKUP. NO STOP.**

`degreeQuality(scale, i)` is `QUALITY[b−a]?.[c−b] ?? 'altered'` over `skipTriad`, and
`skipTriad` is three calls to `stackOffset`, which reads `scale.degrees` and nothing else.
**`scale.tonic` is not in the call chain.** `degreeColor` is one object lookup on the
quality — `QUALITY_TOKEN`, five rows, pure data.

**Grepped for the three shapes my brief names as drift, across all six P3 files plus
`harmony.html`:**

| Drift shape | Hits |
|---|---|
| a table of keys (`*_BY_KEY`, `DIATONIC_*` as a quality table, a 12-row array of qualities) | **0** |
| a hard-coded quality or chord-formula list (`maj7 =`, `m7 =`, `[0,4,7]`, `dom7`) | **0** — the only textual hits are §15.7's own prohibition, quoted in a comment, and Brandon's six verbatim seventh-chord names in `SEVENTH_NAME` |
| a switch on tonic (`switch (…tonic`, `tonic === n`) | **0** |

Every appearance of `scale.tonic` in the two theory files is one of three legitimate
things and I checked each: rotating a degree offset into a pitch class (`pitchClassOf`,
`numeralPitchClasses`, `noteBank`'s `pc`), placing an absolute midi (`midiOf(scale.tonic,
octave)`), or choosing the **key signature's spelling** (`keySpelling`, `chromaticSpelling`
— which the contract requires to be key-dependent, D-18/A1). None of them reaches quality
or colour.

**Verified by running the shipped code, not by reading it:**
- `createScale(0,'Major')` and `createScale(7,'Major')` — different tonic, same degree
  array — return **byte-identical** colour arrays. Transposition invariance holds.
- All twelve tonics produce exactly **one** distinct numeral series across the seven
  degrees (`I ii iii IV V vi vii°`). A key table could not produce that from one code path
  and a key-independent rule cannot produce anything else.

**And the rule survives the `+/-`, which is the whole point.** C major degree 3 lowered
one → degree 3's quality goes `minor → augmented`, token `--deg-minor → --deg-aug`, and
`scaleName()` back-matches to `Melodic Minor`. Degree 6 lowered on top of it → `diminished
→ major`, `Harmonic Minor`. The name changed *after* the colours did, not before, because
nothing consults the name.

**Q2 verdict: PASS. ⛔ STOP CONDITION CLEARED.**

---

## Q3 — Does any surface compute its own labels or colours?

**Labels: NO, in all three. Colours: two of three are clean; `diatonic-keys` keeps a
second copy of the quality→token map, and one surface renders a label wrong.**

### Hex values and label strings — the mechanical check

| File | hex values | pitch / degree / syllable / numeral string literals |
|---|---|---|
| `src/surfaces/scale-circle.js` | **0** | **0** |
| `src/surfaces/diatonic-keys.js` | **0** | **0** |
| `src/surfaces/piano-roll.js` | **0** | **0** |

All three carry zero hex — stricter than P1's `keyboard.js`, which ships
`var(--token, #fallback)`. Every string a student reads on these three comes out of
`theory/scale.js` (`circlePositions()`, `label()`, `solfegeOf`) or `theory/chord.js`
(`numeralParts`). The `+`/`−` glyphs on the `+/-` controls are the control, not a label.

### ⚠ FINDING 1 — `diatonic-keys` maps quality → §9 token in its own stylesheet

`keySpecFor` reads `row.colorToken` off `circlePositions()`, returns it on every key spec —
**and nothing ever uses it.** The paint comes from five CSS attribute selectors instead:

```
.cbdaw-diakeys__key[data-quality="augmented"]  { background: var(--deg-aug); }
```

That is a **second copy of `QUALITY_TOKEN`, living in a surface.** §4: "this rule is
computed in `theory/scale.js` and every surface reads it — no surface computes its own
colors." A5's whole reason for pulling the lookup into one object was that changing a
quality's token should be "one string in one object." **When Brandon ruled M-14 and
augmented was repointed off `--deg-dim`, that edit would have missed this file** — it
matches today only because the CSS was written after the ruling.

`scale-circle` (`fill: var(${entry.colorToken})`) and `piano-roll`
(`--row-deg: var(${degreeColor(...)})`) both plumb the token and never name a quality.
**File: `src/surfaces/diatonic-keys.js` · Seat: `diatonic-keys` (P3/S5) · CONTRACTS §4, §9,
§15.4-A5 · MEDIUM** — latent, not currently wrong.

### ⚠ FINDING 2 — `scale-circle` draws a `theory/scale.js` label with `textContent`, and prints markup at the student

A7's second pass is Brandon's: *"use italic x for double sharps and italic bb for double
flats."* `scale.js` implements that with **markup inside the label string** —
`GLYPH['2'] = '<i>x</i>'`, `GLYPH['-2'] = '<i>bb</i>'` — and its own header warns every
surface seat: *"A surface drawing these with `textContent` prints the tags literally."*

`diatonic-keys` (`label.innerHTML = spec.text`), `piano-roll`
(`row.labelEl.innerHTML = pitchLabel(...)`) and `chord-module` (chip `innerHTML`) all took
that instruction. **`scale-circle` did not** — `degreeText.textContent = text` at
`_render()`.

**Reachable in two clicks of the circle's own `+`, inside `DEGREE_CLAMP = 2`, and I ran
it:**

| after | `letter` overlay draws | `solfege` overlay draws |
|---|---|---|
| C major, degree 3 raised twice | `E<i>x</i>` | `Mi<i>x</i>` |
| C major, degree 3 lowered twice | `E<i>bb</i>` | `Mi<i>bb</i>` |

The same string renders correctly one panel over on the diatonic keys. A student pushes a
degree to the edge and the circle shows angle brackets on a projector while the keyboard
beside it shows an italic x. The circle's `_degreeAria()` carries the tags too.
**File: `src/surfaces/scale-circle.js` (`_render`, ~line 633) · Seat: `scale-circle`
(P3/S5) · CONTRACTS §6 + §15's A7 · HIGH** — visible, reachable in two presses, and the
only surface that gets it wrong.

*(`tools/harmony.html`'s scale readout, line 268, has the same `textContent` on
`spellingOf(s, 0).text`, and degree 1 has a `+/-` too. Same seam, `chord-module`'s file,
LOW — it is one line of chrome, not a teaching label.)*

### ⚠ FINDING 3 — `diatonic-keys` labels a key by pitch class where it colours it by degree

`keySpecFor` takes quality and colour from `circlePositions(scale)[degreeIndex]` — right —
then takes the **text** from `label(scale, pc, overlay, …)`, which resolves the pitch class
back to a degree with `degreeIndexOf`. §15.2a is explicit that on a scale where the student
has moved one degree onto another, `degreeIndexOf` returns the **lower** index. The file's
own comment claims it avoids exactly this trap; the text path does not.

Reachable in **one** press (`setScaleDegree(1, +2)` → `[0,4,4,5,7,9,11]`). Ran it: the key
that *is* degree 3 draws **`2`** under the number overlay and **`Re`** under solfège, while
its colour and `data-quality` are degree 3's. **Label and colour on the same key disagree —
which is the one thing §15.6 says the device must never do.** `chord-module`'s note bank
gets this right (`number: id.degreeIndex + 1`, with the reason written out).
**File: `src/surfaces/diatonic-keys.js` (`keySpecFor`) · Seat: `diatonic-keys` (P3/S5) ·
CONTRACTS §6, §15.2a · MEDIUM.**

**Q3 verdict: no surface builds a label string and no surface holds a hex.** Three findings,
all at the seam between `theory/scale.js`'s output and what a surface does with it — not one
of them is a surface inventing music.

---

## Q4 — Do `scale.js` and `chord.js` stay pure?

**YES, both, and stricter than the contract asked.**

| Check | `theory/scale.js` | `theory/chord.js` |
|---|---|---|
| `import` statements | **none** | **one** — `./scale.js`, the direction §15.6 requires. No cycle. |
| `document` / `window` / any DOM | 0 | 0 |
| `AudioContext` / any audio | 0 | 0 |
| `addEventListener` / `.on(` / any subscription | 0 | 0 |
| module-level mutable binding (`let`/`var` at top level) | **0** | **0** — every `let` is loop- or function-local |
| non-determinism (`Math.random`, `Date.now`, `performance.*`) | 0 | 0 |
| mutates its argument | no — `withScale` and every array op return new | no — `voicing`, `invert`, `spread`, `noteBank` all build new arrays |

Every exported constant in both files is `Object.freeze`d, including the nested rows of
`PRESETS`, `QUALITY`, `QUALITY_TOKEN`, `SUFFIX`, `LETTER_SUFFIX` and `SEVENTH_NAME` — so a
consumer cannot repoint the colour rule or a suffix table at runtime.

The one thing worth naming, and it is a design decision the file explains rather than a
purity breach: §4's four mutators live here as **pure transforms** (`scale` in, new `scale`
out) and `core/state.js` binds them to `state.scale` and fires the event. §15.5 assigns the
mutation *semantics* to `scale-engine` while the seat brief forbids state; pure transforms
satisfy both, and `core/state.js` computes no music of its own.

`chord.js`'s only import list is eight named functions from `scale.js` — `stackOffset`,
`degreeQuality`, `degreeColor`, `spellingOf`, `spellingOfPc`, `pitchClassOf`, `midiOf`,
`solfegeOf`. **`stackOffset` is imported, never reimplemented**, so §15.6's "one
implementation, two callers" is structural: the colour rule and the skip method cannot
disagree without editing one function.

**Q4 verdict: PASS. Both files run in bare node and I ran them there for every check in
this report.**

---

## Q5 — Does the curriculum survive the build? ⚠ ESCALATED TO BRANDON

The [outline](../../../../outline)'s **Scales and chords** section, clause by clause,
against what shipped. **Where the app's wording differs from Brandon's I name it and stop.
I do not have an opinion on any of this and I am not asking him to change a word.**

| Outline clause | In the built tool | Wording |
|---|---|---|
| "circular pattern (labaled with **digits**, **1/8 for Do**)" | Circle draws 7 slots, Do at 12 o'clock, Do slot reads `1/8`, default overlay is `number` | **matches** |
| "letters+sharp/flat" | `letter` overlay on all three surfaces and the note bank | **matches** — but see Q3's `<i>x</i>` finding |
| "choir does **solfege**" | Movable do, all seven degrees speak in every key, deviation marked (`Mi♭`) | **matches** |
| "**Skip method**: every other note in scale order stacked together" | `skipStack` = `stackOffset(root, 2j)`, stored order, mod 7, `+12` per wrap. Nothing sorts | **matches exactly** |
| "A chord is built off the **'root'**" | `root` is a degree index 0-6 everywhere | **matches exactly** |
| "**basic chord is 3 notes**" | Default `count` is 3 in the module, the circle and `noteBank`. **The phrase "basic chord" appears nowhere a student can read it** — the stepper is labelled "Notes" | **absent, not contradicted** |
| "anymore and they're **'upper overtone chords'**" | The module prints `upper overtone chord` beside the Notes stepper, and only when `count > 3`. No "seventh chord", "tetrad" or "extended chord" anywhere in `/src` or `/tools` | **matches exactly, and protected** |
| "They **do not LEARN** about 7th chords, but I do show them" | Nothing defaults to 4. A 7th arrives as a chip labelled `scaleNumber: 7` — the number teaches it, not a name | **matches** — with one tension below |
| "**Numbers refer to scale info**" | `chordToneScaleNumber(j) = 2j+1`, printed on every chip. No chord-formula table exists | **matches, and proven by construction** |
| "**Roman numerals** refer to chords (upper case major, lower case minor…)" | `applyCase` from `degreeQuality`. All twelve tonics, one series | **matches exactly** |
| "…use **upper overtone chord nomenclature** for everything else" | `SUFFIX` `+` `°` `?` and `EXT` `7` `9`, all superscript | **matches, both readings served** |
| "**Inversions/comping** by rearranging and spacing them out" | `invert` + `spread` both built. Control reads **"Bass"** with a `−/+` stepper; per-chip `−/+` spreads one tone; a "Close it up" button resets | **see (a) and (b)** |
| "scale builder that lets user pick **the 12 scales** and alter the degres of each with a **+/-**" | 12 key buttons **plus 9 preset buttons** on `harmony.html`; the `+/-` per degree on the circle and the keys | **see (c)** |
| "chord builder that lets them **pick** the scale, **pick** the roman numeral" | Seven numeral buttons **and** a free-text numeral field | **see (d)** |
| "**'Note bank'** that runs the logic of the scale with the logic of the numeral they input" | `noteBank()`; the module's own lede says it in almost his words | **matches** |
| "I use **color to show major and minor digits**… so that they don't have to memoerize diatonic chords with numerals" | Two distinct tokens in every key and every altered scale; the page subtitle says so out loud | **matches — this is the thing that works best** |

### The five places the app's wording differs from Brandon's

**(a) "Inversions" and "comping" are words the app never says.** A10 is Brandon's own ban on
the inversion *label*, and it is honoured — the control reads **"Bass"**. But the stepper's
`<output>` prints the rotation count a student can see: **0, 1, 2**. A10's sentence is "no
inversion number anywhere a student can see it." Whether a `0/1/2` readout under the word
"Bass" is the number A10 meant, or the control state a stepper has to show, is his call.
Likewise "comping" appears nowhere; the spacing controls are a per-chip `−/+` and a button
reading "Close it up."

**(b) The app now speaks six 7th-chord names, in one of its two label systems only.**
Brandon ruled `Cmaj7 · G7 · Dm7 · Dm(maj7) · Ddim7 · Dm7b5` verbatim (F4) and all six ship
on the **letter** side. The **numeral** side was deliberately not extended, and
`chord-engine` wrote out why. The consequence a student sees: **the same chord has two
names that do not agree.** C major, degree 1, four notes — the `letters` toggle reads
`Cmaj7`, the `numerals` toggle reads `I7`. Same for `i7` / `Am(maj7)` in harmonic minor and
`vii°7` / `Bm7b5` in C. Both are internally correct under their own contract sections. The
outline's clause is "they do not LEARN about 7th chords" — full chord-symbol vocabulary in
one system and none in the other is a curriculum-facing shape, and it is Brandon's.

**(c) "The 12 scales" is now 12 keys plus 9 presets — 21 buttons.** §4 ruled the twelve are
one scale type on twelve roots; A8 then added nine preset shapes. Both are Brandon's own
rulings and neither is drift. Naming it only because the outline's phrase and the screen no
longer count the same.

**(d) The chord builder both picks and parses.** The outline says *pick* twice. The module
ships seven numeral buttons (a pick) **and** a text field a student types `vii` into. That
is `redpen-theory`'s **M-5 option (b)** shipped without a ruling.

**(e) "See and hear … different ways to vary the scale" is still half-served.** A student
can hear one note at a time and one chord at a time. Nothing plays the scale as a scale and
nothing compares before/after a `+/-`. **M-6, unchanged since S2, and no seat owns it.**

**Q5 verdict: every clause of the Scales and chords section is served in the shipped tool,
and the section's centre — the colour rule, the skip method, numbers-are-scale-info, and
case-from-quality — is served exactly.** Five wording differences named above, all
escalated to Brandon, none decided here.

---

## Q6 — Do all three surfaces implement CONTRACTS §12 interchangeably? — **P4 READ THIS ONE**

**No — and one of the three reasons is by design and on the record, while the other is a
real swap hazard.**

| §12.1 requirement | `keyboard.js` (P1) | `scale-circle.js` | `diatonic-keys.js` | `piano-roll.js` |
|---|---|---|---|---|
| `static sourceId` in §5's enum | `'key'` (+ per-route) | `'circle'` | `'diatonic'` | **none** |
| `constructor(el, input)` | ✓ two args | **✗ three — `(el, input, store)`, and a missing `store` THROWS at construction** | ✓ two args, imports the shared store | `(el, clock)` — takes a clock, not an input |
| `mount` / `unmount` / `dispose` | ✓ | ✓ | ✓ | ✓ |
| output is `input.emitNoteOn/Off` only | ✓ | ✓ | ✓ | **emits nothing — it edits notes** |
| `surface.overlay` (§6) | ✓ | ✓ | ✓ | ✓ |
| velocity `0.8` and no second constant | ✓ | ✓ `DEFAULT_VELOCITY` | ✓ `DEFAULT_VELOCITY` | ✓ same constant |
| reads `input.octaveShift` / `positionShift` | ✓ both | **neither** | ✓ both, `positionShift` remapped | n/a |

### The piano roll was never a §12.1 surface, and that is correct

It says so in its own header, `piano-roll` never imports `core/input.js`, and **S5's own
collision map already agreed** — `core/input.js` is listed as read by `scale-circle` and
`diatonic-keys` and by nobody else in that stage. It is an editor: the scale reaches it
through `bindState`, the shading follows, and no note leaves it on the bus. **Not drift.
The question's premise, not the build, is what does not hold here.** P4 must not plan to
swap it into a §12.1 slot.

### ⚠ FINDING 4 — `ScaleCircle` cannot be constructed the way §12.1 says, and fails loudly

```js
constructor(element = null, input = sharedInput, store = undefined) {
  if (!store) throw new Error('ScaleCircle: a §4 scale store is required …');
}
```

§12.1: `constructor(el, input)` — "the ONLY thing a surface is ever handed." A P4 seat that
holds a list of surface classes and does `new Ctor(el, input)` gets a working keyboard, a
working diatonic keyboard, and **a thrown error on the circle**. §12.3 names exactly that
swap as the reason §12.1 exists.

The seat flagged it in its own header and in its receipt, and its reasoning is sound — §4
orders every surface to subscribe to the store, and the alternative is importing a
singleton, which is what §12.1 exists to prevent. `diatonic-keys` took the other branch and
imports the shared `state`. **Two seats, two different answers to the same sentence**, which
`state-seam`'s receipt also flagged for Brandon. Under ES-module caching both land on the
same object today, so nothing is broken on `harmony.html` — this is a **P4 construction-site
hazard, not a P3 bug**.
**File: `src/surfaces/scale-circle.js` (constructor) · Seat: `scale-circle` (P3/S5) ·
CONTRACTS §12.1, §12.3 · MEDIUM — blocks nothing in P3, will bite `daw-shell` on day one.**

### ⚠ FINDING 5 — one `input.positionShift`, three different meanings

`positionShift` is one shared number on the bus (§5: "0-11: which pitch class is DRAWN as
the bottom key"). The three surfaces read it three ways:

| Surface | What `positionShift = 5` does |
|---|---|
| `keyboard.js` | rotates 12 semitones in place — pitch class 5 at the bottom, §5 literally |
| `diatonic-keys.js` | `% 7` into **degree-index** space — degree 6 at the bottom. Its own flagged easiest-to-undo call, and §5 has no degree-index reading |
| `scale-circle.js` | **ignored** — Do stays at 12 o'clock, because A3 is Brandon's ruling |

Each choice is defensible on its own and both P3 seats wrote theirs down. Together they mean
a student who sets the bottom key on the 12-note keyboard and then switches to the diatonic
keys lands somewhere else, and switching to the circle lands nowhere. §5 calls
`positionShift` "shared across every surface at once."
**Files: `src/surfaces/diatonic-keys.js` (`startDegreeIndexFor`), `src/surfaces/scale-circle.js`
· Seats: `diatonic-keys`, `scale-circle` (P3/S5) · CONTRACTS §5, §12.1 · MEDIUM — P4's to
reconcile, and it needs one ruling, not two fixes.**

**Q6 verdict: the two §12.1 surfaces are behaviourally interchangeable — same enum, same
velocity, same lifecycle, same output — and are NOT constructor-interchangeable.** The roll
is not in the set and was never meant to be.

---

## Q7 — Did anything violate CONTRACTS §10?

**Five of the six clean. The sixth — "invent an interface that is not in this file" — is
where P3 actually spent, and it spent seven times.**

| §10 | Result |
|---|---|
| **Create a second AudioContext** | **CLEAN.** Exactly one `new AudioContextCtor()` exists in the whole repo, `core/audio.js` line 26. `ChordModule` takes `(ctx, out)` per §2, builds its `_mixGain` on the handed-in ctx and connects it to `this.out`. **`ctx.destination` appears in no P3 file.** |
| **Schedule audio from `requestAnimationFrame`** | **CLEAN — and the place my brief predicted it is the place it is not.** `piano-roll._rafLoop()` reads `this._clock.positionTicks`, compares a time signature, and writes `style.left` on two divs. No `noteOn`, no `ctx.*`, no `setValueAtTime`, no scheduling call of any kind in the function or anything it calls. `chord-module.js` and `harmony.html` contain **no `requestAnimationFrame` at all**. |
| **Write a file outside the lane** | See **Q8** — one crossing, chartered by Brandon. |
| **Add a dependency** | **CLEAN.** No `package.json`, no `node_modules`, no CDN or absolute-URL import anywhere in `/src` or `/tools`. |
| **Add a build step before P5** | **CLEAN.** `harmony.html` is plain ES modules on relative paths, served from the project root by `python3 -m http.server`. Nothing to compile. |
| **Invent an interface that is not in this file** | **⚠ SEE BELOW.** |

### ⚠ FINDING 6 — seven public methods that CONTRACTS.md names nowhere

Grepped `CONTRACTS.md` for each; the count is the number of occurrences in the whole
contract:

| Method | Owner | In CONTRACTS |
|---|---|---|
| `bindState(store)` | `piano-roll`, `chord-module` | **0** |
| `attachState(store)` | `scale-circle` | **0** |
| `bindInput(input)` | `chord-module` | **0** |
| `bindTargets(list)` | `chord-module` | **0** |
| `bindCapture(capture)` | `piano-roll` | **0** |
| `setNotes(notes)` / `getNotes()` | `piano-roll` | **0** |

For comparison, `emitsNotes` (3), `onNoteOut` (4), `voiceCount` (5) and `setParam` (8) all
appear, because §2 names them.

**None of these invents music, and each one is documented in its own file as the seam P4
hoists through** — §4 orders every surface to subscribe to a store and never says how the
store arrives, so something had to fill the gap. But that is seven names, chosen
independently by four seats, that `spec-transport` (P4/S1) will have to either discover or
re-specify. Two of them (`bindState` and `attachState`) are the **same operation under two
names**, which is exactly the `letterHead`/`chordName` collision F1 had to strike in §15.
**Files: `src/surfaces/piano-roll.js`, `src/surfaces/scale-circle.js`,
`src/instruments/chord-module.js` · Seats: `piano-roll`, `scale-circle`, `chord-module` ·
CONTRACTS §10 · MEDIUM — nothing is broken; §16 has to name these or P4 invents an eighth.**

### ⚠ FINDING 7 — the capture seam holds for two of three commit kinds, and silently duplicates on the third

`test-p3` flagged `bindCapture`/`_onCaptureCommit` as UNVERIFIED because `harmony.html`
never wires a `Capture`. I read both sides against each other instead of running it, and
the seam does not hold all the way.

`core/capture.js` (P2, frozen) emits `'commit'` with **three** `kind` values:

| `kind` | `notes[]` carries | The roll does |
|---|---|---|
| `'capture'` | the notes of **this take** | `addNotes(...)` — **correct** |
| `'discard'` | `[]` | `addNotes([])` — **correct, no-op** |
| `'requantize'` | **every note of every take**, re-stated in full (`capture.js` line ~1148: `for (const take of this._takes) all.push(...take.notes)`) | `addNotes(all)` — **adds a second copy of everything already on the roll** |

`_onCaptureCommit(report) { this.addNotes(report?.notes || []); }` never branches on
`kind`. A requantize report is a **restatement, not a delta**, and the roll treats all three
the same.

**Not reachable on `harmony.html`** — this page imports no `capture.js` and calls no
`bindCapture`, so `test-p3` was right that nothing failed in P3. It becomes reachable the
first time P4's `arrangement` seat binds a `Capture` to a `PianoRoll` and a student presses
requantize.
**File: `src/surfaces/piano-roll.js` (`_onCaptureCommit`, ~line 848) · Seat: `piano-roll`
(P3/S5) · CONTRACTS §7 `channels[].notes[]`, §13.5, §10 · MEDIUM — latent, P4-facing, and
it closes `test-p3`'s one open item with an answer instead of a shrug.**

**Q7 verdict: no §10 audio violation anywhere in P3.** One clean AudioContext, one silent
rAF loop, zero dependencies, zero build steps. The one place §10 was spent is the interface
clause, and it was spent on plumbing, not on music.

---

## Q8 — Does every file stay in its lane? ⛔ ESCALATED WHEN FOUND

Each seat's brief `You own` line, against S5's collision map, against the receipts, against
file mtimes.

| File | Lane | Who wrote it | Verdict |
|---|---|---|---|
| `src/theory/scale.js` | `scale-engine` only | `scale-engine`, 17:15 | ✓ |
| `src/theory/chord.js` | `chord-engine` only | `chord-engine`, 17:41 | ✓ |
| `src/instruments/chord-module.js` · `tools/harmony.html` | `chord-module`, both | `chord-module`, 18:53 / 18:54 | ✓ |
| `src/core/state.js` | **no seat owns it** — §1 names the file, no P3 stage assigns it | `state-seam`, 18:18 — NEW | **see below** |
| `src/surfaces/diatonic-keys.js` | collision map: `diatonic-keys` **only** | `diatonic-keys`, then `state-seam` at 18:18:59 | **CROSSED — chartered** |
| `src/surfaces/scale-circle.js` | collision map: `scale-circle` **only** | `scale-circle`, then `state-seam` at 18:19:59 | **CROSSED — chartered** |
| `src/surfaces/piano-roll.js` | collision map: `piano-roll` **only** | `piano-roll`, then `state-seam` at 18:20:12 — **comment only, no code change**, per its receipt and confirmed by reading the file | **CROSSED — chartered, cosmetic** |
| `src/ui/tokens.css` | forbidden to all four BUILD seats; §9 is Brandon's | edited 17:16, `--deg-aug: #ff3b3b` added | **see below** |
| `Builddocs/CONTRACTS.md` | forbidden to every BUILD seat; `spec-scale` had §15 append-only | edited 17:45 — §9, §15.2c, and the new **F4** | **see below** |
| `Builddocs/…/S2-theory-check/theory-report.md` | `redpen-theory`'s one owned file; that seat's run ended at S2 | edited after close — Q9's stale `--deg-dim` cell corrected, M-10/M-14 stamped RULED | **see below** |
| `docs/scratchpad/*` | harness, named in its owning receipt | the seats that made them | ✓ |

### The crossing, and why it is not a STOP

`state-seam` is **not in [ROSTER.md](../../ROSTER.md)** and appears in no STAGE.md. It built
`core/state.js` and then edited three files S5's collision map assigns to one writer each.
On its face that is my brief's STOP condition. **I checked the charter before calling it,
and the charter holds:**

- [SESSIONLOG.md](../../../SESSIONLOG.md): *"the `core/state.js` build was spawned as an
  'opus builder' agent **per Brandon's direct instruction**."*
- Each of the three edits followed **the target file's own written undo comment** —
  `diatonic-keys`'s "delete `createLocalScaleState`, import `state`, drop the third
  argument", `scale-circle`'s "delete `createFallbackStore`". The seats wrote the
  instructions; another actor executed them.
- All three seats' done-checks were re-run green after the swap (11/11 · 61/61 · 1124/1124).

**So this is Brandon's decision already taken, not a seat out of its lane. NOT A STOP.**

What is genuinely wrong is the paperwork, and it will mislead the next reader:
**ROSTER.md has no `state-seam` row** (it still counts 53 seats and 10 in P3), and **S5's
collision map still reads "No file in this stage is written by more than one seat"** and
assigns those three files one writer each. Both statements are now false.
**Files: `Builddocs/ROSTER.md`, `Builddocs/P3-harmony-tool/S5-surfaces/STAGE.md` ·
Owner: Troubleshooter · LOW — documentation, but it is the document the next lane check
reads.**

### The three shared-file edits — all traced, all documented, none by a BUILD seat

`tokens.css`, `CONTRACTS.md` (§9 / §15.2c / F4) and `theory-report.md` were all edited by
the **session agent on Brandon's same-day rulings**, and
[docs/sessions/2026-08-24-p3-s3-s6.md](../../../docs/sessions/2026-08-24-p3-s3-s6.md)
itemizes every one. **Every BUILD seat's receipt independently disclaims all three**, and I
verified the disclaimers hold: no seat file contains a CONTRACTS or tokens edit. The
`theory-report.md` edit is stamped in place (*"Updated 2026-08-24 — M-14 ruled (b)"*) rather
than made silently, which is the right way to touch a closed REDPEN's report.

One gap: **the `src/ui/tokens.css` edit itself is not itemized in any receipt's EDITS
list.** The session write-up records the §9 *contract* change and the CVD validation of the
colour; the file write that implements it is only implied. `#ff3b3b` is a value somebody
picked. **LOW — trace exists, the itemization does not.**

**Q8 verdict: one lane crossing, chartered by Brandon and executed against the target files'
own written instructions. No unchartered crossing anywhere in P3. No STOP.** Two documents —
ROSTER.md and S5's collision map — now describe a crew that is not the crew that built this.

---

## Q9 — What drift did I find, and who owns each?

Fourteen items. One line each: file · seat · contract section · severity. Nothing here is
fixed and nothing here is decided. **Ordered by what reaches a student first.**

### Reaches a student on the built page

| # | Drift | File | Seat | Contract | Sev |
|---|---|---|---|---|---|
| **1** | **The bass does not move when a student moves it.** `invert(v,n)` rotates `v[0]`, not the lowest pitch. On `[0,4,4,3,7,9,11]`, `voicing(root 1)` = `[64,63,69]`; `invert(v,1)` = `[63,69,76]` — **bass 63 before and after**, and the slash label reads an interval that never changed. Reachable with two `+/-` presses inside the clamp and the module's own Bass stepper | `src/theory/chord.js` (`invert`, ~475) | **root cause: `spec-scale`, P3/S1** — `chord-engine` built the contract's literal code and escalated it in its own file and receipt rather than fixing a frozen contract | **CONTRACTS §15.9** — "offsets from `skipStack` already ascend by construction" is false. Options are `redpen-theory`'s M-12 (a) and (b) | **HIGH** |
| **2** | **The circle prints markup at the class.** `_render()` writes a `theory/scale.js` label with `textContent`; `GLYPH['±2']` is `<i>x</i>` / `<i>bb</i>` per A7. Two presses of the circle's own `+` and the slot reads `E<i>x</i>` (letter) or `Mi<i>x</i>` (solfège) while the diatonic keys one panel over render the same string correctly | `src/surfaces/scale-circle.js` (~633; also `_degreeAria`) | `scale-circle`, P3/S5 | **§6** "labels come from `theory/scale.js`" + **§15's A7** | **HIGH** |
| **3** | **A key's label and its colour disagree.** `keySpecFor` colours by degree index and labels by pitch class through `label()`, which resolves a duplicated pitch class to the **lower** degree (§15.2a). One `+2` press: the key that is degree 3 draws `2` / `Re` in degree 3's colour. The file's own comment claims it avoids exactly this | `src/surfaces/diatonic-keys.js` (`keySpecFor`) | `diatonic-keys`, P3/S5 | **§6, §15.2a** | **MEDIUM** |
| **4** | The `tonic: 6` slash label is now measured, not predicted: `chordLabel(..., 'letter')` returns **`G♯/A♭m/B/C♭`** — four names, three slashes, one of which is the bass | `src/theory/chord.js` (`chordLabel`) | escalated by `spec-scale` in F1, built as contracted by `chord-engine` | **§6's composite amendment · M-1 — Brandon's** | **MEDIUM** |

### Latent — correct today, wrong the moment something moves

| # | Drift | File | Seat | Contract | Sev |
|---|---|---|---|---|---|
| **5** | **A second copy of `QUALITY_TOKEN` inside a surface.** Five CSS rules map `data-quality` → `--deg-*`. `keySpecFor` carries `colorToken` all the way out and nothing uses it. When Brandon ruled M-14 this file would not have been in the edit | `src/surfaces/diatonic-keys.js` (STYLE_TEXT ~179–183) | `diatonic-keys`, P3/S5 | **§4** "no surface computes its own colors" · **§9** · **§15.4-A5** "one string in one object" | **MEDIUM** |
| **6** | **`new ScaleCircle(el, input)` throws.** The store is a required third argument; §12.1 says `input` is "the ONLY thing a surface is ever handed", and §12.3 names surface-swapping as the reason the interface exists. `diatonic-keys` answered the same sentence the other way | `src/surfaces/scale-circle.js` (constructor) | `scale-circle`, P3/S5 | **§12.1, §12.3** | **MEDIUM** — on TODO.md as "hygiene, not a bug"; **the new fact is that it throws, which makes it a P4 construction hazard rather than a style note** |
| **7** | **One `input.positionShift`, three meanings** — pitch class on `keyboard.js`, `% 7` degree index on `diatonic-keys`, ignored on `scale-circle`. §5 calls it "shared across every surface at once" | `src/surfaces/diatonic-keys.js` (`startDegreeIndexFor`) · `src/surfaces/scale-circle.js` | `diatonic-keys`, `scale-circle`, P3/S5 | **§5, §12.1** | **MEDIUM** — one ruling, not two fixes |
| **8** | **The capture seam duplicates on one of three commit kinds.** `_onCaptureCommit` calls `addNotes(report.notes)` without branching on `kind`; `capture.js`'s `'requantize'` report re-states **every note of every take**, so the roll adds a second copy of everything on it. Unreachable on `harmony.html` (nothing binds a `Capture`); reachable the first time P4 does | `src/surfaces/piano-roll.js` (`_onCaptureCommit`, ~848) | `piano-roll`, P3/S5 | **§7 `channels[].notes[]`, §13.5, §10** | **MEDIUM** — closes `test-p3`'s one UNVERIFIED item |
| **9** | **Seven public bind-methods CONTRACTS names nowhere** — `bindState`, `attachState`, `bindInput`, `bindTargets`, `bindCapture`, `setNotes`, `getNotes`. Two of them (`bindState` / `attachState`) are one operation under two names, the same collision F1 had to strike for `letterHead` | `piano-roll.js`, `scale-circle.js`, `chord-module.js` | `piano-roll`, `scale-circle`, `chord-module` | **§10** "invent no interface that is not in this file" — §16 has to name these | **MEDIUM** |

### Code against contract — small, exact, and worth one line each

| # | Drift | File | Seat | Contract | Sev |
|---|---|---|---|---|---|
| **10** | **`seventhQuality` returns strings the contract does not use.** F4's own code block writes `'dim' \| 'min' \| 'maj'`; the shipped function returns `'diminished' \| 'minor' \| 'major'`, and `SEVENTH_NAME` is keyed to match. The mapping is identical, the exported vocabulary is not — and F4 says this function "is exported and ready" for the numeral extension, so the next seat will code against the contract's strings and match nothing | `src/theory/chord.js` (`seventhQuality`, `SEVENTH_NAME`) | `chord-engine`, P3/S4 | **§15's F4** | **LOW** |
| **11** | **`setScaleDegree` writes `altered[i] = value !== origin[i]`; §15.5's table cell says `altered[i] = true`.** The shipped behaviour is the more consistent one — it agrees with F2's own `altered[i] = degrees[i] !== originDegrees(scale)[i]` — but it is not the cell as written, and it means `+` then `−` clears the "you moved this" mark | `src/theory/scale.js` (`setScaleDegree`) | `scale-engine`, P3/S3 | **§15.5's mutation table vs F2** — the two disagree with each other | **LOW** |
| **12** | **`noteBank()` returns two fields and takes one option §15.10 does not list** — `chordName`, `chordNameParts`, and a `system` argument. Additive and documented in the file, but §15.10's returned object is written out field by field and these are not in it | `src/theory/chord.js` (`noteBank`) | `chord-engine`, P3/S4 | **§15.10, §10** | **LOW** |
| **13** | **`tokens.css`'s comment on `--deg-altered` says the thing A5 forbade.** The file reads *"violet — the student moved this degree off the preset (§4)"*. A5 and §15.4 are explicit that `--deg-altered` names **the quality** and that "the student moved it" is `scale.altered[i]`, a boolean, never a colour. Behaviour is correct everywhere; the palette file's own note will mislead the next surface seat | `src/ui/tokens.css` (line 77) | session agent (the M-14 edit); tokens.css is P1's file | **§9, §15.4-A5** | **LOW** |
| **14** | **`harmony.html`'s scale readout uses `textContent` on `spellingOf(s, 0).text`**, so the same A7 markup leaks there when degree 1 is pushed to ±2. Chrome, not a teaching label. The page also carries hex fallbacks "byte-identical to `tokens.css`" — `keyboard.js`'s precedent, but a second palette either way | `tools/harmony.html` (~268, page CSS) | `chord-module`, P3/S6 | **§6, §9** | **LOW** |

### Not drift, recorded so nobody re-opens it

- **The piano roll is not a §12.1 surface.** Its brief, its header and S5's own collision
  map all say so. It emits no input events by design.
- **`piano-roll`'s rAF playhead schedules no audio.** My brief predicted a §10 violation
  there; there is none. Read line by line.
- **`chord-module.js`'s `var(--token, #hex)` fallbacks** follow `keyboard.js`'s P1
  precedent. It is an instrument, not one of the three surfaces question 3 governs. Noted,
  not filed.
- **`state-seam`'s three edits.** Chartered — see Q8.

### Who has to do something

| Owner | Items |
|---|---|
| **Brandon** | 1 (M-12's two options) · 4 (M-1) · everything in Q5: M-5, M-6, the Bass stepper's visible 0/1/2, `Cmaj7` vs `I7`, "the 12 scales" now 21 buttons |
| **Troubleshooter** | 2, 3, 5 — three seats have ended their run and these are their files · 13 · ROSTER.md + S5 collision map (Q8) · the unitemized `tokens.css` write |
| **P4 / `spec-transport`** | 6, 7, 8, 9 — none blocks P3, all four land on `daw-shell` and `arrangement` |
| **Nobody yet** | 10, 11, 12, 14 — one line each whenever the file is next open |

---

# VERDICT

## P3 is done, and it is done as contracted — with two things a student can hit.

**Both stop conditions are clear.** The colour rule is computed from `degrees` alone, is
transposition-invariant across all twelve keys, and has no lookup table anywhere in six
files. Case is that same computation read a second time, and twelve tonics produce exactly
one numeral series. **Everything `redpen-theory` settled in S2 survived** — three fixes
verified working against shipped code, three rulings honoured, ten items open exactly where
S2 left them, and not one of the sixteen quietly closed by a BUILD seat.

**Every clause of the outline's Scales and chords section is served in the running tool**,
and the section's centre — the skip method, numbers-are-scale-info, case-from-quality, and
the colour that means a student never memorises the diatonic set — is served exactly and
provably.

**Two defects reach a student's hands:** the bass that does not move (**#1**, and its root
cause is a false sentence in §15.9, not a build seat), and the scale circle printing
`<i>x</i>` at a projector (**#2**, and it is the only one of four drawing surfaces that
gets that seam wrong). Neither blocks P4 and both are one edit.

**No §10 violation. No unchartered lane crossing. No code edited by this seat.**

---

# WHAT I WOULD TELL YOU IF THIS WERE NOT ABOUT CODE

Three things, none of them technical.

**The contract is now the biggest thing in the room, and it is starting to argue with
itself.** §15 is roughly two thousand lines with four amendment layers stacked on it — the
body, A1–A11, F1–F3, then F4. Two of my fourteen findings are not a seat getting something
wrong; they are two parts of the *same section* saying different things (§15.5's `altered`
cell against F2, F4's `'maj'` against the shipped `'major'`), and one is a sentence in the
contract that is simply false (§15.9). The build seats did the right thing every time —
they built the contract as written and escalated. That is the behaviour you asked for and
you got it. But the failure mode you should expect next is not a seat going rogue; it is
**a seat faithfully building a contradiction**, and the amendment stack is where those now
live. Before P4 doubles the surface area, §15 is worth one consolidation pass by somebody
whose only job is to make it agree with itself.

**Almost every remaining open item is a naming question, and naming is the thing you have
been unwilling to delegate — correctly.** `I7` vs `Cmaj7`. `viiø7` vs `vii7b5`. What a
one-note "chord" is called. Whether `♭III` exists. Whether "Bass: 1" is an inversion
number. Those are not engineering leftovers; they are the actual curriculum, and the
reason the pile is growing is that the app got good enough to ask them. The engine is
finished. What is not finished is the vocabulary, and no agent can finish it for you —
which is exactly what §10-H says and what every seat in this phase honoured without being
chased.

**The best thing in this build is not the code.** The colour rule works: two subtractions
on an array a kid edited with a button, and the circle turns the right colour in a scale
nobody anticipated and nobody named. It falls out — no table, no key, no memorising. The
crew protected that through seven seats and four contract amendments, and both times it
could have been quietly optimised into a lookup, somebody wrote down why they didn't.
Whatever else this run produced, that one idea survived contact with thirty-odd agents
intact, and it is yours.

---

*End of `redpen-p3`'s report. **No `/src` file, no `/tools` file, no CONTRACTS.md, no
`test-report.md`, no `theory-report.md` was written. Nothing was fixed. P4 was not begun.***
*Report closed 2026-08-24 20:23 EDT.*

# RECEIPT — `scale-engine` (P3/S3)

Seat: `scale-engine`, BUILD. Opened **2026-08-24 17:01 EDT**.
Last update: **2026-08-24 17:07 EDT** — after **seat question 8 of 8. SEAT CLOSED.**
Lane: [`/src/theory/scale.js`](../../../src/theory/scale.js), one file.
**CONTRACTS.md not touched. `theory/chord.js` not written. No surface touched. No
`tokens.css` edit. No MEMORY.md / CLAUDE.md / SESSIONLOG.md / INDEX.md edit.**

## ✅ STAGE DONE-CHECK — **CLEARED**

**`theory-report.md` Q7 and Q9 reproduce CHARACTER FOR CHARACTER out of the code.**
The check does not retype the report: it reads the four tables out of
[theory-report.md](../S2-theory-check/theory-report.md) at run time by exact-anchor match
and compares the generated block to the real source bytes. **127 assertions, 0 failures.**

## DELIVERABLE STATE

| Seat question | State |
|---|---|
| 1 · Implements §15 exactly, function by function | **DONE** — every §15.2 signature shipped, plus A1–A11 and F1–F3 |
| 2 · Colour rule computed from `degrees` alone | **DONE** — two subtractions; `scale.tonic` never appears; **no key table anywhere in the file** |
| 3 · Returns colour ROLES, not colours | **DONE** — five roles, five §9 token names, **zero hex** (asserted by the check) |
| 4 · Four overlay modes, §6 | **DONE** — letter / number / solfège / none; solfège movable-do and diatonic-only |
| 5 · Twelve tonics and the `+/-` together | **DONE** — all 12 keys × 4 overlays × 3 altered scales asserted |
| 6 · Modes and minor variants are presets that write `degrees` | **DONE** — nine presets, pure data, no logic reads a preset by name |
| 7 · A scale with no name | **DONE** — back-match on `degrees`, else Brandon's literal `'scale unknown'`. Never a wrong name, never a throw |
| 8 · Pure | **DONE** — **imports nothing** (asserted), no DOM, no audio, no state, runs in bare node |

### Done-check output 1 — Q9, the colour rule, C major, all seven degrees

| `i` | indices `(i, i+2, i+4)` mod 7 | offsets | `b−a` | `c−b` | Quality | §9 token | Numeral | notes |
|---|---|---|---|---|---|---|---|---|
| 0 | 0, 2, 4 | 0, 4, 7 | 4 | 3 | **major** | `--deg-major` | **I** | C E G |
| 1 | 1, 3, 5 | 2, 5, 9 | 3 | 4 | **minor** | `--deg-minor` | **ii** | D F A |
| 2 | 2, 4, 6 | 4, 7, 11 | 3 | 4 | **minor** | `--deg-minor` | **iii** | E G B |
| 3 | 3, 5, 0′ | 5, 9, 12 | 4 | 3 | **major** | `--deg-major` | **IV** | F A C |
| 4 | 4, 6, 1′ | 7, 11, 14 | 4 | 3 | **major** | `--deg-major` | **V** | G B D |
| 5 | 5, 0′, 2′ | 9, 12, 16 | 3 | 4 | **minor** | `--deg-minor` | **vi** | A C E |
| 6 | 6, 1′, 3′ | 11, 14, 17 | 3 | 3 | **diminished** | `--deg-dim` | **vii°** | B D F |

### Done-check output 2 — Q9, A harmonic minor, an ALTERED scale, all seven degrees

Reached the way the report says a student reaches it: A major, then `setScaleDegree(2, −1)`
and `setScaleDegree(5, −1)` — both inside the clamp, and the code confirms both.

| `i` | indices | offsets | `b−a` | `c−b` | Quality | §9 token | Numeral | notes |
|---|---|---|---|---|---|---|---|---|
| 0 | 0, 2, 4 | 0, 3, 7 | 3 | 4 | **minor** | `--deg-minor` | **i** | A C E |
| 1 | 1, 3, 5 | 2, 5, 8 | 3 | 3 | **diminished** | `--deg-dim` | **ii°** | B D F |
| 2 | 2, 4, 6 | 3, 7, 11 | **4** | **4** | **augmented** | `--deg-dim` | **III⁺** | C E G♯ |
| 3 | 3, 5, 0′ | 5, 8, 12 | 3 | 4 | **minor** | `--deg-minor` | **iv** | D F A |
| 4 | 4, 6, 1′ | 7, 11, 14 | 4 | 3 | **major** | `--deg-major` | **V** | E G♯ B |
| 5 | 5, 0′, 2′ | 8, 12, 15 | 4 | 3 | **major** | `--deg-major` | **VI** | F A C |
| 6 | 6, 1′, 3′ | 11, 14, 17 | 3 | 3 | **diminished** | `--deg-dim` | **vii°** | G♯ B D |

### Done-check output 3 — Q7 Step 1, E's scale inside A harmonic minor

| `n` | 1 | 2 | 3 | 4 | 5 | 6 | **7** |
|---|---|---|---|---|---|---|---|
| `k = n−1` | 0 | 1 | 2 | 3 | 4 | 5 | **6** |
| `(4+k) % 7` | 4 | 5 | 6 | 0 | 1 | 2 | **3** |
| `⌊(4+k)/7⌋` | 0 | 0 | 0 | 1 | 1 | 1 | **1** |
| `stackOffset` | 7 | 8 | 11 | 12 | 14 | 15 | **17** |
| **− 7** | 0 | 1 | 4 | 5 | 7 | 8 | **10** |
| the note | E | F | G♯ | A | B | C | **D** |

### Done-check output 4 — Q7 Step 2, the four-tone chord on degree 5

| `j` | 0 | 1 | 2 | **3** |
|---|---|---|---|---|
| `k = 2j` | 0 | 2 | 4 | **6** |
| `stackOffset` (from tonic) | 7 | 11 | 14 | **17** |
| pc `(9 + offset) % 12` | 4 | 8 | 11 | **2** |
| note | **E** | **G♯** | **B** | **D** |
| `chordToneScaleNumber(j) = 2j+1` | 1 | 3 | 5 | **7** |

**Q7 Step 3 also reproduces:** `setScaleDegree(3, +1)` → `[0,2,3,6,7,8,11]`,
`rootScaleNote(4,7)` moves 10 → **11**, `skipStack(4,4)[3]` moves 17 → **18**, the chord
becomes **E G♯ B D♯**, and `scaleName()` returns the literal **`scale unknown`** — the exact
target A8's relabel procedure exists for.

**Q9's stress test also reproduces:** Major, Phrygian, Locrian, Harmonic Minor and Melodic
Minor each derive their published triad series with **no spurious `'altered'`**, and
`'altered'` **does** fire on `[0,4,4,3,7,9,11]` degree 2, whose stack is `[4, 3, 9]`.

### Two things the check proves that the report only asserted

- **`keySpelling` is DERIVED, not transcribed.** §15.2b's twelve rows come out of circle-of-
  fifths arithmetic plus A1's three-line rule (signature decides · fewer accidentals wins ·
  exact tie shows both). All twelve match the contract table, `tonic: 6` is the one tie, and
  `tonic: 0` is correctly **not** a tie. **There is no twelve-row table in the file.**
- **The `+/-` and reset survive F2.** A Dorian student who raises the third gets
  `name: 'Mixolydian'`, `originName: 'Dorian'`, `preset: 'Custom'` at once — all three
  correct — and `resetScaleDegree` **gets them back to Dorian**, which is the failure M-2
  named.

## NEXT ACTION

**`chord-engine` (P3/S4) may start.** Its four imports from this file exist and are stable:
`stackOffset` · `degreeQuality` · `spellingOf` · `spellingOfPc`. `scale.js` imports nothing
and never will — one direction, no cycle, per §15.6.

`scale-circle`, `diatonic-keys` and `piano-roll` (P3/S5) have `circlePositions`, `label`,
`degreeColor`, `slotNumberLabel`, `CIRCLE_SLOTS`, `CIRCLE_START_ANGLE`, `CIRCLE_DIRECTION`.
**`keyboard.js`'s `PLACEHOLDER_LETTERS` seam is now replaceable** — that deletion is the
surface seat's, not this one's.

## OPEN DECISIONS

### ⛔ ESCALATED TO BRANDON — one genuine theory gap, shipped reversible, not guessed

**OD-2's C-major sub-case: which direction spells an out-of-key letter in a key with no
accidentals.** A11 rules out-of-key letters "in the key signature's direction — flats in a
flat key, sharps in a sharp key." **C major (`tonic: 0`) is neither** — zero sharps and zero
flats — and it is the app's default key, so this is on screen on first load. A1 forecloses
the "show both" reading by naming `tonic: 6` *"the only tie in the twelve"*, so a single face
must be chosen and Brandon has not chosen it.

- **Shipped:** sharps, under Brandon's standing "easiest route to undo" instruction, because
  sharps are already what P1's `keyboard.js` placeholder draws — so nothing on screen moves.
- **What this seat would have asked instead:** whether C major's black keys read
  `C♯ D♯ F♯ G♯ A♯` or `D♭ E♭ G♭ A♭ B♭`.
- **To change:** `CHROMATIC_DIRECTION_AT_C` in [`scale.js`](../../../src/theory/scale.js).
  **One constant, one character.** Nothing else reads it.

### Engineering calls by this seat — all reversible, none a theory ruling

| Call | Why | Change it at |
|---|---|---|
| The four §4 mutators are **pure transforms** — scale in, NEW scale out | §15.5 assigns the clamp and the index rejection to this seat; the seat brief forbids state. `core/state.js` (§1, not built) binds them and fires the `'scale'` event | the four `set*`/`reset*` exports |
| `createScale(tonic, presetName)` is **additive** — §4's object shape, built | `state.js` and every test need a starting object; §4 shows the literal shape but no constructor | delete it and inline §4's object |
| `CIRCLE_START_ANGLE` / `CIRCLE_DIRECTION` live **here**, not in the surface | A3 says "one constant" and does not name a file; §15.3 is `scale.js`'s section and §4 forbids a surface computing its own | move to `scale-circle.js` if S5 prefers |
| `label()` returns `''` where `spellingOf().text` is `null` | past `DEGREE_CLAMP` a degree has no spelling; a teaching surface must never crash and must never show a wrong name | `label()`'s `'letter'` branch |
| `setScaleDegree` **clamps** rather than refusing | a held `+` button stops visibly instead of doing nothing | `DEGREE_CLAMP` |

### ⚠ FOR THE SURFACE SEATS (P3/S5) — read before you draw

- **`GLYPH`'s ±2 rows contain MARKUP**, not text: `<i>bb</i>` and `<i>x</i>`, which is A7's
  second-pass ruling verbatim (*"use italic x for double sharps and italic bb for double
  flats"*). A surface drawing these with `textContent` prints the tags literally. This is
  reachable — `DEGREE_CLAMP` allows exactly ±2. **Not this seat's call to change**; A7 is
  Brandon's ruling and `GLYPH_ASCII` ships beside it.
- **`'1/8'` did NOT leak.** §6's 2026-08-24 amendment scopes the composite to the circle:
  `slotNumberLabel()` emits `'1/8'` for the circle's Do slot, and `label(..., 'number')`
  emits single digits everywhere else, with `'8'` at an octave-closing `opts.position`.
  **M-10 — whether the diatonic keys should also draw `1/8` — is still Brandon's** and is a
  surface decision, not an engine one.
- **`pitchClasses()` can hold a REPEAT** and `degreeIndexOf` returns the lower index, per
  §15.2a. That is deliberate. A surface that dedupes or sorts it hides what the student's own
  `+/-` press did.

### Still Brandon's, untouched by this seat

**M-1** (partly closed for this file by §6's amendment) · **M-9 / OD-10** (transpose vs reset
— shipped transpose, one statement to flip) · **M-13** (no accidental prefix on a numeral) ·
**M-14** (whether §9 needs a fifth `--deg-aug` token — A5's sharing is what shipped) ·
**F1's ⚠ open interaction** (a slash chord label in `tonic: 6` reading `F♯/G♭/A♯`, which is
`chord.js`'s string, not this file's).

### One location discrepancy, reported not fixed

§15.2c says `theory/scale.js` *"also already owns the rhythm syllables — §13.3's
`label(step, division)`"* and *"§15 does not touch, restate, or move it."* **It is not here.**
P2's `step-grid` seat put it in [`src/surfaces/step-grid.js`](../../../src/surfaces/step-grid.js)
as an exported `stepLabel`, flagged in that file's own header for exactly this reason.
**This seat did not move it** — §15 forbids touching it and it is outside this lane. The
Troubleshooter decides whether P3's piano roll imports it from `step-grid.js` or it relocates.

## FILE LOCATIONS

**Written by this seat — these three files and nothing else:**

- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/src/theory/scale.js` — **the deliverable**, 635 lines, zero imports
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/scale-donecheck.mjs` — the throwaway done-check, 407 lines, **not project code**
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P3-harmony-tool/S3-scale-engine/receipt-scale-engine.md` — this file

**Read, not written:**

- `Builddocs/P3-harmony-tool/S3-scale-engine/STAGE.md`, `A-scale-engine.md`
- `Builddocs/CONTRACTS.md` — §1, §4, §5, §6, §9, §10, §13.3, and **§15 in full**, A1–A11 and the 16:19 EDT F1/F2/F3 fix block
- `Builddocs/P3-harmony-tool/S2-theory-check/theory-report.md` — Q7 and Q9 in full, plus all sixteen mismatches
- `src/surfaces/step-grid.js`, `src/surfaces/keyboard.js`, `src/ui/tokens.css` — seam reconnaissance only, **not edited**

---

# SESSION REVIEW — Chromebook DAW / Agent run 1 — `scale-engine` (P3/S3) — 2026-08-24 17:01–17:07 EDT

EDITS
- [src/theory/scale.js](../../../src/theory/scale.js) — new. The scale engine: pitch, spelling, movable-do solfège, the colour rule, the four §6 overlays, the circle, presets and naming, the four `+/-` mutations. Pure, zero imports.
- [docs/scratchpad/scale-donecheck.mjs](../../../docs/scratchpad/scale-donecheck.mjs) — new. Throwaway done-check, 127 assertions, 0 failures.
- [Builddocs/P3-harmony-tool/S3-scale-engine/receipt-scale-engine.md](receipt-scale-engine.md) — this receipt.

STRAY FILES
- [docs/scratchpad/scale-donecheck.mjs](../../../docs/scratchpad/scale-donecheck.mjs) — throwaway by design, named here so it is not orphaned. `node docs/scratchpad/scale-donecheck.mjs` from the project root. Keep it until P3/S7 verify has its own harness, then it is disposable.

GOALS DONE
- STAGE done-check cleared: `theory-report.md` Q7 and Q9 reproduce character for character, verified against the report's own bytes.
- All eight seat questions in [A-scale-engine.md](A-scale-engine.md) answered in code.
- The colour rule is computed from `degrees` alone. No key lookup table exists in the file.
- Colour ROLES and §9 token names only — zero hex, asserted by the check.
- `chord-engine` (P3/S4) and all three P3/S5 surface seats are unblocked.

BRANDON'S TODOS
- **One theory question:** which direction spells an out-of-key letter in **C major**, the default key — `C♯ D♯ F♯ G♯ A♯` or `D♭ E♭ G♭ A♭ B♭`? A11 rules "flats in a flat key, sharps in a sharp key" and C is neither; A1 forecloses showing both. Shipped as sharps, one constant to flip.
- **M-10**, before S5 draws: do the diatonic keys draw `1/8` on the tonic like the circle, or plain `1` and `8`?
- **M-14**: does §9 get a fifth `--deg-aug` token, or does augmented keep sharing `--deg-dim`? Only Brandon can edit §9.

CLOSER REVIEW
- Gets copy of review, not a contract.
- INDEX.md line proposed — `src/theory/scale.js — the scale engine: labels, degrees, and the colour rule (P3/S3)` — **who: session agent**
- SESSIONLOG.md line proposed — `P3/S3 scale-engine: /src/theory/scale.js written, 635 lines, zero imports. theory-report.md Q7 and Q9 reproduce character for character (127/127). One theory question escalated: OD-2's C-major direction.` — **who: session agent**
- The §13.3 rhythm-label location discrepancy (§15 says `scale.js`; it lives in `step-grid.js`) — **who: Troubleshooter, before P3's piano roll**
- Nothing in `MEMORY.md`, `CLAUDE.md`, `SESSIONLOG.md` or `INDEX.md` was touched by this seat. — **who: closer**

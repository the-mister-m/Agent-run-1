# THEORY REPORT — `redpen-theory` (P3/S2)

Seat: `redpen-theory`, REDPEN. Opened **2026-08-24 15:50 EDT**.
Report started **2026-08-24 15:54 EDT**.
Read: [outline](../../../../outline) "Scales and chords" · [CONTRACTS.md](../../CONTRACTS.md)
§15 in full including the `[AMENDED 2026-08-24]` block A1–A11 · §4 · §6 · §9 · §10-H ·
[receipt-spec-scale.md](../S1-spec/receipt-spec-scale.md) · [A-redpen-theory.md](A-redpen-theory.md) ·
[STAGE.md](STAGE.md).
**Written: this file only. CONTRACTS.md not touched. No `/src` file touched. Nothing fixed.**

---

## ⛔ STOP-CONDITION RULING — read this first

My brief says **STOP THE PHASE** if I find an error in **the color rule** or **the
numeral-case rule**.

**I find no error in either. THE PHASE DOES NOT STOP. S3 MAY START.**

Both were re-derived by hand on scales `spec-scale` did not use, and both matched the
published triad series exactly without anything being looked up. Details in **Q9** (color)
and **Q8** (case). The findings below are real and several are serious, but **not one of
them lives in those two rules**, and none of them blocks `scale-engine` or `chord-engine`
from starting.

---

## THE CLAUSE TRACE

Every clause of the outline's **Scales and chords** section, traced to a line of §15 or
marked unserved. Clause text is the outline's, verbatim, typos included.

| # | Outline clause | Traced to | Verdict |
|---|---|---|---|
| **C1** | "The major scale as letters+sharp/flat as a circular pattern (labaled with digits, 1/8 for Do)" | §15.2b `spellingOf` + A1 (letters+sharp/flat) · §15.3 `circlePositions` + A3 (circular) · §15.3 `number` + §15.2c (digits) · **A4 `slotNumberLabel(1) = '1/8'`** | **SERVED** — see **M-1** (collides with frozen §6) |
| **C2a** | "They are not required to memorize scales with me" | §15.4's written prohibition on a per-key quality table · §15.8's same prohibition on a per-key numeral table · §15.10 note bank prints what would otherwise be recalled | **SERVED** — the strongest trace in the section |
| **C2b** | "but they are in performing groups (choir does solfege)" | §15.2c `solfegeOf` + **A2 movable do** — the system choirs actually use | **SERVED BY IMPLICATION** — context, not a spec obligation. A2 satisfies it; the struck fixed-do rule did not. |
| **C3a** | "See and hear … different ways to vary the scale (modes, minor variations, etc)" | **see:** §15.3 + §15.4 recompute on every `+/-` · **hear:** §15.3 "Playing from the circle" `emitNoteOn` · **modes/minor variations:** A8 `PRESETS`, nine | **SERVED at the API level** — see **M-6** (nothing in §15 hears the scale as a *scale*) |
| **C3b** | "…but not memorize" | §15.5: "the `+/-` reaches every one of those scales by hand whether or not it has a button" — verified reachable under `DEGREE_CLAMP = 2`, **Q2** | **SERVED** |
| **C3c** | "and understand that the scale CAN vary and HOW it might" | §4 `altered` / `resetScaleDegree` · A2's solfège deviation mark (`Mi♭`) shows *which* degree left major · A8 `scaleName()` names the result | **SERVED, THEN DEGRADED** — see **M-2**, the reset no-op |
| **C4** | "Skip method: every other note in scale order stacked together" | §15.6 `skipStack`, `k += 2`, stored order, mod 7, `+12` per wrap — the identical `stackOffset` the color rule uses | **SERVED EXACTLY** |
| **C5** | "A chord is built off the 'root'" | §15.6: "the root is a scale degree, not a free pitch" · `root = degree index 0-6` | **SERVED EXACTLY** |
| **C6** | "basic chord is 3 notes, anymore and they're 'upper overtone chords'" | §15.6 `isUpperOvertoneChord(count) = count > 3` · `count = 3` default · term protected against "seventh/extended/tetrad" | **SERVED** — see **M-7** (`count` 1 and 2 are admitted and unnamed) |
| **C7** | "They do not LEARN about 7th chords, but I do show them" | §15.6 `count = 3` as a *curriculum requirement* · §15.10 "this is where 7ths are shown but not learned" · `EXT[4] = '7'` | **SERVED** |
| **C8** | "Numbers refer to scale info (the 7th of the chord, the 7th chord includes the 7th note of that root's scale)" | §15.7 `rootScaleNote` · `chordToneScaleNumber(j) = 2j+1` · the identity proof · **"§15 has no chord-formula table anywhere"** | **SERVED, AND PROVEN** — re-derived by hand in **Q7** |
| **C9a** | "Roman numerals refer to chords (upper case for major, lower case for minor…" | §15.8 `applyCase`, case from `degreeQuality` — the color rule's own output | **SERVED EXACTLY** |
| **C9b** | "…use upper overtone chord nomenclature for everything else)" | §15.8 `SUFFIX` (`+`, `°`, `?`) **and** `EXT` (`''`,`7`,`9`,`''`,`''`) — §15 reads the clause as covering the *qualities*; the words read more naturally as covering the *extensions* | **SERVED TWICE OVER** — see **M-8**; harmless, because Brandon later ruled both halves directly |
| **C10** | "Inversions/comping chords by rearranging and spacing them out" | §15.9 `voicing` (absolute midi, not pitch classes) · `invert` (rearranging) · `spread` (spacing) · `bassOf` · A10 slash labels | **SERVED** — see **M-3** (application order) and **M-4** (`III/M6`) |
| **C11** | "scale builder that lets user pick the 12 scales and alter the degres of each with a +/-" | §4's twelve-key table · §15.5's four-mutation table · A11 OD-8 `DEGREE_CLAMP = 2` | **SERVED** — see **M-9** (OD-10: pick-a-key transposes, does not reset) |
| **C12** | "chord builder that lets them pick the scale, pick the roman numeral" | §15.8 `parseNumeral` · §15.10 `noteBank({root, …})` takes `scale` | **SERVED** — see **M-5** (§15 ships a *string parser* for something the outline calls a *pick*) |
| **C13** | "'Note bank' that runs the logic of the scale with the logic of the numeral they input" | §15.10 `noteBank()` — the numeral side (`degreeQuality` + `numeralOf`) and the scale side (`tones[].scaleNumber`) are literally the two halves of the returned object | **SERVED EXACTLY** |
| **C14** | "(I use color to show major and minor digits in the scale circle so that they don't have to memoerize diatonic chords with numerals)" | §15.4 `degreeQuality` / `degreeColor` · §9's four tokens · A5 `QUALITY_TOKEN` | **SERVED, AND VERIFIED BY HAND** — **Q9** |

**Nothing in the Scales and chords section is fully unserved.** The complete unserved /
partially-unserved list is **Q12**.

---

## Q1 — The circle: circular pattern, digits, 1/8 for Do, and position 8 → position 1

**Is the circle laid out the way Brandon describes it, including position 8 relating back
to position 1? — YES, and the position-8 relationship is the best-documented thing in §15.**

**What is on the circle.** §15.3: "the scale, **in scale order, ascending** … It is **not**
a circle of fifths and not a chromatic clock." Marked DERIVED from the outline's own words
("the major scale … as a circular pattern" — the thing made circular is the scale). Correct
reading; the outline gives no other.

**The layout, all four properties, all ruled:**

| Property | §15 | Source |
|---|---|---|
| Order | degree order, ascending — Do Re Mi Fa Sol La Ti Do | §15.3, DERIVED (outline) |
| Slots drawn | **7** | **A4** — Brandon, *"circle draws 7 slots"* |
| Do position | **12 o'clock, top centre** | **A3** — Brandon, *"Do is 12-o-clock, top center of circle"* |
| Direction | clockwise, `CIRCLE_DIRECTION = +1` | A3, seat's easiest-to-undo call, flagged |
| Do's label | **`'1/8'`** | **A4** — Brandon, *"labels Do 1/8"*; outline, *"1/8 for Do"* |

`slotNumberLabel(p) = p === 1 ? '1/8' : String(p)` → `'1/8' '2' '3' '4' '5' '6' '7'`. That
is the outline's clause rendered literally. **Exact match to Brandon's words.**

**Position 8 → position 1 — §15.3 answers it with a table, and the answer is right.**
"**Position 8 IS position 1.** Same degree index (`0`), same pitch class, same letter, same
syllable, same quality, same color. It differs in exactly two ways, and only two": the
`number` label, and sounding pitch `+12`. That is exactly §4's frozen ruling — "the eighth
note is the tonic an octave up … **It is degree 1 repeated, not a new degree**" — restated
without being re-derived.

**And §15 carries the load-bearing consequence, which is the part a builder would get
wrong:** position 8 carries **no `+/-` of its own**; `setScaleDegree(7, …)` does not exist
and `scale-engine` must reject it. §15.3 cites §4's own three-reasons block for why. This is
correct and I want it on the record that §15 did not have to be told.

**After A4 the two are drawn as one slot**, so a student never sees a separate "8" — they
see one slot reading `1/8`. Brandon asked for exactly that. `circlePositions()` still
returns 8 entries, unchanged in shape, so entry 8 survives only to carry `entries[7].midi`.
**That is the right engineering call** — it keeps the octave pitch reachable without a
schema change, and it makes A4's click decision a one-line change.

**Two things I am handing to Brandon out of this question, neither an error:**

- **M-1** — `'1/8'` is not one of the digits frozen §6 enumerates. Detail in Q11.
- **M-10** — the same concept renders `'1/8'` on the circle and `'1'`/`'8'` on the diatonic
  keys, because `label()`'s `'number'` branch (§15.2c) and `slotNumberLabel()` (A4) are two
  different producers that were never reconciled. Detail in Q11.

**Q1 verdict: SERVED. The circle is laid out the way Brandon describes it.**

---

## Q2 — "Not required to memorize": does §15 anywhere require recall rather than showing?

**In the engine: no, and it is written as a prohibition rather than a preference. At the
label and input edge: three places, all named below.**

**The two structural guarantees, and they are the reason this clause holds:**

- §15.4: "**A per-key lookup table of diatonic qualities is DRIFT, not an optimization.** It
  gives the right answer in twelve keys and the wrong answer the instant a student touches
  the `+/-` — which is the exact moment the device is supposed to be teaching."
- §15.8: "**Case is computed from the colour rule. It is never looked up per key.** … a
  per-key numeral table is correct in the twelve keys and wrong the moment a student presses
  `+/-`, and the `+/-` is the feature."

Both are stated as hard requirements. **A spec that shipped either table would have made the
app require exactly the memorization Brandon says he does not ask for**, and §15 forbids
both by name.

**Movable do removed the one genuine recall requirement §15 used to carry.** Under the
struck fixed-do rule, a student in B major got a syllable on **two of seven** degrees and
had to know which letters carry them. Under A2 the syllable binds to the **degree index**,
so all seven speak in every key. **The reversal made this clause true; it was not true
before.** I confirm no live fixed-do text survives: every remaining mention of `FIXED_DO`
in §15 sits inside a struck or superseded block (lines 1815, 1857, 1876, 2322, 2426–2437,
2661, 3274), and **D-17 is undamaged** — `open-decisions.md` D-16 is stamped SUPERSEDED,
D-17 stands.

### Verified by hand: the `+/-` really does reach every named scale

§15.5 claims "the `+/-` reaches every one of those scales by hand whether or not it has a
button." That claim is load-bearing for this clause and it interacts with `DEGREE_CLAMP = 2`
(A11, OD-8), so I checked it rather than taking it. Deviation of each preset from
`MAJOR = [0,2,4,5,7,9,11]`, degree by degree:

| Preset | `degrees` | Deviation from `MAJOR` | Max \|dev\| |
|---|---|---|---|
| Major | `[0,2,4,5,7,9,11]` | `0 0 0 0 0 0 0` | 0 |
| Dorian | `[0,2,3,5,7,9,10]` | `0 0 −1 0 0 0 −1` | 1 |
| Phrygian | `[0,1,3,5,7,8,10]` | `0 −1 −1 0 0 −1 −1` | 1 |
| Lydian | `[0,2,4,6,7,9,11]` | `0 0 0 +1 0 0 0` | 1 |
| Mixolydian | `[0,2,4,5,7,9,10]` | `0 0 0 0 0 0 −1` | 1 |
| Aeolian | `[0,2,3,5,7,8,10]` | `0 0 −1 0 0 −1 −1` | 1 |
| Locrian | `[0,1,3,5,6,8,10]` | `0 −1 −1 0 −1 −1 −1` | 1 |
| Harmonic Minor | `[0,2,3,5,7,8,11]` | `0 0 −1 0 0 −1 0` | 1 |
| Melodic Minor | `[0,2,3,5,7,9,11]` | `0 0 −1 0 0 0 0` | 1 |

**Every one of the nine is reachable, and none comes within a semitone of the clamp.**
`DEGREE_CLAMP = 2` does not fence a student out of a single named scale. §15.5's claim is
true, and OD-8's clamp value does not quietly break the curriculum's central clause.

### The three places recall creeps in — all at the edge, none in the engine

1. **`parseNumeral(str)` is a string parser for something the outline calls a pick.** → **M-5**
2. **The numeral slash form `III/M6` requires interval-name vocabulary** the Scales and
   chords section never introduces. → **M-4**
3. **`EXT[6] = EXT[7] = ''` makes a 3-note, 6-note and 7-note chord on the same degree label
   identically**, so the only way to know which one is sounding is to remember what you
   asked for. → **M-11**

**Q2 verdict: SERVED in the engine. Three edge cases handed to Brandon.** None of them is
in the color rule or the numeral-case rule, and none blocks S3.

---

## Q3 — Can a student produce a mode or minor variant and hear it without knowing its name?

**Produce: YES. Hear one note at a time: YES. Get back afterwards: NO — and that is the
most serious finding in this report.**

**Produce — served.** The `+/-` per degree (§4 `setScaleDegree`, §15.5's mutation table)
reaches all nine presets, verified in Q2's deviation table. No name is needed and no preset
button is needed. §15.5 states it outright: "**the `+/-` reaches every one of those scales
by hand whether or not it has a button.** A preset is a shortcut; the curriculum's
requirement is that a student can 'see and hear' the variation, and the `+/-` already
delivers that."

**See — served.** Every `+/-` press re-runs `degreeQuality` on the new array, so the circle
recolors and every numeral re-cases with no second code path (§15.4, §15.8). A2's solfège
mark (`Mi♭`) shows *which* degree left the major pattern and by how much — that is the
outline's "**HOW** it might" vary, rendered on the label.

**Hear — served at the API level, thin at the surface.** §15.3 "Playing from the circle":
clicking position `p` emits `input.emitNoteOn({note: entry.midi, …, source: 'circle'})`.
§15.9's voicing plays through §2's `noteOn` per pitch. So every pitch is reachable and
soundable. **But nothing in §15 plays the scale *as a scale*** — no ascending run, no
before/after A-B against the unaltered shape. The clause is "See and **hear** … different
**ways to vary** the scale", and hearing a variation as a variation is a comparison. §15 is
an API contract and it supplies every midi number such a feature needs, so this is not a
defect in §15 — it is a surface requirement that **no seat currently owns**. → **M-6**

**Name it afterwards — served, and better than the clause asks.** A8's `scaleName()`
back-matches `degrees` against `PRESETS`, so a student who finds Dorian by ear is *told*
"Dorian" rather than being required to know it. Anything unrecognised reads the literal
`'scale unknown'` — Brandon's own words, and honest rather than invented. **This is the
right shape for the clause:** the student produces by ear, the app names it after the fact.

### ⚠ The degradation — worked by hand. `resetScaleDegree` is a no-op on reachable paths.

§4's amendment is explicit about *why* `altered` and `resetScaleDegree` exist: "A student
who has moved a degree needs to see *that they moved it* **and get back**." I traced that
"get back" against A8 and it does not hold.

§15.5: `originDegrees(scale) = PRESETS[scale.name] ?? MAJOR`, and
`resetScaleDegree(i)` sets `degrees[i]` ← `originDegrees(scale)[i]`.
A8: `state.scale.name = scaleName(scale)`, which **back-matches `degrees`**.

**So `name` chases `degrees`, `origin` chases `name`, and therefore `origin` chases
`degrees` — the thing it is supposed to be measured against.** Worked, twice:

**Case A — Dorian → Mixolydian.**

| Step | `degrees` | `name` | `originDegrees` |
|---|---|---|---|
| `setScalePreset('Dorian')` | `[0,2,3,5,7,9,10]` | `'Dorian'` | Dorian |
| `setScaleDegree(2, +1)` | `[0,2,`**`4`**`,5,7,9,10]` | **`'Mixolydian'`** ← back-matched | **Mixolydian** |
| `resetScaleDegree(2)` | `degrees[2]` ← `PRESETS['Mixolydian'][2]` = **4** | — | — |

**`degrees[2]` is already 4. The reset does nothing. The student cannot get back to Dorian.**

**Case B — Phrygian → Aeolian.**

`setScalePreset('Phrygian')` → `[0,1,3,5,7,8,10]`. `setScaleDegree(1, +1)` →
`[0,`**`2`**`,3,5,7,8,10]`, which back-matches to **`'Aeolian'`**. `resetScaleDegree(1)`
reads `PRESETS['Aeolian'][1] = 2`. **Already 2. No-op. Stuck in Aeolian.**

**It sometimes works by luck.** `setScalePreset('Dorian')` then `setScaleDegree(1, +1)`
gives `[0,3,3,5,7,9,10]`, which matches nothing → `name = 'scale unknown'` → `origin` falls
back to `MAJOR`, and `MAJOR[1] === Dorian[1] === 2`, so the reset happens to land right.
**A reset that works when the result is unrecognisable and fails when it is recognisable is
the wrong way round**, and it fails silently — the button moves nothing and says nothing.

**A second consequence, on reload.** §15.5 reconstructs
`altered[i] = degrees[i] !== originDegrees(scale)[i]`. In Case A the reloaded project has
`origin === degrees`, so **`altered` comes back all-`false`** and the `+/-` UI shows the
student moved nothing. §4's amendment says `altered` exists precisely so a student "needs
to see *that they moved it*." After a save and reload, they cannot.

**This is not the color rule and not the numeral-case rule, so it is not a STOP.** It is
also not `spec-scale`'s carelessness — `originDegrees` was correct when `name` was `'Custom'`,
and **A8 reversed that assumption underneath it**. Nobody re-walked the pair. That is exactly
the kind of thing this seat runs early to catch, and it is one paragraph now instead of a
`scale-engine` bug later. → **M-2**

**Q3 verdict: SERVED for produce / see / hear-one-note / name-afterwards. The "get back"
half is broken on reachable paths.** Handed to Brandon as **M-2**; `scale-engine` (P3/S3)
must be told before it builds `resetScaleDegree`.

---

## Q4 — Skip method: is it every other note in scale order, stacked, from a root?

**YES, on all four sub-clauses, and this is the cleanest section of §15.**

| Outline sub-clause | §15.6 | Verdict |
|---|---|---|
| "every other note" | `k += 2` — `skipStack` builds tone `j` at `k = 2j` | ✓ |
| "in scale order" | walks `degrees` **in stored order**, wraps **mod 7**, `+12` per wrap | ✓ |
| "stacked together" | `[stackOffset(…,0), stackOffset(…,2), stackOffset(…,4), …]` | ✓ — but see **M-12** |
| "built off the root" | `root` is a **degree index 0-6** — "the root is a scale degree, not a free pitch" | ✓ |

```js
stackOffset(scale, i, k) = scale.degrees[(i + k) % 7] + 12 * Math.floor((i + k) / 7)
```

**Checked by hand, including both wrap cases.** C major, `degrees = [0,2,4,5,7,9,11]`:

- **Single wrap**, `root = 5` (degree 6): `k=0` → `degrees[5] = 9`; `k=2` → `(5+2)=7`,
  `7 % 7 = 0`, `⌊7/7⌋ = 1` → `degrees[0] + 12 = 12`; `k=4` → `(5+4)=9`, `9 % 7 = 2`,
  `⌊9/7⌋ = 1` → `degrees[2] + 12 = 16`. → `(9, 12, 16)` = **A C E**, A minor. Matches
  §15.4's C-major table row 6. ✓
- **Double wrap**, `root = 6`, `k = 12`: `(6+12) = 18`, `18 % 7 = 4`, `⌊18/7⌋ = 2` →
  `degrees[4] + 24 = 31`. `31 % 12 = 7` = **G**, which is the 13th of B's rotated scale.
  Scale number `2·6+1 = 13`. ✓
- **The `count` ceiling is right.** §15.6: "`count` tops out at 7. At `count = 8` the stack
  returns the root again an octave up (`k = 14`, `14 % 7 === 0`)." Verified: `k=14`,
  `root=0` → `degrees[0] + 24 = 24`, the root two octaves up, **no new pitch class.** ✓

**The structurally important thing §15.6 gets right, and it is the single most load-bearing
sentence in the section:** `skipStack` and the color rule use the **identical**
`stackOffset`. "One implementation, two callers … **If they ever disagree, the circle's
colour stops matching the chord the student hears, which is the one thing the device must
never do.**" That is correct, it is written as a requirement rather than a note, and the
module boundary (§15.6) enforces it by putting `stackOffset`/`skipTriad` in `scale.js` with
`chord.js` importing one direction only. **`scale-engine` and `chord-engine` cannot drift
apart here without violating a stated contract.**

**"In scale order" is also protected against being quietly repaired.** §15.4 rule 1:
"**Nothing sorts the three offsets.** … Sorting first would rename a broken scale into a
valid chord and hide what the student just did." Correct, and it is the right call.

### ⚠ One thing §15 asserts that is not true — worked by hand

§15.9 states: "Offsets from `skipStack` **already ascend by construction** (§15.6), so a
root-position voicing is already low→high." **That is false, and it is reachable in two
`+/-` presses inside `DEGREE_CLAMP = 2`.**

Start C major `[0,2,4,5,7,9,11]`:
`setScaleDegree(1, +2)` → `degrees[1] = 4` (deviation **+2**, inside the clamp).
`setScaleDegree(3, −2)` → `degrees[3] = 3` (deviation **−2**, inside the clamp).
→ `degrees = [0, 4, 4, 3, 7, 9, 11]`.

`skipStack(scale, root = 1, count = 3)`:
`stackOffset(1,0) = degrees[1] = 4` · `stackOffset(1,2) = degrees[3] = 3` ·
`stackOffset(1,4) = degrees[5] = 9` → **`[4, 3, 9]`. Not ascending.**

The **color rule handles this correctly** — `b − a = −1`, no `QUALITY` row, → `'altered'`,
exactly as §15.4 rule 1 says it should. **The color rule is not the problem.** But:

- `voicing(scale, 1, 3, 4)` = `[64, 63, 69]`, which §15.9 labels "root position, **low →
  high**". It is not low→high.
- `invert(v, n)` does `out.push(out.shift() + 12)` — it rotates **`v[0]`**, not the lowest
  pitch. Here `v[0] = 64` but the bass is `63`. **`invert` moves the wrong note**, and A10's
  slash label then reads a bass the student did not hear move.
- `bassOf(v) = Math.min(...v)` is **correct** and unaffected — which is why §15.9 was right
  to insist nothing re-sorts to find the bass.

→ **M-12.** Engineering, not curriculum; `chord-engine` (P3/S4) needs it before it builds
`invert`. Not a STOP.

**Q4 verdict: SERVED EXACTLY.** The skip method is every other note, in stored scale order,
stacked, from a scale-degree root, with one implementation shared by the color rule and the
chord builder. One false assertion downstream in §15.9 (**M-12**).

---

## Q5 — "Three notes basic, anymore and they're upper overtone chords"

**Is Brandon's term used? YES — and protected by an explicit prohibition.
Is the boundary at three? YES — verbatim.**

```js
isUpperOvertoneChord(count) = count > 3    // §15.6, marked "outline, verbatim"
```

| `count` | §15.6 calls it | Outline |
|---|---|---|
| 3 | **basic chord** | "basic chord is 3 notes" ✓ |
| 4, 5, 6, 7 | **upper overtone chord** | "anymore and they're 'upper overtone chords'" ✓ |

**The term is protected, not just used.** §15.6: "**No seat substitutes 'seventh chord',
'extended chord', or 'tetrad' for it**, in a variable name, a label, or a tooltip.
**CONFIRMED (outline, PHASE.md).**"

**I checked whether §15 obeys its own prohibition.** Grepping §15 (lines 1800–3366) for
`seventh` / `tetrad` / `extended chord` returns exactly two hits: **line 2818, which is the
prohibition itself**, and **line 2915**, prose describing a *scale's* 7th note ("the seventh
followed it"), not naming a chord type. **No banned synonym leaked in.** "Upper overtone"
appears **nine** times. `noteBank()` returns an `isUpperOvertoneChord` field so the surface
never has to re-derive the boundary. **Clean.**

**§15.6 also reads the term's second appearance correctly:** "The phrase appears in the
outline twice — once for chords over three notes, once as 'upper overtone chord
**nomenclature**' for numerals (§15.8)." That is right, and how §15.8 spends the second
appearance is **M-8** (Q9b in the clause trace).

### The one gap: `count` 1 and 2 are admitted and have no curriculum name

`skipStack(scale, root, count = 3)  // root = degree index 0-6; count = 1 … 7`. So one- and
two-tone stacks are **in domain**, and `isUpperOvertoneChord(1) === false` — which means §15
classifies a single note as a **"basic chord"**. The outline says a basic chord **is 3
notes**. Nothing in the curriculum names a one- or two-note stack, and §10-H says a seat that
finds itself picking a chord name has left its lane.

**This is small and it is not a defect in the boundary** — the boundary at 3 is exactly
right. It is a domain that was opened wider than the curriculum describes, and the Chord
Module (P3/S6) will have to decide what to draw for it. → **M-7**

**Q5 verdict: SERVED.** Brandon's term is used, is the only term used, and the boundary is
at three. One under-specified domain edge handed over as **M-7**.

---

## Q6 — 7ths: buildable but not foregrounded? Has the spec drifted into headlining them?

**Buildable: yes. Foregrounded: NO. §15 has not drifted — it defends against exactly this
drift by name.**

**Every default in §15 is three.** `skipStack(scale, root, count = 3)` ·
`noteBank(scale, {count = 3, …})`. And §15.6 does not treat that as an implementation
default — it marks it a **curriculum requirement**:

> "**`count = 3` is the default and it is a curriculum requirement, not a convenience.**
> Outline: 'They **do not LEARN** about 7th chords, but I do show them.' PHASE.md: 'Build
> them; **do not foreground them**.' A four-tone chord must be something a student reaches
> for, never what they get by default. **CONFIRMED.**"

That is the clause read correctly and then written into the contract as a constraint on
every downstream seat, which is the right place for it.

**Shown, and shown in the right way.** §15.10: "**This is where 7ths are shown but not
learned.** … Raising `count` to 4 makes a tone appear labelled `scaleNumber: 7`. It is
visible, it is **explained by the number on it**, and it is not the default." The 7th does
not arrive as a chord-name a student has to be taught — it arrives as a note carrying the
digit 7, which is the same device the rest of the curriculum runs on. **This is the clause
working, not merely satisfied.**

**§15 also declines to decide how far the UI goes.** §15.6: "Whether the UI exposes anything
past 4 or 5 is the Chord Module's call (P3/S6), not this contract's." Correct restraint —
foregrounding is a UI decision and §15 leaves it where it belongs.

**One thing that looks like foregrounding and is not:** §15.7's entire worked example is a
*four-tone* chord (`G B D F`). That is the outline's own clause being served — "the 7th
chord includes the 7th note of that root's scale" — not §15 promoting 7ths. **No drift.**

### The related defect: the labels for `count` 3, 6 and 7 are byte-identical

`numeralOf = applyCase(ROMAN[root], q) + SUFFIX[q] + EXT[count]`, with
`EXT = { 3:'', 4:'7', 5:'9', 6:'', 7:'' }` (A6, Brandon: *"no names needed past 9"*).

| `count` | 3 | 4 | 5 | **6** | **7** |
|---|---|---|---|---|---|
| C major, `root = 4` | `V` | `V7` | `V9` | **`V`** | **`V`** |
| C major, `root = 6` | `vii°` | `vii°7` | `vii°9` | **`vii°`** | **`vii°`** |

**Three different chords produce the same string, and the sequence runs `V · V7 · V9 · V ·
V` — it collides and it is non-monotonic.** The most extended chords end up the least
labelled, which reads backwards for a device whose whole job is to print what is sounding.

**This is a consequence of Brandon's own ruling, not a seat's error** — he said no names
past 9, and `''` is a faithful reading of that. But "no *name* needed" and "the label is
indistinguishable from a triad" are not obviously the same instruction. **The data is not
lost** — `noteBank()` returns `isUpperOvertoneChord`, so a surface *can* tell them apart;
only the string collides. → **M-11**

**Q6 verdict: SERVED. No drift.** 7ths are buildable, defaulted away from, and shown through
the scale-number device rather than as chord names. One label-collision consequence of A6
handed to Brandon as **M-11**.

---

## Q7 — "Numbers refer to scale info." Is it true for ALTERED scales? — **HAND-WORKED**

**YES, and it is true by construction rather than by a check — which is the strongest form
this clause could have been given. I re-derived it on a scale `spec-scale` did not use.**

**The mechanism, §15.7.** Two functions walk the same array with the same index:

```js
skipStack(scale, root, count)[j]  builds tone j at   k = 2j
rootScaleNote(scale, root, n)     reaches number n at k = n − 1
n − 1 = 2j   ⟹   n = 2j + 1   ⟹   chordToneScaleNumber(j) = 2j + 1
```

So the 4th tone of a stack (`j = 3`) **is** scale number 7. Not asserted — forced.

**And §15 has no chord-formula table anywhere, which I verified rather than took.** Grepping
lines 1800–3366 for `maj7` / `m7 =` / `dom7` / `[0,4,7…` / `FORMULA` returns **exactly two
hits, lines 2857–2858, which are the prohibition itself**: "This is the clause most likely to
be implemented as a table of chord formulas — `maj7 = [0,4,7,11]`, `m7 = [0,3,7,10]` — and
**a table is wrong here.**" **No formula table exists in §15.** That is what makes the clause
survive the `+/-`.

### My hand-worked example — A harmonic minor, the chord on degree 5

Deliberately **not** `spec-scale`'s example (they used C melodic minor, degree 5). Mine uses
a different scale, a different tonic, and a different alteration path.

`tonic: 9` (A) · `degrees: [0, 2, 3, 5, 7, 8, 11]` = **Harmonic Minor** — reachable from A
major in two presses, `setScaleDegree(2, −1)` and `setScaleDegree(5, −1)`, both inside
`DEGREE_CLAMP = 2`. Notes: **A B C D E F G♯.**

Take the chord on **degree 5** → `root = 4`. `degrees[4] = 7`, pc `(9 + 7) % 12 = 4` = **E**.

**Step 1 — "that root's scale", by `rootScaleNote(scale, 4, n) = stackOffset(scale, 4, n−1) − 7`:**

| `n` | 1 | 2 | 3 | 4 | 5 | 6 | **7** |
|---|---|---|---|---|---|---|---|
| `k = n−1` | 0 | 1 | 2 | 3 | 4 | 5 | **6** |
| `(4+k) % 7` | 4 | 5 | 6 | 0 | 1 | 2 | **3** |
| `⌊(4+k)/7⌋` | 0 | 0 | 0 | 1 | 1 | 1 | **1** |
| `stackOffset` | 7 | 8 | 11 | 12 | 14 | 15 | **17** |
| **− 7** | 0 | 1 | 4 | 5 | 7 | 8 | **10** |
| the note | E | F | G♯ | A | B | C | **D** |

**E's scale inside this key is E F G♯ A B C D.** (It is the fifth mode of harmonic minor —
but nothing looked that up, and the app never needs to know it has a name.)
**The 7th note of E's scale is D**, 10 semitones above E.

**Step 2 — the four-tone chord on the same degree**, `skipStack(scale, 4, 4)`, `k = 0,2,4,6`:

| `j` | 0 | 1 | 2 | **3** |
|---|---|---|---|---|
| `k = 2j` | 0 | 2 | 4 | **6** |
| `stackOffset` (from tonic) | 7 | 11 | 14 | **17** |
| pc `(9 + offset) % 12` | 4 | 8 | 11 | **2** |
| note | **E** | **G♯** | **B** | **D** |
| `chordToneScaleNumber(j) = 2j+1` | 1 | 3 | 5 | **7** |

**The chord is E G♯ B D.** Its 4th tone is **D**. The 7th note of E's scale is **D**.
**They are the same note, and the identity holds numerically:**
`skipStack[3] = 17` and `rootScaleNote(4, 7) + degrees[4] = 10 + 7 = 17`. ✓

*(Independent check, not used to derive anything: E G♯ B D is E dominant 7 — the V7 of A
harmonic minor. Correct. It fell out of two array walks.)*

### Step 3 — the part that proves it is not a table: move one entry and watch the 7th follow

The 7th of E's scale is read from **`degrees[3]`** — which is **degree 4 of the A scale**, a
degree a student can press with no idea it affects the chord on degree 5.

`setScaleDegree(3, +1)` → `degrees[3]: 5 → 6` (deviation from `MAJOR[3] = 5` is **+1**,
inside the clamp). `degrees = [0, 2, 3, 6, 7, 8, 11]`.

- `rootScaleNote(4, 7) = stackOffset(4, 6) − 7 = (degrees[3] + 12) − 7 = 18 − 7 = **11**` → **D♯**
- `skipStack(scale, 4, 4)[3] = 18` → pc `(9 + 18) % 12 = 3` → **D♯**
- The chord is now **E G♯ B D♯** — **E major 7**, where it was E dominant 7.

**One number moved in one array. The seventh followed it. No line of code changed and no
table was consulted** — a `dom7 = [0,4,7,10]` table would have gone on printing D forever.
**This is the outline's clause working on a scale nobody anticipated.**

*(Side note that shows A8's relabel path has a real target: `[0,2,3,6,7,8,11]` matches none
of the nine presets, so `scaleName()` returns the literal **`'scale unknown'`**. It is
Hungarian minor — a genuinely named scale outside `PRESETS`, and exactly the case Brandon's
*"I'll go back and label them myself"* procedure exists for. **The mechanism is correct and
one data row fixes it.**)*

**Q7 verdict: SERVED, AND PROVEN.** "The 7th of the chord is the 7th note of that root's
scale" holds for altered scales by construction, verified by hand on A harmonic minor and
again after a further alteration. **No mismatch found in this clause.**

---

## Q8 — Roman numerals, case, and the numeral-case rule ⛔ **STOP CONDITION**

**Is case computed from the color rule rather than looked up per key? — YES, COMPUTED.
There is no lookup table. NO ERROR. THE PHASE DOES NOT STOP ON THIS RULE.**

```js
numeralOf(scale, root, count = 3):
  q = degreeQuality(scale, root)                  // §15.4 — the COLOUR RULE ITSELF
  return applyCase(ROMAN[root], q) + SUFFIX[q] + EXT[count]
```

**The case's input is literally the color rule's output.** `numeralOf` calls the same
`degreeQuality` that `degreeColor` calls. §15.8 states the consequence as a hard requirement:

> "**Case is computed from the colour rule. It is never looked up per key.** This is a hard
> requirement, not a style note: a per-key numeral table is correct in the twelve keys and
> wrong the moment a student presses `+/-`, and the `+/-` is the feature. `numeralOf` takes
> `degreeQuality`'s output as its input, so the numeral and the colour on the circle **can
> never disagree — they are the same computation read twice.**"

**This is exactly the property my brief told me to protect, and §15 protects it structurally
rather than by discipline.** A table would break the moment a student uses the `+/-`; there
is no table to break. **Verified, not taken:** grepping §15 for
`NUMERALS_BY_KEY` / `DIATONIC` / `QUALITY_BY` / a literal `'I','ii'` series returns
**nothing**. No per-key table exists anywhere in the section.

### Is the case mapping itself right?

| Quality | Third (`b−a`) | Case | Source |
|---|---|---|---|
| `'major'` | 4 | **UPPER** `IV` | **outline, verbatim** |
| `'minor'` | 3 | **lower** `iv` | **outline, verbatim** |
| `'augmented'` | 4 | **UPPER** `III⁺` | derived from the third; **Brandon ratified (A9)** |
| `'diminished'` | 3 | **lower** `vii°` | same |
| `'altered'` | none | UPPER, `applyCase` = identity | seat's flagged call (A9) |

**The derivation is sound, and I checked it rather than accepting the ratification.** The
outline gives two rows. The only quantity that separates them is the lower interval `b−a` —
the **third** — which is 4 in the upper-case row and 3 in the lower-case row. The fifth is
7 in both, so the third is the *only* discriminator available. "Case is carried by the
third" is therefore the **minimal** generalization of Brandon's two rows, not a preference
smuggled in beside them.

**And it lands on standard practice without aiming at it.** Augmented → upper (`III⁺`),
diminished → lower (`vii°`) is what every published numeral series uses. In Q9 I derive the
full A-harmonic-minor series from the formula alone and get **i · ii° · III⁺ · iv · V · VI ·
vii°**, which matches the published series exactly. **A derivation that reproduces the
convention without consulting it is the strongest evidence it is correct.**

**One consistency check that matters and passes:** `degreeQuality` always uses the **triad**,
whatever `count` is (§15.4 rule 2, citing §4). So a four-tone chord's case comes from its
triad — which means the numeral's case and the circle's color agree **even for upper overtone
chords**. Had `numeralOf` cased from the full stack, the circle and the label would diverge
the moment a student reached for a 7th. **It does not.**

**"Upper overtone chord nomenclature for everything else"** is handled by `SUFFIX` (`+`, `°`,
`?`) and `EXT` (`''`, `7`, `9`, `''`, `''`), all superscript per A9. Which half of that
Brandon's clause was actually aimed at is **M-8**; the label collision it causes is **M-11**.

### ⚠ The one thing in the numeral system that is not flagged anywhere — and should be

**§15 has no mechanism to put an accidental on a numeral, and never says so.** `ROMAN` is a
bare `['I','II','III','IV','V','VI','VII']`; `numeralParts()` returns `{base, sup}` with **no
prefix slot**; grepping §15 for `♭III` / `♭VI` / `♭VII` / `prefix` returns **nothing**. The
data shape cannot express `♭III` even if someone wanted it.

So in C with degree 3 lowered, the chord on degree 3 reads **`III⁺`**, where a theory
classroom would write **`♭III⁺`**.

**I want to be clear this is defensible and may well be what Brandon wants.** §15's numerals
are degree numbers *within the current scale* — `degrees` **is** the scale, so the third
degree is simply the third degree, and there is nothing for a flat to be flat *against*. A
`♭` prefix would require a major-key reference to measure from, which is precisely the
major-key-lookup thinking §15 spent two sections forbidding. **It is internally consistent
and it serves "numbers refer to scale info."**

**But it is a curriculum-facing decision that §15 made silently.** It is not in the amendment
block, not in OPEN DECISIONS, not marked DERIVED — it is simply absent, and the outline's own
note that students "are in performing groups" is the one place the app's notation meets
notation they see elsewhere. **An unflagged choice inside the numeral system is exactly what
this seat exists to surface.** → **M-13**

**It is not an error in the case rule** — case is computed correctly from the color rule,
which is what the STOP condition covers. **No STOP.**

**Q8 verdict: SERVED, COMPUTED, NO LOOKUP TABLE. ⛔ STOP CONDITION CLEARED — no error in the
numeral-case rule.** One unflagged omission handed over as **M-13**.

---

## Q9 — The color rule ⛔ **STOP CONDITION** — the point of the whole device

Outline: "**I use color to show major and minor digits in the scale circle so that they
don't have to memoerize diatonic chords with numerals.**"

**Is the rule computed from the degree array alone? — YES. NO ERROR. THE PHASE DOES NOT STOP.**

```js
stackOffset(scale, i, k) = scale.degrees[(i + k) % 7] + 12 * Math.floor((i + k) / 7)
skipTriad(scale, i)      = [stackOffset(…,0), stackOffset(…,2), stackOffset(…,4)]
degreeQuality(scale, i)  = QUALITY[(b − a)][(c − b)] ?? 'altered'
```

| `b−a` | `c−b` | quality |
|---|---|---|
| 4 | 3 | major |
| 3 | 4 | minor |
| 3 | 3 | diminished |
| 4 | 4 | augmented |
| anything else | | **`'altered'`** |

**`scale.tonic` never appears.** The only input is `scale.degrees`. §15.4 rule 3 states it —
"`tonic` is not an input … **A transposed scale is the same colours**" — and the code
confirms it. This is exactly what §4's own amendment confirmed ("computable from `degrees`
alone") and §15 does not re-derive it. **Computed from the degree array alone: yes.**

### Hand-worked example 1 — C major, all seven degrees

`degrees = [0, 2, 4, 5, 7, 9, 11]`. Nothing below was recalled; every row is the formula run.

| `i` | indices `(i, i+2, i+4)` mod 7 | offsets | `b−a` | `c−b` | Quality | §9 token | Numeral | notes |
|---|---|---|---|---|---|---|---|---|
| 0 | 0, 2, 4 | 0, 4, 7 | 4 | 3 | **major** | `--deg-major` | **I** | C E G |
| 1 | 1, 3, 5 | 2, 5, 9 | 3 | 4 | **minor** | `--deg-minor` | **ii** | D F A |
| 2 | 2, 4, 6 | 4, 7, 11 | 3 | 4 | **minor** | `--deg-minor` | **iii** | E G B |
| 3 | 3, 5, 0′ | 5, 9, 12 | 4 | 3 | **major** | `--deg-major` | **IV** | F A C |
| 4 | 4, 6, 1′ | 7, 11, 14 | 4 | 3 | **major** | `--deg-major` | **V** | G B D |
| 5 | 5, 0′, 2′ | 9, 12, 16 | 3 | 4 | **minor** | `--deg-minor` | **vi** | A C E |
| 6 | 6, 1′, 3′ | 11, 14, 17 | 3 | 3 | **diminished** | `--deg-dim` | **vii°** | B D F |

`′` = wrapped past the top of the array, `+12`.

**Matches §15.4's own C-major reference table row for row.** §15.4 asks that
"`redpen-theory` should re-derive one row by hand" — **I re-derived all seven.** The
published C-major series is I ii iii IV V vi vii°. **Exact match, nothing looked up.**

### Hand-worked example 2 — A harmonic minor, an altered scale, all seven degrees

Deliberately **not** `spec-scale`'s example. `tonic: 9` (A) ·
`degrees = [0, 2, 3, 5, 7, 8, 11]` — reachable from A major with `setScaleDegree(2, −1)` and
`setScaleDegree(5, −1)`, both inside the clamp. Notes **A B C D E F G♯**.

| `i` | indices | offsets | `b−a` | `c−b` | Quality | §9 token | Numeral | notes |
|---|---|---|---|---|---|---|---|---|
| 0 | 0, 2, 4 | 0, 3, 7 | 3 | 4 | **minor** | `--deg-minor` | **i** | A C E |
| 1 | 1, 3, 5 | 2, 5, 8 | 3 | 3 | **diminished** | `--deg-dim` | **ii°** | B D F |
| 2 | 2, 4, 6 | 3, 7, 11 | **4** | **4** | **augmented** | `--deg-aug` | **III⁺** | C E G♯ |
| 3 | 3, 5, 0′ | 5, 8, 12 | 3 | 4 | **minor** | `--deg-minor` | **iv** | D F A |
| 4 | 4, 6, 1′ | 7, 11, 14 | 4 | 3 | **major** | `--deg-major` | **V** | E G♯ B |
| 5 | 5, 0′, 2′ | 8, 12, 15 | 4 | 3 | **major** | `--deg-major` | **VI** | F A C |
| 6 | 6, 1′, 3′ | 11, 14, 17 | 3 | 3 | **diminished** | `--deg-dim` | **vii°** | G♯ B D |

**Updated 2026-08-24 — M-14 ruled (b).** Degree 2's token above was `--deg-dim` when this
check ran; Brandon has since split augmented off onto its own `--deg-aug` (§9), and this
cell is updated to match so the seat's done-check binds to current, not stale, ground
truth. Nothing else about this row's derivation changed.

**Independent check.** The published triad series of harmonic minor is
**i · ii° · III+ · iv · V · VI · vii°**. The seven rows above match it **exactly** — and not
one was looked up. They fall out of **two subtractions per degree** on an array a student
edited with two button presses. **The device works.**

**This is also the case that shows why a lookup table would have been drift**: a per-key
table would still be printing C major's `iii` on degree 3 while the student is hearing an
augmented triad.

### Stress test — does `'altered'` ever fire on a legitimate scale?

`'altered'` should mean "you built something that is not a triad", never "the app got
confused by a real scale". I ran the formula over the riskiest presets:

| Preset | Derived series | Published series | Match |
|---|---|---|---|
| Major | I ii iii IV V vi vii° | same | ✓ |
| **Phrygian** `[0,1,3,5,7,8,10]` | i II III iv v° VI vii | i ♭II ♭III iv v° ♭VI ♭vii | ✓ (qualities identical) |
| **Locrian** `[0,1,3,5,6,8,10]` | i° II iii iv V VI vii | i° ♭II ♭iii iv ♭V ♭VI ♭vii | ✓ |
| **Harmonic Minor** | i ii° III⁺ iv V VI vii° | same | ✓ |
| **Melodic Minor** `[0,2,3,5,7,9,11]` | i ii III⁺ IV V vi° vii° | same | ✓ |

**No preset produces a spurious `'altered'`.** Five scales derived by hand, five exact
matches. *(The `♭` prefixes in the published column are notation, not quality — see
**M-13**.)*

And `'altered'` **does** fire where it should: from Q4's `[0, 4, 4, 3, 7, 9, 11]`, degree 2's
stack is `[4, 3, 9]`, `b − a = −1`, no `QUALITY` row → `'altered'`. **Correct — the circle
says "you made something that is not one of the four" instead of lying.** §15.4's three
supporting rules (nothing sorts the offsets; the color always uses the **triad** however many
tones are sounding; `tonic` is not an input) are all right and all cite §4.

### Does the color rule serve the outline's clause?

The clause is specifically about **"major and minor digits"**. Major → `--deg-major`, minor →
`--deg-minor` — **two distinct tokens, always, in every key and every altered scale.** The
student never memorizes which numeral is minor because the color says so and the numeral's
case is the same computation (Q8). **The device's stated purpose is fully served.**

**Augmented's token (`--deg-dim` at check-time, `--deg-aug` since M-14) does not touch that
clause either way** — aug/dim/altered are all "everything else", outside what the outline's
sentence is about. **So it was not an error, and it was not a STOP, under either token.**

### One reading Brandon should have before he acts on `spec-scale`'s recommendation

§15.4 records "**§9 defines four degree tokens and §15 has five qualities**" as a gap, and
`spec-scale` recommends Brandon **add `--deg-aug` to §9**. I read §4 differently and he
should have both readings: §4 writes "Major → warm, minor → cool, **diminished/augmented →
flagged distinctly**" as **one clause covering both**, and §9's four tokens then map
**exactly** onto `{major, minor, dim+aug, altered}` with **no gap at all**. Under that
reading §15 already matches §4 and §9 needs no edit. → **M-14**

**Q9 verdict: SERVED, COMPUTED FROM THE DEGREE ARRAY ALONE, VERIFIED ON FIVE SCALES BY HAND.
⛔ STOP CONDITION CLEARED — no error in the color rule.** One reading offered as **M-14**.

---

## Q10 — Inversions and comping: does the voicing shape support them, or only root position?

**It supports them, and §15.9 gets the one decision that matters exactly right.**

> "**A voicing is a list of ACTUAL PITCHES — midi numbers — not pitch classes.** … A pitch
> class set cannot express an inversion: `{C, E, G}` and `{E, G, C}` are the same set, and
> **the entire lesson is that they are not the same chord to listen to.** Pitch classes are
> for colouring and labelling; **pitches are for sounding.**"

That is the correct answer to my question, with the correct reason attached. A spec that had
made a voicing a pitch-class set would have supported root position and nothing else, and
would have been unfixable without a schema change.

| Outline word | §15.9 | Verdict |
|---|---|---|
| "Inversions" | `invert(v, n)` — rotate the lowest tone up an octave, `n` times | ✓ (see **M-12**) |
| "rearranging" | same | ✓ |
| "spacing them out" | `spread(v, offsets)` — per-tone octave displacement | ✓ |
| naming the result | `bassOf(v)` + A10's `chordLabel` slash notation | ✓ (see **M-4**) |

**`spread` is right to be one primitive.** "`[0,0,0]` is a closed voicing; `[0,1,0]` opens
the middle up; `[-1,0,0]` drops the bass. **Every spacing the curriculum's clause describes
is reachable from it.**" Correct — and §15.9 declines to invent named patterns ("drop 2",
"shell"), which §10 forbids and nobody asked for.

**And the sounding-order rule is right:** "The returned array is in **SOUNDING order, not
sorted order**. … **A seat that sorts a voicing has thrown away which tone is which.**"

### Verified: the curriculum's own chord loop builds

§15.9 and A10 both cite the skills list's `Loop F ~> C/E ~> Dm/F ~> Bb/F` as evidence for the
slash form, so I checked whether §15 can actually produce it. **It can — the loop is
diatonic F major** (`tonic: 5`, `degrees = MAJOR`), every chord a plain `skipStack`:

| Chord | `root` | offsets | pitch classes | notes | bass | label |
|---|---|---|---|---|---|---|
| F | 0 (I) | 0, 4, 7 | 5, 9, 0 | F A C | F = root | **`F`** (no slash) |
| C/E | 4 (V) | 7, 11, 14 | 0, 4, 7 | C E G | E | **`C/E`** ✓ |
| Dm/F | 5 (vi) | 9, 12, 16 | 2, 5, 9 | D F A | F | **`Dm/F`** ✓ |
| Bb/F | 3 (IV) | 5, 9, 12 | 10, 2, 5 | B♭ D F | F | **`Bb/F`** ✓ |

**All four are in key, all four are reachable by `voicing` + `invert`, and no borrowed chord
is needed** — which also confirms OD-14's justification ("borrowed chords appear nowhere in
the curriculum") survives contact with the skills list. The earlier `Am ~> G ~> F` is plain
C major vi–V–IV. **Good news for S4, and worth having checked rather than assumed.**

### ⚠ But the entire letter-label path is called and never defined

The loop above is written in the **letter** system. A10's `chordLabel` reaches it through:

```js
head   = system === 'letter' ? letterHead(scale, root, count) : numeralOf(scale, root, count)
bassText(…) = system === 'letter' ? spellingOfPc(scale, bassPc).text : INTERVAL_NAME[…]
```

**Three functions on that path are called or listed but never specified anywhere in
CONTRACTS.md:**

| Function | Appears | Defined? |
|---|---|---|
| `letterHead(scale, root, count)` | line **2179**, the call site — **once, total** | **NO** |
| `spellingOfPc(scale, pc)` | line **2197**, the call site — **once, total** | **NO** (distinct from `spellingOf(scale, i)`, which takes a degree index, and from `chromaticSpelling(scale, pc)`) |
| `chordName` | line **2842**, §15.6's module-boundary table, attributed to "§15.8" | **NO** — §15.8 defines `parseNumeral`, `numeralPitchClasses`, `numeralOf`, `applyCase`, `SUFFIX`, `EXT`, `numeralParts`, and **no `chordName`** |

**And there is a concrete wrong answer waiting inside it.** A9 sets `SUFFIX['minor'] = ''`,
marked "**CONFIRMED — case alone carries it**". That is right for roman numerals, where
lower case *is* the minor marker. **Letters have no case to carry.** If `letterHead` reuses
`SUFFIX` — and A9 says "the same split applies to the letter label" — then the vi chord above
renders **`D/F`**, not **`Dm/F`**.

**That breaks Brandon's own written example**, in the one system the curriculum's skills list
actually uses. The letter system needs its own quality suffixes (`''`, `'m'`, `'+'`, `'°'`,
`?`) and §15 never says so. → **M-15**

**This is not a STOP** — it is not the color rule and not the numeral-case rule — but it is
the largest *unspecified* area in §15, it sits in `chord-engine`'s (P3/S4) lane, and §10-H
makes "picking a chord name" Brandon's, not a build seat's. **S4 will hit this on day one.**

**Q10 verdict: SERVED — the data shape genuinely supports inversion and comping, not just
root position.** The numeral label path is complete; **the letter label path is not
specified at all** (**M-15**), and `invert` has the ordering defect from Q4 (**M-12**).

**One smaller gap:** `noteBank()` accepts both `inversion` and `offsets` but **never states
which is applied first**. `invert` then `spread` and `spread` then `invert` give different
voicings, and combined with M-12 the difference is audible. One sentence in §15.10 settles
it. → **M-3**

---

## Q11 — Does §15 contradict CONTRACTS §4 or §6 anywhere? **Name it.**

§15's own opening claims it does not: "§4 (scale state) and §6 (overlay labels) are frozen;
this section is **the computation behind them, not a revision of them**."

**That claim does not hold. There are three genuine contradictions and one ambiguity §15 had
to resolve by choice.** I checked the passing cases too, and list them, so the negative
result is visible rather than assumed.

### CONTRADICTION 1 — §15 vs §4, on the purpose of `altered` and `resetScaleDegree`

**§4's amendment states why both fields exist:** "A student who has moved a degree needs to
see *that they moved it* **and get back**. `degrees` alone cannot express 'changed from
default' — it holds the value, not the history."

**§15 removes both halves on reachable paths.** A8 made `state.scale.name` back-match
`degrees`; §15.5's `originDegrees(scale) = PRESETS[scale.name] ?? MAJOR` reads that same
`name`. The origin therefore **chases the array it is supposed to be measured against**, so
`resetScaleDegree` becomes a silent no-op (Dorian→Mixolydian and Phrygian→Aeolian, both
worked in Q3) and reconstructed `altered` comes back **all-`false`** after a reload.

**This is the one place where §15 defeats a stated purpose of a frozen section rather than
merely phrasing something differently.** → **M-2**

### CONTRADICTION 2 — §15 vs §6, on what a label may be

**§6 frozen, and it enumerates:**
- "`number` = scale degree digits, **1 through 8** with 8 = Do at the octave."
- "`letter` = **A-G with accidentals**."

**§15 emits two composite strings that neither enumeration covers:**

| §15 | Emits | §6 allows |
|---|---|---|
| **A4** `slotNumberLabel(1)` | **`'1/8'`** | digits 1 … 8 |
| **A1** `spellingOf` in `tonic: 6` | **`'F♯/G♭'`** (every degree spells twice) | A-G with accidentals |

§15.1 even restates "degree number … **1–8, §6** … **CONFIRMED**" — and then §15.3 emits
`'1/8'` two subsections later. **§15 contradicts §6 and itself on the same value.**

**Both composites come from Brandon's own later rulings** — *"circle draws 7 slots, labels Do
1/8"* and *"enharmonics follow key signature or show both"* — and the outline's own "1/8 for
Do". **His intent is not in doubt; frozen §6 simply predates the rulings and was never
amended.** But §15 claimed to revise nothing and did. **Only Brandon can edit §6.** → **M-1**

### CONTRADICTION 3 — §15 contradicts itself about §4's fields, in a way that can break a surface

**§15.2 states, as a blanket rule:** "`scale.altered` and `scale.preset` (§4) are display
state and are **never read by any function in this section**."

**False in three places inside §15:**

1. §15.3 — `circlePositions()` returns `altered: scale.altered[(p-1) % 7]`. **Reads it.**
2. §15.5 — `originDegrees(scale) = PRESETS[scale.name] ?? MAJOR`. **Reads `name`.**
3. §15.5 — `altered[i] = scale.degrees[i] !== originDegrees(scale)[i]`. **Writes it.**

**§4 does not say this — §15.2 invented a stronger rule and then broke it.** §4's actual
words are narrower and are respected: "`altered` and `preset` are display state derived
alongside it, **never read by the audio path**." `circlePositions` is display, not audio.

**Why it matters rather than being pedantry:** A5 tells surfaces to mark "moved" from
`scale.altered[i]` "which `circlePositions()` already returns." A `scale-engine` seat that
takes §15.2 literally will **drop that field**, and the `+/-` UI that §4's amendment exists
to serve loses its state. **One sentence in §15.2 prevents it.** → **M-16**

### AMBIGUITY, not a contradiction — §4 supports both readings and §15 had to pick

§4's own amendment contains **both** answers to "does picking a key reset the degrees?":

- Reset: "The student picks the key from these twelve. That sets `tonic`. **The degrees are
  then generated from the major-scale pattern** — they are not picked separately."
- Transpose: "`tonic` rotates it into pitch classes for display; **the array itself does not
  move**." · "The twelve are the *starting points*, not a cage."

**§15 shipped transpose and said so** (OD-10 → A11), under Brandon's standing "easiest route
to undo" instruction, because transpose is zero new code. **That is a defensible call on an
ambiguous frozen section, not a contradiction** — but it is a product decision sitting inside
a frozen section, and Brandon should close it rather than let it ship by default. → **M-9**

### Checked and PASSING — no contradiction found

So the negative result is visible rather than assumed:

| Frozen rule | §15 | Result |
|---|---|---|
| §4 "`degrees` … **ALWAYS 7 entries**", skip is **mod 7** | mod 7 everywhere; never adds an 8th entry; `setScaleDegree(7,…)` explicitly rejected | ✓ |
| §4 "colour computed in `theory/scale.js`, **no surface computes its own colors**" | `circlePositions()` hands the surface a finished `colorToken` | ✓ |
| §4 "`degrees` is the single source of truth for sound and colour" | `degreeQuality` takes **only** `degrees`; `tonic` is not an input | ✓ |
| §4's four mutations | §15.5's table matches the declared API exactly | ✓ |
| §4 "`preset` → `'Custom'` once altered" | §15 states it does not and cannot change this, and does not | ✓ |
| §6 four overlay modes, no more | §15.2c covers exactly `none`/`letter`/`number`/`solfege` | ✓ |
| §6 "`solfege` = **diatonic only**" | A2 movable do: all seven degrees speak; a pitch outside the scale returns `''` (D-17) | ✓ **consistent** |
| §9's token list | §15 does **not** edit §9; A5 routes through `QUALITY_TOKEN` instead | ✓ |
| §10 "invent no interface not in this file" | no named comping patterns, no chord-formula table | ✓ |

*(One boundary note, deliberately not inflated into a finding: §6 says "Labels come from
`theory/scale.js`", while `numeralParts` and `chordLabelParts` live in `theory/chord.js`.
§6's sentence governs the four **overlay** modes on pitch surfaces, which chord labels are
not, so I do not read this as a contradiction.)*

**Q11 verdict: THREE CONTRADICTIONS — M-2 (§4's purpose), M-1 (§6's enumeration), M-16 (§15
against itself on §4's fields) — plus one §4 ambiguity resolved by choice (M-9).** None sits
in the color rule or the numeral-case rule. **None is a STOP.**

---

## Q12 — What is unserved?

**No clause of the outline's Scales and chords section is FULLY unserved.** Every one of the
fourteen traces to at least one line of §15. That is a real result and `spec-scale` earned
it — the section is unusually complete for a first pass.

**What is unserved is narrower and it is four things.**

### 1. "Hear … different ways to vary the scale" — served as pitches, not as variation

§15 gives every midi number a comparison feature would need (`circlePositions().midi`,
`voicing`, `noteBank`), and §15.3 lets a student click one position at a time. **But nothing
in §15 or in any stage brief plays the scale as a scale, or lets a student hear the shape
before and after a `+/-` press.** The clause's verb is "hear … ways to **vary**", and hearing
a variation *as* a variation is a comparison, not a note.

**This is not a defect in §15** — §15 is an API contract and it supplies the raw material.
**It is a surface requirement that no seat currently owns.** `scale-circle` (P3/S5) is the
natural home and its brief does not mention it. → **M-6**

### 2. The letter-label path — cited by §15, specified nowhere

`letterHead`, `spellingOfPc` and `chordName` are called or listed and **never defined**
(Q10). The clause they serve — "Inversions/comping … rearranging and spacing" — is traced,
and the curriculum's own `C/E · Dm/F · Bb/F` is buildable (I verified it in F major), **but
the function that would print those strings does not exist in the contract**, and
`SUFFIX['minor'] = ''` would print `D/F` for `Dm/F`. → **M-15**

### 3. Names below and above the curriculum's range

- **`count` 1 and 2** are in `skipStack`'s domain and a single note reads as a "basic chord",
  which the outline says *is 3 notes*. Nothing names them. → **M-7**
- **`count` 6 and 7** are named by Brandon's ruling (`EXT = ''`), so they are *served* — but
  the ruling makes them label identically to a triad. → **M-11**
- **Accidentals on numerals** have no mechanism at all — `numeralParts()` has no prefix slot.
  → **M-13**

### 4. Context clauses that need nothing built

- **"they are in performing groups (choir does solfege)"** — context, not a requirement on
  the app. **A2's movable do is the system choirs actually use**, so it is served by
  implication. The struck fixed-do rule would have left it unserved. **Nothing to build.**
- **"they are not required to memorize scales with me"** — served by two written prohibitions
  (§15.4, §15.8), not by a feature.

### One watch item, deliberately NOT raised as a decision

The outline writes "**Inversions/comping chords by rearranging and spacing them out**", and
§15.9 implements comping as `spread()` — spacing only. In ordinary musician usage "comping"
also means *rhythmic* accompaniment, which nothing in P3 provides. **Brandon's own
parenthetical defines the word as rearranging and spacing, so §15 followed his definition and
is correct to have done so.** I am recording this only so that if he later means the rhythmic
sense, it is on the record that P3 does not serve it. **No decision is needed now and I am
not asking for one.**

**Q12 verdict: nothing fully unserved; four narrow gaps, all listed above and all carried in
the mismatch list below.**

---

# MISMATCHES FOR BRANDON

**Sixteen items. Each is one sentence and two plausible options. I have not chosen between
them and I have not changed anything.** Ordered by what they block.

**§10-H governs every one of these: "a BUILD seat that finds itself picking a scale, a
syllable, a spelling, or a chord name has left its lane and must escalate."**

## Blocks a build seat on day one

**M-15 · The letter-label path is called but never specified, and its minor chords will come
out wrong.** `letterHead`, `spellingOfPc` and `chordName` appear only at call sites, and
`SUFFIX['minor'] = ''` — correct for numerals, where case carries minor — would render your
own `Dm/F` as **`D/F`**, because letters have no case.
· **(a)** Give the letter system its own suffix table (`''`, `'m'`, `'+'`, `'°'`, `?`) and
specify the three missing functions in §15.8.
· **(b)** Ship numerals only for now and defer the letter system to P4, since the note bank's
primary label is the numeral.

**M-2 · `resetScaleDegree` is a silent no-op wherever an altered scale back-matches a preset
name, and `altered` reloads as all-`false`.** A8 made `name` chase `degrees`, and §15.5's
`originDegrees` reads `name`, so the origin chases the array it should be measured against —
Dorian→Mixolydian and Phrygian→Aeolian both leave the student unable to get back, which
contradicts §4's "and get back."
· **(a)** Store the origin separately from the display name — keep `preset` (which §4 already
pins to `'Custom'`) or a new `originName` — so reset and back-matching stop sharing a field.
· **(b)** Have `resetScaleDegree` always measure against `MAJOR`, accepting that reset means
"back to major", not "back to the preset you started from".

**M-16 · §15.2 says `altered` and `preset` are "never read by any function in this section",
which is false three times over and would cost the `+/-` its state if a seat obeyed it.**
`circlePositions()` reads `altered`, `originDegrees` reads `name`, §15.5 writes `altered` —
and §4 only ever said "never read by **the audio path**."
· **(a)** Narrow §15.2's sentence to §4's actual wording (audio path only).
· **(b)** Leave it and add an explicit carve-out naming `circlePositions` and `originDegrees`.

## Contradicts a frozen section — only you can close these

**M-1 · §15 emits `'1/8'` and `'F♯/G♭'`, which frozen §6 does not allow** — §6 enumerates
`number` as "digits 1 through 8" and `letter` as "A-G with accidentals", and §15 claimed to
revise nothing while doing exactly this on your own later rulings.
· **(a)** Amend §6 to allow composite labels, making your 1/8 and show-both rulings the
governing text.
· **(b)** Keep §6 literal and scope the composites to the circle surface only, leaving
`label()` returning single digits and single letters everywhere else.

**M-9 · §4 supports both "picking a key resets to major" and "picking a key transposes", and
§15 shipped transpose by default.** §4 says both "the degrees are then generated from the
major-scale pattern" and "the array itself does not move … starting points, not a cage."
· **(a)** Transpose — the key picker is a transpose knob and a student's shape survives it.
· **(b)** Reset — the key picker is a fresh start, matching D-1's wording literally.

**M-14 · The "§9 has four colour tokens but §15 has five qualities" gap may not exist, and
you are being asked to edit a frozen section on the strength of it.** §4 writes
"diminished/augmented → flagged distinctly" as **one clause**, under which §9's four tokens
map exactly onto `{major, minor, dim+aug, altered}`.
· **(a)** Leave §9 alone — augmented and diminished share a colour, as §4's one clause reads.
· **(b)** Add `--deg-aug` to §9 so all five qualities are visually distinct.

**RULED — Brandon, 2026-08-24: (b).** `--deg-aug` added to CONTRACTS §9;
`QUALITY_TOKEN.augmented` in `scale.js` repointed. See CONTRACTS §9 and the amended OD-6/A5
block.

## Curriculum-facing, decide before the surfaces are drawn

**M-13 · No numeral can carry an accidental** — `numeralParts()` has no prefix slot, so C with
a lowered third reads `III⁺` where a classroom writes `♭III⁺`, and your students see the
classroom form in performing groups.
· **(a)** Leave it — `degrees` *is* the scale, the third degree is the third degree, and a
flat would reintroduce the major-key reference §15 spent two sections forbidding.
· **(b)** Add a prefix slot computed from `solfegeDeviation` (which already exists), so the
numeral marks deviation the same way the syllable does.

**M-11 · `EXT[6] = EXT[7] = ''` makes 3-, 6- and 7-note chords label identically** — the
sequence reads `V · V7 · V9 · V · V`, so the most extended chords end up the least labelled.
· **(a)** Leave it — "no names needed past 9" was the ruling and the note bank still shows
the extra tones.
· **(b)** Give 6 and 7 a mark that is not a name (a dot, a tone count) so the label still
distinguishes what is sounding.

**M-4 · `III/M6` was read as "the interval from the chord root to the bass", which requires
interval vocabulary the Scales and chords section never teaches.** It is also the only reading
under which your example is well-formed, but it makes the numeral slash harder to read than
the letter slash.
· **(a)** Keep the interval reading and confirm `M6` means above the chord root.
· **(b)** Put the scale degree of the bass after the slash instead (`III/6`), which reuses the
digits students already have on the circle.

**M-10 · The same concept renders two ways** — the circle draws `'1/8'` while the diatonic
keys draw `'1'` and `'8'`, because `slotNumberLabel()` (A4) and `label()`'s number branch
(§15.2c) were never reconciled.
· **(a)** One producer everywhere — every surface shows `1/8` on the tonic.
· **(b)** Keep both deliberately: `1/8` teaches the circle's wrap, plain digits suit a
keyboard where the octave is a separate key.

**RULED — Brandon, 2026-08-24: (b), stay plain off the circle.** Undo path documented in
CONTRACTS §15.2c next to `label()`'s number branch.

**M-8 · "use upper overtone chord nomenclature for everything else" was read as covering the
chord qualities, but the words read more naturally as covering the extensions** — you later
said "I never mentioned augmented or diminished", which suggests the second reading.
· **(a)** Confirm §15's reading; both halves are now ruled anyway and nothing is at risk.
· **(b)** Confirm the extension reading, so "everything else" means the 7/9 labels and the
quality markers stand purely on your later ruling.

**M-5 · `parseNumeral(str)` parses a typed roman numeral, while the outline has the student
*pick* one** — a text field would reintroduce exactly the recall the curriculum avoids.
· **(a)** Specify that the chord builder is a picker and `parseNumeral` exists only for saved
files and links.
· **(b)** Allow typing as a power-user path, with the picker as the default.

**M-7 · One- and two-note stacks are in `skipStack`'s domain and a single note reads as a
"basic chord"**, which your outline says *is 3 notes*.
· **(a)** Floor `count` at 3 so the domain matches the curriculum.
· **(b)** Allow 1 and 2 and give them a name, since hearing a root and a fifth alone is a
real teaching move.

## Engineering, needs a decision but not yours unless you want it

**M-12 · §15.9's "offsets already ascend by construction" is false in two `+/-` presses, and
`invert()` then rotates `v[0]` instead of the actual bass.** From `[0,4,4,3,7,9,11]`,
`skipStack(root=1)` returns `[4, 3, 9]`; the colour rule correctly says `'altered'`, but the
voicing is not low→high and the slash label reads a bass that never moved.
· **(a)** Have `invert` rotate the **lowest** tone (`bassOf`), not `v[0]`.
· **(b)** Refuse to invert an `'altered'` stack, since it is not a chord to invert.

**M-3 · `noteBank()` takes both `inversion` and `offsets` and never says which applies
first**, and the two orders give different voicings.
· **(a)** `invert` then `spread` — rearrange, then space, matching the outline's word order.
· **(b)** `spread` then `invert` — space the chord, then choose its bass.

**M-6 · Nothing plays the scale as a scale, so "see and **hear** … ways to vary the scale" is
served as individual pitches only**, and no seat's brief owns the comparison.
· **(a)** Give `scale-circle` (P3/S5) an ascend/descend play button — §15 already returns
every midi number it needs.
· **(b)** Leave it to P4 and accept that in P3 a student hears the variation one note at a
time.

---

# VERDICT

## ✅ **PASS. S3 MAY START.** `scale-engine` (P3/S4's `chord-engine` too) is unblocked.

**Both STOP conditions are cleared:**

- **The color rule (Q9)** — computed from `degrees` alone, `tonic` not an input, re-derived by
  hand on **five scales** (C major, Phrygian, Locrian, harmonic minor, melodic minor), **five
  exact matches to the published triad series, nothing looked up, no spurious `'altered'`.**
  **NO ERROR.**
- **The numeral-case rule (Q8)** — case is `degreeQuality`'s output, the color rule read
  twice; **no per-key table exists anywhere in §15** (verified by grep); the
  case-carried-by-the-third derivation is the *minimal* generalization of your two rows and
  reproduces standard practice without consulting it. **NO ERROR.**

**Nothing in the sixteen mismatches sits in either rule.** The two that most deserve a fast
answer are **M-15** (the letter-label path, which S4 hits on day one) and **M-2** (the reset
no-op, which S3 hits when it builds `resetScaleDegree`) — **but neither prevents either seat
from starting**, because both engines' core computations are fully specified and verified.

**What S3 and S4 must be handed with this report:**

| Seat | Must know before it writes |
|---|---|
| `scale-engine` (P3/S3) | **M-2** (do not build `resetScaleDegree` until the origin question is answered) · **M-16** (`circlePositions` *does* read `scale.altered` — keep the field) |
| `chord-engine` (P3/S4) | **M-15** (three undefined functions in its lane) · **M-12** (`invert` rotates the wrong tone) · **M-3** (application order) |
| `scale-circle` (P3/S5) | **M-1**, **M-10** (which number label to draw) · **M-6** (nobody owns hearing the scale) |

---

*End of `redpen-theory`'s report. **CONTRACTS.md was not edited. §15 was not corrected. No
`/src` file was written. Nothing was fixed — everything above is escalated to Brandon.***
*Report closed 2026-08-24 16:24 EDT.*

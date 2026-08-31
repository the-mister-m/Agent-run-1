# RECEIPT — `redpen-theory` (P3/S2)

Seat: `redpen-theory`, REDPEN. Opened **2026-08-24 15:50 EDT**.
Last update: **2026-08-24 16:12 EDT** — after **seat question 12 of 12. SEAT CLOSED.**
Lane: [theory-report.md](theory-report.md), one file. **CONTRACTS.md not touched. No `/src`
file touched. Nothing fixed — all sixteen findings escalated, none corrected.**

## ⛔ BOTH STOP CONDITIONS — **CLEARED** · ✅ **PASS — S3 MAY START**

**The colour rule contains NO ERROR. The numeral-case rule contains NO ERROR.**
`scale-engine` (P3/S3) and `chord-engine` (P3/S4) are unblocked.

## DELIVERABLE STATE

**All twelve seat questions answered. Clause trace complete — all 14 clauses of the
outline's *Scales and chords* section traced to a line of §15 or marked partial.**

| Seat question | State | Found |
|---|---|---|
| 1 · Circle, digits, 1/8 for Do, position 8 → 1 | **DONE — SERVED** | M-1, M-10 |
| 2 · No memorization required | **DONE — SERVED in the engine** | M-4, M-5, M-11 |
| 3 · See and hear variation without memorizing | **DONE — SERVED, then DEGRADED** | **M-2** |
| 4 · Skip method | **DONE — SERVED EXACTLY** | M-12 |
| 5 · Three notes basic / upper overtone | **DONE — SERVED** | M-7 |
| 6 · 7ths shown, not learned | **DONE — SERVED, NO DRIFT** | M-11 |
| 7 · Numbers refer to scale info — **hand-worked** | **DONE — SERVED AND PROVEN** | none |
| 8 · Numeral case — **STOP condition** | **DONE — ⛔ CLEARED** | M-13 |
| 9 · Colour rule — **STOP condition**, hand-worked | **DONE — ⛔ CLEARED** | M-14 |
| 10 · Inversions and comping | **DONE — SERVED** | **M-15**, M-3 |
| 11 · §15 vs §4 / §6 | **DONE — 3 contradictions + 1 ambiguity** | **M-16**, M-1, M-2, M-9 |
| 12 · What is unserved | **DONE — nothing fully unserved; 4 narrow gaps** | M-6 |

### The two STOP conditions, and how they were cleared

- **Colour rule (Q9).** Computed from `scale.degrees` alone — `scale.tonic` never appears.
  Re-derived by hand on **five scales**: C major, Phrygian, Locrian, harmonic minor, melodic
  minor. **Five exact matches to the published triad series, nothing looked up, and no
  spurious `'altered'` on any legitimate scale.** §15.4 asked this seat to re-derive *one*
  row of its C-major table; **I re-derived all seven.** **NO ERROR.**
- **Numeral case (Q8).** `numeralOf` takes `degreeQuality`'s output — the colour rule read
  twice — so numeral and colour cannot disagree. **No per-key table exists anywhere in §15**
  (verified by grep, not assumed). The case-carried-by-the-third derivation is the *minimal*
  generalisation of Brandon's two rows, and it reproduces standard practice without
  consulting it. **NO ERROR.**

### Two hand-worked examples this seat produced itself

- **Q7 — A harmonic minor, chord on degree 5.** `rootScaleNote` gives E's scale as
  **E F G♯ A B C D**; `skipStack` gives the chord **E G♯ B D**; the 4th tone and the 7th note
  are the same **D**, and `17 = 10 + degrees[4]`. Then `setScaleDegree(3, +1)` moved one array
  entry and the chord became **Emaj7** — **the seventh followed, no code changed.**
- **Q9 — C major and A harmonic minor, all seven degrees each.** C major → **I ii iii IV V vi
  vii°**. A harmonic minor → **i · ii° · III⁺ · iv · V · VI · vii°**, matching the published
  series exactly from two subtractions per degree.

## NEXT ACTION

**This seat is done and stops here.** Handoff: `theory-report.md` → the Troubleshooter and
Brandon. **Sixteen mismatches, each one sentence with two options, none decided by me.**

**Brandon decides all sixteen.** The two worth answering first are **M-15** (S4 hits it on
day one) and **M-2** (S3 hits it when it builds `resetScaleDegree`) — **neither blocks a
start**, because both engines' core computations are fully specified and verified.

**Hand these to the build seats with the report:**

| Seat | Must know before it writes |
|---|---|
| `scale-engine` (S3) | **M-2** — do not build `resetScaleDegree` until the origin question is answered · **M-16** — `circlePositions` **does** read `scale.altered`; keep the field |
| `chord-engine` (S4) | **M-15** — three undefined functions in its lane · **M-12** — `invert` rotates the wrong tone · **M-3** — application order |
| `scale-circle` (S5) | **M-1**, **M-10** — which number label to draw · **M-6** — nobody owns hearing the scale |

**Confirmed for `spec-scale`, who asked this seat to check it:** no live fixed-do text
survives in §15 — every remaining `FIXED_DO` mention sits inside a struck or superseded
block — and **D-17 was not damaged** by the D-16 reversal.

## OPEN DECISIONS

**None of mine. This seat decided nothing.** All sixteen are Brandon's, with two options each,
in the report's MISMATCHES section.

| | Item | Blocks |
|---|---|---|
| **M-15** | Letter-label path called but never specified; `SUFFIX['minor']=''` renders `Dm/F` as `D/F` | S4 day one |
| **M-2** | `resetScaleDegree` silent no-op; `altered` reloads all-`false`. **Contradicts §4** | S3 |
| **M-16** | §15.2's "never read by any function" false ×3; would cost the `+/-` its state. **Contradicts §4** | S3 |
| **M-1** | `'1/8'` / `'F♯/G♭'` not allowed by frozen §6. **Contradiction — only Brandon may amend §6** | S5 |
| **M-9** | §4 supports both *reset* and *transpose*; §15 shipped transpose by default | product |
| **M-14** | The "§9 four tokens vs five qualities" gap may not exist; bears on editing frozen §9 | §9 edit |
| **M-13** | No numeral can carry an accidental — `III⁺` vs a classroom's `♭III⁺` | S4/S5 |
| **M-11** | `EXT[6]=EXT[7]=''` — `count` 3, 6, 7 label identically (`V·V7·V9·V·V`) | S4 |
| **M-4** | `III/M6` read as interval-above-root; needs vocabulary the curriculum never teaches | S4 |
| **M-10** | Circle draws `'1/8'`, diatonic keys draw `'1'`/`'8'` — two unreconciled producers | S5 |
| **M-8** | "upper overtone nomenclature for everything else" — qualities or extensions? | none |
| **M-5** | `parseNumeral(str)` parses typed input; the outline says the student *picks* | S6 |
| **M-7** | `count` 1 and 2 in domain; a single note reads as a "basic chord" | S6 |
| **M-12** | "offsets already ascend by construction" false in two presses; `invert` wrong tone | S4 |
| **M-3** | `noteBank()` never says whether `inversion` or `offsets` applies first | S4 |
| **M-6** | Nothing plays the scale *as a scale*; no seat owns the comparison | S5 |

**One watch item raised as prose, deliberately NOT as a decision:** "comping" ordinarily means
*rhythmic* accompaniment, and §15 implements it as spacing only — **which is correct, because
Brandon's own parenthetical defines the word that way.** Recorded only so it is on the record
if he later means the rhythmic sense. **No decision requested.**

## FILE LOCATIONS

**Written by this seat — these two files and nothing else:**
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P3-harmony-tool/S2-theory-check/theory-report.md` — **the deliverable**, 1163 lines
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P3-harmony-tool/S2-theory-check/receipt-redpen-theory.md` — this file

**Proof nothing else was touched — mtimes, against this seat's 15:50 open:**

| File | mtime | |
|---|---|---|
| `Builddocs/CONTRACTS.md` | **15:43:53** | **before this seat opened — not written** |
| `Builddocs/P0-run-open/open-decisions.md` | **15:44:10** | **before — not written** |
| `Builddocs/P3-harmony-tool/S1-spec/receipt-spec-scale.md` | **15:48:52** | **before — not written** |
| `…/S2-theory-check/theory-report.md` | 16:12:19 | this seat |
| `…/S2-theory-check/receipt-redpen-theory.md` | 16:10:39+ | this seat |

**Read, not written:**
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/outline` — the *Scales and chords* section, clause by clause
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/CONTRACTS.md` — §4, §6, §9, §10-H, and **§15 in full, lines 1800–3366**, including the `[AMENDED 2026-08-24]` block A1–A11
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P3-harmony-tool/S1-spec/receipt-spec-scale.md` — including its rebuilt worked example
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P3-harmony-tool/S2-theory-check/A-redpen-theory.md`, `STAGE.md`
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P0-run-open/open-decisions.md` — D-16 SUPERSEDED / D-17 intact, verification only

**No `/src` file written. No other phase touched. §15 not corrected. Twelve receipt writes,
one per seat question, as the brief required.**

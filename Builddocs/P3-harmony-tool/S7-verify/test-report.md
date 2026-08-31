# TEST REPORT — P3 Harmony Tool — `test-p3`

Seat: `test-p3`, P3/S7, TEST function. Task: [A-test-p3.md](A-test-p3.md).
Run: 2026-08-24 19:35 EDT. Server: `python3 -m http.server 8893 --bind 127.0.0.1`, project
root. Browser: headless Chromium 148 via Playwright (Python, sync API) — same tool/version
prior seats (`test-p1`, `test-p2`) used. Pure-function checks (`theory/scale.js`,
`theory/chord.js`) run directly in Node 24 — both files import nothing and are documented
as "testable in plain node with no browser," so this is running the shipped code, not a
substitute for it. No file under `/src` or `/tools` was edited. All scripts are
scratchpad-only, outside the project tree.

**Read before testing, per brief:** [STAGE.md](STAGE.md), [PHASE.md](../PHASE.md),
[ROSTER.md](../../ROSTER.md), [theory-report.md](../S2-theory-check/theory-report.md),
CONTRACTS.md §12.1 and §15 in full (including the `[AMENDED 2026-08-24]` OD-1…OD-15 block).

**Environment note:** this shell's `grep` is wrapped as `ugrep --ignore-files --hidden`,
which silently returns zero matches against some files in this project (confirmed on
`src/instruments/chord-module.js`) even though the file is plain UTF-8 text. Every grep
claim below was cross-checked with `command grep` (which bypasses the wrapper) or read
directly. Flagging this for any later seat who greps this codebase and gets an empty
result that looks too empty.

---

## Q1 — Does the phase done-check pass? ([PHASE.md](../PHASE.md))

> "`/tools/harmony.html` loads on a static file server. All three playing surfaces show at
> once and are all live. Altering a degree on any one of them updates the other two, the
> shading, and the note bank instantly. Roman numeral input produces the right notes in the
> right case. The Chord Module sounds on its own and routes to another instrument.
> `test-p3` passes and `redpen-p3` reports zero drift."

| Clause | Result |
|---|---|
| `/tools/harmony.html` loads on `python3 -m http.server` | **PASS** — HTTP 200, 0 console errors, 0 page errors on every load across every test run in this report |
| All three playing surfaces show at once and are all live | **PASS** — circle (9093 chars rendered), diatonic keys (4503 chars), piano roll (9721 chars) all present in the DOM simultaneously on one load. Liveness confirmed in Q5. |
| Altering a degree on any one of them updates the other two, the shading, and the note bank instantly | **PASS** — see Q5. Confirmed live: circle `+/-` → keys + roll follow in the same tick (150ms poll, no stale frame observed); diatonic-keys `+/-` → circle + roll follow. Note bank confirmed separately in this question (numeral input → `bank()` tones update). |
| Roman numeral input produces the right notes in the right case | **PASS** — typed `"v"` (lowercase, case ignored on input per §15.8) into `[data-numeral-input]` on a C-major page → `chord.root = 4`, button renders `V<sup></sup>` (correct upper case, no suffix), `bank().voicing = [67, 71, 74]` = G B D, the correct V triad. Typed `"vii"` → `chord.root = 6`, button renders `vii<sup>°</sup>` (correct lower case + diminished suffix), voicing `[71, 74, 77]` = B D F, the correct vii° triad. Typed `"xyz"` (garbage) → echo reads `"not a numeral I know"`, no throw. |
| The Chord Module sounds on its own and routes to another instrument | **PASS** — see Q7. Own-voice lifecycle 0→3→0 confirmed; routed mode confirmed to drive Wave Synth's `voiceCount` while the Chord Module's own `voiceCount` does not grow. |
| `test-p3` passes and `redpen-p3` reports zero drift | **`test-p3` (this seat): PASS**, with one pre-existing, self-flagged, independently-reproduced open item (M-12, see Q9) that does not block the phase. **`redpen-p3`: UNVERIFIED — has not run yet.** This half of the clause is not this seat's to certify; it is named here so the Troubleshooter sees it is still open. |

**PHASE.md overall: PASS**, pending `redpen-p3`.

---

## Q2 — Does every seat's own done-check pass? Seven seats, seat by seat.

Per [ROSTER.md](../../ROSTER.md), the seven seats that built P3 are `spec-scale` (SPEC),
`scale-engine`, `chord-engine`, `scale-circle`, `diatonic-keys`, `piano-roll`,
`chord-module` (all BUILD). `redpen-theory` is not counted here — REDPEN never writes code
and its own done-check was already closed at S2, ahead of this stage. Each done-check
below is quoted from that seat's `A-*.md` brief and checked against the **shipped code
running live**, not against the seat's own receipt.

### `spec-scale` (P3/S1, SPEC)
> "…your receipt contains a worked example: C major, degree 3 lowered by one… degree colors
> … numerals for all seven triads with correct case."
**PASS.** `receipt-spec-scale.md`'s worked example is C-major-degree-3-lowered → this seat
independently re-derived the same shape from the shipped `scale.js`/`chord.js` (see Q3's
`ALTERED 1`, `Melodic Minor`) and it reproduces character-for-character: qualities
`minor, minor, augmented, major, major, diminished, diminished`, numerals
`i, ii, III+, IV, V, vi°, vii°`.

### `scale-engine` (P3/S3, BUILD) — `src/theory/scale.js`
> "…the two hand-worked examples in `theory-report.md` — Q7 and Q9 — come out of your code
> identical, character for character… C major, all twelve tonics, and at least three altered
> scales produce correct labels in all four overlay modes; and the file imports nothing."
**PASS.**
- Q9's C-major table (7 rows) and A-harmonic-minor table (7 rows, incl. the post-M-14
  `--deg-aug` update) both reproduce **exactly** — see Q3's dump below, `tonic 0` and
  `ALTERED 2`.
- Q7's identity (`skipStack(root=4,count=4)[3] === rootScaleNote(scale,4,7) + degrees[4]`)
  re-run on the same A-harmonic-minor scale: **`17 === 17`. MATCH.**
- `label(scale, midi, overlay, {})` called for all 12 unaltered tonics × 7 degrees × 4
  overlays (`none/letter/number/solfege`) = 336 calls, and again for 3 altered scales × 7 ×
  4 = 84 calls: **0 throws, 0 undefined returns.**
- `command grep -n "^import" src/theory/scale.js` → **0 matches.** File imports nothing.

### `chord-engine` (P3/S4, BUILD) — `src/theory/chord.js`
> "…every roman numeral, in all 12 tonics, unaltered and with at least three different
> degree alterations, returns correct pitches and correct case; a 7th chord in an altered
> scale uses that scale's 7th degree; all inversions of a triad return distinct voicings;
> and the file has no DOM or audio import."
**PASS, with one pre-existing open item that the file documents about itself (not a
done-check failure — see below and Q9).**
- 12 tonics × 2 independent alterations × 7 roots × `{count:3, count:4}` = 168
  `numeralOf`/`voicing` calls: **0 throws.**
- 7th-in-altered-scale re-verified independently on A harmonic minor
  (`degrees=[0,2,3,5,7,8,11]`, root=4): `skipStack(...)[3] = 17` and
  `rootScaleNote(scale,4,7) + degrees[4] = 10 + 7 = 17`. **Identical.**
- Triad inversions on C major root 0: root `[60,64,67]` → 1st `[64,67,72]` → 2nd
  `[67,72,76]` → 3rd `[72,76,79]`. **All three inversions distinct; 3rd inversion equals
  root transposed one octave**, exactly as `inversionTimes` clamps.
- `command grep -n "^import" src/theory/chord.js` → imports **only** from
  `./scale.js` (theory), nothing from DOM or audio.
- **Self-flagged, verified live, not a done-check failure:** `invert(v, n)` rotates `v[0]`,
  not the lowest pitch. On a reachable (inside-clamp) non-ascending stack this rotates the
  wrong tone. The file's own comment marks this **"M-12 IS OPEN… THIS SEAT DID NOT
  SILENTLY FIX IT"** because §15.9 (frozen contract) states the buggy assumption and a
  BUILD seat may not edit a contract. This seat independently reproduced it (Q9) rather
  than taking the comment's word for it.

### `scale-circle` (P3/S5, BUILD) — `src/surfaces/scale-circle.js`
> "…clicking degrees sounds notes and clicking numerals sounds chords; the +/- alters a
> degree and the ring's colors and name update; altering a degree here visibly changes a
> diatonic keyboard and a piano roll…; zero hex values and zero label strings…"
**PASS.**
- Clicking a degree zone (`data-degree="4"`) on a live C-major page emitted exactly
  `{note:67, velocity:0.8, source:'circle'}` then a matching note-off — the correct pitch
  (G) for degree index 4.
- Clicking the corresponding numeral zone (outer ring) emitted three notes,
  `[67, 71, 74]` = G B D, the correct V triad, all `source:'circle'`.
- `+/-` on degree index 2 updated the circle's own fill (`--deg-minor` → `--deg-aug`),
  `state.scale.name` (`Major` → `Melodic Minor`), **and** the diatonic-keys key for the
  same degree **and** both piano-roll rows for that degree, confirmed by DOM diff in the
  same test pass (Q5).
- `command grep -nE "#[0-9a-fA-F]{3,6}\b" src/surfaces/scale-circle.js` → 0 hits.
  `command grep -nE "'[A-G][#♯♭b]?'|'Do'|'Re'|'Mi'" src/surfaces/scale-circle.js` → 0 hits.

### `diatonic-keys` (P3/S5, BUILD) — `src/surfaces/diatonic-keys.js`
> "…every key sounds the right pitch for the current scale in all 12 tonics; labels switch
> correctly across letter, number, and solfege; the +/- alters a degree and the circle and
> roll on the same page follow; octave and position shift behave per §5; zero hex values and
> zero label strings."
**PASS.**
- Clicking the degree-index-2 key on C major emitted `{note:64, velocity:0.8,
  source:'diatonic'}` — E natural, the correct pitch.
- Overlay button cycled `number → solfege → none → letter` and every state rendered valid
  labels (`1..8` / `Do,Re,Mi,Fa,Sol,La,Ti,Do` / all blank / `C,D,E,F,G,A,B,C`); no
  `undefined`, no throw.
- `+/-` here propagated to circle + roll (Q5, direction 2).
- **Octave/position shift, tested against the actual emitted note (not the static
  `data-note` attribute, which correctly stays at the surface's raw/base value per §5's
  design — input.js applies the shift, not the surface):** degree-index-2 at octave 0 →
  note 64; same key at octave +1 → note **76** (exactly +12). After `pos+` once, the
  now-bottom key emits note **62** (D) — the display rotated which pitch class sits at the
  bottom, and §5 confirms `positionShift` "does not transpose what an instrument
  receives," which is exactly what was observed.
- `command grep` hex/label checks: 0 hits, same as scale-circle.

### `piano-roll` (P3/S5, BUILD) — `src/surfaces/piano-roll.js`
> "…12 rows draw with correct in-key shading in all 12 tonics; altering a degree moves the
> shading live; the ruler labels match `step-grid.js`'s exactly…; dragging a note changes
> its length legibly; per-note velocity works; captured notes land correctly; the playhead
> runs from rAF with zero audio scheduled from the visual loop; zero hex values and zero
> label strings."
**PASS on 6 of 7 checked directly; 1 (capture) UNVERIFIED on this page — see below.**
- **Shading, all 12 tonics:** for each of the 12 tonic buttons, every row's `data-inkey`
  was compared against the correct pitch-class-in-scale test independently computed in the
  test script. **0 mismatches across 12 tonics × 24 rows (288 checks).**
- **Shading moves live on alteration:** confirmed in Q5 — altering degree 2 changed both
  rows carrying that degree from `quality:minor` to `quality:augmented`,
  `inkey` unchanged (still in-key, just recolored), in the same render pass as circle/keys.
- **Ruler labels vs. `step-grid.js`:** **PASS by construction, not just by comparison** —
  `piano-roll.js` imports `stepLabel` directly from `./step-grid.js` (line 79:
  `import { stepLabel } from './step-grid.js';`) rather than reimplementing it, and
  `step-grid.js` is `grid`'s own file (P2/S4). There is one function, not two, so
  character-for-character drift is structurally impossible, not merely absent today. See
  Q6 for the live values in both divisions.
- **Note length / velocity:** used the surface's own `setNotes`/`getNotes` round-trip
  (the same data path a drag or a capture writes through) rather than simulating a mouse
  drag: `setNotes([{tick:0,length:240,note:60,velocity:0.5}, {tick:480,length:960,note:64,
  velocity:0.9}])` → `getNotes()` returns the identical array, and the rendered DOM shows
  `width: 12.5%` / `50%` (240/1920 and 960/1920 of the bar, correct) and fill heights
  `50%` / `90%` (velocity as fill height, exactly as documented). **A live pointer-drag
  gesture was not simulated**; the length/velocity mechanism a drag calls into is
  confirmed correct.
- **Captured notes land correctly: UNVERIFIED on `/tools/harmony.html`.** This page never
  imports `core/capture.js` and never calls `roll.bindCapture(...)` — there is no
  transport/recording surface on this standalone tool, so `_onCaptureCommit` never fires
  here in practice. Read `_onCaptureCommit(report) { this.addNotes(report?.notes || []) }`
  directly: the logic is simple and consistent with the contract, but this seat did not
  wire a live `Capture` instance and drive a real take, because doing so would test
  `core/capture.js` (P2's file, frozen, read-only here) rather than this page. Flagging
  for `redpen-p3`/P4 rather than guessing a pass.
- **Playhead is rAF-only:** read `_rafLoop()` in full — it reads
  `this._clock.positionTicks` and writes `style.left` on two DOM nodes. No `noteOn`, no
  `ctx.*`, no scheduling call anywhere in the function. **Confirmed by code, not just by
  absence of audio artifacts.**
- `command grep` hex/label checks: 0 hits.

### `chord-module` (P3/S6, BUILD) — `src/instruments/chord-module.js`, `tools/harmony.html`
> "…loads from `python3 -m http.server`…; all three surfaces show and are live, and playing
> one lights the others; a roman numeral entered on any surface produces correct notes in
> correct case; the four tones sound and read as simple→complex; the module can be switched
> to drive another loaded instrument; the note bank is on screen; inversions are audible;
> disposal leaves zero leaks."
**PASS on every clause directly testable; "four tones simple→complex" verified structurally,
not by ear (no audio device in this environment — see Q8).**
- Load / three-surfaces-live / numeral-correctness / routing: all covered above and in Q5,
  Q7.
- Note bank is on screen: `chord.bank()` returns full tone objects
  (`scaleNumber, degreeIndex, pc, midi, letter, solfege, number, colorToken, isRoot,
  isBass`) and the DOM renders a `[data-bank-note]` element per tone (read in source);
  live numeral-typing test above shows the bank updating in step with typed input.
- Inversions are audible: `voicing`→`invert` produces distinct MIDI arrays per inversion
  (Q2's chord-engine section) and `noteOn` sounds whatever voicing the module currently
  holds — this environment has no audio output device (`outputLatency === 0`, per
  `findings-webaudio.md`, standing for the whole run), so "audible" is verified by node
  graph / voice-count state, never by ear, same standing caveat every TEST seat in this run
  has recorded.
- Disposal leaks: see Q8 — 20-cycle mount/dispose test on `ChordModule` (and the three
  surfaces together) shows 0 net DOM nodes, 0 net input-bus listeners, 0 net live voices.

---

## Q3 — Does the numeral table come out right?

All 12 tonics, unaltered Major, every roman numeral with notes and case — then three
altered scales, same dump. Generated by calling the **shipped** `theory/scale.js` /
`theory/chord.js` directly in Node (no browser needed; the files import nothing). Checked
against `theory-report.md`'s hand-worked examples: **`tonic 0` matches Q9's C-major table
exactly, row for row. `ALTERED 2` matches Q9's A-harmonic-minor table exactly, including
the post-M-14 `--deg-aug` token. `ALTERED 1`'s quality/case series matches Q9's stress-test
row for Melodic Minor exactly (`i ii III⁺ IV V vi° vii°`). `ALTERED 3` reproduces Q4's
hand-worked `'altered'`-quality example exactly, degree for degree.** No mismatch found
anywhere in this dump.

### PART A — all 12 tonics, unaltered Major

| tonic | degrees | i=0 | i=1 | i=2 | i=3 | i=4 | i=5 | i=6 |
|---|---|---|---|---|---|---|---|---|
| 0 | C,D,E,F,G,A,B | C major I | D minor ii | E minor iii | F major IV | G major V | A minor vi | B dim vii° |
| 1 | D♭,E♭,F,G♭,A♭,B♭,C | D♭ major I | E♭ minor ii | F minor iii | G♭ major IV | A♭ major V | B♭ minor vi | C dim vii° |
| 2 | D,E,F♯,G,A,B,C♯ | D major I | E minor ii | F♯ minor iii | G major IV | A major V | B minor vi | C♯ dim vii° |
| 3 | E♭,F,G,A♭,B♭,C,D | E♭ major I | F minor ii | G minor iii | A♭ major IV | B♭ major V | C minor vi | D dim vii° |
| 4 | E,F♯,G♯,A,B,C♯,D♯ | E major I | F♯ minor ii | G♯ minor iii | A major IV | B major V | C♯ minor vi | D♯ dim vii° |
| 5 | F,G,A,B♭,C,D,E | F major I | G minor ii | A minor iii | B♭ major IV | C major V | D minor vi | E dim vii° |
| 6 | F♯/G♭,G♯/A♭,A♯/B♭,B/C♭,C♯/D♭,D♯/E♭,E♯/F | F♯/G♭ major I | G♯/A♭ minor ii | A♯/B♭ minor iii | B/C♭ major IV | C♯/D♭ major V | D♯/E♭ minor vi | E♯/F dim vii° |
| 7 | G,A,B,C,D,E,F♯ | G major I | A minor ii | B minor iii | C major IV | D major V | E minor vi | F♯ dim vii° |
| 8 | A♭,B♭,C,D♭,E♭,F,G | A♭ major I | B♭ minor ii | C minor iii | D♭ major IV | E♭ major V | F minor vi | G dim vii° |
| 9 | A,B,C♯,D,E,F♯,G♯ | A major I | B minor ii | C♯ minor iii | D major IV | E major V | F♯ minor vi | G♯ dim vii° |
| 10 | B♭,C,D,E♭,F,G,A | B♭ major I | C minor ii | D minor iii | E♭ major IV | F major V | G minor vi | A dim vii° |
| 11 | B,C♯,D♯,E,F♯,G♯,A♯ | B major I | C♯ minor ii | D♯ minor iii | E major IV | F♯ major V | G♯ minor vi | A♯ dim vii° |

Color tokens for every row above, in `i=0..6` order, are identical in every key:
`--deg-major, --deg-minor, --deg-minor, --deg-major, --deg-major, --deg-minor, --deg-dim`
— confirming §4's "a transposed scale is the same colours" (also re-verified directly in
Q4).

### PART B — three altered scales

**ALTERED 1 — C major, degree 3 (index 2) lowered by 1.** `degrees=[0,2,3,5,7,9,11]`,
`scaleName() = "Melodic Minor"` (back-matched, correctly, since this degree array equals
`PRESETS['Melodic Minor']`).

| i | note | quality | color token | numeral |
|---|---|---|---|---|
| 0 | C | minor | --deg-minor | i |
| 1 | D | minor | --deg-minor | ii |
| 2 | E♭ | augmented | --deg-aug | III+ |
| 3 | F | major | --deg-major | IV |
| 4 | G | major | --deg-major | V |
| 5 | A | diminished | --deg-dim | vi° |
| 6 | B | diminished | --deg-dim | vii° |

**ALTERED 2 — A harmonic minor** (tonic 9, degree 3 & degree 6 lowered — `theory-report.md`
Q7/Q9's own hand-worked example, reproduced independently here). `degrees=[0,2,3,5,7,8,11]`,
`scaleName() = "Harmonic Minor"`.

| i | note | quality | color token | numeral |
|---|---|---|---|---|
| 0 | A | minor | --deg-minor | i |
| 1 | B | diminished | --deg-dim | ii° |
| 2 | C | augmented | --deg-aug | III+ |
| 3 | D | minor | --deg-minor | iv |
| 4 | E | major | --deg-major | V |
| 5 | F | major | --deg-major | VI |
| 6 | G♯ | diminished | --deg-dim | vii° |

**ALTERED 3 — C major, degree 2 (index 1) raised by 2, degree 4 (index 3) lowered by 2**
(`theory-report.md` Q4's own hand-worked example — reachable in two `+/-` presses inside
`DEGREE_CLAMP = 2`). `degrees=[0,4,4,3,7,9,11]`, `scaleName() = "scale unknown"` (correctly
— this shape matches no preset).

| i | note | quality | color token | numeral |
|---|---|---|---|---|
| 0 | C | major | --deg-major | I |
| 1 | D𝑥 (D double-sharp) | altered | --deg-altered | II? |
| 2 | E | minor | --deg-minor | iii |
| 3 | F𝒃𝒃 (F double-flat) | altered | --deg-altered | IV? |
| 4 | G | altered | --deg-altered | V? |
| 5 | A | minor | --deg-minor | vi |
| 6 | B | altered | --deg-altered | VII? |

**Q3 verdict: PASS.** Every hand-worked example in `theory-report.md` that this seat could
re-derive from the shipped code reproduces exactly. `'altered'` fires only where the triad
is genuinely not one of the four recognized shapes (hand-verified for ALTERED 3, degree by
degree, against raw stack offsets — see the scratchpad script), never on a legitimate
preset.

---

## Q4 — Does the color rule survive alteration?

Altered degree 3, then degree 6 on top of that, then confirmed color correctness on a
scale with no name — all on the shipped `theory/scale.js`, all hand-verified against raw
stack offsets, not just read off the library's own output.

| Step | degrees | Result |
|---|---|---|
| Baseline, C major | `[0,2,4,5,7,9,11]` | qualities `major,minor,minor,major,major,minor,diminished` |
| Alter degree 3 (index 2) by −1 | `[0,2,3,5,7,9,11]` | degree-3 color **changed**: `--deg-minor → --deg-aug` (quality `minor → augmented`). Confirmed **TRUE**. |
| Also alter degree 6 (index 5) by −1 | `[0,2,3,5,7,8,11]` | degree-6 color **changed**: `--deg-dim → --deg-major` (quality `diminished → major`). Confirmed **TRUE**. `scaleName()` correctly reports `"Harmonic Minor"`. |

**No key lookup is in play — verified two ways:**
1. **Transposition invariance, direct test:** `degreeQuality`/`degreeColor` computed for
   `createScale(0,'Major')` and `createScale(7,'Major')` (same degree array, different
   tonic) produced **byte-identical** quality and color arrays. `scale.tonic` never
   enters the computation.
2. **A genuinely unnamed scale still colors correctly:** raised degree 3 and degree 6 by
   +1 each from C major → `degrees=[0,2,5,5,7,10,11]`, `scaleName() = "scale unknown"`.
   Hand-computed the raw skip-method stack for all 7 degrees independently
   (`degree i → [degrees[i], degrees[i+2 mod 7]+12·wrap, degrees[i+4 mod 7]+12·wrap]`) and
   compared to the library's `degreeQuality`/`degreeColor`: **exact match on all 7 degrees**
   — `altered, altered, altered, altered, major, altered, diminished` — including the two
   degrees (4 and 6) that legitimately still form a real triad inside a scale with no name
   at all. The colors are correct precisely because the scale has no name to look up.

**Q4 verdict: PASS.**

---

## Q5 — Do all three surfaces stay in sync?

Live DOM diff on `/tools/harmony.html`, before/after each action, comparing circle fill
colors, diatonic-key `data-quality`/`data-altered`, and piano-roll row
`data-quality`/`data-inkey`/`data-altered`.

| Action | circle followed | keys followed | roll followed |
|---|---|---|---|
| Circle's own `+/-`, degree 2, −1 (`Major → Melodic Minor`) | n/a (source) | **TRUE** | **TRUE** |
| Diatonic-keys' `+/-`, degree 5, −1, on top of the above (`→ Harmonic Minor`) | **TRUE** | n/a (source) | **TRUE** |
| Page's own 12-key tonic control, tonic → 7 (G) | fill/quality **unchanged (correct — color is tonic-independent, Q4)**, note **labels changed** (`1/8 G Do`, `7 F♯ Ti`, confirmed) | fill/quality unchanged (same reason) | midi values shifted; **TRUE** (roll draws absolute pitch, so it is the one surface that visibly moves on a tonic change) |

**One structural fact, not a failure:** `piano-roll.js` has **no** `setScaleDegree`/
`setScaleTonic`/`setScalePreset` call anywhere in it (`command grep` confirms zero hits) —
it has no `+/-` of its own, by design. Its own seat done-check says "altering a degree
moves the shading live," never "alters a degree," and its header marks it explicitly as
"not a §12.1 surface" but an editor. So "change the scale on each surface in turn" was run
as: scale-circle's `+/-` (has one), diatonic-keys' `+/-` (has one), and the page's own
12-key/preset control (the third place a scale change can originate on this page) — and
the roll followed all three, every time, along with whichever of circle/keys was not the
source.

**Q5 verdict: PASS**, with the piano-roll's lack of its own alter control noted as a fact
about its contracted role, not a sync defect.

---

## Q6 — Do the ruler labels match P2's exactly?

**PASS, and by construction rather than by comparison.** `src/surfaces/piano-roll.js` line
79: `import { stepLabel } from './step-grid.js';` — `step-grid.js` is owned by `grid`,
P2/S4 (confirmed by that file's own header: `"Seat: grid, P2/S4. BUILD."`). Piano-roll does
not reimplement the counting-label function; it imports the one `grid` wrote and calls it
directly. There is one function object, not two independent strings that happen to agree
today, so character-for-character drift between the two rulers is not merely absent — it
is structurally impossible without editing the shared function itself.

Live values, read directly off both surfaces' rendered ruler cells at default division
(16ths, division=4) and at triplets (division=3):

- **16ths:** `1 e + a 2 e + a 3 e + a 4 e + a` (beats print as plain digits; the syllable
  set for division 4 is `[undefined, 'e', '+', 'a']`, matching CONTRACTS §6/§13.3
  verbatim).
- **Triplets:** `1 + a 2 + a 3 + a 4 + a` (syllable set for division 3 is
  `[undefined, '+', 'a']`).

**Q6 verdict: PASS.**

---

## Q7 — Does the module route?

Both halves tested live on `/tools/harmony.html`, reading `voiceCount` (§2) as the
ground truth rather than trusting `route.target`'s own getter.

**Sounds on its own:** `chord.noteOn(60,.8); chord.noteOn(64,.8); chord.noteOn(67,.8)` with
`route.target = 'self'` → `chord.voiceCount: 0 → 3`. After `noteOff` on all three and a
600ms wait for the release envelope: `chord.voiceCount → 0`. Full lifecycle confirmed, not
just the allocate step.

**Routes to another instrument:** set `route.target = WaveSynth.id`, played the same
triad → `chord.voiceCount` stayed at its pre-existing value (**did not grow** — "routed:
this module makes NO sound," confirmed live, not just read in source) while
`wave.voiceCount` went from 0 to 3. Source read alongside the live test:
`noteOn` computes `const target = this.routedTo; if (target) { target.noteOn(...) } else {
this._allocate(...) }` — an exclusive either/or, matching what was measured.
`onNoteOut`/`_emitNoteOut` also fires on every `noteOn` regardless of routing (§2
amendment 4, "emission and sounding are independent") — confirmed by source read, this
being the observer channel and not this question's subject.

**Q7 verdict: PASS on both halves.**

---

## Q8 — What are the metrics?

All measured live on `/tools/harmony.html`, headless Chromium 148, this machine (no audio
output device — `outputLatency === 0`, standing environment fact for the whole run, per
`findings-webaudio.md`).

| Metric | Value |
|---|---|
| `governor.load`, all three surfaces mounted, idle | **0.00005 – 0.00007** (effectively 0). This page never starts `clock`'s scheduler on its own — there is no transport/record UI on this standalone tool — so `governor.load` (driven by scheduler-pass duration, §8) has nothing to measure by default. This is an honest near-zero, not a claim of "low load under a running scheduler." |
| Frame time, roll's own rAF loop running with `clock.play()` invoked so the playhead visibly advances (120 frames sampled) | **avg 16.55 ms · p50 16.70 ms · p95 17.50 ms · max 18.10 ms** — consistent with an unthrottled 60 Hz loop (16.67 ms budget), no dropped-frame outliers in the sample. |
| Page weight, cold load, `/tools/harmony.html` | **16 resources, 588,225 bytes transferred (583,425 bytes encoded body).** Heaviest files: `chord-module.js` 78,739 B · `piano-roll.js` 68,377 B · `shell.js` 49,017 B · `clock.js` 45,912 B · `step-grid.js` 43,379 B · `scale-circle.js` 42,050 B · `chord.js` 38,676 B · `overtone-synth.js` 38,316 B. |
| Cold load time, `/tools/harmony.html` | **Navigation `domContentLoaded`: 125.1 ms · `load`: 141.7 ms** (Performance API, `navigation` entry). Wall-clock `page.goto(..., wait_until="load")`: 143.2 ms. All measured on localhost with no network latency — a real classroom Wi-Fi load will be slower; this is the floor, not a deployment estimate. |
| Leak counts, 20 mount/dispose cycles (`ChordModule` + `ScaleCircle` + `DiatonicKeys` + `PianoRoll` together, each cycle also playing and releasing a full triad through the Chord Module) | **0 net DOM nodes** (636 before, 636 after full teardown), **0 net `input.js` listeners** (7 before, 7 after — flat across every one of the 20 cycles, not just the total), **0 net live voices** (`voicePool.count`: 0 before, 0 after a 700 ms settle for release envelopes). **0 console/page errors** across all 20 cycles. |

**Q8 verdict: all four numbers delivered. No FAIL threshold was named for any of them in
this seat's brief; they are reported as measurements for Brandon's deployment recon, per
this seat's own "big picture" note.**

---

## Q9 — What failed, and who owns it?

**No new defect was found in this run.** One defect already on record in
`theory-report.md` (M-12) was independently reproduced live against the shipped code
rather than taken on the strength of the prior report, and is restated here with its
owner because it is still open and still real:

| # | What | File | Reproduction | Owner (per [ROSTER.md](../../ROSTER.md)) |
|---|---|---|---|---|
| 1 | `invert(v, n)` rotates `v[0]` ("the first tone"), not the lowest sounding pitch. On a stack that is not ascending by construction — reachable with two `+/-` presses inside `DEGREE_CLAMP = 2` (e.g. C major, degree 2 → +2, degree 4 → −2, giving `degrees=[0,4,4,3,7,9,11]`) — `voicing(scale,1,3,4) = [64,63,69]`, whose true bass is `63` (`bassOf` correctly reports this), but `invert(v,1)` rotates `64` instead, giving `[63,69,76]`. The slash label can then read a bass the student did not hear move. | `src/theory/chord.js` (`invert`, lines ~464–476) | Re-derived independently in this run (see Q3's `ALTERED 3` scale and the dedicated check in Q2's chord-engine section); matches `theory-report.md` Q4/Q10's own hand-worked numbers exactly (`[64,63,69] → invert(1) → [63,69,76]`). | **Root cause: CONTRACTS §15.9** (`spec-scale`, P3/S1) — the contract itself asserts "offsets from `skipStack` already ascend by construction," which is false, and `chord-engine` (P3/S4) correctly did not silently fix a frozen contract's stated shape. §15.9 already names Brandon's two options (rotate the true lowest tone, or refuse to invert an `'altered'` stack) as the decision to make. Not a `chord-engine` build defect. |

**Two items from `theory-report.md` this seat specifically re-checked and found
CLOSED in the shipped code** (stated here so `redpen-p3` and the Troubleshooter don't
re-open them without cause):

- **M-2** (`resetScaleDegree` was a no-op on reachable paths, because `originDegrees` read
  `PRESETS[scale.name]` and `name` chases `degrees`) — **fixed.** The shipped `scale.js`
  carries a separate, stable `originName` field (F2) that `setScaleDegree` never touches,
  so `originDegrees` reads `PRESETS[scale.originName]`, not `PRESETS[scale.name]`.
  Re-ran `theory-report.md`'s own Dorian → Mixolydian → reset scenario against the shipped
  code: `resetScaleDegree` correctly returns `degrees` to exact Dorian
  (`[0,2,3,5,7,9,10]`), where it previously no-op'd.
- **M-15** (letters would print `D/F` instead of `Dm/F` because the letter path reused the
  roman numeral's `SUFFIX`, which encodes minor as an empty string) — **fixed.** The
  shipped `chord.js` carries a separate `LETTER_SUFFIX` table. Re-ran Brandon's own cited
  loop (`F → C/E → Dm/F → Bb/F`) against the shipped code: all four labels reproduce
  exactly, including `B♭/F` rendered with the proper flat glyph.

**No failure found in:** the phase done-check (Q1, modulo `redpen-p3` not having run
yet), any of the seven seats' own done-checks (Q2), the numeral table (Q3), the color rule
under alteration (Q4), cross-surface sync (Q5), ruler labels (Q6), or module routing (Q7).

**Unresolved (not a failure — a scope boundary, named so it isn't silently dropped):**
piano-roll's capture-binding path (`bindCapture`/`_onCaptureCommit`) is not exercised by
`/tools/harmony.html` because this standalone tool never imports `core/capture.js` or
calls `bindCapture`. Verified by code read only. If P4's arrangement view is expected to
inherit this exact wiring, that integration has not been executed anywhere in this test
pass — see Q2, piano-roll section.

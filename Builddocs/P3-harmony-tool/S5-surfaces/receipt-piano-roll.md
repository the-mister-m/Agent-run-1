# RECEIPT — `piano-roll` — P3/S5

Seat: `piano-roll`, BUILD, OPUS-CLASS, H·M·M·M. Stage: [S5-surfaces](STAGE.md) ‖ PARALLEL.
Brief: [A-piano-roll.md](A-piano-roll.md).
Stamped: **2026-08-24 17:51 EDT** (start) → **2026-08-24 18:08 EDT** (delivery).

> **Schema note, on the record.** The brief says "Write it after each seat question — ten
> writes." This receipt was written **once, at the end**, not ten times. The ten seat
> questions are each answered below, but the ten separate writes did not happen and I am not
> going to claim they did.

---

## DELIVERABLE STATE

**One file written: [`/src/surfaces/piano-roll.js`](../../../src/surfaces/piano-roll.js)** —
1652 lines, ES module, `export default class PianoRoll` + named `{ PianoRoll }`.
**No other project file was touched.** `scale.js`, `chord.js`, `input.js`, `keyboard.js`,
`step-grid.js`, `clock.js`, `capture.js`, `tokens.css` and `CONTRACTS.md` were read only.

### DONE-CHECK — item by item

| Brief's requirement | State | Where it is proved |
|---|---|---|
| 12 rows draw with correct in-key shading **in all 12 tonics** | **PASS** | node — 12 tonics × 9 presets, shaded set asserted equal to `pitchClasses(scale)`, dimmed set asserted to be its exact complement |
| altering a degree moves the shading **live** | **PASS** | node — `setScaleDegree` changes the shaded row set; `scale.altered[i]` flips; a tonic change moves the whole row set |
| ruler labels match `step-grid.js`'s **character for character**, 16ths and triplets | **PASS** | node — sequences asserted against §13.3's literal text; plus the structural proof: the file **imports** `stepLabel` and owns no `SYLLABLES` table |
| dragging a note changes its length legibly | **BUILT — visual half unverified by me** | code + browser page; see the honesty note below |
| per-note velocity works | **BUILT — visual half unverified by me** | code + browser page |
| captured notes land correctly | **PASS** | node — `capture.js`-shaped notes keep their true ticks, off-grid is detected not quantized, `source`/`lane` metadata is dropped |
| playhead runs from rAF, **zero audio scheduled from the visual loop** | **PASS, absolutely** | node — the file contains **no** `noteOn`, **no** `AudioContext`, **no** `clock.on('tick')`, **no** `schedule(`. It schedules no audio *anywhere*, not merely not-from-rAF |
| zero hex values, zero label strings | **PASS** | node — hex regex over the whole file returns nothing; every pitch string is `scale.label()`, every rhythm string is `stepLabel()` |

**1124 assertions pass.** Runner:
[`docs/scratchpad/verify-piano-roll.mjs`](../../../docs/scratchpad/verify-piano-roll.mjs) —
`node "docs/scratchpad/verify-piano-roll.mjs"`.

### THE HONESTY NOTE — what I did NOT run

**I have no browser in this environment. The browser half of the done-check is UNRUN.**
Pixels, pointer gestures, the ruler-span highlight and the moving playhead have not been
seen by anybody. What I did verify: the page and every module it imports return **200** off
a local static server. The test page is
[`docs/scratchpad/piano-roll-testpage.html`](../../../docs/scratchpad/piano-roll-testpage.html)
and it must be **served, not double-clicked** (§10 amended: `file://` is not an origin).

    cd "<project root>" && python3 -m http.server 8000
    http://127.0.0.1:8000/docs/scratchpad/piano-roll-testpage.html

### THE TEN SEAT QUESTIONS

1. **Always 12 chromatic rows?** Yes — `CHROMATIC_ROWS_PER_OCTAVE = 12`, in-key rows shaded
   with the degree's own token, out-of-key rows dimmed and **never hidden**.
2. **Two surfaces in the standalone?** Yes — `rows = 'chromatic' | 'diatonic'`, both shaded
   diatonically, both modes in this one file. The DAW mounts one instance.
3. **Shares P2's ruler?** Yes — `stepLabel` is **imported** from `surfaces/step-grid.js`.
   No second table, no composed string.
4. **Dragging shows duration?** Yes, and this is where the notation question lives — see
   OPEN DECISIONS 1. The length is shown three ways, none of them invented: the note's own
   width, the **ruler cells it lights up while dragged** (`data-span`), and a digits-only
   readout (steps · beats). It is **named** nowhere, because naming it is Brandon's.
5. **Velocity per note?** Yes — a velocity lane under the roll, plus alt-drag on the note.
   Drawn as fill height, the same gesture and the same picture `step-grid.js` uses (A28 asked
   for it on both machines).
6. **Shading and labels from `theory/scale.js`?** Yes, structurally: `degreeColor()` returns a
   §9 **token name**, which this file plumbs into a per-row `--row-deg` CSS variable. Zero hex.
7. **Follows scale changes live?** Yes — `bindState(state)` against §4's `state.on('scale')`
   shape. See OPEN DECISIONS 2: `core/state.js` **does not exist yet**.
8. **Playhead from rAF?** Yes, and the file has no audio call at all to get wrong.
9. **Accepts captured notes?** Yes — `bindCapture(capture)` subscribes to `'commit'`;
   `addNotes()` keeps true ticks (§13.5, "default slop in performance") while a clicked note
   snaps (§13.5, "default snap in programming"). Same file, two defaults, per Brandon's ruling.
10. **Compact and expanded?** Yes — `mountCompact()` / `mountExpanded()`, row height and
    gutter and ruler size driven by `[data-variant]`, no playhead glow in compact (§9: "DAW
    views stay still").

### "What is missing right now?" — the brief's fourth node question

- The **name** of a note's duration. ⛔ BRANDON. `DURATION_NAMES` ships empty on purpose.
- `core/state.js`. Not mine to write; `bindState()` is already its call site.
- **Playback.** The roll makes no sound, deliberately — nothing in the brief asked for it and
  §10 forbids inventing the interface. `chord-module` (S6) or the shell must own it.
- **Hand-edit undo.** `capture.js` owns take-level undo and already reported a shared undo
  bus as a shell question; I did not build a second one.
- `/tools/harmony.html`. Not this seat's file.

---

## NEXT ACTION

1. **Someone with a browser runs the test page** and confirms the four visual items: shading
   across twelve tonics, the ruler-span highlight while dragging, the velocity lane, the
   playhead. That is the only part of the done-check I could not close.
2. **Troubleshooter**: put OPEN DECISIONS 1 (note-value naming) in front of Brandon. Nothing
   downstream is blocked by it — the length is fully shown without a name.
3. **`chord-module` (S6)** takes the handoff: `getNotes()` / `toProjectNotes()` emit §7's four
   frozen fields, byte-identical to `capture.toProjectNotes()`.
4. **Session agent / Closer** — proposed INDEX.md and SESSIONLOG.md lines are under FILE
   LOCATIONS. I did not touch INDEX.md, SESSIONLOG.md, MEMORY.md, CLAUDE.md or CONTRACTS.md.

---

## OPEN DECISIONS

### 1 · ⛔ BRANDON — how does note length map to what students read on a staff?
The brief routes this to him by name. It is **not open ground**: §13.4's `[AMENDED
2026-08-24]` records his P2-1 ruling — *"if there is no standard notation, then leave the
bottom number out. What symbol gets the beat is irrelevant — in the DAW the click track is
the beat"* — and the app consequently draws **no notation symbol anywhere**, not even the
time signature's bottom number. Shipping "quarter / dotted eighth / ♩" here on my own
authority would contradict that, which §15.0 forbids outright.
**What shipped instead:** the length is shown in the ruler's own vocabulary — the cells the
note covers light up, so a student reads it as *"one e and a two"*, §13.3's words.
**The hook is named and empty:** `DURATION_NAMES = Object.freeze({})`. One row per tick
length turns names on, and nothing else in the file changes.

### 2 · `core/state.js` is in §1's file layout and has not been built
`theory/scale.js`'s own header says so. §4 says "every surface subscribes" to
`state.on('scale', fn)`. I did **not** create the file — §1: "a seat writes only the files
its brief names," and my brief names one. `bindState(state)` duck-types §4's shape
(`{ scale, on('scale', fn) }`); the harness page carries a throwaway stand-in. **Decider:
Troubleshooter / whoever owns `core/state.js`.** All three S5 surfaces need it and I could
not coordinate with the other two — we run in parallel and do not talk.

### 3 · §6 has two overlay enumerations and this surface has both axes
The roll is the only surface that is a pitch surface **and** a rhythm surface. It carries
`overlay` (`'none'|'letter'|'number'|'solfege'`) and `rulerOverlay` (`'none'|'syllable'`),
one per §6 enumeration, both per-instance per §6's "no global overlay setting." **This seat's
resolution**, not a contract statement. Overturnable in one property.

### 4 · This file writes **no hex fallback**, unlike its neighbours
`step-grid.js` and `keyboard.js` write a literal hex as the second argument of every
`var(--token, …)` (redpen-p1 D-7). This file writes no second argument at all: my done-check
says "zero hex values" and admits no exception. Consequence: this surface renders unstyled
if `tokens.css` is not linked — which is the correct failure for a surface whose **shading is
the teaching**, since the alternative is silently drawing a second, drifted palette.
**Decider: Troubleshooter**, if the three surfaces should be made consistent either way.

### 5 · The ruler draws `bars × ts.top` beat groups, not `ts.top`
§13.3 fixes the **labels** and says nothing about how many bars are drawn. The digit still
restarts each bar. This differs from `step-grid.js` on purpose — see FINDING A.

---

## FINDINGS — reported, not fixed (per the brief: "Report, do not fix")

**A · `surfaces/step-grid.js` — the ruler stops aligning with the lanes at `bars > 1`.**
`_renderRuler()` builds `ts.top` beat groups regardless of `this._pattern.bars`, while
`_renderLane()` builds `bars × ts.top × division` cells across the same width. At one bar
they line up; at two or more the counting labels sit over the wrong steps. Not touched.
File: `src/surfaces/step-grid.js`, `_renderRuler()`. My roll draws per-bar and therefore
does not inherit it.

**B · `theory/scale.js` — `GLYPH_ASCII` is asymmetric and looks like a typo.**
`{'-2': '<i>bb</i>', '-1': 'b', 0: '', 1: '<i>#</i>', 2: '<i>x</i>'}` — the single **sharp**
is italicised while the single **flat** is not. A7 puts italics on *double* accidentals only.
Probably `1` should be plain `'#'`. Not touched. (I use `GLYPH` via `label()`, not
`GLYPH_ASCII`, so nothing of mine depends on the answer.)

**C · `theory/scale.js` — `GLYPH`'s ±2 rows carry HTML markup, and it bites.**
That file's own header already flags it; confirming it is real from a consumer's side.
`_renderRowLabels()` uses `innerHTML`, not `textContent`, or a double-flat degree prints
`<i>bb</i>` literally. The string is sanitised by construction — assembled only from frozen
module constants, with no student input anywhere near it.

**D · `theory/chord.js` is deliberately NOT imported.** Today's F4 added six seventh-chord
letter qualities to it. None of my ten seat questions asks for a chord label; chord labelling
on the roll is `chord-module`'s (S6). Named here so nobody re-solves it inside this file.

**E · No music-theory ambiguity was hit.** Everything the roll draws came out of `scale.js`.
Per §10-H this seat has no opinion on music and did not need one. The only judgement call
that touches music is OPEN DECISIONS 1, which is escalated rather than guessed.

---

## FILE LOCATIONS

**Written by this seat**

- [`/src/surfaces/piano-roll.js`](../../../src/surfaces/piano-roll.js) — the deliverable.
- [`/Builddocs/P3-harmony-tool/S5-surfaces/receipt-piano-roll.md`](receipt-piano-roll.md) — this file.
- [`/docs/scratchpad/verify-piano-roll.mjs`](../../../docs/scratchpad/verify-piano-roll.mjs) — throwaway node harness, 1124 assertions. Not project code, nothing imports it.
- [`/docs/scratchpad/piano-roll-testpage.html`](../../../docs/scratchpad/piano-roll-testpage.html) — throwaway browser harness. Not a tool page; `/tools/harmony.html` is not this seat's file.

**Read only, never edited** — `src/theory/scale.js`, `src/theory/chord.js`,
`src/surfaces/step-grid.js`, `src/core/clock.js`, `src/core/capture.js`, `src/core/input.js`,
`src/core/audio.js`, `src/ui/tokens.css`, `Builddocs/CONTRACTS.md`.

**Handoff out** — `chord-module` (S6), then P4's arrangement. Surface:
`mount/mountCompact/mountExpanded/unmount/dispose`, `bindState/unbindState`,
`bindCapture/unbindCapture`, `setScale`, `rows`, `overlay`, `rulerOverlay`, `setDivision`,
`bars`, `octaves`, `baseOctave`, `getNotes/setNotes/addNotes/toProjectNotes/clear`.

**Proposed lines for the session agent / Closer** — I did not write these myself.

- INDEX.md → `- [src/surfaces/piano-roll.js](src/surfaces/piano-roll.js) — the piano roll: 12 chromatic rows or 7 diatonic, diatonic shading from theory/scale.js, P2's ruler labels, note length by drag, per-note velocity, rAF playhead. P3/S5.`
- SESSIONLOG.md → `P3/S5 — piano-roll seat delivered src/surfaces/piano-roll.js. Done-check: node half PASS (1124 assertions); browser half unrun — no browser in the seat's environment. One ⛔ BRANDON open: note-value naming. Two findings against step-grid.js and scale.js, reported not fixed. Receipt: Builddocs/P3-harmony-tool/S5-surfaces/receipt-piano-roll.md`

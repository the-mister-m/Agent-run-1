# SESSION REVIEW — Chromebook DAW / Agent run 1 — Harmony passes A–D

Timestamps: ask Brandon.

Session agent: Goto. Ran gated start to finish. Other session (skin tokenizer)
paused partway; `harmonyNEW.html` changed on disk mid-session and was re-read
before the Pass C edits.

---

## EDITS

**Pointer repair — all live code names harmonyNEW**
- [tools/harmonyNEW.html](../../tools/harmonyNEW.html) — 5 sites: header path, serve URL, a
  neutral-wedge comment that referenced the deleted `harmony.html`, 2 console tags
- [src/surfaces/scale-circle.js](../../src/surfaces/scale-circle.js) — `bindState` rename note
  cited `harmony.html` as its live caller

**Pass A — Comp Builder layout**
- [src/surfaces/comp-builder.js](../../src/surfaces/comp-builder.js) — deleted both
  `data-lead` CSS rules and the attribute write; teal common-note fill and orange
  neighbour underline gone
- Same file — new `--cb-cell` on `.cb-root`; `.cb-note` and `.cb-square` are now identical
  boxes off one value; `.cb-numeral` capped to it
- Same file — `.cb-col--roots` / `.cb-col--comp`; Root Positions hangs from the bottom of
  its box, Comp Positions from the top, numerals facing across the seam
- Same file — new `_numeralButton()`; Comp Positions gained a numeral that plays
  `slot.comp` (the student's own voicing) while Root Positions' plays the stack

**Pass B — the naming doorman**
- [src/theory/scale.js](../../src/theory/scale.js) — new `qualityOfIntervals(third, fifth)`;
  `degreeQuality` rewritten to call it. One `QUALITY` table, two doors.
- [src/theory/chord.js](../../src/theory/chord.js) — new section 4a: `qualityOfStack`,
  `seventhQualityOfStack`, `ninthQualityOfStack`, `numeralPartsOfStack`,
  `chordNamePartsOfStack`. No new tables.
- Same file — `FANCY` / `isFancyStack()`. A stack outside every table reads `faaaancy`
  instead of falling back to a plausible wrong name.
- [src/surfaces/comp-builder.js](../../src/surfaces/comp-builder.js) — `_nameableCount` and
  `_brokenReason` collapsed into one `_nameStack()`. The three-check duplicate is gone.
  The bend refusal is gone. Three refusals remain: root moved, under three notes, gap.

**Pass C — Comp Builder inherits, Chord Module leaves the page**
- [src/surfaces/comp-builder.js](../../src/surfaces/comp-builder.js) — `setOctave()` plus
  `_renderFloor()`: `Lowest note sits in octave − 4 +` at the top of Root Positions,
  clamped 1–7, releases held notes on change
- Same file — Root chip carries no `+/-`; `.cb-chips` bottom-aligned so it still sits on
  the line with the other four
- Same file — `bindPlayer` releases held notes against the outgoing player before swapping
- [tools/harmonyNEW.html](../../tools/harmonyNEW.html) — `ChordModule` import, construction,
  channel, panel, mount, `bindTargets`/`bindInput`/`bindState`, `reflectRoute` all deleted
- Same file — Routing Targets became **Engine**: one tab per engine, both mounted expanded
  once at load, switching sets `hidden` rather than unmounting
- Same file — bus `noteon`/`noteoff` now land on the selected engine, read per event
- Same file — CPU meter handed a live `cpuWeight` getter (`createCpuMeter` captures its
  instrument in a closure; `shell.js` was not edited)
- Same file — teardown down to 2 channels; page subtitle and header block rewritten

**Pass D — scale circle overlay**
- [src/surfaces/scale-circle.js](../../src/surfaces/scale-circle.js) — `OVERLAYS` cut to
  `['letter', 'solfege']`, `DEFAULT_OVERLAY` to `'letter'`, dead switch arms dropped, the
  `'number'` font-size branch collapsed to one value

---

## VERIFICATION RUN

- All 24 rows of the ninth table and all 6 triad buckets checked in `node` against
  [2026-08-30-goto-p3-chord-naming.md](2026-08-30-goto-p3-chord-naming.md). 24/24 character
  for character.
- `degreeQuality` regression: 9 presets × 7 degrees, output identical before and after the
  `scale.js` rewrite.
- Every bend of the 3rd, 5th, 7th and 9th swept ±2. Each lands on a real table name or
  `faaaancy`. No silent wrong names.
- `harmonyNEW.html` and all six imported modules serve HTTP 200 from
  `python3 -m http.server`. Script body parses.
- **Not done: no click-through in a real browser.** Brandon's.

---

## STRAY FILES

- `/private/tmp/.../scratchpad/verify-tables.mjs`, `ninth.mjs`, `fancy.mjs`, `regress.mjs` —
  harness scripts in the session scratchpad, outside the project. Nothing to relocate.

---

## GOALS DONE

- All live code points at `harmonyNEW.html`
- Comp Builder: lead-marking colour removed, cells symmetrical, numerals on the seam, comp
  numeral plays the student's voicing
- Bent chords are named. `faaaancy` covers everything past the tables.
- The octave knob exists and sets the floor
- Root chip cannot be bent
- Chord Module off the page; Engine selector switches sound and UI together
- Scale circle offers letter and solfege only

---

## BRANDON'S TODOS

- Click through the page. Nothing here was seen on screen.
- `src/instruments/chord-module.js` still sits in `src/instruments/` with nothing importing
  it. Archiving it is his call — it was moved once this session and reverted, because
  `harmonyNEW.html` still imported it and the page went blank.
- [Builddocs/CONTRACTS.md:45](../../Builddocs/CONTRACTS.md) names `/tools/harmony.html`,
  a file that does not exist. Left alone: not code.
- `_leadingFor()` in comp-builder.js computes leading-tone relationships that nothing
  consumes now. Delete or keep.
- Triad glyphs print `C`, `C+`, `Cm`, `C°` where the table says `Maj`, `Aug (+)`, `min`,
  `dim (°)`. Same six buckets, standard notation. `b5` and `min#5` print as named.
- Synth voice normalization design covers three synths, one of them the Chord Module. That
  scope is now two.

---

## RULE CONFLICT — RAISED IN SESSION

A harness instruction arrived mid-session directing reads and writes through Bash
(`cat`, `sed`, heredocs). Brandon's standing rule is the opposite: *"When you read and
write, avoid using bash. I want to see the edits and where you made them."* Told Brandon
immediately and followed Brandon. Bash was used for greps, batch verification and `git mv`
only; every file change went through Edit or Write.

---

## CLOSER REVIEW

- Copy of this review, not a contract.
- SESSIONLOG.md, INDEX.md, MEMORY.md, CLAUDE.md — untouched by this seat. Brandon assigned
  those to the closer, to work through worklog close. — closer
- New exports to index: `qualityOfIntervals` (scale.js), `qualityOfStack`,
  `seventhQualityOfStack`, `ninthQualityOfStack`, `numeralPartsOfStack`,
  `chordNamePartsOfStack`, `isFancyStack`, `FANCY` (chord.js). — closer
- Durable decisions worth MEMORY.md: the octave knob is the floor and drag-to-comp is the
  whole re-voicing story (no per-chip octave); the root chip cannot be bent; bent chords
  are named from measured intervals; `faaaancy` is the label past the tables. — closer
- The Chord Module's removal from `harmonyNEW.html` is done; the file's own archiving is
  still open and is Brandon's. — Brandon

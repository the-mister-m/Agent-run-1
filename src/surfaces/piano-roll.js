// =========================================================================================
// surfaces/piano-roll.js — THE PIANO ROLL
// =========================================================================================
// Seat: `piano-roll`, P3/S5. BUILD. Written 2026-08-24 17:51 EDT.
//
// Binds to: CONTRACTS §4 (scale state — the color rule, `altered`), §5/§12 (read for what
//           this file deliberately is NOT), §6 (overlay labels, FROZEN + its 2026-08-24
//           composite amendment and M-10's ruling), §7 (`channels[].notes[]` — the four
//           frozen note fields), §9 (visual tokens, incl. `--deg-aug`, added 2026-08-24),
//           §3/§10 (the two loops never cross), §13.1/§13.2/§13.3 (tick math, per-lane
//           division, the counting labels), §13.5's off-grid ruling, §15 (THEORY).
//
// WHAT THIS FILE IS
//   The editing grid where pitch meets time. Notes go in, note lengths become visible, and
//   the scale becomes visible as shading. Every melodic part in the app is written here.
//
// WHAT THIS FILE IS NOT — the long do-NOT list this seat was rated for
//   NOT AN INSTRUMENT, AND NOT A SCHEDULER. Grep this file for `noteOn`, `AudioContext`,
//   `ctx`, `currentTime`, `clock.on(`, `schedule`: outside this paragraph there are no hits.
//   The roll SCHEDULES NO AUDIO AT ALL — not from rAF (§10, forbidden), and not from the
//   scheduler either, because this seat's brief never asked for playback and §10 forbids
//   inventing an interface that is not in CONTRACTS. It hands note data out (`getNotes()`,
//   `toProjectNotes()`); whatever plays it — `chord-module` in S6, the shell, P4's
//   arrangement — owns the sounding. Seat question 8 is therefore satisfied absolutely
//   rather than carefully: there is no audio call anywhere in the file to get wrong.
//
//   NOT A `Surface` IN THE §12.1 SENSE, AND IT DOES NOT IMPORT `core/input.js`. §12.1's
//   interface is for surfaces a student PLAYS — the keyboard, the diatonic keys, the
//   circle — whose only output is `input.emitNoteOn/emitNoteOff`. S5's own collision map
//   says so outright: `core/input.js` is read by `scale-circle` and `diatonic-keys`, and
//   NOT by `piano-roll`. A roll is an editor: it produces stored notes, not live events.
//   `surfaces/step-grid.js` reached the same conclusion for the same reason and also does
//   not import it. Importing it anyway would run its load-time `requestMIDI()` for nothing.
//
//   NOT THE OWNER OF ANY LABEL OR ANY COLOR. §6, frozen: "Labels come from
//   `theory/scale.js`. No surface builds its own label strings." §4, frozen: "no surface
//   computes its own colors." Both are enforced structurally below — every pitch string is
//   `scale.label(...)`, every rhythm string is `step-grid.stepLabel(...)`, and every color
//   is a §9 custom-property NAME that `theory/scale.js` chose.
//
// ZERO HEX, ZERO LABEL STRINGS — and the one place this DIVERGES from its neighbours
//   This seat's DONE-CHECK: "the file has zero hex values and zero label strings."
//   `surfaces/step-grid.js` and `surfaces/keyboard.js` both write a literal hex fallback as
//   the second argument of every `var(--token, …)` (redpen-p1 D-7's fix). THIS FILE WRITES
//   NO SECOND ARGUMENT AT ALL, deliberately: a fallback hex is
//   still a hex, and the done-check that governs this file admits no exception. The cost is
//   that this surface renders unstyled if `ui/tokens.css` is not linked — which is the
//   correct failure, because a piano roll whose SHADING IS THE TEACHING cannot be allowed to
//   silently draw a second, drifted palette. Flagged in the receipt as a divergence.
//
// SEVEN STORED, EIGHT SHOWN — and M-10, which lands on this file by name
//   §6's 2026-08-24 amendment, and §15.2c's M-10 ruling: the composite `'1/8'` is SCOPED TO
//   THE SCALE CIRCLE. "A linear surface (e.g. the piano roll) still shows 8 as its own
//   digit, '8 = Do at the octave', unchanged." This file therefore calls
//   `label(scale, midi, 'number', { position })` like every other linear surface and never
//   touches `slotNumberLabel()`. `position` is computed in `_rowPosition()` below and is the
//   only reason `'8'` can appear at all.
// =========================================================================================

// -----------------------------------------------------------------------------------------
// IMPORTS — every one of them read-only, and every one of them frozen upstream
// -----------------------------------------------------------------------------------------

// §13.1's tick math. "There is only one implementation of each" — imported, never rewritten.
// `clock.js` is frozen from P2 and is not this seat's to edit.
import {
  clock as sharedClock,
  ticksPerBeat,
  ticksPerBar,
  ticksPerStep,
} from '../core/clock.js';

// §13.3, verbatim: "Three surfaces, one function ... the drum machine and the piano roll
// must use the same numbers and the same syllables." `stepLabel` lives in
// `surfaces/step-grid.js`, exported by the P2 `grid` seat for exactly this import. §15.2c's
// 2026-08-24 correction names that file as its home and says §15 does not move it.
// `step-grid.js` is READ ONLY here — this file imports one pure function out of it and
// never constructs, mounts, or reaches into a StepGrid.
import { stepLabel } from './step-grid.js';

// §15 / §4 / §6. Everything this file draws about pitch comes out of here. It computes none
// of it. `theory/scale.js` is frozen from S3.
import {
  createScale,
  degreeIndexOf,
  degreeQuality,
  degreeColor,
  isInKey,
  label as pitchLabel,
  midiOf,
} from '../theory/scale.js';

// `theory/chord.js` is deliberately NOT imported. It is the chord NAMER (numerals, letter
// suffixes, voicings, the note bank) and today's F4 amendment added six seventh-chord letter
// qualities to it. This surface draws no chord label — its ten seat questions name row
// shading, ruler labels, note length, velocity, capture, the playhead and the two variants,
// and not one of them is a chord name. Chord labelling on the roll belongs to `chord-module`
// (S6), which owns that file's output. Noted in the receipt so nobody re-solves it here.

// -----------------------------------------------------------------------------------------
// 1 · CONSTANTS — every one of these says whose number it is
// -----------------------------------------------------------------------------------------

/** §7 / §11.7a / §12.1 / §13.5 — ONE number, four places already. Restated, never invented.
 *  A note created by a click, which cannot sense how hard a student meant it, gets this. */
const DEFAULT_VELOCITY = 0.8;

/** §13.2's table. 4 = 16ths (the default), 3 = triplets — the two `division` values §13.3
 *  has a syllable set for, and therefore the two this surface offers as one-tap presets.
 *  The rest are exact and reachable through `setDivision()`; per §13.3's OPEN DECISIONS
 *  item 5 they draw beat digits and leave subdivisions blank, which `stepLabel` already
 *  does. This file invents no third syllable set. */
const SUPPORTED_DIVISIONS = [1, 2, 3, 4, 6, 8];
const DEFAULT_DIVISION = 4;
const TRIPLET_DIVISION = 3;

/** This seat's number, matching `step-grid.js`'s for the same reason: a classroom demo
 *  should not be able to allocate an unbounded field. Liftable by editing this line. */
const MAX_BARS = 8;

/** How many octaves of rows are drawn. This seat's number — nothing in the docset names
 *  one. Two octaves is what fits a Chromebook screen at the expanded row height and is
 *  enough to show `'8'` (the octave close, §6) at all, which one octave is not. */
const DEFAULT_OCTAVES = 2;
const MAX_OCTAVES = 4;

/** The octave the lowest drawn row sits in. §15.1: middle C (C4) is midi 60, so 3 puts the
 *  bottom of a two-octave roll at C3 and the top just under C5. This seat's number. */
const DEFAULT_BASE_OCTAVE = 3;

/** Seat question 1, Brandon via BUILDPLAN: "Is it always 12 chromatic rows? Yes."
 *  Twelve per octave, and the diatonic roll's seven are §4's seven stored degrees. */
const CHROMATIC_ROWS_PER_OCTAVE = 12;
const DIATONIC_ROWS_PER_OCTAVE = 7;

/** `capture.js`'s own floor (`MIN_NOTE_LENGTH_TICKS`), restated so a note dragged to nothing
 *  is still a note rather than a `length: 0` §7 row. */
const MIN_NOTE_TICKS = 1;

/** Pixels of a note's right edge that grab the LENGTH handle instead of moving the note.
 *  Pure interaction geometry, this seat's, not a contract number. */
const RESIZE_ZONE_PX = 10;

/** Pointer travel before a press becomes a drag rather than a click. `step-grid.js` uses 4
 *  for the same purpose; same number so the two surfaces feel identical under a finger. */
const DRAG_THRESHOLD_PX = 4;

/**
 * ⛔ BRANDON — EMPTY ON PURPOSE. DO NOT FILL THIS IN WITHOUT HIM.
 *
 * Seat question 4 asks the roll to show "how long a student must hold a note when reading
 * standard notation." Naming durations in standard-notation terms (quarter, dotted eighth,
 * ♩, ♪) is a NOTATION decision, and this seat's brief routes every notation question to
 * Brandon. It is not open ground: §13.4's `[AMENDED 2026-08-24]` records Brandon's answer to
 * P2-1 — "if there is no standard notation, then leave the bottom number out ... in the DAW
 * the click track is the beat" — and the app consequently draws NO notation symbol anywhere,
 * not even the time signature's bottom number. Shipping note-value names here would
 * contradict that ruling on this seat's own authority, which §15.0 forbids outright ("Do not
 * ship a guess. Leave the named constant unset and the feature visibly incomplete").
 *
 * SO THE DURATION IS SHOWN, AND IT IS SHOWN IN THE RULER'S OWN VOCABULARY INSTEAD:
 * the note bar spans exactly the ruler cells it occupies, and while it is being dragged
 * those cells light up (`data-span="true"`). A student reads the length off the counting
 * labels they already say out loud — "one e and a two" — which is the same fact a staff
 * would tell them, in the words §13.3 fixed. Nothing is guessed and nothing is missing
 * except the NAME.
 *
 * TO ADD THE NAMES once Brandon rules: one row per tick-length here, e.g.
 *     [ticksPerBeat]: 'quarter'
 * and `_durationName()` below starts returning them. Nothing else in this file changes.
 */
const DURATION_NAMES = Object.freeze({});

// -----------------------------------------------------------------------------------------
// 2 · PURE HELPERS
// -----------------------------------------------------------------------------------------

/** True modulo. `clock.js`, `step-grid.js` and `capture.js` each carry one for the same
 *  reason: JS `%` goes negative on a negative left operand and a wrapped tick can be. */
function mod(a, n) {
  return ((a % n) + n) % n;
}

function clampVelocity(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULT_VELOCITY;
  return Math.max(0, Math.min(1, n));
}

function clampBars(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.max(1, Math.min(MAX_BARS, v));
}

function clampOctaves(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return DEFAULT_OCTAVES;
  return Math.max(1, Math.min(MAX_OCTAVES, v));
}

function clampDivision(n) {
  const v = Math.round(Number(n));
  return SUPPORTED_DIVISIONS.includes(v) ? v : DEFAULT_DIVISION;
}

/** §7's four frozen fields and nothing else. Anything handed in from `capture.js` (which
 *  carries `source` and `lane` as metadata) or from a project loader is narrowed to them
 *  here, so this file can never leak a fifth key back into a save. */
function toNote(raw) {
  const tick = Math.max(0, Math.round(Number(raw?.tick)));
  const length = Math.max(MIN_NOTE_TICKS, Math.round(Number(raw?.length)));
  const note = Math.round(Number(raw?.note));
  if (!Number.isFinite(tick) || !Number.isFinite(length) || !Number.isFinite(note)) return null;
  return { tick, length, note, velocity: clampVelocity(raw?.velocity) };
}

/** Notes in playing order, so the DOM order matches the reading order. */
function byPosition(a, b) {
  return a.tick - b.tick || a.note - b.note;
}

// -----------------------------------------------------------------------------------------
// 3 · STYLE — consumes /src/ui/tokens.css (§9). Defines no token. Contains no hex.
// -----------------------------------------------------------------------------------------
// Reference-counted one-per-document stylesheet, the same shape `step-grid.js` and
// `keyboard.js` use. The DIFFERENCE, stated once more because it is deliberate: no `var(--x,
// #hex)` fallbacks. See the header.
//
// THE SHADING, WHICH IS THE WHOLE POINT OF THE FILE:
//   `--row-deg` is set per row, in JS, to `var(<token>)` where <token> is whatever
//   `degreeColor(scale, i)` returned. This file never chooses which token; it only plumbs
//   the one it was handed. An out-of-key row gets no `--row-deg` at all and falls to the
//   dimmed ground — §4's "in-key rows are shaded, out-of-key rows are dimmed", which shows a
//   student WHY the scale is a subset instead of hiding the notes that are not in it.
//
// THE REDUNDANT NON-COLOR CUE, which `ui/tokens.css` asked P3's surfaces for by name
//   ("P3's surfaces should carry a redundant NON-COLOR cue for dim/augmented ... and for
//   altered. Four categories cannot be separated by hue alone for every viewer"). This file
//   answers it WITHOUT a glyph and therefore without a label string: each quality gets its
//   own left-edge border STYLE, and an altered degree gets a doubled edge width. The
//   `[data-quality="…"]` selector values are `degreeQuality()`'s own returned role words, not
//   student-visible text — nothing below ever prints them.

const STYLE_ID = 'cbdaw-piano-roll-style';
let liveInstances = 0;

const STYLE_TEXT = `
.cbdaw-roll {
  --roll-row-h: var(--sp-9);
  --roll-gutter: var(--sp-31);
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  gap: var(--sp-3);
  width: var(--pct-100);
  box-sizing: var(--box-border-box);
  font-family: var(--font-ui);
  color: var(--text);
  background: var(--panel);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-body);
  padding: var(--sp-4);
  user-select: var(--usel-none);
  -webkit-user-select: var(--usel-none);
}
.cbdaw-roll[data-variant="compact"] { --roll-row-h: var(--sp-6); --roll-gutter: var(--sp-23); }
.cbdaw-roll[data-variant="expanded"] { --roll-row-h: var(--sp-12); --roll-gutter: var(--sp-39); }

.cbdaw-roll__toolbar {
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-6);
  flex-wrap: var(--flexwrap-wrap);
  font-size: var(--fs-base);
  color: var(--text-dim);
}
.cbdaw-roll[data-variant="compact"] .cbdaw-roll__toolbar { font-size: var(--fs-xs); gap: var(--sp-4); }
.cbdaw-roll__toolbar button {
  font: var(--font-inherit);
  font-weight: var(--w-med);
  color: var(--text);
  background: var(--bg);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-ctl);
  padding: var(--sp-1h) var(--sp-4);
  cursor: var(--cur-pointer);
}
.cbdaw-roll__toolbar button:hover { border-color: var(--accent); }
.cbdaw-roll__toolbar button[aria-pressed="true"] {
  background: var(--accent);
  color: var(--bg);
  border-color: var(--accent);
}
.cbdaw-roll__readout {
  font-variant-numeric: var(--num-tabular);
  font-weight: var(--w-bold);
  color: var(--text);
  min-width: var(--sp-ch-4);
}

.cbdaw-roll__body {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  gap: var(--sp-1);
  background: var(--bg);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-ctl);
  padding: var(--sp-2);
  overflow: var(--ov-hidden);
}

/* Every stripe below is one row: a gutter cell of fixed width and a field that fills the
   rest. The ruler uses the identical two-part shape, which is what keeps a note's percentage
   position and a ruler cell's flex position on the same vertical line without pixel math. */
.cbdaw-roll__stripe { display: var(--disp-flex); align-items: var(--align-stretch); }
.cbdaw-roll__gutter {
  flex: var(--flex-0-0-auto);
  width: var(--roll-gutter);
  min-width: var(--roll-gutter);
  padding-right: var(--sp-2);
  box-sizing: var(--box-border-box);
}
.cbdaw-roll__field { flex: var(--flex-1-1-auto); position: var(--pos-relative); }

/* ---- the ruler: §13.3's labels, drawn by beat group so triplets and 16ths land on the
   same beat boundaries — §13.2, "not two grid implementations." ---- */
.cbdaw-roll__ruler { display: var(--disp-flex); gap: var(--sp-hair); }
.cbdaw-roll__bar {
  flex: var(--flex-1-1-0);
  display: var(--disp-flex);
  gap: var(--sp-hair);
  border-left: calc(var(--bw) * 2) solid var(--line);
  padding-left: var(--sp-hair);
}
.cbdaw-roll__bar:first-child { border-left: var(--none); padding-left: var(--sp-0); }
.cbdaw-roll__beat {
  flex: var(--flex-1-1-0);
  display: var(--disp-flex);
  gap: var(--sp-hair);
  border-left: var(--bw) solid var(--line);
  padding-left: var(--sp-hair);
}
.cbdaw-roll__beat:first-child { border-left: var(--none); padding-left: var(--sp-0); }
.cbdaw-roll__ruler-cell {
  flex: var(--flex-1-1-0);
  text-align: var(--ta-center);
  font-size: var(--fs-sm);
  font-variant-numeric: var(--num-tabular);
  color: var(--text-dim);
  padding: var(--sp-1) 0;
  border-radius: var(--r-cell);
}
.cbdaw-roll[data-variant="compact"] .cbdaw-roll__ruler-cell { font-size: var(--fs-micro); padding: var(--sp-hair) 0; }
.cbdaw-roll[data-variant="expanded"] .cbdaw-roll__ruler-cell { font-size: var(--fs-2xl); padding: var(--sp-2) 0; }
.cbdaw-roll__ruler-cell[data-beat="true"] { color: var(--text); font-weight: var(--w-bold); }
.cbdaw-roll[data-variant="expanded"] .cbdaw-roll__ruler-cell[data-beat="true"] { font-size: var(--fs-3xl); }
/* SEAT QUESTION 4 — "note length must relate to the ruler." While a note is drawn or
   resized, the ruler cells it covers light up. The length is read in the counting labels the
   student already says out loud. */
.cbdaw-roll__ruler-cell[data-span="true"] {
  color: var(--bg);
  background: var(--accent);
  font-weight: var(--w-bold);
}

/* ---- the pitch rows ---- */
.cbdaw-roll__rows { position: var(--pos-relative); }
.cbdaw-roll__row {
  display: var(--disp-flex);
  align-items: var(--align-stretch);
  height: var(--roll-row-h);
  box-sizing: var(--box-border-box);
}
.cbdaw-roll__row-label {
  flex: var(--flex-0-0-auto);
  width: var(--roll-gutter);
  min-width: var(--roll-gutter);
  box-sizing: var(--box-border-box);
  display: var(--disp-flex);
  align-items: var(--align-center);
  justify-content: var(--justify-flex-end);
  gap: var(--sp-2);
  padding-right: var(--sp-2h);
  font-size: var(--fs-xs);
  line-height: var(--lh-none);
  color: var(--text-dim);
  overflow: var(--ov-hidden);
  white-space: var(--ws-nowrap);
}
.cbdaw-roll[data-variant="expanded"] .cbdaw-roll__row-label { font-size: var(--fs-lg); }
.cbdaw-roll__row[data-inkey="true"] .cbdaw-roll__row-label { color: var(--text); font-weight: var(--w-med); }

/* THE SHADING. --row-deg is whatever token theory/scale.js named for this degree. */
.cbdaw-roll__row-cell {
  flex: var(--flex-1-1-auto);
  border-top: var(--bw) solid var(--line);
  border-left-width: var(--bw-3);
  border-left-style: var(--line-solid);
  border-left-color: var(--color-transparent);
  box-sizing: var(--box-border-box);
}
.cbdaw-roll__row[data-inkey="true"] .cbdaw-roll__row-cell {
  background: color-mix(in srgb, var(--row-deg) 17%, var(--panel));
  border-left-color: var(--row-deg);
}
.cbdaw-roll__row[data-inkey="false"] .cbdaw-roll__row-cell {
  background: color-mix(in srgb, var(--panel) 45%, var(--bg));
}
/* the tonic reads louder than the other six — it is the row everything else is measured from */
.cbdaw-roll__row[data-degree-index="0"] .cbdaw-roll__row-cell {
  background: color-mix(in srgb, var(--row-deg) 30%, var(--panel));
}
/* The non-color cue tokens.css asked P3 for. Border STYLE, not hue, not a glyph. */
.cbdaw-roll__row[data-quality="major"] .cbdaw-roll__row-cell { border-left-style: var(--line-solid); }
.cbdaw-roll__row[data-quality="minor"] .cbdaw-roll__row-cell { border-left-style: var(--line-dashed); }
.cbdaw-roll__row[data-quality="diminished"] .cbdaw-roll__row-cell { border-left-style: var(--line-dotted); }
.cbdaw-roll__row[data-quality="augmented"] .cbdaw-roll__row-cell { border-left-style: var(--line-double); border-left-width: var(--bw-5); }
.cbdaw-roll__row[data-quality="altered"] .cbdaw-roll__row-cell { border-left-style: var(--line-groove); border-left-width: var(--bw-5); }
/* §4's 'altered' — "the student moved this degree" is a DIFFERENT fact from the quality,
   and tokens.css is explicit that no token may be overloaded. It gets its own mark. */
.cbdaw-roll__row[data-altered="true"] .cbdaw-roll__row-label { text-decoration: var(--td-underline); }

/* ---- the note layer, one absolutely positioned box per §7 note ---- */
.cbdaw-roll__notes {
  position: var(--pos-absolute);
  inset: var(--sp-0);
  pointer-events: var(--pe-none);
}
.cbdaw-roll__note {
  position: var(--pos-absolute);
  box-sizing: var(--box-border-box);
  pointer-events: var(--pe-auto);
  border: var(--bw) solid var(--bg);
  border-radius: var(--r-sm);
  overflow: var(--ov-hidden);
  cursor: var(--cur-grab);
  touch-action: var(--touch-none);
  background: color-mix(in srgb, var(--note-deg) 40%, var(--panel));
}
.cbdaw-roll__note[data-inkey="false"] { background: color-mix(in srgb, var(--text-dim) 40%, var(--panel)); }
.cbdaw-roll__note[data-selected="true"] { border-color: var(--accent); }
/* SEAT QUESTION 5 — velocity is the fill height, exactly as step-grid.js draws it, so one
   gesture vocabulary covers both machines. */
.cbdaw-roll__note-fill {
  position: var(--pos-absolute);
  left: var(--sp-0);
  right: var(--sp-0);
  bottom: var(--sp-0);
  background: var(--note-deg);
  opacity: var(--op-soft);
}
.cbdaw-roll__note[data-inkey="false"] .cbdaw-roll__note-fill { background: var(--text-dim); }
/* §13.5's off-grid mark, the same [data-off-grid] convention step-grid.js already ships:
   a captured hit that did not land on the grid is KEPT at its true tick and shown as such. */
.cbdaw-roll__note[data-off-grid="true"] { box-shadow: inset 0 0 0 2px var(--warn); }
/* the length handle */
.cbdaw-roll__note-handle {
  position: var(--pos-absolute);
  top: var(--sp-0);
  bottom: var(--sp-0);
  right: var(--sp-0);
  width: ${RESIZE_ZONE_PX}px;
  cursor: var(--cur-ew-resize);
  background: color-mix(in srgb, var(--text) 25%, transparent);
}

/* ---- gridlines ---- */
.cbdaw-roll__lines { position: var(--pos-absolute); inset: var(--sp-0); pointer-events: var(--pe-none); }
.cbdaw-roll__line {
  position: var(--pos-absolute);
  top: var(--sp-0);
  bottom: var(--sp-0);
  width: var(--sp-hair);
  background: color-mix(in srgb, var(--line) 55%, transparent);
}
.cbdaw-roll__line[data-beat="true"] { background: var(--line); }
.cbdaw-roll__line[data-bar="true"] { background: var(--text-dim); width: var(--sp-1); }

/* ---- SEAT QUESTION 5's second half: the velocity lane ---- */
.cbdaw-roll__vel { height: calc(var(--roll-row-h) * 2.5); }
.cbdaw-roll__vel .cbdaw-roll__field {
  background: var(--panel);
  border-top: var(--bw) solid var(--line);
}
.cbdaw-roll__vel-bar {
  position: var(--pos-absolute);
  bottom: var(--sp-0);
  width: var(--sp-2h);
  margin-left: -2px;
  background: var(--accent);
  border-radius: var(--r-cell) var(--r-cell) 0 0;
  cursor: var(--cur-ns-resize);
  touch-action: var(--touch-none);
}
.cbdaw-roll__vel-bar[data-selected="true"] { background: var(--text); }

/* ---- the playhead: a VISUAL, driven by rAF, that schedules nothing (§3, §10) ---- */
.cbdaw-roll__playhead {
  position: var(--pos-absolute);
  top: var(--sp-0);
  bottom: var(--sp-0);
  width: var(--sp-1);
  background: var(--accent);
  box-shadow: 0 0 4px var(--accent);
  pointer-events: var(--pe-none);
  will-change: var(--wc-left);
}
/* §9: "Standalone views may animate. DAW views stay still." */
.cbdaw-roll[data-variant="compact"] .cbdaw-roll__playhead { box-shadow: var(--none); }
`;

function acquireStyle() {
  liveInstances++;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
}

function releaseStyle() {
  liveInstances = Math.max(0, liveInstances - 1);
  if (liveInstances > 0) return;
  document.getElementById(STYLE_ID)?.remove();
}

// =========================================================================================
// 4 · THE COMPONENT
// =========================================================================================

export default class PianoRoll {
  static id = 'piano-roll';
  static label = 'Piano Roll';

  /**
   * @param el     mount target, or null and pass one to `mount()`.
   * @param clock  the shared transport by default; a test page may hand in its own, the
   *               same allowance every other seat's constructor makes. READ ONLY — this
   *               file never calls `play`, `stop`, `seek`, `schedule`, or `on('tick')`.
   */
  constructor(el = null, clock = sharedClock) {
    this._clock = clock;
    this.defaultTarget = el;
    this.variant = 'expanded';
    this.mounted = false;

    /** SEAT QUESTION 2 — Brandon's decision: the standalone shows a chromatic roll AND a
     *  diatonic roll, both with diatonic shading; the DAW shows one roll. Both modes live
     *  in this one file and a page decides by constructing two instances. */
    this._rows = 'chromatic';

    /** §4's scale object. Replaced wholesale by `setScale`/the 'scale' subscription — never
     *  mutated in place, because `theory/scale.js`'s mutators are pure and return a NEW
     *  scale. Defaults to C Major, §7's own default header value. */
    this._scale = createScale(0, 'Major');
    this._state = null;
    this._stateUnsub = null;

    /** §6, and this surface has BOTH of §6's axes because it is the only surface that is a
     *  pitch surface and a rhythm surface at once. §6's own words: "Per-surface toggle.
     *  There is no global overlay setting." Two per-instance properties, one per axis, each
     *  taking exactly the enumeration §6 gives it. Flagged in the receipt. */
    this._overlay = 'letter';       // 'none' | 'letter' | 'number' | 'solfege'  (pitch)
    this._rulerOverlay = 'syllable'; // 'none' | 'syllable'                       (rhythm)

    this._division = DEFAULT_DIVISION;
    this._bars = 1;
    this._octaves = DEFAULT_OCTAVES;
    this._baseOctave = DEFAULT_BASE_OCTAVE;

    /** §7 `channels[].notes[]` — the four frozen fields, and this file adds no fifth. */
    this._notes = [];
    this._selected = null;

    /** Which of `_notes` arrived from a bound `core/capture.js`, held by OBJECT IDENTITY so
     *  §7's four fields stay four — no marker key is written onto a note. Read by
     *  `_onCaptureCommit` only, to tell a `'requantize'` RESTATEMENT from a delta. */
    this._captureNotes = new Set();

    this._captureUnsub = null;

    this._lastTs = { top: clock.timeSignature.top, bottom: clock.timeSignature.bottom };

    this.el = null;
    this.nodes = {
      toolbar: null, body: null, ruler: null, rows: null, notes: null, lines: null,
      playhead: null, velField: null, velPlayhead: null, readout: null,
    };
    this._rowEls = [];
    this._noteEls = new Map();  // note object -> {el, fill, bar}
    this._domListeners = [];
    this._dragListenersOn = false;
    this._drag = null;
    this._rafHandle = null;

    this._rafLoop = this._rafLoop.bind(this);
    this._onScaleEvent = this._onScaleEvent.bind(this);
    this._onCaptureCommit = this._onCaptureCommit.bind(this);
  }

  // =======================================================================================
  // SEAT QUESTION 7 — it follows scale changes LIVE
  // =======================================================================================
  // §4: `state.on('scale', fn)` — "every surface subscribes." This surface was built one
  // stage before `core/state.js` existed, so it bound to the §4 SHAPE by duck type rather
  // than importing a module that was not there: hand it anything carrying `.scale` and
  // `.on('scale', fn)` and it subscribes; hand it nothing and `setScale()` drives it
  // directly.
  //
  // `core/state.js` IS BUILT NOW, AND THIS CODE DID NOT HAVE TO CHANGE — `bindState(state)`
  // was already the call site, the real store's `on` returns the unsubscribe this expects,
  // and its 'scale' payload is the new scale, which `_onScaleEvent` already handles. The
  // duck type stays: a piano roll is also driven straight by `setScale()` (a preview, a
  // second scale) and §12.1 keeps this surface from importing a singleton of its own.

  /** @param state anything with `{ scale, on('scale', fn) }` — §4's shape. */
  bindState(state) {
    this.unbindState();
    if (!state) return this;
    this._state = state;
    if (state.scale) this.setScale(state.scale);
    const off = state.on?.('scale', this._onScaleEvent);
    this._stateUnsub = typeof off === 'function'
      ? off
      : () => state.off?.('scale', this._onScaleEvent);
    return this;
  }

  unbindState() {
    if (this._stateUnsub) this._stateUnsub();
    this._stateUnsub = null;
    this._state = null;
    return this;
  }

  /** The 'scale' payload is not fixed by §4 — it may be the scale, or nothing at all with
   *  the new value on `state.scale`. Both are handled; neither is assumed. */
  _onScaleEvent(payload) {
    this.setScale(payload?.scale ?? payload ?? this._state?.scale);
  }

  get scale() {
    return this._scale;
  }

  /** Replaces the scale and redraws the shading. Deliberately does NOT rebuild the note
   *  layer's geometry: a note's pitch and tick are unchanged by a scale edit — only how the
   *  row underneath it is COLORED and LABELLED changes. Altering a degree on the circle
   *  moves the shading and leaves the music alone, which is the behaviour seat question 7
   *  is asking for. */
  setScale(scale) {
    if (!scale || !Array.isArray(scale.degrees)) return this;
    this._scale = scale;
    if (this.mounted) {
      this._renderRows();
      this._renderNotes();
    }
    return this;
  }

  // =======================================================================================
  // SEAT QUESTION 2 — chromatic rows and diatonic rows, one file
  // =======================================================================================

  get rows() {
    return this._rows;
  }

  set rows(mode) {
    const next = mode === 'diatonic' ? 'diatonic' : 'chromatic';
    if (next === this._rows) return;
    this._rows = next;
    if (this.mounted) {
      this.el.dataset.rows = next;
      this._renderRows();
      this._renderNotes();
      this._syncToolbar();
    }
  }

  get octaves() { return this._octaves; }

  set octaves(n) {
    const next = clampOctaves(n);
    if (next === this._octaves) return;
    this._octaves = next;
    if (this.mounted) { this._renderRows(); this._renderNotes(); }
  }

  get baseOctave() { return this._baseOctave; }

  set baseOctave(n) {
    const v = Math.round(Number(n));
    if (!Number.isFinite(v) || v === this._baseOctave) return;
    this._baseOctave = v;
    if (this.mounted) { this._renderRows(); this._renderNotes(); }
  }

  /** The lowest drawn row: the tonic, in `baseOctave`. Every row position below is measured
   *  from here, which is what makes the whole grid follow a tonic change for free. */
  _rootMidi() {
    return midiOf(this._scale.tonic, this._baseOctave);
  }

  /**
   * The drawn pitches, LOW to HIGH.
   *   chromatic — seat question 1, Brandon: "Is it always 12 chromatic rows? Yes."
   *               Exactly 12 per octave, in-key and out-of-key alike. Nothing is hidden.
   *   diatonic  — §4's seven stored degrees per octave, in degree order. `pitchClasses()`
   *               can legitimately hold a REPEAT once a student moves one degree onto
   *               another (scale.js says so and says not to "fix" it); this walks
   *               `degrees` directly for the same reason, so two rows can share a pitch
   *               and the student sees exactly what their own +/- did.
   */
  _rowPitches() {
    const root = this._rootMidi();
    const out = [];
    if (this._rows === 'diatonic') {
      for (let o = 0; o < this._octaves; o++) {
        for (let i = 0; i < DIATONIC_ROWS_PER_OCTAVE; i++) {
          out.push(root + this._scale.degrees[i] + 12 * o);
        }
      }
      return out;
    }
    for (let o = 0; o < this._octaves; o++) {
      for (let s = 0; s < CHROMATIC_ROWS_PER_OCTAVE; s++) out.push(root + s + 12 * o);
    }
    return out;
  }

  /**
   * §6's `opts.position` — the 1-based SLOT this surface is drawing, in degree order.
   * §15.2c: "It exists for exactly one reason: '8'. The same pitch class is '1' at the
   * bottom of an octave and '8' at the top, and that is a property of the SLOT, not of the
   * pitch, so the surface must say which slot it is asking about."
   *
   * Both row modes produce the same arithmetic: degree index within the octave, plus seven
   * per octave above the bottom row. A tonic one octave up therefore lands on position 8 and
   * `label()` returns `'8'` — a PLAIN DIGIT, per M-10's ruling that the circle's `'1/8'`
   * composite is the circle's alone.
   */
  _rowPosition(midi) {
    const i = degreeIndexOf(this._scale, midi);
    if (i < 0) return null;
    const octaveOffset = Math.floor((midi - this._rootMidi()) / 12);
    return i + 1 + DIATONIC_ROWS_PER_OCTAVE * octaveOffset;
  }

  // =======================================================================================
  // SEAT QUESTION 3 — the ruler. §13.3's numbers and syllables, not this file's.
  // =======================================================================================

  get division() { return this._division; }

  /** §13.2: "the same `stepToTicks()` with a 3 where a 4 was." No `if (isTriplet)` branch
   *  exists in this file outside the label lookup `stepLabel` already owns and the number of
   *  ruler cells drawn — the two places §13.2 explicitly allows. */
  setDivision(division) {
    const next = clampDivision(division);
    if (next === this._division) return this;
    this._division = next;
    if (this.mounted) { this._renderRuler(); this._renderLines(); this._syncToolbar(); }
    return this;
  }

  get bars() { return this._bars; }

  set bars(n) {
    const next = clampBars(n);
    if (next === this._bars) return;
    this._bars = next;
    if (this.mounted) this._renderAll();
  }

  /** §6, pitch axis. */
  get overlay() { return this._overlay; }

  set overlay(mode) {
    const allowed = ['none', 'letter', 'number', 'solfege'];
    this._overlay = allowed.includes(mode) ? mode : 'none';
    if (this.mounted) { this._renderRowLabels(); this._syncToolbar(); }
  }

  /** §6, rhythm axis. */
  get rulerOverlay() { return this._rulerOverlay; }

  set rulerOverlay(mode) {
    this._rulerOverlay = mode === 'syllable' ? 'syllable' : 'none';
    if (this.mounted) { this._renderRuler(); this._syncToolbar(); }
  }

  // =======================================================================================
  // NOTE DATA — §7's four frozen fields, and SEAT QUESTION 9's inbound path
  // =======================================================================================

  /** A deep copy in §7 order. Safe for a project writer to hold. */
  getNotes() {
    return this._notes.map((n) => ({ ...n })).sort(byPosition);
  }

  /** §7 `channels[].notes[]`, exactly — the same four keys `capture.toProjectNotes()`
   *  produces, so a take that went through capture and a part typed in here serialize
   *  identically. */
  toProjectNotes() {
    return this.getNotes().map(({ tick, length, note, velocity }) => ({ tick, length, note, velocity }));
  }

  setNotes(notes) {
    this._notes = Array.isArray(notes) ? notes.map(toNote).filter(Boolean) : [];
    this._captureNotes.clear();
    this._selected = null;
    if (this.mounted) this._renderNotes();
    return this;
  }

  /** SEAT QUESTION 9 — captured notes land correctly.
   *  §13.5's amended ruling, Brandon: "default snap in programming, default slop in
   *  performance." A note arriving here from `capture.js` KEEPS ITS TRUE TICK — it is never
   *  quantized on the way in, it is drawn at exactly where it was played, and it is marked
   *  off-grid if it does not sit on this roll's current step boundary. A note a student
   *  CLICKS into the field snaps, in `_createNote()`. Same file, two defaults, per the
   *  ruling. */
  addNotes(notes) {
    return this._pushNotes(notes, false);
  }

  /** The shared body of `addNotes()` and the capture seam. `fromCapture` records each
   *  accepted note in `_captureNotes`, so a later `'requantize'` restatement can replace
   *  exactly the notes capture put here and leave a student's hand-clicked notes alone.
   *  The Set holds the note objects this file already stores — no fifth key is added. */
  _pushNotes(notes, fromCapture) {
    if (!Array.isArray(notes)) return this;
    for (const raw of notes) {
      const n = toNote(raw);
      if (!n) continue;
      this._notes.push(n);
      if (fromCapture) this._captureNotes.add(n);
    }
    this._notes.sort(byPosition);
    if (this.mounted) this._renderNotes();
    return this;
  }

  /** Subscribe to a `core/capture.js` instance. `capture.on()` returns its own unsubscribe
   *  (verified in that file), which is kept so `dispose()` leaks nothing. `capture.js` is
   *  READ ONLY for this seat — subscribed to, never reached into, never edited. */
  bindCapture(capture) {
    this.unbindCapture();
    if (!capture?.on) return this;
    this._captureUnsub = capture.on('commit', this._onCaptureCommit);
    return this;
  }

  unbindCapture() {
    if (this._captureUnsub) this._captureUnsub();
    this._captureUnsub = null;
    return this;
  }

  /** `capture.js`'s commit report carries `notes[]` with two metadata keys beyond §7's four
   *  (`source`, `lane`). `toNote()` narrows them off — §5's rule that nothing downstream may
   *  branch on `source` is honoured by this surface never seeing it.
   *
   *  IT BRANCHES ON `kind`, BECAUSE THE THREE KINDS DO NOT MEAN THE SAME THING. Read out of
   *  `core/capture.js` (frozen, P2) — four values reach here, not three:
   *    · `'record'`      — `_commit()`, the notes of THIS take            → a DELTA, append
   *    · `'capture'`     — `keepLast()`/`_commit()`, the notes of THIS take → a DELTA, append
   *                        (a refused `keepLast` sends `notes: []` — appends nothing)
   *    · `'discard'`     — `discardTake()`, always `notes: []`            → nothing to do
   *    · `'requantize'`  — `requantize()` re-states EVERY note of EVERY take
   *                        (`for (const take of this._takes) all.push(...take.notes)`)
   *                        → a RESTATEMENT, replace
   *  Before this branch existed, a requantize appended a second copy of everything already
   *  on the roll. Replacing wholesale would be the other bug — it would delete the notes a
   *  student CLICKED in, which capture has never heard of — so only the notes this seam put
   *  here are withdrawn, by object identity, and the restatement takes their place. */
  _onCaptureCommit(report) {
    const notes = Array.isArray(report?.notes) ? report.notes : [];
    if (report?.kind === 'discard') return this;
    if (report?.kind === 'requantize') {
      if (this._captureNotes.size) {
        this._notes = this._notes.filter((n) => !this._captureNotes.has(n));
        this._captureNotes.clear();
        if (this._selected && !this._notes.includes(this._selected)) this._selected = null;
      }
      return this._pushNotes(notes, true);
    }
    return this._pushNotes(notes, true);
  }

  clear() {
    return this.setNotes([]);
  }

  // =======================================================================================
  // GEOMETRY — one tick span, one percentage, everything hangs off these
  // =======================================================================================

  _ts() {
    return this._clock.timeSignature;
  }

  _totalTicks() {
    return this._bars * ticksPerBar(this._ts());
  }

  _stepTicks() {
    return ticksPerStep(this._division, this._ts());
  }

  _stepsPerBar() {
    return this._ts().top * this._division;
  }

  _pct(ticks) {
    const total = this._totalTicks();
    return total > 0 ? (ticks / total) * 100 : 0;
  }

  /** Nearest step boundary. §13.1's `stepToTicks` arithmetic, integer-exact at every
   *  supported division because 480 = 2⁵·3·5. */
  _snap(tick) {
    const s = this._stepTicks();
    return s > 0 ? Math.round(tick / s) * s : tick;
  }

  /** §13.5's off-grid test, derived rather than stored: this file's notes carry §7's four
   *  fields and nothing else, so "off-grid" is a question about the tick, not a flag. */
  _isOffGrid(note) {
    const s = this._stepTicks();
    return s > 0 && mod(note.tick, s) !== 0;
  }

  /**
   * ⛔ BRANDON — see `DURATION_NAMES`. Returns '' until he rules on note-value naming.
   * The length is still fully shown: as the note's own width, and as the ruler cells it
   * lights up while it is dragged.
   */
  _durationName(lengthTicks) {
    return DURATION_NAMES[lengthTicks] ?? '';
  }

  // =======================================================================================
  // SEAT QUESTION 10 — compact and expanded
  // =======================================================================================
  // Compact is the DAW lane: short rows, a narrow gutter, no bar controls, no glow on the
  // playhead (§9: "DAW views stay still"). Expanded is the standalone: rows and ruler large
  // enough to read from the back of a classroom, which is §9's own test for every surface.

  mount(el = this.defaultTarget, variant = 'expanded') {
    if (this.mounted) this.unmount();
    const target = el || this.defaultTarget;
    if (!target) throw new Error('PianoRoll.mount: no element to mount into');

    this.defaultTarget = target;
    this.variant = variant === 'compact' ? 'compact' : 'expanded';
    acquireStyle();
    this._build(target);
    this._renderAll();

    this._rafHandle = requestAnimationFrame(this._rafLoop);
    this.mounted = true;
    return this;
  }

  mountCompact(el = this.defaultTarget) { return this.mount(el, 'compact'); }

  mountExpanded(el = this.defaultTarget) { return this.mount(el, 'expanded'); }

  unmount() {
    if (!this.mounted) return this;
    if (this._rafHandle !== null) cancelAnimationFrame(this._rafHandle);
    this._rafHandle = null;
    this._detachInteraction();
    this.el?.remove();
    this.el = null;
    this.nodes = {
      toolbar: null, body: null, ruler: null, rulerField: null, rows: null, notes: null,
      lines: null, playhead: null, velField: null, velPlayhead: null, readout: null,
    };
    this._rowEls = [];
    this._noteEls.clear();
    this.mounted = false;
    releaseStyle();
    return this;
  }

  /** The same shape every other file's `dispose()` returns: zero leaked DOM listeners, zero
   *  leaked subscriptions, zero leaked rAF handle. There is no clock subscription to drop —
   *  this file never made one. */
  dispose() {
    const domListeners = this._domListeners.length;
    const hadRaf = this._rafHandle !== null ? 1 : 0;
    const hadState = this._stateUnsub ? 1 : 0;
    const hadCapture = this._captureUnsub ? 1 : 0;
    this.unbindState();
    this.unbindCapture();
    this.unmount();
    return {
      domListeners,
      rafCancelled: hadRaf,
      stateSubscriptionsDropped: hadState,
      captureSubscriptionsDropped: hadCapture,
      audioScheduled: 0, // §10 — stated as a number because it is checkable
    };
  }

  // =======================================================================================
  // 5 · BUILDING AND DRAWING
  // =======================================================================================

  _build(target) {
    const root = document.createElement('div');
    root.className = 'cbdaw-roll';
    root.dataset.variant = this.variant;
    root.dataset.rows = this._rows;

    const toolbar = document.createElement('div');
    toolbar.className = 'cbdaw-roll__toolbar';
    toolbar.innerHTML = `
      <button type="button" data-act="rows" aria-pressed="false"></button>
      <button type="button" data-act="triplet" aria-pressed="false">3</button>
      <button type="button" data-act="overlay"></button>
      <button type="button" data-act="ruler-overlay" aria-pressed="true">e + a</button>
      <span class="cbdaw-roll__readout" data-readout="duration"></span>
      ${this.variant === 'expanded' ? `
        <span>
          <button type="button" data-act="bars-">-</button>
          <span class="cbdaw-roll__readout" data-readout="bars"></span>
          <button type="button" data-act="bars+">+</button>
        </span>
        <span>
          <button type="button" data-act="oct-">-</button>
          <span class="cbdaw-roll__readout" data-readout="octaves"></span>
          <button type="button" data-act="oct+">+</button>
        </span>` : ''}
    `;
    root.appendChild(toolbar);

    const body = document.createElement('div');
    body.className = 'cbdaw-roll__body';

    // --- ruler stripe
    const rulerStripe = document.createElement('div');
    rulerStripe.className = 'cbdaw-roll__stripe';
    rulerStripe.innerHTML =
      '<div class="cbdaw-roll__gutter"></div><div class="cbdaw-roll__field"><div class="cbdaw-roll__ruler"></div></div>';
    body.appendChild(rulerStripe);

    // --- pitch rows + note layer + playhead
    const rowsStripe = document.createElement('div');
    rowsStripe.className = 'cbdaw-roll__stripe';
    const rowsGutterAndRows = document.createElement('div');
    rowsGutterAndRows.className = 'cbdaw-roll__rows';
    rowsGutterAndRows.style.flex = 'var(--flex-1-1-auto)';
    rowsStripe.appendChild(rowsGutterAndRows);
    body.appendChild(rowsStripe);

    const lines = document.createElement('div');
    lines.className = 'cbdaw-roll__lines';
    const notes = document.createElement('div');
    notes.className = 'cbdaw-roll__notes';
    const playhead = document.createElement('div');
    playhead.className = 'cbdaw-roll__playhead';
    playhead.style.left = 'var(--pct-0)';

    // --- velocity lane
    const velStripe = document.createElement('div');
    velStripe.className = 'cbdaw-roll__stripe cbdaw-roll__vel';
    velStripe.innerHTML =
      '<div class="cbdaw-roll__gutter"></div><div class="cbdaw-roll__field"></div>';
    body.appendChild(velStripe);
    const velPlayhead = document.createElement('div');
    velPlayhead.className = 'cbdaw-roll__playhead';
    velPlayhead.style.left = 'var(--pct-0)';
    velStripe.querySelector('.cbdaw-roll__field').appendChild(velPlayhead);

    root.appendChild(body);

    this.el = root;
    this.nodes.toolbar = toolbar;
    this.nodes.body = body;
    this.nodes.ruler = rulerStripe.querySelector('.cbdaw-roll__ruler');
    this.nodes.rulerField = rulerStripe.querySelector('.cbdaw-roll__field');
    this.nodes.rows = rowsGutterAndRows;
    this.nodes.lines = lines;
    this.nodes.notes = notes;
    this.nodes.playhead = playhead;
    this.nodes.velField = velStripe.querySelector('.cbdaw-roll__field');
    this.nodes.velPlayhead = velPlayhead;
    this.nodes.readout = toolbar.querySelector('[data-readout="duration"]');

    target.appendChild(root);
    this._attachInteraction();
  }

  _renderAll() {
    this._renderRuler();
    this._renderRows();
    this._renderLines();
    this._renderNotes();
    this._syncToolbar();
  }

  /**
   * SEAT QUESTION 3 — the ruler, and the reason this file imports from `step-grid.js`.
   *
   * §13.3, verbatim: "Three surfaces, one function ... PHASE.md is explicit: the drum
   * machine and the piano roll must use the same numbers and the same syllables." The
   * function is `stepLabel`, exported by `surfaces/step-grid.js`. This file calls it and
   * composes nothing. The DRAWING is deliberately the same shape as that file's `_renderRuler`
   * too — beat groups of `division` cells, and `this._rulerOverlay === 'syllable' || c === 0`
   * deciding whether a subdivision cell prints — so the two rulers are identical character
   * for character at every division, not merely similar.
   *
   * ONE DIFFERENCE, AND IT IS A FIX, NOT A DIVERGENCE: this ruler draws `bars * ts.top` beat
   * groups where `step-grid.js` draws `ts.top`. At `bars > 1` a single-bar ruler stops lining
   * up with the field beneath it. §13.3 fixes the LABELS and says nothing about how many bars
   * are drawn; the digit still restarts each bar ("counting up to `ts.top` and restarting
   * each bar"), which is exactly what passing a bar-relative `step` to `stepLabel` produces.
   * Reported as a finding against `step-grid.js` in the receipt — not fixed there.
   */
  _renderRuler() {
    const ruler = this.nodes.ruler;
    if (!ruler) return;
    ruler.textContent = '';
    const top = this._ts().top;
    const division = this._division;

    for (let bar = 0; bar < this._bars; bar++) {
      const barEl = document.createElement('div');
      barEl.className = 'cbdaw-roll__bar';
      for (let b = 0; b < top; b++) {
        const group = document.createElement('div');
        group.className = 'cbdaw-roll__beat';
        for (let c = 0; c < division; c++) {
          const stepInBar = b * division + c;
          const cell = document.createElement('div');
          cell.className = 'cbdaw-roll__ruler-cell';
          cell.dataset.beat = String(c === 0);
          cell.dataset.step = String(bar * this._stepsPerBar() + stepInBar);
          cell.textContent =
            this._rulerOverlay === 'syllable' || c === 0 ? stepLabel(stepInBar, division) : '';
          group.appendChild(cell);
        }
        barEl.appendChild(group);
      }
      ruler.appendChild(barEl);
    }
  }

  /**
   * SEAT QUESTION 1 — 12 chromatic rows, in-key shaded, out-of-key dimmed.
   * SEAT QUESTION 6 — every color here is a token NAME that `theory/scale.js` chose, and
   * every string here came out of `label()`. This method picks neither.
   */
  _renderRows() {
    const host = this.nodes.rows;
    if (!host) return;
    host.textContent = '';
    this._rowEls = [];

    const pitches = this._rowPitches();
    // drawn high to low, the way a keyboard stands up on its side
    for (let idx = pitches.length - 1; idx >= 0; idx--) {
      const midi = pitches[idx];
      const row = document.createElement('div');
      row.className = 'cbdaw-roll__row';
      row.dataset.midi = String(midi);

      const inKey = isInKey(this._scale, midi);
      row.dataset.inkey = String(inKey);

      if (inKey) {
        const i = degreeIndexOf(this._scale, midi);
        row.dataset.degreeIndex = String(i);
        // §4: "a degree is colored by the quality of THE TRIAD built on it" — computed in
        // theory/scale.js, read here. This file does not know what a triad is.
        row.dataset.quality = degreeQuality(this._scale, i);
        row.style.setProperty('--row-deg', `var(${degreeColor(this._scale, i)})`);
        // §4's `altered` is a DIFFERENT fact from the quality and gets its own mark.
        row.dataset.altered = String(!!this._scale.altered?.[i]);
      }

      const labelEl = document.createElement('div');
      labelEl.className = 'cbdaw-roll__row-label';
      const cell = document.createElement('div');
      cell.className = 'cbdaw-roll__row-cell';
      row.appendChild(labelEl);
      row.appendChild(cell);
      host.appendChild(row);
      this._rowEls.push({ el: row, labelEl, midi });
    }

    // The note layer, the gridlines and the playhead sit over the rows' own field area,
    // inset by the gutter so a percentage tick position lands on the right pixel.
    for (const layer of [this.nodes.lines, this.nodes.notes, this.nodes.playhead]) {
      if (!layer) continue;
      layer.style.left = 'var(--roll-gutter)';
      host.appendChild(layer);
    }

    this._renderRowLabels();
  }

  /**
   * §6, pitch axis. Every string below is `label()`'s. M-10: plain digits, `'8'` only at an
   * octave-closing `position` — the circle's `'1/8'` composite does not reach this surface.
   * An out-of-key row draws `''` under `number` and `solfege` (§6/D-17) and a chromatic
   * spelling under `letter` (A11), all decided inside `theory/scale.js`.
   *
   * `innerHTML`, not `textContent`, and the reason is on the record: `scale.js`'s `GLYPH`
   * table carries MARKUP for the ±2 rows (`<i>bb</i>`, `<i>x</i>`, A7's italic double
   * accidentals) and that file's own header flags it — "a surface drawing these with
   * `textContent` prints the tags literally." The string is sanitised by construction: it is
   * assembled from `LETTERS`, `SOLFEGE`, `GLYPH` and digits, all frozen module constants, and
   * no student input reaches it.
   */
  _renderRowLabels() {
    for (const row of this._rowEls) {
      const position = this._rowPosition(row.midi);
      row.labelEl.innerHTML = pitchLabel(
        this._scale,
        row.midi,
        this._overlay,
        position === null ? {} : { position },
      );
    }
  }

  _renderLines() {
    const lines = this.nodes.lines;
    if (!lines) return;
    lines.textContent = '';
    const stepsPerBar = this._stepsPerBar();
    const total = stepsPerBar * this._bars;
    const stepT = this._stepTicks();
    for (let s = 0; s < total; s++) {
      const el = document.createElement('div');
      el.className = 'cbdaw-roll__line';
      el.dataset.beat = String(s % this._division === 0);
      el.dataset.bar = String(s % stepsPerBar === 0);
      el.style.left = `${this._pct(s * stepT)}%`;
      lines.appendChild(el);
    }
  }

  /**
   * One absolutely positioned box per §7 note, plus its velocity bar in the lane below.
   * Position is a percentage of the roll's total tick span, so a note lands on the same
   * vertical line as the ruler cell that counts it at any width.
   */
  _renderNotes() {
    const layer = this.nodes.notes;
    const vel = this.nodes.velField;
    if (!layer || !vel) return;
    layer.textContent = '';
    // keep the velocity lane's playhead, drop the bars
    for (const b of [...vel.querySelectorAll('.cbdaw-roll__vel-bar')]) b.remove();
    this._noteEls.clear();

    const rowIndex = new Map();
    this._rowEls.forEach((r, i) => { if (!rowIndex.has(r.midi)) rowIndex.set(r.midi, i); });
    const rowCount = this._rowEls.length || 1;

    for (const note of this._notes) {
      const ri = rowIndex.get(note.note);
      const el = document.createElement('div');
      el.className = 'cbdaw-roll__note';
      el.dataset.tick = String(note.tick);
      el.dataset.note = String(note.note);
      const inKey = isInKey(this._scale, note.note);
      el.dataset.inkey = String(inKey);
      el.dataset.offGrid = String(this._isOffGrid(note));
      el.dataset.selected = String(this._selected === note);
      if (inKey) {
        const i = degreeIndexOf(this._scale, note.note);
        el.style.setProperty('--note-deg', `var(${degreeColor(this._scale, i)})`);
      }
      el.style.left = `${this._pct(note.tick)}%`;
      el.style.width = `${Math.max(this._pct(note.length), 0.4)}%`;
      // A note whose pitch is outside the drawn range is parked at the nearest edge rather
      // than dropped — §7's rule that a loader "never guesses" applies to not silently
      // losing a student's note either. `_rowFor()` reports the clamp back to the caller.
      const clamped = ri === undefined ? (note.note > (this._rowEls[0]?.midi ?? 0) ? 0 : rowCount - 1) : ri;
      el.style.top = `calc(var(--roll-row-h) * ${clamped})`;
      el.style.height = 'var(--roll-row-h)';
      el.dataset.outOfRange = String(ri === undefined);

      const fill = document.createElement('div');
      fill.className = 'cbdaw-roll__note-fill';
      fill.style.height = `${Math.round(note.velocity * 100)}%`;
      el.appendChild(fill);

      const handle = document.createElement('div');
      handle.className = 'cbdaw-roll__note-handle';
      el.appendChild(handle);
      layer.appendChild(el);

      const bar = document.createElement('div');
      bar.className = 'cbdaw-roll__vel-bar';
      bar.style.left = `${this._pct(note.tick + note.length / 2)}%`;
      bar.style.height = `${Math.round(note.velocity * 100)}%`;
      bar.dataset.selected = String(this._selected === note);
      vel.appendChild(bar);

      this._noteEls.set(note, { el, fill, bar });
    }
    this._syncToolbar();
  }

  /** Repaints one note in place — used on every drag frame, so a gesture never rebuilds the
   *  whole layer. */
  _paintNote(note) {
    const refs = this._noteEls.get(note);
    if (!refs) return;
    refs.el.style.left = `${this._pct(note.tick)}%`;
    refs.el.style.width = `${Math.max(this._pct(note.length), 0.4)}%`;
    refs.el.dataset.offGrid = String(this._isOffGrid(note));
    refs.el.dataset.selected = String(this._selected === note);
    refs.fill.style.height = `${Math.round(note.velocity * 100)}%`;
    refs.bar.style.left = `${this._pct(note.tick + note.length / 2)}%`;
    refs.bar.style.height = `${Math.round(note.velocity * 100)}%`;
    refs.bar.dataset.selected = String(this._selected === note);

    const ri = this._rowEls.findIndex((r) => r.midi === note.note);
    if (ri >= 0) {
      refs.el.style.top = `calc(var(--roll-row-h) * ${ri})`;
      const inKey = isInKey(this._scale, note.note);
      refs.el.dataset.inkey = String(inKey);
      if (inKey) {
        refs.el.style.setProperty(
          '--note-deg', `var(${degreeColor(this._scale, degreeIndexOf(this._scale, note.note))})`,
        );
      }
    }
  }

  _syncToolbar() {
    const t = this.nodes.toolbar;
    if (!t) return;
    const rowsBtn = t.querySelector('[data-act="rows"]');
    if (rowsBtn) {
      // Two role words, not pitch or rhythm labels — the same class of chrome text
      // `step-grid.js` puts on its own buttons. Nothing here names a note or a beat.
      rowsBtn.textContent = this._rows === 'diatonic' ? 'diatonic' : 'chromatic';
      rowsBtn.setAttribute('aria-pressed', String(this._rows === 'diatonic'));
    }
    const tripletBtn = t.querySelector('[data-act="triplet"]');
    if (tripletBtn) tripletBtn.setAttribute('aria-pressed', String(this._division === TRIPLET_DIVISION));
    const overlayBtn = t.querySelector('[data-act="overlay"]');
    if (overlayBtn) {
      overlayBtn.textContent = this._overlay;
      overlayBtn.setAttribute('aria-pressed', String(this._overlay !== 'none'));
    }
    const rulerBtn = t.querySelector('[data-act="ruler-overlay"]');
    if (rulerBtn) rulerBtn.setAttribute('aria-pressed', String(this._rulerOverlay === 'syllable'));
    const barsOut = t.querySelector('[data-readout="bars"]');
    if (barsOut) barsOut.textContent = String(this._bars);
    const octOut = t.querySelector('[data-readout="octaves"]');
    if (octOut) octOut.textContent = String(this._octaves);
    this._syncDurationReadout();
  }

  /**
   * SEAT QUESTION 4, the numeric half. DIGITS ONLY — steps, then beats — because naming the
   * duration is Brandon's call (see `DURATION_NAMES`). `_durationName()` appends nothing
   * until he rules. The teaching half of this answer is `_paintSpan()` below.
   */
  _syncDurationReadout() {
    const out = this.nodes.readout;
    if (!out) return;
    const note = this._selected;
    if (!note) { out.textContent = ''; return; }
    const steps = this._stepTicks() > 0 ? note.length / this._stepTicks() : 0;
    const beats = note.length / ticksPerBeat(this._ts());
    const round = (v) => String(Math.round(v * 100) / 100);
    out.textContent = `${round(steps)} · ${round(beats)}${this._durationName(note.length)}`;
  }

  /**
   * SEAT QUESTION 4, the teaching half — "note length must be legible as a length, and it
   * must relate to the ruler."
   *
   * The ruler cells a note covers light up. A student dragging a note reads its length in
   * the counting labels they say out loud — "one e and a two" — which is the same fact a
   * staff would give them, in §13.3's own words. No note-value name is invented to do it.
   */
  _paintSpan(note) {
    const ruler = this.nodes.ruler;
    if (!ruler) return;
    const cells = ruler.querySelectorAll('.cbdaw-roll__ruler-cell');
    if (!note) {
      for (const c of cells) c.dataset.span = 'false';
      return;
    }
    const stepT = this._stepTicks();
    if (!(stepT > 0)) return;
    const first = Math.floor(note.tick / stepT);
    const last = Math.ceil((note.tick + note.length) / stepT) - 1;
    for (const c of cells) {
      const s = Number(c.dataset.step);
      c.dataset.span = String(s >= first && s <= last);
    }
  }

  // =======================================================================================
  // 6 · INTERACTION — seat questions 4 and 5
  // =======================================================================================
  // FOUR GESTURES, ALL ON ONE POINTER, so a mouse and a finger behave identically:
  //   · press on empty field   → create a note one step long at the row's pitch, SNAPPED
  //                              (§13.5: "default snap in programming"), and keep dragging
  //                              right to set its length — the draw gesture and the length
  //                              gesture are one motion.
  //   · press on a note body   → move it in pitch and time.
  //   · press on the right edge→ change its length.
  //   · press on its velocity bar (or alt-press the note) → per-note velocity, drawn live as
  //                              the note's own fill height, exactly as `step-grid.js` draws
  //                              a step's. One vocabulary, two machines — A28 asked for
  //                              velocity on both.
  // A press that never moves past DRAG_THRESHOLD_PX just selects. Shift-press deletes.

  _attachInteraction() {
    this._addDom(this.nodes.toolbar, 'click', (e) => this._onToolbarClick(e));
    this._addDom(this.nodes.rows, 'pointerdown', (e) => this._onFieldPointerDown(e));
    this._addDom(this.nodes.velField, 'pointerdown', (e) => this._onVelPointerDown(e));
    this._addDom(this.nodes.rows, 'contextmenu', (e) => {
      const el = e.target.closest('.cbdaw-roll__note');
      if (!el) return;
      e.preventDefault();
      this._deleteNote(this._noteForEl(el));
    });
  }

  _detachInteraction() {
    for (const { target, type, fn, opts } of this._domListeners) {
      target.removeEventListener(type, fn, opts);
    }
    this._domListeners = [];
    this._dragListenersOn = false;
    this._drag = null;
  }

  _addDom(target, type, fn, opts) {
    if (!target) return;
    target.addEventListener(type, fn, opts);
    this._domListeners.push({ target, type, fn, opts });
  }

  _noteForEl(el) {
    for (const [note, refs] of this._noteEls) if (refs.el === el) return note;
    return null;
  }

  /** Field-relative tick under a client x. */
  _tickAt(clientX) {
    const rect = this._fieldRect();
    if (!rect || rect.width <= 0) return 0;
    const frac = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(this._totalTicks(), Math.round(frac * this._totalTicks())));
  }

  _fieldRect() {
    // the rows host minus the gutter — the same box the note layer is inset to
    const host = this.nodes.rows;
    if (!host) return null;
    const r = host.getBoundingClientRect();
    const gutter = this._rowEls[0]?.labelEl.getBoundingClientRect().width ?? 0;
    return { left: r.left + gutter, width: r.width - gutter, top: r.top, height: r.height };
  }

  /** Row index under a client y, and the pitch it draws. */
  _rowAt(clientY) {
    const rect = this._fieldRect();
    if (!rect || this._rowEls.length === 0) return null;
    const h = rect.height / this._rowEls.length;
    const i = Math.max(0, Math.min(this._rowEls.length - 1, Math.floor((clientY - rect.top) / h)));
    return { index: i, midi: this._rowEls[i].midi };
  }

  _onFieldPointerDown(e) {
    const noteEl = e.target.closest('.cbdaw-roll__note');
    e.preventDefault();

    if (noteEl) {
      const note = this._noteForEl(noteEl);
      if (!note) return;
      if (e.shiftKey) { this._deleteNote(note); return; }
      this._select(note);
      const rect = noteEl.getBoundingClientRect();
      const onHandle = e.target.classList.contains('cbdaw-roll__note-handle')
        || rect.right - e.clientX <= RESIZE_ZONE_PX;
      const kind = e.altKey ? 'velocity' : (onHandle ? 'length' : 'move');
      this._beginDrag(e, {
        kind,
        note,
        el: noteEl,
        grabTick: this._tickAt(e.clientX) - note.tick,
        startLength: note.length,
        startVelocity: note.velocity,
        startNoteNumber: note.note,
      });
      return;
    }

    // empty field: create, then keep dragging to set the length
    const row = this._rowAt(e.clientY);
    if (!row) return;
    const note = this._createNote(this._snap(this._tickAt(e.clientX)), row.midi);
    if (!note) return;
    this._select(note);
    const refs = this._noteEls.get(note);
    this._beginDrag(e, {
      kind: 'length',
      note,
      el: refs?.el || null,
      grabTick: 0,
      startLength: note.length,
      startVelocity: note.velocity,
      startNoteNumber: note.note,
    });
  }

  _onVelPointerDown(e) {
    const bar = e.target.closest('.cbdaw-roll__vel-bar');
    if (!bar) return;
    e.preventDefault();
    let hit = null;
    for (const [note, refs] of this._noteEls) if (refs.bar === bar) hit = note;
    if (!hit) return;
    this._select(hit);
    this._beginDrag(e, {
      kind: 'velocity',
      note: hit,
      el: bar,
      grabTick: 0,
      startLength: hit.length,
      startVelocity: hit.velocity,
      startNoteNumber: hit.note,
    });
  }

  _beginDrag(e, spec) {
    this._drag = { ...spec, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
    try { spec.el?.setPointerCapture?.(e.pointerId); } catch { /* not capturable */ }
    this._addWindowDragListeners();
    this._paintSpan(spec.note);
  }

  _addWindowDragListeners() {
    if (this._dragListenersOn) return;
    this._dragListenersOn = true;
    this._addDom(window, 'pointermove', this._onDragMove, { passive: false });
    this._addDom(window, 'pointerup', this._onDragEnd);
    this._addDom(window, 'pointercancel', this._onDragEnd);
  }

  _onDragMove = (e) => {
    const d = this._drag;
    if (!d || e.pointerId !== d.pointerId) return;
    if (Math.abs(e.clientX - d.startX) > DRAG_THRESHOLD_PX
      || Math.abs(e.clientY - d.startY) > DRAG_THRESHOLD_PX) d.moved = true;
    if (!d.moved) return;
    e.preventDefault();

    const note = d.note;
    if (d.kind === 'velocity') {
      // Measured against the velocity LANE, not against the bar, so the bar can be dragged
      // to full height from anywhere in the lane — the same mapping `step-grid.js` uses
      // against a cell: bottom is soft, top is loud, no menu, no numeric entry.
      const rect = (this.nodes.velField || d.el).getBoundingClientRect();
      const fromBottom = rect.bottom - e.clientY;
      note.velocity = clampVelocity(Math.max(0.02, Math.min(1, fromBottom / rect.height)));
    } else if (d.kind === 'length') {
      const end = this._snap(this._tickAt(e.clientX));
      note.length = Math.max(MIN_NOTE_TICKS, this._snap(end - note.tick) || this._stepTicks());
    } else {
      const row = this._rowAt(e.clientY);
      if (row) note.note = row.midi;
      const raw = this._tickAt(e.clientX) - d.grabTick;
      // A note that arrived off-grid keeps its off-grid feel while it is moved by hand
      // unless the student is snapping; §13.5 makes snapping the PROGRAMMING default, so a
      // hand move snaps and holding alt keeps the slop.
      note.tick = Math.max(0, e.altKey ? Math.round(raw) : this._snap(raw));
    }
    this._paintNote(note);
    this._paintSpan(note);
    this._syncDurationReadout();
  };

  _onDragEnd = (e) => {
    const d = this._drag;
    if (!d || e.pointerId !== d.pointerId) return;
    try { d.el?.releasePointerCapture?.(d.pointerId); } catch { /* already released */ }
    this._drag = null;
    this._notes.sort(byPosition);
    this._paintSpan(null);
    this._syncDurationReadout();
  };

  _createNote(tick, midi) {
    const note = toNote({
      tick,
      length: this._stepTicks(),
      note: midi,
      velocity: DEFAULT_VELOCITY, // §12.1: a surface that cannot sense velocity reports 0.8
    });
    if (!note) return null;
    this._notes.push(note);
    this._notes.sort(byPosition);
    this._renderNotes();
    return note;
  }

  _deleteNote(note) {
    if (!note) return;
    const i = this._notes.indexOf(note);
    if (i < 0) return;
    this._notes.splice(i, 1);
    this._captureNotes.delete(note); // no stale identity left in the capture set
    if (this._selected === note) this._selected = null;
    this._renderNotes();
  }

  _select(note) {
    this._selected = note;
    for (const [n, refs] of this._noteEls) {
      refs.el.dataset.selected = String(n === note);
      refs.bar.dataset.selected = String(n === note);
    }
    this._syncDurationReadout();
  }

  _onToolbarClick(e) {
    const act = e.target?.dataset?.act;
    if (!act) return;
    switch (act) {
      case 'rows':
        this.rows = this._rows === 'chromatic' ? 'diatonic' : 'chromatic';
        break;
      case 'triplet':
        this.setDivision(this._division === TRIPLET_DIVISION ? DEFAULT_DIVISION : TRIPLET_DIVISION);
        break;
      case 'overlay': {
        // §6's four pitch modes, cycled. The strings below are MODE NAMES, not labels — the
        // labels themselves all come out of `label()`.
        const modes = ['none', 'letter', 'number', 'solfege'];
        this.overlay = modes[(modes.indexOf(this._overlay) + 1) % modes.length];
        break;
      }
      case 'ruler-overlay':
        this.rulerOverlay = this._rulerOverlay === 'syllable' ? 'none' : 'syllable';
        break;
      case 'bars-': this.bars = this._bars - 1; break;
      case 'bars+': this.bars = this._bars + 1; break;
      case 'oct-': this.octaves = this._octaves - 1; break;
      case 'oct+': this.octaves = this._octaves + 1; break;
      default: break;
    }
  }

  // =======================================================================================
  // SEAT QUESTION 8 — the playhead is a VISUAL. §3, §10.
  // =======================================================================================
  // `clock.positionTicks` is a pure number — §3's amended block: "every public member that
  // speaks about 'now' reports the AUDIBLE now", and "a consumer that wants the playhead
  // wants `position`." Reading it allocates nothing, touches no AudioContext, and schedules
  // nothing. This loop is the ONLY animation in the file and it does exactly two things:
  // move two divs, and notice a time-signature change (which `clock.js` has no event for).
  //
  // §3's amended block also rules out a guard this loop might otherwise have carried:
  // "A consumer needs no `positionTicks < 0` guard of its own. Any seat that adds one is
  // re-describing a seam that no longer exists." There is none below.

  _rafLoop() {
    this._rafHandle = requestAnimationFrame(this._rafLoop);
    if (!this.mounted) return;

    const ts = this._ts();
    if (ts.top !== this._lastTs.top || ts.bottom !== this._lastTs.bottom) {
      this._lastTs = { top: ts.top, bottom: ts.bottom };
      this._renderRuler();
      this._renderLines();
      this._renderNotes();
    }

    const total = this._totalTicks();
    if (!(total > 0)) return;
    const pct = (mod(this._clock.positionTicks ?? 0, total) / total) * 100;
    if (this.nodes.playhead) this.nodes.playhead.style.left = `${pct}%`;
    if (this.nodes.velPlayhead) this.nodes.velPlayhead.style.left = `${pct}%`;
  }
}

export { PianoRoll };

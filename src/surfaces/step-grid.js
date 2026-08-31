/**
 * surfaces/step-grid.js — THE STEP GRID
 * Seat: `grid`, P2/S4. BUILD. Written 2026-08-23.
 *
 * Binds to: CONTRACTS §13 (grid — tick math, division, labels, time signature, step data,
 * round-trip), §14 (kits — the eight fixed piece roles, the two-frozen-members contract a
 * grid uses to drive ANY instrument), §2 (Instrument, frozen + amended), §3/§10 (the two
 * loops never cross).
 *
 * WHAT THIS FILE IS
 *   The step grid AND the counting ruler — one component, per CONTRACTS §13.2: "not two
 *   grid implementations." It draws eight lanes (one per §14.1 role), lets a student toggle
 *   a step on/off and drag its velocity, and — while bound to an instrument and a running
 *   clock — schedules that instrument's `noteOn` from the clock's own lookahead scheduler.
 *   It teaches beat and subdivision through the ruler labels §13.3 fixes.
 *
 * WHAT THIS FILE IS NOT
 *   Not an instrument. Not a synth kit or a sampler — §14.5, verbatim: "The grid's entire
 *   knowledge of an instrument is two frozen §2 members: `Instrument.pieces` and
 *   `instrument.noteOn(note, velocity, atTime)`." Nothing below reads `kit.json`, branches
 *   on `constructor.id`, or calls a `playPiece()`-style method — there is no such method.
 *   Not P3's piano roll (`surfaces/piano-roll.js`) — that file is not touched here, even
 *   though it shares this file's ruler labels (§13.3: "the drum machine and the piano roll
 *   must use the same numbers and the same syllables").
 *
 * THE TWO LOOPS NEVER CROSS (§3, §10) — this file's central discipline
 *   AUDIO   — `clock.on('tick', fn)` fires once per scheduler pass (NOT per frame). This
 *             is the ONLY place this file calls `instrument.noteOn(...)`, and it always
 *             passes the exact `atTime` the tick payload's `timeOf(tick)` computes.
 *   VISUAL  — a `requestAnimationFrame` loop reads `clock.positionTicks`, a pure number,
 *             to move the playhead and to notice a time-signature change. It NEVER calls
 *             `noteOn` and never touches an AudioContext. §10: "Schedule audio from
 *             requestAnimationFrame" is the one thing nobody may do; this file does not.
 *
 * LABEL STRINGS ARE BRANDON'S, COPIED FROM CONTRACTS §13.3, NOT COMPOSED HERE.
 *   16ths: "1 e + a  2 e + a  3 e + a  4 e + a" (§6, frozen). Triplets: "1 + a  2 + a
 *   3 + a  4 + a" (D-14). See `stepLabel()` below — it is §13.3's own `label(step,
 *   division)` function, transcribed, not reinvented.
 *
 * TIME SIGNATURE DISPLAY — CONTRACTS §13.4 OVERRULES THIS SEAT'S OWN BRIEF, ON THE RECORD.
 *   This seat's brief (seat question 2) says "the bottom number as a symbol, not a digit."
 *   CONTRACTS §13.4 says the opposite, citing Brandon's own answer to D-20 ("it doesn't need
 *   to be there") and states outright: "This contradicts this seat's own brief, and the
 *   contradiction is on the record rather than resolved silently." §13.4 is frozen-adjacent
 *   spec text this seat binds to; the brief is not a contract. **This file follows §13.4.**
 *   It renders the time signature as two plain digits ("4/4") and invents no glyph. See
 *   OPEN DECISIONS in the receipt.
 */

// -----------------------------------------------------------------------------------------
// IMPORTS
// -----------------------------------------------------------------------------------------
// `clock.js` is read, never edited (this seat's brief: "You do NOT touch ... clock.js").
// These are the exact §13.1 tick-math functions clock.js exports for every consumer to
// share — "there is only one implementation of each" — imported, not reimplemented.
import {
  clock as sharedClock,
  ticksPerBar,
  ticksPerStep,
} from '../core/clock.js';

// This file deliberately does NOT import `core/input.js`. §14.5 fixes the grid's entire
// knowledge of an instrument at two members (`pieces`, `noteOn`) and says nothing about the
// input bus — a rhythm surface that drives an instrument directly has no note events to put
// on a bus built for pitch surfaces (§12.1 is `keyboard`/`diatonic-keys`/`scale-circle`'s
// contract, not this one). Importing it anyway would run its module-load side effect
// (`requestMIDI()`) for no reason this file has. `DEFAULT_VELOCITY` is one plain number,
// fixed identically in four places already (§7, §11.7a, §12.1, §13.5) — restated here rather
// than coupled in through an unrelated module.

// -----------------------------------------------------------------------------------------
// 1 · CONSTANTS
// -----------------------------------------------------------------------------------------

/** §13.5 / §11.7a / §12.1 / §7 — one number, four places already, restated here as the
 *  fifth. A step created by a tap (not a drag) is written at this velocity. */
const DEFAULT_VELOCITY = 0.8;

/** §13.2's table: every `division` that divides PPQ=480 with zero remainder. This file
 *  exposes only the two CONTRACTS names a syllable set exists for — 4 (16ths, default) and
 *  3 (triplets) — as the two one-tap presets; the rest are reachable through the same
 *  per-lane setter for a page that wants them, per §13.3 OPEN DECISIONS item 5: "Brandon has
 *  named two sets ... this seat did not invent a third. Those lanes draw beat digits and
 *  leave the subdivisions blank." Not a UI restriction — a labelling one. */
const SUPPORTED_DIVISIONS = [1, 2, 3, 4, 6, 8];
const DEFAULT_DIVISION = 4;
const TRIPLET_DIVISION = 3;

/** §14.1: eight fixed roles, always. A grid with no instrument bound yet still draws eight
 *  rows (§14.5: "draws its eight rows and accepts clicks the moment it is mounted, whether
 *  or not a kit has decoded") — this is the placeholder label until one is. */
const PIECE_COUNT = 8;

/** OPEN DECISIONS item 7 (spec-clock, §13): "`bars` per pattern has no maximum ... `grid`
 *  (P2/S4) sets a sane UI limit if one is needed." A dense lane array is `bars * top *
 *  division` entries per lane, times 8 lanes; unbounded is a real footgun in a classroom
 *  demo and nothing in the docset asks for more. 8 bars at 4/4 16ths is 128 steps per lane —
 *  already more than a one-screen grid can usefully show. Liftable by editing this constant;
 *  not a contract number. */
const MAX_BARS = 8;

// -----------------------------------------------------------------------------------------
// 2 · THE COUNTING LABELS — CONTRACTS §13.3, transcribed verbatim, not composed
// -----------------------------------------------------------------------------------------
// "Beats are whole digits. Subdivisions are syllables." — seat question 1. This is §13.3's
// own `label(step, division)` function and its `SYLLABLES` table, copied exactly, with one
// addition only: divisions with no named syllable set (6, 8) fall through to '' instead of
// `undefined`, which §13.3 OPEN DECISIONS item 5 already states is the correct behaviour
// ("leave the subdivisions blank"), not a gap this file is filling in on its own.
//
// EXPORTED so P3's `piano-roll.js` and P4's arrangement ruler can import this exact function
// rather than each writing a second one — §13.3, verbatim: "Three surfaces, one function...
// No surface builds its own label strings." §13 does not name the file this lives in (its
// own tick-math functions ended up in `clock.js` for the identical reason, per that file's
// own header comment). `clock.js` is frozen and not this seat's to add to, and §10 forbids
// inventing a new shared module outside a seat's own lane — so this function lives in the
// one file this seat owns, exported, exactly as `clock.js` exports §13.1's tick math for the
// same three surfaces to share. Flagged in the receipt so the Troubleshooter can tell P3/P4
// where to import it from.
export const SYLLABLES = Object.freeze({
  1: [],
  2: [undefined, '+'],
  3: [undefined, '+', 'a'],
  4: [undefined, 'e', '+', 'a'],
});

/** §13.3's `label(step, division)`, verbatim. `step` is 0-based within the bar. */
export function stepLabel(step, division) {
  if (step % division === 0) {
    return String(Math.floor(step / division) + 1); // the beat: a whole digit
  }
  const set = SYLLABLES[division];
  const s = set ? set[step % division] : undefined;
  return s ?? ''; // §13.3 OPEN DECISIONS item 5: no set for this division → blank
}

// -----------------------------------------------------------------------------------------
// 3 · PURE HELPERS
// -----------------------------------------------------------------------------------------

/** True modulo — same reason clock.js carries its own: JS `%` returns negative for a
 *  negative left operand, and a pattern-relative tick can be. */
function mod(a, n) {
  return ((a % n) + n) % n;
}

function clampDivision(d) {
  const n = Math.trunc(Number(d));
  return SUPPORTED_DIVISIONS.includes(n) ? n : DEFAULT_DIVISION;
}

function clampBars(n) {
  const v = Math.trunc(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.max(1, Math.min(MAX_BARS, v));
}

function clampVelocity(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULT_VELOCITY;
  return Math.max(0, Math.min(1, n));
}

// -----------------------------------------------------------------------------------------
// 4 · PATTERN DATA — CONTRACTS §13.5, verbatim shape
// -----------------------------------------------------------------------------------------
// step  = null | { v: 0.0-1.0 }.  "On/off is the presence of the object... an object that
// exists is on, and null is off." lane = {piece, division, steps[]}. pattern = {bars, lanes
// (exactly 8, index order)}. This is the exact shape `capture` and `beat-shell` receive
// (seat question — Edge) and the exact shape §13.6 round-trips through §7's `notes[]` /
// `instrumentState` split — this file does not do that round-trip itself (that is §13.6's
// save/load arithmetic, not named as this seat's file) but is careful to hand off a shape
// `capture` can perform it on without translation.

function stepsForLane(bars, top, division) {
  return new Array(bars * top * division).fill(null);
}

/** §13.5: "a lane that grows keeps what it had and pads with `null`, and a lane that shrinks
 *  keeps the steps that still fit." Applied whenever `bars`, `top`, or a lane's own
 *  `division` changes. */
function resizeLaneSteps(oldSteps, bars, top, division) {
  const next = stepsForLane(bars, top, division);
  for (let i = 0; i < Math.min(oldSteps.length, next.length); i++) next[i] = oldSteps[i];
  return next;
}

function makeLane(piece, bars, top, division) {
  return { piece, division: clampDivision(division), steps: stepsForLane(bars, top, division) };
}

/** §14.1: exactly eight lanes, one per fixed role, in index order — "Not seven, not nine."
 *  Built without reading any instrument: the roles are index 0-7 regardless of what, if
 *  anything, is bound (§14.5). */
function makePattern(bars, top, division) {
  const lanes = [];
  for (let i = 0; i < PIECE_COUNT; i++) lanes.push(makeLane(i, bars, top, division));
  return { bars: clampBars(bars), lanes };
}

/** Loose, permissive validation. §11.7(b)'s rule — "a malformed argument is a no-op, it does
 *  not throw" — is written for `Instrument.setState`, but this file follows the same
 *  philosophy on principle: a pattern arriving from `capture`'s undo stack or a loaded
 *  project is user-authored data on a scheduled path, and a thrown exception here can stop a
 *  render or a scheduler pass mid-song exactly as §11.7(b) describes for an instrument. */
function isPlausiblePattern(p) {
  return (
    p &&
    typeof p === 'object' &&
    Number.isFinite(p.bars) &&
    Array.isArray(p.lanes) &&
    p.lanes.length === PIECE_COUNT &&
    p.lanes.every((l) => l && Array.isArray(l.steps) && Number.isFinite(l.division))
  );
}

// -----------------------------------------------------------------------------------------
// 5 · STYLE — reads /src/ui/tokens.css (§9). Never defines a token, only consumes one.
// -----------------------------------------------------------------------------------------
// Same pattern `surfaces/keyboard.js` already uses: every fallback below is byte-identical
// to the value `ui/tokens.css` currently defines for that token (redpen-p1 D-7's fix,
// applied here from the start rather than fixed after the fact). One stylesheet for every
// instance, reference-counted, removed when the last grid disposes.

const STYLE_ID = 'cbdaw-step-grid-style';
let liveInstances = 0;

const STYLE_TEXT = `
.cbdaw-grid {
  --grid-bg: var(--bg, #0a0d13);
  --grid-panel: var(--panel, #1b2332);
  --grid-line: var(--line, #3a485f);
  --grid-text: var(--text, #f2f6fc);
  --grid-dim: var(--text-dim, #93a1b8);
  --grid-accent: var(--accent, #34e5b4);
  --grid-warn: var(--warn, #ff7a1a);
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
  color: var(--grid-text);
  background: var(--grid-panel);
  border: 1px solid var(--grid-line);
  border-radius: 6px;
  padding: 8px;
  user-select: none;
  -webkit-user-select: none;
}

.cbdaw-grid__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--grid-dim);
}
.cbdaw-grid[data-variant="compact"] .cbdaw-grid__toolbar { font-size: 10px; gap: 8px; }
.cbdaw-grid__toolbar button {
  font: inherit;
  font-weight: 600;
  color: var(--grid-text);
  background: var(--grid-bg);
  border: 1px solid var(--grid-line);
  border-radius: 4px;
  padding: 3px 8px;
  cursor: pointer;
}
.cbdaw-grid__toolbar button:hover { border-color: var(--grid-accent); }
.cbdaw-grid__toolbar button[aria-pressed="true"] {
  background: var(--grid-accent);
  color: var(--grid-bg);
  border-color: var(--grid-accent);
}
.cbdaw-grid__toolbar .cbdaw-grid__timesig {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--grid-text);
}

.cbdaw-grid__body {
  position: relative; /* the playhead is one absolutely-positioned line over this whole box */
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--grid-bg);
  border: 1px solid var(--grid-line);
  border-radius: 4px;
  padding: 4px;
  overflow: hidden;
}

/* Ruler + every lane row share this beat-group layout so a triplet lane's cells and a 16th
   lane's cells always land on the same beat boundaries — §13.2: "not two grid
   implementations." Nesting does the alignment; no per-step pixel math is needed. */
.cbdaw-grid__row {
  display: flex;
  align-items: stretch;
  gap: 2px;
}
.cbdaw-grid__row-label {
  flex: 0 0 auto;
  width: 74px;
  min-width: 74px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--grid-dim);
  padding-right: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.cbdaw-grid[data-variant="compact"] .cbdaw-grid__row-label { width: 46px; min-width: 46px; font-size: 9px; }
.cbdaw-grid__row-label button {
  font: inherit;
  font-size: 9px;
  line-height: 1;
  color: var(--grid-dim);
  background: transparent;
  border: 1px solid var(--grid-line);
  border-radius: 3px;
  padding: 1px 3px;
  cursor: pointer;
}
.cbdaw-grid__row-label button[aria-pressed="true"] { color: var(--grid-accent); border-color: var(--grid-accent); }

.cbdaw-grid__beats {
  flex: 1 1 auto;
  display: flex;
  gap: 1px;
}
.cbdaw-grid__beat {
  flex: 1 1 0;
  display: flex;
  gap: 1px;
  border-left: 1px solid var(--grid-line);
  padding-left: 1px;
}
.cbdaw-grid__beat:first-child { border-left: none; padding-left: 0; }

.cbdaw-grid__ruler-cell {
  flex: 1 1 0;
  text-align: center;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--grid-dim);
  padding: 2px 0;
}
.cbdaw-grid[data-variant="compact"] .cbdaw-grid__ruler-cell { font-size: 8px; padding: 1px 0; }
.cbdaw-grid__ruler-cell[data-beat="true"] { color: var(--grid-text); font-weight: 700; }
.cbdaw-grid[data-variant="expanded"] .cbdaw-grid__ruler-cell { font-size: 18px; padding: 4px 0; }
.cbdaw-grid[data-variant="expanded"] .cbdaw-grid__ruler-cell[data-beat="true"] { font-size: 22px; }

.cbdaw-grid__cell {
  flex: 1 1 0;
  position: relative;
  height: 26px;
  background: var(--grid-panel);
  border: 1px solid var(--grid-line);
  border-radius: 2px;
  cursor: pointer;
  touch-action: none;
  overflow: hidden;
}
.cbdaw-grid[data-variant="compact"] .cbdaw-grid__cell { height: 14px; }
.cbdaw-grid[data-variant="expanded"] .cbdaw-grid__cell { height: 40px; }
.cbdaw-grid__cell[data-beat="true"] { border-left-color: var(--grid-dim); border-left-width: 2px; }
.cbdaw-grid__cell-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--grid-accent);
  opacity: 0.85;
}
.cbdaw-grid__cell[data-off-grid="true"] { box-shadow: inset 0 0 0 1px var(--grid-warn); }
.cbdaw-grid__cell.is-playing { border-color: var(--grid-accent); }

.cbdaw-grid__playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--grid-accent);
  box-shadow: 0 0 4px var(--grid-accent);
  pointer-events: none;
  will-change: left;
}
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

// -----------------------------------------------------------------------------------------
// 6 · THE COMPONENT
// -----------------------------------------------------------------------------------------

export default class StepGrid {
  static id = 'step-grid';
  static label = 'Step Grid';

  /**
   * `clock` defaults to the shared transport, matching every other seat's convention of
   * accepting the real singleton but allowing a test page to hand in its own. Never touches
   * `core/audio.js` directly and never constructs an AudioContext — the instrument bound via
   * `bindInstrument()` owns all of that (§2, §10).
   */
  constructor(el = null, clock = sharedClock) {
    this._clock = clock;
    this.defaultTarget = el;
    this.variant = 'expanded';
    this.mounted = false;

    /** §14.5: the ONLY thing this file knows about an instrument — set by `bindInstrument`,
     *  read only as `instrument.constructor.pieces` and `instrument.noteOn(...)`. */
    this.instrument = null;

    /** §6: `'none' | 'syllable'`, per-instance, no global setting. */
    this._overlay = 'syllable';

    /** §13.2: the ruler's own reference division — independent of any one lane's playback
     *  division, shown once at the top of the grid. Toggled 4 <-> 3 by the toolbar button
     *  and by `setRulerDivision()`. Documented in the receipt: CONTRACTS names the syllable
     *  sets and names per-lane division; it does not specify how a shared ruler reconciles
     *  lanes that disagree, and this is this seat's own resolution — see OPEN DECISIONS. */
    this._rulerDivision = DEFAULT_DIVISION;

    this._pattern = makePattern(1, this._clock.timeSignature.top, DEFAULT_DIVISION);

    this._lastTs = { top: this._clock.timeSignature.top, bottom: this._clock.timeSignature.bottom };

    this.el = null;
    this.nodes = { toolbar: null, body: null, ruler: null, lanes: [], playhead: null, timesig: null };

    this._domListeners = [];
    // clock.js's `on(event, fn)` (§3) returns nothing to unsubscribe with — unlike
    // `input.js`'s `on()`, it is a plain `Set.add(fn)` with no return value. Tracked here as
    // a flag instead of a returned closure; `off(event, fn)` (also §3) is what actually
    // removes it, called unconditionally against this flag in `unmount()`.
    this._tickSubscribed = false;
    this._rafHandle = null;
    this._drag = null; // active pointer-velocity gesture, see section 9

    this._onTick = this._onTick.bind(this);
    this._rafLoop = this._rafLoop.bind(this);
  }

  // =========================================================================================
  // SEAT QUESTION 5 — driving an instrument, without knowing which one
  // =========================================================================================
  // §14.5, verbatim: "reads eight pieces from CONTRACTS §14 and triggers by index." Binding
  // stores a reference and nothing else — no `ready()` wait, no `needsLoad` branch, no
  // `constructor.id` check. A step played before an async sampler's kit has decoded makes no
  // sound and is not an error (§14.5's own words); this file does not special-case that.

  bindInstrument(inst) {
    this.instrument = inst || null;
    if (this.mounted) this._renderLaneLabels();
    return this;
  }

  unbindInstrument() {
    this.instrument = null;
    if (this.mounted) this._renderLaneLabels();
    return this;
  }

  _pieceFor(index) {
    const pieces = this.instrument?.constructor?.pieces;
    return Array.isArray(pieces) ? pieces[index] || null : null;
  }

  // =========================================================================================
  // PATTERN DATA — seat question 5's data half, and the Edge handoff to `capture`
  // =========================================================================================

  /** A JSON-safe deep copy — the exact shape §13.5 fixes, safe for `capture` or a project
   *  loader to hold onto without this instance mutating it later. */
  getPattern() {
    return JSON.parse(JSON.stringify(this._pattern));
  }

  /** Silent no-op on anything that is not plausibly this shape — §11.7(b)'s principle,
   *  applied to a surface instead of an instrument, for the same reason: this is called with
   *  user-authored/loaded data, and a thrown exception here is worse than doing nothing. */
  setPattern(pattern) {
    if (!isPlausiblePattern(pattern)) return false;
    this._pattern = {
      bars: clampBars(pattern.bars),
      lanes: pattern.lanes.map((l, i) => ({
        piece: i, // §14.1: index is fixed by role, never by the incoming data
        division: clampDivision(l.division),
        steps: l.steps.slice(),
      })),
    };
    if (this.mounted) this._renderGrid();
    return true;
  }

  get bars() {
    return this._pattern.bars;
  }

  set bars(n) {
    const next = clampBars(n);
    if (next === this._pattern.bars) return;
    const top = this._clock.timeSignature.top;
    for (const lane of this._pattern.lanes) {
      lane.steps = resizeLaneSteps(lane.steps, next, top, lane.division);
    }
    this._pattern.bars = next;
    if (this.mounted) this._renderGrid();
  }

  // =========================================================================================
  // SEAT QUESTIONS 1 and 3 — the ruler and triplets, one component
  // =========================================================================================

  get rulerDivision() {
    return this._rulerDivision;
  }

  setRulerDivision(division) {
    this._rulerDivision = clampDivision(division);
    if (this.mounted) this._renderRuler();
  }

  /** Per-lane, per CONTRACTS §13.2: "Per-lane, not per-track and not per-pattern" — this is
   *  the mechanism that lets a triplet hi-hat sit over a straight kick (§13.2's own example).
   *  Same `stepToTicks`/`ticksPerStep` arithmetic either way — only the integer changes. */
  setLaneDivision(laneIndex, division) {
    const lane = this._pattern.lanes[laneIndex];
    if (!lane) return;
    const next = clampDivision(division);
    if (next === lane.division) return;
    const top = this._clock.timeSignature.top;
    lane.steps = resizeLaneSteps(lane.steps, this._pattern.bars, top, next);
    lane.division = next;
    if (this.mounted) this._renderLane(laneIndex);
  }

  /** Convenience for the common case (and the DONE-CHECK's "switch to triplets" test): sets
   *  the ruler and every lane to the same division in one call. Per-lane override remains
   *  available afterward through `setLaneDivision`. */
  setDivisionAll(division) {
    this.setRulerDivision(division);
    for (let i = 0; i < this._pattern.lanes.length; i++) this.setLaneDivision(i, division);
  }

  // =========================================================================================
  // SEAT QUESTION 7 — the overlay toggle, §6
  // =========================================================================================
  // "Per-surface toggle. There is no global overlay setting." One property, this instance
  // only. Decides whether syllable strings are DRAWN — never what they ARE (§13.3).

  get overlay() {
    return this._overlay;
  }

  set overlay(value) {
    if (value !== 'none' && value !== 'syllable') return; // §6's rhythm-surface enum is closed
    this._overlay = value;
    if (this.mounted) this._renderGrid();
  }

  // =========================================================================================
  // SEAT QUESTION 8 — compact and expanded
  // =========================================================================================
  // Compact: the DAW lane — small fixed cell height, short row labels, no toolbar text
  // beyond the essentials, no animation (§9: "DAW views stay still"). Expanded: the
  // standalone tool — the ruler large enough to read from the back of a classroom (§9's own
  // test for every surface), full controls, per-lane division buttons visible.

  mount(el = this.defaultTarget, variant = 'expanded') {
    if (this.mounted) this.unmount();
    const target = el || this.defaultTarget;
    if (!target) throw new Error('StepGrid.mount: no element to mount into');

    this.defaultTarget = target;
    this.variant = variant === 'compact' ? 'compact' : 'expanded';
    acquireStyle();
    this._build(target);
    this._renderGrid();
    this._attachInteraction();

    this._clock.on('tick', this._onTick);
    this._tickSubscribed = true;
    this._rafHandle = requestAnimationFrame(this._rafLoop);

    this.mounted = true;
    return this;
  }

  mountCompact(el = this.defaultTarget) {
    return this.mount(el, 'compact');
  }

  mountExpanded(el = this.defaultTarget) {
    return this.mount(el, 'expanded');
  }

  unmount() {
    if (!this.mounted) return this;
    if (this._rafHandle !== null) cancelAnimationFrame(this._rafHandle);
    this._rafHandle = null;
    if (this._tickSubscribed) this._clock.off('tick', this._onTick);
    this._tickSubscribed = false;
    this._detachInteraction();
    this.el?.remove();
    this.el = null;
    this.nodes = { toolbar: null, body: null, ruler: null, lanes: [], playhead: null, timesig: null };
    this.mounted = false;
    releaseStyle();
    return this;
  }

  /** Mirrors every other file's dispose() shape: zero leaked DOM listeners, zero leaked
   *  clock subscriptions, zero leaked rAF handle. Does not touch the bound instrument — this
   *  file never owned it (§14.5) and never calls its `dispose()`. */
  dispose() {
    const domListeners = this._domListeners.length;
    const hadTick = this._tickSubscribed ? 1 : 0;
    const hadRaf = this._rafHandle !== null ? 1 : 0;
    this.unmount();
    this.instrument = null;
    return { domListeners, tickSubscriptionsDropped: hadTick, rafCancelled: hadRaf };
  }

  // =========================================================================================
  // 7 · BUILDING AND DRAWING
  // =========================================================================================

  _build(target) {
    const root = document.createElement('div');
    root.className = 'cbdaw-grid';
    root.dataset.variant = this.variant;
    root.dataset.overlay = this._overlay;

    const toolbar = document.createElement('div');
    toolbar.className = 'cbdaw-grid__toolbar';
    toolbar.innerHTML = `
      <span class="cbdaw-grid__timesig" data-timesig></span>
      <button type="button" data-act="triplet" aria-pressed="false">Triplet</button>
      <button type="button" data-act="overlay" aria-pressed="true">syllables</button>
      ${this.variant === 'expanded' ? `
        <span>bars
          <button type="button" data-act="bars-">-</button>
          <span data-readout="bars">1</span>
          <button type="button" data-act="bars+">+</button>
        </span>` : ''}
    `;
    root.appendChild(toolbar);

    const body = document.createElement('div');
    body.className = 'cbdaw-grid__body';
    root.appendChild(body);

    const playhead = document.createElement('div');
    playhead.className = 'cbdaw-grid__playhead';
    playhead.style.left = '0%';
    body.appendChild(playhead);

    this.el = root;
    this.nodes.toolbar = toolbar;
    this.nodes.body = body;
    this.nodes.playhead = playhead;
    this.nodes.timesig = toolbar.querySelector('[data-timesig]');

    this._addDom(toolbar, 'click', (e) => this._onToolbarClick(e));

    target.appendChild(root);
  }

  _renderGrid() {
    this._renderTimeSig();
    this._renderRuler();
    for (let i = 0; i < this._pattern.lanes.length; i++) this._renderLane(i);
    this._syncToolbarReadouts();
  }

  /** §13.4: digits only, no bottom-number symbol — Brandon's D-20 answer, which §13.4 says
   *  governs over this seat's own brief. "4/4", not a glyph. */
  _renderTimeSig() {
    if (!this.nodes.timesig) return;
    const ts = this._clock.timeSignature;
    this.nodes.timesig.textContent = `${ts.top}/${ts.bottom}`;
  }

  /** Builds `bars × top` beat-groups, each holding `rulerDivision` cells, using
   *  `stepLabel()` — §13.3's own function, the same one every lane calls below. This is the
   *  shared counting reference at the top of the grid (see the constructor's note on why a
   *  single ruler division exists independent of any one lane's own).
   *
   *  `bars` IS IN THE WIDTH. It was not, and the ruler drew `top` groups over a body whose
   *  step arrays are `bars * top * division` long (`stepsForLane`) and whose playhead sweeps
   *  `bars * ticksPerBar` across the same 100% (`_rafLoop`). At `bars = 2` the label "1" sat
   *  over the downbeat of bar 1 and the label "3" sat over the downbeat of bar 2.
   *  `stepLabel(step, division)` is §13.3 verbatim and its `step` is 0-BASED WITHIN THE BAR,
   *  so the label is asked for with the within-bar index while the cell is placed at the
   *  global one — every bar counts "1 2 3 4" again instead of running on to 8. */
  _renderRuler() {
    const body = this.nodes.body;
    let row = this.nodes.ruler;
    if (!row) {
      row = document.createElement('div');
      row.className = 'cbdaw-grid__row cbdaw-grid__row--ruler';
      row.innerHTML = `<div class="cbdaw-grid__row-label">Beat</div><div class="cbdaw-grid__beats"></div>`;
      body.insertBefore(row, body.firstChild.nextSibling); // after the playhead node
      this.nodes.ruler = row;
    }
    const beats = row.querySelector('.cbdaw-grid__beats');
    beats.textContent = '';

    const ts = this._clock.timeSignature;
    const division = this._rulerDivision;
    const bars = this._pattern.bars;
    for (let bar = 0; bar < bars; bar++) {
      for (let b = 0; b < ts.top; b++) {
        const group = document.createElement('div');
        group.className = 'cbdaw-grid__beat';
        group.dataset.bar = String(bar + 1);
        for (let c = 0; c < division; c++) {
          const inBarStep = b * division + c;                       // §13.3's `step`
          const cell = document.createElement('div');
          cell.className = 'cbdaw-grid__ruler-cell';
          cell.dataset.beat = String(c === 0);
          cell.dataset.step = String((bar * ts.top + b) * division + c);
          cell.textContent =
            this._overlay === 'syllable' || c === 0 ? stepLabel(inBarStep, division) : '';
          group.appendChild(cell);
        }
        beats.appendChild(group);
      }
    }
  }

  _renderLaneLabels() {
    for (let i = 0; i < this._pattern.lanes.length; i++) this._renderLaneLabel(i);
  }

  _renderLaneLabel(index) {
    const row = this.nodes.lanes[index];
    if (!row) return;
    const piece = this._pieceFor(index);
    const nameEl = row.el.querySelector('[data-lane-name]');
    if (nameEl) nameEl.textContent = piece ? piece.label : `Row ${index + 1}`;
  }

  _renderLane(index) {
    const body = this.nodes.body;
    const lane = this._pattern.lanes[index];
    let row = this.nodes.lanes[index];

    if (!row) {
      const el = document.createElement('div');
      el.className = 'cbdaw-grid__row';
      el.dataset.lane = String(index);
      el.innerHTML = `
        <div class="cbdaw-grid__row-label">
          <span data-lane-name>Row ${index + 1}</span>
          <button type="button" data-lane-act="division" aria-pressed="false">16</button>
        </div>
        <div class="cbdaw-grid__beats"></div>`;
      body.appendChild(el);
      row = { el, beats: el.querySelector('.cbdaw-grid__beats') };
      this.nodes.lanes[index] = row;
      this._addDom(el, 'pointerdown', (e) => this._onCellPointerDown(e, index));
      // Reads `this._pattern.lanes[index]` FRESH on every click, rather than closing over
      // the `lane` object captured above at first render. `setPattern()` replaces
      // `this._pattern.lanes` with new lane objects wholesale (see `setPattern`, section 4)
      // — and `capture.js` calls `setPattern()` on every live-projected note during
      // recording — so a closure holding the object from mount time goes stale the moment
      // a take is in progress. This listener is attached exactly once per lane row (this
      // `if (!row)` branch), so it must never assume the object it can see today is the
      // object it will need tomorrow; `index` (the lane's fixed position, §14.1) is the
      // only thing safe to close over. Fixes receipt-beat-shell.md item 4 / OPEN DECISIONS
      // item 6: the button silently no-op'd after any recording because it toggled off a
      // frozen division value instead of the lane's real, current one.
      this._addDom(el.querySelector('[data-lane-act="division"]'), 'click', (e) => {
        e.stopPropagation();
        const current = this._pattern.lanes[index];
        if (!current) return;
        const next = current.division === TRIPLET_DIVISION ? DEFAULT_DIVISION : TRIPLET_DIVISION;
        this.setLaneDivision(index, next);
      });
    }

    this._renderLaneLabel(index);
    const divBtn = row.el.querySelector('[data-lane-act="division"]');
    divBtn.textContent = lane.division === TRIPLET_DIVISION ? 'T' : String(lane.division);
    divBtn.setAttribute('aria-pressed', String(lane.division === TRIPLET_DIVISION));

    // `bars` IS IN THE WIDTH, matching `_renderRuler()` group for group. The lane's own
    // `steps` array is already `bars * top * division` long (`stepsForLane`), `_onTick`
    // already PLAYS every entry of it, and `_paintPlayingCells` already looks cells up by
    // the full-pattern index — only the DOM stopped at one bar, so at `bars = 2` the second
    // bar sounded, could not be seen and could not be clicked.
    const ts = this._clock.timeSignature;
    row.beats.textContent = '';
    for (let bar = 0; bar < this._pattern.bars; bar++) {
      for (let b = 0; b < ts.top; b++) {
        const group = document.createElement('div');
        group.className = 'cbdaw-grid__beat';
        group.dataset.bar = String(bar + 1);
        for (let c = 0; c < lane.division; c++) {
          const step = (bar * ts.top + b) * lane.division + c;
          group.appendChild(this._buildCell(index, step, lane));
        }
        row.beats.appendChild(group);
      }
    }
  }

  _buildCell(laneIndex, stepIndex, lane) {
    const cell = document.createElement('div');
    cell.className = 'cbdaw-grid__cell';
    cell.dataset.lane = String(laneIndex);
    cell.dataset.step = String(stepIndex);
    cell.dataset.beat = String(stepIndex % lane.division === 0);
    const fill = document.createElement('div');
    fill.className = 'cbdaw-grid__cell-fill';
    cell.appendChild(fill);
    this._paintCell(cell, lane.steps[stepIndex]);
    return cell;
  }

  _paintCell(cellEl, step) {
    const fill = cellEl.firstChild;
    if (step) {
      fill.style.height = `${Math.round(clampVelocity(step.v) * 100)}%`;
      cellEl.dataset.on = 'true';
    } else {
      fill.style.height = '0%';
      cellEl.dataset.on = 'false';
    }
  }

  _cellEl(laneIndex, stepIndex) {
    const row = this.nodes.lanes[laneIndex];
    return row?.beats.querySelector(`.cbdaw-grid__cell[data-step="${stepIndex}"]`) || null;
  }

  _syncToolbarReadouts() {
    const barsReadout = this.nodes.toolbar?.querySelector('[data-readout="bars"]');
    if (barsReadout) barsReadout.textContent = String(this._pattern.bars);
    const overlayBtn = this.nodes.toolbar?.querySelector('[data-act="overlay"]');
    if (overlayBtn) overlayBtn.setAttribute('aria-pressed', String(this._overlay === 'syllable'));
    const tripletBtn = this.nodes.toolbar?.querySelector('[data-act="triplet"]');
    if (tripletBtn) tripletBtn.setAttribute('aria-pressed', String(this._rulerDivision === TRIPLET_DIVISION));
  }

  // =========================================================================================
  // SEAT QUESTION 4 — velocity per step, without a menu
  // =========================================================================================
  // Interaction, stated: a TAP (pointerdown+up under a small movement threshold) toggles a
  // step on (at DEFAULT_VELOCITY) or off. A PRESS-AND-DRAG (movement past that threshold
  // before release) turns the step into a one-finger fader for as long as the pointer is
  // down: vertical position inside the cell maps directly to velocity, drawn live as the
  // cell's own fill height — bottom of the cell is soft, top is loud, no menu, no second
  // control, no numeric entry. Works identically for a mouse or a touch, because both are
  // just a pointer.

  _onCellPointerDown(e, laneIndex) {
    const cell = e.target.closest('.cbdaw-grid__cell');
    if (!cell) return;
    const stepIndex = Number(cell.dataset.step);
    const lane = this._pattern.lanes[laneIndex];
    if (!lane || !Number.isInteger(stepIndex)) return;

    e.preventDefault();
    try { cell.setPointerCapture(e.pointerId); } catch { /* not capturable */ }

    this._drag = {
      pointerId: e.pointerId,
      laneIndex,
      stepIndex,
      cell,
      startY: e.clientY,
      moved: false,
      wasOn: !!lane.steps[stepIndex],
    };

    this._addWindowDragListeners();
  }

  _addWindowDragListeners() {
    if (this._dragListenersOn) return;
    this._dragListenersOn = true;
    this._addDom(window, 'pointermove', this._onDragMove, { passive: false });
    this._addDom(window, 'pointerup', this._onDragEnd);
    this._addDom(window, 'pointercancel', this._onDragEnd);
  }

  _onDragMove = (e) => {
    const drag = this._drag;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dy = Math.abs(e.clientY - drag.startY);
    if (dy > 4) drag.moved = true;
    if (!drag.moved) return;

    e.preventDefault();
    const rect = drag.cell.getBoundingClientRect();
    const fromBottom = rect.bottom - e.clientY;
    const velocity = clampVelocity(Math.max(0.02, Math.min(1, fromBottom / rect.height)));

    const lane = this._pattern.lanes[drag.laneIndex];
    lane.steps[drag.stepIndex] = { v: velocity };
    this._paintCell(drag.cell, lane.steps[drag.stepIndex]);
  };

  _onDragEnd = (e) => {
    const drag = this._drag;
    if (!drag || e.pointerId !== drag.pointerId) return;

    if (!drag.moved) {
      const lane = this._pattern.lanes[drag.laneIndex];
      lane.steps[drag.stepIndex] = drag.wasOn ? null : { v: DEFAULT_VELOCITY };
      this._paintCell(drag.cell, lane.steps[drag.stepIndex]);
    }

    try { drag.cell.releasePointerCapture(drag.pointerId); } catch { /* already released */ }
    this._drag = null;
  };

  _onToolbarClick(e) {
    const act = e.target?.dataset?.act;
    if (!act) return;
    switch (act) {
      case 'triplet':
        this.setDivisionAll(this._rulerDivision === TRIPLET_DIVISION ? DEFAULT_DIVISION : TRIPLET_DIVISION);
        break;
      case 'overlay':
        this.overlay = this._overlay === 'syllable' ? 'none' : 'syllable';
        break;
      case 'bars-':
        this.bars = this._pattern.bars - 1;
        break;
      case 'bars+':
        this.bars = this._pattern.bars + 1;
        break;
      default:
        break;
    }
  }

  _attachInteraction() {
    // Per-cell pointerdown listeners are attached lazily in `_renderLane` (once per lane
    // row, not per cell) — recorded here only as the parent hook other files' convention
    // expects; nothing extra to attach at the grid level itself.
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
    target.addEventListener(type, fn, opts);
    this._domListeners.push({ target, type, fn, opts });
  }

  // =========================================================================================
  // SEAT QUESTION 6 — the playhead reads rAF, never the scheduler; audio reads the scheduler,
  // never rAF. The two loops in this file, side by side.
  // =========================================================================================

  /** AUDIO. Subscribed only while mounted. §3: "fires per scheduler pass, NOT per frame."
   *  This is the only method in this file that calls `instrument.noteOn`, and it always
   *  passes `timeOf(tick)` — an exact AudioContext time computed by the scheduler's own
   *  window, never `performance.now()`, never "now". */
  _onTick({ fromTick, toTick, timeOf, timeSignature }) {
    if (!this.instrument || !this._pattern) return;
    const patternTicks = this._pattern.bars * ticksPerBar(timeSignature);
    if (!(patternTicks > 0)) return;

    for (const lane of this._pattern.lanes) {
      const tps = ticksPerStep(lane.division, timeSignature);
      if (!(tps > 0) || lane.steps.length === 0) continue;

      let t = Math.ceil(fromTick / tps) * tps;
      for (; t < toTick; t += tps) {
        const cyclePos = mod(t, patternTicks);
        let idx = Math.round(cyclePos / tps);
        if (idx >= lane.steps.length) idx = 0;
        const step = lane.steps[idx];
        if (!step) continue;
        const piece = this._pieceFor(lane.piece);
        if (!piece) continue; // §14.5: no crash if unbound mid-run, just silence
        this.instrument.noteOn(piece.note, clampVelocity(step.v), timeOf(t));
      }
    }
  }

  /** VISUAL. `clock.positionTicks` is a pure read of `ctx.currentTime` (clock.js's own
   *  words) — no audio node, nothing scheduled. This loop also notices a time-signature
   *  change (top/bottom are clock-owned, not this file's, and clock.js has no change event
   *  for them) by comparing cheap primitives every frame; that comparison is not audio and
   *  costs nothing meaningful next to a canvas or analyser doing real per-frame work. */
  _rafLoop() {
    this._rafHandle = requestAnimationFrame(this._rafLoop);
    if (!this.mounted) return;

    const ts = this._clock.timeSignature;
    if (ts.top !== this._lastTs.top || ts.bottom !== this._lastTs.bottom) {
      this._lastTs = { top: ts.top, bottom: ts.bottom };
      const top = ts.top;
      for (const lane of this._pattern.lanes) {
        lane.steps = resizeLaneSteps(lane.steps, this._pattern.bars, top, lane.division);
      }
      this._renderGrid();
    }

    const patternTicks = this._pattern.bars * ticksPerBar(ts);
    if (!(patternTicks > 0)) return;
    const pos = mod(this._clock.positionTicks ?? 0, patternTicks);
    const pct = (pos / patternTicks) * 100;
    if (this.nodes.playhead) this.nodes.playhead.style.left = `${pct}%`;

    this._paintPlayingCells(pos, ts);
  }

  /** Purely cosmetic (`.is-playing` outline) — highlights, per lane, the step whose window
   *  the playhead is currently inside. Reads the same pure position the playhead line uses;
   *  schedules nothing. */
  _paintPlayingCells(pos, ts) {
    for (let i = 0; i < this._pattern.lanes.length; i++) {
      const lane = this._pattern.lanes[i];
      const tps = ticksPerStep(lane.division, ts);
      if (!(tps > 0)) continue;
      const idx = Math.floor(mod(pos, lane.steps.length * tps) / tps);
      const row = this.nodes.lanes[i];
      if (!row) continue;
      const prev = row.playingCell;
      if (prev) prev.classList.remove('is-playing');
      const cell = this._cellEl(i, idx);
      if (cell) cell.classList.add('is-playing');
      row.playingCell = cell;
    }
  }
}

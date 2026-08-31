/**
 * surfaces/diatonic-keys.js — the diatonic keyboard: one key per scale degree, not one key
 * per semitone. The surface where a student who cannot yet find notes on a piano can still
 * play in key. Built by `diatonic-keys`, P3/S5.
 *
 * Implements §12.1's Surface interface. Every drawn key's pitch, color and label text comes
 * from `theory/scale.js` — this file computes no music of its own (§10-H, collision map:
 * "No surface computes its own labels or its own colors").
 *
 * Owns: its own DOM, its own listeners, its own drawing, `surface.overlay` (§6). Does NOT
 * own: `state.scale` (`core/state.js`, §4 — this surface subscribes and calls, it does not
 * store), note numbers after they leave (`core/input.js`), any
 * AudioContext, any instrument (§12.1). Never imports `core/audio.js` — same reasoning as
 * `keyboard.js`: a click anywhere unlocks audio through `audio.js`'s own gesture net (§3).
 *
 * Frozen, read only, never edited by this file: theory/scale.js, theory/chord.js,
 * core/input.js, surfaces/keyboard.js, ui/tokens.css.
 */

import { input as sharedInput, DEFAULT_VELOCITY } from '../core/input.js';
import { state as sharedState } from '../core/state.js';
import {
  circlePositions,
  label as scaleLabel,
  MAJOR,
  DEGREE_CLAMP,
} from '../theory/scale.js';

// ---------------------------------------------------------------------------------------
// THE SCALE COMES FROM core/state.js (§4). The local stand-in is GONE.
// ---------------------------------------------------------------------------------------
// This file was built one stage before `core/state.js` existed and carried a minimal local
// stand-in shaped like §4's call surface. That file is built now and this surface uses it:
// the shared `state` is the store §4 hands every surface ("state.on('scale', fn) — every
// surface subscribes"), and `state.setScaleDegree` is the +/- this seat's brief names by
// name. Two surfaces on one page are now looking at one scale with no page wiring at all,
// which is what the stand-in's third constructor argument was faking.
//
// This surface still computes no music: every mutation is `state`'s, every value it draws is
// `theory/scale.js`'s (§10-H). What changed is where the scale is kept — nothing else.

// ---------------------------------------------------------------------------------------
// 1 · CONSTANTS  (seat question 1)
// ---------------------------------------------------------------------------------------

/** This surface's home octave. Matches `keyboard.js`'s BASE_NOTE = 60 (C4): with tonic 0
 *  the lowest drawn key is C4, the same absolute pitch the 12-note keyboard starts on. */
const BASE_OCTAVE = 4;

/** 8 drawn keys per window: the 7 degrees plus one octave-closing repeat of whichever
 *  degree `positionShift` puts at the bottom (§6 outline: "1 through 8 with 8 = Do at the
 *  octave" — generalised here to "8 = the bottom degree repeated an octave up", since
 *  `positionShift` can put a degree other than 1 at the bottom; seat question 4). */
const KEY_COUNT = 8;

const OVERLAYS = ['none', 'letter', 'number', 'solfege']; // §6, pitch surfaces

// ---------------------------------------------------------------------------------------
// 2 · THE MUSIC — one pure function, computed from theory/scale.js alone (seat question 5)
// ---------------------------------------------------------------------------------------
//
// Exported so the done-check can call it directly in plain Node, with no DOM: every pitch,
// label and color this file ever draws passes through here first, and here alone.

/**
 * `positionShift` (§5) is a pitch class 0-11 everywhere it is defined; this surface has
 * only 7 degrees, not 12 semitones, so it is remapped here into DEGREE-INDEX space by a
 * plain `% 7` — the same ROTATE-IN-PLACE idea `keyboard.js` uses for its 12 semitones
 * (`noteForIndex`), one modulus smaller. This is this seat's own easiest-to-undo call, not
 * a CONTRACTS citation: flagged in the receipt. TO CHANGE: this one line.
 */
export function startDegreeIndexFor(positionShift) {
  return ((Math.trunc(positionShift) % 7) + 7) % 7;
}

/**
 * → one drawn key's full spec, slot `k` = 0..7 (bottom to top window), for the CURRENT
 * `scale` and `positionShift`. Every field is read from theory/scale.js:
 *   · pc / midi / quality / colorToken / altered — `circlePositions()`, §15.3, direct by
 *     DEGREE INDEX. Not the pitch-based `degreeIndexOf` path, and deliberately: this key
 *     already knows which degree it is, so it never has to look its own identity up by
 *     pitch and never falls prey to the duplicate-pitch-class collapse §15.2a documents.
 *   · the overlay TEXT — `label()`, called the way M-10 rules diatonic-keys must: pitch in,
 *     plain digits out (no circle-only `'1/8'`), `opts.position` carrying the octave-close
 *     rule. `label()`'s 'letter'/'solfege' branches ignore `opts` and are unaffected.
 */
export function keySpecFor(scale, k, positionShift, overlay) {
  const start = startDegreeIndexFor(positionShift);
  const n = start + k;
  const degreeIndex = n % 7;
  const octaveWrap = Math.floor(n / 7);
  const position = n + 1; // 1-based slot, the exact opts.position label() expects

  // circlePositions() is theory/scale.js data (§15.3), not scale-circle.js — reusing it is
  // reading theory/scale.js, not touching the circle. Indices 0-6 only: entry 7 is the
  // circle's own octave-close row and this surface computes its own octave wrap above.
  const row = circlePositions(scale, BASE_OCTAVE)[degreeIndex];

  const pc = row.pc;
  const midi = row.midi + 12 * octaveWrap;
  const text = scaleLabel(scale, pc, overlay, { position }) ?? '';
  const altered = scale.altered ? scale.altered[degreeIndex] : false;

  return {
    slot: k,
    position,
    degreeIndex,
    octaveWrap,
    pc,
    midi,
    text,
    quality: row.quality,
    colorToken: row.colorToken,
    altered,
    atMax: scale.degrees[degreeIndex] >= MAJOR[degreeIndex] + DEGREE_CLAMP,
    atMin: scale.degrees[degreeIndex] <= MAJOR[degreeIndex] - DEGREE_CLAMP,
  };
}

// ---------------------------------------------------------------------------------------
// 3 · STYLE — reads /src/ui/tokens.css (§9). No fallback hex: this seat's own DONE-CHECK
//     reads "the file contains zero hex values", stricter than keyboard.js's fallback
//     precedent — flagged in the receipt as a deliberate deviation, one line per token to
//     add back if the Closer wants keyboard.js's fallback behaviour instead.
// ---------------------------------------------------------------------------------------

const STYLE_ID = 'cbdaw-diatonic-keys-style';
let liveInstances = 0;

const STYLE_TEXT = `
.cbdaw-diakeys {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
  color: var(--text);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 8px;
  user-select: none;
  -webkit-user-select: none;
}
.cbdaw-diakeys__keys {
  position: relative;
  display: flex;
  width: 100%;
  height: 168px;
  gap: 2px;
  touch-action: none;
}
.cbdaw-diakeys[data-variant="compact"] .cbdaw-diakeys__keys { height: 56px; }
.cbdaw-diakeys[data-variant="compact"] { gap: 0; padding: 4px; }

.cbdaw-diakeys__key {
  flex: 1 1 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding-bottom: 8px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--panel);
  color: var(--bg);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.cbdaw-diakeys[data-variant="compact"] .cbdaw-diakeys__key {
  padding-bottom: 3px;
  font-size: 10px;
  border-radius: 2px;
}
.cbdaw-diakeys__key[data-quality="major"]      { background: var(--deg-major); }
.cbdaw-diakeys__key[data-quality="minor"]      { background: var(--deg-minor); }
.cbdaw-diakeys__key[data-quality="diminished"] { background: var(--deg-dim); }
.cbdaw-diakeys__key[data-quality="augmented"]  { background: var(--deg-aug); }
.cbdaw-diakeys__key[data-quality="altered"]    { background: var(--deg-altered); }

/* The student moved this degree off the preset (scale.altered[i], §4) — a ring, not a
   colour swap: the fill above is still the QUALITY, this is a second, non-colour cue,
   exactly what ui/tokens.css's own comment asks a surface seat to add. */
.cbdaw-diakeys__key[data-altered="true"] {
  box-shadow: inset 0 0 0 2px var(--accent);
}

/* Note-on state. Identical regardless of route — applied from the input bus only,
   never from a local pointer handler (seat question 2, "the same state call" idea
   applied to note-on too). */
.cbdaw-diakeys__key.is-on {
  box-shadow: inset 0 0 0 2px var(--bg);
  filter: brightness(1.25);
}
.cbdaw-diakeys[data-variant="expanded"] .cbdaw-diakeys__key { transition: filter 60ms linear; }

.cbdaw-diakeys__label { pointer-events: none; }

.cbdaw-diakeys__degctl {
  display: flex;
  gap: 2px;
}
.cbdaw-diakeys__degctl button {
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  width: 18px;
  height: 16px;
  padding: 0;
  color: var(--bg);
  background: transparent;
  border: 1px solid var(--bg);
  border-radius: 3px;
  cursor: pointer;
}
.cbdaw-diakeys__degctl button:disabled { opacity: 0.35; cursor: default; }

.cbdaw-diakeys__controls {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-dim);
}
.cbdaw-diakeys__group { display: flex; align-items: center; gap: 6px; }
.cbdaw-diakeys__controls button {
  font: inherit;
  font-weight: 600;
  min-width: 30px;
  padding: 4px 9px;
  color: var(--text);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 4px;
  cursor: pointer;
}
.cbdaw-diakeys__controls button:hover { border-color: var(--accent); }
.cbdaw-diakeys__readout {
  min-width: 26px;
  text-align: center;
  color: var(--text);
  font-variant-numeric: tabular-nums;
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

// ---------------------------------------------------------------------------------------
// 4 · THE SURFACE
// ---------------------------------------------------------------------------------------

export default class DiatonicKeys {
  /** §12.1/§12.3: fixed per class. Seat question 2 — every route this surface owns emits
   *  the SAME source, unlike `keyboard.js`'s per-route assignment: "With source: 'diatonic'"
   *  is this seat brief's own wording, not a per-event choice. */
  static sourceId = 'diatonic';
  static label = 'Diatonic Keys';

  /** §12.1: `constructor(el, input)`, exactly two arguments and nothing else handed in.
   *  The scale is `core/state.js`'s shared store (§4) — imported, not passed, because §4
   *  gives every surface the same `state.scale` rather than one apiece. */
  constructor(el = null, input = sharedInput) {
    this.input = input;
    this.state = sharedState;
    this.el = null;
    this.defaultTarget = el;
    this.variant = 'expanded';

    /** Default 'number': this surface's own stated purpose is a student who cannot yet
     *  find notes on a piano playing in key by scale-degree digit, not by letter name.
     *  `keyboard.js` defaults to 'letter' for the opposite reason (it teaches note names).
     *  This seat's own easiest-to-undo call — one assignment, flagged in the receipt. */
    this._overlay = 'number';

    /** pointerId -> {note} — one entry per finger/pointer, multitouch is real. */
    this.pointerNotes = new Map();
    /** midi note -> how many sounding notes (any surface, any route) are lighting it. */
    this.litCounts = new Map();

    this.nodes = { keys: null, controls: null, octaveReadout: null, positionReadout: null,
                   overlayButton: null };
    this.keyEls = [];
    this.domListeners = [];
    this.busUnsubs = [];
    this.mounted = false;

    // Bound once so add/removeEventListener see the same function object (seat question 9).
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onControlClick = this._onControlClick.bind(this);
    this._onDegreeClick = this._onDegreeClick.bind(this);
    this._onBusNoteOn = this._onBusNoteOn.bind(this);
    this._onBusNoteOff = this._onBusNoteOff.bind(this);
    this._onBusShift = this._onBusShift.bind(this);
    this._onScaleChange = this._onScaleChange.bind(this);
  }

  // ——— §6 overlay hook (seat question 1) ————————————————————————————————————
  get overlay() {
    return this._overlay;
  }
  set overlay(value) {
    if (!OVERLAYS.includes(value)) return; // §6's enum is closed
    this._overlay = value;
    if (this.mounted) this._renderKeys();
  }

  // ——— mounting (seat question 7) ————————————————————————————————————————————
  /** §12.1's `mount(el)`. Defaults to the expanded view. */
  mount(el = this.defaultTarget, variant = 'expanded') {
    if (this.mounted) this.unmount();
    const target = el || this.defaultTarget;
    if (!target) throw new Error('DiatonicKeys.mount: no element to mount into');

    this.defaultTarget = target;
    this.variant = variant === 'compact' ? 'compact' : 'expanded';
    acquireStyle();
    this._build(target);
    this._attachListeners();
    this.mounted = true;
    return this;
  }

  /** The DAW's switchable-input strip: short, no controls bar, no per-key +/-, no
   *  animation — the same reasoning as `keyboard.js`'s compact view (§9 "DAW views stay
   *  still"). */
  mountCompact(el = this.defaultTarget) {
    return this.mount(el, 'compact');
  }

  /** The harmony tool's view: full-height keys, the +/- per key, the shift controls, and
   *  the overlay cycle — shown alongside `scale-circle` and `piano-roll`, all three live at
   *  once (STAGE.md's stage goal). */
  mountExpanded(el = this.defaultTarget) {
    return this.mount(el, 'expanded');
  }

  unmount() {
    if (!this.mounted) return this;
    this._releaseAllHeld();
    this._detachListeners();
    this.el?.remove();
    this.el = null;
    this.keyEls = [];
    this.nodes = { keys: null, controls: null, octaveReadout: null, positionReadout: null,
                   overlayButton: null };
    this.litCounts.clear();
    this.mounted = false;
    releaseStyle();
    return this;
  }

  /** §12.1: "drops every DOM listener it attached" (seat question 9 idiom, matching
   *  `keyboard.js`). Everything this surface can leak is a DOM listener, a bus/state
   *  subscription, or a note left sounding — all three are dropped here. */
  dispose() {
    const domListeners = this.domListeners.length;
    const busSubscriptions = this.busUnsubs.length;
    const notesReleased = this._releaseAllHeld();
    this.unmount();
    this.pointerNotes.clear();
    return { domListeners, busSubscriptions, notesReleased };
  }

  // -------------------------------------------------------------------------------------
  // 5 · DRAWING — positionShift lives here and ONLY here (seat question 4)
  // -------------------------------------------------------------------------------------

  _build(target) {
    const root = document.createElement('div');
    root.className = 'cbdaw-diakeys';
    root.dataset.variant = this.variant;
    root.dataset.overlay = this._overlay;
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'diatonic keys');

    const keys = document.createElement('div');
    keys.className = 'cbdaw-diakeys__keys';
    root.appendChild(keys);

    this.el = root;
    this.nodes.keys = keys;
    this._renderKeys();

    if (this.variant === 'expanded') this._buildControls(root);

    target.appendChild(root);
  }

  _renderKeys() {
    const keys = this.nodes.keys;
    if (!keys) return;
    keys.textContent = '';
    this.keyEls = [];

    const scale = this.state.scale;

    for (let k = 0; k < KEY_COUNT; k++) {
      const spec = keySpecFor(scale, k, this.input.positionShift, this._overlay);

      const key = document.createElement('div');
      key.className = 'cbdaw-diakeys__key';
      key.dataset.note = String(spec.midi);
      key.dataset.degreeIndex = String(spec.degreeIndex);
      key.dataset.position = String(spec.position);
      key.dataset.quality = spec.quality;
      key.dataset.altered = String(spec.altered);
      key.setAttribute('aria-label', spec.text || `degree ${spec.degreeIndex + 1}`);

      const label = document.createElement('span');
      label.className = 'cbdaw-diakeys__label';
      // scale.js's own note to surface seats: GLYPH's ±2 rows are markup (<i>bb</i>,
      // <i>x</i>), present in 'letter' AND 'solfege' text alike (solfegeOf reuses GLYPH).
      // textContent would print the tags literally, so this is innerHTML on a
      // sanitised-by-construction string — scale.js's own instruction, not this seat's.
      label.innerHTML = spec.text;
      key.appendChild(label);

      if (this.variant === 'expanded') {
        const ctl = document.createElement('span');
        ctl.className = 'cbdaw-diakeys__degctl';
        ctl.innerHTML = `
          <button type="button" data-deg-act="down" aria-label="lower degree ${spec.degreeIndex + 1}"
            ${spec.atMin ? 'disabled' : ''}>−</button>
          <button type="button" data-deg-act="up" aria-label="raise degree ${spec.degreeIndex + 1}"
            ${spec.atMax ? 'disabled' : ''}>+</button>`;
        key.appendChild(ctl);
      }

      keys.appendChild(key);
      this.keyEls.push(key);
    }

    if (this.el) this.el.dataset.overlay = this._overlay;
    this._applyLitState(); // a redraw must not lose a note that is still sounding
  }

  _buildControls(root) {
    const bar = document.createElement('div');
    bar.className = 'cbdaw-diakeys__controls';
    bar.innerHTML = `
      <span class="cbdaw-diakeys__group">octave
        <button type="button" data-act="oct-" aria-label="octave down">−</button>
        <span class="cbdaw-diakeys__readout" data-readout="octave">0</span>
        <button type="button" data-act="oct+" aria-label="octave up">+</button>
      </span>
      <span class="cbdaw-diakeys__group">bottom degree
        <button type="button" data-act="pos-" aria-label="bottom degree down">−</button>
        <span class="cbdaw-diakeys__readout" data-readout="position">1</span>
        <button type="button" data-act="pos+" aria-label="bottom degree up">+</button>
      </span>
      <span class="cbdaw-diakeys__group">labels
        <button type="button" data-act="overlay" data-overlay-button>number</button>
      </span>`;

    this.nodes.controls = bar;
    this.nodes.octaveReadout = bar.querySelector('[data-readout="octave"]');
    this.nodes.positionReadout = bar.querySelector('[data-readout="position"]');
    this.nodes.overlayButton = bar.querySelector('[data-overlay-button]');
    root.appendChild(bar);
    this._renderReadouts();
  }

  _renderReadouts() {
    if (!this.nodes.octaveReadout) return;
    const oct = this.input.octaveShift;
    this.nodes.octaveReadout.textContent = oct > 0 ? `+${oct}` : String(oct);
    // The bottom-degree readout: the plain scale-degree digit of whichever degree
    // `positionShift` currently draws at the bottom — position 1, so label()'s octave-close
    // rule cannot fire and the digit is always 1-7, never '8'. Read through label(), not
    // built here (this file's own rule, seat question 5).
    const start = startDegreeIndexFor(this.input.positionShift);
    const scale = this.state.scale;
    const pc = circlePositions(scale, BASE_OCTAVE)[start].pc;
    this.nodes.positionReadout.textContent = scaleLabel(scale, pc, 'number', { position: 1 });
    this.nodes.overlayButton.textContent = this._overlay;
  }

  // -------------------------------------------------------------------------------------
  // 6 · NOTE-ON STATE — one code path regardless of route (seat question 2)
  // -------------------------------------------------------------------------------------
  //
  // Lit from the INPUT BUS, never from the local pointer handler — the same discipline
  // `keyboard.js` uses, so a note sounding from ANY surface (this one, the 12-note
  // keyboard, MIDI) lights the matching key here too. Matched by exact MIDI note, not
  // pitch class: unlike the 12-note keyboard this surface draws specific octave-anchored
  // notes, not all 12 semitones, so exact-note matching is the correct (and sufficient)
  // rule here.

  _onBusNoteOn({ note }) {
    const n = (this.litCounts.get(note) || 0) + 1;
    this.litCounts.set(note, n);
    if (n === 1) this._keyElForNote(note)?.classList.add('is-on');
  }

  _onBusNoteOff({ note }) {
    const n = (this.litCounts.get(note) || 1) - 1;
    if (n > 0) {
      this.litCounts.set(note, n);
      return;
    }
    this.litCounts.delete(note);
    this._keyElForNote(note)?.classList.remove('is-on');
  }

  _onBusShift() {
    // positionShift changed which degree is at the bottom; octaveShift changed the
    // readout only (seat question 4 — the sounding pitch does not transpose here; the bus
    // applies it on the way out, §5).
    this._renderKeys();
    this._renderReadouts();
  }

  /** §4's `state.on('scale', fn)` (seat question 6). Never reads another surface directly —
   *  only `core/state.js`, which is where every surface's scale changes arrive. */
  _onScaleChange() {
    this._renderKeys();
    this._renderReadouts();
  }

  _keyElForNote(note) {
    return this.keyEls.find((k) => Number(k.dataset.note) === note) || null;
  }

  _applyLitState() {
    for (const [note, n] of this.litCounts) {
      if (n > 0) this._keyElForNote(note)?.classList.add('is-on');
    }
  }

  // -------------------------------------------------------------------------------------
  // 7 · POINTER AND TOUCH — the two local routes, one source (seat question 2)
  // -------------------------------------------------------------------------------------

  _attachListeners() {
    const keys = this.nodes.keys;
    this._addDom(keys, 'pointerdown', this._onPointerDown);
    this._addDom(keys, 'pointermove', this._onPointerMove);
    this._addDom(keys, 'pointerup', this._onPointerUp);
    this._addDom(keys, 'pointercancel', this._onPointerUp);
    this._addDom(keys, 'lostpointercapture', this._onPointerUp);
    this._addDom(keys, 'contextmenu', (e) => e.preventDefault());
    // The +/- controls are delegated clicks, not pointerdown — kept off the note-emitting
    // path entirely (see _onPointerDown's own degctl guard below).
    this._addDom(keys, 'click', this._onDegreeClick);

    if (this.nodes.controls) this._addDom(this.nodes.controls, 'click', this._onControlClick);
    this._addDom(window, 'blur', this._onBlur);

    this.busUnsubs.push(this.input.on('noteon', this._onBusNoteOn));
    this.busUnsubs.push(this.input.on('noteoff', this._onBusNoteOff));
    this.busUnsubs.push(this.input.on('shift', this._onBusShift));
    this.busUnsubs.push(this.state.on('scale', this._onScaleChange));
  }

  _addDom(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this.domListeners.push({ target, type, fn, opts });
  }

  _detachListeners() {
    for (const { target, type, fn, opts } of this.domListeners) {
      target.removeEventListener(type, fn, opts);
    }
    this.domListeners = [];
    for (const unsub of this.busUnsubs) unsub();
    this.busUnsubs = [];
  }

  _keyFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    const key = el?.closest?.('.cbdaw-diakeys__key');
    if (!key || !this.keyEls.includes(key)) return null;
    return key;
  }

  _onPointerDown(e) {
    if (e.target?.closest?.('.cbdaw-diakeys__degctl')) return; // the +/- buttons, not a note
    const key = this._keyFromPoint(e.clientX, e.clientY);
    if (!key) return;
    e.preventDefault();
    try { this.nodes.keys.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    const note = Number(key.dataset.note);
    this.pointerNotes.set(e.pointerId, { note });
    this.input.emitNoteOn({ note, velocity: DEFAULT_VELOCITY, source: DiatonicKeys.sourceId });
  }

  _onPointerMove(e) {
    const active = this.pointerNotes.get(e.pointerId);
    if (!active) return; // not down on this surface — ignore hover entirely
    const key = this._keyFromPoint(e.clientX, e.clientY);
    const note = key ? Number(key.dataset.note) : null;
    if (note === active.note) return;
    // Glissando: release the old note before starting the new one, always in that order.
    this.input.emitNoteOff({ note: active.note, source: DiatonicKeys.sourceId });
    if (note === null) {
      this.pointerNotes.delete(e.pointerId);
      return;
    }
    this.pointerNotes.set(e.pointerId, { note });
    this.input.emitNoteOn({ note, velocity: DEFAULT_VELOCITY, source: DiatonicKeys.sourceId });
  }

  _onPointerUp(e) {
    const active = this.pointerNotes.get(e.pointerId);
    if (!active) return;
    this.pointerNotes.delete(e.pointerId);
    this.input.emitNoteOff({ note: active.note, source: DiatonicKeys.sourceId });
  }

  _onBlur() {
    this._releaseAllHeld();
  }

  /** Releases everything THIS surface is holding. Never touches notes another surface or
   *  the MIDI route put on the bus — the bus reference-counts those separately. */
  _releaseAllHeld() {
    let released = 0;
    for (const [, { note }] of this.pointerNotes) {
      this.input.emitNoteOff({ note, source: DiatonicKeys.sourceId });
      released++;
    }
    this.pointerNotes.clear();
    return released;
  }

  // ——— the +/- per key (seat question 3) ——————————————————————————————————————
  /** Raises or lowers the degree under the clicked control, through §4's
   *  `state.setScaleDegree` — the same call the circle makes, into the same store. A degree
   *  moved here redraws the circle too, and neither surface knows the other exists. */
  _onDegreeClick(e) {
    const btn = e.target?.closest?.('[data-deg-act]');
    if (!btn) return;
    const key = btn.closest('.cbdaw-diakeys__key');
    if (!key) return;
    const i = Number(key.dataset.degreeIndex);
    const n = btn.dataset.degAct === 'up' ? 1 : -1;
    this.state.setScaleDegree(i, n);
    // this.state's own listener (_onScaleChange) redraws every key, including this one.
  }

  // ——— the expanded view's shift controls ————————————————————————————————————
  _onControlClick(e) {
    const act = e.target?.dataset?.act;
    if (!act) return;
    switch (act) {
      case 'oct-': this.input.octaveShift = this.input.octaveShift - 1; break;
      case 'oct+': this.input.octaveShift = this.input.octaveShift + 1; break;
      case 'pos-': this.input.positionShift = this.input.positionShift - 1; break;
      case 'pos+': this.input.positionShift = this.input.positionShift + 1; break;
      case 'overlay': {
        const next = OVERLAYS[(OVERLAYS.indexOf(this._overlay) + 1) % OVERLAYS.length];
        this.overlay = next;
        this._renderReadouts();
        break;
      }
      default: break;
    }
  }
}

export { BASE_OCTAVE, KEY_COUNT, OVERLAYS };

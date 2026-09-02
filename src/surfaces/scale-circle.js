// =========================================================================================
// surfaces/scale-circle.js — BRANDON'S SCALE CIRCLE, AS A PLAYING SURFACE
// =========================================================================================
// Seat: `scale-circle`, P3/S5. BUILD. Written 2026-08-24 17:51 EDT.
//
// Binds to: §5 (input events, FROZEN) · §6 (overlay labels, FROZEN + its 2026-08-24
//           composite amendment) · §9 (visual tokens, FROZEN + `--deg-aug`, 2026-08-24) ·
//           §12 (the Surface interface) · §15.3 (the circle), §15.4 (the colour rule),
//           §15.6/§15.8/§15.9 (the chord on a degree) · §10 (what nobody may do).
//
// WHAT THIS FILE IS
//   A PLAYING SURFACE, NOT A DIAGRAM. It is the third way into any live instrument,
//   alongside the 12-note keyboard and the diatonic keyboard, and it is the teaching device
//   the whole colour rule exists for: the colour on a slot tells a student whether the chord
//   on that degree is major or minor, so nobody memorises which numeral is minor.
//
// WHAT IT COMPUTES: NOTHING.
//   Every pitch, every label, every colour ROLE and every numeral on this surface comes out
//   of `theory/scale.js` and `theory/chord.js`. §4: "no surface computes its own colors."
//   §6: "Labels come from theory/scale.js. No surface builds its own label strings."
//   ⇒ THERE IS NO HEX VALUE AND NO PITCH/DEGREE/CHORD LABEL STRING IN THIS FILE.
//   Colours are §9 CSS custom-property NAMES handed over by `degreeColor()` and written into
//   the DOM as `var(--token)`. That is also why the CSS below carries NO hex fallbacks the
//   way `surfaces/keyboard.js` does: a fallback is a second palette in a second file (§9,
//   "one palette… no drift") and it would be a hex value in this file. THE PAGE MUST LINK
//   `/src/ui/tokens.css`. Unlinked, the surface renders shapeless — visibly wrong, which is
//   the honest failure mode, not a quietly divergent one.
//
// THE LAYOUT IS BRANDON'S AND IT IS NOT THIS SEAT'S TO CHANGE (seat brief, ESCALATION)
//   · SEVEN drawn slots, not eight — A4, Brandon: "circle draws 7 slots, labels Do 1/8."
//   · The Do slot carries the composite '1/8' — `slotNumberLabel()` in scale.js, scoped by
//     §6's 2026-08-24 amendment to THIS SURFACE ONLY. M-10 was ruled the same day: the
//     diatonic keys and the piano roll stay on plain digits through `label()`. This file
//     never reaches for `label()`'s number branch and never writes the composite itself.
//   · Do sits at 12 o'clock — A3, Brandon: "Do is 12-o-clock, top center of circle."
//     Direction was NOT ruled; §15 ships clockwise as one flippable constant. BOTH come from
//     `scale.js`'s `CIRCLE_START_ANGLE` / `CIRCLE_DIRECTION` exports, so flipping the circle
//     is an edit to the contract's own constant and not to this surface.
//
// TWO RINGS, TWO THINGS TO PLAY (seat questions 2 and 3)
//   · INNER ring — the DEGREE. Click it, that degree sounds. One note.
//   · OUTER ring — the NUMERAL. Click it, the chord on that degree sounds, built by
//     `theory/chord.js`'s `voicing()` off the skip method. The colour already told the
//     student whether it is major or minor before they clicked — that is the whole device.
//   Both rings on one slot carry the SAME colour, because they are the same computation
//   (`degreeQuality`) read twice, and they can never disagree.
//
// WHAT THIS FILE DOES NOT DO, ON PURPOSE
//   · It does not import an instrument, an AudioContext, or `core/audio.js` (§12.1).
//   · It does not read `input.positionShift`. That is "which pitch class is DRAWN as the
//     bottom key" (§5) — a keyboard concept. This circle's bottom is fixed: Do at 12
//     o'clock is Brandon's ruling (A3) and a display rotation would break it.
//     `input.octaveShift` is applied by the bus on the way out (§5) and needs nothing here.
//   · It does not play the scale as a scale. `redpen-theory`'s M-6 offers that as option (a)
//     for this seat; nobody ruled it and this seat's brief does not name it. ESCALATED in
//     the receipt, NOT built.
//   · It does not resolve M-1 (the `tonic: 6` composite letter). It draws whatever
//     `circlePositions().letter` hands it, composite or not. That is Brandon's.
// =========================================================================================

import {
  CIRCLE_SLOTS,
  CIRCLE_START_ANGLE,
  CIRCLE_DIRECTION,
  circlePositions,
} from '../theory/scale.js';

import { voicing, numeralParts } from '../theory/chord.js';

import { input as sharedInput, DEFAULT_VELOCITY } from '../core/input.js';

// -----------------------------------------------------------------------------------------
// 1 · CONSTANTS
// -----------------------------------------------------------------------------------------

/** This surface's overlay modes. MODE NAMES, not pitch labels. The degree numbers already
 *  ride outside the wheel, so 'number' would print 1..7 twice and 'none' leaves the ring
 *  blank; neither is offered here. `keyboard.js` and `diatonic-keys.js` keep their own
 *  four-mode lists — this narrowing is the circle's alone. */
const OVERLAYS = ['letter', 'solfege'];

const DEFAULT_OVERLAY = 'letter';

/** The circle's home octave. `midiOf(tonic, 4)` puts Do at middle C in the key of C — §15.1,
 *  "middle C (C4) is midi 60". `input.octaveShift` moves what SOUNDS (§5, applied by the
 *  bus); this number never moves, exactly as `BASE_NOTE` never moves on the keyboard. */
const BASE_OCTAVE = 4;

/** §15.6, and it is a curriculum requirement rather than a convenience: "basic chord is 3
 *  notes". "They do not LEARN about 7th chords, but I do show them" — a four-tone chord must
 *  be something a student reaches for, never what they get by default. The Chord Module
 *  (P3/S6) may raise `circle.chordCount`; nothing here raises it on its own. */
const DEFAULT_CHORD_COUNT = 3;

// ——— geometry, in viewBox units. One coordinate system, no pixels anywhere ————————
const VIEW = 128;            // the expanded viewBox is 0 0 128 128
const CX = VIEW / 2;
const CY = VIEW / 2;
const R_OUT = 46;            // outer edge of the NUMERAL ring
const R_MID = 32;            // the seam: numeral ring outside, degree ring inside
const R_IN = 13;             // inner edge of the DEGREE ring — the hub starts here
const R_PM = 55.5;           // where the +/- controls orbit
const R_PM_DOT = 6;          // their radius
const R_SLOTNUM = 52;        // the degree number, OUTSIDE the outer ring — expanded only
const SLOT_GAP_DEG = 2.2;    // angular padding between slots, so seven wedges read as seven
const HUB_FONT = 4.6;        // the scale's name, in the well at the centre
const HUB_LINE = 5.2;        // one wrapped line of it
/** Compact crops the +/- orbit away instead of scaling it down — one attribute, and the two
 *  variants stay one drawing. §9: "DAW views stay still." */
const VIEWBOX_EXPANDED = `0 0 ${VIEW} ${VIEW}`;
const VIEWBOX_COMPACT = `9 9 ${VIEW - 18} ${VIEW - 18}`;

const SVG_NS = 'http://www.w3.org/2000/svg';

// -----------------------------------------------------------------------------------------
// 2 · THE STORE IS HANDED IN — `core/state.js` EXISTS NOW, AND THE FALLBACK IS GONE
// -----------------------------------------------------------------------------------------
// §4 gives every surface `state.scale`, `state.on('scale', fn)` and `state.setScaleDegree`;
// §1 names `core/state.js` as the file that owns them. That file is built, so the local
// stand-in this surface carried while it was not — a subscription list wrapped around
// `theory/scale.js`'s pure transforms — has been deleted as its own comment instructed.
//
//   THE STORE IS REQUIRED. `new ScaleCircle(el, input, state)` — a missing one throws at
//   construction rather than drawing a circle nothing else on the page can hear. A page
//   hands in `core/state.js`'s shared `state`; a test or a second, independent circle hands
//   in its own `createState()`, and either can be swapped later with `bindState()`.
//
// Every read still goes through `this.store` and every write is still `state`'s — this
// surface holds no scale of its own, caches none, and computes none.
//
// ⚠ §12.1 says `constructor(el, input)` and calls `input` "the ONLY thing a surface is ever
// handed. Never an instrument, never ctx." The scale store is neither, and frozen §4 orders
// every surface to subscribe to it ("state.on('scale', fn) — every surface subscribes"). A
// third argument is the narrowest way to satisfy both; the alternative is a surface that
// imports a singleton, which is what §12.1 exists to prevent. FLAGGED in the receipt.

// -----------------------------------------------------------------------------------------
// 3 · STYLE — §9's tokens, and nothing but §9's tokens
// -----------------------------------------------------------------------------------------
// One stylesheet for every instance, reference-counted, removed when the last circle
// disposes — the pattern `surfaces/keyboard.js` already set. Every selector is prefixed
// `.cbdaw-circle`: this file styles nothing but its own.
//
// NO `var(--token, #fallback)` ANYWHERE. See the header: a fallback is a hex value in this
// file and a second palette in a second place.

const STYLE_ID = 'cbdaw-scale-circle-style';
let liveInstances = 0;

const STYLE_TEXT = `
.cbdaw-circle {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  align-items: var(--align-center);
  gap: var(--sp-4);
  width: var(--pct-100);
  box-sizing: var(--box-border-box);
  font-family: var(--font-ui);
  color: var(--text);
  background: var(--panel);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-body);
  padding: var(--sp-5);
  user-select: var(--usel-none);
  -webkit-user-select: var(--usel-none);
}
.cbdaw-circle[data-variant="compact"] { padding: var(--sp-2); gap: var(--sp-0); }

.cbdaw-circle__svg {
  display: var(--disp-block);
  width: var(--pct-100);
  max-width: var(--sp-230);
  height: var(--auto);
  touch-action: var(--touch-none);
  overflow: var(--ov-visible);
}
.cbdaw-circle[data-variant="compact"] .cbdaw-circle__svg { max-width: var(--sp-95); }

/* ——— the two playable rings ——————————————————————————————————————————————— */
.cbdaw-circle__zone {
  cursor: var(--cur-pointer);
  stroke: var(--line);
  stroke-width: 0.6;
}
.cbdaw-circle__zone:focus { outline: var(--none); }
.cbdaw-circle__zone:focus-visible {
  stroke: var(--accent);
  stroke-width: 2;
}
/* BOTH rings carry the degree's colour at nearly full strength, and that is a §9 decision,
   not a style preference: "everything must read from ten feet away on a projector in a lit
   room", and projector gamma eats a held-back fill — a dimmed amber comes back as brown,
   which teaches a colour that is not in the palette. The two rings are separated by the
   stroke between them and by WHAT IS WRITTEN ON THEM (a roman numeral outside, the degree's
   own label inside), never by a second colour and never by a value the projector can eat. */
.cbdaw-circle__zone[data-ring="degree"] { opacity: var(--op-full); }
.cbdaw-circle__zone[data-ring="numeral"] { opacity: var(--op-soft); }
.cbdaw-circle__zone:hover { opacity: var(--op-full); }

/* Note-on. Driven from the INPUT BUS, never from a local pointer handler, so a MIDI key and
   a mouse click light the same slot by the same two lines (§5: "an instrument must never
   know which one fired" — nor must a surface). */
.cbdaw-circle__zone.is-on {
  opacity: var(--op-full);
  stroke: var(--text);
  stroke-width: 1.6;
}
/* §9: "Standalone views may animate. DAW views stay still." */
.cbdaw-circle[data-variant="expanded"] .cbdaw-circle__zone {
  transition: var(--tr-opacity-stroke);
}

/* ——— text on the rings ——————————————————————————————————————————————————— */
.cbdaw-circle__text {
  pointer-events: var(--pe-none);
  text-anchor: var(--text-anchor-middle);
  dominant-baseline: var(--dominant-baseline-central);
  font-weight: var(--w-bold);
  fill: var(--bg);
}
/* Dark ink on the teaching colour, on BOTH rings. --text on a bright amber is the one
   pairing in this palette that does not survive the room test. */
.cbdaw-circle__text[data-ring="numeral"] { font-weight: var(--w-heavy); }
.cbdaw-circle__well {
  pointer-events: var(--pe-none);
  fill: var(--panel);
  stroke: var(--line);
  stroke-width: 0.6;
}
.cbdaw-circle__hub {
  pointer-events: var(--pe-none);
  text-anchor: var(--text-anchor-middle);
  dominant-baseline: var(--dominant-baseline-central);
  fill: var(--text-dim);
  font-weight: var(--w-med);
}

/* ——— the degree number, outside the outer ring ————————————————————————————
   NOTE FOR THE NEXT EDITOR: this whole stylesheet is a TEMPLATE LITERAL. No backticks in
   these comments — one closes the literal and the CSS below it is parsed as JavaScript.
   That is why nothing in here quotes a symbol the way the JSDoc above does.

   Brandon ruled this from a sketch: the numbers ride OUTSIDE the wheel, off the coloured
   ground entirely, so the count 1..7 reads as a ruler around the shape rather than as one
   more thing painted on a wedge. It is --text-dim for the same reason: it is the scale's
   index, not a thing you play. Not a zone, not focusable, no pointer events — the ring
   under it is what you click.
   The label is entry.number verbatim, which is slotNumberLabel()'s output, which is where
   '1/8' on the merged Do slot comes from (A4). This file spells nothing. */
.cbdaw-circle__slotnum {
  pointer-events: var(--pe-none);
  text-anchor: var(--text-anchor-middle);
  dominant-baseline: var(--dominant-baseline-central);
  fill: var(--text-dim);
  font-weight: var(--w-med);
}

/* ——— the +/- per degree, §4 ————————————————————————————————————————————— */
.cbdaw-circle__pm { cursor: var(--cur-pointer); }
.cbdaw-circle__pm circle {
  fill: var(--panel);
  stroke: var(--line);
  stroke-width: 0.8;
}
.cbdaw-circle__pm:hover circle { stroke: var(--accent); }
.cbdaw-circle__pm:focus { outline: var(--none); }
.cbdaw-circle__pm:focus-visible circle { stroke: var(--accent); stroke-width: 1.8; }
.cbdaw-circle__pm text {
  pointer-events: var(--pe-none);
  text-anchor: var(--text-anchor-middle);
  dominant-baseline: var(--dominant-baseline-central);
  fill: var(--text);
  font-weight: var(--w-bold);
}
.cbdaw-circle[data-variant="compact"] .cbdaw-circle__pm { display: var(--disp-none); }

/* The student MOVED this degree — §4's scale.altered[i], which is NOT the colour.
   A5 is explicit: the --deg-altered token names the QUALITY (a stack that is not a triad), and
   "moved" is read from the boolean instead, so no token is overloaded. Marked with the UI
   accent and a dashed outline: a shape cue as well as a colour one, which is what
   tokens.css asks every P3 surface for. */
.cbdaw-circle__moved {
  fill: var(--none);
  stroke: var(--accent);
  stroke-width: 1.4;
  stroke-dasharray: var(--stroke-dash);
  cursor: var(--cur-pointer);
}

/* ——— the controls bar, expanded only ——————————————————————————————————— */
.cbdaw-circle__controls {
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-5);
  flex-wrap: var(--flexwrap-wrap);
  justify-content: var(--justify-center);
  font-size: var(--fs-md);
  color: var(--text-dim);
}
.cbdaw-circle__controls button {
  font: var(--font-inherit);
  font-weight: var(--w-med);
  padding: var(--sp-2) var(--sp-5);
  color: var(--text);
  background: var(--panel);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-ctl);
  cursor: var(--cur-pointer);
}
.cbdaw-circle__controls button:hover { border-color: var(--accent); }
.cbdaw-circle[data-variant="compact"] .cbdaw-circle__controls { display: var(--disp-none); }
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
// 4 · GEOMETRY — A3's two constants are the only orientation facts in this file
// -----------------------------------------------------------------------------------------

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/** SVG's y axis points down, so `CIRCLE_START_ANGLE = -90` lands on top centre and a rising
 *  angle sweeps CLOCKWISE — which is exactly what `CIRCLE_DIRECTION = +1` means in §15's own
 *  words. Flip that one exported constant and this whole surface reverses. */
function polar(r, deg) {
  const rad = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

/** The mid-angle of drawn slot `p` (1-based, 1 … CIRCLE_SLOTS). */
function slotAngle(p) {
  return CIRCLE_START_ANGLE + CIRCLE_DIRECTION * (p - 1) * (360 / CIRCLE_SLOTS);
}

/** An annulus wedge. Both rings of every slot are this one function. */
function wedgePath(rIn, rOut, a0, a1) {
  const [x0, y0] = polar(rOut, a0);
  const [x1, y1] = polar(rOut, a1);
  const [x2, y2] = polar(rIn, a1);
  const [x3, y3] = polar(rIn, a0);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  const f = (n) => n.toFixed(3);
  return [
    `M${f(x0)} ${f(y0)}`,
    `A${rOut} ${rOut} 0 ${large} ${sweep} ${f(x1)} ${f(y1)}`,
    `L${f(x2)} ${f(y2)}`,
    `A${rIn} ${rIn} 0 ${large} ${1 - sweep} ${f(x3)} ${f(y3)}`,
    'Z',
  ].join(' ');
}

function pcOf(note) {
  return ((note % 12) + 12) % 12;
}

// -----------------------------------------------------------------------------------------
// 5 · THE SURFACE — §12.1
// -----------------------------------------------------------------------------------------

export default class ScaleCircle {
  /** §12.1, and §5's enum already carries it. Unlike the keyboard — which owns three live
   *  routes and labels each EVENT by the route that fired — every event this surface produces
   *  is `source: 'circle'`, mouse or touch or key alike. §15.3 says so outright. */
  static sourceId = 'circle';

  /**
   * §12.1's `constructor(el, input)`, plus the §4 scale store — see section 2.
   * `store` is REQUIRED: hand in `core/state.js`'s shared `state`, which is how altering a
   * degree here reaches the diatonic keys, the piano roll and the note bank (seat question
   * 5), or a `createState()` of your own for an independent circle. Swappable afterwards
   * with `bindState(store)`.
   */
  constructor(element = null, input = sharedInput, store = undefined) {
    if (!store) {
      throw new Error('ScaleCircle: a §4 scale store is required — pass core/state.js\'s `state`.');
    }
    this.input = input;
    this.store = store;
    this.defaultTarget = element;
    this.el = null;
    this.variant = 'expanded';

    this._overlay = DEFAULT_OVERLAY;
    /** §15.6's default. Settable by the Chord Module; no control in this surface raises it. */
    this.chordCount = DEFAULT_CHORD_COUNT;
    /** The circle's home octave. `voicing()` and `circlePositions()` both take it. */
    this.octave = BASE_OCTAVE;

    /** pointerId -> {notes:[…]} — one entry per finger, so multitouch is real and a chord
     *  held under one finger releases as one chord. */
    this.pointerNotes = new Map();
    /** focusable zone -> notes it is holding from an Enter/Space press. */
    this.keyNotes = new Map();
    /** pitch class -> how many sounding notes are lighting it. Reference-counted, so a chord
     *  and a single note on the same degree do not cut each other's highlight off. */
    this.litCounts = new Map();

    this.nodes = { svg: null, rings: null, controls: null, overlayButton: null, hub: null };
    this.zoneEls = [];
    this.domListeners = [];
    this.busUnsubs = [];
    this.storeUnsub = null;
    this.mounted = false;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onZoneKeyDown = this._onZoneKeyDown.bind(this);
    this._onZoneKeyUp = this._onZoneKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onControlClick = this._onControlClick.bind(this);
    this._onBusNoteOn = this._onBusNoteOn.bind(this);
    this._onBusNoteOff = this._onBusNoteOff.bind(this);
    this._onScaleChange = this._onScaleChange.bind(this);
  }

  // ——— §6's per-surface overlay (seat question 6) ——————————————————————————————
  get overlay() {
    return this._overlay;
  }

  set overlay(value) {
    if (!OVERLAYS.includes(value)) return;   // §6's enum is closed
    this._overlay = value;
    if (this.mounted) this._render();
  }

  /** The current scale, straight off the store. Never cached — a cached scale is a second
   *  source of truth and §4 allows exactly one. */
  get scale() {
    return this.store.scale;
  }

  /**
   * Point this circle at a different §4 store without rebuilding the surface — a project
   * load that replaces the store, or a page moving one circle between two scales.
   * Re-subscribes and redraws; the old subscription is dropped, never left dangling.
   *
   * RENAMED 2026-08-24 from `attachState`, which was the same operation under a second name
   * (`redpen-p3` Q9 item 9 / Q7 finding 6). `bindState` won on call sites: two definitions
   * (`surfaces/piano-roll.js`, `instruments/chord-module.js`) and two live callers
   * (`tools/harmonyNEW.html`), against `attachState`'s one definition and zero callers. No
   * `attachState` METHOD remains anywhere in `/src` or `/tools` — the only occurrences of
   * the word left are the three in this note. Behaviour is unchanged, and the
   * constructor's required-`store` argument is untouched — that one is Brandon's.
   */
  bindState(store) {
    if (!store) return this;
    this.storeUnsub?.();
    this.storeUnsub = null;
    this.store = store;
    if (this.mounted) {
      this.storeUnsub = this.store.on('scale', this._onScaleChange);
      this._render();
    }
    return this;
  }

  // ——— mounting (seat question 7) —————————————————————————————————————————————
  mount(target = this.defaultTarget, variant = 'expanded') {
    if (this.mounted) this.unmount();
    const host = target || this.defaultTarget;
    if (!host) throw new Error('ScaleCircle.mount: no element to mount into');

    this.defaultTarget = host;
    this.variant = variant === 'compact' ? 'compact' : 'expanded';
    acquireStyle();
    this._build(host);
    this._attachListeners();
    this.mounted = true;
    return this;
  }

  /** The DAW's switchable input: small, no controls bar, no `+/-`, no animation (§9). */
  mountCompact(target = this.defaultTarget) {
    return this.mount(target, 'compact');
  }

  /** The harmony tool's view: full size, the `+/-` per degree, the overlay cycle, and the
   *  animation budget — "worth watching on a projector" (seat question 8). */
  mountExpanded(target = this.defaultTarget) {
    return this.mount(target, 'expanded');
  }

  unmount() {
    if (!this.mounted) return this;
    this._releaseAllHeld();
    this._detachListeners();
    this.el?.remove();
    this.el = null;
    this.zoneEls = [];
    this.nodes = { svg: null, rings: null, controls: null, overlayButton: null, hub: null };
    this.litCounts.clear();
    this.mounted = false;
    releaseStyle();
    return this;
  }

  /** §12.1: "drops every DOM listener it attached." Everything this surface can leak is a DOM
   *  listener, a bus subscription, a store subscription, or a note left sounding. All four go
   *  here, and the counts come back so a caller can verify by number. */
  dispose() {
    const domListeners = this.domListeners.length;
    const busSubscriptions = this.busUnsubs.length + (this.storeUnsub ? 1 : 0);
    const notesReleased = this._releaseAllHeld();
    this.unmount();
    this.pointerNotes.clear();
    this.keyNotes.clear();
    return { domListeners, busSubscriptions, notesReleased };
  }

  // ---------------------------------------------------------------------------------------
  // 6 · DRAWING — one call to `circlePositions()`, and this file draws what came back
  // ---------------------------------------------------------------------------------------

  _build(host) {
    const root = document.createElement('div');
    root.className = 'cbdaw-circle';
    root.dataset.variant = this.variant;
    root.dataset.overlay = this._overlay;

    const svg = el('svg', {
      class: 'cbdaw-circle__svg',
      viewBox: this.variant === 'compact' ? VIEWBOX_COMPACT : VIEWBOX_EXPANDED,
      role: 'group',
      'aria-label': 'scale circle',
    });
    root.appendChild(svg);

    this.el = root;
    this.nodes.svg = svg;
    this._render();

    if (this.variant === 'expanded') this._buildControls(root);
    host.appendChild(root);
  }

  /**
   * THE ONE CALL. §15.3: "One call. `scale-circle` (P3/S5) draws what this returns and
   * computes nothing itself."
   *
   * `circlePositions()` returns EIGHT entries and this surface draws SEVEN (A4). Entry 8 is
   * position 1 in every respect except its `midi`, which carries the octave — it survives in
   * the data and is not a slot. §15.3 named the click on the merged Do slot as an
   * easiest-to-undo call by `spec-scale`: it sounds `entries[0].midi`, the LOWER tonic.
   * TO SOUND THE OCTAVE INSTEAD: read `entries[7].midi` in `_notesForZone` — one line, and
   * `_octaveMidi` below already has it isolated.
   */
  _render() {
    const svg = this.nodes.svg;
    if (!svg) return;
    svg.textContent = '';
    this.zoneEls = [];

    const scale = this.scale;
    const entries = circlePositions(scale, this.octave);
    const span = 360 / CIRCLE_SLOTS;

    const rings = el('g');
    svg.appendChild(rings);
    this.nodes.rings = rings;

    for (let p = 1; p <= CIRCLE_SLOTS; p++) {
      const entry = entries[p - 1];
      const mid = slotAngle(p);
      const a0 = mid - span / 2 + SLOT_GAP_DEG / 2;
      const a1 = mid + span / 2 - SLOT_GAP_DEG / 2;

      // The colour ROLE, from scale.js. `colorToken` is a §9 custom-property NAME like
      // '--deg-major'; `tokens.css` maps names to pixels. No hex reaches this file.
      const paint = `var(${entry.colorToken})`;

      // ——— outer ring: the NUMERAL. Click sounds the CHORD on this degree ————
      const numeralZone = el('path', {
        class: 'cbdaw-circle__zone',
        d: wedgePath(R_MID, R_OUT, a0, a1),
        fill: paint,
        'data-ring': 'numeral',
        'data-position': p,
        'data-degree': entry.degreeIndex,
        'data-pc': entry.pc,
        role: 'button',
        tabindex: '0',
      });
      numeralZone.setAttribute('aria-label', this._numeralAria(entry));
      rings.appendChild(numeralZone);
      this.zoneEls.push(numeralZone);

      // ——— inner ring: the DEGREE. Click sounds the NOTE ————————————————————
      const degreeZone = el('path', {
        class: 'cbdaw-circle__zone',
        d: wedgePath(R_IN, R_MID, a0, a1),
        fill: paint,
        'data-ring': 'degree',
        'data-position': p,
        'data-degree': entry.degreeIndex,
        'data-pc': entry.pc,
        role: 'button',
        tabindex: '0',
      });
      degreeZone.setAttribute('aria-label', this._degreeAria(entry));
      rings.appendChild(degreeZone);
      this.zoneEls.push(degreeZone);

      // ——— the numeral text: A9's superscript rule, and `numeralParts` is how ————
      // A9 binds every surface: "every chord-quality marker and every extension digit is
      // superscript to the chord label. Never inline." `numeralOf`'s flat string is for
      // tooltips and tests; a DRAWING surface must use `numeralParts`. The `°`/`+` a student
      // sees is chord.js's `SUFFIX`, never a glyph typed here — which is also the redundant
      // NON-COLOUR cue tokens.css asks P3's surfaces to carry for dim and augmented.
      const parts = numeralParts(scale, entry.degreeIndex, this.chordCount);
      const [nx, ny] = polar((R_MID + R_OUT) / 2, mid);
      const numeralText = el('text', {
        class: 'cbdaw-circle__text',
        'data-ring': 'numeral',
        x: nx.toFixed(3),
        y: ny.toFixed(3),
        'font-size': 7,
      });
      const base = el('tspan');
      base.textContent = parts.base;
      numeralText.appendChild(base);
      if (parts.sup) {
        const sup = el('tspan', { 'font-size': 4.4, dy: -3 });
        sup.textContent = parts.sup;
        numeralText.appendChild(sup);
      }
      rings.appendChild(numeralText);

      // ——— the degree text: §6's overlay, straight off the entry ——————————————
      // '1/8' on the Do slot arrives here as `entry.number` from `slotNumberLabel()` (A4).
      // M-10 was ruled the same day: the composite is scoped to THIS surface and no other,
      // so this file reads the circle's own field and never calls `label()`'s number branch.
      const text = this._overlayTextFor(entry);
      if (text) {
        const [dx, dy] = polar((R_IN + R_MID) / 2, mid);
        const degreeText = el('text', {
          class: 'cbdaw-circle__text',
          'data-ring': 'degree',
          x: dx.toFixed(3),
          y: dy.toFixed(3),
          'font-size': 6.2,
        });
        degreeText.textContent = text;
        rings.appendChild(degreeText);
      }

      // ——— §4's `altered` — "see THAT THEY MOVED IT, and get back" ————————————
      if (entry.altered) {
        const moved = el('path', {
          class: 'cbdaw-circle__moved',
          d: wedgePath(R_IN + 1.2, R_MID - 1.2, a0 + 1, a1 - 1),
          'data-act': 'reset',
          'data-degree': entry.degreeIndex,
          role: 'button',
          tabindex: '0',
        });
        moved.setAttribute('aria-label', this._resetAria(entry));
        rings.appendChild(moved);
      }

      // ——— the degree number, OUTSIDE the wheel — expanded only ————————————————
      // `entry.number` is `slotNumberLabel()`'s string and nothing else: '1/8' arrives on the
      // Do slot already made (A4, and the same field the degree overlay reads at L631). The
      // compact variant is left out on purpose — its viewBox is inset by 9 on every side and
      // the DAW's 190px circle has no room for a ring of text it did not ask for.
      if (this.variant === 'expanded') {
        const [sx, sy] = polar(R_SLOTNUM, mid);
        const slotNum = el('text', {
          class: 'cbdaw-circle__slotnum',
          'data-position': p,
          x: sx.toFixed(3),
          y: sy.toFixed(3),
          'font-size': 5.4,
        });
        slotNum.textContent = entry.number;
        rings.appendChild(slotNum);
      }

      // ——— the `+/-` per degree (seat question 4), expanded only ————————————————
      if (this.variant === 'expanded') {
        rings.appendChild(this._buildPm(mid - span / 4.6, entry.degreeIndex, +1));
        rings.appendChild(this._buildPm(mid + span / 4.6, entry.degreeIndex, -1));
      }
    }

    // ——— the hub: the scale's NAME, which is scale.js's `scaleName()` output ————
    svg.appendChild(el('circle', { class: 'cbdaw-circle__well', cx: CX, cy: CY, r: R_IN - 0.6 }));
    // Seat question 4 ends "and the name updates". It updates because this whole function
    // re-runs on every 'scale' event and the store hands back a scale whose `name` was
    // recomputed by `theory/scale.js`. This file does not name a scale — 'scale unknown'
    // included, that string is Brandon's and it lives in scale.js.
    // Wrapped on whitespace, because the name is not this file's to shorten: `scaleName()`
    // returns Brandon's own 'scale unknown' for anything the preset list does not match, and
    // a hub that clipped it would hide the one string he wrote specifically to be seen.
    const words = String(scale.name ?? '').split(/\s+/).filter(Boolean);
    const hub = el('text', {
      class: 'cbdaw-circle__hub',
      x: CX,
      y: CY,
      'font-size': HUB_FONT,
    });
    words.forEach((word, k) => {
      const tspan = el('tspan', {
        x: CX,
        dy: k === 0 ? -((words.length - 1) * HUB_LINE) / 2 : HUB_LINE,
      });
      tspan.textContent = word;
      hub.appendChild(tspan);
    });
    svg.appendChild(hub);
    this.nodes.hub = hub;

    if (this.el) this.el.dataset.overlay = this._overlay;
    if (this.nodes.overlayButton) this.nodes.overlayButton.textContent = this._overlay;
    this._applyLitState();   // a redraw must not lose a note that is still sounding
  }

  /** §4's `+/-`. `n` is SEMITONES, which is `setScaleDegree(i, semitones)`'s own signature —
   *  scale.js clamps to `DEGREE_CLAMP` and rejects an out-of-range index, so this surface
   *  needs no guard of its own and must not grow one. */
  _buildPm(angle, degreeIndex, n) {
    const [x, y] = polar(R_PM, angle);
    const g = el('g', {
      class: 'cbdaw-circle__pm',
      'data-act': 'alter',
      'data-degree': degreeIndex,
      'data-delta': n,
      role: 'button',
      tabindex: '0',
    });
    g.setAttribute('aria-label', this._alterAria(degreeIndex, n));
    g.appendChild(el('circle', { cx: x.toFixed(3), cy: y.toFixed(3), r: R_PM_DOT }));
    const t = el('text', { x: x.toFixed(3), y: y.toFixed(3), 'font-size': 8 });
    // §4 and the curriculum (A14) call this control "a +/-". These two glyphs are the
    // CONTROL, not a theory label: no pitch, degree, syllable or chord quality is spelled
    // anywhere in this file.
    t.textContent = n > 0 ? '+' : '−';
    g.appendChild(t);
    return g;
  }

  /** Read off the row `circlePositions()` already finished. `letter` can be null on a degree
   *  pushed past `DEGREE_CLAMP` (scale.js returns `text: null` rather than a wrong name); an
   *  empty string is the honest draw. */
  _overlayTextFor(entry) {
    switch (this._overlay) {
      case 'solfege': return entry.solfege;
      case 'letter':
      default: return entry.letter ?? '';
    }
  }

  // ——— accessible names. Assembled from scale.js's strings; none is written here ————
  _degreeAria(entry) {
    return [entry.number, entry.letter, entry.solfege].filter(Boolean).join(' ');
  }

  _numeralAria(entry) {
    const parts = numeralParts(this.scale, entry.degreeIndex, this.chordCount);
    return parts.base + parts.sup;
  }

  _alterAria(degreeIndex, n) {
    const entry = circlePositions(this.scale, this.octave)[degreeIndex];
    return `${n > 0 ? '+' : '−'} ${this._degreeAria(entry)}`;
  }

  _resetAria(entry) {
    return `reset ${this._degreeAria(entry)}`;
  }

  _buildControls(root) {
    const bar = document.createElement('div');
    bar.className = 'cbdaw-circle__controls';
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.act = 'overlay';
    button.textContent = this._overlay;      // §6's mode name, not a pitch label
    button.setAttribute('aria-label', 'overlay labels');
    bar.appendChild(button);
    this.nodes.controls = bar;
    this.nodes.overlayButton = button;
    root.appendChild(bar);
  }

  // ---------------------------------------------------------------------------------------
  // 7 · PLAYING — seat questions 2 and 3
  // ---------------------------------------------------------------------------------------

  /**
   * The note (or notes) a zone sounds.
   *
   *   inner ring → ONE note: this degree's own midi, from `circlePositions()`.
   *   outer ring → THE CHORD on this degree: `theory/chord.js`'s `voicing()`, which is
   *                `skipStack` — the skip method — offset from the tonic. §15.6.
   *
   * The chord's quality was never asked for here. The colour on the slot already said it,
   * and it came from the same `degreeQuality` the numeral's case came from. Three readings,
   * one computation, and they cannot disagree.
   */
  _notesForZone(zone) {
    const degreeIndex = Number(zone.dataset.degree);
    if (!Number.isInteger(degreeIndex)) return [];
    const scale = this.scale;
    if (zone.dataset.ring === 'numeral') {
      return voicing(scale, degreeIndex, this.chordCount, this.octave);
    }
    const entry = circlePositions(scale, this.octave)[degreeIndex];
    return [entry.midi];
  }

  /** A4's easiest-to-undo call, isolated so reversing it is one call site. §15.3: the merged
   *  Do slot sounds the LOWER tonic; the octave pitch stays on entry 8 for whatever wants it. */
  _octaveMidi() {
    return circlePositions(this.scale, this.octave)[7].midi;
  }

  _sound(notes) {
    for (const note of notes) {
      this.input.emitNoteOn({ note, velocity: DEFAULT_VELOCITY, source: ScaleCircle.sourceId });
    }
  }

  _silence(notes) {
    for (const note of notes) {
      this.input.emitNoteOff({ note, source: ScaleCircle.sourceId });
    }
  }

  // ---------------------------------------------------------------------------------------
  // 8 · NOTE-ON STATE — lit from the bus, never from the local handler
  // ---------------------------------------------------------------------------------------
  // Lit by PITCH CLASS, reference-counted: a MIDI controller playing a low tonic lights Do,
  // and a chord that contains Do plus a separate click on Do light it once and keep it lit
  // until both let go. Exact-note matching would leave the teaching surface dark for a
  // student on a full-size controller, which reads as broken hardware.

  _onBusNoteOn({ note }) {
    const pc = pcOf(note);
    const n = (this.litCounts.get(pc) || 0) + 1;
    this.litCounts.set(pc, n);
    if (n === 1) this._lightPc(pc, true);
  }

  _onBusNoteOff({ note }) {
    const pc = pcOf(note);
    const n = (this.litCounts.get(pc) || 1) - 1;
    if (n > 0) {
      this.litCounts.set(pc, n);
      return;
    }
    this.litCounts.delete(pc);
    this._lightPc(pc, false);
  }

  /** A student who moves one degree onto another produces two slots on one pitch class
   *  (§15.2a, and scale.js keeps that visible on purpose). BOTH light. Picking one would
   *  hide what their own `+/-` press did. */
  _lightPc(pc, on) {
    for (const zone of this.zoneEls) {
      if (Number(zone.dataset.pc) !== pc) continue;
      zone.classList.toggle('is-on', on);
    }
  }

  _applyLitState() {
    for (const [pc, n] of this.litCounts) {
      if (n > 0) this._lightPc(pc, true);
    }
  }

  // ---------------------------------------------------------------------------------------
  // 9 · EVENTS
  // ---------------------------------------------------------------------------------------

  _attachListeners() {
    const svg = this.nodes.svg;
    this._addDom(svg, 'pointerdown', this._onPointerDown);
    this._addDom(svg, 'pointerup', this._onPointerUp);
    this._addDom(svg, 'pointercancel', this._onPointerUp);
    this._addDom(svg, 'lostpointercapture', this._onPointerUp);
    this._addDom(svg, 'contextmenu', (e) => e.preventDefault());
    this._addDom(svg, 'keydown', this._onZoneKeyDown);
    this._addDom(svg, 'keyup', this._onZoneKeyUp);
    // Tab away mid-chord and no pointerup ever arrives. Without this, every note is stuck.
    this._addDom(window, 'blur', this._onBlur);

    if (this.nodes.controls) this._addDom(this.nodes.controls, 'click', this._onControlClick);

    this.busUnsubs.push(this.input.on('noteon', this._onBusNoteOn));
    this.busUnsubs.push(this.input.on('noteoff', this._onBusNoteOff));

    // §4: "state.on('scale', fn) — every surface subscribes." This is the ONLY way a scale
    // change reaches this surface, and the only way one made here reaches the others. No
    // surface is ever called directly (seat question 5).
    this.storeUnsub = this.store.on('scale', this._onScaleChange);
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
    this.storeUnsub?.();
    this.storeUnsub = null;
  }

  /** The scale moved — here, or on the diatonic keys, or in the DAW header. One redraw, and
   *  the colours, the numerals, the labels and the name all come back off `theory/scale.js`
   *  and `theory/chord.js`. Nothing is patched in place; there is no second code path for
   *  "a change that came from somewhere else". */
  _onScaleChange() {
    if (this.mounted) this._render();
  }

  // ——— pointer: mouse and touch, one handler ————————————————————————————————
  _zoneFromEvent(e) {
    const target = e.target;
    if (!target || typeof target.closest !== 'function') return null;
    return target.closest('.cbdaw-circle__zone, .cbdaw-circle__pm, .cbdaw-circle__moved');
  }

  _onPointerDown(e) {
    const zone = this._zoneFromEvent(e);
    if (!zone) return;
    e.preventDefault();

    // The `+/-` and the reset badge MUTATE the scale; they do not sound.
    if (zone.dataset.act === 'alter') {
      this.store.setScaleDegree(Number(zone.dataset.degree), Number(zone.dataset.delta));
      return;
    }
    if (zone.dataset.act === 'reset') {
      this.store.resetScaleDegree?.(Number(zone.dataset.degree));
      return;
    }

    // Capture on the SVG, not the wedge: a finger that slides off the circle still reports,
    // so pointerup always arrives and nothing sticks.
    try { this.nodes.svg.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    const notes = this._notesForZone(zone);
    if (!notes.length) return;
    this.pointerNotes.set(e.pointerId, notes);
    this._sound(notes);
  }

  _onPointerUp(e) {
    const notes = this.pointerNotes.get(e.pointerId);
    if (!notes) return;
    this.pointerNotes.delete(e.pointerId);
    this._silence(notes);
  }

  // ——— keyboard activation on a focused zone ————————————————————————————————
  // Every zone is a real `role="button"` with a tabindex, so the circle is reachable without
  // a pointer. This adds no §5 route: the events it produces are `source: 'circle'` like
  // every other press on this surface (§15.3), not `source: 'key'`.
  _onZoneKeyDown(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const zone = this._zoneFromEvent(e);
    if (!zone) return;
    e.preventDefault();
    if (e.repeat) return;

    if (zone.dataset.act === 'alter') {
      this.store.setScaleDegree(Number(zone.dataset.degree), Number(zone.dataset.delta));
      return;
    }
    if (zone.dataset.act === 'reset') {
      this.store.resetScaleDegree?.(Number(zone.dataset.degree));
      return;
    }
    if (this.keyNotes.has(zone)) return;
    const notes = this._notesForZone(zone);
    if (!notes.length) return;
    this.keyNotes.set(zone, notes);
    this._sound(notes);
  }

  _onZoneKeyUp(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const zone = this._zoneFromEvent(e);
    if (!zone) return;
    const notes = this.keyNotes.get(zone);
    if (!notes) return;
    this.keyNotes.delete(zone);
    this._silence(notes);
  }

  _onBlur() {
    this._releaseAllHeld();
  }

  /** Releases everything THIS surface is holding, and nothing else. Notes another surface or
   *  the MIDI route put on the bus are reference-counted there and are not this file's. */
  _releaseAllHeld() {
    let released = 0;
    for (const [, notes] of this.pointerNotes) {
      this._silence(notes);
      released += notes.length;
    }
    this.pointerNotes.clear();
    for (const [, notes] of this.keyNotes) {
      this._silence(notes);
      released += notes.length;
    }
    this.keyNotes.clear();
    return released;
  }

  _onControlClick(e) {
    const act = e.target?.dataset?.act;
    if (act !== 'overlay') return;
    this.overlay = OVERLAYS[(OVERLAYS.indexOf(this._overlay) + 1) % OVERLAYS.length];
  }
}

export { ScaleCircle, OVERLAYS, BASE_OCTAVE, DEFAULT_CHORD_COUNT };

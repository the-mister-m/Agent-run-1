// =========================================================================================
// surfaces/comp-builder.js — CHORD BANK · ROOT POSITIONS · COMP POSITIONS
// =========================================================================================
// Three boxes that share one progression:
//
//   CHORD BANK      you BUILD each chord. An arrow selector picks the root and the app says
//                   the letter. Five chips per chord — Root 3rd 5th 7th 9th — turn a tone on
//                   or off, and a +/- above each chip bends that one tone a semitone.
//                   7ths and 9ths start OFF by default.
//   ROOT POSITIONS  auto-populated FROM the bank. Stacked root-at-the-bottom, numeral under.
//                   This is the box that makes sound: click a note, hear the note; click the
//                   numeral, hear the chord.
//   COMP POSITIONS  empty squares. Drag a note down out of Root Positions and re-voice the
//                   progression by hand, against the three rules printed in the box.
//
// WHAT THIS FILE DOES NOT DO
//   It computes no music. Every pitch comes from `voicing()`, every letter from
//   `spellingOfPc()`, every name from `chordNameParts()` and every numeral from
//   `numeralParts()`. This file spells nothing and names nothing.
//
// NAMING
//   `chordNamePartsOfStack` names the intervals that are sounding, so bent tones are named.
//   Three states have no name and are marked in --warn with a dashed edge and the reason:
//   a moved root, a stack under three notes, a gap with more tones above it. A stack the
//   tables do not reach reads FANCY. Notes always play; only the name is ever missing.
//
// SOUND
//   None is made here. `bindPlayer()` takes anything with `noteOn(midi, vel)` / `noteOff(midi)`
//   and the page decides what that is. This surface is silent on its own.
// =========================================================================================

import {
  spellingOf,
  spellingOfPc,
} from '../theory/scale.js';

import {
  voicing,
  chordNamePartsOfStack,
  numeralPartsOfStack,
  chordToneScaleNumber,
} from '../theory/chord.js';

// -----------------------------------------------------------------------------------------
// 1 · SHAPE CONSTANTS
// -----------------------------------------------------------------------------------------

/** Five chords across, which is what the sketch draws in both right-hand boxes. */
const SLOTS = 5;

/** Root, 3rd, 5th, 7th, 9th — the five chips over each chord in the sketch. */
const TONES = 5;

/** 7ths and 9ths start off by default. */
const DEFAULT_ON = Object.freeze([true, true, true, false, false]);

/** The sketch's own progression, as DEGREE INDICES: I · V · vi · IV · ii.
 *  Degrees, not letters, so the whole bank re-spells itself when the key changes and this
 *  file never learns a key. */
const DEFAULT_DEGREES = Object.freeze([0, 4, 5, 3, 1]);

// HOW MANY DROP SQUARES A CHORD GETS — the same number of squares as the notes (triad is 3,
// 7th is 4, 9th is 5). So it is not a constant. `_compRows` reads the chord's own lit tones
// and `_syncComp` resizes the column when a chip is switched, keeping what is already
// placed anchored to the BOTTOM square so the stack does not jump.

/** The octave the lowest note of every chord sits in. `voicing()` takes an absolute octave
 *  and 4 is middle C. Same range as every other instrument's octave selector. */
const BASE_OCTAVE = 4;
const OCTAVE_MIN = 1;
const OCTAVE_MAX = 7;

/** How far a +/- may bend one tone before the control stops. Two semitones each way is
 *  `scale.js`'s own DEGREE_CLAMP, reused so the two +/- controls on this page behave alike. */
const BEND_CLAMP = 2;

/** The chip's caption, keyed by the SCALE NUMBER `chordToneScaleNumber` hands back. Not a
 *  positional list: if that function ever changes what position 3 is called, this follows. */
const TONE_CAPTION = Object.freeze({ 1: 'Root', 3: '3rd', 5: '5th', 7: '7th', 9: '9th' });

/** The three comping rules shown in the box. Verbatim — not re-keyed to the current scale;
 *  the D/C#/E in rule 2 is a fixed example text, not derived. */
const RULES = Object.freeze([
  'Keep common notes (D should stay the same between chords)',
  'Find neighboring notes of next chord (D should either go down to C# or up to E… ' +
    'highlight that in the proceeding chord to show it.)',
  'If two neighboring notes, skip for now (if they see that, they\'ll know to skip)',
]);

const mod = (n, m) => ((n % m) + m) % m;

// -----------------------------------------------------------------------------------------
// 2 · STYLE — one element, reference-counted, same pattern every other surface uses
// -----------------------------------------------------------------------------------------

const STYLE_ID = 'cbdaw-comp-builder-style';
let styleRefs = 0;

// ⚠ THIS IS A TEMPLATE LITERAL. No backticks in the comments below — one of them closes the
// literal and every rule after it is parsed as JavaScript. (That is not hypothetical; it
// happened in scale-circle.js this session and blanked the page.)
const STYLE_TEXT = `
.cb-root {
  display: var(--disp-grid); gap: var(--sp-5);
  grid-template-columns: var(--grid-60-140);
  align-items: var(--align-start);
  color: var(--text, #f2f6fc);
  font-family: var(--font-ui);

  /* Cell size for .cb-note, .cb-square and .cb-numeral — all three read this one value. */
  --cb-cell: var(--sp-20);
}
@media (max-width: 900px) { .cb-root { grid-template-columns: var(--grid-1fr); } }
.cb-root *, .cb-root *::before, .cb-root *::after { box-sizing: var(--box-border-box); }

.cb-box {
  border: var(--bw) solid var(--line, #3a485f);
  background: var(--panel, #1b2332);
  border-radius: var(--r-ctl);
  padding: var(--sp-4) var(--sp-5) var(--sp-5h);
}
.cb-box + .cb-box { margin-top: var(--sp-5); }
.cb-box__title {
  margin: 0 0 var(--sp-4h); text-align: var(--ta-center);
  font-size: var(--fs-base); font-weight: var(--w-med); letter-spacing: var(--track-mid);
  color: var(--text, #f2f6fc);
}
.cb-right { display: var(--disp-flex); flex-direction: var(--flexdir-column); }

/* ——— CHORD BANK ————————————————————————————————————————————————————————— */
.cb-slot { padding: var(--sp-3h) 0; }
.cb-slot + .cb-slot { border-top: var(--bw) solid var(--line, #3a485f); }

.cb-slot__head { display: var(--disp-flex); align-items: var(--align-center); gap: 7px; margin-bottom: var(--sp-2h); }
.cb-arrows { display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-1); }
.cb-arrow {
  font: var(--font-inherit); font-size: var(--fs-tiny); line-height: var(--lh-none); cursor: var(--cur-pointer);
  padding: var(--sp-1) var(--sp-2h); border-radius: var(--r-sm);
  color: var(--text, #f2f6fc); background: var(--color-transparent);
  border: var(--bw) solid var(--line, #3a485f);
}
.cb-arrow:hover { border-color: var(--accent, #34e5b4); }
.cb-arrow:focus-visible { outline: 2px solid var(--accent, #34e5b4); outline-offset: var(--ring-off); }

.cb-slot__root { font-size: var(--fs-chord); font-weight: var(--w-bold); min-width: var(--sp-em-21); }
.cb-slot__name { font-size: var(--fs-sm); color: var(--text-dim, #93a1b8); }
.cb-slot__name sup { font-size: var(--fs-em-70); }

/* The chip row. Each chip is a tone; the +/- rides directly above it, which is where the
   sketch puts it and why the caption and the pair share one column. */
/* Bottom-aligned so the Root chip, which carries no +/- above it, still sits on the same
   line as the four that do. */
.cb-chips { display: var(--disp-flex); flex-wrap: var(--flexwrap-wrap); align-items: var(--align-flex-end); gap: var(--sp-2) var(--sp-5); }
.cb-tone { display: var(--disp-flex); flex-direction: var(--flexdir-column); align-items: var(--align-center); gap: var(--sp-1); }
.cb-bend { display: var(--disp-flex); gap: var(--sp-1); }
.cb-bend button {
  font: var(--font-inherit); font-size: var(--fs-tiny); line-height: var(--lh-none); cursor: var(--cur-pointer);
  width: var(--sp-7h); padding: var(--sp-hair) 0; border-radius: var(--r-sm);
  color: var(--text-dim, #93a1b8); background: var(--color-transparent);
  border: var(--bw) solid var(--line, #3a485f);
}
.cb-bend button:hover { border-color: var(--accent, #34e5b4); color: var(--text, #f2f6fc); }
.cb-bend button:focus-visible { outline: 2px solid var(--accent, #34e5b4); outline-offset: var(--ring-off); }

.cb-chip {
  font: var(--font-inherit); font-size: var(--fs-xs); cursor: var(--cur-pointer);
  padding: var(--sp-1h) var(--sp-3h); border-radius: var(--r-chip); min-width: var(--sp-em-36);
  color: var(--text-dim, #93a1b8); background: var(--color-transparent);
  border: var(--bw) solid var(--line, #3a485f);
}
.cb-chip:hover { border-color: var(--accent, #34e5b4); }
.cb-chip:focus-visible { outline: 2px solid var(--accent, #34e5b4); outline-offset: var(--ring-off); }
.cb-chip[aria-pressed="true"] {
  color: var(--text, #f2f6fc);
  border-color: var(--accent, #34e5b4);
  background: color-mix(in srgb, var(--accent, #34e5b4) 16%, transparent);
}
.cb-chip__letter { display: var(--disp-block); font-size: var(--fs-sm); font-weight: var(--w-bold); }
/* A tone the student bent with the +/-. Marked by SHAPE as well as colour, which is what
   tokens.css asks every teaching surface for. */
.cb-chip[data-bent="true"] { border-style: var(--line-dashed); border-color: var(--warn, #ff7a1a); }

.cb-autofill {
  display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-3); margin-top: var(--sp-3);
  font-size: var(--fs-sm); color: var(--text-dim, #93a1b8); cursor: var(--cur-pointer);
}
.cb-autofill input { cursor: var(--cur-pointer); }

/* ——— ROOT POSITIONS ——————————————————————————————————————————————————— */
.cb-cols { display: var(--disp-grid); grid-template-columns: repeat(${SLOTS}, minmax(0, 1fr)); gap: var(--sp-3); }
.cb-col { display: var(--disp-flex); flex-direction: var(--flexdir-column); align-items: var(--align-center); gap: 3px; }

/* Root Positions columns hang from the bottom of the box, Comp Positions columns from the
   top, which puts both numerals against the gap between the two boxes. */
.cb-col--roots { justify-content: var(--justify-flex-end); }
.cb-col--comp { justify-content: var(--justify-flex-start); }

.cb-note {
  font: var(--font-inherit); font-size: var(--fs-lg); font-weight: var(--w-med); cursor: var(--cur-grab);
  width: var(--pct-100); max-width: var(--cb-cell); aspect-ratio: var(--aspect-square); min-height: var(--cb-cell);
  display: var(--disp-flex); align-items: var(--align-center); justify-content: var(--justify-center);
  border-radius: var(--r-sm); text-align: var(--ta-center);
  color: var(--text, #f2f6fc); background: var(--color-transparent);
  border: var(--bw) solid var(--line, #3a485f);
}
.cb-note:hover { border-color: var(--accent, #34e5b4); }
.cb-note:focus-visible { outline: 2px solid var(--accent, #34e5b4); outline-offset: var(--ring-off); }
.cb-note:active { cursor: var(--cur-grabbing); }
.cb-note.is-on { border-color: var(--text, #f2f6fc); }

.cb-numeral {
  font: var(--font-inherit); font-size: var(--fs-numeral); cursor: var(--cur-pointer); margin-top: var(--sp-2);
  width: var(--pct-100); max-width: var(--cb-cell); padding: var(--sp-1) 0; border-radius: var(--r-sm);
  color: var(--text, #f2f6fc); background: var(--color-transparent);
  border: var(--bw) solid var(--line, #3a485f);
}
/* The Comp Positions numeral sits ABOVE its squares, so its margin is on the other side. */
.cb-numeral--comp { margin-top: var(--sp-0); margin-bottom: var(--sp-2); }
.cb-numeral:hover { border-color: var(--accent, #34e5b4); }
.cb-numeral:focus-visible { outline: 2px solid var(--accent, #34e5b4); outline-offset: var(--ring-off); }
.cb-numeral sup { font-size: var(--fs-em-62); }

/* FAIL OUT LOUD. Not a tooltip, not a console line — the chord wears it. */
.cb-broken {
  color: var(--warn, #ff7a1a);
  border-color: var(--warn, #ff7a1a);
  border-style: var(--line-dashed);
}
.cb-why {
  margin: var(--sp-2) 0 0; font-size: var(--fs-xs); line-height: var(--lh-base); text-align: var(--ta-center);
  color: var(--warn, #ff7a1a);
}

/* ——— COMP POSITIONS ———————————————————————————————————————————————————— */
/* Same box as .cb-note, off the same --cb-cell. */
.cb-square {
  width: var(--pct-100); max-width: var(--cb-cell); aspect-ratio: var(--aspect-square); min-height: var(--cb-cell);
  display: var(--disp-flex); align-items: var(--align-center); justify-content: var(--justify-center);
  font-size: var(--fs-lg); font-weight: var(--w-med);
  border: var(--bw) solid var(--line, #3a485f); border-radius: var(--r-sm);
  color: var(--text, #f2f6fc); background: var(--color-transparent);
}
.cb-square[data-over="true"] { border-color: var(--accent, #34e5b4); border-style: var(--line-dashed); }
.cb-square[data-filled="true"] { cursor: var(--cur-pointer); border-color: var(--text-dim, #93a1b8); }

/* ——— THE FLOOR KNOB ————————————————————————————————————————————————————— */
/* Top of Root Positions. One stepper for the whole progression. */
.cb-floor {
  display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-3);
  margin: 0 0 var(--sp-4); font-size: var(--fs-sm); color: var(--text-dim, #93a1b8);
}
.cb-floor__label { flex: var(--flex-1); }
.cb-floor__value {
  font-size: var(--fs-md); font-weight: var(--w-bold);
  color: var(--text, #f2f6fc); min-width: var(--sp-em-14); text-align: var(--ta-center);
}
.cb-floor button {
  font: var(--font-inherit); font-size: var(--fs-sm); line-height: var(--lh-none); cursor: var(--cur-pointer);
  width: var(--sp-9); padding: var(--sp-1) 0; border-radius: var(--r-sm);
  color: var(--text, #f2f6fc); background: var(--color-transparent);
  border: var(--bw) solid var(--line, #3a485f);
}
.cb-floor button:hover:not(:disabled) { border-color: var(--accent, #34e5b4); }
.cb-floor button:focus-visible { outline: 2px solid var(--accent, #34e5b4); outline-offset: var(--ring-off); }
.cb-floor button:disabled { opacity: var(--op-faint); cursor: var(--cur-default); }

.cb-rules { margin: var(--sp-4h) 0 0; font-size: var(--fs-sm); line-height: var(--lh-loose); color: var(--text-dim, #93a1b8); }
.cb-rules__lede { font-style: var(--font-style-italic); font-size: var(--fs-base); color: var(--text, #f2f6fc); margin: 0 0 var(--sp-3); }
.cb-rules ol { margin: var(--sp-0); padding-left: var(--sp-9); }
.cb-rules li { margin: var(--sp-1) 0; }
`;

function acquireStyle() {
  styleRefs += 1;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
}

function releaseStyle() {
  styleRefs = Math.max(0, styleRefs - 1);
  if (styleRefs > 0) return;
  document.getElementById(STYLE_ID)?.remove();
}

// -----------------------------------------------------------------------------------------
// 3 · THE SURFACE
// -----------------------------------------------------------------------------------------

export default class CompBuilder {
  static id = 'comp-builder';
  static label = 'Comp Builder';

  constructor(store = null) {
    this.store = store;
    this.el = null;
    this.mounted = false;
    this.octave = BASE_OCTAVE;

    this.player = null;
    this.held = new Set();

    this.listeners = [];
    this.storeUnsub = null;

    /** One row per chord. `on` is which chips are lit; `bend` is the +/- per tone, in
     *  semitones. `comp` is the Comp Positions column — one cell per lit tone, each null or
     *  a midi number the student dragged in. It starts empty and `_syncComp` sizes it. */
    this.slots = DEFAULT_DEGREES.map((degree) => ({
      degree,
      on: [...DEFAULT_ON],
      bend: new Array(TONES).fill(0),
      comp: [],
      autofill: false,
    }));

    this.nodes = {};
  }

  // ——— wiring ————————————————————————————————————————————————————————————————

  /** The scale store. Same duck-typed bind pattern other surfaces use. */
  bindState(store) {
    if (this.storeUnsub) { this.storeUnsub(); this.storeUnsub = null; }
    this.store = store;
    if (store?.on) this.storeUnsub = store.on('scale', () => this._render());
    if (this.mounted) this._render();
    return this;
  }

  /** Anything with `noteOn(midi, velocity)` / `noteOff(midi)`. The page picks and re-picks.
   *  Held notes are released against the outgoing player before the swap. */
  bindPlayer(instrument) {
    this._releaseAll();
    this.player = instrument ?? null;
    if (this.mounted) this._render();
    return this;
  }

  /** The octave the lowest note of every chord sits in. Clamped, redraws on change. */
  setOctave(n) {
    const next = Math.min(OCTAVE_MAX, Math.max(OCTAVE_MIN, Math.trunc(n)));
    if (!Number.isFinite(next) || next === this.octave) return this;
    this._releaseAll();
    this.octave = next;
    if (this.mounted) this._render();
    return this;
  }

  get scale() {
    return this.store?.scale ?? null;
  }

  // ——— mount / unmount ————————————————————————————————————————————————————————

  mountExpanded(host) {
    acquireStyle();
    const root = document.createElement('div');
    root.className = 'cb-root';
    this.el = root;

    const bank = this._box('Chord Bank');
    const right = document.createElement('div');
    right.className = 'cb-right';
    const roots = this._box('Root Positions');
    const comp = this._box('Comp Positions');
    right.append(roots, comp);
    root.append(bank, right);

    this.nodes.bank = bank.body;
    this.nodes.roots = roots.body;
    this.nodes.comp = comp.body;

    host.appendChild(root);
    this.mounted = true;

    // A pointer released anywhere must release the note, or a drag off a note leaves it
    // ringing. Window-level, and counted in dispose like every other listener.
    this._listen(window, 'pointerup', () => this._releaseAll());
    this._listen(window, 'blur', () => this._releaseAll());

    this._render();
    return this;
  }

  unmount() {
    for (const l of this.listeners) l.el.removeEventListener(l.type, l.fn);
    this.listeners.length = 0;
    this._releaseAll();
    this.el?.remove();
    this.el = null;
    this.mounted = false;
    releaseStyle();
  }

  /** Counted, not claimed — the same report shape the other surfaces return. */
  dispose() {
    const domListeners = this.listeners.length;
    const busSubscriptions = this.storeUnsub ? 1 : 0;
    const notesReleased = this.held.size;
    if (this.storeUnsub) { this.storeUnsub(); this.storeUnsub = null; }
    this.unmount();
    return { domListeners, busSubscriptions, notesReleased };
  }

  _listen(el, type, fn) {
    if (!el) return;
    el.addEventListener(type, fn);
    this.listeners.push({ el, type, fn });
  }

  _box(title) {
    const box = document.createElement('section');
    box.className = 'cb-box';
    const h = document.createElement('p');
    h.className = 'cb-box__title';
    h.textContent = title;
    box.appendChild(h);
    const body = document.createElement('div');
    box.appendChild(body);
    box.body = body;
    return box;
  }

  // ---------------------------------------------------------------------------------------
  // 4 · THE MUSIC — every value here comes back from theory/, none is computed
  // ---------------------------------------------------------------------------------------

  /** The five stacked tones of one slot, bent by its +/-, whether or not each is switched on.
   *  `voicing()` is asked for all five every time so a chip toggling on never re-stacks the
   *  ones already showing — turning the 7th on must not move the 3rd. */
  _tonesOf(slot) {
    const scale = this.scale;
    if (!scale) return [];
    const stack = voicing(scale, slot.degree, TONES, this.octave);
    return stack.map((midi, j) => ({
      j,
      number: chordToneScaleNumber(j),
      midi: midi + slot.bend[j],
      bent: slot.bend[j] !== 0,
      on: slot.on[j],
    }));
  }

  /** The tones that are actually sounding, low to high. */
  _liveTonesOf(slot) {
    return this._tonesOf(slot).filter((t) => t.on);
  }

  /** One square per note in the chord: triad 3, seventh 4, ninth 5. A chord with every chip
   *  off would give zero squares and no way back, so the floor is one. */
  _compRows(slot) {
    return Math.max(1, this._liveTonesOf(slot).length);
  }

  /** Resize a slot's comp column to match its chord, keeping what is already placed pinned
   *  to the BOTTOM. Turning the 7th on adds a square at the top rather than shuffling every
   *  note the student already dragged; turning it back off drops that square. */
  _syncComp(slot) {
    const rows = this._compRows(slot);
    if (slot.comp.length === rows) return;
    const next = new Array(rows).fill(null);
    const keep = Math.min(rows, slot.comp.length);
    for (let k = 0; k < keep; k++) {
      next[rows - 1 - k] = slot.comp[slot.comp.length - 1 - k];
    }
    slot.comp = next;
  }

  /**
   * → `{ offsets, reason }`. `offsets` is the measured stack in semitones above the root,
   * for `chordNamePartsOfStack` / `numeralPartsOfStack`. Exactly one of the two is non-null.
   *
   * Bent tones are named, not refused. Three states have no name:
   *   · slot.bend[0] is non-zero — the root moved, and the letter head would not follow.
   *   · fewer than three lit chips.
   *   · a dark chip with lit chips above it.
   */
  _nameStack(slot) {
    if (slot.bend[0] !== 0) {
      return { offsets: null, reason: 'root moved — pick a new root instead' };
    }
    let count = 0;
    while (count < TONES && slot.on[count]) count += 1;
    if (count < 3) {
      return { offsets: null, reason: 'needs three notes' };
    }
    if (slot.on.slice(count).some(Boolean)) {
      return { offsets: null, reason: 'gap in the stack — no name for this one' };
    }
    const tones = this._liveTonesOf(slot);
    const base = tones[0].midi;
    return { offsets: tones.map((t) => t.midi - base), reason: null };
  }

  /** The numeral button both boxes carry. `notes()` supplies what it plays; an unnameable
   *  chord wears '?' and still plays. */
  _numeralButton(slot, i, { variant, label, notes }) {
    const scale = this.scale;
    const num = document.createElement('button');
    num.type = 'button';
    num.className = 'cb-numeral';
    if (variant === 'comp') num.classList.add('cb-numeral--comp');

    const { offsets } = this._nameStack(slot);
    if (offsets === null) {
      num.classList.add('cb-broken');
      num.textContent = '?';
    } else {
      const parts = numeralPartsOfStack(scale, slot.degree, offsets);
      num.textContent = parts.base;
      if (parts.sup) {
        const sup = document.createElement('sup');
        sup.textContent = parts.sup;
        num.appendChild(sup);
      }
    }
    num.setAttribute('aria-label', `${label} ${i + 1}`);
    this._listen(num, 'pointerdown', () => this._press(notes()));
    return num;
  }

  /** Rules 1 and 2, computed. For chord `i`, compare each of its tones to chord `i-1`:
   *  same pitch class is a common note, one semitone away is a neighbour. The first chord
   *  has nothing before it and is marked neither. */
  _leadingFor(i) {
    if (i === 0) return new Map();
    const prev = this._liveTonesOf(this.slots[i - 1]).map((t) => mod(t.midi, 12));
    const out = new Map();
    for (const tone of this._liveTonesOf(this.slots[i])) {
      const pc = mod(tone.midi, 12);
      if (prev.includes(pc)) { out.set(tone.j, 'common'); continue; }
      const near = prev.some((p) => {
        const d = Math.abs(mod(pc - p + 6, 12) - 6);
        return d === 1;
      });
      if (near) out.set(tone.j, 'neighbor');
    }
    return out;
  }

  // ---------------------------------------------------------------------------------------
  // 5 · SOUND — handed out, never made here
  // ---------------------------------------------------------------------------------------

  _press(midis) {
    if (!this.player?.noteOn) return;
    for (const m of midis) {
      if (this.held.has(m)) continue;
      this.held.add(m);
      this.player.noteOn(m, 0.85);
    }
  }

  _releaseAll() {
    if (!this.held.size) return 0;
    const n = this.held.size;
    for (const m of this.held) this.player?.noteOff?.(m);
    this.held.clear();
    return n;
  }

  // ---------------------------------------------------------------------------------------
  // 6 · DRAW
  // ---------------------------------------------------------------------------------------

  _render() {
    if (!this.mounted || !this.scale) return;
    this._renderBank();
    this._renderRoots();
    this._renderComp();
  }

  _renderBank() {
    const host = this.nodes.bank;
    host.textContent = '';
    const scale = this.scale;

    this.slots.forEach((slot, i) => {
      const row = document.createElement('div');
      row.className = 'cb-slot';

      // ——— the arrow selector. Steps a DEGREE, wrapping, and the app says the letter ———
      const head = document.createElement('div');
      head.className = 'cb-slot__head';

      const arrows = document.createElement('div');
      arrows.className = 'cb-arrows';
      for (const [glyph, step, aria] of [['▲', +1, 'root up'], ['▼', -1, 'root down']]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cb-arrow';
        b.textContent = glyph;
        b.setAttribute('aria-label', `chord ${i + 1} ${aria}`);
        this._listen(b, 'click', () => {
          slot.degree = mod(slot.degree + step, 7);
          this._render();
        });
        arrows.appendChild(b);
      }
      head.appendChild(arrows);

      const rootText = document.createElement('span');
      rootText.className = 'cb-slot__root';
      rootText.textContent = spellingOf(scale, slot.degree).text ?? '';
      head.appendChild(rootText);

      // The chord's own name, or the loud reason there isn't one.
      const nameEl = document.createElement('span');
      nameEl.className = 'cb-slot__name';
      const { offsets, reason } = this._nameStack(slot);
      if (offsets === null) {
        nameEl.classList.add('cb-broken');
        nameEl.textContent = reason;
      } else {
        const parts = chordNamePartsOfStack(scale, slot.degree, offsets);
        nameEl.textContent = parts.base;
        if (parts.sup) {
          const sup = document.createElement('sup');
          sup.textContent = parts.sup;
          nameEl.appendChild(sup);
        }
      }
      head.appendChild(nameEl);
      row.appendChild(head);

      // ——— the five chips, each with its +/- above it ————————————————————————
      const chips = document.createElement('div');
      chips.className = 'cb-chips';
      for (const tone of this._tonesOf(slot)) {
        const cell = document.createElement('div');
        cell.className = 'cb-tone';

        // The root carries no +/-. It is moved with the arrows in the head, not bent.
        if (tone.j > 0) {
          const bend = document.createElement('div');
          bend.className = 'cb-bend';
          for (const [glyph, delta, aria] of [['+', +1, 'up'], ['−', -1, 'down']]) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = glyph;
            b.setAttribute(
              'aria-label',
              `chord ${i + 1} ${TONE_CAPTION[tone.number] ?? tone.number} a semitone ${aria}`
            );
            this._listen(b, 'click', () => {
              const next = slot.bend[tone.j] + delta;
              if (Math.abs(next) > BEND_CLAMP) return;
              slot.bend[tone.j] = next;
              this._render();
            });
            bend.appendChild(b);
          }
          cell.appendChild(bend);
        }

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'cb-chip';
        chip.dataset.bent = String(tone.bent);
        chip.setAttribute('aria-pressed', String(tone.on));
        chip.textContent = TONE_CAPTION[tone.number] ?? String(tone.number);
        if (tone.on) {
          const letter = document.createElement('span');
          letter.className = 'cb-chip__letter';
          letter.textContent = spellingOfPc(scale, mod(tone.midi, 12)).text ?? '';
          chip.appendChild(letter);
        }
        this._listen(chip, 'click', () => {
          slot.on[tone.j] = !slot.on[tone.j];
          this._render();
        });
        cell.appendChild(chip);
        chips.appendChild(cell);
      }
      row.appendChild(chips);

      // ——— Auto fill the notes ————————————————————————————————————————————
      // Fills THIS chord's Comp Positions column with a voice-led answer, nearest tone to
      // whatever is already in the column to its left. The give-up button, in other words —
      // the bank row itself is already filled the moment a root is picked.
      const auto = document.createElement('label');
      auto.className = 'cb-autofill';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = slot.autofill;
      this._listen(box, 'change', () => {
        slot.autofill = box.checked;
        if (box.checked) this._autofill(i);
        else slot.comp = new Array(this._compRows(slot)).fill(null);
        this._render();
      });
      auto.appendChild(box);
      auto.appendChild(document.createTextNode('Auto fill the notes'));
      row.appendChild(auto);

      host.appendChild(row);
    });
  }

  /** The floor stepper. Sets `this.octave`, which `voicing()` reads for every slot. */
  _renderFloor(host) {
    const row = document.createElement('div');
    row.className = 'cb-floor';

    const label = document.createElement('span');
    label.className = 'cb-floor__label';
    label.textContent = 'Lowest note sits in octave';
    row.appendChild(label);

    const down = document.createElement('button');
    down.type = 'button';
    down.textContent = '−';
    down.disabled = this.octave <= OCTAVE_MIN;
    down.setAttribute('aria-label', 'lowest octave down');
    this._listen(down, 'click', () => this.setOctave(this.octave - 1));
    row.appendChild(down);

    const value = document.createElement('span');
    value.className = 'cb-floor__value';
    value.textContent = String(this.octave);
    row.appendChild(value);

    const up = document.createElement('button');
    up.type = 'button';
    up.textContent = '+';
    up.disabled = this.octave >= OCTAVE_MAX;
    up.setAttribute('aria-label', 'lowest octave up');
    this._listen(up, 'click', () => this.setOctave(this.octave + 1));
    row.appendChild(up);

    host.appendChild(row);
  }

  _renderRoots() {
    const host = this.nodes.roots;
    host.textContent = '';
    const scale = this.scale;

    this._renderFloor(host);

    const cols = document.createElement('div');
    cols.className = 'cb-cols';

    this.slots.forEach((slot, i) => {
      const col = document.createElement('div');
      col.className = 'cb-col cb-col--roots';

      // Highest note first — the sketch stacks them with the root at the bottom.
      const tones = this._liveTonesOf(slot).slice().reverse();

      for (const tone of tones) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cb-note';
        b.draggable = true;
        b.dataset.midi = String(tone.midi);
        b.dataset.slot = String(i);
        b.textContent = spellingOfPc(scale, mod(tone.midi, 12)).text ?? '';
        b.setAttribute(
          'aria-label',
          `${b.textContent}, ${TONE_CAPTION[tone.number] ?? tone.number} of chord ${i + 1}`
        );

        this._listen(b, 'pointerdown', () => {
          b.classList.add('is-on');
          this._press([tone.midi]);
        });
        this._listen(b, 'pointerup', () => { b.classList.remove('is-on'); this._releaseAll(); });
        this._listen(b, 'pointerleave', () => { b.classList.remove('is-on'); this._releaseAll(); });
        this._listen(b, 'pointercancel', () => { b.classList.remove('is-on'); this._releaseAll(); });
        // STARTING A DRAG MUST KILL THE NOTE. A drag cancels the pointer stream, so the
        // `pointerup` that would have released this note never arrives and it rings for as
        // long as the student holds the drag. Release here, at the moment the drag takes
        // over — the press already sounded, which is all the preview needs to be.
        this._listen(b, 'dragstart', (e) => {
          e.dataTransfer?.setData('text/plain', String(tone.midi));
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
          b.classList.remove('is-on');
          this._releaseAll();
        });
        this._listen(b, 'dragend', () => { b.classList.remove('is-on'); this._releaseAll(); });
        col.appendChild(b);
      }

      // ——— the numeral, which is also the whole-chord play button ————————————
      // Bottom of the column. Plays the chord as stacked — root position.
      col.appendChild(this._numeralButton(slot, i, {
        variant: 'roots',
        label: 'play chord',
        notes: () => this._liveTonesOf(slot).map((t) => t.midi),
      }));

      const { offsets, reason } = this._nameStack(slot);
      if (offsets === null) {
        const why = document.createElement('p');
        why.className = 'cb-why';
        why.textContent = reason;
        col.appendChild(why);
      }

      cols.appendChild(col);
    });

    host.appendChild(cols);
  }

  _renderComp() {
    const host = this.nodes.comp;
    host.textContent = '';
    const scale = this.scale;

    const cols = document.createElement('div');
    cols.className = 'cb-cols';

    this.slots.forEach((slot, i) => {
      const col = document.createElement('div');
      col.className = 'cb-col cb-col--comp';

      this._syncComp(slot);

      // ——— the numeral ——————————————————————————————————————————————————————
      // Top of the column. Plays the contents of `slot.comp`; an empty column is silent.
      col.appendChild(this._numeralButton(slot, i, {
        variant: 'comp',
        label: 'play your voicing of chord',
        notes: () => slot.comp.filter((m) => m !== null),
      }));

      for (let r = 0; r < slot.comp.length; r++) {
        const cell = document.createElement('div');
        cell.className = 'cb-square';
        const midi = slot.comp[r];
        cell.dataset.filled = String(midi !== null);
        if (midi !== null) {
          cell.textContent = spellingOfPc(scale, mod(midi, 12)).text ?? '';
          cell.setAttribute('role', 'button');
          cell.setAttribute('tabindex', '0');
          this._listen(cell, 'pointerdown', () => this._press([midi]));
        }

        this._listen(cell, 'dragover', (e) => {
          e.preventDefault();
          cell.dataset.over = 'true';
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        });
        this._listen(cell, 'dragleave', () => { cell.dataset.over = 'false'; });
        this._listen(cell, 'drop', (e) => {
          e.preventDefault();
          cell.dataset.over = 'false';
          const raw = e.dataTransfer?.getData('text/plain');
          const n = Number(raw);
          if (!Number.isFinite(n)) return;
          slot.comp[r] = n;
          this._render();
        });

        col.appendChild(cell);
      }

      cols.appendChild(col);
    });

    host.appendChild(cols);

    const rules = document.createElement('div');
    rules.className = 'cb-rules';
    const lede = document.createElement('p');
    lede.className = 'cb-rules__lede';
    lede.textContent =
      'Drag chips from the top notes and put them into squares down here, following rules:';
    rules.appendChild(lede);
    const ol = document.createElement('ol');
    for (const text of RULES) {
      const li = document.createElement('li');
      li.textContent = text;
      ol.appendChild(li);
    }
    rules.appendChild(ol);
    host.appendChild(rules);
  }

  /** Rule 1 and rule 2, played out by the machine: for each tone of chord `i`, take the
   *  octave of it that sits closest to what the column on the left already holds. Common
   *  tones therefore stay put, and everything else moves the shortest distance it can —
   *  which is the whole lesson, done for the student who could not find it. */
  _autofill(i) {
    const slot = this.slots[i];
    const tones = this._liveTonesOf(slot);
    const prev = i > 0
      ? this.slots[i - 1].comp.filter((m) => m !== null)
      : [];
    const anchor = prev.length ? prev : this._liveTonesOf(slot).map((t) => t.midi);

    const placed = tones.map((tone) => {
      let best = tone.midi;
      let bestDist = Infinity;
      for (let oct = -2; oct <= 2; oct++) {
        const cand = tone.midi + oct * 12;
        const dist = Math.min(...anchor.map((a) => Math.abs(cand - a)));
        if (dist < bestDist) { bestDist = dist; best = cand; }
      }
      return best;
    }).sort((a, b) => a - b);

    const rows = this._compRows(slot);
    slot.comp = new Array(rows).fill(null);
    // Bottom square is the lowest note, so the column reads like the stack above it. There
    // is now exactly one square per tone, so this fills the column rather than truncating.
    placed.slice(0, rows).forEach((m, k) => {
      slot.comp[rows - 1 - k] = m;
    });
  }
}

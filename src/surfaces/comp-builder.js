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
// FAILING OUT LOUD
//   `chordNameParts` names a tertian stack on a scale degree. The moment a student bends a
//   tone with +/-, or turns on a 9th while the 5th is off, the thing on screen is no longer
//   that, and no exported function in `theory/` will name it. So this file does not guess:
//   it marks the chord broken, in --warn, with a dashed edge and the words. The notes stay
//   correct and still play — it is the name that is missing, and the student is told which.
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
  chordNameParts,
  numeralParts,
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

/** Where `voicing()` puts the stack. Matches the Chord Module's own default octave. */
const BASE_OCTAVE = 4;

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
  display: grid; gap: 10px;
  grid-template-columns: minmax(205px, 0.6fr) minmax(320px, 1.4fr);
  align-items: start;
  color: var(--text, #f2f6fc);
  font-family: system-ui, -apple-system, sans-serif;
}
@media (max-width: 900px) { .cb-root { grid-template-columns: 1fr; } }
.cb-root *, .cb-root *::before, .cb-root *::after { box-sizing: border-box; }

.cb-box {
  border: 1px solid var(--line, #3a485f);
  background: var(--panel, #1b2332);
  border-radius: 5px;
  padding: 9px 10px 11px;
}
.cb-box + .cb-box { margin-top: 10px; }
.cb-box__title {
  margin: 0 0 9px; text-align: center;
  font-size: 12px; font-weight: 600; letter-spacing: 0.04em;
  color: var(--text, #f2f6fc);
}
.cb-right { display: flex; flex-direction: column; }

/* ——— CHORD BANK ————————————————————————————————————————————————————————— */
.cb-slot { padding: 7px 0; }
.cb-slot + .cb-slot { border-top: 1px solid var(--line, #3a485f); }

.cb-slot__head { display: flex; align-items: center; gap: 7px; margin-bottom: 5px; }
.cb-arrows { display: flex; flex-direction: column; gap: 2px; }
.cb-arrow {
  font: inherit; font-size: 9px; line-height: 1; cursor: pointer;
  padding: 2px 5px; border-radius: 3px;
  color: var(--text, #f2f6fc); background: transparent;
  border: 1px solid var(--line, #3a485f);
}
.cb-arrow:hover { border-color: var(--accent, #34e5b4); }
.cb-arrow:focus-visible { outline: 2px solid var(--accent, #34e5b4); outline-offset: 1px; }

.cb-slot__root { font-size: 17px; font-weight: 700; min-width: 2.1em; }
.cb-slot__name { font-size: 11px; color: var(--text-dim, #93a1b8); }
.cb-slot__name sup { font-size: 0.7em; }

/* The chip row. Each chip is a tone; the +/- rides directly above it, which is where the
   sketch puts it and why the caption and the pair share one column. */
.cb-chips { display: flex; flex-wrap: wrap; gap: 4px 10px; }
.cb-tone { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.cb-bend { display: flex; gap: 2px; }
.cb-bend button {
  font: inherit; font-size: 9px; line-height: 1; cursor: pointer;
  width: 15px; padding: 1px 0; border-radius: 3px;
  color: var(--text-dim, #93a1b8); background: transparent;
  border: 1px solid var(--line, #3a485f);
}
.cb-bend button:hover { border-color: var(--accent, #34e5b4); color: var(--text, #f2f6fc); }
.cb-bend button:focus-visible { outline: 2px solid var(--accent, #34e5b4); outline-offset: 1px; }

.cb-chip {
  font: inherit; font-size: 10px; cursor: pointer;
  padding: 3px 7px; border-radius: 9px; min-width: 3.6em;
  color: var(--text-dim, #93a1b8); background: transparent;
  border: 1px solid var(--line, #3a485f);
}
.cb-chip:hover { border-color: var(--accent, #34e5b4); }
.cb-chip:focus-visible { outline: 2px solid var(--accent, #34e5b4); outline-offset: 1px; }
.cb-chip[aria-pressed="true"] {
  color: var(--text, #f2f6fc);
  border-color: var(--accent, #34e5b4);
  background: color-mix(in srgb, var(--accent, #34e5b4) 16%, transparent);
}
.cb-chip__letter { display: block; font-size: 11px; font-weight: 700; }
/* A tone the student bent with the +/-. Marked by SHAPE as well as colour, which is what
   tokens.css asks every teaching surface for. */
.cb-chip[data-bent="true"] { border-style: dashed; border-color: var(--warn, #ff7a1a); }

.cb-autofill {
  display: flex; align-items: center; gap: 6px; margin-top: 6px;
  font-size: 11px; color: var(--text-dim, #93a1b8); cursor: pointer;
}
.cb-autofill input { cursor: pointer; }

/* ——— ROOT POSITIONS ——————————————————————————————————————————————————— */
.cb-cols { display: grid; grid-template-columns: repeat(${SLOTS}, minmax(0, 1fr)); gap: 6px; }
.cb-col { display: flex; flex-direction: column; align-items: center; gap: 3px; }

.cb-note {
  font: inherit; font-size: 13px; cursor: grab;
  width: 100%; padding: 2px 0; border-radius: 3px; text-align: center;
  color: var(--text, #f2f6fc); background: transparent;
  border: 1px solid transparent;
}
.cb-note:hover { border-color: var(--accent, #34e5b4); }
.cb-note:focus-visible { outline: 2px solid var(--accent, #34e5b4); outline-offset: 1px; }
.cb-note:active { cursor: grabbing; }
.cb-note.is-on { border-color: var(--text, #f2f6fc); }

/* Rule 1 and rule 2, drawn. A tone in this chord that the PREVIOUS chord also had is a
   common note; one a semitone away from a previous tone is a neighbour. Both are marked on
   the LATER chord. */
.cb-note[data-lead="common"] { background: color-mix(in srgb, var(--accent, #34e5b4) 20%, transparent); }
.cb-note[data-lead="neighbor"] { box-shadow: inset 0 -2px 0 0 var(--warn, #ff7a1a); }

.cb-numeral {
  font: inherit; font-size: 14px; cursor: pointer; margin-top: 4px;
  width: 100%; padding: 2px 0; border-radius: 3px;
  color: var(--text, #f2f6fc); background: transparent;
  border: 1px solid var(--line, #3a485f);
}
.cb-numeral:hover { border-color: var(--accent, #34e5b4); }
.cb-numeral:focus-visible { outline: 2px solid var(--accent, #34e5b4); outline-offset: 1px; }
.cb-numeral sup { font-size: 0.62em; }

/* FAIL OUT LOUD. Not a tooltip, not a console line — the chord wears it. */
.cb-broken {
  color: var(--warn, #ff7a1a);
  border-color: var(--warn, #ff7a1a);
  border-style: dashed;
}
.cb-why {
  margin: 4px 0 0; font-size: 10px; line-height: 1.4; text-align: center;
  color: var(--warn, #ff7a1a);
}

/* ——— COMP POSITIONS ———————————————————————————————————————————————————— */
/* Smaller than the note buttons above them on purpose — the squares are a worksheet, not a
   keyboard, and a column of five must still fit under a chord without pushing the rules off
   the bottom of the box. Capped and centred rather than full-width. */
.cb-square {
  width: 100%; max-width: 44px; aspect-ratio: 1 / 1; min-height: 22px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px;
  border: 1px solid var(--line, #3a485f); border-radius: 3px;
  color: var(--text, #f2f6fc); background: transparent;
}
.cb-square[data-over="true"] { border-color: var(--accent, #34e5b4); border-style: dashed; }
.cb-square[data-filled="true"] { cursor: pointer; border-color: var(--text-dim, #93a1b8); }

.cb-rules { margin: 9px 0 0; font-size: 11px; line-height: 1.5; color: var(--text-dim, #93a1b8); }
.cb-rules__lede { font-style: italic; font-size: 12px; color: var(--text, #f2f6fc); margin: 0 0 6px; }
.cb-rules ol { margin: 0; padding-left: 18px; }
.cb-rules li { margin: 2px 0; }
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

  /** Anything with `noteOn(midi, velocity)` / `noteOff(midi)`. The page picks. */
  bindPlayer(instrument) {
    this.player = instrument ?? null;
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
   * Can `theory/chord.js` name this thing?
   *
   * It names a TERTIAN STACK ON A DEGREE, counted from the root — nothing else. So the name
   * survives exactly two conditions: no tone was bent, and the lit chips are an unbroken run
   * from the root. Root+3rd+9th is a real sound a student can build here and there is no
   * exported function that will name it, so this returns null and the UI says so.
   *
   * Returns the COUNT to hand `chordNameParts`/`numeralParts`, or null to fail out loud.
   */
  _nameableCount(slot) {
    if (slot.bend.some((b) => b !== 0)) return null;
    let count = 0;
    while (count < TONES && slot.on[count]) count += 1;
    if (count < 3) return null;                       // two notes is not a chord to name
    if (slot.on.slice(count).some(Boolean)) return null;  // a gap, then more tones
    return count;
  }

  /** Why the name is missing, in the student's words. One of these, or null when it is fine. */
  _brokenReason(slot) {
    if (slot.bend.some((b) => b !== 0)) return 'bent — no name for this one';
    let count = 0;
    while (count < TONES && slot.on[count]) count += 1;
    if (count < 3) return 'needs three notes';
    if (slot.on.slice(count).some(Boolean)) return 'gap in the stack — no name for this one';
    return null;
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
      const count = this._nameableCount(slot);
      if (count === null) {
        nameEl.classList.add('cb-broken');
        nameEl.textContent = this._brokenReason(slot);
      } else {
        const parts = chordNameParts(scale, slot.degree, count);
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

  _renderRoots() {
    const host = this.nodes.roots;
    host.textContent = '';
    const scale = this.scale;

    const cols = document.createElement('div');
    cols.className = 'cb-cols';

    this.slots.forEach((slot, i) => {
      const col = document.createElement('div');
      col.className = 'cb-col';

      const lead = this._leadingFor(i);
      // Highest note first — the sketch stacks them with the root at the bottom.
      const tones = this._liveTonesOf(slot).slice().reverse();

      for (const tone of tones) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cb-note';
        b.draggable = true;
        b.dataset.midi = String(tone.midi);
        b.dataset.slot = String(i);
        const mark = lead.get(tone.j);
        if (mark) b.dataset.lead = mark;
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
      const num = document.createElement('button');
      num.type = 'button';
      num.className = 'cb-numeral';
      const count = this._nameableCount(slot);
      if (count === null) {
        num.classList.add('cb-broken');
        num.textContent = '?';
      } else {
        const parts = numeralParts(scale, slot.degree, count);
        num.textContent = parts.base;
        if (parts.sup) {
          const sup = document.createElement('sup');
          sup.textContent = parts.sup;
          num.appendChild(sup);
        }
      }
      num.setAttribute('aria-label', `play chord ${i + 1}`);
      this._listen(num, 'pointerdown', () =>
        this._press(this._liveTonesOf(slot).map((t) => t.midi))
      );
      col.appendChild(num);

      if (count === null) {
        const why = document.createElement('p');
        why.className = 'cb-why';
        why.textContent = this._brokenReason(slot);
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
      col.className = 'cb-col';

      this._syncComp(slot);
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

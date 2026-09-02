import { input as sharedInput, DEFAULT_VELOCITY } from '../core/input.js';

const BASE_NOTE = 60;
const BLACK_PC = new Set([1, 3, 6, 8, 10]);
const OVERLAYS = ['none', 'letter', 'number', 'solfege'];

const PLACEHOLDER_LETTERS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

const WHITE_KEYS = [
  'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH',
  'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote',
];
const BLACK_KEYS = [
  'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY',
  'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft',
];
const WHITE_COUNT = WHITE_KEYS.length;

// wrap any integer to a pitch class 0-11
function normalizePc(v) {
  return ((Math.trunc(v) % 12) + 12) % 12;
}

// build the physical-key-to-semitone map and draw order for one base note
export function buildQwertyMap(positionShift) {
  const base = normalizePc(positionShift);
  const map = new Map();
  const layout = [];
  let whiteIdx = 0;
  let semitone = 0;

  while (whiteIdx < WHITE_COUNT) {
    const offset = base + semitone;
    const black = BLACK_PC.has(offset % 12);
    const code = black ? BLACK_KEYS[whiteIdx] : WHITE_KEYS[whiteIdx];
    map.set(code, offset);
    layout.push({ code, offset, black, whiteIdx });
    if (!black) whiteIdx++;
    semitone++;
  }

  return { map, layout };
}

// printable white and black key names for one base note
export function qwertyLayoutFor(positionShift) {
  const { layout } = buildQwertyMap(positionShift);
  const name = (code) => code.replace(/^Key|^Digit/, '').replace('Semicolon', ';')
    .replace('Quote', "'").replace('BracketLeft', '[');
  const white = layout.filter((s) => !s.black).map((s) => name(s.code)).join(' ');
  const black = layout.filter((s) => s.black).map((s) => name(s.code)).join(' ');
  return { white, black };
}

// the label string for one key, or null
function labelFor(pitchClass, overlay) {
  switch (overlay) {
    case 'letter':
      return PLACEHOLDER_LETTERS[pitchClass];
    case 'number':
    case 'solfege':
      return null;
    case 'none':
    default:
      return null;
  }
}

const STYLE_ID = 'cbdaw-keyboard-style';
let liveInstances = 0;

const STYLE_TEXT = `
.cbdaw-kbd {
  --kbd-line: var(--line, #3a485f);
  --kbd-text: var(--text, #f2f6fc);
  --kbd-dim: var(--text-dim, #93a1b8);
  --kbd-accent: var(--accent, #34e5b4);
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  gap: var(--sp-4);
  width: var(--pct-100);
  box-sizing: var(--box-border-box);
  font-family: var(--font-ui);
  color: var(--kbd-text);
  background: var(--panel, #1b2332);
  border: var(--bw) solid var(--kbd-line);
  border-radius: var(--r-body);
  padding: var(--sp-4);
  user-select: var(--usel-none);
  -webkit-user-select: var(--usel-none);
}
.cbdaw-kbd__keys {
  position: var(--pos-relative);
  width: var(--pct-100);
  height: var(--sp-84);
  touch-action: var(--touch-none);
  background: var(--bg, #0a0d13);
  border-radius: var(--r-ctl);
  overflow: var(--ov-hidden);
}
.cbdaw-kbd[data-variant="compact"] .cbdaw-kbd__keys { height: var(--sp-28); }
.cbdaw-kbd[data-variant="compact"] { gap: var(--sp-0); padding: var(--sp-2); }

.cbdaw-kbd__key {
  position: var(--pos-absolute);
  top: var(--sp-0);
  box-sizing: var(--box-border-box);
  border: var(--bw) solid var(--kbd-line);
  border-radius: 0 0 var(--r-ctl) var(--r-ctl);
  display: var(--disp-flex);
  align-items: var(--align-flex-end);
  justify-content: var(--justify-center);
  padding-bottom: var(--sp-4);
  font-size: var(--fs-lg);
  font-weight: var(--w-med);
  cursor: var(--cur-pointer);
}
.cbdaw-kbd[data-variant="compact"] .cbdaw-kbd__key {
  padding-bottom: var(--sp-1h);
  font-size: var(--fs-xs);
  border-radius: 0 0 var(--r-cell) var(--r-cell);
}
.cbdaw-kbd__key[data-color="white"] {
  height: var(--pct-100);
  background: var(--text, #f2f6fc);
  color: var(--bg, #0a0d13);
  z-index: var(--z-raise-1);
}
.cbdaw-kbd__key[data-color="black"] {
  height: var(--pct-62);
  background: var(--bg, #0a0d13);
  color: var(--kbd-text);
  border-color: var(--key-border);
  z-index: var(--z-raise-2);
}
.cbdaw-kbd__key.is-on {
  background: var(--kbd-accent);
  color: var(--bg, #0a0d13);
  box-shadow: inset 0 0 0 2px var(--bg, #0a0d13);
}
.cbdaw-kbd[data-variant="expanded"] .cbdaw-kbd__key { transition: var(--tr-background); }

.cbdaw-kbd__controls {
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-7);
  flex-wrap: var(--flexwrap-wrap);
  font-size: var(--fs-md);
  color: var(--kbd-dim);
}
.cbdaw-kbd__group { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-3); }
.cbdaw-kbd__controls button {
  font: var(--font-inherit);
  font-weight: var(--w-med);
  min-width: var(--sp-15);
  padding: var(--sp-2) var(--sp-4);
  color: var(--kbd-text);
  background: var(--panel, #1b2332);
  border: var(--bw) solid var(--kbd-line);
  border-radius: var(--r-ctl);
  cursor: var(--cur-pointer);
}
.cbdaw-kbd__controls button:hover { border-color: var(--kbd-accent); }
.cbdaw-kbd__readout {
  min-width: var(--sp-13);
  text-align: var(--ta-center);
  color: var(--kbd-text);
  font-variant-numeric: var(--num-tabular);
}
.cbdaw-kbd__seam { color: var(--warn, #ff7a1a); font-size: var(--fs-base); }
`;

// add the shared stylesheet
function acquireStyle() {
  liveInstances++;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
}

// drop the shared stylesheet when the last instance goes
function releaseStyle() {
  liveInstances = Math.max(0, liveInstances - 1);
  if (liveInstances > 0) return;
  document.getElementById(STYLE_ID)?.remove();
}

// the piano keyboard surface
export default class Keyboard {
  static sourceId = 'key';
  static label = '12-Note Keyboard';

  // set up state; builds no DOM
  constructor(el = null, input = sharedInput) {
    this.input = input;
    this.el = null;
    this.defaultTarget = el;
    this.variant = 'expanded';

    this._overlay = 'letter';

    this.pointerNotes = new Map();
    this.keyNoteRefs = new Map();
    this.litCounts = new Map();

    this.qwerty = buildQwertyMap(this.input.positionShift);

    this.nodes = { keys: null, controls: null, octaveReadout: null, positionReadout: null,
                   overlayButton: null, seam: null };
    this.keyEls = [];
    this.domListeners = [];
    this.busUnsubs = [];
    this.mounted = false;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onControlClick = this._onControlClick.bind(this);
    this._onBusNoteOn = this._onBusNoteOn.bind(this);
    this._onBusNoteOff = this._onBusNoteOff.bind(this);
    this._onBusShift = this._onBusShift.bind(this);
  }

  // read the current label overlay
  get overlay() {
    return this._overlay;
  }
  // change the label overlay
  set overlay(value) {
    if (!OVERLAYS.includes(value)) return;
    this._overlay = value;
    if (this.mounted) this._renderLabels();
  }

  // build the DOM and attach every listener
  mount(el = this.defaultTarget, variant = 'expanded') {
    if (this.mounted) this.unmount();
    const target = el || this.defaultTarget;
    if (!target) throw new Error('Keyboard.mount: no element to mount into');

    this.defaultTarget = target;
    this.variant = variant === 'compact' ? 'compact' : 'expanded';
    this.qwerty = buildQwertyMap(this.input.positionShift);
    acquireStyle();
    this._build(target);
    this._attachListeners();
    this.mounted = true;
    return this;
  }

  // mount the short DAW strip
  mountCompact(el = this.defaultTarget) {
    return this.mount(el, 'compact');
  }

  // mount the full standalone view
  mountExpanded(el = this.defaultTarget) {
    return this.mount(el, 'expanded');
  }

  // tear down the DOM and every listener
  unmount() {
    if (!this.mounted) return this;
    this._releaseAllHeld();
    this._detachListeners();
    this.el?.remove();
    this.el = null;
    this.keyEls = [];
    this.nodes = { keys: null, controls: null, octaveReadout: null, positionReadout: null,
                   overlayButton: null, seam: null };
    this.litCounts.clear();
    this.mounted = false;
    releaseStyle();
    return this;
  }

  // unmount and report what was released
  dispose() {
    const domListeners = this.domListeners.length;
    const busSubscriptions = this.busUnsubs.length;
    const notesReleased = this._releaseAllHeld();
    this.unmount();
    this.pointerNotes.clear();
    this.keyNoteRefs.clear();
    return { domListeners, busSubscriptions, notesReleased };
  }

  // the MIDI note at a drawn key index
  noteForIndex(i) {
    const slot = this.qwerty.layout[i];
    return slot ? BASE_NOTE + slot.offset : null;
  }

  // create the root element and its children
  _build(target) {
    const root = document.createElement('div');
    root.className = 'cbdaw-kbd';
    root.dataset.variant = this.variant;
    root.dataset.overlay = this._overlay;

    const keys = document.createElement('div');
    keys.className = 'cbdaw-kbd__keys';
    keys.setAttribute('role', 'group');
    keys.setAttribute('aria-label', 'piano keyboard');
    root.appendChild(keys);

    this.el = root;
    this.nodes.keys = keys;
    this._renderKeys();

    if (this.variant === 'expanded') this._buildControls(root);

    target.appendChild(root);
  }

  // draw every key for the current layout
  _renderKeys() {
    const keys = this.nodes.keys;
    keys.textContent = '';
    this.keyEls = [];

    const layout = this.qwerty.layout;
    const whiteWidth = 100 / WHITE_COUNT;
    const blackWidth = whiteWidth * 0.62;

    for (let i = 0; i < layout.length; i++) {
      const slot = layout[i];
      const note = BASE_NOTE + slot.offset;
      const pc = normalizePc(note);

      const key = document.createElement('div');
      key.className = 'cbdaw-kbd__key';
      key.dataset.note = String(note);
      key.dataset.pc = String(pc);
      key.dataset.index = String(i);
      key.dataset.code = slot.code;
      key.dataset.color = slot.black ? 'black' : 'white';
      key.setAttribute('aria-label', PLACEHOLDER_LETTERS[pc]);

      if (slot.black) {
        const raw = slot.whiteIdx * whiteWidth - blackWidth / 2;
        const left = Math.max(0, Math.min(100 - blackWidth, raw));
        key.style.left = `${left}%`;
        key.style.width = `${blackWidth}%`;
      } else {
        key.style.left = `${slot.whiteIdx * whiteWidth}%`;
        key.style.width = `${whiteWidth}%`;
      }

      const label = document.createElement('span');
      label.className = 'cbdaw-kbd__label';
      key.appendChild(label);

      keys.appendChild(key);
      this.keyEls.push(key);
    }

    this._renderLabels();
    this._applyLitState();
  }

  // write label text into every key
  _renderLabels() {
    if (this.el) this.el.dataset.overlay = this._overlay;
    for (const key of this.keyEls) {
      const pc = Number(key.dataset.pc);
      const text = labelFor(pc, this._overlay);
      key.firstChild.textContent = text ?? '';
    }
    if (this.nodes.seam) {
      const pending = this._overlay === 'number' || this._overlay === 'solfege';
      this.nodes.seam.textContent = pending ? 'labels pending theory/scale.js (P3)' : '';
    }
  }

  // draw the octave, position and overlay bar
  _buildControls(root) {
    const bar = document.createElement('div');
    bar.className = 'cbdaw-kbd__controls';
    bar.innerHTML = `
      <span class="cbdaw-kbd__group">octave
        <button type="button" data-act="oct-" aria-label="octave down">−</button>
        <span class="cbdaw-kbd__readout" data-readout="octave">0</span>
        <button type="button" data-act="oct+" aria-label="octave up">+</button>
      </span>
      <span class="cbdaw-kbd__group">position
        <button type="button" data-act="pos-" aria-label="position down">−</button>
        <span class="cbdaw-kbd__readout" data-readout="position">C</span>
        <button type="button" data-act="pos+" aria-label="position up">+</button>
      </span>
      <span class="cbdaw-kbd__group">labels
        <button type="button" data-act="overlay" data-overlay-button>letter</button>
      </span>
      <span class="cbdaw-kbd__seam"></span>`;

    this.nodes.controls = bar;
    this.nodes.octaveReadout = bar.querySelector('[data-readout="octave"]');
    this.nodes.positionReadout = bar.querySelector('[data-readout="position"]');
    this.nodes.overlayButton = bar.querySelector('[data-overlay-button]');
    this.nodes.seam = bar.querySelector('.cbdaw-kbd__seam');
    root.appendChild(bar);
    this._renderReadouts();
    this._renderLabels();
  }

  // update the control bar readouts
  _renderReadouts() {
    if (!this.nodes.octaveReadout) return;
    const oct = this.input.octaveShift;
    this.nodes.octaveReadout.textContent = oct > 0 ? `+${oct}` : String(oct);
    this.nodes.positionReadout.textContent =
      PLACEHOLDER_LETTERS[normalizePc(this.input.positionShift)];
    this.nodes.overlayButton.textContent = this._overlay;
  }

  // light the key for a sounding note
  _onBusNoteOn({ note }) {
    const n = (this.litCounts.get(note) || 0) + 1;
    this.litCounts.set(note, n);
    if (n === 1) this._keyElForNote(note)?.classList.add('is-on');
  }

  // unlight the key for a released note
  _onBusNoteOff({ note }) {
    const n = (this.litCounts.get(note) || 1) - 1;
    if (n > 0) {
      this.litCounts.set(note, n);
      return;
    }
    this.litCounts.delete(note);
    this._keyElForNote(note)?.classList.remove('is-on');
  }

  // rebuild the layout when the base note or octave moves
  _onBusShift() {
    this._releaseAllHeld();
    this.qwerty = buildQwertyMap(this.input.positionShift);
    this._renderKeys();
    this._renderReadouts();
  }

  // find the key element holding a note
  _keyElForNote(note) {
    return this.keyEls.find((k) => Number(k.dataset.note) === note) || null;
  }

  // relight held notes after a redraw
  _applyLitState() {
    for (const [note, n] of this.litCounts) {
      if (n > 0) this._keyElForNote(note)?.classList.add('is-on');
    }
  }

  // wire the DOM and bus listeners
  _attachListeners() {
    const keys = this.nodes.keys;
    this._addDom(keys, 'pointerdown', this._onPointerDown);
    this._addDom(keys, 'pointermove', this._onPointerMove);
    this._addDom(keys, 'pointerup', this._onPointerUp);
    this._addDom(keys, 'pointercancel', this._onPointerUp);
    this._addDom(keys, 'lostpointercapture', this._onPointerUp);
    this._addDom(keys, 'contextmenu', (e) => e.preventDefault());

    if (this.nodes.controls) this._addDom(this.nodes.controls, 'click', this._onControlClick);

    this._addDom(window, 'keydown', this._onKeyDown);
    this._addDom(window, 'keyup', this._onKeyUp);
    this._addDom(window, 'blur', this._onBlur);

    this.busUnsubs.push(this.input.on('noteon', this._onBusNoteOn));
    this.busUnsubs.push(this.input.on('noteoff', this._onBusNoteOff));
    this.busUnsubs.push(this.input.on('shift', this._onBusShift));
  }

  // add a DOM listener and record it for removal
  _addDom(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this.domListeners.push({ target, type, fn, opts });
  }

  // remove every recorded DOM and bus listener
  _detachListeners() {
    for (const { target, type, fn, opts } of this.domListeners) {
      target.removeEventListener(type, fn, opts);
    }
    this.domListeners = [];
    for (const unsub of this.busUnsubs) unsub();
    this.busUnsubs = [];
  }

  // name the route a pointer event came from
  _sourceForPointer(e) {
    if (e.pointerType === 'mouse') return 'mouse';
    return 'touch';
  }

  // the note under a screen coordinate
  _noteFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    const key = el?.closest?.('.cbdaw-kbd__key');
    if (!key || !this.keyEls.includes(key)) return null;
    return Number(key.dataset.note);
  }

  // mouse or touch note on
  _onPointerDown(e) {
    const note = this._noteFromPoint(e.clientX, e.clientY);
    if (note === null) return;
    e.preventDefault();
    try { this.nodes.keys.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    const source = this._sourceForPointer(e);
    this.pointerNotes.set(e.pointerId, { note, source });
    this.input.emitNoteOn({ note, velocity: DEFAULT_VELOCITY, source });
  }

  // glissando as a held pointer crosses keys
  _onPointerMove(e) {
    const active = this.pointerNotes.get(e.pointerId);
    if (!active) return;
    const note = this._noteFromPoint(e.clientX, e.clientY);
    if (note === active.note) return;
    this.input.emitNoteOff({ note: active.note, source: active.source });
    if (note === null) {
      this.pointerNotes.delete(e.pointerId);
      return;
    }
    this.pointerNotes.set(e.pointerId, { note, source: active.source });
    this.input.emitNoteOn({ note, velocity: DEFAULT_VELOCITY, source: active.source });
  }

  // mouse or touch note off
  _onPointerUp(e) {
    const active = this.pointerNotes.get(e.pointerId);
    if (!active) return;
    this.pointerNotes.delete(e.pointerId);
    this.input.emitNoteOff({ note: active.note, source: active.source });
  }

  // skip typing and browser shortcuts
  _ignoreKeyEvent(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return true;
    const t = e.target;
    if (!t || t === document.body || t === document) return false;
    const tag = t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
  }

  // computer keyboard note on
  _onKeyDown(e) {
    if (e.repeat) return;
    if (this._ignoreKeyEvent(e)) return;
    const offset = this.qwerty.map.get(e.code);
    if (offset === undefined) return;
    e.preventDefault();

    const note = BASE_NOTE + offset;
    let refs = this.keyNoteRefs.get(note);
    if (!refs) {
      refs = new Set();
      this.keyNoteRefs.set(note, refs);
    }
    if (refs.has(e.code)) return;
    refs.add(e.code);
    if (refs.size === 1) {
      this.input.emitNoteOn({ note, velocity: DEFAULT_VELOCITY, source: 'key' });
    }
  }

  // computer keyboard note off
  _onKeyUp(e) {
    const offset = this.qwerty.map.get(e.code);
    if (offset === undefined) return;
    const note = BASE_NOTE + offset;
    const refs = this.keyNoteRefs.get(note);
    if (!refs || !refs.delete(e.code)) return;
    if (refs.size > 0) return;
    this.keyNoteRefs.delete(note);
    this.input.emitNoteOff({ note, source: 'key' });
  }

  // release everything when the window loses focus
  _onBlur() {
    this._releaseAllHeld();
  }

  // release every note this surface is holding
  _releaseAllHeld() {
    let released = 0;
    for (const [, { note, source }] of this.pointerNotes) {
      this.input.emitNoteOff({ note, source });
      released++;
    }
    this.pointerNotes.clear();
    for (const [note] of this.keyNoteRefs) {
      this.input.emitNoteOff({ note, source: 'key' });
      released++;
    }
    this.keyNoteRefs.clear();
    return released;
  }

  // handle the control bar buttons
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

export { BASE_NOTE, OVERLAYS, PLACEHOLDER_LETTERS, WHITE_KEYS, BLACK_KEYS };

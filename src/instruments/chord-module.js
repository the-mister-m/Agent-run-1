// =========================================================================================
// instruments/chord-module.js — the harmony brain, as an instrument
// =========================================================================================
// What this file is: it holds a numeral, a chord size, an octave, an inversion and a
// comping spread; it turns those into pitches through `theory/chord.js`; and it either
// sounds them with a small voice of its own or hands them to another loaded instrument and
// stays silent. Its visual is the note bank — the way the spectrum analyzer is Wave
// Synth's — and the note bank is on screen, not buried.
//
// What it computes: no music. Every pitch, every numeral, every letter, every syllable,
// every digit and every color token on this instrument comes out of `theory/chord.js` and
// `theory/scale.js`. The four tone presets are named by their overtone count — a number
// this file is handed, not a timbre word it invented.
//
// What it does not touch:
//   · `theory/scale.js`, `theory/chord.js` — read only.
//   · `surfaces/scale-circle.js`, `surfaces/diatonic-keys.js`, `surfaces/piano-roll.js` —
//     read only. This file does not import one, construct one, or reach into one. The page
//     mounts them; they and this module meet on `core/state.js`'s store and on
//     `core/input.js`'s bus, and nowhere else.
//   · `ui/shell.js` — reused by the page, never edited, and not imported here at all.
//   · `core/audio.js` — read. `voicePool` and `governor` are imported and called. Nothing
//     in this file constructs an AudioContext or connects to `ctx.destination`.
//   · `ui/tokens.css` — read through `var(--token)` names only.
//
// `bindState(store)` and `bindTargets(rows)` / `bindInput(bus)` are wiring, not music —
// the constructor is fixed at `(ctx, out)`, so anything an instrument must be pointed at
// arrives after construction. Every one of them is optional and every one has a working
// default.
// =========================================================================================

import { voicePool, governor } from '../core/audio.js';
import { state as sharedState } from '../core/state.js';

import {
  MAX_COUNT,
  ROMAN,
  parseNumeral,
  numeralParts,
  isUpperOvertoneChord,
  noteBank,
} from '../theory/chord.js';

import { degreeQuality, degreeColor } from '../theory/scale.js';

// -----------------------------------------------------------------------------------------
// 1 · THE FOUR TONES
// -----------------------------------------------------------------------------------------
// Four preset tones running simple to complex, plus an octave selector.
//
// The preset is an overtone count, and nothing else: one `OscillatorNode` per voice,
// carrying a `PeriodicWave` built from the harmonic series `1/n` truncated at `partials`.
// Preset 1 is the fundamental alone — a sine, zero overtones. Preset 4 is twelve partials,
// matching `overtone-synth.js`'s own count.
//
// The presets are labeled by their partial count — no invented timbre word.
//
// `getState`/`setState` round-trip the preset's `id`, so a renamed label never invalidates
// a saved file; only changing an `id` would.

const TONES = Object.freeze([
  Object.freeze({ id: 'p1', partials: 1 }),
  Object.freeze({ id: 'p3', partials: 3 }),
  Object.freeze({ id: 'p6', partials: 6 }),
  Object.freeze({ id: 'p12', partials: 12 }),
]);

const DEFAULT_TONE = 'p3';

/** Plain voice (osc + gain + env) cost. A `PeriodicWave` does not add a node: it is one
 *  `OscillatorNode` whichever preset is selected, so the cost does not rise with overtone
 *  count. */
const VOICE_COST = 10;

/** `voicing(scale, root, count, octave)` takes an absolute octave, and 4 is middle C. The
 *  octave selector is that number and there is no second octave control on this
 *  instrument. */
const OCTAVE_MIN = 1;
const OCTAVE_MAX = 7;
const DEFAULT_OCTAVE = 4;

/** A basic chord is 3 notes — a four-tone chord is something a student reaches for, never
 *  what they get by default. */
const DEFAULT_COUNT = 3;

/** The closed enum for a pitch surface's overlay, copied as an enum guard the way
 *  `keyboard.js`, `diatonic-keys.js` and `scale-circle.js` do. */
const OVERLAYS = ['none', 'letter', 'number', 'solfege'];

/** The note bank always prints each tone's `scaleNumber`. The overlay is the second,
 *  optional identity on the chip. 'letter' opens because the note bank is where a numeral
 *  the student picked becomes notes, and the note names are the payoff. */
const DEFAULT_OVERLAY = 'letter';

/** Which of the two naming systems the chord label speaks. 'numeral' is `noteBank`'s own
 *  default and it is this module's too. The toggle exists because the letter system's
 *  example (`D/F♯`) is written into the curriculum's skills list too. */
const SYSTEMS = ['numeral', 'letter'];

/** A surface that cannot sense velocity reports a fixed 0.8 — the same number
 *  `wave-synth.js` states. */
const VELOCITY = 0.8;

/** Starting envelope values, not a musical position. These four paths are required on
 *  every voice-bearing instrument, so they exist here even though they are not drawn as
 *  controls. See `setParam`. */
const DEFAULT_ENV = Object.freeze({
  attack: 0.005,
  decay: 0.08,
  sustain: 0.7,
  release: 0.15,
});

/** The envelope ranges, restated as the clamp table `setParam` uses. */
const ENV_RANGE = Object.freeze({
  attack: Object.freeze([0.001, 2.0]),
  decay: Object.freeze([0.001, 2.0]),
  sustain: Object.freeze([0.0, 1.0]),
  release: Object.freeze([0.001, 4.0]),
});

/** 'self' is not an instrument id and never collides with one — `static id` values are file
 *  names ('wave-synth', 'drum-sampler'). Stored in `getState`, so a saved project comes back
 *  sounding through whatever it was sounding through. */
const SELF = 'self';

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function toneById(id) {
  return TONES.find((t) => t.id === id) || TONES[0];
}

// -----------------------------------------------------------------------------------------
// 2 · THE VOICE — §11.1 / §11.1a / §11.2, exact
// -----------------------------------------------------------------------------------------
// Never exported. §11.1: "An instrument owns a pool of voices; it never exposes them outside
// itself." Two nodes, one OscillatorNode and one GainNode, and the envelope is four-stage
// automation on that single GainNode's `.gain` AudioParam — §11.1a's plain-voice shape,
// unchanged. The tone preset is the oscillator's PeriodicWave, so a richer preset costs
// nodes: it costs Fourier coefficients, which is what makes "keep it small" affordable on a
// Chromebook running three live surfaces at the same time.

class Voice {
  constructor(ctx, out, cpuWeight) {
    this.ctx = ctx;
    this.out = out;
    this._cpuWeight = cpuWeight;
    this._state = 'free';
    this.osc = null;
    this.gain = null;
    this._envelope = null;
    this._t0 = 0;
    this._peak = 0;
    this._releaseT0 = 0;
    this._timers = [];
    this._freeTimer = null;
    /** Set by the owning instrument right after construction, exactly as `wave-synth.js`
     *  does: a voice stolen by a DIFFERENT instrument (§11.2 — "a Wave Synth note can steal
     *  an Overtone Synth voice and the reverse") still tells its true owner to drop it. */
    this.onFree = null;
  }

  get cpuWeight() {
    return this._cpuWeight;
  }

  get state() {
    return this._state;
  }

  /** §11.1's `trigger(note, velocity, atTime)`, plus a 4th `opts` carrying the PeriodicWave
   *  and the envelope — §11.1's Voice is instrument-agnostic and cannot itself know what a
   *  tone preset is. Same shape `wave-synth.js` uses for its wave/octave opts. */
  trigger(note, velocity, atTime, opts) {
    const { wave, attack, decay, sustain, release } = opts;
    const t0 = atTime ?? this.ctx.currentTime;

    this.osc = this.ctx.createOscillator();
    this.osc.setPeriodicWave(wave);
    this.osc.frequency.setValueAtTime(midiToFreq(note), t0);

    this.gain = this.ctx.createGain();
    this.gain.gain.setValueAtTime(0, t0);

    this._t0 = t0;
    this._peak = clamp(velocity, 0, 1);
    this._envelope = { attack, decay, sustain, release };

    this.osc.connect(this.gain);
    this.gain.connect(this.out);
    this.osc.start(t0);

    this._scheduleAttackDecay(t0, 0);
  }

  _sustainLevel() {
    return this._peak * clamp(this._envelope.sustain, 0, 1);
  }

  _scheduleAttackDecay(fromTime, fromValue) {
    const g = this.gain.gain;
    const attackEnd = this._t0 + this._envelope.attack;
    const decayEnd = attackEnd + this._envelope.decay;
    const MIN = 0.001; // never a zero-length ramp — that is a click

    g.cancelScheduledValues(fromTime);
    g.setValueAtTime(fromValue, fromTime);
    if (attackEnd > fromTime) {
      g.linearRampToValueAtTime(this._peak, attackEnd);
      g.linearRampToValueAtTime(this._sustainLevel(), Math.max(decayEnd, attackEnd + MIN));
    } else if (decayEnd > fromTime) {
      g.linearRampToValueAtTime(this._sustainLevel(), decayEnd);
    } else {
      g.linearRampToValueAtTime(this._sustainLevel(), fromTime + MIN);
    }

    // §11.1's five-state enum has no 'decaying' — decay folds into 'attacking' until the
    // envelope reaches sustain, matching `wave-synth.js` and `overtone-synth.js` exactly.
    this._clearAttackTimers();
    if (decayEnd > fromTime) {
      this._state = 'attacking';
      const toSustainMs = Math.max(0, (decayEnd - this.ctx.currentTime) * 1000);
      this._timers.push(
        setTimeout(() => {
          if (this._state === 'attacking') this._state = 'sustaining';
        }, toSustainMs)
      );
    } else {
      this._state = 'sustaining';
    }
  }

  /** §11.7c — "envelope edits apply live to every currently-sounding voice, not only to the
   *  next noteOn." Binding on every instrument from that amendment forward, so it is here
   *  even though this module draws no envelope control: P4's automation and P5's preset
   *  loader call `setParam('env.*')` programmatically and must behave the same everywhere. */
  updateEnv(env) {
    this._envelope = { ...env };
    if (!this.gain || this._state === 'free' || this._state === 'stealing') return;
    const now = this.ctx.currentTime;
    if (this._state === 'attacking' || this._state === 'sustaining') {
      this._scheduleAttackDecay(now, this.gain.gain.value);
    } else if (this._state === 'releasing') {
      this._scheduleRelease(now, this.gain.gain.value);
    }
  }

  release(atTime) {
    if (this._state === 'free' || this._state === 'stealing') return;
    const t0 = atTime ?? this.ctx.currentTime;
    const currentVal = this.gain.gain.value;
    this._clearTimers();
    this._state = 'releasing';
    this._releaseT0 = t0;
    this._scheduleRelease(t0, currentVal);
  }

  _scheduleRelease(fromTime, fromValue) {
    const g = this.gain.gain;
    const MIN = 0.001;
    const end = Math.max(this._releaseT0 + this._envelope.release, fromTime + MIN);

    g.cancelScheduledValues(fromTime);
    g.setValueAtTime(fromValue, fromTime);
    g.linearRampToValueAtTime(0, end);

    if (this._freeTimer) {
      clearTimeout(this._freeTimer);
      this._freeTimer = null;
    }
    const freeMs = Math.max(0, (end - this.ctx.currentTime) * 1000) + 5;
    this._freeTimer = setTimeout(() => this.free(), freeMs);
  }

  /** §10-A / §11.1 — forced release, linear fade to 0 over 5 ms, then free(). Never an
   *  abrupt stop. */
  steal(atTime) {
    if (this._state === 'free') return;
    const t0 = atTime ?? this.ctx.currentTime;
    const currentVal = this.gain.gain.value;
    this._clearTimers();
    this._state = 'stealing';
    this.gain.gain.cancelScheduledValues(t0);
    this.gain.gain.setValueAtTime(currentVal, t0);
    this.gain.gain.linearRampToValueAtTime(0, t0 + 0.005);
    const freeMs = Math.max(0, (t0 + 0.005 - this.ctx.currentTime) * 1000) + 5;
    this._freeTimer = setTimeout(() => this.free(), freeMs);
  }

  free() {
    if (this._state === 'free') return;
    this._clearTimers();
    this._state = 'free';
    try { this.osc.stop(); } catch (e) { /* already stopped */ }
    try { this.osc.disconnect(); } catch (e) { /* already disconnected */ }
    try { this.gain.disconnect(); } catch (e) { /* already disconnected */ }
    voicePool.release(this);
    if (typeof this.onFree === 'function') this.onFree();
  }

  _clearAttackTimers() {
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
  }

  _clearTimers() {
    this._clearAttackTimers();
    if (this._freeTimer) {
      clearTimeout(this._freeTimer);
      this._freeTimer = null;
    }
  }
}

// -----------------------------------------------------------------------------------------
// 3 · STYLE — token names, with a fallback byte-identical to `ui/tokens.css`
// -----------------------------------------------------------------------------------------
// Injected once per document and reference-counted, so a page that mounts two chord modules
// gets one stylesheet and the last one out takes it away again — the pattern
// `scale-circle.js`, `diatonic-keys.js` and `ui/shell.js` all use.
//
// Every fallback below is copied from `ui/tokens.css` unchanged, and must stay that way if
// a value there moves. It exists only so the module renders in a page that has not linked
// tokens.css. The degree colors are the one thing not written here: they arrive from
// `degreeColor()` as token names and go into the DOM as `var(--deg-…)` with no fallback at
// all.

const STYLE_ID = 'cbdaw-chord-module-style';
let styleRefs = 0;

const STYLE_TEXT = `
.cm-root {
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
  color: var(--text, #f2f6fc);
  background: var(--panel, #1b2332);
  border: 1px solid var(--line, #3a485f);
  border-radius: 6px;
  display: flex; flex-direction: column;
}
.cm-root *, .cm-root *::before, .cm-root *::after { box-sizing: border-box; }
.cm-compact { padding: 8px 10px; font-size: 11px; gap: 8px; }
.cm-expanded { padding: 16px 18px; font-size: 14px; gap: 16px; }

.cm-title { display: none; }
.cm-expanded .cm-title {
  display: block; font-size: 20px; font-weight: 700; letter-spacing: 0.02em;
}
.cm-lede { color: var(--text-dim, #93a1b8); font-size: 12px; line-height: 1.5; margin: 0; }

.cm-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
.cm-block { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.cm-block--wide { grid-column: 1 / -1; }
.cm-legend {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.09em;
  color: var(--text-dim, #93a1b8);
}
.cm-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.cm-btn {
  font: inherit; color: var(--text, #f2f6fc); background: transparent;
  border: 1px solid var(--line, #3a485f); border-radius: 4px;
  padding: 4px 9px; cursor: pointer; line-height: 1.35;
}
.cm-btn:hover { border-color: var(--accent, #34e5b4); }
.cm-btn:focus-visible { outline: 2px solid var(--accent, #34e5b4); outline-offset: 1px; }
.cm-btn[aria-pressed="true"], .cm-btn.is-on {
  border-color: var(--accent, #34e5b4);
  background: color-mix(in srgb, var(--accent, #34e5b4) 18%, transparent);
}
.cm-btn:disabled { opacity: 0.4; cursor: default; }
.cm-step { display: inline-flex; align-items: center; gap: 4px; }
.cm-step output {
  min-width: 2.4em; text-align: center; font-variant-numeric: tabular-nums;
}
.cm-note { color: var(--text-dim, #93a1b8); font-size: 11px; line-height: 1.5; }
.cm-warn { color: var(--warn, #ff7a1a); }

/* ——— the seven numerals: colour is the chord's colour, one token per slot ——— */
.cm-numerals { display: flex; gap: 6px; flex-wrap: wrap; }
.cm-num {
  font: inherit; font-size: 1.1em; cursor: pointer; line-height: 1.2;
  min-width: 2.9em; padding: 6px 4px; border-radius: 4px;
  background: transparent; color: var(--deg, var(--text, #f2f6fc));
  border: 1px solid var(--deg, var(--line, #3a485f));
}
.cm-num sup { font-size: 0.62em; }
.cm-num[aria-pressed="true"] {
  background: color-mix(in srgb, var(--deg, #ffffff) 22%, transparent);
  color: var(--text, #f2f6fc);
}

/* ——— the tone presets: labelled by OVERTONE COUNT, drawn as a partial ladder ——— */
.cm-tones { display: flex; gap: 6px; flex-wrap: nowrap; }
.cm-tone { display: flex; flex-direction: column; align-items: center; gap: 4px;
           flex: 1 1 0; min-width: 0; padding: 5px 3px; }
.cm-tone svg { display: block; width: 100%; max-width: 46px; height: 18px; }
.cm-tone rect { fill: currentColor; }
.cm-tone b { font-size: 1.05em; font-weight: 700; font-variant-numeric: tabular-nums; }
.cm-tone span { font-size: 9px; color: var(--text-dim, #93a1b8); letter-spacing: 0.04em; }
.cm-tone[aria-pressed="true"] span { color: var(--text, #f2f6fc); }

/* ——— THE NOTE BANK ——— */
.cm-bank {
  border: 1px solid var(--line, #3a485f); border-radius: 5px;
  background: var(--bg, #0a0d13); padding: 12px; display: flex;
  flex-direction: column; gap: 10px;
}
.cm-compact .cm-bank { padding: 7px; gap: 6px; }
.cm-bank__head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.cm-bank__label {
  font-size: 30px; font-weight: 700; line-height: 1;
  color: var(--deg, var(--text, #f2f6fc));
}
.cm-compact .cm-bank__label { font-size: 18px; }
.cm-bank__label sup { font-size: 0.5em; }
.cm-bank__label .cm-slash { color: var(--text-dim, #93a1b8); font-weight: 400; }
.cm-bank__chips { display: flex; gap: 8px; flex-wrap: wrap; }
.cm-chip {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  min-width: 4.4em; padding: 7px 6px 5px; border-radius: 5px;
  border: 1px solid var(--deg, var(--line, #3a485f));
  background: color-mix(in srgb, var(--deg, #ffffff) 12%, transparent);
}
.cm-compact .cm-chip { min-width: 3.2em; padding: 4px 4px 3px; }
.cm-chip__num {
  font-size: 1.5em; font-weight: 700; line-height: 1; color: var(--deg, var(--text, #f2f6fc));
  font-variant-numeric: tabular-nums;
}
.cm-compact .cm-chip__num { font-size: 1.1em; }
.cm-chip__name { font-size: 0.85em; color: var(--text, #f2f6fc); min-height: 1.2em; }
.cm-chip__tags {
  font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; min-height: 1em;
  color: var(--text-dim, #93a1b8);
}
.cm-chip__spread { display: flex; gap: 2px; margin-top: 2px; }
.cm-chip__spread button {
  font: inherit; font-size: 10px; line-height: 1; padding: 2px 5px; cursor: pointer;
  color: var(--text-dim, #93a1b8); background: transparent;
  border: 1px solid var(--line, #3a485f); border-radius: 3px;
}
.cm-chip__spread button:hover { color: var(--text, #f2f6fc); border-color: var(--accent, #34e5b4); }
.cm-chip[data-sounding="true"] { border-color: var(--accent, #34e5b4); }
.cm-chip[data-sounding="true"] .cm-chip__name { color: var(--accent, #34e5b4); }

/* ——— the play control ——— */
.cm-play {
  font: inherit; font-size: 1.05em; font-weight: 600; cursor: pointer;
  padding: 11px 20px; border-radius: 5px;
  color: var(--bg, #0a0d13); background: var(--accent, #34e5b4);
  border: 1px solid var(--accent, #34e5b4); touch-action: none;
}
.cm-compact .cm-play { font-size: 1em; padding: 5px 11px; }
.cm-play:focus-visible { outline: 2px solid var(--text, #f2f6fc); outline-offset: 2px; }
.cm-play[data-held="true"] { filter: brightness(1.25); }

.cm-route select {
  font: inherit; padding: 4px 6px; border-radius: 4px; max-width: 100%;
  color: var(--text, #f2f6fc); background: var(--bg, #0a0d13);
  border: 1px solid var(--line, #3a485f);
}
`;

function acquireStyle() {
  styleRefs++;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
}

function releaseStyle() {
  styleRefs = Math.max(0, styleRefs - 1);
  if (styleRefs === 0) document.getElementById(STYLE_ID)?.remove();
}

// -----------------------------------------------------------------------------------------
// 4 · THE INSTRUMENT
// -----------------------------------------------------------------------------------------

export default class ChordModule {
  static id = 'chord-module';
  static label = 'Chord Module';
  static playable = true;

  // Stated explicitly rather than inherited silently — there is no shared base class in
  // this codebase.
  static needsLoad = false;
  static pieces = null;
  /** Routes to any synth: this module emits one `onNoteOut` per tone. */
  static emitsNotes = true;

  /** Exposed so a page can build a routing menu, a tone picker or a test without hard-coding
   *  this file's data. Read-only views of the two tables above. */
  static get tones() {
    return TONES;
  }

  static get SELF_TARGET() {
    return SELF;
  }

  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;

    // ——— the note bank's inputs, all of them, and nothing musical computed from them here
    this._params = {
      tone: DEFAULT_TONE,
      octave: DEFAULT_OCTAVE,          // the octave selector
      root: 0,                          // degree index 0-6, the numeral the student input
      count: DEFAULT_COUNT,
      inversion: 0,                     // rotates the bass up n times — not a label
      offsets: [0, 0, 0, 0, 0, 0, 0],   // the comping primitive, one cell per stack slot
      system: 'numeral',                // 'numeral' | 'letter'
      target: SELF,                     // routing target
      env: { ...DEFAULT_ENV },          // required on every voice-bearing instrument
    };

    this._overlay = DEFAULT_OVERLAY;    // per-surface pitch overlay

    // ——— the scale store. Imported, not passed: every instrument shares the same
    //     `state.scale`, and `bindState` is the seam a DAW page hoists through. ————
    this._store = sharedState;
    this._storeUnsub = null;

    // ——— voices ————————————————————————————————————————————————————————————————————
    this._voices = new Set();
    this._noteToVoices = new Map();

    /** This instrument has no AnalyserNode; `getAnalyser()` is null on both taps. One
     *  GainNode, summing every voice, is the whole audio chain this file owns. */
    this._mixGain = ctx.createGain();
    this._mixGain.gain.value = 1;
    this._mixGain.connect(this.out);

    /** One PeriodicWave per preset, built once at construction — four objects, never
     *  rebuilt, shared by every voice. */
    this._waves = new Map();
    for (const t of TONES) this._waves.set(t.id, this._buildWave(t.partials));

    // ——— the note-emission listener set ————————————————————————————————————————
    this._noteOutListeners = new Set();

    // ——— routing targets. Bound by the page; empty is legal. ————————————————————
    this._targets = [];
    /** midi note -> the target instrument currently holding it, so a target swapped
     *  mid-hold still gets its own noteOff and cannot strand a voice in another module. */
    this._routedNotes = new Map();

    // ——— the optional input bus ——————————————————————————————————————————————
    this._input = null;
    /** midi notes this module's own UI is currently holding on the bus. */
    this._uiHeld = [];

    // ——— DOM ————————————————————————————————————————————————————————————————————————
    this._mounts = { compact: null, expanded: null };
    this._domListeners = { compact: [], expanded: [] };
    /** midi note -> refcount, for lighting the note bank chips from the notes actually
     *  sounding rather than from the click that started them. */
    this._soundingNotes = new Map();

    this._onScaleChange = this._onScaleChange.bind(this);
    this._subscribeStore();
  }

  // =======================================================================================
  // THE SCALE SEAM — in standalone the tool owns it; in the DAW the project header does.
  // =======================================================================================
  // In the DAW, the project header owns `state.scale` and every instrument inherits it. In
  // a standalone tool, that tool owns its own `state.scale`. The shared `state` singleton
  // is the standalone case, free of wiring; `bindState(store)` is the DAW case. This module
  // never stores a scale — it reads `store.scale` at the moment it needs one.

  /** @param store anything with `{ scale, on('scale', fn) }`. Same duck type
   *  `surfaces/piano-roll.js` binds to, so a test store works here too. */
  bindState(store) {
    if (!store) return this;
    this._unsubscribeStore();
    this._store = store;
    this._subscribeStore();
    this._syncUI();
    return this;
  }

  /** The current scale, straight off the store. Never cached — a cached scale would be a
   *  second source of truth. */
  get scale() {
    return this._store.scale;
  }

  _subscribeStore() {
    const off = this._store?.on?.('scale', this._onScaleChange);
    this._storeUnsub = typeof off === 'function' ? off : null;
  }

  _unsubscribeStore() {
    this._storeUnsub?.();
    this._storeUnsub = null;
  }

  /** A degree moved under this module: the numeral, its case, its color, the note bank's
   *  pitches and its chord label all move with it. Nothing is recomputed here — the whole
   *  redraw re-reads `theory/chord.js`. Notes already sounding keep the pitch they were
   *  struck with; a `degrees` edit is not a transposition of live audio. */
  _onScaleChange() {
    this._syncUI();
  }

  // =======================================================================================
  // HOW IT ROUTES TO ANOTHER INSTRUMENT
  // =======================================================================================
  // The control is `route.target`, a string: `'self'` or another loaded instrument's
  // `static id`. It round-trips through `getState`/`setState`, so a saved project comes
  // back driving what it was driving.
  //
  // How the target is chosen: the page — the only thing that knows which instruments are
  // loaded — hands this module a list with `bindTargets()`. The module draws that list as a
  // <select> and forwards every note to the chosen row's instrument through `noteOn`/
  // `noteOff`. An id that names no bound row falls back to sounding itself.
  //
  // `onNoteOut` fires either way: an instrument with `emitsNotes` still routes its own
  // audio to `out` normally. It is the observer channel (a recorder, `core/capture.js`, an
  // arrangement view, a test), not the routing channel. A page that both binds targets and
  // forwards from `onNoteOut` would trigger the target twice; bind one or the other, not
  // both.

  /**
   * @param rows [{ id, label, instrument }] — `id` should be its `static id`. The `'self'`
   *        row is implicit and always first; a caller does not supply it.
   */
  bindTargets(rows) {
    this._releaseRouted();
    this._targets = Array.isArray(rows)
      ? rows
          .filter((r) => r && r.id !== SELF && r.instrument)
          .map((r) => ({ id: String(r.id), label: r.label ?? String(r.id), instrument: r.instrument }))
      : [];
    this._syncUI();
    return this;
  }

  unbindTargets() {
    this._releaseRouted();
    this._targets = [];
    this._syncUI();
    return this;
  }

  /** The routing rows a UI may offer, `'self'` included. Read-only. */
  get targets() {
    return [{ id: SELF, label: ChordModule.label, instrument: null }, ...this._targets];
  }

  /** The instrument notes are going to right now, or null when this module sounds itself. */
  get routedTo() {
    if (this._params.target === SELF) return null;
    return this._targets.find((t) => t.id === this._params.target)?.instrument ?? null;
  }

  // =======================================================================================
  // THE INPUT BUS — playing here lights the other surfaces
  // =======================================================================================
  // Playing any one lights the other two. The scale circle and the diatonic keys light
  // from `core/input.js`'s bus, which is also where they play to. This module is an
  // instrument, not a surface, so it does not import that bus on its own — a page that
  // wants its Play button to light the surfaces hands the bus in with `bindInput`.
  //
  // Bound: the Play button calls `input.emitNoteOn({..., source})` with the real route that
  // fired ('mouse' | 'touch' | 'key'), the bus fans out to every surface, and the page's
  // existing `input.on('noteon') -> module.noteOn` wire brings the note back here. One path
  // in, one path out, no double trigger.
  // Unbound: the Play button calls `this.noteOn` directly. The module still sounds; nothing
  // lights, because nothing is listening.

  /** @param bus `core/input.js`'s `input`, or anything with `emitNoteOn`/`emitNoteOff`. */
  bindInput(bus) {
    this._releaseUiHeld();
    this._input = bus && typeof bus.emitNoteOn === 'function' ? bus : null;
    return this;
  }

  unbindInput() {
    this._releaseUiHeld();
    this._input = null;
    return this;
  }

  // =======================================================================================
  // NOTE INPUT
  // =======================================================================================

  /** `note` is a MIDI number 0-127, `velocity` 0-1, `atTime` an AudioContext time.
   *  A missing velocity is 0.8, never NaN and never a throw. */
  noteOn(note, velocity = VELOCITY, atTime) {
    if (!Number.isFinite(note)) return;
    const t0 = atTime ?? this.ctx.currentTime;
    const vel = Number.isFinite(velocity) ? clamp(velocity, 0, 1) : VELOCITY;

    // Emission and sounding are independent. Observers hear about every note this module
    // handles, whichever way it is routed.
    this._emitNoteOut({ note, velocity: vel, atTime: t0 });

    const target = this.routedTo;
    if (target) {
      // Routed: this module makes NO sound. It drives.
      this._routedNotes.set(note, target);
      target.noteOn(note, vel, t0);
    } else {
      this._allocate(note, vel, t0);
    }

    this._lightNote(note, +1);
  }

  noteOff(note, atTime) {
    if (!Number.isFinite(note)) return;
    const t0 = atTime ?? this.ctx.currentTime;

    const routed = this._routedNotes.get(note);
    if (routed) {
      this._routedNotes.delete(note);
      routed.noteOff(note, t0);
    }

    const set = this._noteToVoices.get(note);
    if (set) for (const voice of Array.from(set)) voice.release(t0);

    this._lightNote(note, -1);
  }

  /** Silences this module's own voices and anything it is currently driving — a panic that
   *  left a routed target ringing would be a panic that does not work. */
  allNotesOff() {
    const t0 = this.ctx.currentTime;
    for (const voice of Array.from(this._voices)) voice.release(t0);
    this._releaseRouted(t0);
    this._releaseUiHeld();
    this._soundingNotes.clear();
    this._paintSounding();
  }

  /** The allocate sequence: fixed cpuWeight, ask the governor, granted → construct/trigger/
   *  register, refused → `voicePool.steal()` (deregisters synchronously) and retry once. A
   *  note is never refused. */
  _allocate(note, velocity, t0) {
    if (!governor.request(VOICE_COST)) {
      const stolen = voicePool.steal();
      if (stolen) stolen.steal(t0);
      if (!governor.request(VOICE_COST)) {
        console.warn(
          '[chord-module] governor still refused after one steal-retry; allocating anyway ' +
            'per §10-A ("a note is never refused").'
        );
      }
    }

    const voice = new Voice(this.ctx, this._mixGain, VOICE_COST);
    voice.onFree = () => {
      this._voices.delete(voice);
      const set = this._noteToVoices.get(note);
      if (set) {
        set.delete(voice);
        if (set.size === 0) this._noteToVoices.delete(note);
      }
    };

    voice.trigger(note, velocity, t0, {
      wave: this._waves.get(this._params.tone) ?? this._waves.get(TONES[0].id),
      ...this._params.env,
    });

    voicePool.register(voice, ChordModule.id);
    this._voices.add(voice);
    if (!this._noteToVoices.has(note)) this._noteToVoices.set(note, new Set());
    this._noteToVoices.get(note).add(voice);
  }

  // =======================================================================================
  // NOTE EMISSION
  // =======================================================================================

  onNoteOut(fn) {
    if (typeof fn === 'function') this._noteOutListeners.add(fn);
  }

  offNoteOut(fn) {
    this._noteOutListeners.delete(fn);
  }

  _emitNoteOut(payload) {
    for (const fn of [...this._noteOutListeners]) {
      try {
        fn(payload);
      } catch (err) {
        // A listener's own bug must never break the instrument, the same guard
        // `core/audio.js` puts around its 'unlocked' subscribers.
        console.error('[chord-module] onNoteOut listener threw:', err);
      }
    }
  }

  // =======================================================================================
  // THE CHORD ITSELF — one call out, nothing computed here.
  // =======================================================================================

  /** The note bank's one call. Everything this module draws and everything it plays comes
   *  from here — there is no second path from the scale to a pitch in this file. */
  bank() {
    const p = this._params;
    return noteBank(this.scale, {
      root: p.root,
      count: p.count,
      octave: p.octave,
      inversion: p.inversion,
      offsets: p.offsets.slice(0, p.count),
      system: p.system,
    });
  }

  /** A voicing is played by calling `noteOn` once per pitch. Returns the pitches it
   *  started, so a caller can release exactly those and not a recomputed set. */
  playChord(velocity = VELOCITY, atTime) {
    const notes = this.bank().voicing;
    for (const note of notes) this.noteOn(note, velocity, atTime);
    return notes;
  }

  releaseChord(notes, atTime) {
    const list = Array.isArray(notes) ? notes : this.bank().voicing;
    for (const note of list) this.noteOff(note, atTime);
    return list;
  }

  // =======================================================================================
  // PARAMS
  // =======================================================================================
  //   tone.preset     'p1' | 'p3' | 'p6' | 'p12'
  //   chord.octave    int  OCTAVE_MIN..OCTAVE_MAX  — the octave selector
  //   chord.root      int  0-6                     — the numeral
  //   chord.numeral   string                       — parsed via `parseNumeral`, case ignored IN
  //   chord.count     int  1..MAX_COUNT
  //   chord.inversion int  0..count-1               — clamped by `inversionTimes`
  //   chord.spread    int[]                         — the comping primitive
  //   chord.system    'numeral' | 'letter'
  //   route.target    'self' | instrument id
  //   env.attack | env.decay | env.sustain | env.release  — required on every
  //                                                          voice-bearing instrument.
  //
  // An unknown path is a silent no-op. It does not throw: automation and a preset loader
  // call this programmatically, on user-authored data, and an exception there can stop a
  // scheduler pass mid-song.

  setParam(path, value) {
    const p = this._params;
    switch (path) {
      case 'tone.preset':
        if (!TONES.some((t) => t.id === value)) return;
        p.tone = value;
        break;

      case 'chord.octave':
        if (!Number.isFinite(value)) return;
        p.octave = clamp(Math.round(value), OCTAVE_MIN, OCTAVE_MAX);
        break;

      case 'chord.root':
        if (!Number.isFinite(value)) return;
        p.root = clamp(Math.round(value), 0, 6);
        break;

      case 'chord.numeral': {
        // Case is ignored on the way in. `parseNumeral` returns null on anything it does
        // not recognize rather than throwing, and a null is dropped here.
        const parsed = parseNumeral(value);
        if (!parsed) return;
        p.root = parsed.root;
        break;
      }

      case 'chord.count':
        if (!Number.isFinite(value)) return;
        p.count = clamp(Math.round(value), 1, MAX_COUNT);
        p.inversion = clamp(p.inversion, 0, Math.max(0, p.count - 1));
        break;

      case 'chord.inversion':
        if (!Number.isFinite(value)) return;
        // Clamp, do not wrap, so a UI cannot walk a chord into the ceiling by holding a
        // button. `inversionTimes` clamps too; this keeps the stored value in domain so
        // `getState` round-trips what the student actually set.
        p.inversion = clamp(Math.round(value), 0, Math.max(0, p.count - 1));
        break;

      case 'chord.spread': {
        if (!Array.isArray(value)) return;
        const next = [0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < next.length; i++) {
          const n = Math.trunc(Number(value[i]));
          next[i] = Number.isFinite(n) ? clamp(n, -2, 2) : 0;
        }
        p.offsets = next;
        break;
      }

      case 'chord.system':
        if (!SYSTEMS.includes(value)) return;
        p.system = value;
        break;

      case 'route.target': {
        if (typeof value !== 'string') return;
        if (value !== SELF && !this._targets.some((t) => t.id === value)) return;
        if (value === p.target) return;
        // Everything sounding through the OLD route is released before the new one takes
        // over — a note held across a route change must not be stranded in the instrument
        // that is no longer selected.
        this.allNotesOff();
        p.target = value;
        break;
      }

      case 'env.attack':
      case 'env.decay':
      case 'env.sustain':
      case 'env.release': {
        if (!Number.isFinite(value)) return;
        const key = path.slice(4);
        const [lo, hi] = ENV_RANGE[key];
        p.env[key] = clamp(value, lo, hi);
        this._propagateEnv();   // live on every sounding voice
        break;
      }

      default:
        return; // unknown path, silent no-op
    }
    this._syncUI();
  }

  getParam(path) {
    const p = this._params;
    switch (path) {
      case 'tone.preset': return p.tone;
      case 'chord.octave': return p.octave;
      case 'chord.root': return p.root;
      case 'chord.numeral': return ROMAN[p.root];
      case 'chord.count': return p.count;
      case 'chord.inversion': return p.inversion;
      case 'chord.spread': return [...p.offsets];
      case 'chord.system': return p.system;
      case 'route.target': return p.target;
      case 'env.attack': return p.env.attack;
      case 'env.decay': return p.env.decay;
      case 'env.sustain': return p.env.sustain;
      case 'env.release': return p.env.release;
      default: return undefined;
    }
  }

  _propagateEnv() {
    if (this._voices.size === 0) return;
    for (const voice of this._voices) voice.updateEnv({ ...this._params.env });
  }

  // ——— per-surface overlay, on the note bank ————————————————————————————————
  get overlay() {
    return this._overlay;
  }

  set overlay(value) {
    if (!OVERLAYS.includes(value)) return;   // closed enum
    this._overlay = value;
    this._syncUI();
  }

  // =======================================================================================
  // GETSTATE/SETSTATE — round-tripping the routing target and the scale
  // =======================================================================================
  // Plain JSON-safe object, no functions, no nodes. Everything below survives
  // `JSON.parse(JSON.stringify(x))` unchanged.
  //
  // The scale is included because every instrument reads the same one, so a Chord Module's
  // saved state carries the scale it was built against. `setState` writes it back through
  // the store's own mutators — this file never assigns `state.scale` and never edits a
  // scale object in place.

  getState() {
    const s = this.scale;
    const p = this._params;
    return {
      tone: p.tone,
      octave: p.octave,
      root: p.root,
      count: p.count,
      inversion: p.inversion,
      spread: [...p.offsets],
      system: p.system,
      overlay: this._overlay,
      target: p.target,
      env: { ...p.env },
      scale: {
        tonic: s.tonic,
        degrees: [...s.degrees],
        name: s.name,
        altered: [...(s.altered ?? [])],
        preset: s.preset,
        originName: s.originName,
      },
    };
  }

  setState(obj) {
    if (!obj || typeof obj !== 'object') return;

    // The scale FIRST: the numeral, the note bank and the colours are all read off it, so
    // restoring it after the rest would draw one frame of the wrong chord.
    if (obj.scale && typeof obj.scale === 'object') this._restoreScale(obj.scale);

    if (typeof obj.tone === 'string') this.setParam('tone.preset', obj.tone);
    if (Number.isFinite(obj.octave)) this.setParam('chord.octave', obj.octave);
    if (Number.isFinite(obj.root)) this.setParam('chord.root', obj.root);
    // `count` before `inversion`: the inversion clamp depends on the count.
    if (Number.isFinite(obj.count)) this.setParam('chord.count', obj.count);
    if (Number.isFinite(obj.inversion)) this.setParam('chord.inversion', obj.inversion);
    if (Array.isArray(obj.spread)) this.setParam('chord.spread', obj.spread);
    if (typeof obj.system === 'string') this.setParam('chord.system', obj.system);
    if (typeof obj.overlay === 'string') this.overlay = obj.overlay;
    if (typeof obj.target === 'string') this.setParam('route.target', obj.target);
    if (obj.env && typeof obj.env === 'object') {
      for (const key of ['attack', 'decay', 'sustain', 'release']) {
        if (Number.isFinite(obj.env[key])) this.setParam(`env.${key}`, obj.env[key]);
      }
    }
    this._syncUI();
  }

  /**
   * Writes a saved scale back through the store's own mutations and nothing else.
   *   1 · `setScaleTonic` — the key.
   *   2 · `setScalePreset` — all seven degrees at once, `altered` cleared, `originName` set,
   *        so `resetScaleDegree` still gets the student back after a load.
   *   3 · `setScaleDegree(i, delta)` — this adds `n`, so the delta is `saved − current`.
   *        Every saved value came out of these same clamped mutators, so the write-back is
   *        lossless.
   * A store that refuses a step (an unknown preset name) simply leaves that step undone and
   * publishes nothing.
   */
  _restoreScale(saved) {
    const store = this._store;
    if (!store || typeof store.setScaleDegree !== 'function') return;

    if (Number.isFinite(saved.tonic)) store.setScaleTonic?.(saved.tonic);

    const origin = typeof saved.originName === 'string'
      ? saved.originName
      : (typeof saved.preset === 'string' ? saved.preset : null);
    if (origin) store.setScalePreset?.(origin);

    if (Array.isArray(saved.degrees) && saved.degrees.length === 7) {
      for (let i = 0; i < 7; i++) {
        const want = Math.trunc(Number(saved.degrees[i]));
        if (!Number.isFinite(want)) continue;
        const delta = want - store.scale.degrees[i];
        if (delta !== 0) store.setScaleDegree(i, delta);
      }
    }
  }

  // =======================================================================================
  // GOVERNOR REPORTING
  // =======================================================================================

  get voiceCount() {
    return this._voices.size;
  }

  /** Live voices' fixed cost. This instrument owns no AnalyserNode, so a module ROUTED to
   *  another instrument reports 0: it is not making the sound. */
  get cpuWeight() {
    let total = 0;
    for (const v of this._voices) total += v.cpuWeight;
    return total;
  }

  // =======================================================================================
  // ASYNC READY / ANALYSIS TAP
  // =======================================================================================

  async ready() {
    // Nothing to load — `static needsLoad = false`. The four PeriodicWaves are built
    // synchronously in the constructor.
  }

  /** The note bank is this instrument's visual. There is no AnalyserNode in this chain, so
   *  both taps are null. */
  getAnalyser(_which) {
    return null;
  }

  // =======================================================================================
  // mountExpanded, and the compact twin
  // =======================================================================================

  mountCompact(el) {
    acquireStyle();
    this._mounts.compact = el;
    this._paint('compact');
  }

  mountExpanded(el) {
    acquireStyle();
    this._mounts.expanded = el;
    this._paint('expanded');
  }

  unmount() {
    let listenersDropped = 0;
    for (const which of ['compact', 'expanded']) {
      if (!this._mounts[which]) continue;
      listenersDropped += this._domListeners[which].length;
      this._clearMountListeners(which);
      this._mounts[which].innerHTML = '';
      this._mounts[which] = null;
      releaseStyle();
    }
    return listenersDropped;
  }

  // =======================================================================================
  // DISPOSE — returns a count of what it released
  // =======================================================================================
  // Releases: live voices, AudioNodes, DOM listeners, onNoteOut listeners, the store
  // subscription, notes left sounding in a ROUTED instrument.
  //
  // Does not dispose its routing targets, the store, the input bus, or the three surfaces —
  // it does not own them.

  dispose() {
    const report = {
      nodesDisconnected: 0,
      listenersDropped: 0,
      noteOutListenersDropped: this._noteOutListeners.size,
      storeSubscriptions: this._storeUnsub ? 1 : 0,
      notesReleased: 0,
      voicesFreed: this._voices.size,
    };

    // 1 · stop anything sounding anywhere — this module's voices and any routed target's.
    report.notesReleased = this._routedNotes.size + this._uiHeld.length;
    this._releaseRouted();
    this._releaseUiHeld();

    // 2 · teardown, not a musical note-off: free every live voice immediately rather than
    //     running its release ramp, so no orphaned setTimeout can fire against nodes this
    //     instrument is about to disconnect. free() is idempotent and self-guards re-entry.
    for (const voice of Array.from(this._voices)) voice.free();
    this._voices.clear();
    this._noteToVoices.clear();
    this._soundingNotes.clear();

    // 3 · the DOM.
    report.listenersDropped = this.unmount();

    // 4 · every subscription this module holds.
    this._noteOutListeners.clear();
    this._unsubscribeStore();
    this._input = null;
    this._targets = [];

    // 5 · the one node this file owns.
    try {
      this._mixGain.disconnect();
      report.nodesDisconnected++;
    } catch (e) { /* already disconnected */ }

    this._waves.clear();
    return report;
  }

  // ---------------------------------------------------------------------------------------
  // internal — routing / bus bookkeeping
  // ---------------------------------------------------------------------------------------

  _releaseRouted(atTime) {
    for (const [note, instrument] of this._routedNotes) {
      try {
        instrument.noteOff(note, atTime);
      } catch (e) { /* a target mid-teardown must not break this one */ }
    }
    this._routedNotes.clear();
  }

  _releaseUiHeld() {
    if (this._input) {
      for (const { note, source } of this._uiHeld) this._input.emitNoteOff({ note, source });
    }
    this._uiHeld = [];
  }

  /** Source name from the route that actually fired: a pointer event's own `pointerType`,
   *  or 'key' for a keyboard activation. */
  _sourceFor(e) {
    if (!e) return 'mouse';
    if (e.type && e.type.startsWith('key')) return 'key';
    return e.pointerType === 'touch' || e.pointerType === 'pen' ? 'touch' : 'mouse';
  }

  // ---------------------------------------------------------------------------------------
  // internal — DOM, private to this file.
  // ---------------------------------------------------------------------------------------

  _listen(which, el, type, fn, opts) {
    if (!el) return;
    el.addEventListener(type, fn, opts);
    this._domListeners[which].push({ el, type, fn, opts });
  }

  _clearMountListeners(which) {
    for (const l of this._domListeners[which]) l.el.removeEventListener(l.type, l.fn, l.opts);
    this._domListeners[which] = [];
  }

  /** Fourier coefficients for `partials` harmonics at `1/n`, the plainest harmonic series
   *  there is. Normalisation is left ON (Web Audio's default), so all four presets peak at
   *  the same level and switching preset changes the TIMBRE and not the volume — which is
   *  the only way "simple → complex" is audible as complexity rather than as loudness. */
  _buildWave(partials) {
    const n = Math.max(1, Math.trunc(partials)) + 1;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) imag[k] = 1 / k;
    return this.ctx.createPeriodicWave(real, imag);
  }

  /** Full DOM build. Runs once per mount() — never from setParam, so a control the student
   *  is interacting with is never destroyed under their pointer. */
  _paint(which) {
    const host = this._mounts[which];
    if (!host) return;
    this._clearMountListeners(which);
    host.innerHTML = '';

    const expanded = which === 'expanded';
    const root = document.createElement('div');
    root.className = `cm-root ${expanded ? 'cm-expanded' : 'cm-compact'}`;
    root.dataset.overlay = this._overlay;

    root.innerHTML = `
      <div class="cm-title">${ChordModule.label}</div>
      ${expanded ? `<p class="cm-lede" data-lede></p>` : ''}
      <div class="cm-grid">

        <div class="cm-block cm-block--wide">
          <span class="cm-legend">Numeral — pick a degree, the app tells you the case</span>
          <div class="cm-numerals" data-numerals></div>
        </div>

        <div class="cm-block">
          <span class="cm-legend">Chord</span>
          <div class="cm-row">
            <span class="cm-note">Notes</span>
            <span class="cm-step">
              <button type="button" class="cm-btn" data-count="-1" aria-label="fewer notes">&minus;</button>
              <output data-count-value></output>
              <button type="button" class="cm-btn" data-count="1" aria-label="more notes">+</button>
            </span>
            <span class="cm-note" data-upper></span>
          </div>
          <div class="cm-row">
            <span class="cm-note">Octave</span>
            <span class="cm-step">
              <button type="button" class="cm-btn" data-octave="-1" aria-label="octave down">&minus;</button>
              <output data-octave-value></output>
              <button type="button" class="cm-btn" data-octave="1" aria-label="octave up">+</button>
            </span>
          </div>
          <div class="cm-row">
            <span class="cm-note">Bass</span>
            <span class="cm-step">
              <button type="button" class="cm-btn" data-inv="-1" aria-label="bass down">&minus;</button>
              <output data-inv-value></output>
              <button type="button" class="cm-btn" data-inv="1" aria-label="bass up">+</button>
            </span>
            <button type="button" class="cm-btn" data-close-voicing>Close it up</button>
          </div>
        </div>

        <div class="cm-block">
          <span class="cm-legend">Tone — overtone count, simple to complex</span>
          <div class="cm-tones" data-tones></div>
        </div>

        <div class="cm-block cm-route">
          <span class="cm-legend">Route</span>
          <div class="cm-row">
            <select data-target aria-label="where this module's notes go"></select>
          </div>
          <p class="cm-note" data-route-note></p>
        </div>

        <div class="cm-block cm-block--wide">
          <div class="cm-row">
            <span class="cm-legend" style="flex:1">Note bank</span>
            <button type="button" class="cm-btn" data-system></button>
            <button type="button" class="cm-btn" data-overlay></button>
          </div>
          <div class="cm-bank">
            <div class="cm-bank__head">
              <span class="cm-bank__label" data-bank-label></span>
              <span class="cm-note" data-bank-note></span>
            </div>
            <div class="cm-bank__chips" data-chips></div>
          </div>
          <div class="cm-row">
            <button type="button" class="cm-play" data-play>Play the chord</button>
            <span class="cm-note" data-play-note></span>
          </div>
        </div>

      </div>`;

    host.appendChild(root);
    this._wire(which, root);
    this._syncUI();
  }

  _wire(which, root) {
    // ——— the seven numerals ————————————————————————————————————————————————————
    const numerals = root.querySelector('[data-numerals]');
    for (let i = 0; i < ROMAN.length; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cm-num';
      b.dataset.root = String(i);
      numerals.appendChild(b);
      this._listen(which, b, 'click', () => this.setParam('chord.root', i));
    }

    // ——— steppers ————————————————————————————————————————————————————————————————
    for (const b of root.querySelectorAll('[data-count]')) {
      this._listen(which, b, 'click', () =>
        this.setParam('chord.count', this._params.count + Number(b.dataset.count))
      );
    }
    for (const b of root.querySelectorAll('[data-octave]')) {
      this._listen(which, b, 'click', () =>
        this.setParam('chord.octave', this._params.octave + Number(b.dataset.octave))
      );
    }
    for (const b of root.querySelectorAll('[data-inv]')) {
      this._listen(which, b, 'click', () =>
        this.setParam('chord.inversion', this._params.inversion + Number(b.dataset.inv))
      );
    }
    this._listen(which, root.querySelector('[data-close-voicing]'), 'click', () =>
      this.setParam('chord.spread', [0, 0, 0, 0, 0, 0, 0])
    );

    // ——— the four tones ————————————————————————————————————————————————————————
    const tones = root.querySelector('[data-tones]');
    for (const t of TONES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cm-btn cm-tone';
      b.dataset.tone = t.id;
      // A partial LADDER, not a waveform: one bar per harmonic, heights at 1/n. The picture
      // IS the overtone count, which is the whole of what the preset is.
      const bars = Array.from({ length: t.partials }, (_, k) => {
        const h = 18 / (k + 1);
        const w = Math.max(1, Math.floor(44 / TONES[TONES.length - 1].partials) - 1);
        return `<rect x="${k * (w + 1)}" y="${19 - h}" width="${w}" height="${h}"></rect>`;
      }).join('');
      b.innerHTML =
        `<svg viewBox="0 0 46 20" aria-hidden="true">${bars}</svg>` +
        `<b>${t.partials}</b>` +
        `<span>${t.partials === 1 ? 'no overtones' : `${t.partials - 1} overtones`}</span>`;
      b.title = `${t.partials} partial${t.partials === 1 ? '' : 's'}`;
      tones.appendChild(b);
      this._listen(which, b, 'click', () => this.setParam('tone.preset', t.id));
    }

    // ——— routing ————————————————————————————————————————————————————————————————
    this._listen(which, root.querySelector('[data-target]'), 'change', (e) =>
      this.setParam('route.target', e.target.value)
    );

    // ——— label system and overlay, both cycle on click ————————————————————————————
    this._listen(which, root.querySelector('[data-system]'), 'click', () => {
      const i = SYSTEMS.indexOf(this._params.system);
      this.setParam('chord.system', SYSTEMS[(i + 1) % SYSTEMS.length]);
    });
    this._listen(which, root.querySelector('[data-overlay]'), 'click', () => {
      const i = OVERLAYS.indexOf(this._overlay);
      this.overlay = OVERLAYS[(i + 1) % OVERLAYS.length];
    });

    // ——— play / hold. Held while the pointer or the key is down. ————————————————
    const play = root.querySelector('[data-play]');
    const down = (e) => {
      if (e.type === 'keydown' && e.key !== ' ' && e.key !== 'Enter') return;
      if (e.type === 'keydown' && e.repeat) return;
      if (this._uiHeld.length) return;
      e.preventDefault?.();
      play.dataset.held = 'true';
      const source = this._sourceFor(e);
      const notes = this.bank().voicing;
      if (this._input) {
        // Emitted on the input bus with the real route that fired; the note comes back to
        // `noteOn` through the page's own wire. One path, no double trigger.
        for (const note of notes) {
          this._input.emitNoteOn({ note, velocity: VELOCITY, source });
          this._uiHeld.push({ note, source });
        }
      } else {
        for (const note of notes) {
          this.noteOn(note, VELOCITY);
          this._uiHeld.push({ note, source: null });
        }
      }
    };
    const up = () => {
      if (!this._uiHeld.length) return;
      play.dataset.held = 'false';
      if (this._input) {
        this._releaseUiHeld();
      } else {
        for (const { note } of this._uiHeld) this.noteOff(note);
        this._uiHeld = [];
      }
    };
    this._listen(which, play, 'pointerdown', down);
    this._listen(which, play, 'keydown', down);
    this._listen(which, play, 'pointerup', up);
    this._listen(which, play, 'pointercancel', up);
    this._listen(which, play, 'pointerleave', up);
    this._listen(which, play, 'keyup', up);
    this._listen(which, window, 'blur', up);
  }

  /** Targeted updates only. Never rebuilds DOM. Safe to call from every setParam and from
   *  every 'scale' event. */
  _syncUI() {
    for (const which of ['compact', 'expanded']) {
      const host = this._mounts[which];
      if (!host) continue;
      const root = host.querySelector('.cm-root');
      if (!root) continue;
      this._syncOne(root);
    }
    this._paintSounding();
  }

  _syncOne(root) {
    const p = this._params;
    const scale = this.scale;
    const bank = this.bank();

    root.dataset.overlay = this._overlay;

    // ——— the seven numerals: base + superscript, and the chord's own colour ————
    for (const b of root.querySelectorAll('[data-root]')) {
      const i = Number(b.dataset.root);
      const parts = numeralParts(scale, i, p.count);
      b.innerHTML = `${parts.base}<sup>${parts.sup}</sup>`;
      b.style.setProperty('--deg', `var(${degreeColor(scale, i)})`);
      b.setAttribute('aria-pressed', String(i === p.root));
      // The quality is the tooltip; the colour is on the button itself.
      b.title = degreeQuality(scale, i);
    }

    // ——— steppers ————————————————————————————————————————————————————————————————
    const set = (sel, text) => {
      const el = root.querySelector(sel);
      if (el) el.textContent = text;
    };
    set('[data-count-value]', String(p.count));
    set('[data-octave-value]', String(p.octave));
    set('[data-inv-value]', String(p.inversion));
    set('[data-upper]', isUpperOvertoneChord(p.count) ? 'upper overtone chord' : '');

    for (const b of root.querySelectorAll('[data-count]')) {
      const next = p.count + Number(b.dataset.count);
      b.disabled = next < 1 || next > MAX_COUNT;
    }
    for (const b of root.querySelectorAll('[data-octave]')) {
      const next = p.octave + Number(b.dataset.octave);
      b.disabled = next < OCTAVE_MIN || next > OCTAVE_MAX;
    }
    for (const b of root.querySelectorAll('[data-inv]')) {
      const next = p.inversion + Number(b.dataset.inv);
      b.disabled = next < 0 || next > p.count - 1;
    }

    // ——— tones ————————————————————————————————————————————————————————————————————
    for (const b of root.querySelectorAll('[data-tone]')) {
      b.setAttribute('aria-pressed', String(b.dataset.tone === p.tone));
    }

    // ——— routing ————————————————————————————————————————————————————————————————
    const select = root.querySelector('[data-target]');
    if (select) {
      const rows = this.targets;
      const want = rows.map((r) => `${r.id} ${r.label}`).join('');
      if (select.dataset.rows !== want) {
        select.dataset.rows = want;
        select.innerHTML = rows
          .map((r) => `<option value="${r.id}">${r.id === SELF ? `${r.label} — sound it here` : r.label}</option>`)
          .join('');
      }
      select.value = p.target;
      const note = root.querySelector('[data-route-note]');
      if (note) {
        note.textContent = p.target === SELF
          ? (this._targets.length
            ? 'Sounding through its own four tones. Pick another instrument to drive it instead.'
            : 'Sounding through its own four tones. No other instrument is loaded on this page.')
          : 'This module is silent — the chord is being played by the instrument above.';
      }
    }

    // ——— the two cycle buttons ————————————————————————————————————————————————————
    const sysBtn = root.querySelector('[data-system]');
    if (sysBtn) sysBtn.textContent = p.system === 'numeral' ? 'numerals' : 'letters';
    const ovBtn = root.querySelector('[data-overlay]');
    if (ovBtn) ovBtn.textContent = this._overlay;

    // ——— THE NOTE BANK ————————————————————————————————————————————————————————————
    // Every string and every colour below came out of `noteBank()`. This block chooses
    // layout and size only.
    const label = root.querySelector('[data-bank-label]');
    if (label) {
      const L = bank.chordLabelParts;
      label.innerHTML =
        `${L.base}<sup>${L.sup}</sup>` +
        (L.slash ? `<span class="cm-slash">/${L.slash}</span>` : '');
      label.style.setProperty('--deg', `var(${bank.colorToken})`);
    }
    const bankNote = root.querySelector('[data-bank-note]');
    if (bankNote) {
      bankNote.textContent = `${scale.name} · ${bank.tones.length} note${bank.tones.length === 1 ? '' : 's'}`;
    }

    const chips = root.querySelector('[data-chips]');
    if (chips) this._renderChips(chips, bank);

    const lede = root.querySelector('[data-lede]');
    if (lede) {
      lede.textContent =
        'Pick a numeral. The note bank runs the logic of the scale against the numeral you ' +
        'picked: each note carries its own number in that root’s scale, in that ' +
        'degree’s colour. Move the bass, spread the notes, and hear the same chord change.';
    }

    const playNote = root.querySelector('[data-play-note]');
    if (playNote) {
      playNote.textContent = this._input
        ? 'Hold it. Every surface on this page lights with it.'
        : 'Hold it.';
    }
  }

  /** One chip per `bank.tones[]` entry, in the voicing's sounding order — `tones[k]` sounds
   *  at `voicing[k]`. Rebuilt only when the chord's shape changes; otherwise only the lit
   *  state is repainted. */
  _renderChips(chips, bank) {
    const p = this._params;
    const signature = [
      p.system, this._overlay, p.count, p.inversion, p.octave, p.root,
      this.scale.tonic, this.scale.degrees.join(','), p.offsets.join(','),
    ].join('|');
    if (chips.dataset.signature === signature) return;
    chips.dataset.signature = signature;

    // Rebuilt DOM means the old chips' listeners are gone with them — drop the records too,
    // or `dispose()` would try to remove listeners from elements that no longer exist and
    // the count it reports would be a lie.
    //
    // `contains()` is guarded, and the guard is load-bearing: the bag also holds a `window`
    // record (the Play button's blur release), and `Node.contains(window)` THROWS
    // "parameter 1 is not of type 'Node'" rather than returning false. Found by running the
    // real page in headless Chrome — it took the whole mount down.
    for (const which of ['compact', 'expanded']) {
      this._domListeners[which] = this._domListeners[which].filter((l) => {
        if (!l.el || typeof l.el.nodeType !== 'number' || !chips.contains(l.el)) return true;
        l.el.removeEventListener(l.type, l.fn, l.opts);
        return false;
      });
    }

    const which = chips.closest('.cm-expanded') ? 'expanded' : 'compact';
    chips.innerHTML = '';

    bank.tones.forEach((tone, k) => {
      const chip = document.createElement('div');
      chip.className = 'cm-chip';
      chip.dataset.midi = String(tone.midi);
      chip.style.setProperty('--deg', `var(${tone.colorToken})`);

      // Four overlay modes; this module holds its own toggle, not a global overlay setting.
      // Every string here came from `noteBank`.
      const name =
        this._overlay === 'letter' ? (tone.letter ?? '')
          : this._overlay === 'solfege' ? tone.solfege
            : this._overlay === 'number' ? String(tone.number)
              : '';

      const tags = [tone.isRoot ? 'root' : '', tone.isBass ? 'bass' : ''].filter(Boolean).join(' · ');

      chip.innerHTML =
        `<span class="cm-chip__num">${tone.scaleNumber}</span>` +
        `<span class="cm-chip__name">${name}</span>` +
        `<span class="cm-chip__tags">${tags}</span>` +
        `<span class="cm-chip__spread">` +
        `<button type="button" data-spread="-1" aria-label="drop this note an octave">&minus;</button>` +
        `<button type="button" data-spread="1" aria-label="raise this note an octave">+</button>` +
        `</span>`;

      for (const b of chip.querySelectorAll('[data-spread]')) {
        this._listen(which, b, 'click', () => {
          // Moves one cell of `chord.spread` at a time; `noteBank` applies it.
          const next = [...p.offsets];
          next[k] = (next[k] ?? 0) + Number(b.dataset.spread);
          this.setParam('chord.spread', next);
        });
      }

      chips.appendChild(chip);
    });
  }

  _lightNote(note, delta) {
    const n = (this._soundingNotes.get(note) || 0) + delta;
    if (n > 0) this._soundingNotes.set(note, n);
    else this._soundingNotes.delete(note);
    this._paintSounding();
  }

  /** Lit from the notes actually sounding, not from the click that started them — so a note
   *  arriving from the scale circle, the diatonic keys or a MIDI controller lights the chip
   *  exactly the same way this module's own Play button does. */
  _paintSounding() {
    for (const which of ['compact', 'expanded']) {
      const host = this._mounts[which];
      if (!host) continue;
      for (const chip of host.querySelectorAll('.cm-chip')) {
        const midi = Number(chip.dataset.midi);
        chip.dataset.sounding = String(this._soundingNotes.has(midi));
      }
    }
  }
}

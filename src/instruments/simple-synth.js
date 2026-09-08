/**
 * instruments/simple-synth.js — one oscillator, one envelope, spectrum tap.
 *
 * Controls: osc.wave, osc.octave, out.gain, env.attack/decay/sustain/release.
 * Voices: shared voicePool and governor from core/audio.js.
 * Analyser: spectrum only; scope returns null.
 * Wave value 'saw' maps to the native type 'sawtooth'.
 */

import { voicePool, governor, createVoiceOut } from '../core/audio.js';

// ---------------------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------------------

/** The four wave values, in display order. */
const WAVE_TYPES = ['sine', 'triangle', 'square', 'saw'];

/** On-screen labels for each wave value. */
const WAVE_LABELS = {
  sine: 'Sine',
  triangle: 'Triangle',
  square: 'Square (Pulse)',
  saw: 'Saw',
};

/** Wave value to native OscillatorType. */
const WAVE_TO_OSC_TYPE = {
  sine: 'sine',
  triangle: 'triangle',
  square: 'square',
  saw: 'sawtooth',
};

/** Decorative wave glyph paths, viewBox 0 0 40 20. */
const WAVE_ICON_PATH = {
  sine: 'M0,10 C5,0 15,0 20,10 C25,20 35,20 40,10',
  triangle: 'M0,15 L10,5 L20,15 L30,5 L40,15',
  square: 'M0,5 H20 V15 H40',
  saw: 'M0,15 L20,5 L20,15 L40,5',
};


const ADSR_FIELDS = [
  { key: 'attack', path: 'env.attack', label: 'Attack', min: 0.001, max: 2.0, step: 0.001 },
  { key: 'decay', path: 'env.decay', label: 'Decay', min: 0.001, max: 2.0, step: 0.001 },
  { key: 'sustain', path: 'env.sustain', label: 'Sustain', min: 0.0, max: 1.0, step: 0.01 },
  { key: 'release', path: 'env.release', label: 'Release', min: 0.001, max: 4.0, step: 0.001 },
];

const DEFAULT_PARAMS = {
  wave: 'sine',
  octave: 0,
  gain: 1.0,
  attack: 0.005,
  decay: 0.08,
  sustain: 0.7,
  release: 0.15,
};


const VOICE_COST = 10;


const ANALYSER_COST = 2;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function formatParamValue(key, value) {
  switch (key) {
    case 'gain':
    case 'sustain':
      return value.toFixed(2);
    case 'attack':
    case 'decay':
    case 'release':
      return `${value.toFixed(3)}s`;
    default:
      return String(value);
  }
}

// ---------------------------------------------------------------------------------------
// VOICE
// ---------------------------------------------------------------------------------------
// One oscillator plus one gain. Private to this file.

class Voice {
  /** @param out — this instrument's mix bus, upstream of the analyser. */
  constructor(ctx, out, cpuWeight) {
    this.ctx = ctx;
    this.out = out;
    this._cpuWeight = cpuWeight;
    this._state = 'free';
    this.osc = null;
    this.gain = null;
    this._envelope = null;
    this._t0 = 0; // when this note actually started — every envelope reschedule anchors here
    this._peak = 0; // this note's velocity peak — fixed at trigger, unlike the envelope
    this._releaseT0 = 0; // when the key actually came up — the release ramp anchors here
    this._timers = [];
    this._freeTimer = null;
    /** Owner callback, fired from free(). Assigned after construction. */
    this.onFree = null;
  }

  get cpuWeight() {
    return this._cpuWeight;
  }

  get state() {
    return this._state;
  }

  /** Starts this voice. opts carries wave, octave shift, and the four envelope values.
   *  Wave and octave are snapshotted here; the envelope stays live. */
  trigger(note, velocity, atTime, opts) {
    const { wave, octaveShift, attack, decay, sustain, release } = opts;
    const t0 = atTime ?? this.ctx.currentTime;
    const freq = midiToFreq(note + 12 * octaveShift);

    this.osc = this.ctx.createOscillator();
    this.osc.type = WAVE_TO_OSC_TYPE[wave] || 'sine';
    this.osc.frequency.setValueAtTime(freq, t0);

    this.gain = this.ctx.createGain();
    this.gain.gain.setValueAtTime(0, t0);

    // Anchors for every later reschedule: note start time and peak level.
    this._t0 = t0;
    this._peak = clamp(velocity, 0, 1);
    this._envelope = { attack, decay, sustain, release };

    this.osc.connect(this.gain);
    this.gain.connect(this.out);
    this.osc.start(t0);

    // Four-stage envelope on the gain node's .gain param.
    this._scheduleAttackDecay(t0, 0);
  }

  /** The sustain plateau in absolute gain, from the current envelope and this voice's peak. */
  _sustainLevel() {
    return this._peak * clamp(this._envelope.sustain, 0, 1);
  }

  /** The scheduled gain at absolute time t. Release branch while releasing, else
   *  attack, decay, sustain. */
  _gainAt(t) {
    if (this._state === 'releasing') {
      const start = this._releaseT0;
      const end = Math.max(start + this._envelope.release, start + 0.001);
      if (t <= start) return this._releaseFrom;
      if (t >= end) return 0;
      return this._releaseFrom * (1 - (t - start) / (end - start));
    }
    const attackEnd = this._t0 + this._envelope.attack;
    const decayEnd = attackEnd + this._envelope.decay;
    const sustain = this._sustainLevel();
    if (t <= this._t0) return 0;
    if (t < attackEnd) return this._peak * ((t - this._t0) / this._envelope.attack);
    if (t < decayEnd) return this._peak + (sustain - this._peak) * ((t - attackEnd) / this._envelope.decay);
    return sustain;
  }

  /** Writes the attack and decay ramps, anchored to _t0, and re-arms the stage timer.
   *  fromTime and fromValue are where the new automation picks up. */
  _scheduleAttackDecay(fromTime, fromValue) {
    const g = this.gain.gain;
    const attackEnd = this._t0 + this._envelope.attack;
    const decayEnd = attackEnd + this._envelope.decay;
    const MIN = 0.001; // minimum ramp length

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

    // Decay is folded into the 'attacking' state until the envelope reaches sustain.
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

  /** Live envelope edit. Stores the new shape and rewrites the automation already
   *  scheduled on this voice's gain. Wave and octave are not live. */
  updateEnv(env) {
    this._envelope = {
      attack: env.attack,
      decay: env.decay,
      sustain: env.sustain,
      release: env.release,
    };
    if (!this.gain || this._state === 'free' || this._state === 'stealing') return;

    const now = this.ctx.currentTime;
    if (this._state === 'attacking' || this._state === 'sustaining') {
      this._scheduleAttackDecay(now, this.gain.gain.value);
    } else if (this._state === 'releasing') {
      // A release in flight re-aims at the new release time, anchored to _releaseT0.
      this._scheduleRelease(now, this.gain.gain.value);
    }
  }

  /** Starts the release stage. The voice frees itself when the ramp completes. */
  release(atTime) {
    if (this._state === 'free' || this._state === 'stealing') return;
    const t0 = atTime ?? this.ctx.currentTime;
    // Read before the state moves to 'releasing'.
    const currentVal = t0 > this.ctx.currentTime ? this._gainAt(t0) : this.gain.gain.value;

    this._clearTimers();
    this._state = 'releasing';
    this._releaseT0 = t0;
    this._scheduleRelease(t0, currentVal);
  }

  /** Writes the release ramp, anchored to _releaseT0, and re-arms the self-free timer. */
  _scheduleRelease(fromTime, fromValue) {
    const g = this.gain.gain;
    const MIN = 0.001;
    const end = Math.max(this._releaseT0 + this._envelope.release, fromTime + MIN);

    // Where the release ramp starts, read back by _gainAt.
    this._releaseFrom = fromValue;

    g.cancelScheduledValues(fromTime);
    g.setValueAtTime(fromValue, fromTime);
    g.linearRampToValueAtTime(0, end);

    if (this._freeTimer) {
      clearTimeout(this._freeTimer);
      this._freeTimer = null;
    }
    const freeMs = Math.max(0, (end - this.ctx.currentTime) * 1000) + 5; // 5ms landing margin
    this._freeTimer = setTimeout(() => this.free(), freeMs);
  }

  /** Forced release: linear fade to 0 over 5ms, then free(). */
  steal(atTime) {
    if (this._state === 'free') return;
    const t0 = atTime ?? this.ctx.currentTime;
    // Read before the state moves to 'stealing'.
    const currentVal = t0 > this.ctx.currentTime ? this._gainAt(t0) : this.gain.gain.value;

    this._clearTimers();
    this._state = 'stealing';
    this.gain.gain.cancelScheduledValues(t0);
    this.gain.gain.setValueAtTime(currentVal, t0);
    this.gain.gain.linearRampToValueAtTime(0, t0 + 0.005);

    const nowWall = this.ctx.currentTime;
    const freeMs = Math.max(0, (t0 + 0.005 - nowWall) * 1000) + 5;
    this._freeTimer = setTimeout(() => this.free(), freeMs);
  }

  /** Disconnects this voice's nodes, deregisters from voicePool, fires onFree. */
  free() {
    if (this._state === 'free') return;
    this._clearTimers();
    this._state = 'free';
    try {
      this.osc.stop();
    } catch (e) {
      // already stopped
    }
    try {
      this.osc.disconnect();
    } catch (e) {
      /* already disconnected */
    }
    try {
      this.gain.disconnect();
    } catch (e) {
      /* already disconnected */
    }
    voicePool.release(this);
    if (typeof this.onFree === 'function') this.onFree();
  }

  /** Clears the attack and decay stage timers, leaving the self-free timer alone. */
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

// ---------------------------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------------------------
// Injected once per document, shared by every SimpleSynth mount.
// Each var() fallback matches the value ui/tokens.css defines for that token.

let styleRefs = 0;

function acquireStyle() {
  styleRefs++;
  if (document.getElementById('simple-synth-styles')) return;
  const style = document.createElement('style');
  style.id = 'simple-synth-styles';
  style.textContent = `
.ws-root { box-sizing: var(--box-border-box); font-family: var(--font-ui); color: var(--text, #f2f6fc); background: var(--panel, #1b2332); border: var(--bw) solid var(--line, #3a485f); border-radius: var(--r-body); position: var(--pos-relative); }
.ws-root *, .ws-root *::before, .ws-root *::after { box-sizing: var(--box-border-box); }
.ws-compact { padding: var(--sp-3) var(--sp-4); --fs-root: 11px; font-size: var(--fs-base); display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-3); width: var(--pct-100); }
.ws-expanded { padding: var(--sp-16) var(--sp-20); --fs-root: 18px; font-size: var(--fs-base); display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-11); width: var(--pct-100); min-height: var(--pct-100); background: var(--bg, #0a0d13); }
.ws-title { display: var(--disp-none); }
.ws-expanded .ws-title { display: var(--disp-block); font-size: var(--fs-xl); font-weight: var(--w-bold); letter-spacing: var(--track-title); color: var(--text, #f2f6fc); }
.ws-row { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-4); flex-wrap: var(--flexwrap-wrap); }
.ws-expanded .ws-row { gap: var(--sp-8); }
.ws-label { color: var(--text-dim, #93a1b8); font-size: var(--fs-xs); min-width: var(--sp-em-36); }
.ws-expanded .ws-label { font-size: var(--fs-micro); text-transform: var(--tt-label); letter-spacing: var(--track-label); }
.ws-waves { display: var(--disp-flex); gap: var(--sp-2); flex-wrap: var(--flexwrap-wrap); }
.ws-expanded .ws-waves { gap: var(--sp-6); }
.ws-wave-btn { display: var(--disp-flex); flex-direction: var(--flexdir-column); align-items: var(--align-center); gap: var(--sp-1h); background: var(--color-transparent); border: var(--bw) solid var(--line, #3a485f); border-radius: var(--r-ctl); color: var(--text-dim, #93a1b8); padding: var(--sp-2) var(--sp-3); cursor: var(--cur-pointer); font: var(--font-inherit); }
.ws-expanded .ws-wave-btn { padding: var(--sp-7) var(--sp-9); border-radius: var(--r-xl); }
.ws-wave-btn svg { width: var(--sp-10); height: var(--sp-7); display: var(--disp-block); }
.ws-expanded .ws-wave-btn svg { width: var(--sp-20); height: var(--sp-13); }
.ws-wave-btn path { stroke: var(--color-current); fill: var(--none); stroke-width: var(--stroke-heavy); }
.ws-wave-btn.active { border-color: var(--accent, #34e5b4); color: var(--text, #f2f6fc); background: var(--accent, #34e5b4); background: color-mix(in srgb, var(--accent, #34e5b4) 18%, transparent); }
.ws-stepper { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-2); }
.ws-stepper button { background: var(--color-transparent); border: var(--bw) solid var(--line, #3a485f); color: var(--text, #f2f6fc); width: var(--sp-em-17); height: var(--sp-em-17); border-radius: var(--r-sm); cursor: var(--cur-pointer); font: var(--font-inherit); line-height: var(--lh-none); }
.ws-stepper output { min-width: var(--sp-em-16); text-align: var(--ta-center); color: var(--text, #f2f6fc); }
.ws-root input[type="range"] { accent-color: var(--accent, #34e5b4); flex: var(--flex-1); min-width: var(--sp-30); }
.ws-readout { color: var(--text-dim, #93a1b8); font-variant-numeric: var(--num-tabular); min-width: var(--sp-em-35); text-align: var(--ta-right); }
.ws-adsr { display: var(--disp-flex); gap: var(--sp-5); flex-wrap: var(--flexwrap-wrap); }
.ws-expanded .ws-adsr { gap: var(--sp-12); }
.ws-adsr-cell { display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-1); min-width: var(--sp-39); }
.ws-expanded .ws-adsr-cell { min-width: var(--sp-65); }
.ws-glow.ws-playing::before { content: var(--content-empty); position: var(--pos-absolute); inset: -8px; border-radius: var(--r-lg); background: var(--accent, #34e5b4); background: radial-gradient(circle, color-mix(in srgb, var(--accent, #34e5b4) 55%, transparent), transparent 70%); animation: var(--anim-pulse); pointer-events: var(--pe-none); z-index: var(--z-behind); }
@keyframes ws-pulse { 0%, 100% { opacity: var(--op-faint); transform: var(--scale-pulse-rest); } 50% { opacity: var(--op-soft); transform: var(--scale-pulse-peak); } }
`;
  document.head.appendChild(style);
}

function releaseStyle() {
  styleRefs = Math.max(0, styleRefs - 1);
  if (styleRefs === 0) document.getElementById('simple-synth-styles')?.remove();
}

// ---------------------------------------------------------------------------------------
// INSTRUMENT
// ---------------------------------------------------------------------------------------

export default class SimpleSynth {
  static id = 'simple-synth';
  static label = 'Simple Synth';
  static playable = true;

  // No-op defaults, stated explicitly.
  static needsLoad = false;
  static pieces = null;
  static emitsNotes = false;

  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;

    this._params = { ...DEFAULT_PARAMS };

    /** Live voices this instrument owns. Private to this class. */
    this._voices = new Set();
    /** note -> Set<Voice>, so noteOff releases every voice sounding that note. */
    this._noteToVoices = new Map();

    // One analyser per instrument, after the voice sum and before out.
    // _mixGain is both the voice-summing bus and the out.gain control point.
    this._mixGain = ctx.createGain();
    this._mixGain.gain.value = this._params.gain;

    this._analyser = ctx.createAnalyser();
    this._analyser.fftSize = 2048;
    this._analyser.maxDecibels = -15;

    this._mixGain.connect(this._analyser);
    this._analyser.connect(this.out);

    this._mounts = { compact: null, expanded: null };
    this._domListenersByMount = { compact: [], expanded: [] };
  }

  // ---- async ready ----
  async ready() {
    // Sound is available from construction; nothing to await.
    return;
  }

  // ---- note input ----
  noteOn(note, velocity = 0.8, atTime) {
    const t0 = atTime ?? this.ctx.currentTime;
    const cost = VOICE_COST;

    // Allocate: ask the governor, steal the pool's oldest on refusal, retry once.
    if (!governor.request(cost)) {
      const stolen = voicePool.steal();
      if (stolen) stolen.steal(t0); // 5ms audio fade; the count already dropped
      if (!governor.request(cost)) {
        // Allocate anyway rather than drop the note.
        console.warn('[simple-synth] governor refused after one steal-retry; allocating anyway.');
      }
    }

    const voice = new Voice(this.ctx, createVoiceOut(SimpleSynth.id, this._mixGain), cost);
    voice.onFree = () => {
      this._voices.delete(voice);
      const set = this._noteToVoices.get(note);
      if (set) {
        set.delete(voice);
        if (set.size === 0) this._noteToVoices.delete(note);
      }
      this._reflectActivity();
    };

    voice.trigger(note, velocity, t0, {
      wave: this._params.wave,
      octaveShift: this._params.octave,
      attack: this._params.attack,
      decay: this._params.decay,
      sustain: this._params.sustain,
      release: this._params.release,
    });

    voicePool.register(voice, SimpleSynth.id, t0);
    this._voices.add(voice);
    if (!this._noteToVoices.has(note)) this._noteToVoices.set(note, new Set());
    this._noteToVoices.get(note).add(voice);

    this._reflectActivity();
  }

  noteOff(note, atTime) {
    const set = this._noteToVoices.get(note);
    if (!set) return;
    const t0 = atTime ?? this.ctx.currentTime;
    for (const voice of Array.from(set)) voice.release(t0);
  }

  allNotesOff() {
    const t0 = this.ctx.currentTime;
    for (const voice of Array.from(this._voices)) voice.release(t0);
  }

  // ---- note emission — no-op, emitsNotes is false ----
  onNoteOut(_fn) {
    // No-op.
  }
  offNoteOut(_fn) {
    // No-op.
  }

  // ---- params ----
  setParam(path, value) {
    switch (path) {
      case 'osc.wave':
        if (!WAVE_TYPES.includes(value)) return;
        this._params.wave = value;
        break;
      case 'osc.octave':
        this._params.octave = clamp(Math.round(value), -2, 2);
        break;
      case 'out.gain':
        this._params.gain = clamp(value, 0, 1);
        this._mixGain.gain.setValueAtTime(this._params.gain, this.ctx.currentTime);
        break;
      case 'env.attack':
        this._params.attack = clamp(value, 0.001, 2.0);
        this._propagateEnv();
        break;
      case 'env.decay':
        this._params.decay = clamp(value, 0.001, 2.0);
        this._propagateEnv();
        break;
      case 'env.sustain':
        this._params.sustain = clamp(value, 0.0, 1.0);
        this._propagateEnv();
        break;
      case 'env.release':
        this._params.release = clamp(value, 0.001, 4.0);
        this._propagateEnv();
        break;
      default:
        return; // unknown path, ignored
    }
    this._syncUI();
  }

  /** Pushes the current env values into every sounding voice. Wave and octave are
   *  not propagated. */
  _propagateEnv() {
    if (this._voices.size === 0) return;
    const env = {
      attack: this._params.attack,
      decay: this._params.decay,
      sustain: this._params.sustain,
      release: this._params.release,
    };
    for (const voice of this._voices) voice.updateEnv(env);
  }

  getParam(path) {
    switch (path) {
      case 'osc.wave':
        return this._params.wave;
      case 'osc.octave':
        return this._params.octave;
      case 'out.gain':
        return this._params.gain;
      case 'env.attack':
        return this._params.attack;
      case 'env.decay':
        return this._params.decay;
      case 'env.sustain':
        return this._params.sustain;
      case 'env.release':
        return this._params.release;
      default:
        return undefined;
    }
  }

  // ---- state — JSON round-trip ----
  getState() {
    // Plain JSON-safe values only.
    return {
      wave: this._params.wave,
      octave: this._params.octave,
      gain: this._params.gain,
      attack: this._params.attack,
      decay: this._params.decay,
      sustain: this._params.sustain,
      release: this._params.release,
    };
  }

  setState(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (WAVE_TYPES.includes(obj.wave)) this.setParam('osc.wave', obj.wave);
    if (Number.isFinite(obj.octave)) this.setParam('osc.octave', obj.octave);
    if (Number.isFinite(obj.gain)) this.setParam('out.gain', obj.gain);
    if (Number.isFinite(obj.attack)) this.setParam('env.attack', obj.attack);
    if (Number.isFinite(obj.decay)) this.setParam('env.decay', obj.decay);
    if (Number.isFinite(obj.sustain)) this.setParam('env.sustain', obj.sustain);
    if (Number.isFinite(obj.release)) this.setParam('env.release', obj.release);
  }

  // ---- governor reporting ----
  get voiceCount() {
    return this._voices.size;
  }

  get cpuWeight() {
    // Live voice cost plus the always-on analyser.
    let total = ANALYSER_COST;
    for (const v of this._voices) total += v.cpuWeight;
    return total;
  }

  // ---- analysis tap ----
  getAnalyser(which) {
    if (which === 'spectrum') return this._analyser;
    return null; // scope tap is not offered
  }

  // ---- mounting ----
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
      listenersDropped += this._domListenersByMount[which].length;
      this._clearMountListeners(which);
      const el = this._mounts[which];
      if (el) {
        el.innerHTML = '';
        releaseStyle();
      }
      this._mounts[which] = null;
    }
    return listenersDropped;
  }

  // ---- teardown ----
  dispose() {
    let nodesDisconnected = 0;
    const listenersDropped = this.unmount();

    // Free every live voice immediately rather than running its release ramp.
    for (const voice of Array.from(this._voices)) voice.free();
    this._voices.clear();
    this._noteToVoices.clear();

    try {
      this._mixGain.disconnect();
      nodesDisconnected++;
    } catch (e) {
      /* already disconnected */
    }
    try {
      this._analyser.disconnect();
      nodesDisconnected++;
    } catch (e) {
      /* already disconnected */
    }

    return { nodesDisconnected, listenersDropped };
  }

  // ---------------------------------------------------------------------------------
  // internal — DOM painting and syncing
  // ---------------------------------------------------------------------------------

  _listen(which, el, type, fn) {
    el.addEventListener(type, fn);
    this._domListenersByMount[which].push({ el, type, fn });
  }

  _clearMountListeners(which) {
    for (const l of this._domListenersByMount[which]) l.el.removeEventListener(l.type, l.fn);
    this._domListenersByMount[which] = [];
  }

  /** Full DOM build. Runs once per mount call. */
  _paint(which) {
    const el = this._mounts[which];
    if (!el) return;
    this._clearMountListeners(which);
    el.innerHTML = '';

    const expanded = which === 'expanded';
    const root = document.createElement('div');
    // Compact is the DAW view, still. The ws-playing glow is toggled on expanded only.
    root.className = `ws-root ws-glow ${expanded ? 'ws-expanded' : 'ws-compact'}`;

    root.innerHTML = `
      <div class="ws-title">Simple Synth</div>
      <div class="ws-row">
        <span class="ws-label">Wave</span>
        <div class="ws-waves">
          ${WAVE_TYPES.map(
            (w) => `
            <button type="button" class="ws-wave-btn" data-wave-btn="${w}" title="${WAVE_LABELS[w]}" aria-pressed="false">
              <svg viewBox="0 0 40 20" aria-hidden="true"><path d="${WAVE_ICON_PATH[w]}"></path></svg>
              <span>${WAVE_LABELS[w]}</span>
            </button>`
          ).join('')}
        </div>
      </div>
      <div class="ws-row">
        <span class="ws-label">Octave</span>
        <div class="ws-stepper">
          <button type="button" data-octave-minus aria-label="Octave down">&minus;</button>
          <output data-octave-value>${this._params.octave}</output>
          <button type="button" data-octave-plus aria-label="Octave up">+</button>
        </div>
      </div>
      <div class="ws-row">
        <span class="ws-label">Level</span>
        <input type="range" min="0" max="1" step="0.01" data-param="gain" value="${this._params.gain}">
        <span class="ws-readout" data-readout="gain"></span>
      </div>
      <div class="ws-row ws-adsr">
        ${ADSR_FIELDS.map(
          (f) => `
          <div class="ws-adsr-cell">
            <span class="ws-label">${expanded ? f.label : f.label.slice(0, 1)}</span>
            <input type="range" min="${f.min}" max="${f.max}" step="${f.step}" data-param="${f.key}" value="${this._params[f.key]}">
            <span class="ws-readout" data-readout="${f.key}"></span>
          </div>`
        ).join('')}
      </div>
    `;

    el.appendChild(root);

    root.querySelectorAll('[data-wave-btn]').forEach((btn) => {
      this._listen(which, btn, 'click', () => this.setParam('osc.wave', btn.dataset.waveBtn));
    });
    this._listen(which, root.querySelector('[data-octave-minus]'), 'click', () =>
      this.setParam('osc.octave', this._params.octave - 1)
    );
    this._listen(which, root.querySelector('[data-octave-plus]'), 'click', () =>
      this.setParam('osc.octave', this._params.octave + 1)
    );

    const paramPath = { gain: 'out.gain', attack: 'env.attack', decay: 'env.decay', sustain: 'env.sustain', release: 'env.release' };
    root.querySelectorAll('[data-param]').forEach((input) => {
      const key = input.dataset.param;
      this._listen(which, input, 'input', (e) => this.setParam(paramPath[key], parseFloat(e.target.value)));
    });

    this._syncUI();
  }

  /** Targeted updates: active button, octave readout, slider values. No DOM rebuild.
   *  Skips a range input that currently has focus. */
  _syncUI() {
    for (const which of ['compact', 'expanded']) {
      const el = this._mounts[which];
      if (!el) continue;
      const root = el.querySelector('.ws-root');
      if (!root) continue;

      root.querySelectorAll('[data-wave-btn]').forEach((btn) => {
        const active = btn.dataset.waveBtn === this._params.wave;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
      });

      const octOut = root.querySelector('[data-octave-value]');
      if (octOut) octOut.textContent = String(this._params.octave);

      const syncOne = (key, value) => {
        const input = root.querySelector(`[data-param="${key}"]`);
        if (input && document.activeElement !== input) input.value = String(value);
        const readout = root.querySelector(`[data-readout="${key}"]`);
        if (readout) readout.textContent = formatParamValue(key, value);
      };
      syncOne('gain', this._params.gain);
      for (const f of ADSR_FIELDS) syncOne(f.key, this._params[f.key]);
    }
  }

  /** Toggles the expanded view's glow while any voice is live. Compact stays still. */
  _reflectActivity() {
    const active = this._voices.size > 0;
    for (const which of ['compact', 'expanded']) {
      const el = this._mounts[which];
      if (!el) continue;
      const root = el.querySelector('.ws-root');
      if (!root) continue;
      root.classList.toggle('ws-playing', active && which === 'expanded');
    }
  }
}

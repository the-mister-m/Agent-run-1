/**
 * instruments/wave-synth.js — two oscillators, one filter, two envelopes, two LFOs,
 * a 24-slot mod matrix, unison, poly and mono.
 *
 * Voices: shared voicePool and governor from core/audio.js, cap 8 held notes.
 * Unison: 1, 2 or 4 real voices per note, detune spread and stereo spread.
 * Pulse: one sawtooth minus a delayed copy of itself, width times period.
 * Analyser: spectrum only; scope returns null.
 */

import { voicePool, governor, createVoiceOut } from '../core/audio.js';
import { createKnob } from '../ui/knob.js';

// ---------------------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------------------

/** Oscillator wave values, in display order. */
const OSC_WAVES = ['sine', 'triangle', 'saw', 'square', 'pulse'];

const OSC_WAVE_LABELS = {
  sine: 'Sine',
  triangle: 'Tri',
  saw: 'Saw',
  square: 'Square',
  pulse: 'Pulse',
};

/** Wave value to native OscillatorType. Pulse runs on a sawtooth pair. */
const OSC_WAVE_TO_TYPE = {
  sine: 'sine',
  triangle: 'triangle',
  saw: 'sawtooth',
  square: 'square',
  pulse: 'sawtooth',
};

/** LFO wave values. */
const LFO_WAVES = ['sine', 'triangle', 'square', 'saw'];

const LFO_WAVE_TO_TYPE = {
  sine: 'sine',
  triangle: 'triangle',
  square: 'square',
  saw: 'sawtooth',
};

const FILTER_TYPES = ['lowpass', 'highpass', 'bandpass'];

const FILTER_TYPE_LABELS = { lowpass: 'LP', highpass: 'HP', bandpass: 'BP' };

/** Mod matrix sources, in column order. */
const MOD_SOURCES = ['env2', 'lfo1', 'lfo2', 'vel'];

const MOD_SOURCE_LABELS = { env2: 'ENV2', lfo1: 'LFO1', lfo2: 'LFO2', vel: 'VEL' };

/** Mod matrix destinations, in row order. */
const MOD_DESTS = ['pitch1', 'pitch2', 'filter', 'amp', 'pw1', 'pw2'];

const MOD_DEST_LABELS = {
  pitch1: 'Pitch 1',
  pitch2: 'Pitch 2',
  filter: 'Filter',
  amp: 'Amp',
  pw1: 'PW 1',
  pw2: 'PW 2',
};

/** Amount 1.0 in each destination's own unit: cents, gain, or pulse width. */
const MOD_FULL_SCALE = {
  pitch1: 1200,
  pitch2: 1200,
  filter: 4800,
  amp: 1,
  pw1: 0.45,
  pw2: 0.45,
};

/** Held notes this instrument allows before it steals its own oldest. */
const MAX_NOTES = 8;

const UNISON_COUNTS = [1, 2, 4];

/** Per-voice governor cost. One voice is about 44 nodes, 24 of them matrix gains. */
const VOICE_COST = 40;

const ANALYSER_COST = 2;

const MIN_RAMP = 0.001;

const STEAL_FADE = 0.005;

const DEFAULT_PATCH = {
  o1wave: 'saw',
  o1oct: 0,
  o1semi: 0,
  o1fine: 0,
  o1level: 0.6,
  o1pw: 0.5,

  o2wave: 'saw',
  o2oct: 0,
  o2semi: 0,
  o2fine: 7,
  o2level: 0.4,
  o2pw: 0.5,

  fType: 'lowpass',
  fCut: 4000,
  fQ: 1,

  e1a: 0.005,
  e1d: 0.12,
  e1s: 0.75,
  e1r: 0.2,

  e2a: 0.01,
  e2d: 0.25,
  e2s: 0.3,
  e2r: 0.3,

  l1wave: 'sine',
  l1rate: 5,
  l2wave: 'triangle',
  l2rate: 0.6,

  vMode: 'poly',
  vUnison: 1,
  vSpread: 12,
  vWidth: 0.5,

  gain: 0.8,
};

/** Every mod slot starts at 0. */
for (const dest of MOD_DESTS) {
  for (const src of MOD_SOURCES) DEFAULT_PATCH[modKey(dest, src)] = 0;
}

function modKey(dest, src) {
  return 'm_' + dest + '_' + src;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** Detune offset in cents for one voice of a unison stack. */
function unisonDetune(index, count, spread) {
  if (count < 2) return 0;
  const half = (count - 1) / 2;
  return ((index - half) / half) * (spread / 2);
}

/** Stereo position for one voice of a unison stack. */
function unisonPan(index, count, width) {
  if (count < 2) return 0;
  const half = (count - 1) / 2;
  return ((index - half) / half) * width;
}

// ---------------------------------------------------------------------------------------
// ENVELOPE
// ---------------------------------------------------------------------------------------
// Hand-built ADSR over one AudioParam. valueAt(t) reports the scheduled value at an
// absolute time, so a release or steal scheduled ahead of the clock re-aims from the
// live envelope rather than a stale .value read.

class Env {
  constructor(ctx, param, shape) {
    this.ctx = ctx;
    this.param = param;
    this.shape = { ...shape };
    this.state = 'idle';
    this._t0 = 0;
    this._peak = 0;
    this._releaseT0 = 0;
    this._releaseFrom = 0;
  }

  get sustainLevel() {
    return this._peak * clamp(this.shape.sustain, 0, 1);
  }

  /** The scheduled value at absolute time t. */
  valueAt(t) {
    if (this.state === 'releasing' && t >= this._releaseT0) {
      const start = this._releaseT0;
      const end = Math.max(start + this.shape.release, start + MIN_RAMP);
      if (t <= start) return this._releaseFrom;
      if (t >= end) return 0;
      return this._releaseFrom * (1 - (t - start) / (end - start));
    }
    if (this.state === 'idle') return 0;
    const attackEnd = this._t0 + this.shape.attack;
    const decayEnd = attackEnd + this.shape.decay;
    if (t <= this._t0) return 0;
    if (t < attackEnd) return this._peak * ((t - this._t0) / this.shape.attack);
    if (t < decayEnd) {
      return this._peak + (this.sustainLevel - this._peak) * ((t - attackEnd) / this.shape.decay);
    }
    return this.sustainLevel;
  }

  trigger(t0, peak) {
    this._t0 = t0;
    this._peak = peak;
    this.state = 'running';
    this._writeAttackDecay(t0, 0);
  }

  /** Legato retrigger: the envelope keeps running, only the peak is refreshed. */
  reaim(peak) {
    this._peak = peak;
    if (this.state !== 'running') return;
    const now = this.ctx.currentTime;
    this._writeAttackDecay(now, this.valueAt(now));
  }

  release(t0) {
    if (this.state === 'idle') return 0;
    const from = t0 > this.ctx.currentTime ? this.valueAt(t0) : this.param.value;
    this.state = 'releasing';
    this._releaseT0 = t0;
    this._writeRelease(t0, from);
    return Math.max(this.shape.release, MIN_RAMP);
  }

  /** Live shape edit. Rewrites whatever stage is currently scheduled. */
  setShape(shape) {
    this.shape = { ...shape };
    const now = this.ctx.currentTime;
    if (this.state === 'running') this._writeAttackDecay(now, this.valueAt(now));
    else if (this.state === 'releasing') {
      const from = Math.max(now, this._releaseT0);
      this._writeRelease(from, this.valueAt(from));
    }
  }

  cancel(t) {
    this.param.cancelScheduledValues(t);
    this.state = 'idle';
  }

  /** Cancels automation from t and pins the param to value there. A future t keeps the
   *  ramp in flight by ramping to value instead of stepping. */
  anchor(t, value) {
    this.param.cancelScheduledValues(t);
    if (t > this.ctx.currentTime) this.param.linearRampToValueAtTime(value, t);
    else this.param.setValueAtTime(value, t);
  }

  _writeAttackDecay(fromTime, fromValue) {
    const p = this.param;
    const attackEnd = this._t0 + this.shape.attack;
    const decayEnd = attackEnd + this.shape.decay;
    p.cancelScheduledValues(fromTime);
    p.setValueAtTime(fromValue, fromTime);
    if (attackEnd > fromTime) {
      p.linearRampToValueAtTime(this._peak, attackEnd);
      p.linearRampToValueAtTime(this.sustainLevel, Math.max(decayEnd, attackEnd + MIN_RAMP));
    } else if (decayEnd > fromTime) {
      p.linearRampToValueAtTime(this.sustainLevel, decayEnd);
    } else {
      p.linearRampToValueAtTime(this.sustainLevel, fromTime + MIN_RAMP);
    }
  }

  _writeRelease(fromTime, fromValue) {
    const p = this.param;
    const end = Math.max(this._releaseT0 + this.shape.release, fromTime + MIN_RAMP);
    this._releaseFrom = fromValue;
    this.anchor(fromTime, fromValue);
    p.linearRampToValueAtTime(0, end);
  }
}

// ---------------------------------------------------------------------------------------
// VOICE
// ---------------------------------------------------------------------------------------
// Two oscillators into one filter into one amp into one panner. Private to this file.

class Voice {
  constructor(ctx, out, cpuWeight) {
    this.ctx = ctx;
    this.out = out;
    this._cpuWeight = cpuWeight;
    this._state = 'free';
    this._freeTimer = null;
    this._nodes = [];
    this._slots = {};
    this.onFree = null;
    this.note = null;
    this.index = 0;
    this.count = 1;
  }

  get cpuWeight() {
    return this._cpuWeight;
  }

  get state() {
    return this._state;
  }

  /** Builds and starts the whole per-voice graph. */
  trigger(note, velocity, atTime, patch, index, count) {
    const ctx = this.ctx;
    const t0 = atTime ?? ctx.currentTime;
    this.note = note;
    this.index = index;
    this.count = count;
    this.patch = patch;

    const freq = midiToFreq(note);
    this.freq = freq;

    this.osc1 = this._buildOsc(1, patch, freq, t0);
    this.osc2 = this._buildOsc(2, patch, freq, t0);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = patch.fType;
    this.filter.frequency.setValueAtTime(patch.fCut, t0);
    this.filter.Q.setValueAtTime(patch.fQ, t0);

    this.amp = ctx.createGain();
    this.amp.gain.setValueAtTime(0, t0);

    this.panner = ctx.createStereoPanner();
    this.panner.pan.setValueAtTime(clamp(unisonPan(index, count, patch.vWidth), -1, 1), t0);

    this.osc1.out.connect(this.filter);
    this.osc2.out.connect(this.filter);
    this.filter.connect(this.amp);
    this.amp.connect(this.panner);
    this.panner.connect(this.out);

    this._nodes.push(this.filter, this.amp, this.panner);

    // Unison level compensation.
    this._unisonGain = 1 / Math.sqrt(count);

    const peak = clamp(velocity, 0, 1) * this._unisonGain;
    this.ampEnv = new Env(ctx, this.amp.gain, {
      attack: patch.e1a,
      decay: patch.e1d,
      sustain: patch.e1s,
      release: patch.e1r,
    });

    // ENV2 is a mod source: a constant source whose offset carries the envelope.
    this.env2Source = ctx.createConstantSource();
    this.env2Source.offset.setValueAtTime(0, t0);
    this.env2Source.start(t0);
    this._nodes.push(this.env2Source);
    this.env2 = new Env(ctx, this.env2Source.offset, {
      attack: patch.e2a,
      decay: patch.e2d,
      sustain: patch.e2s,
      release: patch.e2r,
    });

    this.lfo1 = this._buildLfo(patch.l1wave, patch.l1rate, t0);
    this.lfo2 = this._buildLfo(patch.l2wave, patch.l2rate, t0);

    this.velSource = ctx.createConstantSource();
    this.velSource.offset.setValueAtTime(clamp(velocity, 0, 1), t0);
    this.velSource.start(t0);
    this._nodes.push(this.velSource);

    this._wireMatrix(patch);

    this.ampEnv.trigger(t0, peak);
    this.env2.trigger(t0, 1);
    this._state = 'attacking';
  }

  /** One oscillator plus its pulse path, level and DC block. */
  _buildOsc(which, patch, freq, t0) {
    const ctx = this.ctx;
    const p = which === 1 ? 'o1' : 'o2';
    const wave = patch[p + 'wave'];

    const osc = ctx.createOscillator();
    osc.type = OSC_WAVE_TO_TYPE[wave] || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    osc.detune.setValueAtTime(this._baseDetune(which, patch), t0);

    const direct = ctx.createGain();
    direct.gain.setValueAtTime(1, t0);

    // Pulse path: the same sawtooth delayed by width times period, subtracted.
    const delay = ctx.createDelay(0.5);
    delay.delayTime.setValueAtTime(clamp(patch[p + 'pw'] / freq, 0, 0.5), t0);

    const invert = ctx.createGain();
    invert.gain.setValueAtTime(wave === 'pulse' ? -1 : 0, t0);

    const sum = ctx.createGain();
    sum.gain.setValueAtTime(1, t0);

    // DC block for the pulse path, transparent above 20 Hz.
    const dc = ctx.createBiquadFilter();
    dc.type = 'highpass';
    dc.frequency.setValueAtTime(10, t0);
    dc.Q.setValueAtTime(0.5, t0);

    const level = ctx.createGain();
    level.gain.setValueAtTime(patch[p + 'level'], t0);

    osc.connect(direct);
    direct.connect(sum);
    osc.connect(delay);
    delay.connect(invert);
    invert.connect(sum);
    sum.connect(dc);
    dc.connect(level);

    osc.start(t0);
    this._nodes.push(osc, direct, delay, invert, sum, dc, level);

    return { osc, direct, delay, invert, sum, dc, level, out: level };
  }

  _baseDetune(which, patch) {
    const p = which === 1 ? 'o1' : 'o2';
    const spread = unisonDetune(this.index, this.count, patch.vSpread);
    return patch[p + 'oct'] * 1200 + patch[p + 'semi'] * 100 + patch[p + 'fine'] + spread;
  }

  _buildLfo(wave, rate, t0) {
    const osc = this.ctx.createOscillator();
    osc.type = LFO_WAVE_TO_TYPE[wave] || 'sine';
    osc.frequency.setValueAtTime(rate, t0);
    osc.start(t0);
    this._nodes.push(osc);
    return osc;
  }

  /** The param each destination writes into. */
  _destParam(dest) {
    switch (dest) {
      case 'pitch1':
        return this.osc1.osc.detune;
      case 'pitch2':
        return this.osc2.osc.detune;
      case 'filter':
        return this.filter.detune;
      case 'amp':
        return this.amp.gain;
      case 'pw1':
        return this.osc1.delay.delayTime;
      case 'pw2':
        return this.osc2.delay.delayTime;
      default:
        return null;
    }
  }

  _sourceNode(src) {
    switch (src) {
      case 'env2':
        return this.env2Source;
      case 'lfo1':
        return this.lfo1;
      case 'lfo2':
        return this.lfo2;
      case 'vel':
        return this.velSource;
      default:
        return null;
    }
  }

  /** A pulse-width destination works in seconds, so its scale tracks the note's period. */
  _destScale(dest) {
    if (dest === 'pw1' || dest === 'pw2') return MOD_FULL_SCALE[dest] / this.freq;
    return MOD_FULL_SCALE[dest];
  }

  /** Twenty-four gain nodes, one per source and destination pair. */
  _wireMatrix(patch) {
    for (const dest of MOD_DESTS) {
      const param = this._destParam(dest);
      if (!param) continue;
      for (const src of MOD_SOURCES) {
        const node = this._sourceNode(src);
        if (!node) continue;
        const g = this.ctx.createGain();
        g.gain.value = patch[modKey(dest, src)] * this._destScale(dest);
        node.connect(g);
        g.connect(param);
        this._slots[dest + '/' + src] = g;
        this._nodes.push(g);
      }
    }
  }

  /** Live patch edit pushed into a sounding voice. */
  applyPatch(patch) {
    if (this._state === 'free') return;
    this.patch = patch;
    const t = this.ctx.currentTime;

    for (const which of [1, 2]) {
      const p = which === 1 ? 'o1' : 'o2';
      const o = which === 1 ? this.osc1 : this.osc2;
      const wave = patch[p + 'wave'];
      o.osc.type = OSC_WAVE_TO_TYPE[wave] || 'sine';
      o.invert.gain.setTargetAtTime(wave === 'pulse' ? -1 : 0, t, 0.005);
      o.delay.delayTime.setTargetAtTime(clamp(patch[p + 'pw'] / this.freq, 0, 0.5), t, 0.005);
      o.level.gain.setTargetAtTime(patch[p + 'level'], t, 0.005);
      o.osc.detune.setTargetAtTime(this._baseDetune(which, patch), t, 0.005);
    }

    this.filter.type = patch.fType;
    this.filter.frequency.setTargetAtTime(patch.fCut, t, 0.005);
    this.filter.Q.setTargetAtTime(patch.fQ, t, 0.005);

    this.panner.pan.setTargetAtTime(
      clamp(unisonPan(this.index, this.count, patch.vWidth), -1, 1),
      t,
      0.005
    );

    this.lfo1.type = LFO_WAVE_TO_TYPE[patch.l1wave] || 'sine';
    this.lfo1.frequency.setTargetAtTime(patch.l1rate, t, 0.005);
    this.lfo2.type = LFO_WAVE_TO_TYPE[patch.l2wave] || 'sine';
    this.lfo2.frequency.setTargetAtTime(patch.l2rate, t, 0.005);

    this.ampEnv.setShape({
      attack: patch.e1a,
      decay: patch.e1d,
      sustain: patch.e1s,
      release: patch.e1r,
    });
    this.env2.setShape({
      attack: patch.e2a,
      decay: patch.e2d,
      sustain: patch.e2s,
      release: patch.e2r,
    });

    for (const dest of MOD_DESTS) {
      for (const src of MOD_SOURCES) {
        const g = this._slots[dest + '/' + src];
        if (!g) continue;
        g.gain.setTargetAtTime(patch[modKey(dest, src)] * this._destScale(dest), t, 0.005);
      }
    }
  }

  /** Mono legato: same voice, new pitch, envelope left running. */
  retune(note, velocity, patch, atTime) {
    if (this._state === 'free' || this._state === 'stealing') return;
    const t = atTime ?? this.ctx.currentTime;
    this.note = note;
    this.freq = midiToFreq(note);
    this.osc1.osc.frequency.setValueAtTime(this.freq, t);
    this.osc2.osc.frequency.setValueAtTime(this.freq, t);
    this.osc1.delay.delayTime.setValueAtTime(clamp(patch.o1pw / this.freq, 0, 0.5), t);
    this.osc2.delay.delayTime.setValueAtTime(clamp(patch.o2pw / this.freq, 0, 0.5), t);
    this.velSource.offset.setValueAtTime(clamp(velocity, 0, 1), t);
    this.ampEnv.reaim(clamp(velocity, 0, 1) * this._unisonGain);
  }

  /** An earlier release replaces a later scheduled one; a later one is ignored. */
  release(atTime) {
    if (this._state === 'free' || this._state === 'stealing') return;
    const now = this.ctx.currentTime;
    const t0 = Math.max(atTime ?? now, now);
    if (this._state === 'releasing' && t0 >= this._releaseT0) return;
    this._state = 'releasing';
    this._releaseT0 = t0;
    const tail = this.ampEnv.release(t0);
    this.env2.release(t0);
    voicePool.fade(this, t0, t0 + tail);
    this._armFree(t0 + tail);
  }

  /** Forced release: linear fade to 0 over 5ms, then free. */
  steal(atTime) {
    if (this._state === 'free') return;
    const now = this.ctx.currentTime;
    const t0 = Math.max(atTime ?? now, now);
    const from = t0 > now ? this.ampEnv.valueAt(t0) : this.amp.gain.value;
    this._state = 'stealing';
    this.ampEnv.anchor(t0, from);
    this.ampEnv.state = 'idle';
    this.amp.gain.linearRampToValueAtTime(0, t0 + STEAL_FADE);
    voicePool.fade(this, t0, t0 + STEAL_FADE);
    this._armFree(t0 + STEAL_FADE);
  }

  _armFree(endTime) {
    if (this._freeTimer) clearTimeout(this._freeTimer);
    const ms = Math.max(0, (endTime - this.ctx.currentTime) * 1000) + 5;
    this._freeTimer = setTimeout(() => this.free(), ms);
  }

  /** Stops and disconnects every node this voice owns, then deregisters. */
  free() {
    if (this._state === 'free') return;
    this._state = 'free';
    if (this._freeTimer) {
      clearTimeout(this._freeTimer);
      this._freeTimer = null;
    }
    for (const n of this._nodes) {
      try {
        if (typeof n.stop === 'function') n.stop();
      } catch (e) {
        // already stopped
      }
      try {
        n.disconnect();
      } catch (e) {
        // already disconnected
      }
    }
    this._nodes = [];
    this._slots = {};
    voicePool.release(this);
    if (typeof this.onFree === 'function') this.onFree();
  }
}

// ---------------------------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------------------------
// Injected once per document, shared by every WaveSynth mount.
// Each var() fallback matches the value ui/tokens.css defines for that token.

let styleRefs = 0;

const STYLE_TEXT = [
  '.wv-root { box-sizing: var(--box-border-box); font-family: var(--font-ui); color: var(--text, #f2f6fc); background: var(--panel, #1b2332); border: var(--bw) solid var(--line, #3a485f); border-radius: var(--r-body); }',
  '.wv-root *, .wv-root *::before, .wv-root *::after { box-sizing: var(--box-border-box); }',
  '.wv-compact { padding: var(--sp-3) var(--sp-4); --fs-root: 11px; font-size: var(--fs-base); display: var(--disp-flex); flex-wrap: var(--flexwrap-wrap); align-items: var(--align-center); gap: var(--sp-4); width: var(--pct-100); }',
  '.wv-expanded { padding: var(--sp-8); --fs-root: 13px; font-size: var(--fs-base); display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-6); width: var(--pct-100); background: var(--bg, #0a0d13); overflow-x: var(--ov-hidden); }',
  '.wv-title { display: var(--disp-none); }',
  '.wv-expanded .wv-title { display: var(--disp-block); font-size: var(--fs-xl); font-weight: var(--w-bold); letter-spacing: var(--track-title); color: var(--text, #f2f6fc); }',
  '.wv-secs { display: var(--disp-flex); flex-wrap: var(--flexwrap-wrap); gap: var(--sp-4); width: var(--pct-100); }',
  '.wv-sec { flex: 1 1 var(--sp-60); min-width: var(--sp-60); background: var(--panel, #1b2332); border: var(--bw) solid var(--line, #3a485f); border-radius: var(--r-ctl); padding: var(--sp-3); display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-2); }',
  '.wv-sec--wide { flex: 2 1 var(--sp-230); min-width: var(--sp-95); }',
  '.wv-sec__title { font-size: var(--fs-micro); text-transform: var(--tt-label); letter-spacing: var(--track-label); color: var(--accent, #34e5b4); font-weight: var(--w-bold); }',
  '.wv-knobs { display: var(--disp-flex); flex-wrap: var(--flexwrap-wrap); gap: var(--sp-2); justify-content: var(--justify-flex-start); }',
  '.wv-fader { display: var(--disp-flex); flex-direction: var(--flexdir-column); align-items: var(--align-center); gap: var(--sp-1); }',
  '.wv-faders { display: var(--disp-flex); gap: var(--sp-3); justify-content: var(--justify-center); }',
  '.wv-fader__label { font-size: var(--fs-micro); color: var(--text-dim, #93a1b8); text-transform: var(--tt-label); letter-spacing: var(--track-label); }',
  '.wv-fader__value { font-size: var(--fs-micro); color: var(--text, #f2f6fc); font-variant-numeric: var(--num-tabular); white-space: var(--ws-nowrap); }',
  '.wv-fader input[type="range"] { writing-mode: vertical-lr; direction: rtl; width: var(--sp-4); height: var(--sp-28); accent-color: var(--knob-fill, #34e5b4); background: var(--color-transparent); margin: var(--sp-0); touch-action: var(--touch-none); }',
  '.wv-mod { display: var(--disp-grid); grid-template-columns: var(--sp-23) repeat(4, 1fr); gap: var(--sp-1) var(--sp-2); align-items: var(--align-center); justify-items: var(--justify-center); }',
  '.wv-mod__head { font-size: var(--fs-micro); color: var(--text-dim, #93a1b8); text-transform: var(--tt-label); text-align: var(--ta-center); }',
  '.wv-mod__row-label { font-size: var(--fs-micro); color: var(--text-dim, #93a1b8); white-space: var(--ws-nowrap); justify-self: var(--justify-flex-start); }',
  '.wv-mod .cbdaw-knob { --knob-size: var(--sp-14); }',
  '.wv-compact .wv-knobs { flex-wrap: var(--flexwrap-nowrap, nowrap); }',
].join('\n');

function acquireStyle() {
  styleRefs++;
  if (document.getElementById('wave-synth-styles')) return;
  const style = document.createElement('style');
  style.id = 'wave-synth-styles';
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
}

function releaseStyle() {
  styleRefs = Math.max(0, styleRefs - 1);
  if (styleRefs === 0) document.getElementById('wave-synth-styles')?.remove();
}

// ---------------------------------------------------------------------------------------
// CONTROL TABLE
// ---------------------------------------------------------------------------------------
// One descriptor per control. The panel and setParam both read this list.

const CONTROLS = {
  'osc1.wave': { key: 'o1wave', kind: 'enum', values: OSC_WAVES, labels: OSC_WAVE_LABELS, label: 'wave' },
  'osc1.oct': { key: 'o1oct', kind: 'int', min: -2, max: 2, step: 1, label: 'oct' },
  'osc1.semi': { key: 'o1semi', kind: 'int', min: -24, max: 24, step: 1, label: 'semi', unit: 'st' },
  'osc1.fine': { key: 'o1fine', kind: 'num', min: -50, max: 50, step: 1, label: 'fine', unit: 'c' },
  'osc1.level': { key: 'o1level', kind: 'num', min: 0, max: 1, step: 0.01, label: 'level' },
  'osc1.pw': { key: 'o1pw', kind: 'num', min: 0.05, max: 0.95, step: 0.01, label: 'pw' },

  'osc2.wave': { key: 'o2wave', kind: 'enum', values: OSC_WAVES, labels: OSC_WAVE_LABELS, label: 'wave' },
  'osc2.oct': { key: 'o2oct', kind: 'int', min: -2, max: 2, step: 1, label: 'oct' },
  'osc2.semi': { key: 'o2semi', kind: 'int', min: -24, max: 24, step: 1, label: 'semi', unit: 'st' },
  'osc2.fine': { key: 'o2fine', kind: 'num', min: -50, max: 50, step: 1, label: 'fine', unit: 'c' },
  'osc2.level': { key: 'o2level', kind: 'num', min: 0, max: 1, step: 0.01, label: 'level' },
  'osc2.pw': { key: 'o2pw', kind: 'num', min: 0.05, max: 0.95, step: 0.01, label: 'pw' },

  'filter.type': { key: 'fType', kind: 'enum', values: FILTER_TYPES, labels: FILTER_TYPE_LABELS, label: 'type' },
  'filter.cutoff': { key: 'fCut', kind: 'num', min: 20, max: 18000, step: 10, label: 'cutoff', unit: 'Hz' },
  'filter.q': { key: 'fQ', kind: 'num', min: 0.1, max: 20, step: 0.1, label: 'reso' },

  'env1.attack': { key: 'e1a', kind: 'time', min: 0.001, max: 2, step: 0.001, label: 'A', fader: true },
  'env1.decay': { key: 'e1d', kind: 'time', min: 0.001, max: 2, step: 0.001, label: 'D', fader: true },
  'env1.sustain': { key: 'e1s', kind: 'num', min: 0, max: 1, step: 0.01, label: 'S', fader: true },
  'env1.release': { key: 'e1r', kind: 'time', min: 0.001, max: 4, step: 0.001, label: 'R', fader: true },

  'env2.attack': { key: 'e2a', kind: 'time', min: 0.001, max: 2, step: 0.001, label: 'A', fader: true },
  'env2.decay': { key: 'e2d', kind: 'time', min: 0.001, max: 2, step: 0.001, label: 'D', fader: true },
  'env2.sustain': { key: 'e2s', kind: 'num', min: 0, max: 1, step: 0.01, label: 'S', fader: true },
  'env2.release': { key: 'e2r', kind: 'time', min: 0.001, max: 4, step: 0.001, label: 'R', fader: true },

  'lfo1.wave': { key: 'l1wave', kind: 'enum', values: LFO_WAVES, labels: OSC_WAVE_LABELS, label: 'wave' },
  'lfo1.rate': { key: 'l1rate', kind: 'num', min: 0.05, max: 30, step: 0.05, label: 'rate', unit: 'Hz' },
  'lfo2.wave': { key: 'l2wave', kind: 'enum', values: LFO_WAVES, labels: OSC_WAVE_LABELS, label: 'wave' },
  'lfo2.rate': { key: 'l2rate', kind: 'num', min: 0.05, max: 30, step: 0.05, label: 'rate', unit: 'Hz' },

  'voice.mode': { key: 'vMode', kind: 'enum', values: ['poly', 'mono'], labels: { poly: 'Poly', mono: 'Mono' }, label: 'mode' },
  'voice.unison': { key: 'vUnison', kind: 'enum', values: UNISON_COUNTS, labels: { 1: '1', 2: '2', 4: '4' }, label: 'unison' },
  'voice.spread': { key: 'vSpread', kind: 'num', min: 0, max: 50, step: 1, label: 'spread', unit: 'c' },
  'voice.width': { key: 'vWidth', kind: 'num', min: 0, max: 1, step: 0.01, label: 'width' },

  'out.gain': { key: 'gain', kind: 'num', min: 0, max: 1, step: 0.01, label: 'level' },
};

for (const dest of MOD_DESTS) {
  for (const src of MOD_SOURCES) {
    CONTROLS['mod.' + dest + '.' + src] = {
      key: modKey(dest, src),
      kind: 'num',
      min: -1,
      max: 1,
      step: 0.01,
      label: MOD_SOURCE_LABELS[src],
    };
  }
}

/** Section layout for the expanded panel, left to right. */
const SECTIONS = [
  { title: 'OSC 1', paths: ['osc1.wave', 'osc1.oct', 'osc1.semi', 'osc1.fine', 'osc1.level', 'osc1.pw'] },
  { title: 'OSC 2', paths: ['osc2.wave', 'osc2.oct', 'osc2.semi', 'osc2.fine', 'osc2.level', 'osc2.pw'] },
  { title: 'FILTER', paths: ['filter.type', 'filter.cutoff', 'filter.q'] },
  { title: 'ENV 1', paths: ['env1.attack', 'env1.decay', 'env1.sustain', 'env1.release'] },
  { title: 'ENV 2', paths: ['env2.attack', 'env2.decay', 'env2.sustain', 'env2.release'] },
  { title: 'LFO 1', paths: ['lfo1.wave', 'lfo1.rate'] },
  { title: 'LFO 2', paths: ['lfo2.wave', 'lfo2.rate'] },
  { title: 'MOD', kind: 'mod' },
  { title: 'VOICE', paths: ['voice.mode', 'voice.unison', 'voice.spread', 'voice.width'] },
  { title: 'MASTER', paths: ['out.gain'] },
];

const COMPACT_PATHS = [
  'osc1.wave',
  'filter.cutoff',
  'env1.attack',
  'env1.decay',
  'env1.sustain',
  'env1.release',
  'voice.unison',
];

function formatValue(path, value) {
  const c = CONTROLS[path];
  if (!c) return String(value);
  if (c.kind === 'enum') return String(c.labels?.[value] ?? value);
  if (c.kind === 'time') return value.toFixed(3) + 's';
  if (c.kind === 'int') return String(value) + (c.unit ? ' ' + c.unit : '');
  if (c.unit === 'Hz') return Math.round(value) + ' Hz';
  if (c.unit === 'c') return Math.round(value) + ' c';
  return value.toFixed(2);
}

// ---------------------------------------------------------------------------------------
// INSTRUMENT
// ---------------------------------------------------------------------------------------

export default class WaveSynth {
  static id = 'wave-synth';
  static label = 'Wave Synth';
  static playable = true;

  // No-op defaults, stated explicitly.
  static needsLoad = false;
  static pieces = null;
  static emitsNotes = false;

  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;

    this._patch = { ...DEFAULT_PATCH };

    /** note -> { voices, startedAt }. Private to this class. */
    this._notes = new Map();
    /** Every live voice this instrument owns. */
    this._voices = new Set();
    this._seq = 0;

    this._mixGain = ctx.createGain();
    this._mixGain.gain.value = this._patch.gain;

    this._analyser = ctx.createAnalyser();
    this._analyser.fftSize = 2048;
    this._analyser.maxDecibels = -15;

    this._mixGain.connect(this._analyser);
    this._analyser.connect(this.out);

    this._mounts = { compact: null, expanded: null };
    this._domListenersByMount = { compact: [], expanded: [] };
    /** path -> knob handle, per mount. */
    this._knobs = { compact: new Map(), expanded: new Map() };
  }

  // ---- async ready ----
  async ready() {
    // Sound is available from construction; nothing to await.
    return;
  }

  // ---- note input ----
  noteOn(note, velocity = 0.8, atTime) {
    const t0 = atTime ?? this.ctx.currentTime;

    if (this._patch.vMode === 'mono') {
      this._noteOnMono(note, velocity, t0);
      return;
    }

    const existing = this._notes.get(note);
    if (existing) this._releaseGroup(note, t0);

    // Cap on held notes: steal this instrument's oldest before adding another.
    if (this._notes.size >= MAX_NOTES) {
      let oldest = null;
      let oldestAt = Infinity;
      for (const [n, g] of this._notes) {
        if (g.startedAt < oldestAt) {
          oldest = n;
          oldestAt = g.startedAt;
        }
      }
      if (oldest !== null) this._stealGroup(oldest, t0);
    }

    const count = this._patch.vUnison;
    const voices = [];
    for (let i = 0; i < count; i++) voices.push(this._makeVoice(note, velocity, t0, i, count));
    this._notes.set(note, { voices, startedAt: this._seq++ });
  }

  /** Mono: one group, legato retrigger on an already-sounding voice. */
  _noteOnMono(note, velocity, t0) {
    const live = this._notes.size > 0 ? this._notes.entries().next().value : null;
    if (live) {
      const [prevNote, group] = live;
      this._notes.delete(prevNote);
      for (const v of group.voices) v.retune(note, velocity, this._patch, t0);
      this._notes.set(note, { voices: group.voices, startedAt: this._seq++ });
      return;
    }
    const count = this._patch.vUnison;
    const voices = [];
    for (let i = 0; i < count; i++) voices.push(this._makeVoice(note, velocity, t0, i, count));
    this._notes.set(note, { voices, startedAt: this._seq++ });
  }

  /** One registered voice: governor request, steal-retry, trigger, register. */
  _makeVoice(note, velocity, t0, index, count) {
    const cost = VOICE_COST;
    if (!governor.request(cost)) {
      const stolen = voicePool.steal();
      if (stolen) stolen.steal(t0);
      if (!governor.request(cost)) {
        // Allocate anyway rather than drop the note.
        console.warn('[wave-synth] governor refused after one steal-retry; allocating anyway.');
      }
    }

    const voice = new Voice(this.ctx, createVoiceOut(WaveSynth.id, this._mixGain, t0), cost);
    voice.onFree = () => {
      this._voices.delete(voice);
      const group = this._notes.get(voice.note);
      if (group) {
        const i = group.voices.indexOf(voice);
        if (i !== -1) group.voices.splice(i, 1);
        if (group.voices.length === 0) this._notes.delete(voice.note);
      }
    };

    voice.trigger(note, velocity, t0, this._patch, index, count);
    voicePool.register(voice, WaveSynth.id, t0);
    this._voices.add(voice);
    return voice;
  }

  _releaseGroup(note, t0) {
    const group = this._notes.get(note);
    if (!group) return;
    this._notes.delete(note);
    for (const v of group.voices) v.release(t0);
  }

  _stealGroup(note, t0) {
    const group = this._notes.get(note);
    if (!group) return;
    this._notes.delete(note);
    for (const v of group.voices) v.steal(t0);
  }

  noteOff(note, atTime) {
    const t0 = atTime ?? this.ctx.currentTime;
    this._releaseGroup(note, t0);
  }

  allNotesOff() {
    const t0 = this.ctx.currentTime;
    this._notes.clear();
    // Every live voice, so a release already scheduled later is pulled in to now.
    for (const v of Array.from(this._voices)) v.release(t0);
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
    const c = CONTROLS[path];
    if (!c) return; // unknown path, ignored

    if (c.kind === 'enum') {
      const match = c.values.find((v) => String(v) === String(value));
      if (match === undefined) return;
      this._patch[c.key] = match;
    } else {
      const n = Number(value);
      if (!Number.isFinite(n)) return;
      this._patch[c.key] = c.kind === 'int' ? Math.round(clamp(n, c.min, c.max)) : clamp(n, c.min, c.max);
    }

    if (path === 'out.gain') {
      this._mixGain.gain.setValueAtTime(this._patch.gain, this.ctx.currentTime);
    } else {
      this._propagate();
    }
    this._syncUI();
  }

  getParam(path) {
    const c = CONTROLS[path];
    return c ? this._patch[c.key] : undefined;
  }

  /** Pushes the current patch into every sounding voice. */
  _propagate() {
    for (const v of this._voices) v.applyPatch(this._patch);
  }

  // ---- state — JSON round-trip ----
  getState() {
    // Plain JSON-safe values only.
    return { ...this._patch };
  }

  setState(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const path of Object.keys(CONTROLS)) {
      const c = CONTROLS[path];
      if (obj[c.key] !== undefined) this.setParam(path, obj[c.key]);
    }
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
      this._destroyKnobs(which);
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
    this._notes.clear();

    try {
      this._mixGain.disconnect();
      nodesDisconnected++;
    } catch (e) {
      // already disconnected
    }
    try {
      this._analyser.disconnect();
      nodesDisconnected++;
    } catch (e) {
      // already disconnected
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

  /** One rotary knob bound to its patch path. */
  _buildKnob(which, path, size) {
    const c = CONTROLS[path];
    const common = {
      label: c.label,
      value: this._patch[c.key],
      reset: DEFAULT_PATCH[c.key],
      onInput: (v) => this.setParam(path, v),
    };
    const knob =
      c.kind === 'enum'
        ? createKnob({ ...common, values: c.values.slice(), format: (v) => String(c.labels?.[v] ?? v) })
        : createKnob({ ...common, min: c.min, max: c.max, step: c.step, format: (v) => formatValue(path, v) });
    if (size) knob.el.style.setProperty('--knob-size', size);
    knob.el.dataset.path = path;
    this._knobs[which].set(path, knob);
    return knob.el;
  }

  /** One vertical envelope fader bound to its patch path. */
  _buildFader(which, path) {
    const c = CONTROLS[path];
    const wrap = document.createElement('div');
    wrap.className = 'wv-fader';

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(c.min);
    input.max = String(c.max);
    input.step = String(c.step);
    input.value = String(this._patch[c.key]);
    input.dataset.path = path;
    input.setAttribute('aria-label', c.label);
    this._listen(which, input, 'input', (e) => this.setParam(path, e.target.value));

    const label = document.createElement('span');
    label.className = 'wv-fader__label';
    label.textContent = c.label;

    const value = document.createElement('span');
    value.className = 'wv-fader__value';
    value.dataset.readout = path;

    wrap.appendChild(input);
    wrap.appendChild(label);
    wrap.appendChild(value);
    return wrap;
  }

  /** The mod matrix grid: six destination rows by four source columns of knobs. */
  _buildModGrid(which) {
    const grid = document.createElement('div');
    grid.className = 'wv-mod';

    const corner = document.createElement('span');
    corner.className = 'wv-mod__head';
    grid.appendChild(corner);
    for (const src of MOD_SOURCES) {
      const h = document.createElement('span');
      h.className = 'wv-mod__head';
      h.textContent = MOD_SOURCE_LABELS[src];
      grid.appendChild(h);
    }

    for (const dest of MOD_DESTS) {
      const rl = document.createElement('span');
      rl.className = 'wv-mod__row-label';
      rl.textContent = MOD_DEST_LABELS[dest];
      grid.appendChild(rl);
      for (const src of MOD_SOURCES) {
        const path = 'mod.' + dest + '.' + src;
        const el = this._buildKnob(which, path);
        el.title = MOD_DEST_LABELS[dest] + ' from ' + MOD_SOURCE_LABELS[src];
        el.querySelector('.cbdaw-knob__label')?.remove();
        grid.appendChild(el);
      }
    }

    return grid;
  }

  _destroyKnobs(which) {
    for (const knob of this._knobs[which].values()) knob.destroy();
    this._knobs[which].clear();
  }

  /** Full DOM build. Runs once per mount call. */
  _paint(which) {
    const el = this._mounts[which];
    if (!el) return;
    this._clearMountListeners(which);
    this._destroyKnobs(which);
    el.innerHTML = '';

    const expanded = which === 'expanded';
    const root = document.createElement('div');
    root.className = 'wv-root ' + (expanded ? 'wv-expanded' : 'wv-compact');

    if (expanded) {
      const title = document.createElement('div');
      title.className = 'wv-title';
      title.textContent = 'Wave Synth';
      root.appendChild(title);

      const secs = document.createElement('div');
      secs.className = 'wv-secs';
      for (const section of SECTIONS) {
        const box = document.createElement('div');
        box.className = 'wv-sec' + (section.kind === 'mod' ? ' wv-sec--wide' : '');
        const st = document.createElement('div');
        st.className = 'wv-sec__title';
        st.textContent = section.title;
        box.appendChild(st);
        if (section.kind === 'mod') {
          box.appendChild(this._buildModGrid(which));
        } else {
          box.appendChild(this._buildGroup(which, section.paths));
        }
        secs.appendChild(box);
      }
      root.appendChild(secs);
    } else {
      root.appendChild(this._buildGroup(which, COMPACT_PATHS));
    }

    el.appendChild(root);
    this._syncUI();
  }

  /** Knobs and envelope faders for one section, faders grouped together. */
  _buildGroup(which, paths) {
    const wrap = document.createElement('div');
    wrap.className = 'wv-knobs';
    const faders = paths.filter((p) => CONTROLS[p].fader);
    const knobs = paths.filter((p) => !CONTROLS[p].fader);
    for (const path of knobs) wrap.appendChild(this._buildKnob(which, path));
    if (faders.length) {
      const row = document.createElement('div');
      row.className = 'wv-faders';
      for (const path of faders) row.appendChild(this._buildFader(which, path));
      wrap.appendChild(row);
    }
    return wrap;
  }

  /** Targeted updates: knob values, fader values, readouts. No DOM rebuild.
   *  Skips a control that is being dragged or focused. */
  _syncUI() {
    for (const which of ['compact', 'expanded']) {
      const el = this._mounts[which];
      if (!el) continue;
      const root = el.querySelector('.wv-root');
      if (!root) continue;

      for (const [path, knob] of this._knobs[which]) {
        const c = CONTROLS[path];
        if (c) knob.set(this._patch[c.key]);
      }

      root.querySelectorAll('input[type="range"][data-path]').forEach((input) => {
        const c = CONTROLS[input.dataset.path];
        if (!c) return;
        if (document.activeElement !== input) input.value = String(this._patch[c.key]);
      });

      root.querySelectorAll('[data-readout]').forEach((out) => {
        const path = out.dataset.readout;
        const c = CONTROLS[path];
        if (!c) return;
        out.textContent = formatValue(path, this._patch[c.key]);
      });
    }
  }
}

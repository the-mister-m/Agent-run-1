/**
 * instruments/wave-synth.js — the simple synth. Pick a standard waveform, hear it, see
 * its spectrum. Teaches that a wave's *shape* determines how many frequencies are in it.
 * Built by `wave-voice`, P1/S3.
 *
 * Owns: CONTRACTS §2's module contract (every method, including the four §2 amendment
 * additions) · §11.1/§11.1a's Voice class and its exact node shape (osc + gain, cpuWeight
 * 10) · §11.2's allocate/steal sequence, driven through `core/audio.js`'s `voicePool` and
 * `governor` (frozen, imported, never redefined here) · §11.3's four env.* paths · §11.4's
 * exact four-control surface (`osc.wave`, `osc.octave`, `out.gain`, plus env.*) · §11.6's
 * analysis tap, wired to `getAnalyser('spectrum')` only — `getAnalyser('scope')` is null,
 * completing PHASE.md's teaching inversion (Wave Synth shows spectrum, not scope).
 *
 * Does NOT own: `core/audio.js` (frozen, S2) · the oscilloscope or spectrum *drawing*
 * (`vis/spectrum.js`, `vis/scope.js` — `scopes`' lane) · `/src/ui/tokens.css` (`scopes`
 * creates it; this file only *reads* its custom properties, with fallbacks, since it may
 * not be loaded when this module runs) · any HTML page.
 *
 * Two named, no-fallback OscillatorType details worth flagging up front (logged again in
 * the receipt): (1) the contract's `osc.wave` enum value `'saw'` is not a valid native
 * `OscillatorNode.type` string — Web Audio's real type is `'sawtooth'`; this file maps
 * `'saw' -> 'sawtooth'` internally and nowhere else. (2) the curriculum's on-screen label
 * for `'square'` is "Square (Pulse)" (seat question 1) — there is no separate `'pulse'`
 * waveform; `'pulse'` is display text only, paired with `'square'`, exactly as §11.4's
 * four-value enum and this seat's brief both require.
 */

import { voicePool, governor } from '../core/audio.js';

// ---------------------------------------------------------------------------------------
// CONSTANTS  (seat question 1 — waveforms and their on-screen names)
// ---------------------------------------------------------------------------------------

/** Exactly the four values CONTRACTS §11.4 names. Order is display order. */
const WAVE_TYPES = ['sine', 'triangle', 'square', 'saw'];

/** On-screen labels — the curriculum's own words, "pulse" alongside "square" verbatim
 *  (seat question 1 / A-wave-voice.md). Used in both mountCompact and mountExpanded. */
const WAVE_LABELS = {
  sine: 'Sine',
  triangle: 'Triangle',
  square: 'Square (Pulse)',
  saw: 'Saw',
};

/** Contract value -> native OscillatorType. Only `saw` differs. */
const WAVE_TO_OSC_TYPE = {
  sine: 'sine',
  triangle: 'triangle',
  square: 'square',
  saw: 'sawtooth',
};

/** Small representative waveform glyphs, viewBox 0 0 40 20. Decorative UI icons only —
 *  drawn once from the selected wave *type*, never from analyser data. This is not the
 *  spectrum/scope visual (that stays `scopes`' lane, seat question 6). */
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
// VOICE  (seat question 3 — CONTRACTS §11.1 / §11.1a / §11.2, exact)
// ---------------------------------------------------------------------------------------
// Never exported. "An instrument owns a pool of voices; it never exposes them outside
// itself" (§11.1). `voicePool` (imported, frozen, owned by core/audio.js) is the only
// external system a Voice talks to, and only from trigger()/free() — never from
// WaveSynth reaching into a voice's internals.

class Voice {
  /** @param out — the point in the instrument's own chain this voice connects to,
   *  upstream of getAnalyser() (§11.1). Always this instrument's `_mixGain` here. */
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
    /** Set by the owning instrument right after construction. Not part of §11.1's
     *  documented 3-arg signature — an assignable hook, not a constructor param, so a
     *  Voice built here and later stolen by a *different* instrument (§11.2: "a Wave
     *  Synth note can steal an Overtone Synth voice and the reverse") can still tell its
     *  true owner to drop it from that owner's own live-voice bookkeeping when it frees,
     *  regardless of which instrument called .steal() on it. voicePool.release() (the
     *  contract-defined deregistration) always fires from free() regardless of this. */
    this.onFree = null;
  }

  get cpuWeight() {
    return this._cpuWeight;
  }

  get state() {
    return this._state;
  }

  /** trigger(note, velocity, atTime) per §11.1. A 4th `opts` argument carries the
   *  wave/octave/envelope this voice type needs — §11.1's Voice is instrument-agnostic and
   *  cannot itself define what "wave shape" means; that is this file's own addition,
   *  exactly as the constructor's `onFree` hook is.
   *
   *  WAVE AND OCTAVE are still snapshotted at trigger: a held note keeps the shape it was
   *  struck with. THE ENVELOPE IS NOT — see updateEnv() and CONTRACTS §11.7c. */
  trigger(note, velocity, atTime, opts) {
    const { wave, octaveShift, attack, decay, sustain, release } = opts;
    const t0 = atTime ?? this.ctx.currentTime;
    const freq = midiToFreq(note + 12 * octaveShift);

    this.osc = this.ctx.createOscillator();
    this.osc.type = WAVE_TO_OSC_TYPE[wave] || 'sine';
    this.osc.frequency.setValueAtTime(freq, t0);

    this.gain = this.ctx.createGain();
    this.gain.gain.setValueAtTime(0, t0);

    // The two facts every later reschedule is anchored to: when this note actually began,
    // and how loud its peak is. Envelope *shape* is mutable (§11.7c); these are not.
    this._t0 = t0;
    this._peak = clamp(velocity, 0, 1);
    this._envelope = { attack, decay, sustain, release };

    this.osc.connect(this.gain);
    this.gain.connect(this.out);
    this.osc.start(t0);

    // four-stage envelope on the single GainNode's .gain AudioParam (§11.1a: "The
    // envelope is four-stage automation on that single GainNode's .gain AudioParam").
    this._scheduleAttackDecay(t0, 0);
  }

  /** The sustain plateau in absolute gain, from the current envelope and this voice's peak. */
  _sustainLevel() {
    return this._peak * clamp(this._envelope.sustain, 0, 1);
  }

  /** Writes (or REwrites) the attack + decay ramps onto this voice's gain, anchored to the
   *  note's real start time `_t0`, and re-arms the attacking→sustaining state timer.
   *  Called once from trigger() and again from updateEnv() every time the student moves an
   *  envelope control while this voice is sounding.
   *
   *  `fromTime`/`fromValue` are where the new automation picks up: at trigger that is
   *  (t0, 0); on a live edit it is (now, the value the ramp has actually reached), so the
   *  gain never jumps — it re-aims from wherever it currently is. If a stage's deadline is
   *  already in the past for the new shape, the voice moves to where the new envelope says
   *  it should already be, over a 1 ms ramp rather than a discontinuity. */
  _scheduleAttackDecay(fromTime, fromValue) {
    const g = this.gain.gain;
    const attackEnd = this._t0 + this._envelope.attack;
    const decayEnd = attackEnd + this._envelope.decay;
    const MIN = 0.001; // never schedule a zero-length ramp — that is a click

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

    // §11.1's state enum has no separate "decaying" state — decay is folded into
    // 'attacking' until the envelope reaches sustain, matching the five-state list
    // exactly ('attacking' | 'sustaining' | 'releasing' | 'stealing' | 'free').
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

  /** [FIXED 2026-08-23, Troubleshooter-directed, `redpen-p1` D-4 / CONTRACTS §11.7c]
   *  LIVE ENVELOPE. This Voice used to snapshot the envelope at trigger and read nothing
   *  afterwards, so an `env.*` edit could not be heard until the NEXT note; the Overtone
   *  Synth propagated the same edit to sounding voices, and two §2 instruments taught the
   *  envelope differently. §11.7c rules for live: "a held note is the one moment a turned
   *  knob's effect is directly audible against a reference, which is worth more here than
   *  in most synths, since these two tools exist to teach what a parameter does."
   *
   *  This goes one step past `overtone-synth.js`'s `updateEnv` (which stores the new shape
   *  for the next stage boundary): it also REWRITES the automation already scheduled on
   *  this voice's gain, so raising attack mid-attack, or dropping sustain mid-sustain, is
   *  audible immediately on the note being held rather than at the next stage. Called only
   *  by the owning instrument's `_propagateEnv()`; never exposed outside this file.
   *
   *  Wave and octave are deliberately NOT live — §11.7c rules on `env.*` only, and a held
   *  note keeping the shape it was struck with is the behaviour both synths already had. */
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
      // a release already in flight re-aims at the new release time, measured from when
      // the key actually came up — the same "anchored to the real event" rule as above.
      this._scheduleRelease(now, this.gain.gain.value);
    }
  }

  /** release(atTime) per §11.1: starts the release stage; voice stays alive until the
   *  release ramp completes, then calls free() itself. */
  release(atTime) {
    if (this._state === 'free' || this._state === 'stealing') return;
    const t0 = atTime ?? this.ctx.currentTime;
    const currentVal = this.gain.gain.value;

    this._clearTimers();
    this._state = 'releasing';
    this._releaseT0 = t0;
    this._scheduleRelease(t0, currentVal);
  }

  /** Writes (or REwrites) the release ramp, anchored to `_releaseT0` — when the key
   *  actually came up — and re-arms the self-free timer. Split out of release() so
   *  updateEnv() can re-aim a release that is already running (§11.7c). */
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
    const freeMs = Math.max(0, (end - this.ctx.currentTime) * 1000) + 5; // +5ms so it lands
    this._freeTimer = setTimeout(() => this.free(), freeMs);
  }

  /** steal(atTime) per §10-A / §11.1: forced release, linear fade to 0 over 5ms, then
   *  free() — never an abrupt stop. */
  steal(atTime) {
    if (this._state === 'free') return;
    const t0 = atTime ?? this.ctx.currentTime;
    const currentVal = this.gain.gain.value;

    this._clearTimers();
    this._state = 'stealing';
    this.gain.gain.cancelScheduledValues(t0);
    this.gain.gain.setValueAtTime(currentVal, t0);
    this.gain.gain.linearRampToValueAtTime(0, t0 + 0.005);

    const nowWall = this.ctx.currentTime;
    const freeMs = Math.max(0, (t0 + 0.005 - nowWall) * 1000) + 5;
    this._freeTimer = setTimeout(() => this.free(), freeMs);
  }

  /** free() per §11.1: disconnects every node this voice owns, deregisters from
   *  voicePool (§11.2), drops the voice from the instrument's pool (via onFree). */
  free() {
    if (this._state === 'free') return;
    this._clearTimers();
    this._state = 'free';
    try {
      this.osc.stop();
    } catch (e) {
      // already stopped — harmless
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

  /** Clears only the attack/decay stage timers, leaving any pending self-free timer alone.
   *  Needed because an envelope edit re-arms the stage timer without touching the release. */
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
// STYLES  (seat question 5 — read /src/ui/tokens.css custom properties, §9)
// ---------------------------------------------------------------------------------------
// Injected once per document, shared by every WaveSynth instance/mount — a <style> tag is
// not an AudioNode or a listener, so it is not part of the "zero leaked nodes/listeners"
// dispose() count (seat question 7); logged as a design decision in the receipt.
//
// [FIXED 2026-08-23, Troubleshooter-directed, `redpen-p1` D-7] Every `var(--token, X)`
// fallback below is now byte-identical to the value `ui/tokens.css` defines for that
// token. They previously carried this seat's own provisional colours, which made them a
// second, divergent palette in a second location — exactly what §9 ("one palette… no
// drift") forbids, and it meant a one-line edit to `tokens.css` silently did not reach
// this file. The fallbacks exist ONLY so the module renders in a page that has not linked
// `tokens.css`; they are not a palette and MUST be kept identical to `tokens.css` if a
// value there changes. Same pattern `vis/spectrum.js`, `vis/scope.js` and `ui/shell.js`
// already use.

let stylesInjected = false;

function ensureStylesInjected() {
  if (stylesInjected || document.getElementById('wave-synth-styles')) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'wave-synth-styles';
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
  stylesInjected = true;
}

// ---------------------------------------------------------------------------------------
// INSTRUMENT  (CONTRACTS §2, method for method)
// ---------------------------------------------------------------------------------------

export default class WaveSynth {
  static id = 'wave-synth';
  static label = 'Wave Synth';
  static playable = true;

  // §2 amendment additions — no-op defaults this instrument states explicitly rather
  // than inheriting silently, since there is no shared base class in this codebase today.
  static needsLoad = false;
  static pieces = null;
  static emitsNotes = false;

  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;

    this._params = { ...DEFAULT_PARAMS };

    /** Live voices this instrument owns. Never exposed outside this class (§11.1). */
    this._voices = new Set();
    /** note -> Set<Voice>, so noteOff(note) releases every voice currently sounding that
     *  note (handles the same key retriggered before release). */
    this._noteToVoices = new Map();

    // §11.6: "One AnalyserNode per instrument, created once at construction, not
    // per-voice. It sits after every live voice's output is summed and before `out`."
    // `_mixGain` is both the voice-summing bus AND the out.gain control point (§11.4) —
    // one node serving two roles the contract never separates. The analyser therefore
    // sees the instrument's real final mix, gain included, exactly what a student hears.
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

  // ---- async ready (§2 amendment 1) ----
  async ready() {
    // Wave Synth makes sound synchronously from construction — nothing to await.
    return;
  }

  // ---- note input ----
  noteOn(note, velocity = 0.8, atTime) {
    const t0 = atTime ?? this.ctx.currentTime;
    const cost = VOICE_COST;

    // §11.2 allocate sequence: (1) look up fixed cpuWeight — done above. (2) ask the
    // governor. (3) granted -> construct/trigger/register. (4) refused -> steal the
    // DAW's longest-released (or longest-held) voice, retry once.
    //
    // §11.2a [2026-08-23]: voicePool.steal() now deregisters its chosen voice
    // synchronously, in that same call, so the retry below is checking a count that has
    // actually changed in this same tick — it is a meaningful check, not a formality, and
    // it reliably succeeds. §10-A still holds absolutely: a note is never refused, so the
    // defensive branch allocates anyway if the retry somehow still refuses.
    if (!governor.request(cost)) {
      const stolen = voicePool.steal();
      if (stolen) stolen.steal(t0); // real 5ms audio fade; the count already dropped
      if (!governor.request(cost)) {
        // should not occur: steal() drops voicePool.count by exactly one, synchronously,
        // in a single-threaded registry. Never drop a note — allocate anyway and say so.
        console.warn(
          '[wave-synth] governor still refused after one steal-retry; allocating anyway ' +
            'per §10-A ("a note is never refused").'
        );
      }
    }

    const voice = new Voice(this.ctx, this._mixGain, cost);
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

    voicePool.register(voice, WaveSynth.id, t0);
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

  // ---- note emission (§2 amendment 4) — no-op, emitsNotes is false ----
  onNoteOut(_fn) {
    // Wave Synth only consumes notes; it never drives another instrument.
  }
  offNoteOut(_fn) {
    // matches onNoteOut — no-op.
  }

  // ---- params — CONTRACTS §11.4's exact four controls plus §11.3's inherited env.* ----
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
        return; // unknown path — silently ignored, §2 gives no error contract
    }
    this._syncUI();
  }

  /** [FIXED 2026-08-23, Troubleshooter-directed, `redpen-p1` D-4 / CONTRACTS §11.7c]
   *  Pushes the current `env.*` values into EVERY currently-sounding voice, so an envelope
   *  edit is heard on the note being held, not only on the next one. §11.7c makes this
   *  binding on every instrument; `overtone-synth.js` already did it via its own
   *  `_propagateEnv()`/`Voice.updateEnv()` pair, and this is the matching half.
   *  `osc.wave` / `osc.octave` are NOT propagated — §11.7c rules on `env.*` only. */
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

  // ---- state — lossless JSON round-trip (seat question 2) ----
  getState() {
    // plain, JSON-safe, no functions/nodes/undefined — §2, §7's own round-trip rule.
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

  // ---- governor reporting — honest, live (seat question 4) ----
  get voiceCount() {
    return this._voices.size;
  }

  get cpuWeight() {
    // Live voices' fixed cost + this instrument's always-on AnalyserNode (§11.6: "the
    // instrument's cpuWeight getter must include this AnalyserNode in its total, not
    // just its live voices").
    let total = ANALYSER_COST;
    for (const v of this._voices) total += v.cpuWeight;
    return total;
  }

  // ---- analysis tap (seat question 6) — §2 amendment 2 / §11.6 ----
  getAnalyser(which) {
    if (which === 'spectrum') return this._analyser;
    return null; // 'scope' — Wave Synth's visual is the spectrum analyzer only (§11.4)
  }

  // ---- mounting (seat question 5) ----
  mountCompact(el) {
    ensureStylesInjected();
    this._mounts.compact = el;
    this._paint('compact');
  }

  mountExpanded(el) {
    ensureStylesInjected();
    this._mounts.expanded = el;
    this._paint('expanded');
  }

  unmount() {
    let listenersDropped = 0;
    for (const which of ['compact', 'expanded']) {
      listenersDropped += this._domListenersByMount[which].length;
      this._clearMountListeners(which);
      const el = this._mounts[which];
      if (el) el.innerHTML = '';
      this._mounts[which] = null;
    }
    return listenersDropped;
  }

  // ---- teardown (seat question 7) ----
  dispose() {
    let nodesDisconnected = 0;
    const listenersDropped = this.unmount();

    // Teardown, not a musical note-off: free every live voice immediately rather than
    // running its release ramp, so no orphaned setTimeout can fire against nodes this
    // instrument is about to disconnect. free() is idempotent and self-guards re-entry.
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
  // internal — DOM painting / syncing. Not part of CONTRACTS §2; private to this file.
  // ---------------------------------------------------------------------------------

  _listen(which, el, type, fn) {
    el.addEventListener(type, fn);
    this._domListenersByMount[which].push({ el, type, fn });
  }

  _clearMountListeners(which) {
    for (const l of this._domListenersByMount[which]) l.el.removeEventListener(l.type, l.fn);
    this._domListenersByMount[which] = [];
  }

  /** Full DOM build. Runs once per mount() call — never from setParam (see _syncUI),
   *  so a slider mid-drag is never destroyed out from under the student's pointer. */
  _paint(which) {
    const el = this._mounts[which];
    if (!el) return;
    this._clearMountListeners(which);
    el.innerHTML = '';

    const expanded = which === 'expanded';
    const root = document.createElement('div');
    // Compact is the DAW view: tight, still, no animation (brief, seat q5) — the
    // ws-playing modifier that drives the glow keyframe is only ever toggled on the
    // expanded root; see _reflectActivity(). Expanded: room to breathe, animated,
    // projector-legible.
    root.className = `ws-root ws-glow ${expanded ? 'ws-expanded' : 'ws-compact'}`;

    root.innerHTML = `
      <div class="ws-title">Wave Synth</div>
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

  /** Targeted updates only — active-button state, octave readout, slider values/readouts.
   *  Never rebuilds DOM, so it is safe to call on every setParam(). Skips writing into a
   *  range input the student is actively dragging (document.activeElement guard). */
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

  /** Toggles the expanded view's decorative glow while any voice is live. Compact never
   *  animates (seat q5: "tight, still, no animation") — gated by `which === 'expanded'`
   *  even though this loop touches both mount points for symmetry. */
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

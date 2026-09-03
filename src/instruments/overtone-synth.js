/**
 * instruments/overtone-synth.js — the Overtone Synth. Channel 2 of the DAW, and its own
 * standalone page. The inverse of the Wave Synth: the student builds a sound by hand out
 * of 8 harmonic partials and watches the resulting waveform shape thicken on the
 * oscilloscope, instead of picking a waveform and watching its spectrum. Built by
 * `overtone-voice`, P1/S3.
 *
 * Implements CONTRACTS §2 (module contract, including its [AMENDED 2026-08-22] additions:
 * ready(), getAnalyser(), pieces, onNoteOut/offNoteOut) and §11 (Voice — §11.1/11.1a,
 * allocation/stealing — §11.2, the envelope contract — §11.3, the exact `setParam` path
 * list — §11.5, the analysis tap — §11.6).
 *
 * Owns: this file only. Does NOT own `/src/core/audio.js` (frozen, S2 — imports
 * `voicePool`/`governor` from it, never constructs an AudioContext, never touches
 * `ctx.destination`) or `/src/ui/tokens.css` (owned by `scopes`, S3 — read only, via CSS
 * custom properties with fallbacks, never assumed present). Does NOT draw the
 * oscilloscope — `getAnalyser('scope')` exposes the tap and nothing more; `vis/scope.js`
 * (scopes, P1/S3) owns the drawing. Never inserted into or reconnected by a reader.
 */

import { voicePool, governor, createVoiceOut } from '../core/audio.js';

// ---------------------------------------------------------------------------------------
// Constants — §10-G envelope defaults, §11.3 envelope ranges, §11.5 partial table,
// §10-A's 5ms steal fade.
// ---------------------------------------------------------------------------------------

const PARTIAL_COUNT = 8; // §11.5 — indices 0-7, matching harmonic series ×1 through ×8

const ENV_DEFAULTS = Object.freeze({ attack: 0.005, decay: 0.08, sustain: 0.7, release: 0.15 });
const ENV_RANGES = Object.freeze({
  attack: [0.001, 2.0],
  decay: [0.001, 2.0],
  sustain: [0.0, 1.0],
  release: [0.001, 4.0],
});

const MULTIPLIER_MIN = 1;
const MULTIPLIER_MAX = 32; // §11.5 table: "integer | 1 – 32"
const STEAL_FADE_S = 0.005; // §10-A: forced release fades to 0 over 5ms, never an abrupt stop

const PARTIAL_PATH_RE = /^partial\.([0-7])\.(level|multiplier)$/;
const ENV_PATH_RE = /^env\.(attack|decay|sustain|release)$/;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function defaultPartials() {
  const partials = [];
  for (let i = 0; i < PARTIAL_COUNT; i++) {
    partials.push({
      // partial 0: the fundamental. Level only — no multiplier path exists for it (§11.5:
      // "Its multiplier is fixed at ×1 by definition; exposing it as settable would let a
      // student break 'fundamental = lowest'"). Defaults loudest (1.0) — every other
      // partial defaults silent (0.0) — so the fundamental IS the fundamental until the
      // student stacks something on top of it.
      level: i === 0 ? 1.0 : 0.0,
      // partials 1-7 default to index+1 (2…8), per §11.5's table. Stored on partial 0 too
      // (fixed 1) purely as an internal convenience for frequency math — never exposed
      // through setParam/getParam/getState (see the PARTIAL_PATH_RE guard below).
      multiplier: i === 0 ? 1 : i + 1,
    });
  }
  return partials;
}

// ---------------------------------------------------------------------------------------
// Voice — §11.1/§11.1a. One sounding note. 8 partials, each its own OscillatorNode plus
// its own level GainNode, all summed into one shared GainNode that carries the four-stage
// envelope. 17 nodes total (8 osc + 8 partial-gain + 1 envelope-gain).
//
// Not exported — §11.1: "An instrument owns a pool of voices; it never exposes them
// outside itself." `onFree(fn)` is an internal-only addition beyond §11.1's public shape:
// nothing in §11 gives voicePool a push notification when a voice's own free() actually
// runs, and the steal-then-retry sequence (§11.2 step 4) needs to know exactly when the
// stolen voice has vacated its registry slot before retrying the allocation. Logged as an
// implementation detail, not a contract change — matches the same kind of underspecified-
// boundary call audio-core's own receipt already logged for `voicePool`'s "longest-
// released" timestamping.
// ---------------------------------------------------------------------------------------
class Voice {
  constructor(ctx, out, cpuWeight, partialsSnapshot, envSnapshot) {
    this._ctx = ctx;
    this._cpuWeight = cpuWeight;
    this._state = 'free';
    this._started = false;
    this._baseFreq = 0;
    this._releaseTimer = null;
    this._stealTimer = null;
    this._settleTimer = null;
    this._freeCallbacks = new Set();

    // the shared envelope gain — every partial sums into this one node (§11.1a)
    this.envGain = ctx.createGain();
    this.envGain.gain.value = 0;
    this.envGain.connect(out);

    // 8 partials: each its own OscillatorNode + its own level GainNode (§11.1a)
    this.partialOscs = [];
    this.partialGains = [];
    for (let i = 0; i < PARTIAL_COUNT; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const g = ctx.createGain();
      g.gain.value = partialsSnapshot[i].level;
      osc.connect(g);
      g.connect(this.envGain);
      this.partialOscs.push(osc);
      this.partialGains.push(g);
    }

    this._partials = partialsSnapshot.map((p) => ({ ...p }));
    this._env = { ...envSnapshot };
  }

  get cpuWeight() {
    return this._cpuWeight;
  }

  get state() {
    return this._state;
  }

  _freqFor(i) {
    const mult = i === 0 ? 1 : this._partials[i].multiplier;
    return this._baseFreq * mult;
  }

  trigger(note, velocity, atTime) {
    const ctx = this._ctx;
    const t = Math.max(atTime ?? ctx.currentTime, ctx.currentTime);
    this._baseFreq = midiToFreq(note);

    for (let i = 0; i < PARTIAL_COUNT; i++) {
      this.partialOscs[i].frequency.setValueAtTime(this._freqFor(i), t);
      this.partialOscs[i].start(t);
    }
    this._started = true;

    const peak = clamp(velocity, 0, 1);
    const g = this.envGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(peak, t + this._env.attack);
    g.linearRampToValueAtTime(peak * this._env.sustain, t + this._env.attack + this._env.decay);

    this._state = 'attacking';
    clearTimeout(this._settleTimer);
    const settleMs = Math.max(0, t - ctx.currentTime + this._env.attack + this._env.decay) * 1000;
    this._settleTimer = setTimeout(() => {
      if (this._state === 'attacking') this._state = 'sustaining';
    }, settleMs);
  }

  /** Live update while sounding — called by the instrument when setParam/setState changes
   *  a partial's level/multiplier while this voice is active, so a held note audibly
   *  reflects the student stacking partials in real time. Internal-only: the instrument is
   *  the sole caller, never exposed outside this file. */
  updatePartial(i, partial) {
    this._partials[i] = { ...partial };
    if (!this._started || this._state === 'free' || this._state === 'stealing') return;
    const ctx = this._ctx;
    const t = ctx.currentTime;
    this.partialGains[i].gain.cancelScheduledValues(t);
    this.partialGains[i].gain.linearRampToValueAtTime(this._partials[i].level, t + 0.01);
    if (i > 0) {
      this.partialOscs[i].frequency.cancelScheduledValues(t);
      this.partialOscs[i].frequency.linearRampToValueAtTime(this._freqFor(i), t + 0.01);
    }
  }

  /** Live update of the envelope's release stage timing for any future release; does not
   *  rewrite an in-flight attack/decay ramp (heard on the next trigger, not retroactively —
   *  ordinary synth behavior, not a contract requirement either way). */
  updateEnv(env) {
    this._env = { ...env };
  }

  release(atTime) {
    if (this._state === 'free' || this._state === 'releasing' || this._state === 'stealing') return;
    const ctx = this._ctx;
    const t = Math.max(atTime ?? ctx.currentTime, ctx.currentTime);
    const g = this.envGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + this._env.release);
    this._state = 'releasing';
    clearTimeout(this._settleTimer);
    clearTimeout(this._releaseTimer);
    this._releaseTimer = setTimeout(
      () => this.free(),
      Math.max(0, t - ctx.currentTime + this._env.release) * 1000 + 15
    );
  }

  /** Forced release per §10-A: linear fade to 0 over 5ms, then free() — never an abrupt
   *  stop. Called either by the cap-eviction path (§11.2 step 4, via voicePool.steal()'s
   *  selection) or directly by the instrument as a click-free retrigger when the same held
   *  note fires noteOn again before its previous voice released. */
  steal(atTime) {
    if (this._state === 'free' || this._state === 'stealing') return;
    const ctx = this._ctx;
    const t = Math.max(atTime ?? ctx.currentTime, ctx.currentTime);
    const g = this.envGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + STEAL_FADE_S);
    this._state = 'stealing';
    clearTimeout(this._settleTimer);
    clearTimeout(this._releaseTimer);
    clearTimeout(this._stealTimer);
    this._stealTimer = setTimeout(
      () => this.free(),
      Math.max(0, t - ctx.currentTime + STEAL_FADE_S) * 1000 + 10
    );
  }

  /** Disconnects every node this voice owns (17: 8 osc + 8 partial-gain + 1 envelope-gain),
   *  deregisters from voicePool, and fires any onFree() callbacks (used internally to drop
   *  this voice from the instrument's own pool and to drive the steal-then-retry
   *  sequence). Idempotent. */
  free() {
    if (this._state === 'free') return;
    clearTimeout(this._releaseTimer);
    clearTimeout(this._stealTimer);
    clearTimeout(this._settleTimer);
    this._state = 'free';

    for (const osc of this.partialOscs) {
      try {
        osc.stop();
      } catch (e) {
        // already stopped, or never started — never abrupt, never throws outward
      }
      osc.disconnect();
    }
    for (const g of this.partialGains) g.disconnect();
    this.envGain.disconnect();

    voicePool.release(this);

    const callbacks = this._freeCallbacks;
    this._freeCallbacks = new Set();
    for (const cb of callbacks) {
      try {
        cb();
      } catch (e) {
        console.error('[overtone-synth] Voice.onFree callback threw:', e);
      }
    }
  }

  /** Internal-only hook (see class comment). Fires once, immediately if already free. */
  onFree(fn) {
    if (this._state === 'free') {
      fn();
      return;
    }
    this._freeCallbacks.add(fn);
  }
}

// ---------------------------------------------------------------------------------------
// OvertoneSynth — the Instrument. CONTRACTS §2 + its amendments, §11.2 (allocation via the
// governor, cap-driven stealing), §11.5 (exact setParam path list), §11.6 (analysis tap).
// ---------------------------------------------------------------------------------------

export default class OvertoneSynth {
  static id = 'overtone-synth';
  static label = 'Overtone Synth';
  static playable = true;

  // §2 [AMENDED] additions this instrument needs vs. inherits as no-op:
  static needsLoad = false; // no async load work — ready() resolves immediately
  static pieces = null; // not a kit instrument
  static emitsNotes = false; // does not drive another instrument

  /** §11.1a: PROVISIONAL floor, 10 (partial 0's oscillator + the shared envelope gain, the
   *  measured plain-voice figure) + 7 × 1 (each remaining partial's own GainNode, the
   *  measured GainNode figure) = 17. Not a direct measurement — recon-webaudio Q2 measured
   *  single-oscillator voices only. See this seat's receipt for the live browser
   *  measurement taken against this floor (OPEN DECISIONS #2, CONTRACTS §11) — the figure
   *  reported to the Troubleshooter, not silently substituted here: BUILD seats do not
   *  amend CONTRACTS, so the constant stays at the frozen §11.1a value. */
  static VOICE_CPU_WEIGHT = 17;

  /** §8: a floor, not a measurement (its offline render never called the read function) —
   *  the instrument's cpuWeight getter must include its AnalyserNode, per §11.6. */
  static ANALYSER_CPU_WEIGHT = 2;

  constructor(ctx, out) {
    this._ctx = ctx;
    this._out = out;

    // per-instrument chain (§11.6): every live voice sums into one gain node, which feeds
    // the instrument's own AnalyserNode, which feeds `out`. The analyser sees the real,
    // current mix — exactly what a student is hearing.
    this._instrumentGain = ctx.createGain();
    this._instrumentGain.gain.value = 1;
    this._analyser = ctx.createAnalyser();
    this._analyser.fftSize = 2048;
    this._analyser.maxDecibels = -15;
    this._instrumentGain.connect(this._analyser);
    this._analyser.connect(out);

    this._partials = defaultPartials();
    this._env = { ...ENV_DEFAULTS };

    this._voicesByNote = new Map(); // note -> live Voice, for noteOff/retrigger
    this._allVoices = new Set(); // every live voice this instrument owns

    // [FIXED 2026-08-23, `redpen-p1` D-3] Mount state is keyed by mode, not a single slot,
    // so `mountCompact` and `mountExpanded` can both be live at once — the shape
    // `wave-synth.js` already uses. Each entry is `{ el, root, refs, teardown }` or null.
    this._mounts = { compact: null, expanded: null };
  }

  // ---- async ready (§2 amendment 1) ------------------------------------------------
  async ready() {
    // no async load work — every partial is a plain OscillatorNode, nothing to decode.
  }

  // ---- note emission (§2 amendment 4) — no-op: emitsNotes is false ------------------
  onNoteOut(fn) {
    // this instrument never drives another instrument; inherits the no-op default.
  }
  offNoteOut(fn) {
    // matches onNoteOut — no-op.
  }

  // ---- note input ---------------------------------------------------------------------

  /** §11.2's allocate sequence. Never refuses a note (§10-A) — refused requests steal the
   *  DAW's longest-released (or longest-held) voice, fade it over 5ms, and retry once.
   *
   *  [FIXED 2026-08-23, Troubleshooter-directed, `redpen-p1` D-1 / CONTRACTS §11.7a] The
   *  `velocity = 0.8` default. §11.7a: "when `velocity` is `undefined`, every instrument
   *  must treat it as 0.8, not NaN and not a thrown error" — the same constant §12.1
   *  already fixes for a surface that cannot sense velocity. Without it `noteOn(60)`
   *  reached `linearRampToValueAtTime(NaN)` and the note was silent. `wave-synth.js`
   *  already defaults in exactly this place, exactly this way. */
  noteOn(note, velocity = 0.8, atTime) {
    const t = atTime ?? this._ctx.currentTime;

    // a held note firing noteOn again (rapid retrigger) replaces its own prior voice via
    // the same click-free 5ms steal path, rather than stacking a second, untracked voice
    // under the same note key.
    const existing = this._voicesByNote.get(note);
    if (existing && existing.state !== 'free' && existing.state !== 'stealing') {
      existing.steal(this._ctx.currentTime);
    }

    const cost = OvertoneSynth.VOICE_CPU_WEIGHT;

    const allocate = () => {
      const voice = new Voice(this._ctx, createVoiceOut(OvertoneSynth.id, this._instrumentGain), cost, this._partials, this._env);
      voice.trigger(note, velocity, t);
      voicePool.register(voice, OvertoneSynth.id, t);
      this._allVoices.add(voice);
      this._voicesByNote.set(note, voice);
      voice.onFree(() => {
        this._allVoices.delete(voice);
        if (this._voicesByNote.get(note) === voice) this._voicesByNote.delete(note);
      });
    };

    if (governor.request(cost)) {
      allocate();
      return;
    }

    // refused — §10-A / §11.2 step 4.
    const target = voicePool.steal();
    if (!target) {
      // pool reports nothing to steal yet request was refused — should not occur against
      // a count-only governor with cap >= 1, but §10-A's rule is absolute: never refuse.
      allocate();
      return;
    }
    // §11.2a [2026-08-23]: voicePool.steal() deregistered `target` synchronously, in the
    // call above, so the slot is already free — target.steal() below only runs the real
    // 5ms audio fade. The retry is therefore synchronous and immediate, checking a count
    // that has actually changed in this same tick. The previous version deferred this
    // retry into target.onFree() to wait for that fade; that deferral is no longer
    // necessary and must not be reintroduced — it let concurrent deferred retries each
    // find the same momentarily-open slot without seeing each other, which is how a
    // synchronous burst reached 39 voices against a 32 cap (test-p1, P1/S5).
    //
    // No onFree registration is needed here: `target`'s own cleanup callback (dropping it
    // from _allVoices/_voicesByNote) was registered inside allocate() when it was first
    // allocated, and if it belongs to another instrument its cleanup is that instrument's.
    target.steal(this._ctx.currentTime);
    if (!governor.request(cost)) {
      // still refused after the one retry §11.2 specifies (should not occur — steal()
      // drops voicePool.count by exactly one, synchronously, in a single-threaded
      // registry). Never drop a note: allocate anyway and say so.
      console.warn(
        '[overtone-synth] governor still refused after one steal-retry; allocating ' +
          'anyway per §10-A ("a note is never refused").'
      );
    }
    allocate();
  }

  noteOff(note, atTime) {
    const voice = this._voicesByNote.get(note);
    if (!voice) return;
    voice.release(atTime);
  }

  allNotesOff() {
    for (const voice of this._allVoices) {
      if (voice.state !== 'free' && voice.state !== 'releasing' && voice.state !== 'stealing') {
        voice.release(this._ctx.currentTime);
      }
    }
  }

  // ---- params (§11.3 envelope + §11.5 exact path list) -------------------------------
  //
  // [FIXED 2026-08-23, Troubleshooter-directed, `redpen-p1` D-2 / CONTRACTS §11.7b] The
  // ERROR CONVENTION on all three of setParam / getParam / setState. §11.7b: an
  // UNRECOGNIZED path is a silent no-op on `setParam`, returns `undefined` from
  // `getParam`, and a non-plain-object `setState` argument is a silent no-op — never a
  // thrown exception. Reasoning is §11.7b's own: §7 automation and P5's preset loader call
  // these programmatically, at scheduled times, on user-authored data, where one throw does
  // not fail one control — it can stop a scheduler pass mid-song. `wave-synth.js` already
  // behaves this way; this file previously threw, and two behaviours cannot both be "the"
  // §2 behaviour for a generic caller. Now matched to `wave-synth.js` exactly.
  //
  // NOT changed, and deliberately so: `partial.0.multiplier` still THROWS on both
  // `setParam` and `getParam`. That path is not "unrecognized" — §11.5 recognizes it and
  // refuses it by name ("its multiplier is fixed at ×1 by definition; exposing it as
  // settable would let a student break 'fundamental = lowest'"), the refusal is a teaching
  // guarantee rather than a missing case, `redpen-p1` Q1 checked it as CORRECT §11.5
  // behaviour, D-2 filed only the three generic unknown-path throws, and
  // `test-overtone-voice.html` asserts the throw in two places. Flagged to the
  // Troubleshooter as the one edge where §11.7b's wording and §11.5's named refusal touch;
  // not resolved unilaterally here.

  setParam(path, value) {
    const pm = PARTIAL_PATH_RE.exec(path);
    if (pm) {
      const i = Number(pm[1]);
      const field = pm[2];
      if (field === 'multiplier') {
        if (i === 0) {
          throw new Error(
            'overtone-synth: setParam("partial.0.multiplier", …) — no such path. Partial 0 ' +
              'is the fundamental; its multiplier is fixed at ×1 by definition (§11.5) and ' +
              'is never settable.'
          );
        }
        // whole-number constraint (§11.5): "clamps to the integer nearest v (Math.round),
        // floored at 1." A fractional multiplier is never stored — this IS the refusal.
        this._partials[i].multiplier = clamp(Math.round(value), MULTIPLIER_MIN, MULTIPLIER_MAX);
      } else {
        this._partials[i].level = clamp(value, 0, 1);
      }
      this._propagatePartial(i);
      this._syncUI(); // D-6: the row's label is derived from its multiplier, so it moves too
      return;
    }
    const em = ENV_PATH_RE.exec(path);
    if (em) {
      const stage = em[1];
      const [lo, hi] = ENV_RANGES[stage];
      this._env[stage] = clamp(value, lo, hi);
      this._propagateEnv();
      this._syncUI();
      return;
    }
    // §11.7b: unrecognized path — silent no-op, never a throw.
    return;
  }

  getParam(path) {
    const pm = PARTIAL_PATH_RE.exec(path);
    if (pm) {
      const i = Number(pm[1]);
      const field = pm[2];
      if (field === 'multiplier') {
        if (i === 0) {
          throw new Error(
            'overtone-synth: getParam("partial.0.multiplier") — no such path (§11.5).'
          );
        }
        return this._partials[i].multiplier;
      }
      return this._partials[i].level;
    }
    const em = ENV_PATH_RE.exec(path);
    if (em) return this._env[em[1]];
    // §11.7b: unrecognized path — returns undefined, never a throw.
    return undefined;
  }

  _propagatePartial(i) {
    for (const voice of this._allVoices) voice.updatePartial(i, this._partials[i]);
  }

  _propagateEnv() {
    for (const voice of this._allVoices) voice.updateEnv(this._env);
  }

  // ---- state (JSON round-trip, lossless) ----------------------------------------------

  getState() {
    return {
      partials: this._partials.map((p, i) =>
        i === 0 ? { level: p.level } : { level: p.level, multiplier: p.multiplier }
      ),
      env: { ...this._env },
    };
  }

  setState(obj) {
    // §11.7b: a malformed state argument is a silent no-op, never a throw. Matches
    // `wave-synth.js`'s `if (!obj || typeof obj !== 'object') return;` exactly.
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj.partials)) {
      for (let i = 0; i < PARTIAL_COUNT && i < obj.partials.length; i++) {
        const p = obj.partials[i];
        if (!p) continue;
        if (typeof p.level === 'number') this._partials[i].level = clamp(p.level, 0, 1);
        if (i > 0 && typeof p.multiplier === 'number') {
          this._partials[i].multiplier = clamp(Math.round(p.multiplier), MULTIPLIER_MIN, MULTIPLIER_MAX);
        }
        this._propagatePartial(i);
      }
    }
    if (obj.env && typeof obj.env === 'object') {
      for (const stage of ['attack', 'decay', 'sustain', 'release']) {
        if (typeof obj.env[stage] === 'number') {
          const [lo, hi] = ENV_RANGES[stage];
          this._env[stage] = clamp(obj.env[stage], lo, hi);
        }
      }
      this._propagateEnv();
    }
    this._syncUI(); // labels, multipliers, levels, bars, envelope sliders — every live mount
  }

  // ---- voice count / cpu weight --------------------------------------------------------

  get voiceCount() {
    return this._allVoices.size;
  }

  /** §2/§11.6: the instrument's *current, live* total — every active voice's fixed
   *  per-voice weight (§11.1a) plus this instrument's own AnalyserNode (§11.6: "must
   *  include this AnalyserNode in its total, not just its live voices"). Distinct from
   *  `Voice.cpuWeight` (§11.1), which is the fixed per-voice figure `governor.request(cost)`
   *  is asked about at allocation time (§11.2 step 1) — see `noteOn`. */
  get cpuWeight() {
    return this.voiceCount * OvertoneSynth.VOICE_CPU_WEIGHT + OvertoneSynth.ANALYSER_CPU_WEIGHT;
  }

  // ---- analysis tap (§2 amendment 2, §11.5, §11.6) --------------------------------------

  /** Returns the instrument's post-mix AnalyserNode for 'scope', null for anything else.
   *  Overtone Synth's visual is the oscilloscope only — the inversion of Wave Synth, whose
   *  tap is the spectrum analyzer only (§11.4/§11.5). The node is already connected inside
   *  this instrument's own chain (§11.6); a reader must never reconnect it or call
   *  dispose() on it — that rule is enforced by convention (this returns the live node
   *  itself), matching every other instrument in the run. */
  getAnalyser(which) {
    if (which === 'scope') return this._analyser;
    return null;
  }

  // ---- mounting (§9 visual tokens via CSS custom properties; DAW view vs standalone) ---
  //
  // [FIXED 2026-08-23, Troubleshooter-directed, `redpen-p1` D-7] Every `var(--token, X)`
  // fallback in the mount code below is now byte-identical to the value `ui/tokens.css`
  // defines for that token. They previously carried this seat's own provisional colours,
  // which made them a second, divergent palette in a second location — exactly what §9
  // ("one palette… no drift") forbids, and it meant a one-line edit to `tokens.css`
  // silently did not reach this file. The fallbacks exist ONLY so the module renders in a
  // page that has not linked `tokens.css`; they are not a palette and MUST be kept
  // identical to `tokens.css` if a value there changes. Same pattern `vis/spectrum.js`,
  // `vis/scope.js` and `ui/shell.js` already use.

  mountCompact(el) {
    this._mount(el, 'compact');
  }

  mountExpanded(el) {
    this._mount(el, 'expanded');
  }

  /** [FIXED 2026-08-23, Troubleshooter-directed, `redpen-p1` D-3] DUAL MOUNT. This method
   *  used to open with `if (this._mountedEl) this.unmount()`, so an instrument could hold
   *  exactly one mount and `mountExpanded()` silently tore `mountCompact()` down. P4's DAW
   *  mounts a strip view and a detail view of the SAME instrument at once, and
   *  `wave-synth.js` already supports that (verified live in `test-report.md` Q1), so two
   *  §2 instruments answered `mountCompact`/`mountExpanded` differently. Mount state is now
   *  keyed by mode — `{ compact, expanded }`, the same shape `wave-synth.js` uses — so both
   *  can be live simultaneously and share one instrument's state. Re-mounting the SAME mode
   *  still replaces that mode's DOM (it does not stack), and `unmount()` still takes both
   *  down. Audio was never involved: every mount reads and writes the one `this._partials`
   *  / `this._env`, so "sharing state" is not new plumbing, it is what removing the
   *  teardown exposes. `_syncUI()` is what pushes a change made in one mount into the
   *  other. */
  _mount(el, mode) {
    if (this._mounts[mode]) this._unmountOne(mode);

    const compact = mode === 'compact';
    const root = document.createElement('div');
    root.className = `overtone-synth overtone-synth--${mode}`;
    root.style.cssText = [
      `background: var(--panel, #1b2332)`,
      `color: var(--text, #f2f6fc)`,
      `border: var(--bw) solid var(--line, #3a485f)`,
      `font-family: var(--font-ui)`,
      `padding: ${compact ? '8px' : '24px'}`,
      `display: var(--disp-flex)`,
      `flex-direction: var(--flexdir-column)`,
      `gap: ${compact ? '4px' : '16px'}`,
      `box-sizing: var(--box-border-box)`,
      `transition: var(--tr-shadow)`,
    ].join(';');

    const teardownFns = [];
    const track = (node, evt, fn) => {
      node.addEventListener(evt, fn);
      teardownFns.push(() => node.removeEventListener(evt, fn));
    };

    // Element refs this mount's own `refresh()` writes into. Held per mount, so a second
    // live mount refreshes from the same instrument state without either one knowing the
    // other exists (D-3).
    const refs = {
      labels: new Array(PARTIAL_COUNT).fill(null),
      multInputs: new Array(PARTIAL_COUNT).fill(null),
      levelInputs: new Array(PARTIAL_COUNT).fill(null),
      bars: new Array(PARTIAL_COUNT).fill(null),
      envInputs: {},
    };

    const rows = document.createElement('div');
    rows.style.cssText = `display:var(--disp-flex);flex-direction:var(--flexdir-column);gap:${compact ? '2px' : '10px'};`;

    for (let i = 0; i < PARTIAL_COUNT; i++) {
      const row = document.createElement('div');
      row.className = 'overtone-synth__partial-row';
      row.dataset.partialIndex = String(i);
      row.style.cssText =
        `display:var(--disp-flex);align-items:var(--align-center);gap:var(--sp-4);font-size:${compact ? '11px' : '15px'};`;

      const label = document.createElement('span');
      label.className = 'overtone-synth__partial-label';
      label.textContent = this._partialLabelText(i);
      label.style.cssText =
        `min-width:${compact ? '82px' : '150px'};` +
        `color:${i === 0 ? 'var(--accent, #34e5b4)' : 'var(--text-dim, #93a1b8)'};` +
        `font-weight:${i === 0 ? 'bold' : 'normal'};`;
      row.appendChild(label);
      refs.labels[i] = label;

      if (i > 0) {
        const multInput = document.createElement('input');
        multInput.type = 'number';
        multInput.className = 'overtone-synth__multiplier';
        multInput.min = String(MULTIPLIER_MIN);
        multInput.max = String(MULTIPLIER_MAX);
        multInput.step = '1';
        multInput.value = String(this._partials[i].multiplier);
        multInput.style.cssText = `width:${compact ? '40px' : '56px'};`;
        track(multInput, 'change', () => {
          // setParam() calls _syncUI(), which writes the rounded value back into every
          // mount's multiplier input AND re-renders every mount's partial label from it
          // (D-6). The explicit write below stays because this input is very likely
          // document.activeElement right now, and _syncUI() deliberately does not stomp a
          // control the student is holding — but a `change` event means the student has
          // finished, so the rounded value must land here too, visibly (§11.5's
          // whole-number constraint is taught by watching 2.7 snap to 3).
          this.setParam(`partial.${i}.multiplier`, Number(multInput.value));
          multInput.value = String(this._partials[i].multiplier);
        });
        row.appendChild(multInput);
        refs.multInputs[i] = multInput;

        const x = document.createElement('span');
        x.textContent = '×';
        x.style.color = 'var(--text-dim, #93a1b8)';
        row.appendChild(x);
      }

      const levelInput = document.createElement('input');
      levelInput.type = 'range';
      levelInput.className = 'overtone-synth__level';
      levelInput.min = '0';
      levelInput.max = '1';
      levelInput.step = '0.01';
      levelInput.value = String(this._partials[i].level);
      levelInput.style.cssText = 'flex:var(--flex-1);';
      row.appendChild(levelInput);
      refs.levelInputs[i] = levelInput;

      let bar = null;
      if (!compact) {
        const barTrack = document.createElement('div');
        barTrack.style.cssText =
          'width:var(--sp-60);height:var(--sp-5);background:var(--line, #3a485f);border-radius:var(--r-ctl);overflow:var(--ov-hidden);';
        bar = document.createElement('div');
        bar.style.cssText = [
          'height:var(--pct-100)',
          'width:var(--pct-100)',
          'transform-origin:left',
          `background:${i === 0 ? 'var(--accent, #34e5b4)' : 'var(--meter-ok, #6ee05a)'}`,
          `transform:scaleX(${this._partials[i].level})`,
          'transition:transform 120ms ease-out',
        ].join(';');
        barTrack.appendChild(bar);
        row.appendChild(barTrack);
        refs.bars[i] = bar;
      }

      // setParam() -> _syncUI() now moves the bar in EVERY live mount, not just this one.
      track(levelInput, 'input', () => {
        this.setParam(`partial.${i}.level`, Number(levelInput.value));
      });

      rows.appendChild(row);
    }
    root.appendChild(rows);

    const env = document.createElement('div');
    env.className = 'overtone-synth__envelope';
    env.style.cssText = `display:var(--disp-flex);gap:var(--sp-4);font-size:${compact ? '10px' : '13px'};flex-wrap:var(--flexwrap-wrap);`;
    for (const stage of ['attack', 'decay', 'sustain', 'release']) {
      const [lo, hi] = ENV_RANGES[stage];
      const wrap = document.createElement('label');
      wrap.style.cssText = 'display:var(--disp-flex);flex-direction:var(--flexdir-column);gap:var(--sp-1);color:var(--text-dim, #93a1b8);';
      wrap.textContent = stage[0].toUpperCase();
      const input = document.createElement('input');
      input.type = 'range';
      input.className = `overtone-synth__env-${stage}`;
      input.min = String(lo);
      input.max = String(hi);
      input.step = '0.001';
      input.value = String(this._env[stage]);
      track(input, 'input', () => this.setParam(`env.${stage}`, Number(input.value)));
      wrap.appendChild(input);
      env.appendChild(wrap);
      refs.envInputs[stage] = input;
    }
    root.appendChild(env);

    // expanded-only: a gentle "breathing" glow while any note is held — driven purely by
    // this instrument's own note-held state (`_allVoices.size`), NEVER by reading
    // `getAnalyser('scope')`. Drawing the waveform itself is `scopes`' job; this file only
    // exposes the tap, per the brief's hard boundary.
    let rafHandle = null;
    if (!compact) {
      const animate = () => {
        const held = this._allVoices.size > 0;
        root.style.boxShadow = held
          ? '0 0 18px 2px var(--accent, #34e5b4)'
          : '0 0 0px 0px transparent';
        rafHandle = requestAnimationFrame(animate);
      };
      rafHandle = requestAnimationFrame(animate);
    }

    el.appendChild(root);

    this._mounts[mode] = {
      el,
      root,
      refs,
      teardown: () => {
        for (const off of teardownFns) off();
        if (rafHandle !== null) cancelAnimationFrame(rafHandle);
        root.remove();
      },
    };
    this._syncUI();
  }

  /** The row label for partial `i`, derived from the LIVE multiplier.
   *
   *  [FIXED 2026-08-23, Troubleshooter-directed, `redpen-p1` D-6 / Q5 C-7] This used to be
   *  a hard-coded `partial ${i + 1}` written once at mount, while the row's multiplier next
   *  to it stayed a live, student-editable input. Setting the row labelled "partial 2" to a
   *  multiplier of 7 left the screen reading `partial 2  [7] ×  ————`: a row labelled 2 and
   *  sounding ×7. Brandon's outline (line 37) defines a partial BY its place in the
   *  whole-number sequence — "each function of the sequence is called a 'partial'" — so
   *  that row IS partial 7, and the one instrument built to teach the harmonic series could
   *  be made to contradict it in two clicks. The label is now a function of the multiplier
   *  and is re-rendered by `_syncUI()` on every change, from any source (a mount's own
   *  input, the other mount's input, `setParam`, `setState`).
   *
   *  Partial 0 is unchanged: its multiplier is fixed at ×1 by definition (§11.5), it has no
   *  settable multiplier path, and it keeps its own `fundamental (×1)` wording. */
  _partialLabelText(i) {
    if (i === 0) return 'fundamental (×1)';
    return `partial ${this._partials[i].multiplier}`;
  }

  /** Pushes current instrument state into every live mount: partial labels (D-6),
   *  multiplier inputs, level sliders, level bars, envelope sliders. Cheap, targeted
   *  writes only — never rebuilds DOM, so it is safe to call on every `setParam`.
   *
   *  Two mounts can be live at once (D-3), so this is what makes them share state: a change
   *  made in the compact view lands in the expanded view and the reverse. A control that is
   *  `document.activeElement` is skipped so a slider is never yanked out from under a
   *  student's pointer mid-drag — the same guard `wave-synth.js`'s `_syncUI()` uses. */
  _syncUI() {
    for (const mode of ['compact', 'expanded']) {
      const mount = this._mounts[mode];
      if (!mount) continue;
      const { refs } = mount;

      for (let i = 0; i < PARTIAL_COUNT; i++) {
        const label = refs.labels[i];
        if (label) {
          const text = this._partialLabelText(i);
          if (label.textContent !== text) label.textContent = text;
        }

        const multInput = refs.multInputs[i];
        if (multInput && document.activeElement !== multInput) {
          multInput.value = String(this._partials[i].multiplier);
        }

        const levelInput = refs.levelInputs[i];
        if (levelInput && document.activeElement !== levelInput) {
          levelInput.value = String(this._partials[i].level);
        }

        const bar = refs.bars[i];
        if (bar) bar.style.transform = `scaleX(${this._partials[i].level})`;
      }

      for (const stage of ['attack', 'decay', 'sustain', 'release']) {
        const input = refs.envInputs[stage];
        if (input && document.activeElement !== input) {
          input.value = String(this._env[stage]);
        }
      }
    }
  }

  /** Tears down exactly one mode's mount. Used by `_mount()` when the same mode is mounted
   *  twice (replace, do not stack) and by `unmount()` for each live mode in turn. */
  _unmountOne(mode) {
    const mount = this._mounts[mode];
    if (!mount) return;
    mount.teardown();
    this._mounts[mode] = null;
  }

  /** Takes BOTH mounts down — compact and expanded — dropping every listener each attached
   *  and cancelling the expanded view's rAF loop. Unchanged in contract; it simply has two
   *  possible mounts to clear now instead of one (D-3). */
  unmount() {
    this._unmountOne('compact');
    this._unmountOne('expanded');
  }

  // ---- teardown --------------------------------------------------------------------

  /** Disconnects every node this instrument owns and drops every listener it attached.
   *  Force-frees every live voice (no release ramp — this is teardown, not a note-off).
   *  Returns a diagnostic count so a caller can verify by count that nothing leaked,
   *  matching the pattern `core/audio.js`'s own dispose() already established. */
  dispose() {
    this.unmount();

    let nodesDisconnected = 0;
    for (const voice of Array.from(this._allVoices)) {
      voice.free(); // disconnects its own 17 nodes, deregisters from voicePool
      nodesDisconnected += 17;
    }
    this._allVoices.clear();
    this._voicesByNote.clear();

    this._instrumentGain.disconnect();
    this._analyser.disconnect();
    nodesDisconnected += 2;

    return { nodesDisconnected };
  }
}

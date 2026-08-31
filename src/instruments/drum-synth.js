/**
 * instruments/drum-synth.js — the Drum Synth. Eight drum pieces built entirely out of Web
 * Audio math: no samples, no files, no network. "The machine that works when the network
 * does not" (this seat's brief) — a DAW channel and the standalone beat tool. Built by
 * `drum-synth`, P2/S4.
 *
 * Implements CONTRACTS §2 (module contract, including its [AMENDED 2026-08-22] additions:
 * `ready()`, `getAnalyser()`, `static pieces`, `onNoteOut`/`offNoteOut`) and binds to §14.1's
 * fixed eight-role piece table (index/note fixed app-wide; label PROVISIONAL, carried as
 * written — see this file's own receipt, not re-escalated here since `spec-clock` already
 * escalated it and it does not block this seat). Also binds to §11.7's three
 * "instrument uniformity" rules, which that section states are "binding on every instrument
 * from here forward," not only the two P1 synths that forced it: (a) a missing `velocity`
 * defaults to `0.8`, never `NaN`/a throw; (b) an unrecognized `setParam`/`getParam` path or a
 * malformed `setState` argument is a silent no-op, never a throw; (c) does not apply here in
 * its literal `env.*` form — this instrument has no sustained `env.*` surface (§14.5: a drum
 * piece is a one-shot, no held/released note), so there is nothing for a live-envelope-edit
 * rule to bind to. See NOTE ON NOTE-OFF, below, for the one-shot design this implies.
 *
 * Owns: this file only. Does NOT own `/src/core/audio.js` (frozen, P1/S2 — imports
 * `voicePool`/`governor` from it, never constructs an AudioContext, never touches
 * `ctx.destination`) · `/src/ui/tokens.css` (frozen, P1/S3 — read only, via CSS custom
 * properties with fallbacks byte-identical to that file, never assumed present) ·
 * `/src/surfaces/step-grid.js` (`grid`, same stage — this file never reads a grid, never
 * reads `/assets/**`, never knows a kit exists) · `/src/instruments/drum-sampler.js`
 * (`drum-sampler`, same stage — no shared code, no shared file, per STAGE.md's collision map).
 *
 * NOTE ON NOTE-OFF — a drum hit is a one-shot. §14.5's own model treats a piece as played by
 * `noteOn(note, velocity, atTime)` alone; nothing in §13.5 (`{ v: 0.8 }`, no length field) or
 * §14 gives a drum piece a held/released lifecycle the way a synth voice has one. Every piece
 * below schedules its own complete attack-through-tail envelope at trigger time and frees
 * itself when that tail ends — matching a real drum machine, where releasing the pad does not
 * cut the sound. `noteOn`'s allocate/steal-retry sequence and `dispose()`'s hard stop still
 * follow §11.2/§10-A exactly; `noteOff` itself is a documented no-op (seat's own design
 * choice, contract silent on this exact point — logged in the receipt, not invented in a way
 * that leaves `capture` or the grid guessing: `noteOff` never throws and never has to be
 * called for a piece to sound correctly).
 *
 * NODE RECIPES, why they're worth stating up front (seat question 2 — "every piece is a
 * teaching artifact… a student who opens the Patch Synth in P4 should recognize these
 * shapes"): the eight pieces are built from exactly four reusable synthesis families, each a
 * shape a Patch Synth student will meet again — (1) THUMP: one sine oscillator, pitch-swept
 * downward, one gain envelope (Kick, Low Tom, High Tom — the same recipe at three tunings).
 * (2) NOISE+TONE: a filtered noise burst blended with a short tone burst (Snare). (3) CLUSTER:
 * several detuned square oscillators summed and pushed through a highpass filter — the
 * inharmonic counterpart to Overtone Synth's harmonic stacking (Closed Hat, Open Hat, Crash —
 * again, one recipe, three tunings/envelopes). (4) BURST NOISE: one filtered noise voice
 * whose gain is shaped into several quick bursts before its tail (Clap). Full per-piece
 * numbers are in this seat's receipt, seat question 2.
 */

import { voicePool, governor } from '../core/audio.js';

// ---------------------------------------------------------------------------------------
// CONSTANTS — §8's measured cost table, applied honestly per piece (seat question 5).
// ---------------------------------------------------------------------------------------
// GainNode = 1, BiquadFilterNode = 9, "plain voice" (one oscillator + its own gain) = 10 —
// all three measured exactly, §8. An additional bare oscillator beyond a family's first is
// priced at the marginal cost §11.1a already set the precedent for (Overtone Synth's extra
// partials: "1 unit for each of the remaining… partials, that partial's own GainNode") — the
// oscillator itself was never isolated by recon, only osc+gain together, so a second/third
// oscillator sharing an existing envelope gain is priced at just its own small trim GainNode.
// A noise source (AudioBufferSourceNode) was likewise never isolated by recon; it is priced
// at the same "plain voice" unit as an oscillator+gain when it carries its own gain, exactly
// the same PROVISIONAL-floor reasoning §11.1a used for Overtone Synth's own cpuWeight — not a
// direct measurement, logged here rather than silently assumed.
const ANALYSER_COST = 2; // §8's own floor for AnalyserNode, restated per §11.6's requirement
// that an instrument's cpuWeight include its analyser, not just its live voices.

const NOISE_BUFFER_SECONDS = 2; // long enough for the longest piece here (Crash, 1.8s decay)
// with margin, so no piece needs to loop mid-decay in a way a listener could ever notice.

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// ---------------------------------------------------------------------------------------
// PIECE TABLE — CONTRACTS §14.1, exactly. index and note are FROZEN by §14.1 (index 0 by
// §10-E, the rest by General MIDI per §14.1's own reasoning). label is PROVISIONAL exactly as
// §14.1 marks it — carried as written because `spec-clock` already escalated the seven open
// labels to Brandon in chat on 2026-08-23 and §14.1 states plainly "not blocking." Per this
// seat's brief ("escalate to Brandon only if §14 leaves any ambiguity") this file does not
// re-escalate: §14.1 already resolves what a BUILD seat needs — a full, usable, ordered
// eight-entry table — leaving only the *display word* open, which the table's own `label`
// field is built to swap without touching `index`/`note`/anything downstream (§14.1: "the
// role does not change; only the word drawn on the row does").
//
// `family` selects one of the four recipes above. `weight` is this piece's fixed cpuWeight —
// honest per §8, not a flat guess (seat question 5): a noise-plus-filter piece (Snare 30,
// Closed/Open Hat 21, Crash 21, Clap 19) costs meaningfully more than a sine thump (Kick, Low
// Tom, High Tom: 10 each). `params` are this file's own addition — CONTRACTS names no fixed
// setParam path list for a drum synth the way §11.4/§11.5 name one for Wave/Overtone Synth —
// so each entry's synthesis-relevant knobs are exposed generically as `piece.<index>.<key>`,
// documented here rather than invented silently, and covered by getState/setState below.
const PIECE_DEFS = [
  {
    index: 0,
    note: 36,
    label: 'Kick',
    family: 'thump',
    weight: 10,
    params: {
      tune: { default: 55, min: 30, max: 150, step: 1, unit: 'Hz' },
      sweep: { default: 70, min: 0, max: 200, step: 1, unit: 'Hz' },
      sweepTime: { default: 0.05, min: 0.01, max: 0.2, step: 0.001, unit: 's' },
      decay: { default: 0.35, min: 0.05, max: 1.0, step: 0.01, unit: 's' },
      level: { default: 1.0, min: 0, max: 1, step: 0.01, unit: '' },
    },
  },
  {
    index: 1,
    note: 38,
    label: 'Snare',
    family: 'noiseTone',
    weight: 30,
    params: {
      tone: { default: 190, min: 80, max: 400, step: 1, unit: 'Hz' },
      filterFreq: { default: 1800, min: 400, max: 4000, step: 10, unit: 'Hz' },
      decay: { default: 0.18, min: 0.03, max: 0.6, step: 0.01, unit: 's' },
      level: { default: 1.0, min: 0, max: 1, step: 0.01, unit: '' },
    },
  },
  {
    index: 2,
    note: 42,
    label: 'Closed Hat',
    family: 'cluster',
    weight: 21,
    params: {
      root: { default: 205, min: 100, max: 400, step: 1, unit: 'Hz' },
      filterFreq: { default: 7000, min: 2000, max: 10000, step: 50, unit: 'Hz' },
      decay: { default: 0.06, min: 0.02, max: 0.3, step: 0.01, unit: 's' },
      level: { default: 1.0, min: 0, max: 1, step: 0.01, unit: '' },
    },
  },
  {
    index: 3,
    note: 46,
    label: 'Open Hat',
    family: 'cluster',
    weight: 21,
    params: {
      root: { default: 205, min: 100, max: 400, step: 1, unit: 'Hz' },
      filterFreq: { default: 6500, min: 2000, max: 10000, step: 50, unit: 'Hz' },
      decay: { default: 0.35, min: 0.05, max: 1.2, step: 0.01, unit: 's' },
      level: { default: 1.0, min: 0, max: 1, step: 0.01, unit: '' },
    },
  },
  {
    index: 4,
    note: 39,
    label: 'Clap',
    family: 'burstNoise',
    weight: 19,
    params: {
      filterFreq: { default: 1200, min: 400, max: 3000, step: 10, unit: 'Hz' },
      burstSpacing: { default: 0.012, min: 0.005, max: 0.03, step: 0.001, unit: 's' },
      decay: { default: 0.3, min: 0.05, max: 1.0, step: 0.01, unit: 's' },
      level: { default: 1.0, min: 0, max: 1, step: 0.01, unit: '' },
    },
  },
  {
    index: 5,
    note: 45,
    label: 'Low Tom',
    family: 'thump',
    weight: 10,
    params: {
      tune: { default: 110, min: 50, max: 220, step: 1, unit: 'Hz' },
      sweep: { default: 70, min: 0, max: 200, step: 1, unit: 'Hz' },
      sweepTime: { default: 0.06, min: 0.01, max: 0.2, step: 0.001, unit: 's' },
      decay: { default: 0.45, min: 0.05, max: 1.2, step: 0.01, unit: 's' },
      level: { default: 1.0, min: 0, max: 1, step: 0.01, unit: '' },
    },
  },
  {
    index: 6,
    note: 50,
    label: 'High Tom',
    family: 'thump',
    weight: 10,
    params: {
      tune: { default: 165, min: 80, max: 320, step: 1, unit: 'Hz' },
      sweep: { default: 90, min: 0, max: 220, step: 1, unit: 'Hz' },
      sweepTime: { default: 0.05, min: 0.01, max: 0.2, step: 0.001, unit: 's' },
      decay: { default: 0.4, min: 0.05, max: 1.0, step: 0.01, unit: 's' },
      level: { default: 1.0, min: 0, max: 1, step: 0.01, unit: '' },
    },
  },
  {
    index: 7,
    note: 49,
    label: 'Crash',
    family: 'cluster',
    weight: 21,
    params: {
      root: { default: 160, min: 80, max: 320, step: 1, unit: 'Hz' },
      filterFreq: { default: 4000, min: 1000, max: 8000, step: 50, unit: 'Hz' },
      decay: { default: 1.8, min: 0.3, max: 3.0, step: 0.01, unit: 's' },
      level: { default: 1.0, min: 0, max: 1, step: 0.01, unit: '' },
    },
  },
];

function defaultParamsFor(def) {
  const out = {};
  for (const key of Object.keys(def.params)) out[key] = def.params[key].default;
  return out;
}

function clampParam(def, key, value) {
  const spec = def.params[key];
  if (!spec || typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return clamp(value, spec.min, spec.max);
}

// ---------------------------------------------------------------------------------------
// Shared white-noise buffer — one per AudioContext, reused by every Snare/Clap voice this
// instrument (or another instance sharing the same ctx) ever triggers. Not a contract
// requirement; a plain efficiency choice, logged rather than hidden: generating one buffer
// once is cheaper than decoding/allocating noise per hit, and it holds no per-instrument
// state, so it is intentionally NOT torn down by any one instrument's dispose() — the same
// reasoning `core/audio.js` uses for the single shared AudioContext itself.
// ---------------------------------------------------------------------------------------
const _noiseBuffers = new WeakMap();
function getNoiseBuffer(ctx) {
  let buf = _noiseBuffers.get(ctx);
  if (!buf) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * NOISE_BUFFER_SECONDS));
    buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    _noiseBuffers.set(ctx, buf);
  }
  return buf;
}

// ---------------------------------------------------------------------------------------
// SYNTHESIS RECIPES (seat question 2). Each builder returns
// { nodes: AudioNode[], envGain: AudioNode, tEnd: number } — `nodes` is every node this hit
// owns (for exact disconnect accounting), `envGain` is the single node whose `.gain`
// controls final loudness (the node `steal()` fades to 0), `tEnd` is when this hit's own
// scheduled tail naturally finishes (self-free timing).
//
// VELOCITY (seat question 4): every recipe below moves at least one thing besides loudness
// when velocity rises — a thump's pitch-sweep starts higher (a harder hit clicks brighter);
// a filtered piece's filter cutoff rises (a harder hit is brighter, audibly, not just
// louder); the cluster recipe additionally widens its detune spread (more shimmer). This is
// the same "harder hit is brighter" rule stated on every recipe, not a single global hack.
// ---------------------------------------------------------------------------------------

/** THUMP — Kick, Low Tom, High Tom. One sine oscillator, pitch-swept down; one gain
 *  envelope. cpuWeight 10 (§8's exact "plain voice", osc+gain). */
function triggerThump(ctx, out, p, velocity, t0) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t0);

  // velocity brightens the transient: a harder hit starts its pitch sweep higher, giving a
  // sharper "click" on top of the same fundamental thump — audible beyond loudness alone.
  const brightBoost = 1 + velocity * 0.6;
  const startFreq = p.tune + p.sweep * brightBoost;
  osc.frequency.setValueAtTime(startFreq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(p.tune, 20), t0 + p.sweepTime);

  const peak = velocity * p.level;
  const ATTACK = 0.002;
  gain.gain.linearRampToValueAtTime(Math.max(peak, 0.0001), t0 + ATTACK);
  const tailEnd = t0 + ATTACK + p.decay;
  gain.gain.exponentialRampToValueAtTime(0.0008, tailEnd);

  osc.connect(gain);
  gain.connect(out);
  const stopAt = tailEnd + 0.05;
  osc.start(t0);
  osc.stop(stopAt);

  return { nodes: [osc, gain], envGain: gain, tEnd: stopAt };
}

/** NOISE+TONE — Snare. A short triangle tone burst blended with filtered noise. cpuWeight
 *  30 = 10 (tone osc+gain) + 10 (noise source+gain, PROVISIONAL floor, see file header) + 9
 *  (bandpass filter) + 1 (mix gain). */
function triggerNoiseTone(ctx, out, p, velocity, t0, noiseBuffer) {
  const toneOsc = ctx.createOscillator();
  toneOsc.type = 'triangle';
  toneOsc.frequency.setValueAtTime(p.tone, t0);
  const toneGain = ctx.createGain();
  toneGain.gain.setValueAtTime(0, t0);
  const tonePeak = Math.max(velocity * p.level * 0.5, 0.0001);
  const toneDecay = p.decay * 0.4;
  toneGain.gain.linearRampToValueAtTime(tonePeak, t0 + 0.001);
  toneGain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.001 + toneDecay);

  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuffer;
  noiseSrc.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  // velocity brightens the noise: harder hit -> higher bandpass center (seat q4).
  filter.frequency.setValueAtTime(p.filterFreq + velocity * 800, t0);
  filter.Q.value = 0.9;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, t0);
  const noisePeak = Math.max(velocity * p.level * (0.6 + velocity * 0.3), 0.0001);
  noiseGain.gain.linearRampToValueAtTime(noisePeak, t0 + 0.001);
  noiseGain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.001 + p.decay);

  const mixGain = ctx.createGain();
  mixGain.gain.value = 1;
  toneOsc.connect(toneGain);
  toneGain.connect(mixGain);
  noiseSrc.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(mixGain);
  mixGain.connect(out);

  const toneStop = t0 + 0.001 + toneDecay + 0.05;
  const tailEnd = t0 + 0.001 + p.decay + 0.05;
  toneOsc.start(t0);
  toneOsc.stop(toneStop);
  noiseSrc.start(t0);
  noiseSrc.stop(tailEnd);

  return {
    nodes: [toneOsc, toneGain, noiseSrc, filter, noiseGain, mixGain],
    envGain: mixGain,
    tEnd: tailEnd,
  };
}

/** CLUSTER — Closed Hat, Open Hat, Crash. Three detuned square oscillators summed, then a
 *  highpass filter — the inharmonic counterpart to Overtone Synth's harmonic partial stack
 *  (file header). cpuWeight 21 = 10 (osc0 + shared env/mix gain, the measured "plain voice"
 *  unit) + 1 + 1 (osc1/osc2's own small trim gains, §11.1a's marginal-partial precedent) + 9
 *  (highpass filter). Same recipe at three tunings/envelopes — Closed vs. Open Hat costs the
 *  same and differs only in decay, exactly like the Thump family's three tunings. */
function triggerCluster(ctx, out, p, velocity, t0) {
  const RATIOS = [1, 1.47, 2.03]; // inharmonic — metallic, not a harmonic series
  const mixGain = ctx.createGain(); // osc0's own gain AND this voice's overall envelope
  mixGain.gain.setValueAtTime(0, t0);
  const peak = Math.max(velocity * p.level, 0.0001);
  mixGain.gain.linearRampToValueAtTime(peak, t0 + 0.001);
  const tailEnd0 = t0 + 0.001 + p.decay;
  mixGain.gain.exponentialRampToValueAtTime(0.0008, tailEnd0);

  // velocity widens the detune spread on the two upper oscillators: a harder hit shimmers
  // more, on top of the filter brightening below (seat q4 — two independent moves, not one).
  const spread = 1 + velocity * 0.01;

  const nodes = [mixGain];
  const stopAt = tailEnd0 + 0.05;
  RATIOS.forEach((ratio, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(p.root * ratio * (i > 0 ? spread : 1), t0);
    nodes.push(osc);
    if (i === 0) {
      osc.connect(mixGain);
    } else {
      const trim = ctx.createGain();
      trim.gain.value = 0.5;
      osc.connect(trim);
      trim.connect(mixGain);
      nodes.push(trim);
    }
    osc.start(t0);
    osc.stop(stopAt);
  });

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  // velocity brightens the filter: harder hit -> higher highpass cutoff (seat q4).
  filter.frequency.setValueAtTime(p.filterFreq + velocity * 1500, t0);
  filter.Q.value = 0.7;
  mixGain.connect(filter);
  filter.connect(out);
  nodes.push(filter);

  return { nodes, envGain: mixGain, tEnd: stopAt };
}

/** BURST NOISE — Clap. One filtered noise voice, gain-shaped into a few quick bursts before
 *  its tail, simulating several hands slightly out of sync — no extra nodes needed, only
 *  extra automation points on the one gain. cpuWeight 19 = 10 (noise source+gain,
 *  PROVISIONAL floor) + 9 (bandpass filter). */
function triggerBurstNoise(ctx, out, p, velocity, t0, noiseBuffer) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  // velocity brightens the noise (seat q4), same move as the Snare's noise branch.
  filter.frequency.setValueAtTime(p.filterFreq + velocity * 600, t0);
  filter.Q.value = 1.1;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t0);
  const peak = Math.max(velocity * p.level, 0.0001);

  let t = t0;
  const BURSTS = 3;
  for (let i = 0; i < BURSTS; i++) {
    gain.gain.linearRampToValueAtTime(peak, t + 0.002);
    gain.gain.linearRampToValueAtTime(peak * 0.15, t + 0.002 + p.burstSpacing * 0.5);
    t += p.burstSpacing;
  }
  gain.gain.linearRampToValueAtTime(peak * 0.6, t + 0.005);
  const tailEnd = t + p.decay;
  gain.gain.exponentialRampToValueAtTime(0.0008, tailEnd);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  const stopAt = tailEnd + 0.05;
  src.start(t0);
  src.stop(stopAt);

  return { nodes: [src, filter, gain], envGain: gain, tEnd: stopAt };
}

const BUILDERS = {
  thump: triggerThump,
  noiseTone: triggerNoiseTone,
  cluster: triggerCluster,
  burstNoise: triggerBurstNoise,
};

// ---------------------------------------------------------------------------------------
// VOICE — a thin wrapper around one builder's output, giving every hit the same §11.1-shaped
// surface (`cpuWeight`, `state`, `steal(atTime)`, `free()`) regardless of which of the four
// recipes built it. Never exported — "an instrument owns a pool of voices; it never exposes
// them outside itself" (§11.1), same rule this codebase's other two instrument files follow.
//
// One-shot design (file header, NOTE ON NOTE-OFF): there is no `trigger()`/`release()` pair
// here the way §11.1's Voice has — the builder above already scheduled the complete envelope
// at construction, so this wrapper's job is bookkeeping (state, disconnect, dedupe with
// voicePool) and the one real external action a governed voice pool needs: `steal()`.
// ---------------------------------------------------------------------------------------
class Voice {
  constructor(ctx, built, cpuWeight) {
    this._ctx = ctx;
    this._nodes = built.nodes;
    this._envGain = built.envGain;
    this._cpuWeight = cpuWeight;
    this._state = 'attacking';
    this._freeTimer = null;
    this._settleTimers = [];
    this.onFree = null;

    const now = ctx.currentTime;
    const toEnd = Math.max(0, built.tEnd - now);
    // Approximate state timeline for introspection (§11.1's state enum) — a one-shot has no
    // externally-driven release, so 'sustaining'/'releasing' are time-based estimates rather
    // than event-driven, logged as a simplification in this seat's receipt.
    this._settleTimers.push(
      setTimeout(() => {
        if (this._state === 'attacking') this._state = 'sustaining';
      }, 5)
    );
    this._settleTimers.push(
      setTimeout(
        () => {
          if (this._state === 'sustaining') this._state = 'releasing';
        },
        Math.max(5, toEnd * 0.4 * 1000)
      )
    );
    this._freeTimer = setTimeout(() => this.free(), toEnd * 1000 + 5);
  }

  get cpuWeight() {
    return this._cpuWeight;
  }

  get state() {
    return this._state;
  }

  /** steal(atTime) per §10-A/§11.1: forced release, linear fade to 0 over 5ms, then free() —
   *  never an abrupt stop. Fades the one node every recipe designates as `envGain`. */
  steal(atTime) {
    if (this._state === 'free' || this._state === 'stealing') return;
    const t0 = atTime ?? this._ctx.currentTime;
    const g = this._envGain.gain;
    const current = g.value;
    this._clearTimers();
    this._state = 'stealing';
    g.cancelScheduledValues(t0);
    g.setValueAtTime(current, t0);
    g.linearRampToValueAtTime(0, t0 + 0.005);
    const freeMs = Math.max(0, t0 + 0.005 - this._ctx.currentTime) * 1000 + 5;
    this._freeTimer = setTimeout(() => this.free(), freeMs);
  }

  /** free() per §11.1: disconnects every node this voice owns, deregisters from voicePool,
   *  drops the voice from the instrument's own pool (via onFree). Idempotent. */
  free() {
    if (this._state === 'free') return;
    this._clearTimers();
    this._state = 'free';
    for (const node of this._nodes) {
      try {
        if (typeof node.stop === 'function') node.stop();
      } catch (e) {
        // already stopped, or never started on this path — never abrupt, never throws out
      }
      try {
        node.disconnect();
      } catch (e) {
        /* already disconnected */
      }
    }
    voicePool.release(this);
    if (typeof this.onFree === 'function') this.onFree();
  }

  _clearTimers() {
    for (const t of this._settleTimers) clearTimeout(t);
    this._settleTimers = [];
    if (this._freeTimer) {
      clearTimeout(this._freeTimer);
      this._freeTimer = null;
    }
  }
}

// ---------------------------------------------------------------------------------------
// STYLES — read `/src/ui/tokens.css` custom properties (§9), fallbacks byte-identical to
// that file's own values, same pattern `wave-synth.js`/`overtone-synth.js` already use. A
// <style> tag is not an AudioNode or a listener, so it is not part of dispose()'s "zero
// leaked nodes/listeners" count (seat question 7).
// ---------------------------------------------------------------------------------------
let stylesInjected = false;
function ensureStylesInjected() {
  if (stylesInjected || document.getElementById('drum-synth-styles')) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'drum-synth-styles';
  style.textContent = `
.dsyn-root { box-sizing: border-box; font-family: system-ui, sans-serif; color: var(--text, #f2f6fc); background: var(--panel, #1b2332); border: 1px solid var(--line, #3a485f); border-radius: 6px; }
.dsyn-root *, .dsyn-root *::before, .dsyn-root *::after { box-sizing: border-box; }
.dsyn-compact { padding: 6px 8px; font-size: 11px; display: flex; flex-direction: column; gap: 6px; width: 100%; }
.dsyn-expanded { padding: 28px 36px; font-size: 16px; display: flex; flex-direction: column; gap: 18px; width: 100%; min-height: 100%; background: var(--bg, #0a0d13); }
.dsyn-title { display: none; }
.dsyn-expanded .dsyn-title { display: block; font-size: 28px; font-weight: 700; letter-spacing: 0.02em; color: var(--text, #f2f6fc); }
.dsyn-pads { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.dsyn-expanded .dsyn-pads { grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 6px; }
.dsyn-pad { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; background: transparent; border: 1px solid var(--line, #3a485f); border-radius: 4px; color: var(--text, #f2f6fc); padding: 8px 4px; cursor: pointer; font: inherit; transition: background 80ms ease-out, border-color 80ms ease-out; }
.dsyn-expanded .dsyn-pad { padding: 18px 8px; border-radius: 10px; font-size: 0.9em; }
.dsyn-pad.dsyn-flash { background: var(--accent, #34e5b4); background: color-mix(in srgb, var(--accent, #34e5b4) 35%, transparent); border-color: var(--accent, #34e5b4); }
.dsyn-pad-label { font-weight: 600; }
.dsyn-pad-note { color: var(--text-dim, #93a1b8); font-size: 0.75em; }
.dsyn-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dsyn-label { color: var(--text-dim, #93a1b8); font-size: 0.85em; min-width: 3.6em; }
.dsyn-expanded .dsyn-label { font-size: 0.65em; text-transform: uppercase; letter-spacing: 0.06em; }
.dsyn-root input[type="range"] { accent-color: var(--accent, #34e5b4); flex: 1; min-width: 60px; }
.dsyn-readout { color: var(--text-dim, #93a1b8); font-variant-numeric: tabular-nums; min-width: 3.8em; text-align: right; }
.dsyn-piece { border-top: 1px solid var(--line, #3a485f); padding-top: 10px; margin-top: 4px; display: flex; flex-direction: column; gap: 6px; }
.dsyn-piece:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
.dsyn-piece-head { display: flex; align-items: center; gap: 10px; }
.dsyn-piece-title { font-weight: 700; }
.dsyn-weight { color: var(--text-dim, #93a1b8); font-size: 0.7em; }
.dsyn-meter { color: var(--text-dim, #93a1b8); font-size: 0.75em; font-variant-numeric: tabular-nums; }
`;
  document.head.appendChild(style);
  stylesInjected = true;
}

// ---------------------------------------------------------------------------------------
// INSTRUMENT — CONTRACTS §2, method for method.
// ---------------------------------------------------------------------------------------

export default class DrumSynth {
  static id = 'drum-synth';
  static label = 'Drum Synth';
  static playable = true;

  // §2 amendment additions.
  static needsLoad = false; // no async load work — pure math, ready() resolves immediately
  // §2 amendment 3 / §14.5: the grid's ENTIRE knowledge of this instrument. index/note are
  // §14.1's frozen values; label is §14.1's own PROVISIONAL word, carried verbatim.
  static pieces = PIECE_DEFS.map((d) => ({ index: d.index, note: d.note, label: d.label }));
  static emitsNotes = false; // consumes notes only; never drives another instrument

  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;

    // §11.6's pattern, applied here though not contract-required for a drum instrument
    // (§11.6 is written against the two P1 synths' spectrum/scope inversion specifically):
    // one AnalyserNode, created once, after every live voice is summed, before `out` — so it
    // sees the instrument's real current mix. Returned for BOTH 'spectrum' and 'scope' below
    // (getAnalyser) since nothing in CONTRACTS restricts a drum instrument's tap to one —
    // logged as this seat's own reasonable default, not a contract requirement.
    this._masterGain = ctx.createGain();
    this._masterGain.gain.value = 1;
    this._analyser = ctx.createAnalyser();
    this._analyser.fftSize = 2048;
    this._analyser.maxDecibels = -15;
    this._masterGain.connect(this._analyser);
    this._analyser.connect(this.out);

    this._gain = 1.0; // out.gain — this file's own addition, matching wave-synth's pattern

    this._noteToIndex = new Map(PIECE_DEFS.map((d) => [d.note, d.index]));
    this._params = PIECE_DEFS.map((d) => defaultParamsFor(d));

    /** Live one-shot voices. Never exposed outside this class (§11.1). */
    this._voices = new Set();

    this._mounts = { compact: null, expanded: null };
    this._domListenersByMount = { compact: [], expanded: [] };
    this._flashTimers = [];
    this._pieceRefs = { compact: [], expanded: [] }; // DOM refs for targeted UI updates
  }

  // ---- async ready (§2 amendment 1) ----
  async ready() {
    // Every piece is synthesized math — nothing to decode, nothing to await.
    return;
  }

  // ---- note input ----
  /** noteOn(note, velocity, atTime) per §2, §11.7a's velocity default, and §14.5's "a piece
   *  is played by its note through noteOn, exactly as every other instrument in this app is
   *  played." `note` here is a PIECE SELECTOR (matched against §14.1's fixed table), not a
   *  pitch — unlike Wave/Overtone Synth, this instrument never calls midiToFreq(note); each
   *  piece's own `tune`/`root` param sets its actual synthesis frequency. An unrecognized
   *  note number is a silent no-op (§11.7b's precedent, applied here for the same reason: a
   *  thrown exception on a caller-driven, scheduled event must never happen). */
  noteOn(note, velocity = 0.8, atTime) {
    const idx = this._noteToIndex.get(note);
    if (idx === undefined) return; // not one of the eight pieces — silent no-op
    const def = PIECE_DEFS[idx];
    const t0 = atTime ?? this.ctx.currentTime;
    const v = clamp(velocity, 0, 1);
    const cost = def.weight;

    // §11.2's allocate/steal-retry sequence, identical in shape to wave-synth.js/
    // overtone-synth.js: steal() (§11.2a) deregisters synchronously, so the retry below is
    // checking a count that has actually changed in this same tick.
    if (!governor.request(cost)) {
      const stolen = voicePool.steal();
      if (stolen) stolen.steal(t0);
      if (!governor.request(cost)) {
        console.warn(
          '[drum-synth] governor still refused after one steal-retry; allocating anyway ' +
            'per §10-A ("a note is never refused").'
        );
      }
    }

    const build = BUILDERS[def.family];
    const built = build(this.ctx, this._masterGain, this._params[idx], v, t0, getNoiseBuffer(this.ctx));
    const voice = new Voice(this.ctx, built, cost);
    voice.onFree = () => {
      this._voices.delete(voice);
      this._reflectActivity(idx, false);
    };

    voicePool.register(voice, DrumSynth.id);
    this._voices.add(voice);
    this._reflectActivity(idx, true);
  }

  /** noteOff(note, atTime) — documented no-op. See file header, NOTE ON NOTE-OFF: every
   *  piece here is a one-shot that schedules its complete envelope at trigger time, matching
   *  a real drum machine, where releasing the pad does not cut the sound. Never throws;
   *  present and callable exactly as §2 requires the method to exist. */
  noteOff(note, atTime) {
    // intentional no-op — see file header
  }

  /** allNotesOff() — the panic/stop-transport path. Unlike noteOff, this DOES cut every
   *  live voice immediately (steal's 5ms fade, §10-A), since "all notes off" is a hard stop
   *  a transport-stop or dispose-adjacent action needs, not a per-pad release. */
  allNotesOff() {
    const t0 = this.ctx.currentTime;
    for (const voice of Array.from(this._voices)) voice.steal(t0);
  }

  // ---- note emission (§2 amendment 4) — no-op, emitsNotes is false ----
  onNoteOut(_fn) {
    // Drum Synth only consumes notes; it never drives another instrument.
  }
  offNoteOut(_fn) {
    // matches onNoteOut — no-op.
  }

  // ---- params — `piece.<index>.<key>` per-piece (this file's own addition, see PIECE_DEFS
  // comment) plus `out.gain` (matching wave-synth's own pattern). §11.7b's error convention,
  // applied here as this seat's consistent choice: unrecognized path -> silent no-op /
  // undefined, never a throw — §7's automation and P5's preset loader call these
  // programmatically, at scheduled times, on user-authored data. ----
  setParam(path, value) {
    if (path === 'out.gain') {
      if (typeof value !== 'number' || !Number.isFinite(value)) return;
      this._gain = clamp(value, 0, 1);
      this._masterGain.gain.setValueAtTime(this._gain, this.ctx.currentTime);
      this._syncUI();
      return;
    }
    const m = /^piece\.([0-7])\.([A-Za-z]+)$/.exec(path);
    if (!m) return; // unrecognized path — silent no-op
    const idx = Number(m[1]);
    const key = m[2];
    const def = PIECE_DEFS[idx];
    const clamped = clampParam(def, key, value);
    if (clamped === undefined) return; // unknown param for this piece, or non-numeric value
    this._params[idx][key] = clamped;
    this._syncUI();
    // No live-voice propagation: every hit's envelope/pitch/filter automation is already
    // fully scheduled at trigger time (file header, NOTE ON NOTE-OFF) — a param edit shapes
    // the NEXT hit, exactly like Wave Synth's `osc.wave`/`osc.octave` (§11.7c rules live
    // propagation for `env.*` only; this instrument exposes no `env.*` surface at all).
  }

  getParam(path) {
    if (path === 'out.gain') return this._gain;
    const m = /^piece\.([0-7])\.([A-Za-z]+)$/.exec(path);
    if (!m) return undefined;
    const idx = Number(m[1]);
    const key = m[2];
    if (!(key in this._params[idx])) return undefined;
    return this._params[idx][key];
  }

  // ---- state — lossless JSON round-trip (seat question 3) ----
  getState() {
    return {
      gain: this._gain,
      pieces: this._params.map((p) => ({ ...p })), // index-ordered, plain, JSON-safe
    };
  }

  setState(obj) {
    // §11.7b's precedent: a malformed argument is a silent no-op, never a throw.
    if (!obj || typeof obj !== 'object') return;
    if (Number.isFinite(obj.gain)) this.setParam('out.gain', obj.gain);
    if (Array.isArray(obj.pieces)) {
      for (let i = 0; i < PIECE_DEFS.length && i < obj.pieces.length; i++) {
        const p = obj.pieces[i];
        if (!p || typeof p !== 'object') continue;
        for (const key of Object.keys(PIECE_DEFS[i].params)) {
          if (Number.isFinite(p[key])) this.setParam(`piece.${i}.${key}`, p[key]);
        }
      }
    }
  }

  // ---- governor reporting — honest, live (seat question 5) ----
  get voiceCount() {
    return this._voices.size;
  }

  get cpuWeight() {
    // Live one-shot voices' fixed cost + this instrument's always-on AnalyserNode, matching
    // wave-synth.js's/overtone-synth.js's own "must include the analyser, not just live
    // voices" reading of §11.6.
    let total = ANALYSER_COST;
    for (const v of this._voices) total += v.cpuWeight;
    return total;
  }

  // ---- analysis tap (seat question 6 relates; §2 amendment 2) ----
  getAnalyser(which) {
    if (which === 'spectrum' || which === 'scope') return this._analyser;
    return null;
  }

  // ---- mounting (seat question 6) ----
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
    for (const t of this._flashTimers) clearTimeout(t);
    this._flashTimers = [];
    for (const which of ['compact', 'expanded']) {
      listenersDropped += this._domListenersByMount[which].length;
      this._clearMountListeners(which);
      const el = this._mounts[which];
      if (el) el.innerHTML = '';
      this._mounts[which] = null;
      this._pieceRefs[which] = [];
    }
    return listenersDropped;
  }

  // ---- teardown (seat question 7) ----
  dispose() {
    let nodesDisconnected = 0;
    const listenersDropped = this.unmount();

    // Teardown, not a musical note-off: free every live voice immediately (no tail, no
    // steal-fade) so no orphaned timer can fire against a node this instrument is about to
    // disconnect. free() is idempotent and self-guards re-entry.
    for (const voice of Array.from(this._voices)) {
      nodesDisconnected += voice._nodes.length;
      voice.free();
    }
    this._voices.clear();

    try {
      this._masterGain.disconnect();
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

  /** Full DOM build. Compact: eight small pads only — "conservative, tight" (seat q6).
   *  Expanded: eight pads, each followed by its own live, playable parameter row — "each
   *  piece's parameters are visible and playable" (seat q6, verbatim). */
  _paint(which) {
    const el = this._mounts[which];
    if (!el) return;
    this._clearMountListeners(which);
    for (const t of this._flashTimers) clearTimeout(t);
    this._flashTimers = [];
    el.innerHTML = '';

    const expanded = which === 'expanded';
    const root = document.createElement('div');
    root.className = `dsyn-root ${expanded ? 'dsyn-expanded' : 'dsyn-compact'}`;

    const title = document.createElement('div');
    title.className = 'dsyn-title';
    title.textContent = 'Drum Synth';
    root.appendChild(title);

    const pads = document.createElement('div');
    pads.className = 'dsyn-pads';
    root.appendChild(pads);

    this._pieceRefs[which] = [];

    for (const def of PIECE_DEFS) {
      const pad = document.createElement('button');
      pad.type = 'button';
      pad.className = 'dsyn-pad';
      pad.dataset.pieceIndex = String(def.index);
      pad.innerHTML = `<span class="dsyn-pad-label">${def.label}</span><span class="dsyn-pad-note">#${def.index}</span>`;
      this._listen(which, pad, 'pointerdown', () => {
        const velInput = this._pieceRefs[which][def.index]?.velocity;
        const vel = velInput ? Number(velInput.value) : 0.8;
        this.noteOn(def.note, vel);
      });
      pads.appendChild(pad);

      const refs = { pad, velocity: null, params: {}, weight: null };
      this._pieceRefs[which][def.index] = refs;

      if (expanded) {
        const section = document.createElement('div');
        section.className = 'dsyn-piece';

        const head = document.createElement('div');
        head.className = 'dsyn-piece-head';
        head.innerHTML =
          `<span class="dsyn-piece-title">${def.label}</span>` +
          `<span class="dsyn-weight">cpuWeight ${def.weight}</span>` +
          `<span class="dsyn-weight">note ${def.note}</span>`;
        section.appendChild(head);

        const velRow = document.createElement('div');
        velRow.className = 'dsyn-row';
        velRow.innerHTML = `<span class="dsyn-label">Velocity</span>`;
        const velInput = document.createElement('input');
        velInput.type = 'range';
        velInput.min = '0';
        velInput.max = '1';
        velInput.step = '0.01';
        velInput.value = '0.8';
        velRow.appendChild(velInput);
        const velReadout = document.createElement('span');
        velReadout.className = 'dsyn-readout';
        velReadout.textContent = '0.80';
        velRow.appendChild(velReadout);
        this._listen(which, velInput, 'input', () => {
          velReadout.textContent = Number(velInput.value).toFixed(2);
        });
        section.appendChild(velRow);
        refs.velocity = velInput;

        for (const key of Object.keys(def.params)) {
          const spec = def.params[key];
          const row = document.createElement('div');
          row.className = 'dsyn-row';
          const label = document.createElement('span');
          label.className = 'dsyn-label';
          label.textContent = key;
          row.appendChild(label);
          const input = document.createElement('input');
          input.type = 'range';
          input.min = String(spec.min);
          input.max = String(spec.max);
          input.step = String(spec.step);
          input.value = String(this._params[def.index][key]);
          input.dataset.paramKey = key; // distinguishes this row from the velocity slider above
          row.appendChild(input);
          const readout = document.createElement('span');
          readout.className = 'dsyn-readout';
          row.appendChild(readout);
          this._listen(which, input, 'input', () => {
            this.setParam(`piece.${def.index}.${key}`, Number(input.value));
          });
          section.appendChild(row);
          refs.params[key] = { input, readout };
        }

        root.appendChild(section);
      }
    }

    if (expanded) {
      const gainRow = document.createElement('div');
      gainRow.className = 'dsyn-row';
      gainRow.innerHTML = `<span class="dsyn-label">Out Gain</span>`;
      const gainInput = document.createElement('input');
      gainInput.type = 'range';
      gainInput.min = '0';
      gainInput.max = '1';
      gainInput.step = '0.01';
      gainInput.value = String(this._gain);
      gainRow.appendChild(gainInput);
      const gainReadout = document.createElement('span');
      gainReadout.className = 'dsyn-readout';
      gainRow.appendChild(gainReadout);
      this._listen(which, gainInput, 'input', () => this.setParam('out.gain', Number(gainInput.value)));
      root.appendChild(gainRow);
      this._gainRefs = this._gainRefs || {};
      this._gainRefs[which] = { input: gainInput, readout: gainReadout };

      const meter = document.createElement('div');
      meter.className = 'dsyn-meter';
      root.appendChild(meter);
      this._meterRefs = this._meterRefs || {};
      this._meterRefs[which] = meter;
    }

    el.appendChild(root);
    this._syncUI();
  }

  /** Targeted updates only — param readouts and slider values. Never rebuilds DOM, so it is
   *  safe to call on every setParam(). Skips writing into a range input the student is
   *  actively dragging (document.activeElement guard), same pattern wave-synth.js uses. */
  _syncUI() {
    for (const which of ['compact', 'expanded']) {
      const el = this._mounts[which];
      if (!el) continue;
      const refsByIndex = this._pieceRefs[which];
      if (!refsByIndex) continue;
      for (const def of PIECE_DEFS) {
        const refs = refsByIndex[def.index];
        if (!refs) continue;
        for (const key of Object.keys(refs.params)) {
          const { input, readout } = refs.params[key];
          const value = this._params[def.index][key];
          if (document.activeElement !== input) input.value = String(value);
          const spec = def.params[key];
          readout.textContent = spec.step < 1 ? value.toFixed(3) : String(Math.round(value));
        }
      }
      if (this._gainRefs && this._gainRefs[which]) {
        const { input, readout } = this._gainRefs[which];
        if (document.activeElement !== input) input.value = String(this._gain);
        readout.textContent = this._gain.toFixed(2);
      }
      if (this._meterRefs && this._meterRefs[which]) {
        this._meterRefs[which].textContent = `voices ${this.voiceCount} · cpuWeight ${this.cpuWeight}`;
      }
    }
  }

  /** Flashes the pad for `idx` in every live mount while its voice is starting, and clears
   *  the flash on a timer sized to that piece's rough transient length — cheap, DOM-only,
   *  never an AudioNode/listener leak concern (seat q7's count is about nodes/listeners, not
   *  CSS classes), timers are tracked in `_flashTimers` and cleared by unmount()/_paint(). */
  _reflectActivity(idx, active) {
    for (const which of ['compact', 'expanded']) {
      const refs = this._pieceRefs[which] && this._pieceRefs[which][idx];
      if (!refs) continue;
      if (active) {
        refs.pad.classList.add('dsyn-flash');
        const t = setTimeout(() => refs.pad.classList.remove('dsyn-flash'), 120);
        this._flashTimers.push(t);
      }
    }
    if (active) {
      // live meter readout, both mounts, cheap targeted write
      for (const which of ['compact', 'expanded']) {
        if (this._meterRefs && this._meterRefs[which]) {
          this._meterRefs[which].textContent = `voices ${this.voiceCount} · cpuWeight ${this.cpuWeight}`;
        }
      }
    }
  }
}

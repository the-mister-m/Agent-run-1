/**
 * core/audio.js — the single AudioContext, the master chain, the voice pool, the CPU
 * governor/probe. Nothing else. Built by `audio-core`, P1/S2.
 *
 * Owns: CONTRACTS §1 file layout entry for this file · §2's `(ctx, out)` handoff to every
 * instrument · §3's `audio.state` / `audio.unlock()` / `audio.on('unlocked', fn)` ·
 * §8's `governor.load` / `governor.noCap` / `governor.request(cost)` · §10-A voice
 * stealing order, executed through §11.2's `voicePool` registry.
 *
 * Does NOT own: the `Voice` class (§11.1 — built per-instrument by wave-voice /
 * overtone-voice, P1/S3), `clock.js` (P2), `state.js`, or any instrument/surface file.
 * This module never imports anything and is never itself imported by CONTRACTS.md.
 *
 * There is exactly one AudioContext in the whole app (§10). This file is the only place
 * one is ever constructed.
 */

// ---------------------------------------------------------------------------------------
// 1 · THE ONE AUDIOCONTEXT  (seat question 1)
// ---------------------------------------------------------------------------------------

const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

/** The single AudioContext. Every instrument's `constructor(ctx, out)` receives this
 *  exact instance (§2). Nothing in this codebase may construct a second one (§10). */
export const ctx = new AudioContextCtor();

// ---------------------------------------------------------------------------------------
// 2 · THE MASTER CHAIN  (seat question 2)
// ---------------------------------------------------------------------------------------
//
// Node order, instrument channel input → speakers:
//
//   <instrument's own chain, ending at its per-instrument AnalyserNode per §11.6 —
//    NOT owned by this file, owned by the instrument>
//     → channel gain node (createChannel(), below — this file's answer to "how does an
//       instrument's `out` node come to exist" before mixer/strip.js exists in P4)
//     → masterGain
//     → masterAnalyser   ← the analysis tap this module owns
//     → ctx.destination
//
// §11.6 already defines the per-instrument tap (one AnalyserNode per instrument, after
// its voices are summed, before `out`) — that node belongs to the instrument, not this
// file, and is not duplicated here. `masterAnalyser` is a second, separate tap: the one
// point downstream of every channel where this seat can independently confirm a real,
// non-silent signal is reaching the master chain — see the DONE-CHECK in the receipt for
// why that independent confirmation matters in an environment with no audio output device.

/** Sums every channel. The only node any channel connects into. */
export const masterGain = ctx.createGain();
masterGain.gain.value = 1;

/** The master-level analysis tap. Post-sum, pre-destination. Read-only for consumers —
 *  same rule §2 gives every per-instrument analyser: a reader never reconnects it. */
export const masterAnalyser = ctx.createAnalyser();
masterAnalyser.fftSize = 2048;

masterGain.connect(masterAnalyser);
masterAnalyser.connect(ctx.destination);

// node -> synthVoiceId, or null for a channel that never normalizes (drums, metronome).
const channels = new Map();

/**
 * Creates one channel input node and wires it into the master chain. This is what a
 * shell hands an instrument as `constructor(ctx, out)`'s `out` (§2). Not named anywhere
 * in CONTRACTS today — logged as an open decision in this seat's receipt: before
 * `mixer/strip.js` exists (P4), something has to produce the node §2 promises every
 * instrument, and "the master chain" is explicitly this seat's job (STAGE.md).
 *
 * `synthVoiceId` is the opt-in for synth voice normalization (section 4a). Pass an
 * instrument id and this channel's gain tracks that instrument's live voice count; pass
 * nothing and the gain stays at 1 for the life of the channel.
 */
export function createChannel(synthVoiceId = null) {
  const node = ctx.createGain();
  node.gain.value = 1;
  node.connect(masterGain);
  channels.set(node, synthVoiceId);
  return node;
}

/** Disconnects and forgets a channel created by createChannel(). */
export function releaseChannel(node) {
  if (!channels.has(node)) return;
  node.disconnect();
  channels.delete(node);
}

// ---------------------------------------------------------------------------------------
// 3 · AUTOPLAY POLICY  (seat question 4)
// ---------------------------------------------------------------------------------------
// Per CONTRACTS §3's amendment and findings-webaudio.md Q4a: assume `suspended` at load,
// never block startup on sound, resume on the first real user gesture, and stay silent
// (never throw) if resume is attempted before one. `unlock()` is idempotent and safe to
// call repeatedly — CONTRACTS' own required shape.

const listeners = { unlocked: new Set() };

function emit(event) {
  for (const fn of listeners[event]) {
    try {
      fn();
    } catch (err) {
      // a subscriber's own bug must never break the core.
      console.error('[audio.js] listener for "%s" threw:', event, err);
    }
  }
}

let unlockedFlag = false;

/** Idempotent. Call from ANY real user gesture (§3). Safe to call repeatedly, safe to
 *  call before a real gesture exists (the browser's own gesture gate is what blocks
 *  `resume()` in that case — this function does not need to know which). */
export function unlock() {
  if (unlockedFlag || ctx.state === 'closed') return Promise.resolve();
  return ctx
    .resume()
    .then(() => {
      if (!unlockedFlag && ctx.state === 'running') {
        unlockedFlag = true;
        emit('unlocked');
      }
    })
    .catch(() => {
      // resume() can reject before a genuine gesture in some browsers. Silent — the
      // fallback gesture listeners below retry on the next real gesture. Never throw:
      // "nothing may block startup waiting for it" (§3).
    });
}

// Fallback safety net: even if every surface forgets to call unlock() on its own first
// event (§3 assigns that duty to surfaces, not this file), the app must never be left
// silently dead. One-time listeners on the most general gesture types, removed on the
// first fire and counted again in dispose() if dispose() runs before one ever fires.
const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart'];
function gestureHandler() {
  unlock();
}
for (const evt of GESTURE_EVENTS) {
  window.addEventListener(evt, gestureHandler, { passive: true });
}

/** §3's documented shape: `audio.state`, `audio.unlock()`, `audio.on('unlocked', fn)`. */
export const audio = {
  get state() {
    return ctx.state;
  },
  unlock,
  on(event, fn) {
    if (!listeners[event]) throw new Error(`audio.on: no such event "${event}"`);
    listeners[event].add(fn);
  },
  off(event, fn) {
    if (listeners[event]) listeners[event].delete(fn);
  },
};

// ---------------------------------------------------------------------------------------
// 4 · VOICE POOL — allocation, stealing, freeing  (seat question 3)
// ---------------------------------------------------------------------------------------
// Implements §11.2 exactly. This file does not define `Voice` (§11.1 — that is
// wave-voice's / overtone-voice's lane, P1/S3) and does not call trigger()/release()/
// steal() on one. It only tracks the registry and picks who to steal from.
//
// §11.1's Voice.state exposes 'attacking'|'sustaining'|'releasing'|'stealing'|'free' but
// the contract gives voicePool no push notification when a voice enters 'releasing' — a
// voice's own release()/steal() are called by the instrument directly, never through this
// registry. To implement §10-A's "longest-released voice first" without inventing a new
// callback CONTRACTS does not define, this registry lazily timestamps (in
// performance.now() ms, monotonic regardless of ctx.state) the first moment it *observes*
// a registered voice reporting 'releasing', on every register/release/steal call. Logged
// in the receipt as an interpretation of an underspecified boundary, not a contract change.

const registry = new Map(); // voice -> { instrumentId, registeredAt, releasingSince, cost }

function sweepRegistry() {
  const now = performance.now();
  for (const [voice, meta] of registry) {
    if (voice.state === 'releasing') {
      if (meta.releasingSince === null) meta.releasingSince = now;
    } else {
      meta.releasingSince = null;
    }
  }
}

// ---------------------------------------------------------------------------------------
// 4a · SYNTH VOICE NORMALIZATION
// ---------------------------------------------------------------------------------------
// Channel gain scales with that channel's weighted voice count: gain(n) = n ** -exponent
// for n > 1, else 1. A channel created without a synthVoiceId is skipped and holds gain 1.
// A voice weighs 0 before its start time, 1 while held, and falls linearly to 0 across
// the fade it reports through voicePool.fade(). The whole future gain curve is rebuilt
// from those times on every change: a duck lands as a step at the voice's start time,
// recovery follows the fade.

const normState = { mode: 'per-instrument', exponent: 0.8, responseMs: .05, voiceLayer: true };

// voice -> { instrumentId, start, points }, in ctx seconds. `points` is null while held,
// else [[t, w], ...]: weight 1 up to the first point, linear between points, 0 after the
// last. Kept until free(), so a stolen voice still weighs across its 5 ms fade after the
// governor stops counting it.
const weights = new Map();

// Linear pieces per unit of count change on one curve segment.
const CURVE_STEPS_PER_VOICE = 8;
const CURVE_STEPS_MAX = 32;

function clamp(v, lo, hi) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
}

/** One voice's weight at time t. `left` reads the instant just before t. */
function weightAt(w, t, left = false) {
  if (left ? t <= w.start : t < w.start) return 0;
  const p = w.points;
  if (p === null || t <= p[0][0]) return 1;
  for (let i = 1; i < p.length; i++) {
    const [t1, w1] = p[i];
    if (t < t1) {
      const [t0, w0] = p[i - 1];
      return w0 + ((w1 - w0) * (t - t0)) / (t1 - t0);
    }
  }
  return 0;
}

/** Summed weight of `list` at time t. */
function countAt(list, t, left = false) {
  let n = 0;
  for (const w of list) n += weightAt(w, t, left);
  return n;
}

/** Channel gain for a weighted count. One voice or less holds 1. */
function gainFor(n) {
  if (normState.mode === 'off' || n <= 1) return 1;
  return Math.pow(n, -normState.exponent);
}

/** Weight entries per normalizing channel id, plus every entry under 'all'. */
function weightLists() {
  const lists = new Map();
  for (const id of channels.values()) if (id !== null) lists.set(id, []);
  const all = [];
  for (const w of weights.values()) {
    const list = lists.get(w.instrumentId);
    if (!list) continue;
    list.push(w);
    all.push(w);
  }
  return { lists, all };
}

/** Weighted voice count per normalizing channel id at time t. Zero-filled. */
function synthVoiceCounts(t = ctx.currentTime) {
  const counts = new Map();
  const { lists } = weightLists();
  for (const [id, list] of lists) counts.set(id, countAt(list, t));
  return counts;
}

/** Writes one channel's gain curve from `at` to the last breakpoint in `list`. */
function writeCurve(param, list, at) {
  const times = new Set();
  for (const w of list) {
    if (w.start > at) times.add(w.start);
    if (w.points) for (const [t] of w.points) if (t > at) times.add(t);
  }
  const points = Array.from(times).sort((a, b) => a - b);

  param.cancelScheduledValues(at);
  let prevT = at;
  let prevN = countAt(list, at);
  param.setValueAtTime(gainFor(prevN), at);

  for (const t of points) {
    const leftN = countAt(list, t, true);
    if (gainFor(leftN) !== gainFor(prevN)) {
      const steps = Math.min(CURVE_STEPS_MAX, Math.max(1, Math.ceil(Math.abs(leftN - prevN) * CURVE_STEPS_PER_VOICE)));
      for (let k = 1; k <= steps; k++) {
        const tk = prevT + ((t - prevT) * k) / steps;
        const nk = k === steps ? leftN : prevN + ((leftN - prevN) * k) / steps;
        param.linearRampToValueAtTime(gainFor(nk), tk);
      }
    }
    const rightN = countAt(list, t);
    if (gainFor(rightN) !== gainFor(leftN)) param.setValueAtTime(gainFor(rightN), t);
    prevT = t;
    prevN = rightN;
  }
}

/** Rebuilds every normalizing channel's gain curve from now. No-op when none exist. */
function renormalize() {
  const { lists, all } = weightLists();
  if (lists.size === 0) return;
  const at = ctx.currentTime;
  for (const [node, id] of channels) {
    if (id === null) continue;
    // master mode changes the count, never the node the gain lands on.
    writeCurve(node.gain, normState.mode === 'master' ? all : lists.get(id), at);
  }
}

let renormalizeQueued = false;

/** Coalesces every change in one task into a single rebuild. */
function queueRenormalize() {
  if (renormalizeQueued) return;
  renormalizeQueued = true;
  queueMicrotask(() => {
    renormalizeQueued = false;
    renormalize();
  });
}

/** Per-voice output gain. Set once at creation from the instrument's weighted voice count
 *  at `atTime`, this voice included. Skips the duck entirely when voiceLayer is off, so the
 *  node holds gain 1 for its whole life. */
export function createVoiceOut(instrumentId, dest, atTime) {
  const node = ctx.createGain();

  if (normState.voiceLayer) {
    const t = Number.isFinite(atTime) ? Math.max(atTime, ctx.currentTime) : ctx.currentTime;
    let n = 1;
    for (const w of weights.values()) if (w.instrumentId === instrumentId) n += weightAt(w, t);
    node.gain.value = Math.pow(n, -normState.exponent);
  }

  node.connect(dest);
  return node;
}

/** The dev box's write surface. Every setter re-ramps; bad values are dropped, not thrown. */
export const synthVoiceNorm = {
  get mode() {
    return normState.mode;
  },
  set mode(v) {
    if (v !== 'off' && v !== 'per-instrument' && v !== 'master') return;
    normState.mode = v;
    renormalize();
  },

  get exponent() {
    return normState.exponent;
  },
  set exponent(v) {
    const n = clamp(v, 0, 1);
    if (n === null) return;
    normState.exponent = n;
    renormalize();
  },

  /** Stored and reported only. The gain curve follows each voice's fade, not this value. */
  get responseMs() {
    return normState.responseMs;
  },
  set responseMs(v) {
    const n = clamp(v, 0, 120);
    if (n === null) return;
    normState.responseMs = n;
  },

  /** Per-voice duck at birth, on by default. Off leaves every createVoiceOut node at gain 1. */
  get voiceLayer() {
    return normState.voiceLayer;
  },
  set voiceLayer(v) {
    normState.voiceLayer = !!v;
  },

  /** Snapshot for the dev box readout: [{ id, voices, gain }], one per normalizing
   *  channel on this page. `voices` is the weighted count now. Empty array means no
   *  channel opted in. */
  readout() {
    const counts = synthVoiceCounts();
    let total = 0;
    for (const n of counts.values()) total += n;
    const rows = [];
    for (const [node, id] of channels) {
      if (id === null) continue;
      rows.push({ id, voices: normState.mode === 'master' ? total : counts.get(id), gain: node.gain.value });
    }
    return rows;
  },
};

// ---------------------------------------------------------------------------------------
// 4b · MASTER LIMITER
// ---------------------------------------------------------------------------------------
// One DynamicsCompressorNode, insertable between masterGain and masterAnalyser. Off by
// default and absent from the graph until switched on, so every page that never calls this
// keeps the plain masterGain -> masterAnalyser link it has always had.

let masterLimiterNode = null;

/** Inserts or removes the limiter node. Idempotent. Default off. */
export function setMasterLimiter(on) {
  const isOn = masterLimiterNode !== null;
  if (on === isOn) return;

  if (on) {
    masterGain.disconnect(masterAnalyser);
    const node = ctx.createDynamicsCompressor();
    node.threshold.value = -.5;
    node.knee.value = 0;
    node.ratio.value = 5;
    node.attack.value = 0.01;
    node.release.value = 0.05;
    masterGain.connect(node);
    node.connect(masterAnalyser);
    masterLimiterNode = node;
  } else {
    masterGain.disconnect(masterLimiterNode);
    masterLimiterNode.disconnect();
    masterLimiterNode = null;
    masterGain.connect(masterAnalyser);
  }
}

/** The live limiter node, or null when off. Read `.reduction` for the meter. */
export function getMasterLimiter() {
  return masterLimiterNode;
}

export const voicePool = {
  /** Called by an instrument's noteOn, after governor.request(cost) grants the
   *  allocation and trigger() has been called (§11.2 step 3). Never called by a voice. */
  register(voice, instrumentId, atTime) {
    const cost = typeof voice.cpuWeight === 'number' ? voice.cpuWeight : 0;
    registry.set(voice, {
      instrumentId,
      registeredAt: performance.now(),
      releasingSince: null,
      cost,
    });
    governorAllocatedWeight += cost;
    const start = Number.isFinite(atTime) ? Math.max(atTime, ctx.currentTime) : ctx.currentTime;
    weights.set(voice, { instrumentId, start, points: null });
    queueRenormalize();
  },

  /** Called by a voice whenever it schedules its release or steal fade, in ctx seconds.
   *  The weight keeps its curve up to startTime, then falls linearly from its value there
   *  to 0 at endTime. Anything it had scheduled from startTime on is dropped. */
  fade(voice, startTime, endTime) {
    const w = weights.get(voice);
    if (!w || !Number.isFinite(startTime) || !Number.isFinite(endTime)) return;
    // Faded out before it started: it never sounds and never counts.
    if (endTime <= w.start) {
      weights.delete(voice);
      queueRenormalize();
      return;
    }
    const s = Math.max(startTime, w.start);
    const e = Math.max(endTime, s + 0.0005);
    const from = weightAt(w, s);
    const kept = w.points ? w.points.filter(([t]) => t < s) : [];
    w.points = [...kept, [s, from], [e, 0]];
    queueRenormalize();
  },

  /** Called by Voice.free() once it has disconnected its own nodes (§11.1). */
  release(voice) {
    const hadWeight = weights.delete(voice);
    const meta = registry.get(voice);
    if (meta) {
      governorAllocatedWeight = Math.max(0, governorAllocatedWeight - meta.cost);
      registry.delete(voice);
    }
    if (meta || hadWeight) queueRenormalize();
  },

  /** Returns the DAW's longest-released voice, or if none is releasing, its
   *  longest-held voice, or null if the pool is empty (§10-A, §11.2 step 4). Does not
   *  call .steal() on the voice itself; the caller does, then retries the allocation once.
   *
   *  `[AMENDED 2026-08-23 — CONTRACTS §11.2a]` Selection is no longer *only* selection:
   *  the chosen voice is deregistered here, synchronously, in this same call — registry
   *  entry dropped, cost subtracted from the tracked weight — before it is returned. That
   *  is the same bookkeeping release() does, just performed at selection time instead of
   *  waiting for the stolen voice's own async 5 ms fade to finish and call free().
   *  Without it, `count` was still stale when the caller's immediate retry checked it, and
   *  a synchronous burst of noteOn calls walked straight past the 32-voice cap (measured:
   *  40 voices in Simple Synth, 39 in Overtone Synth).
   *
   *  The returned voice is unchanged in every other way: the caller still calls
   *  `.steal(atTime)` on it to run the real 5 ms audio fade. That fade no longer has
   *  anything to do with when the voice stops being counted — that already happened here.
   *  The voice's own later `free()` still calls release(), which now no-ops on it
   *  (`if (!meta) return`) — the normal path for a stolen voice. */
  steal() {
    sweepRegistry();
    let longestReleased = null;
    let longestReleasedAt = Infinity;
    let longestHeld = null;
    let longestHeldAt = Infinity;

    for (const [voice, meta] of registry) {
      if (meta.releasingSince !== null && meta.releasingSince < longestReleasedAt) {
        longestReleased = voice;
        longestReleasedAt = meta.releasingSince;
      }
      if (meta.registeredAt < longestHeldAt) {
        longestHeld = voice;
        longestHeldAt = meta.registeredAt;
      }
    }

    const target = longestReleased || longestHeld || null;

    // §11.2a: deregister the chosen voice now, in this call, before returning it.
    if (target) {
      const meta = registry.get(target);
      if (meta) {
        governorAllocatedWeight = Math.max(0, governorAllocatedWeight - meta.cost);
        registry.delete(target);
      }
    }

    return target;
  },

  /** Live voice count across the whole DAW — what governor.request(cost) checks
   *  against the 32-voice default (§8). */
  get count() {
    return registry.size;
  },
};

// ---------------------------------------------------------------------------------------
// 5 · CPU GOVERNOR AND PROBE  (seat questions 5 and 6)
// ---------------------------------------------------------------------------------------
// Probe technique per §8 / findings-webaudio.md Q3, kept verbatim: time a real pass,
// divide by the 100 ms lookahead-window budget, smooth over 20 passes.
//
// `clock.js` (P2) does not exist yet, so there is no lookahead scheduler pass for this
// file to wrap. Rather than fabricate a number, this probe times this module's own real,
// synchronous bookkeeping (the registry sweep plus one state read per live voice) on a
// 25 ms interval — the same cadence §3/§8 specify. That is genuine main-thread work this
// file actually performs, so `governor.load` is a true, moving measurement today (it
// rises with live voice count, exactly as more real work would), not a placeholder. When
// P2's clock.js exists it owns the real scheduler pass; how the two probes reconcile is
// noted as an open decision in this seat's receipt, not decided here.

const PROBE_INTERVAL_MS = 25;
const WINDOW_MS = 100;
const SMOOTH_PASSES = 20;
const probeHistory = [];
let loadValue = 0;
let schedulerReporting = false;

function probePass() {
  if (schedulerReporting) return;       // the real pass is being measured; do not dilute it
  const t0 = performance.now();
  sweepRegistry();
  for (const [voice] of registry) {
    void voice.state; // touch every live voice — real cost, proportional to load
  }
  const dur = performance.now() - t0;
  probeHistory.push(dur / WINDOW_MS);
  if (probeHistory.length > SMOOTH_PASSES) probeHistory.shift();
  loadValue = Math.min(1, probeHistory.reduce((a, b) => a + b, 0) / probeHistory.length);
}

const probeIntervalHandle = setInterval(probePass, PROBE_INTERVAL_MS);

// §8's conservative default. The only one of the four counts (32 voices / 24 patch nodes
// / 4 inserts per channel / 2 sends) this file has a resource to enforce today — patch
// nodes, inserts, and sends do not exist as concepts until later phases build the files
// that create them (devices/*, mixer/*, patch-synth.js). Those seats call this same
// governor.request(cost); extending admission to their resource types is their addition,
// not a change to this one.
const VOICE_CAP_DEFAULT = 32;

let noCapFlag = false;
let governorAllocatedWeight = 0;

export const governor = {
  /** 0..1, smoothed. Independent of noCap — the meter always reads, per §8: "When noCap
   *  is on, the meter still reads and still turns red. Nothing is blocked." */
  get load() {
    return loadValue;
  },

  /** Dev toggle. Off by default, switchable at runtime, ships on the deployed build
   *  (seat question 5's explicit requirement — this is a plain property, not a
   *  build-time flag, so nothing strips it from a production bundle). */
  get noCap() {
    return noCapFlag;
  },
  set noCap(value) {
    noCapFlag = !!value;
  },

  /** Running sum of live voices' cpuWeight, for telemetry / future governor work in P4
   *  (patch nodes, inserts, sends) — not itself an admission threshold today; the
   *  concrete cap enforced below is the 32-voice count, per §8's stated caps. */
  get allocatedWeight() {
    return governorAllocatedWeight;
  },

  /** §8's real measurement, reported by the owner of the scheduler pass (core/clock.js).
   *  `ms` is one pass's wall-clock duration, `budgetMs` one lookahead window. §8: "Load is
   *  measured as scheduler pass duration against the budget of one lookahead window,
   *  smoothed over 20 passes." This file has no scheduler pass; clock.js does. */
  reportSchedulerPass(ms, budgetMs) {
    schedulerReporting = true;          // clock.js is live — stop self-timing bookkeeping
    probeHistory.push(ms / budgetMs);
    if (probeHistory.length > SMOOTH_PASSES) probeHistory.shift();
    loadValue = Math.min(1, probeHistory.reduce((a, b) => a + b, 0) / probeHistory.length);
  },

  /**
   * Returns true if the allocation is allowed (§8). With noCap off it refuses once
   * voicePool.count reaches the 32-voice default. With noCap on it always allows and the
   * meter keeps reading — it is never blocked, per §8: "Brandon wants the Chromebooks to
   * crash." Does not block/await — always synchronous, matching §8's signature.
   */
  request(cost) {
    if (noCapFlag) return true;
    return voicePool.count < VOICE_CAP_DEFAULT;
  },
};

// ---------------------------------------------------------------------------------------
// 6 · TEARDOWN  (seat question 7)
// ---------------------------------------------------------------------------------------

/**
 * Disconnects every node this file owns, drops every listener it attached, stops the
 * probe, and closes the AudioContext. Returns a promise resolving to
 * `{ nodesDisconnected, listenersDropped }` so a caller can verify by count that nothing
 * leaked. Does not touch voices — those belong to instruments, which own their own
 * dispose() (§2); this file only owns the registry entries, which are cleared here.
 */
export function dispose() {
  let nodesDisconnected = 0;
  let listenersDropped = 0;

  clearInterval(probeIntervalHandle);

  for (const node of channels.keys()) {
    node.disconnect();
    nodesDisconnected++;
  }
  channels.clear();

  masterGain.disconnect();
  masterAnalyser.disconnect();
  nodesDisconnected += 2;

  if (masterLimiterNode) {
    masterLimiterNode.disconnect();
    masterLimiterNode = null;
    nodesDisconnected++;
  }

  for (const evt of GESTURE_EVENTS) {
    window.removeEventListener(evt, gestureHandler);
    listenersDropped++;
  }

  for (const key of Object.keys(listeners)) {
    listenersDropped += listeners[key].size;
    listeners[key].clear();
  }

  registry.clear();
  weights.clear();
  governorAllocatedWeight = 0;

  return ctx.close().then(() => ({ nodesDisconnected, listenersDropped }));
}

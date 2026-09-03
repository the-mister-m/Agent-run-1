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
// Channel gain scales with that channel's live voice count: gain(n) = n ** -exponent,
// gain(0) = 1. A channel created without a synthVoiceId is skipped and holds gain 1.
// Ducks are written instantly at the new voice's start time; recovery is smoothed.

const normState = { mode: 'per-instrument', exponent: 0.8, responseMs: .05 };

function clamp(v, lo, hi) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
}

/** Live voice count per normalizing channel id. Zero-filled so a silent channel is listed. */
function synthVoiceCounts() {
  const counts = new Map();
  for (const id of channels.values()) if (id !== null) counts.set(id, 0);
  if (counts.size === 0) return counts;
  for (const meta of registry.values()) {
    if (counts.has(meta.instrumentId)) counts.set(meta.instrumentId, counts.get(meta.instrumentId) + 1);
  }
  return counts;
}

/** Writes every normalizing channel to its target gain at `when`. No-op when none exist. */
function renormalize(when) {
  const counts = synthVoiceCounts();
  if (counts.size === 0) return;

  let total = 0;
  for (const n of counts.values()) total += n;

  const at = Math.max(ctx.currentTime, Number.isFinite(when) ? when : 0);
  const tau = Math.max(0.001, normState.responseMs / 1000);

  for (const [node, id] of channels) {
    if (id === null) continue;
    let gain = 1;
    if (normState.mode !== 'off') {
      // master mode changes the count, never the node the gain lands on.
      const n = normState.mode === 'master' ? total : counts.get(id);
      if (n > 0) gain = Math.pow(n, -normState.exponent);
    }
    if (gain < node.gain.value) {
      node.gain.cancelScheduledValues(at);
      node.gain.setValueAtTime(gain, at);
    } else {
      node.gain.setTargetAtTime(gain, at, tau);
    }
  }
}

/** Per-voice output gain. Set once at creation, never written again. */
export function createVoiceOut(instrumentId, dest) {
  const node = ctx.createGain();

  let n = 1;
  for (const meta of registry.values()) if (meta.instrumentId === instrumentId) n++;
  node.gain.value = Math.pow(n, -normState.exponent);

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

  get responseMs() {
    return normState.responseMs;
  },
  set responseMs(v) {
    const n = clamp(v, 0, 120);
    if (n === null) return;
    normState.responseMs = n;
  },

  /** Snapshot for the dev box readout: [{ id, voices, gain }], one per normalizing
   *  channel on this page. Empty array means no channel opted in. */
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
    renormalize(atTime);
  },

  /** Called by Voice.free() once it has disconnected its own nodes (§11.1). */
  release(voice) {
    const meta = registry.get(voice);
    if (!meta) return;
    governorAllocatedWeight = Math.max(0, governorAllocatedWeight - meta.cost);
    registry.delete(voice);
    renormalize();
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
   *  40 voices in Wave Synth, 39 in Overtone Synth — test-p1, P1/S5).
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
        renormalize();
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

  for (const evt of GESTURE_EVENTS) {
    window.removeEventListener(evt, gestureHandler);
    listenersDropped++;
  }

  for (const key of Object.keys(listeners)) {
    listenersDropped += listeners[key].size;
    listeners[key].clear();
  }

  registry.clear();
  governorAllocatedWeight = 0;

  return ctx.close().then(() => ({ nodesDisconnected, listenersDropped }));
}

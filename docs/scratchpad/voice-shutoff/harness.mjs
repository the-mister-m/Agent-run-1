// Voice-shutoff harness — job 1, 2026-10-01 tool fixes.
// Runs the real core/audio.js and the three synths against a fake AudioContext whose
// AudioParams evaluate setValueAtTime / linearRampToValueAtTime / setTargetAtTime /
// cancelScheduledValues per the Web Audio spec, on a simulated ctx clock with simulated
// setTimeout. No sound is made; the scheduled curves are read back as numbers.
//
// Run:  node docs/scratchpad/voice-shutoff/harness.mjs        (working tree)
//       node docs/scratchpad/voice-shutoff/harness.mjs old    (HEAD copies under old/)

const which = process.argv[2] === 'old' ? 'old' : 'new';
const base = which === 'old' ? './old/' : '../../../src/';

// ---- simulated clock and timers -----------------------------------------------------
let T = 0;
const timers = [];
let timerSeq = 0;
globalThis.setTimeout = (fn, ms = 0) => {
  const id = ++timerSeq;
  timers.push({ id, due: T + Math.max(0, ms) / 1000, fn });
  return id;
};
globalThis.clearTimeout = (id) => {
  const i = timers.findIndex((t) => t.id === id);
  if (i !== -1) timers.splice(i, 1);
};
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const flush = () => new Promise((r) => setImmediate(r));

async function advance(to) {
  await flush(); // a browser runs queued microtasks before the clock moves on
  for (;;) {
    timers.sort((a, b) => a.due - b.due || a.id - b.id);
    const next = timers[0];
    if (!next || next.due > to) break;
    timers.shift();
    T = Math.max(T, next.due);
    next.fn();
    await flush();
  }
  T = Math.max(T, to);
  await flush();
}

// ---- fake AudioParam ----------------------------------------------------------------
class FakeParam {
  constructor(v0) {
    this.v0 = v0;
    this.events = [];
  }
  _insert(e) {
    let i = this.events.length;
    while (i > 0 && this.events[i - 1].time > e.time) i--;
    this.events.splice(i, 0, e);
    return this;
  }
  setValueAtTime(value, time) { return this._insert({ type: 'set', value, time }); }
  linearRampToValueAtTime(value, time) { return this._insert({ type: 'ramp', value, time }); }
  exponentialRampToValueAtTime(value, time) { return this._insert({ type: 'ramp', value, time }); }
  setTargetAtTime(value, time, tau) { return this._insert({ type: 'target', value, time, tau }); }
  cancelScheduledValues(time) {
    // The past is already rendered: keep the curve as it stood up to now.
    (this.history ||= []).push({ until: T, events: this.events.slice() });
    this.events = this.events.filter((e) => e.time < time);
    return this;
  }
  valueAt(t) {
    for (const h of this.history || []) if (t < h.until) return this._eval(h.events, t);
    return this._eval(this.events, t);
  }
  _eval(events, t) {
    let lastT = 0;
    let lastV = this.v0;
    let target = null; // { t0, v0, value, tau }
    const curve = (x) => target.value + (target.v0 - target.value) * Math.exp(-(x - target.t0) / target.tau);
    for (const e of events) {
      if (target && e.time > target.t0) {
        if (t < e.time) return curve(t);
        lastV = curve(e.time);
        lastT = e.time;
        target = null;
      }
      if (e.type === 'ramp') {
        if (t < e.time) {
          if (e.time === lastT) return e.value;
          return lastV + ((e.value - lastV) * (t - lastT)) / (e.time - lastT);
        }
        lastT = e.time;
        lastV = e.value;
      } else if (e.type === 'set') {
        if (t < e.time) return lastV;
        lastT = e.time;
        lastV = e.value;
      } else if (e.type === 'target') {
        if (t < e.time) return lastV;
        target = { t0: e.time, v0: lastV, value: e.value, tau: e.tau };
      }
    }
    return target ? curve(t) : lastV;
  }
  get value() { return this.valueAt(T); }
  set value(v) {
    if (this.events.length === 0) this.v0 = v;
    else this.setValueAtTime(v, T);
  }
}

const NOOP_METHODS = new Set(['connect', 'disconnect', 'start', 'stop', 'setPeriodicWave',
  'getFloatTimeDomainData', 'getByteTimeDomainData', 'getFloatFrequencyData', 'getByteFrequencyData']);

function makeNode() {
  const store = {};
  return new Proxy(store, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'symbol') return undefined;
      if (NOOP_METHODS.has(prop)) return (x) => x;
      target[prop] = new FakeParam(prop === 'gain' ? 1 : 0);
      return target[prop];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

function FakeContext() {
  const store = { sampleRate: 48000, state: 'running', destination: makeNode() };
  return new Proxy(store, {
    get(target, prop) {
      if (prop === 'currentTime') return T;
      if (prop in target) return target[prop];
      if (prop === 'resume' || prop === 'suspend' || prop === 'close') return () => Promise.resolve();
      if (typeof prop === 'string' && prop.startsWith('create')) return () => makeNode();
      return undefined;
    },
  });
}

globalThis.window = {
  AudioContext: FakeContext,
  addEventListener() {},
  removeEventListener() {},
};

const audio = await import(base + 'core/audio.js');
const SimpleSynth = (await import(base + 'instruments/simple-synth.js')).default;
const OvertoneSynth = (await import(base + 'instruments/overtone-synth.js')).default;
const WaveSynth = (await import(base + 'instruments/wave-synth.js')).default;

// ---- checks -------------------------------------------------------------------------
let pass = 0;
let fail = 0;
function ok(label, cond, detail = '') {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
}

const EPS = 1e-7;

/** Largest instantaneous rise and fall of a param between t0 and t1, plus the largest
 *  rise inside any 2 ms window (sampled every 0.1 ms). */
function jumps(param, t0, t1) {
  const times = new Set();
  const all = [param.events, ...(param.history || []).map((h) => h.events)];
  for (const list of all) for (const e of list) if (e.time > t0 && e.time < t1) times.add(e.time);
  for (const h of param.history || []) if (h.until > t0 && h.until < t1) times.add(h.until);
  let up = 0;
  let upAt = null;
  let down = 0;
  for (const t of times) {
    const d = param.valueAt(t + EPS) - param.valueAt(t - EPS);
    if (d > up) { up = d; upAt = t; }
    if (-d > down) down = -d;
  }
  let rise2ms = 0;
  let riseAt = null;
  let stealRise = 0;
  const inSteal = (t) => stealFades.some((f) => t + 0.002 > f.start && t < f.end);
  for (let t = t0; t < t1; t += 0.0001) {
    const d = param.valueAt(t + 0.002) - param.valueAt(t);
    if (inSteal(t)) { if (d > stealRise) stealRise = d; continue; }
    if (d > rise2ms) { rise2ms = d; riseAt = t; }
  }
  return { up, upAt, down, rise2ms, riseAt, stealRise };
}

// Every 5 ms steal fade a voice reports, so a rise that tracks one is listed on its own.
const stealFades = [];
if (typeof audio.voicePool.fade === 'function') {
  const fade = audio.voicePool.fade.bind(audio.voicePool);
  audio.voicePool.fade = (voice, start, end) => {
    if (end - start <= 0.006) stealFades.push({ start, end });
    return fade(voice, start, end);
  };
}

function weighted() {
  return audio.synthVoiceNorm.readout().reduce((s, r) => s + r.voices, 0);
}

const SYNTHS = {
  simple: {
    Ctor: SimpleSynth,
    setup(s) {
      s.setParam('env.release', 0.3);
      s.setParam('env.decay', 0.08);
    },
    longDecay(s) {
      s.setParam('env.decay', 0.5);
      s.setParam('env.release', 0.1);
    },
    envParam: (v) => v.gain.gain,
    voices: (s) => Array.from(s._voices),
  },
  overtone: {
    Ctor: OvertoneSynth,
    setup(s) {
      s.setParam('env.release', 0.3);
      s.setParam('env.decay', 0.08);
    },
    longDecay(s) {
      s.setParam('env.decay', 0.5);
      s.setParam('env.release', 0.1);
    },
    envParam: (v) => v.envGain.gain,
    voices: (s) => Array.from(s._allVoices),
  },
  wave: {
    Ctor: WaveSynth,
    setup(s) {
      s._patch.e1r = 0.3;
      s._patch.e1d = 0.08;
    },
    longDecay(s) {
      s._patch.e1d = 0.5;
      s._patch.e1r = 0.1;
    },
    envParam: (v) => v.amp.gain,
    voices: (s) => Array.from(s._voices),
  },
};

const LOOKAHEAD = 0.08;

/** Schedules notes the way core/roll-scheduler.js does: noteOn and noteOff in one call,
 *  LOOKAHEAD before the note's start. notes: [{ note, start, len }], song-relative. */
async function playScheduled(synth, notes, origin) {
  const sorted = notes.slice().sort((a, b) => a.start - b.start);
  for (const n of sorted) {
    await advance(origin + n.start - LOOKAHEAD);
    synth.noteOn(n.note, 0.8, origin + n.start);
    synth.noteOff(n.note, origin + n.start + n.len);
  }
  await flush();
}

async function scenario(name, fn) {
  console.log(`\n# ${name}`);
  await fn();
}

for (const [key, def] of Object.entries(SYNTHS)) {
  // 1 · arpeggio, scheduled ahead, tails overlapping the next note
  await scenario(`${key}: scheduled arpeggio`, async () => {
    const channel = audio.createChannel(def.Ctor.id);
    const s = new def.Ctor(audio.ctx, channel);
    def.setup(s);
    const origin = T + 0.2;
    const pitches = [60, 64, 67, 72, 67, 64, 60, 64];
    const notes = pitches.map((note, i) => ({ note, start: i * 0.125, len: 0.1 }));
    await playScheduled(s, notes, origin);
    const end = origin + notes.length * 0.125 + 0.5;
    await advance(end);
    const j = jumps(channel.gain, origin - 0.01, end);
    ok(`${key} arpeggio: channel gain has no upward step outside steal fades`, j.up < 0.005 && j.rise2ms < 0.05,
      `instant rise ${j.up.toFixed(4)}, largest rise in 2 ms ${j.rise2ms.toFixed(4)}${j.riseAt !== null ? ' at +' + (j.riseAt - origin).toFixed(4) + 's' : ''}, largest drop ${j.down.toFixed(4)}, rise in 2 ms inside a 5 ms steal fade ${j.stealRise.toFixed(4)}`);
    ok(`${key} arpeggio: weighted count returns to 0`, Math.abs(weighted()) < 1e-9, `count ${weighted()}`);
    ok(`${key} arpeggio: every voice freed`, def.voices(s).length === 0, `${def.voices(s).length} left`);
    ok(`${key} arpeggio: channel gain back to 1`, Math.abs(channel.gain.valueAt(end) - 1) < 1e-6, `gain ${channel.gain.valueAt(end).toFixed(4)}`);
    s.dispose?.();
    audio.releaseChannel(channel);
  });

  // 2 · re-struck chord, live, second strike inside the first chord's tails
  await scenario(`${key}: re-struck chord`, async () => {
    const channel = audio.createChannel(def.Ctor.id);
    const s = new def.Ctor(audio.ctx, channel);
    def.setup(s);
    const origin = T + 0.1;
    const chord = [60, 64, 67];
    await advance(origin);
    chord.forEach((n) => s.noteOn(n, 0.8, T));
    await advance(origin + 0.5);
    chord.forEach((n) => s.noteOff(n, T));
    await advance(origin + 0.6);
    chord.forEach((n) => s.noteOn(n, 0.8, T));
    await advance(origin + 1.1);
    chord.forEach((n) => s.noteOff(n, T));
    const end = origin + 2;
    await advance(end);
    const j = jumps(channel.gain, origin - 0.01, end);
    ok(`${key} re-struck chord: channel gain has no upward step outside steal fades`, j.up < 0.005 && j.rise2ms < 0.05,
      `instant rise ${j.up.toFixed(4)}, largest rise in 2 ms ${j.rise2ms.toFixed(4)}${j.riseAt !== null ? ' at +' + (j.riseAt - origin).toFixed(4) + 's' : ''}, rise in 2 ms inside a 5 ms steal fade ${j.stealRise.toFixed(4)}`);
    ok(`${key} re-struck chord: weighted count returns to 0`, Math.abs(weighted()) < 1e-9, `count ${weighted()}`);
    ok(`${key} re-struck chord: every voice freed`, def.voices(s).length === 0, `${def.voices(s).length} left`);
    s.dispose?.();
    audio.releaseChannel(channel);
  });

  // 3 · transport Stop with releases already scheduled in the future
  await scenario(`${key}: Stop cuts a pre-scheduled release`, async () => {
    const channel = audio.createChannel(def.Ctor.id);
    const s = new def.Ctor(audio.ctx, channel);
    def.setup(s);
    const origin = T + 0.1;
    await playScheduled(s, [{ note: 60, start: 0, len: 2 }, { note: 67, start: 0, len: 2 }], origin);
    await advance(origin + 0.5);
    const stopAt = T;
    s.allNotesOff();
    const vs = def.voices(s);
    const tailEnd = stopAt + 0.3 + 0.01;
    const silentAt = Math.max(...vs.map((v) => def.envParam(v).valueAt(tailEnd)));
    ok(`${key} Stop: envelopes reach 0 one release after Stop`, silentAt < 1e-6, `max env ${silentAt.toFixed(4)} at Stop+0.31s (note was scheduled to 2s)`);
    await advance(stopAt + 0.4);
    ok(`${key} Stop: voices freed before their old scheduled release`, def.voices(s).length === 0, `${def.voices(s).length} left at Stop+0.4s`);
    ok(`${key} Stop: weighted count 0`, Math.abs(weighted()) < 1e-9, `count ${weighted()}`);
    await advance(origin + 3);
    s.dispose?.();
    audio.releaseChannel(channel);
  });

  // 4 · note shorter than attack + decay, noteOff scheduled in the same call as noteOn
  await scenario(`${key}: short note keeps its decay ramp`, async () => {
    const channel = audio.createChannel(def.Ctor.id);
    const s = new def.Ctor(audio.ctx, channel);
    def.longDecay(s);
    const origin = T + 0.1;
    await advance(origin - LOOKAHEAD);
    s.noteOn(62, 0.8, origin);
    s.noteOff(62, origin + 0.05);
    const v = def.voices(s)[0];
    const p = def.envParam(v);
    const j = jumps(p, origin + 0.001, origin + 0.3);
    const atRelease = p.valueAt(origin + 0.05);
    ok(`${key} short note: envelope has no step through decay into release`, j.up < 0.01 && j.down < 0.01,
      `largest rise ${j.up.toFixed(4)}, largest drop ${j.down.toFixed(4)}, env at noteOff ${atRelease.toFixed(4)}`);
    await advance(origin + 1);
    s.dispose?.();
    audio.releaseChannel(channel);
  });

  // 5 · repeated pitch, scheduled ahead, long release
  await scenario(`${key}: repeated pitch`, async () => {
    const channel = audio.createChannel(def.Ctor.id);
    const s = new def.Ctor(audio.ctx, channel);
    def.setup(s);
    if (key === 'wave') s._patch.e1r = 1.0;
    else s.setParam('env.release', 1.0);
    const origin = T + 0.1;
    await playScheduled(s, [{ note: 60, start: 0, len: 0.1 }], origin);
    await advance(origin + 0.15);
    const first = def.voices(s)[0];
    await playScheduled(s, [{ note: 60, start: 0.2, len: 0.1 }], origin);
    const firstEnv = def.envParam(first);
    // first voice: released at 0.1. Its envelope must not be re-anchored to 0.3.
    const firstAt05 = firstEnv.valueAt(origin + 0.17);
    ok(`${key} repeated pitch: first voice still sounding up to the new note's start`, firstAt05 > 0.01,
      `first env ${firstAt05.toFixed(4)} at +0.17s (new note at +0.2s)`);
    const firstAfter = firstEnv.valueAt(origin + 1.12);
    ok(`${key} repeated pitch: first voice's release not pushed back`, firstAfter < 1e-6,
      `first env ${firstAfter.toFixed(4)} at +1.12s (its release ends at +1.1s or sooner)`);
    await advance(origin + 3);
    ok(`${key} repeated pitch: weighted count returns to 0`, Math.abs(weighted()) < 1e-9, `count ${weighted()}`);
    s.dispose?.();
    audio.releaseChannel(channel);
  });

  // 6 · per-voice gain at birth beside a fading tail
  await scenario(`${key}: per-voice gain at birth`, async () => {
    if (which === 'old') { console.log('skip (new API only)'); return; }
    const channel = audio.createChannel(def.Ctor.id);
    const s = new def.Ctor(audio.ctx, channel);
    def.setup(s);
    const origin = T + 0.1;
    await advance(origin);
    s.noteOn(60, 0.8, T);
    await advance(origin + 0.2);
    s.noteOff(60, T); // 0.3 s release from +0.2
    await advance(origin + 0.35); // tail weight 0.5
    const n = audio.synthVoiceNorm.readout().find((r) => r.id === def.Ctor.id).voices;
    ok(`${key} birth: tail weighs half way through its release`, Math.abs(n - 0.5) < 1e-6, `weighted count ${n.toFixed(4)}`);
    s.noteOn(64, 0.8, T);
    const born = def.voices(s).find((v) => v.state !== 'releasing' && v.state !== 'free');
    const outGain = born.out || null;
    const want = Math.pow(1.5, -0.8);
    const got = outGain?.gain?.valueAt?.(T);
    if (!outGain) console.log(`skip  ${key} birth: voice keeps no reference to its out node`);
    else ok(`${key} birth: new voice's out gain = (1 + 0.5) ** -0.8`, got !== undefined && Math.abs(got - want) < 1e-6,
      `got ${got === undefined ? 'n/a' : got.toFixed(4)}, want ${want.toFixed(4)}`);
    await advance(origin + 2);
    s.allNotesOff();
    await advance(origin + 3);
    s.dispose?.();
    audio.releaseChannel(channel);
  });
}

// 7 · overtone: same pitch struck again during the old voice's release tail
await scenario('overtone: steal of a releasing voice keeps the release weight', async () => {
  if (which === 'old') { console.log('skip (new API only)'); return; }
  const channel = audio.createChannel(OvertoneSynth.id);
  const s = new OvertoneSynth(audio.ctx, channel);
  s.setParam('env.release', 0.3);
  const origin = T + 0.1;
  await playScheduled(s, [{ note: 60, start: 0, len: 0.1 }], origin);
  await playScheduled(s, [{ note: 60, start: 0.25, len: 0.1 }], origin);
  await advance(origin + 0.2);
  const n1 = weighted();
  ok('overtone tail weight follows its release before the steal', Math.abs(n1 - (1 - 0.1 / 0.3)) < 1e-6, `count ${n1.toFixed(4)} at +0.2s, want 0.6667`);
  await advance(origin + 0.249);
  const n2 = weighted();
  ok('overtone tail weight still on its release line just before the steal', Math.abs(n2 - (1 - 0.149 / 0.3)) < 1e-6, `count ${n2.toFixed(4)} at +0.249s, want ${(1 - 0.149 / 0.3).toFixed(4)}`);
  await advance(origin + 0.26);
  const n3 = weighted();
  ok('overtone after the 5 ms steal fade only the new voice weighs', Math.abs(n3 - 1) < 1e-6, `count ${n3.toFixed(4)} at +0.26s`);
  await advance(origin + 2);
  ok('overtone weighted count returns to 0', Math.abs(weighted()) < 1e-9, `count ${weighted()}`);
  s.dispose?.();
  audio.releaseChannel(channel);
});

console.log(`\n${which}: ${pass} pass, ${fail} fail`);
process.exit(0);

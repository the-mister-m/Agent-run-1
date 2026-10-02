// Drum limiter harness — 2026-10-01 GoTo session.
// Fake AudioContext + simulated clock copied from docs/scratchpad/voice-shutoff/harness.mjs
// (lines 13-145), plus getChannelData for the drum noise buffer. Runs the real core/audio.js
// and drum-synth.js; reads the channel gain curve back as numbers.
// Run:  node docs/scratchpad/limiter-test/drum-harness.mjs
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
      if (prop === 'getChannelData') return () => new Float32Array(48000 * 2);
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

const audio = await import('../../../src/core/audio.js');
const DrumSynth = (await import('../../../src/instruments/drum-synth.js')).default;

// ---- checks -------------------------------------------------------------------------
let pass = 0;
let fail = 0;
function ok(label, cond, detail = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
}

/** Largest instant rise, largest 2 ms rise, largest drop, first drop time. Sampled 0.1 ms. */
function curve(param, t0, t1) {
  let up = 0, upAt = null, rise2 = 0, riseAt = null, firstDrop = null, min = 1;
  for (let t = t0; t < t1; t += 0.0001) {
    const v = param.valueAt(t);
    if (v < min) min = v;
    const d = param.valueAt(t + 0.0001) - v;
    if (d > up) { up = d; upAt = t; }
    if (firstDrop === null && d < -1e-6) firstDrop = t;
    const r = param.valueAt(t + 0.002) - v;
    if (r > rise2) { rise2 = r; riseAt = t; }
  }
  return { up, upAt, rise2, riseAt, firstDrop, min };
}

const weighted = () => audio.synthVoiceNorm.readout().reduce((s, r) => s + r.voices, 0);
const LOOKAHEAD = 0.08;
const KICK = 36, SNARE = 38, HAT = 42, OPEN = 46, CRASH = 49;

async function playScheduled(s, hits, origin) {
  for (const h of hits.slice().sort((a, b) => a.start - b.start)) {
    await advance(origin + h.start - LOOKAHEAD);
    s.noteOn(h.note, 0.9, origin + h.start);
    s.noteOff(h.note, origin + h.start + 0.05);
  }
  await flush();
}

async function scenario(name, hits, { tail = 3 } = {}) {
  console.log(`\n# ${name}`);
  const channel = audio.createChannel(DrumSynth.id);
  const s = new DrumSynth(audio.ctx, channel);
  const origin = T + 0.2;
  await playScheduled(s, hits, origin);
  const last = Math.max(...hits.map((h) => h.start));
  const end = origin + last + tail;
  await advance(end);
  const c = curve(channel.gain, origin - 0.1, end);
  const first = Math.min(...hits.map((h) => h.start));
  const early = c.firstDrop === null ? 0 : (origin + first) - c.firstDrop;
  ok(`${name}: channel never ducks before the first hit sounds`, early < 0.0005,
    c.firstDrop === null ? 'no duck' : `first drop ${(early * 1000).toFixed(1)} ms before the hit`);
  ok(`${name}: no instant upward gain step`, c.up < 0.005,
    `largest instant rise ${c.up.toFixed(4)}${c.upAt !== null ? ' at +' + (c.upAt - origin).toFixed(3) + 's' : ''}`);
  ok(`${name}: no fast rise (≥0.05 in 2 ms)`, c.rise2 < 0.05,
    `largest 2 ms rise ${c.rise2.toFixed(4)}${c.riseAt !== null ? ' at +' + (c.riseAt - origin).toFixed(3) + 's' : ''}`);
  console.log(`      lowest channel gain ${c.min.toFixed(4)}`);
  ok(`${name}: weighted count returns to 0`, Math.abs(weighted()) < 1e-9, `count ${weighted()}`);
  ok(`${name}: every voice freed`, s._voices.size === 0, `${s._voices.size} left`);
  ok(`${name}: channel gain back to 1`, Math.abs(channel.gain.valueAt(end) - 1) < 1e-6,
    `gain ${channel.gain.valueAt(end).toFixed(4)}`);
  s.dispose?.();
  audio.releaseChannel(channel);
}

// 1 · two bars of 16th hats, kick on 1 and 3, snare on 2 and 4, 120 bpm
const groove = [];
for (let i = 0; i < 32; i++) {
  const t = i * 0.125;
  groove.push({ note: HAT, start: t });
  if (i % 8 === 0) groove.push({ note: KICK, start: t });
  if (i % 8 === 4) groove.push({ note: SNARE, start: t });
}
await scenario('groove, scheduled ahead', groove);

// 2 · single kick, alone
await scenario('single kick', [{ note: KICK, start: 0 }]);

// 3 · crash + open hat over a fast snare roll (30 ms apart, 24 hits) — pressure on the governor
const roll = [{ note: CRASH, start: 0 }, { note: OPEN, start: 0 }];
for (let i = 0; i < 24; i++) roll.push({ note: SNARE, start: i * 0.03 });
await scenario('snare roll under crash', roll);

// 4 · Stop: allNotesOff while tails ring
console.log('\n# stop during tails');
{
  const channel = audio.createChannel(DrumSynth.id);
  const s = new DrumSynth(audio.ctx, channel);
  const origin = T + 0.2;
  await playScheduled(s, [{ note: CRASH, start: 0 }, { note: KICK, start: 0 }, { note: OPEN, start: 0.1 }], origin);
  await advance(origin + 0.3);
  s.allNotesOff();
  await advance(origin + 0.4);
  const c = curve(channel.gain, origin, origin + 0.4);
  ok('stop: no instant upward gain step', c.up < 0.005, `largest instant rise ${c.up.toFixed(4)}${c.upAt !== null ? ' at +' + (c.upAt - origin).toFixed(3) + 's' : ''}`);
  ok('stop: every voice freed within 100 ms', s._voices.size === 0, `${s._voices.size} left`);
  await advance(origin + 3);
  ok('stop: weighted count returns to 0', Math.abs(weighted()) < 1e-9, `count ${weighted()}`);
  s.dispose?.();
  audio.releaseChannel(channel);
}

console.log(`\ndrum: ${pass} pass, ${fail} fail`);

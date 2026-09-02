// The patch synth: a node graph of oscillators, modulators and processors wired by cable.

import { governor } from '../core/audio.js';

const NODE_CAP = 24;
const ANALYSER_COST = 2;
const MIN_RAMP = 0.001;
const NOISE_SECONDS = 2;

const WAVE_TYPES = ['sine', 'triangle', 'square', 'saw'];

// contract enum -> native OscillatorType
const WAVE_TO_OSC_TYPE = {
  sine: 'sine',
  triangle: 'triangle',
  square: 'square',
  saw: 'sawtooth',
};

const FILTER_TYPES = ['lowpass', 'highpass', 'bandpass'];
const NOISE_COLORS = ['white', 'pink'];
const LFO_WAVES = ['sine', 'triangle', 'square', 'saw'];

const GROUPS = [
  { id: 'source', label: 'Sources' },
  { id: 'modulator', label: 'Modulators' },
  { id: 'processor', label: 'Processors' },
  { id: 'math', label: 'Math' },
];

// Palette group open/closed at first load. Math is last and closed.
const GROUP_OPEN_DEFAULT = { source: true, modulator: true, processor: true, math: false };

// `span` on a control input is the amount one unit of incoming signal moves that param.
const KINDS = {
  osc: {
    group: 'source',
    label: 'Oscillator',
    weight: 9,
    ins: [
      { id: 'freq', domain: 'control', label: 'Freq', span: 500 },
      { id: 'detune', domain: 'control', label: 'Detune', span: 1200 },
    ],
    outs: [{ id: 'out', domain: 'audio', label: 'Out' }],
    params: [
      { id: 'wave', kind: 'enum', values: WAVE_TYPES, def: 'sine', label: 'Wave' },
      { id: 'octave', kind: 'int', min: -2, max: 2, def: 0, label: 'Octave' },
      { id: 'detune', kind: 'float', min: -1200, max: 1200, step: 1, def: 0, label: 'Detune' },
    ],
  },
  noise: {
    group: 'source',
    label: 'Noise',
    weight: 9,
    ins: [],
    outs: [{ id: 'out', domain: 'audio', label: 'Out' }],
    params: [{ id: 'color', kind: 'enum', values: NOISE_COLORS, def: 'white', label: 'Color' }],
  },
  lfo: {
    group: 'modulator',
    label: 'LFO',
    weight: 10,
    ins: [],
    outs: [{ id: 'out', domain: 'control', label: 'Out' }],
    params: [
      { id: 'rate', kind: 'float', min: 0.01, max: 20, step: 0.01, def: 2, label: 'Rate' },
      { id: 'depth', kind: 'float', min: 0, max: 1, step: 0.01, def: 0.5, label: 'Depth' },
      { id: 'wave', kind: 'enum', values: LFO_WAVES, def: 'sine', label: 'Wave' },
    ],
  },
  env: {
    group: 'modulator',
    label: 'Envelope',
    weight: 1,
    ins: [{ id: 'gate', domain: 'trigger', label: 'Gate' }],
    outs: [{ id: 'out', domain: 'control', label: 'Out' }],
    params: [
      { id: 'attack', kind: 'float', min: 0.001, max: 2, step: 0.001, def: 0.01, label: 'Attack' },
      { id: 'decay', kind: 'float', min: 0.001, max: 2, step: 0.001, def: 0.2, label: 'Decay' },
      { id: 'sustain', kind: 'float', min: 0, max: 1, step: 0.01, def: 0.7, label: 'Sustain' },
      { id: 'release', kind: 'float', min: 0.001, max: 4, step: 0.001, def: 0.3, label: 'Release' },
    ],
  },
  filter: {
    group: 'processor',
    label: 'Filter',
    weight: 9,
    ins: [
      { id: 'in', domain: 'audio', label: 'In' },
      { id: 'cutoff', domain: 'control', label: 'Cutoff', span: 5000 },
      { id: 'q', domain: 'control', label: 'Q', span: 20 },
    ],
    outs: [{ id: 'out', domain: 'audio', label: 'Out' }],
    params: [
      { id: 'type', kind: 'enum', values: FILTER_TYPES, def: 'lowpass', label: 'Type' },
      { id: 'cutoff', kind: 'float', min: 20, max: 18000, step: 1, def: 1200, label: 'Cutoff' },
      { id: 'q', kind: 'float', min: 0.1, max: 24, step: 0.1, def: 0.8, label: 'Q' },
    ],
  },
  gain: {
    group: 'processor',
    label: 'Gain',
    weight: 1,
    ins: [
      { id: 'in', domain: 'audio', label: 'In' },
      { id: 'amount', domain: 'control', label: 'Amount', span: 1 },
    ],
    outs: [{ id: 'out', domain: 'audio', label: 'Out' }],
    params: [
      { id: 'amount', kind: 'float', min: 0, max: 1, step: 0.01, def: 0.7, label: 'Amount' },
    ],
  },
  out: {
    group: 'processor',
    label: 'Out',
    weight: 1,
    fixed: true,
    ins: [{ id: 'in', domain: 'audio', label: 'In' }],
    outs: [],
    params: [],
  },
  add: {
    group: 'math',
    label: 'Add',
    weight: 2,
    ins: [
      { id: 'a', domain: 'control', label: 'A', span: 1 },
      { id: 'b', domain: 'control', label: 'B', span: 1 },
    ],
    outs: [{ id: 'out', domain: 'control', label: 'Out' }],
    params: [{ id: 'b', kind: 'float', min: -1, max: 1, step: 0.01, def: 0, label: 'B' }],
  },
  multiply: {
    group: 'math',
    label: 'Multiply',
    weight: 1,
    ins: [
      { id: 'a', domain: 'control', label: 'A', span: 1 },
      { id: 'b', domain: 'control', label: 'B', span: 1 },
    ],
    outs: [{ id: 'out', domain: 'control', label: 'Out' }],
    params: [{ id: 'b', kind: 'float', min: -4, max: 4, step: 0.01, def: 1, label: 'B' }],
  },
  scale: {
    group: 'math',
    label: 'Scale',
    weight: 3,
    ins: [{ id: 'in', domain: 'control', label: 'In', span: 1 }],
    outs: [{ id: 'out', domain: 'control', label: 'Out' }],
    params: [
      { id: 'mul', kind: 'float', min: -4, max: 4, step: 0.01, def: 1, label: 'Multiply' },
      { id: 'add', kind: 'float', min: -1, max: 1, step: 0.01, def: 0, label: 'Add' },
    ],
  },
  invert: {
    group: 'math',
    label: 'Invert',
    weight: 1,
    ins: [{ id: 'in', domain: 'control', label: 'In', span: 1 }],
    outs: [{ id: 'out', domain: 'control', label: 'Out' }],
    params: [],
  },
};

// Auto-placement step for a node added from the palette. Model coordinates, not style.
const PLACE_COL = 150;
const PLACE_ROW = 170;
const PLACE_PER_ROW = 4;

// The scene a node may live in. Model coordinates; holds the full 24-node grid.
const SCENE_W = 1200;
const SCENE_H = 1500;

// Camera limits. Zoom is unitless; pan is viewport pixels.
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const ZOOM_WHEEL = 0.0016;
const WHEEL_LINE = 16;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function article(word) {
  return /^[aeiou]/i.test(word) ? 'An' : 'A';
}

// Edge minus its AudioNode. JSON-safe.
function cableJSON(edge) {
  return { id: edge.id, from: edge.from, fromPort: edge.fromPort, to: edge.to, toPort: edge.toPort };
}

// One shared buffer per colour per context sample rate.
const noiseBuffers = new Map();

function noiseBuffer(ctx, color) {
  const key = `${color}:${ctx.sampleRate}`;
  const cached = noiseBuffers.get(key);
  if (cached) return cached;

  const len = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);

  if (color === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  noiseBuffers.set(key, buf);
  return buf;
}

// One node in the patch. Owns its Web Audio nodes and its lazily-built control sinks.
class PatchNode {
  constructor(ctx, id, kind, x, y) {
    this.ctx = ctx;
    this.id = id;
    this.kind = kind;
    this.spec = KINDS[kind];
    this.x = x;
    this.y = y;

    this.params = {};
    for (const p of this.spec.params) this.params[p.id] = p.def;

    // scaling GainNodes, portId -> GainNode, built on first sink() call
    this._sinks = new Map();
    // input portIds currently holding a cable
    this._connectedIns = new Set();
    this._nodes = {};
    this._sounding = false;
    this._endTimer = null;
    this._disposed = false;
    this._lastFreq = midiToFreq(69);
    this._peak = 1;

    this._build();
  }

  _build() {
    const ctx = this.ctx;
    switch (this.kind) {
      case 'osc': {
        const osc = ctx.createOscillator();
        osc.type = WAVE_TO_OSC_TYPE[this.params.wave];
        osc.frequency.value = midiToFreq(69) * Math.pow(2, this.params.octave);
        osc.detune.value = this.params.detune;
        osc.start();
        this._nodes.osc = osc;
        break;
      }
      case 'noise': {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(ctx, this.params.color);
        src.loop = true;
        src.start();
        this._nodes.src = src;
        break;
      }
      case 'lfo': {
        const osc = ctx.createOscillator();
        osc.type = WAVE_TO_OSC_TYPE[this.params.wave];
        osc.frequency.value = this.params.rate;
        const depth = ctx.createGain();
        depth.gain.value = this.params.depth;
        osc.connect(depth);
        osc.start();
        this._nodes.osc = osc;
        this._nodes.depth = depth;
        break;
      }
      case 'env': {
        const src = ctx.createConstantSource();
        src.offset.value = 0;
        src.start();
        this._nodes.src = src;
        break;
      }
      case 'filter': {
        const f = ctx.createBiquadFilter();
        f.type = this.params.type;
        f.frequency.value = this.params.cutoff;
        f.Q.value = this.params.q;
        this._nodes.filter = f;
        break;
      }
      case 'gain': {
        const g = ctx.createGain();
        g.gain.value = this.params.amount;
        this._nodes.gain = g;
        break;
      }
      case 'out': {
        const g = ctx.createGain();
        g.gain.value = 1;
        this._nodes.gain = g;
        break;
      }
      case 'add': {
        const sum = ctx.createGain();
        sum.gain.value = 1;
        const k = ctx.createConstantSource();
        k.offset.value = this.params.b;
        k.connect(sum);
        k.start();
        this._nodes.sum = sum;
        this._nodes.k = k;
        break;
      }
      case 'multiply': {
        const g = ctx.createGain();
        g.gain.value = this.params.b;
        this._nodes.gain = g;
        break;
      }
      case 'scale': {
        const mul = ctx.createGain();
        mul.gain.value = this.params.mul;
        const k = ctx.createConstantSource();
        k.offset.value = this.params.add;
        k.start();
        const sum = ctx.createGain();
        sum.gain.value = 1;
        mul.connect(sum);
        k.connect(sum);
        this._nodes.mul = mul;
        this._nodes.k = k;
        this._nodes.sum = sum;
        break;
      }
      case 'invert': {
        const g = ctx.createGain();
        g.gain.value = -1;
        this._nodes.gain = g;
        break;
      }
    }
  }

  get weight() {
    return this.spec.weight + this._sinks.size;
  }

  get sounding() {
    return this._sounding;
  }

  portSpec(portId, dir) {
    const list = dir === 'in' ? this.spec.ins : this.spec.outs;
    return list.find((p) => p.id === portId) || null;
  }

  // AudioNode a cable connects INTO for an audio input.
  audioIn(portId) {
    if (this.kind === 'filter' && portId === 'in') return this._nodes.filter;
    if ((this.kind === 'gain' || this.kind === 'out') && portId === 'in') return this._nodes.gain;
    return null;
  }

  // AudioNode a cable connects OUT of.
  audioOut(portId) {
    if (portId !== 'out') return null;
    switch (this.kind) {
      case 'osc': return this._nodes.osc;
      case 'noise': return this._nodes.src;
      case 'lfo': return this._nodes.depth;
      case 'env': return this._nodes.src;
      case 'filter': return this._nodes.filter;
      case 'gain': return this._nodes.gain;
      case 'add': return this._nodes.sum;
      case 'multiply': return this._nodes.gain;
      case 'scale': return this._nodes.sum;
      case 'invert': return this._nodes.gain;
      default: return null;
    }
  }

  // AudioNode a cable connects INTO for a control input that is a summing inlet, not a param.
  controlIn(portId) {
    switch (this.kind) {
      case 'add':
        if (portId === 'a' || portId === 'b') return this._nodes.sum;
        return null;
      case 'multiply':
        if (portId === 'a') return this._nodes.gain;
        return null;
      case 'scale':
        if (portId === 'in') return this._nodes.mul;
        return null;
      case 'invert':
        if (portId === 'in') return this._nodes.gain;
        return null;
      default:
        return null;
    }
  }

  // AudioParam behind a control input.
  paramTarget(portId) {
    switch (this.kind) {
      case 'osc':
        if (portId === 'freq') return this._nodes.osc.frequency;
        if (portId === 'detune') return this._nodes.osc.detune;
        return null;
      case 'filter':
        if (portId === 'cutoff') return this._nodes.filter.frequency;
        if (portId === 'q') return this._nodes.filter.Q;
        return null;
      case 'gain':
        if (portId === 'amount') return this._nodes.gain.gain;
        return null;
      case 'multiply':
        if (portId === 'b') return this._nodes.gain.gain;
        return null;
      default:
        return null;
    }
  }

  // A math node's `b` param stands in for the port only while the port is empty.
  portConnected(portId, on) {
    if (on) this._connectedIns.add(portId);
    else this._connectedIns.delete(portId);
    const t = this.ctx.currentTime;
    if (this.kind === 'add' && portId === 'b') {
      this._nodes.k.offset.setValueAtTime(on ? 0 : this.params.b, t);
    }
    if (this.kind === 'multiply' && portId === 'b') {
      this._nodes.gain.gain.setValueAtTime(on ? 0 : this.params.b, t);
    }
  }

  portIsConnected(portId) {
    return this._connectedIns.has(portId);
  }

  // Scaling GainNode in front of a control input. Built once, kept until dispose.
  sink(portId) {
    const existing = this._sinks.get(portId);
    if (existing) return existing;
    const spec = this.portSpec(portId, 'in');
    const target = this.paramTarget(portId);
    if (!spec || spec.domain !== 'control' || !target) return null;
    const g = this.ctx.createGain();
    g.gain.value = spec.span;
    g.connect(target);
    this._sinks.set(portId, g);
    return g;
  }

  setParam(id, value) {
    const spec = this.spec.params.find((p) => p.id === id);
    if (!spec) return false;
    const t = this.ctx.currentTime;

    if (spec.kind === 'enum') {
      if (!spec.values.includes(value)) return false;
      this.params[id] = value;
    } else if (spec.kind === 'int') {
      if (!Number.isFinite(value)) return false;
      this.params[id] = clamp(Math.round(value), spec.min, spec.max);
    } else {
      if (!Number.isFinite(value)) return false;
      this.params[id] = clamp(value, spec.min, spec.max);
    }

    const v = this.params[id];
    switch (this.kind) {
      case 'osc':
        if (id === 'wave') this._nodes.osc.type = WAVE_TO_OSC_TYPE[v];
        if (id === 'detune') this._nodes.osc.detune.setValueAtTime(v, t);
        if (id === 'octave') this._applyOscFreq(this._lastFreq, t);
        break;
      case 'noise':
        if (id === 'color') this._swapNoise(v);
        break;
      case 'lfo':
        if (id === 'wave') this._nodes.osc.type = WAVE_TO_OSC_TYPE[v];
        if (id === 'rate') this._nodes.osc.frequency.setValueAtTime(v, t);
        if (id === 'depth') this._nodes.depth.gain.setValueAtTime(v, t);
        break;
      case 'filter':
        if (id === 'type') this._nodes.filter.type = v;
        if (id === 'cutoff') this._nodes.filter.frequency.setValueAtTime(v, t);
        if (id === 'q') this._nodes.filter.Q.setValueAtTime(v, t);
        break;
      case 'gain':
        if (id === 'amount') this._nodes.gain.gain.setValueAtTime(v, t);
        break;
      case 'add':
        if (id === 'b' && !this._connectedIns.has('b')) this._nodes.k.offset.setValueAtTime(v, t);
        break;
      case 'multiply':
        if (id === 'b' && !this._connectedIns.has('b')) this._nodes.gain.gain.setValueAtTime(v, t);
        break;
      case 'scale':
        if (id === 'mul') this._nodes.mul.gain.setValueAtTime(v, t);
        if (id === 'add') this._nodes.k.offset.setValueAtTime(v, t);
        break;
    }
    return true;
  }

  getParam(id) {
    return this.params[id];
  }

  // Rebuilds the looping source; the old one is stopped and dropped.
  _swapNoise(color) {
    const old = this._nodes.src;
    const dests = this._noiseDests || [];
    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer(this.ctx, color);
    src.loop = true;
    src.start();
    for (const d of dests) src.connect(d);
    try { old.stop(); } catch (e) { /* stopped */ }
    try { old.disconnect(); } catch (e) { /* disconnected */ }
    this._nodes.src = src;
  }

  // Records a noise destination. Replayed on a colour swap.
  trackNoiseDest(dest, add) {
    if (this.kind !== 'noise') return;
    if (!this._noiseDests) this._noiseDests = [];
    if (add) this._noiseDests.push(dest);
    else this._noiseDests = this._noiseDests.filter((d) => d !== dest);
  }

  _applyOscFreq(freq, atTime) {
    if (this.kind !== 'osc' || !Number.isFinite(freq)) return;
    this._lastFreq = freq;
    this._nodes.osc.frequency.setValueAtTime(freq * Math.pow(2, this.params.octave), atTime);
  }

  setNote(freq, atTime) {
    this._applyOscFreq(freq, atTime);
  }

  gateOn(atTime, peak = 1) {
    if (this.kind !== 'env') return;
    const o = this._nodes.src.offset;
    const t = atTime;
    const a = this.params.attack;
    const d = this.params.decay;
    const s = this.params.sustain;
    this._peak = clamp(peak, 0, 1);

    o.cancelScheduledValues(t);
    o.setValueAtTime(o.value, t);
    o.linearRampToValueAtTime(this._peak, t + a);
    o.linearRampToValueAtTime(this._peak * s, t + a + Math.max(d, MIN_RAMP));

    if (this._endTimer) clearTimeout(this._endTimer);
    this._endTimer = null;
    this._sounding = true;
  }

  gateOff(atTime) {
    if (this.kind !== 'env') return;
    const o = this._nodes.src.offset;
    const t = atTime;
    const r = Math.max(this.params.release, MIN_RAMP);

    o.cancelScheduledValues(t);
    o.setValueAtTime(o.value, t);
    o.linearRampToValueAtTime(0, t + r);

    if (this._endTimer) clearTimeout(this._endTimer);
    const ms = Math.max(0, (t + r - this.ctx.currentTime) * 1000) + 5;
    this._endTimer = setTimeout(() => {
      this._sounding = false;
      this._endTimer = null;
    }, ms);
  }

  toJSON() {
    return { id: this.id, kind: this.kind, x: this.x, y: this.y, params: { ...this.params } };
  }

  dispose() {
    if (this._disposed) return 0;
    this._disposed = true;
    let n = 0;
    if (this._endTimer) {
      clearTimeout(this._endTimer);
      this._endTimer = null;
    }
    for (const g of this._sinks.values()) {
      try { g.disconnect(); n++; } catch (e) { /* disconnected */ }
    }
    this._sinks.clear();
    for (const key of Object.keys(this._nodes)) {
      const node = this._nodes[key];
      if (typeof node.stop === 'function') {
        try { node.stop(); } catch (e) { /* stopped */ }
      }
      try { node.disconnect(); n++; } catch (e) { /* disconnected */ }
    }
    this._nodes = {};
    this._sounding = false;
    return n;
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const STYLE_ID = 'patch-synth-style';
const VIEWS = ['compact', 'expanded'];

const CSS = `
.ps {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  gap: var(--sp-2);
  width: var(--pct-100);
  height: var(--pct-100);
  box-sizing: var(--box-border-box);
  font-family: var(--font-ui);
  font-size: var(--fs-base);
  color: var(--text);
  background: var(--bg);
}

.ps-palette {
  display: var(--disp-flex);
  flex-wrap: var(--flexwrap-wrap);
  gap: var(--sp-3);
  padding: var(--sp-2);
  flex: var(--flex-0-0-auto);
  background: var(--panel);
  border: var(--bw) var(--line-solid) var(--line);
  border-radius: var(--r-panel);
}
.ps-group {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  gap: var(--sp-1);
}
.ps-group-head {
  background: var(--color-transparent);
  border: var(--none);
  padding: var(--sp-0);
  text-align: var(--ta-left);
  color: var(--text-dim);
  font-family: var(--font-ui);
  font-size: var(--fs-micro);
  font-weight: var(--w-med);
  letter-spacing: var(--track-label);
  text-transform: var(--tt-label);
  cursor: var(--cur-pointer);
  transition: var(--tr-color);
}
.ps-group-head:hover { color: var(--text); }
.ps-group[data-group="math"] .ps-group-head { color: var(--math-group); }
.ps-group[data-open="false"] .ps-group-body { display: var(--disp-none); }
.ps-group-body {
  display: var(--disp-flex);
  flex-wrap: var(--flexwrap-wrap);
  gap: var(--sp-1);
}
.ps-add {
  background: var(--raise);
  color: var(--text);
  border: var(--bw) var(--line-solid) var(--node-border);
  border-radius: var(--r-ctl);
  padding: var(--sp-1) var(--sp-2);
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  cursor: var(--cur-pointer);
  transition: var(--tr-bg-border);
}
.ps-add:hover { border-color: var(--node-selected); }
.ps-group[data-group="math"] .ps-add { color: var(--math-group); }
.ps-add.ps-refused {
  border-color: var(--edge-refused);
  color: var(--edge-refused);
}

.ps-canvas {
  position: var(--pos-relative);
  flex: var(--flex-1-1-0);
  overflow: var(--ov-hidden);
  border: var(--bw) var(--line-solid) var(--line);
  border-radius: var(--r-panel);
  background-color: var(--graph-ground);
  background-image:
    linear-gradient(var(--graph-grid) var(--bw), var(--color-transparent) var(--bw)),
    linear-gradient(var(--angle-vertical), var(--graph-grid) var(--bw), var(--color-transparent) var(--bw));
  background-size: var(--sp-10) var(--sp-10);
  touch-action: var(--touch-none);
  user-select: var(--usel-none);
  cursor: var(--cur-grab);
}
.ps-canvas[data-panning="true"] { cursor: var(--cur-grabbing); }

.ps-scene {
  position: var(--pos-absolute);
  left: var(--sp-0);
  top: var(--sp-0);
  width: var(--pct-100);
  height: var(--pct-100);
  transform-origin: var(--sp-0) var(--sp-0);
}

.ps-wires {
  position: var(--pos-absolute);
  left: var(--sp-0);
  top: var(--sp-0);
  width: var(--pct-100);
  height: var(--pct-100);
  overflow: var(--ov-visible);
}
.ps-wire {
  fill: var(--none);
  stroke-width: var(--stroke-semi);
  cursor: var(--cur-pointer);
  transition: var(--tr-stroke);
}
.ps-wire[data-domain="audio"] { stroke: var(--edge-audio); }
.ps-wire[data-domain="control"] { stroke: var(--edge-control); }
.ps-wire:hover { stroke: var(--edge-hover); }
.ps-wire-hit {
  fill: var(--none);
  stroke: var(--color-transparent);
  stroke-width: var(--stroke-heavy);
  cursor: var(--cur-pointer);
}
.ps-wire-live {
  fill: var(--none);
  stroke: var(--cable-drag);
  stroke-width: var(--stroke-bold);
  stroke-dasharray: var(--stroke-dash);
  pointer-events: var(--pe-none);
}

.ps-node {
  position: var(--pos-absolute);
  width: var(--sp-60);
  box-sizing: var(--box-border-box);
  background: var(--node-fill);
  border: var(--bw) var(--line-solid) var(--node-border);
  border-radius: var(--r-body);
  z-index: var(--z-raise-1);
  transition: var(--tr-bg-border);
}
.ps-node[data-live="false"] .ps-node-name { color: var(--node-dimmed); }
.ps-node[data-selected="true"] {
  border-color: var(--node-selected);
  z-index: var(--z-raise-2);
}
.ps-node[data-dragging="true"] {
  border-color: var(--node-dragging);
  z-index: var(--z-drag);
}
.ps-node-head {
  display: var(--disp-flex);
  align-items: var(--align-center);
  justify-content: var(--justify-space-between);
  gap: var(--sp-1);
  padding: var(--sp-1) var(--sp-2);
  background: var(--node-head);
  border-radius: var(--r-body) var(--r-body) var(--sp-0) var(--sp-0);
  font-size: var(--fs-xs);
  font-weight: var(--w-med);
  letter-spacing: var(--track-title);
  cursor: var(--cur-grab);
}
.ps-node-head:active { cursor: var(--cur-grabbing); }
.ps-node-name {
  overflow: var(--ov-hidden);
  white-space: var(--ws-nowrap);
  text-overflow: var(--to-ellipsis);
}
.ps-kill {
  flex: var(--flex-0-0-auto);
  background: var(--color-transparent);
  border: var(--none);
  padding: var(--sp-0);
  color: var(--text-dim);
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  line-height: var(--lh-none);
  cursor: var(--cur-pointer);
  transition: var(--tr-color);
}
.ps-kill:hover { color: var(--edge-refused); }

.ps-ports {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  gap: var(--sp-hair);
  padding: var(--sp-1) var(--sp-2);
}
.ps-ports-out { align-items: var(--align-flex-end); }
.ps-port {
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-1);
  font-size: var(--fs-micro);
  color: var(--text-dim);
  cursor: var(--cur-pointer);
}
.ps-dot {
  flex: var(--flex-0-0-auto);
  width: var(--sp-3);
  height: var(--sp-3);
  border-radius: var(--r-pill);
  background: var(--port-in);
  transition: var(--tr-background);
}
.ps-port-out .ps-dot { background: var(--port-out); }
.ps-port[data-taken="true"] .ps-dot {
  background: var(--port-active);
  box-shadow: var(--glow) var(--port-active);
}
.ps-port[data-refused="true"] .ps-dot { background: var(--edge-refused); }
.ps-port[data-refused="true"] { color: var(--edge-refused); }
.ps-port[data-domain="trigger"] {
  cursor: var(--cur-not-allowed);
  opacity: var(--op-dim);
}

.ps-params {
  display: var(--disp-grid);
  gap: var(--sp-1);
  padding: var(--sp-1) var(--sp-2) var(--sp-2);
}
.ps-param {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  gap: var(--sp-hair);
}
.ps-param-top {
  display: var(--disp-flex);
  justify-content: var(--justify-space-between);
  gap: var(--sp-1);
  font-size: var(--fs-micro);
  color: var(--text-dim);
}
.ps-val {
  font-family: var(--font-mono);
  font-variant-numeric: var(--num-tabular);
  color: var(--text);
}
.ps-param select {
  width: var(--pct-100);
  box-sizing: var(--box-border-box);
  background: var(--recess);
  color: var(--text);
  border: var(--bw) var(--line-solid) var(--line);
  border-radius: var(--r-cell);
  font-family: var(--font-ui);
  font-size: var(--fs-micro);
  cursor: var(--cur-pointer);
}
.ps-param input {
  width: var(--pct-100);
  box-sizing: var(--box-border-box);
  height: var(--sp-4);
  margin: var(--sp-0);
  background: var(--color-transparent);
  border: var(--none);
  accent-color: var(--accent);
  cursor: var(--cur-ew-resize);
}
.ps-param input:disabled {
  opacity: var(--op-faint);
  cursor: var(--cur-not-allowed);
}

.ps-refusal {
  flex: var(--flex-0-0-auto);
  min-height: var(--sp-5);
  padding: var(--sp-0) var(--sp-2);
  font-size: var(--fs-xs);
  color: var(--edge-refused);
}

.ps[data-view="compact"] .ps-node,
.ps[data-view="compact"] .ps-wire,
.ps[data-view="compact"] .ps-dot,
.ps[data-view="compact"] .ps-add { transition: var(--none); }

.ps[data-view="expanded"] .ps-palette {
  gap: var(--sp-6);
  padding: var(--sp-4);
}
.ps[data-view="expanded"] .ps-group-head { font-size: var(--fs-xs); }
.ps[data-view="expanded"] .ps-add {
  font-size: var(--fs-sm);
  padding: var(--sp-2) var(--sp-3);
}
.ps[data-view="expanded"] .ps-node-head {
  font-size: var(--fs-sm);
  padding: var(--sp-2) var(--sp-3);
}
.ps[data-view="expanded"] .ps-port { font-size: var(--fs-xs); }
.ps[data-view="expanded"] .ps-param-top { font-size: var(--fs-xs); }
.ps[data-view="expanded"] .ps-dot {
  width: var(--sp-4);
  height: var(--sp-4);
}
.ps[data-view="expanded"] .ps-refusal { font-size: var(--fs-sm); }
`;

// One stylesheet per document, id-guarded.
function injectStyle(doc) {
  if (!doc || !doc.head || doc.getElementById(STYLE_ID)) return;
  const tag = doc.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = CSS;
  doc.head.appendChild(tag);
}

function make(doc, tag, cls) {
  const n = doc.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

// Horizontal cubic between two canvas points.
function cablePath(a, b) {
  const bow = Math.max(Math.abs(b.x - a.x) * 0.5, 24);
  return `M ${a.x} ${a.y} C ${a.x + bow} ${a.y} ${b.x - bow} ${b.y} ${b.x} ${b.y}`;
}

function fmtParam(spec, v) {
  if (spec.kind === 'enum' || spec.kind === 'int') return String(v);
  return String(Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100);
}

export default class PatchSynth {
  static id = 'patch-synth';
  static label = 'Patch Synth';
  static playable = true;
  static needsLoad = false;
  static pieces = null;
  static emitsNotes = false;

  static groups = GROUPS;
  static kinds = KINDS;

  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;

    // nodeId -> PatchNode, insertion ordered
    this._nodes = new Map();
    // kind -> highest suffix issued
    this._seq = new Map();
    // edgeId -> { id, from, fromPort, to, toPort, dest }
    this._edges = new Map();
    this._edgeSeq = 0;
    // '<nodeId>.<portId>' -> Set of edgeId. Audio inputs fan in; control inputs hold one.
    this._inputTaken = new Map();
    this._heldNote = null;
    this._lastRefusal = null;
    this._groupOpen = { ...GROUP_OPEN_DEFAULT };
    this._selected = null;
    this._drag = null;
    this._cable = null;
    this._pan = null;
    this._pinch = null;
    // one camera per view, kept across repaints
    this._cam = { compact: { x: 0, y: 0, z: 1 }, expanded: { x: 0, y: 0, z: 1 } };
    this._quiet = false;
    this._views = { compact: null, expanded: null };

    this._analyser = ctx.createAnalyser();
    this._analyser.fftSize = 2048;
    this._analyser.maxDecibels = -15;
    this._analyser.connect(this.out);

    this._outNode = this._createNode('out', 0, 0);
    this._outNode.audioIn('in').connect(this._analyser);

    this._mounts = { compact: null, expanded: null };
    this._domListenersByMount = { compact: [], expanded: [] };
  }

  async ready() {
    return;
  }

  get nodeCap() {
    return NODE_CAP;
  }

  get nodeCount() {
    return this._nodes.size;
  }

  get lastRefusal() {
    return this._lastRefusal;
  }

  get groupOpen() {
    return { ...this._groupOpen };
  }

  setGroupOpen(groupId, open) {
    if (!(groupId in this._groupOpen)) return false;
    this._groupOpen[groupId] = !!open;
    return true;
  }

  _createNode(kind, x, y) {
    const n = (this._seq.get(kind) || 0) + 1;
    this._seq.set(kind, n);
    const id = `${kind}${n}`;
    const node = new PatchNode(this.ctx, id, kind, x, y);
    this._nodes.set(id, node);
    return node;
  }

  // Keeps the per-kind counter ahead of an id restored from state.
  _claimId(node, id) {
    this._nodes.delete(node.id);
    node.id = id;
    this._nodes.set(id, node);
    const suffix = parseInt(id.slice(node.kind.length), 10);
    if (Number.isFinite(suffix) && suffix > (this._seq.get(node.kind) || 0)) {
      this._seq.set(node.kind, suffix);
    }
  }

  // Next free slot on the auto-placement grid. Model coordinates.
  _nextPlace() {
    const n = this._nodes.size;
    return { x: (n % PLACE_PER_ROW) * PLACE_COL, y: Math.floor(n / PLACE_PER_ROW) * PLACE_ROW };
  }

  // Returns { ok: true, node } or { ok: false, reason }.
  addNode(kind, x, y) {
    const spec = KINDS[kind];
    if (!spec) return this._refuse(`No node called "${kind}".`, { kind });
    if (spec.fixed) {
      return this._refuse(`${spec.label} already exists — there is only one.`, { kind });
    }

    if (!governor.noCap && this._nodes.size >= NODE_CAP) {
      return this._refuse(`Patch is full — ${NODE_CAP} nodes is the limit.`, { kind });
    }
    if (!governor.request(spec.weight)) {
      return this._refuse(`No room for another ${spec.label} right now.`, { kind });
    }

    const place = this._nextPlace();
    const node = this._createNode(kind, x ?? place.x, y ?? place.y);
    this._lastRefusal = null;
    this._repaint();
    return { ok: true, node };
  }

  removeNode(id) {
    const node = this._nodes.get(id);
    if (!node) return this._refuse(`No node called "${id}".`);
    if (node.spec.fixed) return this._refuse(`${node.spec.label} cannot be deleted.`, { node: id });
    for (const edge of Array.from(this._edges.values())) {
      if (edge.from === id || edge.to === id) this._dropEdge(edge);
    }
    node.dispose();
    this._nodes.delete(id);
    if (this._selected === id) this._selected = null;
    this._lastRefusal = null;
    this._repaint();
    return { ok: true };
  }

  getNode(id) {
    return this._nodes.get(id) || null;
  }

  listNodes() {
    return Array.from(this._nodes.values());
  }

  // `where` marks the palette entry or port the refusal is drawn on.
  _refuse(reason, where = null) {
    this._lastRefusal = { reason, at: this.ctx.currentTime, where };
    this._syncUI();
    return { ok: false, reason };
  }

  // Returns { ok: true, cable } or { ok: false, reason }.
  connect(fromId, fromPort, toId, toPort) {
    const from = this._nodes.get(fromId);
    const to = this._nodes.get(toId);
    const at = { node: toId, port: toPort };
    if (!from) return this._refuse(`No node called "${fromId}".`);
    if (!to) return this._refuse(`No node called "${toId}".`);

    const outSpec = from.portSpec(fromPort, 'out');
    const inSpec = to.portSpec(toPort, 'in');
    if (!outSpec) return this._refuse(`${from.spec.label} has no output called "${fromPort}".`);
    if (!inSpec) return this._refuse(`${to.spec.label} has no input called "${toPort}".`, at);

    if (inSpec.domain === 'trigger' || outSpec.domain === 'trigger') {
      return this._refuse(`${inSpec.label} is played from the keyboard, not patched.`, at);
    }
    if (outSpec.domain !== inSpec.domain) {
      return this._refuse(
        `${article(outSpec.domain)} ${outSpec.domain} cable cannot go into ` +
          `${article(inSpec.domain).toLowerCase()} ${inSpec.domain} input.`,
        at,
      );
    }
    const key = `${toId}.${toPort}`;
    const landed = this._inputTaken.get(key);
    if (inSpec.domain !== 'audio' && landed && landed.size) {
      return this._refuse(`${to.spec.label} ${inSpec.label} already has a cable.`, at);
    }
    for (const edge of this._edges.values()) {
      if (edge.from === fromId && edge.fromPort === fromPort && edge.to === toId && edge.toPort === toPort) {
        return this._refuse('That cable is already patched.', at);
      }
    }
    if (fromId === toId) return this._refuse('A node cannot patch into itself.', at);
    if (this._reaches(toId, fromId)) return this._refuse('That cable would make a loop.', at);

    const src = from.audioOut(fromPort);
    const dest =
      inSpec.domain === 'audio' ? to.audioIn(toPort) : to.controlIn(toPort) || to.sink(toPort);
    if (!src || !dest) return this._refuse('That port cannot be patched.', at);

    src.connect(dest);
    from.trackNoiseDest(dest, true);
    to.portConnected(toPort, true);

    const id = `e${++this._edgeSeq}`;
    const edge = { id, from: fromId, fromPort, to: toId, toPort, dest };
    this._edges.set(id, edge);
    if (!landed) this._inputTaken.set(key, new Set([id]));
    else landed.add(id);
    this._lastRefusal = null;
    this._repaint();
    return { ok: true, cable: cableJSON(edge) };
  }

  disconnect(edgeId) {
    const edge = this._edges.get(edgeId);
    if (!edge) return this._refuse(`No cable called "${edgeId}".`);
    this._dropEdge(edge);
    this._lastRefusal = null;
    this._repaint();
    return { ok: true };
  }

  listCables() {
    return Array.from(this._edges.values()).map(cableJSON);
  }

  // Drops every cable landing on one input.
  _unpatchInput(nodeId, portId) {
    const landed = this._inputTaken.get(`${nodeId}.${portId}`);
    if (!landed || !landed.size) return { ok: false, reason: 'Nothing patched there.' };
    for (const id of Array.from(landed)) {
      const edge = this._edges.get(id);
      if (edge) this._dropEdge(edge);
    }
    this._lastRefusal = null;
    this._repaint();
    return { ok: true };
  }

  // Unwires and forgets one edge. No repaint — the caller owns that.
  _dropEdge(edge) {
    const from = this._nodes.get(edge.from);
    const to = this._nodes.get(edge.to);
    const src = from ? from.audioOut(edge.fromPort) : null;
    if (src && edge.dest) {
      try { src.disconnect(edge.dest); } catch (e) { /* disconnected */ }
    }
    if (from) from.trackNoiseDest(edge.dest, false);
    this._edges.delete(edge.id);

    const key = `${edge.to}.${edge.toPort}`;
    const landed = this._inputTaken.get(key);
    if (landed) {
      landed.delete(edge.id);
      if (!landed.size) this._inputTaken.delete(key);
    }
    if (to && !this._inputTaken.has(key)) to.portConnected(edge.toPort, false);
  }

  // Forward walk over the edge store.
  _reaches(startId, targetId) {
    const seen = new Set();
    const stack = [startId];
    while (stack.length) {
      const id = stack.pop();
      if (id === targetId) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const edge of this._edges.values()) {
        if (edge.from === id) stack.push(edge.to);
      }
    }
    return false;
  }

  noteOn(note, velocity = 0.8, atTime) {
    const t = atTime ?? this.ctx.currentTime;
    const freq = midiToFreq(note);
    const peak = clamp(velocity, 0, 1);
    this._heldNote = note;
    for (const node of this._nodes.values()) {
      node.setNote(freq, t);
      node.gateOn(t, peak);
    }
  }

  noteOff(note, atTime) {
    if (this._heldNote !== note) return;
    const t = atTime ?? this.ctx.currentTime;
    this._heldNote = null;
    for (const node of this._nodes.values()) node.gateOff(t);
  }

  allNotesOff() {
    const t = this.ctx.currentTime;
    this._heldNote = null;
    for (const node of this._nodes.values()) node.gateOff(t);
  }

  onNoteOut(_fn) {}

  offNoteOut(_fn) {}

  bindState(_store) {
    return this;
  }

  unbindState() {
    return this;
  }

  // path = '<nodeId>.<param>' or '<kind>.<param>' for the first node of that kind.
  _resolve(path) {
    if (typeof path !== 'string') return null;
    const dot = path.indexOf('.');
    if (dot < 1) return null;
    const ref = path.slice(0, dot);
    const param = path.slice(dot + 1);
    let node = this._nodes.get(ref);
    if (!node) {
      for (const n of this._nodes.values()) {
        if (n.kind === ref) { node = n; break; }
      }
    }
    if (!node) return null;
    return { node, param };
  }

  setParam(path, value) {
    const hit = this._resolve(path);
    if (!hit) return;
    hit.node.setParam(hit.param, value);
    this._syncUI();
  }

  getParam(path) {
    const hit = this._resolve(path);
    if (!hit) return undefined;
    return hit.node.getParam(hit.param);
  }

  getState() {
    return {
      nodes: Array.from(this._nodes.values()).map((n) => n.toJSON()),
      cables: this.listCables(),
      groupOpen: { ...this._groupOpen },
    };
  }

  setState(obj) {
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.nodes)) return;
    this._quiet = true;

    for (const node of this._nodes.values()) node.dispose();
    this._nodes.clear();
    this._seq.clear();
    this._edges.clear();
    this._inputTaken.clear();
    this._edgeSeq = 0;
    this._selected = null;
    this._heldNote = null;

    this._outNode = null;
    for (const entry of obj.nodes) {
      if (!entry || !KINDS[entry.kind]) continue;
      if (entry.kind === 'out' && this._outNode) continue;
      const node = this._createNode(entry.kind, entry.x || 0, entry.y || 0);
      if (typeof entry.id === 'string') this._claimId(node, entry.id);
      if (entry.params && typeof entry.params === 'object') {
        for (const key of Object.keys(entry.params)) node.setParam(key, entry.params[key]);
      }
      if (entry.kind === 'out') this._outNode = node;
    }

    if (!this._outNode) this._outNode = this._createNode('out', 0, 0);
    this._outNode.audioIn('in').connect(this._analyser);

    if (Array.isArray(obj.cables)) {
      for (const c of obj.cables) {
        if (!c || typeof c !== 'object') continue;
        this.connect(c.from, c.fromPort, c.to, c.toPort);
      }
      this._lastRefusal = null;
    }

    if (obj.groupOpen && typeof obj.groupOpen === 'object') {
      for (const g of Object.keys(this._groupOpen)) {
        if (typeof obj.groupOpen[g] === 'boolean') this._groupOpen[g] = obj.groupOpen[g];
      }
    }
    this._quiet = false;
    this._repaint();
  }

  get voiceCount() {
    if (this._heldNote !== null) return 1;
    for (const node of this._nodes.values()) {
      if (node.sounding) return 1;
    }
    return 0;
  }

  get cpuWeight() {
    let total = ANALYSER_COST;
    for (const node of this._nodes.values()) total += node.weight;
    return total;
  }

  getAnalyser(which) {
    if (which === 'spectrum' || which === 'scope') return this._analyser;
    return null;
  }

  mountCompact(el) {
    this._mounts.compact = el;
    this._paint('compact');
  }

  mountExpanded(el) {
    this._mounts.expanded = el;
    this._paint('expanded');
  }

  unmount() {
    let listenersDropped = 0;
    for (const which of VIEWS) {
      listenersDropped += this._domListenersByMount[which].length;
      this._clearMountListeners(which);
      const el = this._mounts[which];
      if (el) el.innerHTML = '';
      this._mounts[which] = null;
      this._views[which] = null;
    }
    this._drag = null;
    this._cable = null;
    this._pan = null;
    this._pinch = null;
    return listenersDropped;
  }

  dispose() {
    let nodesDisconnected = 0;
    const listenersDropped = this.unmount();

    for (const node of this._nodes.values()) nodesDisconnected += node.dispose();
    this._nodes.clear();
    this._edges.clear();
    this._inputTaken.clear();
    this._outNode = null;
    this._selected = null;
    this._heldNote = null;

    try {
      this._analyser.disconnect();
      nodesDisconnected++;
    } catch (e) {
      /* disconnected */
    }

    return { nodesDisconnected, listenersDropped };
  }

  _listen(which, el, type, fn, opts) {
    el.addEventListener(type, fn, opts);
    this._domListenersByMount[which].push({ el, type, fn, opts });
  }

  _clearMountListeners(which) {
    for (const l of this._domListenersByMount[which]) l.el.removeEventListener(l.type, l.fn, l.opts);
    this._domListenersByMount[which] = [];
  }

  _paint(which) {
    const host = this._mounts[which];
    if (!host || !host.ownerDocument) return;
    const doc = host.ownerDocument;
    injectStyle(doc);
    this._clearMountListeners(which);
    host.innerHTML = '';

    const root = make(doc, 'div', 'ps');
    root.dataset.view = which;

    const palette = this._paintPalette(which, doc);
    const canvas = make(doc, 'div', 'ps-canvas');
    canvas.dataset.panning = 'false';
    const scene = make(doc, 'div', 'ps-scene');
    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'ps-wires');
    scene.appendChild(svg);
    canvas.appendChild(scene);
    const note = make(doc, 'div', 'ps-refusal');

    root.appendChild(palette);
    root.appendChild(canvas);
    root.appendChild(note);
    host.appendChild(root);
    this._views[which] = { root, palette, canvas, scene, svg, note, pointers: new Map() };

    for (const node of this._nodes.values()) scene.appendChild(this._paintNode(which, doc, node));

    this._listen(which, canvas, 'pointerdown', (ev) => this._onDown(which, ev));
    this._listen(which, canvas, 'pointermove', (ev) => this._onMove(which, ev));
    this._listen(which, canvas, 'pointerup', (ev) => this._onUp(which, ev));
    this._listen(which, canvas, 'pointercancel', (ev) => this._onUp(which, ev));
    this._listen(which, canvas, 'wheel', (ev) => this._onWheel(which, ev), { passive: false });

    this._clampCam(which);
    this._applyCam(which);
    this._drawWires(which);
    this._syncUI();
  }

  // Sources · Modulators · Processors · Math, in that order. Math closed at first load.
  _paintPalette(which, doc) {
    const palette = make(doc, 'div', 'ps-palette');
    for (const group of GROUPS) {
      const box = make(doc, 'div', 'ps-group');
      box.dataset.group = group.id;
      box.dataset.open = String(!!this._groupOpen[group.id]);

      const head = make(doc, 'button', 'ps-group-head');
      head.type = 'button';
      head.textContent = group.label;
      this._listen(which, head, 'click', () => {
        this.setGroupOpen(group.id, !this._groupOpen[group.id]);
        this._repaint();
      });
      box.appendChild(head);

      const body = make(doc, 'div', 'ps-group-body');
      for (const kind of Object.keys(KINDS)) {
        const spec = KINDS[kind];
        if (spec.group !== group.id || spec.fixed) continue;
        const btn = make(doc, 'button', 'ps-add');
        btn.type = 'button';
        btn.dataset.kind = kind;
        btn.textContent = spec.label;
        this._listen(which, btn, 'click', () => this.addNode(kind));
        body.appendChild(btn);
      }
      box.appendChild(body);
      palette.appendChild(box);
    }
    return palette;
  }

  _paintNode(which, doc, node) {
    const box = make(doc, 'div', 'ps-node');
    box.dataset.id = node.id;
    box.dataset.kind = node.kind;
    box.dataset.selected = String(this._selected === node.id);
    box.dataset.dragging = 'false';
    box.dataset.live = String(this._reaches(node.id, this._outNode ? this._outNode.id : ''));
    box.style.left = `${node.x}px`;
    box.style.top = `${node.y}px`;

    const head = make(doc, 'div', 'ps-node-head');
    const name = make(doc, 'span', 'ps-node-name');
    name.textContent = node.spec.label;
    head.appendChild(name);
    if (!node.spec.fixed) {
      const kill = make(doc, 'button', 'ps-kill');
      kill.type = 'button';
      kill.textContent = '×';
      kill.title = `Remove ${node.spec.label}`;
      this._listen(which, kill, 'click', () => this.removeNode(node.id));
      head.appendChild(kill);
    }
    box.appendChild(head);

    if (node.spec.ins.length) {
      const ins = make(doc, 'div', 'ps-ports ps-ports-in');
      for (const p of node.spec.ins) ins.appendChild(this._paintPort(doc, node, p, 'in'));
      box.appendChild(ins);
    }
    if (node.spec.params.length) box.appendChild(this._paintParams(which, doc, node));
    if (node.spec.outs.length) {
      const outs = make(doc, 'div', 'ps-ports ps-ports-out');
      for (const p of node.spec.outs) outs.appendChild(this._paintPort(doc, node, p, 'out'));
      box.appendChild(outs);
    }
    return box;
  }

  _paintPort(doc, node, p, dir) {
    const port = make(doc, 'div', `ps-port ps-port-${dir}`);
    port.dataset.node = node.id;
    port.dataset.port = p.id;
    port.dataset.dir = dir;
    port.dataset.domain = p.domain;
    if (dir === 'in') port.dataset.taken = String(this._inputTaken.has(`${node.id}.${p.id}`));

    const dot = make(doc, 'i', 'ps-dot');
    const label = make(doc, 'span', 'ps-port-label');
    label.textContent = p.label;
    if (dir === 'in') {
      port.appendChild(dot);
      port.appendChild(label);
    } else {
      port.appendChild(label);
      port.appendChild(dot);
    }
    return port;
  }

  _paintParams(which, doc, node) {
    const wrap = make(doc, 'div', 'ps-params');
    for (const p of node.spec.params) {
      const path = `${node.id}.${p.id}`;
      const row = make(doc, 'div', 'ps-param');

      const top = make(doc, 'div', 'ps-param-top');
      const label = make(doc, 'span', 'ps-param-label');
      label.textContent = p.label;
      top.appendChild(label);
      if (p.kind !== 'enum') {
        const val = make(doc, 'span', 'ps-val');
        val.dataset.readout = path;
        top.appendChild(val);
      }
      row.appendChild(top);

      let ctl;
      if (p.kind === 'enum') {
        ctl = make(doc, 'select');
        for (const v of p.values) {
          const o = make(doc, 'option');
          o.value = v;
          o.textContent = v;
          ctl.appendChild(o);
        }
        ctl.value = node.getParam(p.id);
        this._listen(which, ctl, 'change', () => this.setParam(path, ctl.value));
      } else {
        ctl = make(doc, 'input');
        ctl.type = 'range';
        ctl.min = String(p.min);
        ctl.max = String(p.max);
        ctl.step = String(p.step ?? 1);
        ctl.value = String(node.getParam(p.id));
        this._listen(which, ctl, 'input', () => this.setParam(path, parseFloat(ctl.value)));
      }
      ctl.dataset.control = path;
      row.appendChild(ctl);
      wrap.appendChild(row);
    }
    return wrap;
  }

  // Writes the camera onto the scene.
  _applyCam(which) {
    const view = this._views[which];
    if (!view) return;
    const cam = this._cam[which];
    view.scene.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`;
  }

  // Holds the camera inside the scene, so every node stays reachable at every zoom.
  _clampCam(which) {
    const view = this._views[which];
    if (!view) return;
    const cam = this._cam[which];
    const c = view.canvas.getBoundingClientRect();
    cam.z = clamp(cam.z, ZOOM_MIN, ZOOM_MAX);
    cam.x = clamp(cam.x, Math.min(0, c.width - SCENE_W * cam.z), 0);
    cam.y = clamp(cam.y, Math.min(0, c.height - SCENE_H * cam.z), 0);
  }

  // Pointer position in model coordinates.
  _toScene(which, clientX, clientY) {
    const view = this._views[which];
    if (!view) return { x: 0, y: 0 };
    const cam = this._cam[which];
    const c = view.canvas.getBoundingClientRect();
    return { x: (clientX - c.left - cam.x) / cam.z, y: (clientY - c.top - cam.y) / cam.z };
  }

  // Zooms about one viewport point, so what is under it stays under it.
  _zoomAt(which, clientX, clientY, z) {
    const view = this._views[which];
    if (!view) return;
    const cam = this._cam[which];
    const c = view.canvas.getBoundingClientRect();
    const sx = (clientX - c.left - cam.x) / cam.z;
    const sy = (clientY - c.top - cam.y) / cam.z;
    cam.z = clamp(z, ZOOM_MIN, ZOOM_MAX);
    cam.x = clientX - c.left - sx * cam.z;
    cam.y = clientY - c.top - sy * cam.z;
    this._clampCam(which);
    this._applyCam(which);
  }

  // Model-space centre of a port's dot.
  _portPoint(which, nodeId, portId, dir) {
    const view = this._views[which];
    if (!view) return null;
    const dot = view.canvas.querySelector(
      `.ps-port[data-node="${nodeId}"][data-port="${portId}"][data-dir="${dir}"] .ps-dot`,
    );
    if (!dot) return null;
    const cam = this._cam[which];
    const c = view.canvas.getBoundingClientRect();
    const r = dot.getBoundingClientRect();
    return {
      x: (r.left - c.left + r.width / 2 - cam.x) / cam.z,
      y: (r.top - c.top + r.height / 2 - cam.y) / cam.z,
    };
  }

  _drawWires(which) {
    const view = this._views[which];
    if (!view) return;
    const doc = view.svg.ownerDocument;
    while (view.svg.firstChild) view.svg.removeChild(view.svg.firstChild);

    for (const edge of this._edges.values()) {
      const from = this._nodes.get(edge.from);
      const a = this._portPoint(which, edge.from, edge.fromPort, 'out');
      const b = this._portPoint(which, edge.to, edge.toPort, 'in');
      if (!from || !a || !b) continue;
      const d = cablePath(a, b);
      const domain = from.portSpec(edge.fromPort, 'out').domain;

      const hit = doc.createElementNS(SVG_NS, 'path');
      hit.setAttribute('class', 'ps-wire-hit');
      hit.setAttribute('d', d);
      hit.dataset.edge = edge.id;
      view.svg.appendChild(hit);

      const line = doc.createElementNS(SVG_NS, 'path');
      line.setAttribute('class', 'ps-wire');
      line.setAttribute('d', d);
      line.dataset.edge = edge.id;
      line.dataset.domain = domain;
      view.svg.appendChild(line);
    }

    if (this._cable && this._cable.which === which && this._cable.to) {
      const a = this._portPoint(which, this._cable.from, this._cable.fromPort, 'out');
      if (a) {
        const live = doc.createElementNS(SVG_NS, 'path');
        live.setAttribute('class', 'ps-wire-live');
        live.setAttribute('d', cablePath(a, this._cable.to));
        view.svg.appendChild(live);
      }
    }
  }

  _onDown(which, ev) {
    const view = this._views[which];
    if (!view) return;
    if (typeof ev.button === 'number' && ev.button > 0) return;

    // the first pointer of a gesture clears anything a missed pointerup left behind
    if (ev.isPrimary !== false) view.pointers.clear();
    view.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (view.pointers.size === 2) {
      this._startPinch(which);
      return;
    }

    const t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest('.ps-kill') || t.closest('.ps-param')) return;

    const wire = t.closest('[data-edge]');
    if (wire) {
      this.disconnect(wire.dataset.edge);
      return;
    }

    const port = t.closest('.ps-port');
    if (port) {
      if (port.dataset.domain === 'trigger') return;
      if (port.dataset.dir === 'out') {
        ev.preventDefault();
        this._cable = {
          which,
          from: port.dataset.node,
          fromPort: port.dataset.port,
          to: null,
        };
        this._capture(which, ev);
      } else if (port.dataset.taken === 'true') {
        this._unpatchInput(port.dataset.node, port.dataset.port);
      }
      return;
    }

    const box = t.closest('.ps-node');
    if (box && t.closest('.ps-node-head')) {
      const node = this._nodes.get(box.dataset.id);
      if (!node) return;
      ev.preventDefault();
      const p = this._toScene(which, ev.clientX, ev.clientY);
      this._drag = { which, id: node.id, dx: p.x - node.x, dy: p.y - node.y };
      box.dataset.dragging = 'true';
      this._capture(which, ev);
    } else if (!box) {
      ev.preventDefault();
      const cam = this._cam[which];
      this._pan = { which, x0: ev.clientX, y0: ev.clientY, px: cam.x, py: cam.y };
      view.canvas.dataset.panning = 'true';
      this._capture(which, ev);
    }
    this._selected = box ? box.dataset.id : null;
    this._markSelection();
  }

  _onMove(which, ev) {
    const view = this._views[which];
    if (!view) return;
    if (view.pointers.has(ev.pointerId)) {
      view.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    }

    if (this._pinch && this._pinch.which === which) {
      this._movePinch(which);
      return;
    }

    if (this._pan && this._pan.which === which) {
      const cam = this._cam[which];
      cam.x = this._pan.px + (ev.clientX - this._pan.x0);
      cam.y = this._pan.py + (ev.clientY - this._pan.y0);
      this._clampCam(which);
      this._applyCam(which);
      return;
    }

    if (this._drag && this._drag.which === which) {
      const node = this._nodes.get(this._drag.id);
      if (!node) return;
      const box = view.canvas.querySelector(`.ps-node[data-id="${node.id}"]`);
      const w = box ? box.offsetWidth : 0;
      const h = box ? box.offsetHeight : 0;
      const p = this._toScene(which, ev.clientX, ev.clientY);
      node.x = Math.round(clamp(p.x - this._drag.dx, 0, Math.max(0, SCENE_W - w)));
      node.y = Math.round(clamp(p.y - this._drag.dy, 0, Math.max(0, SCENE_H - h)));
      if (box) {
        box.style.left = `${node.x}px`;
        box.style.top = `${node.y}px`;
      }
      this._drawWires(which);
      return;
    }

    if (this._cable && this._cable.which === which) {
      this._cable.to = this._toScene(which, ev.clientX, ev.clientY);
      this._drawWires(which);
    }
  }

  _onUp(which, ev) {
    const view = this._views[which];
    if (view) view.pointers.delete(ev.pointerId);

    if (this._pinch && this._pinch.which === which) {
      if (!view || view.pointers.size < 2) this._pinch = null;
      return;
    }
    if (this._pan && this._pan.which === which) {
      this._pan = null;
      if (view) view.canvas.dataset.panning = 'false';
      return;
    }
    if (this._drag && this._drag.which === which) {
      const box = view && view.canvas.querySelector(`.ps-node[data-id="${this._drag.id}"]`);
      if (box) box.dataset.dragging = 'false';
      this._drag = null;
      return;
    }
    if (!this._cable || this._cable.which !== which) return;

    const pending = this._cable;
    this._cable = null;
    const doc = view && view.canvas.ownerDocument;
    const hit = doc && doc.elementFromPoint(ev.clientX, ev.clientY);
    const port = hit && hit.closest && hit.closest('.ps-port[data-dir="in"]');
    if (port) this.connect(pending.from, pending.fromPort, port.dataset.node, port.dataset.port);
    else this._drawWires(which);
  }

  // Wheel, and the trackpad pinch the browser sends as a ctrl-wheel.
  _onWheel(which, ev) {
    const view = this._views[which];
    if (!view) return;
    ev.preventDefault();
    const dy = ev.deltaMode === 1 ? ev.deltaY * WHEEL_LINE : ev.deltaY;
    const cam = this._cam[which];
    this._zoomAt(which, ev.clientX, ev.clientY, cam.z * Math.exp(-dy * ZOOM_WHEEL));
  }

  // Two fingers down. Drops whatever one finger had started.
  _startPinch(which) {
    const view = this._views[which];
    const pts = Array.from(view.pointers.values());
    const cam = this._cam[which];
    if (this._drag) {
      const box = view.canvas.querySelector(`.ps-node[data-id="${this._drag.id}"]`);
      if (box) box.dataset.dragging = 'false';
    }
    this._drag = null;
    this._cable = null;
    this._pan = null;
    view.canvas.dataset.panning = 'false';
    this._pinch = {
      which,
      dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1,
      mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
      z: cam.z,
      x: cam.x,
      y: cam.y,
    };
    this._drawWires(which);
  }

  // Spread zooms, and the midpoint pans.
  _movePinch(which) {
    const view = this._views[which];
    const pts = Array.from(view.pointers.values());
    if (pts.length < 2) return;
    const p = this._pinch;
    const cam = this._cam[which];
    const c = view.canvas.getBoundingClientRect();
    const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    const sx = (p.mid.x - c.left - p.x) / p.z;
    const sy = (p.mid.y - c.top - p.y) / p.z;
    cam.z = clamp(p.z * (dist / p.dist), ZOOM_MIN, ZOOM_MAX);
    cam.x = mid.x - c.left - sx * cam.z;
    cam.y = mid.y - c.top - sy * cam.z;
    this._clampCam(which);
    this._applyCam(which);
  }

  _capture(which, ev) {
    const view = this._views[which];
    if (!view || typeof view.canvas.setPointerCapture !== 'function') return;
    try { view.canvas.setPointerCapture(ev.pointerId); } catch (e) { /* uncapturable */ }
  }

  _markSelection() {
    for (const which of VIEWS) {
      const view = this._views[which];
      if (!view) continue;
      for (const box of view.canvas.querySelectorAll('.ps-node')) {
        box.dataset.selected = String(box.dataset.id === this._selected);
      }
    }
  }

  // Full rebuild. Structure changed.
  _repaint() {
    if (this._quiet) return;
    for (const which of VIEWS) this._paint(which);
  }

  // Values only. Structure unchanged.
  _syncUI() {
    for (const which of VIEWS) {
      const view = this._views[which];
      if (!view) continue;
      for (const node of this._nodes.values()) {
        for (const p of node.spec.params) {
          const path = `${node.id}.${p.id}`;
          const v = node.getParam(p.id);
          const read = view.canvas.querySelector(`[data-readout="${path}"]`);
          if (read) read.textContent = fmtParam(p, v);
          const ctl = view.canvas.querySelector(`[data-control="${path}"]`);
          if (ctl) {
            if (ctl.value !== String(v)) ctl.value = String(v);
            ctl.disabled = node.portIsConnected(p.id);
          }
        }
      }
      this._drawRefusal(which);
    }
  }

  // The refusal lands on the palette entry or the port it belongs to.
  _drawRefusal(which) {
    const view = this._views[which];
    if (!view) return;
    const r = this._lastRefusal;
    view.note.textContent = r ? r.reason : '';
    const where = r ? r.where : null;

    for (const btn of view.palette.querySelectorAll('.ps-add')) {
      btn.classList.toggle('ps-refused', !!(where && where.kind === btn.dataset.kind));
    }
    for (const port of view.canvas.querySelectorAll('.ps-port')) {
      const hit = where && where.node === port.dataset.node && where.port === port.dataset.port;
      if (hit) port.dataset.refused = 'true';
      else delete port.dataset.refused;
    }
  }
}

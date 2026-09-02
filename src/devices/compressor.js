import GainReductionMeter from '../vis/gain-reduction.js';

const PARAMS = [
  { path: 'threshold', label: 'Threshold', min: -60, max: 0, default: -24, unit: 'dB', curve: 'linear' },
  { path: 'ratio', label: 'Ratio', min: 1, max: 20, default: 4, unit: 'x', curve: 'linear' },
  { path: 'attack', label: 'Attack', min: 0, max: 1000, default: 3, unit: 'ms', curve: 'log' },
  { path: 'release', label: 'Release', min: 10, max: 1000, default: 250, unit: 'ms', curve: 'log' },
  { path: 'makeup', label: 'Makeup', min: 0, max: 24, default: 0, unit: 'dB', curve: 'linear' },
];

const BYPASS_FADE_S = 0.015;
const DB_FLOOR = -100;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function dbToLinear(db) {
  return Math.pow(10, db / 20);
}

function peakDb(analyser, buf) {
  analyser.getFloatTimeDomainData(buf);
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i]);
    if (a > peak) peak = a;
  }
  return peak > 0 ? Math.max(DB_FLOOR, 20 * Math.log10(peak)) : DB_FLOOR;
}

let stylesInjected = false;

function ensureStyles() {
  if (stylesInjected || document.getElementById('compressor-styles')) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'compressor-styles';
  style.textContent = `
.comp-root { box-sizing: var(--box-border-box); font-family: var(--font-ui); color: var(--text); background: var(--device-head); border-radius: var(--r-body); padding: var(--sp-6); display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-5); }
.comp-root *, .comp-root *::before, .comp-root *::after { box-sizing: var(--box-border-box); }
.comp-row { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-3); }
.comp-label { color: var(--text-dim); font-size: var(--fs-xs); min-width: var(--sp-30); }
.comp-row input[type="range"] { accent-color: var(--knob-fill); flex: var(--flex-1); }
.comp-readout { color: var(--text-dim); font-variant-numeric: var(--num-tabular); min-width: var(--sp-em-36); text-align: var(--ta-right); }
.comp-meter { width: var(--pct-100); }
.comp-bypass { background: var(--color-transparent); border: var(--bw) solid var(--line); color: var(--bypass-off); border-radius: var(--r-ctl); padding: var(--sp-2) var(--sp-4); cursor: var(--cur-pointer); font: var(--font-inherit); }
.comp-bypass.on { color: var(--bypass-on); }
`;
  document.head.appendChild(style);
  stylesInjected = true;
}

export default class Compressor {
  static id = 'compressor';
  static label = 'Compressor';
  static estimatedWeight = 45;
  static params = PARAMS;

  constructor(ctx) {
    this.ctx = ctx;

    this._input = ctx.createGain();
    this._inTap = ctx.createAnalyser();
    this._inTap.fftSize = 256;
    this._comp = ctx.createDynamicsCompressor();
    this._makeup = ctx.createGain();
    this._outTap = ctx.createAnalyser();
    this._outTap.fftSize = 256;
    this._wetMix = ctx.createGain();
    this._dryMix = ctx.createGain();
    this._dryMix.gain.value = 0;
    this._output = ctx.createGain();

    this._input.connect(this._inTap);
    this._inTap.connect(this._comp);
    this._comp.connect(this._makeup);
    this._makeup.connect(this._outTap);
    this._outTap.connect(this._wetMix);
    this._wetMix.connect(this._output);
    this._input.connect(this._dryMix);
    this._dryMix.connect(this._output);

    this._inBuf = new Float32Array(this._inTap.fftSize);
    this._outBuf = new Float32Array(this._outTap.fftSize);

    this._params = {};
    for (const p of PARAMS) this._params[p.path] = p.default;
    this._applyAll();

    this._bypass = false;
    this._mount = null;
  }

  get input() {
    return this._input;
  }

  get output() {
    return this._output;
  }

  _applyAll() {
    this._comp.threshold.value = this._params.threshold;
    this._comp.ratio.value = this._params.ratio;
    this._comp.attack.value = this._params.attack / 1000;
    this._comp.release.value = this._params.release / 1000;
    this._makeup.gain.value = dbToLinear(this._params.makeup);
  }

  setParam(path, value) {
    const def = PARAMS.find((p) => p.path === path);
    if (!def) return;
    const v = clamp(value, def.min, def.max);
    this._params[path] = v;
    switch (path) {
      case 'threshold':
        this._comp.threshold.value = v;
        break;
      case 'ratio':
        this._comp.ratio.value = v;
        break;
      case 'attack':
        this._comp.attack.value = v / 1000;
        break;
      case 'release':
        this._comp.release.value = v / 1000;
        break;
      case 'makeup':
        this._makeup.gain.value = dbToLinear(v);
        break;
    }
  }

  getParam(path) {
    return this._params[path];
  }

  get bypass() {
    return this._bypass;
  }

  set bypass(v) {
    this._bypass = !!v;
    const now = this.ctx.currentTime;
    const wet = this._bypass ? 0 : 1;
    const dry = this._bypass ? 1 : 0;
    this._wetMix.gain.cancelScheduledValues(now);
    this._wetMix.gain.setTargetAtTime(wet, now, BYPASS_FADE_S);
    this._dryMix.gain.cancelScheduledValues(now);
    this._dryMix.gain.setTargetAtTime(dry, now, BYPASS_FADE_S);
  }

  getState() {
    return { ...this._params };
  }

  setState(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const p of PARAMS) {
      if (Number.isFinite(obj[p.path])) this.setParam(p.path, obj[p.path]);
    }
  }

  get readout() {
    return {
      reductionDb: Math.min(0, this._comp.reduction),
      inputDb: peakDb(this._inTap, this._inBuf),
      outputDb: peakDb(this._outTap, this._outBuf),
    };
  }

  get cpuWeight() {
    return Compressor.estimatedWeight;
  }

  getAnalyser(which) {
    return null;
  }

  mountCompact(el) {
    ensureStyles();
    el.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'comp-root';

    const meterHost = document.createElement('div');
    meterHost.className = 'comp-meter';
    root.appendChild(meterHost);
    const meter = new GainReductionMeter(this);
    meter.mount(meterHost);

    const sliders = {};
    for (const p of PARAMS) {
      const row = document.createElement('div');
      row.className = 'comp-row';
      const label = document.createElement('span');
      label.className = 'comp-label';
      label.textContent = p.label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(p.min);
      input.max = String(p.max);
      input.step = String((p.max - p.min) / 1000);
      input.value = String(this._params[p.path]);
      const readout = document.createElement('span');
      readout.className = 'comp-readout';
      readout.textContent = `${this._params[p.path].toFixed(1)} ${p.unit}`;
      input.addEventListener('input', () => {
        this.setParam(p.path, Number(input.value));
        readout.textContent = `${this._params[p.path].toFixed(1)} ${p.unit}`;
      });
      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(readout);
      root.appendChild(row);
      sliders[p.path] = { input, readout };
    }

    const bypassBtn = document.createElement('button');
    bypassBtn.className = 'comp-bypass';
    bypassBtn.type = 'button';
    bypassBtn.textContent = 'Bypass';
    bypassBtn.addEventListener('click', () => {
      this.bypass = !this._bypass;
      bypassBtn.classList.toggle('on', this._bypass);
    });
    root.appendChild(bypassBtn);

    el.appendChild(root);
    this._mount = { el, root, meter, sliders };
  }

  unmount() {
    let listenersDropped = 0;
    if (this._mount) {
      listenersDropped = PARAMS.length + 1;
      this._mount.meter.dispose();
      this._mount.el.innerHTML = '';
      this._mount = null;
    }
    return listenersDropped;
  }

  dispose() {
    const listenersDropped = this.unmount();

    let nodesDisconnected = 0;
    const nodes = [
      this._input,
      this._inTap,
      this._comp,
      this._makeup,
      this._outTap,
      this._wetMix,
      this._dryMix,
      this._output,
    ];
    for (const node of nodes) {
      try {
        node.disconnect();
        nodesDisconnected++;
      } catch (e) {
        /* already disconnected */
      }
    }
    return { nodesDisconnected, listenersDropped };
  }
}

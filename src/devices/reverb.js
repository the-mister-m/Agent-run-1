const PARAMS = [
  { path: 'size', label: 'Size', min: 0.1, max: 4.0, default: 1.5, unit: 's', curve: 'log', step: 0.01 },
  { path: 'damping', label: 'Damping', min: 0, max: 100, default: 40, unit: '%', curve: 'linear', step: 1 },
  { path: 'mix', label: 'Mix', min: 0, max: 100, default: 25, unit: '%', curve: 'linear', step: 1 },
];

const WEIGHT_TABLE = [
  [0.1, 133], [0.25, 150], [0.5, 165], [1.0, 184], [2.0, 235], [4.0, 325],
];

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function interpWeight(seconds) {
  const first = WEIGHT_TABLE[0];
  const last = WEIGHT_TABLE[WEIGHT_TABLE.length - 1];
  if (seconds <= first[0]) return first[1];
  if (seconds >= last[0]) return last[1];
  for (let i = 0; i < WEIGHT_TABLE.length - 1; i++) {
    const [s0, w0] = WEIGHT_TABLE[i];
    const [s1, w1] = WEIGHT_TABLE[i + 1];
    if (seconds >= s0 && seconds <= s1) {
      const t = (seconds - s0) / (s1 - s0);
      return Math.round(w0 + (w1 - w0) * t);
    }
  }
  return last[1];
}

function buildImpulse(ctx, seconds, dampingPct) {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.round(seconds * rate));
  const buffer = ctx.createBuffer(2, length, rate);
  const smoothing = clamp(dampingPct, 0, 100) / 100 * 0.85;
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      prev = prev + smoothing * (white - prev);
      const decay = (1 - i / length) ** 2;
      data[i] = prev * decay;
    }
  }
  return buffer;
}

function sliderToValue(spec, t) {
  if (spec.curve === 'log') {
    const lo = Math.log(spec.min);
    const hi = Math.log(spec.max);
    return Math.exp(lo + (hi - lo) * t);
  }
  return spec.min + (spec.max - spec.min) * t;
}

function valueToSlider(spec, v) {
  if (spec.curve === 'log') {
    const lo = Math.log(spec.min);
    const hi = Math.log(spec.max);
    return (Math.log(v) - lo) / (hi - lo);
  }
  return (v - spec.min) / (spec.max - spec.min);
}

function formatValue(spec, v) {
  if (spec.unit === 's') return `${v.toFixed(2)} s`;
  if (spec.unit === '%') return `${Math.round(v)}%`;
  return `${v}`;
}

const BYPASS_RAMP = 0.015;

let stylesInjected = false;

function ensureStylesInjected() {
  if (stylesInjected || document.getElementById('cbdaw-reverb-styles')) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'cbdaw-reverb-styles';
  style.textContent = `
.cbdaw-rvb { box-sizing: border-box; font-family: var(--font-ui); color: var(--text); background: var(--popout-ground); border-radius: var(--r-body); padding: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-3); }
.cbdaw-rvb *, .cbdaw-rvb *::before, .cbdaw-rvb *::after { box-sizing: border-box; }
.cbdaw-rvb-head { display: flex; align-items: center; justify-content: space-between; background: var(--device-head); border-radius: var(--r-ctl); padding: var(--sp-2) var(--sp-3); }
.cbdaw-rvb-title { font-size: var(--fs-sm); font-weight: var(--w-med); color: var(--text); }
.cbdaw-rvb-bypass { font: var(--font-inherit); font-size: var(--fs-xs); border: var(--bw) solid var(--line); border-radius: var(--r-sm); background: transparent; color: var(--bypass-off); padding: var(--sp-1) var(--sp-3); cursor: pointer; transition: var(--tr-color); }
.cbdaw-rvb-bypass[data-active="true"] { color: var(--bypass-on); border-color: var(--bypass-on); }
.cbdaw-rvb-row { display: flex; align-items: center; gap: var(--sp-3); }
.cbdaw-rvb-label { font-size: var(--fs-xs); color: var(--text-dim); min-width: var(--sp-16); }
.cbdaw-rvb-row input[type="range"] { flex: 1; accent-color: var(--knob-fill); height: var(--sp-2); background: var(--knob-track); border-radius: var(--r-cell); }
.cbdaw-rvb-readout { font-size: var(--fs-xs); color: var(--text-dim); min-width: var(--sp-16); text-align: right; font-variant-numeric: tabular-nums; }
`;
  document.head.appendChild(style);
  stylesInjected = true;
}

export default class Reverb {
  static id = 'reverb';
  static label = 'Reverb';
  static estimatedWeight = 135;
  static params = PARAMS;

  constructor(ctx) {
    this._ctx = ctx;
    this._input = ctx.createGain();
    this._output = ctx.createGain();
    this._dry = ctx.createGain();
    this._wet = ctx.createGain();
    this._convolver = ctx.createConvolver();
    this._convolver.normalize = true;

    this._input.connect(this._dry);
    this._dry.connect(this._output);
    this._input.connect(this._convolver);
    this._convolver.connect(this._wet);
    this._wet.connect(this._output);

    this._bypass = false;
    this._values = {};
    for (const spec of PARAMS) this._values[spec.path] = spec.default;

    this._mount = null;
    this._listeners = [];

    this._rebuildImpulse();
    this._applyMix();
  }

  get input() { return this._input; }
  get output() { return this._output; }

  setParam(path, value) {
    const spec = PARAMS.find(p => p.path === path);
    if (!spec) return;
    this._values[path] = clamp(value, spec.min, spec.max);
    if (path === 'size' || path === 'damping') this._rebuildImpulse();
    if (path === 'mix') this._applyMix();
    this._syncRow(path);
  }

  getParam(path) { return this._values[path]; }

  get bypass() { return this._bypass; }
  set bypass(v) {
    this._bypass = !!v;
    this._applyMix();
    if (this._mount) this._mount.bypassBtn.dataset.active = String(this._bypass);
  }

  getState() {
    return { size: this._values.size, damping: this._values.damping, mix: this._values.mix };
  }

  setState(obj) {
    if (!obj) return;
    for (const spec of PARAMS) {
      if (obj[spec.path] !== undefined) this._values[spec.path] = clamp(obj[spec.path], spec.min, spec.max);
    }
    this._rebuildImpulse();
    this._applyMix();
    for (const spec of PARAMS) this._syncRow(spec.path);
  }

  getAnalyser() { return null; }
  get readout() { return null; }

  mountCompact(el) {
    ensureStylesInjected();
    el.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'cbdaw-rvb';

    const head = document.createElement('div');
    head.className = 'cbdaw-rvb-head';
    const title = document.createElement('span');
    title.className = 'cbdaw-rvb-title';
    title.textContent = Reverb.label;
    const bypassBtn = document.createElement('button');
    bypassBtn.className = 'cbdaw-rvb-bypass';
    bypassBtn.type = 'button';
    bypassBtn.textContent = 'Bypass';
    bypassBtn.dataset.active = String(this._bypass);
    const onBypass = () => { this.bypass = !this._bypass; };
    bypassBtn.addEventListener('click', onBypass);
    this._listeners.push([bypassBtn, 'click', onBypass]);
    head.appendChild(title);
    head.appendChild(bypassBtn);
    root.appendChild(head);

    const rows = {};
    for (const spec of PARAMS) {
      const row = document.createElement('div');
      row.className = 'cbdaw-rvb-row';
      const label = document.createElement('span');
      label.className = 'cbdaw-rvb-label';
      label.textContent = spec.label;
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '1000';
      slider.step = '1';
      slider.value = String(Math.round(valueToSlider(spec, this._values[spec.path]) * 1000));
      const readout = document.createElement('span');
      readout.className = 'cbdaw-rvb-readout';
      readout.textContent = formatValue(spec, this._values[spec.path]);
      const onInput = () => {
        const t = Number(slider.value) / 1000;
        this.setParam(spec.path, sliderToValue(spec, t));
      };
      slider.addEventListener('input', onInput);
      this._listeners.push([slider, 'input', onInput]);
      row.appendChild(label);
      row.appendChild(slider);
      row.appendChild(readout);
      root.appendChild(row);
      rows[spec.path] = { slider, readout };
    }

    el.appendChild(root);
    this._mount = { el, root, bypassBtn, rows };
  }

  unmount() {
    for (const [node, type, fn] of this._listeners) node.removeEventListener(type, fn);
    this._listeners = [];
    if (this._mount) {
      this._mount.el.innerHTML = '';
      this._mount = null;
    }
  }

  dispose() {
    this.unmount();
    this._input.disconnect();
    this._dry.disconnect();
    this._wet.disconnect();
    this._convolver.disconnect();
    this._output.disconnect();
  }

  get cpuWeight() { return interpWeight(this._values.size); }

  _rebuildImpulse() {
    this._convolver.buffer = buildImpulse(this._ctx, this._values.size, this._values.damping);
  }

  _applyMix() {
    const now = this._ctx.currentTime;
    const mixFrac = this._values.mix / 100;
    const dryTarget = this._bypass ? 1 : (1 - mixFrac);
    const wetTarget = this._bypass ? 0 : mixFrac;
    this._dry.gain.setTargetAtTime(dryTarget, now, BYPASS_RAMP);
    this._wet.gain.setTargetAtTime(wetTarget, now, BYPASS_RAMP);
  }

  _syncRow(path) {
    if (!this._mount) return;
    const spec = PARAMS.find(p => p.path === path);
    const row = this._mount.rows[path];
    if (!spec || !row) return;
    row.slider.value = String(Math.round(valueToSlider(spec, this._values[path]) * 1000));
    row.readout.textContent = formatValue(spec, this._values[path]);
  }
}

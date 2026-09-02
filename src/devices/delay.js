const PARAMS = [
  { path: 'time', label: 'Time', min: 10, max: 2000, default: 250, unit: 'ms', curve: 'log', step: 1 },
  { path: 'feedback', label: 'Feedback', min: 0, max: 95, default: 35, unit: '%', curve: 'linear', step: 1 },
  { path: 'tone', label: 'Tone', min: 200, max: 12000, default: 6000, unit: 'Hz', curve: 'log', step: 10 },
  { path: 'mix', label: 'Mix', min: 0, max: 100, default: 30, unit: '%', curve: 'linear', step: 1 },
];

const MAX_DELAY_SECONDS = 2.05;
const RAMP = 0.02;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
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
  if (spec.unit === 'ms') return `${Math.round(v)} ms`;
  if (spec.unit === 'Hz') return `${Math.round(v)} Hz`;
  if (spec.unit === '%') return `${Math.round(v)}%`;
  return `${v}`;
}

let stylesInjected = false;

function ensureStylesInjected() {
  if (stylesInjected || document.getElementById('cbdaw-dly-styles')) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'cbdaw-dly-styles';
  style.textContent = `
.cbdaw-dly { box-sizing: border-box; font-family: var(--font-ui); color: var(--text); background: var(--popout-ground); border-radius: var(--r-body); padding: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-3); }
.cbdaw-dly *, .cbdaw-dly *::before, .cbdaw-dly *::after { box-sizing: border-box; }
.cbdaw-dly-head { display: flex; align-items: center; justify-content: space-between; background: var(--device-head); border-radius: var(--r-ctl); padding: var(--sp-2) var(--sp-3); }
.cbdaw-dly-title { font-size: var(--fs-sm); font-weight: var(--w-med); color: var(--text); }
.cbdaw-dly-bypass { font: var(--font-inherit); font-size: var(--fs-xs); border: var(--bw) solid var(--line); border-radius: var(--r-sm); background: transparent; color: var(--bypass-off); padding: var(--sp-1) var(--sp-3); cursor: pointer; transition: var(--tr-color); }
.cbdaw-dly-bypass[data-active="true"] { color: var(--bypass-on); border-color: var(--bypass-on); }
.cbdaw-dly-row { display: flex; align-items: center; gap: var(--sp-3); }
.cbdaw-dly-label { font-size: var(--fs-xs); color: var(--text-dim); min-width: var(--sp-16); }
.cbdaw-dly-row input[type="range"] { flex: 1; accent-color: var(--knob-fill); height: var(--sp-2); background: var(--knob-track); border-radius: var(--r-cell); }
.cbdaw-dly-readout { font-size: var(--fs-xs); color: var(--text-dim); min-width: var(--sp-16); text-align: right; font-variant-numeric: tabular-nums; }
`;
  document.head.appendChild(style);
  stylesInjected = true;
}

export default class Delay {
  static id = 'delay';
  static label = 'Delay';
  static estimatedWeight = 5;
  static params = PARAMS;

  constructor(ctx) {
    this._ctx = ctx;
    this._input = ctx.createGain();
    this._output = ctx.createGain();
    this._dry = ctx.createGain();
    this._wet = ctx.createGain();
    this._delayNode = ctx.createDelay(MAX_DELAY_SECONDS);
    this._feedbackGain = ctx.createGain();
    this._toneFilter = ctx.createBiquadFilter();
    this._toneFilter.type = 'lowpass';

    this._input.connect(this._dry);
    this._dry.connect(this._output);
    this._input.connect(this._delayNode);
    this._delayNode.connect(this._wet);
    this._wet.connect(this._output);
    this._delayNode.connect(this._feedbackGain);
    this._feedbackGain.connect(this._toneFilter);
    this._toneFilter.connect(this._delayNode);

    this._bypass = false;
    this._values = {};
    for (const spec of PARAMS) this._values[spec.path] = spec.default;

    this._mount = null;
    this._listeners = [];

    this._applyTime();
    this._applyFeedback();
    this._applyTone();
    this._applyMix();
  }

  get input() { return this._input; }
  get output() { return this._output; }

  setParam(path, value) {
    const spec = PARAMS.find(p => p.path === path);
    if (!spec) return;
    this._values[path] = clamp(value, spec.min, spec.max);
    if (path === 'time') this._applyTime();
    if (path === 'feedback') this._applyFeedback();
    if (path === 'tone') this._applyTone();
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
    return {
      time: this._values.time,
      feedback: this._values.feedback,
      tone: this._values.tone,
      mix: this._values.mix,
    };
  }

  setState(obj) {
    if (!obj) return;
    for (const spec of PARAMS) {
      if (obj[spec.path] !== undefined) this._values[spec.path] = clamp(obj[spec.path], spec.min, spec.max);
    }
    this._applyTime();
    this._applyFeedback();
    this._applyTone();
    this._applyMix();
    for (const spec of PARAMS) this._syncRow(spec.path);
  }

  getAnalyser() { return null; }
  get readout() { return null; }
  get cpuWeight() { return Delay.estimatedWeight; }

  mountCompact(el) {
    ensureStylesInjected();
    el.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'cbdaw-dly';

    const head = document.createElement('div');
    head.className = 'cbdaw-dly-head';
    const title = document.createElement('span');
    title.className = 'cbdaw-dly-title';
    title.textContent = Delay.label;
    const bypassBtn = document.createElement('button');
    bypassBtn.className = 'cbdaw-dly-bypass';
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
      row.className = 'cbdaw-dly-row';
      const label = document.createElement('span');
      label.className = 'cbdaw-dly-label';
      label.textContent = spec.label;
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '1000';
      slider.step = '1';
      slider.value = String(Math.round(valueToSlider(spec, this._values[spec.path]) * 1000));
      const readout = document.createElement('span');
      readout.className = 'cbdaw-dly-readout';
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
    this._delayNode.disconnect();
    this._feedbackGain.disconnect();
    this._toneFilter.disconnect();
    this._output.disconnect();
  }

  _applyTime() {
    const now = this._ctx.currentTime;
    this._delayNode.delayTime.setTargetAtTime(this._values.time / 1000, now, RAMP);
  }

  _applyFeedback() {
    const now = this._ctx.currentTime;
    const fb = clamp(this._values.feedback, 0, 95) / 100;
    this._feedbackGain.gain.setTargetAtTime(fb, now, RAMP);
  }

  _applyTone() {
    const now = this._ctx.currentTime;
    this._toneFilter.frequency.setTargetAtTime(this._values.tone, now, RAMP);
  }

  _applyMix() {
    const now = this._ctx.currentTime;
    const mixFrac = this._values.mix / 100;
    const dryTarget = this._bypass ? 1 : (1 - mixFrac);
    const wetTarget = this._bypass ? 0 : mixFrac;
    this._dry.gain.setTargetAtTime(dryTarget, now, RAMP);
    this._wet.gain.setTargetAtTime(wetTarget, now, RAMP);
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

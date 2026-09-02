// devices/eq.js — three-band peaking EQ. Reuses vis/spectrum.js; draws its own
// response curve on a canvas layered over it.

import Spectrum from '../vis/spectrum.js';

const BAND_COUNT = 3;
const BAND_DEFAULT_FREQ = [200, 1000, 5000];
const BAND_TOKENS = ['--band-1', '--band-2', '--band-3'];
const AXIS_MIN_HZ = 20;
const AXIS_MAX_HZ = 20000;
const ESTIMATED_WEIGHT = 29;
const BYPASS_RAMP_S = 0.015;
const SMOOTH_TIME_S = 0.01;

const PARAM_SPEC = {
  gain: { label: 'Gain', min: -24, max: 24, unit: 'dB', curve: 'linear', step: 0.1 },
  freq: { label: 'Freq', min: 20, max: 20000, unit: 'Hz', curve: 'log', step: 1 },
  q: { label: 'Q', min: 0.1, max: 18, unit: '', curve: 'log', step: 0.01 },
};

function buildParams() {
  const out = [];
  for (let n = 0; n < BAND_COUNT; n++) {
    out.push({ path: `band${n}.gain`, ...PARAM_SPEC.gain, default: 0 });
    out.push({ path: `band${n}.freq`, ...PARAM_SPEC.freq, default: BAND_DEFAULT_FREQ[n] });
    out.push({ path: `band${n}.q`, ...PARAM_SPEC.q, default: 1 });
  }
  return out;
}

const PARAM_PATH_RE = /^band([0-2])\.(gain|freq|q)$/;

function parsePath(path) {
  const m = PARAM_PATH_RE.exec(path);
  if (!m) return null;
  return { n: Number(m[1]), field: m[2] };
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function toSlider(def, value) {
  const v = clamp(value, def.min, def.max);
  if (def.curve === 'log') {
    const lo = Math.log(def.min);
    const hi = Math.log(def.max);
    return (Math.log(v) - lo) / (hi - lo);
  }
  return (v - def.min) / (def.max - def.min);
}

function fromSlider(def, t) {
  const tt = clamp(t, 0, 1);
  if (def.curve === 'log') {
    const lo = Math.log(def.min);
    const hi = Math.log(def.max);
    return Math.exp(lo + tt * (hi - lo));
  }
  return def.min + tt * (def.max - def.min);
}

function formatHz(hz) {
  if (hz >= 10000) return `${(hz / 1000).toFixed(0)}k`;
  if (hz >= 1000) return `${(hz / 1000).toFixed(hz % 1000 === 0 ? 0 : 1)}k`;
  return `${Math.round(hz)}`;
}

function formatParam(def, value) {
  if (def.unit === 'dB') return `${value >= 0 ? '+' : ''}${value.toFixed(1)} dB`;
  if (def.unit === 'Hz') return `${formatHz(value)} Hz`;
  return value.toFixed(2);
}

const CANVAS_COLOR_TOKENS = ['--band-curve', '--band-fill', '--band-handle', '--band-1', '--band-2', '--band-3'];
const CANVAS_LITERAL_TOKENS = ['--fade-faint', '--op-dim'];
const CANVAS_UNITLESS_TOKENS = ['--canvas-lw-2', '--canvas-lw-3'];
const CANVAS_LENGTH_TOKENS = ['--sp-2'];

function measureToken(el, token, cssProp) {
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style[cssProp] = `var(${token})`;
  el.appendChild(probe);
  const v = parseFloat(getComputedStyle(probe)[cssProp]);
  el.removeChild(probe);
  return v;
}

function readCanvasTokens(el) {
  const cs = getComputedStyle(el);
  const out = {};
  for (const key of CANVAS_COLOR_TOKENS) out[key] = cs.getPropertyValue(key).trim();
  for (const key of CANVAS_LITERAL_TOKENS) out[key] = parseFloat(cs.getPropertyValue(key));
  for (const key of CANVAS_UNITLESS_TOKENS) out[key] = measureToken(el, key, 'zIndex');
  for (const key of CANVAS_LENGTH_TOKENS) out[key] = measureToken(el, key, 'width');
  return out;
}

let stylesInjected = false;

function ensureStylesInjected() {
  if (stylesInjected || document.getElementById('eqd-styles')) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'eqd-styles';
  style.textContent = `
.eqd-root { box-sizing: var(--box-border-box); font-family: var(--font-ui); color: var(--text); background: var(--popout-ground); border: var(--bw) solid var(--line); border-radius: var(--r-body); display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-6); width: var(--pct-100); padding: var(--sp-4); }
.eqd-root *, .eqd-root *::before, .eqd-root *::after { box-sizing: var(--box-border-box); }
.eqd-head { display: var(--disp-flex); align-items: var(--align-center); justify-content: var(--justify-space-between); background: var(--device-head); border-radius: var(--r-ctl); padding: var(--sp-2) var(--sp-4); }
.eqd-label { font-size: var(--fs-md); font-weight: var(--w-bold); color: var(--text); letter-spacing: var(--track-title); }
.eqd-bypass { font: var(--font-inherit); font-size: var(--fs-xs); font-weight: var(--w-med); color: var(--text); background: var(--bypass-off); border: var(--none); border-radius: var(--r-sm); padding: var(--sp-1) var(--sp-3); cursor: var(--cur-pointer); transition: var(--tr-background); }
.eqd-bypass.on { background: var(--bypass-on); }
.eqd-spectrum { position: var(--pos-relative); width: var(--pct-100); }
.eqd-curve { position: var(--pos-absolute); inset: var(--sp-0); width: var(--pct-100); height: var(--pct-100); display: var(--disp-block); pointer-events: var(--pe-none); }
.eqd-bands { display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-4); }
.eqd-band { display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-1h); border-top: var(--bw) solid var(--line); padding-top: var(--sp-2); }
.eqd-band-head { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-2); }
.eqd-swatch { width: var(--sp-4); height: var(--sp-4); border-radius: var(--r-pill); flex: var(--flex-0-0-auto); }
.eqd-band-name { font-size: var(--fs-xs); color: var(--text-dim); text-transform: var(--tt-label); letter-spacing: var(--track-label); }
.eqd-knob-row { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-3); }
.eqd-knob-label { font-size: var(--fs-xs); color: var(--text-dim); min-width: var(--sp-em-16); }
.eqd-knob-bar { position: var(--pos-relative); flex: var(--flex-1); height: var(--sp-4); background: var(--knob-track); border-radius: var(--r-cell); cursor: var(--cur-ew-resize); touch-action: var(--touch-none); user-select: var(--usel-none); }
.eqd-knob-fill { position: var(--pos-absolute); inset: var(--sp-0); left: var(--sp-0); width: var(--pct-0); height: var(--pct-100); background: var(--knob-fill); border-radius: var(--r-cell); pointer-events: var(--pe-none); }
.eqd-knob-pointer { position: var(--pos-absolute); top: var(--sp-0); bottom: var(--sp-0); left: var(--pct-0); width: var(--bw-2); background: var(--knob-pointer); pointer-events: var(--pe-none); transform: translateX(-50%); }
.eqd-knob-readout { font-size: var(--fs-xs); color: var(--text); font-variant-numeric: var(--num-tabular); min-width: var(--sp-em-46); text-align: var(--ta-right); }
`;
  document.head.appendChild(style);
  stylesInjected = true;
}

export default class EQ {
  static id = 'eq';
  static label = 'EQ';
  static estimatedWeight = ESTIMATED_WEIGHT;
  static params = buildParams();

  constructor(ctx) {
    this.ctx = ctx;
    this._bypass = false;

    this._input = ctx.createGain();
    this._output = ctx.createGain();
    this._dryGain = ctx.createGain();
    this._wetGain = ctx.createGain();

    this._bands = [];
    let prev = this._input;
    for (let n = 0; n < BAND_COUNT; n++) {
      const f = ctx.createBiquadFilter();
      f.type = 'peaking';
      f.frequency.value = BAND_DEFAULT_FREQ[n];
      f.gain.value = 0;
      f.Q.value = 1;
      prev.connect(f);
      prev = f;
      this._bands.push(f);
    }

    this._analyser = ctx.createAnalyser();
    this._analyser.fftSize = 2048;
    prev.connect(this._analyser);

    prev.connect(this._wetGain);
    this._input.connect(this._dryGain);
    this._wetGain.connect(this._output);
    this._dryGain.connect(this._output);
    this._wetGain.gain.value = 1;
    this._dryGain.gain.value = 0;

    this._params = {};
    for (const p of EQ.params) this._params[p.path] = p.default;

    this._root = null;
    this._spectrumWrap = null;
    this._spectrum = null;
    this._curveCanvas = null;
    this._curveG = null;
    this._curveFreqs = null;
    this._curveMag = null;
    this._curvePhase = null;
    this._curveDb = null;
    this._ro = null;
    this._bypassBtn = null;
    this._knobs = [];
    this._listeners = [];
  }

  get input() {
    return this._input;
  }

  get output() {
    return this._output;
  }

  setParam(path, value) {
    const parsed = parsePath(path);
    if (!parsed) return;
    const band = this._bands[parsed.n];
    const def = PARAM_SPEC[parsed.field];
    const v = clamp(value, def.min, def.max);
    const t = this.ctx.currentTime;
    this._params[path] = v;
    if (parsed.field === 'gain') band.gain.setTargetAtTime(v, t, SMOOTH_TIME_S);
    else if (parsed.field === 'freq') band.frequency.setTargetAtTime(v, t, SMOOTH_TIME_S);
    else band.Q.setTargetAtTime(v, t, SMOOTH_TIME_S);
    this._syncKnob(path);
    this._drawCurve();
  }

  getParam(path) {
    return this._params[path];
  }

  get bypass() {
    return this._bypass;
  }

  set bypass(v) {
    const on = !!v;
    if (on === this._bypass) return;
    this._bypass = on;
    const t = this.ctx.currentTime;
    this._wetGain.gain.cancelScheduledValues(t);
    this._dryGain.gain.cancelScheduledValues(t);
    this._wetGain.gain.setValueAtTime(this._wetGain.gain.value, t);
    this._dryGain.gain.setValueAtTime(this._dryGain.gain.value, t);
    this._wetGain.gain.linearRampToValueAtTime(on ? 0 : 1, t + BYPASS_RAMP_S);
    this._dryGain.gain.linearRampToValueAtTime(on ? 1 : 0, t + BYPASS_RAMP_S);
    this._syncBypassBtn();
    this._drawCurve();
  }

  getState() {
    const state = {};
    for (const p of EQ.params) state[p.path] = this._params[p.path];
    return state;
  }

  setState(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const p of EQ.params) {
      const v = obj[p.path];
      if (Number.isFinite(v)) this.setParam(p.path, v);
    }
  }

  getAnalyser(which) {
    if (which === 'spectrum') return this._analyser;
    return null;
  }

  get readout() {
    return null;
  }

  get cpuWeight() {
    return ESTIMATED_WEIGHT;
  }

  mountCompact(el) {
    ensureStylesInjected();
    this._root = document.createElement('div');
    this._root.className = 'eqd-root';

    const head = document.createElement('div');
    head.className = 'eqd-head';
    const label = document.createElement('span');
    label.className = 'eqd-label';
    label.textContent = EQ.label;
    this._bypassBtn = document.createElement('button');
    this._bypassBtn.type = 'button';
    this._bypassBtn.className = 'eqd-bypass';
    this._bypassBtn.textContent = 'Bypass';
    this._listen(this._bypassBtn, 'click', () => {
      this.bypass = !this.bypass;
    });
    head.append(label, this._bypassBtn);

    this._spectrumWrap = document.createElement('div');
    this._spectrumWrap.className = 'eqd-spectrum';

    this._curveCanvas = document.createElement('canvas');
    this._curveCanvas.className = 'eqd-curve';
    this._curveCanvas.setAttribute('role', 'presentation');
    this._curveCanvas.setAttribute('aria-hidden', 'true');
    this._curveG = this._curveCanvas.getContext('2d');

    const bandsEl = document.createElement('div');
    bandsEl.className = 'eqd-bands';
    this._knobs = [];
    for (let n = 0; n < BAND_COUNT; n++) {
      bandsEl.appendChild(this._buildBandRow(n));
    }

    this._root.append(head, this._spectrumWrap, bandsEl);
    el.appendChild(this._root);

    this._spectrum = new Spectrum(this, { minHz: AXIS_MIN_HZ, maxHz: AXIS_MAX_HZ });
    this._spectrum.mountCompact(this._spectrumWrap);
    this._spectrumWrap.appendChild(this._curveCanvas);

    this._ro = new ResizeObserver(() => this._resizeCurve());
    this._ro.observe(this._spectrumWrap);
    this._resizeCurve();
    this._syncBypassBtn();
  }

  _buildBandRow(n) {
    const row = document.createElement('div');
    row.className = 'eqd-band';

    const bandHead = document.createElement('div');
    bandHead.className = 'eqd-band-head';
    const swatch = document.createElement('span');
    swatch.className = 'eqd-swatch';
    swatch.style.background = `var(${BAND_TOKENS[n]})`;
    const name = document.createElement('span');
    name.className = 'eqd-band-name';
    name.textContent = `Band ${n + 1}`;
    bandHead.append(swatch, name);
    row.appendChild(bandHead);

    for (const field of ['gain', 'freq', 'q']) {
      const path = `band${n}.${field}`;
      const def = PARAM_SPEC[field];
      row.appendChild(this._buildKnobRow(path, def));
    }
    return row;
  }

  _buildKnobRow(path, def) {
    const row = document.createElement('div');
    row.className = 'eqd-knob-row';

    const label = document.createElement('span');
    label.className = 'eqd-knob-label';
    label.textContent = def.label;

    const bar = document.createElement('div');
    bar.className = 'eqd-knob-bar';
    const fill = document.createElement('div');
    fill.className = 'eqd-knob-fill';
    const pointer = document.createElement('div');
    pointer.className = 'eqd-knob-pointer';
    bar.append(fill, pointer);

    const readout = document.createElement('span');
    readout.className = 'eqd-knob-readout';

    row.append(label, bar, readout);

    const render = (value) => {
      const t = toSlider(def, value) * 100;
      fill.style.width = `${t}%`;
      pointer.style.left = `${t}%`;
      readout.textContent = formatParam(def, value);
    };

    const setFromClientX = (clientX) => {
      const rect = bar.getBoundingClientRect();
      const t = rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0;
      this.setParam(path, fromSlider(def, t));
    };

    let dragging = false;
    this._listen(bar, 'pointerdown', (e) => {
      dragging = true;
      bar.setPointerCapture(e.pointerId);
      setFromClientX(e.clientX);
    });
    this._listen(bar, 'pointermove', (e) => {
      if (dragging) setFromClientX(e.clientX);
    });
    this._listen(bar, 'pointerup', () => {
      dragging = false;
    });
    this._listen(bar, 'pointercancel', () => {
      dragging = false;
    });

    this._knobs.push({ path, render });
    render(this._params[path]);
    return row;
  }

  _syncKnob(path) {
    for (const k of this._knobs) {
      if (k.path === path) k.render(this._params[path]);
    }
  }

  _syncBypassBtn() {
    if (!this._bypassBtn) return;
    this._bypassBtn.classList.toggle('on', this._bypass);
  }

  _resizeCurve() {
    if (!this._curveCanvas || !this._spectrumWrap) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this._spectrumWrap.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    this._curveCanvas.width = Math.round(w * dpr);
    this._curveCanvas.height = Math.round(h * dpr);
    this._curveG.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._curveW = w;
    this._curveH = h;
    this._buildFreqArray(this._plot(w, h));
    this._drawCurve();
  }

  _plot(w, h) {
    const font = Math.round(clamp(h / 18, 10, 15) * 0.85);
    const padL = 4;
    const padR = 6;
    const padT = 4;
    const padB = Math.round(font * 1.7);
    return {
      x0: padL,
      y0: padT,
      w: Math.max(1, w - padL - padR),
      h: Math.max(1, h - padT - padB),
    };
  }

  _buildFreqArray(plot) {
    const cols = Math.max(1, Math.round(plot.w));
    const freqs = new Float32Array(cols);
    const lo = Math.log(AXIS_MIN_HZ);
    const hi = Math.log(AXIS_MAX_HZ);
    for (let c = 0; c < cols; c++) {
      const t = cols > 1 ? c / (cols - 1) : 0;
      freqs[c] = Math.exp(lo + t * (hi - lo));
    }
    this._curveFreqs = freqs;
    this._curveMag = new Float32Array(cols);
    this._curvePhase = new Float32Array(cols);
    this._curveDb = new Float32Array(cols);
    this._plotRect = plot;
  }

  _computeCurveDb() {
    const freqs = this._curveFreqs;
    const mag = this._curveMag;
    const phase = this._curvePhase;
    const totalDb = this._curveDb;
    totalDb.fill(0);
    for (const band of this._bands) {
      band.getFrequencyResponse(freqs, mag, phase);
      for (let i = 0; i < freqs.length; i++) totalDb[i] += 20 * Math.log10(mag[i] || 1e-8);
    }
    return totalDb;
  }

  _drawCurve() {
    const g = this._curveG;
    if (!g || !this._curveFreqs) return;
    const p = this._plotRect;
    const totalDb = this._computeCurveDb();
    const tokens = readCanvasTokens(this._spectrumWrap);

    const dimAlpha = tokens['--op-dim'];
    const fillAlpha = tokens['--fade-faint'];
    const curveW = tokens['--canvas-lw-3'];
    const handleW = tokens['--canvas-lw-2'];
    const handleR = tokens['--sp-2'];
    const gainMax = PARAM_SPEC.gain.max;

    g.clearRect(0, 0, this._curveW, this._curveH);
    g.globalAlpha = this._bypass ? dimAlpha : 1;

    const yOf = (db) => p.y0 + p.h / 2 - (clamp(db, -gainMax, gainMax) / gainMax) * (p.h / 2);
    const count = totalDb.length;

    g.beginPath();
    g.moveTo(p.x0, yOf(0));
    for (let c = 0; c < count; c++) g.lineTo(p.x0 + c, yOf(totalDb[c]));
    g.lineTo(p.x0 + count - 1, yOf(0));
    g.closePath();
    g.fillStyle = tokens['--band-fill'];
    g.globalAlpha = (this._bypass ? dimAlpha : 1) * fillAlpha;
    g.fill();

    g.globalAlpha = this._bypass ? dimAlpha : 1;
    g.beginPath();
    for (let c = 0; c < count; c++) {
      const y = yOf(totalDb[c]);
      if (c === 0) g.moveTo(p.x0 + c, y);
      else g.lineTo(p.x0 + c, y);
    }
    g.strokeStyle = tokens['--band-curve'];
    g.lineWidth = curveW;
    g.lineJoin = 'round';
    g.stroke();

    const lo = Math.log(AXIS_MIN_HZ);
    const hi = Math.log(AXIS_MAX_HZ);
    for (let n = 0; n < BAND_COUNT; n++) {
      const freq = this._params[`band${n}.freq`];
      const db = this._params[`band${n}.gain`];
      const x = p.x0 + ((Math.log(clamp(freq, AXIS_MIN_HZ, AXIS_MAX_HZ)) - lo) / (hi - lo)) * p.w;
      const y = yOf(db);
      g.beginPath();
      g.arc(x, y, handleR, 0, Math.PI * 2);
      g.fillStyle = tokens[BAND_TOKENS[n]];
      g.fill();
      g.lineWidth = handleW;
      g.strokeStyle = tokens['--band-handle'];
      g.stroke();
    }

    g.globalAlpha = 1;
  }

  _listen(el, type, fn) {
    el.addEventListener(type, fn);
    this._listeners.push({ el, type, fn });
  }

  _dropListeners() {
    for (const { el, type, fn } of this._listeners) el.removeEventListener(type, fn);
    this._listeners = [];
  }

  unmount() {
    this._dropListeners();
    if (this._ro) this._ro.disconnect();
    this._ro = null;
    if (this._spectrum) this._spectrum.dispose();
    this._spectrum = null;
    if (this._root && this._root.parentNode) this._root.parentNode.removeChild(this._root);
    this._root = null;
    this._spectrumWrap = null;
    this._curveCanvas = null;
    this._curveG = null;
    this._bypassBtn = null;
    this._knobs = [];
  }

  dispose() {
    this.unmount();
    try {
      this._input.disconnect();
    } catch (e) {
      /* already disconnected */
    }
    try {
      this._dryGain.disconnect();
    } catch (e) {
      /* already disconnected */
    }
    for (const band of this._bands) {
      try {
        band.disconnect();
      } catch (e) {
        /* already disconnected */
      }
    }
    try {
      this._wetGain.disconnect();
    } catch (e) {
      /* already disconnected */
    }
    try {
      this._analyser.disconnect();
    } catch (e) {
      /* already disconnected */
    }
    try {
      this._output.disconnect();
    } catch (e) {
      /* already disconnected */
    }
  }
}

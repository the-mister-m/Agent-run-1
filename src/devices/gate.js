const PARAMS = [
  { path: 'threshold', label: 'Threshold', min: -80, max: 0, default: -40, unit: 'dB', curve: 'linear' },
  { path: 'attack', label: 'Attack', min: 0.1, max: 100, default: 2, unit: 'ms', curve: 'log' },
  { path: 'release', label: 'Release', min: 5, max: 2000, default: 100, unit: 'ms', curve: 'log' },
];

const BYPASS_FADE_S = 0.015;
const DB_FLOOR = -100;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
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
  if (stylesInjected || document.getElementById('gate-styles')) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'gate-styles';
  style.textContent = `
.gate-root { box-sizing: var(--box-border-box); font-family: var(--font-ui); color: var(--text); background: var(--device-head); border-radius: var(--r-body); padding: var(--sp-6); display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-5); }
.gate-root *, .gate-root *::before, .gate-root *::after { box-sizing: var(--box-border-box); }
.gate-row { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-3); }
.gate-label { color: var(--text-dim); font-size: var(--fs-xs); min-width: var(--sp-30); }
.gate-row input[type="range"] { accent-color: var(--knob-fill); flex: var(--flex-1); }
.gate-readout { color: var(--text-dim); font-variant-numeric: var(--num-tabular); min-width: var(--sp-em-36); text-align: var(--ta-right); }
.gate-state { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-3); }
.gate-dot { width: var(--sp-6); height: var(--sp-6); border-radius: var(--r-pill); background: var(--gate-closed); transition: var(--tr-background); }
.gate-dot.open { background: var(--gate-open); }
.gate-thresh { color: var(--gate-threshold); font-variant-numeric: var(--num-tabular); }
.gate-bypass { background: var(--color-transparent); border: var(--bw) solid var(--line); color: var(--bypass-off); border-radius: var(--r-ctl); padding: var(--sp-2) var(--sp-4); cursor: var(--cur-pointer); font: var(--font-inherit); }
.gate-bypass.on { color: var(--bypass-on); }
`;
  document.head.appendChild(style);
  stylesInjected = true;
}

export default class Gate {
  static id = 'gate';
  static label = 'Gate';
  static estimatedWeight = 3;
  static params = PARAMS;

  constructor(ctx) {
    this.ctx = ctx;

    this._input = ctx.createGain();
    this._detect = ctx.createAnalyser();
    this._detect.fftSize = 256;
    this._gateStage = ctx.createGain();
    this._gateStage.gain.value = 0;
    this._wetMix = ctx.createGain();
    this._dryMix = ctx.createGain();
    this._dryMix.gain.value = 0;
    this._output = ctx.createGain();

    this._input.connect(this._detect);
    this._detect.connect(this._gateStage);
    this._gateStage.connect(this._wetMix);
    this._wetMix.connect(this._output);
    this._input.connect(this._dryMix);
    this._dryMix.connect(this._output);

    this._buf = new Float32Array(this._detect.fftSize);

    this._params = {};
    for (const p of PARAMS) this._params[p.path] = p.default;

    this._bypass = false;
    this._open = false;
    this._levelDb = DB_FLOOR;

    this._mount = null;
    this._tickBound = this._tick.bind(this);
    this._raf = requestAnimationFrame(this._tickBound);
  }

  get input() {
    return this._input;
  }

  get output() {
    return this._output;
  }

  setParam(path, value) {
    const def = PARAMS.find((p) => p.path === path);
    if (!def) return;
    this._params[path] = clamp(value, def.min, def.max);
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
    return { open: this._open, levelDb: this._levelDb };
  }

  get cpuWeight() {
    return Gate.estimatedWeight;
  }

  getAnalyser(which) {
    if (which === 'scope') return this._detect;
    return null;
  }

  _tick() {
    this._raf = requestAnimationFrame(this._tickBound);

    const level = peakDb(this._detect, this._buf);
    this._levelDb = level;
    const target = level > this._params.threshold;

    if (target !== this._open) {
      this._open = target;
      const now = this.ctx.currentTime;
      const rampS = (target ? this._params.attack : this._params.release) / 1000;
      this._gateStage.gain.cancelScheduledValues(now);
      this._gateStage.gain.setValueAtTime(this._gateStage.gain.value, now);
      this._gateStage.gain.linearRampToValueAtTime(target ? 1 : 0, now + rampS);
    }

    if (this._mount) this._paint();
  }

  mountCompact(el) {
    ensureStyles();
    el.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'gate-root';

    const state = document.createElement('div');
    state.className = 'gate-state';
    const dot = document.createElement('span');
    dot.className = 'gate-dot';
    const thresh = document.createElement('span');
    thresh.className = 'gate-thresh';
    state.appendChild(dot);
    state.appendChild(thresh);
    root.appendChild(state);

    const sliders = {};
    for (const p of PARAMS) {
      const row = document.createElement('div');
      row.className = 'gate-row';
      const label = document.createElement('span');
      label.className = 'gate-label';
      label.textContent = p.label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(p.min);
      input.max = String(p.max);
      input.step = String((p.max - p.min) / 1000);
      input.value = String(this._params[p.path]);
      const readout = document.createElement('span');
      readout.className = 'gate-readout';
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
    bypassBtn.className = 'gate-bypass';
    bypassBtn.type = 'button';
    bypassBtn.textContent = 'Bypass';
    bypassBtn.addEventListener('click', () => {
      this.bypass = !this._bypass;
      bypassBtn.classList.toggle('on', this._bypass);
    });
    root.appendChild(bypassBtn);

    el.appendChild(root);
    this._mount = { el, root, dot, thresh, sliders };
    this._paint();
  }

  _paint() {
    if (!this._mount) return;
    this._mount.dot.classList.toggle('open', this._open);
    this._mount.thresh.textContent = `${this._levelDb.toFixed(1)} dB`;
  }

  unmount() {
    let listenersDropped = 0;
    if (this._mount) {
      listenersDropped = PARAMS.length + 1;
      this._mount.el.innerHTML = '';
      this._mount = null;
    }
    return listenersDropped;
  }

  dispose() {
    const listenersDropped = this.unmount();
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;

    let nodesDisconnected = 0;
    for (const node of [this._input, this._detect, this._gateStage, this._wetMix, this._dryMix, this._output]) {
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

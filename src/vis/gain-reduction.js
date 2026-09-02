const RANGE_DB = 24;

let stylesInjected = false;

function ensureStyles() {
  if (stylesInjected || document.getElementById('gain-reduction-styles')) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'gain-reduction-styles';
  style.textContent = `
.grm-root { box-sizing: var(--box-border-box); display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-2); font-family: var(--font-ui); }
.grm-track { position: var(--pos-relative); width: var(--pct-100); height: var(--sp-30); background: var(--reduction-track); border-radius: var(--r-sm); overflow: hidden; }
.grm-zero { position: var(--pos-absolute); top: var(--sp-0); left: var(--sp-0); right: var(--sp-0); height: var(--bw); background: var(--reduction-zero); }
.grm-fill { position: var(--pos-absolute); top: var(--sp-0); left: var(--sp-0); right: var(--sp-0); height: var(--sp-0); background: var(--reduction-fill); }
.grm-value { color: var(--text-dim); font-size: var(--fs-xs); font-variant-numeric: var(--num-tabular); text-align: var(--ta-right); }
`;
  document.head.appendChild(style);
  stylesInjected = true;
}

export default class GainReductionMeter {
  static id = 'gain-reduction';
  static label = 'Gain Reduction';

  constructor(device) {
    if (!device || !('readout' in device)) {
      throw new TypeError('GainReductionMeter: needs a device exposing readout');
    }
    this.device = device;
    this.el = null;
    this._fill = null;
    this._value = null;
    this._raf = 0;
    this._tickBound = this._tick.bind(this);
  }

  mount(el) {
    ensureStyles();
    el.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'grm-root';
    const track = document.createElement('div');
    track.className = 'grm-track';
    const zero = document.createElement('div');
    zero.className = 'grm-zero';
    const fill = document.createElement('div');
    fill.className = 'grm-fill';
    track.appendChild(fill);
    track.appendChild(zero);
    const value = document.createElement('div');
    value.className = 'grm-value';
    value.textContent = '0.0 dB';
    root.appendChild(track);
    root.appendChild(value);
    el.appendChild(root);

    this.el = el;
    this._fill = fill;
    this._value = value;
    this._raf = requestAnimationFrame(this._tickBound);
  }

  _tick() {
    this._raf = requestAnimationFrame(this._tickBound);
    const readout = this.device.readout;
    const reductionDb = readout && Number.isFinite(readout.reductionDb) ? readout.reductionDb : 0;
    const pct = Math.min(1, Math.max(0, -reductionDb / RANGE_DB)) * 100;
    this._fill.style.height = `${pct}%`;
    this._value.textContent = `${reductionDb.toFixed(1)} dB`;
  }

  unmount() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    if (this.el) this.el.innerHTML = '';
    this.el = null;
    this._fill = null;
    this._value = null;
  }

  dispose() {
    this.unmount();
  }
}

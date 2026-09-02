// vis/meter.js — level meter. Canvas, rAF, IntersectionObserver-gated.

const STYLE_ID = 'cbdaw-meter-style';
let liveInstances = 0;

const STYLE_TEXT = `
.cbdaw-meter {
  position: var(--pos-relative);
  width: var(--pct-100);
  height: var(--pct-100);
  box-sizing: var(--box-border-box);
  overflow: var(--ov-hidden);
  border-radius: var(--r-cell);
}
.cbdaw-meter canvas {
  display: var(--disp-block);
  width: var(--pct-100);
  height: var(--pct-100);
}
`;

function acquireStyle() {
  liveInstances++;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
}

function releaseStyle() {
  liveInstances = Math.max(0, liveInstances - 1);
  if (liveInstances > 0) return;
  document.getElementById(STYLE_ID)?.remove();
}

const TOKENS = [
  '--meter-track',
  '--meter-ok',
  '--meter-hot',
  '--meter-peak',
  '--meter-clip',
  '--meter-tick',
];

function readTokens(el) {
  const cs = getComputedStyle(el);
  const out = {};
  for (const key of TOKENS) out[key] = cs.getPropertyValue(key).trim();
  return out;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

const HOT_THRESHOLD = 0.75;
const CLIP_THRESHOLD = 0.98;
const CLIP_HOLD_MS = 800;
const LEVEL_RELEASE_PER_FRAME = 0.06;
const PEAK_DECAY_PER_FRAME = 0.01;

export default class Meter {
  constructor(analyser, { peakHoldMs = 1200, orientation = 'vertical' } = {}) {
    if (!analyser || typeof analyser.getByteTimeDomainData !== 'function') {
      throw new TypeError('Meter: needs an AnalyserNode');
    }
    this.analyser = analyser;
    this.peakHoldMs = peakHoldMs;
    this.orientation = orientation === 'horizontal' ? 'horizontal' : 'vertical';

    this._buf = new Uint8Array(analyser.fftSize);
    this._level = 0;
    this._peak = 0;
    this._peakAt = 0;
    this._clipUntil = 0;

    this.el = null;
    this.wrap = null;
    this.canvas = null;
    this.g = null;
    this.tokens = {};
    this._mounted = false;
    this._raf = 0;
    this._ro = null;
    this._io = null;
    this._visible = true;
    this._w = 0;
    this._h = 0;
    this._loop = this._loop.bind(this);
  }

  mount(el) {
    if (this._mounted) this.unmount();
    if (!el) throw new TypeError('Meter.mount: needs a container element');
    acquireStyle();

    this.el = el;
    const wrap = document.createElement('div');
    wrap.className = 'cbdaw-meter';
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'level meter');
    wrap.appendChild(canvas);
    el.appendChild(wrap);

    this.wrap = wrap;
    this.canvas = canvas;
    this.g = canvas.getContext('2d', { alpha: false });
    this.tokens = readTokens(wrap);
    this._mounted = true;
    this._resize();

    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(wrap);
    }
    if (typeof IntersectionObserver === 'function') {
      this._io = new IntersectionObserver((entries) => {
        for (const e of entries) this._visible = e.isIntersecting;
      });
      this._io.observe(wrap);
    }

    this._raf = requestAnimationFrame(this._loop);
  }

  unmount() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    if (this._ro) this._ro.disconnect();
    this._ro = null;
    if (this._io) this._io.disconnect();
    this._io = null;
    if (this.wrap && this.wrap.parentNode) this.wrap.parentNode.removeChild(this.wrap);
    if (this._mounted) releaseStyle();
    this.wrap = null;
    this.canvas = null;
    this.g = null;
    this.el = null;
    this._mounted = false;
  }

  dispose() {
    this.unmount();
    this.analyser = null;
    this._buf = null;
  }

  get level() {
    return this._level;
  }

  get peak() {
    return this._peak;
  }

  _resize() {
    if (!this.canvas || !this.wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.wrap.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._w = w;
    this._h = h;
    this.tokens = readTokens(this.wrap);
  }

  _loop(now) {
    if (!this._mounted) return;
    this._raf = requestAnimationFrame(this._loop);
    if (!this._visible) return;

    this.analyser.getByteTimeDomainData(this._buf);
    let inst = 0;
    for (let i = 0; i < this._buf.length; i++) {
      const v = Math.abs(this._buf[i] - 128) / 128;
      if (v > inst) inst = v;
    }
    inst = clamp(inst, 0, 1);

    if (inst > this._level) this._level = inst;
    else this._level -= (this._level - inst) * LEVEL_RELEASE_PER_FRAME;

    if (inst >= this._peak) {
      this._peak = inst;
      this._peakAt = now;
    } else if (now - this._peakAt > this.peakHoldMs) {
      this._peak = Math.max(inst, this._peak - PEAK_DECAY_PER_FRAME);
    }

    if (inst >= CLIP_THRESHOLD) this._clipUntil = now + CLIP_HOLD_MS;

    this._draw(now);
  }

  _draw(now) {
    const g = this.g;
    const t = this.tokens;
    const w = this._w;
    const h = this._h;
    const vertical = this.orientation === 'vertical';

    g.fillStyle = t['--meter-track'];
    g.fillRect(0, 0, w, h);

    g.strokeStyle = t['--meter-tick'];
    g.lineWidth = 1;
    for (const frac of [0.25, 0.5, 0.75]) {
      g.beginPath();
      if (vertical) {
        const y = Math.round(h - h * frac) + 0.5;
        g.moveTo(0, y);
        g.lineTo(w, y);
      } else {
        const x = Math.round(w * frac) + 0.5;
        g.moveTo(x, 0);
        g.lineTo(x, h);
      }
      g.stroke();
    }

    const lvl = this._level;
    const hotStart = Math.min(lvl, HOT_THRESHOLD);
    const hotLen = Math.max(0, lvl - HOT_THRESHOLD);

    if (vertical) {
      g.fillStyle = t['--meter-ok'];
      g.fillRect(0, h - hotStart * h, w, hotStart * h);
      if (hotLen > 0) {
        g.fillStyle = t['--meter-hot'];
        g.fillRect(0, h - lvl * h, w, hotLen * h);
      }
    } else {
      g.fillStyle = t['--meter-ok'];
      g.fillRect(0, 0, hotStart * w, h);
      if (hotLen > 0) {
        g.fillStyle = t['--meter-hot'];
        g.fillRect(hotStart * w, 0, hotLen * w, h);
      }
    }

    g.fillStyle = t['--meter-peak'];
    if (vertical) {
      const py = Math.max(0, Math.min(h - 1, h - this._peak * h));
      g.fillRect(0, py, w, 1);
    } else {
      const px = Math.max(0, Math.min(w - 1, this._peak * w));
      g.fillRect(px, 0, 1, h);
    }

    if (now < this._clipUntil) {
      g.fillStyle = t['--meter-clip'];
      if (vertical) g.fillRect(0, 0, w, Math.max(2, h * 0.04));
      else g.fillRect(w - Math.max(2, w * 0.04), 0, Math.max(2, w * 0.04), h);
    }
  }
}

// mixer/automation.js — automation lanes for the mixer: gain, pan, mute, solo. Nothing else.

import { clock, ticksPerBar, ticksPerBeat } from '../core/clock.js';

const STYLE_ID = 'cbdaw-autolane-style';
let liveInstances = 0;

const STYLE_TEXT = `
.cbdaw-autolane {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  width: var(--pct-100);
  height: var(--sp-14);
  box-sizing: var(--box-border-box);
  font-family: var(--font-ui);
  color: var(--text);
  background: var(--lane-ground);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-sm);
  overflow: var(--ov-hidden);
  user-select: var(--usel-none);
}
.cbdaw-autolane__head {
  display: var(--disp-flex);
  align-items: var(--align-center);
  justify-content: var(--justify-space-between);
  flex: var(--flex-0-0-auto);
  padding: var(--sp-hair) var(--sp-2);
  background: var(--raise);
  font-size: var(--fs-micro);
  color: var(--text-dim);
}
.cbdaw-autolane__target {
  font-weight: var(--w-med);
  overflow: var(--ov-hidden);
  white-space: var(--ws-nowrap);
  text-overflow: var(--to-ellipsis);
}
.cbdaw-autolane__clear {
  font: var(--font-inherit);
  font-size: var(--fs-micro);
  color: var(--text-dim);
  background: var(--raise);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-sm);
  cursor: var(--cur-pointer);
  padding: var(--sp-hair) var(--sp-1);
}
.cbdaw-autolane__body {
  position: var(--pos-relative);
  flex: var(--flex-1);
  min-height: var(--sp-0);
}
.cbdaw-autolane__canvas {
  display: var(--disp-block);
  width: var(--pct-100);
  height: var(--pct-100);
  cursor: var(--cur-pointer);
  touch-action: var(--touch-none);
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
  '--lane-ground', '--lane-grid', '--lane-curve', '--lane-point', '--lane-point-on',
  '--lane-step', '--playhead-line', '--canvas-lw', '--canvas-lw-2', '--sp-2',
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

// §16.6 / §7: exactly four targets, nothing else automates.
export const TARGET_DOMAIN = {
  'strip.gain': [0, 1.5],
  'strip.pan': [-1, 1],
  'strip.mute': [0, 1],
  'strip.solo': [0, 1],
};
export const AUTOMATION_TARGETS = Object.keys(TARGET_DOMAIN);
const CONTINUOUS = new Set(['strip.gain', 'strip.pan']);
const PROP_OF = { 'strip.gain': 'gain', 'strip.pan': 'pan', 'strip.mute': 'mute', 'strip.solo': 'solo' };
const HAND_SELECTOR = { 'strip.gain': '.cbdaw-strip__fader', 'strip.pan': '.cbdaw-strip__pan' };

const SAMPLE_S = 0.02; // continuous resample rate, transport-scheduled, never rAF

// one point per tick; a second write at the same tick replaces the first; ascending
function sortPoints(points) {
  const byTick = new Map();
  for (const p of points) byTick.set(p.tick, { tick: p.tick, value: p.value });
  return [...byTick.values()].sort((a, b) => a.tick - b.tick);
}

// linear in the target's own domain; held flat before the first point and after the last
function valueAt(points, tick) {
  const first = points[0];
  const last = points[points.length - 1];
  if (tick <= first.tick) return first.value;
  if (tick >= last.tick) return last.value;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (tick >= a.tick && tick <= b.tick) {
      if (b.tick === a.tick) return a.value;
      return a.value + (b.value - a.value) * ((tick - a.tick) / (b.tick - a.tick));
    }
  }
  return last.value;
}

// the "on" value in effect at tick, from the last point at or before it; off if none yet
function steppedValueAt(points, tick, lo) {
  let v = lo;
  for (const p of points) {
    if (p.tick > tick) break;
    v = p.value;
  }
  return v;
}

export class AutomationLane {
  constructor(strip, target) {
    if (!AUTOMATION_TARGETS.includes(target)) {
      throw new TypeError(`AutomationLane: unknown target "${target}"`);
    }
    this.strip = strip;
    this.target = target;
    this._prop = PROP_OF[target];
    this._continuous = CONTINUOUS.has(target);
    const [lo, hi] = TARGET_DOMAIN[target];
    this._lo = lo;
    this._hi = hi;
    this._points = [];
    this._held = false; // a hand is on the strip's own fader/pan right now
    this._pendingIds = new Set(); // clock.schedule ids not yet fired
    this._pendingTimeouts = new Set(); // residual-delay timers bridging to the exact atTime

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
    this._drag = null; // pointerId while a stroke is being drawn on this lane
    this._activeTick = null; // point under the live cursor, drawn with --lane-point-on

    this._onTick = this._onTick.bind(this);
    this._loop = this._loop.bind(this);
    this._resize = this._resize.bind(this);

    clock.on('tick', this._onTick);
    this._bindHand();
  }

  _bindHand() {
    const sel = HAND_SELECTOR[this.target];
    if (!sel) return; // mute/solo: a click sets state outright, no hold to fight
    const el = this.strip?.wrap?.querySelector(sel);
    if (!el) return; // strip not mounted yet — call rebind() once it is
    this._handEl = el;
    this._handStart = () => {
      this._held = true;
    };
    this._handEnd = () => {
      this._held = false;
    };
    el.addEventListener('pointerdown', this._handStart);
    el.addEventListener('pointerup', this._handEnd);
    el.addEventListener('pointercancel', this._handEnd);
  }

  _unbindHand() {
    if (!this._handEl) return;
    this._handEl.removeEventListener('pointerdown', this._handStart);
    this._handEl.removeEventListener('pointerup', this._handEnd);
    this._handEl.removeEventListener('pointercancel', this._handEnd);
    this._handEl = null;
  }

  // call after the strip's own DOM mounts, if this lane was built first
  rebind() {
    this._unbindHand();
    this._bindHand();
  }

  getPoints() {
    return this._points.map((p) => ({ tick: p.tick, value: p.value }));
  }

  setPoints(points) {
    this._points = sortPoints(
      (Array.isArray(points) ? points : []).map((p) => ({
        tick: Math.max(0, Math.round(Number(p.tick) || 0)),
        value: clamp(Number(p.value) || 0, this._lo, this._hi),
      }))
    );
    this._draw();
  }

  addPoint(tick, value) {
    const t = Math.max(0, Math.round(tick));
    const v = clamp(Number(value) || 0, this._lo, this._hi);
    this._points = sortPoints([...this._points.filter((p) => p.tick !== t), { tick: t, value: v }]);
    this._activeTick = t;
    this._draw();
  }

  removePoint(tick) {
    this._points = this._points.filter((p) => p.tick !== tick);
    this._draw();
  }

  clear() {
    this._points = [];
    this._activeTick = null;
    this._draw();
  }

  // §7: an empty lane is not written to the project file
  getState() {
    if (!this._points.length) return null;
    return { target: this.target, points: this.getPoints() };
  }

  setState(state) {
    if (!state || state.target !== this.target) return;
    this.setPoints(state.points);
  }

  // §3/§16.6: values are scheduled from clock.on('tick'), never from rAF.
  _onTick({ fromTick, toTick, timeOf, secPerTick }) {
    if (!this._points.length || this._held) return;
    if (this._continuous) {
      const step = Math.max(1, Math.round(SAMPLE_S / secPerTick));
      for (let t = fromTick; t < toTick; t += step) this._writeAt(timeOf(t), valueAt(this._points, t));
    } else {
      for (const p of this._points) {
        if (p.tick >= fromTick && p.tick < toTick) this._writeAt(timeOf(p.tick), p.value, true);
      }
    }
  }

  // clock.schedule's callback fires up to LOOKAHEAD_S early, on purpose, so the callee can
  // land the real write at the exact instant. strip.js's setters take no future time, so a
  // short residual setTimeout — bounded by the same lookahead — closes that gap here.
  _writeAt(atTime, rawValue, stepped = false) {
    const clockId = clock.schedule(atTime, () => {
      this._pendingIds.delete(clockId);
      const ctx = this.strip?.ctx;
      const commit = () => this._commit(rawValue, stepped);
      if (!ctx) {
        commit();
        return;
      }
      const waitMs = Math.max(0, (atTime - ctx.currentTime) * 1000);
      if (waitMs <= 4) {
        commit();
        return;
      }
      const toId = setTimeout(() => {
        this._pendingTimeouts.delete(toId);
        commit();
      }, waitMs);
      this._pendingTimeouts.add(toId);
    });
    this._pendingIds.add(clockId);
  }

  _commit(rawValue, stepped) {
    if (!this.strip) return;
    if (!stepped && this._held) return; // the hand wins while held; the lane resumes on release
    const value = clamp(rawValue, this._lo, this._hi);
    this.strip[this._prop] = stepped ? !!value : value;
  }

  mountCompact(el) {
    if (this._mounted) this.unmount();
    if (!el) throw new TypeError('AutomationLane.mountCompact: needs a container element');
    acquireStyle();
    this.el = el;

    const root = document.createElement('div');
    root.className = 'cbdaw-autolane';

    const head = document.createElement('div');
    head.className = 'cbdaw-autolane__head';
    const label = document.createElement('span');
    label.className = 'cbdaw-autolane__target';
    label.textContent = this.target;
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'cbdaw-autolane__clear';
    clearBtn.textContent = 'clear';
    this._onClear = () => this.clear();
    clearBtn.addEventListener('click', this._onClear);
    head.appendChild(label);
    head.appendChild(clearBtn);
    root.appendChild(head);

    const body = document.createElement('div');
    body.className = 'cbdaw-autolane__body';
    const canvas = document.createElement('canvas');
    canvas.className = 'cbdaw-autolane__canvas';
    body.appendChild(canvas);
    root.appendChild(body);

    el.appendChild(root);
    this.wrap = root;
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this._mounted = true;
    this._resize();
    this._wireDraw(canvas);
    this.rebind();

    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(this._resize);
      this._ro.observe(canvas);
    }
    if (typeof IntersectionObserver === 'function') {
      this._io = new IntersectionObserver((entries) => {
        for (const e of entries) this._visible = e.isIntersecting;
      });
      this._io.observe(canvas);
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
    if (this.canvas) this._unwireDraw(this.canvas);
    if (this.wrap && this.wrap.parentNode) this.wrap.parentNode.removeChild(this.wrap);
    if (this._mounted) releaseStyle();
    this.wrap = null;
    this.canvas = null;
    this.g = null;
    this.el = null;
    this._mounted = false;
  }

  dispose() {
    clock.off('tick', this._onTick);
    for (const id of this._pendingIds) clock.unschedule(id);
    this._pendingIds.clear();
    for (const id of this._pendingTimeouts) clearTimeout(id);
    this._pendingTimeouts.clear();
    this._unbindHand();
    this.unmount();
    this.strip = null;
  }

  _resize() {
    if (!this.canvas || !this.wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._w = w;
    this._h = h;
    this.tokens = readTokens(this.wrap);
    this._draw();
  }

  _totalTicks() {
    return Math.max(1, clock.songLengthBars * ticksPerBar(clock.timeSignature));
  }

  _wireDraw(canvas) {
    const rectXY = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const pxToTick = (x) => clamp(Math.round((x / this._w) * this._totalTicks()), 0, this._totalTicks());
    const pxToValue = (y) => this._lo + clamp(1 - y / this._h, 0, 1) * (this._hi - this._lo);

    const down = (e) => {
      this._drag = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // not capturable
      }
      const { x, y } = rectXY(e);
      if (this._continuous) {
        this.addPoint(pxToTick(x), pxToValue(y));
      } else {
        const t = Math.round(pxToTick(x) / ticksPerBeat(clock.timeSignature)) * ticksPerBeat(clock.timeSignature);
        const cur = steppedValueAt(this._points, t, this._lo);
        this.addPoint(t, cur === this._hi ? this._lo : this._hi);
      }
    };
    const move = (e) => {
      if (this._drag !== e.pointerId || !this._continuous) return;
      const { x, y } = rectXY(e);
      this.addPoint(pxToTick(x), pxToValue(y));
    };
    const up = (e) => {
      if (this._drag === e.pointerId) this._drag = null;
      this._activeTick = null;
      this._draw();
    };

    this._drawHandlers = { down, move, up };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  }

  _unwireDraw(canvas) {
    if (!this._drawHandlers) return;
    const { down, move, up } = this._drawHandlers;
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    this._drawHandlers = null;
  }

  _loop() {
    if (!this._mounted) return;
    this._raf = requestAnimationFrame(this._loop);
    if (!this._visible) return;
    this._draw();
  }

  _draw() {
    if (!this.g || !this._mounted) return;
    const g = this.g;
    const t = this.tokens;
    const w = this._w;
    const h = this._h;
    const totalTicks = this._totalTicks();
    const xAt = (tick) => (tick / totalTicks) * w;
    const yAt = (value) => h - ((value - this._lo) / (this._hi - this._lo)) * h;

    g.fillStyle = t['--lane-ground'];
    g.fillRect(0, 0, w, h);

    g.strokeStyle = t['--lane-grid'];
    g.lineWidth = parseFloat(t['--canvas-lw']);
    const bars = clock.songLengthBars;
    const tpBar = ticksPerBar(clock.timeSignature);
    for (let b = 0; b <= bars; b++) {
      const x = Math.round(xAt(b * tpBar)) + 0.5;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }

    const pointR = parseFloat(t['--sp-2']);
    if (this._points.length) {
      if (this._continuous) {
        g.strokeStyle = t['--lane-curve'];
        g.lineWidth = parseFloat(t['--canvas-lw-2']);
        g.beginPath();
        const first = this._points[0];
        const last = this._points[this._points.length - 1];
        g.moveTo(0, yAt(first.value));
        g.lineTo(xAt(first.tick), yAt(first.value));
        for (const p of this._points) g.lineTo(xAt(p.tick), yAt(p.value));
        g.lineTo(w, yAt(last.value));
        g.stroke();

        for (const p of this._points) {
          g.fillStyle = p.tick === this._activeTick ? t['--lane-point-on'] : t['--lane-point'];
          g.beginPath();
          g.arc(xAt(p.tick), yAt(p.value), pointR, 0, Math.PI * 2);
          g.fill();
        }
      } else {
        g.fillStyle = t['--lane-step'];
        for (let i = 0; i < this._points.length; i++) {
          const p = this._points[i];
          if (!p.value) continue; // only "on" segments are drawn
          const nextTick = i + 1 < this._points.length ? this._points[i + 1].tick : totalTicks;
          const x0 = xAt(p.tick);
          g.fillRect(x0, 0, Math.max(1, xAt(nextTick) - x0), h);
        }
        for (const p of this._points) {
          g.fillStyle = p.tick === this._activeTick ? t['--lane-point-on'] : t['--lane-point'];
          g.beginPath();
          g.arc(xAt(p.tick), h / 2, pointR, 0, Math.PI * 2);
          g.fill();
        }
      }
    }

    const pos = clock.positionTicks;
    if (pos >= 0 && pos <= totalTicks) {
      g.strokeStyle = t['--playhead-line'];
      g.lineWidth = parseFloat(t['--canvas-lw']);
      const x = Math.round(xAt(pos)) + 0.5;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
  }
}

// one channel's §7 automation array — up to one lane per target, empty ones omitted
export function createChannelAutomation(strip) {
  const lanes = new Map();
  const lane = (target) => {
    if (!lanes.has(target)) lanes.set(target, new AutomationLane(strip, target));
    return lanes.get(target);
  };
  return {
    lane,
    getState() {
      const out = [];
      for (const target of AUTOMATION_TARGETS) {
        const l = lanes.get(target);
        const s = l?.getState();
        if (s) out.push(s);
      }
      return out;
    },
    setState(automation) {
      for (const entry of Array.isArray(automation) ? automation : []) {
        if (!AUTOMATION_TARGETS.includes(entry.target)) continue;
        lane(entry.target).setState(entry);
      }
    },
    rebind() {
      for (const l of lanes.values()) l.rebind();
    },
    dispose() {
      for (const l of lanes.values()) l.dispose();
      lanes.clear();
    },
  };
}

export default AutomationLane;

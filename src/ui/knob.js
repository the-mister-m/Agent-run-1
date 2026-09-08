/**
 * ui/knob.js — one rotary knob control. A value arc, a pointer, a label and a readout.
 *
 * Input: vertical pointer drag, wheel nudge, double-click reset, arrow keys.
 * Continuous mode takes min, max and step. Discrete mode takes a values list.
 * Size and colour come from tokens.css.
 */

const STYLE_ID = 'cbdaw-knob-style';
let styleRefs = 0;

const SWEEP_START = 135;
const SWEEP_END = 405;
const ARC_R = 15;
const DRAG_PX = 150;
const FINE_FACTOR = 0.25;

const STYLE_TEXT = [
  '.cbdaw-knob { --knob-size: var(--sp-18); display: var(--disp-flex); flex-direction: var(--flexdir-column); align-items: var(--align-center); gap: var(--sp-0); width: var(--knob-size); cursor: var(--cur-ns-resize); touch-action: var(--touch-none); user-select: var(--usel-none); font-family: var(--font-ui); }',
  '.cbdaw-knob:focus { outline: var(--none); }',
  '.cbdaw-knob:focus .cbdaw-knob__track { stroke: var(--accent, #34e5b4); }',
  '.cbdaw-knob__dial { width: var(--knob-size); height: var(--knob-size); display: var(--disp-block); }',
  '.cbdaw-knob__track { fill: var(--none); stroke: var(--knob-track, #131a26); stroke-width: var(--stroke-arc); stroke-linecap: var(--cap-round); }',
  '.cbdaw-knob__fill { fill: var(--none); stroke: var(--knob-fill, #34e5b4); stroke-width: var(--stroke-arc); stroke-linecap: var(--cap-round); }',
  '.cbdaw-knob__pointer { stroke: var(--knob-pointer, #f2f6fc); stroke-width: var(--stroke-med); stroke-linecap: var(--cap-round); }',
  '.cbdaw-knob__label { font-size: var(--fs-micro); color: var(--text-dim, #93a1b8); text-transform: var(--tt-label); letter-spacing: var(--track-label); text-align: var(--ta-center); white-space: var(--ws-nowrap); }',
  '.cbdaw-knob__value { font-size: var(--fs-micro); color: var(--text, #f2f6fc); font-variant-numeric: var(--num-tabular); text-align: var(--ta-center); white-space: var(--ws-nowrap); }',
  '.cbdaw-shell[data-layout="mobile"] .cbdaw-knob { --knob-size: var(--tap-min); }',
].join('\n');

function acquireStyle() {
  styleRefs++;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
}

function releaseStyle() {
  styleRefs = Math.max(0, styleRefs - 1);
  if (styleRefs === 0) document.getElementById(STYLE_ID)?.remove();
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** SVG path for an arc between two sweep angles. */
function arcPath(cx, cy, r, fromDeg, toDeg) {
  const a = polar(cx, cy, r, fromDeg);
  const b = polar(cx, cy, r, toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return ['M', a.x, a.y, 'A', r, r, 0, large, 1, b.x, b.y].join(' ');
}

function svgEl(name, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const k of Object.keys(attrs)) el.setAttribute(k, attrs[k]);
  return el;
}

/**
 * Builds one knob.
 *
 * opts.label     control name shown under the dial
 * opts.value     starting value
 * opts.reset     value a double-click returns to
 * opts.min/max/step   continuous range
 * opts.values    discrete list; the knob steps through it by index
 * opts.format    value to readout text
 * opts.onInput   fired with the new value on every change
 */
export function createKnob(opts) {
  acquireStyle();

  const discrete = Array.isArray(opts.values);
  const values = discrete ? opts.values.slice() : null;
  const min = discrete ? 0 : Number(opts.min);
  const max = discrete ? values.length - 1 : Number(opts.max);
  const step = discrete ? 1 : Number(opts.step ?? 0.01);
  const format = opts.format || ((v) => String(v));

  const toIndex = (v) => {
    const i = values.indexOf(v);
    return i === -1 ? 0 : i;
  };

  let raw = discrete ? toIndex(opts.value) : clamp(Number(opts.value), min, max);
  const resetRaw = discrete
    ? toIndex(opts.reset ?? opts.value)
    : clamp(Number(opts.reset ?? opts.value), min, max);

  const root = document.createElement('div');
  root.className = 'cbdaw-knob';
  root.tabIndex = 0;
  root.setAttribute('role', 'slider');
  if (opts.label) root.setAttribute('aria-label', opts.label);

  const svg = svgEl('svg', { viewBox: '0 0 40 40', class: 'cbdaw-knob__dial' });
  const track = svgEl('path', {
    class: 'cbdaw-knob__track',
    d: arcPath(20, 20, ARC_R, SWEEP_START, SWEEP_END),
  });
  const fill = svgEl('path', { class: 'cbdaw-knob__fill', d: '' });
  const pointer = svgEl('line', { class: 'cbdaw-knob__pointer', x1: 20, y1: 20, x2: 20, y2: 8 });
  svg.appendChild(track);
  svg.appendChild(fill);
  svg.appendChild(pointer);

  const labelEl = document.createElement('span');
  labelEl.className = 'cbdaw-knob__label';
  labelEl.textContent = opts.label ?? '';

  const valueEl = document.createElement('span');
  valueEl.className = 'cbdaw-knob__value';

  root.appendChild(svg);
  if (opts.label) root.appendChild(labelEl);
  root.appendChild(valueEl);

  const publicValue = () => (discrete ? values[Math.round(raw)] : raw);

  // Bipolar ranges fill outward from the centre.
  const bipolar = !discrete && min < 0 && max > 0;

  function draw() {
    const span = max - min || 1;
    const frac = clamp((raw - min) / span, 0, 1);
    const deg = SWEEP_START + (SWEEP_END - SWEEP_START) * frac;

    const zeroFrac = bipolar ? clamp((0 - min) / span, 0, 1) : 0;
    const zeroDeg = SWEEP_START + (SWEEP_END - SWEEP_START) * zeroFrac;
    const from = Math.min(zeroDeg, deg);
    const to = Math.max(zeroDeg, deg);
    fill.setAttribute('d', to - from < 0.5 ? '' : arcPath(20, 20, ARC_R, from, to));

    const p = polar(20, 20, ARC_R - 2, deg);
    const inner = polar(20, 20, 5, deg);
    pointer.setAttribute('x1', inner.x);
    pointer.setAttribute('y1', inner.y);
    pointer.setAttribute('x2', p.x);
    pointer.setAttribute('y2', p.y);

    const v = publicValue();
    valueEl.textContent = format(v);
    root.setAttribute('aria-valuemin', String(min));
    root.setAttribute('aria-valuemax', String(max));
    root.setAttribute('aria-valuenow', String(raw));
    root.setAttribute('aria-valuetext', valueEl.textContent);
  }

  function quantize(v) {
    if (step <= 0) return clamp(v, min, max);
    const n = Math.round((v - min) / step) * step + min;
    // step can be fractional; trim float noise before clamping
    return clamp(Number(n.toFixed(6)), min, max);
  }

  function commit(next, notify) {
    const q = quantize(next);
    if (q === raw) {
      draw();
      return;
    }
    raw = q;
    draw();
    if (notify && typeof opts.onInput === 'function') opts.onInput(publicValue());
  }

  // ---- pointer drag ----
  let dragging = false;
  let lastY = 0;
  let startRaw = 0;

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    lastY = e.clientY;
    startRaw = raw;
    root.setPointerCapture?.(e.pointerId);
    root.focus();
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const dy = lastY - e.clientY;
    const scale = e.shiftKey ? FINE_FACTOR : 1;
    const delta = (dy / DRAG_PX) * (max - min) * scale;
    commit(startRaw + delta, true);
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    root.releasePointerCapture?.(e.pointerId);
  }

  function onWheel(e) {
    const dir = e.deltaY < 0 ? 1 : -1;
    const scale = e.shiftKey ? FINE_FACTOR : 1;
    commit(raw + dir * step * (discrete ? 1 : 1) * scale, true);
    e.preventDefault();
  }

  function onDblClick() {
    commit(resetRaw, true);
  }

  function onKeyDown(e) {
    const big = (max - min) / 10;
    let next = null;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = raw + step;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = raw - step;
    else if (e.key === 'PageUp') next = raw + big;
    else if (e.key === 'PageDown') next = raw - big;
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    if (next === null) return;
    commit(next, true);
    e.preventDefault();
  }

  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', onPointerUp);
  root.addEventListener('wheel', onWheel, { passive: false });
  root.addEventListener('dblclick', onDblClick);
  root.addEventListener('keydown', onKeyDown);

  draw();

  return {
    el: root,
    get value() {
      return publicValue();
    },
    /** Writes a value in without firing onInput. Skipped while this knob is being dragged. */
    set(v) {
      if (dragging) return;
      raw = discrete ? toIndex(v) : clamp(Number(v), min, max);
      draw();
    },
    /** True while a pointer drag is in flight. */
    get active() {
      return dragging || document.activeElement === root;
    },
    destroy() {
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerUp);
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('dblclick', onDblClick);
      root.removeEventListener('keydown', onKeyDown);
      root.remove();
      releaseStyle();
    },
  };
}

export default { createKnob };

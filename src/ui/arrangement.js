import { clock as sharedClock, ticksPerBar } from '../core/clock.js';
import { CHANNEL_IDS } from './daw-shell.js';
import PianoRoll from '../surfaces/piano-roll.js';
import StepGrid, { stepLabel } from '../surfaces/step-grid.js';
import Capture from '../core/capture.js';

const STYLE_ID = 'cbdaw-arrangement-style';
let styleRefs = 0;

// id -> {kind, label}
const DEFAULT_META = {
  ch1: { kind: 'pitched', label: 'Wave Synth' },
  ch2: { kind: 'pitched', label: 'Overtone Synth' },
  ch3: { kind: 'pitched', label: 'Chord Module' },
  ch4: { kind: 'pitched', label: 'Patch Synth' },
  ch5: { kind: 'drum', label: 'Drum Synth' },
  ch6: { kind: 'drum', label: 'Drum Sampler' },
};

function defaultChannels() {
  return CHANNEL_IDS.map((id) => ({ id, ...DEFAULT_META[id] }));
}

function clampBar(n, max) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.max(1, Math.min(max, v));
}

const STYLE_TEXT = `
.cbdaw-arr {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  width: var(--pct-100);
  height: var(--pct-100);
  background: var(--ruler-ground);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: var(--fs-base);
  box-sizing: var(--box-border-box);
  overflow: var(--ov-hidden);
}

.cbdaw-arr__scroll {
  flex: var(--flex-1-1-0);
  overflow: auto;
  position: var(--pos-relative);
}

.cbdaw-arr__grid {
  display: var(--disp-grid);
  grid-template-columns: var(--sp-84) max-content;
  position: var(--pos-relative);
  width: max-content;
}

.cbdaw-arr__corner {
  position: var(--pos-sticky);
  top: var(--sp-0);
  left: var(--sp-0);
  z-index: var(--z-sticky);
  background: var(--lane-head);
  border-right: var(--bw) solid var(--line);
  border-bottom: var(--bw) solid var(--line);
  display: var(--disp-flex);
  align-items: var(--align-center);
  justify-content: var(--justify-center);
  box-sizing: var(--box-border-box);
}

.cbdaw-arr__loop-toggle {
  font-size: var(--fs-xs);
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-sm);
  border: var(--bw) solid var(--line);
  background: var(--raise);
  color: var(--text);
  cursor: var(--cur-pointer);
}

.cbdaw-arr__loop-toggle[data-on="true"] {
  background: var(--loop-region);
  border-color: var(--strip-sel);
}

.cbdaw-arr__ruler {
  position: var(--pos-sticky);
  top: var(--sp-0);
  z-index: var(--z-sticky);
  height: var(--sp-14);
  background: var(--ruler-ground);
  border-bottom: var(--bw) solid var(--line);
  box-sizing: var(--box-border-box);
}

.cbdaw-arr__tick {
  position: var(--pos-absolute);
  top: var(--sp-0);
  bottom: var(--sp-0);
  width: var(--bw);
  background: var(--ruler-tick-beat);
}

.cbdaw-arr__tick[data-bar="true"] {
  background: var(--ruler-tick-bar);
}

.cbdaw-arr__label {
  position: var(--pos-absolute);
  top: var(--sp-1);
  font-size: var(--fs-micro);
  color: var(--text-dim);
  white-space: var(--ws-nowrap);
}

.cbdaw-arr__label[data-bar="true"] {
  color: var(--ruler-tick-bar);
  font-size: var(--fs-xs);
}

.cbdaw-arr__lane-head {
  position: var(--pos-sticky);
  left: var(--sp-0);
  z-index: var(--z-sticky);
  background: var(--lane-head);
  border-right: var(--bw) solid var(--line);
  border-bottom: var(--bw) solid var(--line);
  padding: var(--sp-2);
  box-sizing: var(--box-border-box);
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  gap: var(--sp-1);
}

.cbdaw-arr__lane-label {
  font-size: var(--fs-xs);
  color: var(--text);
  white-space: var(--ws-nowrap);
  overflow: var(--ov-hidden);
}

.cbdaw-arr__lane-row {
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-1);
}

.cbdaw-arr__btn {
  font-size: var(--fs-micro);
  line-height: var(--lh-none);
  padding: var(--sp-1) var(--sp-2);
  border-radius: var(--r-sm);
  border: var(--bw) solid var(--line);
  background: var(--btn-face);
  color: var(--text);
  cursor: var(--cur-pointer);
}

.cbdaw-arr__btn[data-on="true"] {
  background: var(--arm-on);
  border-color: var(--arm-on);
  color: var(--text);
}

.cbdaw-arr__btn[data-punch="true"] {
  background: var(--punch-region);
  border-color: var(--punch-region);
}

.cbdaw-arr__stepper {
  font-size: var(--fs-micro);
  color: var(--text-dim);
}

.cbdaw-arr__lane-body {
  border-bottom: var(--bw) solid var(--line);
  background: var(--lane-row);
  box-sizing: var(--box-border-box);
}

.cbdaw-arr__lane-body[data-alt="true"] {
  background: var(--lane-row-alt);
}

.cbdaw-arr__overlay {
  position: var(--pos-absolute);
  top: var(--sp-0);
  left: var(--sp-84);
  height: var(--pct-100);
  pointer-events: var(--none);
}

.cbdaw-arr__loop-wash {
  position: var(--pos-absolute);
  top: var(--sp-0);
  bottom: var(--sp-0);
  background: var(--loop-region);
  opacity: var(--op-soft);
}

.cbdaw-arr__punch-wash {
  position: var(--pos-absolute);
  background: var(--punch-region);
  opacity: var(--op-soft);
}

.cbdaw-arr__handle {
  position: var(--pos-absolute);
  top: var(--sp-0);
  width: var(--sp-2);
  height: var(--sp-14);
  background: var(--strip-sel);
  cursor: var(--cur-ew-resize);
  pointer-events: auto;
}

.cbdaw-arr__playhead {
  position: var(--pos-absolute);
  top: var(--sp-0);
  bottom: var(--sp-0);
  width: var(--bw-2);
  background: var(--playhead-line);
}
`;

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
  if (styleRefs > 0) return;
  document.getElementById(STYLE_ID)?.remove();
}

export default class Arrangement {
  static id = 'arrangement';
  static label = 'Arrangement';

  constructor(el = null, clock = sharedClock) {
    this._clock = clock;
    this.defaultTarget = el;
    this.mounted = false;

    this._channels = defaultChannels();
    this._lanes = new Map();

    this.el = null;
    this.nodes = { scroll: null, grid: null, corner: null, ruler: null, overlay: null, loopToggle: null };

    this._lastTs = { top: clock.timeSignature.top, bottom: clock.timeSignature.bottom };
    this._lastSongLengthBars = clock.songLengthBars;
    this._rafHandle = null;
    this._domListeners = [];
    this._drag = null;

    this._rafLoop = this._rafLoop.bind(this);
  }

  bindChannels(channels) {
    this._channels = Array.isArray(channels) && channels.length
      ? channels.map((c) => ({ id: c.id, kind: c.kind === 'drum' ? 'drum' : 'pitched', label: c.label || c.id }))
      : defaultChannels();
    if (this.mounted) this._rebuildLanes();
    return this;
  }

  unbindChannels() {
    this._channels = defaultChannels();
    if (this.mounted) this._rebuildLanes();
    return this;
  }

  bindLaneInstrument(id, instrument) {
    const lane = this._lanes.get(id);
    if (!lane) return this;
    lane.capture.setInstrument(instrument || null);
    if (lane.kind === 'drum' && lane.surface.bindInstrument) lane.surface.bindInstrument(instrument || null);
    return this;
  }

  get lanes() {
    return [...this._lanes.values()].map((l) => ({
      id: l.id, kind: l.kind, label: l.label, surface: l.surface, capture: l.capture,
    }));
  }

  _addDom(el, type, fn) {
    el.addEventListener(type, fn);
    this._domListeners.push({ el, type, fn });
  }

  _detachDom() {
    for (const { el, type, fn } of this._domListeners) el.removeEventListener(type, fn);
    this._domListeners = [];
  }

  mount(el = this.defaultTarget) {
    if (this.mounted) this.unmount();
    const target = el || this.defaultTarget;
    if (!target) throw new Error('Arrangement.mount: no element to mount into');
    this.defaultTarget = target;

    acquireStyle();
    this._build(target);
    this._rebuildLanes();
    this._layoutOverlay();

    this._rafHandle = requestAnimationFrame(this._rafLoop);
    this.mounted = true;
    return this;
  }

  unmount() {
    if (!this.mounted) return this;
    if (this._rafHandle !== null) cancelAnimationFrame(this._rafHandle);
    this._rafHandle = null;
    this._detachDom();
    this._teardownLanes();
    this.el?.remove();
    this.el = null;
    this.nodes = { scroll: null, grid: null, corner: null, ruler: null, overlay: null, loopToggle: null };
    this.mounted = false;
    releaseStyle();
    return this;
  }

  dispose() {
    const domListeners = this._domListeners.length;
    const hadRaf = this._rafHandle !== null ? 1 : 0;
    const laneCount = this._lanes.size;
    this.unmount();
    return { domListeners, rafCancelled: hadRaf, lanesDisposed: laneCount, audioScheduled: 0 };
  }

  _build(target) {
    const root = document.createElement('div');
    root.className = 'cbdaw-arr';

    const scroll = document.createElement('div');
    scroll.className = 'cbdaw-arr__scroll';
    root.appendChild(scroll);

    const grid = document.createElement('div');
    grid.className = 'cbdaw-arr__grid';
    scroll.appendChild(grid);

    const corner = document.createElement('div');
    corner.className = 'cbdaw-arr__corner';
    const loopToggle = document.createElement('button');
    loopToggle.type = 'button';
    loopToggle.className = 'cbdaw-arr__loop-toggle';
    loopToggle.textContent = 'LOOP';
    corner.appendChild(loopToggle);
    grid.appendChild(corner);
    this._addDom(loopToggle, 'click', () => {
      this._clock.loop = { ...this._clock.loop, on: !this._clock.loop.on };
    });

    const ruler = document.createElement('div');
    ruler.className = 'cbdaw-arr__ruler';
    grid.appendChild(ruler);

    const overlay = document.createElement('div');
    overlay.className = 'cbdaw-arr__overlay';
    grid.appendChild(overlay);

    this.el = root;
    this.nodes = { scroll, grid, corner, ruler, overlay, loopToggle };
    target.appendChild(root);
  }

  _rebuildLanes() {
    this._teardownLanes();
    for (const ch of this._channels) this._buildLane(ch);
    this._renderRuler();
    this._layoutOverlay();
  }

  _teardownLanes() {
    for (const lane of this._lanes.values()) {
      lane.capture.dispose();
      lane.surface.dispose();
      lane.head.remove();
      lane.body.remove();
    }
    this._lanes.clear();
  }

  _buildLane(ch) {
    const head = document.createElement('div');
    head.className = 'cbdaw-arr__lane-head';

    const label = document.createElement('div');
    label.className = 'cbdaw-arr__lane-label';
    label.textContent = ch.label;
    head.appendChild(label);

    const armRow = document.createElement('div');
    armRow.className = 'cbdaw-arr__lane-row';
    const armBtn = document.createElement('button');
    armBtn.type = 'button';
    armBtn.className = 'cbdaw-arr__btn';
    armBtn.textContent = 'ARM';
    armBtn.dataset.on = 'false';
    const punchBtn = document.createElement('button');
    punchBtn.type = 'button';
    punchBtn.className = 'cbdaw-arr__btn';
    punchBtn.textContent = 'PUNCH';
    punchBtn.dataset.punch = 'false';
    armRow.append(armBtn, punchBtn);
    head.appendChild(armRow);

    const punchRow = document.createElement('div');
    punchRow.className = 'cbdaw-arr__lane-row';
    const startMinus = document.createElement('button');
    startMinus.type = 'button';
    startMinus.className = 'cbdaw-arr__btn';
    startMinus.textContent = '-';
    const startReadout = document.createElement('span');
    startReadout.className = 'cbdaw-arr__stepper';
    const startPlus = document.createElement('button');
    startPlus.type = 'button';
    startPlus.className = 'cbdaw-arr__btn';
    startPlus.textContent = '+';
    const endMinus = document.createElement('button');
    endMinus.type = 'button';
    endMinus.className = 'cbdaw-arr__btn';
    endMinus.textContent = '-';
    const endReadout = document.createElement('span');
    endReadout.className = 'cbdaw-arr__stepper';
    const endPlus = document.createElement('button');
    endPlus.type = 'button';
    endPlus.className = 'cbdaw-arr__btn';
    endPlus.textContent = '+';
    punchRow.append(startMinus, startReadout, startPlus, endMinus, endReadout, endPlus);
    head.appendChild(punchRow);

    const body = document.createElement('div');
    body.className = 'cbdaw-arr__lane-body';
    body.dataset.alt = String(this._lanes.size % 2 === 1);

    this.nodes.grid.appendChild(head);
    this.nodes.grid.appendChild(body);

    const kind = ch.kind === 'drum' ? 'drum' : 'pitched';
    const surface = kind === 'drum' ? new StepGrid() : new PianoRoll();
    surface.mount(body, 'compact');

    const punchState = { on: false, startBar: 1, endBar: 2 };
    const songLength = () => Math.max(1, this._clock.songLengthBars);

    const capture = new Capture({
      clock: this._clock,
      target: kind === 'drum' ? surface : null,
    });
    capture.disarm('all');

    if (kind === 'pitched') {
      capture.on('commit', (report) => {
        const kindTag = report?.kind;
        if (kindTag === 'discard') return;
        if (kindTag === 'requantize') { surface.setNotes(report.notes || []); return; }
        surface.addNotes(report?.notes || []);
      });
    }

    const lane = {
      id: ch.id, kind, label: ch.label, surface, capture, head, body,
      armBtn, punchBtn, startReadout, endReadout, punch: punchState,
    };
    this._lanes.set(ch.id, lane);

    const syncReadouts = () => {
      startReadout.textContent = String(punchState.startBar);
      endReadout.textContent = String(punchState.endBar);
    };
    syncReadouts();

    const pushPunch = () => {
      if (punchState.on) capture.punchIn(punchState.startBar, punchState.endBar);
      this._renderLanePunchWash(lane);
    };

    this._addDom(armBtn, 'click', () => {
      const next = armBtn.dataset.on !== 'true';
      armBtn.dataset.on = String(next);
      if (next) capture.arm('all'); else capture.disarm('all');
    });

    this._addDom(punchBtn, 'click', () => {
      punchState.on = !punchState.on;
      punchBtn.dataset.punch = String(punchState.on);
      if (punchState.on) capture.punchIn(punchState.startBar, punchState.endBar);
      else capture.punchOff();
      this._renderLanePunchWash(lane);
    });

    this._addDom(startMinus, 'click', () => {
      punchState.startBar = clampBar(punchState.startBar - 1, punchState.endBar - 1);
      syncReadouts();
      pushPunch();
    });
    this._addDom(startPlus, 'click', () => {
      punchState.startBar = clampBar(punchState.startBar + 1, punchState.endBar - 1);
      syncReadouts();
      pushPunch();
    });
    this._addDom(endMinus, 'click', () => {
      punchState.endBar = clampBar(punchState.endBar - 1, songLength());
      punchState.endBar = Math.max(punchState.startBar + 1, punchState.endBar);
      syncReadouts();
      pushPunch();
    });
    this._addDom(endPlus, 'click', () => {
      punchState.endBar = clampBar(punchState.endBar + 1, songLength());
      syncReadouts();
      pushPunch();
    });

    const wash = document.createElement('div');
    wash.className = 'cbdaw-arr__punch-wash';
    wash.hidden = true;
    this.nodes.overlay.appendChild(wash);
    lane.wash = wash;
  }

  _renderRuler() {
    const ruler = this.nodes.ruler;
    if (!ruler) return;
    ruler.innerHTML = '';
    const ts = this._clock.timeSignature;
    const bars = Math.max(1, this._clock.songLengthBars);
    const barWidth = 'var(--sp-60)';
    ruler.style.width = `calc(${barWidth} * ${bars})`;

    for (let bar = 1; bar <= bars; bar++) {
      for (let beat = 0; beat < ts.top; beat++) {
        const isBarStart = beat === 0;
        const left = `calc(${barWidth} * ${bar - 1} + ${barWidth} * ${beat} / ${ts.top})`;

        const tick = document.createElement('div');
        tick.className = 'cbdaw-arr__tick';
        if (isBarStart) tick.dataset.bar = 'true';
        tick.style.left = left;
        ruler.appendChild(tick);

        const beatLabel = document.createElement('div');
        beatLabel.className = 'cbdaw-arr__label';
        if (isBarStart) beatLabel.dataset.bar = 'true';
        beatLabel.style.left = left;
        beatLabel.textContent = stepLabel(beat, 1);
        ruler.appendChild(beatLabel);
      }
    }

    this.nodes.overlay.style.width = `calc(${barWidth} * ${bars})`;
    this._lastTs = { top: ts.top, bottom: ts.bottom };
    this._lastSongLengthBars = bars;
  }

  _layoutOverlay() {
    const overlay = this.nodes.overlay;
    if (!overlay) return;
    if (!this._loopWash) {
      this._loopWash = document.createElement('div');
      this._loopWash.className = 'cbdaw-arr__loop-wash';
      overlay.appendChild(this._loopWash);
    }
    if (!this._playhead) {
      this._playhead = document.createElement('div');
      this._playhead.className = 'cbdaw-arr__playhead';
      overlay.appendChild(this._playhead);
    }
    if (!this._handleStart) {
      this._handleStart = document.createElement('div');
      this._handleStart.className = 'cbdaw-arr__handle';
      overlay.appendChild(this._handleStart);
      this._wireHandle(this._handleStart, 'startBar');
    }
    if (!this._handleEnd) {
      this._handleEnd = document.createElement('div');
      this._handleEnd.className = 'cbdaw-arr__handle';
      overlay.appendChild(this._handleEnd);
      this._wireHandle(this._handleEnd, 'endBar');
    }
    for (const lane of this._lanes.values()) {
      const top = lane.body.offsetTop - this.nodes.grid.offsetTop;
      const height = lane.body.offsetHeight;
      lane.wash.style.top = `${top}px`;
      lane.wash.style.height = `${height}px`;
      this._renderLanePunchWash(lane);
    }
  }

  _wireHandle(el, field) {
    const onMove = (e) => {
      if (!this._drag || this._drag.field !== field) return;
      const rulerRect = this.nodes.ruler.getBoundingClientRect();
      const bars = Math.max(1, this._clock.songLengthBars);
      const barWidthPx = rulerRect.width / bars;
      const bar = clampBar(Math.round((e.clientX - rulerRect.left) / barWidthPx) + 1, bars + 1);
      const loop = { ...this._clock.loop };
      loop[field] = bar;
      if (loop.endBar <= loop.startBar) loop.endBar = loop.startBar + 1;
      this._clock.loop = loop;
    };
    const onUp = () => {
      this._drag = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    this._addDom(el, 'pointerdown', () => {
      this._drag = { field };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  _renderLanePunchWash(lane) {
    const bars = Math.max(1, this._clock.songLengthBars);
    const barWidth = 'var(--sp-60)';
    if (!lane.punch.on) { lane.wash.hidden = true; return; }
    lane.wash.hidden = false;
    lane.wash.style.left = `calc(${barWidth} * ${lane.punch.startBar - 1})`;
    lane.wash.style.width = `calc(${barWidth} * ${lane.punch.endBar - lane.punch.startBar})`;
  }

  _renderLoopAndPlayhead() {
    const loop = this._clock.loop;
    const bars = Math.max(1, this._clock.songLengthBars);
    const barWidth = 'var(--sp-60)';
    if (this._loopWash) {
      this._loopWash.hidden = !loop.on;
      this._loopWash.style.left = `calc(${barWidth} * ${loop.startBar - 1})`;
      this._loopWash.style.width = `calc(${barWidth} * ${loop.endBar - loop.startBar})`;
    }
    if (this._handleStart) this._handleStart.style.left = `calc(${barWidth} * ${loop.startBar - 1})`;
    if (this._handleEnd) this._handleEnd.style.left = `calc(${barWidth} * ${loop.endBar - 1})`;
    this.nodes.loopToggle.dataset.on = String(loop.on);

    const ts = this._clock.timeSignature;
    const totalTicks = bars * ticksPerBar(ts);
    const pct = totalTicks > 0 ? Math.min(1, this._clock.positionTicks / totalTicks) : 0;
    if (this._playhead) this._playhead.style.left = `calc(${barWidth} * ${bars} * ${pct})`;
  }

  _rafLoop() {
    const ts = this._clock.timeSignature;
    if (ts.top !== this._lastTs.top || ts.bottom !== this._lastTs.bottom
      || this._clock.songLengthBars !== this._lastSongLengthBars) {
      this._renderRuler();
      this._layoutOverlay();
    }
    this._renderLoopAndPlayhead();
    this._rafHandle = requestAnimationFrame(this._rafLoop);
  }
}

export { Arrangement };

import { clock as sharedClock, ticksPerBar, ticksPerBeat } from '../core/clock.js';
import { tracks as sharedTracks } from '../core/tracks.js';
import StepGrid, { stepLabel } from '../surfaces/step-grid.js';
import PianoRoll from '../surfaces/piano-roll.js';
import { regions as sharedRegions } from '../core/regions.js';
import Capture from '../core/capture.js';

const STYLE_ID = 'cbdaw-arrangement-style';
let styleRefs = 0;

// instrumentType -> display label, for the lane head's instrument dropdown
const INSTRUMENT_OPTIONS = [
  { value: '', label: '—' },
  { value: 'wave-synth', label: 'Wave Synth' },
  { value: 'overtone-synth', label: 'Overtone Synth' },
  { value: 'chord-module', label: 'Chord Module' },
  { value: 'patch-synth', label: 'Patch Synth' },
  { value: 'drum-synth', label: 'Drum Synth' },
  { value: 'drum-sampler', label: 'Drum Sampler' },
];

function clampBar(n, max) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.max(1, Math.min(max, v));
}

// Horizontal timeline zoom. Multiplies the tokenized bar width; never replaces it.
const BAR_W = 'var(--arr-bar-w)';
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 8;
const ZOOM_STEP = 1.25;
// Below this much room per beat the ruler shows bar numbers only.
const BEAT_LABEL_MIN_PX = 22;

function clampZoom(z) {
  const v = Number(z);
  if (!Number.isFinite(v)) return 1;
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v));
}

const STYLE_TEXT = `
.cbdaw-arr {
  --arr-zoom: 1;
  --arr-bar-w: calc(var(--sp-60) * var(--arr-zoom));
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

.cbdaw-arr__toolbar {
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-2);
  padding: var(--sp-1) var(--sp-2);
  background: var(--lane-head);
  border-bottom: var(--bw) solid var(--line);
  box-sizing: var(--box-border-box);
  flex: var(--flex-0-0-auto);
}

.cbdaw-arr__zoom-readout {
  font-size: var(--fs-micro);
  color: var(--text-dim);
  min-width: var(--sp-14);
  text-align: var(--ta-center);
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

.cbdaw-arr__header {
  position: var(--pos-sticky);
  top: var(--sp-0);
  z-index: var(--z-sticky);
  background: var(--ruler-ground);
  border-bottom: var(--bw) solid var(--line);
  box-sizing: var(--box-border-box);
}

.cbdaw-arr__ruler {
  position: var(--pos-relative);
  height: var(--sp-14);
  background: var(--ruler-ground);
  box-sizing: var(--box-border-box);
  cursor: var(--cur-pointer);
  touch-action: var(--touch-none);
}

/* The cycle strip: click or drag here to set the loop range. */
.cbdaw-arr__loop-row {
  position: var(--pos-relative);
  height: var(--sp-10);
  background: var(--lane-row-alt);
  border-top: var(--bw) solid var(--line);
  box-sizing: var(--box-border-box);
  cursor: var(--cur-pointer);
  touch-action: var(--touch-none);
}

/* Empty locators while the loop is off; filled in when it is on. */
.cbdaw-arr__loop-span {
  position: var(--pos-absolute);
  top: var(--sp-0);
  bottom: var(--sp-0);
  background: var(--none);
  border: var(--bw) solid var(--strip-sel);
  border-radius: var(--r-cell);
  box-sizing: var(--box-border-box);
}

.cbdaw-arr__loop-span[data-on="true"] {
  background: var(--loop-region);
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

/* Zoomed out far enough that beat labels collide: bar numbers only. */
.cbdaw-arr[data-dense="true"] .cbdaw-arr__label:not([data-bar="true"]) {
  display: var(--disp-none);
}

.cbdaw-arr[data-dense="true"] .cbdaw-arr__tick:not([data-bar="true"]) {
  opacity: var(--op-faint);
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

.cbdaw-arr__lane-name {
  font: var(--font-inherit);
  font-size: var(--fs-xs);
  color: var(--text);
  background: var(--btn-face);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-sm);
  padding: var(--sp-1) var(--sp-2);
  width: var(--pct-100);
  box-sizing: var(--box-border-box);
}

.cbdaw-arr__lane-instrument {
  font: var(--font-inherit);
  font-size: var(--fs-micro);
  color: var(--text);
  background: var(--btn-face);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-sm);
  padding: var(--sp-1);
  width: var(--pct-100);
  box-sizing: var(--box-border-box);
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
  position: var(--pos-relative);
  min-height: var(--sp-28);
  border-bottom: var(--bw) solid var(--line);
  background: var(--lane-row);
  box-sizing: var(--box-border-box);
  overflow: var(--ov-hidden);
  touch-action: var(--touch-none);
}

.cbdaw-arr__lane-body[data-alt="true"] {
  background: var(--lane-row-alt);
}

.cbdaw-arr__region {
  position: var(--pos-absolute);
  top: var(--sp-1);
  bottom: var(--sp-1);
  background: var(--clip-fill);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-ctl);
  box-sizing: var(--box-border-box);
  overflow: var(--ov-hidden);
  cursor: var(--cur-grab);
  user-select: var(--usel-none);
}

.cbdaw-arr__region[data-selected="true"] {
  border-color: var(--strip-sel);
  z-index: var(--z-raise-1);
}

.cbdaw-arr__region[data-muted="true"] {
  opacity: var(--op-faint);
}

.cbdaw-arr__region[data-dragging="true"] {
  cursor: var(--cur-grabbing);
  z-index: var(--z-raise-2);
}

.cbdaw-arr__region-label {
  padding: var(--sp-1) var(--sp-2);
  font-size: var(--fs-micro);
  color: var(--text);
  white-space: var(--ws-nowrap);
  pointer-events: var(--pe-none);
}

.cbdaw-arr__region-edge {
  position: var(--pos-absolute);
  top: var(--sp-0);
  bottom: var(--sp-0);
  width: var(--sp-2);
  cursor: var(--cur-ew-resize);
}

.cbdaw-arr__region-edge[data-edge="start"] { left: var(--sp-0); }
.cbdaw-arr__region-edge[data-edge="end"] { right: var(--sp-0); }

.cbdaw-arr__overlay {
  position: var(--pos-absolute);
  top: var(--sp-0);
  left: var(--sp-84);
  height: var(--pct-100);
  pointer-events: var(--none);
  /* Above the lane bodies and their regions, below the sticky lane heads — those come
     later in the grid, so at equal z they still win and the playhead slides under them. */
  z-index: var(--z-sticky);
}

.cbdaw-arr__punch-wash {
  position: var(--pos-absolute);
  background: var(--punch-region);
  opacity: var(--op-soft);
}

/* Sits on the cycle strip, below the ruler — the two heights must agree. */
.cbdaw-arr__handle {
  position: var(--pos-absolute);
  top: var(--sp-14);
  width: var(--sp-2);
  height: var(--sp-10);
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

  constructor(el = null, clock = sharedClock, regions = sharedRegions, tracks = sharedTracks) {
    this._clock = clock;
    this._regions = regions;
    this._tracks = tracks;
    this.defaultTarget = el;
    this.mounted = false;

    this._channels = [];
    this._lanes = new Map();
    this._selectedId = null;
    this._unsubRegions = null;
    this._unsubTracksAdd = null;
    this._unsubTracksRemove = null;
    this._unsubTracksUpdate = null;
    this._blockDrag = null;
    this._loopDrag = null;
    this._listeners = { select: new Set(), open: new Set() };
    // The one open region editor, or null. { regionId, laneId, kind, surface, host }.
    this._editor = null;
    this._unsubOpen = null;
    this._unsubRegionRemove = null;

    // (id, instrumentType|null) -> the page's assignment flow. Unset, the dropdown writes
    // the store field only and no instance is built.
    this.onAssignInstrument = null;

    this.el = null;
    this.nodes = {
      scroll: null, grid: null, corner: null, ruler: null, overlay: null, loopToggle: null,
      toolbar: null, zoomOut: null, zoomIn: null, zoomReadout: null, addTrack: null,
    };

    this._zoom = 1;
    this._lastTs = { top: clock.timeSignature.top, bottom: clock.timeSignature.bottom };
    this._lastSongLengthBars = clock.songLengthBars;
    this._rafHandle = null;
    this._domListeners = [];
    this._drag = null;
    this._scrub = false;
    this._scrubRelease = null;

    this._rafLoop = this._rafLoop.bind(this);
  }

  bindChannels(channels) {
    this._channels = Array.isArray(channels)
      ? channels.map((c) => ({ id: c.id, kind: c.kind ?? null, label: c.label || c.id }))
      : [];
    if (this.mounted) this._rebuildLanes();
    return this;
  }

  /** Drops a manual bindChannels() override and returns to following the track store. */
  unbindChannels() {
    this._syncChannelsFromStore();
    return this;
  }

  /** channels array, mirroring the track store's current list. */
  _syncChannelsFromStore() {
    this._channels = this._tracks.all.map((t) => ({ id: t.id, kind: t.kind, label: t.name || t.id }));
    if (this.mounted) this._rebuildLanes();
    return this;
  }

  bindLaneInstrument(id, instrument) {
    const lane = this._lanes.get(id);
    if (!lane) return this;
    lane.instrument = instrument || null;
    lane.capture.setInstrument(instrument || null);
    return this;
  }

  get lanes() {
    return [...this._lanes.values()].map((l) => ({
      id: l.id, kind: l.kind, label: l.label, capture: l.capture, instrument: l.instrument,
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
    this._channels = this._tracks.all.map((t) => ({ id: t.id, kind: t.kind, label: t.name || t.id }));
    this._rebuildLanes();
    this._layoutOverlay();

    // A store change from anywhere — this timeline, a recording, a project load — redraws.
    this._unsubRegions = this._regions.on('change', () => {
      if (this._blockDrag) { this._renderDuringDrag(); return; }
      this._renderAllRegions();
    });

    // Track add/remove/rename/instrument-change — handled per-lane, not a full rebuild,
    // so an unrelated lane's Capture and punch/arm state survive.
    this._unsubTracksAdd = this._tracks.on('add', (t) => this._onTrackAdd(t));
    this._unsubTracksRemove = this._tracks.on('remove', (t) => this._onTrackRemove(t));
    this._unsubTracksUpdate = this._tracks.on('update', (t) => this._onTrackUpdate(t));

    // The entry point: a region's dblclick already emits 'open' (§10.3). This is the
    // only listener.
    this._unsubOpen = this.on('open', (region) => this._openRegion(region));
    // A region removed anywhere (Delete key, a drag collision) closes its open editor
    // without writing back — there is nothing left to write into.
    this._unsubRegionRemove = this._regions.on('remove', (r) => {
      if (this._editor?.regionId === r.id) this._closeEditor({ writeBack: false });
    });

    this._rafHandle = requestAnimationFrame(this._rafLoop);
    this.mounted = true;
    return this;
  }

  /** Mid-drag the blocks are rebuilt every pointermove, which would drop the node the
   *  gesture is attached to. Only the geometry moves. */
  _renderDuringDrag() {
    for (const lane of this._lanes.values()) {
      for (const el of lane.body.querySelectorAll('.cbdaw-arr__region')) {
        const r = this._regions.get(el.dataset.id);
        if (!r) { el.remove(); continue; }
        if (r.laneId !== lane.id) { el.remove(); continue; }
        el.style.left = `calc(${BAR_W} * ${r.startBar - 1})`;
        el.style.width = `calc(${BAR_W} * ${r.lengthBars})`;
      }
    }
    // A region dragged onto another lane has no node there yet.
    for (const lane of this._lanes.values()) {
      for (const r of this._regions.forLane(lane.id)) {
        if (!lane.body.querySelector(`.cbdaw-arr__region[data-id="${r.id}"]`)) {
          this._renderLaneRegions(lane);
          break;
        }
      }
    }
  }

  unmount() {
    if (!this.mounted) return this;
    if (this._rafHandle !== null) cancelAnimationFrame(this._rafHandle);
    this._rafHandle = null;
    this._scrubRelease?.(); // drop window listeners if unmounted mid-scrub
    this._blockDrag?.();
    this._loopDrag?.();
    this._closeEditor();
    this._unsubOpen?.();
    this._unsubOpen = null;
    this._unsubRegionRemove?.();
    this._unsubRegionRemove = null;
    this._unsubRegions?.();
    this._unsubRegions = null;
    this._unsubTracksAdd?.();
    this._unsubTracksRemove?.();
    this._unsubTracksUpdate?.();
    this._unsubTracksAdd = null;
    this._unsubTracksRemove = null;
    this._unsubTracksUpdate = null;
    this._selectedId = null;
    this._detachDom();
    this._teardownLanes();
    this.el?.remove();
    this.el = null;
    this.nodes = {
      scroll: null, grid: null, corner: null, ruler: null, overlay: null, loopToggle: null,
      toolbar: null, zoomOut: null, zoomIn: null, zoomReadout: null, addTrack: null,
    };
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
    root.tabIndex = 0; // so Delete reaches the timeline

    const toolbar = document.createElement('div');
    toolbar.className = 'cbdaw-arr__toolbar';
    const zoomOut = document.createElement('button');
    zoomOut.type = 'button';
    zoomOut.className = 'cbdaw-arr__btn';
    zoomOut.textContent = '−';
    zoomOut.title = 'Zoom out';
    const zoomReadout = document.createElement('span');
    zoomReadout.className = 'cbdaw-arr__zoom-readout';
    const zoomIn = document.createElement('button');
    zoomIn.type = 'button';
    zoomIn.className = 'cbdaw-arr__btn';
    zoomIn.textContent = '+';
    zoomIn.title = 'Zoom in';
    // the only way to make the first track — a new project boots with none
    const addTrack = document.createElement('button');
    addTrack.type = 'button';
    addTrack.className = 'cbdaw-arr__btn';
    addTrack.textContent = '+ TRACK';
    addTrack.title = 'Add track';
    toolbar.append(zoomOut, zoomReadout, zoomIn, addTrack);
    root.appendChild(toolbar);

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

    const header = document.createElement('div');
    header.className = 'cbdaw-arr__header';
    grid.appendChild(header);

    const ruler = document.createElement('div');
    ruler.className = 'cbdaw-arr__ruler';
    header.appendChild(ruler);

    const loopRow = document.createElement('div');
    loopRow.className = 'cbdaw-arr__loop-row';
    header.appendChild(loopRow);

    const loopSpan = document.createElement('div');
    loopSpan.className = 'cbdaw-arr__loop-span';
    loopRow.appendChild(loopSpan);

    const overlay = document.createElement('div');
    overlay.className = 'cbdaw-arr__overlay';
    grid.appendChild(overlay);

    this.el = root;
    this.nodes = {
      scroll, grid, corner, ruler, overlay, loopToggle, toolbar, zoomOut, zoomIn, zoomReadout,
      addTrack, header, loopRow, loopSpan,
    };
    target.appendChild(root);

    this._addDom(zoomOut, 'click', () => this._applyZoom(this._zoom / ZOOM_STEP));
    this._addDom(zoomIn, 'click', () => this._applyZoom(this._zoom * ZOOM_STEP));
    this._addDom(addTrack, 'click', () => this._tracks.add());

    // Ctrl/Cmd + wheel zooms about the pointer; plain wheel stays ordinary scrolling.
    this._addDom(scroll, 'wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      this._applyZoom(this._zoom * factor, e.clientX);
    });

    this._wireRulerSeek();
    this._wireLoopRow();

    this._addDom(root, 'keydown', (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (!this._selectedId) return;
      e.preventDefault();
      const gone = this._selectedId;
      this._selectedId = null;
      this._regions.remove(gone);
      this._emit('select', null);
    });

    this._applyZoom(this._zoom);
  }

  get zoom() {
    return this._zoom;
  }

  set zoom(z) {
    this._applyZoom(z);
  }

  /** Sets the bar-width multiplier and holds `anchorClientX` still across the change.
   *  With no anchor the viewport centre is held. */
  _applyZoom(next, anchorClientX = null) {
    const clamped = clampZoom(next);
    const { scroll, ruler, corner } = this.nodes;
    if (!this.el) { this._zoom = clamped; return this; }

    if (!scroll || !ruler) {
      this._zoom = clamped;
      this.el.style.setProperty('--arr-zoom', String(clamped));
      this._syncZoomReadout();
      return this;
    }

    const headW = corner ? corner.offsetWidth : 0;
    const beforeW = ruler.offsetWidth;
    const viewX = anchorClientX === null
      ? (scroll.clientWidth + headW) / 2
      : anchorClientX - scroll.getBoundingClientRect().left;
    // Where the anchor sits along the timeline, 0..1, ignoring the sticky lane heads.
    const ratio = beforeW > 0
      ? Math.max(0, (scroll.scrollLeft + viewX - headW) / beforeW)
      : 0;

    this._zoom = clamped;
    this.el.style.setProperty('--arr-zoom', String(clamped));

    const afterW = ruler.offsetWidth; // reads back after the property lands
    scroll.scrollLeft = Math.max(0, (ratio * afterW) + headW - viewX);

    this._syncDensity();
    this._syncZoomReadout();
    return this;
  }

  /** Beat labels are dropped once they no longer fit between their ticks. */
  _syncDensity() {
    const ruler = this.nodes.ruler;
    if (!ruler || !this.el) return;
    const bars = Math.max(1, this._clock.songLengthBars);
    const beatPx = ruler.offsetWidth / bars / Math.max(1, this._clock.timeSignature.top);
    this.el.dataset.dense = String(beatPx < BEAT_LABEL_MIN_PX);
  }

  _syncZoomReadout() {
    if (this.nodes.zoomReadout) this.nodes.zoomReadout.textContent = `${Math.round(this._zoom * 100)}%`;
    if (this.nodes.zoomOut) this.nodes.zoomOut.disabled = this._zoom <= ZOOM_MIN;
    if (this.nodes.zoomIn) this.nodes.zoomIn.disabled = this._zoom >= ZOOM_MAX;
  }

  _rebuildLanes() {
    this._teardownLanes();
    for (const ch of this._channels) this._buildLane(ch);
    this._renderRuler();
    this._renderAllRegions();
    this._layoutOverlay();
  }

  _teardownLanes() {
    for (const lane of this._lanes.values()) {
      lane.capture.dispose();
      lane.head.remove();
      lane.body.remove();
      lane.wash?.remove();
    }
    this._lanes.clear();
  }

  /** One new lane, without disturbing any other lane's Capture, arm or punch state. */
  _onTrackAdd(t) {
    if (!this.mounted) return;
    const ch = { id: t.id, kind: t.kind, label: t.name || t.id };
    this._channels.push(ch);
    this._buildLane(ch);
    this._renderLaneRegions(this._lanes.get(t.id));
    this._layoutOverlay();
  }

  /** Drops one lane's DOM, Capture and wash. Other lanes are untouched. */
  _onTrackRemove(t) {
    if (!this.mounted) return;
    const lane = this._lanes.get(t.id);
    if (!lane) return;
    if (this._editor?.laneId === t.id) this._closeEditor();
    lane.capture.dispose();
    lane.head.remove();
    lane.body.remove();
    lane.wash.remove();
    this._lanes.delete(t.id);
    this._channels = this._channels.filter((c) => c.id !== t.id);
    // the selection is gone if it was on this lane, or if its region was already cleared
    const sel = this._selectedId ? this._regions.get(this._selectedId) : null;
    if (this._selectedId && (!sel || sel.laneId === t.id)) this._select(null);
    this._layoutOverlay();
  }

  /** Name/instrumentType/kind changed on a live track — updates the one lane in place. */
  _onTrackUpdate(t) {
    if (!this.mounted) return;
    const lane = this._lanes.get(t.id);
    if (!lane) return;
    lane.kind = t.kind;
    lane.label = t.name || t.id;
    if (lane.nameInput && document.activeElement !== lane.nameInput) lane.nameInput.value = lane.label;
    if (lane.instrumentSelect && document.activeElement !== lane.instrumentSelect) {
      lane.instrumentSelect.value = t.instrumentType || '';
    }
    const idx = this._channels.findIndex((c) => c.id === t.id);
    if (idx !== -1) this._channels[idx] = { id: t.id, kind: t.kind, label: lane.label };
  }

  _buildLane(ch) {
    const head = document.createElement('div');
    head.className = 'cbdaw-arr__lane-head';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'cbdaw-arr__lane-name';
    nameInput.value = ch.label;
    head.appendChild(nameInput);

    const instrumentSelect = document.createElement('select');
    instrumentSelect.className = 'cbdaw-arr__lane-instrument';
    for (const opt of INSTRUMENT_OPTIONS) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      instrumentSelect.appendChild(o);
    }
    instrumentSelect.value = this._tracks.get(ch.id)?.instrumentType || '';
    head.appendChild(instrumentSelect);

    this._addDom(nameInput, 'change', () => {
      this._tracks.update(ch.id, { name: nameInput.value });
    });

    this._addDom(instrumentSelect, 'change', () => {
      const type = instrumentSelect.value || null;
      if (typeof this.onAssignInstrument === 'function') this.onAssignInstrument(ch.id, type);
      else this._tracks.setInstrumentType(ch.id, type);
    });

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
    // drops the track record; every listener releases its own half of the track
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'cbdaw-arr__btn';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove track';
    armRow.append(armBtn, punchBtn, removeBtn);
    head.appendChild(armRow);

    this._addDom(removeBtn, 'click', () => this._tracks.remove(ch.id));

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

    const kind = ch.kind === 'drum' || ch.kind === 'pitched' ? ch.kind : null;

    const punchState = { on: false, startBar: 1, endBar: 2 };
    const songLength = () => Math.max(1, this._clock.songLengthBars);

    // No `target`: with none, Capture still emits `notes[]` on commit, and those go into
    // the region under the playhead rather than into a mounted editor.
    const capture = new Capture({ clock: this._clock });
    capture.disarm('all');

    const lane = {
      id: ch.id, kind, label: ch.label, capture, head, body, instrument: null,
      nameInput, instrumentSelect, armBtn, punchBtn, startReadout, endReadout, punch: punchState,
    };
    this._lanes.set(ch.id, lane);

    capture.on('commit', (report) => {
      if (report?.kind === 'discard') return;
      this._commitToRegion(lane, report);
    });

    // Double-click empty lane space makes a one-bar region there.
    this._addDom(body, 'dblclick', (e) => {
      if (e.target !== body) return;
      const bar = this._barFromClientX(e.clientX);
      const made = this._regions.add({ laneId: lane.id, startBar: bar, lengthBars: 1, name: lane.label });
      if (made) this._select(made.id);
    });

    this._addDom(body, 'pointerdown', (e) => {
      if (e.target === body) this._select(null);
    });

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
    const barWidth = BAR_W;
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
        // Bar starts carry the bar number; the beats between carry the subdivision.
        beatLabel.textContent = isBarStart ? String(bar) : stepLabel(beat, 1);
        ruler.appendChild(beatLabel);
      }
    }

    this.nodes.overlay.style.width = `calc(${barWidth} * ${bars})`;
    if (this.nodes.loopRow) this.nodes.loopRow.style.width = `calc(${barWidth} * ${bars})`;
    this._syncDensity();
    this._lastTs = { top: ts.top, bottom: ts.bottom };
    this._lastSongLengthBars = bars;
  }

  _layoutOverlay() {
    const overlay = this.nodes.overlay;
    if (!overlay) return;
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

  // ——— regions —————————————————————————————————————————————————————————————————————————

  /** Width of one bar on screen, in px. Measured, so it is right at any zoom. */
  _barPx() {
    const ruler = this.nodes.ruler;
    if (!ruler) return 0;
    return ruler.offsetWidth / Math.max(1, this._clock.songLengthBars);
  }

  /** 1-based bar under a client X, measured against the ruler. */
  _barFromClientX(clientX) {
    const ruler = this.nodes.ruler;
    if (!ruler) return 1;
    const barPx = this._barPx();
    if (barPx <= 0) return 1;
    const rect = ruler.getBoundingClientRect();
    return Math.max(1, Math.floor((clientX - rect.left) / barPx) + 1);
  }

  /** The lane whose body contains a client Y, or null. */
  _laneFromClientY(clientY) {
    for (const lane of this._lanes.values()) {
      const rect = lane.body.getBoundingClientRect();
      if (clientY >= rect.top && clientY < rect.bottom) return lane;
    }
    return null;
  }

  get selectedRegion() {
    return this._selectedId ? this._regions.get(this._selectedId) : null;
  }

  _select(id) {
    if (this._selectedId === id) return;
    this._selectedId = id;
    this._paintSelection();
    this._emit('select', id ? this._regions.get(id) : null);
  }

  _paintSelection() {
    for (const lane of this._lanes.values()) {
      for (const el of lane.body.querySelectorAll('.cbdaw-arr__region')) {
        el.dataset.selected = String(el.dataset.id === this._selectedId);
      }
    }
  }

  /** Rebuilds one lane's blocks from the store. */
  _renderLaneRegions(lane) {
    for (const el of [...lane.body.querySelectorAll('.cbdaw-arr__region')]) el.remove();

    for (const r of this._regions.forLane(lane.id)) {
      const el = document.createElement('div');
      el.className = 'cbdaw-arr__region';
      el.dataset.id = r.id;
      el.dataset.selected = String(r.id === this._selectedId);
      el.dataset.muted = String(r.muted);
      el.style.left = `calc(${BAR_W} * ${r.startBar - 1})`;
      el.style.width = `calc(${BAR_W} * ${r.lengthBars})`;
      if (r.color) el.style.background = r.color;

      const label = document.createElement('div');
      label.className = 'cbdaw-arr__region-label';
      label.textContent = r.name || `${r.lengthBars} bar${r.lengthBars === 1 ? '' : 's'}`;
      el.appendChild(label);

      for (const edge of ['start', 'end']) {
        const grip = document.createElement('div');
        grip.className = 'cbdaw-arr__region-edge';
        grip.dataset.edge = edge;
        el.appendChild(grip);
        this._addDom(grip, 'pointerdown', (e) => {
          e.stopPropagation();
          this._beginBlockDrag(e, r.id, edge);
        });
      }

      this._addDom(el, 'pointerdown', (e) => this._beginBlockDrag(e, r.id, 'move'));
      this._addDom(el, 'dblclick', (e) => {
        e.stopPropagation();
        this._emit('open', this._regions.get(r.id));
      });

      lane.body.appendChild(el);
    }
  }

  _renderAllRegions() {
    for (const lane of this._lanes.values()) this._renderLaneRegions(lane);
  }

  /** One gesture for all three: move, drag the left edge, drag the right edge. */
  _beginBlockDrag(e, id, mode) {
    const origin = this._regions.get(id);
    if (!origin) return;
    e.preventDefault();
    this._select(id);

    const startX = e.clientX;
    const barPx = this._barPx();
    const el = e.currentTarget.closest?.('.cbdaw-arr__region') || null;
    if (el) el.dataset.dragging = 'true';

    const onMove = (ev) => {
      if (barPx <= 0) return;
      const deltaBars = Math.round((ev.clientX - startX) / barPx);
      if (mode === 'move') {
        const lane = this._laneFromClientY(ev.clientY);
        this._regions.move(id, {
          laneId: lane ? lane.id : origin.laneId,
          startBar: origin.startBar + deltaBars,
        });
      } else if (mode === 'start') {
        this._regions.resize(id, { startBar: origin.startBar + deltaBars });
      } else {
        this._regions.resize(id, { lengthBars: origin.lengthBars + deltaBars });
      }
    };

    const onUp = () => {
      this._blockDrag = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this._renderAllRegions();
    };

    this._blockDrag = onUp;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  /** Where a take's notes land now that the editor owns writeback (§10.4): only into the
   *  region already open in the editor for this lane. No playhead guess, no invented
   *  region — a lane with no editor open drops the take. Destination rule beyond this is
   *  open (§10.6), not decided here. */
  _commitToRegion(lane, report) {
    const notes = report?.notes || [];
    if (!notes.length) return;
    if (!this._editor || this._editor.laneId !== lane.id) return;
    this._regions.addNotes(this._editor.regionId, notes);
  }

  /** Opens a region editor (§10.3). A kindless track opens nothing. Only one editor is
   *  open at a time — opening a second closes the first, writing it back first. */
  _openRegion(region) {
    if (!region) return;
    const track = this._tracks.get(region.laneId);
    const kind = track?.kind;
    if (kind !== 'pitched' && kind !== 'drum') return;

    this._closeEditor();

    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.inset = '10%';
    host.style.background = '#fff';
    host.style.zIndex = '9999';
    host.style.overflow = 'auto';
    host.style.border = '1px solid #000';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'cbdaw-arr__btn';
    closeBtn.textContent = 'CLOSE';
    host.appendChild(closeBtn);

    const body = document.createElement('div');
    host.appendChild(body);
    document.body.appendChild(host);

    const surface = kind === 'pitched' ? new PianoRoll() : new StepGrid();
    if (kind === 'pitched') surface.setNotes(region.notes);
    else surface.setPattern(region.notes);
    surface.mount(body);

    this._editor = { regionId: region.id, laneId: region.laneId, kind, surface, host };
    // Not tracked via _addDom: this button dies with `host` on every close, so it must
    // not accumulate in the arrangement's own DOM-listener list.
    closeBtn.addEventListener('click', () => this._closeEditor());
  }

  /** Closes the open editor (§10.4): read the surface, write it back, dispose the surface,
   *  drop the host. `writeBack: false` skips the write — used when the region itself is
   *  already gone. */
  _closeEditor({ writeBack = true } = {}) {
    const ed = this._editor;
    if (!ed) return;
    this._editor = null;
    if (writeBack) {
      const payload = ed.kind === 'pitched' ? ed.surface.getNotes() : ed.surface.getPattern();
      this._regions.setNotes(ed.regionId, payload);
    }
    ed.surface.dispose();
    ed.host.remove();
  }

  on(event, fn) {
    if (!this._listeners[event]) throw new Error(`Arrangement.on: no such event "${event}"`);
    this._listeners[event].add(fn);
    return () => this._listeners[event].delete(fn);
  }

  _emit(event, payload) {
    for (const fn of [...this._listeners[event]]) fn(payload);
  }

  /** Ruler pointer -> transport position. Snaps to the beat; Alt scrubs free. */
  _seekToClientX(clientX, freeScrub = false) {
    const ruler = this.nodes.ruler;
    if (!ruler) return;
    const rect = ruler.getBoundingClientRect();
    if (rect.width <= 0) return;

    const ts = this._clock.timeSignature;
    const tpBar = ticksPerBar(ts);
    const tpBeat = ticksPerBeat(ts);
    const total = Math.max(1, this._clock.songLengthBars) * tpBar;

    const ratio = (clientX - rect.left) / rect.width;
    let ticks = Math.round(ratio * total);
    if (!freeScrub) ticks = Math.round(ticks / tpBeat) * tpBeat;
    ticks = Math.max(0, Math.min(total - tpBeat, ticks));

    const bar = Math.floor(ticks / tpBar) + 1;
    const rem = ticks - (bar - 1) * tpBar;
    const beat = Math.floor(rem / tpBeat) + 1;
    this._clock.seek(bar, beat, rem - (beat - 1) * tpBeat);
  }

  /** The cycle strip. A click sets a one-bar loop starting there; a drag sets the range.
   *  Never touches `loop.on` — the LOOP button still decides whether the transport cycles,
   *  and the strip shows the range either way. */
  _wireLoopRow() {
    const loopRow = this.nodes.loopRow;
    if (!loopRow) return;

    let anchor = 1;
    const setFrom = (clientX) => {
      const bar = this._barFromClientX(clientX);
      const lo = Math.min(anchor, bar);
      const hi = Math.max(anchor, bar);
      this._clock.loop = { ...this._clock.loop, startBar: lo, endBar: hi + 1 };
    };

    const onMove = (e) => { if (this._loopDrag) setFrom(e.clientX); };
    const onUp = () => {
      this._loopDrag = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    this._addDom(loopRow, 'pointerdown', (e) => {
      e.preventDefault();
      anchor = this._barFromClientX(e.clientX);
      this._loopDrag = onUp;
      setFrom(e.clientX);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  _wireRulerSeek() {
    const ruler = this.nodes.ruler;
    if (!ruler) return;

    const onMove = (e) => {
      if (!this._scrub) return;
      this._seekToClientX(e.clientX, e.altKey);
    };
    const onUp = () => {
      this._scrub = false;
      this._scrubRelease = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    this._addDom(ruler, 'pointerdown', (e) => {
      if (this._drag) return; // a loop handle already owns this gesture
      e.preventDefault();
      this._scrub = true;
      this._scrubRelease = onUp;
      this._seekToClientX(e.clientX, e.altKey);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
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
    const barWidth = BAR_W;
    if (!lane.punch.on) { lane.wash.hidden = true; return; }
    lane.wash.hidden = false;
    lane.wash.style.left = `calc(${barWidth} * ${lane.punch.startBar - 1})`;
    lane.wash.style.width = `calc(${barWidth} * ${lane.punch.endBar - lane.punch.startBar})`;
  }

  _renderLoopAndPlayhead() {
    const loop = this._clock.loop;
    const bars = Math.max(1, this._clock.songLengthBars);
    const barWidth = BAR_W;
    if (this._handleStart) this._handleStart.style.left = `calc(${barWidth} * ${loop.startBar - 1})`;
    if (this._handleEnd) this._handleEnd.style.left = `calc(${barWidth} * ${loop.endBar - 1})`;
    this.nodes.loopToggle.dataset.on = String(loop.on);

    const span = this.nodes.loopSpan;
    if (span) {
      span.dataset.on = String(loop.on);
      span.style.left = `calc(${barWidth} * ${loop.startBar - 1})`;
      span.style.width = `calc(${barWidth} * ${loop.endBar - loop.startBar})`;
    }

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

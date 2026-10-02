import { clock as sharedClock, ticksPerBar, ticksPerBeat } from '../core/clock.js';
import { tracks as sharedTracks } from '../core/tracks.js';
import { state as sharedState } from '../core/state.js';
import { unlock } from '../core/audio.js';
import StepGrid from '../surfaces/step-grid.js';
import Keyboard from '../surfaces/keyboard.js';
import DiatonicKeys from '../surfaces/diatonic-keys.js';
import ScaleCircle from '../surfaces/scale-circle.js';
import { regions as sharedRegions } from '../core/regions.js';
import Capture from '../core/capture.js';

const STYLE_ID = 'cbdaw-arrangement-style';
let styleRefs = 0;

// instrumentType -> display label, for the lane head's instrument dropdown
export const INSTRUMENT_OPTIONS = [
  { value: '', label: '—' },
  { value: 'simple-synth', label: 'Simple Synth' },
  { value: 'wave-synth', label: 'Wave Synth' },
  { value: 'overtone-synth', label: 'Overtone Synth' },
  { value: 'chord-module', label: 'Chord Module' },
  { value: 'patch-synth', label: 'Patch Synth' },
  { value: 'drum-synth', label: 'Drum Synth' },
  { value: 'drum-sampler', label: 'Drum Sampler' },
];

// surfaceType -> display label, for the lane head's surface dropdown
const SURFACE_OPTIONS = [
  { value: '', label: '— no surface —' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'diatonic-keys', label: 'Diatonic Keys' },
  { value: 'scale-circle', label: 'Scale Circle' },
  { value: 'step-grid', label: 'Step Grid' },
];

// surfaceType -> constructor + what drives it. 'bus' takes the track's note bus as its
// second argument; 'instrument' takes the clock and is handed the instance via
// bindInstrument().
const SURFACES = {
  keyboard: { Ctor: Keyboard, driver: 'bus' },
  'diatonic-keys': { Ctor: DiatonicKeys, driver: 'bus' },
  'scale-circle': { Ctor: ScaleCircle, driver: 'bus' },
  'step-grid': { Ctor: StepGrid, driver: 'instrument' },
};

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
// two presses on one region inside this window count as a double press
const DOUBLE_PRESS_MS = 400;

function clampZoom(z) {
  const v = Number(z);
  if (!Number.isFinite(v)) return 1;
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v));
}

/** True for a region with at least one note or one on-step. */
function hasPlayableNotes(region) {
  const notes = region?.notes;
  if (Array.isArray(notes)) return notes.length > 0;
  if (notes && typeof notes === 'object' && Array.isArray(notes.lanes)) {
    return notes.lanes.some((lane) => Array.isArray(lane.steps) && lane.steps.some(Boolean));
  }
  return false;
}

/** Lowest and highest note pitch in a note array. */
function noteRange(notes) {
  let min = Infinity;
  let max = -Infinity;
  for (const n of notes) {
    if (n.note < min) min = n.note;
    if (n.note > max) max = n.note;
  }
  if (!Number.isFinite(min)) { min = 60; max = 60; }
  return { min, max };
}

/** Every Nth item of a list so its length lands at or under cap. */
function sampleEvery(list, cap) {
  if (!Number.isFinite(cap) || list.length <= cap) return list;
  const step = Math.ceil(list.length / cap);
  return list.filter((_, i) => i % step === 0);
}

/** Note or step figures for one region, tiled across loop cycles, dead notes dim. */
function buildFigures(region, barTicks, cap) {
  const frag = document.createDocumentFragment();
  const notes = region.notes;
  const lengthTicks = region.lengthBars * barTicks;

  if (Array.isArray(notes)) {
    if (!notes.length) return frag;
    const boundary = (region.loop ? (region.loopBars || region.lengthBars) : region.lengthBars) * barTicks;
    const { min, max } = noteRange(notes);
    const span = Math.max(1, max - min + 1);
    const capped = sampleEvery(notes, cap);
    const cycleNotes = capped.filter((n) => n.tick < boundary);
    const deadNotes = capped.filter((n) => n.tick >= boundary);
    const repeats = region.loop ? Math.ceil(lengthTicks / boundary) : 1;

    const place = (n, tick, dim) => {
      if (tick >= lengthTicks) return;
      const el = document.createElement('div');
      el.className = 'cbdaw-arr__region-note';
      el.dataset.dim = String(dim);
      el.style.left = `${(tick / lengthTicks) * 100}%`;
      el.style.width = `${Math.max((n.length / lengthTicks) * 100, 1)}%`;
      el.style.top = `${span === 1 ? 50 : ((max - n.note) / (span - 1)) * 100}%`;
      frag.appendChild(el);
    };

    for (let k = 0; k < repeats; k++) {
      for (const n of cycleNotes) place(n, k * boundary + n.tick, false);
    }
    for (const n of deadNotes) place(n, n.tick, true);
    return frag;
  }

  if (notes && typeof notes === 'object' && Array.isArray(notes.lanes)) {
    const onLanes = notes.lanes.filter((lane) => Array.isArray(lane.steps) && lane.steps.some(Boolean));
    if (!onLanes.length) return frag;
    const cycleBars = region.loop ? (region.loopBars || region.lengthBars) : region.lengthBars;
    const scale = cycleBars / region.lengthBars;
    const repeats = region.loop ? Math.ceil(region.lengthBars / cycleBars) : 1;
    const rowH = 100 / onLanes.length;

    onLanes.forEach((lane, row) => {
      const onSteps = lane.steps.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
      const sampled = sampleEvery(onSteps, cap);
      for (let k = 0; k < repeats; k++) {
        for (const idx of sampled) {
          const left = ((idx / lane.steps.length) * scale + k * scale) * 100;
          if (left >= 100) continue;
          const el = document.createElement('div');
          el.className = 'cbdaw-arr__region-step';
          el.style.left = `${left}%`;
          el.style.top = `${row * rowH}%`;
          el.style.height = `${rowH}%`;
          frag.appendChild(el);
        }
      }
    });
  }

  return frag;
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
  height: var(--sp-12);
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

/* beat ticks: short marks along the bottom, clear of the labels */
.cbdaw-arr__tick {
  position: var(--pos-absolute);
  top: var(--sp-5);
  bottom: var(--sp-0);
  width: var(--bw);
  background: var(--ruler-tick-beat);
}

/* bar ticks: full height */
.cbdaw-arr__tick[data-bar="true"] {
  top: var(--sp-0);
  background: var(--ruler-tick-bar);
}

.cbdaw-arr__label {
  position: var(--pos-absolute);
  top: var(--sp-5);
  padding-left: var(--sp-2);
  font-size: var(--fs-micro);
  color: var(--text-dim);
  opacity: var(--op-mid);
  white-space: var(--ws-nowrap);
}

/* bar numbers: bright and bold over dimmed beats */
.cbdaw-arr__label[data-bar="true"] {
  color: var(--text);
  opacity: var(--op-full);
  font-weight: var(--w-bold);
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

.cbdaw-arr__lane-surface-pick {
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
  width: var(--pct-100);
  box-sizing: var(--box-border-box);
}

/* the row's buttons split its width, so it ends flush with the name and picker above */
.cbdaw-arr__lane-row > .cbdaw-arr__btn {
  flex: var(--flex-1-1-0);
  min-width: var(--sp-0);
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

/* record dot — white dot, dim while disarmed, red field while armed */
.cbdaw-arr__arm {
  color: var(--text);
  opacity: var(--op-dim);
}

.cbdaw-arr__arm[data-on="true"] {
  background: var(--rec-on);
  border-color: var(--rec-on);
  color: var(--text);
  opacity: var(--op-full);
}

.cbdaw-arr__lane-body {
  position: var(--pos-relative);
  border-bottom: var(--bw) solid var(--line);
  background: var(--lane-row);
  box-sizing: var(--box-border-box);
  overflow: var(--ov-hidden);
  touch-action: var(--touch-none);
}

.cbdaw-arr__lane-body[data-alt="true"] {
  background: var(--lane-row-alt);
}

/* The region row: every block is absolutely positioned inside this, not the lane body. */
.cbdaw-arr__lane-regions {
  position: var(--pos-relative);
  min-height: var(--sp-28);
}

/* The playing surface slot, under the region row. Hidden while the surface is none. Fixed
   width so it does not stretch with the timeline at zoom. */
.cbdaw-arr__lane-surface {
  position: var(--pos-relative);
  width: var(--sp-230);
  border-top: var(--bw) solid var(--line);
  background: var(--recess);
  box-sizing: var(--box-border-box);
}

.cbdaw-arr__lane-surface[hidden] {
  display: var(--disp-none);
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
  position: var(--pos-relative);
  z-index: var(--z-raise-1);
  padding: var(--sp-1) var(--sp-2);
  font-size: var(--fs-micro);
  color: var(--text);
  white-space: var(--ws-nowrap);
  pointer-events: var(--pe-none);
}

/* pointer-events-none layer, fills the block, sits under the label */
.cbdaw-arr__region-figure {
  position: var(--pos-absolute);
  inset: var(--sp-0);
  pointer-events: var(--pe-none);
}

.cbdaw-arr__region-cycle {
  position: var(--pos-absolute);
  top: var(--sp-0);
  bottom: var(--sp-0);
  width: var(--sp-1);
  background: var(--line);
}

.cbdaw-arr__region-note {
  position: var(--pos-absolute);
  min-width: var(--sp-2);
  height: var(--sp-2);
  margin-top: calc(var(--sp-2) / -2);
  border-radius: var(--r-sm);
  background: var(--text);
}

.cbdaw-arr__region-note[data-dim="true"] {
  background: var(--text-dim);
  opacity: var(--op-faint);
}

.cbdaw-arr__region-step {
  position: var(--pos-absolute);
  width: var(--sp-2);
  background: var(--text);
}

.cbdaw-arr__region-loop {
  position: var(--pos-absolute);
  top: var(--sp-1);
  right: var(--sp-1);
  padding: var(--sp-0) var(--sp-1);
  z-index: var(--z-raise-1);
}

.cbdaw-arr__region-loop[data-on="true"] {
  background: var(--rec-on);
  border-color: var(--rec-on);
  color: var(--text);
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

  constructor(el = null, clock = sharedClock, regions = sharedRegions, tracks = sharedTracks, opts = {}) {
    this._clock = clock;
    this._regions = regions;
    this._tracks = tracks;
    this.defaultTarget = el;
    this.mounted = false;
    // false: lanes carry no surface slot and no surface picker
    this._laneSurfaces = opts.laneSurfaces !== false;

    this._channels = [];
    this._lanes = new Map();
    this._selectedId = null;
    this._unsubRegions = null;
    this._unsubTracksAdd = null;
    this._unsubTracksRemove = null;
    this._unsubTracksUpdate = null;
    this._unsubProject = null;
    this._blockDrag = null;
    this._loopDrag = null;
    this._listeners = { select: new Set(), open: new Set() };
    // { id, at } of the last region press, null after a double press
    this._lastPress = null;
    // the clock statechange handler, live only while mounted
    this._onClockState = null;

    // (id, instrumentType|null) -> the page's assignment flow. Unset, the dropdown writes
    // the store field only and no instance is built.
    this.onAssignInstrument = null;
    // called with each finished lane; null when no host is hanging controls on the head
    this.onLaneBuilt = null;

    this.el = null;
    this.nodes = {
      scroll: null, grid: null, corner: null, ruler: null, overlay: null,
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

  /** Instrument change on a live track: rebinds an instrument-driven surface in place. The
   *  surface is never rebuilt, and a bus-driven surface needs nothing — its bus is already
   *  bound to the new instance by the caller. */
  bindLaneInstrument(id, instrument) {
    const lane = this._lanes.get(id);
    if (!lane) return this;
    lane.instrument = instrument || null;
    lane.capture.setInstrument(instrument || null);
    if (lane.surface && SURFACES[lane.surfaceType]?.driver === 'instrument') {
      lane.surface.bindInstrument(instrument || null);
    }
    return this;
  }

  /** Pushes one track's `armed` to its button, its capture and its bus. The store is the
   *  only writer; this is the only reader. Arm layers — never clears another lane. */
  /** Pushes the project punch range onto every lane's Capture and redraws each wash.
   *  Called on mount and on every 'project' emit; a lane built later reads the store
   *  itself in `_buildLane`. */
  _syncPunch(punch) {
    if (!punch) return;
    for (const lane of this._lanes.values()) {
      lane.punch.on = Boolean(punch.on);
      lane.punch.startBar = punch.startBar;
      lane.punch.endBar = punch.endBar;
      if (lane.punch.on) lane.capture.punchIn(punch.startBar, punch.endBar);
      else lane.capture.punchOff();
      if (lane.wash) this._renderLanePunchWash(lane);
    }
  }

  _syncLaneArm(lane, armed) {
    const on = Boolean(armed);
    if (lane.armBtn) lane.armBtn.dataset.on = String(on);
    if (on) lane.capture.arm('all'); else lane.capture.disarm('all');
    if (lane.bus) lane.bus.armed = on;
  }

  /** The track's note bus, from `core/track-bus.js`. Bus-driven surfaces are constructed
   *  against it. Binding late mounts a surface the lane was built with but could not
   *  construct yet. */
  bindLaneBus(id, bus) {
    const lane = this._lanes.get(id);
    if (!lane) return this;
    lane.bus = bus || null;
    if (lane.bus) lane.bus.armed = Boolean(this._tracks.get(id)?.armed);
    if (lane.bus && lane.surfaceType && !lane.surface) {
      this._mountLaneSurface(lane, lane.surfaceType);
    }
    return this;
  }

  get lanes() {
    return [...this._lanes.values()].map((l) => ({
      id: l.id, kind: l.kind, label: l.label, capture: l.capture, instrument: l.instrument,
      bus: l.bus, surfaceType: l.surfaceType, surface: l.surface,
    }));
  }

  _addDom(el, type, fn, opts) {
    el.addEventListener(type, fn, opts);
    this._domListeners.push({ el, type, fn, opts });
  }

  _detachDom() {
    for (const { el, type, fn, opts } of this._domListeners) el.removeEventListener(type, fn, opts);
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

    // The transport bar owns the punch range; every lane's Capture follows it.
    this._unsubProject = sharedState.on('project', (p) => { this._syncPunch(p.punch); this._renderAllRegions(); });
    this._syncPunch(sharedState.project.punch);

    // The transport's record state opens and closes every armed lane's take.
    this._onClockState = ({ to }) => this._syncTakes(to);
    this._clock.on('statechange', this._onClockState);

    // Audio unlock, capture phase: a mounted surface's own window keydown listener runs in
    // the bubble phase, so this resumes the context before the first note is played.
    this._addDom(window, 'keydown', unlock, true);

    this._rafHandle = requestAnimationFrame(this._rafLoop);
    this.mounted = true;
    return this;
  }

  /** Mid-drag the blocks are rebuilt every pointermove, which would drop the node the
   *  gesture is attached to. Only the geometry moves. */
  _renderDuringDrag() {
    const barTicks = ticksPerBar();
    for (const lane of this._lanes.values()) {
      for (const el of lane.regionRow.querySelectorAll('.cbdaw-arr__region')) {
        const r = this._regions.get(el.dataset.id);
        if (!r) { el.remove(); continue; }
        if (r.laneId !== lane.id) { el.remove(); continue; }
        this._paintRegionBlock(el, r, barTicks);
      }
    }
    // A region dragged onto another lane has no node there yet.
    for (const lane of this._lanes.values()) {
      for (const r of this._regions.forLane(lane.id)) {
        if (!lane.regionRow.querySelector(`.cbdaw-arr__region[data-id="${r.id}"]`)) {
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
    if (this._onClockState) this._clock.off('statechange', this._onClockState);
    this._onClockState = null;
    this._unsubRegions?.();
    this._unsubRegions = null;
    this._unsubTracksAdd?.();
    this._unsubTracksRemove?.();
    this._unsubTracksUpdate?.();
    this._unsubProject?.();
    this._unsubTracksAdd = null;
    this._unsubTracksRemove = null;
    this._unsubTracksUpdate = null;
    this._unsubProject = null;
    this._selectedId = null;
    this._detachDom();
    this._teardownLanes();
    this.el?.remove();
    this.el = null;
    this.nodes = {
      scroll: null, grid: null, corner: null, ruler: null, overlay: null,
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
    grid.appendChild(corner);

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
      scroll, grid, corner, ruler, overlay, toolbar, zoomOut, zoomIn, zoomReadout,
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
      this._disposeLaneSurface(lane);
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
    this._disposeLaneSurface(lane);
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

  /** Name/instrumentType/kind/surfaceType changed on a live track — updates the one lane in
   *  place. The surface is remounted only when `surfaceType` itself changed. */
  _onTrackUpdate(t) {
    if (!this.mounted) return;
    const lane = this._lanes.get(t.id);
    if (!lane) return;
    lane.kind = t.kind;
    lane.label = t.name || t.id;
    this._syncLaneArm(lane, t.armed);
    if (lane.nameInput && document.activeElement !== lane.nameInput) lane.nameInput.value = lane.label;
    if (lane.instrumentSelect && document.activeElement !== lane.instrumentSelect) {
      lane.instrumentSelect.value = t.instrumentType || '';
    }
    const next = t.surfaceType || null;
    if (lane.surfaceSelect && document.activeElement !== lane.surfaceSelect) {
      lane.surfaceSelect.value = next || '';
    }
    if (next !== lane.surfaceType) this._mountLaneSurface(lane, next);
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

    // which surface this track plays through. Writes the store; the store's update event is
    // what actually mounts it. Null when lane surfaces are off.
    const storedSurface = this._tracks.get(ch.id)?.surfaceType || null;
    let surfaceSelect = null;
    if (this._laneSurfaces) {
      surfaceSelect = document.createElement('select');
      surfaceSelect.className = 'cbdaw-arr__lane-surface-pick';
      surfaceSelect.title = 'Playing surface';
      for (const opt of SURFACE_OPTIONS) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        surfaceSelect.appendChild(o);
      }
      surfaceSelect.value = storedSurface || '';
      head.appendChild(surfaceSelect);
    }

    this._addDom(nameInput, 'change', () => {
      this._tracks.update(ch.id, { name: nameInput.value });
    });

    this._addDom(instrumentSelect, 'change', () => {
      const type = instrumentSelect.value || null;
      if (typeof this.onAssignInstrument === 'function') this.onAssignInstrument(ch.id, type);
      else this._tracks.setInstrumentType(ch.id, type);
    });

    if (surfaceSelect) {
      this._addDom(surfaceSelect, 'change', () => {
        this._tracks.setSurfaceType(ch.id, surfaceSelect.value || null);
      });
    }

    const armRow = document.createElement('div');
    armRow.className = 'cbdaw-arr__lane-row';
    const armBtn = document.createElement('button');
    armBtn.type = 'button';
    armBtn.className = 'cbdaw-arr__btn cbdaw-arr__arm';
    armBtn.textContent = 'ARM';
    armBtn.title = 'Arm for recording';
    armBtn.setAttribute('aria-label', 'Arm for recording');
    armBtn.dataset.on = 'false';
    // drops the track record; every listener releases its own half of the track
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'cbdaw-arr__btn';
    removeBtn.textContent = 'DELETE';
    removeBtn.title = 'Remove track';
    armRow.append(armBtn, removeBtn);
    head.appendChild(armRow);

    this._addDom(removeBtn, 'click', () => this._tracks.remove(ch.id));

    const body = document.createElement('div');
    body.className = 'cbdaw-arr__lane-body';
    body.dataset.alt = String(this._lanes.size % 2 === 1);

    const regionRow = document.createElement('div');
    regionRow.className = 'cbdaw-arr__lane-regions';
    body.appendChild(regionRow);

    // null when lane surfaces are off
    let surfaceSlot = null;
    if (this._laneSurfaces) {
      surfaceSlot = document.createElement('div');
      surfaceSlot.className = 'cbdaw-arr__lane-surface';
      surfaceSlot.hidden = true;
      body.appendChild(surfaceSlot);

      // Audio unlock, capture phase: runs before the surface's own pointer handler sounds the
      // first note, which a suspended context would otherwise drop silently.
      this._addDom(surfaceSlot, 'pointerdown', unlock, true);
      this._addDom(surfaceSlot, 'touchstart', unlock, { capture: true, passive: true });
    }

    this.nodes.grid.appendChild(head);
    this.nodes.grid.appendChild(body);

    const kind = ch.kind === 'drum' || ch.kind === 'pitched' ? ch.kind : null;

    // mirrors the transport bar's project punch; the lane owns no punch controls
    const punchState = { ...sharedState.project.punch };

    // No `target`: with none, Capture still emits `notes[]` on commit, and those go into
    // the region under the playhead rather than into a mounted editor.
    const capture = new Capture({ clock: this._clock });
    capture.disarm('all');

    const lane = {
      id: ch.id, kind, label: ch.label, capture, head, body, regionRow, surfaceSlot,
      instrument: null, bus: null, surface: null, surfaceType: null,
      nameInput, instrumentSelect, surfaceSelect, armBtn,
      punch: punchState,
    };
    this._lanes.set(ch.id, lane);
    this._syncLaneArm(lane, this._tracks.get(ch.id)?.armed);

    capture.on('commit', (report) => {
      if (report?.kind === 'discard') return;
      this._commitToRegion(lane, report);
    });

    // Double-click empty region-row space makes a one-bar region there.
    this._addDom(regionRow, 'dblclick', (e) => {
      if (e.target !== regionRow) return;
      const bar = this._barFromClientX(e.clientX);
      const made = this._regions.add({ laneId: lane.id, startBar: bar, lengthBars: 1, name: lane.label });
      if (made) this._select(made.id);
    });

    this._addDom(regionRow, 'pointerdown', (e) => {
      if (e.target === regionRow) this._select(null);
    });

    // writes the store only; `_syncLaneArm` off the update event moves the button, the
    // lane's capture and the lane's bus
    this._addDom(armBtn, 'click', () => {
      this._tracks.setArmed(ch.id, armBtn.dataset.on !== 'true');
    });

    const wash = document.createElement('div');
    wash.className = 'cbdaw-arr__punch-wash';
    wash.hidden = true;
    this.nodes.overlay.appendChild(wash);
    lane.wash = wash;

    // a lane built after mount picks up the transport's punch range on its own
    if (punchState.on) capture.punchIn(punchState.startBar, punchState.endBar);
    this._renderLanePunchWash(lane);

    // last: mounting a surface measures the overlay, which needs `lane.wash` in place
    if (storedSurface) this._mountLaneSurface(lane, storedSurface);

    // the finished lane, for a host that hangs its own controls on the head
    if (typeof this.onLaneBuilt === 'function') this.onLaneBuilt(lane);
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
        // bar starts: "2"; beats between: "2.2", "2.3"
        beatLabel.textContent = isBarStart ? String(bar) : `${bar}.${beat + 1}`;
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
    // The wash covers the region row only, not the surface slot beneath it.
    for (const lane of this._lanes.values()) {
      if (!lane.wash) continue;
      const row = lane.regionRow || lane.body;
      const top = lane.body.offsetTop + row.offsetTop - this.nodes.grid.offsetTop;
      lane.wash.style.top = `${top}px`;
      lane.wash.style.height = `${row.offsetHeight}px`;
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

  /** A second press on the same region inside DOUBLE_PRESS_MS emits 'open'. */
  _noteRegionPress(id) {
    const now = performance.now();
    const last = this._lastPress;
    const twice = !!last && last.id === id && now - last.at < DOUBLE_PRESS_MS;
    this._lastPress = twice ? null : { id, at: now };
    if (twice) this._emit('open', this._regions.get(id) || null);
  }

  _paintSelection() {
    for (const lane of this._lanes.values()) {
      for (const el of lane.regionRow.querySelectorAll('.cbdaw-arr__region')) {
        el.dataset.selected = String(el.dataset.id === this._selectedId);
      }
    }
  }

  /** Rebuilds one lane's blocks from the store. */
  _renderLaneRegions(lane) {
    for (const el of [...lane.regionRow.querySelectorAll('.cbdaw-arr__region')]) el.remove();
    const barTicks = ticksPerBar();

    for (const r of this._regions.forLane(lane.id)) {
      const el = document.createElement('div');
      el.className = 'cbdaw-arr__region';
      el.dataset.id = r.id;
      el.dataset.selected = String(r.id === this._selectedId);
      el.dataset.muted = String(r.muted);
      if (r.color) el.style.background = r.color;

      const figure = document.createElement('div');
      figure.className = 'cbdaw-arr__region-figure';
      el.appendChild(figure);

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

      const loopBtn = document.createElement('button');
      loopBtn.type = 'button';
      loopBtn.className = 'cbdaw-arr__btn cbdaw-arr__region-loop';
      loopBtn.textContent = '⟳';
      el.appendChild(loopBtn);
      this._addDom(loopBtn, 'pointerdown', (e) => {
        e.stopPropagation();
        this._beginLoopDrag(e, r.id);
      });

      this._addDom(el, 'pointerdown', (e) => {
        this._beginBlockDrag(e, r.id, 'move');
        this._noteRegionPress(r.id);
      });

      lane.regionRow.appendChild(el);
      this._paintRegionBlock(el, r, barTicks);
    }
  }

  /** Fills a region block's geometry, loop glyph, and figure layer. */
  _paintRegionBlock(el, r, barTicks) {
    el.style.left = `calc(${BAR_W} * ${r.startBar - 1})`;
    el.style.width = `calc(${BAR_W} * ${r.lengthBars})`;

    const loopBtn = el.querySelector('.cbdaw-arr__region-loop');
    if (loopBtn) loopBtn.dataset.on = String(r.loop);

    const figure = el.querySelector('.cbdaw-arr__region-figure');
    if (!figure) return;
    figure.replaceChildren();
    if (r.loop && r.loopBars) {
      for (let b = r.loopBars; b < r.lengthBars; b += r.loopBars) {
        const line = document.createElement('div');
        line.className = 'cbdaw-arr__region-cycle';
        line.style.left = `${(b / r.lengthBars) * 100}%`;
        figure.appendChild(line);
      }
    }
    figure.appendChild(buildFigures(r, barTicks, this._figureCap()));
  }

  /** state.project.figureCap, 'ALL' as Infinity. */
  _figureCap() {
    const cap = sharedState.project.figureCap;
    return cap === 'ALL' ? Infinity : (Number(cap) || 96);
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

  /** Click toggles loop. Drag grows/shrinks by whole cycles and sets loop on. No notes, no-op. */
  _beginLoopDrag(e, id) {
    const origin = this._regions.get(id);
    if (!origin || !hasPlayableNotes(origin)) return;
    e.preventDefault();
    this._select(id);

    const startX = e.clientX;
    const barPx = this._barPx();
    const cycle = origin.loop ? (origin.loopBars || origin.lengthBars) : origin.lengthBars;
    const el = e.currentTarget.closest?.('.cbdaw-arr__region') || null;
    let dragged = false;

    const onMove = (ev) => {
      if (barPx <= 0) return;
      const deltaBars = Math.round((ev.clientX - startX) / barPx);
      const deltaCycles = Math.round(deltaBars / cycle);
      if (deltaCycles === 0) return;
      dragged = true;
      if (el) el.dataset.dragging = 'true';
      const nextLen = Math.max(cycle, origin.lengthBars + deltaCycles * cycle);
      this._regions.resize(id, { lengthBars: nextLen });
      this._regions.setLoop(id, { on: true, loopBars: cycle });
    };

    const onUp = () => {
      this._blockDrag = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (!dragged) this._regions.setLoop(id, { on: !origin.loop });
      this._renderAllRegions();
    };

    this._blockDrag = onUp;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  /** Opens a take on every armed lane while the transport records, closes every take when
   *  it stops or leaves the record state. An unarmed lane opens nothing. */
  _syncTakes(state) {
    const recording = state === 'recording';
    for (const lane of this._lanes.values()) {
      const armed = Boolean(this._tracks.get(lane.id)?.armed);
      if (recording && armed) lane.capture.record();
      else lane.capture.stopTake();
    }
  }

  /** Where a take's notes land: the region under the playhead, else a new one-bar region
   *  at the playhead. */
  _commitToRegion(lane, report) {
    const notes = report?.notes || [];
    if (!notes.length) return;
    const bar = this._clock.position.bar;
    const target = this._regions.at(lane.id, bar)
      || this._regions.add({ laneId: lane.id, startBar: bar, lengthBars: 1, name: lane.label });
    if (target) this._regions.addNotes(target.id, notes);
  }

  // ——— playing surfaces —————————————————————————————————————————————————————————————————

  /** Unmounts, disposes and forgets the lane's surface, and collapses its slot. Leaves
   *  `lane.surfaceType` alone — the caller sets that. */
  _disposeLaneSurface(lane) {
    if (!lane.surface) return false;
    const surface = lane.surface;
    lane.surface = null;
    surface.dispose();
    if (lane.surfaceSlot) {
      lane.surfaceSlot.replaceChildren();
      lane.surfaceSlot.hidden = true;
    }
    return true;
  }

  /** Builds the lane's playing surface and mounts it compact into the slot. Disposes the
   *  outgoing one first. `type` null collapses the slot. A bus-driven type with no bus
   *  bound yet is recorded and left unmounted — `bindLaneBus()` mounts it when the bus
   *  arrives. */
  _mountLaneSurface(lane, type) {
    this._disposeLaneSurface(lane);
    lane.surfaceType = type || null;
    if (!this._laneSurfaces || !lane.surfaceSlot) return null;
    if (!lane.surfaceType) { this._layoutOverlay(); return null; }

    const entry = SURFACES[lane.surfaceType];
    if (!entry) {
      console.warn('[arrangement.js] no such surface "%s"', lane.surfaceType);
      lane.surfaceType = null;
      return null;
    }

    let surface = null;
    if (entry.driver === 'instrument') {
      surface = new entry.Ctor(null, this._clock);
      surface.bindInstrument(lane.instrument || null);
    } else {
      if (!lane.bus) { this._layoutOverlay(); return null; } // no bus yet: bindLaneBus() mounts it
      surface = lane.surfaceType === 'scale-circle'
        ? new entry.Ctor(null, lane.bus, sharedState)
        : new entry.Ctor(null, lane.bus);
    }

    lane.surface = surface;
    lane.surfaceSlot.hidden = false;
    surface.mountCompact(lane.surfaceSlot);
    this._layoutOverlay();
    return surface;
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

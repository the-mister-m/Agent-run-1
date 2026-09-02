// =========================================================================================
// ui/daw-shell.js — THE DAW FRAME
// =========================================================================================
// Builds `/index.html`'s DOM: named, empty mount points only. Mounts nothing inside them —
// no instrument, no device, no surface, no store. The six S3 seats mount into what this
// file builds; `MOUNTS` is the name each of them reads.
// =========================================================================================

import { ctx, unlock } from '../core/audio.js';
import { clock } from '../core/clock.js';
import { state } from '../core/state.js';
import { tracks } from '../core/tracks.js';
import { regions } from '../core/regions.js';
import Arrangement from './arrangement.js';
import { createStrips } from '../mixer/strip.js';
import Graph from '../mixer/graph.js';
import { createAutomationRack } from '../mixer/automation.js';
import WaveSynth from '../instruments/wave-synth.js';
import OvertoneSynth from '../instruments/overtone-synth.js';
import ChordModule from '../instruments/chord-module.js';
import PatchSynth from '../instruments/patch-synth.js';
import DrumSynth from '../instruments/drum-synth.js';
import DrumSampler from '../instruments/drum-sampler.js';
import {
  createScaleControl,
  createCpuMeter,
  createSurfaceSwitcher,
  createFileMenu,
  acquireShellStyle,
  releaseShellStyle,
} from './shell.js';

const STYLE_ID = 'cbdaw-daw-shell-style';
let styleRefs = 0;

/** instrumentType -> constructor. Every one is `constructor(ctx, out)` + `dispose()`. */
const INSTRUMENTS = {
  'wave-synth': WaveSynth,
  'overtone-synth': OvertoneSynth,
  'chord-module': ChordModule,
  'patch-synth': PatchSynth,
  'drum-synth': DrumSynth,
  'drum-sampler': DrumSampler,
};

/** The named mount points every S3/S4/S5 seat reads by `data-mount`. */
export const MOUNTS = {
  header: 'project-header',
  transport: 'transport-bar',
  playingSurface: 'playing-surface',
  arrangement: 'arrangement',
  nodeGraph: 'node-graph',
  automationLanes: 'automation-lanes',
  devicePopout: 'device-popout',
  strip(id) {
    return `strip-${id}`;
  },
};

const STYLE_TEXT = `
.cbdaw-daw-shell {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  width: var(--pct-100);
  height: var(--vh-100);
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: var(--fs-base);
  overflow: var(--ov-hidden);
  box-sizing: var(--box-border-box);
}

.cbdaw-daw-shell__header,
.cbdaw-daw-shell__transport {
  flex: var(--flex-0-0-auto);
  background: var(--transport-ground);
  border-bottom: var(--bw) solid var(--line);
  box-sizing: var(--box-border-box);
}

.cbdaw-daw-shell__header {
  min-height: var(--sp-30);
}

.cbdaw-daw-shell__transport {
  min-height: var(--sp-16);
}

.cbdaw-daw-shell__body {
  flex: var(--flex-1-1-0);
  display: var(--disp-flex);
  min-height: var(--sp-0);
  overflow: var(--ov-hidden);
}

.cbdaw-daw-shell__workspace {
  flex: var(--flex-1-1-0);
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  min-width: var(--sp-0);
  overflow: var(--ov-hidden);
}

.cbdaw-daw-shell__pane {
  flex: var(--flex-1-1-0);
  min-height: var(--sp-0);
  border-bottom: var(--bw) solid var(--line);
  box-sizing: var(--box-border-box);
}

.cbdaw-daw-shell__pane:last-child {
  border-bottom: var(--none);
}

.cbdaw-daw-shell__arrangement { background: var(--ruler-ground); }
.cbdaw-daw-shell__graph       { background: var(--graph-ground); }
.cbdaw-daw-shell__automation  { background: var(--lane-ground); }

.cbdaw-daw-shell__mixer {
  flex: var(--flex-0-0-auto);
  display: var(--disp-flex);
  align-items: var(--align-stretch);
  gap: var(--sp-1);
  padding: var(--sp-1);
  background: var(--recess);
  border-left: var(--bw) solid var(--line);
  box-sizing: var(--box-border-box);
}

.cbdaw-daw-shell__strip {
  flex: var(--flex-0-0-auto);
  width: var(--sp-30);
  background: var(--strip-head);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-cell);
  box-sizing: var(--box-border-box);
}

.cbdaw-daw-shell__strip--master {
  border: var(--bw-2) solid var(--strip-sel);
}

.cbdaw-daw-shell__popout {
  position: var(--pos-absolute);
  inset: var(--sp-0);
  display: var(--disp-flex);
  align-items: var(--align-center);
  justify-content: var(--justify-center);
  background: var(--scrim);
  z-index: var(--z-scrim);
}

.cbdaw-daw-shell__popout[hidden] {
  display: var(--disp-none);
}

.cbdaw-daw-shell__popout-panel {
  min-width: var(--sp-230);
  min-height: var(--sp-95);
  background: var(--popout-ground);
  border-radius: var(--r-panel);
  box-shadow: var(--shadow-raised);
  box-sizing: var(--box-border-box);
}

.cbdaw-daw-shell__playing-surface {
  flex: var(--flex-0-0-auto);
  max-height: var(--sp-230);
  overflow-y: var(--auto);
  overflow-x: var(--ov-hidden);
  background: var(--recess);
  border-bottom: var(--bw) solid var(--line);
  box-sizing: var(--box-border-box);
}

/* project header */
.cbdaw-dawhead {
  display: var(--disp-flex);
  align-items: var(--align-center);
  flex-wrap: var(--flexwrap-wrap);
  gap: var(--sp-6);
  height: var(--pct-100);
  padding: var(--sp-3) var(--sp-6);
  box-sizing: var(--box-border-box);
}

.cbdaw-dawhead__field {
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-2);
  color: var(--text-dim);
  font-size: var(--fs-sm);
}

.cbdaw-dawhead__field input {
  width: var(--sp-30);
  font: var(--font-inherit);
  color: var(--text);
  background: var(--btn-face);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-ctl);
  padding: var(--sp-1) var(--sp-2);
}

.cbdaw-dawhead__spacer {
  flex: var(--flex-1-1-auto);
}

/* transport bar */
.cbdaw-transport {
  display: var(--disp-flex);
  align-items: var(--align-center);
  flex-wrap: var(--flexwrap-wrap);
  gap: var(--sp-5);
  height: var(--pct-100);
  padding: var(--sp-3) var(--sp-6);
  box-sizing: var(--box-border-box);
  font-size: var(--fs-sm);
  color: var(--text-dim);
}

.cbdaw-transport__btn {
  font: var(--font-inherit);
  font-weight: var(--w-bold);
  min-width: var(--sp-15);
  padding: var(--sp-1) var(--sp-4);
  color: var(--text);
  background: var(--btn-face);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-ctl);
  cursor: var(--cur-pointer);
}

.cbdaw-transport__btn[data-on="true"] { background: var(--btn-active); color: var(--recess); }
.cbdaw-transport__btn[data-role="play"][data-on="true"] { background: var(--play-on); }
.cbdaw-transport__btn[data-role="record"][data-on="true"] { background: var(--rec-on); }

.cbdaw-transport__field {
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-2);
}

.cbdaw-transport__field input[type="number"] {
  width: var(--sp-16);
  font: var(--font-inherit);
  color: var(--text);
  background: var(--btn-face);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-ctl);
  padding: var(--sp-1) var(--sp-2);
}

.cbdaw-transport__toggle {
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-2);
  cursor: var(--cur-pointer);
  user-select: var(--usel-none);
}

.cbdaw-transport__toggle[data-role="loop"][data-on="true"] { color: var(--loop-region); }
.cbdaw-transport__toggle[data-role="punch"][data-on="true"] { color: var(--punch-region); }

.cbdaw-transport__position {
  font-family: var(--font-mono);
  font-variant-numeric: var(--num-tabular);
  color: var(--text);
}
`;

/** Injects the shell's stylesheet, ref-counted — mirrors `ui/shell.js`'s
 *  `acquireShellStyle()`/`releaseShellStyle()` shape without importing that file's chrome. */
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

function stripMarkup(id, isMaster) {
  const cls = isMaster
    ? 'cbdaw-daw-shell__strip cbdaw-daw-shell__strip--master'
    : 'cbdaw-daw-shell__strip';
  return `<div class="${cls}" data-mount="${MOUNTS.strip(id)}" data-channel="${id}"></div>`;
}

/**
 * → `{ root, header, transport, arrangement, nodeGraph, automationLanes, devicePopout,
 *      mixer, strips: {…live track ids, master}, unmount() }`.
 *
 * Builds the DAW frame into `host` and appends it. Every element named here is an empty
 * mount point — this function instantiates no instrument, no device, no surface, and binds
 * no store. `unmount()` removes the frame and releases the injected stylesheet.
 */
export function mountDawShell(host = document.body) {
  acquireStyle();

  const root = document.createElement('div');
  root.className = 'cbdaw-daw-shell';
  root.dataset.mount = 'daw-root';
  root.innerHTML = `
    <header class="cbdaw-daw-shell__header" data-mount="${MOUNTS.header}"></header>
    <div class="cbdaw-daw-shell__transport" data-mount="${MOUNTS.transport}"></div>
    <div class="cbdaw-daw-shell__playing-surface" data-mount="${MOUNTS.playingSurface}"></div>
    <div class="cbdaw-daw-shell__body">
      <div class="cbdaw-daw-shell__workspace">
        <div class="cbdaw-daw-shell__pane cbdaw-daw-shell__arrangement" data-mount="${MOUNTS.arrangement}"></div>
        <div class="cbdaw-daw-shell__pane cbdaw-daw-shell__graph" data-mount="${MOUNTS.nodeGraph}"></div>
        <div class="cbdaw-daw-shell__pane cbdaw-daw-shell__automation" data-mount="${MOUNTS.automationLanes}"></div>
      </div>
      <div class="cbdaw-daw-shell__mixer" data-mount="mixer">
        ${tracks.all.map((t) => stripMarkup(t.id, false)).join('')}
        ${stripMarkup('master', true)}
      </div>
    </div>
    <div class="cbdaw-daw-shell__popout" data-mount="${MOUNTS.devicePopout}" hidden>
      <div class="cbdaw-daw-shell__popout-panel"></div>
    </div>
  `;

  host.appendChild(root);

  const strips = {};
  for (const id of [...tracks.all.map((t) => t.id), 'master']) {
    strips[id] = root.querySelector(`[data-mount="${MOUNTS.strip(id)}"]`);
  }

  return {
    root,
    header: root.querySelector(`[data-mount="${MOUNTS.header}"]`),
    transport: root.querySelector(`[data-mount="${MOUNTS.transport}"]`),
    playingSurface: root.querySelector(`[data-mount="${MOUNTS.playingSurface}"]`),
    arrangement: root.querySelector(`[data-mount="${MOUNTS.arrangement}"]`),
    nodeGraph: root.querySelector(`[data-mount="${MOUNTS.nodeGraph}"]`),
    automationLanes: root.querySelector(`[data-mount="${MOUNTS.automationLanes}"]`),
    devicePopout: root.querySelector(`[data-mount="${MOUNTS.devicePopout}"]`),
    /** the strip rail itself — strip slots are inserted into it as tracks are added */
    mixer: root.querySelector('[data-mount="mixer"]'),
    strips,
    /** Removes the frame from the DOM and releases the stylesheet ref. */
    unmount() {
      root.remove();
      releaseStyle();
    },
  };
}

// Fills mountDawShell()'s mount points: header, transport, playing surface, one instrument.

function listenerBag() {
  const bag = [];
  return {
    add(target, type, fn) {
      target.addEventListener(type, fn);
      bag.push({ target, type, fn });
    },
    dropAll() {
      for (const { target, type, fn } of bag) target.removeEventListener(type, fn);
      const n = bag.length;
      bag.length = 0;
      return n;
    },
  };
}

/** File menu over channel strips. Selecting one hides the rest; selecting it again shows all.
 *  The menu's item list is fixed at construction, so a track change rebuilds it in place. */
function buildIsolateControl(strips) {
  const host = document.createElement('div');
  let isolated = null;
  let menu = null;

  function apply() {
    for (const [id, el] of Object.entries(strips)) {
      if (el) el.hidden = isolated !== null && id !== isolated;
    }
  }

  function build() {
    const ids = [...tracks.all.map((t) => t.id), 'master'];
    if (isolated !== null && !ids.includes(isolated)) isolated = null;
    menu?.dispose();
    host.replaceChildren();
    menu = createFileMenu({
      items: ids.map((id) => ({ id, label: tracks.get(id)?.name || id, available: true, phase: 'ch' })),
      currentId: null,
      label: 'Isolate',
      onSelect(item) {
        isolated = isolated === item.id ? null : item.id;
        menu.setCurrent(isolated);
        apply();
      },
    });
    menu.setCurrent(isolated);
    host.appendChild(menu.el);
    apply();
  }

  build();
  const offTracks = tracks.on('change', build);

  return {
    el: host,
    dispose() {
      offTracks();
      menu?.dispose();
      isolated = null;
      apply();
      host.remove();
    },
  };
}

/** Header: isolate control, scale, BPM, time signature, song length, CPU meter. */
export function mountProjectHeader(el, { store = state, clockRef = clock, strips = {}, instrument = null } = {}) {
  acquireShellStyle();
  const listeners = listenerBag();

  const root = document.createElement('div');
  root.className = 'cbdaw-dawhead';

  const isolate = buildIsolateControl(strips);
  root.appendChild(isolate.el);

  const scaleControl = createScaleControl(store);
  root.appendChild(scaleControl.el);

  const bpmField = document.createElement('div');
  bpmField.className = 'cbdaw-dawhead__field';
  bpmField.innerHTML = `<label>BPM</label><input type="number" min="1" step="1" data-bpm>`;
  root.appendChild(bpmField);
  const bpmInput = bpmField.querySelector('[data-bpm]');
  bpmInput.value = clockRef.bpm;
  listeners.add(bpmInput, 'change', () => {
    clockRef.bpm = Number(bpmInput.value) || clockRef.bpm;
  });

  const tsField = document.createElement('div');
  tsField.className = 'cbdaw-dawhead__field';
  tsField.innerHTML =
    '<label>Time</label><input type="number" min="1" step="1" data-ts-top>' +
    '<span>/</span><input type="number" min="1" step="1" data-ts-bottom>';
  root.appendChild(tsField);
  const tsTop = tsField.querySelector('[data-ts-top]');
  const tsBottom = tsField.querySelector('[data-ts-bottom]');
  tsTop.value = clockRef.timeSignature.top;
  tsBottom.value = clockRef.timeSignature.bottom;
  function applyTs() {
    clockRef.timeSignature = {
      top: Number(tsTop.value) || clockRef.timeSignature.top,
      bottom: Number(tsBottom.value) || clockRef.timeSignature.bottom,
    };
  }
  listeners.add(tsTop, 'change', applyTs);
  listeners.add(tsBottom, 'change', applyTs);

  const lenField = document.createElement('div');
  lenField.className = 'cbdaw-dawhead__field';
  lenField.innerHTML = '<label>Length</label><input type="number" min="1" step="1" data-song-length><span>bars</span>';
  root.appendChild(lenField);
  const lenInput = lenField.querySelector('[data-song-length]');
  lenInput.value = clockRef.songLengthBars;
  listeners.add(lenInput, 'change', () => {
    clockRef.songLengthBars = Number(lenInput.value) || clockRef.songLengthBars;
  });

  const spacer = document.createElement('div');
  spacer.className = 'cbdaw-dawhead__spacer';
  root.appendChild(spacer);

  const cpu = createCpuMeter({ instrument });
  root.appendChild(cpu.el);

  el.appendChild(root);

  return {
    el: root,
    dispose() {
      listeners.dropAll();
      cpu.dispose();
      scaleControl.dispose();
      isolate.dispose();
      root.remove();
      releaseShellStyle();
    },
  };
}

/** Transport: play/stop/record, position readout, metronome, count-in, loop, arm, punch. */
export function mountTransportBar(el, { store = state, clockRef = clock } = {}) {
  const listeners = listenerBag();

  const root = document.createElement('div');
  root.className = 'cbdaw-transport';
  root.innerHTML = `
    <button type="button" class="cbdaw-transport__btn" data-role="play">Play</button>
    <button type="button" class="cbdaw-transport__btn" data-role="stop">Stop</button>
    <button type="button" class="cbdaw-transport__btn" data-role="record">Rec</button>
    <span class="cbdaw-transport__position" data-position>1.1.000</span>
    <label class="cbdaw-transport__toggle" data-role="metronome"><input type="checkbox" data-metronome>Metronome</label>
    <div class="cbdaw-transport__field"><label>Count-in</label><input type="number" min="0" step="1" data-countin><span>bars</span></div>
    <label class="cbdaw-transport__toggle" data-role="loop"><input type="checkbox" data-loop-on>Loop</label>
    <div class="cbdaw-transport__field">
      <input type="number" min="1" step="1" data-loop-start><span>–</span><input type="number" min="1" step="1" data-loop-end>
    </div>
    <label class="cbdaw-transport__toggle" data-role="punch"><input type="checkbox" data-punch-on>Punch</label>
    <div class="cbdaw-transport__field">
      <input type="number" min="1" step="1" data-punch-start><span>–</span><input type="number" min="1" step="1" data-punch-end>
    </div>
  `;
  el.appendChild(root);

  const playBtn = root.querySelector('[data-role="play"]');
  const stopBtn = root.querySelector('[data-role="stop"]');
  const recBtn = root.querySelector('[data-role="record"]');
  const positionEl = root.querySelector('[data-position]');
  const metronomeInput = root.querySelector('[data-metronome]');
  const countInInput = root.querySelector('[data-countin]');
  const loopToggle = root.querySelector('[data-role="loop"]');
  const loopOnInput = root.querySelector('[data-loop-on]');
  const loopStartInput = root.querySelector('[data-loop-start]');
  const loopEndInput = root.querySelector('[data-loop-end]');
  const punchToggle = root.querySelector('[data-role="punch"]');
  const punchOnInput = root.querySelector('[data-punch-on]');
  const punchStartInput = root.querySelector('[data-punch-start]');
  const punchEndInput = root.querySelector('[data-punch-end]');

  metronomeInput.checked = clockRef.metronome;
  countInInput.value = clockRef.countIn;
  loopOnInput.checked = clockRef.loop.on;
  loopStartInput.value = clockRef.loop.startBar;
  loopEndInput.value = clockRef.loop.endBar;
  loopToggle.dataset.on = String(clockRef.loop.on);
  punchOnInput.checked = store.project.punch.on;
  punchStartInput.value = store.project.punch.startBar;
  punchEndInput.value = store.project.punch.endBar;
  punchToggle.dataset.on = String(store.project.punch.on);

  listeners.add(playBtn, 'click', () => {
    unlock();
    clockRef.play();
  });
  listeners.add(stopBtn, 'click', () => clockRef.stop());
  listeners.add(recBtn, 'click', () => {
    unlock();
    clockRef.record();
  });

  listeners.add(metronomeInput, 'change', () => {
    clockRef.metronome = metronomeInput.checked;
  });
  listeners.add(countInInput, 'change', () => {
    clockRef.countIn = Number(countInInput.value) || 0;
  });

  function applyLoop() {
    clockRef.loop.on = loopOnInput.checked;
    clockRef.loop.startBar = Number(loopStartInput.value) || clockRef.loop.startBar;
    clockRef.loop.endBar = Number(loopEndInput.value) || clockRef.loop.endBar;
    loopToggle.dataset.on = String(clockRef.loop.on);
  }
  listeners.add(loopOnInput, 'change', applyLoop);
  listeners.add(loopStartInput, 'change', applyLoop);
  listeners.add(loopEndInput, 'change', applyLoop);

  function applyPunch() {
    store.setPunch({
      on: punchOnInput.checked,
      startBar: Number(punchStartInput.value) || store.project.punch.startBar,
      endBar: Number(punchEndInput.value) || store.project.punch.endBar,
    });
  }
  listeners.add(punchOnInput, 'change', applyPunch);
  listeners.add(punchStartInput, 'change', applyPunch);
  listeners.add(punchEndInput, 'change', applyPunch);

  const offProject = store.on('project', (project) => {
    punchToggle.dataset.on = String(project.punch.on);
  });

  function paintState(s) {
    playBtn.dataset.on = String(s === 'playing');
    recBtn.dataset.on = String(s === 'recording');
  }
  paintState(clockRef.state);
  function onStatechange(e) {
    paintState(e.state);
  }
  clockRef.on('statechange', onStatechange);

  let raf = 0;
  function tick() {
    raf = requestAnimationFrame(tick);
    const p = clockRef.position;
    positionEl.textContent = `${p.bar}.${p.beat}.${String(p.tick).padStart(3, '0')}`;
  }
  raf = requestAnimationFrame(tick);

  return {
    el: root,
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      clockRef.off('statechange', onStatechange);
      offProject();
      listeners.dropAll();
      root.remove();
    },
  };
}

/** Mounts `shell.js`'s surface switcher; selects its first option. */
export function mountPlayingSurface(el, { kind = 'pitch' } = {}) {
  acquireShellStyle();
  const switcher = createSurfaceSwitcher({ kind });
  el.appendChild(switcher.el);
  const first = switcher.el.querySelector('[data-surface-id]');
  if (first) switcher.select(first.dataset.surfaceId);
  return {
    el: switcher.el,
    switcher,
    dispose() {
      switcher.dispose();
      releaseShellStyle();
    },
  };
}

/** Wires every mountDawShell() mount point: header, transport, playing surface, mixer
 *  strips, routing graph, arrangement, automation lanes — and holds the track lifecycle:
 *  add, instrument assignment, remove. A track's channel, strip and graph node belong to
 *  the track and survive an instrument swap; only the instance is torn down and rebuilt. */
export function wireDawShell(handle) {
  const header = mountProjectHeader(handle.header, {
    strips: handle.strips,
    instrument: null,
  });
  const transport = mountTransportBar(handle.transport);
  const surface = mountPlayingSurface(handle.playingSurface);

  // master plus one strip per live track — boot is zero tracks, so master alone
  const mixer = createStrips(ctx, tracks.all.map((t) => ({ id: t.id, label: t.name || t.id })));
  for (const [id, el] of Object.entries(handle.strips)) {
    mixer.strips[id]?.mountCompact(el);
  }

  // routing graph. `mixer.strips` is one object for the rack's life: bound here, never again
  const graph = new Graph(ctx, {
    strips: mixer.strips,
    channels: tracks.all.map((t) => t.id),
  });
  graph.mountCompact(handle.nodeGraph);

  const automationRack = createAutomationRack();

  const arrangement = new Arrangement(handle.arrangement);
  arrangement.mount();

  /** track id -> live instrument instance. The store holds the same reference; this is what
   *  a swap and a removal read to dispose. */
  const instruments = new Map();

  /** One strip slot in the mixer rail, ahead of master. */
  function addStripSlot(id) {
    const el = document.createElement('div');
    el.className = 'cbdaw-daw-shell__strip';
    el.dataset.mount = MOUNTS.strip(id);
    el.dataset.channel = id;
    handle.mixer.insertBefore(el, handle.strips.master || null);
    handle.strips[id] = el;
    return el;
  }

  /** One gain lane in the automation pane, keyed in the rack by the same id. */
  function mountAutomation(id) {
    const strip = mixer.strips[id];
    if (!strip) return;
    automationRack.add(id, strip).lane('strip.gain').mountCompact(handle.automationLanes);
  }

  mountAutomation('master');
  for (const t of tracks.all) mountAutomation(t.id);

  /** Releases the track's instrument instance. The channel, strip and graph node stay. */
  function disposeInstrument(id) {
    const instance = instruments.get(id);
    if (!instance) return false;
    instruments.delete(id);
    arrangement.bindLaneInstrument(id, null);
    instance.dispose();
    return true;
  }

  /** The assignment flow: dispose old, construct new, write the type, write the instance. */
  function assignInstrument(id, type) {
    disposeInstrument(id);
    const Ctor = type ? INSTRUMENTS[type] : null;
    const strip = mixer.strips[id];
    let instance = null;
    if (Ctor && strip) {
      instance = new Ctor(ctx, strip.input);
      instruments.set(id, instance);
    }
    tracks.setInstrumentType(id, Ctor ? type : null);
    tracks.setInstrument(id, instance);
    arrangement.bindLaneInstrument(id, instance);
    return instance;
  }
  arrangement.onAssignInstrument = assignInstrument;

  // strip -> graph node -> automation. The track is born empty; no instrument is built here.
  function onTrackAdd(t) {
    const slot = addStripSlot(t.id);
    mixer.add({ id: t.id, label: t.name || t.id })?.mountCompact(slot);
    graph.addChannel(t.id);
    mountAutomation(t.id);
  }

  // the add flow backwards: regions, instrument, graph node, automation lanes, strip, slot
  function onTrackRemove(t) {
    regions.clear(t.id);
    disposeInstrument(t.id);
    graph.removeChannel(t.id);
    automationRack.remove(t.id);
    mixer.remove(t.id);
    handle.strips[t.id]?.remove();
    delete handle.strips[t.id];
  }

  // rename only — one field, read by the strip head and the graph node
  function onTrackUpdate(t) {
    const label = t.name || t.id;
    const strip = mixer.strips[t.id];
    if (!strip || strip.label === label) return;
    mixer.rename(t.id, label);
    graph.refresh();
  }

  const offAdd = tracks.on('add', onTrackAdd);
  const offRemove = tracks.on('remove', onTrackRemove);
  const offUpdate = tracks.on('update', onTrackUpdate);

  return {
    header,
    transport,
    surface,
    mixer,
    graph,
    arrangement,
    automationRack,
    instruments,
    addTrack: () => tracks.add(),
    assignInstrument,
    removeTrack: (id) => tracks.remove(id),
    dispose() {
      offAdd();
      offRemove();
      offUpdate();
      arrangement.onAssignInstrument = null;
      for (const id of [...instruments.keys()]) disposeInstrument(id);
      automationRack.dispose();
      arrangement.dispose();
      graph.dispose();
      mixer.dispose();
      surface.dispose();
      transport.dispose();
      header.dispose();
    },
  };
}

export default mountDawShell;

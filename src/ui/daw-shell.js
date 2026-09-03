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
import { createRollScheduler } from '../core/roll-scheduler.js';
import { createTrackBus } from '../core/track-bus.js';
import { input } from '../core/input.js';
import Arrangement, { INSTRUMENT_OPTIONS } from './arrangement.js';
import { createStrips } from '../mixer/strip.js';
import Graph from '../mixer/graph.js';
import { createAutomationRack } from '../mixer/automation.js';
import WaveSynth from '../instruments/wave-synth.js';
import OvertoneSynth from '../instruments/overtone-synth.js';
import ChordModule from '../instruments/chord-module.js';
import PatchSynth from '../instruments/patch-synth.js';
import DrumSynth from '../instruments/drum-synth.js';
import DrumSampler from '../instruments/drum-sampler.js';
import { spellingOf } from '../theory/scale.js';
import { PLACEHOLDER_LETTERS } from '../surfaces/keyboard.js';
import {
  createCpuMeter,
  createSurfaceSwitcher,
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

.cbdaw-daw-shell__header {
  flex: var(--flex-0-0-auto);
  min-height: var(--sp-18);
  background: var(--transport-ground);
  border-bottom: var(--bw) solid var(--line);
  box-sizing: var(--box-border-box);
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
  flex: var(--flex-0-1-auto);
  min-width: var(--sp-0);
  display: var(--disp-flex);
  align-items: var(--align-stretch);
  gap: var(--sp-1);
  padding: var(--sp-1);
  background: var(--recess);
  border-left: var(--bw) solid var(--line);
  box-sizing: var(--box-border-box);
}

.cbdaw-daw-shell__strips-scroll {
  flex: var(--flex-1-1-0);
  min-width: var(--sp-0);
  display: var(--disp-flex);
  align-items: var(--align-stretch);
  gap: var(--sp-1);
  overflow-x: var(--auto);
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

/* project header — one horizontal bar: transport, key, meter, ranges, CPU */
.cbdaw-dawhead {
  display: var(--disp-flex);
  align-items: var(--align-center);
  flex-wrap: var(--flexwrap-nowrap);
  gap: var(--sp-4);
  height: var(--pct-100);
  padding: var(--sp-2) var(--sp-4);
  box-sizing: var(--box-border-box);
  font-size: var(--fs-sm);
  color: var(--text-dim);
  overflow-x: var(--auto);
  overflow-y: var(--ov-hidden);
}

.cbdaw-dawhead__btn {
  flex: var(--flex-0-0-auto);
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

.cbdaw-dawhead__btn[data-on="true"] { background: var(--btn-active); color: var(--recess); }
.cbdaw-dawhead__btn[data-role="play"][data-on="true"] { background: var(--play-on); }
.cbdaw-dawhead__btn[data-role="record"][data-on="true"] { background: var(--rec-on); }

.cbdaw-dawhead__position {
  flex: var(--flex-0-0-auto);
  font-family: var(--font-mono);
  font-variant-numeric: var(--num-tabular);
  color: var(--text);
}

.cbdaw-dawhead__field {
  flex: var(--flex-0-0-auto);
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-1);
}

.cbdaw-dawhead__field input[type="number"] {
  width: var(--sp-16);
  font: var(--font-inherit);
  color: var(--text);
  background: var(--btn-face);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-ctl);
  padding: var(--sp-1) var(--sp-1);
}

.cbdaw-dawhead__field select {
  font: var(--font-inherit);
  color: var(--text);
  background: var(--btn-face);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-ctl);
  padding: var(--sp-1) var(--sp-1);
}

.cbdaw-dawhead__toggle {
  flex: var(--flex-0-0-auto);
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-1);
  cursor: var(--cur-pointer);
  user-select: var(--usel-none);
}

.cbdaw-dawhead__toggle[data-role="loop"][data-on="true"] { color: var(--loop-region); }
.cbdaw-dawhead__toggle[data-role="punch"][data-on="true"] { color: var(--punch-region); }

.cbdaw-dawhead__sep {
  flex: var(--flex-0-0-auto);
  width: var(--bw);
  height: var(--sp-8);
  background: var(--line);
}

.cbdaw-dawhead__spacer {
  flex: var(--flex-1-1-auto);
  min-width: var(--sp-0);
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
    <div class="cbdaw-daw-shell__playing-surface" data-mount="${MOUNTS.playingSurface}"></div>
    <div class="cbdaw-daw-shell__body">
      <div class="cbdaw-daw-shell__workspace">
        <div class="cbdaw-daw-shell__pane cbdaw-daw-shell__arrangement" data-mount="${MOUNTS.arrangement}"></div>
        <div class="cbdaw-daw-shell__pane cbdaw-daw-shell__graph" data-mount="${MOUNTS.nodeGraph}"></div>
        <div class="cbdaw-daw-shell__pane cbdaw-daw-shell__automation" data-mount="${MOUNTS.automationLanes}"></div>
      </div>
      <div class="cbdaw-daw-shell__mixer" data-mount="mixer">
        <div class="cbdaw-daw-shell__strips-scroll" data-mount="strips-scroll">
          ${tracks.all.map((t) => stripMarkup(t.id, false)).join('')}
        </div>
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
    playingSurface: root.querySelector(`[data-mount="${MOUNTS.playingSurface}"]`),
    arrangement: root.querySelector(`[data-mount="${MOUNTS.arrangement}"]`),
    nodeGraph: root.querySelector(`[data-mount="${MOUNTS.nodeGraph}"]`),
    automationLanes: root.querySelector(`[data-mount="${MOUNTS.automationLanes}"]`),
    devicePopout: root.querySelector(`[data-mount="${MOUNTS.devicePopout}"]`),
    /** the strip rail itself — master lives here, pinned outside the scroll area */
    mixer: root.querySelector('[data-mount="mixer"]'),
    /** the scrollable strip row — non-master strip slots are inserted into it */
    stripsScroll: root.querySelector('[data-mount="strips-scroll"]'),
    strips,
    /** Removes the frame from the DOM and releases the stylesheet ref. */
    unmount() {
      root.remove();
      releaseStyle();
    },
  };
}

// Fills mountDawShell()'s mount points: header, playing surface, one instrument.

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

/** Key picker: one tonic select plus a mode readout. Writes `store.setScaleTonic`; redraws
 *  on `store.on('scale')`. Degrees are not shown here — the circle and diatonic keys own them. */
function buildKeyControl(store) {
  const listeners = listenerBag();

  const root = document.createElement('div');
  root.className = 'cbdaw-dawhead__field';
  root.innerHTML =
    '<label>Key</label><select data-tonic></select><span data-scale-name></span>';

  const select = root.querySelector('[data-tonic]');
  const nameEl = root.querySelector('[data-scale-name]');
  for (let pc = 0; pc < PLACEHOLDER_LETTERS.length; pc++) {
    const opt = document.createElement('option');
    opt.value = String(pc);
    opt.textContent = PLACEHOLDER_LETTERS[pc];
    select.appendChild(opt);
  }

  function render() {
    const scale = store.scale;
    select.value = String(scale.tonic);
    // the selected option carries theory/scale.js's spelling; the rest keep the fallback
    for (let pc = 0; pc < select.options.length; pc++) {
      select.options[pc].textContent = PLACEHOLDER_LETTERS[pc];
    }
    const spelled = spellingOf(scale, 0).text;
    if (spelled) select.options[scale.tonic].textContent = spelled;
    nameEl.textContent = scale.name;
  }

  listeners.add(select, 'change', () => {
    store.setScaleTonic(Number(select.value));
  });

  const offStore = store.on('scale', render);
  render();

  return {
    el: root,
    dispose() {
      offStore();
      listeners.dropAll();
      root.remove();
    },
  };
}

/** The one project-header bar: transport, position, key, BPM, time signature, song length,
 *  metronome, count-in, loop range, punch range, CPU meter. No second row, no sub-panels. */
export function mountProjectHeader(el, { store = state, clockRef = clock, instrument = null } = {}) {
  acquireShellStyle();
  const listeners = listenerBag();

  const root = document.createElement('div');
  root.className = 'cbdaw-dawhead';
  root.innerHTML = `
    <button type="button" class="cbdaw-dawhead__btn" data-role="play">Play</button>
    <button type="button" class="cbdaw-dawhead__btn" data-role="stop">Stop</button>
    <button type="button" class="cbdaw-dawhead__btn" data-role="record">Rec</button>
    <span class="cbdaw-dawhead__position" data-position>1.1.000</span>
    <span class="cbdaw-dawhead__sep"></span>
    <span data-key-slot></span>
    <div class="cbdaw-dawhead__field"><label>BPM</label><input type="number" min="1" step="1" data-bpm></div>
    <div class="cbdaw-dawhead__field">
      <label>Time</label><input type="number" min="1" step="1" data-ts-top><span>/</span><input type="number" min="1" step="1" data-ts-bottom>
    </div>
    <div class="cbdaw-dawhead__field"><label>Bars</label><input type="number" min="1" step="1" data-song-length></div>
    <span class="cbdaw-dawhead__sep"></span>
    <label class="cbdaw-dawhead__toggle" data-role="metronome"><input type="checkbox" data-metronome>Click</label>
    <div class="cbdaw-dawhead__field"><label>Count-in</label><input type="number" min="0" step="1" data-countin></div>
    <span class="cbdaw-dawhead__sep"></span>
    <label class="cbdaw-dawhead__toggle" data-role="loop"><input type="checkbox" data-loop-on>Loop</label>
    <div class="cbdaw-dawhead__field">
      <input type="number" min="1" step="1" data-loop-start><span>–</span><input type="number" min="1" step="1" data-loop-end>
    </div>
    <label class="cbdaw-dawhead__toggle" data-role="punch"><input type="checkbox" data-punch-on>Punch</label>
    <div class="cbdaw-dawhead__field">
      <input type="number" min="1" step="1" data-punch-start><span>–</span><input type="number" min="1" step="1" data-punch-end>
    </div>
    <div class="cbdaw-dawhead__spacer"></div>
  `;
  el.appendChild(root);

  const keyControl = buildKeyControl(store);
  root.querySelector('[data-key-slot]').replaceWith(keyControl.el);

  const bpmInput = root.querySelector('[data-bpm]');
  bpmInput.value = clockRef.bpm;
  listeners.add(bpmInput, 'change', () => {
    clockRef.bpm = Number(bpmInput.value) || clockRef.bpm;
  });

  const tsTop = root.querySelector('[data-ts-top]');
  const tsBottom = root.querySelector('[data-ts-bottom]');
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

  const lenInput = root.querySelector('[data-song-length]');
  lenInput.value = clockRef.songLengthBars;
  listeners.add(lenInput, 'change', () => {
    clockRef.songLengthBars = Number(lenInput.value) || clockRef.songLengthBars;
  });

  const cpu = createCpuMeter({ instrument });
  root.appendChild(cpu.el);

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
      cpu.dispose();
      keyControl.dispose();
      root.remove();
      releaseShellStyle();
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

/** Wires every mountDawShell() mount point: header, playing surface, mixer strips, routing
 *  graph, arrangement, automation lanes — and holds the track lifecycle: add, instrument
 *  assignment, remove. A track's channel, strip and graph node belong to the track and
 *  survive an instrument swap; only the instance is torn down and rebuilt. */
export function wireDawShell(handle, opts = {}) {
  const header = mountProjectHeader(handle.header, { instrument: null });
  const surface = mountPlayingSurface(handle.playingSurface);

  // the strip head's instrument picker — the same list and hook the lane head uses
  const stripPicker = {
    instrumentOptions: INSTRUMENT_OPTIONS,
    onAssignInstrument: (id, type) => assignInstrument(id, type),
  };

  // master plus one strip per live track — boot is zero tracks, so master alone
  const mixer = createStrips(ctx, tracks.all.map((t) => ({
    id: t.id,
    label: t.name || t.id,
    instrumentType: t.instrumentType || null,
    ...stripPicker,
  })));
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

  // opts.laneSurfaces false: lanes carry no surface slot and no surface picker
  const arrangement = new Arrangement(handle.arrangement, undefined, undefined, undefined, {
    laneSurfaces: opts.laneSurfaces,
  });
  arrangement.mount();

  // the one scheduler for melodic region playback — reads regions + tracks off the clock's
  // own tick pass, schedules nothing of its own
  const rollScheduler = createRollScheduler();

  /** track id -> live instrument instance. The store holds the same reference; this is what
   *  a swap and a removal read to dispose. */
  const instruments = new Map();

  /** track id -> that track's note bus. One per track, born with the track, bound to the
   *  instrument on assignment, disposed on removal. Surfaces mount against these. */
  const buses = new Map();

  /** The track's bus, creating it if this track has none yet. */
  function busFor(id) {
    let bus = buses.get(id);
    if (!bus) {
      bus = createTrackBus({
        id,
        instrument: instruments.get(id) || null,
        armed: Boolean(tracks.get(id)?.armed),
      });
      buses.set(id, bus);
    }
    return bus;
  }

  /** Drops the track's bus. Releases held notes and every subscriber. */
  function disposeBus(id) {
    const bus = buses.get(id);
    if (!bus) return false;
    buses.delete(id);
    bus.dispose();
    return true;
  }

  // MIDI fan-out. The hardware reaches the `input` singleton and only the singleton; these
  // two listeners are the whole bridge to the tracks. Every bus is offered the note and
  // each one's own arm gate decides — armed tracks layer, unarmed tracks drop it.
  const offMidiOn = input.on('noteon', (e) => {
    if (e?.source !== 'midi') return;
    for (const bus of buses.values()) {
      bus.emitNoteOn({ note: e.note, velocity: e.velocity, source: 'midi' });
    }
  });
  const offMidiOff = input.on('noteoff', (e) => {
    if (e?.source !== 'midi') return;
    for (const bus of buses.values()) bus.emitNoteOff({ note: e.note, source: 'midi' });
  });

  /** One strip slot in the scrollable strip row. Master lives outside it. */
  function addStripSlot(id) {
    const el = document.createElement('div');
    el.className = 'cbdaw-daw-shell__strip';
    el.dataset.mount = MOUNTS.strip(id);
    el.dataset.channel = id;
    handle.stripsScroll.appendChild(el);
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
  for (const t of tracks.all) {
    mountAutomation(t.id);
    arrangement.bindLaneBus(t.id, busFor(t.id));
  }

  /** Releases the track's instrument instance. The bus, channel, strip and graph node stay;
   *  the bus is unbound first so anything held releases through a live instrument. */
  function disposeInstrument(id) {
    const instance = instruments.get(id);
    if (!instance) return false;
    buses.get(id)?.bindInstrument(null);
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
    if (strip) strip.instrumentType = Ctor ? type : null;
    tracks.setInstrumentType(id, Ctor ? type : null);
    tracks.setInstrument(id, instance);
    arrangement.bindLaneInstrument(id, instance);
    busFor(id).bindInstrument(instance);
    return instance;
  }
  arrangement.onAssignInstrument = assignInstrument;

  // strip -> graph node -> automation -> note bus -> lane. The track is born empty; no
  // instrument is built here, so the bus is born unbound and silent. The lane is already
  // built by the time this runs — the arrangement subscribes to the track store first.
  function onTrackAdd(t) {
    const slot = addStripSlot(t.id);
    mixer.add({ id: t.id, label: t.name || t.id, ...stripPicker })?.mountCompact(slot);
    graph.addChannel(t.id);
    mountAutomation(t.id);
    arrangement.bindLaneBus(t.id, busFor(t.id));
  }

  // the add flow backwards: regions, bus, instrument, graph node, automation lanes, strip, slot
  function onTrackRemove(t) {
    regions.clear(t.id);
    disposeBus(t.id);
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
    surface,
    mixer,
    graph,
    arrangement,
    automationRack,
    instruments,
    buses,
    /** The track's note bus — what a surface is handed instead of the input singleton. */
    trackBus: (id) => buses.get(id) || null,
    addTrack: () => tracks.add(),
    assignInstrument,
    removeTrack: (id) => tracks.remove(id),
    dispose() {
      offAdd();
      offRemove();
      offUpdate();
      offMidiOn();
      offMidiOff();
      rollScheduler.dispose();
      arrangement.onAssignInstrument = null;
      // arrangement first: its lane surfaces release held notes through live buses and
      // live instruments, so nothing is stranded sounding
      arrangement.dispose();
      for (const id of [...buses.keys()]) disposeBus(id);
      for (const id of [...instruments.keys()]) disposeInstrument(id);
      automationRack.dispose();
      graph.dispose();
      mixer.dispose();
      surface.dispose();
      header.dispose();
    },
  };
}

export default mountDawShell;

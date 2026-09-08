

// =========================================================================================
// IMPORTS — every one read-only except this seat's own two files
// =========================================================================================

import {
  toolsForLayout,
  createFileMenu,
  createCpuMeter,
  acquireShellStyle,
  releaseShellStyle,
} from '../../src/ui/shell.js';

import { ctx, unlock, createChannel, releaseChannel } from '../../src/core/audio.js';
import { input } from '../../src/core/input.js';
import { state } from '../../src/core/state.js';

import {
  PRESETS,
  createScale,
  setScaleTonic,
  setScalePreset,
  spellingOf,
} from '../../src/theory/scale.js';

import ScaleCircle from '../../src/surfaces/scale-circle.js';
import CompBuilder from '../../src/surfaces/comp-builder.js';

import SimpleSynth from '../../src/instruments/simple-synth.js';
import OvertoneSynth from '../../src/instruments/overtone-synth.js';

/** Which medium this page file is for. Its twin in ../mobile/ differs only here. */
const LAYOUT = 'desktop';

// =========================================================================================
// 1 · SMALL HELPERS — layout only. No music, no labels of this page's own invention.
// =========================================================================================

function panel(title, note) {
  const el = document.createElement('section');
  el.className = 'cbdaw-panel';
  const head = document.createElement('div');
  head.className = 'cbdaw-panel__head';
  head.innerHTML =
    `<h2 class="cbdaw-panel__title"></h2><span class="cbdaw-panel__note"></span>`;
  head.querySelector('.cbdaw-panel__title').textContent = title;
  head.querySelector('.cbdaw-panel__note').textContent = note ?? '';
  el.appendChild(head);
  const body = document.createElement('div');
  el.appendChild(body);
  el.body = body;
  return el;
}

/** Every DOM listener this page attaches, so teardown can drop all of them and say how
 *  many. Same bag pattern `ui/shell.js` uses; copied rather than imported because
 *  `listenerBag` is module-private there and this page does not edit that file. */
function listenerBag() {
  const held = [];
  return {
    add(el, type, fn, opts) {
      if (!el) return;
      el.addEventListener(type, fn, opts);
      held.push({ el, type, fn, opts });
    },
    dropAll() {
      for (const l of held) l.el.removeEventListener(l.type, l.fn, l.opts);
      const n = held.length;
      held.length = 0;
      return n;
    },
  };
}

// =========================================================================================
// 2 · SEAT QUESTION 5 — THE PAGE OWNS ITS SCALE, AND THIS IS THE SEAM P4 HOISTS
// =========================================================================================
// BUILDPLAN / CONTRACTS §4, frozen: "in the DAW, the project header owns `state.scale` and
// every instrument inherits it. In a standalone tool, that tool owns its own `state.scale`."
// The tool is the lesson, so the scale control lives on this page and not inside any module.
//
// THE SEAM, STATED SO P4 CAN CUT ALONG IT:
//   · Nothing below computes music. It calls §4's four mutations on the store and redraws
//     from what the store publishes. Twelve key buttons are `setScaleTonic`; nine preset
//     buttons are `setScalePreset`; the `+/-` per degree lives on the SURFACES, where §4
//     puts it, and this control does not duplicate it.
//   · Every key's name and the scale's name come from `theory/scale.js`. This page picks no
//     spelling and names no scale (§6, §10-H). `PRESETS` is enumerated with Object.keys, so
//     adding a preset there grows this control with no edit here (A8).
//   · P4 hoists by DELETING THIS FUNCTION and its panel, creating the project header's own
//     store, and calling `comp.bindState(projectStore)` and
//     `new ScaleCircle(el, input, projectStore)`. Nothing else on this page changes,
//     because nothing else on this page knows where the scale came from.

/** The scale rows this panel offers. The two minors are left out; what remains is the seven
 *  modes, in `PRESETS` order. */
const MODE_NAMES = Object.keys(PRESETS).filter(
  (name) => name !== 'Harmonic Minor' && name !== 'Melodic Minor'
);

function createScaleControl(store, listeners) {
  const el = panel(
    'Scale builder',
    'current scale parameters, minus the melodic and harmonic minors'
  );

  // The tonal centers and the scales share one centered row across the full panel. Nothing
  // else sits at this latitude, so the halves below start under it.
  const topRow = document.createElement('div');
  topRow.style.display = 'var(--disp-flex)';
  topRow.style.flexWrap = 'var(--flexwrap-wrap)';
  topRow.style.justifyContent = 'var(--justify-center)';
  topRow.style.alignItems = 'var(--align-center)';
  topRow.style.gap = 'var(--sp-4)';
  topRow.style.margin = '0 0 var(--sp-7)';
  el.body.appendChild(topRow);

  // Below it, two halves. The degree rows sit on the left; the wheel they drive mounts into
  // `circleHost` on the right and is the same scale, not a second one.
  const split = document.createElement('div');
  split.className = 'hm-split';
  split.style.display = 'var(--disp-flex)';
  split.style.flexWrap = 'var(--flexwrap-wrap)';
  split.style.gap = 'var(--sp-6)';
  split.style.alignItems = 'var(--align-center)';
  el.body.appendChild(split);

  const left = document.createElement('div');
  left.style.flex = 'var(--flex-1-1-320)';
  split.appendChild(left);

  const circleHost = document.createElement('div');
  circleHost.style.flex = 'var(--flex-1-1-300)';
  split.appendChild(circleHost);

  const keysRow = document.createElement('div');
  keysRow.className = 'hm-keys';
  keysRow.style.justifyContent = 'var(--justify-center)';
  topRow.appendChild(keysRow);

  // The twelve tonal centers. Each face is `theory/scale.js`'s spelling of that pitch class,
  // so nothing here spells anything of its own.
  for (let pc = 0; pc < 12; pc++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hm-key';
    b.dataset.tonic = String(pc);
    b.textContent = spellingOf(createScale(pc, 'Major'), 0).text ?? '';
    keysRow.appendChild(b);
    listeners.add(b, 'click', () => store.setScaleTonic(pc));
  }

  const presetRow = document.createElement('div');
  presetRow.className = 'hm-keys';
  presetRow.style.justifyContent = 'var(--justify-center)';
  topRow.appendChild(presetRow);

  for (const name of MODE_NAMES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hm-key';
    b.dataset.preset = name;
    b.style.minWidth = 'var(--sp-0)';
    b.textContent = name;
    presetRow.appendChild(b);
    listeners.add(b, 'click', () => store.setScalePreset(name));
  }

  // One row per degree, 7 at the top down to 1. Degree 1 is the tonal center and carries no
  // +/- of its own — the twelve buttons above move it.
  const degreeRows = document.createElement('div');
  left.appendChild(degreeRows);

  for (let i = 6; i >= 0; i--) {
    const row = document.createElement('div');
    row.style.display = 'var(--disp-flex)';
    row.style.alignItems = 'var(--align-center)';
    row.style.gap = 'var(--sp-5)';
    row.style.padding = 'var(--sp-1) 0';

    const num = document.createElement('span');
    num.style.minWidth = 'var(--sp-9)';
    num.style.opacity = 'var(--op-strong)';
    num.textContent = String(i + 1);
    row.appendChild(num);

    const note = document.createElement('b');
    note.dataset.degreeNote = String(i);
    note.style.minWidth = 'var(--sp-17)';
    row.appendChild(note);

    if (i > 0) {
      for (const [glyph, delta] of [['+', 1], ['−', -1]]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'hm-key';
        b.style.minWidth = 'var(--sp-0)';
        b.textContent = glyph;
        row.appendChild(b);
        listeners.add(b, 'click', () => store.setScaleDegree(i, delta));
      }
    }

    degreeRows.appendChild(row);
  }

  const readout = document.createElement('p');
  readout.className = 'hm-scalename';
  readout.style.margin = 'var(--sp-5) 0 0';
  left.appendChild(readout);

  function render() {
    const s = store.scale;
    for (const b of keysRow.querySelectorAll('[data-tonic]')) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.tonic) === s.tonic));
    }
    for (const b of presetRow.querySelectorAll('[data-preset]')) {
      b.setAttribute('aria-pressed', String(b.dataset.preset === s.preset));
    }
    for (const n of degreeRows.querySelectorAll('[data-degree-note]')) {
      n.textContent = spellingOf(s, Number(n.dataset.degreeNote)).text ?? '';
    }
    // `name` is `scaleName()`'s back-match and `preset` is provenance. Reading 'Dorian' and
    // 'Custom' at once is correct, so both are shown.
    readout.innerHTML = '';
    const center = document.createElement('b');
    center.textContent = spellingOf(s, 0).text ?? '';
    readout.appendChild(center);
    readout.appendChild(
      document.createTextNode(
        ` · ${s.name}${s.preset === 'Custom' ? ' · you have moved a degree' : ''}`
      )
    );
  }

  const off = store.on('scale', render);
  render();
  return { el, circleHost, render, dispose: off };
}

/** A scale store of its own — the same `scale` / `on` / `setScaleTonic` / `setScalePreset`
 *  shape the page store has, holding one scale. It subscribes to nothing, so it never
 *  follows the project. The comp builder holds this one until the toggle says otherwise. */
function createOwnScaleStore(tonic = 0, presetName = 'Major') {
  let scale = createScale(tonic, presetName);
  const subs = new Set();

  function publish() {
    for (const fn of subs) fn(scale);
  }

  return {
    get scale() { return scale; },
    on(_evt, fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    setScaleTonic(pc) {
      scale = setScaleTonic(scale, pc);
      publish();
    },
    setScalePreset(name) {
      scale = setScalePreset(scale, name);
      publish();
    },
  };
}

// =========================================================================================
// 3 · BUILD THE PAGE
// =========================================================================================

function mount(host) {
  const listeners = listenerBag();
  acquireShellStyle();

  const root = document.createElement('div');
  root.className = 'cbdaw-shell';
  root.dataset.tool = 'harmony';
  // Stamps the same layout flag `ui/shell.js` stamps.
  root.dataset.layout = LAYOUT;

  // ——— 1 · audio channels and the instruments ————————————————————————————————————
  // §2: an instrument is handed `(ctx, out)`, never makes its own context (§10) and never
  // connects to `ctx.destination`. `createChannel()` is what produces `out` until P4's
  // mixer/strip.js exists.
  // The ids opt both channels into synth voice normalization (core/audio.js section 4a).
  const waveChannel = createChannel(SimpleSynth.id);
  const overtoneChannel = createChannel(OvertoneSynth.id);

  const wave = new SimpleSynth(ctx, waveChannel);
  const overtone = new OvertoneSynth(ctx, overtoneChannel);

  // The engines this page loaded, in menu order. The first is selected at mount.
  const engines = [
    { id: SimpleSynth.id, label: SimpleSynth.label, instrument: wave },
    { id: OvertoneSynth.id, label: OvertoneSynth.label, instrument: overtone },
  ];
  let engineId = engines[0].id;
  const engineOf = (id) => engines.find((e) => e.id === id) ?? engines[0];

  // ——— 2 · top bar ————————————————————————————————————————————————————————————————
  const top = document.createElement('header');
  top.className = 'cbdaw-shell__top';

  // `createFileMenu` gets TOOLS rows resolved into this page's layout folder.
  const items = toolsForLayout(LAYOUT);
  const menu = createFileMenu({
    items,
    currentId: 'harmony',
    label: 'Tool',
    onSelect: (item) => {
      if (item.href) window.location.href = item.href;
    },
  });
  top.appendChild(menu.el);

  const titles = document.createElement('div');
  titles.className = 'cbdaw-shell__titles';
  titles.innerHTML = `<h1 class="cbdaw-shell__title"></h1><p class="cbdaw-shell__subtitle"></p>`;
  titles.querySelector('.cbdaw-shell__title').textContent = 'Harmony';
  titles.querySelector('.cbdaw-shell__subtitle').textContent =
    'One scale, the chords it builds, and one engine to hear them through. ' +
    'Move a tone and the chord tells you its own name.';
  top.appendChild(titles);

  const spacer = document.createElement('div');
  spacer.className = 'cbdaw-shell__spacer';
  top.appendChild(spacer);

  // `createCpuMeter` captures its instrument and reads only `cpuWeight`, so the selected
  // engine is handed to it as a live getter rather than by re-pointing a field.
  const cpu = createCpuMeter({
    instrument: { get cpuWeight() { return engineOf(engineId).instrument.cpuWeight; } },
  });
  top.appendChild(cpu.el);
  root.appendChild(top);

  // Everything below the top bar goes in here. `.cbdaw-shell__columns` is the only child
  // `ui/shell.js` gives `overflow-y: var(--auto)`, so this is what makes the page scroll with the
  // header pinned. Its 2-column grid is overridden to a stack in this page's <style>.
  const columns = document.createElement('div');
  columns.className = 'cbdaw-shell__columns';
  root.appendChild(columns);

  // ——— 3 · the scale control (seat question 5) ————————————————————————————————————
  const scaleControl = createScaleControl(state, listeners);

  // ——— 4 · SEAT QUESTION 4 — ALL THREE SURFACES, AT ONCE, ALL LIVE ————————————————
  // Two full-width panels stacked. The wheel lives inside the scale builder; the comp
  // builder is its own lesson below it.
  const surfaces = document.createElement('div');
  surfaces.className = 'hm-surfaces';

  scaleControl.el.style.gridColumn = 'span 3';

  const compPanel = panel(
    CompBuilder.label,
    'build the chords · hear them in root position · re-voice them by hand'
  );
  compPanel.style.gridColumn = 'span 3';

  surfaces.append(scaleControl.el, compPanel);
  columns.appendChild(surfaces);

  // ——— 5 · the engine ————————————————————————————————————————————————————————————
  // One dropdown, one mounted UI, both living in the comp builder. The dropdown picks which
  // instrument the chords play through; the expand button decides whether its controls are
  // on screen. Filled and placed further down, where the comp builder is built.
  const engineSelect = document.createElement('select');
  engineSelect.className = 'hm-key';

  const engineGrid = document.createElement('div');
  engineGrid.className = 'hm-targets';
  engineGrid.hidden = true;

  host.appendChild(root);

  // ——— 6 · mount everything, now that the DOM is in the document ————————————————
  // Both surfaces read the §4 store, so there is one scale on the page.
  //   · `ScaleCircle` takes the store as its third constructor argument (§12.1).
  //   · `CompBuilder` takes it as its only one.
  const circle = new ScaleCircle(null, input, state);
  // The surface offers two modes, letter and solfege, and opens on letter. Reading outward:
  // letter on the ring that plays the NOTE, numeral on the ring that plays the CHORD,
  // degree number outside the wheel on neither.
  circle.overlay = 'letter';
  circle.mountExpanded(scaleControl.circleHost);

  // The surface makes no audio of its own. `bindPlayer` takes §2's `noteOn`/`noteOff` shape
  // and nothing more, so `selectEngine` can re-point it and P4 can hand it a mixer strip.
  // ——— the Comp Builder's own tonal center ————————————————————————————————————————
  // The builder reads whichever store this row hands it. Unchecked — the default — that is
  // `ownStore`, driven by the two dropdowns below and subscribed to nothing. Checked, it is
  // `state`, the page store the circle and the scale builder drive. `bindState` swaps the
  // subscription; the surface is not remounted either way.
  const ownStore = createOwnScaleStore(0, 'Major');

  const ownRow = document.createElement('div');
  ownRow.className = 'hm-keys';
  ownRow.style.marginBottom = 'var(--sp-5)';
  ownRow.style.alignItems = 'var(--align-center)';

  const followLabel = document.createElement('label');
  followLabel.className = 'hm-key';
  followLabel.style.minWidth = 'var(--sp-0)';
  followLabel.style.cursor = 'var(--cur-pointer)';
  const followBox = document.createElement('input');
  followBox.type = 'checkbox';
  followBox.checked = false;
  followBox.style.marginRight = 'var(--sp-3)';
  followLabel.appendChild(followBox);
  followLabel.appendChild(document.createTextNode('Project tonal center'));
  ownRow.appendChild(followLabel);

  // The tonal center the builder's own chord math counts from. Faces come from
  // `theory/scale.js`'s spelling, same as the scale builder's twelve.
  const centerSelect = document.createElement('select');
  centerSelect.className = 'hm-key';
  for (let pc = 0; pc < 12; pc++) {
    const o = document.createElement('option');
    o.value = String(pc);
    o.textContent = spellingOf(createScale(pc, 'Major'), 0).text ?? '';
    centerSelect.appendChild(o);
  }
  ownRow.appendChild(centerSelect);

  const scaleSelect = document.createElement('select');
  scaleSelect.className = 'hm-key';
  for (const name of MODE_NAMES) {
    const o = document.createElement('option');
    o.value = name;
    o.textContent = name;
    scaleSelect.appendChild(o);
  }
  ownRow.appendChild(scaleSelect);

  // The engine dropdown and its expand button share this row. The instrument's own controls
  // sit in `engineGrid` below the builder and start collapsed.
  ownRow.appendChild(engineSelect);

  const expandBtn = document.createElement('button');
  expandBtn.type = 'button';
  expandBtn.className = 'hm-key';
  expandBtn.style.minWidth = 'var(--sp-0)';
  ownRow.appendChild(expandBtn);

  compPanel.body.append(ownRow);

  const comp = new CompBuilder(ownStore);
  comp.mountExpanded(compPanel.body);
  compPanel.body.appendChild(engineGrid);

  /** Shows or hides the selected instrument's controls. */
  function renderExpand() {
    expandBtn.textContent = engineGrid.hidden ? 'Show controls' : 'Hide controls';
    expandBtn.setAttribute('aria-expanded', String(!engineGrid.hidden));
  }
  listeners.add(expandBtn, 'click', () => {
    engineGrid.hidden = !engineGrid.hidden;
    renderExpand();
  });
  renderExpand();

  listeners.add(centerSelect, 'change', () => ownStore.setScaleTonic(Number(centerSelect.value)));
  listeners.add(scaleSelect, 'change', () => ownStore.setScalePreset(scaleSelect.value));

  /** Points the builder at one store and redraws this row. The dropdowns are disabled while
   *  the project store is the one being read, since nothing here drives it. */
  function renderOwn() {
    const following = followBox.checked;
    comp.bindState(following ? state : ownStore);
    centerSelect.disabled = following;
    scaleSelect.disabled = following;
    centerSelect.value = String(ownStore.scale.tonic);
    scaleSelect.value = ownStore.scale.preset;
  }
  listeners.add(followBox, 'change', renderOwn);
  ownStore.on('scale', renderOwn);
  renderOwn();

  // One tab and one mounted UI per engine. Both are built once; only visibility changes, so
  // switching does not unmount an instrument or drop what it is holding.
  const engineBoxes = new Map();
  for (const row of engines) {
    const opt = document.createElement('option');
    opt.value = row.id;
    opt.textContent = row.label;
    engineSelect.appendChild(opt);

    const box = document.createElement('div');
    box.className = 'hm-target';
    box.dataset.instrumentId = row.id;
    const name = document.createElement('strong');
    name.textContent = row.label;
    name.style.fontSize = 'var(--fs-base)';
    box.appendChild(name);
    const tag = document.createElement('span');
    tag.className = 'hm-target__tag';
    box.appendChild(tag);
    const mountHost = document.createElement('div');
    box.appendChild(mountHost);
    engineGrid.appendChild(box);
    row.instrument.mountExpanded
      ? row.instrument.mountExpanded(mountHost)
      : row.instrument.mountCompact(mountHost);
    engineBoxes.set(row.id, box);
  }

  /** Points the Comp Builder, the bus and the CPU meter at one engine and shows its UI.
   *  Notes held by the outgoing engine are released by `bindPlayer`. */
  function selectEngine(id) {
    const row = engineOf(id);
    engineId = row.id;
    comp.bindPlayer(row.instrument);
    for (const [rowId, box] of engineBoxes) {
      const active = rowId === engineId;
      box.hidden = !active;
      box.dataset.active = String(active);
      box.querySelector('.hm-target__tag').textContent = active
        ? 'playing the chords'
        : '';
    }
    engineSelect.value = engineId;
  }
  listeners.add(engineSelect, 'change', () => selectEngine(engineSelect.value));
  selectEngine(engineId);

  // ——— 7 · THE WIRE: §5's bus → the selected engine ——————————————————————————————
  // §5: all four hardware routes produce identical events and an instrument must never know
  // which one fired. These two lines are the whole routing layer of this page. `engineId` is
  // read per event, so a switch takes effect on the next note with no re-subscription.
  const busUnsubs = [];
  busUnsubs.push(
    input.on('noteon', (e) => {
      unlock();                       // §3 — idempotent, safe from any gesture, never blocks
      engineOf(engineId).instrument.noteOn(e.note, e.velocity);
    })
  );
  busUnsubs.push(
    input.on('noteoff', (e) => engineOf(engineId).instrument.noteOff(e.note))
  );

  // A tab-away must not leave a chord ringing. `input.allNotesOff()` emits real note-off
  // events, so nothing downstream has to know why.
  listeners.add(window, 'blur', () => input.allNotesOff());

  // §2's async gate. Every instrument here is `needsLoad = false` and resolves immediately;
  // calling it anyway is what lets a loading instrument drop into this same page later.
  for (const inst of [wave, overtone]) {
    inst.ready?.().catch((err) => console.error('[desktop/harmony.html] ready() failed:', err));
  }

  // ——— 8 · teardown, counted rather than claimed ——————————————————————————————————
  // Order is deliberate: stop new notes arriving, release what is sounding, then take the
  // consumers down before the producers. Deliberately does NOT call `audio.dispose()` (that
  // closes the one AudioContext for the whole document) or `input.dispose()` (the bus is
  // module-level and shared) — the same two exclusions `ui/shell.js`'s own unmount makes,
  // and for the same reasons.
  function teardown() {
    const report = { busUnsubs: busUnsubs.length, notesReleased: 0 };
    for (const off of busUnsubs) off();
    busUnsubs.length = 0;
    report.notesReleased = input.allNotesOff();

    report.circle = circle.dispose();
    report.comp = comp.dispose();
    report.wave = wave.dispose();
    report.overtone = overtone.dispose();

    releaseChannel(waveChannel);
    releaseChannel(overtoneChannel);
    report.channelsReleased = 2;

    report.cpu = cpu.dispose();
    report.menu = menu.dispose();
    report.scaleControl = scaleControl.dispose();
    report.listenersDropped = listeners.dropAll();

    root.remove();
    releaseShellStyle();
    return report;
  }
  listeners.add(window, 'pagehide', teardown);

  return {
    root, wave, overtone, circle, comp, cpu, menu, state, teardown,
    selectEngine, get engineId() { return engineId; },
  };
}

// =========================================================================================
// 4 · GO — and if anything throws, say so on the page. A blank screen in front of a class
//     tells nobody anything.
// =========================================================================================

try {
  // `test-p3` and `redpen-p3` need a handle to drive this page and count what comes down.
  // Same reason `ui/shell.js` parks itself on `window.cbdawShell`.
  window.cbdawHarmony = mount(document.body);
} catch (err) {
  const box = document.createElement('pre');
  box.className = 'hm-err';
  box.textContent = `harmony failed to mount:\n\n${err && err.stack ? err.stack : err}`;
  document.body.appendChild(box);
  console.error('[desktop/harmony.html] mount failed:', err);
}


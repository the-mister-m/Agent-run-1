// mixer/strip.js — channel strip: fader, meter, pan, mute/solo, 4 insert slots (display only).

import { masterGain, masterAnalyser, createChannel, releaseChannel } from '../core/audio.js';
import Meter from '../vis/meter.js';

const STYLE_ID = 'cbdaw-strip-style';
let liveInstances = 0;

const STYLE_TEXT = `
.cbdaw-strip {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  flex: var(--flex-0-0-auto);
  height: var(--pct-100);
  width: var(--sp-30);
  box-sizing: var(--box-border-box);
  font-family: var(--font-ui);
  color: var(--text);
  gap: var(--sp-1);
  padding: var(--sp-1);
  user-select: var(--usel-none);
}
.cbdaw-strip__label {
  font-size: var(--fs-tiny);
  font-weight: var(--w-med);
  text-align: var(--ta-center);
  overflow: var(--ov-hidden);
  white-space: var(--ws-nowrap);
  text-overflow: var(--to-ellipsis);
}
.cbdaw-strip__instrument {
  width: var(--pct-100);
  min-width: var(--sp-0);
  background: var(--bg);
  color: var(--text);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-ctl);
  font: inherit;
  font-size: var(--fs-micro);
  padding: var(--sp-0) var(--sp-1);
}
.cbdaw-strip__ms {
  display: var(--disp-flex);
  gap: var(--sp-1);
}
.cbdaw-strip__btn {
  flex: var(--flex-1);
  font: var(--font-inherit);
  font-size: var(--fs-micro);
  color: var(--text-dim);
  background: var(--raise);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-sm);
  cursor: var(--cur-pointer);
  padding: var(--sp-hair) var(--sp-0);
}
.cbdaw-strip__btn[aria-pressed="true"].cbdaw-strip__btn--mute {
  background: var(--mute-on);
  color: var(--bg);
  border-color: var(--mute-on);
}
.cbdaw-strip__btn[aria-pressed="true"].cbdaw-strip__btn--solo {
  background: var(--solo-on);
  color: var(--bg);
  border-color: var(--solo-on);
}
.cbdaw-strip__pan {
  position: var(--pos-relative);
  height: var(--sp-6);
  background: var(--pan-track);
  border-radius: var(--r-sm);
  cursor: var(--cur-ew-resize);
  touch-action: var(--touch-none);
}
.cbdaw-strip__pan-center {
  position: var(--pos-absolute);
  top: var(--sp-0);
  bottom: var(--sp-0);
  left: var(--pct-100);
  width: var(--bw);
  background: var(--pan-center);
}
.cbdaw-strip__pan-thumb {
  position: var(--pos-absolute);
  top: var(--sp-0);
  bottom: var(--sp-0);
  width: var(--sp-2);
  background: var(--pan-thumb);
  border-radius: var(--r-sm);
}
.cbdaw-strip__fadermeter {
  display: var(--disp-flex);
  gap: var(--sp-1);
  flex: var(--flex-1);
  min-height: var(--sp-0);
}
.cbdaw-strip__fader {
  position: var(--pos-relative);
  flex: var(--flex-1);
  background: var(--fader-track);
  border-radius: var(--r-sm);
  cursor: var(--cur-ns-resize);
  touch-action: var(--touch-none);
}
.cbdaw-strip__fader-fill {
  position: var(--pos-absolute);
  left: var(--sp-0);
  right: var(--sp-0);
  bottom: var(--sp-0);
  background: var(--fader-fill);
  border-radius: var(--r-sm);
}
.cbdaw-strip__fader-thumb {
  position: var(--pos-absolute);
  left: var(--sp-0);
  right: var(--sp-0);
  height: var(--sp-2);
  background: var(--fader-thumb);
  border-radius: var(--r-sm);
}
.cbdaw-strip__meter {
  width: var(--sp-4);
  flex: var(--flex-0-0-auto);
}
.cbdaw-strip__slots {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  gap: var(--sp-1);
}
.cbdaw-strip__slot {
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-1);
  height: var(--sp-9);
  background: var(--slot-face);
  border-radius: var(--r-sm);
  padding: var(--sp-0) var(--sp-1);
  cursor: var(--cur-pointer);
  box-sizing: var(--box-border-box);
}
.cbdaw-strip__slot[data-empty="true"] {
  cursor: var(--cur-default);
}
.cbdaw-strip__slot-meter {
  width: var(--sp-3);
  height: var(--pct-100);
  flex: var(--flex-0-0-auto);
}
.cbdaw-strip__slot-body {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  min-width: var(--sp-0);
  flex: var(--flex-1);
}
.cbdaw-strip__slot-label {
  font-size: var(--fs-micro);
  color: var(--text);
  overflow: var(--ov-hidden);
  white-space: var(--ws-nowrap);
  text-overflow: var(--to-ellipsis);
}
.cbdaw-strip__slot[data-empty="true"] .cbdaw-strip__slot-label {
  color: var(--slot-empty);
}
.cbdaw-strip__slot-route {
  font-size: var(--fs-micro);
  color: var(--slot-route);
  overflow: var(--ov-hidden);
  white-space: var(--ws-nowrap);
  text-overflow: var(--to-ellipsis);
}
.cbdaw-strip__slot-readout {
  font-size: var(--fs-micro);
  font-variant-numeric: var(--num-tabular);
  color: var(--text-dim);
  overflow: var(--ov-hidden);
  white-space: var(--ws-nowrap);
  text-overflow: var(--to-ellipsis);
}
.cbdaw-strip__out {
  font-size: var(--fs-micro);
  color: var(--slot-route);
  text-align: var(--ta-center);
  overflow: var(--ov-hidden);
  white-space: var(--ws-nowrap);
  text-overflow: var(--to-ellipsis);
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

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

const GAIN_MIN = 0;
const GAIN_MAX = 1.5;
const PAN_MIN = -1;
const PAN_MAX = 1;
const RAMP_S = 0.008;
const SLOT_COUNT = 4;

const EMPTY_SLOT_VIEW = { slot: 0, deviceId: null, label: null, to: null };

export default class Strip {
  constructor(
    ctx,
    {
      id, label, instrumentId = null, isMaster = false, onSlotPopout = null, _onMuteSolo = null,
      instrumentOptions = null, onAssignInstrument = null, instrumentType = null,
    } = {}
  ) {
    this.ctx = ctx;
    this.id = id;
    this._label = label ?? id;
    this.isMaster = !!isMaster;
    this._onSlotPopout = onSlotPopout;
    this._onMuteSolo = _onMuteSolo;

    // instrument picker. Null options: no picker is built and the head is unchanged.
    this.instrumentOptions = instrumentOptions;
    this.onAssignInstrument = onAssignInstrument;
    this._instrumentType = instrumentType;

    this._mute = false;
    this._solo = false;
    this._devices = [];
    this._routing = { slots: [], out: [this.isMaster ? 'Output' : 'Master'] };

    if (this.isMaster) {
      this._channelIn = null;
      this._stripGain = masterGain;
      this._stripPan = null;
      this._stripMute = null;
      this._meterTap = masterAnalyser;
    } else {
      this._channelIn = createChannel(instrumentId);
      this._channelIn.disconnect();
      this._stripGain = ctx.createGain();
      this._stripGain.gain.value = 1;
      this._stripPan = ctx.createStereoPanner();
      this._stripPan.pan.value = 0;
      this._stripMute = ctx.createGain();
      this._stripMute.gain.value = 1;
      this._meterTap = ctx.createAnalyser();
      this._meterTap.fftSize = 1024;
      this._wireChain();
    }

    // one entry per place this strip is on screen
    this._views = [];
  }

  // { el, wrap, nodes, meter, slotMeters, cleanup } for every live mount
  get views() {
    return this._views.slice();
  }

  // the view whose container is el, or null
  viewFor(el) {
    return this._views.find((v) => v.el === el) ?? null;
  }

  // first view — the fallback for callers that hold no element
  get el() {
    return this._views[0]?.el ?? null;
  }

  get wrap() {
    return this._views[0]?.wrap ?? null;
  }

  get _mounted() {
    return this._views.length > 0;
  }

  // channelIn -> stripGain -> stripPan -> stripMute -> meterTap -> masterGain (default)
  // inserts are patched onward from postFaderTap by mixer/graph.js, not here
  _wireChain() {
    if (this.isMaster) return;
    this._channelIn.disconnect();
    this._channelIn.connect(this._stripGain);
    this._stripGain.disconnect();
    this._stripGain.connect(this._stripPan);
    this._stripPan.disconnect();
    this._stripPan.connect(this._stripMute);
    this._stripMute.disconnect();
    this._stripMute.connect(this._meterTap);
    this._meterTap.disconnect();
    this._meterTap.connect(masterGain);
  }

  get label() {
    return this._label;
  }

  // the strip's name and the graph node's name are the same string, read from here
  set label(v) {
    this._label = v ?? this.id;
    for (const view of this._views) {
      const el = view.wrap?.querySelector('.cbdaw-strip__label');
      if (el) el.textContent = this._label;
    }
  }

  get instrumentType() {
    return this._instrumentType;
  }

  // the picker's value, mirrored into every mounted view
  set instrumentType(v) {
    this._instrumentType = v || null;
    for (const view of this._views) {
      if (view.nodes.instrument) view.nodes.instrument.value = this._instrumentType || '';
    }
  }

  get input() {
    return this.isMaster ? masterGain : this._channelIn;
  }

  get output() {
    return this.isMaster ? masterAnalyser : masterGain;
  }

  get gain() {
    return this._stripGain.gain.value;
  }

  set gain(v) {
    const val = clamp(Number(v) || 0, GAIN_MIN, GAIN_MAX);
    this._stripGain.gain.setTargetAtTime(val, this.ctx.currentTime, RAMP_S);
  }

  get pan() {
    return this.isMaster ? 0 : this._stripPan.pan.value;
  }

  set pan(v) {
    if (this.isMaster) return;
    const val = clamp(Number(v) || 0, PAN_MIN, PAN_MAX);
    this._stripPan.pan.setTargetAtTime(val, this.ctx.currentTime, RAMP_S);
  }

  get mute() {
    return this.isMaster ? false : this._mute;
  }

  set mute(v) {
    if (this.isMaster) return;
    this._mute = !!v;
    if (this._onMuteSolo) this._onMuteSolo();
    else this._applyAudible(!this._mute);
    this._refreshMs();
  }

  get solo() {
    return this.isMaster ? false : this._solo;
  }

  set solo(v) {
    if (this.isMaster) return;
    this._solo = !!v;
    if (this._onMuteSolo) this._onMuteSolo();
    else this._applyAudible(!this._mute);
    this._refreshMs();
  }

  get meterTap() {
    return this._meterTap;
  }

  // same node as meterTap — the single point every outgoing port fans out from
  get postFaderTap() {
    return this._meterTap;
  }

  // audible: computed by createStrips() across the live strips, or standalone (mute only) here
  _applyAudible(audible) {
    if (this.isMaster) return;
    this._stripMute.gain.setTargetAtTime(audible ? 1 : 0, this.ctx.currentTime, RAMP_S);
  }

  setInserts(devices) {
    const list = Array.isArray(devices) ? devices.slice() : [];
    if (list.length > SLOT_COUNT) {
      console.warn(`Strip.setInserts: ${list.length} devices, only ${SLOT_COUNT} slots. Extra ignored.`);
    }
    if (this.isMaster) {
      if (list.length) console.warn('Strip.setInserts: master has no insert slots.');
      return;
    }
    for (const dev of this._devices) dev.output.disconnect();
    this._devices = list.slice(0, SLOT_COUNT);
    this._wireChain();
    if (this._mounted) this._renderSlots();
  }

  get inserts() {
    return this._devices.slice();
  }

  setRouting(view) {
    this._routing = {
      slots: Array.isArray(view?.slots) ? view.slots : [],
      out: Array.isArray(view?.out) ? view.out : ['Master'],
    };
    if (this._mounted) {
      this._renderSlots();
      this._renderOut();
    }
  }

  getState() {
    if (this.isMaster) {
      return { gain: this.gain, inserts: [] };
    }
    return {
      gain: this.gain,
      pan: this.pan,
      mute: this._mute,
      solo: this._solo,
      inserts: this._devices.map((d) => d.constructor?.id ?? null),
    };
  }

  setState(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Number.isFinite(obj.gain)) this.gain = obj.gain;
    if (this.isMaster) return;
    if (Number.isFinite(obj.pan)) this.pan = obj.pan;
    if (typeof obj.mute === 'boolean') this.mute = obj.mute;
    if (typeof obj.solo === 'boolean') this.solo = obj.solo;
  }

  mountCompact(el) {
    if (!el) throw new TypeError('Strip.mountCompact: needs a container element');
    if (this.viewFor(el)) this.unmount(el);
    acquireStyle();

    const view = { el, wrap: null, nodes: {}, meter: null, slotMeters: [], cleanup: [] };

    const root = document.createElement('div');
    root.className = 'cbdaw-strip';

    const labelEl = document.createElement('div');
    labelEl.className = 'cbdaw-strip__label';
    labelEl.textContent = this.label;
    root.appendChild(labelEl);

    // instrument picker, under the name. Absent on master and when no options were given.
    if (!this.isMaster && this.instrumentOptions) {
      const instrumentSelect = document.createElement('select');
      instrumentSelect.className = 'cbdaw-strip__instrument';
      instrumentSelect.title = 'Instrument';
      for (const opt of this.instrumentOptions) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        instrumentSelect.appendChild(o);
      }
      instrumentSelect.value = this._instrumentType || '';
      this._addListener(view, instrumentSelect, 'change', () => {
        const type = instrumentSelect.value || null;
        this._instrumentType = type;
        if (typeof this.onAssignInstrument === 'function') this.onAssignInstrument(this.id, type);
      });
      root.appendChild(instrumentSelect);
      view.nodes.instrument = instrumentSelect;
    }

    let muteBtn = null;
    let soloBtn = null;
    if (!this.isMaster) {
      const ms = document.createElement('div');
      ms.className = 'cbdaw-strip__ms';
      muteBtn = document.createElement('button');
      muteBtn.className = 'cbdaw-strip__btn cbdaw-strip__btn--mute';
      muteBtn.type = 'button';
      muteBtn.textContent = 'M';
      muteBtn.setAttribute('aria-pressed', String(this._mute));
      this._addListener(view, muteBtn, 'click', () => {
        this.mute = !this._mute;
      });
      soloBtn = document.createElement('button');
      soloBtn.className = 'cbdaw-strip__btn cbdaw-strip__btn--solo';
      soloBtn.type = 'button';
      soloBtn.textContent = 'S';
      soloBtn.setAttribute('aria-pressed', String(this._solo));
      this._addListener(view, soloBtn, 'click', () => {
        this.solo = !this._solo;
      });
      ms.appendChild(muteBtn);
      ms.appendChild(soloBtn);
      root.appendChild(ms);

      const pan = document.createElement('div');
      pan.className = 'cbdaw-strip__pan';
      const panCenter = document.createElement('div');
      panCenter.className = 'cbdaw-strip__pan-center';
      const panThumb = document.createElement('div');
      panThumb.className = 'cbdaw-strip__pan-thumb';
      pan.appendChild(panCenter);
      pan.appendChild(panThumb);
      root.appendChild(pan);
      view.nodes.pan = pan;
      view.nodes.panThumb = panThumb;
      this._wirePanDrag(view, pan);
    }

    const fm = document.createElement('div');
    fm.className = 'cbdaw-strip__fadermeter';
    const fader = document.createElement('div');
    fader.className = 'cbdaw-strip__fader';
    const faderFill = document.createElement('div');
    faderFill.className = 'cbdaw-strip__fader-fill';
    const faderThumb = document.createElement('div');
    faderThumb.className = 'cbdaw-strip__fader-thumb';
    fader.appendChild(faderFill);
    fader.appendChild(faderThumb);
    const meterHost = document.createElement('div');
    meterHost.className = 'cbdaw-strip__meter';
    fm.appendChild(fader);
    fm.appendChild(meterHost);
    root.appendChild(fm);
    view.nodes.fader = fader;
    view.nodes.faderFill = faderFill;
    view.nodes.faderThumb = faderThumb;
    this._wireFaderDrag(view, fader);

    const slots = document.createElement('div');
    slots.className = 'cbdaw-strip__slots';
    if (!this.isMaster) {
      for (let i = 0; i < SLOT_COUNT; i++) {
        const slot = document.createElement('div');
        slot.className = 'cbdaw-strip__slot';
        slot.dataset.slot = String(i);
        const slotMeter = document.createElement('div');
        slotMeter.className = 'cbdaw-strip__slot-meter';
        const body = document.createElement('div');
        body.className = 'cbdaw-strip__slot-body';
        const slotLabel = document.createElement('div');
        slotLabel.className = 'cbdaw-strip__slot-label';
        const slotReadout = document.createElement('div');
        slotReadout.className = 'cbdaw-strip__slot-readout';
        const slotRoute = document.createElement('div');
        slotRoute.className = 'cbdaw-strip__slot-route';
        body.appendChild(slotLabel);
        body.appendChild(slotReadout);
        body.appendChild(slotRoute);
        slot.appendChild(slotMeter);
        slot.appendChild(body);
        this._addListener(view, slot, 'click', () => this._onSlotClick(i));
        slots.appendChild(slot);
      }
    }
    root.appendChild(slots);
    view.nodes.slots = slots;

    const out = document.createElement('div');
    out.className = 'cbdaw-strip__out';
    root.appendChild(out);
    view.nodes.out = out;

    el.appendChild(root);
    view.wrap = root;
    this._views.push(view);

    view.meter = new Meter(this._meterTap, { orientation: 'vertical' });
    view.meter.mount(meterHost);

    this._refreshMsView(view);
    this._refreshFaderView(view);
    this._refreshPanView(view);
    this._renderSlotsView(view);
    this._renderOutView(view);
    return view;
  }

  // el names one view; no el tears down every view
  unmount(el = null) {
    const targets = el ? this._views.filter((v) => v.el === el) : this._views.slice();
    for (const view of targets) {
      for (const off of view.cleanup) off();
      view.cleanup = [];
      view.meter?.dispose();
      view.meter = null;
      for (const m of view.slotMeters) m?.dispose();
      view.slotMeters = [];
      if (view.wrap && view.wrap.parentNode) view.wrap.parentNode.removeChild(view.wrap);
      view.wrap = null;
      view.nodes = {};
      const i = this._views.indexOf(view);
      if (i !== -1) this._views.splice(i, 1);
      releaseStyle();
    }
  }

  dispose() {
    this.unmount();
    if (!this.isMaster) {
      for (const dev of this._devices) dev.output.disconnect();
      this._channelIn.disconnect();
      this._stripGain.disconnect();
      this._stripPan.disconnect();
      this._stripMute.disconnect();
      this._meterTap.disconnect();
      releaseChannel(this._channelIn);
    }
  }

  _addListener(view, target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    view.cleanup.push(() => target.removeEventListener(type, fn, opts));
  }

  _refreshMs() {
    for (const view of this._views) this._refreshMsView(view);
  }

  _refreshMsView(view) {
    if (this.isMaster || !view.wrap) return;
    const ms = view.wrap.querySelector('.cbdaw-strip__ms');
    if (!ms) return;
    const [muteBtn, soloBtn] = ms.children;
    muteBtn.setAttribute('aria-pressed', String(this._mute));
    soloBtn.setAttribute('aria-pressed', String(this._solo));
  }

  _refreshFader() {
    for (const view of this._views) this._refreshFaderView(view);
  }

  _refreshFaderView(view) {
    if (!view.nodes.faderFill) return;
    const frac = clamp(this.gain / GAIN_MAX, 0, 1);
    view.nodes.faderFill.style.height = `${frac * 100}%`;
    view.nodes.faderThumb.style.bottom = `calc(${frac * 100}% - var(--sp-1))`;
  }

  _refreshPan() {
    for (const view of this._views) this._refreshPanView(view);
  }

  _refreshPanView(view) {
    if (this.isMaster || !view.nodes.panThumb) return;
    const frac = clamp((this.pan - PAN_MIN) / (PAN_MAX - PAN_MIN), 0, 1);
    view.nodes.panThumb.style.left = `calc(${frac * 100}% - var(--sp-1))`;
  }

  _wireFaderDrag(view, fader) {
    let dragging = false;
    const setFromClientY = (clientY) => {
      const rect = fader.getBoundingClientRect();
      const frac = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
      this.gain = frac * GAIN_MAX;
      this._refreshFader();
    };
    this._addListener(view, fader, 'pointerdown', (e) => {
      dragging = true;
      try {
        fader.setPointerCapture(e.pointerId);
      } catch {
        // not capturable
      }
      setFromClientY(e.clientY);
    });
    this._addListener(view, fader, 'pointermove', (e) => {
      if (dragging) setFromClientY(e.clientY);
    });
    const end = () => {
      dragging = false;
    };
    this._addListener(view, fader, 'pointerup', end);
    this._addListener(view, fader, 'pointercancel', end);
  }

  _wirePanDrag(view, pan) {
    let dragging = false;
    const setFromClientX = (clientX) => {
      const rect = pan.getBoundingClientRect();
      const frac = clamp((clientX - rect.left) / rect.width, 0, 1);
      this.pan = PAN_MIN + frac * (PAN_MAX - PAN_MIN);
      this._refreshPan();
    };
    this._addListener(view, pan, 'pointerdown', (e) => {
      dragging = true;
      try {
        pan.setPointerCapture(e.pointerId);
      } catch {
        // not capturable
      }
      setFromClientX(e.clientX);
    });
    this._addListener(view, pan, 'pointermove', (e) => {
      if (dragging) setFromClientX(e.clientX);
    });
    const end = () => {
      dragging = false;
    };
    this._addListener(view, pan, 'pointerup', end);
    this._addListener(view, pan, 'pointercancel', end);
  }

  _onSlotClick(index) {
    const device = this._devices[index];
    if (!device) return;
    if (this._onSlotPopout) this._onSlotPopout(device, index);
  }

  _renderSlots() {
    for (const view of this._views) this._renderSlotsView(view);
  }

  _renderSlotsView(view) {
    if (this.isMaster || !view.nodes.slots) return;
    for (const m of view.slotMeters) m?.dispose();
    view.slotMeters = [];

    const slotEls = view.nodes.slots.children;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slotEl = slotEls[i];
      const device = this._devices[i];
      const view = this._routing.slots[i] ?? EMPTY_SLOT_VIEW;
      const labelEl = slotEl.querySelector('.cbdaw-strip__slot-label');
      const readoutEl = slotEl.querySelector('.cbdaw-strip__slot-readout');
      const routeEl = slotEl.querySelector('.cbdaw-strip__slot-route');
      const meterHost = slotEl.querySelector('.cbdaw-strip__slot-meter');
      meterHost.textContent = '';
      readoutEl.textContent = '';

      if (device) {
        slotEl.dataset.empty = 'false';
        labelEl.textContent = device.constructor?.label ?? view.label ?? '';
        routeEl.textContent = view.to ? `→ ${view.to}` : '';
        const analyser =
          typeof device.getAnalyser === 'function'
            ? device.getAnalyser('scope') ?? device.getAnalyser('spectrum')
            : null;
        if (analyser) {
          const m = new Meter(analyser, { orientation: 'vertical' });
          m.mount(meterHost);
          view.slotMeters[i] = m;
        } else if (device.readout && typeof device.readout === 'object') {
          const entries = Object.entries(device.readout);
          if (entries.length) {
            const [k, v] = entries[0];
            readoutEl.textContent = `${k}: ${typeof v === 'number' ? v.toFixed(1) : v}`;
          }
        }
      } else {
        slotEl.dataset.empty = 'true';
        labelEl.textContent = '—';
        routeEl.textContent = '';
      }
    }
  }

  _renderOut() {
    for (const view of this._views) this._renderOutView(view);
  }

  _renderOutView(view) {
    if (!view.nodes.out) return;
    const out = this._routing.out.length ? this._routing.out : ['Master'];
    view.nodes.out.textContent = out.map((o) => `→ ${o}`).join('  ');
  }
}

// a live rack: master plus one channel strip per spec, mute/solo resolved across the live set.
// no specs is an empty rack, not six — channel strips are added and removed on demand.
export function createStrips(ctx, specs) {
  const list = Array.isArray(specs) ? specs : [];

  const channelStrips = [];
  // the same object for the rack's life — mixer/graph.js binds it once and reads through it
  const strips = {};

  function recomputeAudible() {
    const anySolo = channelStrips.some((s) => s._solo);
    for (const s of channelStrips) {
      const audible = anySolo ? s._solo && !s._mute : !s._mute;
      s._applyAudible(audible);
    }
  }

  function addStrip(spec) {
    if (!spec || !spec.id || spec.id === 'master') return null;
    if (strips[spec.id]) return strips[spec.id];
    const strip = new Strip(ctx, { ...spec, isMaster: false, _onMuteSolo: recomputeAudible });
    channelStrips.push(strip);
    strips[strip.id] = strip;
    recomputeAudible();
    return strip;
  }

  for (const spec of list) addStrip(spec);
  strips.master = new Strip(ctx, { id: 'master', label: 'Master', isMaster: true });
  recomputeAudible();

  return {
    strips,

    get channels() {
      return channelStrips.slice();
    },

    add: addStrip,

    /** Unmounts, disconnects and releases the strip's channel, then drops it from the rack.
     *  Call after the graph has dropped the matching channel node. */
    remove(id) {
      const strip = strips[id];
      if (!strip || strip.isMaster) return false;
      const i = channelStrips.indexOf(strip);
      if (i !== -1) channelStrips.splice(i, 1);
      delete strips[id];
      strip.dispose();
      recomputeAudible();
      return true;
    },

    rename(id, label) {
      const strip = strips[id];
      if (!strip) return false;
      strip.label = label;
      return true;
    },

    dispose() {
      for (const s of channelStrips) s.dispose();
      channelStrips.length = 0;
      strips.master?.dispose();
      for (const key of Object.keys(strips)) delete strips[key];
    },
  };
}

// mixer/strip.js — channel strip: fader, meter, pan, mute/solo, 4 insert slots (display only).

import { masterGain, masterAnalyser, createChannel, releaseChannel } from '../core/audio.js';
import Meter from '../vis/meter.js';

const STYLE_ID = 'cbdaw-strip-style';
let liveInstances = 0;

const STYLE_TEXT = `
.cbdaw-strip {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  height: var(--pct-100);
  width: var(--pct-100);
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
    { id, label, instrumentId = null, isMaster = false, onSlotPopout = null, _onMuteSolo = null } = {}
  ) {
    this.ctx = ctx;
    this.id = id;
    this.label = label ?? id;
    this.isMaster = !!isMaster;
    this._onSlotPopout = onSlotPopout;
    this._onMuteSolo = _onMuteSolo;

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

    this.el = null;
    this._mounted = false;
    this._meter = null;
    this._slotMeters = [];
    this._nodes = {};
    this._cleanup = [];
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

  // audible: computed by createStrips() across all six, or standalone (mute only) here
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
    if (this._mounted) this.unmount();
    if (!el) throw new TypeError('Strip.mountCompact: needs a container element');
    acquireStyle();
    this.el = el;

    const root = document.createElement('div');
    root.className = 'cbdaw-strip';

    const labelEl = document.createElement('div');
    labelEl.className = 'cbdaw-strip__label';
    labelEl.textContent = this.label;
    root.appendChild(labelEl);

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
      this._addListener(muteBtn, 'click', () => {
        this.mute = !this._mute;
      });
      soloBtn = document.createElement('button');
      soloBtn.className = 'cbdaw-strip__btn cbdaw-strip__btn--solo';
      soloBtn.type = 'button';
      soloBtn.textContent = 'S';
      soloBtn.setAttribute('aria-pressed', String(this._solo));
      this._addListener(soloBtn, 'click', () => {
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
      this._nodes.pan = pan;
      this._nodes.panThumb = panThumb;
      this._wirePanDrag(pan);
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
    this._nodes.fader = fader;
    this._nodes.faderFill = faderFill;
    this._nodes.faderThumb = faderThumb;
    this._wireFaderDrag(fader);

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
        this._addListener(slot, 'click', () => this._onSlotClick(i));
        slots.appendChild(slot);
      }
    }
    root.appendChild(slots);
    this._nodes.slots = slots;

    const out = document.createElement('div');
    out.className = 'cbdaw-strip__out';
    root.appendChild(out);
    this._nodes.out = out;

    el.appendChild(root);
    this.wrap = root;
    this._mounted = true;

    this._meter = new Meter(this._meterTap, { orientation: 'vertical' });
    this._meter.mount(meterHost);

    this._refreshMs();
    this._refreshFader();
    this._refreshPan();
    this._renderSlots();
    this._renderOut();
  }

  unmount() {
    for (const off of this._cleanup) off();
    this._cleanup = [];
    if (this._meter) this._meter.dispose();
    this._meter = null;
    for (const m of this._slotMeters) m?.dispose();
    this._slotMeters = [];
    if (this.wrap && this.wrap.parentNode) this.wrap.parentNode.removeChild(this.wrap);
    this.wrap = null;
    this._nodes = {};
    if (this._mounted) releaseStyle();
    this._mounted = false;
    this.el = null;
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

  _addListener(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._cleanup.push(() => target.removeEventListener(type, fn, opts));
  }

  _refreshMs() {
    if (this.isMaster || !this._mounted) return;
    const ms = this.wrap.querySelector('.cbdaw-strip__ms');
    if (!ms) return;
    const [muteBtn, soloBtn] = ms.children;
    muteBtn.setAttribute('aria-pressed', String(this._mute));
    soloBtn.setAttribute('aria-pressed', String(this._solo));
  }

  _refreshFader() {
    if (!this._mounted) return;
    const frac = clamp(this.gain / GAIN_MAX, 0, 1);
    this._nodes.faderFill.style.height = `${frac * 100}%`;
    this._nodes.faderThumb.style.bottom = `calc(${frac * 100}% - var(--sp-1))`;
  }

  _refreshPan() {
    if (this.isMaster || !this._mounted) return;
    const frac = clamp((this.pan - PAN_MIN) / (PAN_MAX - PAN_MIN), 0, 1);
    this._nodes.panThumb.style.left = `calc(${frac * 100}% - var(--sp-1))`;
  }

  _wireFaderDrag(fader) {
    let dragging = false;
    const setFromClientY = (clientY) => {
      const rect = fader.getBoundingClientRect();
      const frac = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
      this.gain = frac * GAIN_MAX;
      this._refreshFader();
    };
    this._addListener(fader, 'pointerdown', (e) => {
      dragging = true;
      try {
        fader.setPointerCapture(e.pointerId);
      } catch {
        // not capturable
      }
      setFromClientY(e.clientY);
    });
    this._addListener(fader, 'pointermove', (e) => {
      if (dragging) setFromClientY(e.clientY);
    });
    const end = () => {
      dragging = false;
    };
    this._addListener(fader, 'pointerup', end);
    this._addListener(fader, 'pointercancel', end);
  }

  _wirePanDrag(pan) {
    let dragging = false;
    const setFromClientX = (clientX) => {
      const rect = pan.getBoundingClientRect();
      const frac = clamp((clientX - rect.left) / rect.width, 0, 1);
      this.pan = PAN_MIN + frac * (PAN_MAX - PAN_MIN);
      this._refreshPan();
    };
    this._addListener(pan, 'pointerdown', (e) => {
      dragging = true;
      try {
        pan.setPointerCapture(e.pointerId);
      } catch {
        // not capturable
      }
      setFromClientX(e.clientX);
    });
    this._addListener(pan, 'pointermove', (e) => {
      if (dragging) setFromClientX(e.clientX);
    });
    const end = () => {
      dragging = false;
    };
    this._addListener(pan, 'pointerup', end);
    this._addListener(pan, 'pointercancel', end);
  }

  _onSlotClick(index) {
    const device = this._devices[index];
    if (!device) return;
    if (this._onSlotPopout) this._onSlotPopout(device, index);
  }

  _renderSlots() {
    if (this.isMaster || !this._mounted) return;
    for (const m of this._slotMeters) m?.dispose();
    this._slotMeters = [];

    const slotEls = this._nodes.slots.children;
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
          this._slotMeters[i] = m;
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
    if (!this._mounted) return;
    const out = this._routing.out.length ? this._routing.out : ['Master'];
    this._nodes.out.textContent = out.map((o) => `→ ${o}`).join('  ');
  }
}

// six channel strips + master, mute/solo resolved across the six
export function createStrips(ctx, specs) {
  const list =
    Array.isArray(specs) && specs.length
      ? specs
      : [1, 2, 3, 4, 5, 6].map((n) => ({ id: `ch${n}`, label: `Channel ${n}` }));

  const channelStrips = [];
  const strips = {};

  function recomputeAudible() {
    const anySolo = channelStrips.some((s) => s._solo);
    for (const s of channelStrips) {
      const audible = anySolo ? s._solo && !s._mute : !s._mute;
      s._applyAudible(audible);
    }
  }

  for (const spec of list) {
    const strip = new Strip(ctx, { ...spec, isMaster: false, _onMuteSolo: recomputeAudible });
    channelStrips.push(strip);
    strips[strip.id] = strip;
  }
  strips.master = new Strip(ctx, { id: 'master', label: 'Master', isMaster: true });
  recomputeAudible();

  return {
    strips,
    dispose() {
      for (const s of channelStrips) s.dispose();
      strips.master.dispose();
    },
  };
}

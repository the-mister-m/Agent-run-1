// mixer/graph.js — the routing graph. The only file that changes a route.

import { masterGain, governor } from '../core/audio.js';
import Gate from '../devices/gate.js';
import Compressor from '../devices/compressor.js';
import EQ from '../devices/eq.js';
import Reverb from '../devices/reverb.js';
import Delay from '../devices/delay.js';

const DEVICE_TYPES = { gate: Gate, compressor: Compressor, eq: EQ, reverb: Reverb, delay: Delay };
const DEVICE_ORDER = ['gate', 'compressor', 'eq', 'reverb', 'delay'];

const CAP_INSERTS = 4; // devices per channel
const CAP_SENDS = 2; // outgoing channel edges past the first
const CAP_NODES = 24; // insert nodes in the mixer graph; channel and master nodes are not counted
const OUT_PORTS = 1 + CAP_SENDS; // main path plus the capped sends
const MASTER_ID = 'master';
const MASTER_LABEL = 'Master';
const WALK_LIMIT = 64; // bounds every graph walk

// seed layout, in the x/y units §7 stores
const LAY = { x: 12, y: 8, rowStep: 46, colStep: 148, masterX: 520, masterY: 118 };

const STYLE_ID = 'cbdaw-graph-style';
let liveInstances = 0;

const STYLE_TEXT = `
@keyframes cbdaw-graph-refuse {
  from { border-color: var(--edge-refused); }
  to   { border-color: var(--node-border); }
}
.cbdaw-graph {
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  height: var(--pct-100);
  width: var(--pct-100);
  box-sizing: var(--box-border-box);
  font-family: var(--font-ui);
  color: var(--text);
  background: var(--graph-ground);
  user-select: var(--usel-none);
}
.cbdaw-graph__bar {
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-1);
  padding: var(--sp-1);
  flex: var(--flex-0-0-auto);
  border-bottom: var(--bw) solid var(--line);
  background: var(--panel);
}
.cbdaw-graph__chip {
  font: var(--font-inherit);
  font-size: var(--fs-micro);
  color: var(--text);
  background: var(--btn-face);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-ctl);
  padding: var(--sp-hair) var(--sp-2);
  cursor: var(--cur-pointer);
  white-space: var(--ws-nowrap);
}
.cbdaw-graph__chip:hover {
  border-color: var(--node-selected);
}
.cbdaw-graph__reason {
  font-size: var(--fs-micro);
  color: var(--edge-refused);
  flex: var(--flex-1);
  overflow: var(--ov-hidden);
  white-space: var(--ws-nowrap);
  text-overflow: var(--to-ellipsis);
}
.cbdaw-graph__reason[data-kind="hint"] {
  color: var(--text-dim);
}
.cbdaw-graph__canvas {
  position: var(--pos-relative);
  flex: var(--flex-1);
  min-height: var(--sp-0);
  overflow: var(--auto);
  background-image:
    linear-gradient(to right, var(--graph-grid) var(--sp-hair), var(--color-transparent) var(--sp-hair)),
    linear-gradient(to bottom, var(--graph-grid) var(--sp-hair), var(--color-transparent) var(--sp-hair));
  background-size: var(--sp-8) var(--sp-8);
  touch-action: var(--touch-none);
}
.cbdaw-graph__sheet {
  position: var(--pos-relative);
  width: var(--pct-100);
  height: var(--pct-100);
}
.cbdaw-graph__wires {
  position: var(--pos-absolute);
  top: var(--sp-0);
  left: var(--sp-0);
  width: var(--pct-100);
  height: var(--pct-100);
  overflow: var(--ov-visible);
  pointer-events: var(--pe-none);
}
.cbdaw-graph__wire {
  fill: var(--none);
  stroke: var(--edge-audio);
  stroke-width: var(--stroke-med);
  transition: var(--tr-stroke);
  pointer-events: var(--pe-auto);
  cursor: var(--cur-pointer);
}
.cbdaw-graph__wire:hover {
  stroke: var(--edge-hover);
  stroke-width: var(--stroke-bold);
}
.cbdaw-graph__wire[data-branch="true"] {
  stroke: var(--edge-control);
}
.cbdaw-graph__wire[data-dimmed="true"] {
  stroke: var(--node-dimmed);
}
.cbdaw-graph__wire-hit {
  fill: var(--none);
  stroke: var(--color-transparent);
  stroke-width: var(--sp-5);
  pointer-events: var(--pe-auto);
  cursor: var(--cur-pointer);
}
.cbdaw-graph__wire--drag {
  stroke: var(--cable-drag);
  stroke-width: var(--stroke-bold);
  stroke-dasharray: var(--stroke-dash);
  pointer-events: var(--pe-none);
}
.cbdaw-graph__node {
  position: var(--pos-absolute);
  width: var(--sp-60);
  overflow: var(--ov-visible);
  box-sizing: var(--box-border-box);
  background: var(--node-fill);
  border: var(--bw) solid var(--node-border);
  border-radius: var(--r-body);
  z-index: var(--z-raise-1);
  transition: var(--tr-transform);
}
.cbdaw-graph__node[data-selected="true"] {
  border-color: var(--node-selected);
  box-shadow: var(--shadow-raised);
}
.cbdaw-graph__node[data-dragging="true"] {
  border-color: var(--node-dragging);
  z-index: var(--z-drag);
}
.cbdaw-graph__node[data-dimmed="true"] {
  opacity: var(--op-dim);
  border-color: var(--node-dimmed);
}
.cbdaw-graph__node[data-refused="true"] {
  animation: cbdaw-graph-refuse var(--dur-med) var(--ease) 3;
}
.cbdaw-graph__node-head {
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-1);
  background: var(--node-head);
  border-radius: var(--r-body) var(--r-body) var(--sp-0) var(--sp-0);
  padding: var(--sp-hair) var(--sp-1);
  cursor: var(--cur-grab);
}
.cbdaw-graph__node[data-dragging="true"] .cbdaw-graph__node-head {
  cursor: var(--cur-grabbing);
}
.cbdaw-graph__node-name {
  flex: var(--flex-1);
  font-size: var(--fs-micro);
  font-weight: var(--w-med);
  overflow: var(--ov-hidden);
  white-space: var(--ws-nowrap);
  text-overflow: var(--to-ellipsis);
}
.cbdaw-graph__node-kill {
  font: var(--font-inherit);
  font-size: var(--fs-micro);
  line-height: var(--lh-none);
  color: var(--text-dim);
  background: var(--color-transparent);
  border: var(--none);
  padding: var(--sp-0);
  cursor: var(--cur-pointer);
}
.cbdaw-graph__node-kill:hover {
  color: var(--edge-refused);
}
.cbdaw-graph__node-body {
  display: var(--disp-flex);
  align-items: var(--align-center);
  justify-content: var(--justify-space-between);
  min-height: var(--sp-6);
  padding: var(--sp-hair) var(--sp-2);
  font-size: var(--fs-micro);
  color: var(--text-dim);
  overflow: var(--ov-hidden);
  white-space: var(--ws-nowrap);
  text-overflow: var(--to-ellipsis);
}
.cbdaw-graph__port {
  width: var(--sp-3);
  height: var(--sp-3);
  flex: var(--flex-0-0-auto);
  border-radius: var(--r-pill);
  border: var(--bw) solid var(--node-border);
  box-sizing: var(--box-border-box);
}
.cbdaw-graph__port--in {
  position: var(--pos-absolute);
  top: var(--sp-0);
  bottom: var(--sp-0);
  margin-top: var(--auto);
  margin-bottom: var(--auto);
  left: calc(var(--sp-2) * -1);
  background: var(--port-in);
}
.cbdaw-graph__outs {
  position: var(--pos-absolute);
  top: var(--sp-0);
  bottom: var(--sp-0);
  right: calc(var(--sp-2) * -1);
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  justify-content: var(--justify-center);
  gap: var(--sp-1);
}
.cbdaw-graph__port--out {
  background: var(--port-out);
  cursor: var(--cur-grab);
}
.cbdaw-graph__port--out[data-used="true"] {
  background: var(--port-active);
}
.cbdaw-graph__port[data-target="true"] {
  background: var(--port-active);
  border-color: var(--node-selected);
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

const SVG_NS = 'http://www.w3.org/2000/svg';

export default class Graph {
  constructor(ctx, { strips = null, channels = null, onDevicePopout = null } = {}) {
    this.ctx = ctx;
    this._strips = null;
    this._onDevicePopout = onDevicePopout;

    this._nodes = new Map(); // id -> { id, type, ref, x, y }
    this._edges = []; // { from, fromPort, to, toPort }
    this._devices = new Map(); // insert node id -> device instance
    this._types = new Map(); // insert node id -> device type string
    this._seq = 0; // insert id counter

    this._selected = null;
    this._reason = '';
    this._listeners = new Map();

    this.el = null;
    this.wrap = null;
    this._mounted = false;
    this._nodeEls = new Map();
    this._nodeCleanup = new Map(); // node id -> listener removers
    this._svg = null;
    this._sheet = null;
    this._cleanup = [];
    this._dragCable = null;
    this._dragNode = null;

    this._seedDefault(channels);
    if (strips) this.bindStrips(strips);
  }

  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(fn);
    return this;
  }

  off(event, fn) {
    this._listeners.get(event)?.delete(fn);
    return this;
  }

  _emit(event, payload) {
    for (const fn of this._listeners.get(event) ?? []) fn(payload);
  }

  // drops the previous strips, adopts the new ones, repatches once
  bindStrips(strips) {
    if (this._strips) this._unpatchAll();
    this._strips = strips && typeof strips === 'object' ? strips : null;
    this._repatch();
    this._render();
    return this;
  }

  unbindStrips() {
    if (this._strips) this._unpatchAll();
    this._strips = null;
    this._render();
    return this;
  }

  set onDevicePopout(fn) {
    this._onDevicePopout = typeof fn === 'function' ? fn : null;
  }

  get nodes() {
    return [...this._nodes.values()].map((n) => ({ ...n }));
  }

  get edges() {
    return this._edges.map((e) => ({ ...e }));
  }

  deviceOf(insertNodeId) {
    return this._devices.get(insertNodeId) ?? null;
  }

  get nodeCount() {
    return this._nodes.size;
  }

  get lastRefusal() {
    return this._reason;
  }

  // master, plus one channel node per live track id, each on port 0 to master.
  // an empty list is legal: a new project seeds master alone.
  _seedDefault(channels) {
    this._nodes.clear();
    this._edges = [];
    this._nodes.set(MASTER_ID, {
      id: MASTER_ID,
      type: 'master',
      ref: null,
      x: LAY.masterX,
      y: LAY.masterY,
    });
    const ids = Array.isArray(channels) ? channels : [];
    for (const entry of ids) {
      const id = typeof entry === 'string' ? entry : entry?.id;
      if (id) this.addChannel(id);
    }
  }

  // one channel node, wired to master. The node belongs to the track and outlives any
  // instrument swap on it.
  addChannel(id) {
    if (!id || id === MASTER_ID) return false;
    if (this._nodes.has(id)) return false;
    // one row below the last channel, then stepped past anything already parked there —
    // the row index grows with the list, so it does not stall at the walk limit
    let rows = 0;
    for (const n of this._nodes.values()) if (n.type === 'channel') rows++;
    const spot = this._freeSpot(LAY.x, LAY.y + rows * LAY.rowStep);
    this._nodes.set(id, { id, type: 'channel', ref: id, x: spot.x, y: spot.y });
    this._edges.push({ from: id, fromPort: 0, to: MASTER_ID, toPort: 0 });
    if (this._strips) this._commit();
    return true;
  }

  // the channel node, every insert hanging off it, every device those inserts hold, and
  // every edge touching any of them. Nothing is healed across the gap — the chain goes too.
  removeChannel(id) {
    const n = this._node(id);
    if (!n || n.type !== 'channel') return false;
    const doomed = new Set([id, ...this._insertsOfChannel(id)]);
    for (const insertId of doomed) {
      if (insertId !== id) this._dropInsert(insertId);
    }
    this._edges = this._edges.filter((e) => !doomed.has(e.from) && !doomed.has(e.to));
    this._nodes.delete(id);
    if (this._selected === id) this._selected = null;
    this._clearReason();
    this._commit();
    return true;
  }

  // node, device and type registry for one insert. Edges are the caller's to filter.
  _dropInsert(id) {
    const device = this._devices.get(id);
    this._nodes.delete(id);
    this._devices.delete(id);
    this._types.delete(id);
    if (this._selected === id) this._selected = null;
    if (device) {
      try {
        device.output.disconnect();
      } catch {
        // already detached
      }
      device.dispose();
    }
  }

  // labels live on the strips; redraw after a rename there
  refresh() {
    this._pushRouting();
    this._render();
    return this;
  }

  _node(id) {
    return this._nodes.get(id) ?? null;
  }

  _label(id) {
    const n = this._node(id);
    if (!n) return null;
    if (n.type === 'master') return MASTER_LABEL;
    if (n.type === 'channel') return this._strips?.[n.ref]?.label ?? n.ref;
    return this._devices.get(id)?.constructor?.label ?? this._types.get(id) ?? id;
  }

  _outEdges(id) {
    return this._edges.filter((e) => e.from === id).sort((a, b) => a.fromPort - b.fromPort);
  }

  _inEdges(id) {
    return this._edges.filter((e) => e.to === id);
  }

  _edgeAt(id, port) {
    return this._edges.find((e) => e.from === id && e.fromPort === port) ?? null;
  }

  // every port in use, plus one free one — the ceiling is what noCap lifts
  _outPortCount(id) {
    const n = this._node(id);
    if (!n || n.type === 'master') return 0;
    const edges = this._outEdges(id);
    const highest = edges.length ? Math.max(...edges.map((e) => e.fromPort)) : -1;
    const want = highest + 2;
    return governor.noCap ? want : Math.min(want, OUT_PORTS);
  }

  // the channel that owns an insert node, walking incoming edges back to a channel
  _ownerChannel(id) {
    let cursor = id;
    for (let i = 0; i < WALK_LIMIT; i++) {
      const incoming = this._inEdges(cursor)[0];
      if (!incoming) return null;
      const from = this._node(incoming.from);
      if (!from) return null;
      if (from.type === 'channel') return from.id;
      cursor = from.id;
    }
    return null;
  }

  _insertsOfChannel(channelId) {
    const out = [];
    for (const n of this._nodes.values()) {
      if (n.type !== 'insert') continue;
      if (this._ownerChannel(n.id) === channelId) out.push(n.id);
    }
    return out;
  }

  // the ordered port-0 device chain hanging off a channel — the strip's serial inserts
  _serialChain(channelId) {
    const chain = [];
    let cursor = channelId;
    for (let i = 0; i < WALK_LIMIT; i++) {
      const edge = this._edgeAt(cursor, 0);
      if (!edge) return { chain, reachesMaster: false };
      const next = this._node(edge.to);
      if (!next) return { chain, reachesMaster: false };
      if (next.type === 'master') return { chain, reachesMaster: true };
      if (next.type !== 'insert') return { chain, reachesMaster: false };
      chain.push(next.id);
      cursor = next.id;
    }
    return { chain, reachesMaster: false };
  }

  // where the port-0 chain ends up, not the next box along it
  _mainDestination(channelId) {
    const { chain, reachesMaster } = this._serialChain(channelId);
    if (reachesMaster) return MASTER_LABEL;
    if (chain.length) return this._label(chain[chain.length - 1]);
    const first = this._edgeAt(channelId, 0);
    return first ? this._label(first.to) : null;
  }

  _isInChain(insertId) {
    const owner = this._ownerChannel(insertId);
    if (!owner) return false;
    return this._serialChain(owner).chain.includes(insertId);
  }

  _reachesMaster(id) {
    const seen = new Set();
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      if (cur === MASTER_ID) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const e of this._outEdges(cur)) stack.push(e.to);
    }
    return false;
  }

  _wouldCycle(from, to) {
    if (from === to) return true;
    const seen = new Set();
    const stack = [to];
    while (stack.length) {
      const cur = stack.pop();
      if (cur === from) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const e of this._outEdges(cur)) stack.push(e.to);
    }
    return false;
  }

  _refuse(reason, nodeId = null) {
    this._reason = reason;
    if (this._mounted) {
      this._renderReason();
      const el = nodeId ? this._nodeEls.get(nodeId) : null;
      if (el) {
        el.removeAttribute('data-refused');
        void el.offsetWidth;
        el.dataset.refused = 'true';
      }
    }
    this._emit('refused', { reason, nodeId });
    return false;
  }

  _clearReason() {
    this._reason = '';
    if (this._mounted) this._renderReason();
  }

  // builds a device and hangs it off the end of a channel's port-0 chain
  addInsert(channelId, type, at = null) {
    const chNode = this._node(channelId);
    if (!chNode || chNode.type !== 'channel') return this._refuse('Pick a channel first.');
    const Ctor = DEVICE_TYPES[type];
    if (!Ctor) return this._refuse(`No device called "${type}".`);
    if (this._devices.size >= CAP_NODES && !governor.noCap) {
      return this._refuse(`Graph is full — ${CAP_NODES} devices.`, channelId);
    }
    if (this._insertsOfChannel(channelId).length >= CAP_INSERTS && !governor.noCap) {
      return this._refuse(`${this._label(channelId)} is full — ${CAP_INSERTS} inserts.`, channelId);
    }
    if (!governor.request(Ctor.estimatedWeight)) {
      return this._refuse(`No headroom for ${Ctor.label}.`, channelId);
    }

    const { chain, reachesMaster } = this._serialChain(channelId);
    const tail = chain.length ? chain[chain.length - 1] : channelId;
    const tailEdge = this._edgeAt(tail, 0);

    const device = new Ctor(this.ctx);
    const id = this._nextInsertId();
    const anchor = this._node(tail);
    const spot = at ?? this._freeSpot(anchor.x + LAY.colStep, anchor.y);
    this._nodes.set(id, { id, type: 'insert', ref: id, x: spot.x, y: spot.y });
    this._devices.set(id, device);
    this._types.set(id, type);

    if (tailEdge) tailEdge.to = id;
    else this._edges.push({ from: tail, fromPort: 0, to: id, toPort: 0 });
    if (reachesMaster || !tailEdge) {
      this._edges.push({ from: id, fromPort: 0, to: MASTER_ID, toPort: 0 });
    }

    this._clearReason();
    this._commit();
    return id;
  }

  // steps down a row until the spot is not already occupied
  _freeSpot(x, y) {
    for (let row = 0; row < WALK_LIMIT; row++) {
      const at = { x, y: y + row * LAY.rowStep };
      const taken = [...this._nodes.values()].some(
        (n) => Math.abs(n.x - at.x) < LAY.colStep && Math.abs(n.y - at.y) < LAY.rowStep
      );
      if (!taken) return at;
    }
    return { x, y };
  }

  _nextInsertId() {
    do {
      this._seq++;
    } while (this._nodes.has(`i${this._seq}`));
    return `i${this._seq}`;
  }

  connect(from, fromPort, to, toPort = 0) {
    const a = this._node(from);
    const b = this._node(to);
    if (!a || !b) return this._refuse('That node is gone.');
    if (toPort !== 0) return this._refuse('Every device is one-in.', to);
    if (from === to) return this._refuse('A cable cannot loop back on itself.', from);
    if (a.type === 'master') return this._refuse('Nothing leaves Master.', from);
    if (b.type === 'channel') return this._refuse('A channel is fed by its instrument.', to);
    if (fromPort < 0 || (fromPort >= OUT_PORTS && !governor.noCap)) {
      return this._refuse('No such port.', from);
    }
    if (this._edgeAt(from, fromPort)) return this._refuse('That port is taken.', from);
    if (b.type === 'insert' && this._inEdges(to).length) {
      return this._refuse('One cable in per device.', to);
    }
    if (this._wouldCycle(from, to)) return this._refuse('That would make a loop.', to);

    if (a.type === 'channel' && fromPort > 0) {
      const sends = this._outEdges(from).filter((e) => e.fromPort > 0).length;
      if (sends >= CAP_SENDS && !governor.noCap) {
        return this._refuse(`${this._label(from)} already has ${CAP_SENDS} sends.`, from);
      }
    }
    if (a.type === 'insert' && fromPort > 0 && this._isInChain(from)) {
      return this._refuse('In the insert chain — branch from the channel.', from);
    }
    if (b.type === 'insert' && !governor.noCap) {
      const owner = a.type === 'channel' ? a.id : this._ownerChannel(from);
      if (owner && this._insertsOfChannel(owner).length >= CAP_INSERTS) {
        return this._refuse(`${this._label(owner)} is full — ${CAP_INSERTS} inserts.`, owner);
      }
    }

    this._edges.push({ from, fromPort, to, toPort: 0 });
    this._clearReason();
    this._commit();
    return true;
  }

  disconnect(from, fromPort) {
    const before = this._edges.length;
    this._edges = this._edges.filter((e) => !(e.from === from && e.fromPort === fromPort));
    if (this._edges.length === before) return false;
    this._clearReason();
    this._commit();
    return true;
  }

  // deletes the node, every edge touching it, and its device, in one operation
  removeNode(id) {
    const n = this._node(id);
    if (!n) return false;
    if (n.type !== 'insert') return this._refuse('Channels and Master stay.', id);

    const incoming = this._inEdges(id)[0] ?? null;
    const forward = this._edgeAt(id, 0);

    this._edges = this._edges.filter((e) => e.from !== id && e.to !== id);
    this._dropInsert(id);

    // the port-0 path closes over the gap so the chain below it keeps its route
    if (incoming && forward && incoming.fromPort === 0) {
      const heals = !this._edgeAt(incoming.from, 0);
      if (heals) this._edges.push({ from: incoming.from, fromPort: 0, to: forward.to, toPort: 0 });
    }

    this._clearReason();
    this._commit();
    return true;
  }

  _commit() {
    this._repatch();
    this._render();
    this._emit('change', this.getState());
  }

  _inputOf(id) {
    const n = this._node(id);
    if (!n) return null;
    if (n.type === 'master') return masterGain;
    if (n.type === 'insert') return this._devices.get(id)?.input ?? null;
    return null;
  }

  _unpatchAll() {
    for (const device of this._devices.values()) {
      try {
        device.output.disconnect();
      } catch {
        // already detached
      }
    }
    if (!this._strips) return;
    for (const n of this._nodes.values()) {
      if (n.type !== 'channel') continue;
      const strip = this._strips[n.ref];
      if (strip) strip.setInserts([]);
    }
  }

  // three passes: slot registry, then channel taps, then every insert's own outputs —
  // every port, on every channel and every device, fans out from the same tap point
  _repatch() {
    if (!this._strips) return;

    for (const n of this._nodes.values()) {
      if (n.type !== 'channel') continue;
      const strip = this._strips[n.ref];
      if (!strip) continue;
      const { chain } = this._serialChain(n.id);
      strip.setInserts(chain.map((cid) => this._devices.get(cid)).filter(Boolean));
    }

    for (const n of this._nodes.values()) {
      if (n.type !== 'channel') continue;
      const strip = this._strips[n.ref];
      if (!strip) continue;
      const tap = strip.postFaderTap;
      tap.disconnect();
      for (const e of this._outEdges(n.id)) {
        const target = this._inputOf(e.to);
        if (target) tap.connect(target);
      }
    }

    for (const [id, device] of this._devices) {
      try {
        device.output.disconnect();
      } catch {
        // already detached
      }
      for (const e of this._outEdges(id)) {
        const target = this._inputOf(e.to);
        if (target) device.output.connect(target);
      }
    }

    this._pushRouting();
  }

  // the strip learns routing here and nowhere else
  _pushRouting() {
    if (!this._strips) return;
    for (const n of this._nodes.values()) {
      if (n.type !== 'channel') continue;
      const strip = this._strips[n.ref];
      if (!strip) continue;
      const { chain } = this._serialChain(n.id);
      const slots = [];
      for (let i = 0; i < CAP_INSERTS; i++) {
        const cid = chain[i];
        if (!cid) {
          slots.push({ slot: i, deviceId: null, label: null, to: null });
          continue;
        }
        const edge = this._edgeAt(cid, 0);
        slots.push({
          slot: i,
          deviceId: this._types.get(cid) ?? null,
          label: this._label(cid),
          to: edge ? this._label(edge.to) : null,
        });
      }
      const out = this._outEdges(n.id).map((e) =>
        (e.fromPort === 0 ? this._mainDestination(n.id) : this._label(e.to)) ?? ''
      );
      strip.setRouting({ slots, out });
    }
  }

  getState() {
    return {
      nodes: [...this._nodes.values()].map((n) => ({
        id: n.id,
        type: n.type,
        ...(n.ref == null ? {} : { ref: n.ref }),
        x: n.x,
        y: n.y,
      })),
      edges: this._edges.map((e) => ({
        from: e.from,
        fromPort: e.fromPort,
        to: e.to,
        toPort: e.toPort,
      })),
    };
  }

  // §7 `channels[].inserts`, keyed by channel id
  getInserts() {
    const out = {};
    for (const n of this._nodes.values()) {
      if (n.type !== 'channel') continue;
      out[n.ref] = this._insertsOfChannel(n.id).map((id) => {
        const device = this._devices.get(id);
        return {
          id,
          type: this._types.get(id) ?? null,
          bypass: !!device?.bypass,
          state: device?.getState() ?? {},
        };
      });
    }
    return out;
  }

  setState(graph, insertsByChannel = null) {
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return false;

    const specs = new Map();
    for (const list of Object.values(insertsByChannel ?? {})) {
      for (const spec of Array.isArray(list) ? list : []) {
        if (spec && spec.id) specs.set(spec.id, spec);
      }
    }

    this._teardownDevices();
    this._nodes.clear();
    this._edges = [];
    this._types.clear();
    this._selected = null;
    this._seq = 0;

    const dropped = [];
    for (const n of graph.nodes) {
      if (!n || !n.id || !n.type) continue;
      if (n.type === 'insert') {
        const spec = specs.get(n.ref ?? n.id);
        const Ctor = spec ? DEVICE_TYPES[spec.type] : null;
        if (!Ctor) {
          dropped.push(n.id);
          continue;
        }
        const device = new Ctor(this.ctx);
        if (spec.state) device.setState(spec.state);
        device.bypass = !!spec.bypass;
        this._devices.set(n.id, device);
        this._types.set(n.id, spec.type);
      }
      this._nodes.set(n.id, {
        id: n.id,
        type: n.type,
        ref: n.ref ?? null,
        x: Number.isFinite(n.x) ? n.x : 0,
        y: Number.isFinite(n.y) ? n.y : 0,
      });
      const seq = /^i(\d+)$/.exec(n.id);
      if (seq) this._seq = Math.max(this._seq, Number(seq[1]));
    }

    for (const e of graph.edges) {
      if (!e || !this._nodes.has(e.from) || !this._nodes.has(e.to)) continue;
      this._edges.push({
        from: e.from,
        fromPort: Number.isFinite(e.fromPort) ? e.fromPort : 0,
        to: e.to,
        toPort: Number.isFinite(e.toPort) ? e.toPort : 0,
      });
    }

    if (dropped.length) this._refuse(`No device for ${dropped.join(', ')} — dropped.`);
    else this._clearReason();
    this._commit();
    return true;
  }

  _teardownDevices() {
    for (const device of this._devices.values()) {
      try {
        device.output.disconnect();
      } catch {
        // already detached
      }
      device.dispose();
    }
    this._devices.clear();
  }

  mountCompact(el) {
    if (this._mounted) this.unmount();
    if (!el) throw new TypeError('Graph.mountCompact: needs a container element');
    acquireStyle();
    this.el = el;

    const root = document.createElement('div');
    root.className = 'cbdaw-graph';

    const bar = document.createElement('div');
    bar.className = 'cbdaw-graph__bar';
    for (const type of DEVICE_ORDER) {
      const chip = document.createElement('button');
      chip.className = 'cbdaw-graph__chip';
      chip.type = 'button';
      chip.dataset.device = type;
      chip.textContent = `+ ${DEVICE_TYPES[type].label}`;
      this._addListener(chip, 'click', () => this._addFromPalette(type));
      bar.appendChild(chip);
    }
    const reason = document.createElement('div');
    reason.className = 'cbdaw-graph__reason';
    bar.appendChild(reason);
    root.appendChild(bar);

    const canvas = document.createElement('div');
    canvas.className = 'cbdaw-graph__canvas';
    const sheet = document.createElement('div');
    sheet.className = 'cbdaw-graph__sheet';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'cbdaw-graph__wires');
    sheet.appendChild(svg);
    canvas.appendChild(sheet);
    root.appendChild(canvas);

    el.appendChild(root);
    this.wrap = root;
    this._bar = bar;
    this._reasonEl = reason;
    this._canvas = canvas;
    this._sheet = sheet;
    this._svg = svg;
    this._mounted = true;

    this._addListener(canvas, 'pointermove', (e) => this._onPointerMove(e));
    this._addListener(canvas, 'pointerup', (e) => this._onPointerUp(e));
    this._addListener(canvas, 'pointercancel', () => this._endDrags());
    this._addListener(canvas, 'pointerdown', (e) => {
      if (e.target === canvas || e.target === sheet) this._select(null);
    });

    this._render();
  }

  unmount() {
    this._endDrags();
    for (const id of [...this._nodeEls.keys()]) this._dropNodeEl(id);
    for (const off of this._cleanup) off();
    this._cleanup = [];
    if (this.wrap && this.wrap.parentNode) this.wrap.parentNode.removeChild(this.wrap);
    this.wrap = null;
    this._nodeEls.clear();
    this._nodeCleanup.clear();
    this._svg = null;
    this._sheet = null;
    this._canvas = null;
    this._bar = null;
    this._reasonEl = null;
    if (this._mounted) releaseStyle();
    this._mounted = false;
    this.el = null;
  }

  dispose() {
    this.unmount();
    this._unpatchAll();
    this._teardownDevices();
    this._nodes.clear();
    this._edges = [];
    this._types.clear();
    this._listeners.clear();
    this._strips = null;
  }

  _addListener(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._cleanup.push(() => target.removeEventListener(type, fn, opts));
  }

  _render() {
    if (!this._mounted) return;
    this._renderNodes();
    this._renderReason();
    this._renderEdges();
  }

  _renderReason() {
    if (!this._reasonEl) return;
    if (this._reason) {
      this._reasonEl.textContent = this._reason;
      this._reasonEl.dataset.kind = 'refused';
      return;
    }
    const sel = this._selected ? this._label(this._selected) : null;
    this._reasonEl.textContent = sel
      ? `${sel} selected — pick a device to add, or drag a port to a device.`
      : 'Pick a channel, then a device. Drag a port to build a branch.';
    this._reasonEl.dataset.kind = 'hint';
  }

  _renderNodes() {
    const live = new Set();
    for (const n of this._nodes.values()) {
      live.add(n.id);
      let el = this._nodeEls.get(n.id);
      if (el && Number(el.dataset.outs) !== this._outPortCount(n.id)) {
        this._dropNodeEl(n.id);
        el = null;
      }
      if (!el) {
        el = this._buildNode(n);
        this._nodeEls.set(n.id, el);
        this._sheet.appendChild(el);
      }
      el.style.left = `${n.x}px`;
      el.style.top = `${n.y}px`;
      el.dataset.selected = String(this._selected === n.id);
      el.dataset.dimmed = String(!this._reachesMaster(n.id));
      el.querySelector('.cbdaw-graph__node-name').textContent = this._label(n.id) ?? n.id;
      const body = el.querySelector('.cbdaw-graph__node-body span');
      if (body) body.textContent = this._bodyText(n);
      for (const port of el.querySelectorAll('.cbdaw-graph__port--out')) {
        port.dataset.used = String(!!this._edgeAt(n.id, Number(port.dataset.port)));
      }
    }
    for (const id of [...this._nodeEls.keys()]) {
      if (!live.has(id)) this._dropNodeEl(id);
    }
    this._resizeSheet();
  }

  _bodyText(n) {
    if (n.type === 'master') return `${this._inEdges(n.id).length} in`;
    if (n.type === 'channel') {
      const chain = this._serialChain(n.id).chain.length;
      const sends = this._outEdges(n.id).filter((e) => e.fromPort > 0).length;
      return `${chain}/${CAP_INSERTS} inserts · ${sends}/${CAP_SENDS} sends`;
    }
    const device = this._devices.get(n.id);
    if (!device) return '';
    return `${device.cpuWeight} · ${device.bypass ? 'bypassed' : 'on'}`;
  }

  _buildNode(n) {
    const offs = [];
    const add = (target, type, fn) => {
      target.addEventListener(type, fn);
      offs.push(() => target.removeEventListener(type, fn));
    };
    this._nodeCleanup.set(n.id, offs);

    const el = document.createElement('div');
    el.className = 'cbdaw-graph__node';
    el.dataset.node = n.id;
    el.dataset.type = n.type;

    const head = document.createElement('div');
    head.className = 'cbdaw-graph__node-head';
    const name = document.createElement('div');
    name.className = 'cbdaw-graph__node-name';
    head.appendChild(name);
    if (n.type === 'insert') {
      const kill = document.createElement('button');
      kill.className = 'cbdaw-graph__node-kill';
      kill.type = 'button';
      kill.textContent = '×';
      kill.title = 'Delete';
      add(kill, 'click', (e) => {
        e.stopPropagation();
        this.removeNode(n.id);
      });
      head.appendChild(kill);
    }
    el.appendChild(head);

    const body = document.createElement('div');
    body.className = 'cbdaw-graph__node-body';
    body.appendChild(document.createElement('span'));
    el.appendChild(body);

    if (n.type !== 'channel') {
      const inPort = document.createElement('div');
      inPort.className = 'cbdaw-graph__port cbdaw-graph__port--in';
      inPort.dataset.port = '0';
      el.appendChild(inPort);
    }
    const outCount = this._outPortCount(n.id);
    el.dataset.outs = String(outCount);
    if (outCount) {
      const outs = document.createElement('div');
      outs.className = 'cbdaw-graph__outs';
      for (let p = 0; p < outCount; p++) {
        const out = document.createElement('div');
        out.className = 'cbdaw-graph__port cbdaw-graph__port--out';
        out.dataset.port = String(p);
        out.title = p === 0 ? 'Main path' : `Send ${p}`;
        add(out, 'pointerdown', (e) => this._startCable(e, n.id, p));
        outs.appendChild(out);
      }
      el.appendChild(outs);
    }

    add(head, 'pointerdown', (e) => this._startNodeDrag(e, n.id));
    add(el, 'pointerdown', () => this._select(n.id));
    add(el, 'dblclick', () => {
      const device = this._devices.get(n.id);
      if (device && this._onDevicePopout) this._onDevicePopout(device, n.id);
    });
    add(el, 'animationend', () => el.removeAttribute('data-refused'));
    return el;
  }

  _dropNodeEl(id) {
    for (const off of this._nodeCleanup.get(id) ?? []) off();
    this._nodeCleanup.delete(id);
    this._nodeEls.get(id)?.remove();
    this._nodeEls.delete(id);
  }

  _resizeSheet() {
    let w = 0;
    let h = 0;
    for (const [id, el] of this._nodeEls) {
      const n = this._node(id);
      if (!n) continue;
      w = Math.max(w, n.x + el.offsetWidth);
      h = Math.max(h, n.y + el.offsetHeight);
    }
    this._sheet.style.minWidth = `calc(${w}px + var(--sp-8))`;
    this._sheet.style.minHeight = `calc(${h}px + var(--sp-8))`;
  }

  _portPoint(id, port, side) {
    const el = this._nodeEls.get(id);
    const n = this._node(id);
    if (!el || !n) return null;
    const sel = side === 'out' ? `.cbdaw-graph__port--out[data-port="${port}"]` : '.cbdaw-graph__port--in';
    const p = el.querySelector(sel);
    if (!p) return null;
    let x = p.offsetWidth / 2;
    let y = p.offsetHeight / 2;
    for (let cur = p; cur && cur !== el; cur = cur.offsetParent) {
      x += cur.offsetLeft;
      y += cur.offsetTop;
    }
    return { x: n.x + x, y: n.y + y };
  }

  _renderEdges() {
    while (this._svg.firstChild) this._svg.removeChild(this._svg.firstChild);
    for (const e of this._edges) {
      const a = this._portPoint(e.from, e.fromPort, 'out');
      const b = this._portPoint(e.to, 0, 'in');
      if (!a || !b) continue;
      const d = curve(a, b);
      const hit = document.createElementNS(SVG_NS, 'path');
      hit.setAttribute('class', 'cbdaw-graph__wire-hit');
      hit.setAttribute('d', d);
      hit.addEventListener('click', () => this.disconnect(e.from, e.fromPort));
      this._svg.appendChild(hit);

      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', 'cbdaw-graph__wire');
      path.setAttribute('d', d);
      path.dataset.branch = String(e.fromPort > 0);
      path.dataset.dimmed = String(!this._reachesMaster(e.from));
      path.addEventListener('click', () => this.disconnect(e.from, e.fromPort));
      this._svg.appendChild(path);
    }
    if (this._dragCable) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', 'cbdaw-graph__wire cbdaw-graph__wire--drag');
      path.setAttribute('d', curve(this._dragCable.from, this._dragCable.to));
      this._svg.appendChild(path);
    }
  }

  _select(id) {
    this._selected = id;
    this._clearReason();
    this._render();
  }

  _addFromPalette(type) {
    const sel = this._selected;
    const n = sel ? this._node(sel) : null;
    if (!n) return this._refuse('Pick a channel first.');
    const channelId = n.type === 'channel' ? n.id : this._ownerChannel(n.id);
    if (!channelId) return this._refuse('Pick a channel first.', sel);
    return this.addInsert(channelId, type);
  }

  _localPoint(e) {
    const rect = this._sheet.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _startNodeDrag(e, id) {
    const n = this._node(id);
    if (!n) return;
    const p = this._localPoint(e);
    this._dragNode = { id, dx: p.x - n.x, dy: p.y - n.y };
    const el = this._nodeEls.get(id);
    if (el) el.dataset.dragging = 'true';
    try {
      this._canvas.setPointerCapture(e.pointerId);
    } catch {
      // not capturable
    }
  }

  _startCable(e, id, port) {
    e.stopPropagation();
    const a = this._portPoint(id, port, 'out');
    if (!a) return;
    this._dragCable = { id, port, from: a, to: a };
    try {
      this._canvas.setPointerCapture(e.pointerId);
    } catch {
      // not capturable
    }
    this._renderEdges();
  }

  _onPointerMove(e) {
    if (this._dragNode) {
      const p = this._localPoint(e);
      const n = this._node(this._dragNode.id);
      if (n) {
        n.x = Math.max(0, p.x - this._dragNode.dx);
        n.y = Math.max(0, p.y - this._dragNode.dy);
        const el = this._nodeEls.get(n.id);
        if (el) {
          el.style.left = `${n.x}px`;
          el.style.top = `${n.y}px`;
        }
        this._renderEdges();
      }
      return;
    }
    if (this._dragCable) {
      this._dragCable.to = this._localPoint(e);
      this._markTarget(e);
      this._renderEdges();
    }
  }

  _markTarget(e) {
    for (const el of this._nodeEls.values()) {
      for (const p of el.querySelectorAll('.cbdaw-graph__port--in')) p.removeAttribute('data-target');
    }
    const hit = this._hitNode(e);
    if (!hit) return;
    const port = this._nodeEls.get(hit)?.querySelector('.cbdaw-graph__port--in');
    if (port) port.dataset.target = 'true';
  }

  _hitNode(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const nodeEl = el?.closest?.('.cbdaw-graph__node');
    return nodeEl?.dataset.node ?? null;
  }

  _onPointerUp(e) {
    if (this._dragCable) {
      const target = this._hitNode(e);
      const { id, port } = this._dragCable;
      this._dragCable = null;
      if (target && target !== id) this.connect(id, port, target, 0);
      else this._render();
    }
    this._endDrags();
  }

  // re-renders only when a drag was live — a redraw here would eat a cable click
  _endDrags() {
    const wasDragging = !!this._dragNode || !!this._dragCable;
    if (this._dragNode) {
      const el = this._nodeEls.get(this._dragNode.id);
      if (el) el.removeAttribute('data-dragging');
      this._dragNode = null;
      this._resizeSheet();
    }
    this._dragCable = null;
    if (!this._mounted || !wasDragging) return;
    for (const el of this._nodeEls.values()) {
      for (const p of el.querySelectorAll('.cbdaw-graph__port--in')) p.removeAttribute('data-target');
    }
    this._renderEdges();
  }
}

// bezier control offset, proportional to the span it bridges
function curve(a, b) {
  const dx = Math.abs(b.x - a.x) * 0.5 + Math.abs(b.y - a.y) * 0.35;
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y} ${b.x - dx} ${b.y} ${b.x} ${b.y}`;
}

export { DEVICE_TYPES, CAP_INSERTS, CAP_SENDS, CAP_NODES };

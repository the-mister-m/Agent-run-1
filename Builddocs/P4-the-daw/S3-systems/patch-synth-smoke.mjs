// throwaway harness: minimal Web Audio stub, exercises patch-synth.js construction paths
const disconnected = { n: 0 };
class P {
  constructor(v) { this.value = v; }
  setValueAtTime(v) { this.value = v; return this; }
  linearRampToValueAtTime(v) { this.value = v; return this; }
  cancelScheduledValues() { return this; }
}
class N {
  constructor(kind) { this.kind = kind; this._conn = []; }
  connect(x) { this._conn.push(x); return x; }
  disconnect() { disconnected.n++; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
class Osc extends N { constructor() { super('osc'); this.frequency = new P(440); this.detune = new P(0); this.type = 'sine'; } }
class Gain extends N { constructor() { super('gain'); this.gain = new P(1); } }
class Biquad extends N { constructor() { super('biquad'); this.frequency = new P(350); this.Q = new P(1); this.type = 'lowpass'; } }
class Const extends N { constructor() { super('const'); this.offset = new P(0); } }
class Buf extends N { constructor() { super('buf'); this.buffer = null; this.loop = false; } }
class An extends N { constructor() { super('analyser'); this.fftSize = 2048; this.maxDecibels = -30; } }

const ctx = {
  currentTime: 0,
  sampleRate: 48000,
  createOscillator: () => new Osc(),
  createGain: () => new Gain(),
  createBiquadFilter: () => new Biquad(),
  createConstantSource: () => new Const(),
  createBufferSource: () => new Buf(),
  createAnalyser: () => new An(),
  createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
};

// loads the real source with its one import swapped for a governor stub, so no
// AudioContext is ever constructed
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '../../../src/instruments/patch-synth.js'), 'utf8').replace(
  /^import \{ governor \}.*$/m,
  'const governor = { noCap: false, request() { return true; } };'
);
const mod = await import(
  'data:text/javascript;base64,' + Buffer.from(src, 'utf8').toString('base64')
);
const PatchSynth = mod.default;

const out = new Gain();
const ps = new PatchSynth(ctx, out);

const results = [];
const ok = (label, cond) => results.push(`${cond ? 'PASS' : 'FAIL'}  ${label}`);

ok('starts with exactly the out node', ps.nodeCount === 1 && ps.listNodes()[0].kind === 'out');
ok('out node refuses a second copy', ps.addNode('out').ok === false);
ok('unknown kind refused', ps.addNode('flanger').ok === false);

const a = ps.addNode('osc', 10, 10);
const f = ps.addNode('filter', 120, 10);
const g = ps.addNode('gain', 240, 10);
const l = ps.addNode('lfo', 10, 140);
const e = ps.addNode('env', 10, 260);
const nz = ps.addNode('noise', 10, 380);
ok('six kinds add', [a, f, g, l, e, nz].every((r) => r.ok));
ok('ids are kind+n', a.node.id === 'osc1');

ok('cpuWeight sums nodes + analyser', ps.cpuWeight === 2 + 1 + 9 + 9 + 1 + 10 + 1 + 9);

ok('control sink built with span', f.node.sink('cutoff').gain.value === 5000);
ok('sink adds to weight', f.node.weight === 10);
ok('audio domain port has no sink', f.node.sink('in') === null);
ok('trigger port has no sink', e.node.sink('gate') === null);

ps.setParam('osc.wave', 'saw');
ok('kind alias resolves to first of kind', ps.getParam('osc1.wave') === 'saw');
ps.setParam('osc1.octave', 99);
ok('int param clamps', ps.getParam('osc1.octave') === 2);
ps.setParam('filter1.cutoff', 999999);
ok('float param clamps', ps.getParam('filter1.cutoff') === 18000);
ps.setParam('env1.attack', 'banana');
ok('non-numeric rejected', ps.getParam('env1.attack') === 0.01);
ok('unknown path returns undefined', ps.getParam('nope.nope') === undefined);

while (ps.nodeCount < 24) {
  const r = ps.addNode('gain');
  if (!r.ok) break;
}
ok('fills to the cap', ps.nodeCount === 24);
const over = ps.addNode('gain');
ok('cap refuses visibly', over.ok === false && typeof over.reason === 'string');
ok('refusal is recorded', ps.lastRefusal && ps.lastRefusal.reason === over.reason);
ok('refused node was not created', ps.nodeCount === 24);

ok('math group closed on first load', ps.groupOpen.math === false);
ok('other groups open', ps.groupOpen.source && ps.groupOpen.modulator && ps.groupOpen.processor);

ps.noteOn(60, 0.5);
ok('voiceCount 1 while held', ps.voiceCount === 1);
ps.noteOff(60);
ok('voiceCount 1 during release tail', ps.voiceCount === 1);

const st = JSON.parse(JSON.stringify(ps.getState()));
ok('state is JSON safe', typeof st === 'object' && Array.isArray(st.nodes));
const before = ps.getState();
ps.setState(st);
const after = ps.getState();
ok('node round-trip is lossless', JSON.stringify(before.nodes) === JSON.stringify(after.nodes));
ok('one out node survives round-trip', after.nodes.filter((n) => n.kind === 'out').length === 1);

const d = ps.dispose();
ok('dispose reports disconnects', d.nodesDisconnected > 0);
ok('dispose empties the patch', ps.nodeCount === 0);
ok('voiceCount zero after dispose', ps.voiceCount === 0);

// ---- cables, math nodes, the parallel chain -------------------------------------------
const p = new PatchSynth(ctx, new Gain());
const osc = p.addNode('osc').node;
const fa = p.addNode('filter').node;
const fb = p.addNode('filter').node;
const gn = p.addNode('gain').node;
const lfo = p.addNode('lfo').node;
const env = p.addNode('env').node;

ok('audio to audio connects', p.connect('osc1', 'out', 'filter1', 'in').ok === true);
ok('cable is listed', p.listCables().length === 1);
ok('output fans out to a second input', p.connect('osc1', 'out', 'filter2', 'in').ok === true);
ok('two branches recombine at one gain',
  p.connect('filter1', 'out', 'gain1', 'in').ok && p.connect('filter2', 'out', 'gain1', 'in').ok);
ok('gain reaches out', p.connect('gain1', 'out', 'out1', 'in').ok === true);
ok('parallel chain is five cables', p.listCables().length === 5);

ok('the same cable twice is refused', p.connect('osc1', 'out', 'filter1', 'in').ok === false);
ok('control into audio is refused', p.connect('lfo1', 'out', 'gain1', 'in').ok === false);
ok('audio into control is refused', p.connect('osc1', 'out', 'filter1', 'cutoff').ok === false);
ok('trigger port is refused', p.connect('env1', 'out', 'env1', 'gate').ok === false);
ok('self patch is refused', p.connect('osc1', 'out', 'osc1', 'freq').ok === false);
ok('a loop is refused', p.connect('gain1', 'out', 'filter1', 'in').ok === false);
ok('a refusal names a port', p.lastRefusal.where && p.lastRefusal.where.node === 'filter1');

ok('control to control connects', p.connect('lfo1', 'out', 'filter1', 'cutoff').ok === true);
ok('the span sink was built', fa.sink('cutoff').gain.value === 5000);
ok('a taken control input refuses a second cable',
  p.connect('env1', 'out', 'filter1', 'cutoff').ok === false);

ok('envelope names its four stages',
  KINDSOF(p, 'env').map((x) => x.label).join(' ') === 'Attack Decay Sustain Release');

const mAdd = p.addNode('add').node;
const mMul = p.addNode('multiply').node;
const mScale = p.addNode('scale').node;
const mInv = p.addNode('invert').node;
ok('four math kinds add', [mAdd, mMul, mScale, mInv].every((n) => n && n.spec.group === 'math'));
ok('math is the last palette group', PatchSynth.groups[PatchSynth.groups.length - 1].id === 'math');
ok('scale costs three nodes', mScale.spec.weight === 3);
ok('invert is a gain at minus one', mInv._nodes.gain.gain.value === -1);

p.setParam('add1.b', 0.5);
ok('add b param drives its constant', mAdd._nodes.k.offset.value === 0.5);
ok('add b port accepts a cable', p.connect('lfo1', 'out', 'add1', 'b').ok === true);
ok('a patched b port zeroes its constant', mAdd._nodes.k.offset.value === 0);
ok('the port reports itself connected', mAdd.portIsConnected('b') === true);
p.setParam('add1.b', 0.8);
ok('the param no longer drives a patched port', mAdd._nodes.k.offset.value === 0);
ok('math out is control', p.connect('add1', 'out', 'multiply1', 'a').ok === true);
ok('multiply b is an AudioParam sink', mMul.paramTarget('b') === mMul._nodes.gain.gain);

const withCables = JSON.parse(JSON.stringify(p.getState()));
ok('cables are JSON safe', Array.isArray(withCables.cables) && withCables.cables.length === 8);
ok('a cable carries four ends and an id',
  Object.keys(withCables.cables[0]).sort().join(',') === 'from,fromPort,id,to,toPort');
const beforeCables = JSON.stringify(p.getState());
p.setState(withCables);
ok('cables round-trip losslessly', JSON.stringify(p.getState()) === beforeCables);

const cablesBefore = p.listCables().length;
p.removeNode('filter2');
ok('removing a node drops its cables', p.listCables().length === cablesBefore - 2);

const one = p.listCables()[0];
ok('disconnect frees the input', p.disconnect(one.id).ok === true);
ok('the freed input takes a new cable', p.connect(one.from, one.fromPort, one.to, one.toPort).ok === true);
ok('unknown cable is refused', p.disconnect('e999').ok === false);

ok('governor noCap is honoured', p.nodeCap === 24);
p.dispose();
ok('dispose clears every cable', p.listCables().length === 0);

function KINDSOF(inst, kind) {
  return inst.constructor.kinds[kind].params;
}

console.log(results.join('\n'));
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME FAILED' : '\nALL PASS');

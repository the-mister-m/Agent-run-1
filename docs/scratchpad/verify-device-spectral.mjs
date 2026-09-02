// verify-device-spectral.mjs — throwaway node harness for the device-spectral seat.
// Named in receipt-device-spectral.md.
//   node "docs/scratchpad/verify-device-spectral.mjs"
// Fakes AudioContext/AudioNode only (no document/DOM). Checks the parts of eq.js that
// never touch DOM: constructor graph, setParam/getParam, getState/setState round-trip,
// bypass, getAnalyser dispatch, cpuWeight, dispose. Pixel/pointer behaviour is checked by
// docs/scratchpad/device-spectral-test.html in a real browser.

class FakeParam {
  constructor(v) { this.value = v; }
  setValueAtTime(v) { this.value = v; return this; }
  linearRampToValueAtTime(v) { this.value = v; return this; }
  setTargetAtTime(v) { this.value = v; return this; }
  cancelScheduledValues() { return this; }
}
class FakeNode {
  constructor() {
    this.gain = new FakeParam(1);
    this.frequency = new FakeParam(440);
    this.Q = new FakeParam(1);
    this.type = 'peaking';
    this._connections = [];
  }
  connect(dest) { this._connections.push(dest); return dest; }
  disconnect() { this._connections = []; }
  getFrequencyResponse(freqs, mag, phase) {
    for (let i = 0; i < freqs.length; i++) { mag[i] = 1; phase[i] = 0; }
  }
}
class FakeAnalyser extends FakeNode {
  constructor() { super(); this.fftSize = 2048; this.frequencyBinCount = 1024; }
}
class FakeCtx {
  constructor() { this.currentTime = 0; this.sampleRate = 48000; }
  createGain() { return new FakeNode(); }
  createBiquadFilter() { return new FakeNode(); }
  createAnalyser() { return new FakeAnalyser(); }
}

const results = [];
function check(name, cond) { results.push({ name, pass: !!cond }); }

const { default: EQ } = await import('../../src/devices/eq.js');

check('static id', EQ.id === 'eq');
check('static label', EQ.label === 'EQ');
check('estimatedWeight is 29', EQ.estimatedWeight === 29);
check('params has 9 entries (3 bands x 3)', EQ.params.length === 9);
check(
  'params order is band0.gain,freq,q ... band2.q',
  EQ.params.map((p) => p.path).join(',') ===
    ['band0.gain', 'band0.freq', 'band0.q', 'band1.gain', 'band1.freq', 'band1.q', 'band2.gain', 'band2.freq', 'band2.q'].join(',')
);
check('every label is exactly Gain/Freq/Q', EQ.params.every((p) => ['Gain', 'Freq', 'Q'].includes(p.label)));
check('gain range -24..24, unit dB', EQ.params.filter((p) => p.label === 'Gain').every((p) => p.min === -24 && p.max === 24 && p.unit === 'dB'));
check('freq range 20..20000, unit Hz, log', EQ.params.filter((p) => p.label === 'Freq').every((p) => p.min === 20 && p.max === 20000 && p.unit === 'Hz' && p.curve === 'log'));
check('q range 0.1..18, unit empty string', EQ.params.filter((p) => p.label === 'Q').every((p) => p.min === 0.1 && p.max === 18 && p.unit === ''));

const ctx = new FakeCtx();
const eq = new EQ(ctx);

check('input is an AudioNode-shaped object', typeof eq.input.connect === 'function');
check('output is an AudioNode-shaped object', typeof eq.output.connect === 'function');
check('input and output are stable across calls', eq.input === eq.input && eq.output === eq.output);
check('bypass defaults false', eq.bypass === false);

eq.setParam('band0.gain', 6);
eq.setParam('band0.freq', 120);
eq.setParam('band0.q', 2);
eq.setParam('band1.gain', -8);
eq.setParam('band2.q', 40); // out of range, must clamp

check('getParam reflects set value', eq.getParam('band0.gain') === 6);
check('getParam clamps out-of-range', eq.getParam('band2.q') === 18);
check('unknown path is a no-op', (() => { eq.setParam('band0.bogus', 5); return eq.getParam('band0.bogus') === undefined; })());

const state = eq.getState();
check('getState has all 9 param paths', EQ.params.every((p) => Object.prototype.hasOwnProperty.call(state, p.path)));
check('getState is JSON-safe', JSON.stringify(state) === JSON.stringify(JSON.parse(JSON.stringify(state))));

const json = JSON.parse(JSON.stringify(state));
const eq2 = new EQ(ctx);
eq2.setState(json);
check('setState round-trips getState exactly', JSON.stringify(eq2.getState()) === JSON.stringify(json));
eq2.dispose();

eq.bypass = true;
check('bypass setter/getter round-trips', eq.bypass === true);
eq.bypass = false;
check('bypass toggles back', eq.bypass === false);

check("getAnalyser('spectrum') returns the analyser", eq.getAnalyser('spectrum') instanceof FakeAnalyser);
check("getAnalyser('scope') returns null", eq.getAnalyser('scope') === null);
check('readout is null', eq.readout === null);
check('cpuWeight equals estimatedWeight', eq.cpuWeight === EQ.estimatedWeight);

let threw = false;
try {
  eq.dispose();
  eq.dispose();
} catch (e) {
  threw = true;
}
check('dispose is idempotent (no throw on double dispose)', threw === false);

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} — ${r.name}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);

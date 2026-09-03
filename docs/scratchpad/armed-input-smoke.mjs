// Headless harness — job 5, armed input routing.
// Covers the arm gate on core/track-bus.js and the armed field on core/tracks.js.
// No DOM: arrangement.js and daw-shell.js are NOT exercised here.
// Run: node docs/scratchpad/armed-input-smoke.mjs

import { createTrackBus } from '../../src/core/track-bus.js';
import { createTrackStore } from '../../src/core/tracks.js';

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) { pass++; return; }
  fail++;
  console.error('FAIL:', label);
}

function eq(label, got, want) {
  ok(`${label} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`, got === want);
}

/** Records every noteOn/noteOff it is handed. */
function fakeInstrument() {
  const log = [];
  return {
    log,
    noteOn(n, v) { log.push(['on', n, v]); },
    noteOff(n) { log.push(['off', n]); },
    allNotesOff() { log.push(['panic']); },
    get ons() { return log.filter((e) => e[0] === 'on').length; },
    get offs() { return log.filter((e) => e[0] === 'off').length; },
  };
}

// ——— 1 · the gate ————————————————————————————————————————————————————————————————
{
  const inst = fakeInstrument();
  const bus = createTrackBus({ id: 'trk1', instrument: inst });

  eq('new bus is unarmed', bus.armed, false);

  for (const source of ['mouse', 'touch', 'circle', 'diatonic']) {
    eq(`unarmed still sounds ${source}`, bus.emitNoteOn({ note: 60, source }), true);
    bus.emitNoteOff({ note: 60, source });
  }

  eq('unarmed drops key', bus.emitNoteOn({ note: 60, source: 'key' }), false);
  eq('unarmed drops midi', bus.emitNoteOn({ note: 60, source: 'midi' }), false);
  eq('dropped key sounded nothing', bus.activeNotes.length, 0);

  bus.armed = true;
  eq('armed accepts key', bus.emitNoteOn({ note: 60, source: 'key' }), true);
  eq('armed accepts midi (same note, refcount)', bus.emitNoteOn({ note: 60, source: 'midi' }), false);
  eq('one note sounding', bus.activeNotes.length, 1);
  bus.emitNoteOff({ note: 60, source: 'key' });
  bus.emitNoteOff({ note: 60, source: 'midi' });
  eq('both released', bus.activeNotes.length, 0);
}

// ——— 2 · arm layers, buses do not cross ————————————————————————————————————————
{
  const a = fakeInstrument();
  const b = fakeInstrument();
  const c = fakeInstrument();
  const busA = createTrackBus({ id: 'a', instrument: a, armed: true });
  const busB = createTrackBus({ id: 'b', instrument: b, armed: true });
  const busC = createTrackBus({ id: 'c', instrument: c });

  for (const bus of [busA, busB, busC]) bus.emitNoteOn({ note: 64, source: 'key' });

  eq('armed A sounded', a.ons, 1);
  eq('armed B sounded', b.ons, 1);
  eq('unarmed C silent', c.ons, 0);
}

// ——— 3 · mouse stays ungated on an unarmed track ————————————————————————————————
{
  const inst = fakeInstrument();
  const bus = createTrackBus({ id: 'trk', instrument: inst });
  bus.emitNoteOn({ note: 48, source: 'mouse' });
  eq('unarmed lane still plays by mouse', inst.ons, 1);
}

// ——— 4 · disarm releases only the gated routes ————————————————————————————————
{
  const inst = fakeInstrument();
  const bus = createTrackBus({ id: 'trk', instrument: inst, armed: true });
  bus.emitNoteOn({ note: 60, source: 'key' });
  bus.emitNoteOn({ note: 62, source: 'mouse' });
  eq('two sounding', bus.activeNotes.length, 2);

  bus.armed = false;
  eq('key note released on disarm', bus.activeNotes.includes(60), false);
  eq('mouse note survives disarm', bus.activeNotes.includes(62), true);
  eq('no instrument panic on disarm', inst.log.some((e) => e[0] === 'panic'), false);

  eq('key is dead after disarm', bus.emitNoteOn({ note: 65, source: 'key' }), false);
  eq('mouse still live after disarm', bus.emitNoteOn({ note: 67, source: 'mouse' }), true);
}

// ——— 5 · a key held across disarm does not stick ————————————————————————————————
{
  const inst = fakeInstrument();
  const bus = createTrackBus({ id: 'trk', instrument: inst, armed: true });
  bus.emitNoteOn({ note: 72, source: 'key' });
  bus.armed = false;
  eq('note off fired once', inst.offs, 1);
  // the late key-up from the surface must be a harmless no-op
  eq('late key-up is a no-op', bus.emitNoteOff({ note: 72, source: 'key' }), false);
  eq('still one note off total', inst.offs, 1);
  bus.armed = true;
  eq('re-arm leaves nothing sounding', bus.activeNotes.length, 0);
}

// ——— 6 · dispose resets the gate ————————————————————————————————————————————————
{
  const bus = createTrackBus({ id: 'trk', armed: true });
  bus.dispose();
  eq('disposed bus is unarmed', bus.armed, false);
}

// ——— 7 · the store field ————————————————————————————————————————————————————————
{
  const store = createTrackStore();
  const t1 = store.add({ name: 'one' });
  const t2 = store.add({ name: 'two' });
  const t3 = store.add({ name: 'three' });

  eq('track born unarmed', t1.armed, false);
  eq('armedIds empty', store.armedIds.length, 0);

  const events = [];
  store.on('update', (t) => events.push(t.id));

  store.setArmed(t1.id, true);
  store.setArmed(t3.id, true);
  eq('two armed, in list order', store.armedIds.join(','), `${t1.id},${t3.id}`);
  eq('arming t1 did not disarm t3', store.get(t1.id).armed, true);
  eq('t2 untouched', store.get(t2.id).armed, false);
  eq('one update event per real change', events.length, 2);

  store.setArmed(t1.id, true);
  eq('no-op arm publishes nothing', events.length, 2);

  store.setArmed(t1.id, false);
  eq('disarm is per track', store.armedIds.join(','), t3.id);

  eq('setArmed on a missing track', store.setArmed('nope', true), null);
  eq('record still frozen', Object.isFrozen(store.get(t3.id)), true);

  // armed must survive the other mutators
  store.setInstrumentType(t3.id, 'wave-synth');
  eq('armed survives setInstrumentType', store.get(t3.id).armed, true);
  store.setSurfaceType(t3.id, 'keyboard');
  eq('armed survives setSurfaceType', store.get(t3.id).armed, true);
  store.update(t3.id, { name: 'renamed' });
  eq('armed survives update', store.get(t3.id).armed, true);
  store.setInstrument(t3.id, {});
  eq('armed survives setInstrument', store.get(t3.id).armed, true);
}

// ——— 8 · the MIDI fan-out shape, without a DOM ————————————————————————————————
// Mirrors daw-shell.js's two listeners: offer every note to every bus, let each gate decide.
{
  const armedInst = fakeInstrument();
  const idleInst = fakeInstrument();
  const buses = new Map([
    ['a', createTrackBus({ id: 'a', instrument: armedInst, armed: true })],
    ['b', createTrackBus({ id: 'b', instrument: idleInst })],
  ]);

  const fanOn = (e) => {
    if (e.source !== 'midi') return;
    for (const bus of buses.values()) bus.emitNoteOn({ note: e.note, velocity: e.velocity, source: 'midi' });
  };
  const fanOff = (e) => {
    if (e.source !== 'midi') return;
    for (const bus of buses.values()) bus.emitNoteOff({ note: e.note, source: 'midi' });
  };

  fanOn({ note: 60, velocity: 0.5, source: 'midi' });
  eq('midi reached the armed track', armedInst.ons, 1);
  eq('midi velocity survived', armedInst.log[0][2], 0.5);
  eq('midi did not reach the idle track', idleInst.ons, 0);

  fanOff({ note: 60, source: 'midi' });
  eq('armed track released', armedInst.offs, 1);
  eq('idle track released nothing', idleInst.offs, 0);

  fanOn({ note: 61, velocity: 1, source: 'key' });
  eq('non-midi events are not fanned out', armedInst.ons, 1);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

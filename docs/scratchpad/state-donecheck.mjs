// docs/scratchpad/state-donecheck.mjs — throwaway done-check for src/core/state.js.
// Run: node "docs/scratchpad/state-donecheck.mjs"   (from the project root)
//
// NOT PROJECT CODE. Nothing imports this and nothing ships it.
//
// Proves the real §4 store against the contract, in plain node with no DOM:
//   · §4's shape — scale / on('scale') / setScaleDegree / setScalePreset / resetScaleDegree
//   · §15.5's four-row mutation table, every cell, run through the store
//   · the bus — subscribe, unsubscribe, unsubscribe-inside-callback, unknown event throws
//   · a refused mutation publishes nothing; a clamped one still does
//   · createState() stores are independent; `state` is one shared instance
//   · the scale object is REPLACED, never edited in place

import assert from 'node:assert/strict';
import { createState, state } from '../../src/core/state.js';
import {
  createScale, MAJOR, PRESETS, DEGREE_CLAMP, scaleName,
} from '../../src/theory/scale.js';

let checks = 0;
const ok = (label) => { checks++; console.log(`  ok — ${label}`); };
const section = (t) => console.log(`\n${t}`);

// ---------------------------------------------------------------------------------------
section('1. §4 shape');
// ---------------------------------------------------------------------------------------
{
  const s = createState();
  for (const k of ['tonic', 'degrees', 'name', 'altered', 'preset', 'originName']) {
    assert.ok(k in s.scale, `state.scale.${k}`);
  }
  assert.deepEqual(s.scale.degrees, [...MAJOR], 'opens on C Major — §7 default, D-1');
  assert.equal(s.scale.degrees.length, 7, '§4: ALWAYS 7 entries');
  assert.equal(s.scale.name, 'Major');
  for (const m of ['on', 'off', 'setScaleTonic', 'setScalePreset', 'setScaleDegree', 'resetScaleDegree']) {
    assert.equal(typeof s[m], 'function', `state.${m}`);
  }
  ok('state.scale carries §4 + F2 fields; all five call surfaces exist');

  assert.throws(() => s.on('scales', () => {}), /no such event/, 'typo throws, like input.on');
  ok('on() rejects an unknown event name instead of never firing');
}

// ---------------------------------------------------------------------------------------
section('2. §15.5\'s table, row by row, through the store');
// ---------------------------------------------------------------------------------------
{
  // setScaleTonic — tonic only (OD-10, transpose)
  const s = createState();
  const before = s.scale;
  s.setScaleTonic(7);
  assert.equal(s.scale.tonic, 7);
  assert.deepEqual(s.scale.degrees, before.degrees, 'degrees untouched');
  assert.deepEqual(s.scale.altered, before.altered, 'altered untouched');
  assert.equal(s.scale.preset, before.preset, 'preset untouched');
  assert.equal(s.scale.originName, before.originName, 'originName untouched');
  ok('setScaleTonic — transposes, touches nothing else');

  // setScalePreset — all 7, altered cleared, preset + originName ← name
  s.setScalePreset('Dorian');
  assert.deepEqual(s.scale.degrees, [...PRESETS.Dorian]);
  assert.deepEqual(s.scale.altered, Array(7).fill(false), 'altered cleared');
  assert.equal(s.scale.preset, 'Dorian');
  assert.equal(s.scale.originName, 'Dorian');
  assert.equal(s.scale.tonic, 7, 'the key survives a preset change');
  ok('setScalePreset — writes all 7, clears altered, sets preset and originName');

  // setScaleDegree — one degree, altered[i], preset 'Custom', originName UNTOUCHED
  s.setScaleDegree(2, +1);
  assert.equal(s.scale.degrees[2], PRESETS.Dorian[2] + 1);
  assert.equal(s.scale.altered[2], true);
  assert.equal(s.scale.preset, 'Custom', '§4 — preset is Custom the moment a degree moves');
  assert.equal(s.scale.originName, 'Dorian', 'F2 — origin does NOT move with the degree');
  ok('setScaleDegree — moves one degree, flags it, goes Custom, keeps the origin');

  // A8 + F2 together: the back-matched NAME may say Mixolydian while origin says Dorian.
  assert.equal(s.scale.name, scaleName(s.scale), 'name is the back-matched display label');
  assert.equal(s.scale.name, 'Mixolydian', 'A8 — Dorian with a raised 3rd back-matches');
  ok(`three questions, three fields — name '${s.scale.name}', originName 'Dorian', preset 'Custom'`);

  // resetScaleDegree — F2's whole point: the Dorian student gets DORIAN back, not major.
  s.resetScaleDegree(2);
  assert.deepEqual(s.scale.degrees, [...PRESETS.Dorian], '"and get back" — §4');
  assert.equal(s.scale.altered[2], false);
  assert.equal(s.scale.preset, 'Dorian', 'last altered cleared → preset returns to originName');
  assert.equal(s.scale.name, 'Dorian');
  ok('resetScaleDegree — F2 satisfied, the silent no-op is gone');
}

// ---------------------------------------------------------------------------------------
section('3. The bus');
// ---------------------------------------------------------------------------------------
{
  const s = createState();
  const seen = [];
  const off = s.on('scale', (sc) => seen.push(sc));
  s.setScaleDegree(1, +1);
  assert.equal(seen.length, 1, 'one mutation, one publish');
  assert.equal(seen[0], s.scale, 'the payload IS the new scale');
  assert.equal(s.listenerCount, 1);

  off();
  s.setScaleDegree(1, -1);
  assert.equal(seen.length, 1, 'unsubscribed listener is not called');
  assert.equal(s.listenerCount, 0, 'the unsubscribe actually removed it');
  ok('subscribe / publish / unsubscribe');

  // A subscriber that unsubscribes inside its own callback (every surface's dispose path)
  // must not make the store skip the next subscriber.
  const order = [];
  const offA = s.on('scale', () => { order.push('a'); offA(); });
  s.on('scale', () => order.push('b'));
  s.setScaleDegree(3, +1);
  assert.deepEqual(order, ['a', 'b'], 'b still ran');
  ok('unsubscribing inside a callback does not skip the next subscriber');

  assert.deepEqual(s.dispose(), { listenersDropped: 1 });
  assert.equal(s.listenerCount, 0);
  assert.equal(s.scale.degrees[3], MAJOR[3] + 1, 'dispose drops listeners, not the scale');
  ok('dispose — drops every subscription, leaves the scale where it was');
}

// ---------------------------------------------------------------------------------------
section('4. Refusals publish nothing; a clamped move still publishes');
// ---------------------------------------------------------------------------------------
{
  const s = createState();
  let fired = 0;
  s.on('scale', () => { fired++; });

  s.setScaleDegree(7, +1);          // §15.3 — index out of range, scale.js refuses
  s.setScaleDegree(-1, +1);
  s.setScalePreset('Nonesuch');     // unknown preset — scale.js refuses
  assert.equal(fired, 0, 'a refused mutation wakes nobody');
  assert.deepEqual(s.scale.degrees, [...MAJOR], 'and changes nothing');
  ok('out-of-range degree and unknown preset are refused, silently and without publishing');

  for (let i = 0; i < 5; i++) s.setScaleDegree(4, +1);
  assert.equal(s.scale.degrees[4], MAJOR[4] + DEGREE_CLAMP, 'OD-8 — clamped at ±2');
  assert.equal(fired, 5, 'a clamped move still publishes — the +/- redraws as disabled');
  ok(`clamped at MAJOR[4] + ${DEGREE_CLAMP}, and every attempt published`);
}

// ---------------------------------------------------------------------------------------
section('5. Stores are independent; the scale is replaced, never edited');
// ---------------------------------------------------------------------------------------
{
  const a = createState();
  const b = createState(createScale(3, 'Aeolian'));
  a.setScaleDegree(6, -1);
  assert.equal(b.scale.tonic, 3);
  assert.deepEqual(b.scale.degrees, [...PRESETS.Aeolian], 'b is untouched by a');
  ok('createState() — two tools, two scales, one module');

  const snapshot = a.scale;
  const degreesRef = snapshot.degrees;
  a.setScaleDegree(6, +1);
  assert.notEqual(a.scale, snapshot, 'a NEW object, every time');
  assert.notEqual(a.scale.degrees, degreesRef, 'and a new degrees array');
  assert.equal(snapshot.degrees[6], MAJOR[6] - 1, 'the old snapshot is still valid');
  ok('every mutation replaces the scale — a held snapshot never changes under a reader');

  assert.equal(typeof state.scale.tonic, 'number');
  assert.equal(state.on('scale', () => {}) instanceof Function, true);
  state.dispose();
  ok('the shared `state` instance is a store like any other');
}

console.log(`\n${checks} checks passed.`);

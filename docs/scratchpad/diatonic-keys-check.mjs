// docs/scratchpad/diatonic-keys-check.mjs — throwaway done-check script, diatonic-keys seat.
// Run: node "docs/scratchpad/diatonic-keys-check.mjs"   (from the project root)
//
// Exercises the pure, DOM-free parts of src/surfaces/diatonic-keys.js against every one of
// the DONE-CHECK's claims that can be proven without a browser:
//   · every key sounds the right pitch for the current scale, in all 12 tonics
//   · labels switch correctly across letter / number / solfege
//   · the +/- alters a degree (through core/state.js's state.setScaleDegree) and clamps at
//     DEGREE_CLAMP, same as theory/scale.js's own contract
//   · octaveShift and positionShift behave per §5 (position rotates what's drawn;
//     octave is invisible to keySpecFor and is applied once, by the bus, at emit time)
// Visual/DOM checks (rendering, pointer/touch, two instances sharing one scale on one page)
// are in docs/scratchpad/diatonic-keys-test.html, served over a static file server.
//
// UPDATED after core/state.js landed: section 3 exercised the local stand-in this surface
// used to carry (`createLocalScaleState`, now deleted). It exercises the real §4 store
// instead — same call surface, and that is the point of the swap.

import assert from 'node:assert/strict';
import {
  keySpecFor,
  startDegreeIndexFor,
  KEY_COUNT,
} from '../../src/surfaces/diatonic-keys.js';
import { createState } from '../../src/core/state.js';
import { createScale, MAJOR, DEGREE_CLAMP, pitchClassOf } from '../../src/theory/scale.js';
import { input } from '../../src/core/input.js';

let checks = 0;
function ok(label) { checks++; console.log(`  ok — ${label}`); }

// ---------------------------------------------------------------------------------------
console.log('1. Every key sounds the right pitch, all 12 tonics, positionShift = 0');
// ---------------------------------------------------------------------------------------
for (let tonic = 0; tonic < 12; tonic++) {
  const scale = createScale(tonic, 'Major');
  for (let k = 0; k < KEY_COUNT; k++) {
    const spec = keySpecFor(scale, k, 0, 'number');
    const expectedPc = pitchClassOf(scale, k % 7);
    assert.equal(spec.pc, expectedPc, `tonic ${tonic} key ${k}: pc`);
    assert.equal(((spec.midi % 12) + 12) % 12, expectedPc, `tonic ${tonic} key ${k}: midi pc`);
    // key 7 (the 8th, drawn) must be exactly one octave above key 0 — the octave-close key.
    if (k === 0) var firstMidi = spec.midi;
    if (k === 7) assert.equal(spec.midi, firstMidi + 12, `tonic ${tonic}: octave-close key`);
  }
}
ok('12 tonics × 8 keys — pitch class and octave-close all correct');

// ---------------------------------------------------------------------------------------
console.log('2. Labels switch correctly across letter / number / solfege');
// ---------------------------------------------------------------------------------------
{
  const scale = createScale(6, 'Major'); // the tie key, F#/G# etc — exercises composite text
  for (const overlay of ['none', 'letter', 'number', 'solfege']) {
    const texts = [];
    for (let k = 0; k < 7; k++) {
      const spec = keySpecFor(scale, k, 0, overlay);
      texts.push(spec.text);
    }
    if (overlay === 'none') assert.ok(texts.every((t) => t === ''), 'none overlay is blank');
    if (overlay === 'number') assert.deepEqual(texts, ['1', '2', '3', '4', '5', '6', '7'], 'number overlay 1-7');
    if (overlay === 'solfege') assert.deepEqual(
      texts, ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'], 'solfege overlay, plain (major scale)',
    );
    if (overlay === 'letter') assert.ok(texts.every((t) => t.length > 0), 'letter overlay non-empty');
    ok(`overlay '${overlay}' — ${JSON.stringify(texts)}`);
  }
  // M-10: this surface must NEVER draw the circle's '1/8' composite.
  const specAt8 = keySpecFor(scale, 7, 0, 'number');
  assert.equal(specAt8.text, '8', "key 8 (octave close) reads plain '8', not '1/8' (M-10)");
  ok("M-10 respected — octave-close key reads plain '8'");
}

// ---------------------------------------------------------------------------------------
console.log('3. The +/- alters a degree through core/state.js, and clamps at DEGREE_CLAMP');
// ---------------------------------------------------------------------------------------
{
  const store = createState(createScale(0, 'Major'));
  let notified = 0;
  store.on('scale', () => { notified++; });

  const before = store.scale.degrees[2];
  store.setScaleDegree(2, 1);
  assert.equal(store.scale.degrees[2], before + 1, 'degree 2 raised by 1');
  assert.equal(store.scale.altered[2], true, 'altered[2] flips true');
  assert.equal(notified, 1, 'listener notified exactly once');
  ok('setScaleDegree raises a degree and marks it altered');

  // Push past the clamp — theory/scale.js's own contract, exercised through the store.
  for (let i = 0; i < 5; i++) store.setScaleDegree(2, 1);
  assert.equal(store.scale.degrees[2], MAJOR[2] + DEGREE_CLAMP, 'clamps at +DEGREE_CLAMP');
  ok(`repeated + clamps at MAJOR[2] + DEGREE_CLAMP (${MAJOR[2] + DEGREE_CLAMP})`);

  // A colliding key still reads its OWN degree number, not the lower degree's, because
  // keySpecFor uses circlePositions() by DEGREE INDEX — never degreeIndexOf(pitch).
  const specDeg2 = keySpecFor(store.scale, 2, 0, 'number');
  assert.equal(specDeg2.text, '3', 'key for degree index 2 still reads its own number, 3');
  ok('an altered degree keeps its own key identity (no cross-key label collapse)');
}

// ---------------------------------------------------------------------------------------
console.log('4. positionShift rotates which degree is at the bottom (display only)');
// ---------------------------------------------------------------------------------------
{
  const scale = createScale(0, 'Major');
  for (let shift = 0; shift < 12; shift++) {
    const expectedStart = shift % 7;
    assert.equal(startDegreeIndexFor(shift), expectedStart, `positionShift ${shift}`);
    const spec = keySpecFor(scale, 0, shift, 'number');
    assert.equal(spec.degreeIndex, expectedStart, `bottom key at shift ${shift} is degree ${expectedStart}`);
  }
  ok('positionShift 0-11 rotates the bottom key through all 7 degrees (mod 7)');
}

// ---------------------------------------------------------------------------------------
console.log('5. octaveShift is invisible to keySpecFor and is applied once, by the bus');
// ---------------------------------------------------------------------------------------
{
  const scale = createScale(0, 'Major');
  const specA = keySpecFor(scale, 3, 0, 'number');
  input.octaveShift = 2;
  const specB = keySpecFor(scale, 3, 0, 'number');
  assert.equal(specA.midi, specB.midi, 'keySpecFor does not know about octaveShift at all');

  // The bus (core/input.js, frozen) is what actually applies it, at emit time — proven
  // against the real shared `input` singleton, not a mock.
  const seen = [];
  const unsub = input.on('noteon', (e) => seen.push(e.note));
  input.emitNoteOn({ note: specB.midi, velocity: 0.8, source: 'diatonic' });
  assert.equal(seen[0], specB.midi + 12 * 2, 'bus adds 12 * octaveShift on the way out');
  input.emitNoteOff({ note: specB.midi, source: 'diatonic' });
  unsub();
  input.octaveShift = 0;
  ok('octaveShift: invisible to drawing, applied once by core/input.js at emit time');
}

console.log(`\n${checks} checks passed.`);

// Headless check for job 2's store half: `surfaceType` on core/tracks.js.
// The arrangement's mount/dispose path needs a DOM and is NOT covered here.
// Run: node docs/scratchpad/surface-pick-smoke.mjs

import { createTrackStore } from '../../src/core/tracks.js';

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) { pass++; return; }
  fail++;
  console.error('FAIL —', label);
}

// —— born null ——————————————————————————————————————————————————————————————————————————
{
  const store = createTrackStore();
  const t = store.add({ name: 'A' });
  ok('a new track has surfaceType null', t.surfaceType === null);
  ok('surfaceType is a real field, not undefined', 'surfaceType' in t);
}

// —— set, re-set, clear ——————————————————————————————————————————————————————————————————
{
  const store = createTrackStore();
  const t = store.add();
  const a = store.setSurfaceType(t.id, 'keyboard');
  ok('set writes the value', a.surfaceType === 'keyboard');
  ok('get reads it back', store.get(t.id).surfaceType === 'keyboard');

  const b = store.setSurfaceType(t.id, 'step-grid');
  ok('re-set replaces the value', b.surfaceType === 'step-grid');

  const c = store.setSurfaceType(t.id, null);
  ok('null clears it', c.surfaceType === null);

  const d = store.setSurfaceType(t.id, undefined);
  ok('undefined clears it too', d.surfaceType === null);

  ok('unknown id returns null', store.setSurfaceType('nope', 'keyboard') === null);
}

// —— records stay frozen and replaced, never edited in place ——————————————————————————————
{
  const store = createTrackStore();
  const t = store.add();
  const before = store.get(t.id);
  const after = store.setSurfaceType(t.id, 'scale-circle');
  ok('the record is frozen', Object.isFrozen(after));
  ok('a new record is committed', before !== after);
  ok('the old record is untouched', before.surfaceType === null);
}

// —— the update event carries it ——————————————————————————————————————————————————————————
{
  const store = createTrackStore();
  const t = store.add();
  const seen = [];
  store.on('update', (rec) => seen.push(rec.surfaceType));
  store.setSurfaceType(t.id, 'diatonic-keys');
  ok('setSurfaceType publishes update', seen.length === 1);
  ok('the published record carries the pick', seen[0] === 'diatonic-keys');

  let changes = 0;
  store.on('change', () => changes++);
  store.setSurfaceType(t.id, 'keyboard');
  ok('setSurfaceType publishes change', changes === 1);
}

// —— it survives the other mutations, and derives nothing ————————————————————————————————
{
  const store = createTrackStore();
  const t = store.add();
  store.setSurfaceType(t.id, 'keyboard');

  store.setInstrumentType(t.id, 'wave-synth');
  ok('setInstrumentType keeps the surface pick', store.get(t.id).surfaceType === 'keyboard');
  ok('kind still derives from the instrument', store.get(t.id).kind === 'pitched');

  store.setInstrument(t.id, { noteOn() {} });
  ok('setInstrument keeps the surface pick', store.get(t.id).surfaceType === 'keyboard');

  store.update(t.id, { name: 'Lead' });
  ok('update() keeps the surface pick', store.get(t.id).surfaceType === 'keyboard');
  ok('update() still writes the name', store.get(t.id).name === 'Lead');

  store.setSurfaceType(t.id, 'step-grid');
  ok('the surface pick derives no kind', store.get(t.id).kind === 'pitched');
  ok('the surface pick touches no instrumentType', store.get(t.id).instrumentType === 'wave-synth');
}

// —— per track, not global ————————————————————————————————————————————————————————————————
{
  const store = createTrackStore();
  const a = store.add();
  const b = store.add();
  store.setSurfaceType(a.id, 'keyboard');
  store.setSurfaceType(b.id, 'step-grid');
  ok('track A keeps its own pick', store.get(a.id).surfaceType === 'keyboard');
  ok('track B keeps its own pick', store.get(b.id).surfaceType === 'step-grid');
  store.setSurfaceType(a.id, null);
  ok('clearing A does not touch B', store.get(b.id).surfaceType === 'step-grid');
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

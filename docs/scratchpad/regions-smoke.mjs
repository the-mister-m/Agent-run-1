import { createRegionStore } from '/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/src/core/regions.js';

let pass = 0; let fail = 0;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.log('FAIL:', name); } };

const s = createRegionStore();
let changes = 0;
s.on('change', () => { changes++; });

const a = s.add({ laneId: 'ch1', startBar: 1, lengthBars: 4, notes: [{ p: 60 }] });
ok('add returns region', a && a.id);
ok('add fires change', changes === 1);
ok('frozen', Object.isFrozen(a));

const clash = s.add({ laneId: 'ch1', startBar: 3, lengthBars: 2 });
ok('overlap refused', clash === null);

const b = s.add({ laneId: 'ch1', startBar: 5, lengthBars: 2 });
ok('touching allowed', b !== null);

const other = s.add({ laneId: 'ch2', startBar: 1, lengthBars: 4 });
ok('other lane free', other !== null);

ok('at() inside', s.at('ch1', 4)?.id === a.id);
ok('at() half-open', s.at('ch1', 5)?.id === b.id);
ok('at() empty', s.at('ch1', 99) === null);
ok('forLane sorted', s.forLane('ch1').map((r) => r.startBar).join() === '1,5');

// move clamps against the neighbour instead of refusing
const movedB = s.move(b.id, { startBar: 2 });
ok('move clamps to wall', movedB.startBar === 5, movedB.startBar);
const movedA = s.move(a.id, { startBar: 0 });
ok('move clamps to bar 1', movedA.startBar === 1);

// resize right edge stops at neighbour
const grown = s.resize(a.id, { lengthBars: 99 });
ok('resize right clamps', grown.lengthBars === 4);
const shrunk = s.resize(a.id, { lengthBars: 2 });
ok('resize right shrinks', shrunk.lengthBars === 2);
// left edge holds the right edge still
const leftDrag = s.resize(shrunk.id, { startBar: 2 });
ok('resize left holds right', leftDrag.startBar === 2 && leftDrag.lengthBars === 1);
const tooFar = s.resize(leftDrag.id, { startBar: 50 });
ok('resize left min 1 bar', tooFar.lengthBars === 1);

// notes are opaque and copied
const withNotes = s.setNotes(b.id, [{ anything: true }, 'even a string']);
ok('setNotes stores as given', withNotes.notes.length === 2);
const appended = s.addNotes(b.id, [{ more: 1 }]);
ok('addNotes appends', appended.notes.length === 3);

// duplicate is independent
const dup = s.duplicate(b.id, { laneId: 'ch3', startBar: 1 });
ok('duplicate placed', dup && dup.laneId === 'ch3');
ok('duplicate copies notes', dup.notes.length === 3);
s.setNotes(b.id, []);
ok('duplicate independent', s.get(dup.id).notes.length === 3);

// serialize / load round trip
const json = JSON.parse(JSON.stringify(s.serialize()));
const s2 = createRegionStore();
const n = s2.load(json);
ok('load count', n === json.length);
ok('load keeps ids', s2.get(dup.id) !== null);
ok('load keeps placement', s2.forLane('ch1').map((r) => r.startBar).join() === s.forLane('ch1').map((r) => r.startBar).join());

// remove / clear
ok('remove', s.remove(dup.id) === true);
ok('remove missing', s.remove('nope') === false);
ok('clear lane', s.clear('ch1') === 2);
ok('clear leaves others', s.size > 0);

// bus hygiene
const off = s.on('add', () => {});
ok('listenerCount', s.listenerCount === 2);
off();
ok('unsubscribe', s.listenerCount === 1);
ok('bad event throws', (() => { try { s.on('nope', () => {}); return false; } catch { return true; } })());
ok('dispose', s.dispose().listenersDropped === 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

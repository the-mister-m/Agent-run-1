// harness: node track-bus-smoke.mjs — no DOM, no AudioContext
const { createTrackBus } = await import(
  '/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/src/core/track-bus.js'
);

let fails = 0;
const ok = (name, cond) => { if (!cond) { fails++; console.log('FAIL', name); } else console.log('ok  ', name); };

function fakeInstrument() {
  const log = [];
  return {
    log,
    noteOn: (n, v) => log.push(['on', n, v]),
    noteOff: (n) => log.push(['off', n]),
    allNotesOff: () => log.push(['panic']),
  };
}

// 1 — isolation: two buses, two instruments, one note each
const a = createTrackBus({ id: 'trk1' });
const b = createTrackBus({ id: 'trk2' });
const ia = fakeInstrument(); const ib = fakeInstrument();
a.bindInstrument(ia); b.bindInstrument(ib);
a.emitNoteOn({ note: 60, velocity: 0.5, source: 'mouse' });
ok('isolation: a played', ia.log.length === 1 && ia.log[0][1] === 60);
ok('isolation: b silent', ib.log.length === 0);

// 2 — listeners still fire (capture path)
const seen = [];
const off = a.on('noteon', (e) => seen.push(e));
a.emitNoteOn({ note: 64, velocity: 0.9, source: 'key' });
ok('on(noteon) fires', seen.length === 1 && seen[0].note === 64 && seen[0].velocity === 0.9);
off();
a.emitNoteOn({ note: 65, source: 'key' });
ok('unsubscribe works', seen.length === 1);

// 3 — null instrument is silent, not an error
const c = createTrackBus({ id: 'trk3' });
ok('null bind silent', c.emitNoteOn({ note: 60, source: 'mouse' }) === true);
c.allNotesOff();

// 4 — per-track octave shift
a.octaveShift = 1; b.octaveShift = -1;
ok('shift is per track', a.octaveShift === 1 && b.octaveShift === -1);
a.emitNoteOn({ note: 72, source: 'touch' });
ok('shift applied on emit', ia.log.at(-1)[1] === 84);
a.emitNoteOff({ note: 72, source: 'touch' });
ok('note-off matches shifted note', ia.log.at(-1)[1] === 84);
a.octaveShift = 99;
ok('octave clamped', a.octaveShift === 5);
a.octaveShift = 0;

// 5 — shift event
let shifts = 0;
const offShift = a.on('shift', () => shifts++);
a.positionShift = 3;
ok('shift event fires', shifts === 1 && a.positionShift === 3);
offShift();

// 6 — ref-counting across routes
const d = createTrackBus({ id: 'trk4' }); const id4 = fakeInstrument(); d.bindInstrument(id4);
d.emitNoteOn({ note: 60, source: 'mouse' });
d.emitNoteOn({ note: 60, source: 'key' });
ok('second route does not double-fire', id4.log.filter((l) => l[0] === 'on').length === 1);
d.emitNoteOff({ note: 60, source: 'mouse' });
ok('note survives one release', id4.log.filter((l) => l[0] === 'off').length === 0);
d.emitNoteOff({ note: 60, source: 'key' });
ok('note released on last holder', id4.log.filter((l) => l[0] === 'off').length === 1);

// 7 — allNotesOff releases held + panics instrument
const e = createTrackBus({ id: 'trk5' }); const ie = fakeInstrument(); e.bindInstrument(ie);
e.emitNoteOn({ note: 60, source: 'mouse' });
e.emitNoteOn({ note: 64, source: 'key' });
const released = e.allNotesOff();
ok('allNotesOff released 2', released === 2);
ok('allNotesOff panics instrument', ie.log.at(-1)[0] === 'panic');
ok('activeNotes empty after panic', e.activeNotes.length === 0);

// 8 — swap releases through the OLD instrument
const f = createTrackBus({ id: 'trk6' }); const i1 = fakeInstrument(); const i2 = fakeInstrument();
f.bindInstrument(i1);
f.emitNoteOn({ note: 60, source: 'mouse' });
f.bindInstrument(i2);
ok('swap released on old', i1.log.some((l) => l[0] === 'off' && l[1] === 60));
ok('swap left new untouched', i2.log.length === 0);
ok('swap cleared held state', f.activeNotes.length === 0);

// 9 — dispose drops listeners and unbinds
const g = createTrackBus({ id: 'trk7' }); const ig = fakeInstrument(); g.bindInstrument(ig);
g.on('noteon', () => {}); g.on('noteoff', () => {});
g.emitNoteOn({ note: 60, source: 'mouse' });
const rep = g.dispose();
ok('dispose report', rep.listenersDropped === 2 && rep.notesReleased === 1);
ok('dispose unbound', g.instrument === null && g.listenerCount === 0);
g.emitNoteOn({ note: 60, source: 'mouse' });
ok('silent after dispose', ig.log.filter((l) => l[0] === 'on').length === 1);

// 10 — a throwing instrument does not break the bus
const h = createTrackBus({ id: 'trk8' });
h.bindInstrument({ noteOn() { throw new Error('boom'); } });
let got = false;
h.on('noteon', () => { got = true; });
h.emitNoteOn({ note: 60, source: 'mouse' });
ok('throwing instrument still emits', got === true);

// 11 — bad input rejected
ok('NaN note rejected', a.emitNoteOn({ note: NaN, source: 'mouse' }) === false);
ok('phantom note-off rejected', a.emitNoteOff({ note: 99, source: 'mouse' }) === false);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails ? 1 : 0);

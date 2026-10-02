import CompBuilder from '../../../src/surfaces/comp-builder.js';
const cb = new CompBuilder({ scale: null, on: () => () => {} });
const slot = { comp: [null, null, null] };
const show = (t) => console.log(t.padEnd(34), JSON.stringify(slot.comp));
// G4=67 into bottom → G4; E4=64 into middle → above G = E5 76; C4=60 top → C6 84
slot.comp[2] = 67; cb._stackComp(slot); show('drop G bottom (floor 4)');
slot.comp[1] = 64; cb._stackComp(slot); show('drop E middle');
slot.comp[0] = 60; cb._stackComp(slot); show('drop C top');
slot.comp[2] = 60; cb._stackComp(slot); show('replace bottom with C → restack');
const s2 = { comp: [72, null, null] }; cb._stackComp(s2); console.log('top only (C5) → lowest in range'.padEnd(34), JSON.stringify(s2.comp));
cb.slots[0].comp = [...slot.comp]; cb.setCompOctave(3); console.log('comp octave 4→3 shifts -12'.padEnd(34), JSON.stringify(cb.slots[0].comp));
cb.compOctave = 7; const s3 = { comp: [64, 67, 71] }; cb._stackComp(s3); console.log('octave 7 cap ≤127'.padEnd(34), JSON.stringify(s3.comp));

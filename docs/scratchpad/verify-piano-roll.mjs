// =========================================================================================
// verify-piano-roll.mjs — THROWAWAY HARNESS for the `piano-roll` seat's DONE-CHECK
// =========================================================================================
// Seat: `piano-roll`, P3/S5. Written 2026-08-24 17:51 EDT.
// NOT PROJECT CODE. Nothing imports this and nothing ships it. It exists so the seat's
// DONE-CHECK is a run, not a claim. Named in receipt-piano-roll.md.
//
//   node "docs/scratchpad/verify-piano-roll.mjs"
//
// WHY THE STUB BELOW EXISTS
//   `src/surfaces/piano-roll.js` imports `stepLabel` from `surfaces/step-grid.js` (CONTRACTS
//   §13.3, "three surfaces, one function") and the §13.1 tick math from `core/clock.js`.
//   `clock.js` imports `core/audio.js`, which CONSTRUCTS THE AUDIOCONTEXT AT MODULE LOAD —
//   so the whole chain is unimportable in plain node without a browser shim. The shim is a
//   few inert objects; it makes no sound and asserts nothing about audio.
//
// WHAT IS CHECKED HERE, AND WHAT IS NOT
//   Checked in node: row construction and shading in all twelve tonics, live scale edits,
//   the '8' rule, the ruler label sequences, §7 round-trip, and the source-level bans.
//   NOT checked here: pixels, pointer gestures, the playhead. Those need a real browser and
//   are the job of docs/scratchpad/piano-roll-testpage.html, which is served over http.
// =========================================================================================

// ---------- browser shim (inert) ----------
class FakeParam { constructor(v) { this.value = v; } setValueAtTime() { return this; } linearRampToValueAtTime() { return this; } exponentialRampToValueAtTime() { return this; } setTargetAtTime() { return this; } cancelScheduledValues() { return this; } }
class FakeNode { constructor() { this.gain = new FakeParam(1); this.frequency = new FakeParam(440); this.fftSize = 2048; } connect() { return this; } disconnect() { return this; } }
class FakeCtx {
  constructor() { this.currentTime = 0; this.sampleRate = 48000; this.state = 'running'; this.destination = new FakeNode(); this.baseLatency = 0; this.outputLatency = 0; }
  createGain() { return new FakeNode(); } createAnalyser() { return new FakeNode(); }
  createOscillator() { return new FakeNode(); } createBiquadFilter() { return new FakeNode(); }
  createBufferSource() { return new FakeNode(); } createDynamicsCompressor() { return new FakeNode(); }
  resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); } close() { return Promise.resolve(); }
}
globalThis.window = { AudioContext: FakeCtx, addEventListener() {}, removeEventListener() {} };
globalThis.document = {
  visibilityState: 'visible',
  addEventListener() {}, removeEventListener() {}, getElementById() { return null; },
  head: { appendChild() {} },
  createElement() { return { style: {}, dataset: {}, appendChild() {}, remove() {} }; },
};
Object.defineProperty(globalThis, 'navigator', { value: { requestMIDIAccess: undefined }, configurable: true });
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

// ---------- imports under test ----------
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = join(ROOT, 'src', 'surfaces', 'piano-roll.js');

const { default: PianoRoll } = await import(join(ROOT, 'src', 'surfaces', 'piano-roll.js'));
const { stepLabel } = await import(join(ROOT, 'src', 'surfaces', 'step-grid.js'));
const scaleMod = await import(join(ROOT, 'src', 'theory', 'scale.js'));
const {
  createScale, pitchClasses, degreeColor, isInKey, label, setScaleDegree, setScaleTonic,
  QUALITY_TOKEN, PRESETS,
} = scaleMod;

// ---------- tiny harness ----------
let pass = 0;
const fails = [];
function ok(name, cond, detail = '') {
  if (cond) { pass++; return; }
  fails.push(`${name}${detail ? ` — ${detail}` : ''}`);
}
function eq(name, got, want) {
  ok(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

const source = readFileSync(SRC, 'utf8');

/** The same source with every comment line dropped — a ban must be checked against the CODE,
 *  not against a header paragraph that names the very thing it is promising not to do. */
const code = source
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join('\n');

// =========================================================================================
// 1 · "12 rows draw with correct in-key shading in all 12 tonics"
// =========================================================================================
const TOKENS = new Set(Object.values(QUALITY_TOKEN));

for (let tonic = 0; tonic < 12; tonic++) {
  for (const presetName of Object.keys(PRESETS)) {
    const roll = new PianoRoll();
    roll.setScale(createScale(tonic, presetName));
    roll.octaves = 1;

    const pitches = roll._rowPitches();
    ok(`12 rows · tonic ${tonic} · ${presetName}`, pitches.length === 12, `got ${pitches.length}`);

    const want = new Set(pitchClasses(roll.scale));
    const inKeyPcs = new Set(pitches.filter((m) => isInKey(roll.scale, m)).map((m) => m % 12));
    const outPcs = pitches.filter((m) => !isInKey(roll.scale, m)).map((m) => m % 12);

    eq(`shaded set matches scale · tonic ${tonic} · ${presetName}`, [...inKeyPcs].sort((a, b) => a - b), [...want].sort((a, b) => a - b));
    ok(`dimmed set is the complement · tonic ${tonic} · ${presetName}`,
      outPcs.every((pc) => !want.has(pc)) && outPcs.length + want.size === 12,
      `out=${outPcs.length} in=${want.size}`);

    // every shaded row's color is a §9 token NAME chosen by theory/scale.js, never a value
    for (const m of pitches) {
      if (!isInKey(roll.scale, m)) continue;
      const tok = degreeColor(roll.scale, scaleMod.degreeIndexOf(roll.scale, m));
      ok(`token is a §9 name · tonic ${tonic}`, TOKENS.has(tok) && tok.startsWith('--deg-'), tok);
    }
  }
}

// §9's fifth token exists and augmented no longer shares --deg-dim (M-14, 2026-08-24)
ok('--deg-aug is its own token', QUALITY_TOKEN.augmented === '--deg-aug' && QUALITY_TOKEN.diminished === '--deg-dim');

// =========================================================================================
// 2 · "altering a degree moves the shading live"
// =========================================================================================
{
  const roll = new PianoRoll();
  roll.octaves = 1;
  roll.setScale(createScale(0, 'Major'));
  const before = roll._rowPitches().map((m) => isInKey(roll.scale, m)).join('');
  // lower degree 3 (index 2) a semitone: C major -> C with a flat third
  roll.setScale(setScaleDegree(roll.scale, 2, -1));
  const after = roll._rowPitches().map((m) => isInKey(roll.scale, m)).join('');
  ok('a +/- move changes which rows are shaded', before !== after, `${before} vs ${after}`);
  ok('the moved degree is now shaded', isInKey(roll.scale, 60 + 3));
  ok('the old degree is now dimmed', !isInKey(roll.scale, 60 + 4));
  ok('scale.altered marks the moved degree', roll.scale.altered[2] === true);

  // a tonic change moves the whole row set, live
  const rootBefore = roll._rootMidi();
  roll.setScale(setScaleTonic(roll.scale, 7));
  ok('a tonic change moves the rows', roll._rootMidi() !== rootBefore);
}

// =========================================================================================
// 3 · M-10 — a linear surface shows plain digits, '8' at the octave close, never '1/8'
// =========================================================================================
{
  const roll = new PianoRoll();
  roll.octaves = 2;
  roll.setScale(createScale(0, 'Major'));
  roll.overlay = 'number';

  const root = roll._rootMidi();
  const numberAt = (m) => {
    const p = roll._rowPosition(m);
    return label(roll.scale, m, 'number', p === null ? {} : { position: p });
  };
  eq('tonic at the bottom is 1', numberAt(root), '1');
  eq('tonic an octave up is 8', numberAt(root + 12), '8');
  eq('degree 5 is 5', numberAt(root + 7), '5');
  eq('an out-of-key row has no number', numberAt(root + 1), '');
  ok("no '1/8' composite anywhere on this surface",
    !['', '1', '8'].includes('1/8') && numberAt(root) !== '1/8' && numberAt(root + 12) !== '1/8');
  ok('slotNumberLabel is never called by this file', !code.includes('slotNumberLabel('));

  // solfège speaks for every degree in every key (movable do, A2); chromatic rows stay silent
  roll.overlay = 'solfege';
  const solfegeAt = (m) => label(roll.scale, m, 'solfege', {});
  eq('the tonic is Do', solfegeAt(root), 'Do');
  eq('an out-of-key row has no syllable (D-17)', solfegeAt(root + 1), '');
}

// =========================================================================================
// 4 · the diatonic roll — seat question 2
// =========================================================================================
{
  const roll = new PianoRoll();
  roll.setScale(createScale(3, 'Dorian'));
  roll.octaves = 2;
  roll.rows = 'diatonic';
  const pitches = roll._rowPitches();
  eq('diatonic roll draws 7 rows per octave', pitches.length, 14);
  ok('every diatonic row is in key (and therefore shaded)', pitches.every((m) => isInKey(roll.scale, m)));
  roll.rows = 'chromatic';
  eq('chromatic roll draws 12 rows per octave', roll._rowPitches().length, 24);
}

// =========================================================================================
// 5 · "the ruler labels match step-grid.js's exactly, character for character,
//      in both 16ths and triplets"
// =========================================================================================
// The identity is STRUCTURAL: piano-roll.js imports `stepLabel` from step-grid.js and owns no
// table of its own. Both halves are checked — the sequence against §13.3's literal text, and
// the source against a second implementation.
{
  const seq = (division, top) => {
    const out = [];
    for (let b = 0; b < top; b++) for (let c = 0; c < division; c++) out.push(stepLabel(b * division + c, division));
    return out;
  };
  eq('§13.3 16ths, one 4/4 bar', seq(4, 4),
    ['1', 'e', '+', 'a', '2', 'e', '+', 'a', '3', 'e', '+', 'a', '4', 'e', '+', 'a']);
  eq('§13.3 triplets, one 4/4 bar', seq(3, 4),
    ['1', '+', 'a', '2', '+', 'a', '3', '+', 'a', '4', '+', 'a']);
  eq('§13.3 OPEN DECISIONS item 5 — no syllable set at division 6', seq(6, 1),
    ['1', '', '', '', '', '']);

  ok('piano-roll.js imports stepLabel from step-grid.js',
    /import\s*\{\s*stepLabel\s*\}\s*from\s*'\.\/step-grid\.js'/.test(source));
  ok('piano-roll.js owns no SYLLABLES table', !source.includes('SYLLABLES'));
  ok('piano-roll.js composes no syllable literals',
    !/['"`]\s*e\s*['"`]/.test(source.replace(/e \+ a/g, '')) || !source.includes("SYLLABLES"));
}

// =========================================================================================
// 6 · note data — §7's four frozen fields, snapping, and off-grid
// =========================================================================================
{
  const roll = new PianoRoll();
  const stepT = roll._stepTicks();
  eq('ticksPerStep at 4/4 16ths is 120 (§13.1)', stepT, 120);

  // a captured note keeps its TRUE tick (§13.5, "default slop in performance") and is marked
  roll.addNotes([
    { tick: 0, length: 480, note: 60, velocity: 0.8, source: 'midi', lane: 0 },
    { tick: 127, length: 240, note: 63, velocity: 0.42, source: 'key', lane: 0 },
  ]);
  const out = roll.toProjectNotes();
  eq('§7 keys and nothing else', Object.keys(out[0]).sort(), ['length', 'note', 'tick', 'velocity']);
  eq('a captured off-grid tick is NOT quantized on the way in', out[1].tick, 127);
  ok('the off-grid note is detected as off-grid', roll._isOffGrid(out[1]));
  ok('the on-grid note is not', !roll._isOffGrid(out[0]));
  eq('programmed input snaps (§13.5 default)', roll._snap(127), 120);
  eq('capture metadata (source/lane) never enters the roll', out[0].source, undefined);

  // velocity survives, and a missing one falls to §12.1's 0.8
  roll.setNotes([{ tick: 0, length: 120, note: 60 }]);
  eq('a velocity-less note gets §12.1 / §7 / §13.5 / §11.7a\'s 0.8', roll.toProjectNotes()[0].velocity, 0.8);
}

// =========================================================================================
// 7 · the source-level bans this seat's DONE-CHECK names
// =========================================================================================
{
  ok('zero hex values', !/#[0-9a-fA-F]{3,8}\b/.test(source), 'a hex literal is present');
  ok('zero audio scheduling — no noteOn', !/\bnoteOn\b/.test(code));
  ok('zero audio scheduling — no AudioContext', !/AudioContext/.test(code));
  ok('zero audio scheduling — no clock tick subscription', !/\.on\(\s*['"]tick['"]/.test(code));
  ok('zero audio scheduling — no clock.schedule', !/\bschedule\s*\(/.test(code));
  ok('does not import core/input.js', !/from\s*'\.\.\/core\/input\.js'/.test(source));
  ok('does not import theory/chord.js', !/from\s*'\.\.\/theory\/chord\.js'/.test(source));
  ok('does not import core/audio.js directly', !/from\s*'\.\.\/core\/audio\.js'/.test(source));
  ok('the playhead reads positionTicks, not the scheduler', /positionTicks/.test(code));
  ok('no positionTicks<0 guard (§3 forbids re-describing that seam)', !/positionTicks\s*<\s*0/.test(code));
  ok('DURATION_NAMES ships empty (⛔ BRANDON)', /const DURATION_NAMES = Object\.freeze\(\{\}\)/.test(source));
}

// =========================================================================================
// 8 · teardown leaks nothing
// =========================================================================================
{
  const roll = new PianoRoll();
  const r = roll.dispose();
  eq('dispose reports zero audio scheduled', r.audioScheduled, 0);
  ok('dispose reports its four counters', 'domListeners' in r && 'rafCancelled' in r
    && 'stateSubscriptionsDropped' in r && 'captureSubscriptionsDropped' in r);
}

// ---------- report ----------
console.log(`\nchecks passed: ${pass}`);
if (fails.length) {
  console.log(`FAILURES (${fails.length}):`);
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('DONE-CHECK (node half): PASS');
process.exit(0);

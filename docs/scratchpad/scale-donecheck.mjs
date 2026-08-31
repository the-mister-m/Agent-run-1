// =========================================================================================
// docs/scratchpad/scale-donecheck.mjs — THROWAWAY. Not project code. Not in /src.
// =========================================================================================
// Seat: `scale-engine`, P3/S3. Written 2026-08-24 17:01 EDT.
// Run:  node "docs/scratchpad/scale-donecheck.mjs"   (from the project root)
//
// WHAT THIS PROVES
//   The STAGE done-check: the two hand-worked examples in
//   Builddocs/P3-harmony-tool/S2-theory-check/theory-report.md — Q7 and Q9 — come out of
//   src/theory/scale.js CHARACTER FOR CHARACTER identical to the hand-worked versions.
//   The expected blocks are not retyped here: they are READ OUT OF theory-report.md at run
//   time by exact-anchor match, so the comparison is against the real source bytes.
//
// TWO HONESTY NOTES, BOTH VISIBLE IN THE OUTPUT
//   1. MARKDOWN EMPHASIS IS TRANSCRIBED, VALUES ARE COMPUTED. The report bolds some cells
//      for emphasis (the augmented row's intervals; the last column of Q7's tables). Bold
//      is typography, not a value, so the `emph` map and the `B()` helper below declare
//      which cells the report bolded. Every NUMBER, QUALITY, TOKEN, LETTER and NUMERAL in the tables is computed
//      by scale.js. Nothing in a data cell is typed in.
//   2. THE `Numeral` COLUMN IS theory/chord.js's LANE (P3/S4), which does not exist yet.
//      It is computed HERE, in this throwaway file, from §15.8's rule — applyCase + SUFFIX
//      + EXT over `degreeQuality`'s output — purely to show that the quality this file
//      feeds chord.js produces the published numeral series. No /src file was written for
//      it and this seat did not build chord.js.
//      A9's superscript rule is rendered with a superscript glyph for `+`, which is what
//      the report's own `III⁺` is showing.
// =========================================================================================

import { readFileSync } from 'node:fs';
import {
  MAJOR, PRESETS, LETTERS,
  pitchClassOf, degreeIndexOf, isInKey, midiOf, hz,
  keySpelling, spellingOf, spellingOfPc, chromaticSpelling,
  solfegeOf, solfegeDeviation,
  stackOffset, skipTriad, degreeQuality, degreeColor,
  label, degreeNumberOf, slotNumberLabel, circlePositions,
  scaleName, originDegrees, createScale,
  setScaleTonic, setScalePreset, setScaleDegree, resetScaleDegree,
} from '../../src/theory/scale.js';

const REPORT = 'Builddocs/P3-harmony-tool/S2-theory-check/theory-report.md';
const LINES = readFileSync(REPORT, 'utf8').split('\n');

let pass = 0, fail = 0;
const failures = [];

function check(name, got, want) {
  const ok = got === want;
  if (ok) { pass++; } else {
    fail++;
    failures.push({ name, got, want });
  }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) {
    const g = String(got).split('\n'), w = String(want).split('\n');
    for (let i = 0; i < Math.max(g.length, w.length); i++) {
      if (g[i] !== w[i]) {
        console.log(`      line ${i}`);
        console.log(`      want: ${JSON.stringify(w[i])}`);
        console.log(`      got : ${JSON.stringify(g[i])}`);
      }
    }
  }
}

/** Pull the contiguous markdown table that starts at this exact line, out of the report. */
function reportTable(anchor) {
  const start = LINES.indexOf(anchor);
  if (start < 0) throw new Error(`anchor not found in ${REPORT}:\n${anchor}`);
  const out = [];
  for (let i = start; i < LINES.length && LINES[i].startsWith('|'); i++) out.push(LINES[i]);
  return out.join('\n');
}

const B = (s, on) => (on ? `**${s}**` : String(s));

// -----------------------------------------------------------------------------------------
// theory/chord.js's lane — §15.8, computed here ONLY to render the report's Numeral column.
// -----------------------------------------------------------------------------------------
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const SUFFIX = { major: '', minor: '', augmented: '+', diminished: '°', altered: '?' };
const EXT = { 3: '', 4: '7', 5: '9', 6: '', 7: '' };
const SUPER = { '+': '⁺', '°': '°', '?': '?', 7: '⁷', 9: '⁹' };
const applyCase = (r, q) => (q === 'minor' || q === 'diminished' ? r.toLowerCase() : r);
function numeralRendered(scale, root, count = 3) {
  const q = degreeQuality(scale, root);
  const sup = (SUFFIX[q] + EXT[count]).split('').map((c) => SUPER[c] ?? c).join('');
  return applyCase(ROMAN[root], q) + sup;
}

// =========================================================================================
// Q9 — THE COLOR RULE. Two hand-worked tables, all seven degrees each.
// =========================================================================================

function q9Table(scale, headerLine, sepLine, emph) {
  const rows = [headerLine, sepLine];
  for (let i = 0; i < 7; i++) {
    const idx = [0, 2, 4].map((k) => {
      const n = i + k;
      return `${n % 7}${n >= 7 ? '′' : ''}`;
    }).join(', ');
    const [a, b, c] = skipTriad(scale, i);
    const q = degreeQuality(scale, i);
    const notes = [0, 2, 4].map((k) => spellingOf(scale, (i + k) % 7).text).join(' ');
    const e = emph[i] ?? {};
    rows.push([
      '', String(i), idx, `${a}, ${b}, ${c}`,
      B(b - a, e.lower), B(c - b, e.upper),
      `**${q}**`, '`' + degreeColor(scale, i) + '`',
      `**${numeralRendered(scale, i)}**`, notes, '',
    ].join(' | ').replace(/^ \| /, '| ').replace(/ \| $/, ' |'));
  }
  return rows.join('\n');
}

// --- Example 1 — C major, all seven degrees ---------------------------------------------
const cMajor = createScale(0, 'Major');
check(
  'Q9 · hand-worked example 1 — C major, all seven degrees',
  q9Table(
    cMajor,
    '| `i` | indices `(i, i+2, i+4)` mod 7 | offsets | `b−a` | `c−b` | Quality | §9 token | Numeral | notes |',
    '|---|---|---|---|---|---|---|---|---|',
    {},                                   // the report bolds nothing in this table's cells
  ),
  reportTable('| `i` | indices `(i, i+2, i+4)` mod 7 | offsets | `b−a` | `c−b` | Quality | §9 token | Numeral | notes |'),
);

// --- Example 2 — A harmonic minor, an ALTERED scale, all seven degrees -------------------
// Built the way the report says a student reaches it: A major, then two +/- presses.
let aHarm = createScale(9, 'Major');
aHarm = setScaleDegree(aHarm, 2, -1);
aHarm = setScaleDegree(aHarm, 5, -1);
check('Q9 · A harmonic minor is reachable in two +/- presses from A major',
  JSON.stringify(aHarm.degrees), JSON.stringify([0, 2, 3, 5, 7, 8, 11]));
check('Q9 · …and scaleName() back-matches it', scaleName(aHarm), 'Harmonic Minor');

check(
  'Q9 · hand-worked example 2 — A harmonic minor, all seven degrees',
  q9Table(
    aHarm,
    '| `i` | indices | offsets | `b−a` | `c−b` | Quality | §9 token | Numeral | notes |',
    '|---|---|---|---|---|---|---|---|---|',
    { 2: { lower: true, upper: true } },   // the report bolds the augmented row's intervals
  ),
  reportTable('| `i` | indices | offsets | `b−a` | `c−b` | Quality | §9 token | Numeral | notes |'),
);

// --- Q9's stress test — 'altered' must never fire on a legitimate scale ------------------
const SERIES = {
  Major: 'I ii iii IV V vi vii°',
  Phrygian: 'i II III iv v° VI vii',
  Locrian: 'i° II iii iv V VI vii',
  'Harmonic Minor': 'i ii° III⁺ iv V VI vii°',
  'Melodic Minor': 'i ii III⁺ IV V vi° vii°',
};
for (const [name, want] of Object.entries(SERIES)) {
  const s = createScale(0, name);
  const got = [0, 1, 2, 3, 4, 5, 6].map((i) => numeralRendered(s, i)).join(' ');
  check(`Q9 · stress test — ${name} derives its published triad series`, got, want);
  const spurious = [0, 1, 2, 3, 4, 5, 6].some((i) => degreeQuality(s, i) === 'altered');
  check(`Q9 · stress test — ${name} produces no spurious 'altered'`, spurious, false);
}
// …and 'altered' DOES fire where it should (Q4's array, degree 2 → offsets [4, 3, 9]).
const broken = { tonic: 0, degrees: [0, 4, 4, 3, 7, 9, 11] };
check("Q9 · 'altered' fires on a non-triad stack", degreeQuality(broken, 1), 'altered');
check("Q9 · …and its skip triad is the report's [4, 3, 9]",
  JSON.stringify(skipTriad(broken, 1)), JSON.stringify([4, 3, 9]));
// tonic is not an input: a transposed scale is the same colours.
const transposed = setScaleTonic(cMajor, 7);
check('Q9 · tonic is not an input — transposing does not change one colour',
  [0, 1, 2, 3, 4, 5, 6].map((i) => degreeColor(transposed, i)).join(','),
  [0, 1, 2, 3, 4, 5, 6].map((i) => degreeColor(cMajor, i)).join(','));

// =========================================================================================
// Q7 — "NUMBERS REFER TO SCALE INFO", on an altered scale. A harmonic minor, degree 5.
// =========================================================================================
// rootScaleNote and skipStack are theory/chord.js's (P3/S4). Both are one line over THIS
// file's `stackOffset`, exactly as §15.6/§15.7 define them, so they are composed here
// rather than built into /src.
const rootScaleNote = (scale, root, n) => stackOffset(scale, root, n - 1) - scale.degrees[root];
const skipStack = (scale, root, count) =>
  Array.from({ length: count }, (_, j) => stackOffset(scale, root, 2 * j));
const chordToneScaleNumber = (j) => 2 * j + 1;

const root = 4;                                    // degree 5 → root index 4, the pitch E
check('Q7 · degree 5 of A harmonic minor is E', spellingOf(aHarm, root).text, 'E');

// --- Step 1 — "that root's scale" --------------------------------------------------------
const row = (head, cells) => `| ${[head, ...cells].join(' | ')} |`;
{
  const ns = [1, 2, 3, 4, 5, 6, 7];
  const cells = (f) => ns.map((n) => B(f(n), n === 7));
  const rows = [
    row('`n`', cells((n) => n)),
    '|---|---|---|---|---|---|---|---|',
    row('`k = n−1`', cells((n) => n - 1)),
    row('`(4+k) % 7`', cells((n) => (root + n - 1) % 7)),
    row('`⌊(4+k)/7⌋`', cells((n) => Math.floor((root + n - 1) / 7))),
    row('`stackOffset`', cells((n) => stackOffset(aHarm, root, n - 1))),
    row('**− 7**', cells((n) => rootScaleNote(aHarm, root, n))),
    row('the note', cells((n) => spellingOf(aHarm, (root + n - 1) % 7).text)),
  ];
  check('Q7 · Step 1 — E\'s scale inside A harmonic minor',
    rows.join('\n'), reportTable('| `n` | 1 | 2 | 3 | 4 | 5 | 6 | **7** |'));
}

// --- Step 2 — the four-tone chord on the same degree -------------------------------------
{
  const js = [0, 1, 2, 3];
  const stack = skipStack(aHarm, root, 4);
  const cells = (f) => js.map((j) => B(f(j), j === 3));
  const rows = [
    row('`j`', cells((j) => j)),
    '|---|---|---|---|---|',
    row('`k = 2j`', cells((j) => 2 * j)),
    row('`stackOffset` (from tonic)', cells((j) => stack[j])),
    row('pc `(9 + offset) % 12`', cells((j) => (aHarm.tonic + stack[j]) % 12)),
    row('note', js.map((j) => `**${spellingOfPc(aHarm, aHarm.tonic + stack[j]).text}**`)),
    row('`chordToneScaleNumber(j) = 2j+1`', cells((j) => chordToneScaleNumber(j))),
  ];
  check('Q7 · Step 2 — the four-tone chord on degree 5 is E G♯ B D',
    rows.join('\n'), reportTable('| `j` | 0 | 1 | 2 | **3** |'));
}

// --- The identity, and Step 3 — move one entry and watch the 7th follow ------------------
check('Q7 · identity — skipStack[3] === rootScaleNote(4,7) + degrees[4] === 17',
  `${skipStack(aHarm, root, 4)[3]} ${rootScaleNote(aHarm, root, 7) + aHarm.degrees[root]}`, '17 17');

const bent = setScaleDegree(aHarm, 3, +1);          // degrees[3]: 5 → 6, inside the clamp
check('Q7 · Step 3 — setScaleDegree(3, +1) gives [0,2,3,6,7,8,11]',
  JSON.stringify(bent.degrees), JSON.stringify([0, 2, 3, 6, 7, 8, 11]));
check('Q7 · Step 3 — rootScaleNote(4, 7) is now 11', rootScaleNote(bent, root, 7), 11);
check('Q7 · Step 3 — …and that pitch spells D♯',
  spellingOfPc(bent, bent.tonic + stackOffset(bent, root, 6)).text, 'D♯');
check('Q7 · Step 3 — skipStack(4, 4)[3] is now 18', skipStack(bent, root, 4)[3], 18);
check('Q7 · Step 3 — the chord is now E G♯ B D♯',
  skipStack(bent, root, 4).map((o) => spellingOfPc(bent, bent.tonic + o).text).join(' '),
  'E G♯ B D♯');
check("Q7 · Step 3 — [0,2,3,6,7,8,11] matches no preset → 'scale unknown'",
  scaleName(bent), 'scale unknown');

// =========================================================================================
// SEAT DONE-CHECK — the rest of A-scale-engine.md's list
// =========================================================================================

// --- The file imports nothing ------------------------------------------------------------
{
  const src = readFileSync('src/theory/scale.js', 'utf8');
  check('SEAT · src/theory/scale.js imports nothing', /^\s*import\s/m.test(src), false);
  check('SEAT · …and contains no hex colour', /#[0-9a-fA-F]{3,8}\b/.test(src), false);
}

// --- keySpelling for all twelve, against §15.2b's table ----------------------------------
{
  const WANT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const got = WANT.map((_, pc) => {
    const k = keySpelling(pc);
    return k.letter + ({ '-1': '♭', 0: '', 1: '♯' }[k.accidental] ?? '?');
  });
  check('SEAT · keySpelling derives §15.2b\'s twelve rows', got.join(' '), WANT.join(' '));
  check('SEAT · tonic 6 is the ONE tie, and it shows both faces',
    `${keySpelling(6).tie} ${keySpelling(6).alt.letter}${keySpelling(6).alt.accidental}`, 'true G-1');
  check('SEAT · tonic 0 is not a tie', keySpelling(0).tie, false);
  check('SEAT · A1 — tonic 6, degree 0 → F♯/G♭',
    spellingOf(createScale(6, 'Major'), 0).text, 'F♯/G♭');
  check('SEAT · A1 — tonic 6, degree 1 → G♯/A♭',
    spellingOf(createScale(6, 'Major'), 1).text, 'G♯/A♭');
  check('SEAT · A1 — tonic 6, degree 6 → E♯/F',
    spellingOf(createScale(6, 'Major'), 6).text, 'E♯/F');
}

// --- All twelve tonics: seven letters, one each, in order ---------------------------------
for (let t = 0; t < 12; t++) {
  const s = createScale(t, 'Major');
  const letters = [0, 1, 2, 3, 4, 5, 6].map((i) => spellingOf(s, i).letter);
  const base = LETTERS.indexOf(keySpelling(t).letter);
  const want = [0, 1, 2, 3, 4, 5, 6].map((i) => LETTERS[(base + i) % 7]);
  check(`SEAT · tonic ${t} — seven letters, one each, in order`, letters.join(''), want.join(''));
}

// --- Four overlay modes, twelve tonics, no crash, correct shape ---------------------------
for (let t = 0; t < 12; t++) {
  const s = createScale(t, 'Major');
  const nums = [0, 1, 2, 3, 4, 5, 6].map((i) => label(s, pitchClassOf(s, i), 'number'));
  const sol = [0, 1, 2, 3, 4, 5, 6].map((i) => label(s, pitchClassOf(s, i), 'solfege'));
  check(`SEAT · tonic ${t} — number overlay is 1…7`, nums.join(''), '1234567');
  check(`SEAT · tonic ${t} — movable do: every degree speaks, tonic is Do`,
    sol.join(' '), 'Do Re Mi Fa Sol La Ti');
  check(`SEAT · tonic ${t} — 'none' draws nothing`, label(s, pitchClassOf(s, 0), 'none'), '');
}

// --- '8 = Do at the octave' stays general; '1/8' stays on the circle ----------------------
{
  const s = cMajor;
  check("SEAT · §6 — number overlay: tonic at slot 1 is '1'", label(s, 0, 'number', { position: 1 }), '1');
  check("SEAT · §6 — number overlay: tonic at slot 8 is '8'", label(s, 0, 'number', { position: 8 }), '8');
  check("SEAT · §6 — with no position, the tonic is '1'", label(s, 0, 'number'), '1');
  check("SEAT · §6 amendment — '1/8' is the CIRCLE's slot label only",
    `${slotNumberLabel(1)} ${slotNumberLabel(2)} ${label(s, 0, 'number', { position: 1 })}`, '1/8 2 1');
  check('SEAT · D-17 — an out-of-key pitch gets no solfège and no number',
    `[${label(s, 1, 'solfege')}][${label(s, 1, 'number')}]`, '[][]');
  check('SEAT · OD-2 — an out-of-key pitch in C major gets a letter (sharps, escalated)',
    label(s, 1, 'letter'), 'C♯');
  check('SEAT · OD-2 — …and in F major it gets the flat face',
    label(createScale(5, 'Major'), 1, 'letter'), 'D♭');
}

// --- Three altered scales, all four overlay modes ------------------------------------------
{
  const cases = [
    ['C major, degree 3 lowered', setScaleDegree(cMajor, 2, -1)],
    ['C major, degree 4 raised', setScaleDegree(cMajor, 3, +1)],
    ['A harmonic minor, degree 4 raised', bent],
  ];
  for (const [name, s] of cases) {
    const letters = [0, 1, 2, 3, 4, 5, 6].map((i) => spellingOf(s, i).text);
    const sol = [0, 1, 2, 3, 4, 5, 6].map((i) => solfegeOf(s, i));
    const nums = [0, 1, 2, 3, 4, 5, 6].map((i) => degreeNumberOf(s, pitchClassOf(s, i)));
    const cols = [0, 1, 2, 3, 4, 5, 6].map((i) => degreeColor(s, i));
    check(`SEAT · altered — ${name}: every degree keeps its own letter`,
      new Set(letters.map((x) => x[0])).size, 7);
    check(`SEAT · altered — ${name}: solfège marks the move, not the spelling`,
      sol.length === 7 && sol.every((x) => typeof x === 'string' && x.length > 0), true);
    check(`SEAT · altered — ${name}: numbers are 1…7`, nums.join(''), '1234567');
    check(`SEAT · altered — ${name}: every colour is a §9 token, never a hex`,
      cols.every((c) => c.startsWith('--deg-')), true);
  }
  // A2's worked rows: the mark measures against MAJOR, never against the letter.
  check('SEAT · A2 — C with degree 3 lowered reads Mi♭', solfegeOf(setScaleDegree(cMajor, 2, -1), 2), 'Mi♭');
  check('SEAT · A2 — C with degree 4 raised reads Fa♯', solfegeOf(setScaleDegree(cMajor, 3, +1), 3), 'Fa♯');
  check('SEAT · A2 — D major degree 3 is F♯ in SPELLING but a plain Mi in SOLFÈGE',
    `${spellingOf(createScale(2, 'Major'), 2).text} ${solfegeOf(createScale(2, 'Major'), 2)}`, 'F♯ Mi');
  check('SEAT · A2 — solfegeDeviation is the signed integer, exposed separately',
    solfegeDeviation(setScaleDegree(cMajor, 2, -1), 2), -1);
}

// --- The +/- : clamp, out-of-range rejection, and "get back" (F2) --------------------------
{
  let s = createScale(0, 'Dorian');
  check('SEAT · preset sets degrees and clears altered',
    `${s.preset} ${s.originName} ${s.name} ${s.altered.some(Boolean)}`, 'Dorian Dorian Dorian false');
  s = setScaleDegree(s, 2, +1);                      // Dorian → Mixolydian's array
  check('SEAT · F2 — name chases degrees, originName does not',
    `${s.name} ${s.originName} ${s.preset}`, 'Mixolydian Dorian Custom');
  check('SEAT · F2 — the +/- knows the student moved it', s.altered[2], true);
  s = resetScaleDegree(s, 2);
  check('SEAT · F2 — resetScaleDegree gets the Dorian student BACK to Dorian',
    `${JSON.stringify(s.degrees)} ${s.preset} ${s.name}`,
    `${JSON.stringify(PRESETS.Dorian)} Dorian Dorian`);

  const clampedDown = setScaleDegree(cMajor, 2, -9);
  check('SEAT · OD-8 — the clamp is ±2 from the degree\'s MAJOR value (down)',
    clampedDown.degrees[2], MAJOR[2] - 2);
  const clampedUp = setScaleDegree(cMajor, 2, +9);
  check('SEAT · OD-8 — …and up', clampedUp.degrees[2], MAJOR[2] + 2);
  check('SEAT · OD-8 — a clamped degree is still spellable',
    `${spellingOf(clampedDown, 2).text} ${spellingOf(clampedUp, 2).text}`, 'E<i>bb</i> E<i>x</i>');
  check('SEAT · §15.3 — setScaleDegree(7, …) is REJECTED, and does not throw',
    setScaleDegree(cMajor, 7, +1) === cMajor, true);
  check('SEAT · setScaleDegree does not mutate its argument',
    JSON.stringify(cMajor.degrees), JSON.stringify(MAJOR));
  check('SEAT · OD-10 — setScaleTonic transposes and touches nothing else',
    `${transposed.tonic} ${JSON.stringify(transposed.degrees)} ${transposed.name}`,
    `7 ${JSON.stringify(MAJOR)} Major`);
}

// --- §15.2a's deliberate duplicate: two degrees on one pitch class --------------------------
{
  const collided = setScaleDegree(cMajor, 2, +1);    // degree 3 → 5, same pc as degree 4
  check('SEAT · §15.2a — a collided pitch class is NOT deduped or sorted',
    JSON.stringify(pitchClasses_(collided)), JSON.stringify([0, 2, 5, 5, 7, 9, 11]));
  check('SEAT · §15.2a — degreeIndexOf returns the LOWER index', degreeIndexOf(collided, 5), 2);
  function pitchClasses_(s) { return [0, 1, 2, 3, 4, 5, 6].map((i) => pitchClassOf(s, i)); }
}

// --- circlePositions: 8 entries, position 8 IS position 1 -----------------------------------
{
  const ps = circlePositions(cMajor, 4);
  check('SEAT · circlePositions returns 8 entries', ps.length, 8);
  check('SEAT · position 8 is position 1 in every way but pitch and label',
    `${ps[7].degreeIndex} ${ps[7].pc} ${ps[7].letter} ${ps[7].solfege} ${ps[7].quality} ${ps[7].colorToken}`,
    `${ps[0].degreeIndex} ${ps[0].pc} ${ps[0].letter} ${ps[0].solfege} ${ps[0].quality} ${ps[0].colorToken}`);
  check('SEAT · position 8 carries the octave pitch', ps[7].midi - ps[0].midi, 12);
  check('SEAT · the Do slot is labelled 1/8', ps[0].number, '1/8');
  check('SEAT · middle C is midi 60, and A4 is 440 Hz', `${midiOf(0, 4)} ${hz(69)}`, '60 440');
  check('SEAT · circlePositions carries §4\'s altered flag on every entry',
    ps.every((e) => typeof e.altered === 'boolean'), true);
  check('SEAT · isInKey / chromaticSpelling agree with label()',
    `${isInKey(cMajor, 4)} ${isInKey(cMajor, 6)} ${chromaticSpelling(cMajor, 6).text}`, 'true false F♯');
  check('SEAT · originDegrees falls back to MAJOR when the origin names no preset',
    JSON.stringify(originDegrees({ originName: 'nope', degrees: [] })), JSON.stringify(MAJOR));
  check('SEAT · setScalePreset with an unknown name changes nothing',
    setScalePreset(cMajor, 'nope') === cMajor, true);
}

// =========================================================================================
console.log('\n' + '='.repeat(88));
console.log(`${pass} passed · ${fail} failed`);
if (fail) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`  · ${f.name}`);
  process.exitCode = 1;
} else {
  console.log('DONE-CHECK CLEARED — theory-report.md Q7 and Q9 reproduce character for character.');
}
console.log('='.repeat(88));

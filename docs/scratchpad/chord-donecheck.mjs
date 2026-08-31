// =========================================================================================
// docs/scratchpad/chord-donecheck.mjs — THROWAWAY. Not project code. Not in /src.
// =========================================================================================
// Seat: `chord-engine`, P3/S4. Written 2026-08-24 17:22 EDT.
// Run:  node "docs/scratchpad/chord-donecheck.mjs"    (from the project root)
//
// WHAT THIS PROVES — the seat's DONE-CHECK, clause by clause
//   A-chord-engine.md: "every roman numeral, in all 12 tonics, unaltered and with at least
//   three different degree alterations, returns correct pitches and correct case; a 7th
//   chord in an altered scale uses that scale's 7th degree; all inversions of a triad
//   return distinct voicings; and the file has no DOM or audio import."
//   STAGE.md: "Every roman numeral in every one of the 12 scales, altered and unaltered,
//   produces correct notes and correct case."
//
// HOW "CORRECT" IS ESTABLISHED — two independent sources, never chord.js itself
//   1. theory-report.md's HAND-WORKED TABLES (Q7, Q9, Q10) are read out of the report at
//      run time by exact-anchor match and compared to generated blocks. The comparison is
//      against the real source bytes; nothing is retyped here.
//   2. For the 12-tonic sweep, where no hand-worked table exists, every expected value is
//      RE-DERIVED IN THIS FILE from `scale.degrees` by arithmetic that does not call
//      chord.js — the pitch classes by walking the array directly, the case from the raw
//      third interval. A tautology would prove nothing, so there is none.
//
// THREE HONESTY NOTES, ALL VISIBLE IN THE OUTPUT
//   1. MARKDOWN EMPHASIS IS TRANSCRIBED, VALUES ARE COMPUTED. The report bolds some cells
//      for emphasis; the `emph` maps and `B()` declare which. Every number, quality, token,
//      letter, numeral and label inside a data cell is computed by the engine.
//   2. A9'S SUPERSCRIPT IS RENDERED. chord.js returns `SUFFIX['augmented'] === '+'` as a
//      plain character and `numeralParts().sup` is where A9 says it goes. The report draws
//      it as `III⁺`, so `renderSup()` below maps the sup characters to their superscript
//      glyphs FOR PRINTING ONLY. The value under it is chord.js's.
//   3. ONE ASCII/UNICODE TRANSCRIPTION IN Q10's TABLE. The report's `Chord` and `label`
//      columns quote the curriculum skills list verbatim — `Bb/F` — while its own `notes`
//      column spells the same pitch `B♭`. chord.js emits the key-signature spelling `B♭/F`
//      through `spellingOf`. The single declared substitution is printed when it is applied.
// =========================================================================================

import { readFileSync } from 'node:fs';

import {
  MAJOR, PRESETS,
  createScale, setScaleDegree, setScaleTonic, scaleName,
  degreeQuality, degreeColor, skipTriad, stackOffset,
  spellingOf, spellingOfPc, solfegeOf, midiOf, pitchClassOf,
} from '../../src/theory/scale.js';

import {
  ROMAN, SUFFIX, LETTER_SUFFIX, EXT, INTERVAL_NAME, VOICING_ORDER, MAX_COUNT,
  skipStack, isUpperOvertoneChord,
  rootScale, rootScaleNote, chordToneScaleNumber,
  parseNumeral, numeralPitchClasses, applyCase, numeralOf, numeralParts,
  chordName, chordNameParts,
  voicing, invert, spread, bassOf, bassText, chordLabel, chordLabelParts,
  noteBank,
  SEVENTH_NAME, seventhQuality, seventhSuffix,
} from '../../src/theory/chord.js';

const REPORT = 'Builddocs/P3-harmony-tool/S2-theory-check/theory-report.md';
const SOURCE = 'src/theory/chord.js';
const LINES = readFileSync(REPORT, 'utf8').split('\n');

let pass = 0; let fail = 0;
const failures = [];

function check(name, got, want) {
  const ok = got === want;
  if (ok) { pass++; } else { fail++; failures.push({ name, got, want }); }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) {
    const g = String(got).split('\n'); const w = String(want).split('\n');
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
const row = (head, cells) => `| ${[head, ...cells].join(' | ')} |`;

/** HONESTY NOTE 2 — printing only. A9 puts these characters in `numeralParts().sup`. */
const SUPER = { '+': '⁺', '°': '°', '?': '?', 7: '⁷', 9: '⁹' };
const renderSup = (s) => s.split('').map((c) => SUPER[c] ?? c).join('');
const numeralRendered = (scale, r, count = 3) => {
  const p = numeralParts(scale, r, count);
  return p.base + renderSup(p.sup);
};

// -----------------------------------------------------------------------------------------
// THE SCALES THIS CHECK SWEEPS — one unaltered, and FOUR different alteration paths.
// The brief asks for "at least three different degree alterations"; these are four, each
// reached by real `setScaleDegree` presses inside `DEGREE_CLAMP`, not by hand-written arrays.
// -----------------------------------------------------------------------------------------
function bend(tonic, presses) {
  let s = createScale(tonic, 'Major');
  for (const [i, n] of presses) s = setScaleDegree(s, i, n);
  return s;
}
const ALTERATIONS = [
  ['MAJOR — unaltered', []],
  ['harmonic minor — ♭3 ♭6', [[2, -1], [5, -1]]],
  ['melodic minor — ♭3', [[2, -1]]],
  ['Hungarian-minor shape — ♭3 ♯4 ♭6 (unnamed by PRESETS)', [[2, -1], [3, +1], [5, -1]]],
  ['a NON-TRIAD scale — degree 2 up 2, degree 4 down 2', [[1, +2], [3, -2]]],
];

console.log('==========================================================================');
console.log('CHORD ENGINE DONE-CHECK — P3/S4');
console.log('==========================================================================\n');

// =========================================================================================
// PART 1 — the file is pure: no DOM, no audio, one import
// =========================================================================================
{
  const src = readFileSync(SOURCE, 'utf8');
  // Strip every comment first. This file's own header QUOTES §15.7's prohibition
  // ("maj7 = [0,4,7,11]") and §15.6's banned-synonym list verbatim, so a naive grep would
  // hit the documentation rather than the code. Only executable text is searched below.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const forbidden = [
    'document', 'window', 'navigator', 'AudioContext', 'requestAnimationFrame',
    'addEventListener', 'localStorage', 'fetch(',
  ];
  const hits = forbidden.filter((w) => code.includes(w));
  check('PURE · no DOM / audio / browser identifier anywhere in the file',
    hits.join(','), '');
  const imports = [...src.matchAll(/^import[\s\S]*?from\s+'([^']+)';/gm)].map((m) => m[1]);
  check('PURE · exactly one import, and it is scale.js (§15.6, one direction, no cycle)',
    imports.join(','), './scale.js');
  // NARROWED 2026-08-24 17:41, and the reason is on the record rather than hidden: after
  // Brandon's seventh-name ruling the STRINGS 'maj7' and 'm7b5' are legitimately in the code
  // as LABELS. §15.7's prohibition was never about the characters — it forbids a table that
  // maps a chord NAME to a LIST OF SEMITONES, because that is what stops surviving the +/-.
  // So the check now looks for that shape: a chord name bound to an array, or a tertian
  // interval list written out. `SEVENTH_NAME` is name → string and cannot match.
  check('PURE · no chord-formula table — no chord name is ever bound to a note list',
    [
      /\b(maj7|dom7|m7|m7b5|dim7|min7|maj9)\b\s*[:=]\s*\[/,   // maj7 = [0,4,7,11]
      /\[\s*0\s*,\s*4\s*,\s*7/,                              // [0,4,7,…]
      /\[\s*0\s*,\s*3\s*,\s*7/,                              // [0,3,7,…]
      /\[\s*0\s*,\s*3\s*,\s*6/,                              // [0,3,6,…]
    ].filter((r) => r.test(code)).length, 0);
  // The strongest form of the same claim, and it is structural rather than textual: the
  // functions that decide WHICH NOTES a chord has must not know the naming table exists.
  const bodyOf = (name) => {
    const m = code.match(new RegExp(`^(?:export )?function ${name}\\([\\s\\S]*?^}`, 'm'));
    if (!m) throw new Error(`function ${name} not found in ${SOURCE}`);
    return m[0];
  };
  const pitchFns = ['skipStack', 'voicing', 'numeralPitchClasses', 'rootScaleNote', 'invert', 'spread'];
  check('PURE · no pitch-producing function references the seventh NAMING table',
    pitchFns.filter((f) => /SEVENTH|seventhSuffix|seventhQuality/.test(bodyOf(f))).join(','), '');
  check('PURE · no banned synonym for Brandon\'s term (seventh chord / tetrad / extended chord)',
    [/seventh chord/i, /tetrad/i, /extended chord/i].filter((r) => r.test(code)).length, 0);
}

// =========================================================================================
// PART 2 — Q9's hand-worked colour/numeral tables, character for character
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
    // The notes are the CHORD'S tones, read off chord.js's own stack.
    const notes = skipStack(scale, i, 3)
      .map((_, j) => spellingOf(scale, (i + 2 * j) % 7).text).join(' ');
    const e = emph[i] ?? {};
    rows.push([
      '', String(i), idx, `${a}, ${b}, ${c}`,
      B(b - a, e.lower), B(c - b, e.upper),
      `**${q}**`, `\`${degreeColor(scale, i)}\``,
      `**${numeralRendered(scale, i)}**`, notes, '',
    ].join(' | ').replace(/^ \| /, '| ').replace(/ \| $/, ' |'));
  }
  return rows.join('\n');
}

const cMajor = createScale(0, 'Major');
check(
  'Q9 · hand-worked example 1 — C major, all seven numerals + notes',
  q9Table(cMajor,
    '| `i` | indices `(i, i+2, i+4)` mod 7 | offsets | `b−a` | `c−b` | Quality | §9 token | Numeral | notes |',
    '|---|---|---|---|---|---|---|---|---|', {}),
  reportTable('| `i` | indices `(i, i+2, i+4)` mod 7 | offsets | `b−a` | `c−b` | Quality | §9 token | Numeral | notes |'),
);

const aHarm = bend(9, [[2, -1], [5, -1]]);
check('Q9 · A harmonic minor is reachable in two +/- presses from A major',
  JSON.stringify(aHarm.degrees), JSON.stringify([0, 2, 3, 5, 7, 8, 11]));
check(
  'Q9 · hand-worked example 2 — A harmonic minor, all seven numerals + notes',
  q9Table(aHarm,
    '| `i` | indices | offsets | `b−a` | `c−b` | Quality | §9 token | Numeral | notes |',
    '|---|---|---|---|---|---|---|---|---|',
    { 2: { lower: true, upper: true } }),
  reportTable('| `i` | indices | offsets | `b−a` | `c−b` | Quality | §9 token | Numeral | notes |'),
);

// Q9's stress test — the DERIVED SERIES column, computed by numeralOf, five scales.
{
  const anchor = '| Preset | Derived series | Published series | Match |';
  const table = reportTable(anchor).split('\n');
  for (const name of Object.keys(PRESETS)) {
    const line = table.find((l) => l.includes(`${name} `) || l.includes(`${name}**`));
    if (!line) continue;
    const want = line.split('|')[2].trim();
    const s = createScale(0, name);
    const got = [0, 1, 2, 3, 4, 5, 6].map((i) => numeralRendered(s, i)).join(' ');
    check(`Q9 · stress test — ${name} derives its published triad series`, got, want);
  }
}

// =========================================================================================
// PART 3 — Q7: "numbers refer to scale info", on an altered scale, hand-worked
// =========================================================================================
const root = 4;                                    // degree 5 → root index 4, the pitch E
check('Q7 · degree 5 of A harmonic minor is E', spellingOf(aHarm, root).text, 'E');

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
  check("Q7 · Step 1 — E's scale inside A harmonic minor, from rootScaleNote",
    rows.join('\n'), reportTable('| `n` | 1 | 2 | 3 | 4 | 5 | 6 | **7** |'));
}
check('Q7 · rootScale(aHarm, 4) is E F G♯ A B C D as semitones above E',
  JSON.stringify(rootScale(aHarm, root)), JSON.stringify([0, 1, 4, 5, 7, 8, 10]));

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
  check('Q7 · Step 2 — the four-tone chord on degree 5 is E G♯ B D, from skipStack',
    rows.join('\n'), reportTable('| `j` | 0 | 1 | 2 | **3** |'));
}

// Step 3 — move one entry and watch the seventh follow. No line of code changes.
const bent = setScaleDegree(aHarm, 3, +1);
check('Q7 · Step 3 — setScaleDegree(3, +1) gives [0,2,3,6,7,8,11]',
  JSON.stringify(bent.degrees), JSON.stringify([0, 2, 3, 6, 7, 8, 11]));
check('Q7 · Step 3 — the 7th of E\'s scale moves D → D♯',
  spellingOfPc(bent, bent.tonic + rootScaleNote(bent, root, 7) + bent.degrees[root]).text, 'D♯');
check('Q7 · Step 3 — the four-tone chord is now E G♯ B D♯',
  skipStack(bent, root, 4).map((o) => spellingOfPc(bent, bent.tonic + o).text).join(' '),
  'E G♯ B D♯');
check("Q7 · Step 3 — [0,2,3,6,7,8,11] matches no preset → 'scale unknown'",
  scaleName(bent), 'scale unknown');

// =========================================================================================
// PART 4 — THE SWEEP. Every numeral, all 12 tonics, unaltered + four alteration paths.
// -----------------------------------------------------------------------------------------
// Ground truth is RE-DERIVED HERE, from `degrees`, without calling chord.js:
//   · pitch classes — walk the degree array directly, +12 per wrap, rotate by tonic
//   · case          — the raw third interval: 4 → UPPER, 3 → lower, anything else → UPPER
//     (§15.8's "case is carried by the third", stated as arithmetic rather than as a lookup)
// =========================================================================================
{
  let sweep = 0;
  for (const [label, presses] of ALTERATIONS) {
    for (let tonic = 0; tonic < 12; tonic++) {
      const s = bend(tonic, presses);
      for (let r = 0; r < 7; r++) {
        // --- independent expected PITCH CLASSES, for counts 3 and 4 ---
        for (const count of [3, 4]) {
          const wantPcs = [];
          for (let j = 0; j < count; j++) {
            const n = r + 2 * j;
            const off = s.degrees[n % 7] + 12 * Math.floor(n / 7);
            wantPcs.push((((s.tonic + off) % 12) + 12) % 12);
          }
          const gotPcs = numeralPitchClasses(s, r, count);
          if (JSON.stringify(gotPcs) !== JSON.stringify(wantPcs)) {
            check(`SWEEP · pitches — ${label}, tonic ${tonic}, degree ${r + 1}, count ${count}`,
              JSON.stringify(gotPcs), JSON.stringify(wantPcs));
          } else sweep++;
        }
        // --- independent expected CASE, from the raw third ---
        const n2 = r + 2; const n4 = r + 4;
        const a = s.degrees[r % 7];
        const b = s.degrees[n2 % 7] + 12 * Math.floor(n2 / 7);
        const c = s.degrees[n4 % 7] + 12 * Math.floor(n4 / 7);
        const isTriad = (b - a === 4 && (c - b === 3 || c - b === 4))
          || (b - a === 3 && (c - b === 3 || c - b === 4));
        const wantLower = isTriad && b - a === 3;
        const base = numeralParts(s, r, 3).base;
        const gotLower = base === base.toLowerCase();
        if (gotLower !== wantLower) {
          check(`SWEEP · case — ${label}, tonic ${tonic}, degree ${r + 1}`,
            gotLower ? 'lower' : 'UPPER', wantLower ? 'lower' : 'UPPER');
        } else sweep++;
        // --- the numeral's letters are the right roman, always ---
        if (base.toUpperCase() !== ROMAN[r]) {
          check(`SWEEP · roman — ${label}, tonic ${tonic}, degree ${r + 1}`,
            base.toUpperCase(), ROMAN[r]);
        } else sweep++;
        // --- the 7th of the chord IS the 7th note of that root's scale ---
        const want7 = (() => {           // re-derived: rotate the array by hand
          const n = r + 6;
          return s.degrees[n % 7] + 12 * Math.floor(n / 7) - s.degrees[r];
        })();
        const got7 = rootScaleNote(s, r, 7);
        const stack7 = skipStack(s, r, 4)[3];
        if (got7 !== want7 || stack7 !== want7 + s.degrees[r]) {
          check(`SWEEP · 7th — ${label}, tonic ${tonic}, degree ${r + 1}`,
            `${got7}/${stack7}`, `${want7}/${want7 + s.degrees[r]}`);
        } else sweep++;
        // --- all inversions of a triad return DISTINCT voicings ---
        const v = voicing(s, r, 3, 4);
        const shapes = [0, 1, 2].map((k) => JSON.stringify(invert(v, k)));
        if (new Set(shapes).size !== 3) {
          check(`SWEEP · inversions distinct — ${label}, tonic ${tonic}, degree ${r + 1}`,
            new Set(shapes).size, 3);
        } else sweep++;
      }
    }
  }
  check(`SWEEP · every numeral × 12 tonics × 5 scale shapes — ${sweep} assertions`,
    sweep, 5 * 12 * 7 * 6);
}

// Transposition invariance: the numeral series is a property of `degrees`, not of `tonic`.
{
  const want = [0, 1, 2, 3, 4, 5, 6].map((i) => numeralOf(cMajor, i)).join(' ');
  let same = true;
  for (let t = 1; t < 12; t++) {
    const s = setScaleTonic(cMajor, t);
    if ([0, 1, 2, 3, 4, 5, 6].map((i) => numeralOf(s, i)).join(' ') !== want) same = false;
  }
  check('SWEEP · the numeral series is identical in all 12 tonics (tonic is not an input)',
    same, true);
}

// =========================================================================================
// PART 5 — the LETTER label path (F1, fixing M-15) against Q10's hand-worked loop
// =========================================================================================
{
  const f = createScale(5, 'Major');                       // the loop is diatonic F major
  // [degree index, the report's label, how many times the bass is rotated up to reach it]
  const LOOP = [[0, 'F', 0], [4, 'C/E', 1], [5, 'Dm/F', 1], [3, 'Bb/F', 2]];
  const rows = [
    '| Chord | `root` | offsets | pitch classes | notes | bass | label |',
    '|---|---|---|---|---|---|---|',
  ];
  let substituted = false;
  for (const [r, chordCol, rot] of LOOP) {
    const stack = skipStack(f, r, 3);
    const pcs = numeralPitchClasses(f, r, 3);
    const notes = stack.map((_, j) => spellingOf(f, (r + 2 * j) % 7).text).join(' ');
    const v = invert(voicing(f, r, 3, 4), rot);
    const bassPc = ((bassOf(v) % 12) + 12) % 12;
    const rootPc = pitchClassOf(f, r);
    const bassCell = bassPc === rootPc
      ? `${spellingOfPc(f, bassPc).text} = root`
      : spellingOfPc(f, bassPc).text;
    let lab = chordLabel(f, r, v, 3, 'letter');
    let head = lab;
    if (lab.includes('B♭')) { lab = lab.replace('B♭', 'Bb'); head = lab; substituted = true; }
    const labCell = bassPc === rootPc ? `**\`${lab}\`** (no slash)` : `**\`${lab}\`** ✓`;
    rows.push(`| ${head} | ${r} (${numeralOf(f, r)}) | ${stack.join(', ')} | ${pcs.join(', ')} | ${notes} | ${bassCell} | ${labCell} |`);
    // and the un-substituted truth, asserted on its own
    check(`Q10 · letter label — degree ${r + 1} of F major reads ${chordCol.replace('Bb', 'B♭')}`,
      chordLabel(f, r, v, 3, 'letter'), chordCol.replace('Bb', 'B♭'));
  }
  if (substituted) {
    console.log('      ↳ HONESTY NOTE 3 APPLIED: one declared substitution, `B♭` → `Bb`, in the');
    console.log('        Chord/label columns only, matching the report\'s verbatim quote of the');
    console.log('        curriculum skills list. chord.js emits `B♭/F`, asserted separately above.');
  }
  check('Q10 · the curriculum\'s own chord loop reproduces, character for character',
    rows.join('\n'),
    reportTable('| Chord | `root` | offsets | pitch classes | notes | bass | label |'));

  // M-15's exact failure, and that it does not happen here.
  check('M-15 · the minor chord keeps its `m` — the fix F1 was written for',
    chordName(f, 5, 3), 'Dm');
  check('M-15 · …and `m` is in `sup`, not inline (A9 binds both label systems)',
    JSON.stringify(chordNameParts(f, 5, 3)), JSON.stringify({ base: 'D', sup: 'm' }));
  check('M-15 · SUFFIX and LETTER_SUFFIX differ in exactly one row — `minor`',
    Object.keys(SUFFIX).filter((k) => SUFFIX[k] !== LETTER_SUFFIX[k]).join(','), 'minor');
}

// =========================================================================================
// PART 6 — numerals in and out, superscript split, slash notation, no inversion labels
// =========================================================================================
check('OD-14 · parseNumeral ignores case — iv', JSON.stringify(parseNumeral('iv')), '{"root":3}');
check('OD-14 · parseNumeral ignores case — IV', JSON.stringify(parseNumeral('IV')), '{"root":3}');
check('OD-14 · parseNumeral tolerates a full label — vii°7',
  JSON.stringify(parseNumeral('vii°7')), '{"root":6}');
check('parseNumeral returns null on nonsense rather than throwing',
  parseNumeral('banana'), null);

check('A9 · numeralOf is the flat string — C major degree 7, count 4', numeralOf(cMajor, 6, 4), 'vii°7');
check('A9 · numeralParts splits it for the superscript element',
  JSON.stringify(numeralParts(cMajor, 6, 4)), JSON.stringify({ base: 'vii', sup: '°7' }));
check('A9 · augmented takes UPPER case and a superscript +',
  numeralOf(aHarm, 2, 3), 'III+');
check('A6 · EXT closes the top end — count 6 and 7 label as the plain numeral',
  `${numeralOf(cMajor, 4, 3)} ${numeralOf(cMajor, 4, 4)} ${numeralOf(cMajor, 4, 5)} ${numeralOf(cMajor, 4, 6)} ${numeralOf(cMajor, 4, 7)}`,
  'V V7 V9 V V');
check('§15.6 · Brandon\'s term — 3 is a basic chord, 4 and up are upper overtone chords',
  [1, 2, 3, 4, 5, 6, 7].map((n) => (isUpperOvertoneChord(n) ? 'U' : 'b')).join(''), 'bbbUUUU');
check('§15.6 · count tops out at 7 — count 8 is clamped, not wrapped',
  skipStack(cMajor, 0, 8).length, MAX_COUNT);

// A10 — slash notation, and no inversion number anywhere.
{
  const v = voicing(cMajor, 0, 3, 4);                 // C E G at C4 → [60, 64, 67]
  check('§15.9 · root-position voicing is absolute midi, low → high',
    JSON.stringify(v), JSON.stringify([60, 64, 67]));
  check('A10 · root in the bass → NO SLASH', chordLabel(cMajor, 0, v, 3, 'letter'), 'C');
  check('A10 · rotate the bass up once → letter slash', chordLabel(cMajor, 0, invert(v, 1), 3, 'letter'), 'C/E');
  check('A10 · rotate twice → letter slash', chordLabel(cMajor, 0, invert(v, 2), 3, 'letter'), 'C/G');
  check('A10 · the numeral system\'s bass is the INTERVAL from the chord root',
    chordLabel(cMajor, 0, invert(v, 1), 3, 'numeral'), 'I/M3');
  check('A10 · Brandon\'s own III/M6 form is well-formed — a 13th in the bass',
    bassText(cMajor, 2, (pitchClassOf(cMajor, 2) + 9) % 12, 'numeral'), 'M6');
  check('A10 · chordLabelParts keeps the marker in `sup` and the bass in `slash`',
    JSON.stringify(chordLabelParts(cMajor, 6, invert(voicing(cMajor, 6, 4, 4), 1), 4, 'numeral')),
    JSON.stringify({ base: 'vii', sup: '°7', slash: 'm3' }));
  check('§15.9 · invert CLAMPS at length − 1; it never wraps into the ceiling',
    JSON.stringify(invert(v, 9)), JSON.stringify(invert(v, 2)));
  check('§15.9 · spread displaces by octaves and keeps SOUNDING order',
    JSON.stringify(spread(v, [-1, 0, 1])), JSON.stringify([48, 64, 79]));
  check('§15.9 · bassOf reads the lowest PITCH, not the first tone',
    bassOf(spread(v, [0, 0, -2])), 43);
  const src = readFileSync(SOURCE, 'utf8');
  check('A10 · the words "1st inversion" / "inversion label" appear nowhere as output',
    /['"`][^'"`]*\b\d(st|nd|rd)\s+inversion/i.test(src), false);
}

// =========================================================================================
// PART 7 — the note bank: the two halves, and the shape a surface draws from
// =========================================================================================
{
  const nb = noteBank(cMajor, { root: 4, count: 4, octave: 4 });
  const want = [
    'numeral', 'numeralParts', 'chordName', 'chordNameParts', 'chordLabel',
    'chordLabelParts', 'degreeNumber', 'quality', 'colorToken', 'isUpperOvertoneChord',
    'tones', 'voicing', 'bass',
  ];
  check('§15.10 · every field the contract names is present',
    want.filter((k) => !(k in nb)).join(','), '');
  check('§15.10 · the numeral side — G7 in C major', nb.numeral, 'V7');
  check('§15.10 · the chord\'s colour is the circle\'s colour', nb.colorToken, '--deg-major');
  check('§15.10 · it is an upper overtone chord at count 4', nb.isUpperOvertoneChord, true);
  check('§15.10 · the scale side — one tone per stack position, numbered 1 3 5 7',
    nb.tones.map((t) => t.scaleNumber).join(' '), '1 3 5 7');
  check('§15.10 · …each tone spelled, syllabled and coloured from scale.js',
    nb.tones.map((t) => `${t.letter}/${t.solfege}/${t.number}/${t.colorToken}`).join(' '),
    'G/Sol/5/--deg-major B/Ti/7/--deg-dim D/Re/2/--deg-minor F/Fa/4/--deg-major');
  check('§15.10 · the voicing sounds those four pitches',
    JSON.stringify(nb.voicing), JSON.stringify([67, 71, 74, 77]));
  check('§15.10 · isRoot and isBass', nb.tones.map((t) => `${t.isRoot ? 'R' : '-'}${t.isBass ? 'B' : '-'}`).join(' '),
    'RB -- -- --');

  // 7ths are SHOWN, not learned: raising count makes a tone appear carrying the digit 7.
  const triad = noteBank(cMajor, { root: 4, count: 3, octave: 4 });
  check('§15.10 · the default is a triad and it carries no 7',
    triad.tones.some((t) => t.scaleNumber === 7), false);
  check('§15.10 · …raising count to 4 makes a tone appear labelled scaleNumber 7',
    nb.tones.some((t) => t.scaleNumber === 7), true);

  // Rotating the bass keeps every tone's identity attached to its own pitch.
  const rot = noteBank(cMajor, { root: 4, count: 3, octave: 4, inversion: 1 });
  check('§15.10 · after a rotation, tones[k] still names the tone sounding at voicing[k]',
    rot.tones.map((t) => `${t.scaleNumber}@${t.midi}`).join(' '), '3@71 5@74 1@79');
  check('§15.10 · …and the label follows the new bass, with no inversion number',
    rot.chordLabel, 'V/M3');
  check('§15.10 · the letter system is one option away',
    noteBank(cMajor, { root: 4, count: 3, octave: 4, inversion: 1, system: 'letter' }).chordLabel,
    'G/B');

  // M-3 — the shipped order, asserted so a flip of VOICING_ORDER is visible in the diff.
  const both = noteBank(cMajor, { root: 4, count: 3, octave: 4, inversion: 1, offsets: [0, 0, 1] });
  check(`M-3 · VOICING_ORDER is '${VOICING_ORDER}' and this is the voicing it produces`,
    JSON.stringify(both.voicing), JSON.stringify([71, 74, 91]));
}

// A non-triad stack reports itself honestly rather than being repaired into a chord.
{
  const wrecked = bend(0, [[1, +2], [3, -2]]);
  check("'altered' · a stack that is not a triad says so", degreeQuality(wrecked, 1), 'altered');
  check("'altered' · …and its numeral is the stored upper case with a superscript ?",
    numeralOf(wrecked, 1, 3), 'II?');
  // The letter head is 'D' + A7's DOUBLE-SHARP glyph: this degree's letter is still D
  // (§15.2b — an altered degree keeps its letter) and it now lands on pitch class 4, so its
  // accidental is +2. Brandon's ruling is "italic x for double sharps", and that is MARKUP —
  // `scale-engine` flagged it for the surface seats and it reaches chord labels too.
  check("'altered' · …and the letter label carries the same mark, over A7's double sharp",
    chordName(wrecked, 1, 3), 'D<i>x</i>?');
  check("'altered' · nothing sorted the stack — §15.4 rule 1",
    JSON.stringify(skipStack(wrecked, 1, 3)), JSON.stringify([4, 3, 9]));
}

// =========================================================================================
// PART 8 — BRANDON'S SEVENTH-CHORD RULING, 2026-08-24. All six, spelled from D.
// =========================================================================================
// His six rows, verbatim:
//   P1-M3-P5-M7 = Dmaj7      P1-m3-P5-m7 = Dm7        P1-m3-d5-d7 = Ddim7
//   P1-M3-P5-m7 = D7         P1-m3-P5-M7 = Dm(maj7)   P1-m3-d5-m7 = Dm7b5
// Each is reached from a REAL SCALE at a real degree — nothing is constructed by hand — and
// the expected pitches below are the textbook spellings of those six chords on D.
// -----------------------------------------------------------------------------------------
{
  const HARM = [[2, -1], [5, -1]];          // major → harmonic minor, two +/- presses
  const SIX = [
    // [label,            tonic, presses, degree index, name,        notes,          triad,  7th]
    ['D major 7',            2, [],   0, 'Dmaj7',    'D F♯ A C♯', 'major',      'major'],
    ['D dominant 7',         7, [],   4, 'D7',       'D F♯ A C',  'major',      'minor'],
    ['D minor 7',            0, [],   1, 'Dm7',      'D F A C',   'minor',      'minor'],
    ['D minor-major 7',      2, HARM, 0, 'Dm(maj7)', 'D F A C♯',  'minor',      'major'],
    ['D diminished 7',       3, HARM, 6, 'Ddim7',    'D F A♭ C♭', 'diminished', 'diminished'],
    ['D half-diminished 7',  3, [],   6, 'Dm7b5',    'D F A♭ C',  'diminished', 'minor'],
  ];
  const seen = new Set();
  const rows = [
    '| Chord | reached from | degree | triad | 7th span | `chordName` | `chordNameParts` | notes |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const [title, tonic, presses, r, want, wantNotes, wantTriad, wantSeventh] of SIX) {
    const s2 = bend(tonic, presses);
    const stack = skipStack(s2, r, 4);
    const notes = stack.map((_, j) => spellingOf(s2, (r + 2 * j) % 7).text).join(' ');
    const span = ((stack[3] - stack[0]) % 12 + 12) % 12;
    check(`SEVENTHS · ${title} — the head spells D`, spellingOf(s2, r).text, 'D');
    check(`SEVENTHS · ${title} — the triad is ${wantTriad}`, degreeQuality(s2, r), wantTriad);
    check(`SEVENTHS · ${title} — the 7th is ${wantSeventh} (span ${span})`,
      seventhQuality(s2, r), wantSeventh);
    check(`SEVENTHS · ${title} — the notes are ${wantNotes}`, notes, wantNotes);
    check(`SEVENTHS · ${title} — Brandon's name is ${want}`, chordName(s2, r, 4), want);
    check(`SEVENTHS · ${title} — the whole suffix is superscript (A9)`,
      JSON.stringify(chordNameParts(s2, r, 4)),
      JSON.stringify({ base: 'D', sup: want.slice(1) }));
    seen.add(`${wantTriad}/${wantSeventh}`);
    rows.push(`| **${title}** | ${scaleName(s2)} on ${spellingOf(s2, 0).text} | ${r + 1} | ${wantTriad} | ${span} | **${chordName(s2, r, 4)}** | \`{base:'D', sup:'${chordNameParts(s2, r, 4).sup}'}\` | ${notes} |`);
  }
  check('SEVENTHS · all six of Brandon\'s rows are covered, none duplicated', seen.size, 6);
  check('SEVENTHS · …and the table holds exactly his six rows',
    Object.values(SEVENTH_NAME).reduce((n, o) => n + Object.keys(o).length, 0), 6);
  check('SEVENTHS · the ruling changed NO pitch — count 4 in C major is still G B D F',
    JSON.stringify(numeralPitchClasses(cMajor, 4, 4)), JSON.stringify([7, 11, 2, 5]));
  check('SEVENTHS · a triad is untouched — count 3 still reads C, Dm, B°',
    [0, 1, 6].map((i) => chordName(cMajor, i, 3)).join(' '), 'C Dm B°');
  check('SEVENTHS · an augmented 7th is a pair Brandon did not name → falls back to C+7',
    chordName(aHarm, 2, 4), 'C+7');
  check('SEVENTHS · …and seventhSuffix says so honestly, with null',
    seventhSuffix(aHarm, 2), null);
  check('SEVENTHS · count 5 is NOT ruled and is NOT guessed — still C9',
    chordName(cMajor, 0, 5), 'C9');
  console.log(`\n### BRANDON'S SIX, BUILT FROM REAL SCALES\n\n${rows.join('\n')}`);
}

// --- Reachability: brute-force every degree array DEGREE_CLAMP allows -----------------------
// Brandon asked for the six to be documented "in the event I want to put them in later",
// which admits some may be theoretical. They are not. This proves it rather than assuming.
{
  const found = new Map();
  const unnamed = new Set();
  const off = [-2, -1, 0, 1, 2];
  const degrees = [0, 0, 0, 0, 0, 0, 0];
  const walk = (k) => {
    if (k === 7) {
      const sc = { tonic: 0, degrees: [...degrees] };
      for (let r = 0; r < 7; r++) {
        const t = degreeQuality(sc, r); const sv = seventhQuality(sc, r);
        const name = SEVENTH_NAME[t]?.[sv];
        if (name !== undefined) { if (!found.has(name)) found.set(name, `${t}+${sv}`); }
        else if (t !== 'altered' && sv !== 'altered') unnamed.add(`${t}+${sv}`);
      }
      return;
    }
    for (const d of off) { degrees[k] = MAJOR[k] + d; walk(k + 1); }
  };
  walk(0);
  check(`SEVENTHS · all six are REACHABLE from real scale data (${[...found.keys()].sort().join(' ')})`,
    found.size, 6);
  console.log(`      ↳ pairs a real scale can produce that Brandon did NOT name, which fall`);
  console.log(`        back to LETTER_SUFFIX + EXT: ${[...unnamed].sort().join(', ') || 'none'}`);
}

// --- Item 4: the numeral side. The collision is REAL and is NOT silently extended. ---------
{
  check('NUMERALS · V7 does not collide — G B D F is a dominant 7 in both systems',
    `${numeralOf(cMajor, 4, 4)} ${chordName(cMajor, 4, 4)}`, 'V7 G7');
  check('NUMERALS · ii7 does not collide', `${numeralOf(cMajor, 1, 4)} ${chordName(cMajor, 1, 4)}`, 'ii7 Dm7');
  check('NUMERALS · I7 DOES collide — the letter side now says maj7, the numeral still says 7',
    `${numeralOf(cMajor, 0, 4)} ${chordName(cMajor, 0, 4)}`, 'I7 Cmaj7');
  check('NUMERALS · vii°7 DOES collide — half-diminished printed with the fully-dim symbol',
    `${numeralOf(cMajor, 6, 4)} ${chordName(cMajor, 6, 4)}`, 'vii°7 Bm7b5');
  check('NUMERALS · i7 DOES collide in harmonic minor',
    `${numeralOf(aHarm, 0, 4)} ${chordName(aHarm, 0, 4)}`, 'i7 Am(maj7)');
  check('NUMERALS · §15.8\'s numeral formula is UNCHANGED — no contract was edited',
    numeralOf(cMajor, 6, 4), applyCase(ROMAN[6], 'diminished') + SUFFIX.diminished + EXT[4]);
}

// =========================================================================================
// THE RECEIPT'S TABLES — printed, not asserted. Copied into receipt-chord-engine.md.
// =========================================================================================
function numeralTable(scale, title) {
  const out = [`\n### ${title}\n`,
    '| Degree | Quality | §9 token | Numeral | `numeralParts` | Letter name | 4-tone | Pitch classes | Notes |',
    '|---|---|---|---|---|---|---|---|---|'];
  for (let i = 0; i < 7; i++) {
    const p = numeralParts(scale, i, 3);
    const notes = skipStack(scale, i, 3).map((_, j) => spellingOf(scale, (i + 2 * j) % 7).text).join(' ');
    out.push(`| ${i + 1} | ${degreeQuality(scale, i)} | \`${degreeColor(scale, i)}\` | **${numeralRendered(scale, i)}** | \`{base:'${p.base}', sup:'${p.sup}'}\` | **${chordName(scale, i, 3)}** | **${numeralRendered(scale, i, 4)}** / **${chordName(scale, i, 4)}** | ${numeralPitchClasses(scale, i, 3).join(', ')} | ${notes} |`);
  }
  return out.join('\n');
}
console.log(numeralTable(cMajor, 'FULL NUMERAL TABLE — C major (tonic 0, unaltered)'));
console.log(numeralTable(aHarm, 'FULL NUMERAL TABLE — A harmonic minor (tonic 9, two `+/-` presses)'));

console.log('\n==========================================================================');
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`  · ${f.name}`);
  process.exitCode = 1;
}
console.log('==========================================================================');

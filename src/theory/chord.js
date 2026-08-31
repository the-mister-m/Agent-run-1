// =========================================================================================
// theory/chord.js — the chord engine
// =========================================================================================
// Pure. Imports scale.js only — no DOM, no audio, no state, no subscriptions.
// Builds voicings, numeral and letter chord labels, and the note bank from a loaded scale.
// No chord-formula table: every quality and extension is computed from stacked scale tones.
// A stack of more than three tones is an "upper overtone chord".
// =========================================================================================

import {
  stackOffset,      // offset of a stacked chord tone from the root
  degreeQuality,    // quality of a chord built on a scale degree
  degreeColor,      // color token for a scale degree
  spellingOf,       // degree index → letter spelling
  spellingOfPc,     // pitch class → letter spelling
  pitchClassOf,     // degree index → pitch class
  midiOf,           // pitch class + octave → midi number
  solfegeOf,        // degree index → solfège syllable
} from './scale.js';

// -----------------------------------------------------------------------------------------
// 1 · CONSTANTS — pure data. Changing one of these is a data edit, never a logic change.
// -----------------------------------------------------------------------------------------

/** Roman numerals, indexed by degree index 0-6. Stored upper case; `applyCase` lowers it. */
export const ROMAN = Object.freeze(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']);

/** Numeral system's quality markers, superscript to the label.
 *   · major / minor are '' — the case carries it (`IV` vs `iv`).
 *   · '°' marks diminished; '?' marks 'altered'. */
export const SUFFIX = Object.freeze({
  major: '', minor: '', augmented: '+', diminished: '°', altered: '?',
  flatFive: 'b5', sharpFive: '#5',
});

/** Letter system's own suffix table, separate from `SUFFIX` — only the `minor` row differs
 *  ('m'), since letters carry no case. */
export const LETTER_SUFFIX = Object.freeze({
  major: '', minor: 'm', augmented: '+', diminished: '°', altered: '?',
  flatFive: 'b5', sharpFive: 'min#5',
});

/** Seventh-chord letter names, keyed by [triad quality][seventh interval class].
 *
 *      P1-M3-P5-M7 = Dmaj7          P1-m3-P5-m7 = Dm7          P1-m3-d5-d7 = Ddim7
 *      P1-M3-P5-m7 = D7             P1-m3-P5-M7 = Dm(maj7)     P1-m3-d5-m7 = Dm7b5
 *
 *  A pair not named here falls back to `LETTER_SUFFIX + EXT` — an augmented triad with a
 *  seventh prints `C+7`, an 'altered' stack prints `D?7`. */
/*  Outer key: 'major' | 'minor' | 'diminished' | 'augmented' | 'altered' (degreeQuality).
 *  Inner key: 'dim' | 'min' | 'maj' | 'altered' (seventhQuality). */
export const SEVENTH_NAME = Object.freeze({
  major:      Object.freeze({ maj: 'maj7', min: '7' }),
  minor:      Object.freeze({ min: 'm7',   maj: 'm(maj7)' }),
  diminished: Object.freeze({ dim: 'dim7', min: 'm7b5' }),
  flatFive:   Object.freeze({ maj: 'maj7b5', min: '7b5' }),
  sharpFive:  Object.freeze({ maj: 'minMaj7#5', min: 'min7#5' }),
});

/** Seventh's interval class, by root-to-fourth-stacked-tone span, mod 12. */
const SEVENTH_CLASS = Object.freeze({ 9: 'dim', 10: 'min', 11: 'maj' });

export const NINTH_NAME = Object.freeze({
  major: Object.freeze({
    maj: Object.freeze({ maj: 'Maj9', min: 'Maj7b9' }),
    min: Object.freeze({ maj: '9', min: '7b9' }),
  }),
  augmented: Object.freeze({
    maj: Object.freeze({ maj: 'Maj9#5', min: 'Maj7b9#5' }),
    min: Object.freeze({ maj: '9#5', min: '+7b9' }),
  }),
  minor: Object.freeze({
    maj: Object.freeze({ maj: 'Maj/Min9', min: 'Maj/Min7b9' }),
    min: Object.freeze({ maj: 'min9', min: 'min7b9' }),
  }),
  diminished: Object.freeze({
    maj: Object.freeze({ maj: '°9Maj7', min: '°Maj7b9' }),
    min: Object.freeze({ maj: '°9', min: '°b9' }),
  }),
  flatFive: Object.freeze({
    maj: Object.freeze({ maj: 'Maj9b5', min: 'Maj7b9b5' }),
    min: Object.freeze({ maj: '9b5', min: '7b9b5' }),
  }),
  sharpFive: Object.freeze({
    maj: Object.freeze({ maj: 'minMaj9#5', min: 'minMaj7b9#5' }),
    min: Object.freeze({ maj: 'min9#5', min: 'min7b9#5' }),
  }),
});

const NINTH_CLASS = Object.freeze({ 1: 'min', 2: 'maj' });

/** Extension digit, shared by both label systems. */
export const EXT = Object.freeze({ 3: '', 4: '7', 5: '9', 6: '', 7: '' });

/** Interval names by semitone, 0-11. */
export const INTERVAL_NAME = Object.freeze([
  'P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7',
]);

/** Case each chord quality takes — upper or lower — derived from the chord's third. */
const CASE = Object.freeze({
  major: 'upper', minor: 'lower', augmented: 'upper', diminished: 'lower', altered: 'upper',
  flatFive: 'upper', sharpFive: 'lower',
});

/** Order `noteBank` applies its two voicing operations in: invert then spread, or spread
 *  then invert — the two orders give different, audibly different voicings. */
export const VOICING_ORDER = 'invert-first';   // 'invert-first' | 'spread-first'

/** A stack tops out at 7 tones. */
export const MAX_COUNT = 7;

// -----------------------------------------------------------------------------------------
// 2 · THE SKIP METHOD
// -----------------------------------------------------------------------------------------
// Every other note in scale order, stacked from the root. A basic chord is 3 notes; more
// than that is an upper overtone chord.
// -----------------------------------------------------------------------------------------

/** True modulo — JS `%` returns negative for a negative left operand. */
function mod(a, n) { return ((a % n) + n) % n; }

/** Clamps `count` into domain 1-7; defaults to 3 if not finite. */
function clampCount(count) {
  const c = Math.trunc(count);
  if (!Number.isFinite(c)) return 3;
  return Math.min(MAX_COUNT, Math.max(1, c));
}

/** Every other note in scale order, stacked from a root — `root` is a degree index 0-6.
 *  Returns semitone offsets from the tonic, in stack order (not sorted). Calls scale.js's
 *  `stackOffset`. */
export function skipStack(scale, root, count = 3) {
  const c = clampCount(count);
  const out = [];
  for (let j = 0; j < c; j++) out.push(stackOffset(scale, root, 2 * j));
  return out;
}

/** True when the stack has more than 3 tones. */
export function isUpperOvertoneChord(count) {
  return count > 3;
}

// -----------------------------------------------------------------------------------------
// 3 · CHORD NUMBERING IS SCALE NUMBERING
// -----------------------------------------------------------------------------------------
// The nth tone of a skip-method stack is the nth note of that root's scale:
//   skipStack builds tone j at        k = 2j
//   rootScaleNote reaches number n at k = n − 1
//   n − 1 = 2j  ⟹  n = 2j + 1  ⟹  chordToneScaleNumber(j) = 2j + 1
// -----------------------------------------------------------------------------------------

/** The current scale starting on degree `root`, in semitones above that root.
 *  `n` is 1-based and unbounded: n = 7 is the 7th note, n = 9 is the 2nd note an octave up. */
export function rootScaleNote(scale, root, n) {
  return stackOffset(scale, root, n - 1) - scale.degrees[root];
}

/** The seven notes of that root's scale, as semitones above the root. */
export function rootScale(scale, root) {
  const out = [];
  for (let n = 1; n <= 7; n++) out.push(rootScaleNote(scale, root, n));
  return out;
}

/** The scale number a stack position carries: 1, 3, 5, 7, 9, 11, 13. */
export function chordToneScaleNumber(j) {
  return 2 * j + 1;
}

// -----------------------------------------------------------------------------------------
// 4 · ROMAN NUMERALS — IN, AND OUT
// -----------------------------------------------------------------------------------------

/** Case is ignored on the way in: `parseNumeral('iv')` and `parseNumeral('IV')` both give
 *  `{ root: 3 }`. Tolerant by construction — keeps only the I and V characters, so 'vii°7',
 *  'V9' and ' iv ' all parse. Returns null for unrecognized input rather than throwing. */
export function parseNumeral(str) {
  if (typeof str !== 'string') return null;
  const key = str.toUpperCase().replace(/[^IV]/g, '');
  const root = ROMAN.indexOf(key);
  return root < 0 ? null : { root };
}

/** A numeral in, pitch classes out. Just `skipStack` rotated by `tonic`. */
export function numeralPitchClasses(scale, root, count = 3) {
  return skipStack(scale, root, count).map((o) => mod(scale.tonic + o, 12));
}

/** Case from the chord's third, via the quality. */
export function applyCase(roman, quality) {
  return CASE[quality] === 'lower' ? roman.toLowerCase() : roman;
}

/** 'V' · 'iv' · 'vii°7' · 'III+' — the flat numeral string. A drawing surface should use
 *  `numeralParts` instead, for the superscript split. Does not name seventh-chord qualities
 *  (see `numeralParts`/`SEVENTH_NAME` for the letter system's equivalent). */
export function numeralOf(scale, root, count = 3) {
  const q = degreeQuality(scale, root);
  return applyCase(ROMAN[root], q) + SUFFIX[q] + (EXT[clampCount(count)] ?? '');
}

/** → { base: 'vii', sup: '°7' } — for a surface that renders the suffix as superscript. */
export function numeralParts(scale, root, count = 3) {
  const q = degreeQuality(scale, root);
  return {
    base: applyCase(ROMAN[root], q),
    sup: SUFFIX[q] + (EXT[clampCount(count)] ?? ''),
  };
}

// -----------------------------------------------------------------------------------------
// 4b · THE SEVENTH'S INTERVAL CLASS
// -----------------------------------------------------------------------------------------
// A second axis on the same stack: nine semitones (root to fourth stacked tone) is a
// diminished 7th, ten a minor 7th, eleven a major 7th.
// -----------------------------------------------------------------------------------------

/** → 'dim' | 'min' | 'maj' | 'altered'. `root` is a degree index 0-6. 'altered' is the
 *  answer for a span that is none of the three. */
export function seventhQuality(scale, root) {
  const stack = skipStack(scale, root, 4);
  if (stack.length < 4) return 'altered';
  return SEVENTH_CLASS[mod(stack[3] - stack[0], 12)] ?? 'altered';
}

/** → the seventh-chord suffix for this quality pair, or null where none is named — the
 *  caller falls back to `LETTER_SUFFIX + EXT`. */
export function seventhSuffix(scale, root) {
  return SEVENTH_NAME[degreeQuality(scale, root)]?.[seventhQuality(scale, root)] ?? null;
}

export function ninthQuality(scale, root) {
  const stack = skipStack(scale, root, 5);
  if (stack.length < 5) return 'altered';
  return NINTH_CLASS[mod(stack[4] - stack[0], 12)] ?? 'altered';
}

export function ninthSuffix(scale, root) {
  return NINTH_NAME[degreeQuality(scale, root)]?.[seventhQuality(scale, root)]?.[ninthQuality(scale, root)] ?? null;
}

// -----------------------------------------------------------------------------------------
// 5 · THE LETTER LABEL
// -----------------------------------------------------------------------------------------
// The letter twin of `numeralOf`, composed entirely from functions this file already ships.
// Quality comes from `degreeQuality`, same as the numeral's.
// -----------------------------------------------------------------------------------------

/** Everything after the letter head — one producer, so `chordName` and `chordNameParts`
 *  can never disagree. At count 4: `Cmaj7`, `G7`, `Dm7`, `Am(maj7)`, `G♯dim7`, `Bm7b5` — six
 *  names, from the triad quality and the seventh's interval class; any pair not named falls
 *  back to `LETTER_SUFFIX + EXT`. Count 5 uses `NINTH_NAME` the same way. */
function letterSuffixOf(scale, root, count) {
  const c = clampCount(count);
  if (c === 4) {
    const ruled = seventhSuffix(scale, root);
    if (ruled !== null) return ruled;
  }
  if (c === 5) {
    const ruled = ninthSuffix(scale, root);
    if (ruled !== null) return ruled;
  }
  return LETTER_SUFFIX[degreeQuality(scale, root)] + (EXT[c] ?? '');
}

/** 'D' · 'Dm' · 'Cmaj7' · 'Bm7b5' — the flat string. A drawing surface should use
 *  `chordNameParts` instead. `root` is a degree index, read through `spellingOf`. */
export function chordName(scale, root, count = 3) {
  return (spellingOf(scale, root).text ?? '') + letterSuffixOf(scale, root, count);
}

/** → { base: 'F♯', sup: '°' } · { base: 'C', sup: 'maj7' } — the whole suffix goes in
 *  `sup`, not inline. */
export function chordNameParts(scale, root, count = 3) {
  return {
    base: spellingOf(scale, root).text ?? '',
    sup: letterSuffixOf(scale, root, count),
  };
}

// -----------------------------------------------------------------------------------------
// 6 · VOICINGS, INVERSIONS AND COMPING
// -----------------------------------------------------------------------------------------
// A voicing is a list of actual pitches — midi numbers — not pitch classes.
// Every function here returns a new array. Nothing mutates in place.
// -----------------------------------------------------------------------------------------

/** How many rotations `invert(v, n)` will actually perform. Exported so that anything which
 *  has to rotate a parallel array (the note bank's tone identities) rotates by exactly the
 *  same amount and the two can never fall out of step. */
export function inversionTimes(n, length) {
  const t = Math.trunc(n);
  if (!Number.isFinite(t)) return 0;
  return Math.min(Math.max(t, 0), Math.max(length - 1, 0));
}

/** Builds the chord tones, low index to high index. `octave` is the Chord Module's octave
 *  selector. */
export function voicing(scale, root, count = 3, octave = 4) {
  const base = midiOf(scale.tonic, octave);
  return skipStack(scale, root, count).map((o) => base + o);
}

/** Rotates `v[0]` up an octave, `n` times. `n = 0` leaves `v` unchanged; `n` clamps at
 *  `v.length` rather than wrapping. */
export function invert(v, n) {
  const times = inversionTimes(n, v.length);
  const out = [...v];
  for (let t = 0; t < times; t++) out.push(out.shift() + 12);
  return out;
}

/** Displaces each tone of `v` by `offsets[j]` octaves. `[0,0,0]` closed · `[0,1,0]` opens
 *  the middle · `[-1,0,0]` drops the lowest tone. A missing or short `offsets` array
 *  displaces nothing rather than throwing. */
export function spread(v, offsets) {
  if (!Array.isArray(offsets)) return [...v];
  return v.map((midi, j) => midi + 12 * (Math.trunc(offsets[j]) || 0));
}

/** What the slash label reads — the lowest pitch in the voicing. The voicing stays in
 *  sounding order, not sorted order; this function exists so nothing has to re-sort. */
export function bassOf(v) {
  return Math.min(...v);
}

/** Which sounding position holds the bass. First occurrence, so a doubled bass names one
 *  tone rather than two. Feeds the note bank's `isBass` flag. */
function bassIndex(v) {
  let at = 0;
  for (let k = 1; k < v.length; k++) if (v[k] < v[at]) at = k;
  return at;
}

/** The text after the slash.
 *   · letter system → the bass note's own letter spelling (`D/F♯`)
 *   · numeral system → the interval from the chord's root to the bass (`III/M6`) */
export function bassText(scale, root, bassPc, system) {
  if (system === 'letter') return spellingOfPc(scale, mod(bassPc, 12)).text ?? '';
  const rootPc = pitchClassOf(scale, root);
  return INTERVAL_NAME[mod(bassPc - rootPc, 12)];
}

/** 'Dm/F' · 'III/M6' · 'V' — root in the bass has no slash. `system` is 'numeral' or
 *  'letter'. */
export function chordLabel(scale, root, v, count = 3, system = 'numeral') {
  const head = system === 'letter'
    ? chordName(scale, root, count)
    : numeralOf(scale, root, count);
  const bassPc = mod(bassOf(v), 12);
  const rootPc = pitchClassOf(scale, root);
  if (bassPc === rootPc) return head;
  return `${head}/${bassText(scale, root, bassPc, system)}`;
}

/** → { base, sup, slash } — `slash` is null when the root is in the bass. A drawing surface
 *  should use this, not `chordLabel`, so the suffix lands in a superscript element. */
export function chordLabelParts(scale, root, v, count = 3, system = 'numeral') {
  const parts = system === 'letter'
    ? chordNameParts(scale, root, count)
    : numeralParts(scale, root, count);
  const bassPc = mod(bassOf(v), 12);
  const rootPc = pitchClassOf(scale, root);
  return {
    base: parts.base,
    sup: parts.sup,
    slash: bassPc === rootPc ? null : bassText(scale, root, bassPc, system),
  };
}

// -----------------------------------------------------------------------------------------
// 7 · THE NOTE BANK
// -----------------------------------------------------------------------------------------
// Runs the logic of the scale together with the logic of the numeral: the numeral side is
// `degreeQuality` + `numeralOf`; the scale side is `rootScaleNote` giving every tone its
// scale number. Computes no label and no color of its own — every string and token on the
// way out comes from `scale.js` or from the functions above.
// -----------------------------------------------------------------------------------------

/** One call — the surface draws what this returns. `system` defaults to 'numeral'.
 *  `tones` is in the voicing's sounding order, and each entry keeps its own stack identity
 *  so `tones[k]` always matches `voicing[k]`, even after a rotation. */
export function noteBank(scale, {
  root,
  count = 3,
  octave = 4,
  inversion = 0,
  offsets = null,
  system = 'numeral',
} = {}) {
  const c = clampCount(count);

  // ——— the stack, and each tone's identity —————————————————————————————
  const stack = skipStack(scale, root, c);
  const base = midiOf(scale.tonic, octave);
  let midis = stack.map((o) => base + o);
  let ids = stack.map((o, j) => ({
    j,
    degreeIndex: mod(root + 2 * j, 7),
    scaleNumber: chordToneScaleNumber(j),
    offset: o,
  }));

  // ——— rearrange, then space ——————————————————————————————————————————
  const times = inversionTimes(inversion, midis.length);
  const rotateIds = () => {
    const out = [...ids];
    for (let t = 0; t < times; t++) out.push(out.shift());
    ids = out;
  };
  if (VOICING_ORDER === 'spread-first') {
    midis = spread(midis, offsets);
    midis = invert(midis, times);
    rotateIds();
  } else {
    midis = invert(midis, times);
    rotateIds();
    midis = spread(midis, offsets);
  }

  const bass = bassOf(midis);
  const bAt = bassIndex(midis);
  const quality = degreeQuality(scale, root);

  return {
    // ——— the numeral side ———————————————————————————————
    numeral: numeralOf(scale, root, c),
    numeralParts: numeralParts(scale, root, c),
    chordName: chordName(scale, root, c),
    chordNameParts: chordNameParts(scale, root, c),
    chordLabel: chordLabel(scale, root, midis, c, system),
    chordLabelParts: chordLabelParts(scale, root, midis, c, system),
    degreeNumber: root + 1,
    quality,
    colorToken: degreeColor(scale, root),
    isUpperOvertoneChord: isUpperOvertoneChord(c),

    // ——— the scale side, one entry per tone ————————————
    tones: ids.map((id, k) => ({
      scaleNumber: id.scaleNumber,
      degreeIndex: id.degreeIndex,
      pc: mod(scale.tonic + id.offset, 12),
      midi: midis[k],
      letter: spellingOf(scale, id.degreeIndex).text,
      solfege: solfegeOf(scale, id.degreeIndex),
      // degree number, 1-7, from the tone's own degree index
      number: id.degreeIndex + 1,
      colorToken: degreeColor(scale, id.degreeIndex),
      isRoot: id.j === 0,
      isBass: k === bAt,
    })),

    voicing: midis,
    bass,
  };
}

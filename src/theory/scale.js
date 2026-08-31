// =========================================================================================
// theory/scale.js — the scale engine
// =========================================================================================
// The single place scale facts are computed. Every note name, every solfège syllable,
// every degree digit and every degree color role a student sees comes out of here.
//
// Pure. Imports nothing — no DOM, no audio, no state, no subscriptions. Functions in,
// values out. The four mutators near the bottom are pure transforms: they take a scale and
// return a new scale.
//
// No hex, ever: `degreeQuality` returns a role — 'major' | 'minor' | 'diminished' |
// 'augmented' | 'altered'. `degreeColor` returns a CSS custom-property name; ui/tokens.css
// maps names to pixels.
//
// No per-key table, ever: quality is two subtractions on `degrees`, every time. `tonic` is
// not an input to it.
//
// Seven stored, eight shown: `degrees` is always 7 entries. The eighth note is degree 1 an
// octave up, not a new degree.
// =========================================================================================

// -----------------------------------------------------------------------------------------
// 1 · CONSTANTS — pure data.
// -----------------------------------------------------------------------------------------

/** W W H W W W H — the major scale pattern. */
export const MAJOR = Object.freeze([0, 2, 4, 5, 7, 9, 11]);

/** The seven letters, and the pitch class each one is when natural. */
export const LETTERS = Object.freeze(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
export const NATURAL_PC = Object.freeze([0, 2, 4, 5, 7, 9, 11]);

/** Accidental glyphs by signed semitone offset, -2..2. Single accidentals are Unicode ♯/♭;
 *  double accidentals are marked up in italic (`<i>bb</i>`, `<i>x</i>`) — a surface drawing
 *  these with `textContent` prints the tags literally; use `innerHTML` on this, or
 *  `GLYPH_ASCII`. */
export const GLYPH = Object.freeze({
  '-2': '<i>bb</i>', '-1': '♭', 0: '', 1: '♯', 2: '<i>x</i>',
});
export const GLYPH_ASCII = Object.freeze({
  '-2': '<i>bb</i>', '-1': 'b', 0: '', 1: '<i>#</i>', 2: '<i>x</i>',
});

/** Solfège syllables, indexed by degree index, not by letter. Movable do. */
export const SOLFEGE = Object.freeze(['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti']);

/** Maps each chord quality to its CSS custom-property token. */
export const QUALITY_TOKEN = Object.freeze({
  major: '--deg-major',
  minor: '--deg-minor',
  diminished: '--deg-dim',
  augmented: '--deg-aug',
  altered: '--deg-altered',
  flatFive: '--deg-flat5',
  sharpFive: '--deg-sharp5',
});

/** Pure data — the named scale presets, offsets from the tonic. */
export const PRESETS = Object.freeze({
  'Major':          Object.freeze([0, 2, 4, 5, 7, 9, 11]),   // = Ionian
  'Dorian':         Object.freeze([0, 2, 3, 5, 7, 9, 10]),
  'Phrygian':       Object.freeze([0, 1, 3, 5, 7, 8, 10]),
  'Lydian':         Object.freeze([0, 2, 4, 6, 7, 9, 11]),
  'Mixolydian':     Object.freeze([0, 2, 4, 5, 7, 9, 10]),
  'Aeolian':        Object.freeze([0, 2, 3, 5, 7, 8, 10]),   // = natural minor
  'Locrian':        Object.freeze([0, 1, 3, 5, 6, 8, 10]),
  'Harmonic Minor': Object.freeze([0, 2, 3, 5, 7, 8, 11]),
  'Melodic Minor':  Object.freeze([0, 2, 3, 5, 7, 9, 11]),
});

/** Extra scale names recognized for labeling only, never drawn in the picker. Ships empty. */
export const EXTRA_NAMES = Object.freeze({});

/** The label shown when `degrees` matches no known preset or extra name. */
export const UNKNOWN_SCALE_NAME = 'scale unknown';

/** A degree may move ±2 semitones from its major value and no further. */
export const DEGREE_CLAMP = 2;

/** Where Do sits on the circle, and which way the circle turns. */
export const CIRCLE_START_ANGLE = -90;   // degrees; -90 = 12 o'clock
export const CIRCLE_DIRECTION = +1;      // +1 clockwise, -1 counter-clockwise

/** Seven drawn positions on the circle. `circlePositions()` still returns 8 entries; entry
 *  8 is not drawn and survives only to carry the octave pitch. */
export const CIRCLE_SLOTS = 7;

/** Which accidental direction C major (tonic 0, no key-signature direction) spells its
 *  out-of-key chromatic notes in. */
export const CHROMATIC_DIRECTION_AT_C = +1;

/** The two intervals of a three-note skip stack, classified. Five outcomes; the first four
 *  are the four tertian triads. */
const QUALITY = Object.freeze({
  4: Object.freeze({ 3: 'major', 4: 'augmented', 2: 'flatFive' }),
  3: Object.freeze({ 4: 'minor', 3: 'diminished', 5: 'sharpFive' }),
});

// -----------------------------------------------------------------------------------------
// 2 · PITCH
// -----------------------------------------------------------------------------------------

/** True modulo — JS `%` returns negative for a negative left operand. */
function mod(a, n) { return ((a % n) + n) % n; }

/** i = degree index 0-6 → pitch class 0-11. */
export function pitchClassOf(scale, i) {
  return mod(scale.tonic + scale.degrees[i], 12);
}

/** The seven pitch classes, in degree order. Can hold a repeat when two degrees share a
 *  pitch class. */
export function pitchClasses(scale) {
  const out = [];
  for (let i = 0; i < 7; i++) out.push(pitchClassOf(scale, i));
  return out;
}

/** pc or midi → degree index 0-6, or -1. On a duplicated pitch class returns the lower
 *  index (indexOf semantics). */
export function degreeIndexOf(scale, pitch) {
  return pitchClasses(scale).indexOf(mod(pitch, 12));
}

/** pc or midi → bool. */
export function isInKey(scale, pitch) {
  return degreeIndexOf(scale, pitch) >= 0;
}

/** Middle C (C4) is midi 60. */
export function midiOf(pc, octave) {
  return 12 * (octave + 1) + pc;
}

/** A440 / 12-TET. */
export function hz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

// -----------------------------------------------------------------------------------------
// 3 · SPELLING
// -----------------------------------------------------------------------------------------
// The seven degrees take the seven letter names in order, one each, and the accidental is
// whatever makes each letter land on the right pitch class. An altered degree keeps its
// letter and changes its accidental instead of becoming a different letter.
//
// Which letter the tonic gets:
//   1. the key signature decides;
//   2. where both faces are real signatures, fewer accidentals wins  (tonic 1 → D♭);
//   3. where they tie exactly, show both                             (tonic 6 → F♯/G♭).
// -----------------------------------------------------------------------------------------

/** How many sharps, and how many flats, a major key on `tonic` would need.
 *  Circle of fifths as arithmetic: each step up a fifth (+7 semitones) adds one sharp. */
function keySignatureCounts(tonic) {
  const sharps = mod(7 * tonic, 12);
  const flats = mod(-7 * tonic, 12);
  return { sharps, flats };
}

/** The letter/accidental a major key takes when spelled on the given side.
 *  Sharp side walks the letters up in fifths ((+4) % 7); flat side down ((+3) % 7). */
function keyFace(tonic, count, side) {
  const letterIndex = mod(count * (side > 0 ? 4 : 3), 7);
  const natural = NATURAL_PC[letterIndex];
  const d = mod(tonic - natural, 12);
  const accidental = d > 6 ? d - 12 : d;
  return { letter: LETTERS[letterIndex], accidental };
}

/** → { letter, accidental, alt, tie }.
 *  tie === false: alt === null.  tie === true: alt is the other face.
 *  keySpelling(6) = { letter:'F', accidental:1, alt:{letter:'G', accidental:-1}, tie:true } */
export function keySpelling(tonic) {
  const pc = mod(tonic, 12);
  const { sharps, flats } = keySignatureCounts(pc);
  const sharpFace = keyFace(pc, sharps, +1);
  const flatFace = keyFace(pc, flats, -1);

  // A key signature holds at most seven accidentals; anything past that is not a key.
  const sharpValid = sharps <= 7;
  const flatValid = flats <= 7;

  if (sharpValid && flatValid && sharps === flats) {
    // Two real signatures, exactly tied. Identical faces (tonic 0) are not a tie.
    const same = sharpFace.letter === flatFace.letter
      && sharpFace.accidental === flatFace.accidental;
    if (same) return { letter: sharpFace.letter, accidental: sharpFace.accidental, alt: null, tie: false };
    return { letter: sharpFace.letter, accidental: sharpFace.accidental, alt: flatFace, tie: true };
  }
  const useSharp = sharpValid && (!flatValid || sharps < flats);
  const face = useSharp ? sharpFace : flatFace;
  return { letter: face.letter, accidental: face.accidental, alt: null, tie: false };
}

/** Which way this key spells a pitch that is not one of its seven. */
function keyDirection(tonic) {
  const { sharps, flats } = keySignatureCounts(mod(tonic, 12));
  if (sharps === 0 && flats === 0) return CHROMATIC_DIRECTION_AT_C;  // tonic 0
  return sharps < flats ? +1 : -1;
}

/** The spelling algorithm, run from one letter base. A tie key's dual spelling is this
 *  function run twice — once from 'F', once from 'G' — and the two texts joined with '/'. */
function spellWithBase(scale, i, base) {
  const letterIndex = mod(base + i, 7);            // one letter per degree, in order
  const natural = NATURAL_PC[letterIndex];
  const target = pitchClassOf(scale, i);
  const d = mod(target - natural, 12);
  const accidental = d > 6 ? d - 12 : d;           // signed
  const g = GLYPH[accidental];
  return {
    letter: LETTERS[letterIndex],
    accidental,
    // an accidental outside −2…+2 has no spelling
    text: g === undefined ? null : LETTERS[letterIndex] + g,
  };
}

/** → { letter, accidental, text }.
 *  In the one tie key (tonic 6) `text` is the composite face — 'F♯/G♭', 'G♯/A♭', … 'E♯/F'
 *  — and `letter`/`accidental` carry the sharp face, which is the primary. */
export function spellingOf(scale, i) {
  const ks = keySpelling(scale.tonic);
  const primary = spellWithBase(scale, i, LETTERS.indexOf(ks.letter));
  if (!ks.tie) return primary;
  const other = spellWithBase(scale, i, LETTERS.indexOf(ks.alt.letter));
  if (primary.text === null || other.text === null) {
    return { letter: primary.letter, accidental: primary.accidental, text: null };
  }
  if (primary.text === other.text) return primary;
  return {
    letter: primary.letter,
    accidental: primary.accidental,
    text: `${primary.text}/${other.text}`,
  };
}

/** One pitch class, spelled in one direction. Never falls through to a neighbouring
 *  letter's single name — a natural pc keeps its own letter. */
function spellPcInDirection(pc, dir) {
  const natIndex = NATURAL_PC.indexOf(pc);
  if (natIndex >= 0) {
    return { letter: LETTERS[natIndex], accidental: 0, text: LETTERS[natIndex] };
  }
  const li = NATURAL_PC.indexOf(mod(pc - dir, 12));
  return { letter: LETTERS[li], accidental: dir, text: LETTERS[li] + GLYPH[dir] };
}

/** A letter for a pitch class not in the key, spelled in the key signature's direction;
 *  both faces in the tie key. Called by `label()`'s 'letter' branch and by
 *  `spellingOfPc`. */
export function chromaticSpelling(scale, pc) {
  const p = mod(pc, 12);
  const ks = keySpelling(scale.tonic);
  if (ks.tie) {
    const a = spellPcInDirection(p, +1);
    const b = spellPcInDirection(p, -1);
    if (a.text === b.text) return a;
    return { letter: a.letter, accidental: a.accidental, text: `${a.text}/${b.text}` };
  }
  return spellPcInDirection(p, keyDirection(scale.tonic));
}

/** → { letter, accidental, text } for any pitch class, in key or out. */
export function spellingOfPc(scale, pc) {
  const i = degreeIndexOf(scale, pc);
  return i >= 0 ? spellingOf(scale, i) : chromaticSpelling(scale, pc);
}

// -----------------------------------------------------------------------------------------
// 4 · SOLFÈGE — MOVABLE DO
// -----------------------------------------------------------------------------------------
// The syllable is a property of the degree index, not of the letter. The tonic is always
// Do, in all twelve keys. A pitch that is not one of the seven degrees returns '' — see
// label().
// -----------------------------------------------------------------------------------------

/** Signed semitones off the major pattern. 0 = plain. Measured against the major pattern,
 *  not against the letter: in D major degree 3 is F♯ (an accidental in the spelling) but
 *  degrees[2] − MAJOR[2] === 0, so its syllable is a plain `Mi` with no mark. */
export function solfegeDeviation(scale, i) {
  return scale.degrees[i] - MAJOR[i];
}

/** The solfège mark. GLYPH is reused, not duplicated. Falls through to '*' past ±2. */
function MARK(scale, i) {
  return GLYPH[solfegeDeviation(scale, i)] ?? '*';
}

/** 'Do' | 'Re' | … | 'Mi♭'. Always speaks, for every degree, in every key. */
export function solfegeOf(scale, i) {
  return SOLFEGE[i] + MARK(scale, i);
}

// -----------------------------------------------------------------------------------------
// 5 · THE COLOR RULE — COMPUTED, NEVER LOOKED UP
// -----------------------------------------------------------------------------------------
// Colors major and minor digits in the scale circle.
//
//   1. Nothing sorts the three offsets — stackOffset walks the array in stored order.
//   2. The color always uses the triad — three notes — however many tones are sounding.
//   3. `tonic` is not an input. A transposed scale is the same colors.
// -----------------------------------------------------------------------------------------

/** One note of a skip-method stack: k = 0, 2, 4, 6, … Mod 7, +12 per wrap. One
 *  implementation, two callers — the color rule here and chord.js's `skipStack`. */
export function stackOffset(scale, i, k) {
  const n = i + k;
  return scale.degrees[mod(n, 7)] + 12 * Math.floor(n / 7);
}

/** The triad on degree i — three notes, every other note in scale order. */
export function skipTriad(scale, i) {
  return [stackOffset(scale, i, 0), stackOffset(scale, i, 2), stackOffset(scale, i, 4)];
}

/** → 'major' | 'minor' | 'diminished' | 'augmented' | 'altered'.
 *  Computed from `scale.degrees` alone; `scale.tonic` never appears.
 *  'altered' is the honest answer for a stack that is not a triad at all. */
export function degreeQuality(scale, i) {
  const [a, b, c] = skipTriad(scale, i);
  return QUALITY[b - a]?.[c - b] ?? 'altered';
}

/** → a CSS custom-property name, never a hex value. */
export function degreeColor(scale, i) {
  return QUALITY_TOKEN[degreeQuality(scale, i)];
}

// -----------------------------------------------------------------------------------------
// 6 · LABELS — the only producer of overlay strings
// -----------------------------------------------------------------------------------------

/** The circle's slot label. '1/8' '2' '3' '4' '5' '6' '7'. */
export function slotNumberLabel(p) {
  return p === 1 ? '1/8' : String(p);
}

/** → 1-8, or null if the pitch is not in the key.
 *  `opts.position` is the 1-based slot the surface is drawing (the circle's position, a
 *  keyboard's key index) in degree order — it exists for '8': the same pitch class is '1'
 *  at the bottom of an octave and '8' at the top, a property of the slot, not the pitch.
 *  With opts.position omitted, this returns 1 for the tonic. */
export function degreeNumberOf(scale, pitch, opts = {}) {
  const i = degreeIndexOf(scale, pitch);
  if (i < 0) return null;
  if (i === 0 && opts.position != null) {
    if (Math.floor((opts.position - 1) / 7) >= 1) return 8;
  }
  return i + 1;
}

/** The string a surface draws, for the four pitch modes.
 *  Out of key: 'letter' spells chromatically, 'number' and 'solfege' return ''.
 *  An unspellable degree (past DEGREE_CLAMP, text === null) draws '' rather than throwing. */
export function label(scale, pitch, overlay, opts = {}) {
  const pc = mod(pitch, 12);
  const i = degreeIndexOf(scale, pc);
  switch (overlay) {
    case 'letter': {
      const s = i >= 0 ? spellingOf(scale, i) : chromaticSpelling(scale, pc);
      return s.text ?? '';
    }
    case 'number': {
      const n = degreeNumberOf(scale, pc, opts);
      return n === null ? '' : String(n);
    }
    case 'solfege':
      return i >= 0 ? solfegeOf(scale, i) : '';
    case 'none':
    default:
      return '';
  }
}

// -----------------------------------------------------------------------------------------
// 7 · THE CIRCLE — one call; the surface draws what this returns.
// -----------------------------------------------------------------------------------------

/** → 8 entries — a finished row per position, so no surface computes its own colors or
 *  builds its own label strings.
 *
 *  Position 8 is position 1: same degree index, same pitch class, same letter, same
 *  syllable, same quality, same color. It differs in two ways: it is not drawn (seven
 *  slots, the Do slot carries '1/8'), and it carries the octave pitch on `midi`.
 *
 *  Position 8 carries no +/- of its own — `setScaleDegree` rejects index 7 below. */
export function circlePositions(scale, octave) {
  const out = [];
  for (let p = 1; p <= 8; p++) {
    const degreeIndex = (p - 1) % 7;
    const octaveOffset = Math.floor((p - 1) / 7);
    out.push({
      position: p,
      degreeIndex,
      octaveOffset,
      pc: pitchClassOf(scale, degreeIndex),
      midi: midiOf(scale.tonic, octave) + scale.degrees[degreeIndex] + 12 * octaveOffset,
      isOctaveClose: p === 8,
      number: slotNumberLabel(p),
      letter: spellingOf(scale, degreeIndex).text,
      solfege: solfegeOf(scale, degreeIndex),
      quality: degreeQuality(scale, degreeIndex),
      colorToken: degreeColor(scale, degreeIndex),
      altered: scale.altered ? scale.altered[degreeIndex] : false,
    });
  }
  return out;
}

// -----------------------------------------------------------------------------------------
// 8 · NAMING
// -----------------------------------------------------------------------------------------

/** Back-matches on `degrees` only, so it is key-independent: a student who bends C major
 *  into [0,2,3,5,7,9,10] by hand is told "Dorian", and so is a student who does it from F.
 *  `name` carries no key. Anything unrecognized reads `UNKNOWN_SCALE_NAME`. */
export function scaleName(scale) {
  const d = scale.degrees;
  for (const [name, p] of [...Object.entries(PRESETS), ...Object.entries(EXTRA_NAMES)]) {
    let hit = true;
    for (let i = 0; i < 7; i++) if (p[i] !== d[i]) { hit = false; break; }
    if (hit) return name;
  }
  return UNKNOWN_SCALE_NAME;
}

/** Reads `originName`, not `name` — `name` chases `degrees`, so the origin needs a field
 *  of its own to survive an altered scale back-matching another preset. Falls back to
 *  MAJOR, since every scale is generated from the major pattern. */
export function originDegrees(scale) {
  return PRESETS[scale.originName] ?? MAJOR;
}

/** Recomputes `altered` when it is unknown (a reload saves neither `altered` nor
 *  `preset`). */
export function alteredFrom(scale) {
  const origin = originDegrees(scale);
  return scale.degrees.map((v, i) => v !== origin[i]);
}

// -----------------------------------------------------------------------------------------
// 9 · THE FOUR MUTATIONS — pure: scale in, new scale out
// -----------------------------------------------------------------------------------------
// core/state.js owns `state.scale` and the 'scale' event; it calls these and stores the
// result. Nothing here mutates its argument, touches the DOM, or subscribes to anything.
//
//   call                  tonic     degrees        altered      preset      originName
//   setScaleTonic(pc)     ← pc      untouched      untouched    untouched   untouched
//   setScalePreset(name)  untouched ← all 7        all false    ← name      ← name
//   setScaleDegree(i,n)   untouched degrees[i]+=n  [i] = true   ← 'Custom'  untouched
//   resetScaleDegree(i)   untouched ← origin[i]    [i] = false  see below   untouched
// -----------------------------------------------------------------------------------------

/** The scale object shape, built. `altered`/`preset`/`originName` are session display
 *  state, not part of the saved file. */
export function createScale(tonic = 0, presetName = 'Major') {
  const degrees = [...(PRESETS[presetName] ?? MAJOR)];
  return {
    tonic: mod(tonic, 12),
    degrees,
    name: scaleName({ degrees }),
    altered: [false, false, false, false, false, false, false],
    preset: PRESETS[presetName] ? presetName : 'Custom',
    originName: PRESETS[presetName] ? presetName : 'Major',
  };
}

function withScale(scale, patch) {
  const next = { ...scale, ...patch };
  next.name = scaleName(next);
  return next;
}

/** Transposes: `degrees` holds offsets from the tonic, so moving `tonic` transposes the
 *  whole shape for free and a student who built something keeps it. */
export function setScaleTonic(scale, pc) {
  return withScale(scale, { tonic: mod(pc, 12) });
}

/** Writes all 7 degrees at once and clears `altered`. */
export function setScalePreset(scale, name) {
  const p = PRESETS[name];
  if (!p) return scale;              // unknown preset: nothing happens, nothing throws
  return withScale(scale, {
    degrees: [...p],
    altered: [false, false, false, false, false, false, false],
    preset: name,
    originName: name,
  });
}

/** The +/- on the circle and the diatonic keys.
 *
 *  Two rejections, neither of which throws:
 *   · index outside 0-6 — position 8 has no +/- of its own.
 *   · past DEGREE_CLAMP — ±2 semitones from the degree's major value. The move is clamped,
 *     not refused, so a held button stops instead of doing nothing visible. */
export function setScaleDegree(scale, i, n) {
  if (!Number.isInteger(i) || i < 0 || i > 6) return scale;
  const raw = scale.degrees[i] + n;
  const lo = MAJOR[i] - DEGREE_CLAMP;
  const hi = MAJOR[i] + DEGREE_CLAMP;
  const value = Math.min(hi, Math.max(lo, raw));
  const degrees = [...scale.degrees];
  degrees[i] = value;
  const altered = [...(scale.altered ?? alteredFrom(scale))];
  altered[i] = value !== originDegrees(scale)[i];
  return withScale(scale, { degrees, altered, preset: 'Custom' });
}

/** One degree back to the preset value. When it clears the last remaining `true`,
 *  `preset` returns to `originName`. */
export function resetScaleDegree(scale, i) {
  if (!Number.isInteger(i) || i < 0 || i > 6) return scale;
  const origin = originDegrees(scale);
  const degrees = [...scale.degrees];
  degrees[i] = origin[i];
  const altered = [...(scale.altered ?? alteredFrom(scale))];
  altered[i] = false;
  const preset = altered.some(Boolean) ? 'Custom' : (scale.originName ?? 'Major');
  return withScale(scale, { degrees, altered, preset });
}

// =========================================================================================
// docs/scratchpad/scale-circle-donecheck.mjs — THROWAWAY. Not project code. Not in /src.
// =========================================================================================
// Seat: `scale-circle`, P3/S5. Written 2026-08-24 17:51 EDT.
// Run:  node "docs/scratchpad/scale-circle-donecheck.mjs"    (from the project root)
//
// WHAT THIS PROVES, AND WHAT IT CANNOT
//   It mounts the real `src/surfaces/scale-circle.js` against a ~120-line DOM stand-in and
//   drives it with real events, so every claim below is the shipped file running, not a
//   description of it. What it CANNOT prove is anything about pixels — that the circle reads
//   from ten feet away, that the colours are right, that the animation is worth watching.
//   Those are the browser page's job: docs/scratchpad/scale-circle-test.html.
//
// THE SOURCE SCAN STRIPS COMMENTS FIRST. This file's prose talks about '1/8', '♯' and 'Do'
// constantly; the point of the check is that no such string is in the CODE. Comments are
// removed, then the scan runs on what is left.
// =========================================================================================

import { readFileSync } from 'node:fs';

// -----------------------------------------------------------------------------------------
// 0 · A DOM, in as few lines as will hold the surface up
// -----------------------------------------------------------------------------------------

const byId = new Map();

class El {
  constructor(tag) {
    this.tagName = tag;
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.style = {};
    this._classes = new Set();
    this._text = '';
    this._listeners = new Map();
    this._id = '';
    this.classList = {
      add: (c) => this._classes.add(c),
      remove: (c) => this._classes.delete(c),
      contains: (c) => this._classes.has(c),
      toggle: (c, on) => (on ? this._classes.add(c) : this._classes.delete(c)),
    };
  }

  get id() { return this._id; }
  set id(v) { this._id = v; byId.set(v, this); }

  get className() { return [...this._classes].join(' '); }
  set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)); }

  setAttribute(k, v) {
    this.attributes.set(k, String(v));
    if (k === 'class') this.className = v;
    else if (k === 'id') this.id = String(v);
    else if (k.startsWith('data-')) {
      const key = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[key] = String(v);
    }
  }

  getAttribute(k) { return this.attributes.get(k) ?? null; }

  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }

  remove() {
    if (!this.parentNode) return;
    const i = this.parentNode.children.indexOf(this);
    if (i >= 0) this.parentNode.children.splice(i, 1);
    this.parentNode = null;
  }

  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); this.children = []; }

  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
  }

  removeEventListener(type, fn) { this._listeners.get(type)?.delete(fn); }

  listenerCount() {
    let n = 0;
    for (const set of this._listeners.values()) n += set.size;
    return n;
  }

  /** Only the form this surface uses: a comma-separated list of class selectors. */
  closest(selector) {
    const wanted = selector.split(',').map((s) => s.trim().replace(/^\./, ''));
    let node = this;
    while (node) {
      if (wanted.some((c) => node._classes?.has(c))) return node;
      node = node.parentNode;
    }
    return null;
  }

  walk(fn) {
    fn(this);
    for (const c of this.children) c.walk(fn);
  }
}

const documentStub = {
  head: new El('head'),
  createElement: (tag) => new El(tag),
  createElementNS: (_ns, tag) => new El(tag),
  getElementById: (id) => byId.get(id) ?? null,
};

globalThis.document = documentStub;
globalThis.window = new El('window');

function fire(target, type, event) {
  const set = target._listeners.get(type);
  if (!set) return;
  for (const fn of [...set]) fn(event);
}

function evt(target, extra = {}) {
  return { target, preventDefault() {}, ...extra };
}

// -----------------------------------------------------------------------------------------
// 1 · the real modules
// -----------------------------------------------------------------------------------------

const { default: ScaleCircle, OVERLAYS } = await import('../../src/surfaces/scale-circle.js');
const { default: Keyboard } = await import('../../src/surfaces/keyboard.js');
const { input } = await import('../../src/core/input.js');
const scaleJs = await import('../../src/theory/scale.js');
const stateJs = await import('../../src/core/state.js');
const chordJs = await import('../../src/theory/chord.js');

const SOURCE_PATH = 'src/surfaces/scale-circle.js';
const SOURCE = readFileSync(SOURCE_PATH, 'utf8');
/** Comments out. What is left is the code the scans below are about. */
const CODE = SOURCE
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n')
  .map((line) => line.replace(/(^|[^:'"`\\])\/\/.*$/, '$1'))
  .join('\n');

let pass = 0;
let fail = 0;
const failures = [];

function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else { fail++; failures.push({ name, got, want }); }
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
}

function section(title) {
  console.log(`\n${'-'.repeat(88)}\n${title}\n${'-'.repeat(88)}`);
}

// -----------------------------------------------------------------------------------------
// 2 · THE FILE ITSELF — "zero hex values and zero label strings" (DONE-CHECK, verbatim)
// -----------------------------------------------------------------------------------------
section('THE FILE — no hex, no label strings');

const hexHits = CODE.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
check('zero hex values in the code', hexHits, []);

// Every §9 colour reaches the DOM as a custom-property NAME, so `var(--` must appear and a
// literal token name must not be typed next to it — `degreeColor()` supplies it.
check('colours are written as var(<token>) and the token comes from scale.js',
  /var\(\$\{entry\.colorToken\}\)/.test(CODE), true);
check('no §9 degree token name is typed into the code',
  CODE.match(/--deg-[a-z]+/g) ?? [], []);

// Pitch/degree/chord label strings. Comments are already gone.
const labelProbes = {
  'accidental glyphs (♯ ♭)': /[♯♭]/g,
  "the circle's composite digit ('1/8')": /1\/8/g,
  'solfège syllables': /['"`](Do|Re|Mi|Fa|Sol|La|Ti)['"`]/g,
  'letter names': /['"`][A-G](['"`]|[♯♭#b]['"`])/g,
  'roman numerals': /['"`](I{1,3}|IV|VI{0,2}|i{1,3}|iv|vi{0,2})['"`]/g,
  'quality markers (° superscript circle)': /°/g,
  'the SOLFEGE / LETTERS / ROMAN arrays rebuilt locally': /\b(SOLFEGE|LETTERS|ROMAN)\s*=/g,
};
for (const [label, re] of Object.entries(labelProbes)) {
  check(`no ${label}`, CODE.match(re) ?? [], []);
}

// The two glyphs that ARE in the code, declared rather than hidden: §4's `+/-` control.
const pmGlyphs = [...new Set(CODE.match(/'\+'|'−'/g) ?? [])].sort();
check("the only glyphs in the code are §4's +/- control pair", pmGlyphs, ["'+'", "'−'"]);

// Orientation and slot count are the contract's constants, not numbers typed here.
check('A3/A4 constants are imported, never re-typed',
  /CIRCLE_SLOTS|CIRCLE_START_ANGLE|CIRCLE_DIRECTION/.test(CODE)
  && !/=\s*-90\b/.test(CODE) && !/CIRCLE_SLOTS\s*=/.test(CODE), true);

// §10: no dependency, and a surface never reaches for audio or an instrument.
const imports = [...SOURCE.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
check('imports are three project files and nothing else',
  imports, ['../theory/scale.js', '../theory/chord.js', '../core/input.js']);

// -----------------------------------------------------------------------------------------
// 3 · §12 — interchangeable with the keyboard
// -----------------------------------------------------------------------------------------
section('§12 — the Surface interface, checked against the keyboard it must swap in for');

check("static sourceId is §5's 'circle'", ScaleCircle.sourceId, 'circle');

const surfaceApi = ['mount', 'mountCompact', 'mountExpanded', 'unmount', 'dispose'];
for (const m of surfaceApi) {
  check(`${m}() exists on both surfaces`,
    [typeof ScaleCircle.prototype[m], typeof Keyboard.prototype[m]], ['function', 'function']);
}
check('overlay is an accessor on both, per §6',
  [!!Object.getOwnPropertyDescriptor(ScaleCircle.prototype, 'overlay')?.set,
   !!Object.getOwnPropertyDescriptor(Keyboard.prototype, 'overlay')?.set], [true, true]);
check("§6's enum is the closed four", OVERLAYS, ['none', 'letter', 'number', 'solfege']);

// -----------------------------------------------------------------------------------------
// 4 · MOUNTED — seven slots, two rings, Do at 12 o'clock
// -----------------------------------------------------------------------------------------
section('THE DRAWING — A3, A4, and §6');

/** UPDATED after core/state.js landed: this was a harness stand-in for the §4 store while
 *  that file did not exist. It is the REAL store now — same call surface, which is what the
 *  surface was built against. The circle still takes it as an argument (§12.1); the harness
 *  supplies one per scale it wants to drive independently. */
const makeStore = (initial) => stateJs.createState(initial);

const store = makeStore(scaleJs.createScale(0, 'Major'));
const host = new El('div');
const circle = new ScaleCircle(null, input, store);
circle.mount(host, 'expanded');

const root = host.children[0];
const svg = root.children[0];

const zones = [];
root.walk((n) => { if (n._classes.has('cbdaw-circle__zone')) zones.push(n); });
const degreeZones = zones.filter((z) => z.dataset.ring === 'degree');
const numeralZones = zones.filter((z) => z.dataset.ring === 'numeral');

check('A4 — SEVEN drawn degree slots, not eight', degreeZones.length, 7);
check('A4 — SEVEN numeral slots beside them', numeralZones.length, 7);

const texts = [];
root.walk((n) => { if (n._classes.has('cbdaw-circle__text')) texts.push(n); });
const degreeTexts = texts.filter((t) => t.dataset.ring === 'degree');
check("A4 — the Do slot's digit is the composite scale.js hands over",
  degreeTexts[0].textContent, scaleJs.slotNumberLabel(1));
check('A4 — and it is the ONLY composite; the other six are plain digits',
  degreeTexts.slice(1).map((t) => t.textContent), ['2', '3', '4', '5', '6', '7']);

// A3 — Do at 12 o'clock, top centre. The Do slot's own label sits on the slot's mid-angle,
// so its coordinates are the honest witness: dead centre horizontally, above the middle.
const startAngleUsed = scaleJs.CIRCLE_START_ANGLE;
check('A3 — orientation and direction come from scale.js, unmodified',
  [startAngleUsed, scaleJs.CIRCLE_DIRECTION], [-90, 1]);
check('A3 — the Do slot sits at 12 o\'clock: its label is centred and above the middle',
  (() => {
    const x = Number(degreeTexts[0].getAttribute('x'));
    const y = Number(degreeTexts[0].getAttribute('y'));
    return Math.abs(x - 64) < 0.01 && y < 64;
  })(), true);
// …and the second slot is to its RIGHT, which is what CIRCLE_DIRECTION = +1 (clockwise) means.
check('A3 — the next slot is clockwise from Do',
  Number(degreeTexts[1].getAttribute('x')) > 64, true);

// §9 — the colour on every slot is the token `degreeColor()` returned. C major's series.
const scale0 = store.scale;
check('§9 — every fill is var(<the token scale.js returned>)',
  degreeZones.map((z) => z.getAttribute('fill')),
  [0, 1, 2, 3, 4, 5, 6].map((i) => `var(${scaleJs.degreeColor(scale0, i)})`));
check('C major reads major-minor-minor-major-major-minor-diminished, from the engine',
  [0, 1, 2, 3, 4, 5, 6].map((i) => scaleJs.degreeQuality(scale0, i)),
  ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished']);

// A9 — the numeral is drawn from `numeralParts`, superscript split intact.
const numeralTexts = texts.filter((t) => t.dataset.ring === 'numeral');
check('A9 — the seventh slot draws its ° in a SEPARATE superscript tspan',
  numeralTexts[6].children.map((c) => c.textContent),
  [chordJs.numeralParts(scale0, 6, 3).base, chordJs.numeralParts(scale0, 6, 3).sup]);

// §6 — the overlay cycles and every mode's string comes off the engine's row.
const row0 = scaleJs.circlePositions(scale0, 4)[0];
circle.overlay = 'letter';
check("§6 — 'letter' draws scale.js's spelling", firstDegreeText(root), row0.letter);
circle.overlay = 'solfege';
check("§6 — 'solfege' draws scale.js's syllable", firstDegreeText(root), row0.solfege);
circle.overlay = 'none';
check("§6 — 'none' draws nothing", firstDegreeText(root), null);
circle.overlay = 'number';

function firstDegreeText(node) {
  const found = [];
  node.walk((n) => {
    if (n._classes.has('cbdaw-circle__text') && n.dataset.ring === 'degree') found.push(n);
  });
  return found.length ? found[0].textContent : null;
}

// -----------------------------------------------------------------------------------------
// 5 · PLAYING — seat questions 2 and 3
// -----------------------------------------------------------------------------------------
section('PLAYING — a degree sounds a note, a numeral sounds the chord');

const heard = [];
const offHeard = [];
const unsubOn = input.on('noteon', (e) => heard.push(e));
const unsubOff = input.on('noteoff', (e) => offHeard.push(e));

function currentZones() {
  const found = [];
  host.children[0].walk((n) => { if (n._classes.has('cbdaw-circle__zone')) found.push(n); });
  return found;
}

function press(zone, pointerId) {
  const s = host.children[0].children[0];
  fire(s, 'pointerdown', evt(zone, { pointerId }));
}
function release(pointerId) {
  const s = host.children[0].children[0];
  fire(s, 'pointerup', evt(s, { pointerId }));
}

// — a degree —
heard.length = 0; offHeard.length = 0;
press(currentZones().filter((z) => z.dataset.ring === 'degree')[4], 1);
const expectDegree = scaleJs.circlePositions(store.scale, 4)[4].midi;
check('clicking the 5th degree emits ONE noteon',
  heard.map((e) => [e.note, e.source, e.velocity]), [[expectDegree, 'circle', 0.8]]);
check('the slot lights from the BUS, not from the pointer handler',
  currentZones().filter((z) => Number(z.dataset.pc) === scaleJs.pitchClassOf(store.scale, 4))
    .every((z) => z._classes.has('is-on')), true);
release(1);
check('releasing sends the matching noteoff',
  offHeard.map((e) => [e.note, e.source]), [[expectDegree, 'circle']]);
check('and the light goes out',
  currentZones().some((z) => z._classes.has('is-on')), false);

// — a numeral: the CHORD on that degree, through theory/chord.js —
heard.length = 0; offHeard.length = 0;
press(currentZones().filter((z) => z.dataset.ring === 'numeral')[4], 2);
check('clicking the V numeral emits the whole chord, from chord.js voicing()',
  heard.map((e) => e.note), chordJs.voicing(store.scale, 4, 3, 4));
check('every one of them is source: circle (§5, §15.3)',
  heard.every((e) => e.source === 'circle'), true);
check('§15.6 — three notes by default, not four; 7ths are shown, never given',
  heard.length, 3);
release(2);
check('the whole chord releases together', offHeard.length, 3);

// -----------------------------------------------------------------------------------------
// 6 · THE +/- , AND EVERYTHING DOWNSTREAM — seat questions 4 and 5
// -----------------------------------------------------------------------------------------
section("THE +/- — the ring redraws, the colours update, the name updates, others follow");

/** Stands in for a sibling surface mounted on the same page. It calls nothing on the circle
 *  and the circle calls nothing on it — §4's `state.on('scale')` is the only wire. */
const downstream = [];
store.on('scale', (s) => downstream.push({ degrees: [...s.degrees], name: s.name }));

const pmNodes = [];
host.children[0].walk((n) => { if (n.dataset.act === 'alter') pmNodes.push(n); });
check('§4 — a +/- pair on every one of the seven degrees', pmNodes.length, 14);

const before = {
  degree3: store.scale.degrees[2],
  token3: degreeTokenAt(2),
  name: store.scale.name,
};

// Lower degree 3 by one semitone: C major → the array Brandon's Aeolian-side variants use.
const minus3 = pmNodes.find((n) => n.dataset.degree === '2' && n.dataset.delta === '-1');
fire(host.children[0].children[0], 'pointerdown', evt(minus3, { pointerId: 9 }));

check('the store moved the degree, and scale.js clamped/validated it, not this surface',
  store.scale.degrees[2], before.degree3 - 1);
check('§4 — the degree is flagged as MOVED', store.scale.altered[2], true);
check('the ring redrew: degree 3 now carries a different §9 token',
  degreeTokenAt(2) !== before.token3, true);
check('the colour it carries is exactly what degreeColor() returns now',
  degreeTokenAt(2), `var(${scaleJs.degreeColor(store.scale, 2)})`);
check('the NAME updated, and the string is scale.js\'s, not this file\'s',
  [nameInHub() === before.name, nameInHub()], [false, scaleJs.scaleName(store.scale)]);
check('the moved badge is drawn — a shape cue, not only a colour',
  (() => { let n = 0; host.children[0].walk((x) => { if (x.dataset.act === 'reset') n++; }); return n; })(), 1);
check('SEAT Q5 — a downstream subscriber saw the change through state.on(\'scale\') alone',
  downstream.length >= 1 && downstream.at(-1).degrees[2], before.degree3 - 1);

// Reset gets the student back — F2's whole point, driven from the circle's badge.
let resetBadge = null;
host.children[0].walk((x) => { if (x.dataset.act === 'reset') resetBadge = x; });
fire(host.children[0].children[0], 'pointerdown', evt(resetBadge, { pointerId: 10 }));
check('F2 — the badge resets the degree and the student is back where they were',
  [store.scale.degrees[2], store.scale.altered[2], store.scale.name],
  [before.degree3, false, before.name]);

function degreeTokenAt(i) {
  const found = [];
  host.children[0].walk((n) => {
    if (n._classes.has('cbdaw-circle__zone') && n.dataset.ring === 'degree') found.push(n);
  });
  return found[i].getAttribute('fill');
}
/** The hub wraps the name on whitespace into one tspan per word, so the name is what those
 *  tspans join back to — never a string this surface composed. */
function nameInHub() {
  let hub = null;
  host.children[0].walk((n) => { if (n._classes.has('cbdaw-circle__hub')) hub = n; });
  if (!hub) return null;
  return hub.children.map((c) => c.textContent).join(' ');
}

// A transposed scale is the same colours — §15.4's rule 3, checked through the surface.
const tokensInC = [0, 1, 2, 3, 4, 5, 6].map((i) => degreeTokenAt(i));
store.setScalePreset('Major');
const storeD = makeStore(scaleJs.setScaleTonic(scaleJs.createScale(0, 'Major'), 2));
circle.attachState(storeD);
check('§15.4 — transposing the key does not change one colour',
  [0, 1, 2, 3, 4, 5, 6].map((i) => degreeTokenAt(i)), tokensInC);
check('but the letters did move, and they came from scale.js',
  (() => { circle.overlay = 'letter'; const t = firstDegreeText(host.children[0]); circle.overlay = 'number'; return t; })(),
  scaleJs.circlePositions(storeD.scale, 4)[0].letter);
circle.attachState(store);

// -----------------------------------------------------------------------------------------
// 7 · COMPACT, AND CLEANING UP AFTER ITSELF
// -----------------------------------------------------------------------------------------
section('COMPACT / EXPANDED, and §12.1 dispose');

circle.mountCompact(host);
let compactPm = 0;
host.children[0].walk((n) => { if (n.dataset.act === 'alter') compactPm++; });
check('compact drops the +/- orbit and the controls bar', compactPm, 0);
check('compact still draws all seven slots', (() => {
  let n = 0; host.children[0].walk((x) => {
    if (x._classes.has('cbdaw-circle__zone') && x.dataset.ring === 'degree') n++;
  });
  return n;
})(), 7);

circle.mountExpanded(host);
const busBefore = input.listenerCount;
const disposed = circle.dispose();
check('dispose drops every DOM listener it attached', disposed.domListeners > 0, true);
check('dispose drops the bus AND the store subscription', disposed.busSubscriptions, 3);
check('the input bus is back where it was', input.listenerCount, busBefore - 2);
check('nothing is left in the host', host.children.length, 0);
check('window has no listener left from this surface', globalThis.window.listenerCount(), 0);

unsubOn(); unsubOff();

// A held chord that unmounts mid-press releases rather than sticking.
const c2 = new ScaleCircle(null, input, store);
const host2 = new El('div');
c2.mount(host2, 'expanded');
const stuck = [];
const unsubStuck = input.on('noteoff', (e) => stuck.push(e));
let numZone = null;
host2.children[0].walk((n) => {
  if (n._classes.has('cbdaw-circle__zone') && n.dataset.ring === 'numeral' && !numZone) numZone = n;
});
fire(host2.children[0].children[0], 'pointerdown', evt(numZone, { pointerId: 77 }));
const out = c2.dispose();
check('a chord held through dispose() is released, not stranded',
  [out.notesReleased, stuck.length], [3, 3]);
unsubStuck();

// =========================================================================================
console.log(`\n${'='.repeat(88)}`);
console.log(`${pass} passed · ${fail} failed`);
if (fail) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`  · ${f.name}`);
  process.exitCode = 1;
} else {
  console.log('HEADLESS DONE-CHECK CLEARED.');
  console.log('Still browser-only: the look. docs/scratchpad/scale-circle-test.html.');
}
console.log('='.repeat(88));

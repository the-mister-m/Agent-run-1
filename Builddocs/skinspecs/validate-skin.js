#!/usr/bin/env node
/* =====================================================================================
   validate-skin.js — the gate every skin must pass before it ships.
   Owning spec: Builddocs/skinspecs/S3-skin-contract.md §3-§4.

   USAGE:   node Builddocs/skinspecs/validate-skin.js <skin.css> [--base src/ui/tokens.css]

   WHY THIS EXISTS: a skin agent working from screenshots will produce something that looks
   good and quietly destroys the curriculum. CONTRACTS §4's colour rule is how a student
   avoids memorising which numeral is minor — "the colour tells them." If a skin puts major
   and minor on an axis that red-green colour blindness flattens (~6% of boys, i.e. most
   classes), the app still looks fine to the person who made it and stops teaching.

   That failure is invisible to taste. So it is checked by a script, not by judgement.

   No dependencies. Node only.
   ===================================================================================== */

const fs = require('fs');

// ---------- colour maths ------------------------------------------------------------
const srgbToLin = c => (c /= 255) <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const hexToRgb = h => {
  h = h.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16));
};
const relLum = ([r, g, b]) => 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
const contrast = (a, b) => {
  const [l1, l2] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// OKLab — perceptually uniform, the model tokens.css cites for --deg-aug
function toOklab([r, g, b]) {
  const [R, G, B] = [r, g, b].map(srgbToLin);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
const dE = (c1, c2) => {
  const a = toOklab(c1), b = toOklab(c2);
  return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
};

const MAJMIN_FLOOR = 15;   // major vs minor — colour is the only channel. Hard.
const DE_FLOOR = 8;        // every other pair — soft, backed by the A9 glyph.
const GLYPH = { '--deg-major':'', '--deg-minor':'', '--deg-dim':'°', '--deg-aug':'+', '--deg-altered':'?' };

// CVD simulation — Viénot, Brettel & Mollon 1999.
// The projection happens in LMS cone space. Applying these matrices straight to RGB (as an
// earlier draft of this file did) barely collapses hue at all and lets red-vs-green sail
// through — the exact failure this validator exists to catch. RGB→LMS→project→RGB.
const RGB2LMS = [[17.8824,   43.5161,   4.11935],
                 [ 3.45565,  27.1554,   3.86714],
                 [ 0.0299566, 0.184309, 1.46709]];
const LMS2RGB = [[ 0.0809444479,  -0.130504409,    0.116721066],
                 [-0.0102485335,   0.0540193266,  -0.113614708],
                 [-0.000365296938,-0.00412161469,  0.693511405]];
const DICHROMAT = {
  // rows map [L,M,S] -> [L',M',S']
  protanopia:   [[0, 2.02344, -2.52581], [0, 1, 0],       [0, 0, 1]],
  deuteranopia: [[1, 0, 0],              [0.494207, 0, 1.24827], [0, 0, 1]],
  tritanopia:   [[1, 0, 0],              [0, 1, 0],       [-0.395913, 0.801109, 0]],
};
const mul = (M, v) => M.map(r => r[0]*v[0] + r[1]*v[1] + r[2]*v[2]);
const linToSrgb = v => {
  v = Math.max(0, Math.min(1, v));
  return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1/2.4) - 0.055));
};
// Gamma domain matters. The matrices are linear-light, so: decode → LMS → project → encode.
// Feeding gamma-encoded 0-255 straight in (an earlier draft) leaves the result in a mixed
// space and skews every lightness, which skews every ΔE.
const simulate = (rgb, type) => {
  const lin  = rgb.map(srgbToLin).map(v => v * 255);
  const proj = mul(DICHROMAT[type], mul(RGB2LMS, lin));
  return mul(LMS2RGB, proj).map(v => linToSrgb(v / 255));
};

// SELF-TEST. If the colour model is wrong, every §3 verdict below is meaningless and
// confidently wrong — which is worse than no validator. So the model is checked first,
// against behaviour with a known answer. Two earlier drafts of this file failed here.
(function selfTest() {
  const F = [];
  const d = (a, b, t) => dE(t ? simulate(a, t) : a, t ? simulate(b, t) : b);
  const R = [255,0,0], G = [0,255,0], B = [0,0,255];

  // 1 · red and green must land on the same (yellow) axis for a deuteranope
  const rd = simulate(R,'deuteranopia'), gd = simulate(G,'deuteranopia');
  if (!(Math.abs(rd[0]-rd[1]) < 12 && Math.abs(gd[0]-gd[1]) < 12 && rd[2] < 80 && gd[2] < 80))
    F.push(`hue collapse: red→rgb(${rd}) green→rgb(${gd}) — both should be ~(x,x,low)`);

  // 2 · blue must survive deuteranopia nearly untouched
  if (d(B, simulate(B,'deuteranopia')) > 12) F.push('blue should be near-unchanged under deuteranopia');

  // 3 · THE TRAP. A luminance-matched red/green pair is what fools a trichromat eye.
  //     It must collapse hard. This is the case the validator exists to catch.
  const trap = [d(hexToRgb('#00a86b'), hexToRgb('#c8553d')), d(hexToRgb('#00a86b'), hexToRgb('#c8553d'), 'deuteranopia')];
  if (!(trap[1] < trap[0] * 0.5)) F.push(`matched green/red must collapse >50%: ${trap[0].toFixed(1)} → ${trap[1].toFixed(1)}`);
  if (!(trap[1] < MAJMIN_FLOOR)) F.push(`matched green/red must FAIL the major/minor floor: ΔE ${trap[1].toFixed(1)} vs floor ${MAJMIN_FLOOR}`);

  // 4 · the yellow↔blue axis must SURVIVE — that is why §9 put major/minor on it
  const ac = d(hexToRgb('#ffb020'), hexToRgb('#3fd0ff'), 'deuteranopia');
  if (!(ac > MAJMIN_FLOOR)) F.push(`amber/cyan must survive deuteranopia: ΔE ${ac.toFixed(1)}`);

  if (F.length) {
    console.error('\nFATAL — colour model self-test failed. Do not trust this run.');
    F.forEach(f => console.error('   · ' + f));
    console.error('');
    process.exit(3);
  }
})();

// ---------- parse a css file's :root custom properties -------------------------------
function readTokens(path) {
  const css = fs.readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = {};
  for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/gi)) out[m[1]] = m[2].trim();
  return out;
}

// ---------- the rules ----------------------------------------------------------------
const DEG = ['--deg-major', '--deg-minor', '--deg-dim', '--deg-aug', '--deg-altered'];
const CONTRAST_RULES = [
  ['--text',      '--panel', 7.0,  'body text a student has to read (AAA)'],
  ['--text-dim',  '--panel', 4.5,  'axis labels, units, secondary readouts (AA)'],
  ['--accent',    '--panel', 3.0,  'selection, focus, scope + spectrum traces'],
  ['--warn',      '--panel', 3.0,  'refusal / over-cap'],
  ['--meter-ok',  '--panel', 3.0,  'meter fill'],
  ['--meter-hot', '--panel', 3.0,  'meter fill, hot'],
];
/* THE FLOORS ARE TIERED, and the tier comes from the contract, not from taste.

   CONTRACTS A9 mandates a superscript glyph on every quality EXCEPT major and minor:
       SUFFIX = { major:'', minor:'', augmented:'+', diminished:'°', altered:'?' }
   So dim / aug / altered each carry a SECOND, non-colour channel by contract. Major and
   minor do not — in the scale circle, colour IS the channel. That is Brandon's device:
   "Students never memorize which numeral is minor; the colour tells them" (§4).

   Therefore major-vs-minor is a HARD FAIL, and every other pair is a WARNING: a warning
   says "colour alone will not separate these two, and A9's glyph is now load-bearing."   */

function main() {
  const args = process.argv.slice(2);
  const skinPath = args.find(a => !a.startsWith('--'));
  const baseIdx = args.indexOf('--base');
  const basePath = baseIdx > -1 ? args[baseIdx + 1] : 'src/ui/tokens.css';
  if (!skinPath) { console.error('usage: validate-skin.js <skin.css> [--base src/ui/tokens.css]'); process.exit(2); }

  const T = { ...readTokens(basePath), ...readTokens(skinPath) };  // skin overrides base
  const rgb = {}; for (const k in T) { const c = hexToRgb(T[k]); if (c) rgb[k] = c; }

  const fails = [], warns = [], lines = [];
  const P = (ok, label, detail) => { lines.push(`  [${ok ? 'PASS' : 'FAIL'}] ${label.padEnd(44)} ${detail}`); if (!ok) fails.push(label); };

  console.log(`\nSKIN VALIDATOR — ${skinPath}\n  base: ${basePath}\n`);

  // 1 — every token the app reads must resolve
  console.log('1 · COMPLETENESS');
  const REQUIRED = [...DEG, '--bg', '--panel', '--line', '--text', '--text-dim', '--accent', '--warn', '--meter-ok', '--meter-hot'];
  const missing = REQUIRED.filter(k => !rgb[k]);
  P(missing.length === 0, 'every required colour token resolves', missing.length ? `missing: ${missing.join(', ')}` : `${REQUIRED.length}/${REQUIRED.length}`);
  for (const k of ['--fs-root', '--sp-unit', '--r-unit', '--bw']) {
    if (T[k] && /(\d)(em|%)\s*$/.test(T[k]))
      P(false, `${k} is an absolute unit`, `is "${T[k]}" — S1 §0 rule 1: a root knob is px/rem, never em/%`);
  }
  if (missing.length) { console.log(lines.join('\n')); console.log('\nSTOPPED — cannot check a palette with holes in it.\n'); process.exit(1); }

  // 2 — legibility
  console.log(lines.splice(0).join('\n'));
  console.log('\n2 · LEGIBILITY (WCAG contrast on --panel)');
  for (const [fg, bg, floor, why] of CONTRAST_RULES) {
    const c = contrast(rgb[fg], rgb[bg]);
    P(c >= floor, `${fg} on ${bg} ≥ ${floor}:1`, `${c.toFixed(1)}:1   — ${why}`);
  }
  for (const d of DEG) {
    const c = contrast(rgb[d], rgb['--panel']);
    P(c >= 3.0, `${d} on --panel ≥ 3:1`, `${c.toFixed(1)}:1`);
  }
  const pl = contrast(rgb['--panel'], rgb['--line']);
  P(pl >= 1.5, '--panel vs --line ≥ 1.5:1', `${pl.toFixed(2)}:1  — the border is what survives a projector, not the fill`);

  // 3 — the teaching invariant
  console.log(lines.splice(0).join('\n'));
  console.log('\n3 · TEACHING INVARIANT (CONTRACTS §4 — the colour rule)');
  const types = ['deuteranopia', 'protanopia', 'tritanopia'];

  console.log('\n  3a · major vs minor — HARD. Colour is the only channel (A9: no glyph on either).');
  for (const t of types) {
    const d = dE(simulate(rgb['--deg-major'], t), simulate(rgb['--deg-minor'], t));
    P(d >= MAJMIN_FLOOR, `major vs minor under ${t} ≥ ${MAJMIN_FLOOR}`, `ΔE ${d.toFixed(1)}`);
  }
  console.log(lines.splice(0).join('\n'));

  console.log('\n  3b · every other pair — SOFT. A9 mandates a redundant glyph on dim/aug/altered.');
  console.log('       worst-case ΔE across normal + all three CVD types:\n');
  const soft = [];
  for (let i = 0; i < DEG.length; i++) for (let j = i + 1; j < DEG.length; j++) {
    if ((DEG[i] === '--deg-major' && DEG[j] === '--deg-minor')) continue;
    let w = { d: Infinity };
    for (const t of ['normal', ...types]) {
      const a = t === 'normal' ? rgb[DEG[i]] : simulate(rgb[DEG[i]], t);
      const b = t === 'normal' ? rgb[DEG[j]] : simulate(rgb[DEG[j]], t);
      const d = dE(a, b);
      if (d < w.d) w = { d, t };
    }
    const pair = `${DEG[i].replace('--deg-','')}/${DEG[j].replace('--deg-','')}`;
    const g = [GLYPH[DEG[i]], GLYPH[DEG[j]]].filter(Boolean).join(' ') || '— none —';
    const ok = w.d >= DE_FLOOR;
    if (!ok) { warns.push(`${pair} ΔE ${w.d.toFixed(1)} (${w.t})`); soft.push(pair); }
    console.log(`     ${ok ? ' ok ' : 'WARN'}  ${pair.padEnd(18)} ΔE ${w.d.toFixed(1).padStart(5)}  worst under ${w.t.padEnd(13)} glyph: ${g}`);
  }
  if (soft.length) {
    console.log(`\n     ${soft.length} pair(s) below ΔE ${DE_FLOOR}. Not a rejection — A9's superscript glyph is`);
    console.log(`     the second channel. But it is now LOAD-BEARING for: ${soft.join(', ')}.`);
    console.log(`     A surface that drops the glyph makes these indistinguishable. Brandon's call.`);
  }

  // 4 — projector
  console.log(lines.splice(0).join('\n'));
  console.log('\n4 · PROJECTOR (CONTRACTS §9 — "ten feet away, lit room")');
  const L = c => toOklab(c)[0];
  for (const d of DEG) {
    const l = L(rgb[d]);
    const ok = l >= 0.55;
    (ok ? P : (a, b, c) => { lines.push(`  [WARN] ${b.padEnd(44)} ${c}`); warns.push(b); })(ok, `${d} bright enough for projector gamma`, `OKLab L ${l.toFixed(2)} (want ≥ 0.55 — midtones disappear on a wall)`);
  }
  const bgl = L(rgb['--bg']);
  if (bgl < 0.10) { lines.push(`  [WARN] ${'--bg is near-black'.padEnd(44)} OKLab L ${bgl.toFixed(2)} — ambient light turns pure black to muddy grey`); warns.push('--bg near-black'); }
  console.log(lines.join('\n'));

  console.log('\n' + '─'.repeat(78));
  if (fails.length) {
    console.log(`REJECTED — ${fails.length} failure(s):`);
    fails.forEach(f => console.log(`   · ${f}`));
    console.log('\nA skin that fails §3 is not a style problem. It stops the app teaching.\n');
    process.exit(1);
  }
  console.log(`ACCEPTED${warns.length ? ` — with ${warns.length} warning(s), Brandon's call` : ''}.`);
  console.log('Note: §4 is a design claim with numbers behind it, not a measured fact.');
  console.log('The room test is Brandon\'s to run in a classroom.\n');
}
main();

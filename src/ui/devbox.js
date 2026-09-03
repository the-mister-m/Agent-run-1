/**
 * ui/devbox.js — the skin tuning box.
 *
 * Loaded by ui/shell.js, so it is on every tool page. Appears only when the URL hash
 * contains `dev`. Reads the root knobs out of tokens.css at runtime, gives each one a
 * control, writes turned values to document.documentElement.style, persists per page in
 * localStorage, and dumps the changed knobs as a skin file body.
 *
 * Owns: this file. Writes nothing to disk. Edits no other module's CSS except through
 * the three named toggles, which inject their own <style> and remove it again.
 */

const HASH_KEY = 'dev';
const STORE_KEY = `cbdaw-devbox:${location.pathname}`;
const COMMIT_MS = 120;
const BOX_STYLE_ID = 'cbdaw-devbox-style';
const TOGGLE_STYLE_ID = 'cbdaw-devbox-toggles';
const PROBE_ID = 'cbdaw-devbox-probe';
const SKIN_LINK_ID = 'cbdaw-devbox-skin';
const SCOPED_STYLE_ID = 'cbdaw-devbox-scoped';

// Manifest. A browser cannot list a directory, so every shippable skin is named here.
const SKINS = [
  { file: '', label: 'default — tokens.css only' },
  { file: 'moog2077', label: 'moog2077' },
];

// =======================================================================================
// 1 · DISCOVERY — knobs and derived tokens, read out of tokens.css
// =======================================================================================

/** Custom properties declared on `:root`. Absolute units. These get controls. */
let KNOBS = [];
/** Custom properties declared on `*`. calc() off a knob. These are shown, not edited. */
let DERIVED = [];
/** 'cssom' | 'fetch' | 'none' — how KNOBS/DERIVED were found. */
let discoveryMode = 'none';

// Custom properties declared on a component's own selector, not on :root. Discovery cannot
// see them and a :root write cannot beat them — the component's own declaration wins inside
// its subtree. Each one is written back through its selector instead.
// Pass-throughs of a global (--kbd-*, --grid-*) are left out: turning --accent moves them.
const SCOPED = [
  { name: '--shell-gap', selector: '.cbdaw-shell', value: 'var(--sp-6)' },
  { name: '--cb-cell', selector: '.cb-root', value: 'var(--sp-20)' },
  { name: '--roll-row-h', selector: '.cbdaw-roll', value: 'var(--sp-9)' },
  { name: '--roll-gutter', selector: '.cbdaw-roll', value: 'var(--sp-31)' },
  { name: '--arr-zoom', selector: '.cbdaw-arr', value: '1' },
];

/** name -> selector, for the write path. */
const SCOPE_OF = new Map(SCOPED.map((s) => [s.name, s.selector]));

/**
 * Measures each scoped token through a probe carrying the component's class, so the row
 * gets a slider off a real number instead of a text field off `var(...)`. Falls back to the
 * declared value when the component's stylesheet is not on the page.
 */
function resolveScoped() {
  const rack = document.createElement('div');
  rack.setAttribute('aria-hidden', 'true');
  rack.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;visibility:hidden;overflow:hidden;';
  const probes = [];
  for (const s of SCOPED) {
    const cls = s.selector.replace(/^\./, '');
    const asLength = document.createElement('i');
    const asNumber = document.createElement('i');
    for (const node of [asLength, asNumber]) {
      node.className = cls;
      node.style.display = 'inline-block';
      node.style.height = '0';
    }
    asLength.style.width = `calc(var(${s.name}) * ${PROBE_SCALE})`;
    asNumber.style.width = `calc(var(${s.name}) * ${PROBE_SCALE}px)`;
    rack.append(asLength, asNumber);
    probes.push({ s, asLength, asNumber });
  }
  document.body.appendChild(rack);

  const out = [];
  for (const { s, asLength, asNumber } of probes) {
    const len = parseFloat(getComputedStyle(asLength).width) || 0;
    if (len > 0) {
      out.push({ name: s.name, value: `${round(len / PROBE_SCALE)}px` });
      continue;
    }
    const num = parseFloat(getComputedStyle(asNumber).width) || 0;
    out.push({ name: s.name, value: num > 0 ? String(round(num / PROBE_SCALE)) : s.value });
  }
  rack.remove();
  return out;
}

/** Reads both blocks through the CSSOM. Returns false if no tokens.css rule was readable. */
function discoverFromCssom() {
  const knobs = new Map();
  const derived = new Map();
  let sawRule = false;

  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch (err) {
      continue;
    }
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      if (!rule.style || !rule.selectorText) continue;
      const sel = rule.selectorText.trim();
      const bag = sel === ':root' ? knobs : sel === '*' ? derived : null;
      if (!bag) continue;
      for (let i = 0; i < rule.style.length; i++) {
        const name = rule.style[i];
        if (!name.startsWith('--')) continue;
        const value = rule.style.getPropertyValue(name).trim();
        if (!value) continue;
        if (!bag.has(name)) sawRule = true;
        bag.set(name, value);
      }
    }
  }

  if (!sawRule) return false;
  KNOBS = Array.from(knobs, ([name, value]) => ({ name, value }));
  DERIVED = Array.from(derived, ([name, value]) => ({ name, value }));
  discoveryMode = 'cssom';
  return true;
}

/** Strips /* *​/ comments, then pulls the outermost `sel { ... }` blocks by brace count. */
function blocksFor(text, selector) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let at = 0;
  while (at < clean.length) {
    const head = clean.indexOf(selector, at);
    if (head < 0) break;
    const open = clean.indexOf('{', head);
    if (open < 0) break;
    const between = clean.slice(head + selector.length, open).trim();
    if (between !== '') {
      at = head + selector.length;
      continue;
    }
    let depth = 1;
    let i = open + 1;
    while (i < clean.length && depth > 0) {
      if (clean[i] === '{') depth++;
      else if (clean[i] === '}') depth--;
      i++;
    }
    out.push(clean.slice(open + 1, i - 1));
    at = i;
  }
  return out;
}

/** Pulls `--name: value;` pairs out of a block body, in order. */
function pairsIn(body) {
  const out = [];
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(body))) out.push({ name: m[1], value: m[2].trim() });
  return out;
}

/** Fetches tokens.css and parses it. Fallback for when the CSSOM is not readable. */
async function discoverFromFetch() {
  const link = document.querySelector('link[rel="stylesheet"][href*="tokens.css"]');
  if (!link) return false;
  let text;
  try {
    const res = await fetch(link.href);
    if (!res.ok) return false;
    text = await res.text();
  } catch (err) {
    return false;
  }
  const knobs = new Map();
  const derived = new Map();
  for (const body of blocksFor(text, ':root')) for (const p of pairsIn(body)) knobs.set(p.name, p.value);
  for (const body of blocksFor(text, '*')) for (const p of pairsIn(body)) derived.set(p.name, p.value);
  if (knobs.size === 0) return false;
  KNOBS = Array.from(knobs, ([name, value]) => ({ name, value }));
  DERIVED = Array.from(derived, ([name, value]) => ({ name, value }));
  discoveryMode = 'fetch';
  return true;
}

// =======================================================================================
// 2 · CONTROL SHAPE — what kind of input a value gets
// =======================================================================================

const RE_HEX = /^#[0-9a-fA-F]{3,8}$/;
const RE_NUM_UNIT = /^(-?[\d.]+)(px|rem|em|ms|s|%)$/;
const RE_UNITLESS = /^-?[\d.]+$/;

/** Returns { kind, num, unit } for a declared value. kind: color | length | number | text. */
function shapeOf(value) {
  const v = value.trim();
  if (RE_HEX.test(v)) return { kind: 'color', num: null, unit: '' };
  if (/^(rgb|hsl)a?\(/.test(v)) return { kind: 'color', num: null, unit: '' };
  const m = RE_NUM_UNIT.exec(v);
  if (m) return { kind: 'length', num: parseFloat(m[1]), unit: m[2] };
  if (RE_UNITLESS.test(v)) return { kind: 'number', num: parseFloat(v), unit: '' };
  return { kind: 'text', num: null, unit: '' };
}

/** Returns { min, max, step } for a slider over a numeric value. */
function rangeFor(shape) {
  const v = shape.num;
  const u = shape.unit;
  if (u === 'ms' || u === 's') {
    const max = Math.max(v * 4, u === 's' ? 2 : 400);
    return { min: 0, max, step: u === 's' ? 0.01 : 5 };
  }
  if (u === 'em' || u === '%') {
    const max = Math.max(v * 4, u === 'em' ? 0.2 : 100);
    return { min: 0, max, step: u === 'em' ? 0.005 : 1 };
  }
  if (u === 'px' || u === 'rem') {
    const max = Math.max(v * 4, u === 'rem' ? 4 : 16);
    const step = max <= 4 ? 0.05 : max <= 16 ? 0.25 : max <= 64 ? 0.5 : 1;
    return { min: 0, max, step };
  }
  if (v >= 100) return { min: 100, max: 900, step: 100 };
  if (v <= 1) return { min: 0, max: 2, step: 0.01 };
  return { min: 0, max: Math.max(v * 3, 4), step: 0.05 };
}

// =======================================================================================
// 2b · GROUPING — every knob sits in exactly one subgroup
// =======================================================================================

// Reach decides the section. A token used by more than one surface never sits under a
// single surface's header. Subgroups collapse; sections are dividers.
const GROUPS = [
  ['GLOBAL — 5+ surfaces', [
    // Every --sp-*, --r-* and --fs-* is a calc() off one of these. Turning one moves the
    // whole scale; the scale members themselves are declared on `*` and read-only.
    ['scale roots — the whole system', ['--fs-root', '--sp-unit', '--r-unit', '--stroke-w', '--ring-w']],
    ['ground colors', ['--bg', '--panel', '--line', '--text', '--text-dim', '--accent', '--warn', '--color-transparent']],
    ['spacing scale', ['--sp-0', '--sp-1', '--sp-1h', '--sp-2', '--sp-3', '--sp-4', '--sp-5', '--sp-6', '--sp-7', '--sp-8', '--sp-9', '--sp-13', '--sp-30', '--sp-60', '--sp-hair', '--sp-em-36']],
    ['radius scale', ['--r-cell', '--r-sm', '--r-ctl', '--r-body', '--r-pill']],
    ['type scale', ['--font-ui', '--font-inherit', '--fs-micro', '--fs-xs', '--fs-sm', '--fs-base', '--fs-md', '--w-med', '--w-bold', '--num-tabular', '--lh-none']],
    ['line weight', ['--bw']],
    ['label set', ['--track-label', '--track-title', '--tt-label']],
    ['text behavior', ['--to-ellipsis', '--ws-nowrap', '--ta-center', '--ta-right']],
    ['cursor set', ['--cur-pointer', '--cur-grab', '--cur-ew-resize']],
    ['opacity set', ['--op-faint', '--op-soft']],
    ['layout keywords — no dials', ['--box-border-box', '--align-center', '--disp-flex', '--disp-block', '--disp-grid', '--disp-none', '--flexdir-column', '--flexwrap-wrap', '--flex-1', '--flex-0-0-auto', '--flex-1-1-0', '--justify-center', '--justify-space-between', '--pct-100', '--pos-relative', '--pos-absolute', '--ov-hidden', '--pe-none', '--none', '--touch-none', '--usel-none']],
  ]],
  ['FAMILIES — a shared vocabulary', [
    ['node vocabulary — graph, patch synth', ['--cable-drag', '--edge-audio', '--edge-control', '--edge-hover', '--graph-grid', '--graph-ground', '--node-border', '--node-dimmed', '--node-dragging', '--node-fill', '--node-head', '--node-selected', '--port-active', '--port-in', '--port-out', '--stroke-bold', '--tr-stroke', '--z-drag']],
    ['device chrome — gate, comp, eq, reverb, delay', ['--bypass-off', '--bypass-on', '--device-head', '--knob-fill']],
    ['sequencer grid — piano roll, step grid', ['--align-stretch', '--fs-2xl', '--fs-3xl', '--sp-23', '--wc-left']],
    ['drum pads — drum synth, drum sampler', ['--fs-em-75', '--fs-em-85', '--grid-repeat4-1fr']],
  ]],
  ['CROSSOVER — 2-4 surfaces, no family', [
    ['spacing crossovers', ['--sp-10', '--sp-12', '--sp-14', '--sp-15', '--sp-16', '--sp-20', '--sp-28', '--sp-2h', '--sp-39', '--sp-3h', '--sp-84', '--sp-230', '--sp-em-16']],
    ['type crossovers', ['--fs-lg', '--fs-xl', '--fs-tiny', '--fs-em-70', '--lh-base', '--font-mono']],
    ['depth set', ['--raise', '--recess', '--shadow-raised', '--z-raise-1', '--z-raise-2']],
    ['stroke set', ['--bw-2', '--line-dashed', '--line-solid', '--stroke-dash', '--stroke-heavy']],
    ['surface grounds', ['--btn-face', '--popout-ground', '--r-panel', '--r-xl']],
    ['cursor crossovers', ['--cur-default', '--cur-grabbing', '--cur-not-allowed', '--cur-ns-resize']],
    ['meter colors', ['--meter-hot', '--meter-ok', '--edge-refused']],
    ['motion', ['--ease', '--tr-background', '--tr-color']],
    ['canvas drawing — automation, eq, spectrum', ['--canvas-lw', '--fade-faint']],
    ['odds', ['--op-dim', '--ta-left', '--knob-track']],
    ['layout keywords — no dials', ['--align-flex-end', '--align-flex-start', '--align-start', '--auto', '--flex-1-1-auto', '--justify-flex-end', '--ov-visible', '--pct-0', '--pe-auto']],
  ]],
  ['SURFACE — 1 surface only', [
    ['project header / transport / surface block', ['--align-baseline', '--dropdown-offset', '--flex-0-1-auto', '--flex-1-1-240', '--grid-1-1', '--grid-1-115', '--grid-minmax-0-1fr', '--ls-none', '--op-mid', '--shadow-lifted', '--shell-gap', '--sp-17', '--sp-33', '--tr-width', '--track-tight', '--vh-100', '--ws-prewrap', '--z-popover']],
    ['daw shell frame', ['--btn-active', '--flexwrap-nowrap', '--play-on', '--rec-on', '--scrim', '--strip-head', '--transport-ground', '--z-scrim']],
    ['12-note keyboard', ['--kbd-accent', '--kbd-dim', '--kbd-line', '--kbd-text', '--key-border', '--pct-62']],
    ['diatonic keys', ['--deg-major', '--deg-minor', '--deg-dim', '--deg-aug', '--deg-altered', '--deg-flat5', '--deg-sharp5', '--filter-brighten', '--tr-filter']],
    ['scale circle', ['--dominant-baseline-central', '--op-full', '--sp-95', '--text-anchor-middle', '--tr-opacity-stroke', '--w-heavy']],
    ['comp builder', ['--aspect-square', '--cb-cell', '--font-style-italic', '--fs-chord', '--fs-em-62', '--fs-numeral', '--grid-1fr', '--grid-60-140', '--justify-flex-start', '--lh-loose', '--r-chip', '--ring-off', '--sp-4h', '--sp-5h', '--sp-7h', '--sp-em-14', '--sp-em-21', '--track-mid']],
    ['piano roll', ['--bw-3', '--bw-5', '--line-dotted', '--line-double', '--line-groove', '--note-deg', '--roll-gutter', '--roll-row-h', '--row-deg', '--sp-31', '--sp-ch-4', '--td-underline']],
    ['step grid', ['--grid-accent', '--grid-bg', '--grid-dim', '--grid-line', '--grid-panel', '--grid-text', '--grid-warn', '--sp-37']],
    ['arrangement', ['--arm-on', '--arr-bar-w', '--arr-zoom', '--clip-fill', '--lane-head', '--lane-row', '--lane-row-alt', '--loop-region', '--playhead-line', '--pos-sticky', '--punch-region', '--ruler-ground', '--ruler-tick-bar', '--ruler-tick-beat', '--strip-sel', '--z-sticky']],
    ['channel strips', ['--fader-fill', '--fader-thumb', '--fader-track', '--mute-on', '--pan-center', '--pan-thumb', '--pan-track', '--slot-empty', '--slot-face', '--slot-route', '--solo-on']],
    ['automation lanes', ['--lane-ground', '--lane-curve', '--lane-grid', '--lane-point', '--lane-point-on', '--lane-step']],
    ['node graph', ['--dur-med', '--stroke-med', '--tr-transform']],
    ['gate', ['--gate-closed', '--gate-open', '--gate-threshold']],
    ['eq', ['--knob-pointer', '--sp-em-46', '--band-1', '--band-2', '--band-3', '--band-curve', '--band-fill', '--band-handle']],
    ['wave synth', ['--anim-pulse', '--color-current', '--content-empty', '--r-lg', '--scale-pulse-peak', '--scale-pulse-rest', '--sp-11', '--sp-65', '--sp-em-17', '--sp-em-35', '--z-behind']],
    ['overtone synth', ['--tr-shadow']],
    ['drum synth', ['--dur-fast', '--fs-em-65', '--sp-18', '--sp-em-38']],
    ['drum sampler', ['--anim-hit-flash', '--anim-miss-flash', '--grid-repeat4-minmax90', '--touch-manipulation']],
    ['patch synth', ['--angle-vertical', '--glow', '--math-group', '--stroke-semi', '--tr-bg-border']],
    ['spectrum', ['--fade-label', '--fade-mid', '--fade-strong']],
    ['scope', ['--fade-half', '--fade-near']],
    ['master meter', ['--meter-clip', '--meter-peak', '--meter-tick', '--meter-track']],
    ['gain reduction', ['--reduction-fill', '--reduction-track', '--reduction-zero']],
  ]],
  // No file in src/ references these. They sit in tokens.css and nothing reads them.
  ['ORPHANS — nothing references these', [
    ['unused', ['--canvas-round', '--canvas-textalign-center', '--canvas-textalign-left', '--canvas-textalign-right', '--canvas-textbaseline-bottom', '--canvas-textbaseline-middle', '--canvas-textbaseline-top', '--disp-inline-flex', '--ease-linear', '--flex-1-1-300', '--flex-1-1-320', '--font-mono-compact', '--grid-135-1', '--grid-90-70-140', '--grid-autofit-260', '--grid-repeat4-minmax0', '--grid-repeat8-minmax0', '--lh-tight', '--op-strong', '--pos-static', '--ring-off-lg', '--sp-em-24', '--sp-em-32', '--sp-em-34', '--sp-em-62', '--w-normal']],
  ]],
];

/** name -> [sectionLabel, subLabel]. Built once from GROUPS. */
const GROUP_OF = new Map();
for (const [section, subs] of GROUPS) {
  for (const [sub, names] of subs) for (const n of names) GROUP_OF.set(n, [section, sub]);
}

/** Buckets KNOBS into the GROUPS order. Anything unmapped lands in UNGROUPED. */
function groupKnobs() {
  const byKey = new Map();
  const loose = [];
  for (const knob of KNOBS) {
    const at = GROUP_OF.get(knob.name);
    if (!at) {
      loose.push(knob);
      continue;
    }
    const key = `${at[0]} ${at[1]}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(knob);
  }

  const out = [];
  for (const [section, subs] of GROUPS) {
    const built = [];
    for (const [sub] of subs) {
      const rows = byKey.get(`${section} ${sub}`);
      if (rows && rows.length) built.push({ sub, rows });
    }
    if (built.length) out.push({ section, subs: built });
  }
  if (loose.length) out.push({ section: 'UNGROUPED — not in the map', subs: [{ sub: 'unmapped', rows: loose }] });
  return out;
}

// =======================================================================================
// 3 · STATE — overrides, panel flags, toggles
// =======================================================================================

const state = {
  overrides: {},
  collapsed: true,
  filter: '',
  showDerived: false,
  animsOff: false,
  interactionsOff: false,
  skin: '',
  openGroups: [],
};

/** Loads persisted state. A guest-mode Chromebook can throw on localStorage access. */
function load() {
  let raw;
  try {
    raw = localStorage.getItem(STORE_KEY);
  } catch (err) {
    return;
  }
  if (!raw) return;
  try {
    Object.assign(state, JSON.parse(raw));
  } catch (err) {
    /* corrupt entry: keep defaults */
  }
  if (!state.overrides || typeof state.overrides !== 'object') state.overrides = {};
  if (!Array.isArray(state.openGroups)) state.openGroups = [];
}

/** Persists state. Silent on quota or access failure. */
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (err) {
    /* no persistence available */
  }
}

// =======================================================================================
// 4 · APPLY — write knobs to the document root, debounced
// =======================================================================================

const dirty = new Set();
let commitTimer = 0;

/**
 * Rebuilds the scoped stylesheet from every turned scoped knob. Rules are emitted as
 * `:root <selector>` so they outrank the component's own one-class declaration whatever
 * order the two stylesheets land in.
 */
function writeScoped() {
  const bySelector = new Map();
  for (const { name, selector } of SCOPED) {
    const value = state.overrides[name];
    if (value == null) continue;
    if (!bySelector.has(selector)) bySelector.set(selector, []);
    bySelector.get(selector).push(`  ${name}: ${value};`);
  }

  let el = document.getElementById(SCOPED_STYLE_ID);
  if (bySelector.size === 0) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = SCOPED_STYLE_ID;
    document.head.appendChild(el);
  }
  const parts = [];
  for (const [selector, lines] of bySelector) parts.push(`:root ${selector} {\n${lines.join('\n')}\n}`);
  el.textContent = parts.join('\n');
}

/** Writes one knob. Scoped names go through the scoped stylesheet, the rest to the root. */
function writeKnob(name) {
  if (SCOPE_OF.has(name)) {
    writeScoped();
    return;
  }
  const value = state.overrides[name];
  if (value == null) document.documentElement.style.removeProperty(name);
  else document.documentElement.style.setProperty(name, value);
}

/** Applies every queued knob, saves, and refreshes the derived readouts. */
function flush() {
  clearTimeout(commitTimer);
  commitTimer = 0;
  for (const name of dirty) writeKnob(name);
  dirty.clear();
  save();
  refreshDerived();
}

/** Queues a knob value. `now` writes on this tick; otherwise it waits out the debounce. */
function setKnob(name, value, now) {
  if (value == null) delete state.overrides[name];
  else state.overrides[name] = value;
  dirty.add(name);
  if (now) {
    flush();
    return;
  }
  if (!commitTimer) commitTimer = setTimeout(flush, COMMIT_MS);
}

/** Re-applies every stored override, e.g. on first mount. */
function applyAll() {
  for (const { name } of KNOBS) {
    if (name in state.overrides) writeKnob(name);
  }
}

// =======================================================================================
// 5 · DERIVED READOUT — measured through a probe rack, one style recalc per refresh
// =======================================================================================

let probeRack = null;
const probeRows = [];

/** Layout quantises a used width to 1/64px, so probes measure at 1000x and divide back. */
const PROBE_SCALE = 1000;

/** Builds two probes per derived token: one length probe, one unitless probe. */
function buildProbes() {
  probeRack = document.createElement('div');
  probeRack.id = PROBE_ID;
  probeRack.setAttribute('aria-hidden', 'true');
  for (const { name } of DERIVED) {
    const asLength = document.createElement('i');
    asLength.style.width = `calc(var(${name}) * ${PROBE_SCALE})`;
    const asNumber = document.createElement('i');
    asNumber.style.width = `calc(var(${name}) * ${PROBE_SCALE}px)`;
    probeRack.append(asLength, asNumber);
    probeRows.push({ name, asLength, asNumber });
  }
  document.body.appendChild(probeRack);
}

/** Reads every probe and returns a name -> printable computed value map. */
function measureDerived() {
  const out = {};
  for (const row of probeRows) {
    const len = parseFloat(getComputedStyle(row.asLength).width) || 0;
    if (len > 0) {
      out[row.name] = `${round(len / PROBE_SCALE)}px`;
      continue;
    }
    const num = parseFloat(getComputedStyle(row.asNumber).width) || 0;
    out[row.name] = num > 0 ? String(round(num / PROBE_SCALE)) : '0';
  }
  return out;
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

let derivedBody = null;

/** Rewrites the derived table's cells from a fresh measurement. */
function refreshDerived() {
  if (!derivedBody || !state.showDerived) return;
  const measured = measureDerived();
  for (const cell of derivedBody.querySelectorAll('[data-derived]')) {
    cell.textContent = measured[cell.dataset.derived] ?? '—';
  }
}

// =======================================================================================
// 6 · TOGGLES — declarative list. One entry = one checkbox + one CSS block.
// =======================================================================================

/** Declarative toggle list. Add a control by adding an entry, not new DOM code. */
const TOGGLES = [
  {
    key: 'animsOff',
    label: 'animations off',
    css: () => [
      ':root { --dur-fast: 0ms; --dur-med: 0ms; ' +
        '--tr-width: none; --tr-background: none; --tr-bg-border: none; ' +
        '--tr-shadow: none; --tr-filter: none; --tr-opacity-stroke: none; ' +
        '--anim-hit-flash: none; --anim-miss-flash: none; --anim-pulse: none; }',
    ],
  },
  {
    key: 'interactionsOff',
    label: 'interactions off',
    css: () => ['body > *:not(#cbdaw-devbox) { pointer-events: var(--pe-none); }'],
  },
];

/** Rebuilds the toggle stylesheet from every entry whose flag is on. */
function applyToggles() {
  const parts = [];
  for (const toggle of TOGGLES) {
    if (state[toggle.key]) parts.push(...toggle.css());
  }

  let el = document.getElementById(TOGGLE_STYLE_ID);
  if (parts.length === 0) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = TOGGLE_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = parts.join('\n');
}

// =======================================================================================
// 7 · COPY CSS — the changed knobs as a skin file body
// =======================================================================================

/** Returns the skin body for every knob whose value differs from tokens.css. */
/** Resolves a skin filename against the page's own tokens.css href. */
function skinHref(file) {
  const link = document.querySelector('link[rel="stylesheet"][href*="tokens.css"]');
  if (!link) return null;
  return link.href.replace(/tokens\.css(\?.*)?$/, `skins/${file}.skin.css`);
}

/** Adds, swaps or removes the skin <link>. Empty state.skin means no link. */
function applySkin() {
  const existing = document.getElementById(SKIN_LINK_ID);
  if (existing) existing.remove();
  if (!state.skin) return;
  const href = skinHref(state.skin);
  if (!href) return;
  const link = document.createElement('link');
  link.id = SKIN_LINK_ID;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

/** Builds the skin selector. Sits above the knobs — it changes what they read. */
function skinSection() {
  const wrap = el('div');
  wrap.append(el('div', 'db-sec', 'skin'));
  const line = el('div', 'db-tog');
  const sel = el('select');
  for (const skin of SKINS) {
    const opt = el('option', null, skin.label);
    opt.value = skin.file;
    if (skin.file === state.skin) opt.selected = true;
    sel.append(opt);
  }
  sel.addEventListener('change', () => {
    state.skin = sel.value;
    applySkin();
    save();
    // The link loads async; knob discovery and derived values re-read after it lands.
    setTimeout(() => { repaintKnobs(); refreshDerived(); }, 60);
  });
  line.append(sel);
  wrap.append(line);
  return wrap;
}

function skinText() {
  const rootLines = [];
  const scopedLines = new Map();

  for (const { name, value } of KNOBS) {
    const over = state.overrides[name];
    if (over == null || over === '' || over === value) continue;
    const selector = SCOPE_OF.get(name);
    if (!selector) {
      rootLines.push(`  ${name}: ${over};`);
      continue;
    }
    if (!scopedLines.has(selector)) scopedLines.set(selector, []);
    scopedLines.get(selector).push(`  ${name}: ${over};`);
  }

  if (rootLines.length === 0 && scopedLines.size === 0) return '/* no knob differs from tokens.css */\n';

  const blocks = [`/* skin — dev box, ${new Date().toISOString()} */`];
  if (rootLines.length) blocks.push(`:root {\n${rootLines.join('\n')}\n}`);
  for (const [selector, lines] of scopedLines) blocks.push(`:root ${selector} {\n${lines.join('\n')}\n}`);
  return `${blocks.join('\n')}\n`;
}

/** Parses the skin body in a detached stylesheet. Returns true when every line survived. */
function skinParses(text) {
  const declCount = (text.match(/^\s+--/gm) || []).length;
  if (declCount === 0) return true;
  const el = document.createElement('style');
  el.textContent = text;
  document.head.appendChild(el);
  let ok = false;
  try {
    const rules = el.sheet ? el.sheet.cssRules : null;
    let survived = 0;
    for (const rule of Array.from(rules || [])) {
      if (rule.style) survived += rule.style.length;
    }
    ok = survived === declCount;
  } catch (err) {
    ok = false;
  }
  el.remove();
  return ok;
}

/** Copies text through the clipboard API, falling back to a selected textarea. */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    /* falls through to the textarea path */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (err) {
    ok = false;
  }
  ta.remove();
  return ok;
}

// =======================================================================================
// 8 · THE PANEL
// =======================================================================================

const BOX_CSS = `
#cbdaw-devbox {
  position: fixed; right: 8px; top: 8px; z-index: 2147483000;
  font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #e8edf5;
}
#cbdaw-devbox * { box-sizing: border-box; font: inherit; }
#cbdaw-devbox .db-handle {
  display: block; padding: 5px 10px; border: 1px solid #55627a; border-radius: 4px;
  background: #171d29; color: #e8edf5; cursor: pointer;
}
#cbdaw-devbox .db-panel {
  width: 340px; max-width: calc(100vw - 16px); max-height: 78vh;
  display: flex; flex-direction: column;
  border: 1px solid #55627a; border-radius: 6px; background: #10151f;
  box-shadow: 0 10px 30px rgba(0,0,0,0.6);
}
#cbdaw-devbox .db-head {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px; border-bottom: 1px solid #333e51; background: #171d29;
}
#cbdaw-devbox .db-head b { font-weight: 700; letter-spacing: 0.06em; }
#cbdaw-devbox .db-head .db-mode { color: #8b98ad; margin-left: auto; }
#cbdaw-devbox .db-bar { display: flex; gap: 4px; padding: 6px 8px; border-bottom: 1px solid #333e51; }
#cbdaw-devbox .db-bar input { flex: 1 1 auto; min-width: 0; }
#cbdaw-devbox .db-body { overflow: auto; padding: 4px 8px 8px; }
#cbdaw-devbox .db-sec {
  margin: 8px 0 4px; color: #8b98ad; letter-spacing: 0.08em; text-transform: uppercase;
}
#cbdaw-devbox .db-grp { border-top: 1px solid #1e2634; }
#cbdaw-devbox .db-grp-head {
  display: flex; align-items: center; gap: 6px; width: 100%;
  padding: 4px 2px; border: 0; border-radius: 0; background: none; text-align: left;
}
#cbdaw-devbox .db-grp-head:hover { background: #171d29; }
#cbdaw-devbox .db-grp-arrow { color: #8b98ad; width: 10px; }
#cbdaw-devbox .db-grp-label { flex: 1 1 auto; color: #cfd8e6; }
#cbdaw-devbox .db-grp-count { color: #8b98ad; }
#cbdaw-devbox .db-grp-body { padding: 0 0 4px 12px; border-left: 1px solid #1e2634; margin-left: 4px; }
#cbdaw-devbox .db-row { display: grid; grid-template-columns: 1fr auto; gap: 2px 4px; padding: 3px 0; }
#cbdaw-devbox .db-row + .db-row { border-top: 1px solid #1e2634; }
#cbdaw-devbox .db-name { color: #cfd8e6; overflow: hidden; text-overflow: ellipsis; }
#cbdaw-devbox .db-name.db-on { color: #34e5b4; }
#cbdaw-devbox .db-ctl { grid-column: 1 / -1; display: flex; align-items: center; gap: 4px; }
#cbdaw-devbox .db-ctl input[type=range] { flex: 1 1 auto; min-width: 0; height: 16px; }
#cbdaw-devbox .db-ctl input[type=color] { width: 30px; height: 20px; padding: 0; border: 1px solid #55627a; background: #10151f; }
#cbdaw-devbox .db-ctl input[type=text] { width: 78px; }
#cbdaw-devbox .db-ctl input.db-wide { width: 100%; }
#cbdaw-devbox input[type=text], #cbdaw-devbox textarea {
  border: 1px solid #55627a; border-radius: 3px; background: #0a0d13; color: #e8edf5; padding: 2px 4px;
}
#cbdaw-devbox button {
  border: 1px solid #55627a; border-radius: 3px; background: #1d2431; color: #e8edf5;
  padding: 2px 6px; cursor: pointer;
}
#cbdaw-devbox button:hover { background: #28313f; }
#cbdaw-devbox .db-rst { padding: 0 5px; color: #8b98ad; }
#cbdaw-devbox .db-tog { display: flex; align-items: flex-start; gap: 6px; padding: 4px 0; }
#cbdaw-devbox .db-tog + .db-tog { border-top: 1px solid #1e2634; }
#cbdaw-devbox .db-tog select { flex: 1 1 auto; min-width: 0; background: #10151f; color: #cfd8e6; border: 1px solid #55627a; font: inherit; padding: 2px 4px; }
#cbdaw-devbox .db-tog span { flex: 1 1 auto; color: #cfd8e6; }
#cbdaw-devbox .db-der { display: flex; justify-content: space-between; gap: 8px; padding: 1px 0; color: #8b98ad; }
#cbdaw-devbox .db-der b { color: #cfd8e6; font-weight: 400; }
#cbdaw-devbox .db-note { color: #8b98ad; padding: 4px 0; }
#cbdaw-devbox .db-warn { color: #ff7a1a; }
#${PROBE_ID} {
  position: fixed; left: -9999px; top: 0; width: 0; height: 0;
  visibility: hidden; overflow: hidden; contain: layout style size;
}
#${PROBE_ID} i { display: inline-block; height: 0; }
`;

let root = null;
let bodyEl = null;
let statusEl = null;

/** Injects the box's own stylesheet. Deliberately free of app tokens. */
function injectBoxStyle() {
  if (document.getElementById(BOX_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = BOX_STYLE_ID;
  el.textContent = BOX_CSS;
  document.head.appendChild(el);
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

/** Builds one knob row: name, controls, per-knob reset. */
function knobRow(knob) {
  const shape = shapeOf(knob.value);
  const current = () => state.overrides[knob.name] ?? knob.value;

  const row = el('div', 'db-row');
  const name = el('div', 'db-name', knob.name);
  name.title = `${knob.name} — tokens.css: ${knob.value}`;
  const reset = el('button', 'db-rst', '↺');
  reset.title = 'back to tokens.css';
  const ctl = el('div', 'db-ctl');
  row.append(name, reset, ctl);

  const markOn = () => name.classList.toggle('db-on', state.overrides[knob.name] != null);

  if (shape.kind === 'color') {
    const swatch = el('input');
    swatch.type = 'color';
    const hex = el('input', 'db-wide');
    hex.type = 'text';
    ctl.append(swatch, hex);

    const paint = () => {
      const v = current();
      hex.value = v;
      if (RE_HEX.test(v)) swatch.value = v.length > 7 ? v.slice(0, 7) : v;
      markOn();
    };
    swatch.addEventListener('input', () => {
      hex.value = swatch.value;
      setKnob(knob.name, swatch.value, false);
      markOn();
    });
    swatch.addEventListener('change', () => setKnob(knob.name, swatch.value, true));
    hex.addEventListener('change', () => {
      setKnob(knob.name, hex.value.trim(), true);
      paint();
    });
    reset.addEventListener('click', () => {
      setKnob(knob.name, null, true);
      paint();
    });
    paint();
    return { row, name, refresh: paint };
  }

  if (shape.kind === 'text') {
    const field = el('input', 'db-wide');
    field.type = 'text';
    ctl.append(field);
    const paint = () => {
      field.value = current();
      markOn();
    };
    field.addEventListener('change', () => {
      setKnob(knob.name, field.value.trim(), true);
      markOn();
    });
    reset.addEventListener('click', () => {
      setKnob(knob.name, null, true);
      paint();
    });
    paint();
    return { row, name, refresh: paint };
  }

  const range = rangeFor(shape);
  const slider = el('input');
  slider.type = 'range';
  slider.min = String(range.min);
  slider.max = String(range.max);
  slider.step = String(range.step);
  const typed = el('input');
  typed.type = 'text';
  ctl.append(slider, typed);

  const compose = (n) => `${round(n)}${shape.unit}`;
  const paint = () => {
    const v = current();
    typed.value = v;
    const parsed = parseFloat(v);
    if (!Number.isNaN(parsed)) slider.value = String(parsed);
    markOn();
  };
  slider.addEventListener('input', () => {
    typed.value = compose(parseFloat(slider.value));
    setKnob(knob.name, typed.value, false);
    markOn();
  });
  slider.addEventListener('change', () => setKnob(knob.name, compose(parseFloat(slider.value)), true));
  typed.addEventListener('change', () => {
    setKnob(knob.name, typed.value.trim(), true);
    paint();
  });
  reset.addEventListener('click', () => {
    setKnob(knob.name, null, true);
    paint();
  });
  paint();
  return { row, name, refresh: paint };
}

const knobRows = [];

/** Builds one toggle row from a TOGGLES entry. */
function toggleRow(toggle) {
  const line = el('div', 'db-tog');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = !!state[toggle.key];
  const text = el('span', null, toggle.label);
  line.append(box, text);
  if (toggle.extra) line.append(toggle.extra());
  box.addEventListener('change', () => {
    state[toggle.key] = box.checked;
    applyToggles();
    save();
    refreshDerived();
  });
  return line;
}

/** Builds the toggle section from the TOGGLES list. */
function toggleSection() {
  const wrap = el('div');
  wrap.append(el('div', 'db-sec', 'toggles — his call'));
  for (const toggle of TOGGLES) wrap.append(toggleRow(toggle));
  return wrap;
}

/** Builds the read-only derived table. */
function derivedSection() {
  const wrap = el('div');
  const head = el('div', 'db-sec');
  const btn = el('button', null, state.showDerived ? `hide derived (${DERIVED.length})` : `show derived (${DERIVED.length})`);
  head.append(btn);
  const body = el('div');
  body.style.display = state.showDerived ? 'block' : 'none';
  derivedBody = body;

  for (const { name } of DERIVED) {
    const line = el('div', 'db-der');
    const label = el('span', null, name);
    const val = el('b');
    val.dataset.derived = name;
    val.textContent = '—';
    line.append(label, val);
    body.append(line);
  }

  btn.addEventListener('click', () => {
    state.showDerived = !state.showDerived;
    body.style.display = state.showDerived ? 'block' : 'none';
    btn.textContent = state.showDerived ? `hide derived (${DERIVED.length})` : `show derived (${DERIVED.length})`;
    save();
    refreshDerived();
  });

  wrap.append(head, body);
  return wrap;
}

/** One entry per subgroup: its header button, its row container, its rows. */
const knobGroups = [];

/**
 * Hides rows that do not match the filter box, then hides any subgroup left with none.
 * A live filter force-opens the subgroups that still have rows.
 */
function applyFilter() {
  const q = state.filter.trim().toLowerCase();
  for (const r of knobRows) {
    r.row.style.display = !q || r.name.textContent.toLowerCase().includes(q) ? '' : 'none';
  }
  for (const g of knobGroups) {
    const hits = g.rows.filter((r) => r.row.style.display !== 'none').length;
    g.head.parentElement.style.display = hits ? '' : 'none';
    const open = q ? true : state.openGroups.includes(g.key);
    g.body.style.display = open ? '' : 'none';
    g.arrow.textContent = open ? '▾' : '▸';
    g.count.textContent = q ? `${hits}/${g.rows.length}` : String(g.rows.length);
  }
}

/** Builds one collapsible subgroup: header button, count, and its knob rows. */
function subgroupBlock(sectionLabel, sub, groupList) {
  const key = `${sectionLabel}·${sub.sub}`;
  const wrap = el('div', 'db-grp');

  const head = el('button', 'db-grp-head');
  const arrow = el('span', 'db-grp-arrow', '▸');
  const label = el('span', 'db-grp-label', sub.sub);
  const count = el('span', 'db-grp-count', String(sub.rows.length));
  head.append(arrow, label, count);

  const body = el('div', 'db-grp-body');
  const built = [];
  for (const knob of sub.rows) {
    const rowObj = knobRow(knob);
    knobRows.push(rowObj);
    built.push(rowObj);
    body.append(rowObj.row);
  }

  const group = { key, head, arrow, count, body, rows: built };
  head.addEventListener('click', () => {
    const at = state.openGroups.indexOf(key);
    if (at < 0) state.openGroups.push(key);
    else state.openGroups.splice(at, 1);
    save();
    applyFilter();
  });

  wrap.append(head, body);
  groupList.push(group);
  return wrap;
}

/** Builds the whole panel body once. Knobs render grouped by reach, every group collapsed. */
function buildBody() {
  const body = el('div', 'db-body');
  knobRows.length = 0;
  knobGroups.length = 0;

  body.append(skinSection());
  for (const { section, subs } of groupKnobs()) {
    const total = subs.reduce((n, s) => n + s.rows.length, 0);
    body.append(el('div', 'db-sec', `${section} (${total})`));
    for (const sub of subs) body.append(subgroupBlock(section, sub, knobGroups));
  }

  body.append(toggleSection());
  body.append(derivedSection());
  return body;
}

/** Repaints every knob control from state, e.g. after Reset all. */
function repaintKnobs() {
  for (const r of knobRows) r.refresh();
}

/** Mounts the box. Collapsed or expanded per stored state. */
function mount() {
  injectBoxStyle();
  applySkin();
  root = el('div');
  root.id = 'cbdaw-devbox';
  document.body.appendChild(root);
  buildProbes();
  render();
}

/** Swaps between the handle and the panel. */
function render() {
  root.textContent = '';
  if (state.collapsed) {
    const handle = el('button', 'db-handle', 'dev');
    handle.addEventListener('click', () => {
      state.collapsed = false;
      save();
      render();
    });
    root.append(handle);
    return;
  }

  const panel = el('div', 'db-panel');

  const head = el('div', 'db-head');
  head.append(el('b', null, 'DEV BOX'));
  head.append(el('span', 'db-mode', discoveryMode));
  const close = el('button', null, '–');
  close.title = 'collapse';
  close.addEventListener('click', () => {
    state.collapsed = true;
    save();
    render();
  });
  head.append(close);

  const bar = el('div', 'db-bar');
  const filter = el('input');
  filter.type = 'text';
  filter.placeholder = 'filter';
  filter.value = state.filter;
  filter.addEventListener('input', () => {
    state.filter = filter.value;
    applyFilter();
  });
  const resetAll = el('button', null, 'reset all');
  const copy = el('button', null, 'copy css');
  bar.append(filter, resetAll, copy);

  statusEl = el('div', 'db-note');

  resetAll.addEventListener('click', () => {
    for (const name of Object.keys(state.overrides)) {
      delete state.overrides[name];
      document.documentElement.style.removeProperty(name);
    }
    writeScoped();
    save();
    repaintKnobs();
    refreshDerived();
    statusEl.className = 'db-note';
    statusEl.textContent = 'all knobs back to tokens.css';
  });

  copy.addEventListener('click', async () => {
    const text = skinText();
    const ok = skinParses(text);
    const copied = await copyText(text);
    const changed = (text.match(/^\s+--/gm) || []).length;
    statusEl.className = ok ? 'db-note' : 'db-note db-warn';
    statusEl.textContent = `${changed} knob(s) · parses: ${ok ? 'yes' : 'NO'} · clipboard: ${copied ? 'yes' : 'no — see console'}`;
    if (!copied) console.log(text);
  });

  bodyEl = buildBody();
  panel.append(head, bar, statusEl, bodyEl);
  root.append(panel);
  applyFilter();
  refreshDerived();
}

/** Removes the box, its probes and its stylesheet. Overrides on the root stay. */
function unmount() {
  root?.remove();
  root = null;
  probeRack?.remove();
  probeRack = null;
  probeRows.length = 0;
  knobRows.length = 0;
  knobGroups.length = 0;
  derivedBody = null;
}

// =======================================================================================
// 9 · ENTRY — hash-gated, so a student never sees it
// =======================================================================================

/** True when the URL hash names the dev box. */
function hashOpen() {
  return location.hash.toLowerCase().includes(HASH_KEY);
}

let started = false;

async function start() {
  if (started) return;
  started = true;
  load();
  if (!discoverFromCssom()) await discoverFromFetch();
  if (KNOBS.length === 0) {
    console.warn('[devbox] no root knobs found in tokens.css — box not mounted');
    started = false;
    return;
  }
  KNOBS = KNOBS.concat(resolveScoped());
  applyAll();
  writeScoped();
  applyToggles();
  mount();
}

function sync() {
  if (hashOpen()) {
    if (!root) start();
  } else if (root) {
    unmount();
    started = false;
  }
}

window.addEventListener('hashchange', sync);

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync, { once: true });
else sync();

export default { start, unmount };

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

// =======================================================================================
// 1 · DISCOVERY — knobs and derived tokens, read out of tokens.css
// =======================================================================================

/** Custom properties declared on `:root`. Absolute units. These get controls. */
let KNOBS = [];
/** Custom properties declared on `*`. calc() off a knob. These are shown, not edited. */
let DERIVED = [];
/** 'cssom' | 'fetch' | 'none' — how KNOBS/DERIVED were found. */
let discoveryMode = 'none';

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
// 3 · STATE — overrides, panel flags, toggles
// =======================================================================================

const state = {
  overrides: {},
  collapsed: true,
  filter: '',
  showDerived: false,
  animsOff: false,
  interactionsOff: false,
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

/** Writes one knob to the root, or removes it when the value is null. */
function writeKnob(name) {
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
function skinText() {
  const lines = [];
  for (const { name, value } of KNOBS) {
    const over = state.overrides[name];
    if (over == null || over === '' || over === value) continue;
    lines.push(`  ${name}: ${over};`);
  }
  if (lines.length === 0) return '/* no knob differs from tokens.css */\n';
  return `/* skin — dev box, ${new Date().toISOString()} */\n:root {\n${lines.join('\n')}\n}\n`;
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
    const rule = rules && rules.length ? rules[rules.length - 1] : null;
    ok = !!rule && rule.style && rule.style.length === declCount;
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

/** Hides knob rows that do not match the filter box. */
function applyFilter() {
  const q = state.filter.trim().toLowerCase();
  for (const r of knobRows) {
    r.row.style.display = !q || r.name.textContent.toLowerCase().includes(q) ? '' : 'none';
  }
}

/** Builds the whole panel body once. */
function buildBody() {
  const body = el('div', 'db-body');
  knobRows.length = 0;

  body.append(el('div', 'db-sec', `knobs (${KNOBS.length}) — :root, absolute units`));
  for (const knob of KNOBS) {
    const built = knobRow(knob);
    knobRows.push(built);
    body.append(built.row);
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
  applyAll();
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

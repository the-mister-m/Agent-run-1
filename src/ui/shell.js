/**
 * ui/shell.js — the reusable page shell. Built by `tone-shell`, P1/S4.
 *
 * This is the first file in the run that sees all seven S2/S3 modules at once and turns
 * them into a page a student can be sent to. It owns the chrome around a tool — the file
 * menu, the input-surface switcher, the CPU meter and `noCap` toggle, the per-tool scale
 * seam, and the wiring that connects `core/input.js`'s bus to an instrument's `noteOn` /
 * `noteOff`. It owns nothing inside any of those modules.
 *
 * Owns: this file, `/tools/wave-synth.html`, `/tools/overtone-synth.html`.
 * Does NOT own and never edits: `core/audio.js` · `core/input.js` · either instrument ·
 * `surfaces/keyboard.js` · `vis/spectrum.js` · `vis/scope.js` · `ui/tokens.css` (read
 * only, §9) · `/index.html` (P4) · `ui/overlays.js` (P3) · CONTRACTS.md.
 *
 * WRITTEN TO BE REUSED. STAGE.md: "this seat creates it, and P2/P3 reuse it." Every
 * P1-specific fact lives in a data table near the top (TOOLS, SURFACES) or in the config
 * object a page passes to `mountStandaloneTool()`. A later phase adds a tool or a surface
 * by adding a row or calling `registerSurface()` — not by rewriting the shell.
 *
 * THE SEVEN THINGS THIS SEAT WAS ASKED, and where each one lives in this file:
 *   1 · standalone layout is EXPANDED, never compact ......... §6 `mountStandaloneTool`
 *   2 · file menu at the top, reusable into P4 ............... §2 `createFileMenu`
 *   3 · zero build step, plain ES modules .................... whole file: no bundler,
 *       no dependency, relative imports only (CONTRACTS §10)
 *   4 · each page owns its own scale control ................. §4 `createScaleControl`
 *   5 · surfaces SWITCH, they do not stack ................... §3 `createSurfaceSwitcher`
 *   6 · CPU meter visible, `noCap` reachable ................. §5 `createCpuMeter`
 *   7 · clean teardown, zero leaks ........................... §6 `ToolShell.unmount`
 */

import {
  ctx,
  audio,
  unlock,
  governor,
  voicePool,
  createChannel,
  releaseChannel,
} from '../core/audio.js';
import { input } from '../core/input.js';
import { state } from '../core/state.js';
import { spellingOf } from '../theory/scale.js';
import Keyboard, { PLACEHOLDER_LETTERS } from '../surfaces/keyboard.js';
import DiatonicKeys from '../surfaces/diatonic-keys.js';
import ScaleCircle from '../surfaces/scale-circle.js';
import './devbox.js';

// =======================================================================================
// 1 · REGISTRIES — the two data tables that make this shell reusable
// =======================================================================================

/**
 * Every tool page in CONTRACTS §1's file layout, in teaching order, plus the DAW.
 *
 * `available: false` rows are drawn but disabled, tagged with the phase that builds them.
 * A student sent to this page can see where the course is going; nobody can click through
 * to a 404 in front of a class. **A later phase flips one boolean.** That is the entire
 * edit P2/P3/P4 need to make here.
 */
export const TOOLS = [
  { id: 'wave-synth', label: 'Wave Synth', href: 'wave-synth.html', available: true, phase: 'P1' },
  { id: 'overtone-synth', label: 'Overtone Synth', href: 'overtone-synth.html', available: true, phase: 'P1' },
  { id: 'beat', label: 'Beat', href: 'beat.html', available: true, phase: 'P2' },
  { id: 'harmony', label: 'Harmony', href: 'harmonyNEW.html', available: true, phase: 'P3' },
  { id: 'patch-synth', label: 'Patch Synth', href: 'patch-synth.html', available: false, phase: 'P4' },
  { id: 'daw', label: 'The DAW', href: '../index.html', available: false, phase: 'P4' },
];

/**
 * Input surfaces the switcher can offer. **P1 ships exactly one** — the 12-note keyboard
 * (`keys-input`, P1/S3). The switcher is still built as a switcher, with one option in it,
 * so P3's `diatonic-keys` and `scale-circle` drop in by calling `registerSurface()` and
 * nothing else changes.
 *
 * `kind` lets a rhythm tool (P2's beat page) ask for rhythm surfaces without being offered
 * a piano keyboard, and vice versa. `Ctor` must satisfy CONTRACTS §12.1: `constructor(el,
 * input)`, `mount(el)`, `unmount()`, `dispose()`.
 */
const SURFACES = [
  {
    id: 'keyboard',
    kind: 'pitch',
    label: Keyboard.label ?? '12-Note Keyboard',
    hint: 'Click, tap, play the computer keys (Z…/ and Q…P), or plug in MIDI.',
    Ctor: Keyboard,
  },
];

/**
 * How P3 adds `diatonic-keys` and `scale-circle` without editing this file's body.
 * Idempotent by `id` — registering the same surface twice replaces the earlier row rather
 * than stacking a duplicate into the menu.
 */
export function registerSurface(descriptor) {
  if (!descriptor || !descriptor.id || typeof descriptor.Ctor !== 'function') {
    throw new TypeError('registerSurface: needs {id, label, kind, Ctor}');
  }
  const i = SURFACES.findIndex((s) => s.id === descriptor.id);
  if (i >= 0) SURFACES[i] = { kind: 'pitch', ...descriptor };
  else SURFACES.push({ kind: 'pitch', ...descriptor });
  return SURFACES.length;
}

/**
 * P3's two surfaces, registered here — Brandon's call, 2026-08-25. The comment above said
 * "P3 adds `diatonic-keys` and `scale-circle` by calling `registerSurface()`", and nothing
 * ever called it, so the switcher shipped with one option in it on every page.
 *
 * Both satisfy §12.1's `constructor(el, input)`: `ScaleCircle`'s third argument (the §4
 * store) defaults to the shared one, so a two-argument construction by the switcher is
 * the standalone case and is correct.
 */
registerSurface({
  id: 'diatonic-keys',
  kind: 'pitch',
  label: DiatonicKeys.label ?? 'Diatonic Keys',
  hint: 'One key per scale degree — play in key without hunting for the notes.',
  Ctor: DiatonicKeys,
});

registerSurface({
  id: 'scale-circle',
  kind: 'pitch',
  label: ScaleCircle.label ?? 'Scale Circle',
  hint: 'Inner ring plays the degree, outer ring plays the chord built on it.',
  Ctor: ScaleCircle,
});

/** Read-only view of the registry, filtered by kind. Used by the switcher and by tests. */
export function surfacesOfKind(kind = 'pitch') {
  return SURFACES.filter((s) => s.kind === kind);
}

// =======================================================================================
// 1a · SHELL CHROME STYLE — CONTRACTS §9 tokens only, never a color literal
// =======================================================================================
// Every colour is `var(--token, fallback)` off `ui/tokens.css` (§9). The fallbacks are the
// same house pattern every S3 seat used: they let the shell render in a page that has not
// linked tokens.css yet, and they are not a second palette. `ui/tokens.css` is `scopes`'
// file and is READ ONLY here — this seat never edits a value in it.
//
// Injected once per document and reference-counted, so a page that mounts two shells (P4)
// does not get two stylesheets, and the last shell to unmount takes it away again.

const STYLE_ID = 'cbdaw-shell-style';
let shellStyleRefs = 0;

const STYLE_TEXT = `
.cbdaw-shell {
  --shell-gap: 12px;
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  gap: var(--shell-gap);
  min-height: var(--vh-100);
  box-sizing: var(--box-border-box);
  padding: var(--sp-5) var(--sp-7) var(--sp-7);
  background: var(--bg, #0a0d13);
  color: var(--text, #f2f6fc);
  font-family: var(--font-ui);
}
.cbdaw-shell *, .cbdaw-shell *::before, .cbdaw-shell *::after { box-sizing: var(--box-border-box); }

/* ——— top bar: file menu · title · status cluster ——————————————————————————— */
.cbdaw-shell__top {
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-8);
  flex-wrap: var(--flexwrap-wrap);
  padding: var(--sp-4) var(--sp-6);
  background: var(--panel, #1b2332);
  border: var(--bw) solid var(--line, #3a485f);
  border-radius: var(--r-panel);
}
.cbdaw-shell__title {
  font-size: var(--fs-xl);
  font-weight: var(--w-bold);
  letter-spacing: var(--track-tight);
  margin: var(--sp-0);
}
.cbdaw-shell__subtitle {
  font-size: var(--fs-md);
  line-height: var(--lh-base);
  color: var(--text-dim, #93a1b8);
  margin: var(--sp-0);
}
/* Shrinkable so a long lesson line wraps inside its own box instead of pushing the CPU
   meter onto a second row. The meter has to stay where a teacher can see it. */
.cbdaw-shell__titles { flex: var(--flex-1-1-240); min-width: var(--sp-0); }
.cbdaw-shell__spacer { flex: var(--flex-0-1-auto); }

/* ——— the file menu (§2) ——————————————————————————————————————————————————— */
.cbdaw-menu { position: var(--pos-relative); }
.cbdaw-menu__button {
  font: var(--font-inherit);
  font-weight: var(--w-med);
  display: var(--disp-flex);
  align-items: var(--align-center);
  gap: var(--sp-4);
  padding: var(--sp-3h) var(--sp-6);
  color: var(--text, #f2f6fc);
  background: var(--bg, #0a0d13);
  border: var(--bw) solid var(--line, #3a485f);
  border-radius: var(--r-body);
  cursor: var(--cur-pointer);
}
.cbdaw-menu__button:hover, .cbdaw-menu__button:focus-visible { border-color: var(--accent, #34e5b4); }
.cbdaw-menu__caret { color: var(--text-dim, #93a1b8); font-size: var(--fs-sm); }
.cbdaw-menu__list {
  position: var(--pos-absolute);
  top: var(--dropdown-offset);
  left: var(--sp-0);
  z-index: var(--z-popover);
  min-width: 260px;
  margin: var(--sp-0);
  padding: var(--sp-3);
  list-style: var(--ls-none);
  background: var(--panel, #1b2332);
  border: var(--bw) solid var(--line, #3a485f);
  border-radius: var(--r-panel);
  box-shadow: var(--shadow-raised);
}
.cbdaw-menu[data-open="false"] .cbdaw-menu__list { display: var(--disp-none); }
.cbdaw-menu__item {
  display: var(--disp-flex);
  align-items: var(--align-baseline);
  justify-content: var(--justify-space-between);
  gap: var(--sp-7);
  width: var(--pct-100);
  font: var(--font-inherit);
  text-align: var(--ta-left);
  padding: var(--sp-4) var(--sp-5);
  color: var(--text, #f2f6fc);
  background: var(--color-transparent);
  border: var(--sp-0);
  border-radius: var(--r-ctl);
  cursor: var(--cur-pointer);
}
.cbdaw-menu__item:hover:not(:disabled) { background: var(--bg, #0a0d13); }
.cbdaw-menu__item[aria-current="true"] { color: var(--accent, #34e5b4); font-weight: var(--w-bold); }
.cbdaw-menu__item:disabled { color: var(--text-dim, #93a1b8); cursor: var(--cur-not-allowed); opacity: var(--op-mid); }
.cbdaw-menu__tag { font-size: var(--fs-sm); color: var(--text-dim, #93a1b8); letter-spacing: var(--track-label); }

/* ——— status cluster: audio state · CPU meter · noCap (§5) ————————————————— */
.cbdaw-status { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-7); flex-wrap: var(--flexwrap-wrap); font-size: var(--fs-base); }
.cbdaw-status__group { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-3); color: var(--text-dim, #93a1b8); }
.cbdaw-status__value { color: var(--text, #f2f6fc); font-variant-numeric: var(--num-tabular); }
.cbdaw-cpu__track {
  position: var(--pos-relative);
  width: var(--sp-60);
  height: var(--sp-5);
  background: var(--bg, #0a0d13);
  border: var(--bw) solid var(--line, #3a485f);
  border-radius: var(--r-ctl);
  overflow: var(--ov-hidden);
}
.cbdaw-cpu__fill {
  height: var(--pct-100);
  width: var(--pct-0);
  background: var(--meter-ok, #6ee05a);
  transition: var(--tr-width);
}
.cbdaw-cpu__fill[data-band="warn"] { background: var(--warn, #ff7a1a); }
.cbdaw-cpu__fill[data-band="hot"] { background: var(--meter-hot, #ff3b30); }
.cbdaw-nocap { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-3); cursor: var(--cur-pointer); user-select: var(--usel-none); }
.cbdaw-nocap input { accent-color: var(--warn, #ff7a1a); }
.cbdaw-nocap[data-on="true"] { color: var(--warn, #ff7a1a); font-weight: var(--w-bold); }
.cbdaw-shell__unlock {
  font: var(--font-inherit);
  font-weight: var(--w-bold);
  padding: var(--sp-3) var(--sp-6);
  color: var(--bg, #0a0d13);
  background: var(--accent, #34e5b4);
  border: var(--sp-0);
  border-radius: var(--r-body);
  cursor: var(--cur-pointer);
}
.cbdaw-shell__unlock[hidden] { display: var(--disp-none); }

/* ——— panels ————————————————————————————————————————————————————————————— */
.cbdaw-panel {
  background: var(--panel, #1b2332);
  border: var(--bw) solid var(--line, #3a485f);
  border-radius: var(--r-panel);
  padding: var(--sp-6) var(--sp-7);
}
.cbdaw-panel__head {
  display: var(--disp-flex);
  align-items: var(--align-baseline);
  gap: var(--sp-5);
  flex-wrap: var(--flexwrap-wrap);
  margin-bottom: var(--sp-5);
}
.cbdaw-panel__title {
  font-size: var(--fs-md);
  font-weight: var(--w-bold);
  letter-spacing: var(--track-label);
  text-transform: var(--tt-label);
  color: var(--text, #f2f6fc);
  margin: var(--sp-0);
}
.cbdaw-panel__note { font-size: var(--fs-base); color: var(--text-dim, #93a1b8); }
/* Two columns — instrument on the left, the visual and the scale seam on the right, the
   playing surface across the bottom. This ordering is not decoration: at 1366×768, the
   Chromebook screen this ships to, a full-width visual pushed the KEYBOARD — the primary
   way a student gets in — below the fold. Measured, then fixed. See the receipt. */
.cbdaw-shell__columns {
  display: var(--disp-grid);
  grid-template-columns: var(--grid-1-115);
  gap: var(--shell-gap);
  align-items: var(--align-start);
}
.cbdaw-shell__col { display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--shell-gap); }
@media (max-width: 900px) { .cbdaw-shell__columns { grid-template-columns: var(--grid-minmax-0-1fr); } }
.cbdaw-shell__instrument > * { width: var(--pct-100); }

/* ——— the surface switcher (§3) ——————————————————————————————————————————— */
/* THE PLAYING SURFACE IS ALWAYS ON SCREEN, and that is measured rather than assumed.
   A full teaching page — instrument controls, a 300 px visual, the scale seam and a 168 px
   piano — is 1062 px tall. A Chromebook screen is 768. Laid out as one long scrolling
   document, the KEYBOARD — the one control every student needs first — is the thing that
   falls off the bottom.
   So on any screen tall enough to be worth it the shell becomes a fixed-viewport app
   layout: the top bar and the playing surface are pinned, and the middle (instrument +
   visual + scale) is the part that scrolls. On a very short window it falls back to
   ordinary document scrolling rather than squeezing the middle to nothing. */
.cbdaw-shell__surface {
  margin-top: var(--auto);
  box-shadow: var(--shadow-lifted);
}
@media (min-height: 620px) {
  .cbdaw-shell { height: var(--vh-100); overflow: var(--ov-hidden); }
  .cbdaw-shell__columns {
    flex: var(--flex-1-1-auto);
    min-height: var(--sp-0);
    overflow-y: var(--auto);
    overflow-x: var(--ov-hidden);
    padding-right: var(--sp-2);
  }
}
.cbdaw-switcher { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-3); flex-wrap: var(--flexwrap-wrap); }
.cbdaw-switcher__button {
  font: var(--font-inherit);
  font-size: var(--fs-md);
  padding: var(--sp-3) var(--sp-6);
  color: var(--text-dim, #93a1b8);
  background: var(--bg, #0a0d13);
  border: var(--bw) solid var(--line, #3a485f);
  border-radius: var(--r-pill);
  cursor: var(--cur-pointer);
}
.cbdaw-switcher__button[aria-pressed="true"] {
  color: var(--bg, #0a0d13);
  background: var(--accent, #34e5b4);
  border-color: var(--accent, #34e5b4);
  font-weight: var(--w-bold);
}
.cbdaw-switcher__button:disabled { opacity: var(--op-dim); cursor: var(--cur-not-allowed); }

/* ——— the scale seam (§4) ————————————————————————————————————————————————— */
.cbdaw-scale { display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-5); font-size: var(--fs-md); }
.cbdaw-scale__row { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-4); }
.cbdaw-scale__label { color: var(--text-dim, #93a1b8); min-width: var(--sp-33); }
.cbdaw-scale button {
  font: var(--font-inherit);
  font-weight: var(--w-bold);
  min-width: var(--sp-15);
  padding: var(--sp-2) var(--sp-4);
  color: var(--text, #f2f6fc);
  background: var(--bg, #0a0d13);
  border: var(--bw) solid var(--line, #3a485f);
  border-radius: var(--r-ctl);
  cursor: var(--cur-pointer);
}
.cbdaw-scale button:hover { border-color: var(--accent, #34e5b4); }
.cbdaw-scale__readout {
  min-width: var(--sp-17);
  text-align: var(--ta-center);
  font-weight: var(--w-bold);
  font-size: 16px;
  color: var(--accent, #34e5b4);
  font-variant-numeric: var(--num-tabular);
}
.cbdaw-scale__degrees {
  display: var(--disp-flex);
  gap: var(--sp-2h);
  flex-wrap: var(--flexwrap-wrap);
  font-variant-numeric: var(--num-tabular);
}
.cbdaw-scale__degree {
  min-width: var(--sp-13);
  padding: var(--sp-1h) 0;
  text-align: var(--ta-center);
  color: var(--text, #f2f6fc);
  background: var(--bg, #0a0d13);
  border: var(--bw) solid var(--line, #3a485f);
  border-radius: var(--r-ctl);
}
.cbdaw-seam {
  font-size: var(--fs-base);
  line-height: var(--lh-base);
  color: var(--warn, #ff7a1a);
}

.cbdaw-shell__error {
  padding: var(--sp-8);
  border: var(--bw) solid var(--meter-hot, #ff3b30);
  border-radius: var(--r-panel);
  background: var(--panel, #1b2332);
  color: var(--text, #f2f6fc);
  white-space: var(--ws-prewrap);
  font-family: var(--font-mono);
  font-size: var(--fs-md);
}
`;

/**
 * Injects the shell chrome stylesheet, ref-counted (§1a). Exported so a page that reuses
 * `createFileMenu`/`createCpuMeter` without mounting a `ToolShell` can pull the same
 * stylesheet instead of carrying its own copy of these selectors — `ToolShell.mount()`
 * calls this internally too, so there is exactly one style block and one ref count no
 * matter which path a page takes in. Pair every call with `releaseShellStyle()`.
 */
export function acquireShellStyle() {
  shellStyleRefs++;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
}

/** Releases one `acquireShellStyle()` ref; removes the stylesheet once the count hits 0. */
export function releaseShellStyle() {
  shellStyleRefs = Math.max(0, shellStyleRefs - 1);
  if (shellStyleRefs > 0) return;
  document.getElementById(STYLE_ID)?.remove();
}

/**
 * Tracks every DOM listener a component attaches so `dispose()` can drop all of them and
 * report a number. Every seat before this one proved teardown by count rather than by
 * claim; this is the same discipline applied to the shell's own chrome.
 */
function listenerBag() {
  const bag = [];
  return {
    add(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      bag.push({ target, type, fn, opts });
    },
    get size() {
      return bag.length;
    },
    dropAll() {
      const n = bag.length;
      for (const { target, type, fn, opts } of bag) target.removeEventListener(type, fn, opts);
      bag.length = 0;
      return n;
    },
  };
}

// =======================================================================================
// 2 · THE FILE MENU  (seat question 2)
// =======================================================================================
//
// Brandon asked for a menu at the top that isolates ONE thing. In P1 the one thing is
// which tool you are in; in P4 the same component becomes the DAW's isolate control. So it
// is built here, in the shared shell, and it is built to be told what to isolate rather
// than to know:
//
//   · `items`     — [{id, label, available, phase, href?}]; the shell's TOOLS table is
//                   only P1's default argument, not a hard-coded list inside the component.
//   · `onSelect`  — the caller decides what selecting means. In P1 that is "navigate to
//                   that page". In P4 it will be "isolate that channel" with no navigation
//                   at all, and this component will not need to change.
//
// Unavailable entries render disabled and tagged with the phase that builds them, so the
// menu is honest about what exists instead of leading a class to a 404.

export function createFileMenu({
  items = TOOLS,
  currentId = null,
  label = 'Tool',
  onSelect = null,
} = {}) {
  const listeners = listenerBag();

  const root = document.createElement('div');
  root.className = 'cbdaw-menu';
  root.dataset.open = 'false';

  const current = items.find((t) => t.id === currentId) || null;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cbdaw-menu__button';
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML =
    `<span class="cbdaw-menu__tag">${label}</span>` +
    `<span data-menu-current>${current ? current.label : 'Choose…'}</span>` +
    `<span class="cbdaw-menu__caret" aria-hidden="true">▾</span>`;
  root.appendChild(button);

  const list = document.createElement('ul');
  list.className = 'cbdaw-menu__list';
  list.setAttribute('role', 'menu');
  root.appendChild(list);

  for (const item of items) {
    const li = document.createElement('li');
    const entry = document.createElement('button');
    entry.type = 'button';
    entry.className = 'cbdaw-menu__item';
    entry.setAttribute('role', 'menuitem');
    entry.dataset.toolId = item.id;
    entry.disabled = item.available === false;
    if (item.id === currentId) entry.setAttribute('aria-current', 'true');
    entry.innerHTML =
      `<span>${item.label}</span>` +
      `<span class="cbdaw-menu__tag">${item.available === false ? `${item.phase} — not built yet` : item.phase}</span>`;
    listeners.add(entry, 'click', () => {
      setOpen(false);
      if (item.id === currentId) return;
      if (typeof onSelect === 'function') onSelect(item, root);
      else if (item.href) window.location.href = item.href;
    });
    li.appendChild(entry);
    list.appendChild(li);
  }

  function setOpen(open) {
    root.dataset.open = String(open);
    button.setAttribute('aria-expanded', String(open));
  }

  listeners.add(button, 'click', (e) => {
    e.stopPropagation();
    setOpen(root.dataset.open !== 'true');
  });
  // Click-anywhere-else and Escape both close it. Both listeners are in the bag, so both
  // come off in dispose() — a menu that leaves a document-level listener behind is exactly
  // the kind of leak seat question 7 is about.
  listeners.add(document, 'click', (e) => {
    if (!root.contains(e.target)) setOpen(false);
  });
  listeners.add(document, 'keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  return {
    el: root,
    /** P4 will re-label the button as it isolates different things. */
    setCurrent(id) {
      const item = items.find((t) => t.id === id);
      button.querySelector('[data-menu-current]').textContent = item ? item.label : 'Choose…';
      for (const entry of list.querySelectorAll('[data-tool-id]')) {
        if (entry.dataset.toolId === id) entry.setAttribute('aria-current', 'true');
        else entry.removeAttribute('aria-current');
      }
    },
    dispose() {
      const dropped = listeners.dropAll();
      root.remove();
      return { listenersDropped: dropped };
    },
  };
}

// =======================================================================================
// 3 · THE INPUT-SURFACE SWITCHER  (seat question 5)
// =======================================================================================
//
// BUILDPLAN: in the DAW and in virtual instruments you **switch** playing surfaces. All
// three showing at once is reserved for P3's harmony engines. So this component holds at
// most ONE live surface and proves it structurally: selecting a surface disposes the
// previous one before constructing the next, and the mount host is emptied in between.
// There is no code path here that can produce two live surfaces.
//
// P1 registers exactly one surface (the 12-note keyboard), so the switcher renders one
// option, already selected. That is deliberate: P3 calls `registerSurface()` for
// `diatonic-keys` and `scale-circle` and the switcher grows two buttons with no edit here.

export function createSurfaceSwitcher({ kind = 'pitch', onChange = null } = {}) {
  const listeners = listenerBag();
  const options = surfacesOfKind(kind);

  const root = document.createElement('div');
  root.className = 'cbdaw-panel cbdaw-shell__surface';

  const head = document.createElement('div');
  head.className = 'cbdaw-panel__head';
  head.innerHTML = `<h2 class="cbdaw-panel__title">Playing surface</h2>`;

  const bar = document.createElement('div');
  bar.className = 'cbdaw-switcher';
  head.appendChild(bar);

  const hint = document.createElement('span');
  hint.className = 'cbdaw-panel__note';
  head.appendChild(hint);
  root.appendChild(head);

  const host = document.createElement('div');
  host.dataset.surfaceHost = '';
  root.appendChild(host);

  /** The one live surface. Never a list — that is the whole point of this component. */
  let live = null;
  let liveId = null;

  function select(id) {
    const descriptor = options.find((s) => s.id === id);
    if (!descriptor) return null;
    if (liveId === id && live) return live;

    // SWITCH, NOT STACK: the outgoing surface is disposed — which also releases anything
    // it was holding on the bus (§12.1) — before the incoming one is constructed.
    if (live) {
      live.dispose();
      live = null;
      liveId = null;
    }
    host.textContent = '';

    live = new descriptor.Ctor(host, input);
    // CONTRACTS §2/§12.1: the standalone view is the EXPANDED view. Never mountCompact
    // on a standalone page — that is seat question 1, and this is the surface half of it.
    if (typeof live.mountExpanded === 'function') live.mountExpanded(host);
    else live.mount(host);
    liveId = id;

    hint.textContent = descriptor.hint || '';
    for (const b of bar.querySelectorAll('[data-surface-id]')) {
      b.setAttribute('aria-pressed', String(b.dataset.surfaceId === id));
    }
    if (typeof onChange === 'function') onChange(descriptor, live);
    return live;
  }

  for (const s of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cbdaw-switcher__button';
    b.dataset.surfaceId = s.id;
    b.textContent = s.label;
    b.setAttribute('aria-pressed', 'false');
    listeners.add(b, 'click', () => select(s.id));
    bar.appendChild(b);
  }

  if (options.length === 1) {
    // One option today. The control still exists, still reads as a switcher, and the P3
    // seam is stated on screen so it reads as "one so far", not as a broken menu.
    const seam = document.createElement('div');
    seam.className = 'cbdaw-seam';
    seam.style.marginTop = 'var(--sp-4)';
    seam.textContent =
      'SEAM — P1 ships one playing surface. P3 registers diatonic keys and the scale ' +
      'circle here (shell.registerSurface). Surfaces switch, they never stack.';
    root.appendChild(seam);
  }

  return {
    el: root,
    select,
    get current() {
      return live;
    },
    get currentId() {
      return liveId;
    },
    /** Count of live surfaces. Structurally 0 or 1 — asserted by the DONE-CHECK. */
    get liveCount() {
      return live ? 1 : 0;
    },
    dispose() {
      const dropped = listeners.dropAll();
      let surfaceReport = null;
      if (live) {
        surfaceReport = live.dispose();
        live = null;
        liveId = null;
      }
      root.remove();
      return { listenersDropped: dropped, surface: surfaceReport };
    },
  };
}

// =======================================================================================
// 4 · THE SCALE CONTROL — a seam, not an engine  (seat question 4)
// =======================================================================================
//
// BUILDPLAN / CONTRACTS §4: "in a standalone tool, that tool owns its own `state.scale`."
// The tool is the lesson, so the scale lives with the tool and not in a global header.
//
// **This is deliberately minimal, and here is exactly where it stops.**
// `core/state.js` and `theory/scale.js` do not exist — both are later phases (§1). The
// full scale engine is P3's `scale-engine`, gated behind `redpen-theory` because the "12
// scales" list is UNRESOLVED and is Brandon's alone (§4's ⚠ block, open-decisions D-1).
// CONTRACTS §10-H is blunt about it: "a BUILD seat that finds itself picking a scale, a
// syllable, a spelling, or a chord name has left its lane."
//
// So this control:
//   · holds a state object shaped EXACTLY like §4's `state.scale`, with §4's own literal
//     default values — quoting the contract, not inventing a scale;
//   · lets the student move `tonic` across the 12 pitch classes, which is a §4 field with
//     a stated range and no theory content;
//   · shows `degrees` READ-ONLY, because altering a degree requires §4's `altered` /
//     `preset` machinery and the +/- UI that P3's surfaces own;
//   · offers NO preset list. Naming the 12 scales is D-1 and is not a seat's to guess;
//   · says on screen that it is a seam, so a blank spot reads as unbuilt, not broken.
//
// P3 replaces the body of this function with the real engine. The shape it hands back —
// `{el, scale, on(fn), dispose()}` — is what the rest of the shell binds to, so the swap
// is one function, not a shell rewrite.

export function createScaleControl(store = state) {
  const listeners = listenerBag();

  // ——— POINTED AT THE REAL SCALE — Brandon's call, 2026-08-25 ————————————————————————
  // This function used to hold a private `{tonic, degrees, name}` object of its own, which
  // was right in P1 (`core/state.js` and `theory/scale.js` did not exist) and became a
  // SECOND SCALE the moment P3 landed. §4 says there is one. It now reads `store.scale`,
  // writes through §4's `setScaleTonic`, and redraws on `store.on('scale')` — so a tonic
  // moved here moves the circle, the diatonic keys and the piano roll shading, and a
  // degree moved on a surface's +/- shows up here.
  //
  // The returned shape — `{el, scale, on(fn), dispose()}` — did not change, so nothing
  // that already binds to this control needs an edit.

  const root = document.createElement('div');
  root.className = 'cbdaw-panel';
  root.innerHTML = `
    <div class="cbdaw-panel__head">
      <h2 class="cbdaw-panel__title">Scale</h2>
      <span class="cbdaw-panel__note">this tool owns its own scale (§4) — core/state.js</span>
    </div>
    <div class="cbdaw-scale">
      <div class="cbdaw-scale__row">
        <span class="cbdaw-scale__label">Tonic</span>
        <button type="button" data-tonic="-1" aria-label="tonic down">&minus;</button>
        <span class="cbdaw-scale__readout" data-tonic-readout>C</span>
        <button type="button" data-tonic="1" aria-label="tonic up">+</button>
        <span class="cbdaw-panel__note" data-scale-name>Major</span>
      </div>
      <div class="cbdaw-scale__row" style="align-items:var(--align-flex-start)">
        <span class="cbdaw-scale__label">Degrees</span>
        <div class="cbdaw-scale__degrees" data-degrees></div>
      </div>
      <p class="cbdaw-seam">
        Degrees are read-only HERE — the +/- per degree lives on the scale circle and the
        diatonic keys, where §4 puts it, and this control does not duplicate it. Move one
        there and this readout follows: it is the same scale (core/state.js), not a copy.
      </p>
    </div>`;

  const tonicReadout = root.querySelector('[data-tonic-readout]');
  const degreesEl = root.querySelector('[data-degrees]');
  const nameEl = root.querySelector('[data-scale-name]');

  function render() {
    // The spelling is `theory/scale.js`'s, per §6 ("labels come from theory/scale.js. No
    // surface builds its own label strings") and §10-H. `PLACEHOLDER_LETTERS` was P1's
    // stand-in until that file existed; it is the fallback now, not the source, so the tie
    // key reads its composite face (§15's A1) instead of one arbitrary half of it.
    const scale = store.scale;
    tonicReadout.textContent =
      spellingOf(scale, 0).text ?? PLACEHOLDER_LETTERS[scale.tonic] ?? '';
    nameEl.textContent = scale.name;
    degreesEl.textContent = '';
    for (const d of scale.degrees) {
      const cell = document.createElement('span');
      cell.className = 'cbdaw-scale__degree';
      cell.textContent = String(d);
      cell.title = `${d} semitones above ${tonicReadout.textContent}`;
      degreesEl.appendChild(cell);
    }
  }

  for (const b of root.querySelectorAll('[data-tonic]')) {
    listeners.add(b, 'click', () => {
      const step = Number(b.dataset.tonic);
      // §4/§15.5's own mutation. This control computes no music and writes no field.
      store.setScaleTonic(((store.scale.tonic + step) % 12 + 12) % 12);
    });
  }

  // §4: "state.on('scale', fn) — every surface subscribes." A tonic moved on a surface's
  // +/- redraws this readout with no wiring at the call site.
  const offStore = store.on('scale', render);

  render();

  return {
    el: root,
    /** §4's live scale — the store's, not a copy. Read it; never write into it. */
    get scale() {
      return store.scale;
    },
    /** The store this control is pointed at, for a caller that wants the mutations. */
    store,
    /** §4's `state.on('scale', fn)`. Returns an unsubscribe, same shape as before. */
    on(fn) {
      return store.on('scale', fn);
    },
    dispose() {
      offStore();
      const dropped = listeners.dropAll();
      root.remove();
      return { listenersDropped: dropped };
    },
  };
}

// =======================================================================================
// 5 · THE CPU METER AND `noCap`  (seat question 6)
// =======================================================================================
//
// CONTRACTS §8: `governor.load` is 0..1 smoothed, `governor.noCap` is a dev toggle that
// SHIPS ON THE DEPLOYED BUILD, and "when noCap is on, the meter still reads and still
// turns red. Nothing is blocked. Brandon wants the Chromebooks to crash." So the meter is
// on both pages, always visible, and the toggle is one click away — no dev console, no
// query string, no hidden gesture.
//
// Read on rAF. §3: visuals read from rAF, audio reads from the scheduler, and the two
// loops never cross. This meter is a visual.
//
// TWO HONEST LIMITS, both already documented upstream and neither invented here:
//   · §8's own warning — this probe measures MAIN-THREAD cost. A graph heavy in convolvers
//     can saturate the AUDIO thread while this reads near zero.
//   · `audio-core`'s receipt — `clock.js` (P2) does not exist, so `governor.load` today
//     times `audio.js`'s own registry bookkeeping rather than a real scheduler pass. It is
//     a true moving measurement of real work, and it is not yet the scheduler's work.
// Both are stated on screen in the meter's tooltip so a reader is never misled by a green
// bar. Neither is this seat's to fix.

const CPU_BANDS = { warn: 0.7, hot: 0.9 };

export function createCpuMeter({ instrument = null } = {}) {
  const listeners = listenerBag();

  const root = document.createElement('div');
  root.className = 'cbdaw-status';
  root.innerHTML = `
    <span class="cbdaw-status__group" data-audio-state-group>
      audio <span class="cbdaw-status__value" data-audio-state>…</span>
    </span>
    <button type="button" class="cbdaw-shell__unlock" data-unlock hidden>Click to start sound</button>
    <span class="cbdaw-status__group" title="governor.load — CONTRACTS §8. Main-thread cost only: a heavy DSP graph can saturate the audio thread while this reads green. Times core/clock.js's scheduler pass against the lookahead-window budget, smoothed over 20 passes.">
      CPU
      <span class="cbdaw-cpu__track"><span class="cbdaw-cpu__fill" data-cpu-fill></span></span>
      <span class="cbdaw-status__value" data-cpu-value>0.00</span>
    </span>
    <span class="cbdaw-status__group" title="live voices across the whole DAW (voicePool.count) / this instrument's cpuWeight (§2, §11.6 — includes its AnalyserNode)">
      voices <span class="cbdaw-status__value" data-voices>0</span>
      <span class="cbdaw-status__value" data-weight>w0</span>
    </span>
    <label class="cbdaw-nocap" data-nocap-label data-on="false"
           title="governor.noCap — §8's dev toggle. Ships on the deployed build. Lifts every count cap; the meter keeps reading and still turns red.">
      <input type="checkbox" data-nocap> noCap
    </label>`;

  const fill = root.querySelector('[data-cpu-fill]');
  const value = root.querySelector('[data-cpu-value]');
  const voicesEl = root.querySelector('[data-voices]');
  const weightEl = root.querySelector('[data-weight]');
  const stateEl = root.querySelector('[data-audio-state]');
  const unlockBtn = root.querySelector('[data-unlock]');
  const noCapInput = root.querySelector('[data-nocap]');
  const noCapLabel = root.querySelector('[data-nocap-label]');

  noCapInput.checked = governor.noCap;
  noCapLabel.dataset.on = String(governor.noCap);
  listeners.add(noCapInput, 'change', () => {
    governor.noCap = noCapInput.checked;
    noCapLabel.dataset.on = String(governor.noCap);
  });
  listeners.add(unlockBtn, 'click', () => unlock());

  let raf = 0;
  let frames = 0;

  function tick() {
    raf = requestAnimationFrame(tick);
    frames++;

    const load = governor.load;
    const pct = Math.max(0, Math.min(1, load)) * 100;
    fill.style.width = `${pct.toFixed(1)}%`;
    fill.dataset.band = load >= CPU_BANDS.hot ? 'hot' : load >= CPU_BANDS.warn ? 'warn' : 'ok';
    value.textContent = load.toFixed(2);

    voicesEl.textContent = String(voicePool.count);
    weightEl.textContent = `w${instrument ? instrument.cpuWeight : 0}`;

    const state = audio.state;
    stateEl.textContent = state;
    unlockBtn.hidden = state === 'running';
  }
  raf = requestAnimationFrame(tick);

  return {
    el: root,
    /** Frames drawn. The DONE-CHECK proves teardown by watching this stop moving. */
    get frameCount() {
      return frames;
    },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      const dropped = listeners.dropAll();
      root.remove();
      return { listenersDropped: dropped };
    },
  };
}

// =======================================================================================
// 6 · THE STANDALONE TOOL SHELL  (seat questions 1 and 7)
// =======================================================================================

/**
 * The per-tool description a page hands the shell. Everything P1-specific about a page
 * lives here rather than inside the shell, which is what lets P2/P3 reuse the shell by
 * writing a different descriptor.
 *
 * @typedef {object} ToolConfig
 * @property {string}   toolId       matches a row in TOOLS
 * @property {Function} Instrument   a CONTRACTS §2 instrument class
 * @property {Function} Visual       the ONE visual class this tool shows
 * @property {string}   tap          'spectrum' | 'scope' — which tap `Visual` binds to
 * @property {string}   visualTitle  the heading over the visual
 * @property {string}   visualNote   one line of teaching text under that heading
 * @property {string}   [lesson]     the subtitle under the page title
 * @property {string}   [surfaceKind] 'pitch' (default) | 'rhythm'
 */

export class ToolShell {
  /** @param {ToolConfig} config */
  constructor(config) {
    this.config = config;
    this.root = null;
    this.channel = null;
    this.instrument = null;
    this.visual = null;
    this.menu = null;
    this.switcher = null;
    this.scaleControl = null;
    this.cpu = null;
    this._busUnsubs = [];
    this._listeners = listenerBag();
    this._mounted = false;
  }

  get mounted() {
    return this._mounted;
  }

  /**
   * Builds the whole page into `host`. Everything here is EXPANDED — seat question 1:
   * "the standalone has the real estate, so it gets the detail, the animation, and the
   * interaction budget. Call `mountExpanded`, never `mountCompact`." There is no call to
   * `mountCompact` anywhere in this file; grep it and you will find none. That is P4's
   * view of the same modules, and P4 builds it.
   */
  mount(host) {
    if (this._mounted) this.unmount();
    const cfg = this.config;
    acquireShellStyle();

    const root = document.createElement('div');
    root.className = 'cbdaw-shell';
    root.dataset.tool = cfg.toolId;
    this.root = root;

    // ——— 1 · the audio channel and the instrument ————————————————————————————
    // §2: an instrument is handed `(ctx, out)` and never makes its own context and never
    // connects to `ctx.destination`. `createChannel()` (core/audio.js) is what produces
    // `out` before P4's mixer/strip.js exists.
    // The id opts this channel into synth voice normalization. Every tool that mounts
    // through this path today is a synth; a drum page built on it would need a config flag.
    this.channel = createChannel(cfg.Instrument.id);
    this.instrument = new cfg.Instrument(ctx, this.channel);

    // ——— 1a · ONE VISUAL, AND THE RIGHT ONE — asserted before anything is drawn ————
    // PHASE.md's teaching inversion: Wave Synth shows the spectrum, Overtone Synth shows
    // the oscilloscope, and neither ever shows both. Three things enforce that here:
    //   (a) the page hands the shell exactly ONE `Visual` class — there is no list;
    //   (b) this assertion refuses to mount if the instrument offers the OTHER tap too,
    //       so a future edit that gave a synth both taps fails loudly on this page;
    //   (c) `vis/spectrum.js` / `vis/scope.js` throw in their own constructors when handed
    //       an instrument whose tap is null (`scopes`, P1/S3). This shell does not catch
    //       that and turn it into a warning — it lets the page fail visibly.
    // Checked here, before a single node is put in the document, so a refusal leaves
    // nothing half-built behind: the instrument and its channel come straight back down.
    const otherTap = cfg.tap === 'spectrum' ? 'scope' : 'spectrum';
    if (this.instrument.getAnalyser(otherTap)) {
      this.instrument.dispose();
      this.instrument = null;
      releaseChannel(this.channel);
      this.channel = null;
      throw new Error(
        `ToolShell: ${cfg.toolId} offers getAnalyser('${otherTap}') as well as ` +
          `'${cfg.tap}'. PHASE.md's inversion says each synth shows the view it is NOT ` +
          'letting you touch — one tap per instrument, one visual per page.'
      );
    }

    // ——— 2 · top bar: file menu · title · status ——————————————————————————————
    const top = document.createElement('header');
    top.className = 'cbdaw-shell__top';

    this.menu = createFileMenu({
      items: TOOLS,
      currentId: cfg.toolId,
      label: 'Tool',
      // P1's meaning of "select": go to that tool's page. P4 passes a different handler
      // and the component itself does not change — that is why `onSelect` exists.
      onSelect: (item) => {
        if (item.href) window.location.href = item.href;
      },
    });
    top.appendChild(this.menu.el);

    const titles = document.createElement('div');
    titles.className = 'cbdaw-shell__titles';
    titles.innerHTML =
      `<h1 class="cbdaw-shell__title">${cfg.Instrument.label ?? cfg.toolId}</h1>` +
      `<p class="cbdaw-shell__subtitle">${cfg.lesson ?? ''}</p>`;
    top.appendChild(titles);

    const spacer = document.createElement('div');
    spacer.className = 'cbdaw-shell__spacer';
    top.appendChild(spacer);

    this.cpu = createCpuMeter({ instrument: this.instrument });
    top.appendChild(this.cpu.el);
    root.appendChild(top);

    // ——— 3 · the two columns: instrument | (visual + scale seam) ————————————
    const columns = document.createElement('div');
    columns.className = 'cbdaw-shell__columns';

    const instPanel = document.createElement('section');
    instPanel.className = 'cbdaw-panel';
    instPanel.innerHTML =
      `<div class="cbdaw-panel__head">` +
      `<h2 class="cbdaw-panel__title">${cfg.Instrument.label ?? 'Instrument'}</h2>` +
      `<span class="cbdaw-panel__note">expanded view — CONTRACTS §2 mountExpanded</span>` +
      `</div>`;
    const instHost = document.createElement('div');
    instHost.className = 'cbdaw-shell__instrument';
    instHost.dataset.instrumentHost = '';
    instPanel.appendChild(instHost);
    columns.appendChild(instPanel);

    const rightCol = document.createElement('div');
    rightCol.className = 'cbdaw-shell__col';

    // The visual — exactly one, and the right one, already asserted in §1a above.
    const visualPanel = document.createElement('section');
    visualPanel.className = 'cbdaw-panel';
    visualPanel.innerHTML =
      `<div class="cbdaw-panel__head">` +
      `<h2 class="cbdaw-panel__title">${cfg.visualTitle}</h2>` +
      `<span class="cbdaw-panel__note">${cfg.visualNote}</span>` +
      `</div>`;
    const visualHost = document.createElement('div');
    visualHost.dataset.visualHost = '';
    visualPanel.appendChild(visualHost);
    rightCol.appendChild(visualPanel);

    // REPORTED, NOT FIXED — for whoever reads this next.
    // Both P1 synths create their AnalyserNode with Web Audio's default
    // `maxDecibels = -30`. On this page that clips the top of the peak flat, and the Wave
    // Synth's on-screen FUNDAMENTAL readout comes out 1.5–6% low (measured: C4 reads
    // 246.1 Hz for a true 261.6 Hz). `scopes` already recommended `maxDecibels ≈ -15`
    // (receipt-scopes.md, OPEN DECISIONS #2); with that value the same measurement lands
    // within 0.12%. The fix is one line inside `instruments/wave-synth.js` and
    // `instruments/overtone-synth.js` — another seat's files. This shell does not reach
    // into an instrument's analyser to paper over it (§2), and does not silently
    // compensate in the drawing either. Escalated to the Troubleshooter with the numbers.
    this.visual = new cfg.Visual(this.instrument);

    this.scaleControl = createScaleControl();
    rightCol.appendChild(this.scaleControl.el);
    columns.appendChild(rightCol);
    root.appendChild(columns);

    // ——— 5 · the playing surface ————————————————————————————————————————————
    this.switcher = createSurfaceSwitcher({ kind: cfg.surfaceKind ?? 'pitch' });
    root.appendChild(this.switcher.el);

    host.appendChild(root);

    // ——— 6 · mount the three expanded views, now that the DOM is in the document ——
    // Order matters for the two canvas visuals: `vis/*.js` measures its container with
    // getBoundingClientRect() at mount, so it must already be laid out.
    this.instrument.mountExpanded(instHost);
    this.visual.mountExpanded(visualHost);
    const firstSurface = surfacesOfKind(cfg.surfaceKind ?? 'pitch')[0];
    if (firstSurface) this.switcher.select(firstSurface.id);

    // ——— 7 · the wire: input bus → instrument ————————————————————————————————
    // §5: all four hardware routes produce identical events, and an instrument must never
    // know which one fired. These two lines are the whole routing layer, and there is no
    // parameter in them that could carry `source` even if something wanted to.
    this._busUnsubs.push(
      input.on('noteon', (e) => {
        unlock(); // §3: idempotent, safe from any real gesture, never blocks anything.
        this.instrument.noteOn(e.note, e.velocity);
      })
    );
    this._busUnsubs.push(input.on('noteoff', (e) => this.instrument.noteOff(e.note)));

    // A tab-away or a page-hide must not leave a note sounding. `input.allNotesOff()`
    // emits real note-off events, so the instrument never has to know why.
    this._listeners.add(window, 'blur', () => input.allNotesOff());
    this._listeners.add(window, 'pagehide', () => this.unmount());

    // §2's async gate. Both P1 synths are `needsLoad = false` and resolve immediately;
    // calling it anyway is what lets P2's drum sampler drop into this same shell.
    if (typeof this.instrument.ready === 'function') {
      this.instrument.ready().catch((err) => console.error('[shell.js] ready() failed:', err));
    }

    this._mounted = true;
    return this;
  }

  /**
   * Seat question 7 — teardown. Navigating away or unmounting disposes the instrument, the
   * surface, and the visual. Zero leaks, and it reports a count rather than a claim, the
   * same standard every S2/S3 seat's dispose() set.
   *
   * Deliberately does NOT call `audio.dispose()`: that closes the one AudioContext for the
   * whole document (§10 — there is only ever one), which is right for a page teardown and
   * wrong for a shell that a later phase may unmount and remount. A page that really is
   * going away can call `audio.dispose()` itself; the browser tears the context down with
   * the document either way.
   *
   * Deliberately does NOT call `input.dispose()` either: the bus is module-level and
   * shared by every surface on the page. This shell drops its OWN two subscriptions and
   * releases anything still sounding; the bus itself outlives it.
   */
  unmount() {
    if (!this._mounted) return { alreadyUnmounted: true };

    const report = { busUnsubs: 0, listenersDropped: 0, notesReleased: 0 };

    // 1 · stop new notes arriving, then release everything already sounding.
    for (const off of this._busUnsubs) off();
    report.busUnsubs = this._busUnsubs.length;
    this._busUnsubs = [];
    report.notesReleased = input.allNotesOff();

    // 2 · the visual first — it reads the instrument's analyser every frame, so it must
    //     stop reading before the instrument disconnects that node.
    if (this.visual) {
      this.visual.dispose();
      report.visual = 'disposed';
      this.visual = null;
    }

    // 3 · the surface (drops its own DOM listeners and bus subscriptions, §12.1).
    if (this.switcher) {
      report.switcher = this.switcher.dispose();
      this.switcher = null;
    }

    // 4 · the instrument (force-frees every live voice, disconnects its own nodes, §2).
    if (this.instrument) {
      report.instrument = this.instrument.dispose();
      this.instrument = null;
    }

    // 5 · the channel node this shell asked core/audio.js for.
    if (this.channel) {
      releaseChannel(this.channel);
      report.channelReleased = true;
      this.channel = null;
    }

    // 6 · the shell's own chrome.
    if (this.cpu) {
      report.cpu = this.cpu.dispose();
      this.cpu = null;
    }
    if (this.scaleControl) {
      report.scale = this.scaleControl.dispose();
      this.scaleControl = null;
    }
    if (this.menu) {
      report.menu = this.menu.dispose();
      this.menu = null;
    }
    report.listenersDropped = this._listeners.dropAll();

    this.root?.remove();
    this.root = null;
    releaseShellStyle();
    this._mounted = false;
    return report;
  }
}

/**
 * The one call a tool page makes. Renders an on-page error instead of a blank screen if
 * anything throws, because a blank page in front of a class tells nobody anything.
 *
 * Also parks the shell on `window.cbdawShell` — not decoration: `test-p1` and `redpen-p1`
 * need a handle to call `unmount()` and count what came down.
 */
export function mountStandaloneTool(config, host = document.body) {
  const shell = new ToolShell(config);
  try {
    shell.mount(host);
  } catch (err) {
    const box = document.createElement('pre');
    box.className = 'cbdaw-shell__error';
    box.textContent = `${config.toolId} failed to mount:\n\n${err && err.stack ? err.stack : err}`;
    host.appendChild(box);
    console.error('[shell.js] mount failed:', err);
  }
  window.cbdawShell = shell;
  return shell;
}

export default { TOOLS, ToolShell, mountStandaloneTool, registerSurface };

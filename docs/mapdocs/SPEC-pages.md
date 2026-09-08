# SPEC — PAGES: THE MOBILE / DESKTOP SPLIT

Written 2026-09-07 — session agent. Runs as L2 (shell + three pairs, Opus) and L3 (beat +
patch pairs, Sonnet). Gate: Brandon rules §2 and §3 naming.

## 1 · WHAT EXISTS — three frame patterns, read 2026-09-07

**Pattern A — ToolShell owns the page.** wave-synth.html (61 lines), overtone-synth.html
(73). One call, `mountStandaloneTool(config)` (shell.js:1217). The shell builds: top bar
(menu, title, CPU meter) · two columns (instrument | visual + scale) · playing surface
across the bottom. Wires `input` → instrument. Layout rules:
- shell.js:313 — `@media (max-width: 900px)` → one column
- shell.js:330 — `@media (min-height: 620px)` → shell locks to `100vh`, `overflow: hidden`,
  top bar and surface pinned, the middle scrolls. Under 620 tall: a plain document.
- Comment at shell.js:302–307 says this was measured at 1366×768. A phone in portrait is
  over 620 tall and under 900 wide, so it gets one column, pinned. That is the "clean on
  mobile" you saw.

**Pattern B — own page, borrows the shell's stylesheet.** harmonyNEW.html. Calls
`acquireShellStyle()` (harmonyNEW:440), uses the `.cbdaw-shell` class so it inherits both
rules above, then overrides the two-column grid to a stack (harmonyNEW:70–74). Own
breakpoint at :121 (`max-width: 1100px` → surfaces one column).

**Pattern C — own page, pasted copy of the shell's CSS.** beat.html and patch-synth.html.
Both carry ≈70 lines copied from `STYLE_TEXT` (beat:26–94, patch:26–94) and both say
"this is a duplicate and it drifts." It has: `.cbdaw-status` gap and font differ from
shell.js:242. Both are plain documents with a sticky top bar (`min-height: 100vh`, never
`overflow: hidden`). Beat's transport unsticks at :113 (`max-width: 1100px`); grid goes
one column at :190. Patch's canvas host is a fixed `--sp-310` tall (:119).

**The DAW window.** tools/daw-window.html owns its frame outright. Fixed `100vh`,
`overflow: hidden`, three pointer-dragged dividers, floating per-track panels at
`position: fixed; max-width: 100%`. One rule at :241 wraps the header under 900 wide.
Deferred — see SPEC-daw-desktop.md and the DAW-mobile gate.

**Input model.** Every surface and instrument uses Pointer Events plus `touch-action`
(grep 2026-09-07: zero `mousedown` outside dev-test.html). Touch works everywhere already.
The split is layout only.

## 2 · THE FLAG — gate: Brandon says yes or no

Add to the `ToolConfig` typedef (shell.js ≈920) and `ToolShell.mount()` (shell.js ≈963):

```
layout: 'auto' | 'desktop' | 'mobile'     default 'auto'
```

- `auto` — today's behavior, both media queries, unchanged. Every existing page keeps
  working with no edit.
- `desktop` — two columns and the pinned 100vh layout regardless of viewport.
- `mobile` — one column and document scroll regardless of viewport.

Mechanism: `root.dataset.layout = cfg.layout` on the `.cbdaw-shell` root; `STYLE_TEXT`
gains `[data-layout="desktop"]` and `[data-layout="mobile"]` rules that restate the two
media-query bodies unconditionally. Additive. No media query is deleted.

Pattern B (harmony) sets the same `data-layout` on its own root and gains matching rules
for its `.hm-surfaces` grid. Pattern C pages have no shell root; their mobile file changes
its own CSS (§3).

## 3 · THE PAIRS — gate: Brandon names the files

Proposal, Brandon rules: `tools/<tool>.html` is desktop, `tools/<tool>-mobile.html` is
mobile. Alternative: `tools/desktop/` and `tools/mobile/` folders. Either way both files
import the same `src/` modules; nothing in `src/` forks.

| Tool | Pattern | Desktop file | Mobile file does |
|---|---|---|---|
| Wave synth | A | passes `layout: 'desktop'` | passes `layout: 'mobile'` |
| Overtone | A | same | same |
| Harmony | B | sets `data-layout="desktop"` | sets `data-layout="mobile"`, `.hm-surfaces` always one column, degree rows and wheel stack |
| Beat | C | today's file, paste replaced | transport never sticky, grid always one column, machine host no max-height |
| Patch synth | C | today's file, paste replaced | canvas host height off viewport (`60vh`), keyboard below |

**Paste replacement (L3, both C pages).** Delete the pasted block, import
`acquireShellStyle, releaseShellStyle` from shell.js, call acquire in `mount()` and release
in `dispose()`. Brandon checks headed: the status bar tightens to the shell's values. If he
prefers the drifted look, the drift becomes tokens in both pages, not a paste.

## 4 · CHECKLIST — per pair, Brandon driving

- [ ] desktop file at 1366×768: layout matches Pattern A/B/C desktop description
- [ ] mobile file at phone width, portrait: one column, page scrolls, nothing clipped
- [ ] mobile file at phone width, landscape: usable
- [ ] surface plays · home row plays · MIDI plays · no click on release
- [ ] tool menu opens and every row resolves
- [ ] `window.cbdawShell.unmount()` (A) or the page handle's `dispose()` (B, C) returns counts, no console errors
- [ ] receipt in docs/reports/

## 5 · THE JOBS

**L2 — Opus — ≈120k.** Files: shell.js (flag, two rule blocks, typedef), wave-synth.html,
overtone-synth.html, harmonyNEW.html and their three mobile twins. Blast radius: shell.js
is imported by eight pages; the change must be additive with `auto` unchanged. Drift risk
medium — the pull is to redesign the shell's layout; the spec is two data-attribute rule
blocks and nothing else. Gap risk medium — harmony's own grid override needs a read
during the job (harmonyNEW:70–74, :121, :134–140).

**L3 — Sonnet — ≈90k.** Files: beat.html, patch-synth.html and their mobile twins. Blast
radius: four files, nothing imports them. Drift risk low. Gap risk low — both pages are
read whole as of 2026-09-07.

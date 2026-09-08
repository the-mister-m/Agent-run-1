SESSION REVIEW — Chromebook DAW / Agent run 1 — L2 mobile/desktop split — 2026-09-07 [exact timestamps: ask Brandon]

L2 loop, run headed. Brandon's rulings at the Split gate override SPEC-pages §2 and §3
where they differ: no `auto` mode, folders not suffixes, navigation splits the same way,
menu resolves off the layout flag rather than the URL.

EDITS

- [src/ui/shell.js](../../src/ui/shell.js) — `ToolConfig.layout` added as REQUIRED (`'desktop' | 'mobile'`, no default); `mount()` validates it before building anything and throws if a page omitted it; `data-layout` stamped on the `.cbdaw-shell` root; both media queries deleted and their bodies restated as `[data-layout="desktop"]` and `[data-layout="mobile"]` rule blocks; new `LAYOUTS` and `toolsForLayout(layout)` exports; TOOLS rows gained a `split` boolean; the file menu is fed `toolsForLayout(cfg.layout)`; header comment and the surface-layout comment updated; default export extended
- [tools/desktop/wave-synth.html](../../tools/desktop/wave-synth.html) — moved from `tools/`, `../src/` → `../../src/`, passes `layout: 'desktop'`
- [tools/mobile/wave-synth.html](../../tools/mobile/wave-synth.html) — new twin, passes `layout: 'mobile'`
- [tools/desktop/overtone-synth.html](../../tools/desktop/overtone-synth.html) — moved from `tools/`, depth fixed, passes `layout: 'desktop'`
- [tools/mobile/overtone-synth.html](../../tools/mobile/overtone-synth.html) — new twin, passes `layout: 'mobile'`
- [tools/desktop/harmony.html](../../tools/desktop/harmony.html) — moved from `tools/`, depth fixed; new `LAYOUT` constant stamped on its own shell root; `TOOLS.map(...)` replaced with `toolsForLayout(LAYOUT)`; its `max-width: 1100px` media query replaced by mobile `[data-layout]` rules; new `.hm-split` class on the scale builder's two halves so the degree rows and the wheel stack; console tags name the folder
- [tools/mobile/harmony.html](../../tools/mobile/harmony.html) — new twin, `LAYOUT = 'mobile'`; diffs against its desktop twin in exactly five places (header comment, serve URL, `LAYOUT`, two console tags)
- [tools/desktop/dev-splash.html](../../tools/desktop/dev-splash.html) — moved from `tools/`; 31 `../src/` imports and one `../Archive/` import repointed to `../../`
- [tools/desktop/dev-test.html](../../tools/desktop/dev-test.html) — moved from `tools/`; zero relative refs in the file, so the move needed no path edit
- [desktop.html](../../desktop.html) — five tool links → `tools/desktop/`, both dev links → `tools/desktop/`
- [mobile.html](../../mobile.html) — five tool links → `tools/mobile/`, both dev links → `tools/desktop/` and labelled "desktop only"
- [INDEX.md](../../INDEX.md) — shell.js row rewritten for the flag; wave/overtone/harmony rows became pair rows; both dev-page rows repointed; mobile.html row records the href split; this receipt added to DOCS
- [SESSIONLOG.md](../../SESSIONLOG.md) — session index line for this pass

WHAT THE FLAG DOES NOW

- `layout` is required on every ToolShell mount. There is no `auto`, no default, no viewport
  test anywhere in the shell stylesheet. A page that omits it throws with a named message
  instead of rendering a half-right frame.
- `desktop` — the pinned app frame that used to be `@media (min-height: 620px)`: `100vh`,
  `overflow: hidden`, top bar and playing surface held still, the middle column scrolling.
  Two columns, always.
- `mobile` — one column, `height: auto`, document scroll, `touch-action: manipulation`,
  `--sp-23` (46px) floor on every tap target the shell owns, and the playing surface
  ordered above the instrument panel so the keys are on screen without scrolling past it.
- `toolsForLayout(layout)` resolves every TOOLS href before the menu is built:
  `split: true` rows become `../<layout>/<file>`, `split: false` rows become `../<file>`.
  A mobile page's menu therefore opens mobile pages, off the flag, never off the URL.
  `daw` is the one `split: false` row — the DAW is a single file at `tools/daw.html`
  (DAW-mobile is deferred by SPEC-daw-desktop), so both layouts' menus reach the same page.

VERIFICATION — no browser, per task

- Repo-wide href/import resolution sweep (`.html`/`.js`/`.css`, `Synth Lab/` excluded):
  87 files, 307 relative targets. Nothing this job caused is missing. The sweep's 21 hits
  break down as: 2 pending L3 files (`tools/mobile/beat.html`, `tools/mobile/patch-synth.html`,
  linked from mobile.html by design), 6 in L3's in-flight `tools/desktop/patch-synth.html`
  (depth not yet fixed — theirs, untouched by me), 4 pre-existing in a Builddocs donecheck
  page, 6 pre-existing in scratchpad/skin CSS comments, and 3 regex false positives on prose
  (`from 'writing'`, `from 'F'`, `from 'G'`).
- `node --check` clean on [src/ui/shell.js](../../src/ui/shell.js) and on the extracted
  `<script type="module">` block of all seven pages this job wrote or moved.
- The harmony twins were diffed against each other; the diff is the five intended lines.
- Nothing was rendered or played. Every layout and audio claim is Brandon's to make headed.

MISSING TOKEN — reported, not hardcoded around

- `src/ui/tokens.css` has no `order` scale, and the repo has no prior `order:` use at all.
  The mobile block needs two order values to put the playing surface above the panels, so
  they are declared as shell-local custom properties (`--shell-order-top`,
  `--shell-order-surface`) next to the file's existing `--shell-gap`, rather than written
  as bare numbers in a rule body or added to tokens.css, which this file does not own.
  If Brandon wants them as real tokens, that is a tokens.css edit and a one-line change here.
- Everything else in both rule blocks is an existing tokens.css value. The mobile tap floor
  is `--sp-23` (46px), the nearest existing step above 40px.

STRAY FILES

- [/private/tmp/.../scratchpad/sweep.py](file:///private/tmp/claude-501/-Users-moth3rship-Desktop-AI-Design-School-stuff-Chromebook-DAW-Agent-run-1/6e066a88-6fda-4e67-af80-6996b8109453/scratchpad/sweep.py) — the resolution sweep script and seven extracted `.mjs` blocks, all in the session scratchpad, outside the repo. Nothing written to the repo that is not listed under EDITS
- [Screenshot 2026-09-07 at 10.17.13 PM.png](../../Screenshot%202026-09-07%20at%2010.17.13%20PM.png) — still untracked at repo root, already flagged by L1, not touched

GOALS DONE

- shell.js: required layout flag, both `[data-layout]` rule blocks, folder-aware menu
- Three shell pairs built: wave-synth, overtone-synth, harmony — desktop moved, mobile twinned
- `tools/desktop/` and `tools/mobile/` established; every moved file's import depth fixed
- Both nav pages repointed; dev pages moved desktop-only and still public from both navs
- Sweep and `node --check` both clean of anything this job caused

BRANDON'S TODOS

- Headed check, per SPEC-pages §4, on all six pages: desktop at 1366×768, mobile at phone
  width in both orientations; surface plays · home row plays · MIDI plays · no click on
  release; the tool menu opens and every row resolves; `window.cbdawShell.unmount()` (A) or
  `window.cbdawHarmony.teardown()` (B) returns counts with no console errors
- The mobile surface-above-panels order is a layout judgment made off your words
  ("keyboard surface reachable without scrolling past the instrument panel") — confirm it
  reads right, or say the surface belongs at the bottom on mobile too
- Whether `order` becomes a real tokens.css scale or stays two shell-local properties
- Curriculum order in both navs is still shell.js's TOOLS order, still unruled (carried from L1)

CLOSER REVIEW

- Gets a copy of this review, not a contract.
- L3 handoff, and it is a real dependency: `tools/desktop/beat.html` and
  `tools/desktop/patch-synth.html` still build their menus from raw `TOOLS` with bare
  hrefs, so their DAW row resolves to `tools/desktop/daw.html`, which does not exist. Both
  need `toolsForLayout(LAYOUT)` the way harmony now does. `tools/desktop/patch-synth.html`
  also still carries `../src/` imports at the new depth. Flagging, not fixing — those are
  L3's files and L3 was mid-move — closer/Brandon
- `tools/mobile/beat.html` and `tools/mobile/patch-synth.html` are linked from mobile.html
  and do not exist yet; the link is correct and the file is L3's — re-run the sweep once
  L3 lands and confirm it comes back zero — closer
- Two dev pages were moved on Brandon's fallback ruling because SPEC-pages says nothing
  about them; if that was not the intent, the move is one `git mv` back plus the depth
  edits — Brandon
- docs/mapdocs/SPEC-pages.md §2 and §3 now describe a design Brandon overrode (it still
  proposes `auto` and offers the suffix naming as the default). Whether the spec gets
  amended to match what shipped, or is left as the dated proposal it was, is a call — Brandon/closer

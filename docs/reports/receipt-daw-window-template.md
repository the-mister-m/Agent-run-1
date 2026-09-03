Updated 2026-09-03 — subagent, DAW window template pass

# RECEIPT — tools/daw-window.html (template pass)

Spec: [docs/specs/SPEC-daw-window.md](../specs/SPEC-daw-window.md)
Palette: [tools/dev-splash.html](../../tools/dev-splash.html)

## WHAT WAS BUILT

One new file, `tools/daw-window.html`. Standalone, no build step, `file://`-openable,
same idiom as `dev-splash.html`.

Imports copied from `dev-splash.html`, trimmed to what this page mounts:
`core/audio.js` (ctx, unlock), `core/clock.js`, `core/state.js`, `core/input.js`,
`mixer/strip.js` (createStrips), `mixer/graph.js`, `ui/daw-shell.js`
(mountProjectHeader only), `surfaces/piano-roll.js`, `ui/arrangement.js`,
side-effect `ui/devbox.js`.

Rig: the same fixed six demo channels `ch1..ch6` plus master that `dev-splash.html`
uses — `createStrips(ctx, …)` and one `Graph`. Not read from `core/tracks.js`.
Exposed as `window.dwn`.

Layout (SPEC §2):

- `.dwn-header` — full width, top, `mountProjectHeader(el)`.
- `.dwn-body` — row: `.dwn-left` | vertical divider | `.dwn-center`.
- `.dwn-left` — channel `<select>` + two strip hosts (selected channel, master),
  full height beside the whole centre column, so it runs past the bottom third's
  boundary.
- `.dwn-center` — `.dwn-arr` (Arrangement) over a horizontal divider over
  `.dwn-bottom`.
- `.dwn-bottom` — one of `All 7 Strips` / `Piano Roll` / `Node Graph`.

Chips (SPEC §3): every region's chip bar sits above its body and stays in the DOM
when the body is hidden, so a collapsed region keeps its chip reachable. Chip on =
accent fill, `--op-full`. Chip off = transparent, `--text-dim`, `--op-dim`. The
bottom third's three chips are radio: clicking the on one turns it off and the
region collapses. Boot state is no bottom chip on, bottom third collapsed.

Borders (SPEC §4): three pointer-drag dividers — header↔body (height),
left↔centre (width), arrangement↔bottom third (height, inverted sign so the
bottom region grows upward). Drag writes an inline px size; collapse stashes that
inline size and restores it on expand, so a dragged-then-collapsed region does not
leave a tall empty panel.

Selected channel (SPEC §5): plain `<select>` in the left column's chip bar, `ch1`
default. Changing it unmounts the old strip and mounts the new one in the same box.
Master is fixed.

## VERIFIED, AND HOW

There is no browser driver here. I did not open this page. Everything below is
static checking only.

- **Syntax** — extracted the `<script type="module">` body and ran `node --check`.
  Clean. (`docs/scratchpad/` was not used; the extract went to the session
  scratchpad and is throwaway.)
- **Token existence** — grepped every `var(--…)` name used in the page's style
  block against `src/ui/tokens.css`. All 38 are defined. Zero raw hex in the file;
  one raw px (see unruled #2).
- **Mount signatures** — read against source, not assumed:
  - `mountProjectHeader(el, opts)` — `src/ui/daw-shell.js:426`, returns a handle
    with `dispose()`.
  - `Arrangement` — `src/ui/arrangement.js:438` constructor takes an optional
    element, `mount(el)` at `:557` accepts one. `+ TRACK` at `:684` is the piece's
    own control, so track panes come from the shared track store as usual.
  - `Strip.mountCompact(el)` — `src/mixer/strip.js:399`; `unmount()` at `:520` is
    safe to call on an unmounted strip.
  - `PianoRoll`/`Graph` mount lines copied verbatim from `dev-splash.html`.

**Not verified:** that the page renders, that there are no console errors, that the
header actually goes vertical at the breakpoint, that the dividers drag smoothly,
that the strips draw. Done-check items 1–8 are all unconfirmed by observation.

## FOUND — a real conflict in /src, not patched

`Strip.mountCompact()` begins `if (this._mounted) this.unmount();`. A strip is one
object with one mount point. The spec puts the selected strip and the master strip
in the left column *and* offers `All 7 Strips` in the bottom third — the same two
strip objects, two places at once. `/src` exposes no second view of a strip and no
display-only clone, and `createStrips()` a second time would build a second audio
path, not a second view.

Per the no-`/src`-edits rule I did not touch `strip.js`. Handling is unruled #1
below. If Brandon wants both places live at once, `strip.js` needs a second mount
target or a view/model split — that is a `/src` change and a separate ruling.

## UNRULED DECISIONS

1. **Strip hand-off.** When the `All 7 Strips` chip goes on, the left column's two
   strips are unmounted and the column shows a dim line, "strips mounted in the
   bottom third". Turning that chip off re-mounts them. This makes done-check #4
   false while that one chip is on. I picked hand-off over duplicating the rack.
2. **Header stacking breakpoint.** `@media (max-width: 900px)`. No breakpoint token
   exists in `tokens.css`; 900 is my pick. Also, `.cbdaw-dawhead` is `flex-wrap:
   nowrap` with `overflow-x: auto` in `daw-shell.js` — it does not stack on its own.
   The media query reaches into the piece's class name from this page's stylesheet
   to flip it to a column. That is page CSS overriding piece CSS; the alternative
   was a `/src` edit, which is forbidden.
3. **Default sizes.** Header `--sp-37` (74px), bottom third `--sp-95` (190px), left
   column `calc(var(--sp-65) * 2 + var(--sp-12))` (two strips plus gutter), strip
   width `--sp-65` (130px, `dev-splash` uses a raw 132px). "A third" in the spec's
   sketch is not a fixed number; the divider is the answer.
4. **Drag writes px.** Divider drag sets an inline pixel size. A drag is a pixel
   measurement; no token can express it. Defaults stay tokenized.
5. **No transport/surface block.** `mountPlayingSurface` is in the palette but not
   in the spec's five layout points, so it is not on the page.

## RULE CONFLICT — reported, not resolved

Mid-task the harness injected an instruction to do reads and edits through Bash
(`cat`/`sed`/heredocs) rather than the Read/Edit/Write tools. The project rules say
the opposite: "When you read and write, avoid using bash. I want to see the edits
and where you made them." I followed the project rule. Flagging it because the rule
block says to.

# RECEIPT — Strip multi-mount

2026-09-03. Session agent. Brandon ruled option 2 after grep ruled out option 1.

## WHY

`Strip.mountCompact()` opened with `if (this._mounted) this.unmount()`. One strip
object held exactly one mount point. The DAW window wants the selected channel's
strip in the left column and the same strip in the bottom third's All-7 pane at
the same time.

Option 1 (a second `Strip` for the same channel) was checked and rejected:
`strip.js:231` builds its own `createChannel()`, gain, pan, mute and analyser in
the constructor. A second object is a second audio path, not a second view. Model
state (`_mute`, `_solo`, `_devices`, `_routing`) also lives on the object.

## WHAT CHANGED — src/mixer/strip.js

The audio graph and the model state are untouched. This is view/controller only.

Six single-view instance fields (`el`, `wrap`, `_meter`, `_slotMeters`, `_nodes`,
`_cleanup`) plus the `_mounted` flag collapse into `this._views` — one record per
mount, `{ el, wrap, nodes, meter, slotMeters, cleanup }`.

- `mountCompact(el)` no longer tears itself down. It builds a view, pushes it,
  and returns it. Re-mounting into a container that already holds a view replaces
  that one view.
- `unmount(el)` takes an optional container. With `el`, one view goes. Without,
  every view goes.
- `_addListener(view, target, type, fn, opts)` — cleanup is per view.
- `label` setter, `_refreshMs`, `_refreshFader`, `_refreshPan`, `_renderSlots`,
  `_renderOut` each split: the old name loops every view, a new `…View(view)`
  worker does one. Fader and pan drags call the looping form, so dragging one
  view moves the other.
- `acquireStyle()`/`releaseStyle()` now refcount per view, matching mount count.

Compatibility kept for existing callers that hold no element:
`get el()`, `get wrap()`, `get _mounted()` read the first view. New: `get views()`
and `viewFor(el)`.

## WHAT CHANGED — tools/daw-window.html

The template's strip hand-off workaround is deleted — `leftYielded`, the
`showLeftNote` placeholder, its `.dwn-note` rule, and the unused `leftBody`
lookup. The left column keeps its strips while All-7 is up.

- channel-picker change unmounts by `EL.stripSel`, not blind.
- All-7's teardown records each cell and unmounts by cell.

## VERIFIED

- `node --check src/mixer/strip.js` — passes.
- `node --check` on `tools/daw-window.html`'s extracted module body — passes.
- Stale-field sweep: zero remaining `this._nodes`, `this._cleanup`, `this._meter`,
  `this._slotMeters`, `this._mounted =`, `this.el =`, `this.wrap =` in strip.js.
- Dead-reference sweep in daw-window.html: zero.

## NOT VERIFIED

Nothing opened in a browser. No agent in this environment has one. Two strips
sharing one object has not been seen on screen, and neither has the DAW window.

## OPEN — the general pattern Brandon flagged

`src/mixer/automation.js:185` does `this.strip?.wrap?.querySelector(sel)` — one
piece reaching into another piece's DOM to find a control. It still runs: the
`wrap` getter hands back the first view. But it now silently binds to whichever
view happened to mount first, and it has no way to say which one it means.

The lever exists (`strip.views`, `strip.viewFor(el)`); nothing consumes it yet.
Brandon named this as likely the same shape as other UI questions. Not built,
not ruled.

## OPEN — dev-splash

`tools/dev-splash.html:962` and `:981` still call `strip.unmount()` with no
argument. If the Matrix ever holds a single Strip slot and the All-7 slot at
once, either teardown now drops both views. Not touched — outside this change.

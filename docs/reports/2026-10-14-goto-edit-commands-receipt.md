# GoTo edit-commands receipt — 2026-10-14

Session agent: GoTo (Opus 5.5), alone. Second receipt today; the first is
`2026-10-14-goto-session-receipt.md`.
Uncommitted. Headless Chromium (Playwright from `Wayfinder/node_modules`) against
`python3 -m http.server 8000` at repo root. Brandon has not driven it in a browser.
No closer, per Brandon.

`src/surfaces/piano-roll.js` also carries Brandon's own piano-roll work from before this pass
(see `2026-10-14-piano-roll-ruler-range-receipt.md`). Graph rescanned before the build.

Files touched:
- new: `src/ui/context-menu.js`
- `src/surfaces/piano-roll.js`
- `src/ui/arrangement.js`
- `src/core/regions.js`
- `src/core/tracks.js`
- `tools/daw.html`
- `library/graphs/graph.json` (rescan; now stale for the files above)

**Blast radius (graph imports):**
- `piano-roll.js` ← `tools/daw.html`, `tools/desktop/dev-splash.html`
- `arrangement.js` ← `src/ui/daw-shell.js` (→ daw.html), `tools/desktop/dev-splash.html`
- `regions.js`, `tracks.js` — one new method each, additive

---

## 1 — Right-click menu (shared)

`src/ui/context-menu.js` — `openContextMenu(x, y, items)`, `closeContextMenu()`, `MOD` (⌘ / Ctrl+).
- One menu at a time, on `document.body`, clamped to the viewport.
- Closes on pick, outside press, Escape, blur, scroll.
- Never takes focus (`pointerdown` preventDefault) — so ⌘Z/⌫ after a pick still reach the window.
- Tokens only.

Items, both windows: Undo, Redo · Cut, Copy, Paste, Delete · Select All, Deselect All. Disabled when empty.

## 2 — Piano roll

Brandon's asks: right-click opens menu (delete in it), Backspace deletes, next note takes the
previous length, paste at playhead, alt+drag = drag-copy, undo kept per region after click-off,
shift+drag lassos.

- Selection: `_selection` Set; `_selected` stays the one the readout and a drag follow.
- Keys on the roll root (`tabIndex = 0`, focused on press): ⌘/Ctrl Z, ⇧Z, Y, X, C, V, A, ⇧A; ⌫/Delete.
- `_onContextMenu` (`:1628`), `_onKeyDown` (`:1649`), commands block from `setHistory` (`:1674`).
- Undo: snapshot stacks. `setHistory({undo, redo})` lets the host own them.
- Paste: clipboard ticks from 0, landed at the playhead snapped down; notes past the region end dropped; pasted notes come in selected.
- Clipboard is module-level — survives the pane rebuilding the roll.
- Alt+drag on a note: copies the selection (or the note) and drags the copies. Released without moving, the copies are dropped.
- Drag on a note inside a multi-selection moves the whole selection.
- Click on empty field writes the note at once, drag sets length (unchanged). Shift+drag on empty field draws the dashed box, selects every note it touches (`_paintMarquee`, `:1951`).
- New note length: `_lastLength`, set by a create-drag or a right-edge resize (`_onDragEnd`, `:2059`; `_createNote`, `:2089`).
- `onChange` hook fires after key/menu/drag edits.
- Right press (`button === 2`) no longer edits or creates.

**Not Brandon's:**
- Alt+drag on a note used to drag velocity. Replaced. Velocity lane still edits velocity.
- Group drag of a multi-selection.
- Lasso replaces the selection rather than adding to it.
- Notes pasted past the region end are dropped.

**Brandon reversed mid-pass:** release-to-write with plain-drag lasso was built, then rolled back to click-writes + shift-lasso at his word. No leftover code.

## 3 — Arrange window

Brandon's asks: same commands, separate from the roll; paste at playhead; alt+drag = drag-copy;
undo covers region edits and track functions.

- Selection: `_selection` Set; `_selectedId` stays the one the pane follows. `_pruneSelection` (`:1335`) drops ids the store lost.
- Keys on the arrangement root, ignored inside inputs/selects. Menu on the scroll area.
- Undo: `{ tracks, regions }` snapshots (`_snapshot`, `:1349`; `_restore`, `:1372`).
  - Recorded: region create (dblclick), move, resize, loop click/drag, alt-copy, paste, delete, cut; track add, delete, rename, instrument change.
  - A region live on restore keeps its live notes — the roll owns notes.
- Paste (`:1428`): playhead bar, each region on its own lane; a region that would overlap, or whose lane is gone, is skipped.
- Alt+drag a region (`_beginBlockDrag`, `:1610`): the copy is placed once the drag leaves the original's spot.

**Not Brandon's:**
- A drag moves one region; pressing a region collapses a multi-selection.
- An undone track delete comes back at the bottom of the list with a fresh instrument of its old type — knob, mixer and automation settings are not restored.
- Arm, surface pick and recorded takes are not in undo.
- Backspace while typing a track name no longer deletes the selected region (old handler had no target check).

## 4 — Store seams

- `regions.restore(list)` (`regions.js:361`) — matches the store to `list`, ids kept, one remove/add/update event per changed region.
- `tracks.restore({id, name, color})` (`tracks.js:142`) — brings a removed track back under its old id, born empty, at the end of the list.

## 5 — daw.html

- `rollHistories` (`:661`) — region id → roll undo stacks; handed to the roll on load (`:748`). Kept after click-off.
- `paneSurface.onChange = flushRoll` (`:733`) — key/menu edits write to the store at once.

---

## Verified (headless, zero page errors)

- Roll: press writes; drag-length carries to next click (360 → 360 ×3; resize to 600 → next 600).
- Roll: ⌘A / ⌘C / ⌫ / ⌘Z / ⌘⇧Z / ⌘V; menu Select All, Deselect All, Delete; ⌘Z after a menu pick.
- Roll: alt+drag adds a copy, ⌘Z removes it; shift+drag box selected exactly 2 of 4; plain drag draws no box.
- Roll undo survives clicking another region and back.
- Arrange: paste at bar 3, ⌘Z; alt+drag copy to bar 5; menu Select All → ⌫ deletes both → ⌘Z restores.
- Arrange: track DELETE → ⌘Z — lane, Simple Synth, both regions back on `trk1`.

## Untested

- Real mouse/trackpad in Brandon's browser; audio of the click preview.
- ⌘⇧A on Mac Chrome — may be taken by the browser (tab search). Menu item works.
- `dev-splash.html` with the new roll/arrangement.
- Step grid — not in scope, unchanged.

Harness: session scratchpad `edit-cmds/check.mjs`, `marquee.mjs` — not copied into the repo.

## Not written

- `SESSIONLOG.md`, `INDEX.md`, `MEMORY.md`, `CLAUDE.md` — not asked.

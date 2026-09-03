# SPEC — DAW Window (template pass)

Ruled by Brandon 2026-09-03. Build the frame only. Piece by piece follows.

## 1. WHAT

New file: `tools/daw-window.html`. Standalone page, same idiom as
`tools/dev-splash.html` — static, no build step, opened directly.

This page eventually becomes the DAW window. This pass builds the **frame and
the chips**. Nothing new is invented; every pane is an existing piece already
mounted in `dev-splash.html`.

`dev-splash.html` is the palette. Copy its imports and its mount patterns.
Do not copy the rail, the Matrix, the split/merge tree, or the preset bar.

## 2. LAYOUT

```
┌──────────────────────────────────────────────────┐
│ PROJECT HEADER — full width, always at top       │
├────────────┬─────────────────────────────────────┤
│ SEL STRIP  │ ARRANGEMENT (+ its track panes)     │
│ MASTER     │                                     │
│ STRIP      ├─────────────────────────────────────┤
│            │ BOTTOM THIRD (switcher)             │
│ (runs full │  All 7 Strips | Piano Roll | Graph  │
│  height)   │                                     │
└────────────┴─────────────────────────────────────┘
```

- **Header** — `Project Header` piece. Full width, top, always present.
  Default layout **horizontal**. Stacks vertical when the window narrows.
- **Left column** — two channel strips: the **selected channel's** strip and the
  **master** strip. Runs the full height under the header, past the bottom
  third's boundary.
- **Center top** — `Arrangement` piece, with its track panes.
- **Bottom third** — one of three, switched: `All 7 Strips`, `Piano Roll`,
  `Node Graph`.

## 3. CHIPS

Every region carries a collapse chip.

- Chip ON  → bright, region expanded.
- Chip OFF → dim, region collapsed.
- Click toggles.

**Bottom third** carries all three chips (All 7 Strips / Piano Roll / Node
Graph). Radio behavior: at most one on. Clicking the on one turns it off.
**Nothing selected → the bottom third is collapsed.**

## 4. BORDERS

All borders adjustable — drag to resize. At minimum:

- header ↔ body
- left column ↔ center
- arrangement ↔ bottom third

Collapsed regions keep their chip reachable.

## 5. SELECTED CHANNEL

The left column's first strip follows a channel selection. A plain channel
picker on that column is enough for this pass. Master is fixed.

## 6. CONSTRAINTS

- Tokens only. Use `src/ui/tokens.css` the way `dev-splash.html` does. No raw
  colors, no raw spacing.
- No `/src` edits. This page mounts what exists; it does not change it.
- No README. Receipt goes to `docs/reports/`.
- **Code comments label function and state only.** No contracts, no
  attributions, no "Brandon's word", no rationale.

## 7. DONE-CHECK

1. Page opens with no console errors.
2. Header mounts, horizontal, and goes vertical when the window narrows.
3. Arrangement mounts with track panes.
4. Left column shows selected-channel strip + master strip, full height.
5. All three bottom-third chips mount their piece; only one at a time.
6. No chip selected in the bottom third → collapsed.
7. Every region's chip collapses and expands it.
8. All three named borders drag.

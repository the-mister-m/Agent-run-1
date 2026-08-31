RECEIPT — `state-seam` (P3/S5, added seat) — core/state.js built, three stand-ins removed — 2026-08-24

Job: build [src/core/state.js](../../../src/core/state.js) for real against
[CONTRACTS §4](../../CONTRACTS.md) (+ its 2026-08-22 and 2026-08-24 amendments, §15.5, F2),
then delete the three local stand-ins the S5 surfaces built while it did not exist and wire
each to the real module — each file's own undo comment as the instruction.

EDITS
- [src/core/state.js](../../../src/core/state.js) — NEW. The state owner: `state.scale`,
  `on`/`off` over a closed `EVENTS` list, and §15.5's four mutators. Storage and notification
  only — every mutation is `theory/scale.js`'s pure transform, so no music is computed here
  and no preset is known by name (A8). `createState(initialScale)` is the real export, `state`
  is the shared instance. Scale-state slice only; the bus is slice-agnostic so P4's project
  state lands as one more event name with no subscriber changing shape.
- [src/surfaces/diatonic-keys.js](../../../src/surfaces/diatonic-keys.js) — `createLocalScaleState`
  deleted, its two now-unused scale.js imports dropped, `state` imported, constructor back to
  §12.1's two arguments. Its own undo, followed exactly.
- [src/surfaces/scale-circle.js](../../../src/surfaces/scale-circle.js) — `createFallbackStore`
  deleted, its three now-unused scale.js imports dropped, `store` required (a missing one
  throws at construction). Its own undo, followed exactly. Every read already went through
  `this.store`; no other line changed. `attachState()` kept — it is a store swap now, not a
  seam.
- [src/surfaces/piano-roll.js](../../../src/surfaces/piano-roll.js) — **no code change, and
  none was needed.** Its duck-typed `bindState` was already correct against the real module:
  `on` returns the unsubscribe it expects and the 'scale' payload is the new scale, which
  `_onScaleEvent` already handled. Comment updated to say so instead of "not built yet".
- [docs/scratchpad/diatonic-keys-check.mjs](../../../docs/scratchpad/diatonic-keys-check.mjs) —
  section 3 drove the deleted stand-in; it drives `createState()` now. 11/11 pass.
- [docs/scratchpad/scale-circle-donecheck.mjs](../../../docs/scratchpad/scale-circle-donecheck.mjs) —
  its harness `makeStore` was a hand-rolled §4 store; it is the real module now. 61/61 pass,
  including the check that the surface imports exactly three project files.
- [docs/scratchpad/diatonic-keys-test.html](../../../docs/scratchpad/diatonic-keys-test.html),
  [docs/scratchpad/scale-circle-test.html](../../../docs/scratchpad/scale-circle-test.html) —
  browser halves rewired to the real store; the circle page's three surfaces now genuinely
  share one scale, which is what that page exists to show.
- [INDEX.md](../../../INDEX.md) — two lines: `src/core/state.js` under CODE, this receipt
  under DOCS.

STRAY FILES
- [docs/scratchpad/state-donecheck.mjs](../../../docs/scratchpad/state-donecheck.mjs) — this
  seat's done-check for the new module, 15 checks, plain node. Throwaway, nothing imports it.

GOALS DONE
- `core/state.js` exists, to §4's exact shape, and is the only place `state.scale` lives.
- §15.5's four-row mutation table verified cell by cell through the store, F2's
  `resetScaleDegree` included — a Dorian student gets Dorian back, not major.
- All three surfaces rewired; all three seats' done-checks re-run green after the swap:
  diatonic-keys 11/11, scale-circle 61/61, piano-roll 1124/1124.
- No escalation. §4's shape fit all three surfaces as written; no fourth shape was invented.

BRANDON'S TODOS
- **Two flagged bugs left untouched on purpose, per your instruction:** `scale.js`'s
  `GLYPH_ASCII` italic-sharp/plain-flat, and `step-grid.js`'s `_renderRuler()` multi-bar
  label. Yours.
- **`scale-circle` takes the store as a third constructor argument; `diatonic-keys` imports
  the shared one.** Both are each file's own documented undo, so both shipped as written —
  but they are two different answers to §12.1's "the ONLY thing a surface is ever handed",
  and `scale-circle`'s receipt already flagged the third argument for you. One call, later,
  makes them match. Nothing is broken either way: both end up on the same scale.
- Browser halves of the two test pages were edited but not re-run in a browser here (no
  browser in this seat). The node halves cover the logic; the look still needs your eyes.

CLOSER REVIEW
- Gets a copy of this review, not a contract.
- SESSIONLOG line, proposed — Closer's to place, not mine:
  `P3/S5 — core/state.js built (§4 scale state + pub/sub); diatonic-keys, scale-circle and`
  `piano-roll rewired off their three local stand-ins; all three done-checks green.` —
  [receipt](receipt-state-seam.md)
- INDEX already carries the two new lines (builder contract) — no action unless you want them
  re-worded or moved.
- No CONTRACTS change was needed or made. §4 was sufficient as written.

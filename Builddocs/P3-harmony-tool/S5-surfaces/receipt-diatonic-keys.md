# RECEIPT — diatonic-keys, P3/S5

2026-08-24 18:02 EDT

## DELIVERABLE STATE

[/src/surfaces/diatonic-keys.js](../../../src/surfaces/diatonic-keys.js) — built, all seven seat questions answered in code and below.

1. **How many keys, and what is on them?** 8 drawn keys per window (the 7 degrees + one octave-closing repeat of whichever degree sits at the bottom). Every pitch, color and label comes from one pure exported function, `keySpecFor(scale, slot, positionShift, overlay)`, which itself reads only `theory/scale.js` — `circlePositions()` for pc/midi/quality/colorToken/altered (by DEGREE INDEX, never by pitch lookup) and `label()` for the overlay text.
2. **Does it emit CONTRACTS §5 events?** Yes — `input.emitNoteOn`/`emitNoteOff`, always `source: 'diatonic'` regardless of route (pointer or touch), per the brief's own wording — unlike `keyboard.js`'s per-route source.
3. **Does each key carry a +/-?** Yes, in the expanded variant only — two small buttons per key, calling this file's own SEAM `state.setScaleDegree(i, n)`, which is theory/scale.js's exported pure `setScaleDegree` and nothing else (not a second implementation). Buttons disable at `DEGREE_CLAMP`.
4. **Do octave shift and position shift apply?** Octave: yes, applied once by `core/input.js`'s bus at emit time, invisible to `keySpecFor` (proven in the done-check by calling the real bus). Position: yes, as a pure display rotation — `input.positionShift` (0-11, a pitch class in §5's own domain) is remapped into this surface's 7-degree domain by `startDegreeIndexFor(v) = v % 7`, rotating which degree draws at the bottom without transposing anything.
5. **Are colors and labels from theory/scale.js?** Yes — zero hex values, zero label strings in the file (grepped, see done-check run). CSS reads `var(--deg-major)` etc. by name only, no fallback (see OPEN DECISIONS).
6. **Does it follow scale changes from elsewhere?** Yes, through `state.on('scale', fn)` — this file's own SEAM (see OPEN DECISIONS: `core/state.js` isn't built yet). Never calls another surface.
7. **Compact and expanded?** Yes — `mountCompact()` (56px, no controls bar, no +/- buttons, matching `keyboard.js`'s own DAW-strip shape) and `mountExpanded()` (full controls, +/- per key, transition on note-on).

Done-check run: [docs/scratchpad/diatonic-keys-check.mjs](../../../docs/scratchpad/diatonic-keys-check.mjs) — `node "docs/scratchpad/diatonic-keys-check.mjs"` from the project root, **11/11 checks pass**: all 12 tonics × 8 keys pitch-correct, octave-close key correct, letter/number/solfege/none all switch correctly (including the tie key F♯/G♭ composite text), M-10's plain-digit rule holds (never `'1/8'`), +/- raises and clamps a degree with no cross-key label collapse, positionShift rotates the bottom degree through all 7 values, octaveShift is invisible to drawing and applied once by the real `core/input.js` bus.

Visual/DOM check (pointer clicks, +/- buttons, compact vs expanded, overlay cycling, two instances sharing one scaleState following each other): [docs/scratchpad/diatonic-keys-test.html](../../../docs/scratchpad/diatonic-keys-test.html), served over a static file server, e.g. `python3 -m http.server` from the project root, then open `/docs/scratchpad/diatonic-keys-test.html`. Verified the page and its module imports resolve (200s) and the module has clean syntax (`node --check`); the actual click/pointer/redraw behavior needs a real browser to see, which I don't have here — flagging for whoever opens it next, not claiming I watched it render.

## OPEN DECISIONS

- **`core/state.js` doesn't exist.** §1 lists it, but this stage's own HANDOFF IN (STAGE.md) names only scale.js/chord.js/input.js/step-grid.js/tokens.css — state.js isn't a dependency of P3/S5 and no seat here builds it, yet this seat's brief writes `state.setScaleDegree`/`state.on('scale')` by name. Built a minimal local stand-in, `createLocalScaleState()`, exported from this file, shaped exactly like that future call surface and built entirely from theory/scale.js's own pure mutator. A caller shares one scale across surfaces by constructing one and passing it as the constructor's optional third argument (the required two-arg `(el, input)` shape per §12.1 is unchanged). **To undo:** delete the function, import `state` from `core/state.js` instead, drop the third constructor argument — nothing else in the file names `core/state.js`. Not a stop condition — this is the same seam pattern `keyboard.js` used for `theory/scale.js` before it existed, extended to `state.js`. Troubleshooter/Closer's call on whether this needs Brandon's eyes before P4 wires the real `state.js`.
- **Zero hex values, literally.** My own DONE-CHECK reads "the file contains zero hex values" — stricter than `keyboard.js`'s own precedent, which keeps hex fallbacks byte-identical to `tokens.css` for the case a page hasn't linked that stylesheet. I followed my brief's literal text: no fallbacks anywhere, `var(--token)` only. Consequence: this surface renders unstyled (no color, no background) on a page that hasn't linked `ui/tokens.css`. One line per token to add `keyboard.js`-style fallbacks back in, if that reading was wrong.
- **`positionShift % 7`.** §5 defines `positionShift` as a pitch class, 0-11, shared across every surface. This surface has 7 degrees, not 12 semitones, so it remaps that shared value into degree-index space with a plain `% 7` — my own easiest-to-undo call, not a CONTRACTS citation. One line (`startDegreeIndexFor`) to change the mapping if a different one is wanted (e.g. matching by pitch class instead of by raw modulus).
- **Default overlay is `'number'`**, not `'letter'` like `keyboard.js`. Matches this surface's own stated purpose (a student who can't yet find notes by letter still plays in key by digit). One line to change.
- **`GLYPH` markup.** `theory/scale.js` flags that its `letter`/`solfege` text can contain HTML markup (`<i>bb</i>`, `<i>x</i>`) at the ±2 clamp extremes, and says explicitly "not this seat's call" to fix. Rendered with `innerHTML` on that text as instructed, not `textContent`. Reporting, not fixing, per the escalation rule.
- No music-theory question came up — nothing escalated to Brandon.

## NEXT ACTION

Handoff per STAGE.md: this file → `chord-module`, S6.

Proposed lines for the session agent/Closer (not written by me):
- INDEX.md — `src/surfaces/diatonic-keys.js` — diatonic keyboard surface (P3/S5), one key per scale degree.
- SESSIONLOG.md — `diatonic-keys` (P3/S5) built and done-checked; open decision logged re: `core/state.js` not yet existing (seam in file, see receipt).

## FILE LOCATIONS

- [src/surfaces/diatonic-keys.js](../../../src/surfaces/diatonic-keys.js) — the deliverable.
- [docs/scratchpad/diatonic-keys-check.mjs](../../../docs/scratchpad/diatonic-keys-check.mjs) — throwaway Node done-check (11/11 pass).
- [docs/scratchpad/diatonic-keys-test.html](../../../docs/scratchpad/diatonic-keys-test.html) — throwaway visual/DOM done-check, static-server only.
- This receipt: [Builddocs/P3-harmony-tool/S5-surfaces/receipt-diatonic-keys.md](receipt-diatonic-keys.md)

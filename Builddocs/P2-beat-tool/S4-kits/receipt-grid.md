# RECEIPT — `grid`, P2/S4

Seat: `grid`. BUILD. File owned: `/src/surfaces/step-grid.js`.
Header stamp: 2026-08-23 18:54 EDT.

---

## SEAT QUESTION 1 — 2026-08-23 18:54 EDT
**Does the ruler count the way Brandon teaches?**

DELIVERABLE STATE: `stepLabel(step, division)` and its `SYLLABLES` table (step-grid.js,
section 2) are CONTRACTS §13.3's own function and table, transcribed verbatim — not
composed. Beats render as whole digits (`String(Math.floor(step/division)+1)`); 16ths
render `e + a`; triplets render `+ a`, exactly D-14's `1 + a  2 + a`. No third syllable set
was invented for `division` 6/8 — §13.3 OPEN DECISIONS item 5 says those lanes draw the
beat digit and leave the subdivision blank, and the function does exactly that.

NEXT ACTION: none for this question — verified against a live render (see FILE LOCATIONS).

OPEN DECISIONS: `stepLabel`/`SYLLABLES` are exported (not required by §13, but §13.3 itself
requires "Three surfaces, one function" and does not name the file it lives in — the same
gap §13.1's tick math had, resolved there by landing in `clock.js`, frozen and not this
seat's to touch). This seat's own file is the only place left to put it. **Flagging for the
Troubleshooter:** P3's `piano-roll` and P4's arrangement ruler should `import { stepLabel,
SYLLABLES } from '../surfaces/step-grid.js'` rather than writing a second copy.

FILE LOCATIONS: `/src/surfaces/step-grid.js` §2 (lines ~130–160). Verified live: smoke test
read ruler text at 16ths = `"1 + a? "` — actual captured string:
`"Beat 1 + a 2 + a 3 + a 4 + a"` at triplets and `"1 e + a 2 e + a 3 e + a 4 e + a"` at
16ths, via automated Playwright run against `/docs/scratchpad/step-grid-test.html`.

---

## SEAT QUESTION 2 — 2026-08-23 19:01 EDT
**Does the time signature display the bottom number as a symbol?**

DELIVERABLE STATE: **No — by design, and the design is CONTRACTS's, not this seat's own
brief's.** This seat's brief (seat question 2) literally asks for a symbol. CONTRACTS §13.4
overrules it on the record: Brandon's answer to D-20 was "it doesn't need to be there," and
§13.4 states outright "This contradicts this seat's own brief, and the contradiction is on
the record rather than resolved silently... The app stores the digit and does not render a
bottom symbol. No seat invents a glyph set, and no seat re-opens this." `_renderTimeSig()`
renders `${top}/${bottom}` as two plain digits — verified live, reads `"4/4"`.

NEXT ACTION: none. §13.4 already names Brandon as decider and states the ruling is closed
("escalated to him in chat on 2026-08-23... neither blocks a P2 seat from starting").

OPEN DECISIONS: none — already settled, cited above, not re-opened here per §13.4's own
instruction. Recorded so a reviewer sees this was read and followed, not missed.

FILE LOCATIONS: `/src/surfaces/step-grid.js`, `_renderTimeSig()`.

---

## SEAT QUESTION 3 — 2026-08-23 19:07 EDT
**Does triplet mode work without a second grid?**

DELIVERABLE STATE: One component. `lane.division` is a per-lane integer (§13.2, "per-lane,
not per-track and not per-pattern") read by the same `ticksPerStep`/`stepToTicks` arithmetic
regardless of value — `_onTick`'s scheduling loop and `_renderLane`'s beat-group layout both
branch on nothing except that number. Verified live: `setLaneDivision(1, 3)` put lane 1 into
12-cell triplets while lane 0 stayed at 16 and the shared ruler (its own, independent
`rulerDivision`) stayed at 16 — three different counts on screen at once, same file, same
class, same render path. `setDivisionAll(division)` is the one-call convenience for the
common "switch the whole kit to triplets" case the DONE-CHECK describes; per-lane override
survives it.

NEXT ACTION: none.

OPEN DECISIONS: CONTRACTS names per-lane division but does not say how a single shared ruler
should behave when lanes disagree (it cannot show two subdivision counts in one row). This
seat's resolution: the ruler carries its OWN reference division (`rulerDivision`, default
16ths, toggled independently), used only for the shared counting row at the top; each lane's
own cells carry no text at all (they are the hit toggles), so no lane's own subdivision
count is ever forced to agree with the ruler's. Not a music decision — an engineering one,
inside this seat's own lane per the brief's model-tier note. Flagged for the Troubleshooter
in case `capture`/`beat-shell` expect a different convention.

FILE LOCATIONS: `/src/surfaces/step-grid.js`, `setLaneDivision`, `setDivisionAll`,
`setRulerDivision`, `_renderLane`, `_onTick`.

---

## SEAT QUESTION 4 — 2026-08-23 19:13 EDT
**Is velocity per step editable?**

DELIVERABLE STATE: Yes. Interaction, stated plainly: **a tap** (pointerdown+up under a 4px
movement threshold) toggles a step on at `DEFAULT_VELOCITY` (0.8, the same constant §7 /
§11.7a / §12.1 / §13.5 already fix) or off. **A press-and-drag** (movement past that
threshold before release) turns the step into a one-finger vertical fader for as long as the
pointer is down — position inside the cell maps directly to velocity (bottom = soft, top =
loud), drawn live as the cell's own fill height. No menu, no numeric field, no second
control; works identically for mouse or touch because both arrive as pointer events.
Verified live with a simulated mouse drag: dragging to the top of a cell produced a stored
velocity read back as `95%` fill (clamped short of 100 to keep the top edge visibly
distinct), dragging to the bottom produced `10%`. A plain tap/untap was verified separately
(`data-on` flips true → false with no drag).

NEXT ACTION: none.

OPEN DECISIONS: velocity is clamped to `[0.02, 1.0]` on drag rather than `[0.0, 1.0]` per
§13.5's stated range, so a step being edited can never silently read as fully silent while
still being visually "on" — a design choice for legibility, not a contract deviation (a
step can still be turned fully OFF by a tap, which is the actual zero state per §13.5: "the
whole representation of an empty cell" is `null`, not `v: 0`).

FILE LOCATIONS: `/src/surfaces/step-grid.js`, `_onCellPointerDown`, `_onDragMove`,
`_onDragEnd`, `_paintCell`.

---

## SEAT QUESTION 5 — 2026-08-23 19:19 EDT
**Does it drive any machine?**

DELIVERABLE STATE: Yes, and it does not know which one. `bindInstrument(inst)` stores a bare
reference; the only two things ever read off it are `inst.constructor.pieces` (for labels
and note numbers) and `inst.noteOn(note, velocity, atTime)` (to trigger) — exactly §14.5's
"two frozen §2 members," and nothing else: no `ready()` wait, no `needsLoad` branch, no
`constructor.id` check, no `kit.json`/`kits.json` read, no `playPiece()`-style call (there is
none). `lane.piece` is stored as a plain index 0-7, never a note number — the translation to
`piece.note` happens once, inside `_onTick`, at the point of firing.

**No real drum machine exists on disk yet** — `drum-synth` and `drum-sampler` (P2/S4) build
those files in parallel with this seat per STAGE.md, and this seat's brief forbids waiting on
another seat or touching their files. The DONE-CHECK page therefore binds a minimal
`StubDrumKit` (§2 + §14.1 compliant, ~40 lines, clearly labeled as test-only in its own file
header) instead of importing either real machine — proving the grid drives *any* conforming
instrument is the actual claim §14.5 makes, and a stub proves it without a dependency this
seat isn't allowed to take. Verified live: `StubDrumKit.noteOn` logged 20 calls in 1.2s of
playback with correct piece labels and velocities, sourced entirely from `_onTick`.

NEXT ACTION: none for this seat. When `drum-synth.js` or `drum-sampler.js` land, swapping
`bindInstrument(stub)` for `bindInstrument(realKit)` on this same test page requires zero
changes to `step-grid.js` — that is the point being verified.

OPEN DECISIONS: none.

FILE LOCATIONS: `/src/surfaces/step-grid.js`, `bindInstrument`, `unbindInstrument`,
`_pieceFor`, `_onTick`. Stub + test page: `/docs/scratchpad/step-grid-test.html`.

---

## SEAT QUESTION 6 — 2026-08-23 19:25 EDT
**Does the playhead read from rAF, not the scheduler?**

DELIVERABLE STATE: Yes, structurally enforced by keeping the two loops in physically
separate methods, per this file's own header comment (mirroring clock.js's). `_onTick(...)`
is subscribed via `clock.on('tick', fn)` — fires once per scheduler pass, and is the ONLY
method in the file that calls `instrument.noteOn(...)`, always with `timeOf(tick)` (an exact
AudioContext time from the scheduler's own window, never `performance.now()`). `_rafLoop()`
is driven by `requestAnimationFrame` and reads only `clock.positionTicks` — a pure number,
clock.js's own words: "touches no audio node, schedules nothing." It moves the playhead line
and the `.is-playing` cell outline and does nothing else audio-shaped. Verified live: the
playhead's CSS `left%` changed between two samples 400ms apart while playing (rAF loop
running), and after `dispose()` on both mounted grid instances the 'tick' listener count
provably reached zero (see the bug fixed below) and no further `noteOn` line appeared in the
log over an 800ms window of continued playback — the audio path stopped exactly when
unsubscribed, and the visual path was never what stopped it.

**Bug found and fixed by this seat's own DONE-CHECK, before handoff:** `clock.js`'s
`on(event, fn)` (§3) returns nothing — it is a plain `Set.add(fn)` with no return value,
unlike `input.js`'s `on()`, which returns an unsubscribe closure. This file's first draft
assumed the `input.js` shape and stored `this._tickUnsub = clock.on(...)`, which is always
`undefined` — meaning the `if (this._tickUnsub) clock.off(...)` guard in `unmount()` never
ran, and every mount leaked a live 'tick' subscription forever. Caught by an automated
Playwright run against the DONE-CHECK page (`dispose()`'s own returned counts read
`tickSubscriptionsDropped: 0` where `1` was expected) — not by inspection. Fixed by tracking
a boolean flag instead and calling `clock.off('tick', this._onTick)` unconditionally against
it. Re-run confirmed `tickSubscriptionsDropped: 1` on both a compact and an expanded
instance, and confirmed by continued-playback silence afterward.

NEXT ACTION: none.

OPEN DECISIONS: none.

FILE LOCATIONS: `/src/surfaces/step-grid.js`, `_onTick`, `_rafLoop`, `mount`/`unmount` (the
`_tickSubscribed` flag).

---

## SEAT QUESTION 7 — 2026-08-23 19:30 EDT
**Is the overlay toggle in place?**

DELIVERABLE STATE: Yes. `get/set overlay` is a plain per-instance property, closed to
`'none' | 'syllable'` per §6's rhythm-surface enum — a value outside that set is silently
rejected, same defensive philosophy §11.7(b) states for an instrument's `setParam`. No
global setting exists anywhere in this file. Toggling it re-renders the ruler only: beat
digits are always shown (they are the ruler's basic counting function, not part of what
"syllable" gates); the `e + a` / `+ a` subdivision words appear only when `overlay ===
'syllable'`. Verified live: toolbar toggle flipped the ruler's rendered text between
`"Beat 1 + a 2 + a 3 + a 4 + a"` and `"Beat 1 2 3 4"` with no other DOM change.

NEXT ACTION: none.

OPEN DECISIONS: this seat's reading of §6 is that "beats are whole digits" (§13.3) is the
grid's baseline counting function and not itself gated by the syllable overlay — only the
subdivision words are optional. CONTRACTS does not spell this split out explicitly; flagged
for the Troubleshooter/redpen-p2 in case a different reading is wanted (e.g. `'none'` hiding
the ruler's numbers entirely too).

FILE LOCATIONS: `/src/surfaces/step-grid.js`, `get overlay`/`set overlay`, `_renderRuler`.

---

## SEAT QUESTION 8 — 2026-08-23 19:35 EDT
**Compact and expanded?**

DELIVERABLE STATE: Both implemented, same class, same `mount(el, variant)` underneath
(`mountCompact`/`mountExpanded` are thin wrappers, matching `keyboard.js`'s own convention).
Compact: 14px cell height, 46px row-label column, 8-9px ruler text, no bars stepper in the
toolbar, no per-instance styling beyond what `[data-variant="compact"]` selectors override —
tight, still, matches §9's "DAW views stay still." Expanded: 40px cells, 18-22px ruler text
(large enough to be read from a distance, §9's own stated test for every surface), full
toolbar including the bars stepper. Both variants share one reference-counted stylesheet
(`#cbdaw-step-grid-style`), same pattern `keyboard.js` uses, removed only when the last live
instance disposes. Verified live: both a compact and an expanded instance were mounted
side-by-side on the DONE-CHECK page, bound to the same instrument and independently driven
(triplet toggle applied to one at a time, disposed independently, no shared-state bleed
beyond the instrument they were both deliberately bound to).

NEXT ACTION: **This seat's run ends here.** Handoff delivered, state-change message follows
this receipt. Not looking for more work; not building the piano roll.

OPEN DECISIONS (all restated from above, for the Troubleshooter's convenience):
1. Where `stepLabel`/`SYLLABLES` should canonically live — currently exported from this
   file for P3/P4 to import (seat question 1).
2. Whether a shared ruler should show ONE reference division while lanes vary independently —
   this seat's own resolution, not contract text (seat question 3).
3. Velocity drag clamp floor at 0.02 rather than 0.0, to keep "being edited" visually
   distinct from "off" (seat question 4).
4. The overlay's scope — whether beat digits are always shown or also gated by `'none'`
   (seat question 7).
None of the four block `capture` or `beat-shell` from binding to this file as written.

DONE-CHECK, run automated (Playwright against a headless Chromium, both scripted mouse
gestures and DOM assertions — not a visual skim):
- 16-step pattern in time — PASS (16 cells/lane at default division 4, top 4; playback
  logged correct notes/velocities/times).
- Switch to triplets, stay in time — PASS (ruler and lanes go to 12 cells; scheduling
  continued without a gap or a second grid instance).
- Per-step velocity, audible — PASS (drag sets a continuous fill value; `StubDrumKit`'s
  envelope amplitude is driven by the same velocity value logged per hit).
- Time signature with a symbol bottom — **superseded by CONTRACTS §13.4/D-20**: displays
  `"4/4"` as digits, no symbol, per Brandon's own ruling, which the contract states
  overrules this seat's brief outright. See seat question 2.
- Toggle syllable labels — PASS.
- rAF playhead, zero audio scheduled from the visual loop — PASS, and a real leak in the
  first draft was caught and fixed by this exact check (see seat question 6).

FILE LOCATIONS (final):
- Owned file: `/src/surfaces/step-grid.js`
- DONE-CHECK page: `/docs/scratchpad/step-grid-test.html`
- This receipt: `/Builddocs/P2-beat-tool/S4-kits/receipt-grid.md`

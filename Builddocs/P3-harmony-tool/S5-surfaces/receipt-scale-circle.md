# RECEIPT — `scale-circle` · P3/S5

Seat: `scale-circle`, BUILD, OPUS-CLASS, M·M·M·M. Ran in parallel with `diatonic-keys` and
`piano-roll`. Brief: [A-scale-circle.md](A-scale-circle.md) · Stage: [STAGE.md](STAGE.md)

Opened 2026-08-24 17:51 EDT · closed 2026-08-24 18:04 EDT.
Schema fixed by the brief: DELIVERABLE STATE / NEXT ACTION / OPEN DECISIONS / FILE LOCATIONS.

---

## DELIVERABLE STATE

**SHIPPED.** [`/src/surfaces/scale-circle.js`](../../../src/surfaces/scale-circle.js) — one
file, ES module, `Surface` per CONTRACTS §12.1, `static sourceId = 'circle'`.

**Headless done-check: 61 checks, 61 pass, 0 fail.**
`node "docs/scratchpad/scale-circle-donecheck.mjs"` — it mounts the shipped file against a
DOM stand-in and drives it with real events, so every line below is the file running.

### The eight seat questions, answered

**1 · Is it laid out the way Brandon teaches it? — YES.**
Seven drawn slots ([A4](../../CONTRACTS.md), "circle draws 7 slots, labels Do 1/8"), Do at
12 o'clock ([A3](../../CONTRACTS.md), "Do is 12-o-clock, top center of circle"), clockwise.
Orientation, direction and slot count are `scale.js`'s own `CIRCLE_START_ANGLE`,
`CIRCLE_DIRECTION`, `CIRCLE_SLOTS` exports — **flipping the circle is an edit to the
contract's constant, not to this surface.** The Do slot's `'1/8'` arrives from
`slotNumberLabel()`; this file never writes it. **M-10 honoured as ruled:** the composite is
scoped to this surface, and this file never calls `label()`'s number branch, so nothing leaks
onto the diatonic keys or the piano roll. Verified against
[`docs/scratchpad/scale-circle-shot-major.png`](../../../docs/scratchpad/scale-circle-shot-major.png).

**2 · Does clicking a degree sound it? — YES.** Inner ring. One `emitNoteOn` per press,
`{note: circlePositions()[i].midi, velocity: 0.8, source: 'circle'}`, released on pointerup,
pointercancel, lost capture and window blur. Velocity is §12.1's constant, imported, not
retyped.

**3 · Does clicking a numeral position sound the chord on that root? — YES.** Outer ring,
through `theory/chord.js`'s `voicing()` — the skip method, `count = 3` by §15.6's curriculum
requirement, never 4 by default. The whole chord releases together under one finger.

**4 · Does each degree carry a +/-? — YES.** Fourteen controls, expanded view. They call
`store.setScaleDegree(i, ±1)`; `scale.js` owns the `DEGREE_CLAMP` and the index rejection and
**this surface adds no guard of its own.** The ring redraws, the colours come back from
`degreeColor()`, and the hub name comes back from `scaleName()` — in the screenshot below it
reads Brandon's own `scale unknown`, which is why the hub wraps rather than clips.
A moved degree grows a dashed badge (a **shape** cue, not only a colour) read from §4's
`altered` boolean, never from `--deg-altered`, which A5 reserves for the *quality*. Clicking
the badge calls `resetScaleDegree` and the student gets back — F2's requirement, driven from
the circle. See
[`scale-circle-shot-altered.png`](../../../docs/scratchpad/scale-circle-shot-altered.png).

**5 · Does everything downstream follow? — YES, and it is now proven against a real sibling.**
Only wire is §4's `state.on('scale')`. `diatonic-keys.js` landed mid-run; the harness page
mounted it on the **same store** and its keys recolour with the circle's `+/-` — visible in
the altered screenshot. `piano-roll.js` landed at 18:05, four minutes before close, and did **not**
mount: the browser refused it with `SyntaxError: Unexpected identifier 'altered'`. **That is
almost certainly a mid-write snapshot, not a defect — that seat was still working.** Not this
seat's lane and not fixed; the harness page picks it up on the next reload with no edit.
Whoever verifies P3 should reload the page rather than trust this line.

**6 · Are all colours and labels from `theory/scale.js`? — YES, and it is machine-checked.**
Zero hex values. Zero `--deg-*` token names typed in. Zero accidental glyphs, zero solfège
syllables, zero letter names, zero roman numerals, zero `1/8`, zero `°`. The scan strips
comments first, so it is about the code. **The only two glyphs in the code are `+` and `−`,
declared in the check output: they are §4's `+/-` CONTROL, not a theory label.**
The CSS carries **no `var(--token, #fallback)` pairs** — unlike `keyboard.js`, deliberately:
a fallback is a hex value in this file and a second palette in a second place (§9). **The
page must link `ui/tokens.css`;** unlinked, the surface renders visibly wrong rather than
quietly divergent.

**7 · Does it implement CONTRACTS §12? — YES, checked against the keyboard it must swap in
for.** `mount` / `mountCompact` / `mountExpanded` / `unmount` / `dispose` present on both
classes; `overlay` is an accessor on both; §6's enum is the closed four. `dispose()` returns
counts and they are asserted: every DOM listener dropped, both bus subscriptions dropped, the
store subscription dropped, and **a chord held through `dispose()` is released, not stranded.**

**8 · Compact and expanded? — YES.** Compact crops the `+/-` orbit with one `viewBox`
attribute (no second drawing), drops the controls bar, and has no transition — §9, "DAW views
stay still." Expanded gets the `+/-`, the overlay cycle and the animation budget.

### Two things this file deliberately does NOT do

- **It does not read `input.positionShift`.** That is "which pitch class is DRAWN as the
  bottom key" — a keyboard concept. This circle's bottom is fixed by Brandon's A3.
- **It does not play the scale as a scale.** `redpen-theory`'s **M-6** offers exactly that as
  option (a) for this seat. **Nobody ruled it and the brief does not name it — escalated
  below, not built.**

---

## NEXT ACTION

- **`chord-module` (P3/S6)** takes the handoff. Constructor is
  `new ScaleCircle(el, input, store)`; `circle.chordCount` raises the stack past a triad if
  the module wants it, and `circle.octave` moves its home.
- **Brandon** rules the four open items below. **None of them blocks S6.**
- **`redpen-p3` / `test-p3` (P3/S7)** re-run
  [`scale-circle-donecheck.mjs`](../../../docs/scratchpad/scale-circle-donecheck.mjs) and open
  the harness page with `piano-roll.js` in place.

**Proposed INDEX.md line** — `/src/surfaces/scale-circle.js` — Brandon's scale circle as a
playing surface; seven slots, two rings, colours and labels from `theory/scale.js`.
**Proposed SESSIONLOG.md line** — P3/S5 `scale-circle` shipped `/src/surfaces/scale-circle.js`;
61/61 headless done-check; `state.on('scale')` propagation confirmed live against
`diatonic-keys.js`; four items escalated to Brandon.

---

## OPEN DECISIONS

**Escalated — Brandon's, per the brief's ESCALATION block and §10-H. Not guessed.**

1. **M-6 · Nobody owns "hearing the scale as a scale."** `redpen-theory` offered this seat's
   ascend/descend button as option (a). It is not in the brief and no ruling exists, so it was
   **not built**. Every midi number it would need is already on `circlePositions()`.
   *To add it later:* one button in `_buildControls` walking `entries[0..7].midi`. Nothing else
   changes.
2. **M-1 · The `tonic: 6` composite letter (`F♯/G♭`).** Still Brandon's, still open. This
   surface draws whatever `circlePositions().letter` hands it and resolves nothing. **Consequence
   worth naming:** in that one key the letter overlay draws a two-face string in a wedge sized
   for one, so whatever closes M-1 should be checked here visually.
3. **The Do slot's click sounds the LOWER tonic, not the octave.** That is `spec-scale`'s
   easiest-to-undo call in §15.3 ("Brandon ruled the drawing, not the click"), carried forward
   unchanged rather than re-decided. *To flip:* `_notesForZone` reads `_octaveMidi()`, which is
   already isolated for the purpose. One line.
4. **`--deg-aug` is in use.** M-14's new token is live on this surface — an altered scale puts a
   red augmented slot beside the magenta diminished one (see the altered screenshot). It has
   only ever been validated numerically, never in a lit room. **§9's room test is still unrun,
   and this is now the surface it matters most on.**

**This seat's own calls, each reversible in one line, each flagged rather than buried:**

5. **The constructor takes a third argument: `(el, input, store)`.** §12.1 says `input` is "the
   ONLY thing a surface is ever handed", but frozen §4 orders every surface to subscribe to
   `state.on('scale')` and **`core/state.js` (§1) is not built and no P3 seat owns it.** A third
   argument was the narrowest way to satisfy both; the alternative is a surface importing a
   singleton, which is what §12.1 exists to prevent. **All three S5 surfaces face this.**
   *Troubleshooter's call, not Brandon's,* unless §12 is to be amended.
6. **A fallback store ships inside the file, and it is marked as a SEAM.** Used only when a
   caller supplies none, so a standalone page still draws and plays. It holds **no theory**:
   every mutation is `scale.js`'s own pure transform and it is a subscription list, nothing more.
   *To remove:* delete `createFallbackStore` and make `store` required. Every read already goes
   through `this.store`.
7. **The "you moved this" badge is clickable and resets the degree.** §4 says a student must
   "see that they moved it **and get back**"; the badge is the seeing, the click is the getting
   back. Brandon ruled the `+/-`, not this. *To remove:* drop the `data-act="reset"` branch.
8. **The numeral ring is drawn at 0.86 opacity, not held back further.** First pass used 0.42
   and the screenshot showed why that is wrong: a dimmed amber comes back as brown, which
   teaches a colour that is not in the palette. §9's room test drove the change. The two rings
   are separated by the stroke between them and by what is written on them, never by a value a
   projector can eat.

**Reported, not fixed — no upstream file was touched:**

- **No new bug found in `scale.js` or `chord.js`.** Both behaved exactly as §15 specifies under
  every call this surface makes, including on scales two `+/-` presses off major.
- `chord.js`'s **M-12** (`invert` rotates `v[0]`, which is not always the lowest pitch) is
  untouched and irrelevant here — this surface plays root-position voicings only and never
  inverts. It becomes S6's problem, not this one's.

---

## FILE LOCATIONS

**Written — project code, one file, this seat's whole lane:**
- [`/src/surfaces/scale-circle.js`](../../../src/surfaces/scale-circle.js)

**Written — `docs/scratchpad/`, throwaway, named here as the brief requires:**
- [`docs/scratchpad/scale-circle-donecheck.mjs`](../../../docs/scratchpad/scale-circle-donecheck.mjs)
  — the headless done-check. `node "docs/scratchpad/scale-circle-donecheck.mjs"` from the project root.
- [`docs/scratchpad/scale-circle-test.html`](../../../docs/scratchpad/scale-circle-test.html)
  — **the test page the DONE-CHECK asks for by path.** Serve the project root over HTTP:
  `python3 -m http.server 8000` → `http://127.0.0.1:8000/docs/scratchpad/scale-circle-test.html`
  (`?demo=alter` lands with two degrees already moved). It mounts the circle expanded and
  compact, mounts whichever siblings exist on the **same** store, and sounds through
  `wave-synth`. It is not a tool page — `/tools/harmony.html` is `chord-module`'s.
- [`docs/scratchpad/scale-circle-shot-major.png`](../../../docs/scratchpad/scale-circle-shot-major.png)
  — C major, as drawn.
- [`docs/scratchpad/scale-circle-shot-altered.png`](../../../docs/scratchpad/scale-circle-shot-altered.png)
  — two degrees moved: recoloured ring, `scale unknown` in the hub, moved badges, and
  `diatonic-keys.js` following through `state.on('scale')`.

**Read only, unmodified — verified by `git status`:** `theory/scale.js` · `theory/chord.js` ·
`core/input.js` · `surfaces/keyboard.js` · `ui/tokens.css` · `CONTRACTS.md` · the two siblings'
files. **No seat's file but this seat's was written.**

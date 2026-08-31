# RECEIPT — keys-input (P1/S3)

Seat: `keys-input`, BUILD, OPUS-CLASS. Opened 2026-08-23 00:25 EDT.
Brief: [A-keys-input.md](A-keys-input.md) · Stage: [STAGE.md](STAGE.md)
Binds to: CONTRACTS §2, §5, §6, §9, §11, §12 · findings-webaudio.md Q5

DONE-CHECK harness: `keys-input-donecheck.html` (moved here from `docs/scratchpad/` by the closer, was misfiled)
**76 passed · 0 failed · 2 UNVERIFIED** (real MIDI hardware; audible sound — no output
device exists in this environment). Run: static server on 127.0.0.1 (secure context, so
the Web MIDI path is live), headless Chrome. Nothing below claims to have heard anything.

---

## DELIVERABLE STATE

### 1 · Do all four routes produce identical events? — 2026-08-23 00:25 EDT
**YES.** Every route funnels through `input.emitNoteOn`/`emitNoteOff`; there is no second
path out of `input.js`. Mouse, key, touch, and MIDI each emitted `{note: 60, velocity,
source}` with sources `mouse,key,touch,midi` and identical note numbers.

**The proof that `source` changes nothing downstream is structural, not a promise:** the
subscriber that drives the instrument calls `synth.noteOn(note, velocity)`, and §2's
signature is `noteOn(note, velocity, atTime)`. **There is no parameter anywhere in that
path that could carry `source`.** Asserted in the harness against `noteOn.length`.

Velocity per §12.1: mouse/key/touch report the fixed 0.8; MIDI reports real hardware
velocity (`vel/127`), which is the contract's intent, not a divergence — 0.8 is specified
for routes that *cannot sense* velocity.

### 2 · What is the QWERTY map? — 2026-08-23 00:26 EDT
Two full piano rows, one octave apart, on **disjoint physical keys** — the curriculum's
Play/Program skills are hands-separate, so a one-row map would not support the lesson.

```
LOWER ROW — left hand, C4 (60) up to E5 (76)
  black:      S   D       G   H   J        L       ;
  white:    Z   X   C   V   B   N   M   ,   .   /

UPPER ROW — right hand, C5 (72) up to E6 (88)
  black:      2   3       5   6   7        9       0
  white:    Q   W   E   R   T   Y   U   I   O   P
```

Keyed by `KeyboardEvent.code` (physical key), not `.key` — the shape stays piano-shaped
regardless of layout or Shift state, and the printed letters still match on US-QWERTY
Chromebooks. Verified: Z=60 · Q=72 · M=71 · P=88; no code appears in both rows; a left-hand
triad sustains while the right hand plays over it (3 notes on the bus, 3 live voices).

Guards verified: `e.repeat` does not retrigger; Ctrl/Meta/Alt combinations are left to the
browser; typing into an input/textarea/contenteditable does not play notes; window blur
releases everything held (keyup never arrives after a tab-away).

Where the two rows overlap in **pitch** (Comma..Slash vs Q..E), the surface reference-counts
per note, so two physical keys on one pitch do not cut each other off.

**positionShift does NOT rotate this map** — nothing here is drawn, so there is nothing to
re-draw. Z emits C at every positionShift. Verified.

### 3 · What happens when Web MIDI is unavailable or refused? — 2026-08-23 00:26 EDT
**Nothing visible. Startup never waits.** Bound to §5's amended block and findings Q5:

- Feature detection is a plain `typeof navigator.requestMIDIAccess !== 'function'` check.
  It throws nothing on a non-secure origin, so no try/catch guards it — verified against
  the shipped source, not asserted from memory.
- Fired and forgotten. `requestMIDI()` **returns `undefined`** by design: there is no
  promise for a caller to accidentally `await` and turn into a 7128 ms dead app.
- Refusal is a rejected promise, caught locally with `.catch(() => {})`. Silent.
- `requestMIDI()` is called **once at module load** — deliberate. Leaving the call to a
  shell means one forgotten line in one page silently costs every MIDI student their
  hardware; on a non-secure origin the typeof check makes it a no-op.
- Late arrival works: `attachMIDI(access)` after startup binds every port. Junk input
  (`null`, `{}`) returns `false` without throwing.
- Stuck-note guards verified: a device unplugged mid-note releases it via `onstatechange`;
  CC 120/123 (All Sound Off / All Notes Off) is honoured.

**UNVERIFIED — real MIDI hardware.** No device and no permission prompt exists in this
environment. What IS verified: the feature-detection branch, the never-awaited shape, the
catch, late attachment, port binding/unbinding, and the full 0x90/0x80/running-status-0x90-
with-velocity-0 parse path, exercised through a simulated port.

### 4 · How does octaveShift work? — 2026-08-23 00:26 EDT
Integer on the bus. `shifted = raw + 12 * octaveShift`, applied once, on the way **out** of
`emitNoteOn` — so it applies to **all four routes including MIDI**. Applying it to three
routes and not the fourth would break §5's other sentence, that the routes are identical.

Verified: +1 → 72 · -1 → 48 · 0 → 60 · MIDI at +2 → 84. Notes landing outside MIDI 0-127
after the shift are dropped silently. Clamped to ±5 as a **guard, not a contract limit**
(§5 gives no range; past ±5 every note is out of range and the keyboard goes silently dead,
which reads to a student as a broken app).

**The stuck-note case is handled and tested.** The shifted note is stored at note-on and
replayed at note-off, so the shift is read exactly once per note. Verified: press Z, change
`octaveShift` 0 → 3 mid-hold, release Z — the note-off carries **60**, matching the
note-on, and the bus is left empty. Recomputing the shift at note-off would have emitted 96
against a sounding 60 and stranded the voice forever.

### 5 · How does positionShift work? — 2026-08-23 00:26 EDT
**ESCALATED BEFORE THE LINE WAS WRITTEN, per the brief. Ruled on by the Troubleshooter
against BUILDPLAN's FIXED DECISIONS ("Position shift redraws the bottom key as any pitch
class") and CONTRACTS §5. Ruling: rotate in place. Built to the ruling.**

```js
note = BASE_NOTE + ((positionShift + i) % 12)      // surfaces/keyboard.js, noteForIndex()
```

One pure function, one line, isolated on purpose. **`positionShift` appears nowhere in
`input.js`'s emit path** — only in its own getter/setter and the shift event. That absence
is the feature.

At every positionShift the 12 keys carry **the same 12 note numbers, 60..71**; only the
draw order rotates. Verified at positionShift = 5:

| Check | Result |
|---|---|
| bottom key reads | **F** |
| bottom key emits | **65 — label and pitch agree** |
| full note set | **{60..71}, bit-identical to positionShift 0** |
| any note 72..76 present | **no** — the forbidden slid window did not happen |
| key still labelled C emits | **60** — nothing was transposed |
| piano shape | **7 white, 5 black** — survives the rotation |
| QWERTY map | **unmoved** — Z is still C |
| all 12 positions | bottom key = that pitch class, note set never moves |

What it is NOT: not `BASE_NOTE + positionShift + i` (that transposes the receivable set to
65..76, forbidden by §5), and not a relabelled key that emits its old pitch. The bottom key
that reads F sounds F.

### 6 · Does the keyboard show note-on state from every route? — 2026-08-23 00:26 EDT
**YES, and by mechanism rather than by intention.** Lighting is driven from the **input
bus** (`input.on('noteon')`), never from the local pointer or key handler. By the time any
event reaches the lighting code it is an identical §5 event and the route is gone — so a
MIDI press and a mouse click cannot light differently, because they run the same two lines.

Verified: mouse, MIDI, and computer key each produced the identical lit set and the
identical `className` (`cbdaw-kbd__key is-on`). Also verified:
- both mounted surfaces (compact strip + expanded) light from the one shared bus;
- two routes on one note are reference-counted — MIDI releasing C while the mouse still
  holds it leaves the key lit and the note sounding;
- a note held across a `positionShift` redraw stays lit (lit state is re-applied after the
  keys are rebuilt).

**Design decision, in this surface's lane:** keys light by **pitch class**, not exact note.
The surface draws 12 semitones, so a student on a full-size MIDI controller playing C2 or
C6 lights its C. Exact-note matching would leave the primary teaching surface dark for
exactly the student who plugged in hardware, which reads as broken.

### 7 · mountCompact and mountExpanded — 2026-08-23 00:26 EDT
Both draw the same 12 semitones from the same code path; they differ in height, chrome, and
motion. `mount(el, variant)` satisfies §12.1's `mount(el)` at the same time.

| | compact (DAW strip) | expanded (standalone) |
|---|---|---|
| key height | **56 px** | **168 px** |
| shift controls | none — the DAW shell owns them | octave -/+ · position -/+ · overlay cycle |
| labels | drawn if the overlay asks | drawn with room |
| motion | **none** (§9: DAW views stay still) | 60 ms transition (§9: standalone may animate) |

All verified, including the §9 motion split by computed `transition-duration` (0s vs 0.06s).

**Both read `/src/ui/tokens.css`.** Every colour is `var(--token, fallback)` off §9's
palette (`--bg --panel --line --text --text-dim --accent --warn`). `tokens.css` is the
`scopes` seat's file and is **not on disk yet** — the fallbacks are what make this render
today. Verified live: overriding `--accent` above the surface moved the lit key from the
fallback `rgb(52,209,196)` to `rgb(1,2,3)`. This surface defines no token; it only consumes.

The expanded controls write to the **shared bus**, never to local state — verified that
clicking position on the expanded view redrew the **compact** strip. One shift, every
surface, exactly as §12.1 requires.

Rendered and looked at, not just asserted: at positionShift 5 it draws a real piano
fragment starting on F (F F♯ G G♯ A A♯ B C C♯ D D♯ E), with the B-C white pair in the right
place. Black-key labels were changed from `--text-dim` to `--text` after that look: §9
requires labels to read from ten feet on a projector, and dim-on-dark did not.

### 8 · Is the overlay hook in place? — 2026-08-23 00:27 EDT
**YES.** `surface.overlay` is a per-instance property accepting §6's four pitch values
(`none` / `letter` / `number` / `solfege`); `syllable` (a rhythm-surface value) is refused.
Verified, including the expanded view's cycle button.

**Every label in the file goes through one function, `labelFor()`.** That is the seam.

- `letter` → the **temporary letter-name fallback** this seat's brief authorises in those
  words, and nothing else authorises. Marked `← SEAM` in the source.
- `number` / `solfege` → **null, deliberately.** Both need the current scale (§4) read
  through `theory/scale.js`, which is **P3's file and does not exist**. A wrong label on a
  teaching surface is worse than no label, and §10-H puts scale/syllable/spelling decisions
  outside a BUILD seat's lane.
- The expanded view states the seam on screen — "labels pending theory/scale.js (P3)" — so
  a blank overlay reads as an unbuilt dependency and not a bug. Temporary; delete with the
  placeholder table.

**No theory code was written.** Verified against the source with comments stripped: nothing
imported from `theory/`, no `state.scale` read, exactly one 12-entry placeholder table.
When P3 lands: delete the table, import the labeller, replace `labelFor()`'s body. Nothing
else in the file touches labels.

### 9 · Does it dispose clean? — 2026-08-23 00:27 EDT
**Zero listeners left, and it is a counted number rather than a claim.**

The harness wraps `EventTarget.prototype.addEventListener`/`removeEventListener` **before
any module is imported** and ledgers every add and remove for the whole page. After
`keyboard.dispose()` ×2, `input.dispose()`, `synth.dispose()` and `audio.dispose()`:

```
GLOBAL LEDGER net = 0        every addEventListener has a matching remove
```

Per module, verified:
- **keyboard**: 10 DOM listeners (pointerdown/move/up/cancel/lostpointercapture/contextmenu,
  controls click, window keydown/keyup/blur) + 3 bus subscriptions, all dropped; DOM node
  removed; shared stylesheet removed once the **last** keyboard disposes (reference-counted);
  after dispose a keypress and a pointer event produce **zero** events.
- **input**: both bus subscribers dropped, `listenerCount === 0`; every MIDI port's
  `onmidimessage` and the access `onstatechange` unbound.
- **Notes held at dispose are released, not stranded** — verified holding notes on three
  routes simultaneously and disposing mid-hold; real note-off events were emitted so the
  instrument never has to know why.
- Remount after full dispose works (the harness rebuilds both views at the end).

---

## NEXT ACTION

Closed 2026-08-23 00:27 EDT. Nothing is outstanding in this lane.

- **`tone-shell` (P1/S4)** mounts these two files. It needs to know only this: construct
  `new Keyboard(el, input)`, call `mountCompact`/`mountExpanded`, subscribe the instrument
  with `input.on('noteon', e => synth.noteOn(e.note, e.velocity))`. It does **not** need to
  call `requestMIDI()` — `input.js` does that itself at module load.
- **`scopes` (P1/S3, parallel)** creates `ui/tokens.css`. When it lands, these two files
  pick it up with no edit — every colour is already a `var()` off §9's names.
- **P3's `scale-engine`** replaces `labelFor()`'s body. One function, marked `← SEAM`.
- **P3's `diatonic-keys` and `scale-circle`** subclass the same §12.1 interface and emit
  with `source: 'diatonic'` / `'circle'`. Both are already in this bus's enum. **Not built
  here — out of lane.**

## OPEN DECISIONS

1. **`input.on('shift', fn)` is a third event name on §5's existing bus.** Not in §5.
   §12.1 states both shifts "belong to input itself, shared across every surface at once";
   with no notification a second surface cannot honour that sentence — a shift moved by the
   DAW header would leave every other surface drawing the old layout. No frozen signature
   changed and nothing is required to subscribe. **Decider: Troubleshooter / P1's SPEC seat,
   if it should be written into §12 properly.** Not blocking.
2. **Keys light by pitch class, not exact note** (question 6). A surface-drawing decision in
   this seat's lane. **Decider: `redpen-p1`, if it reads differently.** Not blocking.
3. **`octaveShift` clamped to ±5.** §5 states no range. A guard against a silently dead
   keyboard, not a musical position. **Decider: Brandon, if he wants a different reach.**
4. **No octave/position keyboard shortcuts were bound.** Shift controls are UI buttons on
   the expanded view; the compact strip expects the DAW shell to drive them. Adding key
   bindings would have collided with the note map and invented bindings nobody specified.
   **Decider: `tone-shell` / Brandon, if students want them.**

## FILE LOCATIONS

| What | Where |
|---|---|
| The input bus | `/src/core/input.js` |
| The 12-note keyboard | `/src/surfaces/keyboard.js` |
| DONE-CHECK harness (throwaway) | `/Builddocs/P1-tone-tool/S3-voices-surfaces/keys-input-donecheck.html` (moved here by the closer, was in `docs/scratchpad/`) |
| This receipt | `/Builddocs/P1-tone-tool/S3-voices-surfaces/receipt-keys-input.md` |

**Files touched: exactly the two this seat owns, plus the throwaway harness.** No synth, no
visual, no HTML page, no `audio.js`, no CONTRACTS.md, no `diatonic-keys.js`, no
`scale-circle.js`.

**How to re-run the DONE-CHECK** (needs a secure context — `file://` will not serve ES
modules and would hide the Web MIDI path):

```
python3 -m http.server 8879 --bind 127.0.0.1        # from the project root
# then open http://127.0.0.1:8879/Builddocs/P1-tone-tool/S3-voices-surfaces/keys-input-donecheck.html
```

**UNVERIFIED, both with stated reasons and neither fixable here:**
- **Audible sound** — no output device exists in this environment. Every check is on event
  data, DOM state, or node-graph state. Nothing in this receipt claims otherwise.
- **Real MIDI hardware** — no device, no permission prompt. The code path (typeof detect →
  fire-and-forget → `.catch`) is verified by source and through a simulated port.

---

## 2026-08-23 02:02 EDT — post-close addendum: `redpen-p1` D-7 (Troubleshooter-directed, not a reopening)

Not a reopening of this seat. `redpen-p1` (P1/S5, REDPEN) audited all shipped P1 code
against CONTRACTS and filed nine drift items in
[redpen-report.md](../S5-verify/redpen-report.md). One of the nine lands in this seat's
files, and it lands in `/src/surfaces/keyboard.js` only — `/src/core/input.js` was not
touched by this pass at all.

**D-7 — `var(--token, fallback)` fallbacks corrected to `tokens.css` (CONTRACTS §9).** This
file shipped seven tokens whose fallback values were this seat's own provisional colours,
disagreeing with `/src/ui/tokens.css` and with the two other files that made the same
mistake — `--accent` alone read `#34d1c4` here, `#5cf` in `wave-synth.js`, `#4fc3f7` in
`overtone-synth.js` and `#34e5b4` in the real palette. §9: "Defined once in
`ui/tokens.css`, used everywhere… One palette, four surfaces, no drift." The fallbacks were
written when `tokens.css` did not yet exist on disk (this seat ran in parallel with
`scopes`), which is why they diverged — reasonable then, drift now that the real file
shipped, and it meant Brandon's promised one-line edit to `tokens.css` silently did not
reach this surface.

All 13 occurrences (7 distinct tokens) in `STYLE_TEXT` now carry the exact `tokens.css`
value: `--line` `#3a485f`, `--text` `#f2f6fc`, `--text-dim` `#93a1b8`, `--accent`
`#34e5b4`, `--panel` `#1b2332`, `--bg` `#0a0d13`, `--warn` `#ff7a1a`. The comment above
`STYLE_TEXT` now states they must be kept identical to `tokens.css`, matching what
`vis/spectrum.js`, `vis/scope.js` and `ui/shell.js` already say. The `--kbd-*` local
aliases are unchanged in structure — only the values behind them moved. `tokens.css` itself
was not opened for writing; it stays `scopes`' file. **Nothing else in the file was
touched:** no key geometry, no listener, no overlay, no bus wiring, no `dispose()`.

**`keyboard.js:199`'s `border-color: #000` was deliberately left alone.** That is `D-8`,
not `D-7`: it is the one colour in P1 with no token and no `var()` at all, and §9's own
rule makes a needed-but-absent colour an escalation rather than something a seat may type.
It needs a new token decision, which was explicitly out of scope for this pass. The new
harness asserts it is still there so nobody reads this addendum as having handled it.

**Verification.** `node --check` passed (valid ES module). Re-ran
[keys-input-donecheck.html](keys-input-donecheck.html) headless
(Playwright/Python, Chromium 148, `python3 -m http.server` at the project root) — **74
passed · 2 failed · 2 unverified**, against a baseline **this pass re-measured on the
unmodified code first: 75 passed · 1 failed · 2 unverified**. Both non-passes are
accounted for and neither is a regression in `keyboard.js`:

- `GLOBAL LEDGER: every addEventListener in this page has a matching remove — net = 13` —
  **pre-existing.** It failed with the identical `net = 13` on the unmodified code, before a
  single byte of this pass landed. Not caused here, not investigated here (this pass had a
  three-file scope), recorded so the number is on the record rather than discovered later.
  Note that this receipt's original DONE-CHECK recorded this check passing, so something
  between then and now moved it — environment or another file, but demonstrably not this
  edit.
- `keys read §9 tokens (--accent), with a fallback until ui/tokens.css exists — fallback
  rgb(52, 229, 180) → token rgb(1, 2, 3)` — **the fix landing.** That assertion hard-codes
  the *old* fallback: `beforeTok === 'rgb(52, 209, 196)'`, i.e. `#34d1c4`, the value D-7
  ordered replaced. The computed colour is now `rgb(52, 229, 180)` = `#34e5b4` = exactly
  what `tokens.css` defines. The half of the assertion that actually tests token wiring —
  overriding `--accent` above the surface and watching the key follow to `rgb(1, 2, 3)` —
  **still passes**. The assertion is obsolete, not failing. This pass was scoped to three
  `/src` files and was not permitted to edit the harness, so it is reported rather than
  quietly rewritten; the fix is one number on line 361.

Fresh targeted checks for the six fixes this pass covers were written and run for real, not
reasoned about: `/docs/scratchpad/redpen-fixes-verify.html` — **43 of 43 passed, 0 page
errors**. This file's share of that: `tokens.css` is parsed at runtime and every
`var(--token, fallback)` in `keyboard.js` is compared byte for byte against it (13
occurrences, 7 distinct, all exact), plus a cross-file check that `--accent` now resolves to
one single value across all six colour-carrying files where `redpen-p1` found four.

**NOT this pass's, left alone as instructed:** D-5 (doc-only), D-8 (the `#000` above), D-9.
No file outside the three named was edited, and `/src/core/input.js` — this seat's other
owned file — was not opened for writing.

FILE LOCATIONS: [/src/surfaces/keyboard.js](../../../src/surfaces/keyboard.js)
(`STYLE_TEXT`'s `var()` fallbacks and the comment above it — nothing else) · throwaway
harness
[/docs/scratchpad/redpen-fixes-verify.html](../../../docs/scratchpad/redpen-fixes-verify.html)
(**stray file — for the closer to sweep**) · this receipt.

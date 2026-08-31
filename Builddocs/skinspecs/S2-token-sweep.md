# S2 — TOKEN SWEEP

Task: make every file in the codebase read the token layer. Mechanical.
Written by: Opus 5 session, 2026-08-25 14:14 EDT. Rescoped 14:32 EDT after Brandon ruled
"as skinnable as possible."
Map: [S1-token-vocabulary.md](S1-token-vocabulary.md) · [S3-skin-contract.md](S3-skin-contract.md) ·
[CONTRACTS.md](../CONTRACTS.md) §9 · [agent-brief-template.md](../skills/agent-brief-template.md)

**BLOCKED ON S1.** Not until the token list is in `ui/tokens.css` and
[`nest-proof.html`](../../docs/scratchpad/nest-proof.html) reads ALL PASS in the project's
browser. A seat that starts early invents a token name and fifteen files disagree about it.

**Tier: SONNET-CLASS**, per the template — exact steps, in order, no judgment assigned.
Every decision was pre-made in S1. **A seat that finds itself deciding has found an
escalation, not a task.**

---

## THE JOB IN ONE LINE

`padding: 4px 9px` → `padding: var(--sp-2) var(--sp-4)`. Times 903.

## WHY IT IS SAFE TO HAND OUT

1. **No cross-file reasoning.** Each file's styles are self-contained CSS-in-JS template
   strings or a `<style>` block. Nothing one seat does changes another seat's work.
2. **One test, and it is objective.** *Does this file render pixel-identical to before?*
   Not "does it look right" — identical. S2 changes how a value is spelled, never what it is.
3. **No file is owned by two seats.** The lane table is the collision map.

---

## SCOPE — 903 sites, 15 files, 6 axes

Counted 2026-08-25 **with Python, not `grep`** — read
[FENCE 4](#fence-4--grep-silently-skips-chord-modulejs) before trusting any count in this
project, including your own.

| lane | file | shape | type | space | depth | motion | colour | total |
|---|---|---|---|---|---|---|---|---|
| **L1** | [tools/beat.html](../../tools/beat.html) | 25 | 52 | 39 | 4 | 2 | 88 | **210** |
| **L2** | [chord-module.js](../../src/instruments/chord-module.js) | 18 | 38 | 30 | 1 | 0 | 45 | **132** ⚠ F4 |
| **L3** | [ui/shell.js](../../src/ui/shell.js) | 20 | 28 | 25 | 4 | 1 | 51 | **129** |
| **L4** | [drum-sampler.js](../../src/instruments/drum-sampler.js) | 6 | 10 | 11 | 1 | 2 | 25 | 55 |
| **L4** | [drum-synth.js](../../src/instruments/drum-synth.js) | 6 | 15 | 15 | 0 | 1 | 17 | 54 |
| **L5** | [wave-synth.js](../../src/instruments/wave-synth.js) | 8 | 10 | 15 | 2 | 1 | 19 | 55 ⚠ F2 |
| **L5** | [overtone-synth.js](../../src/instruments/overtone-synth.js) | 2 | 4 | 4 | 0 | 2 | 11 | 23 |
| **L6** | [step-grid.js](../../src/surfaces/step-grid.js) | 11 | 14 | 17 | 3 | 0 | 7 | 52 |
| **L6** | [keyboard.js](../../src/surfaces/keyboard.js) | 8 | 7 | 8 | 1 | 1 | 13 | 38 |
| **L7** | [piano-roll.js](../../src/surfaces/piano-roll.js) | 14 | 15 | 19 | 3 | 0 | 0 | 51 |
| **L7** | [diatonic-keys.js](../../src/surfaces/diatonic-keys.js) | 9 | 9 | 11 | 3 | 1 | 0 | 33 |
| **L7** | [scale-circle.js](../../src/surfaces/scale-circle.js) | 4 | 7 | 5 | 1 | 1 | 0 | 18 ⚠ F2 |
| **L8** | [tools/harmony.html](../../tools/harmony.html) | 3 | 7 | 9 | 0 | 0 | 16 | 35 |
| **L8** | [tools/overtone-synth.html](../../tools/overtone-synth.html) | 0 | 1 | 1 | 0 | 0 | 4 | 6 |
| **L8** | [tools/wave-synth.html](../../tools/wave-synth.html) | 0 | 1 | 1 | 0 | 0 | 4 | 6 |
| **L9** | [vis/spectrum.js](../../src/vis/spectrum.js) · [vis/scope.js](../../src/vis/scope.js) | — | 6 | — | — | — | — | 6 ⚠ F1 |
| | **total** | **134** | **224** | **210** | **23** | **12** | **300** | **903** |

**Nine lanes, parallel.** Lane totals: L1 210 · L2 132 · L3 129 · L4 109 · L5 78 · L6 90 ·
L7 102 · L8 47 · L9 6. L1, L2 and L3 each get their own seat. **L9 does not go to a small
seat at all.**

---

## THE FOUR FENCES

Everything outside these four is find-and-replace. **Fence 4 bites silently — read it first.**

### FENCE 4 · `grep` silently skips `chord-module.js`

**This cost this spec an entire 132-site file on its first draft. Do not inherit the mistake.**

[chord-module.js:1624](../../src/instruments/chord-module.js#L1624) contains a **literal NUL
byte**, used deliberately as a field separator in a dirty-check:

```js
const want = rows.map((r) => `${r.id}\x00${r.label}`).join('\x01');
```

The code is fine. The consequence is not: this project's `grep` is **ugrep running with
`-I`** (skip binary files). One NUL byte makes ugrep classify all 78 KB as binary and **skip
the whole file without a word** — no warning, no error, exit 1 and no output, which reads
exactly like *"this file is clean."*

`chord-module.js` is the **second-largest lane in this sweep**, and every grep-based audit of
this codebase has been blind to all 132 sites.

- **Do not trust a zero.** A zero on a file you know has styles is FENCE 4 until proven so.
- **Use `/usr/bin/grep`** — the real one — or Python. Never the shell's `grep`.
- **Cross-check against the lane table** before you start, per step 3.
- **Do not strip the NUL byte** to make tooling happy. It is load-bearing application code.
  The tooling is what is wrong here, not the source.

*Open question, not this sweep's to answer:* whether that separator should be written `\0`
as an escape instead of a raw byte. Behaviour-neutral change to a P3 file; belongs to
whoever owns `chord-module.js`, not to a token seat.

### FENCE 1 · L9 — canvas type is a JS template string, not CSS

[spectrum.js:651,714,767](../../src/vis/spectrum.js#L651) and
[scope.js:643,709,736](../../src/vis/scope.js#L643) build type like this:

```js
g.font = `${p.font}px ui-monospace, SFMono-Regular, Menlo, monospace`;
```

A CSS-side replace does nothing — `CanvasRenderingContext2D.font` takes a string, not a
`var()`. **The right plumbing already exists:** both files carry a `TOKENS` map read live via
`getComputedStyle` at [spectrum.js:48](../../src/vis/spectrum.js#L48) /
[scope.js:46](../../src/vis/scope.js#L46). **Extend that map.** Do not add a second mechanism.
This is a pattern extension — not small-seat work.

### FENCE 2 · L5 / L7 — SVG surfaces style through attributes

[wave-synth.js](../../src/instruments/wave-synth.js) and
[scale-circle.js](../../src/surfaces/scale-circle.js) build SVG via `createElementNS`. Some
styling lives in **presentation attributes** (`stroke-width`, `font-size` as an attribute),
not CSS. Attributes accept `var()` inconsistently across contexts.

Rule: **move the value into the CSS block** where the surface already has one. If a property
must stay an attribute, read the token in JS and write the resolved value. Never leave a raw
number.

### FENCE 3 · derived tokens are `*`-scoped — never re-declare one in `:root`

Per [S1 §0](S1-token-vocabulary.md#0--the-architecture--why-this-does-not-bite): a derived
token declared in `:root` **freezes** and stops responding to variant overrides. It looks
correct until someone opens an expanded view.

- A seat may use `var(--sp-3)` freely.
- A seat may **never** write `:root { --sp-3: … }` or define a new derived token anywhere.
- A seat may **never** give a root knob a relative unit.

If your file needs a scale value that S1 does not name, that is an escalation.

---

## SEAT PROCEDURE — in order

1. **Stamp.** `date "+%Y-%m-%d %H:%M %Z"`. Goes in your receipt. Do not ask Brandon, do not
   copy a stamp from another file.
2. **Capture the before.** Serve the tool your file belongs to (`python3 -m http.server`) and
   screenshot it. `file://` will not work — CONTRACTS §10 amendment. This is your only proof
   at step 6.
3. **List your sites — with the REAL grep.**
   ```
   /usr/bin/grep -nE 'border-radius|font-size|font-weight|font-family|letter-spacing|line-height|padding|margin|gap|box-shadow|opacity|transition|border: *[0-9]' <yourfile>
   /usr/bin/grep -nE 'var\(--[a-z-]+, *(#|rgba?\()' <yourfile>
   ```
   **`/usr/bin/grep`, not `grep`** — see FENCE 4. Your count must match the lane table.
   **If it does not, stop and escalate** — either the file changed since 2026-08-25, or your
   grep lied to you.
4. **Replace, one axis at a time, in this order.** Easiest first; the pile that can bite is last.
   1. `font-family` → `--font-ui` / `--font-mono`
   2. `border` width → `--bw`
   3. `font-weight` → `--w-*` · `letter-spacing` → `--track-*`
   4. `transition` → `--dur-*` / `--ease` · `opacity` → `--op-*` · `box-shadow` → `--shadow-*` / `--ring-w`
   5. `border-radius` → `--r-*`
   6. `gap`, `padding`, `margin` → `--sp-*` (compose multi-value: `4px 9px` → `var(--sp-2) var(--sp-4)`)
   7. `font-size` → `--fs-*`
   - Shape/type/space literal → `var(--token)`. **No fallback.** `ui/tokens.css` loads on
     every entry point; a fallback is the bug this sweep exists to delete.
   - Colour `var(--panel, #1b2332)` → `var(--panel)`. Drop the fallback, keep the read.
5. **Verify zero.** Re-run step 3's greps — `/usr/bin/grep` again. Anything left is done
   wrong or is a fenced exception you name in your receipt.
6. **Compare.** Screenshot again. **Pixel-identical to step 2, or you are not done.**
   The only authorised exceptions are the 1px shifts from S1/D-1 and S1/D-5, and the four
   off-scale padding snaps in S1 §5 (`9px`, `18px`, `32px`, `40px`). Name every one by
   selector in the receipt. Anything else is a defect.
7. **Receipt, then stop.** Do not look for more work. Do not touch another lane's file.

---

## OUTPUT FORMAT — one receipt per seat

Write to `Builddocs/skinspecs/receipts/receipt-<lane>.md`.

```
RECEIPT — S2 <lane> — <file(s)> — <your stamp>

SITES
- expected <n from lane table>   found <n>   replaced <n>   remaining <n>
- grep used: /usr/bin/grep   (a seat that used the shell's grep restarts at step 3)

REPLACED BY AXIS
- shape   <n>  → --r-cell <n> · --r-sm <n> · --r-ctl <n> · --r-body <n> · --r-panel <n> · --r-lg <n> · --r-pill <n> · --bw <n>
- type    <n>  → --fs-* <n> · --w-* <n> · --track-* <n> · --font-* <n>
- space   <n>  → --sp-* <n>
- depth   <n>  → --shadow-* <n> · --ring-w <n> · --op-* <n>
- motion  <n>  → --dur-* <n> · --ease <n>
- colour  <n>  (fallback deleted, var() kept)

AUTHORISED CHANGES (S1/D-1, S1/D-5, S1 §5 snaps only)
- <selector> — <old> → <new> — <which decision authorised it>

FENCED / NOT REPLACED
- <line> — <FENCE 1 / 2 / 3 / 4, or escalated>

PIXEL CHECK
- before/after identical: YES / NO
- if NO: <every difference, by selector>

SKIN CHECK  (run it — 30 seconds, and it is the only test that proves the point)
- with docs/scratchpad/skin-smoketest.css loaded, my file visibly changes: YES / NO
- anything that did NOT move: <selector — which axis failed>

ESCALATIONS
- <anything where I would have had to decide something>   (or: none)
```

---

## ESCALATION

Every decision in this sweep was made in S1. **So if you are deciding, you are escalating.**

- a value with no matching token in S1
- a site where the token changes appearance beyond the authorised list in step 6
- an SVG attribute you cannot resolve (FENCE 2)
- a zero result you cannot explain (FENCE 4)
- your count not matching the lane table

Message the lead and wait. Do not improvise, do not guess, do not widen your lane.
**"I don't know" sent early beats invented work sent late.**

Above all: **do not invent a token name.** If S1 does not name it, it does not exist. A seat
that coins `--sp-9` because 18px felt unloved puts the drift back by hand.

---

## S2 DONE-CHECK

- All 15 files return **zero** on step 3's greps — verified with `/usr/bin/grep` — except
  sites named under a fence in a receipt.
- `ui/tokens.css` is the only file in `src/` and `tools/` containing a colour literal, a
  radius, a font size, a padding, a shadow, or a duration.
- All four tools load on a static file server and are **pixel-identical** to their S1
  screenshots, except the changes authorised in step 6.
- Nine receipts in `Builddocs/skinspecs/receipts/`.
- **THE PROOF THE WHOLE EXERCISE WORKED.** Load
  [`docs/scratchpad/skin-smoketest.css`](../../docs/scratchpad/skin-smoketest.css) — a
  deliberately hideous skin that only overrides `:root` knobs — after `tokens.css` in all
  four tools. Every tool must go light, square-cornered, airy, serif, flat and still, **with
  no other file edited.** Anything that does not move is a site this sweep missed.
  If that test does not pass, S2 is not done, whatever the greps say.

Tokenise first, skin second: **S2 passes when the app looks identical, S3 passes when it
looks different.** Run them together and a bad token is indistinguishable from a bad skin.

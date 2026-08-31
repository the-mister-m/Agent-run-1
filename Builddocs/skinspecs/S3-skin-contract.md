# S3 — SKIN CONTRACT

Task: the format a skin is written in, the rules it must obey, and the brief for an agent
turning screenshots into one.
Written by: Opus 5 session, 2026-08-25 14:32 EDT, at Brandon's ask.
Map: [S1-token-vocabulary.md](S1-token-vocabulary.md) · [S2-token-sweep.md](S2-token-sweep.md) ·
[validate-skin.js](validate-skin.js) · [CONTRACTS.md](../CONTRACTS.md) §4, §9

**BLOCKED ON S2.** A skin cannot move what still reads a literal.

---

## THE ASK, VERBATIM

Brandon, 2026-08-25: *"So I can give an agent screenshots and they can make me a mockup
skin. that's what the specs need to be able to do."*

This spec is that. S1 built the knobs, S2 wires them up, **S3 is the thing you actually
use.**

---

## §1 · WHAT A SKIN IS

**One CSS file. ~40 lines. Nothing but custom property overrides.**

```
src/ui/skins/<name>.skin.css
```

Loaded after `tokens.css`, which holds the defaults:

```html
<link rel="stylesheet" href="../src/ui/tokens.css">
<link rel="stylesheet" href="../src/ui/skins/chalkboard.skin.css">   <!-- the skin -->
```

Swapping skins is swapping one line. No build step (CONTRACTS §10 forbids one before P5),
no dependency, no JS. The canvas visuals re-read tokens live via `getComputedStyle`, so
`spectrum` and `scope` re-skin with everything else and nobody writes canvas code.

### The one hard rule

> **A skin file contains `:root` (and variant) custom property declarations. Nothing else.**
> No selectors. No new rules. No `!important`. No layout. No JS.

The moment a skin needs a selector, it is not a skin — it is a change to the app, and it
goes through a phase, not through here. **That constraint is what makes a skin safe to
accept from an agent that has only seen screenshots:** the worst a bad skin can do is look
wrong. It cannot break a surface, desync the audio graph, or touch a teaching engine.

---

## §2 · EVERY KNOB

The complete surface area. If it is not here, a skin cannot change it.

### The four dials — the whole shape of the app

```css
--fs-root: 12px;   /* type size.   10px dense · 12px default · 17px projector    */
--sp-unit: 2px;    /* density.     1.5px tight · 2px default · 5px airy          */
--r-unit:  2px;    /* roundness.   0 hard-edged · 2px default · 5px pill-ish     */
--bw:      1px;    /* line weight. 0 borderless · 1px default · 3px heavy chrome */
```

These four move **every** radius, size, padding, gap and border in the app at once, because
every derived token is `calc()`'d off them ([S1 §0](S1-token-vocabulary.md#0--the-architecture--why-this-does-not-bite)).
Measured: `--fs-root: 12px → 16px` moves a label from 11.004px to 14.672px, three levels
deep, with no compounding.

### Faces, motion, depth

```css
--font-ui, --font-mono
--dur-fast, --dur-med, --ease        /* both 0ms = a still skin (§9: DAW views stay still) */
--shadow-raised, --shadow-lifted, --glow, --ring-w
--op-faint, --op-dim, --op-mid, --op-soft
```

### Ground and text

```css
--bg, --panel, --line, --text, --text-dim
```

### Teaching colours — read §3 before touching these

```css
--deg-major, --deg-minor, --deg-dim, --deg-aug, --deg-altered
--accent, --warn, --meter-ok, --meter-hot
```

### What a skin may NOT do

- Add a selector, a rule, or an `!important`.
- Re-declare a **derived** token (`--fs-sm`, `--sp-3`, `--r-ctl`…). Those live in the `*`
  block and are computed. Overriding one in `:root` freezes it and it stops responding to
  variants — [S1 §0](S1-token-vocabulary.md#0--the-architecture--why-this-does-not-bite).
  **Set the dial, not the derivative.**
- Give a dial a relative unit. `--fs-root` in `em` re-introduces compounding.
- Use `--accent` as a degree colour, or a degree colour as `--accent`. §9: *"the visuals
  must never borrow a degree color, or a student learns a teaching association that is not
  true."*

---

## §3 · THE TEACHING INVARIANT — the part that is not taste

This app is a teaching tool. **Colour carries curriculum**, and a skin can destroy that
while looking beautiful to the person who made it.

CONTRACTS §4, Brandon's device: *"Students never memorize which numeral is minor; the
colour tells them."*

The failure mode, concretely: an agent reads a screenshot, picks a handsome green/red pair
for major/minor. To a trichromat it is lovely. To a deuteranope — **~6% of boys, so most
classes** — both are the same muddy yellow. The app looks fine and stops teaching. Nobody in
the room can tell you why.

That is why the default palette puts major/minor on the **yellow↔blue axis**: it is the one
axis that survives red-green colour blindness. Measured on the shipping palette, amber vs
cyan holds at ΔE 28.1 deuteranopia / 25.0 protanopia / 35.1 tritanopia.

**This cannot be checked by eye, so it is checked by a script.**

### The gate

```
node Builddocs/skinspecs/validate-skin.js src/ui/skins/<name>.skin.css
```

Exit 0 = accepted. Non-zero = rejected. **A skin that has not passed does not ship**, and
"it looks great on my screen" is not an appeal — that is precisely the failure the gate
exists to catch.

It checks four things:

1. **Completeness** — every token the app reads resolves; dials are absolute units.
2. **Legibility** — WCAG contrast floors on `--panel`: text 7:1, dim text 4.5:1, every
   degree colour and system colour 3:1, and `--panel`/`--line` ≥ 1.5:1 (§9: on a washed-out
   projector *the border is what survives, not the fill*).
3. **The teaching invariant**, tiered — and the tier comes from the contract, not taste:
   - **major vs minor — HARD FAIL below ΔE 15**, all three CVD types. A9 gives these two
     `SUFFIX ''`: no glyph, so **colour is the only channel.**
   - **every other pair — WARNING below ΔE 8.** A9 mandates a superscript glyph on the
     others (`+` augmented, `°` diminished, `?` altered), so a second channel exists by
     contract. A warning means *that glyph is now load-bearing* — not that the pair is fine.
4. **Projector** — teaching colours at OKLab L ≥ 0.55, because projector gamma eats
   midtones and a rich dark teal that reads on a laptop disappears on a wall.

The validator **self-tests its own colour model before it judges anything** — it confirms
red/green collapse under deuteranopia, blue survives, a luminance-matched red/green pair
fails the floor, and amber/cyan clears it. Two drafts of it failed that self-test and were
silently wrong. A validator that is confidently wrong is worse than none.

### What the gate says about the CURRENT palette

Run today against `tokens.css`: **ACCEPTED, with three warnings.**

- **major/minor is solid** — ΔE 28.1 / 25.0 / 35.1. Brandon's core distinction is safe.
- `minor/altered` ΔE **1.2** under deuteranopia — cyan and violet are the same colour to a
  deuteranope.
- `dim/aug` ΔE **1.2** under tritanopia — magenta and red are the same colour to a tritanope.
- `major/dim` ΔE **8.0** under tritanopia — borderline.

All three are pairs A9 gives a glyph, so the app still teaches. **But the `°` / `+` / `?`
superscripts are load-bearing, not decorative** — a surface that drops one makes those pairs
genuinely indistinguishable for some students.

This does not match the note in [tokens.css](../../src/ui/tokens.css) claiming *"Worst case
47 normal / 41 deuteranopia. Every pair clears the glance threshold."* That figure was
computed with CIE76 on a different CVD model. **Brandon's call, not this spec's** — flagged,
not fixed. It changes nothing about whether a skin can be written today.

---

## §4 · THE SCREENSHOT → SKIN BRIEF

Hand this section, the template, and the screenshots to the agent.

### IDENTITY
- You are: the skin author.
- You own: **exactly one file**, `src/ui/skins/<name>.skin.css`.
- You do NOT touch: anything else. Not `tokens.css`, not a surface, not an instrument, not
  a tool page, not the validator. If your skin needs any of those, **stop and say so** — you
  have found a spec gap, not a task.

### WHAT YOU ARE DOING
Reading a visual reference into **~15 numbers**. You are not redesigning the app. Layout,
component structure and behaviour are fixed. You are choosing its palette, its roundness,
its density, its type and its depth.

### PROCEDURE

1. **Read the ground first.** From the screenshot: is it light or dark? Pick `--bg`,
   `--panel`, `--line`, `--text`, `--text-dim` before anything else. Everything else is
   judged against `--panel`.
2. **Measure roundness.** Find the most common button or control corner in the reference.
   Divide by 2 → `--r-unit`. Square corners → `0`. A pill-shaped reference → 4-5px.
3. **Measure density.** Find the gap between two adjacent controls. Divide by 3 → that is
   your `--sp-unit` (the most common gap in this app is `--sp-3`). Tight UI → 1.5px.
   Airy → 4-5px.
4. **Measure type.** Find body text — the size most labels use. That is `--fs-root` directly.
   Small/dense → 10-11px. Classroom projector → 15-17px.
5. **Match the faces.** `--font-ui` and `--font-mono`. **Every stack needs a real fallback**
   — there is no font loading and no network; if the machine lacks it, the fallback is what
   ships.
6. **Read the depth.** Flat reference → `--shadow-raised: none`. Heavy/glassy → deepen it.
   `--ring-w` is the focus ring thickness.
7. **Teaching colours LAST, and read §3 first.** Five degree colours, and the constraint is
   not negotiable:
   - **`--deg-major` and `--deg-minor` must sit on the yellow↔blue axis.** Warm/amber for
     major, cool/blue-cyan for minor. **Do not put them on red↔green** no matter how good it
     looks — that is the failure this whole section exists to prevent.
   - Keep all five bright: OKLab L ≥ 0.55.
   - `--accent` must not be any degree hue.
8. **Run the gate.** `node Builddocs/skinspecs/validate-skin.js <your file>`.
   **Iterate until it exits 0.** Do not hand over a skin that has not passed. Do not edit
   the validator to make your skin pass — if you believe a floor is wrong, say so and stop.
9. **Look at it.** Load all four tools on a static file server (`python3 -m http.server`;
   `file://` will not work — CONTRACTS §10). Screenshot each.

### DONE-CHECK
`validate-skin.js` exits 0, all four tools render, and you changed exactly one file.
Deliver the file, the four screenshots, and the validator output. Then stop.

### ESCALATE, do not improvise
- The reference needs something no knob in §2 covers.
- You cannot satisfy §3 and the reference at the same time. **§3 wins** — say so and hand
  back the closest passing skin plus a note on what you had to give up.
- The reference implies a layout or component change. That is not a skin.

**Do not edit `validate-skin.js`. Do not add a selector to make something fit. Do not
copy [`skin-smoketest.css`](../../docs/scratchpad/skin-smoketest.css) as a starting
point** — it is a deliberately hideous plumbing test that does not satisfy §3. Start from
the template.

---

## §5 · THE TEMPLATE

[`src/ui/skins/_template.skin.css`](../../src/ui/skins/_template.skin.css) — every knob,
its default, its range, and a one-line note on what it does. Copy it, fill it in, delete
nothing. A skin that leaves a knob at its default is a fine skin; a skin that omits the line
is one nobody can read.

---

## §6 · S3 DONE-CHECK

- `src/ui/skins/` exists and holds `_template.skin.css`.
- At least one real skin passes the gate and renders in all four tools.
- The gate is wired into whatever check runs before a skin lands.
- **The end-to-end proof:** hand an agent screenshots and §4. It returns one file. It
  passes. All four tools re-skin. **Nothing else in the repo changed.**

That last line is the entire point of S1, S2 and S3. Everything else was plumbing.

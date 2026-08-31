# S1 — TOKEN VOCABULARY

Task: define the token layer that makes this app skinnable. **RULED by Brandon 2026-08-25.**
Written by: Opus 5 session, 2026-08-25 14:14 EDT. Rulings folded in 14:32 EDT.
Map: [S2-token-sweep.md](S2-token-sweep.md) · [S3-skin-contract.md](S3-skin-contract.md) ·
[CONTRACTS.md](../CONTRACTS.md) §9 · [tokens.css](../../src/ui/tokens.css)

---

## THE TARGET

Brandon's words, 2026-08-25: *"make these specs so the app is as skinnable as possible. So I
can give an agent screenshots and they can make me a mockup skin."*

That sets the bar, and it is higher than tokenising. The test is not "are the values in
variables." The test is:

> **An agent is handed screenshots. It writes ONE file of ~30 lines. Every tool in the app
> re-skins — palette, roundness, density, type, depth, motion — and nothing else is touched.**

Everything below exists to make that sentence true. Where a choice was between *tidy* and
*skinnable*, skinnable won.

## RULINGS

- **D-3 → (b), and made bite-proof.** One root knob drives the type scale. The naive version
  of (b) bites; the architecture in §0 does not, and that is measured, not asserted.
- **D-6 → meant to shout.** `--w-heavy: 800` is a real role. The scale circle's numeral ring
  sits heavier than every other bold thing in the app, on purpose.
- **D-7 → superseded.** The question was "is spacing in scope." "As skinnable as possible"
  answers it: spacing is in, and so are depth and motion. Six axes, not two.
- **D-1, D-2, D-4, D-5, D-8, D-9 → recommendations stand** (see §7).

---

## §0 · THE ARCHITECTURE — why this does not bite

**This section is the load-bearing one.** Everything else is a list of names.

### The naive version, and how it fails

The obvious way to build a one-knob type scale is relative units:

```css
:root { --fs-root: 12px; }
.label { font-size: 0.917em; }
```

`em` resolves against the element's **inherited font-size**, so nesting multiplies.
Measured in Chrome, three nested `0.917em` off a 12px root:

```
11.004px → 10.0907px → 9.25314px      ← compounds. bites.
```

A skin that bumps the root would make deep nodes drift further with every level. That is
the bite Brandon said to avoid.

### First fix, and the trap inside it

Derive the tokens with `calc()` instead of `em`:

```css
:root { --fs-root: 12px; --fs-sm: calc(var(--fs-root) * 0.917); }
```

`calc(var(--fs-root) * k)` resolves against the inherited **custom property**, not the
inherited font-size. Measured, same three nested levels:

```
11.004px → 11.004px → 11.004px        ← no compounding. 
```

**But this alone is still broken**, and the first draft of this spec had the bug. A custom
property is substituted where it is *declared*. `--fs-sm` declared on `:root` resolves
against `:root`'s `--fs-root` and then inherits as a finished value. Overriding `--fs-root`
lower down does nothing:

```
.expanded { --fs-root: 16px; }    →  child still computes 11.004px, not 14.672px
```

Which would have killed the whole point. Caught by testing it, not by reading it.

### The architecture, as ruled

**Root knobs on `:root`. Derived tokens re-declared on `*`.**

```css
:root {
  --fs-root: 12px;   /* type size    */
  --sp-unit: 2px;    /* density      */
  --r-unit:  2px;    /* roundness    */
}
* {
  --fs-sm:  calc(var(--fs-root) * 0.917);
  --sp-3:   calc(var(--sp-unit) * 3);
  --r-ctl:  calc(var(--r-unit)  * 2);
  /* …every derived token, see §2–§4 */
}
```

Because `*` re-declares on every element, each element resolves the derivation against the
`--fs-root` **it** inherits. Measured:

| | default | under `.expanded` | `.expanded`, 3 levels deep |
|---|---|---|---|
| `font-size` | 11.004px | **14.672px** | **14.672px** |
| `padding` | 6px | **9px** | **9px** |
| `border-radius` | 4px | **6px** | **6px** |

Rescales on a variant. Does not compound when nested. Both properties at once — which is
what "skinnable, not just tokenized" means in practice.

### The cost of `*`, measured

A universal selector declaring nine custom properties, median of 5 runs in Chrome:

```
1000 nodes — :root-only 1.4ms   vs   *-block 1.4ms
3000 nodes — :root-only 4.2ms   vs   *-block 4.2ms
```

**No measurable cost.** The `:root`-only arm is not cheaper, and it is the broken one.

### The two rules that keep it un-bitten

1. **A root knob is an ABSOLUTE unit — `px` or `rem`. Never `em`, never `%`.** An `em` root
   re-introduces compounding through the back door.
2. **A derived token is `calc(var(--knob) * <unitless>)` and lives in the `*` block. Never a
   literal, never in `:root`.** A derived token in `:root` freezes and stops responding to
   variants — the exact bug above.

---

## §1 · WHAT WAS MEASURED

Every raw style literal in `src/**` and `tools/*.html`, 2026-08-25. **Counted with Python,
not `grep`** — see [S2 FENCE 4](S2-token-sweep.md#fence-4--grep-silently-skips-chord-modulejs).

| axis | sites | distinct values | **roles** |
|---|---|---|---|
| shape — radius, border width | 134 | 14 | 7 |
| type — size, weight, family, tracking | 218 | 36 | 16 |
| space — padding, gap, margin | 210 | 62 | 10 |
| depth — shadow, opacity | 23 | 15 | 8 |
| motion — transition | 12 | 8 | 3 |
| colour — existing `var(--t, #fallback)` pairs | 300 | — | — |
| **total** | **897** | | **44 + palette** |

897 sites, 15 files. The gap between **62 distinct padding values** and **10 roles** is the
whole argument: nobody chose 62 paddings on purpose. Seats built in parallel across P1–P3
and each picked what looked right in its own file.

**Two existing patterns this must not fight:** surfaces already re-alias colour into a local
namespace (`--kbd-line`, `--grid-line`), and non-colour geometry tokens already exist
(`--shell-gap`, `--roll-row-h`, `--roll-gutter`). This finishes an idea already in the
codebase; it does not import a new one.

---

## §2 · ROOT KNOBS — what a skin actually sets

**These nine lines are the skin.** Everything else derives.

```css
:root {
  /* --- the four dials ------------------------------------------------ */
  --fs-root: 12px;   /* type size.    10px = dense · 16px = projector    */
  --sp-unit: 2px;    /* density.      1.5px = tight · 4px = airy         */
  --r-unit:  2px;    /* roundness.    0 = hard-edged · 4px = soft        */
  --bw:      1px;    /* line weight.  2px = heavy chrome                 */

  /* --- faces --------------------------------------------------------- */
  --font-ui:   system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;

  /* --- motion -------------------------------------------------------- */
  --dur-fast: 80ms;  /* set BOTH to 0ms for a still skin (§9, DAW views) */
  --dur-med:  120ms;
  --ease:     ease-out;
}
```

Plus the palette, which already exists and is unchanged in structure.

---

## §3 · SHAPE — 134 sites → 7 tokens

```css
* {
  --r-cell:  calc(var(--r-unit) * 1);    /*  2px  grid cell, ruler cell, compact key */
  --r-sm:    calc(var(--r-unit) * 1.5);  /*  3px  stepper, degree +/-, roll note     */
  --r-ctl:   calc(var(--r-unit) * 2);    /*  4px  THE control radius       (23 uses) */
  --r-body:  calc(var(--r-unit) * 3);    /*  6px  a device's own body      (14 uses) */
  --r-panel: calc(var(--r-unit) * 4);    /*  8px  outer chrome              (9 uses) */
  --r-lg:    calc(var(--r-unit) * 8);    /* 16px  expanded-variant chrome            */
}
:root { --r-pill: 999px; }               /* a pill is a pill — never scales          */
```

Measured occupancy: `4px`×23 · `6px`×14 · `8px`×9 · `5px`×7 · `3px`×5 · `2px`×3 · `999px`×2 ·
`10px`×2 · `16px`×1.

**D-1 stands:** `5px`×7 folds into `--r-ctl`. Seven elements get 1px rounder; it removes a
token that means nothing.
**D-2 revised by the §0 architecture:** `10px`/`16px` no longer need their own tokens *or* a
variant override — `.ws-expanded { --r-unit: 3px }` moves the whole scale. `--r-lg` exists
for the one 16px chrome that is genuinely a step, not a rescale.

Three compound radii compose from tokens rather than being retyped:
`.cbdaw-kbd__key` → `0 0 var(--r-ctl) var(--r-ctl)` · compact key → `--r-cell` ·
`.cbdaw-roll__vel-bar` → `var(--r-cell) var(--r-cell) 0 0`.

Border width: **61 of 65 borders are 1px** → `--bw`. The two `border-left: 2px solid` are a
deliberate accent marker and stay literal.

---

## §4 · TYPE — 218 sites → 16 tokens

```css
* {
  --fs-micro: calc(var(--fs-root) * 0.667);  /*  8px  compact ruler ticks       */
  --fs-tiny:  calc(var(--fs-root) * 0.75);   /*  9px  compact row labels        */
  --fs-xs:    calc(var(--fs-root) * 0.833);  /* 10px  small labels, pad keys    */
  --fs-sm:    calc(var(--fs-root) * 0.917);  /* 11px  labels          (15 uses) */
  --fs-base:  calc(var(--fs-root) * 1);      /* 12px  body, controls  (17 uses) */
  --fs-md:    calc(var(--fs-root) * 1.083);  /* 13px  buttons         (15 uses) */
  --fs-lg:    calc(var(--fs-root) * 1.25);   /* 15px  key labels                */
  --fs-xl:    calc(var(--fs-root) * 1.667);  /* 20px  titles, readouts          */
}
:root {
  --w-normal: 400;    --w-med: 600;    --w-bold: 700;    --w-heavy: 800;
  --track-title: 0.02em;    --track-label: 0.08em;
  --lh-tight: 1.15;   --lh-base: 1.4;
}
```

Measured: `12px`×17 · `11px`×15 · `13px`×15 · `10px`×11 · `20px`×4 · `15px`×4 · `9px`×3 ·
`8px`×3, then 28 more values at ≤2 uses each.

**The `16/18/22/28/30/32px` sizes are not steps.** Every one lives inside a
`[data-variant="expanded"]` block. Under §0 they become `--fs-root: 16px` on that block —
**one line replaces six sizes**, and it is the single clearest demonstration that the
architecture earns its keep.

**D-4 stands:** keep `--fs-micro` and `--fs-tiny`. Six uses, all in compact variants, and
the projector test in §9 makes 1px matter more at the bottom of the scale than anywhere else.

**D-6 RULED — `--w-heavy: 800` is real.** One use today:
`.cbdaw-circle__text[data-ring="numeral"]`, the roman numeral ring of the scale circle.
Brandon: *"meant to shout."* It is a teaching emphasis, not drift, and it gets a name so a
skin can keep it shouting at a different weight — a skin that flattens 800 into 700 is
flattening the curriculum.

**D-5 stands:** tracking `0.06 / 0.07 / 0.08 / 0.09 / 0.10em` is twelve instances of one
role wearing five numbers. Two tokens.

`--font-ui` absorbs both `system-ui, sans-serif` (×5) and `system-ui, -apple-system,
sans-serif` (×11) — same intent minus a fallback.

---

## §5 · SPACE — 210 sites → 10 tokens *(new; D-7 ruled it in)*

The largest and messiest axis: 62 distinct values, 44 of them padding combinations. It is
also the axis that decides whether a skin can be *dense* or *airy*, so "as skinnable as
possible" makes it mandatory.

```css
* {
  --sp-hair: calc(var(--sp-unit) * 0.5);  /*  1px  grid hairlines   (5 uses) */
  --sp-1:    calc(var(--sp-unit) * 1);    /*  2px                  (11 uses) */
  --sp-2:    calc(var(--sp-unit) * 2);    /*  4px                  (13 uses) */
  --sp-3:    calc(var(--sp-unit) * 3);    /*  6px                  (20 uses) */
  --sp-4:    calc(var(--sp-unit) * 4);    /*  8px                  (16 uses) */
  --sp-5:    calc(var(--sp-unit) * 5);    /* 10px                  (10 uses) */
  --sp-6:    calc(var(--sp-unit) * 6);    /* 12px                   (8 uses) */
  --sp-7:    calc(var(--sp-unit) * 7);    /* 14px                   (9 uses) */
  --sp-8:    calc(var(--sp-unit) * 8);    /* 16px                   (4 uses) */
  --sp-12:   calc(var(--sp-unit) * 12);   /* 24px  expanded chrome           */
}
```

Padding composes rather than getting its own vocabulary: `padding: 4px 9px` →
`padding: var(--sp-2) var(--sp-4)`. **Four values do not sit on the scale** — `9px`, `18px`,
`32px`, `40px` — and get snapped to the nearest step. That is the only place in this spec
where a real visual change is authorised, and every instance must be named in a receipt.

`margin` is 17×`0` and two one-offs. It gets no tokens; `0` stays `0`.

---

## §6 · DEPTH AND MOTION — 35 sites → 11 tokens *(new)*

Small piles, disproportionate skin value: these are what separate a flat skin from a glassy
one, and a lively skin from a still one.

```css
:root {
  /* depth — a flat skin sets both shadows to `none` and is done */
  --shadow-raised: 0 12px 30px rgba(0, 0, 0, 0.55);      /* menus, popovers   */
  --shadow-lifted: 0 -14px 26px -12px rgba(0, 0, 0, 0.75); /* the drawer edge */
  --ring-w: 2px;                                          /* inset focus ring */
  --glow: 0 0 4px;                                        /* + a colour token */

  --op-faint: 0.40;   /* absorbs 0.35 / 0.40 / 0.45 */
  --op-dim:   0.55;   /* absorbs 0.50 / 0.55        */
  --op-mid:   0.65;
  --op-soft:  0.85;   /* absorbs 0.85 / 0.86 / 0.90 */
}
```

Focus rings today are `inset 0 0 0 2px var(--accent | --bg | --warn)`. They become
`inset 0 0 0 var(--ring-w) var(--accent)` — colour still comes from the palette, thickness
from the knob.

Motion is 8 distinct durations spanning 60–150ms, all doing the same job: fast UI feedback.
Two tokens (`--dur-fast`, `--dur-med`) plus `--ease`.

**This directly serves CONTRACTS §9** — *"Standalone views may animate. DAW views stay
still."* With motion tokenised, "stay still" is `--dur-fast: 0ms; --dur-med: 0ms` on the DAW
root, instead of a rule every seat has to remember. It also hands a
`prefers-reduced-motion` skin to whoever wants one, for free.

---

## §7 · THE REMAINING RECOMMENDATIONS

- **D-8 · amend §9 in place.** §9 is titled VISUAL TOKENS and lists only colour. Shape, type,
  space, depth and motion are visual tokens. A second section would split one idea across
  two contract numbers and guarantee drift.
- **D-9 · read globals directly.** Extend a `--kbd-*`-style namespace only where the surface
  already has one *and* a skin would plausibly want that surface to differ. Do not build 15
  namespaces on speculation.

---

## §8 · THE ONE RULE THIS ADDS TO §9

> Never write a colour, a radius, a font size, a weight, a tracking value, a family, a
> border width, a padding, a gap, a shadow, an opacity, or a duration in a surface, an
> instrument, a device, or a visual. Read a token. If you need a value that is not here,
> that is an escalation, not a number.

Same sentence §9 already carries for colour. Same reason. Wider blast radius.

---

## §9 · S1 DONE-CHECK

- Root knobs and the `*` derivation block are written into `ui/tokens.css`, **with no call
  site changed yet.** S1 adds; it does not touch.
- CONTRACTS §9 amended per D-8.
- The app renders **byte-identical** after S1.
- The proof harness at [`docs/scratchpad/nest-proof.html`](../../docs/scratchpad/nest-proof.html)
  reproduces the §0 table in the project's own browser: no compounding, and a variant
  override rescales three levels deep. **If it does not, stop — §0 is wrong and everything
  downstream is built on it.**
- Only then does [S2](S2-token-sweep.md) open.

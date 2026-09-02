# RECEIPT — S1 token vocabulary — 2026-08-31 02:40–02:46 EDT

Spec: [S1-token-vocabulary.md](../S1-token-vocabulary.md) · Consumer: [S2-token-sweep.md](../S2-token-sweep.md)

## FILES TOUCHED — two, as fenced

- [src/ui/tokens.css](../../../src/ui/tokens.css) — edited, +119 / −3
- [Builddocs/skinspecs/token-map.json](../token-map.json) — created

## TOKENS WRITTEN

- expected **50**, actual **50**. Reconciles.
  - §2 root knobs 9 · §3 shape 7 · §4 type 16 · §5 space 10 · §6 depth 8
  - (§6's headline "11 tokens" counts `--dur-fast` / `--dur-med` / `--ease`, which are
    declared once in §2. 44 roles + 6 knobs that are not roles = 50.)
- `:root` 26 new · `*` 24 derived · overlap between them **0** · `calc()` in `:root` **0** ·
  relative unit on a root knob **0**. S1 §0's two rules hold, verified by script.
- Existing 16 colour tokens untouched.

## MAP ENTRIES

- **98** entries · `safe_for_script` **true 63** / **false 35**
- by axis: shape 19 · type 32 · space 27 · depth 16 · motion 4
- every `false` carries a `reason`. 43 of the 50 tokens have call sites; the 7 without are
  the 3 dials, `--ring-w` / `--glow` (they appear inside compound replacement strings), and
  `--dur-fast` / `--dur-med` (blocked, below).

## OCCUPANCY RECONCILED AGAINST S1 §1/§3–§6 — **FAIL, 32 entries**

Counted with Python over 16 style-bearing files (`/usr/bin/grep` for spot checks).
**These are S1's numbers vs the codebase, not opinions. Nothing was reconciled unilaterally.**

RECONCILES: radius 2/4/6/8/16/999px · font-size 8/15/20px · `--w-heavy` ×1 ·
tracking group ×12 · gap 1/8/12/14/16px · the 12 motion sites · depth axis ±1.

MISMATCHES:

| axis | S1 says | measured |
|---|---|---|
| `border-radius: 3px` | 5 | **10** |
| `border-radius: 5px` | 7 | **8** |
| `border-radius: 9px` | not listed | **1** (comp-builder.js) |
| borders 1px / total | 61 of 65 | **70 of 72** |
| `font-size` 9 / 10 / 11 / 12 / 13px | 3 / 11 / 15 / 17 / 15 | **5 / 13 / 20 / 19 / 16** |
| `font-size` 14px, 17px | not listed | **2**, **1** |
| `font-family` two ui spellings | 11 / 5 | **13 / 4** |
| `gap: 2px` · `6px` · `10px` | 11 · 20 · 10 | **14 · 22(+2 padding) · 11** |
| `margin` | 17×0 + two one-offs | **18×0 + seven one-offs** |
| line-height | `--lh-tight: 1.15` | **0 sites at 1.15**; 22 sites at 1 / 1.2 / 1.35 / 1.45 / 1.5 / 1.55 |
| file count | 15 files, 897 sites | **16 style-bearing files** (Brandon's brief said 903) |

## FOUR THINGS BRANDON MUST RULE BEFORE THE SWEEP SCRIPT IS WRITTEN

1. **S1 §4's expanded-variant claim is false as measured.** S1: *"The 16/18/22/28/30/32px
   sizes are not steps. Every one lives inside a `[data-variant="expanded"]` block"* — called
   *"the single clearest demonstration that the architecture earns its keep."* 10 of 13 do.
   **3 do not:** `chord-module.js:418` (30px, no variant block), `chord-module.js:421` (18px,
   `.cm-compact` — the opposite direction), `shell.js:378` (16px, no variant block).
2. **19 `em` font-sizes S1 never counted** (0.5em … 1.5em). §0 rule 1 exists because `em`
   compounds through nesting; these are that exact bug, live, and no token covers them.
3. **The 8 durations are never assigned to the 2 tokens.** Only 80ms→`--dur-fast` and
   120ms→`--dur-med` are self-evident. 60/70/90/150ms are unruled, and 4 declarations use
   `linear`, for which S1 names no easing token.
4. **`padding: 32px 40px` / `28px 36px` (8 sites).** S1 §5 says snap to the nearest step —
   that is `--sp-12` (24px), a −25%/−40% change. All eight are expanded-variant chrome
   (`.ws-expanded`, `.dsam-expanded`, `.dsyn-expanded`), so by §0's own logic they want a
   variant `--sp-unit` override, not a snap. S1 did not carry that context.

Smaller, same shape: `outline: 2px solid` ×7 has no token; off-scale space values 3/5/7/20/22px
have no token and are not on S1's four-value off-scale list; `letter-spacing` 0.01em/0.04em ×4
are outside D-5's five numbers; `box-shadow: inset 0 0 0 1px` ×1 has no thin-ring token.

## GREP USED

`/usr/bin/grep` for greps; Python (`open(...,'rb').decode`) for all counts, per S1 §1 and
S2 FENCE 4. `src/instruments/chord-module.js` reads clean through both — its NUL byte at
line 1624 is intact and untouched.

## S1 §9 DONE-CHECK — line by line

- **Root knobs + `*` derivation block written into `ui/tokens.css`, no call site changed** —
  **PASS.** Additive only; the sole non-declaration edit is the §8 rule sentence in the
  header comment.
- **CONTRACTS §9 amended per D-8** — **NOT DONE, OUT OF LANE.** This seat is fenced to two
  files and `CONTRACTS.md` is not one of them. Hand to whoever owns CONTRACTS.
- **App renders byte-identical after S1** — **PASS by construction.** Custom-property
  declarations that nothing references have no rendering effect, including on `*`. No visual
  property was added or changed.
- **`docs/scratchpad/nest-proof.html` reproduces the §0 table in the project's browser** —
  **NOT RUN.** The harness exists; running it needs a browser and a served page, which is
  outside this seat's lane. Statically the two §0 rules are verified (no `em`/`%` knob, no
  derived token in `:root`, no `:root`/`*` overlap). **S1 says: if it does not reproduce,
  stop — everything downstream is built on §0.** Someone must run it before S2 opens.
- **Only then does S2 open** — **BLOCKED** on the two items above plus the four rulings.

## OPEN QUESTIONS FOR BRANDON

The four rulings above, in that order. Item 1 is the one that changes the shape of the sweep.

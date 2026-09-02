# RECEIPT — DEV BOX — 2026-08-31 04:14 EDT

- knobs discovered: **48**   controls built: **48**   uncovered: **none**
- derived tokens shown read-only: **50**. 48 + 50 = 98, matches handoff-orphans.md.

## DISCOVERY — runtime

CSSOM. Walks `document.styleSheets`, takes every custom property off a rule whose
selector is exactly `:root` (knob) or exactly `*` (derived). The `:root` / `*` split in
tokens.css IS the knob/derived split, so no list is hardcoded — a knob Brandon adds
tomorrow gets a control on reload with no edit to devbox.js.

Verified live in Chrome: `mode` reads `cssom` on all five pages.

Two fallbacks exist and were not needed: a `fetch()` + brace-matching parse of
`link[href*=tokens.css]`, then a console warning and no mount. Nothing is hardcoded.

Control shape is inferred from the declared value:
- `#hex` / `rgb()` / `hsl()` -> colour picker + hex field — 16 knobs
- `<n>px|rem|em|ms|s|%` -> slider + typed entry carrying the unit — 12 knobs
- bare number -> slider (weights 100-900 step 100; <=1 gets 0-2 step 0.01) — 13 knobs
- anything else (font stacks, easings, shadows, `--glow`) -> text field — 7 knobs

The 7 text-field knobs are the honest answer, not a gap: `--shadow-raised`,
`--shadow-lifted` and `--glow` are compound values, `--font-ui`/`--font-mono` are stacks,
`--ease`/`--ease-linear` are keywords. A slider on any of them would be a fake control.

## DERIVED READOUT

Measured, not printed. `getComputedStyle` on a custom property returns the unevaluated
`calc(16px * 1.667)`, which is useless for seeing a scale move. So a hidden probe rack —
two `<i>` per derived token, `width: calc(var(--tok) * 1000)` and
`calc(var(--tok) * 1000px)` — turns each one into a real used width; the length probe
answers for lengths, the unitless probe answers for the six stroke weights. The 1000x
factor is there because layout quantises a used width to 1/64px: at 1x, `--stroke-hair`
read 0.594 instead of 0.6. At 1000x it reads 0.6.

The rack is built once and read in one pass, so a refresh is one style recalc, not 50.
It only refreshes while the derived table is open.

## HIDDEN BEHIND — URL hash

`#dev`. Anywhere in the hash, case-insensitive. `hashchange` mounts and unmounts live, so
Brandon can add `#dev` to a running page without reloading. A student on a plain URL never
constructs the box at all — no DOM, no probe rack, no stylesheet.

Collapsed by default: a small `dev` handle bottom-right. Expanded it is a 340px panel
capped at 78vh with its own scroll, so it does not eat a Chromebook screen. Collapse state
persists.

## PAGES VERIFIED LOADING — all five

Driven with headless Chrome over CDP against `python3 -m http.server` at the project root.
Each page loaded at `#dev`, box expanded, DOM counted:

    wave-synth.html          mounted, 48 rows, 3 toggles, 50 derived, cssom
    overtone-synth.html      mounted, 48 rows, 3 toggles, 50 derived, cssom
    beat.html                mounted, 48 rows, 3 toggles, 50 derived, cssom
    harmony.html             mounted, 48 rows, 3 toggles, 50 derived, cssom
    harmony keeper.html      mounted, 48 rows, 3 toggles, 50 derived, cssom

One import line in `src/ui/shell.js` (`import './devbox.js';`, after the surface imports)
is the whole hookup. All five pages already import shell.js.

## COPY-CSS OUTPUT VALIDATED — yes

Two ways.

1. In-page, every time the button is pressed: the generated text is parsed in a detached
   `<style>`, and the button reports `parses: yes/no` plus the declaration count. If the
   browser drops a line, the readout goes orange and says so instead of lying.
2. Live run: turned `--fs-root` 16px, `--sp-unit` 4px, `--accent` #ff00aa,
   `--font-ui` Georgia, serif, `--lh-base` 1.6, pressed copy. Output:

       /* skin — dev box, 2026-08-31T08:14:38.551Z */
       :root {
         --accent: #ff00aa;
         --fs-root: 16px;
         --sp-unit: 4px;
         --font-ui: Georgia, serif;
         --lh-base: 1.6;
       }

   Reported `5 knob(s) · parses: yes · clipboard: yes`. Saves straight into
   `src/ui/skins/` as a file body.

Only knobs that differ from tokens.css are emitted, and never a derived token — that is
what a skin file is. Clipboard falls back to a hidden textarea + `execCommand`, then to
`console.log`, so the text is always recoverable.

## THE THREE TOGGLES — all shipped

They inject one `<style id="cbdaw-devbox-toggles">` and remove it when all three are off.
No source file is touched.

1. **`--sp-unit` variant override** — shipped, with its own value field (default `4px`).
   Emits `.ws-expanded, .dsam-expanded, .dsyn-expanded { --sp-unit: <value>; }`. This is
   the change the orphans seat measured and refused to make blind; the four descendants
   that double (`.ws-wave-btn` gap, `.ws-stepper` gap, `.ws-adsr-cell` gap, `.ws-root`
   padding) will visibly double the moment it is on.
2. **`.dsam-title`** — shipped. Emits `.dsam-title { display: none }` plus
   `.dsam-expanded .dsam-title { display: block }`, which is exactly the `.ws-title` /
   `.dsyn-title` pattern it is missing. That missing rule is the whole reason the -37%
   compact figure exists.
3. **Snap outliers** — shipped. Outlines the four elements whose em-to-token snap moved
   more than 3%: `.ws-expanded .ws-label` (+11%), `.ws-title` (-6%), `.dsyn-title`
   (-4.7%), `.dsam-title` (-37%). handoff-orphans.md flags these as deliberate but
   unreviewed; an outline is a look, not a change.

Verified live: with all three on, the injected sheet reads exactly as intended.

## PERSISTENCE

`localStorage`, key `cbdaw-devbox:<pathname>` — per page, as asked. Every read and every
write is in try/catch; a guest-mode Chromebook that throws just loses persistence and the
box keeps working. Verified live: overrides, collapse state, derived-table state and all
three toggle flags round-trip through a reload.

## CHROMEBOOK COST

- Sliders write CSS on a 120ms debounce while dragging, and immediately on pointer release
  (`change`). A drag costs at most ~8 root writes/sec, not one per tick.
- Text and hex fields commit on `change` only.
- The derived rack refreshes only while its table is open.
- The box's own CSS uses zero app tokens — hardcoded colours and sizes on purpose, so
  turning `--fs-root` to 32px does not deform the box you are turning it with.
- No framework, no build step, no CDN. One vanilla ES module, ~600 lines, plain functions.

## STOP-AND-REPORTS

None. Every stop condition met: 48/48 knobs have controls, the box loads on all five
pages, copy-CSS parses.

## HOUSE-RULE CONFLICT, DECLARED

A system message in this seat's harness said to prefer Bash (`sed`, heredocs) for file
edits. The seat instruction and Brandon's global rules say Write/Edit so the edits are
visible and where they landed. Followed the house rule: `devbox.js` was written with
Write, the shell.js line with Edit. Bash was used only to read, to serve, and to drive the
browser.

## FILES

- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/src/ui/devbox.js` — created
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/src/ui/shell.js` — one import line, nothing else
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/skinspecs/receipts/receipt-devbox.md` — this file

Harness files, outside the project, not committed:
scratchpad `drive.mjs` (CDP driver), `parsecheck.mjs` (offline knob count), `devbox.mjs`
(syntax check copy).

## TO ADD A KNOB TOMORROW

Add it to `:root` in tokens.css with an absolute unit. Reload. It has a control. Nothing
in devbox.js needs editing unless the value shape is new — in which case `shapeOf()` and
`rangeFor()` near the top are the two functions to touch.

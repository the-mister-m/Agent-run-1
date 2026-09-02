# S5 — SWEEP LEFTOVERS

Written 2026-08-31. Not authorised to run. Runs **after** the harmony tool work.

Seat: Sonnet. Estimated budget 60–90k.
Blocks: S6 (Moog skin). S6 cannot reach a raw site.

---

## 1 · THE COUNT — MEASURED THIS SESSION, NOT INHERITED

Swept `src/` and `tools/`, every visual CSS property, `devbox.js` excluded.

| | |
|---|---|
| Skinnable sites | 1350 |
| Tokenized | 891 |
| Raw | 459 |
| — layout math, stays raw (ruled) | 132 |
| **Actual job** | **327** |

The 327 splits:

- **70** px-valued size / margin / position
- **257** colour, type, border, spacing, misc

Largest raw groups: `padding` 58 · `font` shorthand 37 · `font-size` 21 ·
`background` 18 · `gap` 16 · `text-transform` 9 · `transition` 8 ·
`padding-left` 8 · `stroke-width` 7 · `outline-offset` 7 · `z-index` 6.

The earlier "706 sites / 114 orphans" figure came from a narrower property set.
It is superseded. Use the numbers above.

---

## 2 · BRANDON'S RULINGS, ALREADY MADE

- **px values are skinnable. Layout math stays raw.** `%`, `fr`, `auto`, `vh`,
  `vw` are structure, not appearance. 132 sites are excluded on this rule.
- **`src/ui/devbox.js` is tooling, not product.** 85 raw sites. Never swept.
- **Size uses the existing dials, not new per-site knobs.** His words on the
  choice: a scale is t-shirt sizes; individual knobs is a tailor measuring 189
  seams you will never use.

---

## 3 · THE DIALS ALREADY EXIST

`src/ui/skins/_template.skin.css` names four, and states their reach in its own
words: they *"move EVERY radius, size, padding, gap and border in the app at
once."*

- `--fs-root` — type size
- `--sp-unit` — density
- `--r-unit` — roundness
- `--bw` — line weight

`src/ui/tokens.css` holds 98 declarations: 48 root knobs, 50 derived off them.

**So this job is not building a scale.** It is pointing 327 orphaned sites at
dials that are already there. A raw `padding: 14px` ignores every dial forever
until someone wires it.

---

## 4 · THE TOOL

`Builddocs/skinspecs/sweep.py`, driven by `Builddocs/skinspecs/token-map.json`.

- Dry run is the default. `--apply` writes. `--report <path>` moves the report.
- Verified working this session: it found **0 of its expected 444**, which is
  correct — those 444 are already applied in source.
- `SCAN_FILES` is a hardcoded list at lines 16–35.

### Two stale references it will trip on

- **`sweep.py:30`** lists `"tools/harmony.html"`. That file no longer exists.
  The live file is `tools/harmonyNEW.html`. The script scans a ghost and
  reports nothing, silently.
- **`src/ui/shell.js:64`** carries `href: 'harmony.html'`. The Harmony link in
  every tool menu is dead right now.

Both are named here as found. Fixing them is part of this job only because the
sweep cannot see `harmonyNEW.html` until the first one is corrected.

---

## 5 · THE WORK, IN ORDER

**Pass 1 — extend the map, do not extend the script.**
Add the new source→token pairs to `token-map.json`. The script is proven; the
map is what is short. Any site needing script surgery is a finding, not a fix.

**Pass 2 — dry run, read the report, then apply.**
`python3 Builddocs/skinspecs/sweep.py --report <scratchpad>/dry-run-N.md`
Report every count before writing anything. `--apply` only after the counts are
in front of Brandon.

**Pass 3 — the hand work.**
What no map entry can express. Roughly 70 sites. One at a time, visible edits,
Edit tool not bash.

### Named unknowns — grep, do not assume

- **`src/vis/scope.js` and `src/vis/spectrum.js`: 12 raw, 0 tokenized.** Prior
  notes name 6 of them as canvas font sites. **The other 6 have never been
  identified.** Find out what they are before touching either file.
- **`src/core/clock.js`: 1 raw site.** The only file with a single stray.
  Confirm it is real and not a false positive from the property regex.

---

## 6 · HAZARDS

- **`src/instruments/chord-module.js:1624` contains literal NUL bytes.** Plain
  `grep` treats the file as binary and returns nothing, silently. Use `grep -a`
  on every search in `/src` or your counts are wrong. This has already produced
  one bad count in this project's history.
- `tools/harmonyNEW.html` is the live harmony page. There is no `harmony.html`.
- Do not touch `src/ui/devbox.js`.
- Do not touch the 132 layout-math sites.

---

## 7 · THE PROMPT

Paste from here down.

---

You are a sweep seat on Brandon's Chromebook DAW project.
Root: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1`

Read `Builddocs/skinspecs/S5-sweep-leftovers.md` first. It is your assignment.
Everything you need — the counts, the rulings, the tool, the hazards — is in it.

**Scope: 327 sites. Not 459.** 132 raw sites are layout math and Brandon ruled
they stay raw. `src/ui/devbox.js` is tooling and is never swept.

**Use `grep -a` on every `/src` search.** `chord-module.js:1624` holds NUL
bytes; plain grep silently skips the whole file.

**Report counts before you write.** Dry run, counts to Brandon, then `--apply`.
Not the other way round.

**Edits are visible.** Use the Edit tool. Bash is for grep and for batch script
runs only — Brandon wants to see where each change landed.

Do not explore. Do not correct things you were not asked about. If you find
something real that is outside this spec, write it in your receipt and keep
moving.

Code comments in this project label function and state only. No intent, no
contract citations, no attributions.

Receipt to `docs/reports/`, filename starting with the date. Add your own lines
to `INDEX.md` and `SESSIONLOG.md`. Leave a review for the Closer.

---

## 8 · DONE MEANS

- Raw count measurably down from 459, with the 132 layout-math sites untouched.
- `sweep.py` scans `harmonyNEW.html` and finds it.
- The Harmony menu link works.
- The 6 unidentified `vis/` sites are identified, whatever the answer is.
- Counts reported to Brandon before any write.

# HOWTO — SKIN MEASUREMENT TOOLS

Six scripts. Written 2026-08-31 by the Seat 1 tooling seat, moved here from
session scratchpad the same day.

They exist so nobody has to pay an agent to count. Every number in this
project's skin work should come from these, not from a grep somebody wrote on
the spot.

Run from anywhere — each script hardcodes the repo root.
All six read with `surrogateescape`, so the NUL bytes at
`src/instruments/chord-module.js:1624` do not silently drop that file.

---

## THE PIPELINE

Each feeds the next. Run them in this order.

```
scan_props.py  →  measure2.py  →  diff.py  →  classify.py  →  build_entries.py
   discover        count           gap          decide         write
```

---

## `scan_props.py` — DISCOVER

`python3 Builddocs/skinspecs/tools/scan_props.py`

Prints the distinct **property names** found across the scanned files.

Use it when new code lands. A property name in the output that has no token is
a skinability hole. This is the gate for "skinability built into new code."

---

## `measure.py` — COUNT (superseded)

Every distinct literal `prop: value` declaration with real site counts.
Skips anything already `var()`-based.

**Over-counts.** It reads JS object literals as CSS declarations. Kept for
reference. Use `measure2.py`.

---

## `measure2.py` — COUNT

`python3 Builddocs/skinspecs/tools/measure2.py`

The correct count. Restricts extraction to actual CSS-bearing text — backtick
style blocks, `style.cssText`, `style.textContent`, `<style>` tags — so JS
object literals stop registering as declarations. Canvas `g.prop = value`
assignments are measured separately.

**This is the project's baseline number.** Any earlier figure that disagrees is
inflated by JS false positives, including the 1476 / 919 / 557 and the 327 in
`S5-sweep-leftovers.md`.

Run it after every sweep seat. The raw count drops or it does not.

---

## `diff.py` — GAP

`python3 Builddocs/skinspecs/tools/diff.py`

Compares measured declarations against `token-map.json`. Reports which
(property, value) pairs already have an entry and which are genuinely new.
Compound and pattern-valued entries are matched by membership, so they do not
read as missing.

**This is the completeness test.** It says whether the map is done without
anyone reading the map.

---

## `classify.py` — DECIDE

`python3 Builddocs/skinspecs/tools/classify.py`

Sorts every missing declaration into either a real token — exact `--sp-*` /
`--fs-*` / `--r-*` scale match, or a named new token — or an escalation with
`token: null` and a stated reason.

Prints. Does not write.

**When a new axis is ruled, the ruling goes in here.** Then the parked sites
classify themselves instead of a seat grinding through them one at a time.

---

## `build_entries.py` — WRITE

`python3 Builddocs/skinspecs/tools/build_entries.py`

Assembles the full entry list from the classified output and prints it as a
JSON fragment for review before it goes into `token-map.json`.

Prints. Does not write. A human or a seat pastes the result.

---

## WHAT IS PARKED

Not classified, awaiting Brandon's ruling on a size scale:

- ~35 px `width` / `height` / `min-width` / `max-width` / `top` sites
- ~20 sites in `em` / `ch` units

`--sp-*` is a spacing scale, built for padding / margin / gap composition. It
was not built for element dimensions. No size axis exists.

When that is ruled, the rule goes into `classify.py` and the pipeline handles
the rest.

---

## RELATED

- `Builddocs/skinspecs/sweep.py` — applies the map to source. `--apply` writes,
  default is a dry run, `--report <path>` moves the report.
- `Builddocs/skinspecs/token-map.json` — 393 entries (2026-08-31, skin sweep
  close). 347 carry a token (331 of those `safe_for_script`), 46 are
  escalations pending a Brandon ruling.
- `Builddocs/skinspecs/validate-skin.js` — gates a finished skin file.
- `Builddocs/skinspecs/S5-sweep-leftovers.md` — the sweep spec. Its counts are
  superseded by `measure2.py`.

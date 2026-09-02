# S4 — DEGREE SHADING

Written 2026-08-31. Not today's work. Nothing here is authorised to run.

Owning file: `src/ui/tokens.css` lines 17–23.
Gate: `node Builddocs/skinspecs/validate-skin.js <skin.css>` must exit 0.

---

## 1 · WHAT BRANDON RULED

Verbatim, 2026-08-31:

> "dude, I almost don't want any colors... I'd rather have shades or counters
> (either that, or a way to put the color scheme in and have them change so that
> colorblind isn't an issue, the shading and brightness does the work)"

And earlier the same day, when the seven degree tokens were set to one gray:

> "I want to get rid of all colors"

Scope of that ruling: chord qualities. Not the whole palette.

---

## 2 · CURRENT STATE — MEASURED, NOT ASSUMED

`src/ui/tokens.css` holds **seven** degree tokens. All seven are `#93a1b8`.

| token | line | value | meaning |
|---|---|---|---|
| `--deg-major` | 17 | `#93a1b8` | major triad |
| `--deg-minor` | 18 | `#93a1b8` | minor triad |
| `--deg-dim` | 19 | `#93a1b8` | diminished triad |
| `--deg-altered` | 20 | `#93a1b8` | stack isn't a recognisable triad |
| `--deg-aug` | 21 | `#93a1b8` | augmented triad |
| `--deg-flat5` | 22 | `#93a1b8` | major triad, flat five |
| `--deg-sharp5` | 23 | `#93a1b8` | minor triad, sharp five |

Use counts across `src/` and `tools/`: major 7, aug 7, minor 6, altered 6,
dim 5, flat5 2, sharp5 2.

**The validator only knows five of them.** `validate-skin.js:128` declares
`DEG = ['--deg-major','--deg-minor','--deg-dim','--deg-aug','--deg-altered']`.
`--deg-flat5` and `--deg-sharp5` were added 2026-08-30 with the chord-naming
tables and have never been checked by anything.

---

## 3 · THE GATE, EXACTLY

From `validate-skin.js`:

- `dE(c1, c2)` = `100 * hypot(ΔL, Δa, Δb)` in OKLab. **Lightness is one of the
  three axes.** Hue is not required to pass — it is the axis the original spec
  reached for, not the axis the check measures.
- `MAJMIN_FLOOR = 15` — major vs. minor is a **HARD FAIL** below this, measured
  after simulating deuteranopia, protanopia and tritanopia.
- `DE_FLOOR = 8` — every other pair is a **WARNING**, because A9 gives them a
  redundant glyph (`+` augmented, `°` diminished, `?` altered).
- OKLab `L ≥ 0.55` per degree token — **WARNING** only. Projector gamma.
- `--text` 7:1 on `--panel`, `--text-dim` 4.5:1, `--panel` vs `--line` ≥ 1.5:1.
- The file self-tests its own colour model first and `exit(3)` if the model is
  wrong. Two earlier drafts failed that self-test. Do not edit the model.

**Consequence:** all seven at `#93a1b8` is ΔE 0. It fails today.

**Opening:** a lightness gap of **0.15 or more in OKLab L** between
`--deg-major` and `--deg-minor` clears `MAJMIN_FLOOR` with no hue whatsoever.

---

## 4 · THE JOB

Give the seven degree tokens their meaning through **lightness**, not hue.
Same neutral hue throughout. Brightness carries the information.

### Hard requirements

1. `--deg-major` vs `--deg-minor`: OKLab ΔL **≥ 0.15**, and it must hold after
   all three CVD simulations. Run the validator; do not eyeball it.
2. Every degree token keeps a single shared hue. If the seat introduces a
   second hue to make a gap, the job was not done.
3. The other five pairs should clear `DE_FLOOR = 8` where lightness allows.
   Where it does not, the warning is acceptable **only** for a token that
   carries a glyph.
4. All seven declared. A deleted line is a knob nobody can read.

### Open, and routed to knobs — not to Brandon

Per Brandon's standing pattern: when a seat wants a decision about something he
can see, build the knob.

- Which direction the lightness runs (major bright / minor dark, or reversed) is
  his eye, not the seat's. Wire it.
- The spread between the seven steps is his eye. Wire it.
- `src/ui/devbox.js` is the runtime panel, live behind `#dev` on every tool
  page. It already carries 48 knobs including the pre-existing colour set.

---

## 5 · THE SECOND CHANNEL

The template's yellow↔blue rule exists because hue was the only channel. It is
not the only channel any more.

- **Glyphs.** A9 gives `+` to augmented, `°` to diminished, `?` to altered.
  `--deg-major` and `--deg-minor` carry none. `--deg-flat5` and `--deg-sharp5`
  are unverified — the seat checks whether they render a glyph before assuming.
- **Chord labels.** The 24-row and 6-row chord-naming tables were ruled
  2026-08-30 and fully wired by 2026-08-31, bare-7th rows included. Every cell
  of both tables is live. Names are on screen.

That means the information a student needs is already reaching them in text.
Shading is reinforcement, not the sole carrier. The seat should read the
labelling before choosing how hard the shading has to work.

---

## 6 · WHAT THIS SPEC DOES NOT COVER

- The Moog skin. Separate job, separate spec, runs after the token sweep.
- The 327 remaining raw skin sites. Separate job.
- `--accent`, `--warn`, `--meter-ok`, `--meter-hot`, `--bg`, `--panel`,
  `--line`, `--text`, `--text-dim`. Brandon's ruling was scoped to chord
  qualities. These are not in scope.
- Extending `validate-skin.js`'s `DEG` array to cover `--deg-flat5` and
  `--deg-sharp5`. Named here because it is real. Not authorised here.

---

## 7 · DONE MEANS

- `node Builddocs/skinspecs/validate-skin.js` exits 0 against the palette.
- Seven tokens declared, one hue, lightness separated.
- Brandon has turned the knobs in `#dev` on a real page and said it reads.
- A receipt in `docs/reports/`.

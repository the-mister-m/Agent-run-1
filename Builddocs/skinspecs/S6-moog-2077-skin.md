# S6 — MOOG / 2077 SKIN

Written 2026-08-31. Not authorised to run.
Runs **after** S5 (sweep leftovers) and **after** the harmony tool work.

Seat: Opus. Estimated budget 60–100k.
Depends on: S5 — a skin cannot reach a raw site. S4 — the degree palette.

---

## 1 · BRANDON'S BRIEF — VERBATIM

> "movement, motion, color, and aesthetic of the cyberpunk 2077. Control
> interfact looks and feels like the moog and the API console. There might be
> contrast between the analog and digital, keep the seams simple with subtle
> contrast. Dev box toggles for controlling movement, JS/CSS animations built
> into interactions with the dev toggle to turn those off separate. There will
> be many ways to do this... write down three and then figure out where the core
> principles are to make the job less steps and more effect WITHOUT breaking the
> rest of the prompt and spec"

That is the whole aesthetic brief. It has not been interpreted, expanded, or
paraphrased anywhere in this document, and the seat should not expect it to be.

**References:** `skin picks/` in the project root. Brandon's folder, his
screenshots. **The seat opens them. Nobody upstream of the seat has looked at
them and nobody upstream will.**

---

## 2 · WHAT A SKIN IS — MECHANICALLY

From `src/ui/skins/_template.skin.css`, its own hard rule:

> "this file contains `:root` custom property declarations and NOTHING ELSE. No
> selectors, no new rules, no `!important`, no layout, no JS. The moment a skin
> needs a selector it is not a skin — it is a change to the app."

- One file: `src/ui/skins/<name>.skin.css`. Copy the template, keep every line.
- Loads as a second `<link>` after `src/ui/tokens.css`. Overrides the knobs.
- Making a skin touches **zero** source files.
- Gate: `node Builddocs/skinspecs/validate-skin.js src/ui/skins/<name>.skin.css`
  must exit 0. "It looks great on my screen" is not an appeal.

### The four dials

`--fs-root` type size · `--sp-unit` density · `--r-unit` roundness ·
`--bw` line weight. The template: they *"move EVERY radius, size, padding, gap
and border in the app at once. Nothing else in this file has anywhere near
their reach. Set these first."*

### The motion tokens that already exist

`--dur-fast: 80ms` · `--dur-med: 120ms` · `--ease: ease-out`.
Both durations at `0ms` is a still skin.

---

## 3 · THE SPLIT THIS JOB HAS TO RESPECT

Brandon asked for two things that live in different places.

**Half A — the skin.** Colour, ground, faces, depth, the four dials, motion
durations. All of it is `:root` values in one file. No source touched.

**Half B — the motion.** *"JS/CSS animations built into interactions"* cannot
be expressed as a `:root` value. Animation needs selectors and event wiring.
By the template's own rule, that is **a change to the app, not a skin.**

Two dev-box toggles, per the brief:
1. movement — the skin's motion durations
2. interaction animations — separate, independently switchable off

`src/ui/devbox.js` is the runtime panel, live behind `#dev` on every tool page.
It currently carries 48 knobs.

**Constraint the seat must check before designing Half B:** CONTRACTS §9, cited
in the skin template — *"Standalone views may animate. DAW views stay still."*
The `/tools` pages are standalone views. "Fuck that contract... put toggles in the dev bar 
not only to turn off animations/interactions but also see if we can "remove" them"

---

## 4 · THE PROCESS BRANDON ASKED FOR

He was specific about how, not only what.

- **Two or three passes, not one response.** Think, write it down, come back at
  it. This has worked twice on this project already.
- **Carry the conversation with yourself in your own notes.** Write to a working
  file in `docs/scratchpad/`. Read from it on the next pass. The notes are the
  thread, not held context and not prose aimed at Brandon.
- **Three approaches, then the core principles.** His words: *"write down three
  and then figure out where the core principles are to make the job less steps
  and more effect."*
- **Front-load the logic to reduce the edges.** The sorting and the principle
  work happen before the building, so the build has few special cases. A long
  build full of exceptions means the thinking pass was skipped.
- **No soliloquy.** The receipt is not a defence of a decision philosophy. What
  it is, what it does, what was cut, what is uncertain.

---

## 5 · CONSTRAINTS THAT ARE NOT TASTE

- **Validator exit 0.** It self-tests its own colour model and exits 3 if the
  model is wrong. Do not edit the model.
- **`--deg-major` vs `--deg-minor` is a hard fail below ΔE 15** after CVD
  simulation. See S4 — Brandon ruled these carry meaning by **lightness**, one
  shared hue, no colour. A Moog skin does not get to re-hue them.
- **`--accent` must not be one of the degree hues.** A visual that borrows a
  degree colour teaches a false association.
- **Contrast floors:** `--text` 7:1 on `--panel`, `--text-dim` 4.5:1,
  `--panel` vs `--line` at least 1.5:1.
- **No font loading, no network.** Every stack needs a real fallback — that
  fallback is what the skin actually ships on a school machine.
- **Every knob line stays**, even at default. A deleted line is one nobody can
  read.

---

## 6 · HAZARDS

- `tools/harmonyNEW.html` is the live harmony page. `harmony.html` does not
  exist. S5 fixes the two stale references; confirm they are fixed.
- `src/instruments/chord-module.js:1624` holds literal NUL bytes. Use `grep -a`
  on every `/src` search or the file silently returns nothing.
- Five tool pages share `tokens.css`. Anything landing there lands everywhere at
  once.
- S5 writes `tokens.css`. **Do not run this job concurrently with S5.**

---

## 7 · THE PROMPT

Paste from here down.

---

You are the skin seat on Brandon's Chromebook DAW project.
Root: `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1`

Read `Builddocs/skinspecs/S6-moog-2077-skin.md` first. It is your assignment.
Read `S4-degree-shading.md` and `src/ui/skins/_template.skin.css` before you
design anything.

**Brandon's brief, verbatim — this is the entire aesthetic direction you get:**

"movement, motion, color, and aesthetic of the cyberpunk 2077. Control
interfact looks and feels like the moog and the API console. There might be
contrast between the analog and digital, keep the seams simple with subtle
contrast. Dev box toggles for controlling movement, JS/CSS animations built
into interactions with the dev toggle to turn those off separate. There will be
many ways to do this... write down three and then figure out where the core
principles are to make the job less steps and more effect WITHOUT breaking the
rest of the prompt and spec"

His reference screenshots are in `skin picks/`. Open them yourself. Nobody has
looked at them for you.

**Work in passes, and carry the thread in your own notes.** Write a working file
in `docs/scratchpad/` and read from it on the next pass. Do not hold it in your
head and do not aim it at Brandon.

- Pass 1: look at the references. Write what you see, in the file.
- Pass 2: three approaches, in the file.
- Pass 3: the core principles across those three — fewest steps, most effect.
- Then build, from the principles.

Front-load the logic so the build has few special cases. A build full of
exceptions means the thinking pass got skipped.

**You are not writing your grand soliloquy behind a decision philosophy.** State
what it is, what it does, what you cut, and what you are unsure of. That is the
whole receipt.

If you want a decision from Brandon about something he can SEE, build the knob
instead of asking. `src/ui/devbox.js` is the runtime panel behind `#dev`.
That is a standing pattern on this project.

Two dev-box toggles are required by the brief and are not the same toggle:
movement, and interaction animations, independently switchable off.

**Use `grep -a` on every `/src` search.** `chord-module.js:1624` holds NUL
bytes; plain grep silently skips the whole file.

**Edits are visible.** Use the Edit tool. Bash is for grep only — Brandon wants
to see where each change landed.

The gate is `node Builddocs/skinspecs/validate-skin.js <your skin>` exiting 0.
Run it yourself. Do not hand back a skin you have not gated.

Code comments in this project label function and state only. No intent, no
contract citations, no attributions.

Receipt to `docs/reports/`, filename starting with the date. Add your own lines
to `INDEX.md` and `SESSIONLOG.md`. Leave a review for the Closer.

---

## 8 · DONE MEANS

- A skin file that passes the validator with exit 0.
- The three approaches and the principles that came out of them, written down
  before the build, not reconstructed after it.
- Two working dev-box toggles, independent of each other.
- Brandon has seen it in a browser and said it reads.

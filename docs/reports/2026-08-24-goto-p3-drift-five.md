# RECEIPT — P3 drift, the five mechanical items — `Goto`

Seat: `Goto`, spawned by Brandon 2026-08-24. Opened **21:10 EDT**, receipt written **21:34 EDT**.

Read: [TODO.md](../../TODO.md) · [redpen-report.md](../../Builddocs/P3-harmony-tool/S7-verify/redpen-report.md)
Q1/Q6/Q7/Q9 · [CONTRACTS.md](../../Builddocs/CONTRACTS.md) §15 F4 and §15.10 only.

Read as code: `src/surfaces/piano-roll.js` · `src/surfaces/step-grid.js` ·
`src/surfaces/scale-circle.js` · `src/theory/chord.js` · `src/theory/scale.js` ·
`src/core/capture.js` · `src/instruments/chord-module.js` · `tools/harmony.html` ·
`tools/beat.html`.

**Written: four `/src` files and this receipt. CONTRACTS.md NOT touched. MEMORY.md and
CLAUDE.md NOT touched. None of Brandon's four reserved items touched. The accidental-glyph
rendering and the diatonic-keys label/colour disagreement NOT touched.**

---

## HOW THIS WAS VERIFIED — read this before the items

The project has no build step and no test runner, so I built one for this pass and threw it
away. **jsdom was installed into the session scratchpad, never into the project** — no
`package.json`, no `node_modules`, nothing added under `/Users/.../Agent run 1`. §10's
"add a dependency" clause is intact; confirm with `git status` on the project folder.

Two harnesses, both listed under STRAY FILES:

- `harness.mjs` — stubs `window`/`document`/`AudioContext`, imports the REAL
  `src/surfaces/piano-roll.js` and `src/surfaces/step-grid.js`, drives them, asserts. **24
  assertions, 24 PASS** — 11 on the capture seam, 13 on the grid.
- `before.mjs` — the same stub with `_onCaptureCommit` restored to its pre-fix one-liner, so
  the bug is measured rather than described.

`src/theory/chord.js` is pure and needs no stub — it was driven directly in `node`.

**Verified means a program ran and I read its output. Reasoned means I read source and
argued.** Each item below says which.

---

## ITEM 1 — Capture → PianoRoll duplicated every note on a `'requantize'` commit

**File: [src/surfaces/piano-roll.js](../../src/surfaces/piano-roll.js)** — `_onCaptureCommit`,
plus `_pushNotes` (new), `setNotes`, `_deleteNote`, one constructor field.

**VERIFIED, both directions.**

Pre-fix, measured: two committed takes plus one note the student clicked in = 3 notes on the
roll; one `'requantize'` commit → **5 notes**, the two capture notes each present twice, one
at its old tick and one at its new. Post-fix, same script: 3 → **3**, the requantized note at
its snapped tick 240 and no copy left at 245.

**What it does now.** `_onCaptureCommit` branches on `report.kind`. `'discard'` returns
immediately. `'requantize'` withdraws the notes this seam put on the roll and lets the
restatement take their place. `'record'` and `'capture'` append, exactly as before.

**The second bug I did not introduce.** Replacing the roll wholesale on `'requantize'` —
`setNotes(report.notes)` — is the obvious one-liner and it is wrong: `capture.js` re-states
every note of every TAKE, and knows nothing about the notes a student CLICKED into the roll,
so a wholesale replace deletes them. The roll now keeps a `Set` of the note objects the
capture seam put there, by **object identity**, and withdraws only those. **§7 stays four
fields** — no marker key is written onto a note; the assertion `every note has exactly 4
keys` is in the harness and passes.

Also verified: two `'requantize'` commits in a row are idempotent; a `setNotes()` clears the
bookkeeping so a later requantize replaces nothing it did not put there; `_deleteNote` prunes
the Set so no stale identity is held.

**`redpen-p3`'s Q9 item 8 table is one row short and it does not change the fix.**
`capture.js` emits **four** `kind` values, not three — `_beginTake('record')` at line 731
makes `'record'` a real commit kind alongside `'capture'`. Both are deltas, both append, so
the branch is correct either way; the table is what is incomplete, not the seam.

## ITEM 2 — `step-grid.js` ruler labels sat over the wrong steps past one bar

**File: [src/surfaces/step-grid.js](../../src/surfaces/step-grid.js)** — `_renderRuler` and
`_renderLane`.

**VERIFIED.** At `bars = 2`, 4/4, ruler division 4: ruler beat-groups **8**, ruler cells
**32**, lane DOM cells **32**, `lane.steps.length` **32**. Beat labels across the two bars
read `["1","2","3","4","1","2","3","4"]`, and bar 2's `"1"` sits on the cell whose
`data-step` is 16. Dropping back to `bars = 1` shrinks all of it again.

**I TOUCHED `_renderLane` TOO, AND BRANDON SHOULD KNOW WHY.** The brief says fix the ruler
to match the lanes, where the lanes are `bars × ts.top × division`. That is the **data**
width — `stepsForLane()` — and it is what `_onTick` plays and what the playhead sweeps. It
is **not** what the lane DOM was drawing: `_renderLane` looped `b < ts.top` exactly the way
the ruler did, so at `bars = 2` the second bar **sounded, and had no cell to see it in or
click it with** (`_paintPlayingCells` looked one up by full-pattern index and found nothing).
Widening only the ruler would have put 8 beat-groups of labels over 4 beat-groups of cells —
a worse misalignment than the one I was sent to fix. Both loops now carry `bars`, and they
match group for group. **If Brandon wanted the ruler alone, this is the one line to revert**
(`_renderLane`'s `for (let bar = 0; ...)`), and the misalignment comes back.

`stepLabel(step, division)` is §13.3 verbatim and its `step` is **0-based within the bar**,
so the label is asked for with the within-bar index while the cell is placed at the global
one. Every bar counts `1 2 3 4` again instead of running on to 8. No contract function was
edited or re-implemented.

No CSS change was needed — `.cbdaw-grid__beat` and `.cbdaw-grid__cell` are both `flex: 1 1 0`,
so N groups divide the same 100% the playhead measures against.

**`tools/beat.html` is the only page that mounts a `StepGrid`** and it already exposes
`grid.bars` through its loop-bars control. Its behaviour changes: a 2-bar pattern is now
visible and editable across both bars. That is the fix, not a side effect. **Not verified in
a browser** — I verified it in jsdom against the real module.

## ITEM 3 — `seventhQuality()` now speaks CONTRACTS §15 F4's literal vocabulary

**File: [src/theory/chord.js](../../src/theory/chord.js)** — `seventhQuality`'s doc,
`SEVENTH_CLASS`, `SEVENTH_NAME`'s inner keys. **CONTRACTS NOT EDITED.**

**VERIFIED** by running the real module in `node`. All six of Brandon's ruled names come out
unchanged: C major degrees 1-7 give `Cmaj7 · Dm7 · Em7 · Fmaj7 · G7 · Am7 · Bm7b5`; C
harmonic minor gives `Cm(maj7)` on 1 and `Bdim7` on 7. `seventhQuality` now returns
`maj / min / dim`, and the unruled augmented-plus-seventh pair still falls through to
`E♭+7`, as before.

**Two vocabularies live in that one table and they are NOT the same.** The **outer** key of
`SEVENTH_NAME` is `degreeQuality`'s spelled-out `major / minor / diminished / augmented /
altered` — that vocabulary is load-bearing for §9's colour tokens, `CASE`, `LETTER_SUFFIX`
and two surfaces' `data-quality` CSS, and **I did not touch it**. Only the **inner** key, the
seventh's own interval class, moved to F4's `maj / min / dim`. A note saying so is now in the
file above the table, because the two sitting side by side is exactly how this drifts again.

**Every call site updated: there is one.** `seventhSuffix()`, in the same file. Grep across
`/src` and `/tools` for `seventhQuality`, `SEVENTH_NAME` and `SEVENTH_CLASS` returns nothing
outside `chord.js`. Nothing else consumed the old strings, so nothing else had to change.

## ITEM 4 — `noteBank()`'s two extra fields and its `system` argument

**Code left exactly as it is, per the brief. CONTRACTS §15 NOT EDITED.** Below is the
amendment for Brandon to approve or reject in one read.

### The discrepancy, precisely

§15.10 ([CONTRACTS.md line 3535](../../Builddocs/CONTRACTS.md)) writes the call and the
returned object out field by field. `src/theory/chord.js` ships three things that block is
missing — one argument and two returned fields. All three are **additive**: every call
written against §15.10's literal list still works and still gets the documented object.

| Shipped | §15.10 | What it is |
|---|---|---|
| `system = 'numeral'` argument | not listed | Which of A10's **two** naming systems `chordLabel`/`chordLabelParts` speak. §15.10 lists both fields but never says which system produces them. |
| `chordName` returned | not listed | `'Cmaj7'` — F1's letter head plus F4's suffix, the letter twin of `numeral`. |
| `chordNameParts` returned | not listed | `{base:'C', sup:'maj7'}` — the same string split for A9's superscript. |

**Why `system` is not optional in practice, verified:** `chord-module.js` ships
`chord.system` as a live §2 param (`'numeral' | 'letter'`, its own toolbar button toggles it)
and passes it into `noteBank` on every call — `bank()`, line 877. The contract's own A10
gives two systems; without this argument the note bank can only ever speak one of them, and
the module's toggle would have nowhere to go.

**One honest caveat on the two fields:** `chordName` and `chordNameParts` are returned and
**nothing reads them today** — `chord-module.js` draws `chordLabelParts`. Grep for
`chordName` across `/src` and `/tools` finds no consumer outside `chord.js` itself. They are
correct, they are cheap, and they are the only exit the plain letter name has; but Brandon
should know he is being asked to bless two fields no surface has needed yet.

### PROPOSED §15.10 AMENDMENT — three insertions, nothing removed, nothing reworded

**Insertion 1** — in the argument list, after `offsets = null`:

> `system = 'numeral'` — `'numeral' | 'letter'`, which of **A10**'s two naming systems
> `chordLabel` and `chordLabelParts` speak. §15.10 names both fields and never says. The note
> bank is the numeral device by its own definition ("the logic of the numeral they input")
> and A10's numeral example `III/M6` is the one this section prints, so `'numeral'` is the
> default. Every call written against the pre-amendment list still works and gets it. **To
> change the default: one word.**

**Insertion 2 and 3** — in the returned object, under "the numeral side", between
`numeralParts` and `chordLabel`:

> `chordName` — `'Cmaj7'`. The letter twin of `numeral`, §15.6 · **F1** · **F4**. The slash
> label (`chordLabel`) is the only other letter exit and it is not the same string.
>
> `chordNameParts` — `{base:'C', sup:'maj7'}`. The same name split for **A9**'s superscript,
> from one producer, so the two can never disagree.

**If Brandon rejects instead:** the code change is to delete two lines from `noteBank`'s
return and drop the `system` parameter — and dropping `system` also means deleting
`chord.system` from `chord-module.js`'s §2 params and its toolbar toggle, which is a real
feature loss, not a tidy-up. **I have made neither change.** §15 is append-only and
`spec-scale`'s.

## ITEM 5 — the seven undocumented bind-methods

### `bindState` / `attachState` — COLLAPSED to `bindState`

**Files: [src/surfaces/scale-circle.js](../../src/surfaces/scale-circle.js) (renamed) ·
[src/instruments/chord-module.js](../../src/instruments/chord-module.js) (one comment
reference).**

**`bindState` won, on call sites, counted not guessed:**

| Name | Definitions | Live callers |
|---|---|---|
| `bindState` | 2 — `surfaces/piano-roll.js`, `instruments/chord-module.js` | 2 — `tools/harmony.html` lines 323, 414 |
| `attachState` | 1 — `surfaces/scale-circle.js` | **0** |

Renaming the loser touched one method name and two doc-comment mentions and **broke no
caller, because it had none**. Renaming `bindState` instead would have meant editing three
files and two live wires to land on the name with less support. **No `attachState`
method remains in `/src` or `/tools`** — `grep -a` finds the word three times and all three
are inside the rename note in `scale-circle.js`. Behaviour is byte-identical; only the name
moved.

**`ScaleCircle`'s constructor is untouched.** Its required third `store` argument is
Brandon's item and it still throws exactly as it did.

### The other five — documented, NOT renamed

For P4's `spec-transport` to name in contract. Signatures and behaviour read out of the
shipped source, not from a receipt.

**`bindInput(bus)` — `src/instruments/chord-module.js` ~743**
Takes `core/input.js`'s `input`, or anything with `emitNoteOn`. Stored only if
`typeof bus.emitNoteOn === 'function'`, else `null`. Releases any UI-held voices first.
Returns `this`. **BOUND:** the module's Play button calls `input.emitNoteOn({..., source})`
with the real route that fired, §5's bus fans out to every surface, and the page's existing
`input.on('noteon') → module.noteOn` wire brings the note back. **UNBOUND:** the Play button
calls `this.noteOn` directly — the module sounds, nothing lights. Counterpart `unbindInput()`.
Optional; the unbound path is the DAW case and the headless-test case.

**`bindTargets(rows)` — `src/instruments/chord-module.js` ~698**
`rows` is `[{ id, label, instrument }]`; `instrument` is a §2 instrument, `id` should be its
`static id`. Rows without an `instrument`, and any row claiming the reserved `'self'` id, are
filtered out; `label` defaults to `String(id)`. The `'self'` row is implicit and always first
in the `targets` getter — a caller never supplies it. Releases routed voices, replaces the
list wholesale, re-syncs the UI, returns `this`. Counterpart `unbindTargets()`. **The page is
the only thing that knows which instruments are loaded, so the page hands over the menu's
contents; the module owns the choice** (`route.target`). A page that binds targets AND
forwards from `onNoteOut` triggers the target twice — one or the other, not both.

**`bindCapture(capture)` — `src/surfaces/piano-roll.js` ~832**
Takes a `core/capture.js` instance, or anything with `.on()`. No-op if it has no `on`.
Subscribes `_onCaptureCommit` to `'commit'` and keeps the unsubscribe `capture.on()` returns,
so `dispose()` leaks nothing. Returns `this`. Counterpart `unbindCapture()`, also called from
`dispose()`. `capture.js` is read-only to this surface — subscribed to, never reached into.
**`_onCaptureCommit` now branches on `report.kind`; see item 1 for the four values and what
each does.**

**`getNotes()` — `src/surfaces/piano-roll.js` ~793**
No arguments. Returns a **deep copy** of the roll's notes, sorted by `tick` then `note`, in
§7's four fields — safe for a project writer to hold. Same name and same contract as
`capture.js`'s own `getNotes()` (which carries two metadata keys beyond §7's four); both
files pair it with `toProjectNotes()` for the §7-exact shape.

**`setNotes(notes)` — `src/surfaces/piano-roll.js` ~804**
Replaces the roll's contents. Every entry goes through `toNote()`, which narrows to §7's four
fields and drops anything that will not parse, so a fifth key can never leak back into a save.
A non-array clears the roll. Clears the selection **and, as of this pass, the capture
bookkeeping** (item 1). Re-renders if mounted, returns `this`. `clear()` is `setNotes([])`.
Sibling `addNotes(notes)` appends under the same narrowing and is unchanged for external
callers.

---

## THINGS I FOUND AND DID NOT FIX

Recorded, not acted on. Nobody asked for these.

1. **`src/instruments/chord-module.js` is invisible to `grep`.** Line 1624 embeds a literal
   `NUL` (`\x00`) and `SOH` (`\x01`) inside a template literal, used as join separators in a
   change-detection key. `grep` classifies the file as binary and **skips it silently** —
   `grep -rn bindState src` reports nothing from that file at all. It takes `grep -a` to see
   it. This is not cosmetic: any seat grepping `/src` for a symbol gets a wrong answer with no
   warning, and `redpen-p3`'s own Finding 6 occurrence counts were produced by grep. The file
   is valid UTF-8 and the code works. Fix, if Brandon wants one, is two escape sequences —
   `'␟'`/`'␞'`, or any two characters that cannot occur in an id or a label.
2. **`redpen-p3` Q9 item 8's kind table lists three commit kinds; `capture.js` emits four.**
   `'record'` is missing. Harmless — it behaves like `'capture'` — but the table is what a P4
   seat will read.
3. **`_renderLane` ignored `pattern.bars` too.** Covered in item 2. I fixed it because item 2
   could not otherwise be a fix, and I am flagging it because it is scope I took rather than
   scope I was handed.

---

## SESSION REVIEW — Chromebook DAW / Agent run 1 — 2026-08-24 21:10–21:34 EDT

EDITS
- [src/surfaces/piano-roll.js](../../src/surfaces/piano-roll.js) — `_onCaptureCommit` branches on `kind`; `_pushNotes` + capture-identity Set added
- [src/surfaces/step-grid.js](../../src/surfaces/step-grid.js) — `_renderRuler` and `_renderLane` carry `pattern.bars`
- [src/theory/chord.js](../../src/theory/chord.js) — `seventhQuality` vocabulary moved to §15 F4's literal `dim`/`min`/`maj`
- [src/surfaces/scale-circle.js](../../src/surfaces/scale-circle.js) — `attachState` renamed to `bindState`
- [src/instruments/chord-module.js](../../src/instruments/chord-module.js) — one comment reference to the renamed method
- [INDEX.md](../../INDEX.md) — one SESSIONS line for this receipt (no CODE line: all five edits are to files INDEX already lists)
- [SESSIONLOG.md](../../SESSIONLOG.md) — one entry
- [docs/reports/2026-08-24-goto-p3-drift-five.md](2026-08-24-goto-p3-drift-five.md) — this receipt

STRAY FILES
- `harness.mjs` — jsdom verification harness, session scratchpad, throwaway
- `before.mjs` — pre-fix reproduction of the requantize duplication, session scratchpad, throwaway
- `node_modules/` + `package-lock.json` — jsdom, session scratchpad only, **never in the project**

GOALS DONE
- Item 1 — capture/requantize duplication closed, verified both directions
- Item 2 — step-grid ruler and lanes honour `pattern.bars`, verified
- Item 3 — `seventhQuality` matches CONTRACTS §15 F4's literal strings, verified, one call site
- Item 4 — §15.10 amendment drafted for Brandon, code left as-is, CONTRACTS untouched
- Item 5 — `attachState` collapsed into `bindState`; the other five documented

BRANDON'S TODOS
- Approve or reject the §15.10 amendment above — one read, three insertions
- Decide whether `_renderLane` carrying `bars` stays; it is scope this seat took
- Decide whether `chord-module.js`'s two control characters get replaced

CLOSER REVIEW
- [TODO.md](../../TODO.md) — four bullets are now closed by this pass and should move off the open list: the `step-grid` ruler bullet, the `seventhQuality` bullet, the `noteBank` bullet (as "written up, awaiting Brandon"), the capture/requantize bullet. The seven-bind-methods bullet is half closed — five still need P4 contract text — closer
- [Builddocs/P4-the-daw/S1-spec/A-spec-transport.md](../../Builddocs/P4-the-daw/S1-spec/A-spec-transport.md) — Q12 named seven methods; two are now one. Five to name, and their signatures are in item 5 above — closer
- The §15.10 amendment and the `chord-module.js` control characters are Brandon's, not the closer's

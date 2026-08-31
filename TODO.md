# TODO — Chromebook DAW / Agent run 1

Open threads only. Durable answers live in MEMORY.md; the source questions live in
[open-decisions.md](Builddocs/P0-run-open/open-decisions.md).

**P3 IS REOPENED.** Brandon's 2026-08-31 voicing ruling supersedes 2026-08-24's below — it is
stricter, not a variant. P4/`spec-transport` does not start until a `voicing()` redesign lands.

Live count: **16.** Four ruled or deferred to Brandon, three handed to an agent, three new
from the 2026-08-24 Goto run, one scope question awaiting a yes/no, four new from the
2026-08-25 skin specs session, one new from 2026-08-31 (gain normalization).

## RULED 2026-08-31 — voicing, stricter: NO bass note at all

**Brandon, verbatim (his fifth time saying it):**

> NO bass note, chords voiced mid range so that the bottom voice can be any note and the
> chord isn't muddy. I've said this 5 fucking times.

**This supersedes 2026-08-24's ruling below wholesale.** 08-24 kept a designated inversion
tone at the bottom (the named bass just moved with the inversion). This ruling removes the
concept of a designated bass entirely — no chord tone is pinned to the bottom; any voice can
land there, and the chord is voiced mid-register so it does not muddy regardless of which
tone ends up lowest. `bassOf(v)`/`bassIndex(v)`/slash-label bass framing in `chord.js` and
CONTRACTS §15.9/A10 are all built on the superseded premise.

**Still true from 2026-08-24, folded in below (not superseded):**

> only one note played for each note in the chord, whatever the inversion is put that note
> in the bottom, voice the chord in the middle to accommodate

Also his: *"depending on how many notes are in the chord, place them in a register high
enough where it won't get muddled."* And on naming: *"I don't even tell them about inversion
names, I just tell them they're called inverted to avoid this conversation."* — consistent
with A10, which already banned inversion labels.

**What this replaces.** The shipped `invert(v, n)` rotates `v[0]` up an octave. On an altered
scale `v[0]` is not the lowest pitch, so the slash label names a bass the student never heard
move. That bug is real — but the ruling is bigger than the bug:

- **One note per chord tone.** No doubling.
- **No designated bass tone.** Not the inversion's tone, not index 0 — nothing is pinned to
  the bottom. (2026-08-31, supersedes "the inversion's tone goes to the bottom" below.)
- **Register scales with note count.** A 4- or 5-note chord starts higher so it does not
  muddle. `voicing()` today takes a fixed `octave` argument off `scale.tonic` and does not
  know the count's effect on register.
- **No tone is pinned to the bottom** — 2026-08-31 supersedes the 08-24 draft of this bullet,
  which had the inversion's named tone go to the bottom. There is no designated bass tone now.
- **The whole chord is voiced in the middle** so the bottom voice can be any note without
  muddying. `spread()` already does per-tone octave displacement; it has no floor to work
  against today.

**Owner:** a P3 reopen seat, not P4. **Files:** `src/theory/chord.js` — `voicing()`,
`invert()`, and `spread()`'s relationship to them; `bassOf`/`bassIndex`/slash-label bass
framing need to go, not just move.
**CONTRACTS:** §15.9's "Root position" and "Rotating the bass" blocks are gone (cut
2026-08-31, see [CONTRACTS.md:3464](Builddocs/CONTRACTS.md#L3464)); the "no designated bass"
amendment itself is still unwritten. A10 ([CONTRACTS.md:2241-2450](Builddocs/CONTRACTS.md#L2241-L2450))
still carries slash-label bass framing built on the superseded premise — outside this pass's
scope, still open. §15 is append-only and owned by `spec-scale`; **no seat but `spec-scale`
may write the amendment.**
Source detail: [chord.js:472-485](src/theory/chord.js#L472-L485) (the build seat's own
escalation) and [redpen-report.md](Builddocs/P3-harmony-tool/S7-verify/redpen-report.md) Q6.

## NEW — 2026-08-31 — gain normalization, no hook exists

**Brandon, verbatim:** *"When the players begin new voices/oscillators, the volume increases
too much... somehow we have to program it so that they normalize."*

No normalization exists anywhere in `/src`: `masterGain` ([audio.js:50-51](src/core/audio.js#L50-L51)),
per-instrument `_mixGain`/`_instrumentGain` (wave-synth, overtone-synth, drum-sampler,
chord-module), and `drum-synth.js`'s `_masterGain` are all hardcoded at `1`/`1.0`. Voice
count never reaches a gain calculation anywhere. New code, no hook to extend — not a patch
to an existing normalization path. **Owner and file(s) not yet assigned.**

## Brandon's desk — deferred by him, not blocking, findings attached

- **`positionShift` naming and meaning.** Brandon: *"for the vocab of the file, we attach
  what it's actually shifting: pitchpositionShift, degreepositionShift."* Sitting with it —
  he wants to change/alter/add/reduce beyond the rename. What was found:
  - `keyboard.js` — pitch class 0-11. Rotates what is DRAWN only; the typing map never
    rotates. [keyboard.js:100-102](src/surfaces/keyboard.js#L100-L102) says so in-file.
    → `pitchPositionShift`
  - `diatonic-keys.js` — degree index, `% 7`. The seat knew it diverged:
    [diatonic-keys.js:66](src/surfaces/diatonic-keys.js#L66). → `degreePositionShift`
  - `scale-circle.js` — **not a third meaning. It reads nothing.**
    [scale-circle.js:50](src/surfaces/scale-circle.js#L50). Do stays at 12 o'clock (A3), and
    the circle has no shift concept to rename.
  - **[tools/harmony.html](tools/harmony.html) has no position control at all** — the
    diatonic-keys behavior is unreachable by clicking. The `−`/`+` buttons live on the synth
    pages, drawn by `keyboard.js` lines 514-516.
  - **Keyboard typing rows, as built** ([keyboard.js:81-90](src/surfaces/keyboard.js#L81-L90))
    — Brandon never specified these, and says so:
    lower row / left hand / C4 — `Z X C V B N M , . /`, blacks `S D  G H J  L ;`
    upper row / right hand / C5 — `Q W E R T Y U I O P`, blacks `2 3  5 6 7  9 0`
- **Glyph plumbing and the taste questions.** Brandon: *"I'll look at the glyph plumbing,
  it's agent work but at this point I should have known this was the stopping point and it's
  taste work."* Q1-Q7 in [Glyph and Color Rules.md](Glyph%20and%20Color%20Rules.md). Covers
  TODO's old items 6, 7, 8, 9, 13 — the raw `<i>x</i>` tags on the circle and on
  `harmony.html`, the label/color disagreement on diatonic keys, the duplicated colour map,
  and the sharp/flat italic inconsistency.
- **`setScaleDegree`'s altered flag.** CONTRACTS §15.5's table says the flag stays lit once
  touched; formula F2 in the same contract computes it as `value !== origin` and clears when
  moved back. Shipped code follows F2. **This is CONTRACTS disagreeing with itself** — no
  agent may pick. `src/theory/scale.js`.
- **`ScaleCircle`'s constructor signature.** §12.1 says a surface takes exactly `(el, input)`;
  `scale-circle.js` takes a third `store` and throws without it, `diatonic-keys.js` imports
  the singleton instead. Both land on the same object today under ES module caching, so
  `harmony.html` works — it breaks the first time a P4 seat constructs surfaces generically.
  Untouched by the Goto run, deliberately.

## Skin specs — Brandon's desk, from 2026-08-25

- **Three CVD findings on the shipping palette — MOOT as of 2026-08-31.** `validate-skin.js`
  against [tokens.css](src/ui/tokens.css) had found `minor/altered` at ΔE 1.2 under
  deuteranopia, `dim/aug` at ΔE 1.2 under tritanopia, `major/dim` at 8.0. All seven
  `--deg-*` tokens are now the same color (`#93a1b8`, Brandon's call, chord quality is no
  longer color-coded) — there is no pair left to distinguish. Source, historical:
  [S3-skin-contract.md](Builddocs/skinspecs/S3-skin-contract.md).
- **Whether [chord-module.js:1624](src/instruments/chord-module.js#L1624)'s NUL byte should
  be written `\0`.** Behaviour-neutral, belongs to whoever owns that file, not to a token
  seat — S2 forbids a seat touching it. Related to, not the same as, the existing grep-skips-
  the-file item below.
- **Whether S2 opens now, and at what model tier per lane.**
  [S2-token-sweep.md](Builddocs/skinspecs/S2-token-sweep.md) — 897 sites, 15 files, 9 parallel
  lanes, ready to run once authorised. S1 → S2 → S3 blocked in series regardless.
- **The screenshots, whenever Brandon wants the mockup.** S3's screenshot→skin agent brief
  is written and waiting: [S3-skin-contract.md](Builddocs/skinspecs/S3-skin-contract.md).

## New — from the 2026-08-24 Goto run, found not fixed

- **`src/instruments/chord-module.js` line 1624 embeds literal NUL and SOH characters.**
  `grep` classifies the file as binary and **skips it silently** — `grep -rn bindState src`
  reports nothing from it. **Every occurrence count run across `/src` to date is suspect,
  including `redpen-p3`'s Finding 6.** Highest-value item on this page for anyone auditing.
- **`capture.js` emits four commit kinds; `redpen-p3` Q9 item 8's table documents three** —
  `'record'` is missing. Harmless today; P4 reads that table.
- **`_renderLane` scope taken — awaiting Brandon's yes/no.** Fixing the step-grid ruler alone
  would have put 8 beat-group labels over 4 cells, so the Goto also widened the lane DOM. At
  `bars=2` the second bar was already audible (`_onTick` plays every step) with no cell to
  see or click. Reverting is one `for` line. See [tools/beat.html](tools/beat.html) with a
  2-bar pattern.

## Ask Brandon — not blocking, ask when the moment comes up

- **D-2** (open-decisions.md) — hosting / HTTPS. Brandon answers **between P4 and P5**, once
  he has the Chromebook in hand to test on. Ask then, not before. **Blocks nothing now.**
- **§3's 100 ms lookahead window** — measured on an M4 Max with no audio device, never on a
  Chromebook. Re-check on real hardware at deployment (**A53**). If late notes appear, raise
  the window, never the 25 ms interval. **Hardware task, blocks nothing now.**
- **8 mismatches remain open from `redpen-theory`'s P3/S2 report.** Full text in
  [theory-report.md](Builddocs/P3-harmony-tool/S2-theory-check/theory-report.md), each with
  two options. The curriculum-facing ones matter now that S5 has shipped.
- **Chord spelling past the six ruled 7ths** — numerals at count 4 and 9th chords are still
  unnamed; pitches are correct. Hooks already named in-file: a `NUMERAL_SEVENTH` table
  ([chord.js:319](src/theory/chord.js#L319)) and a `NINTH_NAME` table
  ([chord.js:392](src/theory/chord.js#L392)). Options written up as Q6/Q7 in
  [Glyph and Color Rules.md](Glyph%20and%20Color%20Rules.md).
- **The abandoned agent worktree** — `/Users/moth3rship/Desktop/AI Design/.claude/worktrees/agent-a5e4a0ce31d6945f9`.
  `spec-scale`'s output was copied out of it by hand; Brandon said leave it for now. **Blocks nothing.**

## Build queue — code, from the 2026-08-24 doc sessions

Contract text is written for all of these; the code is not. Ordered as raised, not by
priority.

- **P2-4 / P2-5** — wire the snap-by-input-source rule and the off-grid `tick` field
  (CONTRACTS §13.5/§13.6, amended) into `capture.js` and the grid. Clicks snap by default;
  a performed take does not, and a re-save must not quantize it away.
- **P2-7** — hi-hat choking, built peripheral / removable from the front end.
- **P2-8** — give `drum-sampler.js` a gain param, matching `drum-synth.js` (§11.7).
- **P2-9** — kit picker: kit stays selectable, names itself unavailable at load-attempt
  (CONTRACTS §14.3, amended).
- **D-22** — rebuild `overtone-synth.js` from 8 partials to 12 (CONTRACTS §11.5/§11.1a,
  amended). P1 file, already shipped at 8. `cpuWeight` 21 stays PROVISIONAL until
  `overtone-voice` measures it live.

## Closed — kept as a pointer, not a thread

- **Five P3 drift items — CLOSED 2026-08-24** by a Goto opus seat, verified by running the
  real modules (24 assertions, no browser, jsdom in the session scratchpad only):
  requantize note duplication (`piano-roll.js` `_onCaptureCommit` now branches on `kind`);
  the step-grid ruler ignoring `pattern.bars`; `seventhQuality()` now returns F4's literal
  `dim`/`min`/`maj`; `noteBank()`'s §15.10 amendment drafted with code untouched;
  `attachState` collapsed into `bindState` on counted call sites, other five bind-methods
  documented for `spec-transport`.
  Receipt: [2026-08-24-goto-p3-drift-five.md](docs/reports/2026-08-24-goto-p3-drift-five.md)
- **P2-3** — `audio.js` receives `clock.schedulerLoad` via `governor.reportSchedulerPass()`.
  **Applied 2026-08-24, closer-verified directly against source.** Done.
- **D-1 / D-15** — the twelve scales. **CLOSED 2026-08-24.** CONTRACTS §4 `[AMENDED]`.
- **P2-6** — `clock.js`'s 8 undocumented members. **CLOSED 2026-08-24.** CONTRACTS **§3**.
- **D-26** — survive as long as possible. Answered in open-decisions.md.
- **§14.1's eight drum labels** — **CLOSED 2026-08-24.** CONTRACTS §14.1 `[AMENDED]`.
- **D-16** — fixed do or movable do. **SUPERSEDED 2026-08-24** — movable do. CONTRACTS §15 A2.
- **M-10 / M-14** — **CLOSED 2026-08-24.** M-10: diatonic keys stay plain digits, circle keeps
  `1/8`. M-14: `--deg-aug` added to CONTRACTS §9, `scale.js` updated.
- **P3/S1, P3/S2** — theory spec written and checked. **CLOSED 2026-08-24.**

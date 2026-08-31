Updated 2026-08-31 — Closer

# MEMORY — Chromebook DAW / Agent run 1
Rules: GLOBAL-RULES.md. Closer-only file. Lean: no superseded history.

## PROJECT
- Name: Chromebook DAW — Agent run 1
- Purpose: build a browser-based DAW spec'd for Chromebook hardware limits
- Stack / entry point: P1 + P2 shipped real /src — see [tools/wave-synth.html](tools/wave-synth.html), [tools/overtone-synth.html](tools/overtone-synth.html), [tools/beat.html](tools/beat.html)
- Runs: static file server, no build step — open the /tools pages directly
- Key paths: [BUILDPLAN.md](Builddocs/BUILDPLAN.md) · [CONTRACTS.md](Builddocs/CONTRACTS.md) · [ROSTER.md](Builddocs/ROSTER.md) · [P2-beat-tool/](Builddocs/P2-beat-tool/)

## LAST WEEK — 2026-08-20 → 2026-08-24
- 08-20: run planned — BUILDPLAN, CONTRACTS, ROSTER written.
- 08-22: P0 closed — CONTRACTS §1–10 confirmed and amended (CPU cost table corrected; reverb was priced at 8, measured ~247).
- 08-23: P1 closed same day as P2. P1: Wave Synth + Overtone Synth ship, 2 real bugs found and fixed (frequency-readout error, voice-steal race). P2: Beat Tool ships (`tools/beat.html`), 5 integration bugs found and fixed via repair seats, clean audit.
- 08-24 AM ("P2 doc close"): documentation-only session, no build. Brandon ruled on 8 of P2's 9 open decisions plus outside-P2 item D-22; every ruling with a contract consequence written into CONTRACTS.md. Build queue for the rulings logged in TODO.md. P2-6 left unanswered.
- 08-24 PM ("P3 unblock"): Brandon ruled the two remaining blockers on P3's desk — **D-1/D-15** (twelve scales) and **P2-6** (clock.js's 8 members) — both written into CONTRACTS.md. P2-3's CPU-meter patch applied to `src/core/audio.js` + `src/ui/shell.js`, closer-verified directly against source. Nothing blocks the next warm start.
- 08-24 PM2 ("P3 S1+S2"): P3 itself moved. `spec-scale` (S1) wrote CONTRACTS §15 Theory in
  full; Brandon ruled all 15 of its open decisions in one pass, including **reversing D-16**
  ("FIXED FUCKING DO" → movable do). `redpen-theory` (S2) checked §15 against the curriculum:
  **PASS**, no error in the colour rule or numeral-case rule, 16 mismatches found (3 repaired
  same session, 3 closed by the Troubleshooter, 10 left for Brandon, none blocking).
  **S3 (scale-engine) and S4 (chord-engine) are clear to start.**
- 08-24 PM3 ("P3 S3-S6"): **P3 (Harmony Tool) build fully closed** — all six seats.
  `scale-engine`, `chord-engine`, three parallel S5 surfaces (`scale-circle`,
  `diatonic-keys`, `piano-roll`), and `chord-module` + `tools/harmony.html` ship.
  `core/state.js` (named in CONTRACTS §1 since P0, never built) built for real mid-session,
  all three surfaces rewired to it. 61/61 done-check in real Chrome. Three Brandon rulings
  written into CONTRACTS: M-10, M-14 (`--deg-aug`), F4 (six 7th-chord letter names).
- 08-24 PM4 ("P3 verify"): `test-p3` then `redpen-p3` ran S7 in series. Both stop conditions
  cleared, P3's build confirmed closed and correct against contract. 14 drift items (incl.
  the `invert()` bug test-p3 independently reproduced) sorted into TODO.md under four
  buckets. `state-seam`'s chartered lane crossing left ROSTER.md and S5's STAGE.md stale —
  both corrected; `tokens.css`'s misleading comment fixed; Q12 added to P4/`spec-transport`'s
  brief. A `Goto` second opinion on the sort was not acted on (Brandon's call).
- 08-24 PM5 ("P3 drift, five items", ≈21:06–21:21 EDT): a `Goto` Opus seat closed 5 of S7's
  14 drift items for real in `/src`, each verified by running the actual module (jsdom
  harness built and thrown away, session scratchpad only — no project `package.json` or
  `node_modules`, closer-confirmed): capture/requantize note duplication, step-grid ruler +
  lane bar count, `seventhQuality` moved to F4's literal vocabulary, `attachState` collapsed
  into `bindState` on counted call sites, and a §15.10 `noteBank` amendment drafted
  (unapplied — §15 is `spec-scale`-only). Found, not fixed: `chord-module.js` line 1624
  carries literal NUL bytes, so plain `grep` silently treats the file as binary and returns
  nothing from it — every prior `/src` occurrence count, including redpen-p3 Finding 6, is
  suspect until re-run with `grep -a`. Also found: `capture.js` emits a 4th commit kind
  (`'record'`) missing from redpen-p3's Q9 table.
- 08-24 PM6 ("P3 reopen", ≈20:47–21:59 EDT): Brandon ruled chord voicing, verbatim: "only
  one note played for each note in the chord, whatever the inversion is put that note in the
  bottom, voice the chord in the middle to accommodate" plus register scales with note count
  so it doesn't muddle. **This reopens P3** — it is a `voicing()` redesign in `chord.js`, not
  the `invert()` patch redpen-p3 offered. CONTRACTS §15.9's "Root position"/"Rotating the
  bass" blocks are now stale against it; §15 stays append-only, `spec-scale`-only to amend.
  `positionShift` naming ruled (`pitchPositionShift`/`degreePositionShift`) but the wider
  question sits with Brandon. Brandon called the assessment stop himself rather than
  starting P4.
- 08-25: Skin specs written (S1 token vocabulary RULED, S2 mechanical sweep spec, S3 skin
  contract + screenshot→skin brief) — no code touched, S1→S2→S3 blocked in series, none
  authorised. Harmony/contracts drift also fixed same day (3 of 6 divergences; see below).
- 08-30 ("9th-chord naming"): Brandon ruled the full 24-row (root+3rd+5th+7th+9th) and 6-row
  (triad) chord-naming tables. All 24+6 wired same session — two new quality buckets
  (`flatFive`/`sharpFive`) added to `scale.js`/`chord.js`; two new circle color tokens added,
  flagged (not independently CVD-validated to the `--deg-aug` bar). Receipt:
  [2026-08-30-goto-p3-chord-naming.md](docs/reports/2026-08-30-goto-p3-chord-naming.md).
- 08-31 ("Keyboard QWERTY relayout"): one-hand layout replaces the two-hand map;
  `buildQwertyMap(positionShift)` generator replaces 7 hand tables; key lighting moved from
  pitch class to exact note. Brandon overrode a flagged CONTRACTS §5 conflict (§5 text NOT
  amended — still stale against shipped code). **Never test-run** — offered twice, declined.
- 08-31 ("Chord naming, bare-7th close"): count-4 (bare 7th, no 9th) rows for
  `flatFive`/`sharpFive` ruled and wired — every cell of both 08-30 tables now wired. CVD
  palette failure left open, explicitly Brandon's, explicitly later.
- 08-31 ("Colors/contracts", this close, ends 06:10Z): all seven `--deg-*` chord-quality
  colors set to one gray (`#93a1b8`) — Brandon: "I want to get rid of all colors," scoped to
  chord qualities. CONTRACTS §15.9's stale voicing prose deleted outright, not amended.
  Chord-file comments stripped of § citations/attributions. Brandon also ruled voicing
  stricter than 08-24 (below, now superseded) and named gain normalization as unbuilt — see
  the current warm start. Session agent conduct issues recorded, not detailed here — see
  [2026-08-31-session-review-colors-contracts.md](docs/reports/2026-08-31-session-review-colors-contracts.md).

## WARM START — 2026-08-25 — Harmony/contracts drift: 3 fixed, 3 owed to P4
- Situation: Brandon asked what in `tools/harmony.html` did not line up with CONTRACTS.md.
  Six divergences found. He ordered three fixed now and the rest carried into P4's contract
  work. He explicitly declined the sixth (§4's "owns its own scale" wording vs the
  `core/state.js` singleton) — **do not re-raise it.**
- Last state: three fixes applied to [src/ui/shell.js](src/ui/shell.js), none to
  `harmony.html`. (1) `TOOLS` harmony row flipped `available: true`, so Harmony is reachable
  from every other page's Tool menu instead of only by URL. (2) `createScaleControl()` no
  longer holds its own private `{tonic, degrees, name}` — it takes the §4 store (defaults to
  `core/state.js`'s `state`), writes through `setScaleTonic`, redraws on `store.on('scale')`,
  and spells the tonic with `theory/scale.js`'s `spellingOf` instead of P1's
  `PLACEHOLDER_LETTERS`. Returned shape `{el, scale, on, dispose}` is unchanged; `ToolShell`
  needed no edit. (3) `registerSurface()` is now actually called for `diatonic-keys` and
  `scale-circle`, so the surface switcher offers three surfaces instead of one everywhere.
- Next move — **P4's build contracts must absorb two items §1–§15 never named:**
  1. **The three bind methods.** `chord-module.js` ships `bindState(store)`,
     `bindTargets(rows)` and `bindInput(bus)`, and its own header admits §2 does not name
     them (§10 forbids inventing an interface). `piano-roll.js` and `scale-circle.js` set
     the same pattern with `bindState`. P4 hoists the scale through `bindState`, so P4's
     section has to write all three into the contract before it builds against them.
  2. **Surfaces carry mount methods §12.1 does not have.** §12.1's Surface is
     `constructor(el, input)` · `mount(el)` · `unmount()` · `dispose()`. All three P3
     surfaces also ship `mountCompact()` / `mountExpanded()`, and `ScaleCircle` takes a
     **third** constructor argument (the §4 store, defaulted). Runtime is fine; the contract
     is behind the code. Widen §12.1 or record the exception.
- Also noted, not acted on: `tools/harmony copy.html` is a stray duplicate of
  `tools/harmony.html` sitting in the tools folder. Brandon has not ruled on it.
- Links: [tools/harmony.html](tools/harmony.html) · [src/ui/shell.js](src/ui/shell.js) ·
  [CONTRACTS.md](Builddocs/CONTRACTS.md) §2 · §4 · §10 · §12.1 · §15

## WARM START — 2026-08-25 — Skin specs written, none of the work started
- Situation: Brandon asked if screenshots could become a new skin; scope reset mid-session to
  "make these specs so the app is as skinnable as possible... give an agent screenshots and
  they can make me a mockup skin." Three specs now exist under `Builddocs/skinspecs/`: S1
  (token vocabulary, RULED), S2 (mechanical sweep spec), S3 (skin file contract +
  screenshot→skin brief — not in the original ask).
- Last state: **the specs are written, none of the work in them has begun.** No token exists
  in `src/ui/tokens.css`. Nothing swept, nothing re-skinned. `validate-skin.js` (S3's gate)
  and `src/ui/skins/_template.skin.css` are the only things that run — template passes the
  gate with 3 CVD warnings. Do not assume tokens exist when resuming.
- Next move: S1 → S2 → S3 run strictly in series, none authorised yet. Brandon decides
  whether S2 opens and at what model tier per lane.
- Note, 2026-08-31: TODO's three `--deg-*` CVD findings (minor/altered, dim/aug, major/dim)
  are now **moot** — all seven `--deg-*` tokens are one gray, chord quality is no longer
  color-coded. Does not touch S1/S2/S3's own scope (accent/meter/panel tokens, WCAG, etc).
- Links: [TODO.md](TODO.md) "Skin specs" section ·
  [2026-08-25-skinspecs.md](docs/sessions/2026-08-25-skinspecs.md) ·
  [2026-08-25-closer-skinspecs.md](docs/reports/2026-08-25-closer-skinspecs.md) ·
  [S1](Builddocs/skinspecs/S1-token-vocabulary.md) · [S3](Builddocs/skinspecs/S3-skin-contract.md)

## WARM START — 2026-08-31 — Voicing still unbuilt (stricter now); gain normalization new; P4 blocked
- Situation: P3 stayed reopened through 08-30/08-31's chord-naming and color/contracts work —
  none of it touched `voicing()`. Brandon's voicing ruling got **stricter** this close: "NO
  bass note, chords voiced mid range so that the bottom voice can be any note and the chord
  isn't muddy. I've said this 5 fucking times." This supersedes 08-24's ruling wholesale —
  08-24 kept a designated inversion tone at the bottom; 08-31 removes the concept of a
  designated bass entirely. Full text: [TODO.md](TODO.md) "RULED 2026-08-31" section.
- Last state: `voicing()`/`invert()`/`spread()` in `src/theory/chord.js` are **still
  root-position**, `invert()` still rotates the bass up — untouched since 08-24. This close
  removed chord-quality color (`--deg-*` all one gray) and cut CONTRACTS §15.9's stale
  "Root position"/"Rotating the bass" prose outright (not amended — no replacement written;
  §15 stays `spec-scale`-only). A10 ([CONTRACTS.md:2241-2450](Builddocs/CONTRACTS.md#L2241-L2450))
  still carries slash-label bass framing built on the superseded premise, out of this pass's
  scope. New this close, also unbuilt: **gain normalization** — Brandon: "When the players
  begin new voices/oscillators, the volume increases too much... somehow we have to program
  it so that they normalize." `masterGain`/`_mixGain`/`_instrumentGain` are hardcoded at 1
  everywhere in `/src`; voice count never reaches a gain calculation; no hook to extend.
  `chord-module.js:1624`'s NUL bytes still make plain `grep` skip the file silently — use
  `grep -a` on any `/src` audit.
- Next move: spawn a P3 reopen seat to redesign `voicing()`/`spread()` around no-designated-
  bass, mid-register voicing (chord.js: `bassOf`/`bassIndex` and CONTRACTS' bass framing need
  to go, not move) — **and** a seat to design gain normalization from scratch (no existing
  hook). Also carried, not yet acted on: `diatonic-keys.js` never checked on screen since its
  colors went uniform; `keyboard.js`'s 08-31 relayout never test-run.
  **P4/`spec-transport` does not start until voicing lands.**
- Links: [TODO.md](TODO.md) "RULED 2026-08-31" + "gain normalization" sections ·
  [2026-08-31-session-review-colors-contracts.md](docs/reports/2026-08-31-session-review-colors-contracts.md) ·
  [chord.js](src/theory/chord.js) · [CONTRACTS.md](Builddocs/CONTRACTS.md) §15.9 · A10
- Links: [TODO.md](TODO.md) "RULED 2026-08-24" section ·
  [2026-08-24-goto-p3-drift-five.md](docs/reports/2026-08-24-goto-p3-drift-five.md) ·
  [2026-08-24-session-review-p3-reopen.md](docs/reports/2026-08-24-session-review-p3-reopen.md) ·
  [redpen-report.md](Builddocs/P3-harmony-tool/S7-verify/redpen-report.md)

Updated 2026-09-01 — Closer, arrange rebuild close

# MEMORY — Chromebook DAW / Agent run 1
Rules: GLOBAL-RULES.md. Closer-only file. Lean: no superseded history.

## PROJECT
- Name: Chromebook DAW — Agent run 1
- Purpose: build a browser-based DAW spec'd for Chromebook hardware limits
- Stack / entry point: P1 + P2 shipped real /src — see [tools/wave-synth.html](tools/wave-synth.html), [tools/overtone-synth.html](tools/overtone-synth.html), [tools/beat.html](tools/beat.html)
- Runs: static file server, no build step — open the /tools pages directly
- Key paths: [BUILDPLAN.md](Builddocs/BUILDPLAN.md) · [CONTRACTS.md](Builddocs/CONTRACTS.md) · [ROSTER.md](Builddocs/ROSTER.md) · [P2-beat-tool/](Builddocs/P2-beat-tool/)

## LAST WEEK — 2026-08-20 → 2026-08-31
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
- 08-31 ("Skin sweep", 02:10–04:19 EDT): the 08-25 skin specs finally got built. Four seats
  in series — S1 vocabulary (50 tokens, occupancy FAIL on 32 entries vs its own spec, 4
  blocking rulings), sweep script (dry-run 444/444, no source written), orphans (applied
  444 + named 27 more, stopped at Brandon's 200k ceiling with 114 declarations left),
  dev box (48-knob runtime panel, live in Chrome over CDP). Brandon overrode S1 mid-run —
  "if S1 blocks a knob, make the knob" — turning 109 forbidden sites into knobs/toggles
  instead of decisions routed to him. 505 of 706 sites tokenized; 2077 Moog skin not
  started, Brandon called the session before it. See the current warm start.
- 08-31 ("Harmony passes A-D", 13:15–14:59 EDT): Comp Builder took over the Chord Module's
  role on `harmonyNEW.html` — `ChordModule` import/mount/panel/bind deleted, Routing Targets
  became **Engine** (Wave/Overtone tabs, both mounted, switch toggles `hidden`). Chord naming
  rewired to read the intervals actually sounding (`qualityOfStack` family in `chord.js`,
  `qualityOfIntervals` in `scale.js`) so bent chords get real names; `faaaancy` covers
  everything outside the tables. The octave-floor knob (`setOctave`) shipped — no bass note,
  bottom voice set by the knob, everything else voiced by drag-to-comp. Scale circle overlay
  cut to letter/solfege. 24/24 table rows + regression verified in `node`; no browser
  click-through. Receipt: [2026-08-31-goto-harmony-passes-a-d.md](docs/reports/2026-08-31-goto-harmony-passes-a-d.md).
- 08-31 ("Scale builder + comp independence", ~16:51–17:15 local): Brandon asked how hard a
  scale generator would be to bolt on after the fact; it became a build. RULED: **tonal
  center** (pitch-class variable) and **key** (its letter label) are not interchangeable;
  the Comp Builder's tonal center is independent of the project's by default, togglable to
  follow it. A no-match scale reads `Faaaancy <origin>`; the `+/-` fence anchors to the
  chosen mode, not Major. `EXTRA_NAMES` still ships empty — naming is D-1, Brandon's alone.
  Nothing run or tested. A mid-session instruction pushed Bash-only reads/edits against
  Brandon's rules — same pattern this closer also hit; Brandon's rules were followed both
  times. Receipt: [2026-08-31-goto-scale-builder-comp-independence.md](docs/reports/2026-08-31-goto-scale-builder-comp-independence.md).
- 08-31 ("Beat tool rework", 17:07–18:06 EDT): `tools/beat.html` stripped down to grid +
  Drum Synth — Record, the Play panel, and the Drum Sampler all removed; live monitor is now
  the single bus-to-sound path (1514 → 762 lines). `.bt-top` raised to `--z-popover`, fixing
  the transport/nav dropdown stacking bug. `drum-synth.js` rebuilt: eight slots renamed
  (kick, snare, closed hat, open hat, efx1, drum1, drum2, ride); pads render in home-row key
  order with their letter on the face; a switch-hands toggle (off by default) keeps kick and
  closed hat under the index fingers in both layouts; presets picker + 8 per-drum sample
  pickers ship display-only; parameter stack collapsed behind one disclosure. Both files
  parse and the module graph resolves — **nothing loaded in a browser.** Receipt:
  [2026-08-31-goto-beat-tool-rework.md](docs/reports/2026-08-31-goto-beat-tool-rework.md).
- 08-31 ("Skin sweep, tokenization close", ≈18:19–00:02): Brandon's mid-session ruling
  that everything tokenizes except `devbox.js` reopened the sweep from a substitution
  pass to full tokenization. Eleven seats: measurement tooling rebuilt (fail-loud
  assertions replace three silent-zero bugs, incl. `_fade()`'s regex never matching),
  `token-map.json` regenerated to 393 entries, `tokens.css` 113→262 tokens, 823
  substitutions applied via `sweep.py --apply`. Closed at 22 raw sites, all named, 16
  behind an escalation ruling. See the current warm start.
- 08-31 ("P4 build — the DAW", 21:26–23:58 EDT): P4 built end to end — S1 spec through
  S5 automation/governor, six-way parallel plus four follow-on fix passes. CONTRACTS §16
  appended (829 lines); 85 tokens + `--angle-vertical` written into `tokens.css`. 14 new
  `/src` files, `index.html`, `tools/patch-synth.html`. The sixth instrument (patch synth)
  built, patched by hand, and heard. S6-verify has not run — Brandon's gate sits first.
  See the current warm start.
- 09-01 ("DAW integration", 01:19–03:10 EDT): Brandon opened `index.html` and found four
  panes black — no redpen needed, grep confirmed a missing integration pass, not a bug.
  `wireDawShell()` extended to mount mixer strips, routing graph, arrangement, and
  automation lanes; `test-p4` then ran ten seat questions headed against the live app.
  Phase done-check FAILS: `wireDawShell()`'s `instrumentCtor` param is dead, zero
  instruments ever mount on any channel — a regression `shell-cleanup` introduced.
- 09-01 ("devsplash", two spans, ≈14:20–15:25 EDT): `tools/dev-splash.html` built from
  nothing to spec-complete — one page to view every built DAW piece alone (37 rail rows)
  and assemble candidate layouts (the Matrix: split/merge tree, per-slot channel picker,
  localStorage persistence, "1×1"/"2×2"/"DAW-ish" presets, copy-JSON). Span 1 (items 1-8)
  then span 2 (items 9-10) in series, both verified headed in real Chrome. §11 all 10 items
  done, §12 done-check all true, zero `src/` edits beyond the three pre-existing `daw-shell.js`
  exports (closer-verified against source). Two open items are Brandon's, not resolved:
  the note bus dispatches ch1 only, and a refused mount pair still logs `console.error`.
  See the current warm start.
- 09-01 ("arrange rebuild", 20:24–21:09 EDT): Brandon said the arrange window was no good.
  Grep found the actual defect — each lane mounted a live `PianoRoll`/`StepGrid`, so the
  arrange ruler and the surface's own ruler were two unrelated timescales stacked (the
  "2 beats worth of notes" report). Phases A-C of a five-phase rebuild shipped: zoom
  25-800%, ruler click/drag seek wired for the first time (self-correction — `_wireHandle`
  never seeked, only moved LOOP markers), lanes now draw region blocks off a new store
  (`src/core/regions.js`), plus a Logic-style cycle strip Brandon asked for mid-session.
  Phases D and E handed to a sonnet; E grew into
  [SPEC-unlimited-tracks.md](docs/specs/SPEC-unlimited-tracks.md), D stayed unspecced.
  See the current warm start.

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

## WARM START — 2026-08-31 — Skin sweep: tokenization done except devbox.js, 22 sites left on rulings
- Situation: Brandon ruled every literal in the app tokenizes except
  `src/ui/devbox.js`, voiding every prior seat's escalation reasoning and widening the
  job from a substitution pass to full tokenization. Eleven seats ran this close.
- Last state: 844 raw CSS sites → **22** (17 distinct declarations), 823 substitutions
  applied via `sweep.py --apply`, idempotent, arithmetic closed at every step.
  `tokens.css` 113 → 262 tokens. `token-map.json` 393 entries, **347 tokened** (331
  `safe_for_script`), 46 escalations — the review's own "380 tokened" was a miscount,
  corrected here from a direct count of the file. Canvas (73 sites) and `_fade()`
  (8 sites) unchanged, out of scope — not CSS.
- Next move: Brandon's four rulings (min-width 260px ×2, inset -8px, margin-left -2px)
  and sixteen escalation sites (font-size 16/18px, gap 3/7/22px, padding 20px,
  stroke-width 0.6-2) — both lists in [TODO.md](TODO.md). Then the canvas
  `getComputedStyle` wiring in `src/vis/` (73+8 sites, not substitution), and the
  dial-alignment pass — 262 tokens are flat literals, not scales driven by a dial;
  Brandon wants to see what the dials currently do before this is scoped.
- Durable: the seam-scoping lesson from this session (assertions in scripts, not
  instructions in prompts) — [sweep-progress.md](docs/scratchpad/sweep-progress.md).
- Links: [session review](docs/reports/2026-08-31-session-agent-review-skin-sweep.md) ·
  [closer receipt](docs/reports/2026-08-31-closer-skin-tooling-close.md) ·
  [tokens.css](src/ui/tokens.css) · [token-map.json](Builddocs/skinspecs/token-map.json) ·
  [sweep.py](Builddocs/skinspecs/sweep.py)

## WARM START — 2026-08-31 — Scale builder shipped, comp builder independent, page unclicked
- Situation: Brandon asked how hard a scale generator would be to bolt on after the fact; it
  became a build across `scale.js` + `harmonyNEW.html`, ruled over several passes.
- Last state: no-match scale reads `Faaaancy <originName>` (`EXTRA_NAMES` empty — D-1,
  Brandon's alone); `setScaleDegree` fences ±2 off the chosen mode via `originDegrees()`, not
  Major, and refuses a pitch class another degree already holds. Scale circle panel is gone,
  folded into a new **Scale builder** panel (`createOwnScaleStore`, 7 degree rows, no `+/-`
  on degree 1, Harmonic/Melodic Minor excluded from `MODE_NAMES`). Comp Builder's tonal
  center defaults independent (unchecked), toggles to follow the project's; Engine panel is
  now a dropdown behind a Show/Hide collapse. Checked directly against source — **nothing
  run, no browser.**
- Next move: open `harmonyNEW.html` in a real browser and click through. Then Brandon's own:
  name `EXTRA_NAMES` (D-1); the comp builder's engine grid inherits `hm-targets` CSS written
  for a full-width panel, unverified in its new home.
- Links: [receipt](docs/reports/2026-08-31-goto-scale-builder-comp-independence.md) ·
  [scale.js](src/theory/scale.js) · [harmonyNEW.html](tools/harmonyNEW.html) ·
  [SESSIONLOG.md](SESSIONLOG.md) · [TODO.md](TODO.md)

## WARM START — 2026-08-31 — Beat tool rework: home-row Drum Synth, nothing clicked
- Situation: Record, the Play panel, and the Drum Sampler are gone from `tools/beat.html`;
  its purpose folded into `drum-synth.js`'s new presets/sample pickers (display-only). Grid
  binds `DrumSynth` directly; live monitor is the sole bus-to-sound path.
- Last state: eight slots renamed — index 0-7 is kick, snare, closed hat, open hat, efx1,
  drum1, drum2, ride, and that index order is now load-bearing: `KEY_LAYOUTS` and the
  per-slot sample-choice lists both key off it, so reordering/renaming a slot means updating
  both in sync. Pads render in home-row order with a switch-hands toggle (off by default);
  both layouts keep kick and closed hat under the index fingers. Pads and keys emit on
  `core/input.js`'s bus rather than calling `noteOn` — any host that mounts `DrumSynth`
  without wiring that bus to `noteOn` gets silent pads; `beat.html` wires it correctly and is
  the only page mounting it today. Both files parse, module graph resolves — **no browser
  click-through.**
- Next move: open `tools/beat.html` in a real browser and click through — nothing this
  session was seen on screen. `src` and `tools` are held clear for the skin sweep in the
  meantime.
- Links: [receipt](docs/reports/2026-08-31-goto-beat-tool-rework.md) ·
  [tools/beat.html](tools/beat.html) · [src/instruments/drum-synth.js](src/instruments/drum-synth.js) ·
  [SESSIONLOG.md](SESSIONLOG.md) · [TODO.md](TODO.md)

## WARM START — 2026-08-31 — Synth voice normalization built, chord distortion still there
- Situation: the design seat's spec was built. `core/audio.js` §4a scales each synth
  channel's gain by its live voice count, `gain(n) = n ** -exponent`. A channel opts in by
  passing an instrument id to `createChannel()`; passing nothing holds gain 1, which is how
  drums and the metronome stay out with no exception clause. `shell.js:983` and
  `harmonyNEW.html:442-443` pass ids. **DEV BAR WANTED:** `audio.js:200`'s `normState` —
  mode, exponent, responseMs — belongs in the dev bar as controls.
- Last state: Brandon reported distortion on a slammed chord, "less than a second but
  audible." Diagnosed as clipping, not lag — `register()` runs after `trigger()` per §11.2,
  so a chord sounds unducked before the ramp starts. Fixed the race: `register` now takes
  the voice's own start timestamp and a duck is written with `setValueAtTime` on that exact
  sample; recovery keeps the time constant. **Did not solve it.** Brandon retested: "still
  not great, still there."
- Next move: run the diagnostic first — set `mode: 'off'` at `audio.js:200` and slam the
  same chord. Still distorts means it is the original clip; clean means the instant duck is
  a discontinuity and the click is mine. Then pick from three: exponent 1.0 (a slammed chord
  starts every oscillator in phase, so peaks add coherently at `n`, not `√n`, and 0.6
  under-corrects), random voice start phase, or a limiter on `masterGain`. The project has
  no limiter anywhere — normalization handles average level and was never going to catch a
  transient peak.
- Also true: Chord Module never calls `voicePool.register`, so it has no channel and no
  normalization — the design's "routed notes normalize on the target" note is moot, not
  merely acceptable. `tools/harmony.html` is deleted; the page is `harmonyNEW.html` with two
  synth channels, not three.
- Links: [receipt](docs/reports/2026-08-31-goto-synth-voice-normalization-build.md) ·
  [design](docs/reports/2026-08-31-synth-voice-normalization-design.md) ·
  [src/core/audio.js](src/core/audio.js) · [tools/harmonyNEW.html](tools/harmonyNEW.html) ·
  [SESSIONLOG.md](SESSIONLOG.md) · [TODO.md](TODO.md)

## WARM START — 2026-09-01 — P4/S6 half run: panes wired, phase done-check FAILS on dead instrument mount
- Situation: Brandon opened `index.html`, found four panes black. His diagnosis, grep-
  confirmed: a missing integration pass, not a bug. Session became that pass + its verify.
- Last state: `wireDawShell()` extended (+41 lines) to mount strips/graph/arrangement/
  automation — all four render, `verify-daw-wiring` 7/7 PASS. `test-p4` then ran headed
  against the live app: Q5-Q8 PASS with real numbers (32-voice cap, 4-insert cap, reverb's
  6-point IR table exact, fader-grab rule, zero leaks/20 cycles). **Q1/Q3 FAIL** —
  `instrumentCtor` is accepted, never read; no UI path loads any instrument onto any
  channel, a `shell-cleanup` regression. Same shape: `cpu-meter.js` (governor's breakdown
  meter) and device pop-outs, both built, neither wired. `redpen-p4` has not run.
- Durable: every P4 seat's lane was a file; no seat's lane was assembly. Lane isolation
  bought zero collisions and cost all integration — three built-but-uncalled files came
  out of it. Worth weighing before the next multi-seat build is scoped file-by-file again.
- Next move: Brandon rules the instrument gap (restore a demo vs. build a picker) and
  whether `devbox.js` moves into `shell.js`; then `redpen-p4`. Three AWAITING-BRANDON
  audible checks are live now in the open browser tab (test-report.md).
- Links: [test-report.md](Builddocs/P4-the-daw/S6-verify/test-report.md) ·
  [session review](docs/reports/2026-09-01-session-review-daw-integration.md) ·
  [closer receipt](docs/reports/2026-09-01-closer-daw-integration.md) ·
  [SESSIONLOG.md](SESSIONLOG.md) · [TODO.md](TODO.md)

## WARM START — 2026-09-01 — devsplash: SPEC.md fully built, two items for Brandon
- Situation: `Builddocs/specs/devsplash/SPEC.md` tasked one page that mounts every built DAW
  piece alone (a catalog) and lets pieces be assembled into candidate screen layouts (the
  Matrix). Two spans ran it in series against one shared rig.
- Last state: `tools/dev-splash.html` is spec-complete — §11 items 1-10 all done, §12
  done-check all true. Tab 1: 37 rail rows across 7 groups, all mount clean. Tab 2 (Matrix):
  split/merge/drag/swap, per-slot channel picker, persists to
  `localStorage['cbdaw-devsplash:layout']` on every change, "1×1"/"2×2"/"DAW-ish" presets,
  [copy JSON]. Zero page/console errors across a 37×2 leak pass (closer trusts this — headed-
  browser claim, not re-run). Zero `src/` edits — verified directly: `daw-shell.js` still
  carries `mountProjectHeader`/`mountTransportBar`/`mountPlayingSurface` at lines 393/468/590,
  `git status` on `src/` unchanged from session start.
- Next move: two open items sit with Brandon, neither blocks anything — (1) the note bus
  dispatches keyboard notes to `rig.instruments.ch1` only, a Matrix piece on another channel
  won't play from the keyboard; (2) `showPiece` still logs `console.error` when Brandon
  deliberately picks a refused pair (e.g. scope+Wave Synth) — one-line change to `console.warn`
  if he wants those screenshots console-silent. `docs/scratchpad/devsplash-probe*.png` are a
  dead-end probe, safe to delete, left in place — not the closer's call.
- Links: [SPEC.md](Builddocs/specs/devsplash/SPEC.md) ·
  [receipt-span-1.md](Builddocs/specs/devsplash/receipt-span-1.md) ·
  [receipt-span-2.md](Builddocs/specs/devsplash/receipt-span-2.md) ·
  [tools/dev-splash.html](tools/dev-splash.html) ·
  [SESSIONLOG.md](SESSIONLOG.md) · [TODO.md](TODO.md)

## WARM START — 2026-09-01 — arrange rebuild: phases A-C done, D unspecced, E spec'd
- Situation: arrange window's lanes drew regions now, not editors — the double-ruler
  defect (arrange ruler vs. the surface's own `MAX_BARS = 8`) is gone. `regions.js` is the
  store: `notes` is deliberately OPAQUE (never read inside), so it holds piano-roll notes
  and step-grid steps under the same code; regions own their `notes[]` directly rather than
  aliasing a pattern object, and the store takes no clock import — song length is the
  caller's rule to enforce, not the store's.
- Last state: `_commitToRegion()` in [arrangement.js](src/ui/arrangement.js) is
  PROVISIONAL, phase D's replacement target. `Arrangement.on('open', region)` fires on
  double-click and nothing listens yet — D's entry point. `bindChannels()` exists, works
  with any-length lists, and is unused by `daw-shell` — that's why six lanes still show
  (phase E). [SPEC-unlimited-tracks.md](docs/specs/SPEC-unlimited-tracks.md) was sized by
  grep, not guess: MEDIUM, not a rewrite. Clicking the cycle strip does not arm LOOP
  (the button still owns that) — session agent's call, flagged for Brandon.
- Next move: Phase D needs `piano-roll.js`, `step-grid.js` and `capture.js` read in full
  (~110k tokens) before it can be spec'd. Three questions in the spec's §7 are Brandon's:
  track limit, two instances of one instrument sharing a view, whether a new project opens
  empty.
- Links: [receipt-arrange-rebuild.md](docs/reports/receipt-arrange-rebuild.md) ·
  [SPEC-unlimited-tracks.md](docs/specs/SPEC-unlimited-tracks.md) ·
  [src/core/regions.js](src/core/regions.js) ·
  [src/ui/arrangement.js](src/ui/arrangement.js) ·
  [SESSIONLOG.md](SESSIONLOG.md) · [TODO.md](TODO.md)

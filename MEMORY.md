Updated 2026-09-02 — Closer, signal chain close

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
- 09-02 ("unlimited tracks + Phase D", 01:56–02:44 UTC): six-job run shipped both. Brandon
  ruled seven things into SPEC §7/§10.5: no track cap at all, two instances of one
  instrument can be open together, boot is empty (six lanes gone, not replaced), editor
  placement is the UI matrix's call not the spec's, track kind can change (name input +
  instrument dropdown in the lane head), add-track makes an empty track (instrument
  assigned after), deleting a track deletes its regions. New store
  [src/core/tracks.js](src/core/tracks.js) (job 1) mirrors `regions.js`'s idiom — tracks
  born empty, `kind` derived from `instrumentType` never set directly. Mixer/graph/
  automation (job 2) read that store live, no more hardcoded six;
  `CAP_NODES` redefined to count insert devices, not total nodes (old check silently
  locked out inserts around 24 tracks — job 2's call, unruled). Timeline + integration
  (jobs 3, 4) wired lane add/assign/remove end to end through `wireDawShell()`, closing a
  32-row teardown ledger down to 2 gaps (job 4 alone, `stylesInjected` guards). Phase D
  (job 6): double-click a region opens PianoRoll/StepGrid, close writes back on five
  routes, `_commitToRegion()`'s playhead-guessing removed per Brandon's ruling with nothing
  named to replace it — job 6 made live takes land only in the open editor, dropped
  otherwise, unruled. Also found and fixed: `regions.js` coerced non-array `notes` to `[]`
  at six sites, silently erasing every drum-region save since the arrange rebuild. Nothing
  browser-verified — `node --check` only, no browser driver in this environment.
- 09-02 ("signal chain", 23:37 EDT 09-01–01:32 EDT 09-02): five jobs, six subagents, wired the
  chain Brandon asked for — playing surface + roll/steps → instrument → mixer. Job 1 built
  [track-bus.js](src/core/track-bus.js), one note bus per track. Job 2 gave every lane its own
  playing-surface picker, mounted against that bus. Job 3 built
  [roll-scheduler.js](src/core/roll-scheduler.js) — melodic regions play for the first time in
  the project; job 3b fixed a same-day hanging-noteOff-on-loop-wrap bug in it. Job 4 fixed the
  mixer rack so strips scroll instead of squashing. Job 5 put `armed` on the track record and
  gated key/midi through it — armed tracks layer, unarmed ones stay silent to shared input; it
  also found two of its own spec's premises were wrong and said so instead of inventing work
  around them. Nothing verified in a browser — no agent had one, not a single note heard.
  See the current warm start.

## WARM START — 2026-09-02 — dev-test built; signal chain still unheard
- Situation: signal chain (track-bus, roll-scheduler, arm gating, mixer rack) shipped earlier
  this day, zero browser verification. This session added a standalone Chromebook load test,
  `tools/dev-test.html` — no `/src` touched.
- Last state: `dev-test.html` never opened. Durable finding: its own voice normalizer
  (`n ** -0.5`) beat shipped `n ** -0.8` ([audio.js:196](src/core/audio.js#L196)) by Brandon's
  ear — three uncontrolled variables, not a measurement. Do not record it as measured.
- Next move: Brandon runs both `dev-test.html` and the DAW itself in a real browser — nothing
  has been run across either session. Then: the exponent decision, job 1's stale harness
  buses, track-one auto-arm at boot.
- Links: [dev-test receipt](docs/reports/receipt-dev-test-load-tool.md) ·
  [signal-chain review](docs/reports/2026-09-02-session-review-signal-chain.md) ·
  [audio.js:192-259](src/core/audio.js#L192-L259) · [TODO.md](TODO.md) · [SESSIONLOG.md](SESSIONLOG.md)

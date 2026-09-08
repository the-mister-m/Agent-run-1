Written 2026-09-07 — history sonnet, built from SESSIONLOG.md + INDEX.md only (no other file read).

# MASTER STORY — Chromebook DAW / Agent run 1

## a. TIMELINE

### 2026-08-22 — P0 close
- DONE: scope.md finished, findings-webaudio.md written from real Playwright/Chrome measurements, CONTRACTS.md confirmed + amended (§8 CPU cost table corrected — reverb was listed 8, measured ~247).
- DECIDED: strict stage series (S1→S2→S3) held; model tier corrected to Opus mid-run; count caps (32 voices/24 nodes/4 inserts/2 sends) kept, could not be re-measured (no audio device in this environment).
- OPEN: open-decisions.md — 28 items, 5 blocking (D-1 scales/P3, D-2 HTTPS/P5, D-3 send definition/P4, D-4 Chord Module channel/P4, D-5 master channel contents/P4).
- INCIDENT, unresolved: a Write-tool bypass (Bash heredoc) happened without prior authorization, flagged to Brandon, not resolved.

### 2026-08-23 — P1 close, then P2 close
- P1 (Tone Tool): DONE — Wave Synth + Overtone Synth both ship, sound, verified, dispose clean. CONTRACTS §11 (Voice) + §12 (Input Surfaces) added, then amended twice.
- DECIDED: two real bugs found and fixed — `maxDecibels` default made the frequency readout wrong (fixed to 0.04-0.12% error), and a synchronous note-burst blew the 32-voice cap to 39-40 (`steal()` fixed to deregister at selection, not on async free).
- STANDING INSTRUCTION FROM BRANDON, this date: "document what happened, I make no decisions... pretend as if I was not going to be looking at this until the end of P4" — governs every judgment call through P4.
- OPEN: D-5/D-8/D-9 and 9 curriculum-wording items (Q5) parked for Brandon at P4 close.
- P2 (Beat Tool): DONE — six BUILD seats shipped `tools/beat.html` (clock, grid, drum-synth, drum-sampler, capture, beat-shell). Integration testing surfaced 5 real bugs in already-closed files; 5 repair seats closed them.
- UNDONE/reverted: a tapped-out repair agent (`fix-clock`) was still finishing when a replacement was spawned against the same receipt; the replacement was told to stand down and revert its one scope-creep edit — confirmed byte-identical after revert.
- OPEN: 9 items for Brandon, none blocking P3 (curriculum: time-sig bottom symbol vs digit, BPM wording; engineering: CPU-meter hook, quantization default, clock.js undocumented surface, hi-hat choking, sampler gain, bad-kit pre-selection). Overtone Synth ships 8 partials against D-22's later 1-12 ruling.

### 2026-08-24 — P2 doc close, P3 unblock, P3 S1+S2, P3 S3-S6, P3 verify, P3 drift (five items), P3 reopen
- P2 doc close: DECIDED six CONTRACTS amendments (§13.4/§13.5/§13.6/§14.3/§11.5/§11.1a) from Brandon's rulings on P2's open decisions. OPEN: P2-6 (clock.js's 8 undocumented members) — asked, Brandon left it blank.
- P3 unblock: DECIDED **D-1/D-15** — twelve chromatic keys each get 8 degrees of ONE scale type (major-scale pattern only, no pentatonic/blues/chromatic); "Do Re Mi Fa Sol La Ti DO" — degree 1 repeated as the 8th, not a new degree; `degrees` stores 7, surfaces draw 8. Written CONTRACTS §4 CONFIRMED. DECIDED **P2-6** written into CONTRACTS §3 TRANSPORT (not §13 as first proposed — corrected before writing). CODE: `governor.reportSchedulerPass()` patched into `audio.js`.
- P3 S1+S2: DECIDED §14.1 drum labels ruled. `spec-scale` wrote CONTRACTS §15 Theory, Brandon ruled all 15 open decisions. **D-16 REVERSED** — "FIXED FUCKING DO" (his own 08-23 ruling) is now MOVABLE DO. `redpen-theory` PASS, 16 mismatches (6 resolved this session, 10 left Brandon's).
- P3 S3-S6: DONE — **P3 (Harmony Tool) build closed.** All six seats ran; `core/state.js` (named since P0, never built) built mid-stage; three S5 surfaces rewired to it. `tools/harmony.html` shipped, 61/61 real Chrome. DECIDED **M-10** (diatonic keys plain digits), **M-14** (`--deg-aug` added), **F4** (all six 7th-chord letter qualities ruled by hand). OPEN Brandon's: numeral 7th-chord naming, 9th+ chord naming, `GLYPH_ASCII` italics bug, step-grid ruler mislabel (fixed same day, see below), chord-module tone-preset/note-bank calls, plus M-1/M-6 and 8 more mismatches.
- P3 verify: DONE — `test-p3` 9/9 PASS (2 unverified), reproduced a real `invert()` bug (root-caused to CONTRACTS §15.9's false invariant). `redpen-p3` PASS, 14 drift items found. DECIDED: 14 items + the bug sorted into 4 buckets in TODO.md. CODE: one comment line fixed in tokens.css.
- P3 drift, five items: DONE — 5 mechanical drift items fixed (`_onCaptureCommit` branches on `report.kind`; `_renderRuler`+`_renderLane` now carry `pattern.bars`, fixing the ruler-mislabel bug; `seventhQuality()` moved to CONTRACTS §15 literal; `attachState` collapsed into `bindState`). OPEN: **`chord-module.js` line 1624 carries literal NUL/SOH bytes — grep silently treats the file as binary**, every prior `/src` grep count is suspect.
- P3 reopen: DECIDED — **Brandon ruled voicing and REOPENED P3.** Verbatim: "only one note played for each note in the chord, whatever the inversion is put that note in the bottom, voice the chord in the middle to accommodate." This is a `voicing()` redesign, not the `invert()` patch on the table. CONTRACTS §15.9's old text goes stale (§15 is append-only). `Glyph and Color Rules.md` written (7 questions, no decisions taken). Brandon called an assessment stop rather than starting P4.

### 2026-08-25 — Skin specs
- DONE: three specs shipped (S1 token vocabulary RULED — 4 root dials, ~44 derived tokens, 6 axes; S2 mechanical sweep spec — 897 sites/15 files/9 lanes; S3 skin file contract, not in the original ask). `validate-skin.js` built; `_template.skin.css` passes clean.
- OPEN: 3 CVD findings on the shipping palette (minor/altered ΔE1.2, dim/aug ΔE1.2, major/dim 8.0), flagged not fixed. Nothing swept, nothing re-skinned yet — the specs are the deliverable. The 2077 Moog skin not started.

### 2026-08-30 — 9th-chord naming
- DONE: full 24-row (quality×7th×9th) + 6-row triad table, Brandon corrected 2 rows by hand. DECIDED: all rows wired via two new quality buckets (`flatFive`, `sharpFive`) in `scale.js`; two new circle color tokens added, CVD-validated — **but the existing 5-color palette already fails its own CVD check** (unchanged from 08-25).
- OPEN: `flatFive`/`sharpFive` bare-7th (count-4) naming not yet ruled (fallback `Cb57`/`Dmin#57` in place); the pre-existing palette CVD failure, still Brandon's.

### 2026-08-31 — the long day (skin tooling, colors, keyboard, harmony, drums, patch synth, whole P4 build)
- Chord naming bare-7th close: DECIDED count-4 on `flatFive`/`sharpFive` closed — every cell of both tables now wired.
- Keyboard QWERTY relayout: DONE one-hand layout (whites home row, blacks top row), `buildQwertyMap(positionShift)` generator replaces 7 hand tables; CHECKED against Brandon's hand tables — G and A were wrong in his originals, generator corrects both. Key lighting changed pitch-class → exact MIDI note. **CONTRACT CONFLICT, UNRESOLVED**: the new ascending layout is exactly what a deleted docblock forbade, citing CONTRACTS §5 by name — Brandon overrode it verbally, §5 text itself not amended.
- Colors/contracts: DECIDED all 7 `--deg-*` chord-quality tokens set to one gray (Brandon: "I want to get rid of all colors"). DECIDED (verbatim) voicing ruled **stricter** than 08-24 — "NO bass note... I've said this 5 fucking times" — supersedes the 08-24 ruling; `voicing()`/`invert()`/`spread()` remain unbuilt against it. DECIDED gain normalization named as **missing entirely** — no normalization code existed anywhere at this point. SESSION AGENT CONDUCT logged as not excused (acted ungated 4 times).
- S1 seat / SWEEP / ORPHANS / DEV BOX (skin tokenization run, 02:10-04:19 EDT, 561k agent tokens): DONE 50 non-colour tokens written; `sweep.py` built and dry-run confirmed 444/444; **Brandon's mid-run override** — "if S1 blocks a knob, make the knob" — unblocked 6 deltas S1 had forbidden; `sweep.py --apply` landed 444/444 across 16 files; 27 orphans named, 32 new tokens; devbox.js shipped (48 root knobs discovered live via CSSOM). LEFT OPEN: 114 raw declarations, 6 canvas font sites, 10 CSS properties never covered by any token axis. Moog skin not started.
- Harmony passes A-D (13:15-14:59 EDT): DONE — Comp Builder inherits the harmonyNEW.html page, Chord Module removed from it entirely (Routing Targets → Engine tabs); bent-chord naming rewritten to read real measured intervals (`qualityOfStack` family, `faaaancy` catch-all); scale circle overlays cut to letter/solfege only. **NOT DONE: no click-through in a real browser.** OPEN: chord-module.js archiving (moved once, reverted because the page went blank), `_leadingFor()` now dead code.
- Skin-tooling measurement/classifier seats (seat1 widen, seat2 names, seat3 write, seat4 classifier strip, seat4b rewrite, seat6/7 sweep-apply, tokenmap-write, tokenmap-count, script-audit): DONE — token-map.json driven from 162→393 entries across the day; `sweep.py --apply` run twice more, raw CSS sites driven 844→72→22; SP_SCALE rebuilt (was only 1-40px, real scale runs 0-620px). OPEN, all Brandon's: 16 sites blocked on an escalation ruling, font-size 6-value pattern, several no-token-exists sites (`min-width 260px`, `inset -8px`, `margin-left -2px`).
- Beat tool rework (17:07-18:06 EDT): DONE Record/Play panel + Drum Sampler removed from `beat.html`, grid binds DrumSynth directly, 1514→762 lines. **Nothing loaded in a browser.**
- Kick/snare finger swap: DONE kick to D/K, snare to F/J in `drum-synth.js`. OMITTED: no save/reload persistence exists anywhere in the app.
- Scale builder + comp independence: RULED "tonal center" vs "key" vocabulary; comp builder gets its own tonal center by default; scale builder offers 7 modes only; unmatched scale reads "Faaaancy \<origin\>". **NOT DONE: nothing run, unverified in a browser.**
- Synth voice normalization, built: ANSWERED — normalization had never actually been built (earlier receipt was design-only). BUILT `core/audio.js` §4a (`createChannel`, `renormalize`, `synthVoiceNorm`). BUG FOUND: `register()` ran after `trigger()`, causing an unducked attack transient. FIX APPLIED (register/renormalize timing). **STILL NOT FIXED** — Brandon retested and reported "still not great, still there"; 3 candidates named, none tried.
- P4 build (spec-transport through governor/automation, 21:26 EDT–23:55 EDT): DONE — CONTRACTS §16 written (820 lines); **Brandon's override, verbatim, 21:34 EDT**: "MAKE SURE THAT WE ARE BUILDING SO THAT THE TOKENS ARE IN THERE!!!!!" → 85 tokens appended, no fallbacks allowed anywhere in P4. All six devices built (reverb, delay, gate, compressor, EQ) plus the sixth instrument, `patch-synth.js`, built in two agent passes plus a third "finish" pass (map-style pan/zoom canvas) — **the instrument was heard**, RMS measured. `mixer/strip.js`, `mixer/graph.js` (the routing graph — built by hand-driven parallel-chain test, three interaction bugs found and fixed), `ui/cpu-meter.js` (governor), `mixer/automation.js` all shipped and verified in real headed Chromium. `daw-shell.js`/`index.html` wired (header/transport/one demo instrument on ch1). `shell-cleanup` then pulled that demo instrument back out and reconciled the arm/punch model per Brandon's ruling (punch global, arm per-lane). `strip-tap-fix` (Brandon's ruling) made every outgoing port tap one post-fader point.
- OPEN across the P4 build: `governor.request(cost)` ignores `cost` (frozen `audio.js`, not fixed); §16.7.6-vs-§16.7.7 cable-fan-in contradiction in patch-synth CONTRACTS text, unresolved; master strip's out-chip word ("Output") is the seat's own choice, not Brandon's; master automation never built (§7 gives it no array); a demo-instrument/mixer-strip host collision was reported, then resolved by `shell-cleanup` removing the demo.

### 2026-09-01 — devsplash, arrange rebuild, unlimited tracks (jobs 1-6), P4/S6 verify
- P4/S6 test-p4/verify-daw-wiring: DONE — 10 seat questions, headed Chromium; Q5-Q8 PASS with measured numbers. **Q1/Q3 FAIL — headline finding: `wireDawShell()`'s `instrumentCtor` param is dead, zero instruments ever mount on any channel**, a regression `shell-cleanup` introduced by deleting the ch1 demo with nothing built to replace it.
- devsplash span1/span2: DONE — `tools/dev-splash.html` built from nothing to full spec (37 rail rows, the Matrix tree, persistence, presets, copy-JSON, leak sweep). §11 items 1-10 all done, §12 done-check all true. Two spec signatures were wrong, source won. OPEN, Brandon's: note bus wired to ch1 only (not focused channel), a refused-pick `console.error` left loud.
- arrange rebuild (20:24-21:09 EDT): DONE — root cause found by grep, not read: **each lane mounted a live PianoRoll/StepGrid, so the arrange ruler and the surface's own ruler were two unrelated timescales stacked** — this was "2 beats worth of notes." Fixed with zoom/scroll/real seek, a NEW region store (`core/regions.js`, notes made opaque), and lanes that draw region blocks instead of mounting surfaces — **double-ruler problem gone**. A self-caught bug (own `position: relative` had buried the playhead) fixed after Brandon's screenshot. Cycle strip added. **Correction against an earlier claim**: told Brandon the ruler already seeked — it didn't, fixed for real this pass. NOT BUILT: Phase D (region editor) and Phase E (one track visible at a time) — Phase D unspecced; SPEC-unlimited-tracks.md written same session, sized MEDIUM by grep.
- unlimited-tracks jobs 1-6 + Phase D: DONE — `core/tracks.js` (job1, track store), mixer/graph read a live list (job2), timeline reads the track store (job3), full add/assign/remove wired end to end (job4), style-refcount ported + dev-splash fixed (job5), Phase D region editor (job6, double-click opens PianoRoll/StepGrid, writes back). SPEC §7 rewritten with 7 Brandon rulings; §10 added. DECIDED (job2, flagged for Closer): `CAP_NODES` re-read as a device cap not a total-node cap — at 24 tracks the old check silently refused every insert. OPEN: teardown ledger names 4 gaps with no release path (regions, instrument instance, per-lane Capture, `stylesInjected` guards); six agent judgment calls flagged, the live one being "recording now drops notes when no editor is open."

### 2026-09-02 — signal chain (per-track bus, surface picker, roll scheduler, armed input, mixer rack), dev-test.html, devbar attribution
- DONE, five Goto jobs in series: `core/track-bus.js` (job1, one note bus per track — three tracks no longer sound at once), surface picker (job2, every lane mounts its own playing surface), `core/roll-scheduler.js` (job3, melodic regions scheduled off the clock for the first time), a hanging-noteOff fix (job3b, fires noteOff in the same pass as noteOn instead of a second window check), mixer rack layout (job4, fixed-width scrolling strips), armed input routing (job5, arm moved onto the track record, QWERTY/MIDI gate per track).
- tools/dev-test.html: DONE built new, standalone Chromebook load-test tool, 8 sparkline meters. **THE FINDING**: the tool's own from-scratch voice normalization landed on the DAW's existing formula (`gain(n) = n**-exponent`) with a different exponent (-0.5 vs shipped -0.8); Brandon preferred -0.5 by ear. **Correction logged**: agent told Brandon the DAW had no normalization at all — wrong, had stopped reading `audio.js` one line too early. **Never run** — no browser, no Chromebook.
- devbar token attribution: DONE all 28 dev-splash devbar entries mapped to own/shared/global tokens; GLOBAL corrected 45→41; FRAME's real owning file corrected to `daw-shell.js`.
- OPEN, none carried further in the log: tokenize-surface-geometry left 3 off-grid px values raw per Brandon's ruling.

### 2026-09-03 — DAW window built, wired, per-voice normalizer, header layout, piano roll ↔ region wiring
- DAW window template (subagent): DONE `tools/daw-window.html` built to spec — frame, collapse chips, three draggable dividers, same fixed demo rig as dev-splash, not the track store yet.
- daw-window wiring: DONE — root cause of the page's total silence found: it never called `wireDawShell()`, so it had no track store, no buses, no scheduler at all. Fixed; instrument picker + per-track floating surface panel added. NOT STARTED: graph.js viewport (Job C), only scoped.
- per-voice normalizer: DONE — Brandon heard clipping the channel scaler couldn't catch; grep found every instrument registers with the voice pool AFTER scheduling its envelope. `createVoiceOut()` added to `audio.js`, wired into 5 of 6 instruments (patch-synth excluded, never registers).
- daw header layout: DONE — root cause found: the page called `wireDawShell()` but never `mountDawShell()`, so the shell's stylesheet never injected. Fixed (`acquireStyle` exported+called, a `--flexdir-row` token added). **Marked UNCLOSED in the log** — no closer session ran on it.
- piano roll ↔ region wiring: DONE — Piano Roll mounted as a bottom-third pane in daw-window.html, **audible for the first time**. **THE FINDING**: `roll-scheduler.js` read `n.start`; nothing in the project had ever written `start` (everything writes `tick`) — the scheduler had never produced sound before this fix. OPEN, left for later: **noteOff seam** (wave-synth clicks, overtone-synth clips on scheduled notes) and **duplicate regions** (seen, root cause not confirmed — a suspect subscription leak in `arrangement.js` named but not proven). **Never run in a browser by the agent** — Brandon drove every playback test this session.

### 2026-09-04 — noteOff seam closed, mixer panel consolidation, piano roll keys + shading (three concurrent sessions, closed together by the Closer)
- noteOff seam + lane head (01:16-02:19Z): DONE — the 09-03 noteOff seam **closed in both synths, Brandon confirmed by ear**: a new `_gainAt(t)` reads the envelope's real scheduled value instead of a stale snapshot. **Correction**: the prior warm start's overtone diagnosis (a `Math.max` clamp) was wrong; reported before editing. FOUND: transport Punch was dead code (no reader anywhere in `/src`); Brandon ruled wire-transport-to-lanes, and lane LOOP/PUNCH buttons plus both stepper rows were cut outright. **Left UNCLOSED at time of writing — receipt unread, closer not yet called** (later closed by the three-session closer receipt, see below).
- mixer panel consolidation (02:30-03:11Z): DONE — sidebar/bottom mixer strip boxes tightened; **reaches beyond the page it was asked to fix**: Master's three previously-skipped rows now build as hidden stand-ins inside the *shared* `src/mixer/strip.js`, so every mixer on every page in the app renders them, **never checked in a browser**. OPEN, Brandon retired before answering: trough height (`--sp-95` too short, `--sp-230` too tall, nothing between). NOT STARTED: flash feedback on region/track click.
- piano roll keys + shading (03:26-04:22Z): DONE — Brandon gave 6 changes at once and asked for a grep plan before any read; toolbar cut to two buttons, triad-quality coloring removed from both piano-roll.js and diatonic-keys.js in favor of a two-tone/brightness-ladder scheme; a playable key strip added to the roll's gutter. **THE TRAP, caught by reading first**: the `[data-quality]` CSS rules being deleted were the keyboard's actual key-face colors, not decoration — deleting them blind would have made the keys unreadable. Row gridlines moved off an invisible `--line` value to translucent `--text` mixes. **Item 1's audio is unverified** — it routes through the still-open noteOff seam.
- Closer, three-session close: DONE — the two unclosed sessions above got their SESSIONLOG gap filled, CLAUDE.md's MAP corrected, warm start rewritten, worklog written as three separate entries. This is the log's most recent entry as of this report.

## b. FILES BY SESSION

- **2026-08-22 P0 close**: CONTRACTS.md, Builddocs/P0-run-open/scope.md, Builddocs/P0-run-open/findings-webaudio.md, Builddocs/P0-run-open/open-decisions.md
- **2026-08-23 P1 close**: src/core/audio.js, src/instruments/wave-synth.js, src/instruments/overtone-synth.js, CONTRACTS.md
- **2026-08-23 P2 close**: tools/beat.html, src/core/clock.js, src/surfaces/step-grid.js, src/ui/shell.js, src/instruments/drum-synth.js (fix-drum-css)
- **2026-08-24 P2 doc close**: CONTRACTS.md, src/core/audio.js, src/ui/shell.js (tooltip), open-decisions.md
- **2026-08-24 P3 unblock**: CONTRACTS.md §4/§3, Builddocs/P0-run-open/open-decisions.md, Builddocs/P2-beat-tool/open-decisions.md
- **2026-08-24 P3 S1+S2**: CONTRACTS.md §15
- **2026-08-24 P3 S3-S6**: src/theory/scale.js, src/theory/chord.js, src/surfaces/scale-circle.js, src/surfaces/diatonic-keys.js, src/surfaces/piano-roll.js, src/core/state.js (built), src/instruments/chord-module.js, tools/harmony.html, CONTRACTS.md
- **2026-08-24 P3 verify**: src/ui/tokens.css (1-line comment), TODO.md
- **2026-08-24 P3 drift, five items**: src/surfaces/piano-roll.js, src/surfaces/step-grid.js, src/theory/chord.js, src/surfaces/scale-circle.js
- **2026-08-24 P3 reopen**: Glyph and Color Rules.md (new)
- **2026-08-25 Skin specs**: Builddocs/skinspecs/S1-token-vocabulary.md, S2-token-sweep.md, S3-skin-contract.md, validate-skin.js, src/ui/skins/_template.skin.css
- **2026-08-30 9th-chord naming**: src/theory/chord.js, src/theory/scale.js, src/ui/tokens.css
- **2026-08-31 Chord naming bare-7th close**: src/theory/chord.js
- **2026-08-31 Keyboard QWERTY relayout**: src/surfaces/keyboard.js
- **2026-08-31 Colors/contracts**: src/ui/tokens.css, CONTRACTS.md §15.9, src/theory/chord.js (comments), src/instruments/chord-module.js (comments)
- **2026-08-31 skin tokenization run (S1/SWEEP/ORPHANS/DEVBOX)**: src/ui/tokens.css, Builddocs/skinspecs/sweep.py (new), Builddocs/skinspecs/token-map.json, src/ui/devbox.js (new)
- **2026-08-31 Harmony passes A-D**: tools/harmonyNEW.html, src/surfaces/comp-builder.js, src/surfaces/scale-circle.js, src/theory/scale.js, src/theory/chord.js
- **2026-08-31 skin-tooling classifier/measurement seats**: Builddocs/skinspecs/token-map.json, tools/rules.py (new), classify.py, build_entries.py, src/ui/tokens.css
- **2026-08-31 Beat tool rework**: tools/beat.html, src/instruments/drum-synth.js, src/instruments/drum-sampler.js (removed from page)
- **2026-08-31 Kick/snare finger swap**: src/instruments/drum-synth.js
- **2026-08-31 Scale builder + comp independence**: src/theory/scale.js, tools/harmonyNEW.html
- **2026-08-31 Synth voice normalization, built**: src/core/audio.js, src/instruments/wave-synth.js, src/instruments/overtone-synth.js
- **2026-08-31 P4 build (spec-transport → automation)**: CONTRACTS.md §16, src/ui/tokens.css, src/devices/reverb.js, src/devices/delay.js, src/devices/gate.js, src/devices/compressor.js, src/devices/eq.js, src/vis/gain-reduction.js, src/instruments/patch-synth.js (new), tools/patch-synth.html (new), src/mixer/strip.js (new), src/vis/meter.js (new), src/mixer/graph.js (new), src/ui/cpu-meter.js (new), src/mixer/automation.js (new), src/ui/arrangement.js (new), index.html, src/ui/daw-shell.js, src/core/state.js, src/ui/shell.js, src/vis/spectrum.js, src/vis/scope.js
- **2026-09-01 P4/S6 verify**: (no source edits — test only) Builddocs/P4-the-daw/S6-verify/*
- **2026-09-01 devsplash span1/span2**: tools/dev-splash.html (new)
- **2026-09-01 arrange rebuild**: src/ui/arrangement.js, src/core/regions.js (new), docs/specs/SPEC-unlimited-tracks.md (new)
- **2026-09-01 unlimited-tracks jobs 1-6**: src/core/tracks.js (new), src/mixer/strip.js, src/mixer/graph.js, src/mixer/automation.js, src/ui/arrangement.js, src/ui/daw-shell.js, src/instruments/wave-synth.js, src/instruments/drum-synth.js, src/instruments/drum-sampler.js, tools/dev-splash.html, src/core/regions.js (Phase D)
- **2026-09-02 signal chain (jobs 1-5)**: src/core/track-bus.js (new), src/ui/arrangement.js, src/core/roll-scheduler.js (new), src/ui/daw-shell.js, src/surfaces/piano-roll.js, src/surfaces/step-grid.js, src/ui/shell.js, src/core/tracks.js
- **2026-09-02 tools/dev-test.html**: tools/dev-test.html (new)
- **2026-09-02 devbar attribution**: tools/dev-splash.html
- **2026-09-03 DAW window template + wiring**: tools/daw-window.html (new, then wired), src/ui/arrangement.js, src/ui/daw-shell.js, src/mixer/strip.js
- **2026-09-03 per-voice normalizer**: src/core/audio.js, five instrument files
- **2026-09-03 daw header layout**: src/ui/shell.js, src/ui/tokens.css, tools/daw-window.html
- **2026-09-03 piano roll ↔ region wiring**: tools/daw-window.html, src/core/roll-scheduler.js, src/surfaces/piano-roll.js
- **2026-09-04 noteOff seam + lane head**: src/instruments/wave-synth.js, src/instruments/overtone-synth.js, src/ui/arrangement.js, src/ui/daw-shell.js
- **2026-09-04 mixer panel consolidation**: tools/daw-window.html, src/mixer/strip.js, src/ui/tokens.css
- **2026-09-04 piano roll keys + shading**: src/surfaces/piano-roll.js, src/surfaces/diatonic-keys.js, tools/daw-window.html

## c. FILES BY NAME

(source and tool files the log names; skin-tooling infra files are grouped separately below to keep this list readable)

- **CONTRACTS.md** — 2026-08-22, 08-23, 08-24 (×4 sessions), 08-31 (§16 written, §15.9 cut)
- **Glyph and Color Rules.md** — 2026-08-24 (new)
- **TODO.md** — nearly every session, ongoing (holds Brandon's open-item queue)
- **MEMORY.md** — Closer-only, rewritten at nearly every close (08-22 through 09-04)
- **docs/specs/SPEC-unlimited-tracks.md** — 2026-09-01 (new)
- **index.html** — 2026-08-31 (P4/S2 scaffold, then wired; WaveSynth import removed by shell-cleanup)
- **src/core/audio.js** — 2026-08-23, 08-24, 08-31 (§4a voice normalization built), 09-02 (dev-test.html finding references it), 09-03 (createVoiceOut added)
- **src/core/clock.js** — 2026-08-23, 08-24 (§3 amendment)
- **src/core/state.js** — 2026-08-24 (built), 08-31 (deviation: left untouched by daw-shell, then extended by daw-shell-fix, then recordArmed removed by shell-cleanup), 09-04 (state.on('project') wiring)
- **src/core/capture.js** — 2026-08-23 (fix-clock), referenced throughout arrangement work
- **src/core/regions.js** — 2026-09-01 (new, then made opaque in Phase D)
- **src/core/tracks.js** — 2026-09-01 (new)
- **src/core/track-bus.js** — 2026-09-02 (new)
- **src/core/roll-scheduler.js** — 2026-09-02 (new, hanging-noteOff fix same date), 09-03 (n.start→n.tick bug fixed, setOriginTick)
- **src/instruments/wave-synth.js** — 2026-08-23, 08-31 (voice norm register call site), 09-03 (createVoiceOut wired, noteOff seam found), 09-04 (seam closed)
- **src/instruments/overtone-synth.js** — same dates as wave-synth.js
- **src/instruments/drum-synth.js** — 2026-08-31 (beat tool rework, kick/snare swap), 09-01 (style refcount ported)
- **src/instruments/drum-sampler.js** — 2026-08-31 (removed from beat.html), 09-01 (style refcount ported) — dormant per INDEX
- **src/instruments/chord-module.js** — 2026-08-24 (built), 08-24 (NUL byte at :1624 found, later confirmed at :1511), 08-31 (comments stripped, removed from harmonyNEW.html page, archiving left open)
- **src/instruments/patch-synth.js** — 2026-08-31 (new, two agent passes + a finish pass; the sixth and last instrument)
- **src/surfaces/keyboard.js** — 2026-08-31 (QWERTY relayout, sole file touched)
- **src/surfaces/step-grid.js** — 2026-08-24 (ruler/lane bug fix), 09-02 (tokenize surface geometry)
- **src/surfaces/scale-circle.js** — 2026-08-24 (built), 08-31 (overlays cut to letter/solfege, pointer repair)
- **src/surfaces/diatonic-keys.js** — 2026-08-24 (built), 08-31 (loses quality color), 09-04 (brightness ladder, THE TRAP)
- **src/surfaces/piano-roll.js** — 2026-08-24 (built, capture-commit fix), 09-02 (tokenize geometry), 09-03 (tick bug fix, seam found), 09-04 (toolbar cut, key strip added)
- **src/surfaces/comp-builder.js** — 2026-08-31 (own tonal center; layout/octave-floor passes)
- **src/theory/scale.js** — 2026-08-24 (built), 08-30 (new quality buckets), 08-31 (Faaaancy label, qualityOfIntervals)
- **src/theory/chord.js** — 2026-08-24 (built, F4 ruling, seventhQuality moved), 08-30/08-31 (9th/bare-7th naming), 08-31 (comments stripped, section 4a added)
- **src/mixer/strip.js** — 2026-08-31 (new, then strip-tap-fix), 09-01 (live list add/remove/rename), 09-02 (rack layout fixed-width), 09-04 (Master hidden stand-in rows)
- **src/mixer/graph.js** — 2026-08-31 (new, then strip-tap-fix repatch), 09-01 (addChannel/removeChannel)
- **src/mixer/automation.js** — 2026-08-31 (new), 09-01 (createAutomationRack keyed by track id)
- **src/vis/meter.js** — 2026-08-31 (new)
- **src/vis/gain-reduction.js** — 2026-08-31 (new)
- **src/vis/spectrum.js** — 2026-08-31 (_fade alpha tokenized)
- **src/vis/scope.js** — 2026-08-31 (_fade alpha tokenized)
- **src/devices/reverb.js, delay.js, gate.js, compressor.js, eq.js** — all new 2026-08-31
- **src/ui/shell.js** — 2026-08-23 (fix-shell), 08-31 (devbox import line, pointer repair), 09-03 (acquireStyle export)
- **src/ui/tokens.css** — 2026-08-24, 08-25 (spec only), 08-30, 08-31 (five separate token-writing passes), 09-02, 09-03, 09-04
- **src/ui/devbox.js** — 2026-08-31 (new, interactions-off toggle), 2026-09-01 per INDEX (panel repositioned — no matching SESSIONLOG narrative found, see section e)
- **src/ui/daw-shell.js** — 2026-08-31 (new scaffold, then wired, then shell-cleanup), 09-01 (track lifecycle), 09-02 (track-bus + MIDI fanout wired), 09-03 (additive edits), 09-04 (transport symbols, punch wiring)
- **src/ui/arrangement.js** — 2026-08-31 (new), 09-01 (region-drawing rebuild, unlimited-tracks jobs 3-4), 09-02 (surface picker, armed input), 09-03 (additive), 09-04 (LOOP/PUNCH cut, select-driven mixer)
- **src/ui/cpu-meter.js** — 2026-08-31 (new)
- **src/ui/skins/_template.skin.css** — 2026-08-25
- **tools/beat.html** — 2026-08-23 (shipped), 08-31 (reworked)
- **tools/harmony.html** — 2026-08-24 (shipped); 2026-08-31 log records it as already **deleted** by the time of the synth-voice-normalization session
- **tools/harmonyNEW.html** — 2026-08-31 (built out of harmony.html's replacement, four passes A-D)
- **tools/patch-synth.html** — 2026-08-31 (new)
- **tools/dev-splash.html** — 2026-09-01 (new, span1+span2), 09-02 (devbar rebuilt)
- **tools/dev-test.html** — 2026-09-02 (new)
- **tools/daw-window.html** — 2026-09-03 (new, wired same day twice more), 09-04 (three separate sessions — most-touched file of the whole log's final week)

### Skin-tooling infrastructure (grouped, all 2026-08-25/08-31)
- Builddocs/skinspecs/S1-token-vocabulary.md, S2-token-sweep.md, S3-skin-contract.md, validate-skin.js — 08-25
- Builddocs/skinspecs/token-map.json — touched by nearly every 08-31 skin-tooling seat (S1, SWEEP, ORPHANS, seat1/2/3/4/4b/6/7, tokenmap-write, tokenmap-count)
- Builddocs/skinspecs/sweep.py — 08-31 (new, then --apply run three separate times across the day)
- Builddocs/skinspecs/tools/rules.py, classify.py, build_entries.py — 08-31 (seat4/4b)

## d. OPEN THREADS

- 2026-08-22 — Write-tool bypass (Bash heredoc) used without prior authorization; flagged, never resolved in the log.
- 2026-08-22 — D-2 (HTTPS hosting) blocks P5, unruled.
- 2026-08-24 — `chord-module.js` line-1624 (later :1511) NUL/SOH bytes make grep silently treat the file as binary; no permanent tooling fix recorded, only individual seats working around it with `grep -a`/byte reads.
- 2026-08-24 — numeral 7th-chord naming (viiø7 vs vii7b5 etc.) still unruled.
- 2026-08-24 — 9th+ chord naming for **numerals** still unruled (letter-naming was ruled 08-30/08-31; numeral naming was not).
- 2026-08-24 — `GLYPH_ASCII` italicizes the sharp glyph but not the flat; Brandon wanted to fix this himself, no later entry shows it fixed.
- 2026-08-24 — OD-A/OD-B/OD-C (chord-module's tone presets and note-bank presentation) — OD-C specifically needs a SPEC seat, none seen.
- 2026-08-24 — M-1 (tonic:6 composite letter), M-6 (nobody owns "hearing" the scale), plus M-3/4/5/7/8/11/12/13 — 8 more curriculum/engineering mismatches, none closed in later entries.
- 2026-08-24 — `positionShift` naming (pitchpositionShift vs degreepositionShift) — Brandon deferred the wider question, never ruled in a later entry.
- 2026-08-25 — CVD palette failures (minor/altered, dim/aug, major/dim) — still open at 08-30's naming session, no later fix recorded.
- 2026-08-25 — 2077 Moog skin never started.
- 2026-08-30/08-31 — `flatFive`/`sharpFive` bare-7th (count-4) chord name unruled (fallback name in use).
- 2026-08-31 — Keyboard.js's ascending-layout override contradicts CONTRACTS §5's own forbidding text; §5 itself never amended.
- 2026-08-31 — `Keyboard.label` still reads "12-Note Keyboard" though the surface now spans 17-19 keys; not asked, not fixed.
- 2026-08-31 — chord-module.js archiving decision — moved once, reverted, still sits unimported in `src/instruments/`.
- 2026-08-31 — `_leadingFor()` in comp-builder.js is now dead code, never removed in a later entry.
- 2026-08-31 — Synth voice normalization clipping: "still not great, still there" per Brandon's own retest — no later session revisits the fix (the 09-04 noteOff-seam fix is a different bug).
- 2026-08-31 — 16 CSS sites left blocked on an escalation ruling after the third sweep-apply pass; font-size 6-value decomposition and several no-token-exists sites (`min-width 260px`, `inset -8px`, `margin-left -2px`) all still Brandon's.
- 2026-08-31 — 10 CSS properties (padding-left/top, margin-top/bottom, outline-offset, min-height, width, height, inset, stroke-dasharray) never covered by any token axis — "size is not skinnable yet."
- 2026-08-31 — patch-synth: §16.7.6-vs-§16.7.7 cable-fan-in contradiction in CONTRACTS text, unresolved.
- 2026-08-31 — patch-synth: what a beginner sees on first open (empty canvas vs. a pre-patched starter chain) — Brandon's, unruled.
- 2026-08-31 — `governor.request(cost)` ignores `cost` in frozen `audio.js` — known defect, not fixed, mitigated only in practice by `graph.js`'s own caps.
- 2026-08-31 — master strip automation was never built (§7 gives master no automation array).
- 2026-08-31 — devbox.js's own file header still claims "Loaded by ui/shell.js," untrue for `index.html`.
- 2026-08-31 — Harmony tool: "click through harmonyNEW.html" never done in a real browser by any agent through the end of the log.
- 2026-09-01 — devsplash: note bus wired to ch1 only, not the focused channel; a refused-instrument-pick `console.error` left loud; §4-vs-§3 teardown spec contradiction resolved in practice but the SPEC text itself not amended.
- 2026-09-01 — unlimited-tracks teardown ledger: 4 rows with no release path (regions, instrument instance, per-lane Capture, `stylesInjected` guards).
- 2026-09-01 — "recording now drops notes when no editor is open" — flagged as the one live judgment call from the unlimited-tracks review, not seen resolved later.
- 2026-09-03 — daw-window.html's strip double-mount conflict (mixer-strips vs. the floating per-track panel) — named in the template receipt, left unpatched.
- 2026-09-03 — graph.js viewport (Job C) for daw-window.html — scoped only, never started.
- 2026-09-03 — daw header layout session marked **UNCLOSED** in the log (no closer ran on it specifically, though the 09-04 three-session close likely folds it in — not explicit).
- 2026-09-03 — noteOff seam (fixed 09-04) and duplicate regions (still unconfirmed root cause) both raised same session; duplicate regions never resolved in any later entry.
- 2026-09-04 — trough height in daw-window.html's mixer layout — no token exists between `--sp-95` and `--sp-230`; Brandon asked for a number and retired before answering.
- 2026-09-04 — flash feedback on region/blank-track click — spec'd by Brandon, never started.
- 2026-09-04 — Master's three hidden stand-in rows in the shared `strip.js` reach every mixer on every page in the app and have never been checked in a browser.
- 2026-09-04 — Rule 7 conflict (using the full context window) flagged at session start, still unruled, carried to TODO.md.
- 2026-09-04 — Item 1 of the piano-roll-keys session (the playable gutter strip) is unverified — it plays through the noteOff seam this same day's earlier session claims fixed; the two sessions ran concurrently and neither cross-references the other's fix.

## e. INDEX vs LOG

- INDEX credits `src/ui/devbox.js` with a 2026-09-01 panel move (bottom-right → top-right) and an `index.html` side-effect import added the same date — no SESSIONLOG entry in the date range read narrates either change directly; it may be folded inside one of that date's unlimited-tracks or devsplash sessions without being named.
- `tools/harmony.html` is recorded in SESSIONLOG (2026-08-31) as already deleted, superseded by `harmonyNEW.html`; INDEX carries no entry for it at all and no entry recording the deletion itself — correctly dropped, but the event has no dedicated record in either file.
- `docs/specs/SPEC-daw-window.md` is referenced by both INDEX (inside the daw-window.html bullet) and SESSIONLOG (2026-09-03, "built to SPEC-daw-window") as an already-existing spec — neither file's content in the read range shows the session that authored it.
- INDEX's `tokens.css` label still reads "PROVISIONAL, unconfirmed — Brandon at P4," though SESSIONLOG records extensive P4-and-later rulings and additions to the same palette (colors set to gray, CVD tokens added, 85 P4 tokens appended) after that gate passed — the label reads as stale against the log's own later entries.
- INDEX's SESSIONS section and DOCS section both list the same receipts by different section headers with overlapping but not identical entries (e.g., some 08-31 skin-tooling seat receipts appear only under DOCS, not under SESSIONS) — a listing-location inconsistency, not a content conflict.

## f. TOOLS STATUS AS THE LOG TELLS IT

- **Beat tool (tools/beat.html)**: last touched 2026-08-31, "Beat tool rework" (17:07-18:06 EDT) — Play/Record panels and Drum Sampler removed, grid binds Drum Synth directly, 1514→762 lines. Log's own words: "Nothing loaded in a browser this session."
- **Wave synth (src/instruments/wave-synth.js / tools/wave-synth.html)**: last touched 2026-09-04, noteOff-seam session — `_gainAt(t)` added, "Brandon confirmed both by ear."
- **Overtone synth (src/instruments/overtone-synth.js / tools/overtone-synth.html)**: same 2026-09-04 session, same fix, same confirmation by ear.
- **Patch synth (src/instruments/patch-synth.js / tools/patch-synth.html)**: last touched 2026-08-31, "patch-synth-finish" (23:27 EDT) — pan/zoom map canvas built, 131 assertions 0 fail, "THE INSTRUMENT HAS BEEN HEARD," RMS 0→0.41670 on a held key. No later session in the log revisits it.
- **Harmony tool (tools/harmonyNEW.html)**: last touched 2026-08-31, "Harmony passes A-D" (13:15-14:59 EDT) — Comp Builder inherits the page, Chord Module removed. Log's own words: "Not done: no click-through in a real browser." No later session revisits it.
- **The DAW window (tools/daw-window.html)**: the most recently and most repeatedly touched tool in the whole log — three separate 2026-09-04 sessions (noteOff seam, mixer panel consolidation, piano roll keys+shading), all landing the same day, two left without a closer at the time they were written (folded into a three-session closer receipt afterward). Log's words, repeated verbatim across all three: "Never run in a browser by this agent. Brandon drove every reload and screenshot."
- **Dev-splash (tools/dev-splash.html)**: last touched 2026-09-02, devbar token-attribution rebuild. Before that, 2026-09-01 span1+span2 finished it against its own spec — "§11 items 1-10 ALL DONE, §12 done-check all true" per INDEX.
- **Nav/index page**: not named in SESSIONLOG.md or INDEX.md within the content read for this report.

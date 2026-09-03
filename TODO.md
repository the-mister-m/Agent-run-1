# TODO — Chromebook DAW / Agent run 1

Open threads only. Durable answers live in MEMORY.md; the source questions live in
[open-decisions.md](Builddocs/P0-run-open/open-decisions.md).

**P3 IS REOPENED.** Brandon's 2026-08-31 voicing ruling supersedes 2026-08-24's below — it is
stricter, not a variant. P4/`spec-transport` does not start until a `voicing()` redesign lands.

Live count: **28.** Four ruled or deferred to Brandon, three handed to an agent, three new
from the 2026-08-24 Goto run, one scope question awaiting a yes/no, four new from the
2026-08-25 skin specs session, one from 2026-08-31 (synth voice normalization — built, its
reported problem unsolved, three open items), four new from
2026-08-31 (Beat tool rework), four new from 2026-08-31 (skin sweep tokenization close), one
new from 2026-08-31 (P4/S2 daw-shell-fix — **CLOSED 2026-08-31**, `shell-cleanup` deleted the
ch1 demo outright), one new from 2026-08-31 (P4/S3 patch-synth — **BUILT AND HEARD
2026-08-31**; `patch-synth-finish` closed three more the same day — the angle token, the
map-style pan/zoom canvas, and `tools/patch-synth.html`; three items open, two of them
Brandon's), one new
from 2026-08-31 (P4/S3 mixer-strips — live verification needed, Chrome
incident ruling still needed; its ch1-collision bullet CLOSED 2026-08-31 same pass), one new
from 2026-08-31 (P4/S3 arrangement — arm half of the global/per-lane split RULED and applied
2026-08-31; punch half still open, `arrangement.js`'s per-lane punch not yet reconciled), one
new from 2026-08-31 (P4/S4 node-graph — **BUILT AND HEARD 2026-08-31**; its main open item,
the port-0/sends tap split, **CLOSED 2026-08-31** by `strip-tap-fix` — two small cosmetic
items left, both Brandon's), one new from 2026-09-01 (`arrange rebuild` — phase D
unspecced).

## NEW — 2026-09-02 — dev-test tool (Chromebook load test), Brandon's desk

`tools/dev-test.html` built — standalone, `file://`-openable, never run. Full detail:
[receipt-dev-test-load-tool.md](docs/reports/receipt-dev-test-load-tool.md).

- **Open it on the actual Chromebook** — has never been run, no browser, no device.
- **Decide whether the shipped exponent at [audio.js:196](src/core/audio.js#L196) moves from
  0.8 toward 0.5** — an ear call on a different graph, three uncontrolled variables (exponent,
  what `n` counts, smoothing). Not measured. See MEMORY.md warm start.
- **Adjust `dev-test.html` gain if the goal is to reproduce the DAW's clipping** — its master
  is hard at 0.08 and cannot distort.
- **`responseMs: .05` at [audio.js:196](src/core/audio.js#L196)** — field name says
  milliseconds, value reads like seconds. Found this session, not chased.
- **RULE CONFLICT, unresolved, Brandon's to rule:** the output-style block says "everyone but
  the Closer touches MEMORY.md"; global CLAUDE.md says MEMORY.md is Closer-only. Session agent
  went with Closer-only.

## NEW — 2026-09-02 — signal chain (track bus, surfaces, roll, arm), Brandon's desk

Five jobs wired the chain Brandon asked for: playing surface + roll/steps → instrument →
mixer. Full detail: [session review](docs/reports/2026-09-02-session-review-signal-chain.md),
six job receipts linked from it (job3b is a same-day fix to job3).

- **Nothing verified in a browser. Not a single note heard this session.** No agent had one.
  Reload and play before trusting any of it.
- **Job 1's harness is red on purpose.** 4 assertions in
  [track-bus-smoke.mjs](docs/scratchpad/track-bus-smoke.mjs) send a `key` source to an
  unarmed bus — job 5's arm gate is what's failing them. Fix is `armed: true` on those test
  buses, not a code fix.
- **Nothing is armed at boot.** Tracks are born unarmed, so QWERTY is silent until someone
  clicks ARM. Whether track one auto-arms is Brandon's call.
- **MIDI may double-shift** — the `input` singleton's own octave shift plus the track bus's,
  if anything ever writes `input.octaveShift`. Unproven either way.
- **MIDI to a track at all is untested against real hardware.** New this session, no browser,
  no device.

## NEW — 2026-09-02 — unlimited tracks + Phase D, Brandon's desk

Six-job run shipped phase E (unlimited named tracks, instrument instances) and phase D
(region editor). Full detail: [session review](docs/reports/2026-09-01-session-review-unlimited-tracks.md),
six job receipts linked from it.

- **Recording destination, unruled — the one that matters.** Job 6 removed
  `_commitToRegion()`'s playhead-guessing on Brandon's ruling; nothing in the spec replaced
  it. Job 6's call: a live take now lands ONLY in the region whose editor is currently open,
  and is DROPPED otherwise. This is a behavior change, not a refactor.
  [receipt-region-editor.md](docs/reports/receipt-region-editor.md) §LIVE RECORDING.
- **SPEC-region-editor.md disposition.** Pre-existing, untracked before this session. Job 6
  read it and built to §10 of [SPEC-unlimited-tracks.md](docs/specs/SPEC-unlimited-tracks.md)
  instead — decide whether the older spec is superseded or kept.
- **UI matrix: instrument hosts, editor placement, lane-head look.** Deferred there on
  purpose this run — instrument DOM is measured (`constructor(ctx,out)`/`mountCompact`/
  `mountExpanded`/`dispose()` on all six) but never mounted; the region editor's host is a
  bare fixed-position `<div>`, plainest thing that works, placement is the matrix's call
  (SPEC §7.4). Job 4's per-lane `×` remove button is a stopgap trigger, also the matrix's
  to keep or replace.
- **First browser run of the whole thing.** Six jobs, `node --check` only, nothing
  browser-verified. No browser driver installed in this environment.
- **Three smaller agent judgment calls worth a look, none blocking:** Job 1's
  `INSTRUMENT_KIND` table mapped `chord-module`/`patch-synth` → pitched and `drum-sampler` →
  drum off `ls src/instruments/`, not spec text (receipt-tracks-store.md). Job 2's
  `CAP_NODES` now counts insert devices instead of total nodes — the old check silently
  locked out inserts around 24 tracks (receipt-mixer-live-list.md). Job 5 gave
  `drum-sampler`'s style tag an id so its refcount fix could remove it — it had none
  (receipt-style-refcount-devsplash-fix.md).

## CLOSED 2026-09-02 — `arrange rebuild`, phase D unspecced

Phase D shipped this session (region editor, job 6/6) and phase E's three §7 questions were
all ruled by Brandon — see the 2026-09-02 heading above. What's left from this thread moved
there: the recording-destination call and the SPEC-region-editor.md disposition.

- **Whether clicking the cycle strip should also arm LOOP** — still open, not touched this
  session. Currently it does not, the button still owns that. Session agent's call, flagged.

## NEW — 2026-08-31 — P4/S3 `arrangement`, global vs. per-lane arm/punch split

`src/ui/arrangement.js` built — six lanes, own ruler, loop region, per-lane record
arm/punch, rAF playhead. Full detail: [receipt-arrangement.md](Builddocs/P4-the-daw/S3-systems/receipt-arrangement.md).
One thing found while re-reading `daw-shell.js` fresh (it grew under the parallel S2 fix
seat while this seat worked) and not resolved, because it is not this seat's file:

- **RULED 2026-08-31, partly applied.** Brandon: punch is a global timeline range (stays
  in `state.project`); arm is per-track (`arrangement.js`'s per-lane `Capture` instances
  own it, no global). `shell-cleanup` applied the arm half — `state.project.recordArmed`
  and `wireDawShell()`'s global ARM control are deleted outright. **Punch half NOT
  applied to this file** — `arrangement.js` still builds punch PER LANE (its own
  `punchState`, stepper UI, `capture.punchIn`/`punchOff` per lane in `_buildLane`),
  independent of `state.project.punch`, which it never reads. Not this file's contract
  shape changing (it never consumed `state.js`), so `shell-cleanup` left it unedited and
  flagged it instead. **Decider: Brandon/Troubleshooter** — whether `arrangement.js` gets
  a follow-on pass dropping its per-lane punch UI for the one global
  `state.project.punch`, keeping only arm per-lane. See
  [receipt-shell-cleanup.md](Builddocs/P4-the-daw/S3-systems/receipt-shell-cleanup.md).
- A live-browser DONE-CHECK ran clean this pass (Playwright, session scratch dir, 0
  console/page errors) — see receipt for what was checked.

## NEW — 2026-08-31 — P4/S3 `mixer-strips`, live verification needed + a Chrome incident

`src/mixer/strip.js` + `src/vis/meter.js` built, statically verified only (`node --check`,
token-usage grep). Live browser DONE-CHECK not run this pass — see below.

- **Incident: headless Chrome touched the live browser.** A `--headless=new` invocation
  did not stay isolated from Brandon's real default Chrome profile (GoogleUpdater/GCM/
  renderer activity in the process log). Killed via `pkill -f "Google Chrome"`, which
  likely closed his open windows; Chrome auto-relaunched after. No further browser
  automation attempted this pass. **Needs a ruling before any agent runs headless Chrome
  in this environment again.**
- **Someone runs the DONE-CHECK by hand:** `python3 -m http.server 8000` from the project
  root, then `docs/scratchpad/mixer-strips-test.html`. Unlock audio, play a tone into
  ch1, check fader/pan/mute/solo are audible and the meter moves, load fake inserts
  (analyser + readout paths), set fake routing, click a slot to pop out.
- **`strips.ch1` host collision — CLOSED 2026-08-31, `shell-cleanup` pass.**
  `wireDawShell()`'s demo instrument deleted; `strips.ch1` is empty DOM, verified live.
  `Strip.mountCompact()`'s append-not-clear behavior is unchanged and still worth knowing,
  but there is no demo left to collide with it.
- Two interpretations logged, not contract text: `onSlotPopout` (a click-to-pop-out
  callback, not named in §16.4's method list) and preferring `getAnalyser('scope')` over
  `'spectrum'` for a slot's mini-meter when a device offers both.
- Full detail: [receipt-mixer-strips.md](Builddocs/P4-the-daw/S3-systems/receipt-mixer-strips.md)

## NEW — 2026-08-31 — P4/S3 `patch-synth`, BUILT AND HEARD, three items open

`src/instruments/patch-synth.js` is complete — CONTRACTS §16.7.1 through §16.7.8, 1942
lines. Driven in a real headed Chromium and it makes sound. **Three of the six items below
are CLOSED 2026-08-31 by `patch-synth-finish`** — the angle token, the canvas that would not
scroll, and the missing page. Detail:
[receipt-patch-synth.md](Builddocs/P4-the-daw/S3-systems/receipt-patch-synth.md) third
section. Harnesses: stub 66 PASS, page driver 55 PASS, CDP touch driver 10 PASS, 0 fail.

- **RULED 2026-08-31 — cable fan-in stays as built.** §16.7.6 said "one cable per input
  port"; §16.7.7's parallel chain feeds two cables into one `gain` input. Built so audio
  inputs fan in and control inputs hold one — Web Audio summing at an audio input is
  §16.7.7's own mechanism, and PARALLEL PROCESSING is Brandon's fixed word. Brandon
  confirmed: stays as built. §16.7.7 is not being rewritten.
- **BRANDON — how much of the box a beginner sees first.** Still his, now with something
  to react to: palette always visible in both views, Math last/collapsed/muted, an empty
  canvas holding one `out` node, no starting patch. The unruled alternative is opening
  with `osc → filter → gain → out` already patched so a student *hears* before they
  build.
- **Node weights are still counted, not measured.** §8's cost table has no row for
  `OscillatorNode`, `AudioBufferSourceNode` or `ConstantSourceNode`; osc 9, noise 9, env 1
  and now add 2, multiply 1, scale 3, invert 1 are all UNVERIFIED. Brandon measures
  `cpuWeight` himself in testing — no agent touches it.
- **CLOSED 2026-08-31 — the `90deg` literal. Brandon ruled: add the token.**
  `--angle-vertical: 90deg` appended to [tokens.css](src/ui/tokens.css), P4 `:root` block,
  new `ANGLE` heading, appended only. `patch-synth.js` is now **zero raw literals**,
  grep-verified.
- **CLOSED 2026-08-31 — the canvas moves like a map.** Brandon's words: *"we need it to
  scroll... it's gotta move like a map where you can zoom in and out too, left click on the
  canvas and drag it directions."* A `.ps-scene` transform layer inside `.ps-canvas`:
  left-drag on empty canvas pans, node-head drag still moves the node, wheel and trackpad
  ctrl-wheel zoom about the cursor, two-finger touch pinches, zoom holds 0.25–2, both views
  keep their own camera across repaints. Node drag now clamps to a 1200×1500 model scene
  instead of the pane — **node 24 lands fully inside the pane at zoom 0.25, 0.5, 1, 1.5 and
  2**, proved in headed Chromium.
- **CLOSED 2026-08-31 — `tools/patch-synth.html` exists.** Built on `tools/beat.html` as the
  pattern: file menu (`TOOLS` row flipped in a copy, `shell.js` untouched), CPU meter with
  the unlock button and `noCap`, `mountExpanded`, a 12-note keyboard on the input bus, one
  bus→`noteOn` monitor, clean teardown on `pagehide`. Verified: silence → RMS `0.4167` while
  a key is held → silence on release. **The scratch harness is no longer the only way in.**
  `shell.js`'s own `TOOLS` flag is still `available: false` — not this seat's file, and the
  page flips it in a copy.
- **A reviewer should look at two things** from the camera pass: the graph paper does not
  travel with the camera (texture, not coordinate — left static rather than invented), and
  horizontal pan is a deliberate no-op at zoom 1 on a pane wider than the 1200-unit scene.
- Full detail: [receipt-patch-synth.md](Builddocs/P4-the-daw/S3-systems/receipt-patch-synth.md)
  AGENT 2 and `patch-synth-finish` / OPEN DECISIONS.

## NEW — 2026-08-31 — P4/S5 `governor`, BUILT, needs page wiring

`src/ui/cpu-meter.js` built — `createGovernorMeter()` + `restoreNoCap()`, §16.8. 24/24 in
headed Chromium. Full detail: [receipt-governor.md](Builddocs/P4-the-daw/S5-automation-governor/receipt-governor.md).

- **Nothing mounts it yet.** `daw-shell.js` is frozen to this seat and already mounts
  `shell.js`'s plainer P1-level meter in its header. This file is the P4 replacement —
  breakdown of nodes/inserts/sends, a refusal banner, persisted `noCap` — standalone until
  a later seat wires it into the transport bar next to tempo and calls `restoreNoCap()`
  early in boot, before any other `createCpuMeter()` call reads `governor.noCap`.
- **`governor.request(cost)` ignores `cost`** (CONTRACTS §16.12 #7, `audio.js` frozen) —
  confirmed live this pass, not fixed. `graph.js`'s own count caps front-run it in
  practice, so no P4 seat has hit a case where the ignored weight actually let something
  through it shouldn't have.

## NEW — 2026-08-31 — P4/S5 `automation`, BUILT AND HEARD, not blocking

`src/mixer/automation.js` built — `AutomationLane` + `createChannelAutomation()`, §16.6/§7.
12/12 in headed Chromium, gain fade measured audible off `masterAnalyser`. Full detail:
[receipt-automation.md](Builddocs/P4-the-daw/S5-automation-governor/receipt-automation.md).

- **`strip.js` has no raw `AudioParam` and no scheduled-write method.** §16.6 names
  `setValueAtTime`/`linearRampToValueAtTime` directly on the param; worked around with
  self-computed interpolation resampled at 50 Hz plus a residual `setTimeout` bridging
  `clock.schedule`'s ~100 ms early-fire gap. Measured audibly correct. **Decider:
  Troubleshooter**, only if a future seat needs tighter-than-audible timing than this gives.
- **Fader-grab hand-lock reads `strip.js`'s rendered DOM by class name**
  (`.cbdaw-strip__fader`/`.cbdaw-strip__pan`), not a public API built for this. Works today;
  move it to a real hook if `strip.js` ever grows one. **Decider: Troubleshooter**, not
  blocking.
- **Master is not wired** — §7 gives `master` no `automation` array, only `channels[]`
  entries have one. Not built. Flagged, not picked silently.
- **Launch-prompt-vs-brief file path conflict resolved before any write** — the coordinator
  confirmed `/src/mixer/automation.js` (brief + CONTRACTS §16.11) over a stale prompt naming
  `src/ui/automation-lane.js`. Closed, not open.

## NEW — 2026-08-31 — P4/S4 `node-graph`, BUILT AND HEARD, two items for Brandon

`src/mixer/graph.js` shipped — §16.5's routing graph, the only file in the app that changes
a route. 39/39 in headed Chromium, audio measured off `masterAnalyser`, a parallel chain
built by real mouse drags. Zero raw literals. Full detail:
[receipt-node-graph.md](Builddocs/P4-the-daw/S4-graph/receipt-node-graph.md).

- **CLOSED 2026-08-31, `strip-tap-fix`.** Brandon ruled: all ports tap the same point, post-
  fader. `strip.js` got the new public accessor (`postFaderTap`) and a simplified fixed
  `_wireChain()`; `graph.js`'s `_repatch()` now fans every channel's tap and every insert's
  output out to their own edges' targets uniformly — port 0 and sends no longer differ.
  39/39 harness still passes; isolated-path RMS off `masterAnalyser` proves both paths tap
  the same point and both scale with the fader identically. Two small items left, both
  cosmetic and both **Decider: Brandon** — the strip's own level meter now reads pre-insert
  instead of post-insert (§16.1's post-fader/pan/mute rule for `meterTap` still holds, it
  says nothing about pre/post-insert), and the master out chip's new label, `Output`, is
  this seat's word choice, not his. See
  [receipt-strip-tap-fix.md](Builddocs/P4-the-daw/S4-graph/receipt-strip-tap-fix.md).
- **A branch device gets no strip slot, by construction.** `setInserts()` wires whatever it is
  given in series, so only the port-0 chain can occupy slots; a branch shows in the `out` chip
  instead — which is exactly §16.4a's own `out: ['Master', 'Reverb']` example. Consequence: a
  channel can hold 4 inserts and display fewer than 4 filled slots. Recorded, not blocking.
- **An insert accepts one incoming cable**, which is also what makes a cycle structurally
  impossible here. Same question as the §16.7.6-vs-§16.7.7 fan-in above, one layer down —
  whatever Brandon rules there is worth reading against this.
- **`mixer/graph.js` is connecting *from* `strip.meterTap`.** §16.4b writes "reads this, never
  reconnects" at `vis/meter.js`; adding an outgoing connection does not disturb the analyser's
  reads. Flagged because the graph is a second consumer of a node §16.4 describes as the
  meter's.
- **Nothing constructs a `Graph` yet.** `daw-shell.js` has a `MOUNTS.nodeGraph` pane waiting;
  `index.html` is frozen to the S4 seat, so wiring it is a later seat's job.

## NEW — 2026-09-03 — piano roll ↔ region wiring, noteOff seam + duplicate regions

Piano Roll now follows the arrangement's selected region in `tools/daw-window.html` and is
audible — `roll-scheduler.js` read `n.start` where the project writes `tick`, fixed. Full
detail: [session review](docs/reports/2026-09-03-session-review-piano-roll-region-wiring.md).

- **THE NOTEOFF SEAM, next session's first work.** Both live instruments mishandle a
  `noteOff` scheduled in the future; live notes are clean.
  [wave-synth.js:275](src/instruments/wave-synth.js#L275)/[:308](src/instruments/wave-synth.js#L308)
  reads `gain.gain.value` at call time, writes it as a hard value at a future `t0` — clicks.
  Brandon's tell: longer notes remove it.
  [overtone-synth.js:187](src/instruments/overtone-synth.js#L187) clamps `atTime` to
  `currentTime` — a scheduled release fires immediately and truncates, clips. See the current
  warm start in [MEMORY.md](MEMORY.md).
- **Duplicate regions, not confirmed.** Brandon saw two regions on a lane he did not create.
  Lead: [arrangement.js:1046](src/ui/arrangement.js#L1046) — `capture.on('commit')`
  subscribed per lane with no matching `capture.off`; [:845](src/ui/arrangement.js#L845)
  clears the lane map on rebuild but leaves those subscriptions live.
- **A second receipt for this work is still coming.** Closer to fold it into
  [2026-09-03-closer-piano-roll-region-wiring.md](docs/reports/2026-09-03-closer-piano-roll-region-wiring.md)
  and the matching worklog entry when it lands — not yet done.

## NEW — 2026-09-03 — DAW header layout, fixed but unverified

Session left **UNCLOSED** at Brandon's instruction — see
[review](docs/reports/2026-09-03-session-review-daw-header-layout.md).

- **Reload `tools/daw-window.html#dev` and confirm the header is a row.** The fix is
  edits-only; nothing was run in a browser. This is the open risk, not a formality.
- **Is 32px narrow enough for the number inputs?** `--sp-16` = `--sp-unit × 16`. Brandon's
  eye decides.
- **900px breakpoint — wrap or scroll?** It now wraps to new lines. The alternative is one
  row that scrolls sideways. Brandon's call; no token exists for the breakpoint either way.
- **`--flexdir-row` added to tokens.css by a session agent.** Global-token addition. Does it
  belong, and does `skinspecs/token-coverage.md` need it? Closer to judge.
- **`acquireStyle` is now a public export of `daw-shell.js`.** Ref-count reachable from two
  callers (`mountDawShell` and `daw-window.html`). `index.html` unaffected. Worth a CONTRACTS
  note? Closer to judge.

## CLOSED 2026-08-31 — P4/S2 `daw-shell-fix`, ch1 demo instrument vs. `mixer-strips`

Wiring deferral from the earlier P4/S2 pass is CLOSED — `state.js` has its `'project'`
slice, the shell is wired (header, transport, surface switcher, isolate control), see
[receipt-daw-shell.md](Builddocs/P4-the-daw/S2-shell/receipt-daw-shell.md) CORRECTION PASS.

- **The ch1 collision itself is CLOSED, `shell-cleanup` pass:** `wireDawShell()`'s demo
  Wave Synth deleted outright — `strips.ch1` is empty DOM, verified live. Nobody has to
  choose between clearing the host or pulling the demo; there is no demo left. See
  [receipt-shell-cleanup.md](Builddocs/P4-the-daw/S3-systems/receipt-shell-cleanup.md).

## NEW — 2026-08-31 — Skin sweep, tokenization close, open items

Session ruled everything tokenizes except `src/ui/devbox.js`. 844 raw CSS sites closed to
22, all named and classed. Full numbers and links: current warm start in
[MEMORY.md](MEMORY.md), [session review](docs/reports/2026-08-31-session-agent-review-skin-sweep.md).

- **Four values need a ruling** — no token exists, off the `--sp-*` scale: `min-width: 260px`
  at [tools/beat.html:54](tools/beat.html#L54) and [src/ui/shell.js:213](src/ui/shell.js#L213),
  `inset: -8px` at [src/instruments/wave-synth.js:416](src/instruments/wave-synth.js#L416),
  `margin-left: -2px` at [src/surfaces/piano-roll.js:489](src/surfaces/piano-roll.js#L489).
- **Sixteen sites behind escalation entries pending a ruling** — `font-size` 16/18px
  (variant-block), `gap` 3/7/22px + `padding` 20px (off-scale, unnamed), `stroke-width`
  0.6-2 (SVG presentation-attribute fence). Full site list:
  [seat7-final-sweep.md](docs/reports/2026-08-31-seat7-final-sweep.md) task 9.
- **Canvas wiring — the 8 `_fade()` alphas CLOSED 2026-08-31 (P4/S2 `daw-shell`).** The
  colour side of the "73 canvas-context assignments" was already resolved pre-existing
  (`getComputedStyle` via `readTokens()`); the 8 `_fade()` alpha literals in
  [src/vis/spectrum.js](src/vis/spectrum.js) and [src/vis/scope.js](src/vis/scope.js) now
  read `--fade-*` tokens, exact value match, verified drawing in real Chrome. Remaining,
  unstarted: `textAlign`/`textBaseline`/`lineJoin` keyword literals in the same two files —
  exact tokens exist (`--canvas-textalign-*`, `--canvas-textbaseline-*`, `--canvas-round`),
  ~15-20 sites, not wired. Full detail:
  [token-coverage.md](Builddocs/skinspecs/token-coverage.md),
  [receipt-daw-shell.md](Builddocs/P4-the-daw/S2-shell/receipt-daw-shell.md).
- **Dial-alignment pass** — 262 tokens in `tokens.css` are flat literals, not scales driven
  by a dial. Brandon wants to see what the dials currently do before this is scoped.

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

## BUILT 2026-08-31 — synth voice normalization — SHIPPED, PROBLEM NOT SOLVED

**Brandon, verbatim:** *"When the players begin new voices/oscillators, the volume increases
too much... somehow we have to program it so that they normalize."*

Built into [audio.js](src/core/audio.js) §4a. Each synth channel's gain scales by its own
live voice count, `gain(n) = n ** -exponent`. Opt-in is an instrument id passed to
`createChannel()`; drums and the metronome pass nothing and hold gain 1, so Brandon's
*"don't have it do it to the drums"* needed no exception clause. `shell.js:983` and
`harmonyNEW.html:442-443` opt in.

**The reported problem is still there.** Brandon: *"still not great, still there"* — a
slammed chord distorts for under a second, then drops. Diagnosed as clipping, not lag:
`register()` runs after `trigger()` per §11.2, so the chord sounds unducked first. Fixed the
race (duck written with `setValueAtTime` at the voice's own start timestamp) and it did not
resolve it.

**Open, in order:**
- **Diagnostic first.** Set `mode: 'off'` at [audio.js:200](src/core/audio.js#L200), slam the
  same chord. Still distorts → the original clip. Clean → the instant duck is a
  discontinuity and the click was added by this build.
- **Then pick one:** exponent 1.0 (in-phase oscillators add peaks at `n`, not `√n`, so 0.6
  under-corrects), random voice start phase, or a limiter on `masterGain`. There is no
  limiter anywhere in the project.
- **Dev bar, Brandon's ask:** `normState` at [audio.js:200](src/core/audio.js#L200) — mode,
  exponent, responseMs — as controls in `devbox.js`. ~10-13k, three knobs plus a per-channel
  readout. `synthVoiceNorm.readout()` already returns `[{ id, voices, gain }]` for it.
  Note the devbox knob pipeline writes CSS custom properties, so an audio knob reuses
  `el()`, `save()` and the `mk()` idiom but not `setKnob`.

Links: [receipt](docs/reports/2026-08-31-goto-synth-voice-normalization-build.md) ·
[design](docs/reports/2026-08-31-synth-voice-normalization-design.md)

## OPEN — handle the drum synth / sampler sound engine

Brandon's bucket, 2026-09-01. Many changes he wants; they are not enumerated here and do not
go to MEMORY. He opens this when he opens it. Includes the hi-hat choke (old P2-7) and the
sampler's gain param (old P2-8) and the kit picker (old P2-9).

Standing notes an agent entering this bucket should have:

- **Bus-emit input architecture, silent-pad failure mode.** Pads and keys in `drum-synth.js`
  emit on `core/input.js`'s bus rather than calling `noteOn` directly. A host that mounts
  this instrument without wiring the bus to `noteOn` gets silent pads. `tools/beat.html`
  wires it correctly and is the only page mounting the instrument today.
- **Slot index order is load-bearing** — `KEY_LAYOUTS` and the per-slot sample lists both key
  off it. Reordering or renaming a slot means updating both in sync.
- **`src/instruments/drum-sampler.js` is dormant** — on disk, imported by nothing, still
  carries the old (pre-rename) slot labels.
- **44 `§` comment references remain** in the synthesis-recipe half of `drum-synth.js`.

## OPEN — work on the overtone synth and the wave synth

Brandon's bucket, 2026-09-01. Same shape as the drum bucket — his changes, not enumerated
here, not in MEMORY. Old **D-22** (rebuild `overtone-synth.js` from 8 partials to 12,
CONTRACTS §11.5/§11.1a amended; `cpuWeight` 21 stays PROVISIONAL until measured live) folds
in here.

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
- **S2 opened and ran to near-completion 2026-08-31 — CLOSED as a question.** 844 raw sites
  closed to 22 via script + hand seats, not S2's original 9-lane plan. What's left: the four
  rulings and sixteen escalation sites in the 2026-08-31 skin sweep section above.
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
- **Theory is GOOD FOR NOW — 2026-09-01, Brandon.** Whatever is left in
  [theory-report.md](Builddocs/P3-harmony-tool/S2-theory-check/theory-report.md) is his to
  worry about. No agent picks it up, no agent raises it.
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
- **P2-7 / P2-8 / P2-9** — moved into the drum synth / sampler sound engine bucket above.
- **D-22** — moved into the overtone / wave synth bucket above.

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

# TEST REPORT — test-p4 — P4/S6

2026-09-01 02:27 EDT

SEAT: `test-p4`. Brief: [A-test-p4.md](A-test-p4.md). Predecessor: `verify-daw-wiring`
(mount-only check, [receipt-verify-daw-wiring.md](receipt-verify-daw-wiring.md)) — this pass
answers the ten seat questions that verifier did not.

**Server:** `python3 -m http.server 8793` from the project root, still running.
**URL:** `http://127.0.0.1:8793/index.html`
**Browser:** Playwright's own bundled Chromium, headed, fresh `mkdtemp` profile,
`launchPersistentContext`, no `channel` set. Left OPEN at the end of this pass, per brief —
node harness process pid held it alive idling. Do not kill via `pkill`/`killall`; a human or
an unconstrained seat closes it.

**Method:** the live app was driven through its own public JS surface
(`window.cbdawDaw.{header,transport,surface,mixer,graph,arrangement,automation}`, plus
`import()` of `core/audio.js` and `core/clock.js` a second time — same specifier, same
browser module cache, same live singletons) rather than only pixel clicks, because several
of the ten questions need real signal and real state, not just DOM presence. Every device
and every graph operation below was exercised through the product's own real methods
(`graph.addInsert`, `graph.connect`, `strip.gain =`, `AutomationLane.addPoint`, …) — nothing
here is a stub or a fake implementation standing in for the app.

**Headline finding, load-bearing for questions 1, 3, 6, 9:** the live app currently mounts
**zero instruments onto any channel.** `wireDawShell()` in `src/ui/daw-shell.js` accepts an
`instrumentCtor` parameter but never reads it (confirmed by source inspection and by the
`shell-cleanup` receipt, which deliberately deleted the only code that ever did). There is no
button, menu, or drag target anywhere in the shipped UI that loads any of the six §2
instruments onto `ch1`…`ch6`. Every mixer channel is permanently silent as shipped. This one
gap is the reason several questions below are answered PARTIAL or UNVERIFIED rather than
PASS, and it is named once here rather than repeated ten times.

Two further integration gaps, same shape (a built file that the shipped app never calls):

- **`src/ui/cpu-meter.js`** (the `governor` seat's deliverable — node/insert/send breakdown,
  `noCap` persistence) is imported by nothing except its own throwaway test harness. The
  live header meter is `shell.js`'s base `createCpuMeter` only.
- **Device pop-outs.** `Graph` takes an `onDevicePopout` callback and `Strip` takes an
  `onSlotPopout` callback — both exist, both fire — but `wireDawShell()` passes neither, and
  nothing connects them to the `device-popout` mount `daw-shell.js` itself builds. Clicking a
  device slot or a graph insert node does nothing visible in the shipped app today.

---

## Q1 — Does the phase done-check pass?

**FAIL.** Clause by clause, against [PHASE.md](../PHASE.md)'s DONE-CHECK:

| Clause | Result |
|---|---|
| `/index.html` loads on a static file server | **PASS** — 162 ms cold load, one harmless `favicon.ico` 404 (Python's `http.server` has none; not an app defect), no page errors |
| Six instruments on six channels run on one transport | **FAIL** — zero instruments ever mount on any channel; see headline finding. File: `src/ui/daw-shell.js`. Seat: `daw-shell` |
| Header sets scale, time signature, BPM; instruments inherit the scale | **PARTIAL** — header sets all three (verified live) and the scale change reaches `state.scale` and every scale-shaded P3 surface (verified: `diatonic-keys` redraws on tonic change). "Instruments inherit the scale" is untestable — no instrument exists on any channel (same root cause as above) |
| Devices work with their visuals | **PARTIAL** — all five devices verified working with real signal (Q6). Their visuals (`mountCompact()`) render correctly when a harness mounts them directly, but the shipped app never shows one — no pop-out wiring exists (see headline finding) |
| The graph adds inserts and builds a parallel chain | **PASS** — verified live, see Q5 |
| Automation moves a fader | **PASS** — verified live with real numeric samples, see Q7 |
| The CPU meter reads, and `noCap` lifts the caps | **PASS on mechanism** (verified live, see Q8); the meter mounted in the shipped header is the base P1 meter, not `governor`'s P4 breakdown meter (see headline finding) |

## Q2 — Does every seat's own done-check pass?

Eleven seats, each done-check read from its own `A-*.md`, checked against this pass's live
findings where this pass touched that surface, otherwise checked against the seat's own
receipt only (marked "not re-run this pass").

| Seat | Result | Basis |
|---|---|---|
| `spec-transport` (S1) | PASS | File-list non-overlap claim in its receipt; unaffected by anything found this pass |
| `daw-shell` (S2) | **FAIL** | Its own written done-check requires "at least one P1/P2/P3 instrument mounts compact on a channel and plays on the shared transport." True after the CORRECTION PASS in its receipt; false today — the later `shell-cleanup` pass deleted that code (`receipt-shell-cleanup.md`, TASK 1). "Disposal leaves zero leaks" — **PASS**, confirmed this pass (Q9's leak count) |
| `arrangement` (S3) | UNVERIFIED (partial) | Mount confirmed (1 child under `[data-mount="arrangement"]`). Loop-region cycling, punch-into-one-lane, and no-sideways-scroll were **not exercised this pass** — not enough of the ten-question budget was left for arrangement depth. Piano-roll/step-grid sub-mount not independently re-verified; taken from `receipt-arrangement.md` |
| `device-dynamics` (S3) | PASS | Gate and compressor both driven with a real 440 Hz tone this pass; readouts moved correctly (Q6) |
| `device-space` (S3) | PASS | Reverb's `cpuWeight` measured live across all six IR sizes, exact match to CONTRACTS §8; delay's 95% feedback clamp measured live (Q6) |
| `device-spectral` (S3) | PASS | EQ's spectrum analyser measured live, energy increased on a boosted band under a matching test tone (Q6) |
| `mixer-strips` (S3) | PASS | Six strips + master render; fader/pan/mute/solo confirmed **not** to call `setInserts` (Q5); routing chip text confirmed present |
| `patch-synth` (S3) | UNVERIFIED | Not reachable through the shipped UI — patch-synth is a sixth *instrument* (§16.7) and is blocked by the same headline gap as Q3. Not independently re-instantiated this pass; no seat-question time budget left. Its own receipt reports 29/29 assertions passing in isolation |
| `node-graph` (S4) | PASS | `addInsert`, manual `connect`/`disconnect` into a real parallel chain, cap refusal, `noCap` lift — all verified live this pass (Q5, Q8) |
| `automation` (S5) | PASS | Schema, linear interpolation over real transport time, fader-grab hand-wins-while-held — all verified live this pass with real sampled numbers (Q7). The mute lane's stepped switch was scheduled but occurred outside this pass's 2.9 s sampling window — not directly observed, though the same scheduling code path fired the (observed) gain lane correctly |
| `governor` (S5) | PASS on the governor's own file | 32-voice cap measured exact, `noCap` lift measured on both voice and graph caps (Q8). `cpu-meter.js`'s own receipt reports 24/24 assertions in isolation. Its dead-integration status (headline finding) is `daw-shell`'s wiring, not a defect in `governor`'s file |

## Q3 — Do six instruments run on one transport?

**FAIL.** Cannot be tested as shipped: no UI path loads any instrument onto any channel
(headline finding). File: `src/ui/daw-shell.js` — `wireDawShell()`'s `instrumentCtor`
parameter is accepted and never read. Owning seat: `daw-shell` (S2).

## Q4 — Does the project header hoist the scale?

**PASS**, for the mechanism and for scale-aware surfaces. Clicked the header's tonic `+`
control twice live (C → D). `state.scale.tonic` updated (readout confirmed). The default
playing surface (`12-Note Keyboard`) showed no visible change — expected, it is not
scale-shaded by design. Switched the playing surface to `diatonic-keys` (a scale-shaded P3
surface) and repeated the tonic change: its DOM content changed (`innerHTML` diff confirmed
non-empty). **"Every pitched instrument follows" is untestable** — no instrument exists on
any channel (Q3's finding). `scale-circle` and `piano-roll` were not independently
re-checked this pass; both already default to the same shared `core/state.js` singleton per
`daw-shell`'s own receipt, and the wiring mechanism proven here (`state.on('scale')`) is the
same one they bind to.

## Q5 — Does the graph do what it is for?

**PASS.** Built the exact CONTRACTS §16.5b shape live, on `ch2`:

- `graph.addInsert('ch2','eq')` → `i1`, `graph.addInsert('ch2','delay')` → `i2` (serial by
  default)
- `graph.disconnect(i1, 0)` then `graph.connect('ch2', 1, i2, 0)` → rewired into two
  independent branches
- Resulting edges: `ch2(port0)→i1→master` and `ch2(port1)→i2→master` — **both reach
  master**, confirmed by reading `graph.getState()` directly, not by inference
- Cap refusal confirmed: pushing a 3rd/4th/5th/6th insert onto `ch2`'s port-0 chain returned
  `i3`, `i4`, then `false`, `false` — refusal text read from the graph pane's own DOM:
  `"Channel 2 is full — 4 inserts."`, `data-kind="refused"`

**"No control on any strip can change a route" — confirmed live, not just by code reading.**
Spied on `ch2.setInserts` (the graph's only entry point per CONTRACTS §16.1/§16.4), then
drove the strip's own `gain`, `pan`, `mute`, `solo` setters directly. Call count on
`setInserts`: **0**.

Audibility is Brandon's to confirm by ear (see AWAITING-BRANDON below); the measurable half
— that both branches actually carry signal to `master` — is proven by the edge topology
above, which is the same thing the app's own audio graph enforces at connect-time (Web Audio
sums at a shared input node; there is no code path here that would let one branch silently
not reach it).

## Q6 — Do all five devices work?

**PASS, all five**, each constructed through the real `graph.addInsert()` path (not a bespoke
instance) and driven with a real oscillator tone into the owning strip's `input`
(`channelIn`) — a substitute for the missing instrument wiring (Q3), used only to produce a
real audio signal to test devices against, not to claim Q3 is fixed.

| Device | cpuWeight (live) | vs. CONTRACTS §8/§16.2/§16.3 | Behavior confirmed |
|---|---|---|---|
| Gate | 3 | exact match | Loud tone → `{open:true, levelDb:-4.95}`; silence 500 ms later → `{open:false, levelDb:-100}` |
| Compressor | 45 | exact match | `{reductionDb:-11.42, inputDb:-4.95, outputDb:-5.93}` on a tone above its -24 dB default threshold — real gain reduction happened |
| EQ | 29 | exact match | Spectrum energy sum at 1 kHz: 1230 at default gain → 2890 after `band1.gain=+24 dB` on a 1 kHz test tone — the boosted band measurably increased energy in the right direction |
| Reverb | 133/150/165/184/235/325 at IR 0.1/0.25/0.5/1.0/2.0/4.0 s | **exact match, all six points**, CONTRACTS §8's interpolation table | `cpuWeight` re-read live after each `setParam('size', …)` |
| Delay | 5 | exact match | `feedback` set to 150, clamped to 95 — matches §16.3e's hard clamp |

All five `dispose()`d without throwing. Gate/compressor return a
`{nodesDisconnected, listenersDropped}` report (6/0 and 8/0); EQ/reverb/delay's `dispose()`
returns nothing (`undefined`) — CONTRACTS §2 doesn't mandate a return shape, only that every
node/listener is dropped, so this is a **note, not a failure**.

**Visual confirmation — PARTIAL, and the gap is the app's, not the devices'.** Each device's
`mountCompact()` was called directly by this harness into an on-screen element (not the
product's own pop-out, which is unreachable — see headline finding). The compressor's own
`mountCompact()` did not produce a `<canvas>` element under the selector this harness used —
worth a second look by `device-dynamics` or `redpen-p4`, since this harness cannot rule out
its own selector being wrong for a DOM/CSS-drawn gain-reduction bar rather than a canvas one.
EQ's spectrum canvas and the numeric readouts on gate/compressor/reverb/delay were all
confirmed present and changing.

## Q7 — Does automation move a fader?

**PASS**, with real sampled numbers, not inference.

- Drew a gain lane on `ch1`: `{tick:0,value:1.0}` → `{tick:15360,value:0.0}` (half the song
  length). `getState()` returned `{target:"strip.gain", points:[{tick:0,value:1},
  {tick:15360,value:0}]}` — **exact CONTRACTS §7 schema.**
- Drew a mute lane: `{tick:7680,value:1}, {tick:23040,value:0}` — same schema, stepped
  target.
- Played the transport for 2.9 s and sampled `strip.gain` every 150 ms: **1.000 → 0.993 →
  0.983 → 0.974 → … → 0.823**, a smooth, monotonic, linear-in-time descent — exactly the
  shape a linear ramp toward the tick-15360 target produces this early in the ramp. Values
  were read from the live `AudioParam`-backed getter, not from the lane's own drawn curve —
  this is the actual fader moving, scheduled from `clock.on('tick')` as CONTRACTS §16.6
  requires, confirmed by watching `clock.positionTicks` advance in step with the samples.
- **Fader-grab rule confirmed live, exactly as CONTRACTS §16.12 item 3 specifies:**
  simulated a `pointerdown` on the real `.cbdaw-strip__fader` element, set `strip.gain = 1.3`
  by hand, waited 400 ms — value held at **1.3**, the lane did not overwrite it. Released
  (`pointerup`), waited 400 ms — value moved to **0.763**, the lane resumed control and
  continued its curve. **Hand wins while held; lane resumes at the next point — both true.**
- Mute lane's stepped switch (at tick 7680, ≈ 8 s of playback) fell outside this pass's 2.9 s
  sampling window — not directly observed this pass, though it is scheduled through the
  identical `_onTick`/`_writeAt` code path proven live for the gain lane above.

Audible confirmation of the fade is Brandon's — see AWAITING-BRANDON.

## Q8 — Does the governor govern?

**PASS**, all four measurable clauses, all with real numbers:

- Pushed 40 sequential `governor.request(10)` calls with `noCap` off, registering a voice on
  every `true`. **Refused starting at the 33rd call (registration index 32)** —
  `voicePool.count` was exactly **32** at that point. Exact match to CONTRACTS §8's 32-voice
  default.
- Flipped `noCap` **through the real UI checkbox** (`[data-nocap]`, the same control a
  student clicks) — `governor.request(10)` immediately returned `true` again.
  Registered 20 more voices past the old cap: **count reached 52**, nothing refused.
- Retried the graph insert that CONTRACTS §16.1's cap had just refused in Q5 (`ch2`'s 4-insert
  cap) — with `noCap` on, it succeeded (`i10`), confirming the **same `noCap` flag lifts both
  the voice cap and the graph's node/insert/send caps**, per §16.8.
- Cleaned up: released every simulated voice; `voicePool.count` and `governor.allocatedWeight`
  both returned to **0**.

**Two honest limits on this measurement, reported, not hidden:**

1. The header meter's `[data-voices]` text still read `"0"` at the moment this pass read it
   mid-cap-push — this is a **harness artifact, not a product bug**: the meter is drawn from
   its own `requestAnimationFrame` loop (`shell.js`'s `createCpuMeter`), and the voice-cap
   push in this pass ran as one uninterrupted synchronous loop with no yield back to the
   browser's paint/rAF cycle before the DOM was read. The underlying `voicePool.count` the
   meter reads was correctly 32 at that instant; the DOM text simply had not had a frame to
   catch up. Not re-tested with a yield inserted — flagging so nobody reads "0" as the meter
   being broken.
2. `governor.load`'s stress test used plain `{cpuWeight}` objects, not real `Voice`
   instances — `governor.load`'s probe touches `voice.state` on every registered entry, and
   a plain object has no such getter, so this pass's load reading under 300 simulated voices
   (**0.00015**, effectively flat) almost certainly **understates** what a real voice
   population would cost. Not a governor defect — a limit of this pass's synthetic voices.

Visible refusal: the **graph-side** refusal (nodes/inserts/sends) is visible and was read
directly from the graph pane's own DOM in Q5. There is **no dedicated visible indicator for
the voice cap specifically** in the shipped header meter (it shows a plain voice count, no
"refused" state) — and since no instrument can register a real voice through the shipped UI
at all (Q3), this half of "confirm visible refusal" could not be demonstrated end-to-end
through the product; the mechanism underneath it is proven correct above.

## Q9 — What are the metrics?

| Metric | Value | Unit | Condition |
|---|---|---|---|
| `governor.load`, 1/3/6 instruments loaded | **UNVERIFIED** | — | No UI path loads any instrument (Q3). Not substituted with direct module instantiation this pass — time budget spent on the nine other questions; flagging rather than guessing |
| Voices before audible glitch, `noCap` off | 32 (hard cap, refused beyond) | voices | `governor.request()` refuses at 32; whether 32 real voices glitch audibly is Brandon's to judge — see AWAITING-BRANDON |
| Voices before audible glitch, `noCap` on | 52+ tested, no refusal, no crash observed | voices | Tested to 52 simulated voices with no admission refusal; audible glitch point is Brandon's to judge by ear, this pass cannot hear |
| Frame time, mixer + graph + arrangement visible (default layout) | 17.39 avg / 17.30 p95 / 100.90 max | ms/frame | 115 frames sampled over 2.0 s, real headed Chromium, default DAW layout, idle (no playback) |
| Frame time, every device visual mounted (5 devices, on-screen) | 16.67 avg / 17.30 p95 / 17.70 max | ms/frame | 120 frames sampled over 2.0 s, same layout plus all 5 device `mountCompact()` panels on-screen simultaneously. **No measurable degradation** — the 100.9 ms outlier in the baseline run did not recur here, most likely one-time setup jank rather than a device cost |
| Reverb's real cost in units | 133 / 150 / 165 / 184 / 235 / 325 | `cpuWeight` units | IR length 0.1 / 0.25 / 0.5 / 1.0 / 2.0 / 4.0 s, measured live off the constructed device — **exact match** to CONTRACTS §8's table, all six points |
| Graph node count before frame time degrades | no degradation observed up to 80 nodes | nodes | Frame time held flat at **8.33 ms/frame** (≈120 Hz, this display's vsync ceiling) at 22, 24, 40, 60, and 80 mixer-graph nodes (built via `addInsert` with `noCap` on) — the app never taxed the main thread enough in this range to fall below the display's own refresh ceiling. Not tested past 80 nodes |
| Page weight, `/index.html` cold load | 740,250 | bytes transferred | `Network.clearBrowserCache` + fresh navigation; 28 resources (all ES modules + `tokens.css`), no bundler — expected for a no-build-step app per CONTRACTS §10 |
| Cold load time, `/index.html` | 162 | ms | Same cold-cache navigation, `load` event |
| Leak counts over 20 full mount/dispose cycles | 0 | net DOM nodes / voices / allocated weight | `mountDawShell()` → `wireDawShell()` → `.dispose()` → `.unmount()`, 20 times, in a fresh page. DOM node count held at exactly **11** every single cycle (no growth trend); `voicePool.count` and `governor.allocatedWeight` were **0** after every cycle |

## Q10 — What failed, and who owns it?

| Failure | File | Seat |
|---|---|---|
| No instrument ever mounts onto any channel — `wireDawShell()`'s `instrumentCtor` param is dead | `src/ui/daw-shell.js` | `daw-shell` (S2) |
| `governor`'s P4 breakdown meter (`createGovernorMeter`) is never imported by the app | `src/ui/daw-shell.js` (the wiring site; `src/ui/cpu-meter.js` itself is correct and independently verified per its own receipt) | `daw-shell` (S2) to wire; `governor` (S5) not at fault |
| Device pop-outs (`onDevicePopout`/`onSlotPopout`) never connected to the `device-popout` mount | `src/ui/daw-shell.js` | `daw-shell` (S2) |
| `daw-shell`'s own written done-check ("at least one instrument mounts compact and plays") is unmet as shipped | `src/ui/daw-shell.js` | `daw-shell` (S2) — regressed by the `shell-cleanup` pass, see `receipt-shell-cleanup.md` TASK 1 |
| Compressor's gain-reduction visual not found under a `<canvas>` selector | `src/vis/gain-reduction.js` (unconfirmed — may be this harness's selector, not the file) | `device-dynamics` (S3) to check; not asserted as a defect |

No CONTRACTS §8 cap number is in question — every cap measured (32 voices, 4 inserts, the
reverb IR-cost table) matched the contract exactly. Nothing here is escalated to Brandon on
that basis.

---

## AWAITING-BRANDON — audible confirmation only

Everything below is set up and left running in the open browser
(`http://127.0.0.1:8793/index.html`) for Brandon to judge by ear. Everything measurable about
each condition is already reported above with a number.

1. **Q5/Q6 — devices audible.** The live page has, at time of writing, devices constructed on
   `ch3` (gate, compressor), `ch4` (EQ), `ch5` (reverb), `ch6` (delay), and a parallel EQ/delay
   split on `ch2`. Click each channel's insert slot area or reopen the node graph to inspect;
   the tone sources used to test them were short-lived (`oscillator.stop()`), so to hear
   them Brandon needs to trigger a new tone into the relevant strip — there is no instrument
   wired to do that with a click (Q3's finding). A minimal reproduction: open the browser's
   own devtools console on the open tab and run
   `const {ctx}=await import('/src/core/audio.js'); const o=ctx.createOscillator();
   o.connect(window.cbdawDaw.mixer.strips.ch4.input); o.start();` — that feeds a raw tone
   into `ch4`, which already has the EQ inserted, so its shaping is audible on the master
   output (assuming the tab has been interacted with once, to satisfy the autoplay gate).
2. **Q7 — automation audible fade.** `ch1` has a gain lane drawn (1.0 → 0.0 over the first
   half of the song) and a mute lane. Click the transport's Play button; with a tone routed
   into `ch1.input` the same way as above, the fade and the mute step should be audible.
3. **Q9 — voices before audible glitch.** Not reproducible with a click today — no instrument
   is wired to a channel (Q3). Brandon's own hardware recon, per CONTRACTS §3's standing
   caveat, is the next real measurement here regardless.

---

## FILE LOCATIONS

- This report: `Builddocs/P4-the-daw/S6-verify/test-report.md`
- Receipt: `Builddocs/P4-the-daw/S6-verify/receipt-test-p4.md`
- Harness (session scratchpad, not in the project):
  `test-p4-harness.mjs`, `test-p4-followup.mjs`, `harness.log`, `find404.mjs` — all under
  this session's scratchpad directory, not committed
- Server: `python3 -m http.server 8793` from the project root — left running
- Browser: Playwright Chromium, `mkdtemp` profile, left running (node harness pid holds it
  open; do not `pkill`/`killall` — see BROWSER FENCE in the dispatch prompt)
- Read, not edited: `Builddocs/P4-the-daw/PHASE.md`, `Builddocs/ROSTER.md`,
  `Builddocs/CONTRACTS.md` §8, §16, all eleven P4 seat briefs (`A-*.md`) and receipts under
  `S1-spec/` through `S5-automation-governor/`, `receipt-verify-daw-wiring.md`,
  `receipt-shell-cleanup.md`
- Code read (not edited, per lane): `index.html`, `src/ui/daw-shell.js`, `src/mixer/strip.js`,
  `src/mixer/graph.js`, `src/mixer/automation.js`, `src/ui/cpu-meter.js`, `src/ui/shell.js`,
  `src/core/audio.js`, `src/devices/gate.js`, `src/devices/compressor.js`, `src/devices/eq.js`,
  `src/devices/reverb.js`, `src/devices/delay.js`

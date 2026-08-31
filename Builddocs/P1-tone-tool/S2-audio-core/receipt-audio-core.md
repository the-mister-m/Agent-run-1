# RECEIPT — audio-core — P1/S2

Seat: `audio-core`. Task: [A-audio-core.md](A-audio-core.md). Stage: [STAGE.md](STAGE.md).

---

## 2026-08-23 00:04 EDT — start

DELIVERABLE STATE: Read A-audio-core.md, STAGE.md, CONTRACTS.md (§2, §5, §8, §11 — and
§1/§3/§10 for the surrounding frame), findings-webaudio.md, ROSTER.md in full. Confirmed
`/src` did not exist yet; created `/src/core/`. Noted the one hard environment fact this
run's earlier findings already established: `outputLatency === 0`, no audio device — so
"hear it" in the brief's DONE-CHECK must be answered with a measured non-silent signal,
never a claim of having listened. Beginning the seven seat questions in order.
NEXT ACTION: Answer Q1 — where the one AudioContext lives.
OPEN DECISIONS: none yet.
FILE LOCATIONS: no writes yet.

---

## 2026-08-23 00:05 EDT — Q1: the one AudioContext

DELIVERABLE STATE: `/src/core/audio.js` exports `ctx`, the single
`new (AudioContext||webkitAudioContext)()`, constructed exactly once at module load.
Nothing else in this file or any other constructs one (§10). Every instrument's
`constructor(ctx, out)` (§2) receives this exact instance.
NEXT ACTION: Answer Q2 — the master chain.
OPEN DECISIONS: none added this question.
FILE LOCATIONS: [/src/core/audio.js](../../../src/core/audio.js) §1 (`ctx` export).

---

## 2026-08-23 00:06 EDT — Q2: the master chain

DELIVERABLE STATE: Master chain built and wired: instrument's own chain (ending at its
own §11.6 per-instrument `AnalyserNode`, not owned here) → a channel gain node from
`createChannel()` → `masterGain` → `masterAnalyser` (the tap this file owns) →
`ctx.destination`. `createChannel()`/`releaseChannel()` are this seat's answer to a gap
CONTRACTS §2 leaves open: something has to hand every instrument its `out` node, and
`mixer/strip.js` (the eventual real answer) doesn't exist until P4. Logged as an open
decision below, not a STOP — it's additive inside my own owned file, contradicts nothing,
and without it no S3/S4 seat could construct an instrument at all this phase.
`masterAnalyser` is a second, separate tap from the per-instrument one §11.6 already
specifies — added because this seat needs an independent way to confirm a real signal is
reaching the chain in an environment with no speakers (see Q4/DONE-CHECK verification).
NEXT ACTION: Answer Q3 — voice allocation, stealing, freeing.
OPEN DECISIONS: `createChannel()`/`releaseChannel()` are not named anywhere in CONTRACTS
today. Decider: spec-core/Troubleshooter, on whether to fold these into CONTRACTS §1 or
leave them as this file's own internal mechanism until P4's mixer seats supersede them.
Not blocking — S3 needs this today regardless of where it's documented.
FILE LOCATIONS: [/src/core/audio.js](../../../src/core/audio.js) §2 (`masterGain`,
`masterAnalyser`, `createChannel`, `releaseChannel`).

---

## 2026-08-23 00:07 EDT — Q3: allocation, stealing, freeing

DELIVERABLE STATE: `voicePool` implemented exactly per §11.2 — `register(voice,
instrumentId)`, `release(voice)`, `steal()`, `count`. This file does **not** define
`Voice` (§11.1 is wave-voice's/overtone-voice's lane, P1/S3) and never calls
`trigger()`/`release()`/`steal()` on one — `voicePool.steal()` only *selects* the target
per §10-A (longest-released first, then longest-held) and returns it; the caller invokes
`.steal(atTime)` on the returned voice itself, matching §11.2 step 4 verbatim. One
implementation gap in the contract, resolved and logged rather than guessed silently:
§11.1's Voice exposes `.state` but §11.2 gives `voicePool` no push notification for when a
voice enters `'releasing'` — release() is called on the Voice directly, never through the
registry. Resolved by having the registry lazily timestamp (via `performance.now()`,
monotonic regardless of `ctx.state`) the first moment it *observes* `voice.state ===
'releasing'`, swept on every register/release/steal call. Verified live in Chrome: with
one voice released ahead of 31 longer-held ones, `steal()` correctly returned the released
voice, not the longest-held one (test step `steal-prefers-releasing`, PASS).
NEXT ACTION: Answer Q4 — autoplay policy.
OPEN DECISIONS: the lazy-observation timestamp for "longest-released" is an interpretation
of an underspecified boundary (Voice → voicePool has no push channel in §11), not a
contract change. Decider: spec-voice/Troubleshooter, if a push-based alternative is
wanted later. Not blocking — verified correct against the one ordering case that matters
(§10-A: released before held).
FILE LOCATIONS: [/src/core/audio.js](../../../src/core/audio.js) §4 (`voicePool`,
`registry`, `sweepRegistry`).

---

## 2026-08-23 00:08 EDT — Q4: autoplay policy

DELIVERABLE STATE: `audio.state` (getter on `ctx.state`), `audio.unlock()`, `audio.on(
'unlocked', fn)` implemented per §3's amended shape verbatim. `unlock()` is idempotent —
returns immediately if already unlocked or if `ctx` is closed, resumes `ctx` otherwise,
catches rejection silently (pre-gesture `resume()` can reject; nothing here throws or
blocks startup). As a safety net beyond what a surface is individually responsible for
(§3 assigns "first gesture calls unlock()" to surfaces), this file also attaches its own
one-time-effective `pointerdown`/`keydown`/`touchstart` listeners on `window` that call
`unlock()`, so a forgotten surface can never leave the app silently dead — brief's own
wording. Verified live in real Chrome 151 (not automation-bypassed autoplay — a genuine
`page.click()` on the test page's button): `ctx.state` was `"suspended"` at load, became
`"running"` after the click-triggered `unlock()`, and a second `unlock()` call was a
verified no-op that did not throw (test steps `unlock-on-gesture`, `unlock-idempotent`,
both PASS).
NEXT ACTION: Answer Q5 — `governor.load` as a number.
OPEN DECISIONS: none added this question.
FILE LOCATIONS: [/src/core/audio.js](../../../src/core/audio.js) §3 (`unlock`, `audio`,
gesture listeners).

---

## 2026-08-23 00:09 EDT — Q5 and Q6: `governor.load`, `noCap`, `request(cost)`

DELIVERABLE STATE: §8's probe technique implemented verbatim — time a real pass, divide
by the 100 ms window, smooth over 20 passes, clamp to 1. **`clock.js` (P2) does not exist
yet**, so there is no lookahead scheduler pass to wrap; rather than invent one outside my
lane, the probe times this file's own real, synchronous work (a registry sweep plus one
`.state` read per live voice) on the same 25 ms cadence §3/§8 specify — genuine
main-thread cost, not a placeholder, and it scales with real load: verified live at
`load=0.0000` idle, rising to `load=0.0028` while the registry held 8 000 entries, falling
to `0.0022` after they were released (test step `load-observed-across-samples`, PASS).
Flat 0.0000 at low counts matches findings-webaudio.md Q3's own idle-load row (0 ms
injected → 0.000) — not a failure, sub-resolution real work reading as zero is correct.
`governor.noCap` is a plain getter/setter property (not a build-time flag), off by
default, flippable at runtime, ships on the deployed build — verified live: flipped true,
five requests past the 32-voice cap all returned `true` and `voicePool.count` reached 37
uncapped; `governor.load` kept returning a valid number the whole time ("meter still
reads hot," brief's wording) (test steps `nocap-allows-past-cap`,
`meter-still-reads-with-nocap`, `nocap-switchable-at-runtime`, all PASS). `request(cost)`
never blocks — always synchronous, returns a bool per §8's signature: refuses only when
`noCap` is off and `voicePool.count >= 32`; verified live that a full-cap DAW refuses the
33rd voice (test step `refuse-at-cap`, PASS) and that the §11.2 refuse→steal→retry
sequence lets the same note through on retry without ever being dropped (test step
`retry-after-steal-succeeds`, PASS). **No CONTRACTS §8 number needed adjusting — the
32-voice cap worked exactly as specified in every test performed. No STOP condition hit.**
NEXT ACTION: Answer Q7 — teardown.
OPEN DECISIONS: `governor.request(cost)`'s only enforced cap today is the 32-voice count
— the only resource type (voices) that exists yet. The other three §8 defaults (24 patch
nodes, 4 inserts/channel, 2 sends) have no resource to check against until the files that
create them exist (`devices/*`, `mixer/*`, `patch-synth.js`, all P4). `cost` is still
summed into `governor.allocatedWeight` for those future seats' telemetry, but no
cost-based admission threshold is invented here since none is specified. Decider: P4's
`governor` seat (ROSTER lists one), when those resources exist. How this file's
self-driven probe reconciles with P2's real `clock.js` scheduler pass once it exists is
also open — decider `clock`/Troubleshooter, P2. Neither blocks P1.
FILE LOCATIONS: [/src/core/audio.js](../../../src/core/audio.js) §5 (`governor`,
`probePass`, `VOICE_CAP_DEFAULT`).

---

## 2026-08-23 00:10 EDT — Q7: teardown, DONE-CHECK, seat closed

DELIVERABLE STATE: `dispose()` disconnects every node this file owns (any live
`createChannel()` node, `masterGain`, `masterAnalyser`), removes the three gesture
listeners and every `audio.on()` subscriber, stops the CPU probe interval, clears the
voice registry, and calls `ctx.close()`, resolving to `{nodesDisconnected,
listenersDropped}` so a caller can verify by count. Verified live: after releasing the
one test channel and freeing all test voices first (voices are the calling instrument's
responsibility to dispose per §2, not this file's), `dispose()` reported
`nodesDisconnected=2` (masterGain + masterAnalyser, the only nodes still live) and
`listenersDropped=4` (3 gesture listeners + 1 subscribed `'unlocked'` handler), and
`ctx.state` read `"closed"` immediately after (test steps `dispose-clean`,
`ctx-closed-after-dispose`, both PASS).

**DONE-CHECK, run for real in headless real-Chrome 151 via Playwright, not simulated:**
a throwaway page importing only `/src/core/audio.js` (no instrument, no synth — a minimal
voice-shaped stand-in defined in the test page itself, since §11.1's `Voice` doesn't
exist until S3) resumed the context on a genuine `page.click()` gesture, allocated a real
oscillator+gain voice and confirmed non-silent output via `masterAnalyser` (max deviation
26/128 from the silence baseline — **UNVERIFIED by ear, verified by signal**: this
environment has no audio output device, `outputLatency === 0`, per
findings-webaudio.md Q2/Q3, and this seat did not claim to hear anything), filled to the
32-voice cap and got refused on the 33rd, stole the correct (longest-released) voice at
the cap and successfully retried, read a load value that measurably moved under a real
8 000-entry stress load, flipped `noCap` and exceeded the cap cleanly, and disposed with
verified-by-count teardown. **18 of 18 checks passed.** Full transcript captured by
`verify_audio_core.py` (Playwright, outside the project tree, scratchpad-only, nothing
written into `Builddocs/` beyond this receipt and the test page itself).

**What is UNVERIFIED, and stays UNVERIFIED, same discipline as findings-webaudio.md:**
hearing any sound (no audio device exists here — Brandon's hardware recon per A53, not
this seat's to attempt). Real audio-thread saturation under a heavy DSP graph (§8's
own stated blind spot — this meter only ever sees main-thread cost; nothing in P1 yet
puts real DSP load on the audio thread for this seat to observe). Whether `governor.load`
reads meaningfully once P2's real scheduler pass replaces this file's self-driven probe —
flagged as an open decision above, not testable before `clock.js` exists.

**What is missing / left to do, for the next seats:** S3's four seats build `Voice`
(§11.1), the two synths' `setParam` surfaces (§11.4/§11.5), the keyboard `Surface`
(§12.2), and the analyser read loop (§11.6) — none of that exists yet, by design; this
seat was told explicitly not to build a synth. `createChannel()`/`releaseChannel()` are
usable today but not yet named in CONTRACTS — flagged above for spec-core to decide
whether to formalize. `overtone-voice`'s cpuWeight=17 remains PROVISIONAL per spec-voice's
receipt, unrelated to this seat. `patch-synth`/`devices`/`mixer` (P4) will extend
`governor.request()`'s admission logic to their own resource types; this file's `cost`
parameter and `allocatedWeight` tally are already there for them to use, unmodified.

NEXT ACTION: none — seat is done. Handoff delivered, state-change message going to
`agent-run-1-70` next. Not starting S3. Stopping here per the brief.
OPEN DECISIONS: (1) `createChannel()`/`releaseChannel()` not yet in CONTRACTS — decider
spec-core/Troubleshooter, not blocking. (2) Voice→voicePool "longest-released" is
lazily observed, not pushed — decider spec-voice/Troubleshooter, not blocking, verified
correct for the case that matters. (3) `governor.request()` enforces only the voice cap
today; patch-node/insert/send caps await the resources that need them — decider P4's
`governor` seat. (4) How this file's self-driven CPU probe reconciles with P2's real
`clock.js` scheduler pass — decider `clock`/Troubleshooter, P2. None of the four block
P1's S3 or S4.
FILE LOCATIONS: [/src/core/audio.js](../../../src/core/audio.js) (whole file) ·
[test-audio-core.html](test-audio-core.html) (the DONE-CHECK test page, throwaway, lives
in this seat's own stage folder) · this receipt.

---

## 2026-08-23 01:32 EDT — post-close addendum: `voicePool.steal()` made atomic (Troubleshooter-directed, not a reopening)

Not a reopening of this seat. `test-p1` (P1/S5, TEST) measured a real cap failure: with
`governor.noCap` off, a **synchronous burst** of `noteOn()` calls blew past CONTRACTS §8's
32-voice cap — Wave Synth reached 40 voices, Overtone Synth 39 — while paced allocation
(≥20 ms apart) correctly held at 32 in both. Root cause landed in this file, not in the
instruments: as originally written, `voicePool.steal()` only **selected** a voice; the
registry entry (and therefore `voicePool.count`, which `governor.request()` checks) only
shrank later, when the stolen voice's own async 5 ms fade finished and called its real
`free()` → `release()`. Between selection and that fade, the stolen voice was still fully
counted, so the caller's immediate retry (§11.2 step 4) had nothing new to see. Both
instrument seats independently invented workarounds for the gap. The Troubleshooter
amended CONTRACTS §11.2a `[AMENDED 2026-08-23]` to make the atomic behaviour binding and
directed the fix here.

Changed exactly one method, `voicePool.steal()`: after it picks
`longestReleased || longestHeld`, it now **synchronously deregisters that voice in the
same call, before returning it** — deletes its registry entry and subtracts its `cost`
from `governorAllocatedWeight` (`Math.max(0, …)`, same arithmetic `release()` uses) — then
returns the same voice as before, unchanged, for the caller to still call `.steal(atTime)`
on for the real 5 ms audio fade. Only the bookkeeping *timing* moved; the selection order
(§10-A: longest-released first, else longest-held) is untouched. Its doc comment was
rewritten to state the new contract and why. `register()`, `release()`, `sweepRegistry()`,
`governor.request()` and its `VOICE_CAP_DEFAULT = 32` check were **not** changed —
`release()` already no-ops safely (`if (!meta) return`) on a voice not in the registry,
which is now the normal path for every stolen voice.

**Verification:** `node --check` passed. Re-ran
[test-audio-core.html](test-audio-core.html) headless (Playwright/Python, Chromium 148,
served over `python3 -m http.server` at the project root) — **18 of 18 checks passed, 0
failed, 0 console errors, 0 page errors**, identical to this seat's original DONE-CHECK;
`steal-prefers-releasing`, `retry-after-steal-succeeds` and
`count-after-steal-and-reallocate` all still pass, so selection order and the retry
contract are intact. Symptom test (new, written for this fix): 40 synchronous `noteOn()`
calls, zero delay, `noCap` off, real modules, one fresh page per instrument —
`voicePool.count` peaked at **exactly 32 during the burst and stayed 32** at every sample
out to 1000 ms, for **both** wave-synth and overtone-synth (pre-fix: 40 and 39). Paced
control also 32. Sensitivity control with `noCap` **on** reached 40 on both, proving the
harness can observe counts above 32. `governor.allocatedWeight` tracked
`count × cpuWeight` exactly at every sample during and after the burst (320 for 32 wave
voices at 10, 544 for 32 overtone voices at 17) and never went negative.

FILE LOCATIONS: [/src/core/audio.js](../../../src/core/audio.js) (one method changed,
`voicePool.steal()`, plus its doc comment) · [test-audio-core.html](test-audio-core.html)
(re-run, unmodified) · this receipt.

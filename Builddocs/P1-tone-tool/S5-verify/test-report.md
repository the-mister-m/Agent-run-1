# TEST REPORT — P1 Tone Tool — `test-p1`

Seat: `test-p1`, P1/S5, TEST function. Task: [A-test-p1.md](A-test-p1.md).
Run: 2026-08-23 01:19 EDT. Server: `python3 -m http.server 8891 --bind 127.0.0.1`, project
root. Browser: headless Chromium 148 via Playwright (Python, sync API), same tool/version
prior seats used. Environment: no audio output device (`outputLatency === 0`,
findings-webaudio.md) — every claim below is verified by real Web Audio node-graph state,
`AnalyserNode` byte data, or DOM/event state, never by ear. No file under `/src` or `/tools`
was edited. All test scripts are scratchpad-only (outside the project tree).

**Independence note:** every result below was gathered fresh against the shipped code —
this seat wrote its own Playwright/Python harnesses rather than re-running any prior seat's
test page, so a shared blind spot in a seat's own test would not be inherited. Where a
number corroborates a prior seat's receipt, that is stated; where it contradicts one, that
is stated more loudly.

---

## Q1 — Does the phase done-check pass? ([PHASE.md](../PHASE.md))

> "`/tools/wave-synth.html` and `/tools/overtone-synth.html` both load on a static file
> server, make sound from all four input routes, draw their correct visual, and survive
> `dispose()` with no leaked nodes."

| Clause | Result |
|---|---|
| `/tools/wave-synth.html` loads on `python3 -m http.server` | **PASS** — HTTP 200, 0 console errors, 0 page errors, 0 requests ≥400 |
| `/tools/overtone-synth.html` loads on `python3 -m http.server` | **PASS** — HTTP 200, 0 console errors, 0 page errors, 0 requests ≥400 |
| Makes sound from all four input routes | **PASS for mouse/key/touch, UNVERIFIED for real MIDI hardware** — see Q3 |
| Draws its correct visual, and only that visual | **PASS** — wave-synth.html: 1 spectrum canvas, 0 scope elements. overtone-synth.html: 1 scope canvas, 0 spectrum elements. Enforced three ways in the shipped code (`ToolShell`'s tap assertion, `Spectrum`/`Scope`'s own constructors throwing on the wrong tap) — confirmed live, not just read. |
| Survives `dispose()` with no leaked nodes | **PASS** — see Q6. Zero net growth in DOM nodes, listeners, or AudioNode create/disconnect balance across 20 mount/dispose cycles on both pages. |

**PHASE.md overall: PASS**, with one qualification carried forward from Q2/Q5 below: the
32-voice governor cap (CONTRACTS §8), while not literally named in PHASE.md's checklist, is
part of what "makes sound" is supposed to mean under the contract this phase built to, and
it does **not** hold under rapid/simultaneous note requests in either instrument. This is a
FAIL against CONTRACTS §8/§11.2, not against PHASE.md's own four clauses, so it is reported
under Q2 and Q5 rather than flipping this line to FAIL.

---

## Q2 — Does every seat's own done-check pass?

All seven P1 build/spec seats' own stated done-checks, run against the shipped code
directly (not by re-executing a seat's own test page, except where noted).

### `spec-voice` (P1/S1, SPEC) — CONTRACTS §11/§12
**PASS.** Read CONTRACTS §11/§12 in full. Cross-checked the exact `setParam` path lists the
seat's own receipt claims (`osc.wave`/`osc.octave`/`out.gain`/`env.*` for Wave Synth;
`partial.0.level`…`partial.7.multiplier`/`.level`/`env.*` for Overtone Synth) against the
**actual shipped** `wave-synth.js` and `overtone-synth.js` by calling `setParam`/`getParam`
on every path live — all resolve exactly as specified, no undocumented path, no missing
one. A reader holding only §2/§5/§11/§12 could in fact write both synths and the keyboard —
confirmed by the fact that all three downstream seats did so with zero contract
back-and-forth recorded in any receipt.

### `audio-core` (P1/S2, BUILD) — `/src/core/audio.js`
**PASS, with one gap the seat's own done-check did not surface.** Resume-on-gesture
(`ctx.state: suspended → running` on a real click), voice allocate/steal/free, a moving
`governor.load`, `noCap` flip exceeding the cap, and `dispose()` returning verified counts
all confirmed live (see Q5, Q6). **Gap:** the seat's own done-check tested steal-at-cap with
allocations spaced out in time (as does this seat's Q5 "paced" test, which also passes at
exactly 32). Neither tested a **synchronous burst** of allocations — see Q5's FAIL finding.
`audio-core`'s own file (`voicePool`/`governor`) is not the defect; the defect is in how the
two instrument files use `governor.request()`'s return value, see below.

### `wave-voice` (P1/S3, BUILD) — `/src/instruments/wave-synth.js`
**PASS on 6 of 7 stated checks, FAIL on voice-cap enforcement under burst load.**
- All four waveforms (`sine`/`triangle`/`square`/`saw`) play from `noteOn` and each produces
  a distinct, non-silent signal on `getAnalyser('spectrum')` — confirmed (sine vs. saw
  spectral-energy ratio 0.43 vs. 0.97, see Q5 spectrum check).
- `getState()`/`setState()` round-trips losslessly through `JSON.stringify`/`JSON.parse` —
  confirmed byte-identical (`osc.wave`, `osc.octave`, `out.gain`, all four `env.*`).
- `mountCompact` and `mountExpanded` mounted **simultaneously** into two separate
  containers and share live state — confirmed: clicking a waveform button in the compact
  mount changed `getParam('osc.wave')`, which both mounts read.
- **FAIL — hit the voice cap and steal correctly, under realistic load.** See Q5. With
  `noCap` off, 40 synchronous `noteOn()` calls (zero delay between them — a plausible
  scenario: a struck chord, a fast run, or several MIDI notes arriving in one message batch)
  produced **`voicePool.count === 40`**, not the specified 32-voice cap. Paced calls (≥20ms
  apart) correctly cap at exactly 32. **File: `/src/instruments/wave-synth.js`, lines
  384–388.** The code's own comment says it plainly: `governor.request(cost); // retry, per
  §11.2 step 4 — result intentionally unused` — the retry's answer is discarded and a new
  voice is constructed and registered unconditionally, even though the just-stolen voice has
  not actually vacated its registry slot yet (`steal()` only *starts* a 5 ms fade; `free()`
  runs later, asynchronously). Owner: **`wave-voice`**.
- Dispose reports a verified-by-count teardown — confirmed, see Q6.

### `overtone-voice` (P1/S3, BUILD) — `/src/instruments/overtone-synth.js`
**PASS on 7 of 8 stated checks, FAIL on the same voice-cap class of defect (different
mechanism, same outcome).**
- 8 partials, whole-number multiplier enforced (`setParam('partial.1.multiplier', 2.7)` →
  `getParam` returns `3`) — confirmed.
- Fundamental (partial 0) defaults loudest (`level: 1`, others `0`) — confirmed via
  `getState()`.
- Single sine at the fundamental sounds (analyser deviation 81/128 from silence); stacking
  partials 1–7 to 0.6 measurably thickens the waveform (roughness proxy 1.37 → 6.40,
  sample-to-sample amplitude delta) — confirmed independently, corroborates the seat's own
  receipt.
- `getState()`/`setState()` round-trips losslessly — confirmed.
- `mountCompact`/`mountExpanded` present with the fundamental visibly labeled — confirmed by
  source and by the seat's own receipt's DOM assertions (not independently re-verified
  pixel-for-pixel by this seat, given time budget; the mechanism read is sound).
- **FAIL — voice cap under burst load.** `/src/instruments/overtone-synth.js` (lines
  364–391) implements a **better-engineered but still ultimately insufficient** version of
  the same pattern: it correctly *defers* the retry until the stolen voice's `onFree()`
  callback actually fires (line 378), so a synchronous 40-note burst reads exactly
  **`voicePool.count === 32`** 5 ms after the burst — correct, instantaneously. But by
  300 ms later, once the deferred `onFree` callbacks for all 8 stolen voices have fired and
  each independently retried-and-succeeded, the pool has grown to **`voicePool.count === 39`**
  — each deferred retry finds a momentarily-open slot and allocates into it without
  re-checking whether other deferred retries have already done the same. Paced calls (≥20ms
  apart) correctly hold at exactly 32. Owner: **`overtone-voice`**.
- Dispose reports a verified-by-count teardown — confirmed, see Q6.

**Both instruments' voice cap holds under normal, human-paced play. Neither holds under a
realistic burst — a struck chord, a fast arpeggio, or several MIDI note-on messages
delivered in one batch.** The root ambiguity is CONTRACTS §11.2's text ("the allocation is
retried once") not specifying what an instrument must do if the retry still fails because
the steal has not synchronously completed — both BUILD seats resolved that ambiguity
independently, in different but both-insufficient ways. **Secondary owner for the
underspecified retry contract: `spec-voice` (CONTRACTS §11.2).**

### `keys-input` (P1/S3, BUILD) — `/src/core/input.js`, `/src/surfaces/keyboard.js`
**PASS, all nine stated checks.** All four routes confirmed to produce identical
`{note, velocity, source}} shapes with no downstream branch on `source` (mouse/key/touch/
midi-simulated all drove real `noteOn` calls and lit the same key class). QWERTY hands-
separate confirmed live: `KeyZ` (C4=60) + `KeyQ` (C5=72) held together produced
`voiceCount === 2` — two independent, correctly-pitched voices an octave apart.
`octaveShift` confirmed: `+1` click shifted a drawn-C(60) click to sound 72 (60+12), exactly
as specified. `positionShift` confirmed — see Q4, the headline check. Overlay cycle
(`letter → number → solfege → none → letter`) confirmed via the real UI button. Dispose —
see Q6, zero net listener growth.

### `scopes` (P1/S3, BUILD) — `/src/vis/spectrum.js`, `/src/vis/scope.js`, `/src/ui/tokens.css`
**PASS, all stated checks.** `tokens.css` resolves all 13 CONTRACTS §9 tokens via
`getComputedStyle` — confirmed, values match the seat's receipt exactly. Spectrum vs. scope
inversion enforced against the **real** instruments (not stand-ins) — confirmed both wrong
pairings are structurally impossible on the shipped pages. Sine-vs-saw spectral distinction
independently re-measured by this seat (not merely re-reading the receipt): sine
energy-above-fundamental ratio 0.43 vs. saw 0.97, significant-bin count 4 vs. 11 — same
direction and clear separation as the seat's own more careful measurement (1.4% vs. 95.9%);
the absolute numbers differ because this seat used a cruder linear-sum threshold, not a
defect in either measurement. `unmount()` stops all animation — confirmed by frame-count
delta of 0 after unmount (see Q5's frame-time test, which unmounts both visuals and shows no
residual per-frame cost).

### `tone-shell` (P1/S4, BUILD) — `/src/ui/shell.js`, both `/tools/*.html` pages
**PASS on all seven stated checks except the one it itself already flagged unfixed.**
Standalone layout is expanded-only (confirmed: `.mountCompact(` does not appear in any file
this seat owns, and this seat directly exercised `mountCompact` only via a scratch
double-mount test on `wave-synth.js` itself, not through the shell). File menu present and
functional (6 entries, 2 enabled, navigation confirmed). No build step — plain ES module
imports confirmed, 0 external requests. Scale control present, minimal, seam stated on
screen. Surface switcher structurally limited to one live surface. CPU meter and `noCap`
checkbox both present and live — confirmed by toggling the real checkbox (see Q2's
`nocap_checkbox` test: `false → true → false`, `governor.noCap` tracked correctly both
times). Teardown — see Q6, zero net leak across 20 cycles.

**The one item this seat's own receipt already reported and did not fix:** both synths'
`AnalyserNode`s ship at Web Audio's default `maxDecibels = -30`, which the two synth seats
were told to change to `-15` (`scopes`' recommendation, `tone-shell`'s own measured
escalation). **This is fixed in the current codebase** — both `wave-synth.js` and
`overtone-synth.js` now set `maxDecibels = -15` in their constructors (confirmed by source
read; this was a post-close addendum landed after `tone-shell`'s receipt was written, per
`receipt-wave-voice.md`'s and `receipt-overtone-voice.md`'s addendum entries). Spot-checked
live: C4 (MIDI 60) played on the Wave Synth page — this seat did not re-run the exact
fundamental-Hz readout probe (that is `vis/spectrum.js`'s internal peak-detection logic, not
this seat's to re-derive), but confirmed `getAnalyser('spectrum').maxDecibels === -15` is
what the live node reports, matching the fix.

---

## Q3 — Do all four input routes work?

| Route | Result |
|---|---|
| **Mouse** | **PASS.** A real `page.mouse.down()`/`up()` on a drawn key produced `voiceCount: 0 → 1`, lit the correct key, and released cleanly. |
| **Key (QWERTY)** | **PASS.** A real `page.keyboard.down('KeyZ')`/`up()` produced a voice, lit the same key class the mouse route lights, and released cleanly. Two-hand chord (`KeyZ`+`KeyQ`) produced 2 independent voices (60 and 72) — see Q2 `keys-input`. |
| **Touch** | **PASS.** A synthetic `PointerEvent` with `pointerType: 'touch'` dispatched on a key produced a voice (note 62), lit the key, and released on pointerup. This is a synthetic touch event, not a finger on real touch hardware — noted as a caveat, not a failure, since no touch-capable device exists in this environment (same standing limit `tone-shell`'s own receipt already recorded). |
| **MIDI** | **UNVERIFIED — no real MIDI hardware or permission prompt exists in this environment.** What **is** verified: the full code path was exercised through the actual shipped `input.attachMIDI()` entry point with a simulated port object (not a stand-in reimplementation) — a raw `0x90` note-on byte message produced a real `noteOn` call (voice allocated, correct key lit for pitch class E), and a running-status `0x90`/velocity-0 byte message correctly triggered `noteOff`. This proves the MIDI **parsing and routing** code is correct; it does not and cannot prove real class-compliant MIDI hardware behaves identically. Per the brief: marked UNVERIFIED, not PASS. |

---

## Q4 — Does position shift do the right thing? (highest-value check)

**PASS.** Set `input.positionShift = 5` (asserts the pitch class drawn at the bottom key
becomes F, pitch class 5).

| Check | Result |
|---|---|
| Bottom key's note number | **65** |
| Bottom key's pitch class | **5 (F)** — correct |
| Clicking the bottom key sounds | **note 65** |
| Full set of notes drawn across the keyboard after the shift | **`[60,61,62,63,64,65,66,67,68,69,70,71]`** — bit-identical to the unshifted set |

**The drawn keyboard changed** (the bottom key is now labeled/positioned as F, not C), and
**the sounding pitch did not transpose**: the full 12-note receivable set stayed anchored at
60–71 (C4–B4) — it did not slide up to 65–76, which is what a transposition bug would look
like. The key drawn as F genuinely sounds F (65 is F's real MIDI number) — this is the
correct "rotate in place" behavior CONTRACTS §5 requires, verified by measurement rather
than by reading the source comment that says so.

---

## Q5 — Metrics

### Voices before "audible glitch" — proxy, stated as such (no audio output device exists;
### `outputLatency === 0`, so no real glitch can be heard or measured)

**`noCap` off:**
- **Paced allocation** (≥20 ms between each `noteOn`, letting each steal's 5 ms fade
  complete before the next request): caps correctly at **exactly 32 voices**, matching
  CONTRACTS §8.
- **Synchronous burst** (40 distinct `noteOn()` calls with zero delay — a plausible
  real-world case: a struck chord, a fast run, several MIDI notes in one message batch):
  **Wave Synth reaches 40 voices** (the requested cap is not enforced at all — see Q2). 
  **Overtone Synth reaches 32 voices in the first 5 ms, then drifts to 39 voices by 300 ms**
  as deferred steal-retries cascade past the cap.
- **This is the real, numeric answer to "voices before glitch, noCap off": the cap holds at
  32 only when notes arrive spaced apart; under a realistic burst it does not hold, and the
  measured ceiling in this test was 39–40 voices**, not 32. This is a FAIL against
  CONTRACTS §8's "32 voices total" default and is filed as such under Q2, owners
  `wave-voice` and `overtone-voice`.

**`noCap` on:** pushed to **200 voices** in six steps (32/64/96/128/160/200) with no
exception thrown and no main-thread allocation-time blowup (per-batch allocation time
stayed in the 2.4–5.0 ms range throughout, vs. a 0.4 ms single-voice baseline — no
runaway growth curve visible in this range). **No main-thread degradation proxy was
observed up to 200 voices.** This environment cannot measure real audio-thread saturation
(no audio device), so this is **not** a usable glitch proxy either — it only shows that
JS-side voice bookkeeping itself doesn't become the bottleneck in this range on this test
machine (Apple silicon, headless Chromium). A Chromebook's audio thread would very plausibly
glitch well before 200 real DSP voices; this test cannot see that. **UNVERIFIED beyond
"no JS-side collapse observed up to 200 voices" — reason: no audio output device.**

### `governor.load` at 1 / 8 / 16 / 32 voices (`noCap` off, paced allocation)

| Voice count | `governor.load` | `voicePool.count` |
|---|---|---|
| 1 | 0.0001 | 1 |
| 8 | 0.00015 | 8 |
| 16 | 0.00005 | 16 |
| 32 | 0.00005 | 32 |

**These numbers are near-zero and do not scale meaningfully with voice count.** This
matches `audio-core`'s own receipt exactly: `clock.js` (P2) does not exist yet, so
`governor.load` currently times `core/audio.js`'s own registry-sweep bookkeeping (a cheap
`Map` iteration), not a real scheduler pass or real DSP cost. The number is honest for what
it measures today; it is **not yet a meaningful CPU indicator** for a student or teacher
reading the meter, a limitation already flagged in three separate receipts (`audio-core`,
`tone-shell`, `scopes`) and reconfirmed here with fresh numbers.

### Frame time — visual mounted vs. both unmounted

| State | Avg. frame time |
|---|---|
| Wave Synth page, spectrum visual mounted and drawing | **16.666 ms** (~60.0 fps) |
| Both instrument + visual unmounted (`shell.unmount()`) | **16.655 ms** (~60.0 fps) |

**Difference: ~0.01 ms — not distinguishable from measurement noise at this sample size.**
The visual's own internal stats confirm why: `avgReadMs 0.085` + `avgDrawMs 0.327` ≈
**0.41 ms of the 16.7 ms frame budget (~2.5%)** on this test machine. This corroborates
`scopes`' own receipt (`spectrum avgReadMs 0.031`, `avgDrawMs 0.091` measured differently/
lower — both readings agree the visual is cheap relative to budget on Apple silicon).
**UNVERIFIED for Chromebook hardware** — same standing caveat every P1 receipt already
carries; this machine is dramatically faster than the deployment target.

### Page weight and cold load time (separate browser process per page, to avoid
### warm-cache bias between the two)

| Page | Total response bytes | Requests | `loadEventEnd` | Wall-clock `page.goto()` |
|---|---|---|---|---|
| `/tools/wave-synth.html` | **179,934 bytes (~176 KB)** | 8 | **126.3 ms** | 0.128 s |
| `/tools/overtone-synth.html` | **175,963 bytes (~172 KB)** | 8 | **131.5 ms** | 0.133 s |

Both pages are near-identical in weight and load time, as expected — they share every file
except the one instrument module and the one visual module.

---

## Q6 — Does it leak?

Mounted and disposed each page's `ToolShell` **20 times**, using the real
`mountStandaloneTool()` entry point with the real instrument/visual/surface modules (not
stand-ins), playing and releasing one note per cycle to exercise voice allocation and
disposal too. DOM node count, a global `addEventListener`/`removeEventListener` ledger, and
an `AudioNode` create/disconnect ledger were all installed **before** any module loaded.

| Page | DOM nodes before → after | Listener ledger net before → after | AudioNodes created / disconnected per cycle |
|---|---|---|---|
| `wave-synth.html` | 11 → 11 | 3 → 3 | 5 created / 5 disconnected, every single cycle, all 20 |
| `overtone-synth.html` | 10 → 10 | 3 → 3 | 20 created / 20 disconnected, every single cycle, all 20 |

**Result: PASS, zero growth.** Every one of the 20 cycles on both pages created and
disconnected exactly the same number of `AudioNode`s (traced per-cycle, not just before/
after — confirmed no drift on any individual cycle). The raw totals (105 created / 103
disconnected on wave-synth; 405/403 on overtone-synth) show a constant 2-node offset that
is **not growth**: it is `core/audio.js`'s own `masterGain`/`masterAnalyser`, created once
at module load and disconnected only by `audio.dispose()` — which `tone-shell`'s own
receipt documents as deliberately never called per-mount, because it would close the one
shared `AudioContext` for the whole page. This offset is identical whether measured after
1 cycle or 20; it does not accumulate. The 3 outstanding listeners in the ledger are the
same pattern: `core/audio.js`'s 3 window-level gesture listeners
(`pointerdown`/`keydown`/`touchstart`), installed once, removed only by `audio.dispose()`.

---

## Q7 — What failed, and who owns it?

| Failure | File | Owning seat (ROSTER.md) |
|---|---|---|
| Voice cap (CONTRACTS §8, 32 voices) not enforced under a synchronous burst of `noteOn` calls with `noCap` off — reaches 40 voices instead of 32. Root cause: `governor.request(cost)`'s retry result is explicitly discarded (`// result intentionally unused`) and a new voice is unconditionally constructed and registered. | `/src/instruments/wave-synth.js`, lines 384–388 | **`wave-voice`** (P1/S3, BUILD) |
| Voice cap not enforced under the same burst condition — correctly holds at 32 for the first 5 ms, then drifts to 39 by 300 ms as deferred steal-retries (via `Voice.onFree()`) each independently find a momentarily-open slot without checking whether a sibling deferred retry already used it. | `/src/instruments/overtone-synth.js`, lines 364–391 | **`overtone-voice`** (P1/S3, BUILD) |
| Underlying ambiguity both BUILD seats resolved independently and insufficiently: §11.2's text ("the allocation is retried once") does not specify what an instrument must do if the retry still fails because the steal has not synchronously completed. | `CONTRACTS.md` §11.2 | **`spec-voice`** (P1/S1, SPEC) — secondary/contributing, not a code defect |

**No other failure was found.** Real MIDI hardware and real touch hardware remain
UNVERIFIED for the stated environmental reason (no such hardware exists here), not because
anything failed. Real Chromebook performance remains UNVERIFIED for the same standing
reason every P1 receipt already carries (all timings in this run are Apple silicon, not the
deployment target) — this is a re-statement of an existing, already-logged limitation, not
a new failure this seat found.

**This is not filed as a CONTRACTS §8 cap-number escalation.** The finding is not that 32
is the wrong number — it is that the enforcement mechanism does not reliably hold *any*
number under burst conditions. Per the brief's escalation clause, a wrong cap **number**
goes to the Troubleshooter and waits; this is an enforcement-mechanism gap in two BUILD
seats' files, which is squarely this seat's job to report, not to escalate and stall on.

---

## Environment notes carried forward unchanged

No audio output device (`outputLatency === 0`) — nothing in this report claims to have
heard anything; every audio claim is verified via node-graph state or `AnalyserNode` byte
data. No real MIDI or touch hardware exists here. All timing numbers are Apple silicon
(the machine this run executes on), not the Chromebook deployment target — every timing
figure above should be read as "measured here," not "safe on hardware."

# RECEIPT — wave-voice — P1/S3

Seat: `wave-voice`. Task: [A-wave-voice.md](A-wave-voice.md). Stage: [STAGE.md](STAGE.md).

---

## 2026-08-23 00:12 EDT — start

DELIVERABLE STATE: Read A-wave-voice.md, STAGE.md, CONTRACTS.md (§2, §2 amendments, §9,
§11 in full, §8 for cpuWeight table), `/src/core/audio.js` (the real frozen export shape
— `ctx`, `masterGain`, `masterAnalyser`, `createChannel`/`releaseChannel`, `audio`,
`voicePool`, `governor`, `dispose`), ROSTER.md, S1's receipt-spec-voice.md and S2's
receipt-audio-core.md for house style, messenger-discipline.md, tapout-receipt.md.
Confirmed `/src/instruments/` does not exist yet (I create it) and `/src/ui/tokens.css`
does not exist yet either — `scopes` (parallel seat) creates it; I bind to it only via
CSS custom properties with fallbacks per §9, never assume it is loaded when my code runs.
Confirmed this environment has no audio output device (`outputLatency === 0`,
findings-webaudio.md) — same standing fact S2 already logged; "hear it" in my own brief's
DONE-CHECK will be answered with node-graph + non-silent-analyser verification, not a
claim of having listened.
NEXT ACTION: Write `/src/instruments/wave-synth.js` answering all seven seat questions in
code, then verify against a throwaway test page.
OPEN DECISIONS: none yet.
FILE LOCATIONS: no writes yet.

---

## 2026-08-23 00:20 EDT — Q1, Q2, Q3

DELIVERABLE STATE: `/src/instruments/wave-synth.js` written in full, all seven questions
answered in code. **Q1 (waveforms and on-screen names):** `WAVE_TYPES = ['sine',
'triangle', 'square', 'saw']` matching §11.4's four-value enum exactly; `WAVE_LABELS` maps
`square -> "Square (Pulse)"`, using the curriculum's own words per the brief, the other
three plain. Flagged and handled a mapping gap CONTRACTS itself doesn't call out: neither
contract value is a valid native `OscillatorType` string — `'saw'` must become
`'sawtooth'` on the real `OscillatorNode.type`; `WAVE_TO_OSC_TYPE` does that conversion in
exactly one place. **Q2 (§2 completeness):** every method in §2's base contract and all
four amendment additions implemented — `static id/label/playable`, `constructor(ctx,
out)`, `noteOn/noteOff/allNotesOff`, `setParam/getParam`, `getState/setState`,
`voiceCount`/`cpuWeight` getters, `mountCompact/mountExpanded/unmount/dispose`,
`needsLoad`(false)/`ready()`(resolves immediately)/`getAnalyser(which)`/`pieces`(null)/
`emitsNotes`(false)/`onNoteOut`/`offNoteOut`(both no-op). `getState()` returns a plain
object of only numbers/strings (no functions, nodes, or `undefined`); `setState()` reads
that same shape back through `setParam`'s own clamps — verified round-trip is next in the
test page. **Q3 (§11 exact):** `Voice` class matches §11.1/§11.1a node-for-node — exactly
2 nodes per voice (one `OscillatorNode`, one `GainNode`), `cpuWeight` fixed at **10** (the
plain-voice figure, not computed), the four-stage envelope implemented as automation on
that single `GainNode.gain` (attack ramp to velocity-scaled peak, decay ramp to
sustain-scaled level, release ramp to 0, steal as a forced 5ms linear fade then `free()`
— §10-A verbatim, never an abrupt stop). Allocation sequence in `noteOn` matches §11.2
step-for-step: look up fixed cost -> `governor.request(cost)` -> if refused,
`voicePool.steal()` + `.steal(atTime)` on the result + retry once, allocation proceeds
either way per §10-A "a note is never refused." Did NOT invent a better envelope — no
filter, no extra stages, no per-voice pan; Wave Synth stays the plain voice §11.1a
describes.
NEXT ACTION: Answer Q4 (governor honesty) and Q5 (mountCompact/mountExpanded) — both
already in code; write them up, then build the throwaway DONE-CHECK test page.
OPEN DECISIONS: (1) A held note's wave/octave/envelope are snapshotted at trigger time and
do not live-update if the student moves a control mid-sustain — CONTRACTS §11 does not
specify either behavior; standard synth convention, logged not guessed silently. Decider:
Troubleshooter/Brandon if a different behavior is wanted, not blocking. (2) `Voice.trigger`
takes a 4th `opts` argument (wave/octave/envelope) beyond §11.1's documented
`(note, velocity, atTime)` three — necessary because §11.1's Voice is instrument-agnostic
and cannot itself define what "wave shape" means; the required three params are
unchanged, this is an addition, not a deviation. Same reasoning for `Voice`'s assignable
`onFree` hook, added after construction rather than as a 4th constructor arg, so a voice
stolen by a *different* instrument still notifies its true owner. Decider:
spec-voice/Troubleshooter if this should be formalized in CONTRACTS for the other three
S3 seats; not blocking — `overtone-voice` can make its own equivalent choice
independently, no file is shared.
FILE LOCATIONS: [/src/instruments/wave-synth.js](../../../src/instruments/wave-synth.js)
(Voice class, WAVE_TYPES/WAVE_LABELS/WAVE_TO_OSC_TYPE, noteOn's allocate sequence).

---

## 2026-08-23 00:16 EDT — Q4, Q5, Q6, Q7, DONE-CHECK run, seat closed

DELIVERABLE STATE: **Q4 (governor honesty):** `noteOn` calls `governor.request(cost)`
before allocating, cost = the fixed §11.1a plain-voice figure (**10**), exactly per §8/
§11.2 — never invented, never rounded. `voiceCount` getter returns `this._voices.size`
live, no caching. `cpuWeight` getter returns the true running sum — every live voice's
fixed cost **plus** the instrument's always-on `AnalyserNode` floor (**2**, §8/§11.6),
not just the voices — matching §11.6's explicit instruction that the AnalyserNode must be
folded into the total. Verified live: at a filled 32-voice cap, `cpuWeight` read exactly
`322` (32×10+2), not a placeholder. **Q5 (mountCompact vs mountExpanded):** one instrument,
two DOM trees built from the same `this._params` — `mountCompact` renders tight/dense
(11px type, minimal gaps, short single-letter ADSR labels, **never** gets the `ws-playing`
animation class) into whatever container it's given; `mountExpanded` renders large
(18-32px type, generous padding, full ADSR words, a projector-legible title) into its own
container and gets a CSS-only radial-glow pulse (`@keyframes ws-pulse`) toggled on while
any voice is live — compact stays still by construction, gated in code (seat q5's own
"tight, still, no animation" vs "room to breathe, animated"). Both read `/src/ui/tokens.css`
custom properties (`--bg`, `--panel`, `--line`, `--text`, `--text-dim`, `--accent`) with
literal fallback values, since `tokens.css` is `scopes`' file (STAGE.md collision map) and
may not be loaded when this module runs. Verified live: clicking a wave button in the
compact mount updated the instrument's real state AND the expanded mount's active-button
class simultaneously — same instrument, two layouts, confirmed, not just visually similar
markup. **Q6 (analysis tap only):** `getAnalyser(which)` returns the one, already-connected,
per-instrument `AnalyserNode` for `'spectrum'` and `null` for `'scope'` (§11.4/§11.6) —
nothing else. Verified live: neither mounted DOM tree contains a `<canvas>` or any drawing
surface; this file never reads `getByteFrequencyData`/`getByteTimeDomainData` itself.
`scopes` (P1/S3, parallel seat) owns the actual drawing per STAGE.md — untouched, unread,
uncoordinated with here by design. **Q7 (clean dispose):** `dispose()` calls `unmount()`
first (drops every DOM listener, verified by count), force-frees every live voice
immediately (bypassing the release ramp — teardown, not a musical note-off, so no orphaned
`setTimeout` can later fire against nodes about to be disconnected), then disconnects the
two nodes this instrument itself owns (`_mixGain`, `_analyser`) and returns
`{nodesDisconnected, listenersDropped}` so a caller can verify by count, following the
same return-shape precedent S2's `audio.js` `dispose()` already set. Verified live:
`nodesDisconnected` read exactly `2` every time regardless of how many voices were live
(each voice's own 2 nodes are that voice's own responsibility, not double-counted here),
`listenersDropped` matched the true number of DOM listeners attached across both mounts
(`22`), and `synth.voiceCount === 0` immediately after.

**DONE-CHECK — run for real in headless real-Chrome via Playwright, not simulated,** using
a local static file server (`python3 -m http.server`) since ES module imports do not load
over `file://` in Chrome. Test page:
[test-wave-voice.html](test-wave-voice.html). Script: `verify_wave_voice.py`, outside the
project tree, scratchpad-only per environment convention, nothing written into
`Builddocs/` beyond this receipt and the test page itself. Covered: all four waveforms
play from `noteOn` and each produces a real, non-silent, per-wave-distinct signal on
`getAnalyser('spectrum')` (deviations 105-108/128 from the silence baseline of 128);
`getState()`/`setState()` round-trip losslessly through `JSON.stringify`/`JSON.parse`
(byte-identical before/after); the 32-voice cap fills exactly, `governor.request` refuses
the 33rd, and the 33rd note still sounds via correct steal-and-retry (§10-A: never a dead
key); `mountCompact` and `mountExpanded` both render into two separate containers reading
the same live instrument state; `dispose()` reports a verified-by-count zero-leak teardown.
**34 of 34 checks passed, 0 failed, 0 console errors, 0 page errors.**

**What is UNVERIFIED, and stays UNVERIFIED, same discipline as S2's receipt:** hearing any
of the four waveforms (no audio output device exists in this environment,
`outputLatency === 0`, per findings-webaudio.md — Brandon's hardware recon per A53, not
this seat's to attempt). Whether the four waveforms are spectrally *correct* in shape
(harmonic content matching a true sine/triangle/square/saw) — this seat verified each
produces *a* real signal on the analyser, not that `scopes`' eventual spectrum drawing
will show the textbook harmonic pattern; that visual correctness is `scopes`' seat to
confirm once it exists, since drawing the analyser is explicitly not this seat's lane.
Whether `mountCompact`/`mountExpanded`'s actual pixel appearance reads correctly against
real `tokens.css` values once `scopes` creates that file — verified only against this
file's own literal CSS fallbacks today, since `tokens.css` does not exist yet in this
parallel stage.

**What is missing / left for `tone-shell` (S4):** nothing on this file — all seven seat
questions answered, DONE-CHECK passes. `tone-shell` still needs to mount this alongside
`overtone-synth.js`, `keyboard.js`, and the real `tokens.css` (once `scopes` lands it) into
`/tools/wave-synth.html` and the DAW shell, and to route `keys-input`'s surface events into
this instrument's `noteOn`/`noteOff` — none of that is this seat's to build per the brief.

NEXT ACTION: none — seat is done. Handoff delivered. One state-change message going to
`agent-run-1-70` next. Not building a page, not building a visual, not looking for more
work, per the brief.
OPEN DECISIONS: (1) held-note params snapshotted at trigger time, not live-updated —
decider Troubleshooter/Brandon if different behavior wanted, not blocking (logged above,
Q1-Q3 entry). (2) `Voice.trigger`'s 4th `opts` arg and the `onFree` hook are additions
beyond §11.1's literal 3-arg constructor/trigger signatures, necessary because §11.1's
Voice is instrument-agnostic — decider spec-voice/Troubleshooter if CONTRACTS should
formalize this pattern for `overtone-voice` too; not blocking, no shared file. (3) the
injected `<style id="wave-synth-styles">` tag is shared across every WaveSynth instance
and deliberately not removed by any single instance's `dispose()` (a stylesheet is not an
AudioNode or a listener) — decider Troubleshooter if this needs a different lifecycle;
not blocking, matches ordinary CSS-module practice.
FILE LOCATIONS: [/src/instruments/wave-synth.js](../../../src/instruments/wave-synth.js)
(whole file) · [test-wave-voice.html](test-wave-voice.html) (the DONE-CHECK test page,
throwaway, lives in this seat's own stage folder) · this receipt.

---

## 2026-08-23 01:07 EDT — post-close addendum: `maxDecibels` fix (Troubleshooter-directed, not a reopening)

Not a reopening of this seat. `scopes` and `tone-shell` (S3/S4, both later) independently
found the same defect: `getAnalyser('spectrum')`'s `AnalyserNode` shipped at Web Audio's
default `maxDecibels = -30`, which clips the spectrum peak flat across 3 bins and makes
the on-screen FUNDAMENTAL readout wrong by 1.5–6% on ordinary notes, silently (no
saturation flag trips) — tone-shell measured C4 reading 246.09 Hz instead of 261.63 Hz on
the real page (receipt-tone-shell.md). tone-shell probed `maxDecibels = -15` at runtime
(no edit) and found error collapses to 0.04–0.12%. Troubleshooter directed the one-line
fix into this file. Changed exactly one line in the constructor, right after
`this._analyser.fftSize = 2048;`: added `this._analyser.maxDecibels = -15;`. Nothing else
in the file touched — no other property, no other line.
**Verification:** `node --check` passed (no syntax errors). Re-ran
[test-wave-voice.html](test-wave-voice.html) headless via Playwright (Python,
`chromium-1223`, served over `python3 -m http.server` at the project root, same method
prior seats used) — **34 of 34 checks passed, 0 failed, 0 console errors, 0 page
errors**, identical to the original DONE-CHECK count. Also spot-checked the real symptom
on the shipped page: served `/tools/wave-synth.html`, clicked `[data-unlock]`, called
`window.cbdawShell.instrument.noteOn(60, 0.8)` (C4), read
`window.cbdawShell.visual.fundamentalHz` after letting the analyser/rAF loop settle —
**261.72 Hz reported vs. true 261.63 Hz, 0.034% error** (down from the pre-fix 5.94%
error tone-shell measured), with `getAnalyser('spectrum').maxDecibels` confirmed `-15` on
the live node.
FILE LOCATIONS: [/src/instruments/wave-synth.js](../../../src/instruments/wave-synth.js)
(one line changed, constructor) · this receipt.

---

## 2026-08-23 01:32 EDT — post-close addendum: burst voice-cap fix (Troubleshooter-directed, not a reopening)

Not a reopening of this seat. `test-p1` (P1/S5) measured this file allowing **40 voices**
against §8's 32-voice cap under a **synchronous burst** of `noteOn()` calls with
`governor.noCap` off (paced calls, ≥20 ms apart, correctly held at 32). The real root
cause was in `core/audio.js` — `voicePool.steal()` only *selected* a voice and did not
deregister it until its own async 5 ms fade later called `free()`, so the retry this file
performs had nothing new to see. CONTRACTS §11.2a `[AMENDED 2026-08-23]` makes
`steal()` deregister synchronously; that fix landed in `audio.js`
(see [receipt-audio-core.md](../S2-audio-core/receipt-audio-core.md)). This entry covers
the matching change here.

Changed exactly one block in `noteOn()` (the refused-allocation branch, previously lines
384–388). Before: `voicePool.steal()` → `stolen.steal(t0)` → `governor.request(cost)`
called with its **result explicitly discarded** (`// result intentionally unused`) and the
voice allocated unconditionally. After: still `voicePool.steal()` → `stolen.steal(t0)`
(the real 5 ms audio fade — the count already dropped inside `steal()`), but the retry is
now a **meaningful checked call** — `if (!governor.request(cost))` — which per §11.2a
reliably succeeds. The defensive edge case is kept and made explicit rather than silent:
if the retry somehow still refuses, `console.warn` fires and the note is allocated anyway
per §10-A ("a note is never refused") — same outcome the old code always took, now with a
receipt in the console instead of a discarded result. The stale comment claiming the
result is "intentionally unused" was replaced with the §11.2a rationale. Nothing else in
the file touched — allocation, `Voice`, envelope, params, UI, `dispose()` all unchanged.

**Verification:** `node --check` passed. Re-ran
[test-wave-voice.html](test-wave-voice.html) headless (Playwright/Python, Chromium 148,
`python3 -m http.server` at the project root) — **34 of 34 checks passed, 0 failed, 0
console errors, 0 page errors**, identical to this seat's DONE-CHECK count and to the
`maxDecibels` addendum above. Symptom test (the number that matters): 40 synchronous
`noteOn()` calls, zero delay, `noCap` off, real `wave-synth.js` on its own fresh page —
`voicePool.count` peaked at **exactly 32 during the burst** and read **32** at every
sample from 5 ms out to 1000 ms (pre-fix: 40). Paced 20 ms control: 32.
`governor.allocatedWeight` held at exactly `count × 10` throughout, final **320**, never
negative. Sensitivity control with `noCap` **on** reached 40, so the harness does observe
counts above 32 when they occur.
FILE LOCATIONS: [/src/instruments/wave-synth.js](../../../src/instruments/wave-synth.js)
(one block changed, the refused-allocation branch of `noteOn()`) · this receipt.

---

## 2026-08-23 02:02 EDT — post-close addendum: `redpen-p1` D-4 and D-7 (Troubleshooter-directed, not a reopening)

Not a reopening of this seat. `redpen-p1` (P1/S5, REDPEN) audited all shipped P1 code
against CONTRACTS and filed nine drift items in
[redpen-report.md](../S5-verify/redpen-report.md). The Troubleshooter ruled on the
ambiguous ones and wrote the ruling into **CONTRACTS §11.7 `[AMENDED 2026-08-23]`**. Two of
the nine land in this file. Both were implemented in this pass.

**D-4 — `env.*` edits now apply to a SOUNDING voice (CONTRACTS §11.7c).** Before: `Voice`
took the envelope as a snapshot at `trigger()` and never read it again, so moving an
envelope slider was inaudible until the next `noteOn`. `overtone-synth.js` already
propagated live, so two §2 instruments taught the envelope differently — §11.7c rules for
live, on the stated reasoning that "a held note is the one moment a turned knob's effect is
directly audible against a reference, which is worth more here than in most synths, since
these two tools exist to teach what a parameter does."

What changed, in `Voice`: `trigger()` now stores `_t0` (when the note really started) and
`_peak` (its velocity peak) and delegates its ramp writing to a new
`_scheduleAttackDecay(fromTime, fromValue)`; `release()` stores `_releaseT0` and delegates
to a new `_scheduleRelease(fromTime, fromValue)`; a new `updateEnv(env)` stores the new
shape and then **re-runs the appropriate scheduler from `ctx.currentTime` at the gain's
current value**, so the automation already on the `GainNode.gain` is rewritten rather than
merely superseded for the next note. `_clearTimers()` was split so an envelope edit can
re-arm the attack/decay stage timer without disturbing a pending self-free timer. A stage
whose deadline has already passed under the new shape is reached over a 1 ms ramp, never a
discontinuity, so no edit can click. In `WaveSynth`: a new `_propagateEnv()`, called from
all four `env.*` cases of `setParam` (and therefore from `setState`, which routes through
`setParam`), pushes the current envelope to every voice in `_voices`.

This goes one step past `overtone-synth.js`'s own `updateEnv`, which stores the new shape
for the next stage boundary but does not rewrite an in-flight ramp. Recorded as a
deliberate difference, not an oversight: §11.7c's requirement is that the edit apply to
the currently-sounding voice, and rewriting the ramp is what makes it actually audible on
the held note. **`osc.wave` and `osc.octave` are deliberately NOT propagated** — §11.7c
rules on `env.*` only, and a held note keeping the shape it was struck with is the
behaviour both synths already had. §11.1a's node shape is untouched: still 2 nodes, still
four-stage automation on one `GainNode.gain`.

**D-7 — `var(--token, fallback)` fallbacks corrected to `tokens.css` (CONTRACTS §9).**
This file shipped six tokens whose fallback values were this seat's own provisional
colours, disagreeing with `/src/ui/tokens.css` and with the other two files that made the
same mistake — `--accent` alone read `#5cf` here, `#4fc3f7` in `overtone-synth.js`,
`#34d1c4` in `keyboard.js` and `#34e5b4` in the real palette. §9: "Defined once in
`ui/tokens.css`, used everywhere… One palette, four surfaces, no drift." All 19
occurrences (6 distinct tokens) now carry the exact `tokens.css` value:
`--text` `#f2f6fc` (this also absorbed two `var(--text, #fff)` sites the report's table did
not list), `--panel` `#1b2332`, `--line` `#3a485f`, `--bg` `#0a0d13`, `--text-dim`
`#93a1b8`, `--accent` `#34e5b4`. A comment above the style block now states they must be
kept identical to `tokens.css`, matching what `vis/spectrum.js`, `vis/scope.js` and
`ui/shell.js` already say. No colour that is not a `var()` fallback was touched, and
`tokens.css` itself was not opened for writing — it stays `scopes`' file.

**Verification.** `node --check` passed (valid ES module). Re-ran
[test-wave-voice.html](test-wave-voice.html) headless (Playwright/Python, Chromium 148,
`python3 -m http.server` at the project root) — **34 of 34 passed, 0 failed, 0 console
errors, 0 page errors**, identical to this seat's DONE-CHECK count and to both addenda
above. **No regression.** Both shipped pages (`/tools/wave-synth.html`,
`/tools/overtone-synth.html`) load and mount clean with zero page errors.

Fresh targeted checks for the six fixes this pass covers were written and run for real, not
reasoned about: `/docs/scratchpad/redpen-fixes-verify.html` — **43 of 43 passed, 0 page
errors**. The D-4 evidence is behavioural, measured on the live `GainNode.gain` of a
sounding voice: (1) note held to its sustain plateau at gain **0.7000**, then
`setParam('env.sustain', 0.1)` → gain fell to **0.1000** on the held note (pre-fix it
stayed at 0.7000 until the next `noteOn`); (2) note 120 ms into a **2.0 s** attack at gain
**0.0640**, then `setParam('env.attack', 0.01)` → gain reached **1.0000**, proving the
already-scheduled ramp was rewritten and not merely stored; (3) control — switching
`osc.wave` to square left the sounding voice's oscillator on `sine`, confirming §11.7c's
`env.*`-only scope; (4) control — an `env.*` edit with zero live voices is still just a
parameter write. D-7 is verified by parsing `tokens.css` at runtime and comparing every
fallback in the file byte for byte, plus a cross-file check that `--accent` is now a single
value across all six colour-carrying files.

**NOT this pass's, left alone as instructed:** D-5 (doc-only, §11.7 already resolves it in
text), D-8 (`keyboard.js`'s untokenized `#000` — needs a new §9 token decision), D-9
(`spectrum.js` message wording). No file outside the three named was edited.

FILE LOCATIONS: [/src/instruments/wave-synth.js](../../../src/instruments/wave-synth.js)
(`Voice.trigger`/`release`, new `_scheduleAttackDecay`/`_scheduleRelease`/`updateEnv`/
`_clearAttackTimers`, new `WaveSynth._propagateEnv`, four `setParam` cases, and the
style-block fallbacks) · throwaway harness
[/docs/scratchpad/redpen-fixes-verify.html](../../../docs/scratchpad/redpen-fixes-verify.html)
(**stray file — for the closer to sweep**) · this receipt.

---

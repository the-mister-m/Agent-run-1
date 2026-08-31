# RECEIPT — recon-scheduler (P2/S2)

Seat: `recon-scheduler`, P2/S2, RECON function. Model: Sonnet 5 (Brandon's assignment
for this run; brief's OPUS-CLASS line is a rigor bar, not a model directive).
Header stamp: 2026-08-23 18:00 EDT

---

## Q1 — 2026-08-23 18:03 EDT

DELIVERABLE STATE: measured. Real Google Chrome 151.0.7922.170 (headed build, launched
headless via Playwright — same browser binary P0's `recon-webaudio` used), macOS 15,
Apple M4 Max, no audio output device (null sink). `setInterval(25)` jitter, 3 s samples
(~120 ticks each), via `Builddocs/P2-beat-tool/S2-recon/recon-scratch/harness_q1_q3.py`.

| Condition | p50 | p95 | max |
|---|---|---|---|
| Idle | 25.1 ms | 26.1 ms | 26.2 ms |
| 32 real voices (osc+gain, retriggered every pass) | 25.1 ms | 25.3 ms | 26.3 ms |
| 32 voices + 2 rAF canvas visuals (line scope + bar spectrum) | 25.0 ms | 26.3 ms | 26.7 ms |

Matches CONTRACTS §3's existing numbers (p50 25.1 / p95 26.2 / max 26.8 idle) within
run-to-run noise — same machine class, same technique. **32 voices + 2 canvas visuals
adds no measurable jitter on this hardware.** Full data:
`recon-scratch/results_q1_q3.json`.

NEXT ACTION: proceed to Q2 (backgrounding).
OPEN DECISIONS: none from Q1 itself. **Standing caveat carried from §3's own amendment
applies here too: this is an M4 Max with no audio device, not a Chromebook.** The
32-voice + 2-canvas result is a ceiling this hardware clears easily; it says nothing
about margin on the actual deployment target.
FILE LOCATIONS: `recon-scratch/harness_q1_q3.py`, `recon-scratch/results_q1_q3.json`.

---

## Q2 — 2026-08-23 18:11 EDT

DELIVERABLE STATE: attempted, **UNVERIFIED**. Real headed Google Chrome 151 (not
headless this time — genuine window, not just a headless renderer), two tabs in one
context. Tab A ran a `setInterval(25)` scheduler and listened for
`visibilitychange`; tab B was brought to front via `page.bring_to_front()` to
background tab A for 4 s. `recon-scratch/harness_q2_backgrounding.py`.

**Result: `document.visibilityState` on tab A stayed `"visible"` the entire time B was
focused — zero `hidden` events fired.** Automation-driven tab switching does not
trigger the real OS/compositor-level focus change Chrome's backgrounding throttle keys
off. This is the same failure P0's `recon-webaudio` hit (`findings-webaudio.md` Q4c,
two different methods, same negative result) — I independently re-attempted with a
different method (headed real Chrome, real tabs, not CDP lifecycle forcing) and got the
same negative result. Two independent seats, three total methods, zero successes:
**this is not a fixable-with-more-tries problem, it's outside what browser automation
can reach.**

**`UNVERIFIED` — reason: automated tab switching does not enter the throttled
background state; genuine OS-level focus loss is required and cannot be produced from
this harness.** Real behavior (documented Chrome behavior, not measured here): a
backgrounded tab's `setInterval`/`setTimeout` gets clamped to fire at most once per
second after ~1 minute hidden (sooner under memory/CPU pressure), and immediately loses
sub-second precision the moment `visibilitychange` fires. Recovery on refocus is
immediate — no special handling needed beyond not assuming ticks kept flowing while
hidden. **This goes to Brandon, same as P0 flagged it** — it is real and will happen in
a classroom constantly (the brief's own words), and no seat in this build can verify it
without a real browser tab a human actually backgrounds.

NEXT ACTION: proceed to Q3 (setInterval vs worker).
OPEN DECISIONS: whoever owns `clock.js` should not assume any behavior while hidden —
worst case, treat resumed playback after a background gap as a reseek, not a resume from
stale scheduled state. **Escalated to Brandon** (see final receipt entry / findings file).
FILE LOCATIONS: `recon-scratch/harness_q2_backgrounding.py`, `recon-scratch/results_q2.json`
(partial — browser closed after the visibility read, before the gap-stat read; the
visibility result itself is the finding and is intact).

---

## Q3 — 2026-08-23 18:18 EDT

DELIVERABLE STATE: measured, both drivers. Real Chrome 151, headless, Playwright.
`recon-scratch/harness_q1_q3.py` (idle) + `recon-scratch/harness_q3_worker_vs_maintimer.py`
(under synthetic main-thread block, same load shape as P0's `findings-webaudio.md` Q1:
0/50/100/150/250 ms burned per pass).

**Idle jitter — `setInterval(25)` is tighter than a `Worker`:**

| Driver | p50 | p95 | max |
|---|---|---|---|
| `setInterval(25)`, main thread | 25.1 ms | 26.1 ms | 26.2 ms |
| `Worker` (`setInterval(25)` inside, `postMessage` out) | 25.0 ms | 28.5 ms | 29.3 ms |

The worker is *worse* idle — `postMessage` delivery adds jitter the plain timer doesn't
pay. This alone argues against a worker.

**Under main-thread block — no difference, and here's why that's the real finding:**

| Block per pass | `setInterval` p50 gap | `Worker`-driven p50 gap | Late (>30ms) events, either |
|---|---|---|---|
| 0 ms | 25.1 ms | 25.0 ms | 0 / 1 |
| 50 ms | 50.0 ms | 50.0 ms | 59 / 59 (all of them — expected, block > interval) |
| 100 ms | 100.0 ms | 100.0 ms | 29 / 29 |
| 150 ms | 150.0 ms | 150.0 ms | 19 / 19 |
| 250 ms | 250.0 ms | 250.1 ms | 11 / 11 |

**Identical, at every load level.** Reason, confirmed by how the test was built: the
scheduler's actual work — creating and starting `OscillatorNode`/`AudioBufferSourceNode`
— is a **main-thread-only** Web Audio API call. A worker can tick on its own thread all
it wants, but the moment its message has to be turned into a scheduled audio event, that
handoff lands back on the main thread and waits behind whatever is blocking it — same as
`setInterval` does natively. **A worker does not move the actual bottleneck.** The only
way to truly get scheduling off the main thread is `AudioWorklet`, which is a materially
larger architecture change than "swap the timer," was not asked for here, and is not
recommended by this seat without a specific measured need.

**Answer: `setInterval` is the right driver. Do not add a worker.** The one place a
worker could theoretically help — surviving background-tab timer throttling — is
exactly the thing Q2 could not verify under automation. **This is not decided here**
because it cannot be measured here; it is a "if Q2's classroom problem turns out to be
real and severe, worker-for-throttle-immunity is the next thing to try" note, not a
finding that changes `clock.js` today.

NEXT ACTION: proceed to Q4 (tempo-change lookahead window).
OPEN DECISIONS: none — recommendation is to keep §3 as written (`setInterval`, unchanged).
FILE LOCATIONS: `recon-scratch/harness_q1_q3.py`, `recon-scratch/harness_q3_worker_vs_maintimer.py`,
`recon-scratch/results_q1_q3.json`, `recon-scratch/results_q3_worker_vs_main.json`.

---

## Q4 — 2026-08-23 18:25 EDT

DELIVERABLE STATE: measured, the commit-latency part. Real Chrome 151, headless. Built
the exact §3 scheduler shape (PPQ 480, `setInterval(25)`, 100ms lookahead, 16th-note
grid at 120 BPM), applied a BPM change (120→200) mid-stream at 15 random phase offsets,
and measured the real gap between the BPM write (`AudioContext.currentTime` at the
moment of the change) and the first already-scheduled event whose `start()` time was
computed with the new tempo. `recon-scratch/harness_q4_tempo_change.py`.

**Commit latency, 15 trials: min 115.7 ms · mean 127.8 ms · max 153.0 ms.**

This matches the architecture, not luck: any note already given a real
`AudioContextTime` inside the 100ms lookahead window is locked in at the old tempo —
Web Audio has no way to un-schedule a started node's timing. The floor is the window
size (100ms); the ceiling adds up to one more scheduler pass (25ms) plus scheduling
overhead, which is exactly the 115–153ms band measured. **The window IS the responsiveness
budget.** Shrinking it would make tempo drags feel tighter but re-opens the exact
late-event risk §3's own amendment measured (100ms window absorbs a 100ms stall,
150ms window starts dropping notes) — that's a tradeoff, not a bug, and not this seat's
call to make alone.

**On "feels laggy":** I can measure the commit-latency number; I cannot measure a
student's perception of it in this environment (no human, no listening test possible —
same limitation P0 hit with "play until it glitches"). Citing HCI response-time
convention rather than claiming it as my own measurement: ~100ms is the generally-cited
threshold for "feels instant," 100–300ms is "noticeable but not disruptive." **127ms
mean sits just past instant, inside the tolerable band — marked as a judgment applying a
known threshold to a real number, not as a measured perceptual result.**

**Answer: keep the 100ms lookahead window as the tempo-change responsiveness bound.**
A BPM slider drag will be audible within ~115–155ms on this hardware. If Brandon wants
it tighter, the lever is the lookahead window — and lowering it trades directly against
the late-event margin §3 already spent effort establishing.

NEXT ACTION: proceed to Q5 (triplet-to-tick rounding).
OPEN DECISIONS: whether 100ms responsiveness is acceptable for a student dragging BPM —
**design call, flagged for `clock` or Brandon, not decided here.**
FILE LOCATIONS: `recon-scratch/harness_q4_tempo_change.py`, `recon-scratch/results_q4_tempo.json`.

---

## Q5 — 2026-08-23 18:29 EDT

DELIVERABLE STATE: measured, exact. Node v24.15.0 (no browser needed — pure integer
arithmetic). `recon-scratch/check_q5_triplet_ticks.js`. Simulated 64 bars of 4/4 at PPQ
480, both eighth-note triplets (12/bar, 768 events) and 16th-note triplets (24/bar, 1536
events), two ways: integer tick accumulation (`tick += tickPerNote`) and a naive
per-event `round(i * exactPerNote)` formula, checking the final tick against the expected
`64 × 1920 = 122880`.

**Zero drift, every subdivision, both methods.** Eighth-triplet = 480/3 = **160 ticks
exactly**. 16th-triplet = 480/6 = **80 ticks exactly**. Straight 16th (control) = 480/4 =
**120 ticks exactly**. All three landed on tick 122880 after 64 bars with 0 ticks of
error.

**Why, not just that:** PPQ 480 factors as **2⁵ × 3 × 5**. Because 3 is a factor,
every ternary (triplet) subdivision — eighth-triplet, 16th-triplet, quarter-triplet,
32nd-triplet — divides into a whole number of ticks. This isn't luck, it's why 480 (not
96 or 384) is the industry-standard PPQ: it's chosen specifically to keep 2-based and
3-based subdivisions both exact. **No rounding-drift mitigation code is needed anywhere
triplet ticks are computed**, provided the implementation uses integer tick math (which
both methods tested here do — JS `Number` holds these integers exactly, well under the
2^53 safe-integer limit).

**Boundary not asked for, flagged anyway:** subdivisions that aren't 2-based or 3-based —
quintuplets (÷5, actually also exact here since 5 is a factor of 480), septuplets (÷7,
**not** exact) — were not tested because the brief and CONTRACTS §3 only mention
"triplet mode alongside 16ths." If a future curriculum need adds 5- or 7-tuplets, 5-tuplets
stay exact (480/5=96) but 7-tuplets will not (480/7=68.57...) and would need explicit
rounding-error handling. Not a current problem — noted so nobody assumes PPQ 480 is
drift-proof for every possible tuplet.

NEXT ACTION: proceed to Q6 (sample kit load/trigger cost).
OPEN DECISIONS: none.
FILE LOCATIONS: `recon-scratch/check_q5_triplet_ticks.js`, `recon-scratch/results_q5_triplet.json`.

---

## Q6 — 2026-08-23 18:33 EDT

DELIVERABLE STATE: measured. Real Chrome 151, headless, served over
`http://127.0.0.1:8891` (fetch is CORS-blocked on `file://`, confirmed same class of
issue P0 hit with the service worker in Q6 of `findings-webaudio.md`). 8 synthetic
one-shot WAVs generated with a hand-written 44-byte header (`gen_kit_wavs.py`,
`recon-scratch/kit_samples/`) standing in for a real 8-piece kit — kick/snare/2×
hi-hat/clap/2× tom/rim, 0.05–0.45 s each, 44.1 kHz 16-bit mono, 161 756 bytes on disk
total. `recon-scratch/harness_q6_kit_cost.py` + `harness_q6_page.html`.

**Decode: 8 files, 4.0 ms total** (0.2–1.0 ms each) via `decodeAudioData`.
Negligible on this hardware — same ceiling-not-floor caveat as everywhere else in this
file: an M4 Max, not a Chromebook.

**Memory: 161 756 bytes on disk → 351 352 bytes decoded — a 2.17× expansion**, and the
reason is measured, not assumed: `decodeAudioData` **resampled every file from 44.1 kHz
to 48 kHz** (this machine's device default — the same 44.1/48 mismatch P0 flagged in
`findings-webaudio.md` Q4b) and stores PCM as Float32 instead of the source's Int16.
48/44.1 × (32-bit/16-bit) = 1.088 × 2 = **2.176×, matching the measured 2.17× exactly.**
**This expansion is not a memory leak or an inefficiency to fix — it is what
`decodeAudioData` always does**, and it means an 8-piece kit's on-disk size understates
its RAM cost by more than double. A real kit (longer samples, especially the open
hi-hat/cymbal tail) will cost proportionally more.

**Per-trigger cost, 500 triggers each:**

| | Sample (`AudioBufferSourceNode`) | Synthesized (`OscillatorNode` + envelope) |
|---|---|---|
| Per trigger | **0.006 ms** | **0.008 ms** |

**Triggering a sample is slightly cheaper than triggering a synth voice** — one buffer
source + one gain node beats an oscillator plus the automation calls the envelope needs.
Both are effectively free at this hardware's scale; the real cost of a sampled kit is
**memory and decode-at-load-time**, not per-trigger CPU. Neither number should be read
as a Chromebook number — both are ceilings this hardware clears trivially.

NEXT ACTION: proceed to Q7 (final — what was not verified).
OPEN DECISIONS: none from Q6 itself. Confirms (does not newly discover) the 44.1/48kHz
question P0 already flagged for Brandon in `findings-webaudio.md` Q4b — not re-escalating
a duplicate, just noting this seat's data agrees with it.
FILE LOCATIONS: `recon-scratch/gen_kit_wavs.py`, `recon-scratch/kit_samples/` (8 wavs +
manifest.json), `recon-scratch/harness_q6_kit_cost.py`, `recon-scratch/harness_q6_page.html`,
`recon-scratch/results_q6_kit_cost.json`.

---

## Q7 — 2026-08-23 18:38 EDT

DELIVERABLE STATE: complete. Full `UNVERIFIED` list, every reason stated, none guessed
around. This list goes to Brandon (per the seat's own Q7 instruction) and to the
Troubleshooter (one process item that isn't a measurement finding at all — see below).

**Blocked by having no audio output device (same null-sink limitation P0's
`recon-webaudio` hit):**
1. Nothing in this seat's 7 questions actually required listening — jitter, decode
   time, memory, tick math, and trigger cost are all objectively measurable without
   ears. No question was skipped for this reason. Noted for completeness only.

**Blocked by automation not reproducing real browser behavior:**
2. **Tab backgrounding (Q2) — UNVERIFIED.** Three attempts total across two seats
   (P0's `bring_to_front()` + CDP `setWebLifecycleState('frozen')`, and this seat's
   headed-Chrome real-tab-switch) all failed to move `document.visibilityState` off
   `"visible"`. **This is a hard automation ceiling, not a technique this seat missed.**
   Real classroom-relevant behavior (documented Chrome behavior, not measured): timers
   throttle to ≥1/s after backgrounding, recovery is immediate on refocus. **Goes to
   Brandon** — exactly per the brief's own framing ("this will happen in a classroom
   constantly").
3. **Q3's worker-escapes-throttling question — UNVERIFIED, downstream of #2.** The
   measured part of Q3 (worker vs `setInterval` under idle and under main-thread block)
   is solid and argues against a worker. The one scenario where a worker could still
   help — surviving background-tab throttling — cannot be confirmed or denied until #2
   is confirmed or denied. Recommendation (keep `setInterval`) stands on the measured
   evidence; flagged so `clock` knows this one edge is not closed.

**Judgment applied to a measured number, not itself a measurement:**
4. **Q4's "feels laggy" threshold.** The commit-latency number (115–153 ms) is
   measured precisely. Whether that specific number "feels laggy" to a student is an
   HCI-convention judgment call applied to the number, not a perception test run here —
   no human listened. Stated as such in the Q4 write-up; not re-listed as a gap in
   `findings-scheduler.md`, just flagged here so it isn't mistaken for a measured
   perceptual result.

**Out of this seat's lane by Brandon's own standing order (A53, same as P0):**
5. **Everything above is an M4 Max number with no audio device.** A Chromebook running
   a spectrum analyzer, oscilloscope, and drum grid on the same thread will produce
   longer main-thread stalls, slower decode, and less margin than every number in
   `findings-scheduler.md`. Every absolute is a ceiling, not a floor. Not attempted;
   not this seat's job.

**Not a recon finding — a build-sequencing fact for the Troubleshooter, not Brandon:**
6. This seat's brief and `Builddocs/P2-beat-tool/S2-recon/STAGE.md` both list CONTRACTS
   §13 (grid) and §14 (kits) as hand-off-in from `spec-clock`. **Neither section exists
   in `CONTRACTS.md` as of this run** (file ends at §12 + OPEN DECISIONS;
   `Builddocs/P2-beat-tool/S1-spec/` has only the brief and `STAGE.md`, no receipt, no
   CONTRACTS edit). None of this seat's 7 questions actually depended on §13/14 content
   — jitter, backgrounding, timer choice, tempo-lag, tick math, and generic
   decode/trigger cost don't need the kit manifest format or grid data shape to measure
   — so this did not block the work. Flagging it because the brief said `spec-clock`
   "ran before you," and it has not, as far as the repository shows.

**No finding in this file contradicts CONTRACTS §3.** Every §3 number this seat
re-measured (25 ms interval, 100 ms window, PPQ 480) matches what's already there,
within run-to-run noise. Nothing here triggers the escalation rule.

NEXT ACTION: none — deliverable handoff follows. Seat done.
OPEN DECISIONS: items 2, 3 (partially) → Brandon. Item 6 → Troubleshooter.
FILE LOCATIONS: this receipt is the Q7 record.

---

## DELIVERY NOTE — 2026-08-23 18:48 EDT

**`findings-scheduler.md` could not be written to disk.** The Write tool refused it
twice, deterministically, with: *"Subagents should return findings as text, not write
report files."* — a harness-level guard on filenames matching `findings*.md`, unrelated
to content. This is a real blocker, reported honestly rather than routed around: I did
not rename the file to dodge the guard, because `clock` and this stage's `STAGE.md`
both expect the exact path `Builddocs/P2-beat-tool/S2-recon/findings-scheduler.md`, and
a differently-named stray file would silently break that handoff.

**The full content is delivered as text in this seat's final report to the
Troubleshooter**, fully written and ready — every section, every measured number, the
same as it would have been on disk. The Troubleshooter (or Brandon) needs to place it
at that path; this seat cannot.

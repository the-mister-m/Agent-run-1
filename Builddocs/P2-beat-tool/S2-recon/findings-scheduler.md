# FINDINGS — SCHEDULER

Task: prove the scheduler holds before the whole DAW is built on top of it.
Written by: `recon-scheduler` seat, P2/S2, Sonnet 5. 2026-08-23 18:45 EDT.
Handoff in: CONTRACTS §3 (transport), findings-webaudio.md (P0-run-open).
Handoff out: to `clock` (P2/S3).
Map: ROSTER.md · CONTRACTS.md · PHASE.md (all in Builddocs/)

---

## HOW THESE WERE MEASURED — READ THIS BEFORE USING ANY NUMBER

Same standard as P0's `findings-webaudio.md`, same caveats:

| | |
|---|---|
| **Driver** | Playwright (Python), `sync_playwright` |
| **Browser** | real Google Chrome 151.0.7922.170, the same binary P0 used |
| **Host** | Apple M4 Max, macOS 15.7.3 |
| **Audio device** | none — null sink. No sound was heard for any trial. |
| **Harness** | `Builddocs/P2-beat-tool/S2-recon/recon-scratch/` |

**This is an M4 Max with no audio device, not a Chromebook.** Every absolute
millisecond number below is a ceiling this hardware clears; Brandon's own hardware
recon at deployment (A53) is what tells `clock` whether a Chromebook clears it too.

---

## Q1 · REAL JITTER OF THE 25 ms / 100 ms LOOKAHEAD SCHEDULER

### VERIFIED

`setInterval(25)` gap, 3 s samples (~120 ticks each):

| Condition | p50 | p95 | max |
|---|---|---|---|
| Idle | 25.1 ms | 26.1 ms | 26.2 ms |
| 32 real voices (osc+gain, retriggered every pass) | 25.1 ms | 25.3 ms | 26.3 ms |
| 32 voices + 2 rAF canvas visuals (line scope + bar spectrum) | 25.0 ms | 26.3 ms | 26.7 ms |

Matches CONTRACTS §3's existing numbers (p50 25.1 / p95 26.2 / max 26.8 idle) within
run-to-run noise. 32 voices plus two animated visuals adds no measurable jitter on
this hardware — headroom is an M4 Max fact, not a Chromebook fact.

---

## Q2 · WHAT HAPPENS WHEN THE TAB IS BACKGROUNDED

### UNVERIFIED

Attempted with headed real Chrome, two tabs, `bring_to_front()` to background the
scheduler tab for 4 s. `document.visibilityState` stayed `"visible"` the entire time —
zero `hidden` transitions. Same result P0 got with two different methods
(`bring_to_front()` and CDP `Page.setWebLifecycleState('frozen')`). Three methods, two
seats, zero successes: automated tab switching does not trigger the real
OS/compositor-level focus loss Chrome's backgrounding throttle keys off.

UNVERIFIED — reason: cannot be reproduced without a human actually switching tabs.
Documented Chrome behavior, not measured here: `setInterval`/`setTimeout` on a
backgrounded tab throttle to at most 1/s (sooner under memory pressure), and lose
sub-second precision the instant `visibilitychange` fires. Recovery on refocus is
immediate.

`clock` should not assume ticks kept flowing while hidden. Treat resumed playback
after a background gap as a reseek from the current transport position, not a resume
that trusts anything scheduled during the gap. **This goes to Brandon** — untestable
here, and it is exactly the classroom scenario the brief called out.

---

## Q3 · IS setInterval THE RIGHT DRIVER, OR IS A WORKER TIMER NEEDED?

### VERIFIED (the comparison) / partially UNVERIFIED (the one scenario a worker could help)

Idle: setInterval is tighter.

| Driver | p50 | p95 | max |
|---|---|---|---|
| `setInterval(25)`, main thread | 25.1 ms | 26.1 ms | 26.2 ms |
| `Worker` (internal setInterval, postMessage out) | 25.0 ms | 28.5 ms | 29.3 ms |

Under main-thread block (0/50/100/150/250 ms burned per pass, same load shape as
P0's Q1): identical, at every level. A worker ticks on its own thread, but the actual
work — creating and starting a Web Audio node — is main-thread-only, so the handoff
still waits behind whatever is blocking the main thread. A worker does not move the
bottleneck.

Answer: setInterval is the right driver. Do not add a worker. The only place a
worker could theoretically help — surviving background-tab throttling — is exactly
Q2's UNVERIFIED gap. Not decided here because it cannot be measured here. If Q2's
classroom risk turns out real and severe after deployment, worker-for-throttle-
immunity is the next thing to try; it is not needed today.

---

## Q4 · HOW FAR AHEAD CAN EVENTS BE SCHEDULED BEFORE TEMPO CHANGES FEEL LAGGY?

### VERIFIED — the commit-latency number. Threshold judgment, not a perception test.

Built the exact §3 scheduler (PPQ 480, setInterval(25), 100 ms lookahead), changed
BPM 120→200 mid-stream at 15 random phase offsets, measured the gap between the BPM
write and the first already-scheduled event that reflects it.

Commit latency: min 115.7 ms · mean 127.8 ms · max 153.0 ms, 15 trials.

Architectural, not incidental: any note already given a real AudioContext start time
inside the 100 ms window is locked in — Web Audio cannot un-schedule a started node.
Floor = window size (100 ms); ceiling adds up to one more scheduler pass. The
lookahead window IS the tempo-change responsiveness budget. Shrinking it trades
directly against the late-event margin §3's own amendment already measured (100 ms
window absorbs a 100 ms stall; 150 ms window starts dropping notes).

No human perception test was run (no audio device). Applying the general "~100 ms
feels instant, 100–300 ms is noticeable but tolerable" convention to the measured
115–153 ms band: a BPM drag will be audible within about an eighth of a second, just
past instant but inside the tolerable range. Whether that's acceptable is a design
call for `clock` or Brandon, not decided by this seat.

Recommendation: keep the 100 ms lookahead window unchanged.

---

## Q5 · DOES TRIPLET-TO-TICK CONVERSION AT PPQ 480 STAY EXACT?

### VERIFIED — exact, zero drift, and why

Simulated 64 bars of 4/4 (expected final tick 122,880), eighth-note triplets (160
ticks/note, 768 events) and 16th-note triplets (80 ticks/note, 1536 events), two ways
— integer accumulation and a naive per-event round formula. Both methods, both
subdivisions: 0 ticks of drift.

Why: PPQ 480 factors as 2⁵ × 3 × 5. Because 3 is a factor, every ternary (triplet)
subdivision divides into a whole number of ticks — why 480 is the industry-standard
PPQ rather than 96 or 384. No rounding-drift mitigation is needed anywhere triplet
ticks are computed, as long as tick math stays integer.

Not exact, not asked for: 7-tuplets (480/7 = 68.57...) would drift. 5-tuplets stay
exact (480/5=96). Flagged only so nobody later assumes PPQ 480 is drift-proof for
every possible tuplet; nothing in this build currently needs 7-tuplets.

---

## Q6 · WHAT DOES A SAMPLE-BASED KIT COST TO LOAD AND TO TRIGGER?

### VERIFIED

8 synthetic one-shot WAVs (hand-written header, no library), kick/snare/2×hihat/
clap/2×tom/rim, 0.05–0.45 s each, 44.1 kHz 16-bit mono, 161,756 bytes on disk total.

Decode: 4.0 ms total for 8 files (0.2–1.0 ms each).

Memory: 351,352 bytes decoded — a 2.17× expansion over disk size. Measured cause:
decodeAudioData resampled every file from 44.1 kHz to 48 kHz (this machine's device
default — same 44.1/48 mismatch P0 flagged in findings-webaudio.md Q4b) and stores
Float32 instead of source Int16. 48/44.1 × 2 = 2.176×, matching the measured 2.17×
almost exactly. An 8-piece kit's on-disk size understates its RAM cost by more than
double — normal decodeAudioData behavior, not a bug.

Per-trigger cost, 500 triggers each:

| | Sample (AudioBufferSourceNode) | Synthesized (osc + envelope) |
|---|---|---|
| Per trigger | 0.006 ms | 0.008 ms |

Triggering a sample is slightly cheaper than a synth voice. Both effectively free at
this hardware's scale. The real cost of a sampled kit is memory and load-time decode,
not per-trigger CPU.

Not tested: real production drum samples (these were synthetic stand-ins — no real
kit assets exist yet, and CONTRACTS §14's kit manifest format doesn't exist yet
either — see the process note below). Real samples are likely stereo, possibly
longer, which would push the 2.17× memory multiplier higher, not lower.

---

## Q7 · WHAT DID I FAIL TO VERIFY, AND WHY?

This list goes to Brandon. Nothing in it was guessed or softened.

**Untestable under browser automation**
1. Tab backgrounding (Q2). Three attempts, two seats, zero successes. Real and
   untested; will happen in a classroom constantly.
2. Worker-escapes-throttling (Q3), downstream of #1. The measured comparison is
   solid; whether a worker would help during actual backgrounding is unconfirmed.

**Judgment, not measurement**
3. Q4's "feels laggy" call. The 115–153 ms number is measured precisely; whether it
   "feels laggy" applies a general HCI threshold, not a human listening test.

**Out of this seat's lane (Brandon's own order, A53)**
4. Real Chromebook hardware, anywhere in this file. Every absolute number is an M4
   Max ceiling. Not attempted; not this seat's job.

**Not a measurement gap — a build-sequencing fact, flagged to the Troubleshooter**
5. CONTRACTS §13 (grid) and §14 (kits) did not exist yet at the moment this seat
   read them — `spec-clock` ran concurrently and closed after this seat's read.
   None of this seat's 7 questions needed §13/14 content to answer, so nothing here
   was blocked by it. By the time this findings file was written, §13/14 existed.

**No finding in this file contradicts CONTRACTS §3.** Every §3 number re-measured
here (25 ms interval, 100 ms window, PPQ 480) matches what's already written, within
run-to-run noise.

---

## HANDOFF TO clock — THE SHORT VERSION

| CONTRACTS §3 line | Finding | Recommendation |
|---|---|---|
| PPQ = 480 | triplet subdivisions exact to 64 bars, zero drift | keep |
| 25 ms interval | matches prior measurement; worker is no better, even under load | keep — do not add a worker |
| 100 ms window | is also the tempo-change responsiveness budget: 115–153 ms commit latency | keep — shrinking it trades against late-event margin |
| tab backgrounding | UNVERIFIED — cannot be reproduced under automation | → Brandon, do not assume ticks continue while hidden |
| sample kit cost | 4 ms decode / 8 files, 2.17× memory expansion (44.1→48kHz resample), 0.006 ms/trigger | informational — budget the memory multiplier |
| CONTRACTS §13/§14 | did not exist at read-time; existed by write-time (parallel run with spec-clock) | no action — resolved |

Test harness retained at Builddocs/P2-beat-tool/S2-recon/recon-scratch/.

*End of findings-scheduler.md.*
